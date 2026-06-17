# Esquema de base de datos

> Última revisión: Fase 4. MySQL 8 con XAMPP (BD `prueba_tecnica_daniel_castro`). Todas las migraciones viven en `backend/database/migrations/` ordenadas por timestamp.

## Diagrama ER (Fase 2)

```
┌────────────────────────────────────┐
│ users                              │
├────────────────────────────────────┤
│ id (PK)                            │
│ name                               │
│ role ENUM('client','freelancer',   │
│          'agency','company','admin')│
│ email (UNIQUE)                     │
│ email_verified_at (NULL)           │
│ password                           │
│ remember_token (NULL)              │
│ created_at                         │
│ updated_at                         │
└─────────────┬──────────────────────┘
              │ 1:1 (solo si role=freelancer)
              ▼
┌────────────────────────────────────┐
│ freelancer_profiles                │
├────────────────────────────────────┤
│ id (PK)                            │
│ user_id (FK → users.id, UNIQUE)    │
│ display_name (NULL)                │
│ bio (TEXT, NULL)                   │
│ city (VARCHAR 80, NULL)            │
│ hourly_rate (DECIMAL 8,2, NULL)    │
│ price_per_project (DECIMAL 10,2, N)│
│ is_available (BOOL, default true)  │
│ created_at                         │
│ updated_at                         │
└─────────────┬──────────────────────┘
              │ 1:N
              ▼
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│ freelancer_skill (pivot)           │  │ skills                             │
├────────────────────────────────────┤  ├────────────────────────────────────┤
│ id (PK)                            │  │ id (PK)                            │
│ freelancer_profile_id (FK)         │  │ name (UNIQUE)                       │
│ skill_id (FK → skills.id)          │◄─┤ slug (UNIQUE)                       │
│ level ENUM('junior','mid','senior')│  │ category ENUM('photo','video',     │
│ years_experience (TINYINT, NULL)   │  │          'edit','content')          │
│ created_at                         │  │ is_active (BOOL, default true)      │
│ updated_at                         │  │ created_at                         │
│ UNIQUE(profile_id, skill_id)       │  │ updated_at                         │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

## Tablas del sistema (no de dominio)

Laravel crea por defecto algunas tablas de soporte. FrameMatch solo conserva las necesarias:

| Tabla | Propósito | ¿Se usa? |
|---|---|---|
| `cache` | Cache de aplicación. | Conservada — disponible si se activa caché en BD. |
| `cache_locks` | Locks para evitar race conditions en cache. | Conservada. |
| `migrations` | Estado de migraciones ejecutadas. | Interna de Laravel. |

> Las tablas `password_reset_tokens`, `sessions`, `jobs`, `job_batches` y `failed_jobs` se dropean en la migración `2026_06_17_000000_drop_unused_tables` porque FrameMatch no las usa: auth es JWT stateless (sin sesiones web), no hay flujo de reset de contraseña, y no se usan colas.

## Tabla `users`

Almacena credenciales y rol. Es la **única tabla** que toca el flujo de auth.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `name` | VARCHAR | NO | — | Nombre visible. 2-100 chars validado en FormRequest. |
| `role` | ENUM | NO | `'client'` | Valores: `client`, `freelancer`, `agency`, `company`, `admin`. Solo `client` y `freelancer` son auto-registrables. |
| `email` | VARCHAR | NO | — | UNIQUE. Validado como email. |
| `email_verified_at` | TIMESTAMP | YES | NULL | Para verificación de email. Se setea automáticamente en login OAuth (Google/Facebook). |
| `password` | VARCHAR | YES | NULL | Bcrypt rounds=12 en dev, 4 en tests. **Nullable desde Fase 5.3** para usuarios OAuth-only. |
| `avatar_url` | VARCHAR(500) | YES | NULL | URL del avatar subido a Cloudinary (Fase 5.5.A) o del provider OAuth (Fase 5.3). |
| `avatar_public_id` | VARCHAR(191) | YES | NULL | `public_id` de Cloudinary. Permite borrar el archivo de Cloudinary cuando se cambia o elimina el avatar. |
| `oauth_provider` | VARCHAR(32) | YES | NULL | `google` o `facebook` (Fase 5.3). Indica que la cuenta se autenticó vía OAuth. |
| `oauth_id` | VARCHAR(191) | YES | NULL | ID externo del usuario en el provider (Fase 5.3). Junto a `oauth_provider` forma el UNIQUE. |
| `remember_token` | VARCHAR(100) | YES | NULL | Para "recuérdame" en login web (no usado en API JWT). |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (email)`
- `UNIQUE (oauth_provider, oauth_id)` (Fase 5.3) — evita vincular dos users de FrameMatch al mismo OAuth id.
- `INDEX (role)` — para filtrar listados por rol.

**Relaciones**
- `hasOne(FreelancerProfile)` — 1:1, solo presente si `role='freelancer'`.

**Modelo:** `App\Models\User` (`backend/app/Models/User.php`). Implementa `JWTSubject`, `Authenticatable`, `HasFactory`, `Notifiable`. Castea `password` a `hashed`, `email_verified_at` a `datetime`, `role` a `UserRole` y `oauth_provider` a `OAuthProvider` (nullable). Tiene helper `isFreelancer()`, `isClient()` e `isOAuthUser()`.

### OAuth (Google / Facebook) — Fase 5.3

Estrategia de **auto-vinculación por email**:

1. **User nuevo**: `OAuthService::findOrCreateUser` crea el `User` con `role=client` (default), `password=null`, `email_verified_at=now()`, `avatar_url` del provider, `oauth_provider` y `oauth_id` rellenos.
2. **User existente con mismo email**: si encuentra un user con ese email y el provider confirma email verificado, vincula `oauth_provider` + `oauth_id` al user existente. NO le cambia el `role` (mantiene lo que tenía). La fila de `freelancer_profiles` (si existe) se preserva.
3. **El user completa el rol después** vía `POST /api/auth/oauth/complete-profile` si es nuevo (con `new_user=1` en el callback del backend).

> **Decisión de seguridad:** confiamos en que Google y Facebook solo exponen emails verificados a través de su OAuth. Si en el futuro añadimos un provider que pueda devolver `email_verified=false`, hay que cambiar la lógica de `OAuthController::callback` para leer ese flag y propagarlo.

## Tabla `freelancer_profiles`

Datos específicos del freelancer. Separada de `users` para:
- Mantener `users` ligera (lookup rápido en auth).
- Poder añadir columnas densas (TEXT para bio, DECIMAL para tarifas) sin tocar `users`.
- Indexar para los JOINs de búsqueda del futuro.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `user_id` | BIGINT UNSIGNED | NO | — | FK a `users.id`, UNIQUE. ON DELETE CASCADE. |
| `display_name` | VARCHAR | YES | NULL | Nombre artístico (ej: "Luis Foto Pro"). |
| `bio` | TEXT | YES | NULL | Descripción larga. Sin límite duro en la app. |
| `city` | VARCHAR(80) | YES | NULL | Ciudad donde opera. |
| `hourly_rate` | DECIMAL(8,2) | YES | NULL | Tarifa por hora. Hasta 999,999.99. |
| `price_per_project` | DECIMAL(10,2) | YES | NULL | Precio por proyecto cerrado. Hasta 99,999,999.99. |
| `is_available` | BOOLEAN | NO | `true` | Si está disponible para nuevos encargos. Default `true` al registrarse. |
| `cover_url` | VARCHAR(500) | YES | NULL | URL de la imagen de portada subida a Cloudinary (Fase 5.5.B). |
| `cover_public_id` | VARCHAR(191) | YES | NULL | `public_id` de Cloudinary. Permite borrar el archivo al cambiar/eliminar la portada. |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (user_id)`
- `INDEX (city)` — para filtrar por ciudad.
- `INDEX (is_available)` — para el catálogo "solo disponibles".
- `INDEX (hourly_rate)` — para filtrar por rango de tarifa/hora.
- `INDEX (price_per_project)` — para filtrar por rango de tarifa/proyecto.

**Relaciones**
- `belongsTo(User)`.
- `belongsToMany(Skill)` vía `freelancer_skill` con pivot `level` y `years_experience`.

**Modelo:** `App\Models\FreelancerProfile`. Castea `hourly_rate` y `price_per_project` a `decimal:2`, `is_available` a `boolean`.

## Tabla `skills`

Catálogo de capacidades específicas que un freelancer puede tener.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `name` | VARCHAR | NO | — | UNIQUE. Nombre legible. |
| `slug` | VARCHAR | NO | — | UNIQUE. URL-safe. Generado con `Str::slug()`. |
| `category` | ENUM | NO | — | Valores: `photo`, `video`, `edit`, `content`. |
| `is_active` | BOOLEAN | NO | `true` | Para desactivar sin borrar (futuro). |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (name)`
- `UNIQUE (slug)`
- `INDEX (category)` — para filtrar por categoría.

**Relaciones**
- `belongsToMany(FreelancerProfile)` vía `freelancer_skill`.

**Seeded:** 30 skills via `SkillSeeder` (ver `backend/database/seeders/SkillSeeder.php`):

| Categoría | Skills |
|---|---|
| `photo` | Fotografía de retrato, de producto, de eventos, de moda, inmobiliaria, gastronómica, deportiva, de paisaje |
| `video` | Corporativo, bodas, eventos, documental, publicitario, con drone, redes sociales, YouTube |
| `edit` | Edición de video, color grading, motion graphics, fotomontaje, subtitulado, VFX y efectos visuales, edición de audio, retoque fotográfico |
| `content` | Copywriting, guion para vídeo, gestión de redes sociales, producción de pódcast, locución, newsletter y email marketing |

## Tabla `briefs`

Proyectos publicados por clientes para recibir propuestas. Separada de `users` por la misma razón que `freelancer_profiles`: `users` ligera para auth, `briefs` con datos densos del proyecto.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `client_id` | BIGINT UNSIGNED | NO | — | FK a `users.id`. ON DELETE CASCADE. |
| `title` | VARCHAR(120) | NO | — | Título del brief. 5-120 chars validado. |
| `description` | TEXT | NO | — | Descripción del proyecto. 20-4000 chars. |
| `category` | VARCHAR(32) | NO | — | `photo` \| `video` \| `edit` \| `content`. |
| `city` | VARCHAR(80) | YES | NULL | Ciudad donde se necesita el servicio. |
| `budget_min` | DECIMAL(10,2) | YES | NULL | Rango mínimo del presupuesto. |
| `budget_max` | DECIMAL(10,2) | YES | NULL | Rango máximo del presupuesto. |
| `deadline` | DATE | YES | NULL | Fecha límite para entregar. |
| `status` | VARCHAR(32) | NO | `'published'` | `draft` / `published` / `in_review` / `assigned` / `completed` / `cancelled`. |
| `published_at` | TIMESTAMP | YES | NULL | Cuándo se publicó (para ordenar). |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `INDEX (client_id)`
- `INDEX (status)`
- `INDEX (category)`
- `INDEX (city)`

**Relaciones**
- `belongsTo(User, 'client_id')` — autor.
- `hasMany(Proposal)` — propuestas recibidas.

**Modelo:** `App\Models\Brief`. Castea `budget_min`, `budget_max` a `decimal:2`; `deadline` a `date`; `status` a `BriefStatus` enum; `published_at` a `datetime`.

## Tabla `portfolios` (Fase 5.5.B)

Items del portfolio de un freelancer. Cada item es una imagen subida a Cloudinary con metadatos opcionales (título, descripción) y un campo `position` para ordenar manualmente.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `freelancer_profile_id` | BIGINT UNSIGNED | NO | — | FK a `freelancer_profiles.id`, ON DELETE CASCADE. |
| `public_id` | VARCHAR(191) | NO | — | UNIQUE. `public_id` de Cloudinary. |
| `url` | VARCHAR(500) | NO | — | URL original subida. |
| `width` | SMALLINT UNSIGNED | YES | NULL | Ancho en píxeles. |
| `height` | SMALLINT UNSIGNED | YES | NULL | Alto en píxeles. |
| `format` | VARCHAR(16) | YES | NULL | `jpg`, `png`, `webp`, `gif`, `avif`. |
| `bytes` | INT UNSIGNED | YES | NULL | Peso en bytes. |
| `title` | VARCHAR(120) | YES | NULL | Título opcional. |
| `description` | VARCHAR(500) | YES | NULL | Descripción opcional. |
| `position` | INT UNSIGNED | NO | `0` | Orden manual. Reasignado vía `POST /reorder`. |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (public_id)` — un `public_id` solo se persiste una vez.
- `INDEX (freelancer_profile_id, position)` — listado ordenado por `position`.

**Relaciones**
- `belongsTo(FreelancerProfile)` vía `freelancer_profile_id`.

**Carpeta en Cloudinary:** `framematch/portfolios/{freelancer_profile_id}/` (carpeta fijada por el unsigned preset `fm_pf_upl`).

---

## Tabla `proposals`

Propuestas que los profesionales envían a un brief. La FK va contra `freelancer_profiles` (no contra `users`) para mantener la consistencia: si se borra el perfil, sus propuestas también.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `brief_id` | BIGINT UNSIGNED | NO | — | FK a `briefs.id`. ON DELETE CASCADE. |
| `freelancer_id` | BIGINT UNSIGNED | NO | — | FK a `freelancer_profiles.id`. ON DELETE CASCADE. |
| `message` | TEXT | NO | — | Texto de la propuesta. 20-2000 chars. |
| `price` | DECIMAL(10,2) | NO | — | Precio total propuesto. ≥0. |
| `status` | VARCHAR(32) | NO | `'pending'` | `pending` / `accepted` / `rejected` / `withdrawn`. |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (brief_id, freelancer_id)` — un freelancer solo puede enviar 1 propuesta a un brief.
- `INDEX (status)`
- `INDEX (freelancer_id)`

**Relaciones**
- `belongsTo(Brief)`.
- `belongsTo(FreelancerProfile, 'freelancer_id')`.

**Modelo:** `App\Models\Proposal`. Castea `price` a `decimal:2`; `status` a `ProposalStatus` enum.

## Tabla `freelancer_skill` (pivot N:M)

Une `freelancer_profiles` y `skills` con datos extra por la relación.

| Columna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `freelancer_profile_id` | BIGINT UNSIGNED | NO | — | FK a `freelancer_profiles.id`. ON DELETE CASCADE. |
| `skill_id` | BIGINT UNSIGNED | NO | — | FK a `skills.id`. ON DELETE CASCADE. |
| `level` | ENUM | YES | NULL | `junior`, `mid`, `senior`. |
| `years_experience` | TINYINT UNSIGNED | YES | NULL | Años con esta skill (0-255). |
| `created_at` | TIMESTAMP | YES | NULL | |
| `updated_at` | TIMESTAMP | YES | NULL | |

**Índices**
- `PRIMARY (id)`
- `UNIQUE (freelancer_profile_id, skill_id)` — no se duplica la misma skill para un freelancer.
- `INDEX (skill_id)` — para "qué freelancers tienen esta skill".

## Patrones de uso

### Búsqueda futura de freelancers (preview)

Cuando llegue el endpoint `/api/freelancers?category=photo&city=Madrid&max_rate=80`, la query usará estos índices:

```sql
SELECT fp.*, u.name, u.email
FROM freelancer_profiles fp
JOIN users u ON u.id = fp.user_id
JOIN freelancer_skill fs ON fs.freelancer_profile_id = fp.id
JOIN skills s ON s.id = fs.skill_id
WHERE s.category = 'photo'           -- usa INDEX(category) de skills
  AND fp.city = 'Madrid'             -- usa INDEX(city) de freelancer_profiles
  AND fp.hourly_rate <= 80           -- usa INDEX(hourly_rate)
  AND fp.is_available = true         -- usa INDEX(is_available)
  AND u.role = 'freelancer'          -- usa INDEX(role) de users
GROUP BY fp.id
ORDER BY fp.hourly_rate ASC;
```

### Transacción al registrar freelancer

```php
DB::transaction(function () use ($data) {
    $user = User::create([...]);
    if ($user->role === 'freelancer') {
        FreelancerProfile::create(['user_id' => $user->id]);
    }
    return $user;
});
```

Garantiza que o se crea todo (user + profile) o nada. Si falla la creación del profile, el user no queda huérfano.

## Decisiones de diseño (y por qué)

| Decisión | Por qué |
|---|---|
| `users.role` como ENUM y no bool | Permite añadir `agency`, `company`, `admin` sin migrar; deja huella en git. |
| `users.role` con default `'client'` | La mayoría de registros serán clientes; safe-by-default. |
| `freelancer_profiles` separado de `users` | `users` ligera para login; `freelancer_profiles` densa para JOINs de búsqueda. |
| `freelancer_profiles.user_id` UNIQUE | Garantiza 1:1 estricto. |
| `freelancer_skill` con pivot enriquecido (level + years) | N:M simple no bastaba; la skill de un freelancer tiene nivel y años. |
| `skills` como tabla aparte y no como ENUM en `freelancer_profiles` | Catálogo curado, escalable, reutilizable para filtros. |
| `decimal:2` para tarifas | Siempre 2 decimales (centimos), sin floats raros. |
| `is_available` con default `true` | Recién registrado → "disponible" hasta que diga lo contrario. |
| ON DELETE CASCADE en freelancer_profiles y freelancer_skill | Si se borra un user, su perfil y skills desaparecen. Evita huérfanos. |
| Sin `soft deletes` por ahora | No nos interesa conservar freelancers eliminados. Cuando haga falta, se introduce. |

## Cómo crear una nueva migración

```bash
cd backend
php artisan make:migration nombre_descriptivo
```

Convenciones:
- Nombre en snake_case, en pasado si describe cambio (`add_role_to_users_table`), en presente si crea (`create_freelancer_profiles_table`).
- `up()` siempre con `Schema::create` o `Schema::table`; `down()` con la operación inversa.
- Si la migración añade una FK, definir `constrained()` y la acción de borrado (`cascadeOnDelete()` o `nullOnDelete()`).
- Tras crear la migración, añadirla a este doc y al README.

## Cómo añadir un índice a una tabla existente

```php
Schema::table('freelancer_profiles', function (Blueprint $table) {
    $table->index('city');
});
```

Reglas:
- Indexar toda columna que vaya a aparecer en `WHERE` con cardinalidad razonable.
- No sobre-indexar (cada índice tiene coste en escritura).
- Los índices compuestos van ordenados por selectividad: `(category, city)` no `(city, category)`.

## Futuras tablas (roadmap)

| Tabla | Propósito | Cuándo |
|---|---|---|
| `portfolios` | Items del portfolio de un freelancer (imagen/vídeo + título + descripción). | Fase 3 (edición de perfil). |
| `briefs` | Proyectos publicados por clientes para recibir propuestas. | ✅ Fase 5 (bonus). |
| `proposals` | Propuestas de freelancers a un brief. | ✅ Fase 5 (bonus). |
| `messages` | Mensajes cliente ↔ freelancer dentro de un brief. | Fase 4. |
| `reviews` | Reseñas 1-5 estrellas tras un encargo completado. | Fase 5. |
| `payments` | Pagos asociados a encargos. | Fase 5+ (integración Stripe u otra). |
