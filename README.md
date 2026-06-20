# FrameMatch

Plataforma que conecta **freelancers de fotografía y vídeo** con **clientes** que necesitan contratar servicios creativos puntuales. Los freelancers exponen su portfolio, tarifas y disponibilidad; los clientes encuentran al profesional ideal por categoría, ciudad o precio.

**Stack:** Laravel 13 (API REST + JWT) + Angular 21 (SPA standalone).

> **Fases entregadas:** auth con JWT, registro como cliente/freelancer, landing pública de marketing, dos landings post-login diferenciadas por rol, editor de perfil del profesional con selección de skills del catálogo (4 categorías: foto, vídeo, edición, contenido), catálogo público de freelancers con filtros (categoría, ciudad, tarifa, búsqueda) y vista de detalle, briefs + propuestas (matching cliente ↔ profesional), brand "FrameMatch" prominente con logo SVG inline, i18n bilingüe (ES + EN) con selector en topbar, OAuth con Google y Facebook (auto-vinculación por email), topbar unificado con 4 variants, subida de foto de perfil con Cloudinary, cover + portfolio con lightbox accesible, brief attachments (hasta 10 imágenes por brief), profile completion + onboarding wizard, edición de cuenta, OAuth N:M (vincular varios providers), chat cliente↔freelancer ligado a briefs con propuesta aceptada, migración de polling a **WebSockets con Laravel Reverb** (eventos `MessageSent` / `ConversationUpdated` / `UnreadCountChanged` sobre canales privados), reviews y ratings cruzados con CRUD completo, **notificaciones in-app con campana en el topbar** (push real-time + persistencia en `notifications` + 6 kinds de disparadores), y **deploy a producción en Railway (backend) + Vercel (frontend)** con MySQL gestionado y FrankenPHP. Detalle completo en [docs/roadmap.md](./docs/roadmap.md).

## Documentación

- **[AGENTS.md](./AGENTS.md)** — Convenciones del monorepo, setup, glosario.
- **[backend/AGENTS.md](./backend/AGENTS.md)** — Convenciones backend (Laravel 13).
- **[frontend/AGENTS.md](./frontend/AGENTS.md)** — Convenciones frontend (Angular 21).
- **[docs/architecture.md](./docs/architecture.md)** — Arquitectura del sistema, capas, flujos end-to-end.
- **[docs/design-system.md](./docs/design-system.md)** — Paleta, tipografía, componentes, estados.
- **[docs/api.md](./docs/api.md)** — Referencia de endpoints, JWT, errores.
- **[docs/database.md](./docs/database.md)** — Esquema, índices, relaciones, decisiones.
- **[docs/deploy.md](./docs/deploy.md)** — Guía completa del deploy (Railway + Vercel, env vars, issues, troubleshooting).
- **[docs/roadmap.md](./docs/roadmap.md)** — Fases entregadas, backlog priorizado.

---

## Deploy en producción

La app está desplegada y operativa. Ambos servicios se redespliegan automáticamente en cada `git push` a `main`.

| Servicio | URL | Qué corre |
|---|---|---|
| **Frontend** (Vercel) | https://framematch.vercel.app | Angular 21 estático, build con rewrites a `/api/*` |
| **Backend** (Railway) | https://prueba-daniel-castro-production.up.railway.app | Laravel 13 + FrankenPHP, PHP 8.4, MySQL 8 |
| **Smoke test** | `curl https://framematch.vercel.app/api/health` | → `{"status":"ok","service":"FrameMatch",...}` |

### Arquitectura

```
GitHub (push a main)
  ├──► Vercel ──► SPA Angular estática
  │       └─ rewrite /api/* ──► Railway
  └──► Railway ──► Laravel + FrankenPHP
                   └─► MySQL (plugin del mismo proyecto)
```

**Por qué el rewrite de Vercel y no CORS**: el frontend usa URLs relativas (`/api/...`) en todos los servicios. El rewrite hace que el navegador crea que habla con Vercel todo el tiempo, así no hay CORS, no hay preflight, y el OAuth (cuando se monte) puede guardar el `state` en sesión sin problemas.

### Archivos críticos del deploy

| Archivo | Plataforma | Función |
|---|---|---|
| `backend/railpack.json` | Railway | Pin de PHP 8.4 (Symfony 8 lo requiere) |
| `backend/start-container.sh` | Railway | Override del entrypoint: `migrate --force --seed` + FrankenPHP |
| `frontend/vercel.json` | Vercel | Build config + `installCommand` con `--legacy-peer-deps` + rewrites |

### Variables de entorno mínimas (Railway)

```dotenv
APP_NAME=FrameMatch
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<tu-dominio>.up.railway.app
APP_KEY=<generar>
DB_CONNECTION=mysql
DB_URL=${{MySQL.MYSQL_URL}}
CACHE_STORE=database
SESSION_DRIVER=database
JWT_SECRET=<mínimo 32 caracteres>
JWT_ALGO=HS256
JWT_TTL=60
JWT_REFRESH_TTL=20160
FRONTEND_URL=https://framematch.vercel.app
```

> **Cuidado con `JWT_SECRET`**: HS256 exige ≥ 256 bits (32 chars). Si pegas uno de 24 chars, register y login devuelven 500 con `Key provided is shorter than 256 bits`. Genera uno nuevo con `php artisan jwt:secret` y cópialo del `.env` (no existe `--show` en este paquete).

La guía completa con paso a paso, todos los issues del primer deploy, smoke tests, troubleshooting y notas para el futuro OAuth está en **[docs/deploy.md](./docs/deploy.md)**.

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
| PATCH | `/api/briefs/{briefId}/proposals/{id}` | JWT client (owner) | Aceptar o rechazar propuesta (auto-rechaza el resto, crea conversación si acepta) |
| POST | `/api/conversations/{id}/messages` | JWT participant | Envía un mensaje (1-2000 chars) |
| POST | `/api/conversations/{id}/read` | JWT participant | Marca mensajes como leídos (dispara `ConversationUpdated` + `UnreadCountChanged`) |
| GET | `/api/me/notifications` | JWT | Lista paginada de notificaciones (filtro `?unread_only=`) |
| GET | `/api/me/notifications/unread-count` | JWT | Total no-leídas (badge del topbar) |
| POST | `/api/me/notifications/{id}/read` | JWT | Marca una notificación como leída |
| POST | `/api/me/notifications/read-all` | JWT | Marca todas como leídas |

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
| Feature | `AuthTest.php` | 16 | Registro cliente/freelancer, validaciones, login, me, logout, refresh, health, seeder (4 categorías: photo/video/edit/content) |
| Feature | `FreelancerProfileTest.php` | 11 | `GET /api/skills`, `GET/PUT /api/freelancer/me`, `PUT /me/skills` (422/403/200, re-sync del pivot) |
| Feature | `FreelancerCatalogTest.php` | 17 | `GET /api/freelancers` (filtros, paginación, empty, orden featured), `GET /api/freelancers/{id}` (200/404, no expone email) |
| Feature | `BriefsAndProposalsTest.php` | 16 | CRUD de briefs, propuestas con validaciones, owner-only access, auto-creación de conversación al aceptar |
| Feature | `BriefAttachmentTest.php` | 16 | Attach/detach/reorder de imágenes de referencia en briefs (max 10, folder verification, anti-duplicados) |
| Feature | `ChatTest.php` | 18 | Mensajería 1:1 cliente↔freelancer (listado, envío, polling `?since=`, mark-read, permisos, unread-count) |
| Feature | `ReviewTest.php` | 19 | Reviews 1-5 con comentario, anti-duplicados por `(brief, reviewer)`, validaciones, aggregate rating, complete-brief |
| Feature | `AvatarUploadTest.php` | 12 | Subir/borrar avatar con Cloudinary (Admin API verification, replace, 401/403) |
| Feature | `CoverUploadTest.php` | 9 | Subir/borrar cover del freelancer con Cloudinary |
| Feature | `PortfolioTest.php` | 13 | CRUD de portfolio + reorder + endpoint público |
| Feature | `OAuthTest.php` | 13 | OAuth Google/Facebook (redirect, callback, complete-profile, re-login con identidad existente) |
| Feature | `OAuthIdentityTest.php` | 11 | `GET/DELETE /me/oauth-identities` (multi-provider, guard "no puedes desvincular tu único método de login") |
| Feature | `UserAccountTest.php` | 7 | `PUT /api/me` con regex de teléfono internacional, 422, 401 |
| Feature | `OnboardingEndpointTest.php` | 9 | `POST /api/me/onboarding-complete` (idempotente, 403 para no-freelancer) |
| Feature | `ProfileCompletionTest.php` | 11 | `ProfileCompletionService` + `GET /api/me/completion` (10 campos, 100 pts) |
| Unit | `CloudinaryServiceTest.php` | 14 | Admin API, URLs con transformaciones, helpers |
| Unit | `UserTest.php` | 5 | Modelo `User`, JWT claims, relaciones |
| Feature | `BroadcastingTest.php` | 10 | Reverb events: dispatch de `MessageSent` / `ConversationUpdated` / `UnreadCountChanged` + autorización de canales privados |
| Feature | `NotificationsTest.php` | 10 | CRUD de notificaciones (`/me/notifications`): list paginado, unread-only, unread-count, mark single + mark-all, 404 cross-user, 401 |
| Feature | `NotificationDispatchTest.php` | 5 | Disparadores de las 6 kinds: `ProposalReceived` / `Accepted` / `Rejected` / `BriefAssigned` / `BriefCompleted` / `ReviewReceived` (persistencia + `NotificationReceived` event) |

**Total backend: 265 tests / 1033 assertions, todos en verde.**

### Frontend

```bash
cd frontend
npm test
```

| Suite | Tests | Qué verifican |
|---|---|---|
| `auth.service.spec.ts` | 12 | Signals, login/logout, restoreSession, hasAnyRole, homePathFor, roleLabel, OAuth (link, list, unlink) |
| `auth.guard.spec.ts` | 2 | Acceso autenticado y redirección con returnUrl |
| `redirect-if-authenticated.guard.spec.ts` | 4 | Si ya hay sesión, salta de /login o /register a /home |
| `home-redirect.component.spec.ts` | 3 | Enruta a /home/client, /home/freelancer y a /login si no hay user |
| `login.component.spec.ts` | 3 | Validación, submit → /home, error 401 |
| `register.component.spec.ts` | 6 | Role selector, validaciones, mismatch password, submit → /home, error 422 |
| `oauth-callback.component.spec.ts` | 4 | Lee `?token`/`?new_user` de query params, decide ruta |
| `oauth-complete-profile.component.spec.ts` | 3 | Role selector, submit → POST /auth/oauth/complete-profile, redirige a /home |
| `client-home.component.spec.ts` | 4 | Render del topbar, search, 4 categorías, 6 freelancers, toggleCategory |
| `freelancer-home.component.spec.ts` | 7 | Saludo, profileCompletion con perfil vacío/parcial/lleno, missingFields, stats, tips |
| `freelancer-profile.service.spec.ts` | 4 | 4 métodos (getSkills, getMyProfile, updateMyProfile, syncMySkills) |
| `profile-editor.component.spec.ts` | 4 | Carga inicial, form inválido, submit OK con 2 PUT, error 422 con errores por campo |
| `freelancer-catalog.service.spec.ts` | 4 | `search()` con/sin filtros + `getById()` |
| `freelancer-card.component.spec.ts` | 7 | Render de card, level labels, "Consultar" cuando hourly_rate es null, rating stars |
| `freelancer-list.component.spec.ts` | 4 | Carga inicial con resultados, estado vacío, lectura de queryParams, hasActiveFilters |
| `freelancer-detail.component.spec.ts` | 5 | Render del detalle, 404 desde error 404, 404 por id inválido, "Ver más" en bio, "Consultar", hero rating |
| `brand-logo.component.spec.ts` | 5 | Render del wordmark, showWordmark/hideWordmark, tamaños |
| `landing.component.spec.ts` | 5 | Topbar, CTAs, secciones con i18n (4 categorías) |
| `language.service.spec.ts` | 6 | Carga de diccionarios, interpolación, persistencia, detección de navegador, FOUT |
| `language-selector.component.spec.ts` | 3 | Trigger con código actual, apertura menú, selección |
| `topbar.component.spec.ts` | 10 | 4 variants, back-link, logout emit, back emit, hide user area, initials |
| `lightbox.component.spec.ts` | 6 | Dialog ARIA, render, navegación, wrap, close |
| `brief-list.component.spec.ts` | 3 | Carga inicial con briefs, estado vacío, plural i18n `propuesta/propuestas` |
| `brief-detail.component.spec.ts` | 2 | Render del brief, estado 404 |
| `brief-attachment-uploader.component.spec.ts` | 7 | Drop-zone, upload con Cloudinary, error handling, remove |
| `chat-list.component.spec.ts` | 6 | Polling 5s, empty/loading/error, badge unread, selectConversation |
| `chat-thread.component.spec.ts` | 9 | Polling `?since=`, scroll-to-bottom, send con validaciones, markRead, own/alien alignment |
| `review-list.component.spec.ts` | 4 | Empty/loading/error, render de items, brief endpoint |
| `onboarding.service.spec.ts` | 9 | 7 steps, persistencia en localStorage, goNext/goPrev/skip/complete, idempotencia |
| `account.component.spec.ts` | 4 | Form init desde currentUser, updateAccount, errors 422, linked-accounts section |
| `user.service.spec.ts` | 3 | setAvatar/removeAvatar |
| `cloudinary.service.spec.ts` | 6 | Upload con validación client-side, formatos, setAvatar, removeAvatar |
| `avatar-uploader.component.spec.ts` | 10 | Render, file selection, success, error, remove, double-call guard, emit |
| `websocket.service.spec.ts` | — | Cliente Pusher-protocol: open, close, reconnect exponencial, ping, replay de suscripciones |
| `chat-realtime.service.spec.ts` | 4 | Suscripción a `private-user.{id}` y `private-conversation.{id}`, multiplexing, `onUnreadChange` / `onNotification` callbacks |
| `notifications.service.spec.ts` | 6 | `list` (con/sin `unread_only` + `per_page`), `unreadCount`, `markRead` (200 + 404), `markAllRead` |
| `notifications-bell.component.spec.ts` | 8 | Render del badge, fetch inicial, prepend via `onNotification`, mark single + nav, mark-all, error state, empty state, toggle del dropdown |

**Total frontend: 45 suites, 330 tests verdes.** `npm run build` OK. `npm run validate:i18n` OK.

---

## Próximas fases (roadmap)

> Detalle completo en [docs/roadmap.md](./docs/roadmap.md). Resumen de lo que viene (todo lo de arriba está ✅ cerrado):

1. **Responder a reviews + fotos en reviews + denuncias** — feedback bidireccional.
2. **Reset de password** — recrear `password_reset_tokens`, link firmado 30 min, `MAIL_MAILER`.
3. **Verificación de email** — `email_verified_at` ya existe; falta el flujo de link + UI banner.
4. **Notificaciones in-app avanzadas** — página `/notifications` completa, "Ver todas", filtros por kind, archivado.
5. **Backlog DevEx / Roles / SEO** — E2E con Playwright, pipeline lint (Pint + ESLint en CI), Docker compose dev, sub-perfiles `agency`/`company`, admin panel, SSR Angular Universal, búsqueda full-text (Meilisearch), OG image, auditar accesibilidad con axe.

### Login con Google / Facebook (Fase 5.3)

La pantalla de login tiene un divider "o" con dos botones OAuth. Al hacer click, el navegador redirige al backend (`/api/auth/oauth/{provider}/redirect`), que genera un `state` CSRF y manda al usuario a la pantalla del provider. Tras aprobar, el backend crea o vincula el `User`, emite un JWT y redirige a `{FRONTEND_URL}/auth/callback?token=…&new_user=0|1`. Si es nuevo, el `OAuthCallbackComponent` redirige a `/auth/complete-profile` (selector de rol). Ver `docs/api.md` para el detalle de los 3 endpoints, `docs/architecture.md` para el diagrama end-to-end, y `docs/roadmap.md` para la decisión completa.

**Configuración local:**
1. Crear apps en [Google Cloud Console](https://console.cloud.google.com/) y/o [Facebook Developers](https://developers.facebook.com/).
2. Añadir las URIs de redirect: `{BACKEND_URL}/api/auth/oauth/google/callback` y `{BACKEND_URL}/api/auth/oauth/facebook/callback`.
3. Rellenar `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FRONTEND_URL` en `backend/.env` (placeholders en `.env.example`).

> Sin secrets, los botones redirigen a un 500 del provider. El path `/api/auth/oauth/google/redirect` sin secrets falla con un error claro de Socialite.

---

## Notificaciones in-app (campana en el topbar)

Desde el sprint "Notificaciones in-app" (2026-06-20) el topbar tiene una campana con badge de no-leídas, dropdown con las últimas 10 y push real-time vía WebSocket.

**Disparadores (6 kinds, persistidos en `notifications` + emitidos a `private-user.{id}`):**

| Evento del dominio | `kind` | Recipient |
|---|---|---|
| Freelancer envía propuesta | `proposal_received` | Cliente del brief |
| Cliente acepta propuesta | `proposal_accepted` + `brief_assigned` | Freelancer ganador |
| Cliente rechaza propuesta | `proposal_rejected` | Freelancer |
| Cliente marca brief como completado | `brief_completed` | Freelancer asignado |
| Una parte deja review a la otra | `review_received` | Reviewee |

**Flujo end-to-end:**

```
1. Acción del dominio (e.g. ProposalController::store)
   ↓
2. NotificationService::send($user, $proposalReceivedNotification)
   ├─ Genera UUID
   ├─ $user->notifyNow($notification)   ← persiste en `notifications`
   └─ NotificationReceived::dispatch()   ← broadcast en private-user.{id}
                                          event name: notification.received
   ↓
3. Frontend:
   - ChatRealtimeService.onNotification(cb) recibe el payload
   - NotificationsBellComponent prepend + bump unread + shake animation
   - Dropdown muestra el item con icono según `kind`
   - Click en item → NotificationsService.markRead + Router.navigateByUrl(link)
```

**4 endpoints HTTP** (bajo `auth:api`):

- `GET /api/me/notifications?unread_only=&page=&per_page=` — paginado
- `GET /api/me/notifications/unread-count` — total no-leídas
- `POST /api/me/notifications/{id}/read` — marca una (404 cross-user)
- `POST /api/me/notifications/read-all` — marca todas

**Decisión de schema**: `id` UUID (no BIGINT) porque `Notifiable` lo genera por defecto para sobrevivir a queue/serialización. El JSON `data` guarda `{kind, title, body, icon, link, meta}` — mismo shape para persistencia y para el evento WS. Polimórfico (`notifiable_type` + `notifiable_id`) para que mañana se pueda notificar a `Brief` o `Proposal` sin migrar.

Detalle completo en [docs/api.md](./docs/api.md) (sección "Notificaciones in-app"), [docs/database.md](./docs/database.md) (tabla `notifications`), [docs/architecture.md](./docs/architecture.md) (decisión "In-app notifications"), y [docs/roadmap.md](./docs/roadmap.md) (sprint de Notificaciones in-app).

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
