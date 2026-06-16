# Checklist · FrameMatch

> Estado vivo del backlog. Marca con `[x]` cada tarea al cerrarla.
> Detalle de criterios y diseño en [docs/roadmap.md](./docs/roadmap.md) y en el plan acordado en sesión.
>
> **Convenciones:** prioridad descendente (P0 = más urgente). Dentro de cada bloque, las tareas se ejecutan en orden salvo nota.

---

## Fases entregadas

- [x] **Fase 1** · Auth con JWT + modelo híbrido (users + freelancer_profiles + skills)
- [x] **Fase 2** · Landings post-login diferenciadas por rol
- [x] **Fase 2.5** · Documentación (AGENTS, docs/)
- [x] **Fase 3** · Edición de perfil de freelancer (datos + skills)
- [x] **Fase 4** · Catálogo público de freelancers con filtros y detalle
- [x] **Fase 5** · Briefs + propuestas (matching cliente ↔ profesional)
- [x] **Home restructure** · BrandLogoComponent + landing prominente + brand visible en todos los topbars
- [x] **i18n** · ES + EN con LanguageService + TranslatePipe + selector en topbar
- [x] **Hotfix** · Bug de redirección post-login (desempaquetado `{data:…}` en AuthService)
- [x] **Hotfix** · Copy "freelancer → profesional" en toda la UI visible
- [x] **Fase 5.1** · i18n de briefs (`| t` en los 3 componentes + namespace nuevo) + hotfixes de UI (formArrayName profile-editor, hero-badge landing, responsive landing, ruido `console.error` en tests)
- [x] **Fase 5.2** · Disciplina "Creación de Contenido" + rebalanceo de skills (4ª categoría `content` con 6 skills, 4 skills nuevas en `edit`, migración ENUM, i18n en ES/EN, UI en 6 componentes, 2 colores nuevos, icono megáfono)
- [x] **Fase 5.3** · OAuth con Google y Facebook (Socialite, auto-vincular por email, complete-profile, páginas /auth/callback y /auth/complete-profile)
- [x] **Fase 5.4** · Topbar unificado (CoreTopbarComponent con 4 variants, 11 features refactorizados, OAuth-complete-profile fixes, navegación role-aware)
- [x] **Fase 5.5.A** · Foundations + Avatar con Cloudinary (compositor `cloudinary/cloudinary_php` + 4 unsigned presets, `CloudinaryService` interface + fake + bind, `POST/DELETE /api/me/avatar` con throttle:30,1, verificación Admin API + folder + resource_type, migración `avatar_public_id`, `AvatarUploaderComponent` con drop-zone + canvas preview + a11y, integración en `CoreTopbar` (avatar real en vez de iniciales) y `ProfileEditor`, i18n `uploader.*` + `avatar.*` ES+EN, 22 tests backend + 19 tests frontend nuevos)
- [x] **Fase 5.5.B** · Cover + Portfolio con Cloudinary (migración `add_cover_to_freelancer_profiles` + tabla `portfolios` con position e índice, `FreelancerCoverController` PUT/DELETE, `FreelancerPortfolioController` CRUD + reorder + public, throttle 30/min cover y 60/min portfolio, `CoverUploaderComponent` aspect 16:5, `LightboxComponent` accesible role=dialog + focus trap + Escape + ←/→, `PortfolioEditorComponent` en `/freelancer/portfolio` con grid + reorder por teclado, integración en `FreelancerDetail` con cover banner + galería + lightbox, i18n `cover.*` + `portfolio.*` + `lightbox.*` ES+EN, 18 tests backend + 13 tests frontend nuevos)

---

## 🔴 P0 · Bugs y pulido

> Cerrar todo P0 antes de meter features nuevas. Cabe en 1 sesión.

- [x] **0.1** · `roleGuard` redirige a `/dashboard` inexistente → cambiar a `/home`
  - Archivo: `frontend/src/app/core/guards/role.guard.ts:20`
  - Test nuevo: el guard devuelve `UrlTree('/home')` cuando rol no encaja.
- [x] **0.2** · Pill de rol muestra valor crudo del enum
  - Añadir `roleLabel(role: Role): string` en `AuthService` con mapping: `client→Cliente`, `freelancer→Profesional`, `agency→Agencia`, `company→Empresa`, `admin→Admin`.
  - Usarlo en `frontend/src/app/features/home/client/client-home.component.html:12`.
  - Test: 5 aserciones del mapping.
- [x] **0.3** · Caracteres chinos "房产" en categoría Drone
  - Archivo: `frontend/src/app/features/home/client/client-home.component.ts:45`.
  - Reemplazar por "inmuebles".
- [x] **0.4** · Import sin usar (`throwError`) en spec
  - Archivo: `frontend/src/app/core/services/auth.service.spec.ts:4`.
- [x] **0.5** · Documentar shape `{data:…}` en `docs/api.md`
  - Añadir nota en la sección de auth explicando el wrapper y cómo lo desempaqueta el frontend.
- [x] **0.6** · Refresh proactivo del JWT con `effect()`/timer
  - `AuthService` programa `setTimeout` a `(expires_in − 300) * 1000 ms` tras `persistSession`.
  - `restoreSession` decodifica `exp` del JWT y reprograma o limpia sesión.
  - `clearSession` cancela el timer.
  - Tests con `jest.useFakeTimers()`.
- [x] **0.7** · `TranslatePipe` importado pero no usado en componentes de briefs (NG8113)
  - Archivos: `brief-detail.component.ts:16`, `brief-form.component.ts:14`, `brief-list.component.ts:14`.
  - Cubrir todos los strings visibles con `| t` (no eliminar el import).
  - Nuevo namespace `briefs.{list,detail,form}` en `src/assets/i18n/{es,en}.json`.
  - `@let` en template para que las props nullable (`budget_min`/`budget_max`/`proposals_count`) encajen en `Record<string, string|number>` de la pipe.
  - Mock de `provideLanguageServiceMock` actualizado en `brief-list.component.spec.ts` y `brief-detail.component.spec.ts`.
  - Test nuevo: plural `propuesta` vs `propuestas` en `brief-list.component.spec.ts`.
  - Build sin warnings NG8113.
- [x] **0.8** · Bug en `ProfileEditorComponent`: `formArrayName="skills"` no se bindea
  - Archivo: `frontend/src/app/features/freelancer/profile-editor/profile-editor.component.ts:44-53`.
  - Causa: `skillsForm` era un `FormArray` independiente, no estaba dentro del `basicForm` que el `<form [formGroup]="basicForm">` exponía al template, así que el `formArrayName="skills"` no resolvía y los `<select>`/`<input>` de "Nivel" y "Años" no se bindeaban al añadir skills. El spec no lo detectaba porque accedía al array directamente.
  - Fix: declarar `skillsForm` antes de `basicForm` y añadirlo como control `skills: this.skillsForm` del `FormGroup` raíz.
- [x] **0.9** · Badge SVG grande en el hero del landing rompe el foco visual del título
  - Archivo: `frontend/src/app/features/landing/landing.component.html:23-25`.
  - Eliminar el bloque `<div class="hero-brand"><app-brand-logo [brandSize]="'xl'" [hideWordmark]="true" /></div>`.
  - Limpiar reglas CSS `.hero-brand` y `.eyebrow` asociadas (eyebrow pill se eliminó también).
- [x] **0.10** · Responsive del landing roto en mobile
  - Archivo: `frontend/src/app/features/landing/landing.component.css`.
  - Topbar con `flex-wrap: wrap`, nav a segunda fila (`order:3; flex:1 1 100%`), padding 14/18.
  - Hero padding `56/18/48` (antes `96/24/72`).
  - `h1` `clamp(40px, 10vw, 110px)` (antes `min 56px`).
  - Secciones con padding lateral `18px`, headings `26px`.
  - Orbes reducidos a `280px` con `blur(80px)`.
  - `@media (max-width:420px)` oculta `.link-login` del topbar.
- [x] **0.11** · `console.error` masivo en tests de path negativo
  - Archivos: `frontend/jest.config.js`, `frontend/setup-jest.ts`.
  - Mover `setup-jest.ts` de `setupFiles` a `setupFilesAfterEnv` (corre con `beforeEach`/`jest` disponibles).
  - En `setup-jest.ts`: mockear `console.error` y `console.warn` por test con `jest.fn()`, restaurándolos en `afterEach`. Los specs de login/register/profile-editor con path 401/422 ya no imprimen stack traces en la salida.
- [x] **0.12** · FOUT (Flash of Untranslated Text) en primera carga + detección de navegador explícita
  - Archivos: `frontend/src/app/core/services/language.service.ts`, `frontend/src/app/app.config.ts`, `frontend/src/app/core/testing/language-service.mock.ts`, `frontend/src/app/core/services/language.service.spec.ts`.
  - **Síntoma:** al abrir la app por primera vez (sin `localStorage`), durante ~100 ms la UI pintaba las keys literales (`briefs.list.title`, etc.) y luego se "rellenaba" con las traducciones una vez que llegaban los JSON.
  - **Causa:** el `LanguageService` disparaba los `HttpClient.get` en el constructor con `void this.loadAll()` fire-and-forget, y la app renderizaba antes de que los diccionarios estuvieran cargados.
  - **Fix 1 (FOUT):** `LanguageService` expone `readonly ready: Promise<void>` resuelto al final de `loadAll()`. En `app.config.ts` se añade `provideAppInitializer(() => inject(LanguageService).ready)` para que Angular no arranque el bootstrap hasta que los diccionarios estén en memoria. La app se queda en blanco un instante y aparece ya traducida.
  - **Fix 2 (detección de navegador):** `readStoredLanguage` ya no hardcodea `if (nav.startsWith('en'))`. Ahora itera sobre `this.supported` y matchea la primera coincidencia, con fallback explícito a `DEFAULT_LANGUAGE` (`es`). Un navegador en `es-ES` se detecta como `es` (antes caía al default "por suerte"); un navegador en `fr-FR` también cae a `es`.
  - **Mock:** `provideLanguageServiceMock` ahora expone `ready: Promise.resolve()` para que `provideAppInitializer` no rompa los specs que mockean el servicio.
  - **Tests nuevos (3):** `ready` resuelve sólo cuando ambos diccionarios están cargados; `navigator.language = 'es-ES'` → `'es'`; `navigator.language = 'fr-FR'` → `'es'` (fallback explícito). Total: **111 tests / 21 suites**.
- [x] **0.13** · Nueva disciplina `content` (Creación de Contenido)
  - Archivos backend: `app/Enums/SkillCategory.php`, `database/migrations/2026_06_12_140000_add_content_to_skills_category_enum.php`, `database/seeders/SkillSeeder.php`, `app/Http/Requests/Brief/{Store,Update}BriefRequest.php`, `app/Http/Requests/Freelancer/SearchFreelancersRequest.php`, `tests/Feature/AuthTest.php`, `tests/Feature/FreelancerProfileTest.php`.
  - Archivos frontend: `core/types/auth.types.ts`, `src/assets/i18n/{es,en}.json`, `features/landing/landing.component.{html,css}`, `features/home/client/client-home.component.{ts,html}`, `features/briefs/form/brief-form.component.ts` (template inline), `features/briefs/{list,detail}/brief-{list,detail}.component.html` (pill i18n), `features/freelancers/list/freelancer-list.component.ts` (5ª option), `features/freelancers/detail/freelancer-detail.component.css` (override amber), y los specs `client-home`, `landing`, `brief-list`, `brief-detail`.
  - Backend: enum `SkillCategory::Content` + entrada en `labels()`. Migración nueva: MySQL hace `ALTER TABLE ... MODIFY ENUM(...,'content')`; SQLite dropea y recrea la columna (porque el `enum()` original dejó un CHECK constraint que SQLite no puede ALTER). `SkillSeeder` añade 6 skills a `content` (Copywriting, Guion, Redes Sociales, Pódcast, Locución, Newsletter). 3 FormRequests aceptan `content` en `in:` y actualizan el mensaje custom a `'La categoria debe ser photo, video, edit o content.'`.
  - Frontend: `SkillCategory` union con `'content'`. i18n ES/EN: `skill_categories.content`, `landing.tagline_disciplines` (renombrado de `tagline_photo_video`), `landing.section_categories_title_highlight` "cuatro disciplinas", `landing.cat_content_*`, `home.client.hero_lead_after` y `auth.register.role_freelancer_body` mencionan contenido. 4ª `cat-card` en landing con `data-color="amber"` y SVG megáfono (3 paths). 4ª entrada en `categories` del client home (`icon: 'megaphone'`, color `amber`) + `@case` en el switch. 4ª `<option>` en el select del brief form. Pill de categoría en brief list/detail ahora `('skill_categories.' + b.category) | t` (antes mostraba el valor crudo del enum). `freelancer-list` añade la 5ª option de filtro. `freelancer-detail` añade override `[data-cat="content"]` en amber.
  - Specs: `client-home` (asserts de 3 → 4 categorías), `landing` (mock con tagline renombrado + `cuatro disciplinas` + `cat_content_*`, test renombrado y +1 del tagline), `brief-list` (mock con `skill_categories` + nuevo test de pill traducida), `brief-detail` (mock con `skill_categories`).
  - **Total:** backend 62/388, frontend 113/21 suites.
- [x] **0.14** · Rebalanceo de `edit` (de 4 a 8 skills)
  - Archivo: `backend/database/seeders/SkillSeeder.php`.
  - 4 skills nuevas: Subtitulado, VFX y efectos visuales, Edición de audio, Retoque fotográfico.
  - Justificación: las otras 3 categorías tienen 8 skills; `edit` se quedaba corta. Ahora todas las categorías tienen ≥6 skills (foto 8 / vídeo 8 / edición 8 / contenido 6).
- [x] **0.15** · OAuth backend (Socialite + Google + Facebook)
  - Archivos: `composer.json` (+`laravel/socialite`, `socialiteproviders/{google,facebook}`), `app/Enums/OAuthProvider.php`, `database/migrations/2026_06_12_150000_add_oauth_columns_to_users_table.php`, `app/Models/User.php` (fillable + cast + `isOAuthUser()`), `config/services.php`, `app/Providers/AppServiceProvider.php` (listeners Socialite), `app/Services/OAuthService.php`, `app/Http/Controllers/Api/OAuthController.php`, `app/Http/Requests/Auth/CompleteOAuthProfileRequest.php`, `routes/api.php`, `tests/Feature/OAuthTest.php`, `.env.example`.
  - Flujo Authorization Code con `state` CSRF en sesión. `web` middleware en `/oauth/{provider}/redirect` y `/callback` (para sesiones). `auth:api` middleware en `/oauth/complete-profile`.
  - Auto-vinculación por email: si el email ya existe en la BD y el provider lo confirma verificado, se vincula `oauth_provider` + `oauth_id` al user existente (sin cambiar su rol). Si el user es nuevo, se crea con `role=client` (default) y `email_verified_at=now()`.
  - `password` ahora nullable (usuarios OAuth-only).
  - UNIQUE(`oauth_provider`, `oauth_id`) para evitar colisiones.
  - Avatar se guarda del provider (columna `avatar_url`).
  - 12 tests nuevos cubriendo: redirects con state, callback OK (new user + link existing + Facebook), state inválido (419), complete-profile con client/freelancer, 401 sin auth, 422 con role inválido.
  - **Total backend:** 74 tests / 431 assertions.
- [x] **0.16** · OAuth frontend (página callback + complete-profile + botones)
- [x] **0.17** · Topbar unificado (CoreTopbarComponent)
  - Archivos: `core/components/topbar/{topbar.component.ts,topbar.component.html,topbar.component.css,topbar.component.spec.ts}` (nuevos). 11 features refactorizados: `auth/{login,register,oauth-complete-profile}`, `home/{client,freelancer}/`, `freelancer/profile-editor/`, `freelancers/{list,detail}/`, `briefs/{detail,form}/`. CSS de topbar eliminado de cada uno (~15-30 líneas por archivo). `src/assets/i18n/{es,en}.json` (+7 claves bajo `topbar.*` y +1 bajo `auth.oauth.*`).
  - 4 variants: `public` (sticky, brand + lang, sin user), `auth` (no-sticky, brand + lang, sin user, sin nav), `client` (sticky, nav [Inicio, Profesionales, Briefs] + name + role-pill + logout), `freelancer` (sticky, nav [Inicio, Mi perfil] + name + avatar con iniciales + logout).
  - Bug fix `OAuthCompleteProfileComponent`: brand-logo raw (`<span class="brand-text">FrameMatch</span>`) → `<app-brand-logo>`; lang-slot vacío → language-selector real; aria-label hardcoded `'FrameMatch, ir al inicio'` → eliminado (el topbar lo pinta via i18n); error hardcoded `'Error al completar el perfil.'` → key `auth.oauth.error_complete_profile`.
  - Bug fix `FreelancerDetailComponent`: back usaba `Location.back()` (random) → ahora `RouterLink('/freelancers')` via `backLink`.
  - Bug fix `BriefDetailComponent` y `BriefFormComponent`: back era `<a>← Briefs</a>` hardcoded → ahora key `topbar.back_to_briefs`.
  - Bug fix `ProfileEditorComponent`: back era `<a>← Volver al inicio</a>` hardcoded → ahora key `topbar.back_to_home`.
  - Excepciones: `LandingComponent` (anchors in-page) y `BriefListComponent` (scope tabs + CTA condicional) mantienen su topbar propio. Documentado en el spec y en `docs/roadmap.md`.
  - Tests: 10 nuevos en `topbar.component.spec.ts` + 3 nuevos en specs de features (brief-detail, freelancer-detail, profile-editor). 1 test actualizado (oauth-complete-profile con mock de `ActivatedRoute`).
  - **Total frontend:** 137 tests / 24 suites.
  - Archivos: `core/types/auth.types.ts` (+`OAuthProvider`, `User.avatar_url?`), `core/services/auth.service.ts` (+`loginWithOAuth`, `handleOAuthCallback`, `completeOAuthProfile`, `fetchCurrentUser`), `app.routes.ts` (2 rutas nuevas), `features/auth/oauth-callback/`, `features/auth/oauth-complete-profile/`, `features/auth/login/login.component.{ts,html,css}` (botones OAuth), `features/auth/register/register.component.{ts,html}` (botones OAuth), `src/assets/i18n/{es,en}.json` (namespace `auth.oauth.*` con 11 claves), 3 specs nuevos.
  - Flujo: clic "Continuar con Google" → redirección completa al backend → callback redirige al frontend con `?token=…&new_user=…` → `OAuthCallbackComponent` persiste token y decide ruta → si `new_user=1` redirige a `/auth/complete-profile` (selector visual de rol) → POST `/auth/oauth/complete-profile` → home.
  - Botones OAuth con logos SVG inline oficiales (Google 4 colores, Facebook blanco sobre `#1877F2`).
  - Specs nuevos: `OAuthCallbackComponent` (4), `OAuthCompleteProfileComponent` (3), `AuthService` (4 en `describe('OAuth')`).
  - **Total frontend:** 124 tests / 23 suites.

**Validación P0:** `npm test` (54/54) + `npm run build` (OK) + `php artisan test` (15/71) — todo en verde. ✅
**Validación P1:** `npm test` (62/62, 11 suites) + `npm run build` (OK) + `php artisan test` (25/190) — todo en verde. ✅
**Validación P2:** `npm test` (84/84, 15 suites) + `npm run build` (OK) + `php artisan test` (38/280) — todo en verde. ✅
**Validación Bonus (Home + i18n + Briefs):** `npm test` (107/107, 21 suites) + `npm run build` (OK) + `php artisan test` (62/343) — todo en verde. ✅
**Validación 5.1 (i18n briefs + hotfixes UI):** `npm test` (108/108, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/343) — todo en verde. ✅
**Validación 5.1.1 (FOUT + browser detection):** `npm test` (111/111, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/343) — todo en verde. ✅
**Validación 5.2 (disciplina Content + rebalanceo):** `npm test` (113/113, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/388) — todo en verde. ✅
**Validación 5.3 (OAuth Google + Facebook):** `npm test` (124/124, 23 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) — todo en verde. ✅
**Validación 5.4 (Topbar unificado):** `npm test` (137/137, 24 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) — todo en verde. ✅

---

## 🟠 P1 · Fase 3 · Edición de perfil de freelancer (solo textos + skills)

> Portfolio de imágenes queda para Fase 3.5 (futura).

### Backend

- [x] **1.B1** · Endpoint `GET /api/skills` (público) + `SkillController::index` + `SkillResource`.
- [x] **1.B2** · Endpoint `GET /api/freelancer/me` (JWT freelancer) + `FreelancerProfileController::show` + `FreelancerProfileResource`.
- [x] **1.B3** · Endpoint `PUT /api/freelancer/me` + `UpdateProfileRequest`
  - Reglas: `display_name` ≤100, `bio` ≤1000, `city` ≤80, `hourly_rate`/`price_per_project` numéricos ≥0, `is_available` bool.
- [x] **1.B4** · Endpoint `PUT /api/freelancer/me/skills` + `SyncSkillsRequest`
  - Reglas: array ≤20 skills, cada una con `skill_id` válido, `level` en `junior|mid|senior`, `years_experience` 0–50.
- [x] **1.B5** · `abort_if($user->role !== 'freelancer', 403)` en los endpoints `/freelancer/me*`.
- [x] **1.B6** · Tests Feature (`FreelancerProfileTest.php`):
  - [x] GET skills devuelve 20.
  - [x] GET me con freelancer → 200.
  - [x] GET me con cliente → 403.
  - [x] PUT me datos válidos → 200 + cambios en BD.
  - [x] PUT me bio > 1000 → 422.
  - [x] PUT skills con 3 skills → 200 + filas en pivot.
  - [x] PUT skills con skill_id inexistente → 422.
  - [x] PUT skills re-sincroniza (borra anteriores).

### Frontend

- [x] **1.F1** · Tipos nuevos en `auth.types.ts`: `SkillLevel`, `FreelancerSkillInput`.
- [x] **1.F2** · `FreelancerProfileService` con `getSkills`, `getMyProfile`, `updateMyProfile`, `syncMySkills` (todos desempacando `r.data`).
- [x] **1.F3** · Setter público `setFreelancerProfile(profile)` en `AuthService` para actualizar el signal tras guardar.
- [x] **1.F4** · `ProfileEditorComponent` standalone en `features/freelancer/profile-editor/`
  - Reactive Form con todos los campos.
  - Selector de skills con chips + nivel + años.
  - Validación client-side espejo de las reglas backend.
  - Botón "Guardar" y "Cancelar".
- [x] **1.F5** · Ruta `/freelancer/profile/edit` con `authGuard + roleGuard(['freelancer'])` en `app.routes.ts`.
- [x] **1.F6** · Conectar botón "Completar perfil" de `freelancer-home.component.html:53` a la nueva ruta.
- [x] **1.F7** · Tests:
  - [x] `freelancer-profile.service.spec.ts` (4 métodos × happy path).
  - [x] `profile-editor.component.spec.ts` (form válido, inválido, submit OK, error 422).

### Documentación

- [x] **1.D1** · `docs/api.md`: añadir los 4 endpoints nuevos.
- [x] **1.D2** · `docs/roadmap.md`: marcar Fase 3 como ✅.
- [x] **1.D3** · `README.md`: actualizar tabla de endpoints y conteo de tests.
- [x] **1.D4** · Marcar todas las casillas de P1 en este CHECKLIST.

**Criterio de cierre:** un freelancer recién registrado puede ir al editor, rellenar perfil + skills, guardar, y ver el % de progreso de la home subir al 100%. ✅

---

## 🟡 P2 · Fase 4 · Catálogo público de freelancers

### Backend

- [x] **2.B1** · Endpoint `GET /api/freelancers?category=&city=&max_rate=&q=&page=` (público)
  - Base query: `FreelancerProfile::with(['user','skills'])->where('is_available', true)`.
  - Filtros combinables.
  - `paginate(12)`.
- [x] **2.B2** · Endpoint `GET /api/freelancers/{id}` (público).
- [x] **2.B3** · `FreelancerCatalogController` + `SearchFreelancersRequest` + `FreelancerCardResource` + `FreelancerDetailResource`.
- [x] **2.B4** · Tests Feature (`FreelancerCatalogTest.php`):
  - [x] Lista sin filtros (1ª página).
  - [x] Filtro categoría, ciudad, max_rate, q, combinados.
  - [x] Paginación `?page=2`.
  - [x] Empty results.
  - [x] Detalle por id → 200.
  - [x] Detalle id inexistente → 404.
  - [x] Detalle de freelancer no disponible → 404.
  - [x] (extra) No exposición de email en el detalle.
  - [x] (extra) `category` inválido → 422.

### Frontend

- [x] **2.F1** · `FreelancerCatalogService` con `search(filters)` y `getById(id)`.
- [x] **2.F2** · `FreelancerListComponent` en `features/freelancers/list/`
  - Grid + paginación + chips de filtros activos + estado vacío.
- [x] **2.F3** · `FreelancerDetailComponent` en `features/freelancers/detail/`
  - Vista pública (similar al "escaparate" pero solo lectura).
- [x] **2.F4** · Refactor `client-home.component.ts`
  - 3 categorías (Foto/Vídeo/Edición) que enlazan a `/freelancers?category=…`.
  - Buscador `(ngSubmit)` navega a `/freelancers?q=…&category=…`.
  - Sección "Profesionales destacados" con los 6 primeros del catálogo.
  - 6 perfiles demo registrados con `DemoFreelancersSeeder` para validar con datos reales.
- [x] **2.F5** · Rutas `/freelancers` y `/freelancers/:id` (sin guards, públicas).
- [x] **2.F6** · Tests:
  - [x] `freelancer-catalog.service.spec.ts` (4 tests).
  - [x] `freelancer-card.component.spec.ts` (7 tests, compartido).
  - [x] `freelancer-list.component.spec.ts` (4 tests).
  - [x] `freelancer-detail.component.spec.ts` (5 tests).
  - [x] `client-home.component.spec.ts` actualizado (3 categorías, 6 destacados).

### Documentación

- [x] **2.D1** · `docs/api.md`: 2 endpoints nuevos.
- [x] **2.D2** · `docs/roadmap.md`: Fase 4 ✅.
- [x] **2.D3** · `README.md`: endpoints + tests count.
- [x] **2.D4** · Marcar P2 en este CHECKLIST.

**Criterio de cierre:** un visitante anónimo entra en `/freelancers`, filtra por categoría y ciudad, abre el detalle de uno y ve toda la info pública (sin email, contacto vendrá en Fase 6 vía chat). ✅

---

## 🟢 Backlog futuro (sin atomizar, expandir cuando toque)

### P3 · Capacidades transversales
- [ ] Reset de password (`password_reset_tokens` ya existe).
- [ ] Verificación de email (`email_verified_at` ya existe).
- [ ] Edición de cuenta (`PUT /api/auth/me`).
- [ ] **Aceptar / rechazar propuesta** (`PATCH /api/briefs/{id}/proposals/{pid}/status`).

### P4 · Fases del producto
- [ ] **Fase 3.5** · Portfolio de imágenes para freelancers.
- [ ] **Fase 6** · Mensajería (polling primero, websockets después).
- [ ] **Fase 7** · Reviews y ratings.

### P5 · Calidad de plataforma / DevEx
- [ ] E2E con Playwright.
- [ ] CI/CD con GitHub Actions.
- [ ] Pipeline de lint (ESLint + Pint).
- [ ] Docker compose dev (php-fpm + nginx + mysql + node).
- [ ] Búsqueda full-text (Meilisearch).
- [ ] SSR (Angular Universal) para SEO.
- [ ] Logo / favicon / OG image.
- [ ] Auditar accesibilidad con `axe`/Lighthouse.

### P6 · Roles extendidos
- [ ] Sub-perfiles `agency` y `company`.
- [ ] Admin panel.
- [ ] OAuth (Google / GitHub).

---

## Convenciones de uso

- Al **completar** una tarea, sustituye `- [ ]` por `- [x]` y, si quieres, añade `<sub>fecha — commit hash</sub>` al final de la línea para rastrearlo.
- Al **abrir un bloque nuevo** (p.ej. cuando llegues a P3), atomízalo siguiendo el mismo formato que P1/P2.
- Si descubres una tarea **fuera de plan**, añádela al bloque P0 si bloquea o al backlog correspondiente si no.
- Mantener este archivo y `docs/roadmap.md` sincronizados: el roadmap cuenta la historia, este checklist es el estado operativo.
