# Arquitectura del sistema

> Última revisión: Sprint WebSockets (commit `f4f1621`, 2026-06-20) + drop beta branch (2026-06-20). Ver [docs/roadmap.md](./roadmap.md) para el histórico de cambios.

## Vista de capas

```
┌──────────────────────────────────────────────────────────┐
│  Browser  (Angular 21 SPA, standalone)                  │
│  ┌────────────────────┐  ┌─────────────────────────────┐│
│  │  features/         │  │  core/                      ││
│  │  ├ landing (público)│ │  ├ services/                ││
│  │  ├ auth/ (login,   │  │  │  ├ auth                  ││
│  │  │   register)      │  │  │  ├ freelancer-profile   ││
│  │  ├ home/ (post-    │  │  │  └ freelancer-catalog   ││
│  │  │   login, por rol)│  │  ├ interceptors/ (Bearer)  ││
│  │  ├ freelancer/     │  │  ├ guards/ (auth, role)    ││
│  │  │   profile-editor │  │  ├ pipes/ (translate)      ││
│  │  └ freelancers/    │  │  └ types/                  ││
│  │     ├ list         │  │     (Role, User,           ││
│  │     ├ detail       │  │      FreelancerCard,       ││
│  │     └ card (shared)│  │      Brief, Proposal, …)   ││
│  │  └ briefs/         │  │                             ││
│  │     ├ list         │  │                             ││
│  │     ├ detail       │  │                             ││
│  │     ├ form         │  │                             ││
│  │     └ proposal-form│  │                             ││
│  └─────────┬──────────┘  └──────────┬──────────────────┘│
│            │   HTTP /api/*          │                   │
└────────────┼────────────────────────┼───────────────────┘
             │                        │
   proxy.conf.json (dev)              │
             ▼                        │
┌──────────────────────────────────────────────────────────┐
│  Laravel 13  (API REST, stateless, JWT)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Rutas (routes/api.php)                            │ │
│  │  ├ /api/health                                     │ │
│  │  ├ /api/skills                                     │ │
│  │  ├ /api/freelancers (catálogo público)             │ │
│  │  ├ /api/freelancers/{id} (detalle público)         │ │
│  │  ├ /api/briefs (catálogo público, scope=mine/all)  │ │
│  │  ├ /api/briefs/{id} (detalle público)              │ │
│  │  ├ /api/briefs/{id}/proposals (owner client)       │ │
│  │  ├ /api/auth/{register,login,me,logout,refresh}    │ │
│  │  ├ /api/auth/oauth/{google,facebook}/redirect      │ │
│  │  ├ /api/auth/oauth/{google,facebook}/callback      │ │
│  │  ├ /api/auth/oauth/complete-profile (JWT)          │ │
│  │  └ /api/freelancer/me[/skills] (JWT freelancer)    │ │
│  └────────────┬───────────────────────────────────────┘ │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Middleware: auth:api (JWT) + EnsureUserIsFreelancer│ │
│  │  FormRequest (validación)                          │ │
│  │  Controllers (Auth, OAuth, Skill,                  │ │
│  │   FreelancerProfile, FreelancerCatalog,            │ │
│  │   Brief, Proposal)                                 │ │
│  │  Services (OAuth)                                  │ │
│  │  Resources (User, Skill, FreelancerProfile,        │ │
│  │   FreelancerCard, FreelancerDetail,                │ │
│  │   Brief, Proposal)                                 │ │
│  └────────────┬───────────────────────────────────────┘ │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Eloquent ORM                                      │ │
│  │  ├ User (JWTSubject)                               │ │
│  │  ├ FreelancerProfile (1:1 con User si role=freela) │ │
│  │  └ Skill + freelancer_skill (N:M)                  │ │
│  └────────────┬───────────────────────────────────────┘ │
└───────────────┼──────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────┐
│  MySQL 8  (XAMPP, BD `prueba_tecnica_daniel_castro`)     │
└──────────────────────────────────────────────────────────┘
```

**Reglas clave:**
- Frontend **nunca** toca la BD directamente. Siempre a través de la API.
- Backend **nunca** sirve HTML (es API pura). Las vistas son 100% Angular.
- El flujo de auth es **stateless** en backend: cada request trae su JWT en `Authorization: Bearer ...`.

## Decisiones de arquitectura

### Híbrido en auth y datos de dominio (no monolítico, no separado por completo)

`users` y `freelancer_profiles` viven en tablas separadas pero unidas por FK 1:1. ¿Por qué?

- `users` queda ligera → login/lookup en una sola fila.
- `freelancer_profiles` lleva los datos densos del freelancer (bio, ciudad, tarifas, N:M con skills). Los JOINs de búsqueda del futuro pegan contra esta tabla, no contra `users`.
- La columna `role` en `users` (ENUM extensible) hace que un mismo modelo sirva para los 5 roles, y mañana podemos añadir `agency` o `company` sin migrar.

### Stateless con JWT, no sesiones

- Cada request trae el token en el header `Authorization: Bearer <token>`.
- `auth:api` (driver `jwt` configurado en `config/auth.php`) autentica al usuario.
- En logout, el token se añade a una **blacklist** (gestionada por `tymon/jwt-auth`/`php-open-source-saver/jwt-auth` en caché, no en BD).
- El backend no mantiene `state` de sesión: escala horizontal sin problemas.

### Standalone components en Angular, todo lazy

- Cada componente es `standalone: true`. No hay `NgModule` excepto el root.
- Cada ruta usa `loadComponent: () => import(...)` → cada feature viaja en su propio chunk de JS.
- Resultado en build actual: 7 chunks (uno por componente + uno común), el inicial pesa ~64 kB transferidos.

### Signals en el frontend, no RxJS para estado UI

- `AuthService` expone `token` y `currentUser` como `signal<T>`.
- Los `computed` (`isAuthenticated`, `isClient`, `isFreelancer`, `homePathFor(...)`) derivan de los signals.
- Los componentes consumen los signals directamente en plantilla con `@if (currentUser(); as user) { … }`.
- RxJS se sigue usando para los `Observable` que devuelve `HttpClient`, pero el `subscribe` es mínimo y termina llamando a `tap()` que actualiza el signal. Una vez actualizado, el resto de la UI reacciona.

### `localStorage` para token, no cookie httpOnly

- Decisión pragmática para SPA: `Authorization: Bearer` en cada request.
- Trade-off conocido: XSS es más grave. Mitigación: token con TTL corto (60 min) + `refresh` para renovar.
- Cuando llegue producción, evaluar cookie httpOnly + CSRF token.

### Real-time vía WebSockets (Laravel Reverb) — Sprint WebSockets (commit `f4f1621`)

- **Stack:** Laravel Reverb (Pusher protocol 7 sobre WebSocket) + un cliente Pusher-protocol escrito a mano en el frontend (sin `pusher-js` para mantener el bundle pequeño).
- **Por qué WS y no SSE:** necesitamos full-duplex (cliente → servidor con `subscribe`/`unsubscribe`/`ping` además de server → cliente). SSE no soporta bien el multiplexing de canales.
- **Eventos emitidos por el backend:**
  - `MessageSent` (`private-conversation.{id}`) → `ChatService::sendMessage` tras persistir.
  - `ConversationUpdated` (`private-conversation.{id}`) → `ChatService::markRead` si marcó al menos 1 mensaje.
  - `UnreadCountChanged` (`private-user.{id}`) → `ChatService::sendMessage` (recipient + sender con 0) y `markRead` (reader).
- **Autorización de canales:** `app/Broadcasting/ChatChannelAuthorizer.php` encapsula la policy. Se invoca desde los closures de `routes/channels.php`. `private-conversation.{id}` requiere que el user sea `client_id` o `freelancer_id`; `private-user.{id}` requiere `subscriberId === channelUserId`.
- **Frontend:**
  - `core/services/websocket.service.ts` — singleton. JWT auth, reconexión exponencial 1s→30s, ping cada 60s, replay de suscripciones pendientes tras cada `handleOpen`.
  - `core/services/chat-realtime.service.ts` — wrapper. Conecta cuando `auth.currentUser()` es truthy, desconecta en logout. Multiplexa listeners por conversación.
- **Polling residual:** el chat-list y el chat-thread mantienen un `interval(30_000)` como **fallback explícito** para entornos donde WS está bloqueado. Documentado en el comment de `chat-thread.component.ts:85`.
- **Limitación de escala:** Reverb corre en el mismo dyno que el backend HTTP. Para escalar horizontalmente hay que moverlo a un servicio separado o a un provider externo (Pusher/Ably). El resto del stack (eventos, autorizaciones, frontend) no cambia.

## Flujo end-to-end de registro

```
Usuario                Angular (SPA)                  Laravel API                  MySQL
  │                        │                               │                          │
  │ clic "Registrarse"     │                               │                          │
  ├───────────────────────▶│ POST /api/auth/register       │                          │
  │                        │ {name, email, password, role} │                          │
  │                        ├──────────────────────────────▶│ validate (FormRequest)   │
  │                        │                               │ beginTransaction         │
  │                        │                               │  User::create            │
  │                        │                               │  if role=freelancer:    │
  │                        │                               │   FreelancerProfile::   │
  │                        │                               │    create (vacía)        │
  │                        │                               │ commit                   │
  │                        │                               │  INSERT users            │
  │                        │                               │  INSERT freelancer_      │
  │                        │                               │   profiles (si toca)    │
  │                        │                               │ JWTAuth::fromUser        │
  │                        │ 201 {user, access_token, …}   │ respondWithToken         │
  │                        │◀──────────────────────────────┤                          │
  │                        │ localStorage: framematch_token│                          │
  │                        │ signal currentUser() = user   │                          │
  │                        │                               │                          │
  │ redirect a /home       │                               │                          │
  ├───────────────────────▶│ /home → HomeRedirectComponent │                          │
  │                        │ role=freelancer →             │                          │
  │                        │   /home/freelancer            │                          │
  │                        │                               │                          │
  │ siguiente request      │ HTTP interceptor adjunta:     │                          │
  │                        │  Authorization: Bearer <token>│                          │
  │                        ├──────────────────────────────▶│ auth:api (JWT)           │
  │                        │                               │ → $request->user()      │
  │                        │                               │ → User::with(profile)   │
  │                        │ 200 {data: {...}}             │                          │
  │                        │◀──────────────────────────────┤                          │
  │                        │                               │                          │
  │ clic "Cerrar sesión"   │                               │                          │
  │                        │ POST /api/auth/logout         │                          │
  │                        ├──────────────────────────────▶│ auth('api')->logout()   │
  │                        │                               │  (token → blacklist)     │
  │                        │ 200 {message}                 │                          │
  │                        │◀──────────────────────────────┤                          │
  │                        │ signal token = null           │                          │
  │                        │ localStorage.clearAll()       │                          │
  │                        │ router.navigateByUrl('/')     │                          │
```

## Flujo de proteccion de rutas (frontend)

```
URL: /home/freelancer (ejemplo)
   │
   ▼
1. Coincide con la ruta /home/freelancer en app.routes.ts
   │
   ▼
2. authGuard (CanActivateFn) → ¿auth.isAuthenticated()?
   ├── NO → router.createUrlTree(['/login'], { queryParams: { returnUrl: '/home/freelancer' } })
   └── SÍ ↓
   │
   ▼
3. roleGuard(['freelancer']) → ¿auth.hasAnyRole(['freelancer'])?
   ├── NO → router.createUrlTree(['/home'])  ← HomeRedirectComponent re-enruta según rol
   └── SÍ ↓
   │
   ▼
4. Render del FreelancerHomeComponent
```

## Flujo end-to-end de OAuth (Google / Facebook) — Fase 5.3

```
Usuario              Browser (Angular SPA)              Laravel API                Google / Facebook
  │                        │                                │                            │
  │ clic "Continuar con    │                                │                            │
  │ Google" en /login       │                                │                            │
  ├───────────────────────▶│ window.location = /api/auth/  │                            │
  │                        │  oauth/google/redirect         │                            │
  │                        ├──────────────────────────────▶│                            │
  │                        │ 302 → accounts.google.com       │                            │
  │                        │         (con state CSRF)        │                            │
  │                        │ ◀──────────────────────────────┤                            │
  │ ◀───────────────────────┤                                │                            │
  │ redirige a Google       │                                │                            │
  │                        │                                │ user aprueba permisos       │
  │                        │                                │ ◀──────────────────────────┤
  │                        │                                │ 302 → /api/auth/oauth/      │
  │                        │                                │       google/callback?      │
  │                        │                                │       code=…&state=…        │
  │                        │ 302 → /api/auth/oauth/          │                            │
  │                        │       google/callback?          │                            │
  │                        │ ◀──────────────────────────────┤                            │
  │                        │ GET /api/auth/oauth/google/    │                            │
  │                        │     callback?code=…&state=…     │                            │
  │                        ├──────────────────────────────▶│ validar state vs session   │
  │                        │                                │ Socialite::user()           │
  │                        │                                │ OAuthService::findOrCreate  │
  │                        │                                │   (auto-link por email)     │
  │                        │                                │ JWTAuth::fromUser($user)     │
  │                        │ 302 → /auth/callback?           │                            │
  │                        │       token=…&expires_in=…&     │                            │
  │                        │       new_user=0|1              │                            │
  │                        │ ◀──────────────────────────────┤                            │
  │ /auth/callback          │                                │                            │
  │ OAuthCallbackComponent  │                                │                            │
  │   handleOAuthCallback   │                                │                            │
  │   si new_user=1:        │                                │                            │
  │     router →            │                                │                            │
  │     /auth/complete-     │                                │                            │
  │     profile             │                                │                            │
  │                        │                                │                            │
  │ /auth/complete-profile  │                                │                            │
  │ OAuthCompleteProfile-   │                                │                            │
  │   Component (user       │                                │                            │
  │   elige rol)            │                                │                            │
  │                        │ POST /api/auth/oauth/          │                            │
  │                        │  complete-profile {role: …}     │                            │
  │                        ├──────────────────────────────▶│ completa role, crea         │
  │                        │                                │  FreelancerProfile si toca, │
  │                        │                                │  re-emite JWT               │
  │                        │ 200 {data: {user, token, …}}    │                            │
  │                        │ ◀──────────────────────────────┤                            │
  │ router → /home          │                                │                            │
```

## Decisiones de la tabla `users.role` (ENUM, no bool)

- **Bool `is_freelancer`:** simple pero nos obliga a migrar cuando llegue `is_agency` o `is_company`.
- **String libre:** flexible pero sin validación centralizada, errores silenciosos.
- **ENUM con 5 valores pre-declarados** ✅ (lo elegido): validación a nivel de BD + a nivel de modelo. Añadir un valor nuevo es una migración explícita (deseable: deja huella en git).

El `FormRequest` de registro solo acepta `client` y `freelancer` (los auto-registrables). Los otros tres se asignarán en un futuro por un admin.

## Capas del backend

```
routes/api.php
    │  (URL + middleware)
    ▼
Http/Controllers/Api/<Name>Controller.php
    │  (orquesta: recibe, valida, llama, responde)
    ▼
Http/Requests/<Name>Request.php          ← validación de entrada
Http/Resources/<Name>Resource.php         ← serialización de salida
    │
    ▼
App/Models/<Name>.php (Eloquent)
    │
    ▼
MySQL
```

**Reglas:**
- Controller no valida inline. Siempre pasa por un FormRequest.
- Controller no devuelve modelos. Siempre envuelve en un Resource.
- Modelo no tiene lógica de negocio compleja. Cuando la haya, mover a un Service en `app/Services/`.

## Capas del frontend

```
app.routes.ts
    │  (URL + guards + lazy load)
    ▼
features/<feature>/<name>.component.ts
    │  (presentacional + state local con signals)
    ▼
core/services/<name>.service.ts          ← estado compartido (singleton)
core/types/<name>.types.ts               ← tipos compartidos
core/interceptors/                       ← HTTP transforms
core/guards/                             ← CanActivateFn
    │
    ▼
HttpClient → backend
```

**Reglas:**
- Componentes de feature son tontos: solo consumen services y signals.
- Services son la única capa que habla con `HttpClient`.
- Guards son funciones puras: leen del `AuthService` y devuelven `true` o `UrlTree`.
- Tipos en `core/types/` son compartidos. Tipos locales al componente van dentro del archivo `.ts` del componente.

## Lo que NO tenemos (a propósito)

- **Sin NgModule raíz:** la app es 100% standalone. Si encuentras un `NgModule`, algo va mal.
- **Sin state global (NgRx, etc.):** signals + services bastan. Si en el futuro se complica, se introduce.
- **Sin SSR:** SPA pura. El SEO de la landing pública se delega a una fase posterior si hace falta.
- **Sin tests E2E (Playwright/Cypress):** los Feature tests de PHPUnit + los specs de Jest cubren backend y unidades de Angular. Los E2E se añaden cuando haya presupuesto.
- **Con i18n (ES + EN):** diccionarios JSON en `src/assets/i18n/`, cargados por HTTP al arrancar.
- **Con CoreTopbar unificado (Fase 5.4):** todos los features usan `<app-core-topbar [variant]="…">` con 4 variants (`public`/`auth`/`client`/`freelancer`). Solo `LandingComponent` (anchors in-page) y `BriefListComponent` (scope tabs + CTA condicional) mantienen su topbar propio. Detalles en `docs/design-system.md` y `frontend-conventions/SKILL.md`.
- **Sin design system formal fuera de CSS-in-component:** cada componente trae su `.css`. La cohesión la marca `docs/design-system.md`.

## Deploy (Fase 5.6)

> Detalle operacional paso a paso en [docs/deploy.md](./deploy.md). Aquí solo el "cómo encajan las piezas en producción".

### Mapa de servicios

| Capa | Dónde corre | URL pública |
|---|---|---|
| SPA Angular (estática) | **Vercel** | `https://framematch.vercel.app` |
| API Laravel | **Railway** (FrankenPHP) | `https://prueba-daniel-castro-production.up.railway.app` |
| MySQL 8 | **Railway** (plugin MySQL del mismo proyecto) | red interna, no público |
| Repo | **GitHub** | `DCM91/Prueba-Daniel-Castro` |
| Assets de usuario (avatares, cover, portfolio) | **Cloudinary** (fase 5.5+, sin credenciales reales aún) | — |

### Comunicación frontend → backend sin CORS

El frontend usa **URLs relativas** (`/api/...`) en todos los servicios (`auth.service.ts`, `briefs.service.ts`, `freelancer-profile.service.ts`, `user.service.ts`, etc.). En Vercel, `vercel.json` declara un rewrite:

```json
{ "source": "/api/(.*)", "destination": "https://<railway>/api/$1" }
```

Resultado: el navegador hace `GET https://framematch.vercel.app/api/auth/login` → Vercel proxy → Railway. La respuesta llega con cabeceras de Vercel, así que el navegador cree que habla con Vercel todo el tiempo. **No hay CORS, no hay preflight, no hay que tocar `config/cors.php` para producción** (el `allowed_origins=['*']` actual se mantiene como red de seguridad por si en el futuro hay clientes en otros dominios).

### Por qué este setup funciona con el OAuth futuro

Cuando se monte OAuth (Google/Facebook), la cookie de sesión del `OAuthController` se establece en el dominio que aparece en la barra del navegador. Con el rewrite, ese dominio es **Vercel**, no Railway. Por eso las redirect URIs que se configuren en Google/Facebook console deben ser `https://framematch.vercel.app/api/auth/oauth/{provider}/callback`, **no** la URL de Railway. Si fueran a Railway directamente, la cookie de sesión no llegaría y el `hash_equals` del `state` CSRF fallaría con 419.

### Cero variables de entorno en el frontend

El frontend no necesita env vars de runtime. El rewrite hardcodea la URL de Railway en `vercel.json`. Si en el futuro se quisiera cambiar la URL del backend sin redeploy del frontend, se movería a una env var de Vercel, pero para el MVP actual la simplicidad gana.

## Internacionalización (i18n)

- **Diccionarios:** `frontend/src/assets/i18n/{es,en}.json`. Estructura plana con `dot.case.key` (anidable).
- **Servicio:** `core/services/language.service.ts`. Carga perezosa de los dos diccionarios al arrancar (`HttpClient.get`), persiste elección en `localStorage` con clave `framematch_lang`, fallback a `navigator.language` (iterando sobre `supported`) y por último a `DEFAULT_LANGUAGE` (`es`).
- **Sin FOUT en primera carga:** el servicio expone `readonly ready: Promise<void>` y `app.config.ts` lo enchufa a `provideAppInitializer`. Angular no arranca el bootstrap hasta que ambos JSON están cargados, así la primera vez que se ve la UI ya viene traducida (no hay parpadeo de keys).
- **Pipe:** `core/pipes/translate.pipe.ts`. `{{ 'key' | t }}` o `{{ 'key' | t : { name: 'X' } }}` con interpolación `{{name}}`.
- **Selector UI:** `core/components/language-selector/` en todos los topbars.
- **Regla de oro:** cualquier string visible al usuario pasa por la pipe. Excepción única: la marca "FrameMatch" (no se traduce).
- **Tests:** helper `provideLanguageServiceMock(lang, dict)` en `core/testing/language-service.mock.ts` que aplana el dict, expone `ready: Promise.resolve()` y mockea la pipe sin tocar HTTP.

## Glosario técnico

| Término | Significado |
|---|---|
| **Lazy chunk** | Bundle JS que se descarga bajo demanda (cada componente lazy-loaded genera uno). |
| **Signal** | API reactiva de Angular 21. Similar a un `BehaviorSubject` pero síncrono y sin RxJS. |
| **Computed** | Signal derivado de otros signals. Se re-evalúa solo cuando cambian sus dependencias. |
| **HttpInterceptor (fn)** | Función pura que transforma cada request/response (Angular 21 los prefirió a las clases). |
| **Resource** | Capa de Eloquent que transforma un modelo en un array serializable (incluye `UserResource`). |
| **FormRequest** | Clase de Laravel dedicada a validar `Request` antes de llegar al controller. |
| **Guard (`auth:api`)** | Middleware de Laravel que autentica al usuario vía el guard `api` (driver JWT). |
| **Blacklist JWT** | Lista de tokens invalidados (almacenada en caché por la lib). |
