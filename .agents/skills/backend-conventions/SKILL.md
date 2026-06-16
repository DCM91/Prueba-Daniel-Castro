---
name: backend-conventions
description: FrameMatch backend conventions for Laravel 13, PHP 8.5, MySQL 8, and PHPUnit 12. Use when working on backend/ PHP files, Laravel controllers, FormRequest classes, JsonResource, Eloquent models, migrations, seeders, JWT auth with php-open-source-saver/jwt-auth, sqlite in-memory tests, Pint formatting, route definitions in routes/api.php, or anything under backend/app, backend/routes, backend/database, backend/tests. Triggers include "create a controller", "add a migration", "write a Feature test", "fix the API endpoint", "add a seeder", "add a Resource", "add a FormRequest", "register a route", "auth middleware". Do NOT use for frontend/ or docs/ work.
license: MIT
metadata:
  project: FrameMatch
  stack: Laravel 13 / PHP 8.5 / MySQL 8 / PHPUnit 12
---

# AGENTS.md · Backend (Laravel 13)

Convenciones del backend. Para el panorama general, consulta [AGENTS.md](../AGENTS.md). Para la API, [docs/api.md](../docs/api.md). Para la BD, [docs/database.md](../docs/database.md).

## Stack

- **PHP 8.5** (Laravel 13 requiere PHP 8.3+).
- **Laravel 13.8** (probado en v13.12.0).
- **JWT**: `php-open-source-saver/jwt-auth` v2.9.2.
- **MySQL 8** (XAMPP en dev).
- **Tests**: PHPUnit 12 + sqlite `:memory:` en CI.

## Estructura de carpetas

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/             ← solo controllers de la API
│   │   ├── Requests/             ← FormRequests, agrupados por dominio
│   │   │   └── Auth/
│   │   ├── Resources/            ← JSON Resources (transforman modelos)
│   │   └── Middleware/           ← (futuro) middlewares custom
│   ├── Models/                   ← Eloquent models
│   └── Providers/                ← Service providers
├── bootstrap/
│   └── app.php                   ← Application::configure() — middleware, exceptions, routing
├── config/
│   ├── app.php
│   ├── auth.php                  ← guard 'api' con driver 'jwt'
│   ├── cors.php                  ← abierto a * en dev
│   ├── database.php
│   ├── jwt.php                   ← publicada por el paquete
│   └── ...
├── database/
│   ├── factories/                ← factories para tests
│   ├── migrations/               ← ordenadas por timestamp
│   └── seeders/
│       ├── DatabaseSeeder.php    ← llama a SkillSeeder
│       └── SkillSeeder.php       ← 30 skills (8 foto, 8 vídeo, 8 edición, 6 contenido)
├── public/                       ← entry point (index.php)
├── routes/
│   ├── api.php                   ← todas las rutas de la API
│   ├── console.php
│   └── web.php                   ← casi vacío, solo health /up
├── storage/
│   ├── app/                      ← uploads (futuro)
│   ├── framework/                ← cache, sesiones
│   └── logs/                     ← laravel.log
├── tests/
│   ├── Feature/                  ← tests de integración
│   ├── Unit/                     ← tests unitarios
│   └── TestCase.php
├── .env                          ← gitignored
├── composer.json
├── phpunit.xml
└── artisan
```

## Convenciones de naming

- **PHP:** inglés para clases, métodos, variables, comentarios de código. Español solo en copy visible al usuario (mensajes de error, de validación).
- **PSR-12** (auto-aplicado por Pint).
- **PascalCase** para clases (`AuthController`, `UserResource`).
- **camelCase** para métodos y propiedades.
- **snake_case** para columnas de BD y nombres de archivo de migración.
- **Final** en clases que no se espera extender (`final class User`).
- **Strict types** (`declare(strict_types=1);`) en archivos nuevos.

## Convenciones de código

### Form Request siempre
- Toda validación va en un `FormRequest`, no inline en el controller.
- Agrupar por dominio: `app/Http/Requests/Auth/RegisterRequest.php`.
- Usar las reglas de Laravel (`required`, `email`, `min`, `unique`, `in`, `confirmed`).
- Para password: `Password::min(8)` (no hardcodear `min:8`).
- Customizar mensajes solo cuando la regla no se autoexplica en español.

```php
final class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return [...]; }
    public function messages(): array { return [...]; } // solo si hace falta
}
```

### Resource siempre
- Toda respuesta de la API envuelve el modelo en un `JsonResource`.
- El controller devuelve `response()->json(['data' => new UserResource($user)], 201)`.
- El Resource controla `whenLoaded` para relaciones opcionales.

```php
final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // solo campos seguros, NUNCA password ni remember_token
    }
}
```

### Controller delgado
- Un controller solo orquesta: recibe, valida, llama, responde.
- Lógica de negocio → `app/Services/` (futuro).
- No más de 5 métodos por controller (si crece, partir).

### Modelos
- `$fillable` para columnas asignables en masa.
- `$hidden` para columnas sensibles (`password`, `remember_token`).
- `casts()` (Laravel 11+) en lugar de `$casts` (Laravel ≤10).
- Relaciones explícitas con tipo de retorno.
- Helpers semánticos: `isFreelancer()`, `isClient()`.

### Transacciones
- Toda operación que toca 2+ tablas va en `DB::transaction(function () { ... })`.
- Ejemplo: `AuthController::register` crea `User` + (opcional) `FreelancerProfile`.

## Rutas

- Todas las rutas de la API en `routes/api.php`, prefijadas automáticamente con `/api` por Laravel.
- Usar Route::prefix() y Route::middleware() para agrupar.
- Nombrar rutas (`->name('auth.login')`) para usar `route('auth.login')` en tests / emails.

```php
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh',[AuthController::class, 'refresh']);
    });
});
```

## JWT

- Algoritmo HS256, secret en `JWT_SECRET`.
- TTL 60 min, refresh TTL 14 días (`JWT_REFRESH_TTL=20160` minutos).
- Blacklist activada (logout invalida el token).
- Claims custom: `role` (en `getJWTCustomClaims()` del modelo).
- Frontend adjunta el token en `Authorization: Bearer ...`.

## Errores y formato JSON

- Todas las rutas `api/*` devuelven JSON, nunca HTML.
- En `bootstrap/app.php`, `$exceptions->shouldRenderJsonWhen(fn (Request $r) => $r->is('api/*'))` está activado.
- `AuthenticationException` se renderiza como JSON 401 con mensaje "No autenticado. Token inválido o expirado." (ver `bootstrap/app.php`).
- Formato estándar:
  ```json
  { "message": "Resumen", "errors": { "campo": ["msg1", "msg2"] } }
  ```

## Tests

### Setup
- `phpunit.xml` configura el entorno de tests: `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `CACHE_STORE=array`, `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync`, `BCRYPT_ROUNDS=4` (más rápido).
- Usar `RefreshDatabase` en cada test de Feature.
- Usar `database/factories/` para crear datos de prueba.

### Tipos de test
- **Feature** (`tests/Feature/`): prueban el flujo end-to-end de la API (HTTP request → controller → DB → response).
- **Unit** (`tests/Unit/`): lógica aislada (modelos, helpers).

### Convenciones
- Un test = un comportamiento. Si la feature tiene 5 caminos, 5 tests con nombres descriptivos.
- Nombre del método: `test_<feature>_<escenario>_<esperado>()` o `it_<does_something>()`.
- Usar `$this->postJson()`, `getJson()`, etc. (no `post()`) para forzar JSON.
- Para autenticación: `$this->withHeader('Authorization', "Bearer {$token}")` o `$this->actingAs($user, 'api')`.
- Aserciones preferidas: `assertStatus`, `assertJson`, `assertJsonPath`, `assertJsonValidationErrors`, `assertDatabaseHas/Missing`.

### Ejecutar
```bash
php artisan test                    # todos
php artisan test --filter=AuthTest  # un archivo
php artisan test --filter=login     # un test concreto
php artisan test --coverage         # con cobertura
```

## Migraciones

- Nombres en snake_case: `add_role_to_users_table`, `create_freelancer_profiles_table`.
- Siempre con timestamp de `php artisan make:migration` para mantener orden.
- `up()` y `down()` siempre ambos (aunque `down` pueda no ser 100% simétrico en cambios destructivos).
- `foreignId('user_id')->constrained()->cascadeOnDelete()` para FKs con borrado en cascada.
- `index()` y `unique()` explícitos cuando aceleren queries.
- Documentar el cambio en `docs/database.md`.

## Seeders

- `SkillSeeder` corre 30 skills (foto, vídeo, edición, contenido). 8/8/8/6.
- Para añadir más skills: editar el array en `SkillSeeder::run()`. Si añades una **categoría nueva**, recuerda: añadir el `case` al enum `SkillCategory`, extender la migración del ENUM de `skills.category` (y tener en cuenta que SQLite necesita drop+recreate de la columna por el CHECK constraint del `enum()` original), y los `in:` rules de los 3 FormRequests (`StoreBriefRequest`, `UpdateBriefRequest`, `SearchFreelancersRequest`).
- Idempotente: usa `updateOrCreate` por `slug`, así que corre múltiples veces sin duplicar.

## Logging

- Errores se loguean automáticamente en `storage/logs/laravel.log` (driver `single` por defecto).
- En dev con `APP_DEBUG=true`, los errores 500 devuelven el stacktrace completo en JSON.
- En prod, `APP_DEBUG=false` → JSON genérico sin stacktrace.

## Comandos útiles

```bash
# Generar código
php artisan make:model Nombre
php artisan make:controller Api/NombreController
php artisan make:request Auth/NombreRequest
php artisan make:resource NombreResource
php artisan make:migration nombre_tabla
php artisan make:seeder NombreSeeder

# BD
php artisan migrate:fresh --seed      # ⚠ borra datos
php artisan migrate                  # aplica pendientes
php artisan migrate:rollback --step=1

# Cache y config
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# JWT
php artisan jwt:secret                # genera nuevo secret
php artisan jwt:secret --force        # sobreescribe

# Servidor
php artisan serve                     # http://127.0.0.1:8000
php artisan serve --port=8080         # otro puerto
```

## Variables de entorno clave

Ver `.env` (no commitir). Las importantes:

| Var | Valor dev | Notas |
|---|---|---|
| `APP_NAME` | `FrameMatch` | Aparece en headers, emails, etc. |
| `APP_ENV` | `local` | `testing` solo para tests, `production` para prod. |
| `APP_DEBUG` | `true` | `false` en prod. |
| `APP_URL` | `http://localhost` | Base de la app. |
| `DB_CONNECTION` | `mysql` | `sqlite` en testing. |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | XAMPP por defecto. |
| `DB_DATABASE` | `prueba_tecnica_daniel_castro` | Crear antes de migrar. |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / (vacío) | XAMPP por defecto. |
| `JWT_SECRET` | (generado) | `php artisan jwt:secret`. |
| `JWT_TTL` | `60` | Minutos. |
| `JWT_REFRESH_TTL` | `20160` | Minutos (14 días). |
| `CACHE_STORE` | `database` | Necesario para la blacklist JWT. |
| `SESSION_DRIVER` | `database` | Requerido por la tabla `sessions` por defecto. |
| `BCRYPT_ROUNDS` | `12` | `4` en testing para velocidad. |
| `CLOUDINARY_CLOUD_NAME` | (cuenta personal) | Público, en `frontend/environment.ts` y `backend/.env`. |
| `CLOUDINARY_API_KEY` | (cuenta personal) | **Solo backend `.env` (gitignored).** |
| `CLOUDINARY_API_SECRET` | (cuenta personal) | **Solo backend `.env` (gitignored).** |
| `CLOUDINARY_PRESET_*` | `fm_av_upl`, `fm_cv_upl`, `fm_pf_upl`, `fm_br_upl` | Unsigned presets configurados en el dashboard de Cloudinary. |

## Cloudinary (Fase 5.5.A)

Las imágenes de usuario (avatars, covers, portfolios, brief attachments) se almacenan en Cloudinary, NO en el filesystem de Laravel.

**Estrategia:** el frontend sube directamente a Cloudinary con **unsigned upload preset** y luego envía el `public_id` devuelto al backend, que lo **verifica contra la Admin API** antes de persistirlo. Los secrets de Cloudinary (`api_key`, `api_secret`) NUNCA salen del backend.

### Estructura de carpetas

```
framematch/
├── avatars/{user_id}-{uuid}             ← 1 por user (sobreescribe)
├── covers/{freelancer_profile_id}-{uuid} ← 1 por freelancer (5.5.B)
├── portfolios/{freelancer_profile_id}/{uuid} ← N por freelancer (5.5.B)
└── briefs/{brief_id}/{uuid}             ← N por brief (5.5.C)
```

Los nombres de carpeta y preset están en `config/services.php` bajo el bloque `cloudinary` y se inyectan al `CloudinaryService` por el `AppServiceProvider::register`.

### Interface y Fake

Hay un `CloudinaryServiceInterface` (`app/Services/Cloudinary/CloudinaryServiceInterface.php`) con métodos para:
- `verifyResource(string $publicId, string $expectedFolder): array` — llamada Admin API para verificar.
- `deleteResource(string $publicId): void` — best-effort, loguea si falla.
- `avatarUrl(?string $publicId, string $size): ?string` y `avatarUrls(?string $publicId): ?array` con tamaños predefinidos (`xs:40, sm:80, md:200, lg:400, xxl:800`).
- Helpers análogos para `cover`, `portfolio`, `briefAttachment`.

La implementación concreta `CloudinaryService` usa el `Http` facade de Laravel para la Admin API y construye URLs manualmente con transformaciones `w_*,h_*,c_fill,q_auto,f_auto` (sin SDK pesado).

Para tests, hay un `CloudinaryServiceFake` que:
- Acepta un array de recursos pre-cargados con `{publicId => {folder, width, height, format, bytes}}`.
- Lanza `CloudinaryVerificationException` para publicIds no presentes o de otra carpeta.
- Registra las llamadas a `deleteResource` en `$fake->deleted` para asserts.
- Devuelve URLs deterministas con el `cloudName` configurable.

Se bindea en feature tests así:
```php
$fake = new CloudinaryServiceFake([...]);
$this->app->instance(CloudinaryServiceInterface::class, $fake);
```

### Seguridad — `verifyResource` es OBLIGATORIO

**NUNCA** confíes en el `public_id` que viene del frontend. Antes de guardarlo, llama:
```php
try {
    $resource = $this->cloudinary->verifyResource($publicId, $this->cloudinary->folderFor('avatar'));
} catch (CloudinaryVerificationException $e) {
    return response()->json(['message' => $e->getMessage()], 403);
}
```

`verifyResource` comprueba:
1. Que el recurso existe (404 → lanza excepción).
2. Que `resource_type === 'image'`.
3. Que el `folder` del recurso empieza por la carpeta esperada (`framematch/avatars` para avatares, etc.).

Si falla, devuelve 403 con un mensaje legible en español.

### Patrón en FormRequest

Las validaciones de `public_id` en `StoreAvatarRequest`:
- `required`, `string`, `max:191`, `regex:/^[A-Za-z0-9_\-\/]+$/` (solo caracteres seguros, evita inyección de paths).
- `url` requerida para mostrar la imagen inmediatamente (puede ser la `secure_url` de Cloudinary o la `url` HTTP).
- `bytes` max `10485760` (10 MB, defensa en profundidad — el preset de Cloudinary ya limita).

### Throttle

Todos los endpoints de subida usan `throttle:30,1` (30 requests por minuto por IP+user). Configurable en `routes/api.php`.

### Cómo añadir un nuevo tipo de imagen

1. Crear unsigned preset en dashboard de Cloudinary con carpeta fija y restricciones.
2. Añadir preset a `config/services.php` y a `.env.example`.
3. Si necesita endpoint nuevo, crear `XxxController` + `XxxRequest` + ruta con throttle.
4. Llamar `verifyResource(publicId, folderFor('nuevo_tipo'))` antes de persistir.
5. Añadir tests Feature con `CloudinaryServiceFake`.

### Cómo añadir un nuevo tamaño a `avatarUrls`

`AvatarUrls` interface está duplicada en backend (Resource) y frontend (types). Si añades un tamaño (p. ej. `huge`), actualiza:
- Constantes en `CloudinaryService::AVATAR_SIZES` (backend).
- Tipo `AvatarUrls` en `auth.types.ts` (frontend).
- Si quieres eager transformation (no recomendado, ahorra créditos), añade a un futuro `CloudinaryService::buildEagerAvatarTransformations()`.

## Troubleshooting

**"Class 'JWTAuth' not found"** → `composer require php-open-source-saver/jwt-auth` (ya hecho en Fase 1).

**"Route [login] not defined" en 401** → Asegúrate de que `bootstrap/app.php` tiene el render handler para `AuthenticationException` (Fase 1 lo añadió).

**"Unknown column 'role'" en INSERT** → Corriste `php artisan migrate:fresh --seed`? La BD en vivo necesita las migraciones nuevas.

**"SQLSTATE[HY000] [2002] Connection refused"** → XAMPP MySQL no está corriendo. Ábrelo desde el panel de XAMPP.

**Tests pasan pero `php artisan serve` falla con "No application encryption key"** → Falta `APP_KEY` en `.env`. `php artisan key:generate`.

## Próximas mejoras (no urgentes)

- Pasar a `php-open-source-saver/jwt-auth` v3 cuando saquen una compatible con Laravel 14.
- Crear `app/Services/` para mover lógica de negocio de los controllers.
- Service classes para `AuthService`, `FreelancerProfileService`, `SkillService`.
- Policies (`app/Policies/`) para autorización por recurso.
- Event broadcasting para cambios de perfil (futuro).
- Queue jobs para emails transaccionales (cuando llegue verificación de email).
