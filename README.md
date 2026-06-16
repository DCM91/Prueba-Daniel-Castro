# FrameMatch

Plataforma que conecta **freelancers de fotografía y vídeo** con **clientes** que necesitan contratar servicios creativos puntuales. Los freelancers exponen su portfolio, tarifas y disponibilidad; los clientes encuentran al profesional ideal por categoría, ciudad o precio.

**Stack:** Laravel 13 (API REST + JWT) + Angular 21 (SPA standalone).

> **Fases entregadas:** auth con JWT, registro como cliente/freelancer, landing pública de marketing, dos landings post-login diferenciadas por rol, editor de perfil del profesional con selección de skills del catálogo, catálogo público de freelancers con filtros (categoría, ciudad, tarifa, búsqueda) y vista de detalle, briefs + propuestas (matching cliente ↔ profesional), brand "FrameMatch" prominente con logo SVG inline, i18n bilingüe (ES + EN) con selector en topbar, OAuth con Google y Facebook, topbar unificado con 4 variants, y **Fase 5.5.A · subida de foto de perfil con Cloudinary** (frontend sube directo con unsigned preset; backend verifica contra Admin API antes de persistir; verifica carpeta esperada y resource_type).

## Documentación

- **[AGENTS.md](./AGENTS.md)** — Convenciones del monorepo, setup, glosario.
- **[backend/AGENTS.md](./backend/AGENTS.md)** — Convenciones backend (Laravel 13).
- **[frontend/AGENTS.md](./frontend/AGENTS.md)** — Convenciones frontend (Angular 21).
- **[docs/architecture.md](./docs/architecture.md)** — Arquitectura del sistema, capas, flujos end-to-end.
- **[docs/design-system.md](./docs/design-system.md)** — Paleta, tipografía, componentes, estados.
- **[docs/api.md](./docs/api.md)** — Referencia de endpoints, JWT, errores.
- **[docs/database.md](./docs/database.md)** — Esquema, índices, relaciones, decisiones.
- **[docs/roadmap.md](./docs/roadmap.md)** — Fases entregadas, backlog priorizado.

---

## Requisitos previos

| Herramienta | Versión | Notas |
|---|---|---|
| PHP | >= 8.3 (probado en 8.5) | `C:\php\php.ini` |
| Composer | 2.x | Si no está en PATH, hay `composer.phar` en `backend/` |
| Extensiones PHP | `mbstring`, `pdo_mysql`, `fileinfo`, `sodium`, `zip`, `openssl` | |
| Node.js | >= 22 | |
| npm | >= 9 | |
| MySQL | 8.x | XAMPP (localhost:3306) |

### Habilitar extensiones PHP necesarias

En `C:\php\php.ini`, descomenta (si están comentadas con `;`):

```ini
extension=mbstring
extension=pdo_mysql
extension=fileinfo
extension=sodium
extension=zip
extension=openssl
```

Verifica con `php -m | Select-String "fileinfo|sodium|zip|mbstring"`.

---

## Estructura del proyecto

```
/
├── README.md                          # Este archivo
├── backend/                           # Laravel 13 + JWT
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AuthController.php            # register, login, logout, me, refresh
│   │   │   │   ├── SkillController.php           # index (catálogo público de skills)
│   │   │   │   └── FreelancerProfileController.php  # show, update, syncSkills (JWT freelancer)
│   │   │   ├── Middleware/
│   │   │   │   └── EnsureUserIsFreelancer.php    # 403 si role != freelancer
│   │   │   ├── Requests/
│   │   │   │   ├── Auth/{RegisterRequest,LoginRequest}.php
│   │   │   │   └── Freelancer/{UpdateProfileRequest,SyncSkillsRequest}.php
│   │   │   └── Resources/
│   │   │       ├── UserResource.php
│   │   │       ├── FreelancerProfileResource.php
│   │   │       └── SkillResource.php
│   │   └── Models/
│   │       ├── User.php
│   │       ├── FreelancerProfile.php
│   │       └── Skill.php
│   ├── routes/api.php
│   └── tests/Feature/{AuthTest,FreelancerProfileTest}.php
│
└── frontend/                          # Angular 21 standalone
    ├── src/app/
    │   ├── core/
    │   │   ├── types/auth.types.ts                       # Role, Skill, User, AuthPayload, SkillLevel, …
    │   │   ├── services/
    │   │   │   ├── auth.service.ts                       # signals + setFreelancerProfile()
    │   │   │   ├── freelancer-profile.service.ts        # 4 métodos (getSkills, getMyProfile, updateMyProfile, syncMySkills)
    │   │   │   └── token-storage.service.ts
    │   │   ├── interceptors/auth.interceptor.ts
    │   │   └── guards/{auth,role,redirect-if-authenticated}.guard.ts
    │   └── features/
    │       ├── landing/
    │       ├── auth/{login,register}/
    │       ├── home/{home-redirect,client,freelancer}/
    │       └── freelancer/profile-editor/profile-editor.component.{ts,html,css}  # Editor de perfil (Fase 3)
    └── proxy.conf.json
```

---

## Modelo de datos

```
users
─────────────────────────
id (PK)
name
role ENUM('client','freelancer','agency','company','admin')  default 'client'
email (UNIQUE)
password
email_verified_at
remember_token
timestamps

freelancer_profiles
─────────────────────────────────────
id (PK)
user_id (FK, UNIQUE) ───────────┐
display_name                     │
bio (TEXT)                       │ 1:1 con users
city (VARCHAR 80)                │   (solo se crea si role=freelancer)
hourly_rate    DECIMAL(8,2)      │
price_per_project DECIMAL(10,2)  │
is_available BOOL                │
timestamps                  ─────┘

skills                       freelancer_skill (pivot)
──────────────────────        ─────────────────────────────────
id (PK)                       id (PK)
name (UNIQUE)                 freelancer_profile_id (FK)
slug (UNIQUE)                 skill_id (FK)
category ENUM('photo',        level ENUM('junior','mid','senior')
              'video',        years_experience UNSIGNED TINYINT
              'edit',         timestamps
              'content')
is_active BOOL                UNIQUE(profile_id, skill_id)
timestamps
```

**Por qué híbrido y no todo-en-uno:** `users` queda ligera para login/lookup. Cuando lleguen los JOINs de búsqueda (`WHERE category='photo' AND hourly_rate <= 200 AND city='Madrid'`), pegan contra los índices de `freelancer_profiles` y `freelancer_skill`, no contra la tabla de auth. La columna `role` es extensible: mañana añadimos `agency` o `company` sin migrar.

---

## API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Health check → `{status, service, timestamp}` |
| GET | `/api/skills` | — | Catálogo de 20 skills activas |
| GET | `/api/freelancers` | — | Catálogo público de freelancers con filtros (paginado 12/pág) |
| GET | `/api/freelancers/{id}` | — | Detalle público de un freelancer (sin email) |
| GET | `/api/briefs` | — | Catálogo público de briefs publicados (paginado 12/pág) |
| GET | `/api/briefs/{id}` | — | Detalle público de un brief |
| GET | `/api/briefs/{briefId}/proposals` | JWT client (owner) | Propuestas recibidas en un brief |
| POST | `/api/auth/register` | — | Registro (cliente o freelancer) → user + token |
| POST | `/api/auth/login` | — | Login → user + token |
| GET | `/api/auth/me` | JWT | Usuario autenticado (+ `freelancer_profile` si aplica) |
| POST | `/api/auth/logout` | JWT | Invalida el token actual |
| POST | `/api/auth/refresh` | JWT | Renueva el token |
| GET | `/api/freelancer/me` | JWT freelancer | Perfil completo del profesional |
| PUT | `/api/freelancer/me` | JWT freelancer | Actualiza datos básicos del perfil |
| PUT | `/api/freelancer/me/skills` | JWT freelancer | Sincroniza (reemplaza) las skills del profesional |
| POST | `/api/briefs` | JWT client | Crea un brief (queda `published`) |
| PUT | `/api/briefs/{id}` | JWT client (owner) | Edita un brief propio |
| DELETE | `/api/briefs/{id}` | JWT client (owner) | Borra un brief (cascada a propuestas) |
| POST | `/api/briefs/{briefId}/proposals` | JWT freelancer | Envía una propuesta a un brief |

### Registro

```json
POST /api/auth/register
{
  "name": "Luis Foto",
  "email": "luis@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "freelancer"
}

201 →
{
  "data": {
    "user": {
      "id": 1,
      "name": "Luis Foto",
      "email": "luis@example.com",
      "role": "freelancer",
      "created_at": "2026-06-11T08:00:00.000Z",
      "freelancer_profile": {
        "id": 1,
        "display_name": null,
        "bio": null,
        "city": null,
        "hourly_rate": null,
        "price_per_project": null,
        "is_available": true,
        "skills": []
      }
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

> Cuando `role=client`, el campo `freelancer_profile` no aparece en la respuesta (la fila ni se crea).

---

## Instalación y arranque

### 1. Base de datos

```bash
# Asegúrate de que XAMPP MySQL esté corriendo en localhost:3306
# La BD debe llamarse: prueba_tecnica_daniel_castro
```

### 2. Backend

```bash
cd backend

# Solo la primera vez
composer install
php artisan jwt:secret   # (si no se generó al instalar el paquete)

# Migrar + seedear
php artisan migrate:fresh --seed

# Arrancar
php artisan serve        # http://127.0.0.1:8000
```

> **Variables relevantes en `.env`:** `APP_NAME=FrameMatch`, `JWT_SECRET`, `JWT_TTL=60`, `JWT_REFRESH_TTL=20160`, y desde Fase 5.5.A: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_PRESET_*` (ver `.env.example`). Los secrets de Cloudinary van SOLO en `backend/.env` (gitignored). El frontend solo conoce `cloudName` y nombres de preset en `src/app/core/config/cloudinary.config.ts`.

### 3. Frontend

```bash
cd frontend
npm install              # Solo la primera vez
npm start                # http://localhost:4200
```

El proxy de desarrollo (`proxy.conf.json`) redirige `/api/*` a `http://127.0.0.1:8000`.

---

## Testing

### Backend

```bash
cd backend
php artisan test
```

| Suite | Archivo | Tests | Qué verifican |
|---|---|---|---|
| Feature | `AuthTest.php` | 15 | Registro cliente/freelancer, validaciones, login, me, logout, refresh, health, seeder |
| Feature | `FreelancerProfileTest.php` | 10 | `GET /api/skills`, `GET/PUT /api/freelancer/me`, `PUT /me/skills` (422/403/200, re-sync del pivot) |
| Feature | `FreelancerCatalogTest.php` | 13 | `GET /api/freelancers` (filtros, paginación, empty), `GET /api/freelancers/{id}` (200/404) |
| Feature | `BriefsAndProposalsTest.php` | 16 | CRUD de briefs, propuestas con validaciones, owner-only access |
| Unit | — | 0 | (vacío) |

**Total backend: 74 tests, 431 assertions.**

### Frontend

```bash
cd frontend
npm test
```

| Suite | Tests | Qué verifican |
|---|---|---|
| `auth.service.spec.ts` | 8 | Signals, login/logout, restoreSession, hasAnyRole, homePathFor, roleLabel |
| `auth.guard.spec.ts` | 2 | Acceso autenticado y redirección con returnUrl |
| `redirect-if-authenticated.guard.spec.ts` | 4 | Si ya hay sesión, salta de /login o /register a /home |
| `home-redirect.component.spec.ts` | 3 | Enruta a /home/client, /home/freelancer y a /login si no hay user |
| `login.component.spec.ts` | 3 | Validación, submit → /home, error 401 |
| `register.component.spec.ts` | 6 | Role selector, validaciones, mismatch password, submit → /home, error 422 |
| `client-home.component.spec.ts` | 4 | Render del topbar, search, categorías, freelancers, toggleCategory |
| `freelancer-home.component.spec.ts` | 7 | Saludo, profileCompletion con perfil vacío/parcial/lleno, missingFields, stats, tips |
| `freelancer-profile.service.spec.ts` | 4 | 4 métodos (getSkills, getMyProfile, updateMyProfile, syncMySkills) |
| `profile-editor.component.spec.ts` | 4 | Carga inicial, form inválido, submit OK con 2 PUT, error 422 con errores por campo |
| `freelancer-catalog.service.spec.ts` | 4 | `search()` con/sin filtros + `getById()` |
| `freelancer-card.component.spec.ts` | 7 | Render de card, level labels, "Consultar" cuando hourly_rate es null |
| `freelancer-list.component.spec.ts` | 4 | Carga inicial con resultados, estado vacío, lectura de queryParams, hasActiveFilters |
| `freelancer-detail.component.spec.ts` | 5 | Render del detalle, 404 desde error 404, 404 por id inválido, "Ver más" en bio, "Consultar" |
| `brand-logo.component.spec.ts` | 5 | Render del wordmark, showWordmark/hideWordmark, tamaños |
| `landing.component.spec.ts` | 5 | Topbar, CTAs, secciones con i18n |
| `language.service.spec.ts` | 6 | Carga de diccionarios, interpolación, persistencia |
| `language-selector.component.spec.ts` | 3 | Trigger con código actual, apertura menú, selección |
| `brief-list.component.spec.ts` | 3 | Carga inicial con briefs, estado vacío, plural i18n `propuesta/propuestas` |
| `brief-detail.component.spec.ts` | 2 | Render del brief, estado 404 |

**Total frontend: 111 tests / 21 suites, todos verdes.**

---

## Próximas fases (roadmap)

> Detalle completo en [docs/roadmap.md](./docs/roadmap.md). Resumen:

1. **Fase 6 · Mensajería** — chat cliente ↔ freelancer dentro de un brief aceptado.
2. **Fase 7 · Reviews y ratings** — valoración tras encargos completados.
3. **Fase 3.5 · Portfolio de imágenes** — subida de portfolio de los freelancers.
4. **Backlog menor** — verificación de email, reset de password, SSR, E2E, CI/CD, Docker.

### Login con Google / Facebook (Fase 5.3)

La pantalla de login tiene un divider "o" con dos botones OAuth. Al hacer click, el navegador redirige al backend (`/api/auth/oauth/{provider}/redirect`), que genera un `state` CSRF y manda al usuario a la pantalla del provider. Tras aprobar, el backend crea o vincula el `User`, emite un JWT y redirige a `{FRONTEND_URL}/auth/callback?token=…&new_user=0|1`. Si es nuevo, el `OAuthCallbackComponent` redirige a `/auth/complete-profile` (selector de rol). Ver `docs/api.md` para el detalle de los 3 endpoints, `docs/architecture.md` para el diagrama end-to-end, y `docs/roadmap.md` para la decisión completa.

**Configuración local:**
1. Crear apps en [Google Cloud Console](https://console.cloud.google.com/) y/o [Facebook Developers](https://developers.facebook.com/).
2. Añadir las URIs de redirect: `{BACKEND_URL}/api/auth/oauth/google/callback` y `{BACKEND_URL}/api/auth/oauth/facebook/callback`.
3. Rellenar `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FRONTEND_URL` en `backend/.env` (placeholders en `.env.example`).

> Sin secrets, los botones redirigen a un 500 del provider. El path `/api/auth/oauth/google/redirect` sin secrets falla con un error claro de Socialite.

---

## Arquitectura · Flujo de autenticación

```
Usuario                  Angular (SPA)                    Laravel API                  MySQL
  │                          │                                 │                         │
  │  clic "Registrarse"      │                                 │                         │
  ├─────────────────────────▶│  POST /api/auth/register         │                         │
  │                          │  {name, email, password, role}  │                         │
  │                          ├────────────────────────────────▶│  validate (FormRequest) │
  │                          │                                 │  beginTransaction       │
  │                          │                                 │   User::create          │
  │                          │                                 │   if role=freelancer:   │
  │                          │                                 │     FreelancerProfile:: │
  │                          │                                 │       create (vacía)    │
  │                          │                                 │  commit                 │
  │                          │                                 │   ↓                     │
  │                          │                                 │  INSERT users           │
  │                          │                                 │  INSERT freelancer_     │
  │                          │                                 │    profiles (si toca)   │
  │                          │                                 │  JWTAuth::fromUser      │
  │                          │  201 {user, access_token, ...}  │  respondWithToken       │
  │                          │◀────────────────────────────────┤                         │
  │                          │  localStorage: framematch_token │                         │
  │                          │  signal currentUser()           │                         │
  │                          │                                 │                         │
  │  siguiente request       │  HTTP interceptor adjunta:      │                         │
  │                          │  Authorization: Bearer <token>  │                         │
  │                          ├────────────────────────────────▶│  auth:api (JWT)         │
  │                          │                                 │  → $request->user()     │
  │                          │                                 │  → User::with(profile)  │
  │                          │  200 {data: {...}}              │                         │
  │                          │◀────────────────────────────────┤                         │
  │                          │                                 │                         │
  │  clic "Cerrar sesión"    │                                 │                         │
  │                          │  POST /api/auth/logout          │                         │
  │                          ├────────────────────────────────▶│  auth('api')->logout()  │
  │                          │                                 │  (token a blacklist)    │
  │                          │  200 {message}                  │                         │
  │                          │◀────────────────────────────────┤                         │
  │                          │  signal token = null            │                         │
  │                          │  localStorage.removeItem(...)   │                         │
  │                          │  router.navigate(['/'])         │                         │
```
