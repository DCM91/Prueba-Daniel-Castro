# Roadmap y fases

> Documento vivo. Se actualiza al cerrar cada fase.

## Fases entregadas

### ✅ Fase 0 · Bootstrap (ya estaba en el repo)

- Backend Laravel 13 + PHP 8.5 + MySQL.
- Frontend Angular 21 standalone.
- App original: búsqueda en Wikipedia + historial.

> La app de Wikipedia se borró entera en la Fase 1. Solo queda el repo con su estructura monorepo.

### ✅ Fase 1 · Auth con JWT + modelo híbrido

**Objetivo:** registrar y loguear usuarios con JWT, sentar la base de datos para freelancers.

**Backend (Laravel 13)**
- Instalación de `php-open-source-saver/jwt-auth`.
- `.env`: `APP_NAME=FrameMatch`, `JWT_SECRET`, `JWT_TTL=60`, `JWT_REFRESH_TTL=20160`.
- Migraciones: `add_role_to_users_table`, `create_freelancer_profiles_table`, `create_skills_table`, `create_freelancer_skill_table`.
- Modelos: `User` (JWTSubject + role + hasOne profile), `FreelancerProfile`, `Skill`.
- `SkillSeeder`: 20 skills cargadas.
- `AuthController`: register (transaccional: user + profile si es freelancer), login, me, logout, refresh.
- `RegisterRequest` / `LoginRequest` con validaciones.
- `UserResource` que incluye `freelancer_profile` con skills.
- Guard `api` con driver `jwt`.
- Bootstrap: JSON 401 limpio en rutas `api/*` (en vez de "Route [login] not defined").
- **Tests:** 15 tests / 71 assertions. Cubren happy path + 422/401.

**Frontend (Angular 21)**
- Limpieza total del código de Wikipedia.
- `core/types/auth.types.ts` con `Role`, `User`, `AuthPayload`, etc.
- `TokenStorageService` con prefijo `framematch_` en localStorage.
- `AuthService` con signals: `token`, `currentUser`, `isAuthenticated`, `isClient`, `isFreelancer`, `isAdmin`, `hasAnyRole()`.
- `authInterceptor` (HttpInterceptorFn) adjunta `Bearer` token.
- `authGuard` y `roleGuard(roles[])` parametrizable.
- Componentes: `LandingComponent` (público), `LoginComponent`, `RegisterComponent` (selector visual cliente/freelancer), `DashboardComponent` (protegido, base).
- **Tests:** 16 tests / 4 suites.

**Documentación**
- `README.md` con stack, setup, endpoints, testing.

### ✅ Fase 2 · Landings diferenciadas por rol

**Objetivo:** tras login, cada rol ve su propia landing. Estética oscura con acentos morado/celeste.

**Frontend**
- `AuthService.homePathFor(role)`: single source of truth.
- `HomeRedirectComponent` en `/home` que enruta según rol.
- `ClientHomeComponent` en `/home/client`: hero con buscador + chips + 6 categorías + 6 freelancers destacados + "Cómo funciona".
- `FreelancerHomeComponent` en `/home/freelancer`: hero personalizado + card de progreso (computed con peso 15/20/10/15/15/5/20) + "Tu escaparate" preview + 4 stats + 3 tips.
- `DashboardComponent` borrado (las landings lo absorben).
- Login/register navegan a `/home` (que redirige al sub-path del rol).
- `redirectIfAuthenticatedGuard` para que `/login` y `/register` salten a `/home` si ya hay sesión.
- **Intercepción 401**: si una API devuelve 401 y no es `/auth/login`, limpia sesión y va a `/login`.
- **Defensiva**: `submit()` con callback `complete` que siempre resetea `submitting` y `console.error` para depurar.
- **Tests:** 33 tests / 8 suites (login/register actualizados para esperar `/home`).

**Backend**
- Sin cambios.

**Documentación**
- Esta `docs/roadmap.md` + `docs/architecture.md` + `docs/design-system.md` + `docs/api.md` + `docs/database.md`.
- `AGENTS.md` raíz + `backend/AGENTS.md` + `frontend/AGENTS.md` (en esta fase de docs).

### ✅ Fase 2.5 · Documentación (esta fase)

- `AGENTS.md` raíz: convenciones del monorepo, navegación, glosario.
- `docs/architecture.md`: capas, decisiones, flujos end-to-end, glosario técnico.
- `docs/design-system.md`: paleta, tipografía, espaciado, catálogo de componentes, estados, accesibilidad.
- `docs/api.md`: endpoints, request/response, errores, JWT, tests, smoke test con curl.
- `docs/database.md`: ER, tablas, índices, patrones de uso, decisiones.
- `docs/roadmap.md`: este archivo.
- `backend/AGENTS.md`: convenciones backend (próximo paso).
- `frontend/AGENTS.md`: convenciones frontend (próximo paso).
- `README.md`: índice de docs.

### ✅ Fase 3 · Edición del perfil de freelancer

**Objetivo:** que el profesional rellene su `freelancer_profiles` (display_name, bio, city, hourly_rate, price_per_project) y seleccione skills del catálogo. Conectar el botón "Completar perfil" de la landing freelancer.

**Backend (Laravel 13)**
- `GET /api/skills` (público) → `SkillController::index` + `SkillResource`. Devuelve las 20 skills activas ordenadas por nombre.
- `GET /api/freelancer/me` (JWT freelancer) → `FreelancerProfileController::show` + `FreelancerProfileResource`. Incluye `skills` con `level` y `years_experience` del pivot.
- `PUT /api/freelancer/me` (JWT freelancer) → `UpdateProfileRequest` con validaciones en español. Acepta `PATCH`-semantics (todos los campos opcionales). Convierte strings vacíos a `null` en `display_name`/`bio`/`city`.
- `PUT /api/freelancer/me/skills` (JWT freelancer) → `SyncSkillsRequest` con `skills.*.skill_id|level|years_experience`. Reemplaza todas las skills anteriores (semántica `sync`).
- Nuevo middleware `App\Http\Middleware\EnsureUserIsFreelancer` que aborta con 403 si el usuario autenticado no tiene `role=freelancer`.
- **Tests:** 10 nuevos (120 assertions nuevas). Cubre 422/403/200 y la re-sincronización del pivot.

**Frontend (Angular 21)**
- Tipos nuevos en `auth.types.ts`: `SkillLevel`, `FreelancerProfileSkill` (extiende `Skill` con `level` y `years_experience`), `FreelancerSkillInput`.
- `FreelancerProfileService` con 4 métodos que desempaquetan `r.data` (`getSkills`, `getMyProfile`, `updateMyProfile`, `syncMySkills`).
- `AuthService.setFreelancerProfile(profile)`: setter público que actualiza el signal `currentUser` y persiste en localStorage sin tocar el token.
- `ProfileEditorComponent` standalone en `features/freelancer/profile-editor/`. Carga inicial con `forkJoin({ skills, profile })`. Form reactivo con:
  - **Datos básicos**: `display_name` ≤100, `bio` ≤1000, `city` ≤80, `hourly_rate`/`price_per_project` numéricos ≥0, `is_available` checkbox.
  - **Tus skills**: chips del catálogo + filas expandidas con `level` (select) y `years_experience` (input number).
- Submit único: `PUT /me` → `switchMap` → `PUT /me/skills` → `auth.setFreelancerProfile(...)` → `router.navigate(['/home/freelancer'])`. Si el segundo PUT falla, los datos básicos ya están guardados.
- Errores 422: bindean `r.error.errors` a un signal `globalErrors` que la plantilla pinta bajo cada input.
- Nueva ruta `GET /freelancer/profile/edit` con `authGuard + roleGuard(['freelancer'])`, lazy-loaded.
- Botón "Completar perfil" de la landing freelancer ahora navega a `/freelancer/profile/edit` (`FreelancerHomeComponent.goToEdit()`).
- **Tests:** 25 nuevos. `freelancer-profile.service.spec.ts` (4 métodos) + `profile-editor.component.spec.ts` (4 escenarios: carga inicial, form inválido, submit OK con 2 PUT secuenciales, 422 con errores por campo).

**Total acumulado:** backend 25 tests / 190 assertions, frontend 62 tests / 11 suites.

### ✅ Fase 4 · Catálogo público de freelancers

**Objetivo:** que un visitante anónimo pueda descubrir profesionales vía `/freelancers` con filtros (categoría, ciudad, tarifa, búsqueda libre) y abrir un detalle `/freelancers/:id`. Conectar el buscador y los chips de la landing cliente.

**Backend (Laravel 13)**
- `GET /api/freelancers` (público, paginado 12/pág): filtros combinables `q`, `category` (photo/video/edit via JOIN a `freelancer_skill`→`skills`), `city`, `max_rate`. Excluye `is_available=false`. Ordena por `hourly_rate ASC, display_name ASC`.
- `GET /api/freelancers/{id}` (público): detalle. 404 si no existe o no está disponible. **No** expone `email`/`password` (decisión: el contacto vendrá en Fase 6 vía chat interno).
- Nuevos: `FreelancerCatalogController`, `SearchFreelancersRequest`, `FreelancerCardResource` (con `top_skills`, `skills_count`, `profile_completion`), `FreelancerDetailResource` (incluye `bio`, `price_per_project`, `created_at` y `skills` completo).
- `DemoFreelancersSeeder`: 6 perfiles demo (Lucia, Diego, Nuria, Marcos, Aitana, Pablo) en ciudades españolas, con skills reales del seed. Idempotente (`updateOrCreate` por email). No corre en `migrate:fresh --seed` por defecto.
- **Tests:** 13 nuevos / 90 assertions. Cubre: paginación, filtros individuales, filtros combinados con `q`, empty results, exclusión de no disponibles, 200/404 del detalle, no exposición de email, 422 con `category` inválida.

**Frontend (Angular 21)**
- Tipos nuevos en `auth.types.ts`: `FreelancerCard`, `FreelancerDetail`, `FreelancerCardSkill`, `FreelancerSearchFilters`, `Paginated<T>`.
- `FreelancerCatalogService` con `search(filters)` (devuelve `Paginated<FreelancerCard>`) y `getById(id)` (devuelve `FreelancerDetail`). Construye `HttpParams` solo con filtros no vacíos.
- `FreelancerCardComponent` compartido en `features/freelancers/`: card con avatar (iniciales + gradiente), display_name, ciudad, tarifa (`hourly_rate` o "Consultar" si null), top 3 skills con level, badge Disponible/Ocupado, link al detalle.
- `FreelancerListComponent` en `features/freelancers/list/`: hero, barra de filtros (q, category, city, max_rate) que se sincronizan con `queryParams` para URLs compartibles, grid de cards, paginación, estados loading/empty/error, botón "Limpiar".
- `FreelancerDetailComponent` en `features/freelancers/detail/`: header con avatar + status, tarifas (hourly + project), bio truncada a 4 líneas con "Ver más" (signal `bioExpanded`), grid completo de skills con `level` y `years_experience`, estado 404 ("Perfil no disponible") con botón volver.
- Rutas `/freelancers` y `/freelancers/:id` (públicas, lazy-loaded) en `app.routes.ts`.
- `ClientHomeComponent` refactor: 3 categorías (Foto/Vídeo/Edición) que enlazan a `/freelancers?category=…`. Buscador del hero navega a `/freelancers?q=…&category=…`. Nueva sección "Profesionales destacados" que carga los 6 primeros del catálogo (oculta si está vacía). Botón "Ver todos los profesionales" al final.
- **Tests:** 4 suites nuevas (catalog service, card, list, detail) + 1 actualizada (client home) = 27 tests. Total: 84 tests / 15 suites.

**Total acumulado:** backend **38 tests / 280 assertions**, frontend **84 tests / 15 suites**.

### ✅ Fase "Home + i18n + Briefs" (bonus)

**Objetivo:** reestructurar la home para que el brand "FrameMatch" sea el protagonista visual, añadir soporte bilingüe (es + en) con un selector de idioma, e implementar briefs + propuestas para conectar clientes y profesionales.

#### A · Home restructure con brand prominente
- `BrandLogoComponent` reusable (`core/components/brand-logo/`) con SVG inline (símbolo "F" en gradiente morado→celeste + dot, wordmark con gradient). 4 tamaños: `sm` / `md` / `lg` / `xl`.
- `LandingComponent` restructurado: topbar con brand + 2 categorías, hero XL con el logo grande + wordmark en gradiente, orbes morado/celeste en background con `prefers-reduced-motion`, 3 cards de categoría (Foto/Vídeo/Edición), 3 pasos "Cómo funciona", footer con brand.
- Topbars actualizados en TODAS las páginas (landing, login, register, client home, freelancer home, freelancer list, freelancer detail, profile editor) para usar el `BrandLogoComponent`.
- Hero del landing usa `<h1>` con el wordmark "FrameMatch" en 56-110px con gradiente multicolor.
- Botón "Ver perfil" del card de freelancer (Fase 4) ahora navega correctamente.
- **Tests:** 5 nuevos en `landing.component.spec.ts`, 5 en `brand-logo.component.spec.ts`.

#### B · Internacionalización (i18n)
- Diccionarios JSON en `src/assets/i18n/es.json` y `en.json` cargados por HTTP al arrancar.
- `LanguageService` (`core/services/language.service.ts`): signal de idioma activo, carga perezosa de diccionarios, persistencia en `localStorage` con clave `framematch_lang`, fallback a `navigator.language`.
- `TranslatePipe` (`core/pipes/translate.pipe.ts`): `{{ 'key' | t }}` o `{{ 'key' | t : { name: 'X' } }}` con interpolación `{{var}}`.
- `LanguageSelectorComponent` (`core/components/language-selector/`): dropdown en topbar con el código del idioma activo (ES / EN) y menú con los soportados.
- Todos los componentes visibles (landing, login, register, client home, freelancer home, freelancer card/list/detail, profile editor) usan `| t` en vez de strings hard-coded.
- `provideLanguageServiceMock()` helper para tests (`core/testing/language-service.mock.ts`).
- **Tests:** 9 nuevos en `language.service.spec.ts` + 3 en `language-selector.component.spec.ts` + specs actualizados en todos los componentes con i18n.

#### C · Briefs + Propuestas (matching cliente ↔ profesional)
**Backend (Laravel 13)**
- 2 migraciones nuevas: `briefs` y `proposals`. `proposals` con `UNIQUE(brief_id, freelancer_id)` para prevenir duplicados.
- 2 enums nuevos: `BriefStatus` (draft/published/in_review/assigned/completed/cancelled) y `ProposalStatus` (pending/accepted/rejected/withdrawn).
- 2 modelos Eloquent: `Brief` (belongsTo client, hasMany proposals) y `Proposal` (belongsTo brief + freelancerProfile).
- 4 FormRequests: `StoreBriefRequest`, `UpdateBriefRequest`, `StoreProposalRequest`, `UpdateBriefRequest` con validaciones en español.
- 2 Resources: `BriefResource` (incluye `proposals_count` via `whenCounted`) y `ProposalResource` (con `freelancer` anidado via `whenLoaded`).
- 2 Controllers: `BriefController` (CRUD con `scope=mine`) y `ProposalController` (store + index, solo el cliente del brief ve todas las propuestas).
- **Tests:** 16 tests / 41 assertions en `BriefsAndProposalsTest.php`. Cubre happy path + 401/403/404/422.

**Frontend (Angular 21)**
- Tipos nuevos en `auth.types.ts`: `BriefStatus`, `ProposalStatus`, `Brief`, `BriefInput`, `Proposal`, `ProposalInput`, `ProposalFreelancer`.
- 2 servicios: `BriefsService` (list, getById, create, update, delete) y `ProposalsService` (listForBrief, create).
- 3 componentes: `BriefListComponent` (público, con tabs Todos/Mis briefs), `BriefDetailComponent` (público, vista de cliente con propuestas recibidas o form de propuesta para freelancers), `BriefFormComponent` (cliente, con reactive form), `ProposalFormComponent` (freelancer, form embebido en el detalle).
- 3 rutas nuevas: `/briefs`, `/briefs/new` (authGuard + roleGuard['client']), `/briefs/:id` (público).
- Link "Briefs" en el topbar del cliente y botón "+ Nuevo brief" cuando aplica.
- **Tests:** 4 nuevos (brief-list, brief-detail).

**Total acumulado:** backend **62 tests / 343 assertions**, frontend **107 tests / 21 suites**.

### ✅ Fase 5.1 · i18n de briefs + hotfixes de UI

**Objetivo:** cerrar los warnings NG8113 (`TranslatePipe` importado pero no usado) en los componentes de briefs, cubriendo todos los strings visibles con la pipe `| t`. De paso, arreglar bugs de UI detectados en sesión.

**Frontend (Angular 21)**
- Nuevo namespace `briefs.{list,detail,form}` en `src/assets/i18n/{es,en}.json` con todas las claves (tabs, estados, placeholders, presupuestos, propuestas, plurales).
- `brief-list.component.html`: `| t` en `scope_all` / `scope_mine` / `new_brief` / `title` / `subtitle` / `loading` / `error` / `empty` / `count` / `deadline_label` / `proposal_count_{one,other}` / `prev` / `next` / `page_info`. Se usa `@let count = b.proposals_count` para que la pipe reciba `number` y no `undefined`.
- `brief-detail.component.html`: `| t` en `loading` / `not_found` / `published_by_before` / `description` / `budget` / `budget_range` / `budget_from` / `budget_up_to` / `proposals_title` / `proposals_empty` / `freelancer_fallback` / `cancel` / `submit_proposal` / `deadline_label` (reusado del list). Se usa `@let` para que `budget_min` / `budget_max` (nullable) pasen el tipo `Record<string, string|number>` de la pipe.
- `brief-form.component.ts` (template inline): `| t` en `back` / `title` / `subtitle` / todos los `label_*` / `title_min` / `description_min` / `submit` / `submitting`. Las opciones del select de categoría reusan `skill_categories.{photo,video,edit}`.
- `provideLanguageServiceMock('es', { briefs: { ... } })` actualizado en los dos specs de briefs que mockean diccionarios reducidos.
- **Bug fix (profile-editor):** `skillsForm` se movió a declararse **antes** de `basicForm` y se incluyó como control `skills: this.skillsForm` en el `FormGroup` raíz. Antes el `<ul formArrayName="skills">` del template no encontraba el control en el padre y los `<select>`/`<input>` de "Nivel" y "Años" no se bindeaban, aunque el spec seguía verde porque accedía al array directamente.
- **Bug fix (landing):** eliminado el bloque `<div class="hero-brand">` con el `app-brand-logo xl` (`hideWordmark`) que quedaba entre el eyebrow y el `<h1>` y se comía el foco visual. Limpiadas las reglas CSS `.hero-brand` y `.eyebrow` asociadas.
- **Responsive landing:** dos media queries nuevos en `landing.component.css`. `@media (max-width:720px)`: topbar wrap, nav a segunda fila, hero padding 56/18/48, CTAs full-width, secciones compactas, orbes reducidos. `@media (max-width:420px)`: se oculta `.link-login` del topbar y se ajusta el `letter-spacing` de h1. Bajado el `min` del `clamp()` de h1 de 56px a 40px.
- **Hotfix de ruido en tests:** `setup-jest.ts` movido a `setupFilesAfterEnv` (corre con `beforeEach`/`jest` disponibles) y mockea `console.error`/`console.warn` por test, restaurándolos en `afterEach`. Los specs de path negativo ya no contaminan la salida con stack traces.
- **Tests:** 1 nuevo en `brief-list.component.spec.ts` (plural `propuesta` vs `propuestas`). Total: **108 tests / 21 suites**.

**Total acumulado:** backend **62 tests / 343 assertions**, frontend **108 tests / 21 suites**.

#### 5.1.1 · Fix de FOUT en i18n + detección de navegador

- **FOUT:** al abrir la app por primera vez se veían las keys literales (`briefs.list.title`, etc.) durante ~100 ms hasta que llegaban los JSON de los diccionarios. Causa: el `LanguageService` disparaba los `HttpClient.get` en el constructor con `void this.loadAll()` fire-and-forget. Fix: `LanguageService` expone `readonly ready: Promise<void>` resuelto al final de `loadAll()`, y `app.config.ts` lo enchufa a `provideAppInitializer(() => inject(LanguageService).ready)`. Angular no arranca el bootstrap hasta que los diccionarios están en memoria → la primera vez que se ve la UI ya viene traducida.
- **Detección de navegador:** `readStoredLanguage` ya no hardcodea `if (nav.startsWith('en'))`. Ahora itera sobre `this.supported` y matchea la primera coincidencia, con fallback explícito a `DEFAULT_LANGUAGE` (`es`). `navigator.language = 'es-ES'` se detecta como `es`; `'fr-FR'` cae a `es` (antes caía "por suerte" al default).
- **Mock:** `provideLanguageServiceMock` ahora expone `ready: Promise.resolve()`.
- **Tests nuevos (3):** `ready` resuelve sólo cuando ambos diccionarios están cargados; `navigator.language = 'es-ES'` → `'es'`; `'fr-FR'` → `'es'` (fallback explícito). Total: **111 tests / 21 suites**.

**Total acumulado:** backend **62 tests / 343 assertions**, frontend **111 tests / 21 suites**.

### ✅ Fase 5.2 · Disciplina "Creación de Contenido" + rebalanceo de skills

**Objetivo:** añadir una 4ª disciplina a la plataforma para cubrir el trabajo de redacción, guion, redes sociales, pódcast y otras formas de contenido digital. De paso, rebalancear la categoría `edit` (que estaba en 4 skills) y revisar todos los textos que mencionaban solo foto/vídeo para que reflejen las 4 disciplinas.

**Backend (Laravel 13)**
- `App\Enums\SkillCategory` añade `case Content = 'content';` y la entrada correspondiente en `labels()`.
- Nueva migración `2026_06_12_140000_add_content_to_skills_category_enum.php`:
  - En MySQL: `ALTER TABLE skills MODIFY category ENUM('photo','video','edit','content') NOT NULL`.
  - En SQLite (usado en tests): drop del índice `skills_category_index`, drop de la columna `category` (que tiene CHECK constraint del `enum()` original), recreación como `VARCHAR(32)`, recreación del índice.
  - `down()` simétrico: en MySQL migra filas `content → edit` antes de encoger; en SQLite revierte a `enum('photo','video','edit')`.
- `SkillSeeder` añade 4 skills a `edit` (Subtitulado, VFX y efectos visuales, Edición de audio, Retoque fotográfico) y 6 skills nuevas a `content` (Copywriting, Guion para vídeo, Gestión de redes sociales, Producción de pódcast, Locución, Newsletter y email marketing). Total: 8/8/8/6 = **30 skills**.
- `StoreBriefRequest`, `UpdateBriefRequest`, `SearchFreelancersRequest` añaden `SkillCategory::Content->value` al `in:` rule. Los dos primeros que tienen `messages()` actualizan el texto custom a `'La categoria debe ser photo, video, edit o content.'`.
- Tests: `AuthTest::test_skill_seeder_creates_skills` añade asserts para slugs de la nueva categoría (`copywriting`, `locucion`). `FreelancerProfileTest::test_skills_index_returns_seeded_skills` añade `assertGreaterThanOrEqual(4, Skill::query()->where('category', 'content')->count())`.

**Frontend (Angular 21)**
- Tipo `SkillCategory` en `auth.types.ts` ahora `'photo' | 'video' | 'edit' | 'content'`.
- i18n ES + EN: nuevo `skill_categories.content`; renombrado `landing.tagline_photo_video` → `landing.tagline_disciplines` con valor `"fotografía, vídeo y creación de contenido"` / `"photo, video and content creation"`; `landing.section_categories_title_highlight` de "tres" a "cuatro" / "three" a "four"; nuevos `landing.cat_content_title`/`body`; `home.client.hero_lead_after` y `auth.register.role_freelancer_body` actualizados para mencionar contenido.
- `landing.component.html`: 4ª `<article class="cat-card" data-color="amber">` con SVG megáfono (`M3 11v2...`, `M16 8a4 4...`, `M19 5a8 8...`). Override en `landing.component.css`: `.cat-card[data-color="amber"] .cat-icon { color: #fcd34d; background: rgba(245,158,11,0.15); }`.
- `client-home.component.ts`: array `categories` ahora tiene 4 entradas (4ª `{ category: 'content', icon: 'megaphone', color: 'amber' }`). `client-home.component.html`: nuevo `@case ('megaphone')` en el switch de iconos con el mismo path SVG.
- `brief-form.component.ts`: 4ª `<option value="content">` en el `<select>` de categoría (template inline).
- `brief-list.component.html` y `brief-detail.component.html`: la pill de categoría pasa de `{{ b.category }}` a `{{ ('skill_categories.' + b.category) | t }}` para mostrar el texto traducido en vez del valor crudo del enum.
- `freelancer-list.component.ts`: 5ª entrada en `categoryOptions` (`{ value: 'content', label: 'Creación de Contenido' }`). El template ya lo pinta vía `| t`, así que este label se podría refactorizar a i18n en una iteración futura.
- `freelancer-detail.component.css`: nuevo `.skill-cat[data-cat="content"] { background: rgba(245,158,11,0.18); color: #fcd34d; }` (paleta amber consistente).
- Specs actualizados: `client-home.component.spec.ts` (asserts de 3 → 4 categorías + mock con `content`), `landing.component.spec.ts` (mock con `tagline_disciplines`/`cuatro disciplinas`/`cat_content_*`, renombrado el test a `'shows the categories section with 4 categories'` y añadido test del tagline), `brief-list.component.spec.ts` (mock con `skill_categories`, nuevo test de i18n de la pill), `brief-detail.component.spec.ts` (mock con `skill_categories`).

**Documentación**
- `docs/database.md`: ER del `category ENUM` actualizado, tabla `skills` con 4 valores, tabla de skills seedeadas con 8/8/8/6, columna `briefs.category` con 4 valores.
- `docs/api.md`: `category` validations con 4 valores, ejemplo de `/api/skills` con un skill de cada categoría, total a 62/388.
- `docs/design-system.md`: skill row con 4 colores, iconos incluyendo `megaphone`.
- `docs/roadmap.md`: esta entrada (Fase 5.2).
- `CHECKLIST.md`: hotfixes 0.13 (categoría content) y 0.14 (rebalanceo edición), entrada en "Fases entregadas", línea de validación 5.2.
- `README.md`: ER de skills, total backend a 62/388.
- `.agents/skills/backend-conventions/SKILL.md`: menciones a "20 skills (foto, vídeo, edición)" → "30 skills (foto, vídeo, edición, contenido)".

**Validación 5.2:** `npm test` (113/113, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/388) — todo en verde. ✅

**Total acumulado:** backend **74 tests / 431 assertions**, frontend **124 tests / 23 suites**.

### ✅ Fase 5.3 · OAuth con Google y Facebook

**Objetivo:** permitir que los usuarios se registren/inicien sesión con sus cuentas de Google o Facebook, sin pasar por el formulario de password. Si el email ya existe en la BD, se vincula automáticamente. Si es user nuevo, se crea como `client` y se le pide que elija rol en una página dedicada.

**Backend (Laravel 13)**
- Dependencias nuevas: `laravel/socialite:^5.21` + `socialiteproviders/google:^4.1` + `socialiteproviders/facebook:^4.0`.
- Enum nuevo `App\Enums\OAuthProvider` con casos `Google` y `Facebook` y helpers `labels()` / `values()`.
- Migración nueva `2026_06_12_150000_add_oauth_columns_to_users_table.php`:
  - `password` ahora nullable.
  - Columnas nuevas: `avatar_url` (VARCHAR 500), `oauth_provider` (VARCHAR 32), `oauth_id` (VARCHAR 191).
  - `UNIQUE (oauth_provider, oauth_id)` para evitar vincular dos users de FrameMatch al mismo OAuth id.
- Modelo `User` extendido: `avatar_url`, `oauth_provider`, `oauth_id` añadidos a `$fillable`. Cast `oauth_provider => OAuthProvider::class` (nullable). Helper `isOAuthUser(): bool`.
- `config/services.php`: bloques `google` y `facebook` con `client_id`, `client_secret`, `redirect` desde `env()`.
- `AppServiceProvider::boot()` registra los listeners de Socialite para `google` y `facebook`.
- Servicio nuevo `App\Services\OAuthService` con `findOrCreateUser(provider, oauthId, email, emailVerified, name, avatarUrl): array`:
  - 1) Busca por `(oauth_provider, oauth_id)` — usuario OAuth previo. Si lo encuentra, actualiza nombre/avatar.
  - 2) Si no, busca por `email`. Si existe, vincula `oauth_provider` + `oauth_id` y setea `email_verified_at=now()`.
  - 3) Si no, crea user con `role=client`, `password=null`, `email_verified_at=now()`, avatar, oauth_provider, oauth_id.
  - Todo en `DB::transaction`.
- `OAuthController` con 3 métodos:
  - `redirect($provider)`: genera `state` aleatorio, lo guarda en sesión con clave `oauth_state.{provider}`, devuelve `Socialite::driver($provider)->stateless()->with(['state' => $state])->redirect()`.
  - `callback($provider)`: valida `state` con `hash_equals`, llama a `Socialite::user()`, delega en `OAuthService::findOrCreateUser()`, emite JWT con `Auth::guard('api')->login($user)`, redirige a `{FRONTEND_URL}/auth/callback?token=…&expires_in=…&new_user=0|1`.
  - `completeProfile(CompleteOAuthProfileRequest)`: actualiza `role`, crea `FreelancerProfile` vacío si freelancer, recarga relación, re-emite JWT, devuelve mismo shape que login.
- `CompleteOAuthProfileRequest` con `role` ∈ `client` | `freelancer`.
- Rutas nuevas en `routes/api.php`:
  - `GET /api/auth/oauth/{provider}/redirect` (con middleware `web` para sesiones).
  - `GET /api/auth/oauth/{provider}/callback` (idem).
  - `POST /api/auth/oauth/complete-profile` (JWT).
- Tests nuevos `tests/Feature/OAuthTest.php` (12 tests / 43 assertions): redirect a Google con state, redirect a Facebook, provider inválido (404), state inválido (419), user nuevo con default `client`, auto-link con user existente, callback Facebook, complete-profile con client (sin profile), complete-profile con freelancer (crea profile), sin auth (401), role inválido (422).

**Frontend (Angular 21)**
- Tipo nuevo `OAuthProvider = 'google' | 'facebook'` en `auth.types.ts`. Tipo `User` extendido con `avatar_url?` y `oauth_provider?`.
- `AuthService`:
  - `loginWithOAuth(provider)`: `window.location.href = '/api/auth/oauth/' + provider + '/redirect'`.
  - `handleOAuthCallback(token, expiresIn)`: persiste el token en storage + signals, programa refresh basado en el `exp` del JWT (decode manual) o en `expiresIn` como fallback.
  - `completeOAuthProfile(role)`: `POST /api/auth/oauth/complete-profile`, persiste sesión.
  - `fetchCurrentUser()`: helper para refrescar `currentUser` después del callback.
- Rutas nuevas en `app.routes.ts`:
  - `/auth/callback` (público) → `OAuthCallbackComponent`.
  - `/auth/complete-profile` (`authGuard`) → `OAuthCompleteProfileComponent`.
- `OAuthCallbackComponent`: lee `token`, `expires_in`, `new_user` de query params, llama a `auth.handleOAuthCallback`, redirige a `/auth/complete-profile` si es nuevo o a `/home` (tras `fetchCurrentUser`) si no. Maneja `?error=access_denied` mostrando mensaje.
- `OAuthCompleteProfileComponent`: reusa el role selector visual del `RegisterComponent`, `auth.completeOAuthProfile(role)`, redirige a `/home`.
- `LoginComponent` y `RegisterComponent` añaden divider "o" + 2 botones OAuth (Google con logo 4-colores oficial, Facebook con fondo `#1877F2`) después del form principal. CSS responsive, full-width.
- i18n ES+EN: namespace `auth.oauth.*` con 11 claves (or, continue_with_google, continue_with_facebook, error_generic, error_provider_denied, error_callback_failed, callback_processing, complete_profile_title, complete_profile_subtitle, submit_role, submitting_role).
- Specs nuevos: `OAuthCallbackComponent` (4), `OAuthCompleteProfileComponent` (3), `AuthService` (4 nuevos en el `describe('OAuth')`).

**Documentación**
- `docs/database.md`: tabla `users` con columnas OAuth, sección "OAuth (Google / Facebook)" con la estrategia de auto-vinculación.
- `docs/api.md`: 3 endpoints nuevos documentados con shape exacta + errores + nota de que OAuth no se prueba con curl.
- `docs/architecture.md`: diagrama de capas actualizado, ASCII del flujo OAuth end-to-end (10 pasos).
- `docs/roadmap.md`: esta entrada.
- `docs/design-system.md`: fila "Botón OAuth" en el catálogo.
- `CHECKLIST.md`: Fase 5.3, hotfixes 0.15+0.16, línea de validación.
- `README.md`: sección "Login con Google / Facebook" con link a `docs/roadmap.md` y `docs/api.md` para los pasos detallados.
- `.agents/skills/backend-conventions/SKILL.md`: sección "OAuth / Socialite" con convenciones (state CSRF, auto-link, transaccionalidad, `email_verified_at`, password nullable, cómo añadir un provider nuevo, .env placeholders, tests con mocks).
- `.agents/skills/frontend-conventions/SKILL.md`: sección "OAuth frontend" (flujo de redirección, `OAuthCallbackComponent`, `OAuthCompleteProfileComponent`, botones con logos oficiales, i18n).
- `.env.example`: placeholders para `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `FACEBOOK_CLIENT_ID/SECRET/REDIRECT_URI`, `FRONTEND_URL`.

**Validación 5.3:** `npm test` (124/124, 23 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) — todo en verde. ✅

**Total acumulado:** backend **74 tests / 431 assertions**, frontend **124 tests / 23 suites**.

### ✅ Fase 5.4 · CoreTopbar unificado con enlaces role-aware

**Objetivo:** consolidar los 13 topbars inconsistentes en un único `CoreTopbarComponent` reutilizable, con 4 variants (`public`, `auth`, `client`, `freelancer`) y enlaces por rol. De paso, arreglar bugs de OAuth-complete-profile (brand-logo raw, lang-slot vacío, aria-label hardcoded en español, error message hardcoded).

**Frontend (Angular 21)**
- `frontend/src/app/core/components/topbar/` — nuevo `CoreTopbarComponent` (standalone, OnPush, signal inputs, 2 outputs: `logoutClick` y `backClick`).
  - Inputs: `variant` (required), `backLink?`, `extraLinks?`, `langSelector?` (default true), `showUser?` (default true).
  - Computed: `navLinks` (defaults por variant), `isSticky` (false en `auth`), `brandHref` (`/` para public/auth, `/home` para client/freelancer), `initials` (max 2 chars uppercased), `rolePillKey` (`roles.${role}`).
  - Defaults internos: `CLIENT_DEFAULT_LINKS` = Inicio/Profesionales/Briefs, `FREELANCER_DEFAULT_LINKS` = Inicio/Mi perfil.
  - CSS unificado: padding `18px 32px` desktop / `14px 18px` mobile, sticky+backdrop en public/client/freelancer, no-sticky en auth. Responsive: `@media (max-width:720px)` colapsa nav a 2ª fila + oculta user-name; `@media (max-width:420px)` oculta logout + role-pill + back.
  - User area: client → name + role-pill + logout; freelancer → name + avatar (initials) + logout. Ambos hidden si `showUser=false` o `user=null`.
- **Refactors a `<app-core-topbar>`** (11 componentes): `LoginComponent`, `RegisterComponent`, `OAuthCompleteProfileComponent`, `ClientHomeComponent`, `FreelancerHomeComponent`, `ProfileEditorComponent` (+ `backLink` a `/home/freelancer`), `FreelancerListComponent`, `FreelancerDetailComponent` (+ `backLink` a `/freelancers`), `BriefDetailComponent` (+ `backLink` a `/briefs`), `BriefFormComponent` (+ `backLink` a `/briefs`). Cada uno pierde su `<header class="topbar">` + CSS asociado y su `RouterLink`/`Router` cuando ya no son necesarios.
- **Excepciones documentadas** (siguen con su topbar propio):
  - `LandingComponent`: tiene anchors in-page (`#how`, `#categories`) que no encajan en `RouterLink`.
  - `BriefListComponent`: tiene scope tabs (`Todos`/`Mis briefs`) y CTA `+ Nuevo brief` condicionales por rol, lógica muy específica que prefiere mantenerse inline.
- **Fixes de `OAuthCompleteProfileComponent`**: el `<span class="brand-text">FrameMatch</span>` se sustituye por `<app-brand-logo>` (vía `CoreTopbarComponent`), el `<span class="lang-slot">` vacío se rellena con el language-selector real, el aria-label hardcoded `'FrameMatch, ir al inicio'` se elimina (lo pinta el topbar via `'app.brand' + ', ' + 'topbar.go_home'`), y el string hardcoded `'Error al completar el perfil.'` se sustituye por la nueva i18n key `auth.oauth.error_complete_profile`.
- **i18n ES + EN**: 7 claves nuevas bajo `topbar.nav.*` (home, professionals, briefs, profile) y `topbar.back_*` (to_briefs, to_home, to_profile). 1 clave `auth.oauth.error_complete_profile`. Todas con traducción EN coherente.
- **Tests nuevos**:
  - `core/components/topbar/topbar.component.spec.ts` (10 tests): 4 variants, back-link, logout emit, back emit, hide user area sin currentUser, ocultar nav en public, initials computation.
  - 1 test en `brief-detail.component.spec.ts` (back-to-briefs).
  - 1 test en `freelancer-detail.component.spec.ts` (back-to-catalog).
  - 1 test en `profile-editor.component.spec.ts` (back-to-home).
- **Tests actualizados**: `oauth-complete-profile.component.spec.ts` añade mock de `ActivatedRoute` (necesario para `RouterLink` interno del topbar). Los specs existentes de features (login, register, client-home, freelancer-home) siguen pasando sin tocarse porque solo leen `textContent` y siguen encontrando el contenido.

**Documentación**
- `docs/design-system.md`: nueva fila "CoreTopbar (Fase 5.4)" con todos los tokens, variants, responsive rules y excepciones.
- `docs/architecture.md`: "Última revisión" actualizada a Fase 5.4. Diagrama de capas añade `core/components/topbar/` en el bloque de core/components. Sección "Lo que NO tenemos" actualiza i18n: "Con i18n (ES + EN)".
- `docs/roadmap.md`: esta entrada.
- `CHECKLIST.md`: hotfix 0.17 (Topbar unificado). Entrada en "Fases entregadas" para Fase 5.4. Línea de validación 5.4.
- `README.md`: sin cambios significativos (la estructura interna cambia pero el comportamiento externo es el mismo).
- `.agents/skills/frontend-conventions/SKILL.md`: nueva sección "Topbar" dentro de "Capas del frontend" con:
  - Convención: usar `<app-core-topbar [variant]="…">` SIEMPRE. No inline un `<header class="topbar">` en un feature.
  - Variants y sus nav links por defecto.
  - Para detail pages: pasar `[backLink]="{ labelKey, route }"`. NO usar `Location.back()` ni hardcoded.
  - Excepciones: `LandingComponent` y `BriefListComponent`.
  - Tests: mockear `AuthService` con `{ currentUser: signal<User | null>(...) }` (forma signal, no función, para que los computeds del topbar reaccionen).
  - Specs dedicados en `core/components/topbar/topbar.component.spec.ts`. Los specs de features no deben asertar sobre la estructura del topbar — solo sobre el contenido (textContent).

**Validación 5.4:** `npm test` (137/137, 24 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) — todo en verde. ✅

**Total acumulado:** backend **74 tests / 431 assertions**, frontend **137 tests / 24 suites**.

### ✅ Fase 5.5.A · Foundations + Avatar (Cloudinary)

**Objetivo:** introducir Cloudinary en el stack y habilitar la subida de foto de perfil. Cubre avatares; cover, portfolio y brief attachments vienen en 5.5.B y 5.5.C.

**Estrategia de upload:** *Frontend → Cloudinary directo con unsigned preset*. El browser sube el archivo a `https://api.cloudinary.com/v1_1/{cloud}/image/upload` con `upload_preset=fm_av_upl` y devuelve `{ public_id, secure_url, ... }`. El frontend hace `POST /api/me/avatar` con ese `public_id` y el backend lo **verifica contra la Admin API** antes de persistirlo. Los 4 unsigned presets están configurados en el dashboard con carpeta fija, formatos permitidos, tamaño y dimensiones máximos.

**Carpetas en Cloudinary:**
```
framematch/
├── avatars/                       ← 1 por user
├── covers/                        ← 5.5.B
├── portfolios/                    ← 5.5.B
└── briefs/                        ← 5.5.C
```

**Backend (Laravel 13)**
- Dependencia nueva: `cloudinary/cloudinary_php:^3.1`.
- `App\Services\Cloudinary\CloudinaryServiceInterface` + `CloudinaryService` (concreto, usa `Http` facade de Laravel para Admin API + URL building manual con transformaciones `w_*,h_*,c_fill,g_auto,r_max,q_auto,f_auto`) + `CloudinaryServiceFake` (test double). Tamaño de avatar `xs:40, sm:80, md:200, lg:400, xxl:800`. Bind en `AppServiceProvider::register`.
- `config/services.php`: bloque `cloudinary` con `cloud_name`, `api_key`, `api_secret`, `presets` y `folders`.
- `.env` + `.env.example`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_PRESET_AVATAR/COVER/PORTFOLIO/BRIEF`. La API secret va SOLO en `.env` local (gitignored).
- `App\Exceptions\CloudinaryVerificationException` para errores de verificación.
- `App\Http\Requests\Avatar\StoreAvatarRequest` con validaciones de tamaño/format y regex estricto para `public_id`.
- `App\Http\Resources\UserResource` extendido: ahora expone `avatar_url` (URL original) + `avatar_urls: { xs, sm, md, lg, xxl }` (URLs transformadas, null si no hay avatar). El `AuthController` inyecta el servicio y pasa los URLs pre-construidos.
- `App\Http\Controllers\Api\UserAvatarController` con `store` y `destroy`. Endpoints: `POST /api/me/avatar` y `DELETE /api/me/avatar` con `throttle:30,1`. `store` verifica el `public_id` con la Admin API, borra el avatar anterior si cambia, y persiste. `destroy` borra el archivo de Cloudinary best-effort y limpia las columnas.
- Migración `2026_06_14_174418_add_avatar_public_id_to_users_table` añade `avatar_public_id VARCHAR(191) NULL` después de `avatar_url`. Permite borrar el archivo de Cloudinary cuando se cambia/elimina el avatar.
- `User` model: `avatar_public_id` añadido a `$fillable`.
- Rutas movidas al grupo `auth:api` (no bajo `prefix('auth')`) para que la URL sea `/api/me/avatar` (no `/api/auth/me/avatar`).
- **Seguridad:** el backend NUNCA confía en el `public_id` enviado por el cliente. Siempre llama a `CloudinaryService::verifyResource($publicId, $expectedFolder)` que:
  1. Hace `GET https://api.cloudinary.com/v1_1/{cloud}/resources/image/upload/{public_id}` con basic auth.
  2. Comprueba que `resource_type === 'image'`.
  3. Comprueba que el `folder` del recurso coincide con `framematch/avatars/...`.
  4. Lanza `CloudinaryVerificationException` (que se convierte en 403) si algo falla.
- **Tests:** 13 unit (`CloudinaryServiceTest` con `Http::fake()` para Admin API + verificación de URLs y helpers) + 9 feature (`AvatarUploadTest` con `CloudinaryServiceFake`) = 22 nuevos. Cubre happy path 200, 401 sin token, 422 con payload inválido, 403 con `public_id` de otra carpeta, 403 con `public_id` inexistente, delete OK, delete sin avatar, delete sin auth, replace avatar (borra el anterior).

**Frontend (Angular 21)**
- Sin nuevos paquetes npm. El frontend sube con `HttpClient.post(cloudinaryApi, FormData)` directo. Esto evita arrastrar el paquete `@cloudinary/ng` (Angular 12-era) que no encaja con Angular 21.
- `core/config/cloudinary.config.ts` con constantes públicas (cloud name, presets, límites de tamaño, formatos aceptados).
- `core/services/cloudinary.service.ts`: `uploadImage(file, type, options?)` con validación client-side de tamaño/format antes de subir. Retorna `Observable<CloudinaryUploadResult>`.
- `core/services/user.service.ts`: `setAvatar(payload)` y `removeAvatar()` que envuelven los endpoints del backend.
- `core/types/auth.types.ts`: nuevo `AvatarUrls` interface y `User.avatar_urls?: AvatarUrls | null`.
- `core/services/auth.service.ts`: nuevo método `setCurrentUser(user)` para actualizar el signal cuando se sube/borra el avatar.
- `core/components/avatar-uploader/` (nuevo, standalone, OnPush, signals):
  - **Cargado con `frontend-design` + `accessibility` skills.**
  - Drop zone con borde dashed, ícono cloud-arrow-up, texto "Arrastra una imagen aquí o haz clic para seleccionar", hint con tamaño/formatos.
  - Vista previa circular `128×128` con gradiente morado→índigo de fallback, borde sutil, transiciones suaves. Soporta `<img>` cuando hay avatar real.
  - Spinner de subida con animación `spin 0.8s linear infinite` (respetando `prefers-reduced-motion`).
  - Status bar con `role="status"` + `aria-live="polite"` para anunciar success/error a screen readers.
  - Botón "Eliminar foto" con borde rojo translúcido.
  - Drag-drop con `dragenter/dragover/dragleave/drop` y `tabindex="0"` para activar con Enter/Space.
  - Output `avatarUpdated: EventEmitter<User>` que emite el user actualizado.
  - i18n: 11 claves nuevas en `uploader.*` y `avatar.*` (ES + EN).
- `core/components/topbar/`: ahora muestra `<img>` con la URL del avatar en vez de iniciales cuando `user.avatar_urls.sm` (o `avatar_url` fallback) está presente. CSS con `.avatar--image` para `object-fit: cover` + borde.
- `features/freelancer/profile-editor/`: nueva sección "Tu foto de perfil" con `<app-avatar-uploader>` al principio del form, encima de "Datos básicos". Usa `currentUser()` signal directamente.
- i18n: 11 claves nuevas en `uploader.*` y `avatar.*` (ES + EN): `drop_zone`, `browse`, `uploading`, `upload_progress`, `success`, `error_size`, `error_format`, `error_network`, `error_unknown`, `remove_confirm`, `upload_cta`, `change_cta`, `remove_cta`, `preview_alt`, `fallback_alt`, `section_title`, `section_hint`.
- **Tests:** 6 nuevos unit (`cloudinary.service.spec.ts` cubre upload, validaciones, formatos) + 3 nuevos (`user.service.spec.ts` cubre setAvatar/removeAvatar) + 10 nuevos (`avatar-uploader.component.spec.ts` cubre render, file selection, success, error, remove, double-call guard, emit). Total: 19 nuevos en frontend.
- **Bug fix encontrado durante implementación:** un signal se actualiza con `.set()`, no llamándolo como función. En Angular 21, `signal<T>(initial)` retorna un `WritableSignal<T>` que es callable para LEER (sin args) y tiene `.set(value)` para escribir. Llamarlo con argumentos (`this.status({...})`) hace un read con un argumento que se ignora. La skill `frontend-conventions` lo aclara pero es fácil de olvidar. Todos los componentes que escriben a signals deben usar `signal.set(value)`.

**Documentación**
- `docs/api.md`: nuevos endpoints `POST /api/me/avatar` y `DELETE /api/me/avatar` con shape exacta, validaciones, errores 401/403/422, nota sobre idempotencia. `GET /api/auth/me` ahora documenta `avatar_url` y `avatar_urls`.
- `docs/database.md`: tabla `users` actualizada con la nueva columna `avatar_public_id` y semántica de `avatar_url` extendida a "Cloudinary (5.5.A) o provider OAuth (5.3)".
- `docs/design-system.md`: nueva fila "AvatarUploader" en el catálogo con todos los tokens, estados y atributos a11y.
- `docs/roadmap.md`: esta entrada.
- `.agents/skills/backend-conventions/SKILL.md`: nueva sección "Cloudinary" con convenciones (interface + fake + bind, verifyResource, unsigned preset setup, secrets en .env, tests con `Http::fake()`).
- `.agents/skills/frontend-conventions/SKILL.md`: nueva sección "Cloudinary" con convenciones (config en `core/config/`, upload directo sin SDK, AvatarUploaderComponent, `signal.set()`).
- `README.md`: variables de entorno nuevas documentadas en la sección de setup.
- `backend/.env.example`: bloque Cloudinary con 4 placeholders + comentarios de cada preset.

**Validación 5.5.A:** `npm test` (156/156, 27 suites) + `npm run build` (sin NG8113) + `php artisan test` (96/96, 511 assertions) — todo en verde. ✅

**Total acumulado:** backend **96 tests / 511 assertions**, frontend **156 tests / 27 suites**.

### ✅ Fase 5.5.B · Cover + Portfolio (Cloudinary)

**Objetivo:** añadir la imagen de portada del freelancer (visible en su escaparate público) y una galería de portfolio con lightbox accesible. Brief attachments quedan para 5.5.C.

**Misma estrategia de upload que 5.5.A:** browser sube a Cloudinary con `upload_preset=fm_cv_upl` (cover) o `fm_pf_upl` (portfolio), backend verifica con Admin API antes de persistir.

**Backend (Laravel 13)**
- 2 migraciones nuevas:
  - `2026_06_14_211921_add_cover_to_freelancer_profiles_table.php` — añade `cover_url VARCHAR(500) NULL` y `cover_public_id VARCHAR(191) NULL`.
  - `2026_06_14_211922_create_portfolios_table.php` — `portfolios` con `id, freelancer_profile_id (FK cascade), public_id UNIQUE, url, width, height, format, bytes, title, description, position, timestamps`. Índice compuesto `(freelancer_profile_id, position)` para listado ordenado.
- Modelo `Portfolio` (nuevo, con cast a integer para `width/height/bytes/position`).
- `FreelancerProfile` extendido: `cover_url, cover_public_id` en `$fillable` y relación `portfolios()` hasMany ordenada por `position, id DESC`.
- `FreelancerCoverController` (nuevo) con `update` y `destroy`. Endpoints: `PUT /api/freelancer/me/cover` y `DELETE /api/freelancer/me/cover` (mismo patrón que avatar: throttle 30/min, verifyResource, borrar anterior si cambia).
- `FreelancerPortfolioController` (nuevo) con CRUD + reorder:
  - `GET /api/freelancer/me/portfolios` — lista del freelancer autenticado.
  - `POST /api/freelancer/me/portfolios` — añade. Auto-asigna `position = max(position) + 1` (con `?? -1` para empezar en 0).
  - `PATCH /api/freelancer/me/portfolios/{id}` — actualiza título, descripción, position.
  - `DELETE /api/freelancer/me/portfolios/{id}` — borra fila + archivo de Cloudinary.
  - `POST /api/freelancer/me/portfolios/reorder` — body `{ids: [3,1,2]}`, reasigna `position = índice` para cada id en una transacción.
  - `GET /api/freelancers/{id}/portfolios` (público) — usado por el detail page para la galería.
- `FreelancerDetailResource` y `FreelancerProfileResource` extendidos con `cover_url`, `cover_urls` (sm/md/lg/xxl) y la relación `portfolios` (con `urls: { thumb, card, full }`).
- `FreelancerCatalogController::show` ahora eager-loads `portfolios` para evitar N+1.
- Rutas organizadas: cover/portfolio protegidas con `auth:api + EnsureUserIsFreelancer` (en `routes/api.php`). Endpoint público de portfolios fuera del grupo JWT.
- **Tests:** 7 nuevos en `CoverUploadTest` (save, replace, delete, 401/403, folder mismatch) + 11 nuevos en `PortfolioTest` (CRUD completo, position increment, public endpoint, reorder) = 18 nuevos. Total backend: 114/114.

**Frontend (Angular 21)**
- Sin nuevos paquetes npm. Reuso `HttpClient` + `CloudinaryService` + `cloudinary.config.ts` ya existentes.
- `core/types/auth.types.ts`: nuevos `CoverUrls`, `PortfolioUrls`, `PortfolioItem`. `FreelancerProfile` y `FreelancerDetail` ahora exponen `cover_url, cover_urls, portfolios?`.
- `core/services/freelancer-profile.service.ts` extendido con `setCover, removeCover, listMyPortfolios, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, reorderPortfolioItems`. Todos devuelven `Observable` con `.data` desenvuelto.
- **`core/components/cover-uploader/`** (nuevo, standalone, OnPush, signals):
  - Drag-zone con `aspect-ratio: 16/5`, fallback con ícono `image-rectangle` 32×32 en celeste.
  - Spinner y status bar consistentes con `AvatarUploader`.
  - Botón "Eliminar portada" abajo a la derecha.
  - Accesible: `role="button"` + `tabindex="0"` + `aria-label` + `aria-disabled`.
  - i18n: `cover.upload_cta/change_cta/remove_cta/section_title/section_hint/preview_alt` ES + EN.
- **`core/components/lightbox/`** (nuevo, standalone, OnPush):
  - `role="dialog"` + `aria-modal="true"` + `aria-label`.
  - Focus trap: el primer botón enfocable recibe foco al abrirse. Foco se restaura al elemento previo al cerrar.
  - `Escape` cierra, `←/→` navega, contador "X / Y" con `aria-live="polite"`.
  - Animación de entrada `fade 0.2s ease` con `prefers-reduced-motion: reduce` que la desactiva.
  - Inputs: `items: readonly PortfolioItem[]`, `startIndex: number`, `close: () => void` (función, no EventEmitter, para poder hacer `close()()` desde el keyboard handler).
  - Test cubre dialog, navegación, wrap-around, cierre.
- **`features/freelancer/portfolio-editor/`** (nuevo, ruta `/freelancer/portfolio`):
  - Página completa de gestión. Hero con drop-zone + form (título/descripción) + contador "X / 30".
  - Grid responsive con `auto-fill minmax(240px, 1fr)`. Cada item: thumb clickable (abre lightbox), inputs inline para título/descripción, botones de reorder (↑/↓ reales, no drag — accesible), botón delete.
  - Empty state con copy invitador.
  - Reorder persistente: cada ↑/↓ llama a `reorderPortfolioItems` con el orden nuevo.
  - Inline editing: usa `(change)` (no `(input)`) para evitar saturar el backend con cada keystroke.
- **`features/freelancers/detail/freelancer-detail.component.{ts,html,css}`** actualizado:
  - Cover banner `aspect-ratio: 16/5` arriba del hero, con `aria-label` descriptivo.
  - Nueva sección "Tu portfolio" con grid de thumbs `4:3` que abren el `LightboxComponent`.
  - Integración del lightbox con `lightboxIndex` signal que se abre/cierra.
- **`features/freelancer/profile-editor/`** actualizado:
  - Nueva sección "Imagen de portada" con `<app-cover-uploader>`.
  - Nueva sección "Tu portfolio" con CTA al `PortfolioEditorComponent` (no inline porque el CRUD es muy denso).
  - `onCoverUpdated()` propaga el `FreelancerProfile` actualizado al `AuthService` (mismo patrón que avatar).
- i18n: 3 namespaces nuevos ES + EN:
  - `cover.*` (5 claves) — upload, change, remove, section, preview_alt.
  - `portfolio.*` (10 claves) — add, empty, max_items, title, description, delete_confirm, section, hint, reorder, view, image_alt.
  - `lightbox.*` (4 claves) — close, next, prev, counter, dialog_label.
- **Tests:** 6 nuevos en `lightbox.component.spec.ts` (dialog ARIA, render, navegación, wrap, close) + 7 nuevos en `freelancer-profile.service.spec.ts` (setCover, removeCover, listMyPortfolios, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, reorderPortfolioItems) = 13 nuevos en spec. Total frontend: 165/165.
- **Bug fix encontrado durante implementación:** un `input.required<T>()` no se puede leer en el constructor del componente porque los inputs se setean DESPUÉS. Mover la inicialización a `ngAfterViewInit` o usar un `effect` reactivo. Aplicado en `LightboxComponent` con `ngAfterViewInit` para setear el `currentIndex` inicial con el `startIndex` válido.

**Documentación**
- `docs/api.md`: nuevos endpoints `PUT/DELETE /api/freelancer/me/cover` + 5 endpoints de portfolio (CRUD + reorder + public). `GET /api/freelancer/me` y `GET /api/freelancers/{id}` ahora documentan `cover_url/cover_urls` y `portfolios[]`. Sección dedicada "Cover y Portfolio del freelancer (Cloudinary) — Fase 5.5.B".
- `docs/database.md`: tabla `freelancer_profiles` con `cover_url/cover_public_id`. Nueva tabla `portfolios` con todas las columnas, índices y relaciones documentadas.
- `docs/design-system.md`: 3 nuevas filas en el catálogo de componentes — `CoverUploader`, `PortfolioEditor`, `Lightbox` — con tokens, estados y atributos a11y detallados.
- `docs/roadmap.md`: esta entrada.
- `.agents/skills/frontend-conventions/SKILL.md`: añadir nota sobre inputs requeridos en constructores (mover a `ngAfterViewInit` o usar `effect`).
- `README.md`: sin cambios (la forma de la API evoluciona pero el setup es el mismo).

**Validación 5.5.B:** `npm test` (165/165, 28 suites) + `npm run build` (sin NG8113) + `php artisan test` (114/114, 579 assertions) — todo en verde. ✅

**Total acumulado:** backend **114 tests / 579 assertions**, frontend **165 tests / 28 suites**.

### ✅ Fase 5.6 · Deploy a Railway (backend) + Vercel (frontend)

**Objetivo:** llevar la app a producción accesible públicamente, con backend y frontend separados pero comunicados, en un monorepo de GitHub que se desplegase automáticamente en cada push a `main`.

**Arquitectura elegida**
- **Backend** en Railway: servicio Laravel con MySQL gestionado (plugin de Railway, mismo proyecto). PHP 8.4 + FrankenPHP. Variable `DB_URL=${{MySQL.MYSQL_URL}}` para conectar al plugin MySQL por referencia interna.
- **Frontend** en Vercel: build estático de Angular 21, servido como SPA con rewrites. Todas las llamadas a `/api/*` se redirigen a Railway mediante Vercel rewrites, evitando CORS y haciendo que el navegador vea todo como mismo origen.
- **Push a `main`** dispara los dos deploys en paralelo.

**Backend · 3 archivos críticos en `backend/`**
- **`Procfile`** (añadido y luego borrado): la release/web de Heroku-style no las usa Railpack. Sirvió como documentación de la intención.
- **`railpack.json`** (versión final): pin de PHP 8.4. Symfony 8 (en `composer.lock`) requiere 8.4+; el `^8.3` de `composer.json` hacía que Railpack eligiera 8.3.31, que reventaba el build.
- **`start-container.sh`** (custom, bit `+x`): Railpack SÍ respeta este archivo y lo usa como entrypoint. El default corre `php artisan migrate --force` (sin `--seed`); el nuestro corre `migrate --force --seed` para que las 30 skills y los 6 freelancers demo estén poblados desde el primer deploy. Además ejecuta `storage:link`, `optimize:clear` y `optimize`, y arranca FrankenPHP.

**Frontend · 1 archivo crítico en `frontend/`**
- **`vercel.json`**: `installCommand: "npm install --legacy-peer-deps"` (sortea el peer dep conflict de `@angular-builders/jest@21.0.3` con `@angular/compiler@21.2.14`), `outputDirectory: "dist/frontend/browser"`, y dos rewrites:
  - `/api/(.*)` → `https://<railway>.up.railway.app/api/$1` (proxy transparente)
  - `/(.*)` → `/index.html` (catch-all para que el router de Angular tome el control en refreshes)

**Issues encontrados durante el primer deploy (5 hits, todos resueltos)**
1. **PHP 8.3 vs Symfony 8**: build falla con `requires php >= 8.4`. Fix: `railpack.json` con `{"packages":{"php":"8.4"}}`.
2. **Railpack ignora `Procfile` y `nixpacks.toml`**: la `release:` del Procfile no se ejecutaba, las migraciones nunca corrían. Fix: custom `start-container.sh`.
3. **Railpack corre `migrate` pero NO `--seed` por defecto**: las tablas existían pero vacías. Fix: custom `start-container.sh` con `--seed`.
4. **`JWT_SECRET` demasiado corto (192 bits)**: register/login devolvían 500 con `Key provided is shorter than 256 bits`. `php artisan jwt:secret --show` no existe en el paquete; el valor hay que copiarlo del `.env`. Pegar uno ≥ 32 chars. Fix: regenerar y pegar.
5. **Vercel build con `ERESOLVE`**: peer dep conflict. Fix: `installCommand: "npm install --legacy-peer-deps"` en `vercel.json`.
6. **Vercel 404 en rutas SPA** (`/home`, `/login`): sin rewrite catch-all. Fix: segundo rewrite en `vercel.json` → `/index.html`.

**Variables de entorno en Railway (referencia)**
- `APP_*` (NAME, ENV=production, DEBUG=false, URL, KEY, BCRYPT)
- `DB_CONNECTION=mysql` + `DB_URL=${{MySQL.MYSQL_URL}}` (referencia interna)
- `CACHE_STORE=file` + `SESSION_DRIVER=array` (auth JWT stateless, sin sesiones web)
- `JWT_SECRET` (≥ 32 chars), `JWT_ALGO=HS256`, `JWT_TTL=60`, `JWT_REFRESH_TTL=20160`
- `FRONTEND_URL=https://framematch.vercel.app` (placeholder hasta que se monte OAuth, ahí importa)
- `CLOUDINARY_*` (placeholders válidos; sin ellos, endpoints de upload devuelven 500 pero el resto arranca)
- OAuth (vacíos por ahora; cuando se monten, las redirect URIs en los providers deben ser la URL de **Vercel**, no de Railway, porque la cookie de sesión vive en el dominio que aparece en el navegador)

**Verificación end-to-end (smoke tests ejecutados)**
```powershell
curl.exe -sS https://<railway>.up.railway.app/api/health
# → {"status":"ok","service":"FrameMatch",...}

curl.exe -sS https://<railway>.up.railway.app/api/skills
# → 30 skills (8 photo, 8 video, 8 edit, 6 content)

curl.exe -sS https://<railway>.up.railway.app/api/freelancers
# → 6 freelancers demo con top_skills y profile_completion: 100

curl.exe -sS https://framematch.vercel.app/api/health
# → mismo resultado, via Vercel rewrite

curl.exe -sS -X POST https://framematch.vercel.app/api/auth/register -d '...'
# → 201 con user + access_token

curl.exe -sS -X POST https://framematch.vercel.app/api/auth/login -d '...'
# → 200 con user + access_token (o 401 si password incorrecto)
```

**Documentación**
- `docs/deploy.md` (nuevo): guía completa con la arquitectura, archivos críticos, variables, issues y troubleshooting.
- `docs/roadmap.md`: esta entrada.
- `docs/architecture.md`: nueva sección "Deploy" con el diagrama de la comunicación vía rewrites.
- `README.md`: nueva sección "Deploy" con resumen y link a `docs/deploy.md`.
- `.agents/skills/backend-conventions/SKILL.md`: nota sobre los archivos de deploy (`railpack.json`, `start-container.sh`) y las particularidades de Railway.
- `.agents/skills/frontend-conventions/SKILL.md`: nota sobre `vercel.json`, los rewrites y la convención de URLs relativas.

**Pendiente para futuro**
- **OAuth** (cuando se monte): las redirect URIs en Google/Facebook console deben ser `https://framematch.vercel.app/api/auth/oauth/{provider}/callback`. La razón, en detalle, en `docs/deploy.md` §OAuth.
- **Cloudinary real**: crear cuenta, 4 unsigned upload presets (`fm_av_upl`, `fm_cv_upl`, `fm_pf_upl`, `fm_br_upl`), pegar las credenciales en Railway → los endpoints de avatar/cover/portfolio pasan de 500 a 200.
- **Bug pre-existente en `bootstrap/app.php`**: cuando `Authenticate` middleware dispara sin token en una ruta `api/*`, lanza `RouteNotFoundException("Route [login] not defined")` con stack trace 500 en vez de devolver 401 JSON. El handler solo captura `AuthenticationException`, no `RouteNotFoundException`. No es bloqueante para el flujo normal (con token funciona), pero conviene arreglar.

**Total acumulado:** docs `deploy.md` nuevo, `roadmap.md` + Fase 5.6, `architecture.md` + sección Deploy, `README.md` + sección Deploy, 2 skills actualizadas. **Cero tests nuevos** (deploy no introduce funcionalidad; los tests existentes cubren el código que se desplegó).

### ✅ Fase 5.7 · Limpieza + Branching + CI

**Objetivo:** eliminar código muerto, tablas no usadas, y formalizar la estrategia de ramas `beta` → `main` con integración continua.

**Backend**
- Migración `2026_06_17_000000_drop_unused_tables` dropea 5 tablas no usadas (`password_reset_tokens`, `sessions`, `jobs`, `job_batches`, `failed_jobs`). Se conservan `cache` y `cache_locks`.
- Eliminados métodos `briefAttachmentUrl`/`briefAttachmentUrls` de `CloudinaryService`, `CloudinaryServiceFake` y `CloudinaryServiceInterface` (feature de brief attachments no existe aún).
- Eliminado `routes/web.php` vacío y referencias en `bootstrap/app.php`.
- `.env` local: `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync`, `CACHE_STORE=file`.
- Tests: eliminado test `brief_attachment_url_uses_correct_transformations` por dependencia removida.

**Frontend**
- Eliminado `import { BriefInput }` sin uso en `proposal-form.component.ts`.

**Branching & CI**
- Estrategia documentada en `AGENTS.md`: `beta` (desarrollo activo) → PR → `main` (producción). Railway + Vercel despliegan desde `main`.
- `.github/workflows/test.yml`: PHPUnit + Jest en push/PR para `main` y `beta`.

**Documentación**
- `docs/deploy.md`: actualizados `SESSION_DRIVER`/`QUEUE_CONNECTION`/`CACHE_STORE`.
- `docs/database.md`: sección de tablas del sistema actualizada.
- `docs/roadmap.md`: esta entrada.
- `CHECKLIST.md`: marcados items ya completados (edición cuenta, portfolio, CI/CD, OAuth), añadida Fase 5.7.

**Validación 5.7:** `npm test` (172/172, 29 suites) + `php artisan test` (133/133, 634 assertions) — todo en verde. ✅

**Total acumulado:** backend **133 tests / 634 assertions**, frontend **172 tests / 29 suites**.

## Fases pendientes (backlog priorizado)

### 🔵 Fase 6 · Mensajería (polling primero, websockets después)

Chat cliente ↔ freelancer dentro de un brief aceptado.

### 🔵 Fase 7 · Reviews y ratings

Tabla `reviews`. Tras completar un encargo, ambas partes se valoran.

### ⚪ Otros (backlog sin priorizar)

- **Verificación de email**: envío de mail con `MAIL_MAILER`, link firmado, `email_verified_at` actualizado.
- **Reset de password**: crear tabla `password_reset_tokens` (eliminada en Fase 5.7).
- **Roles `agency` y `company`**: sub-perfil, multi-freelancer.
- **Admin panel**: para asignar roles elevados, banear, etc.
- **SSR (Angular Universal)**: para SEO de la landing pública.
- **WebSockets / realtime**: para mensajes y notificaciones.
- **Pagos**: Stripe Connect, escrow.
- **Búsqueda full-text**: Meilisearch o Algolia cuando el catálogo crezca.
- **E2E tests**: Playwright o Cypress.
- **Docker**: `docker-compose.yml` con PHP-FPM, nginx, MySQL, node.

## Criterios para cerrar una fase

1. ✅ Todos los tests del backend y del frontend en verde.
2. ✅ `npm run build` sin warnings nuevos.
3. ✅ Documentación actualizada (este roadmap + AGENTS.md correspondiente + README si toca).
4. ✅ Smoke E2E manual hecho por el dev.
5. ✅ Cambios en BD documentados en `docs/database.md`.
6. ✅ Cambios en API documentados en `docs/api.md`.
7. ✅ Cambios en UI alineados con `docs/design-system.md`.

## Cómo proponer una nueva fase

Abre un PR con:
- Descripción de 1-2 frases del valor que aporta.
- Lista de endpoints / componentes / migraciones que introduce.
- Estimación de tests nuevos.
- Marcar en este `roadmap.md` como "🔵 En planificación" hasta que se apruebe.
