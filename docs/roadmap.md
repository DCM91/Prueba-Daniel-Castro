# Roadmap y fases · FrameMatch


> **Convenciones:**
> - Estado vivo. Marca con `[x]` cada tarea al cerrarla.
> - Prioridad descendente (P0 = más urgente, P6 = sin priorizar).
> - Las fases se numeran con cronología. Las sub-fases 5.5.x son bloques cortos dentro de "Fase 5.5 · Cloudinary".
> - Última actualización: **sincronización de WebSockets + cierre de hotfixes de docs (2026-06-20)**.

---

## TL;DR

**Métricas al cierre del sprint de sincronización (2026-06-20):**

- **Backend:** 250 tests / 994 assertions, 17 feature suites + 2 unit suites, todos en verde.
- **Frontend:** `npm run build` sin warnings. `npm run validate:i18n` OK. `npx jest` → **43 suites / 316 tests verdes**.
- **Deploy:** producción en Railway (backend) + Vercel (frontend) con CI en GitHub Actions.
- **Tablas nuevas desde Fase 5:** `brief_attachments` (5.5.C), `conversations` + `messages` (Fase 6), `reviews` (Fase 7), `user_oauth_identities` (5.5.F).
- **Endpoints nuevos desde Fase 5:** 25+ nuevos entre 5.5.A, 5.5.B, 5.5.C, 5.5.D, 5.5.E, 5.5.F, Fase 6, Fase 7. Ver [docs/api.md](./api.md).
- **Eventos realtime (Sprint WebSockets):** `MessageSent`, `ConversationUpdated`, `UnreadCountChanged` sobre canales privados `conversation.{id}` y `user.{id}` con Laravel Reverb.

**Estado del backlog inmediato:**

| # | Próxima | Estado |
|---|---|---|
| 1 | Aceptar / rechazar propuesta (PATCH status) | ✅ Cerrado (ver § Aceptar/Rechazar propuesta) |
| 2 | Migrar chat de polling a WebSockets (Laravel Reverb) | ✅ Cerrado en `f4f1621` (Sprint 4-5) — ver § Hotfix 0.20 |
| 3 | Editar / borrar la propia review | ✅ Cerrado (ver § Editar/borrar review) |
| 4 | Notificaciones in-app (campana en topbar) | 🔵 Sprint en curso |
| 5 | Responder a reviews, fotos en reviews, denuncias | ⚪ Backlog |
| 6 | Reset de password + verificación de email | ⚪ Backlog |

---

## Convenciones de uso

- Al **completar** una tarea, sustituye `- [ ]` por `- [x]` y, si quieres, añade `<sub>fecha — commit hash</sub>` al final de la línea.
- Al **abrir un bloque nuevo** (p.ej. cuando llegue el momento de "Aceptar / rechazar propuesta"), atomízalo siguiendo el mismo formato que los P0/P1/P2.
- Al **cerrar una fase**, sube el test count en el TL;DR, añade la entrada de fase con la narrativa detallada, y actualiza los links de `docs/api.md` y `docs/database.md`.
- Si descubres una tarea **fuera de plan**, añádela al bloque P0 si bloquea o al backlog correspondiente.

---

## Fases entregadas (orden cronológico)

> Cada fase tiene: **Objetivo** · **Backend** · **Frontend** · **Documentación** · **Validación** · **Total acumulado**.

### ✅ Fase 0 · Bootstrap

Backend Laravel 13 + PHP 8.5 + MySQL. Frontend Angular 21 standalone.

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

**Frontend (Angular 21)**
- Limpieza total del código de Wikipedia.
- `core/types/auth.types.ts` con `Role`, `User`, `AuthPayload`, etc.
- `TokenStorageService` con prefijo `framematch_` en localStorage.
- `AuthService` con signals: `token`, `currentUser`, `isAuthenticated`, `isClient`, `isFreelancer`, `isAdmin`, `hasAnyRole()`.
- `authInterceptor` (HttpInterceptorFn) adjunta `Bearer` token.
- `authGuard` y `roleGuard(roles[])` parametrizable.
- Componentes: `LandingComponent` (público), `LoginComponent`, `RegisterComponent` (selector visual cliente/freelancer), `DashboardComponent` (protegido, base).

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

### ✅ Fase 2.5 · Documentación

- `AGENTS.md` raíz: convenciones del monorepo, navegación, glosario.
- `docs/architecture.md`: capas, decisiones, flujos end-to-end, glosario técnico.
- `docs/design-system.md`: paleta, tipografía, espaciado, catálogo de componentes, estados, accesibilidad.
- `docs/api.md`: endpoints, request/response, errores, JWT, tests, smoke test con curl.
- `docs/database.md`: ER, tablas, índices, patrones de uso, decisiones.
- `docs/roadmap.md`: este archivo.
- `backend/AGENTS.md`: convenciones backend.
- `frontend/AGENTS.md`: convenciones frontend.
- `README.md`: índice de docs.

### ✅ Fase 3 · Edición del perfil de freelancer

**Objetivo:** que el profesional rellene su `freelancer_profiles` (display_name, bio, city, hourly_rate, price_per_project) y seleccione skills del catálogo. Conectar el botón "Completar perfil" de la landing freelancer.

**Backend (Laravel 13)**
- `GET /api/skills` (público) → `SkillController::index` + `SkillResource`. Devuelve las 20 skills activas ordenadas por nombre.
- `GET /api/freelancer/me` (JWT freelancer) → `FreelancerProfileController::show` + `FreelancerProfileResource`. Incluye `skills` con `level` y `years_experience` del pivot.
- `PUT /api/freelancer/me` (JWT freelancer) → `UpdateProfileRequest` con validaciones en español. Acepta `PATCH`-semantics (todos los campos opcionales). Convierte strings vacíos a `null` en `display_name`/`bio`/`city`.
- `PUT /api/freelancer/me/skills` (JWT freelancer) → `SyncSkillsRequest` con `skills.*.skill_id|level|years_experience`. Reemplaza todas las skills anteriores (semántica `sync`).
- Nuevo middleware `App\Http\Middleware\EnsureUserIsFreelancer` que aborta con 403 si el usuario autenticado no tiene `role=freelancer`.

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

### ✅ Fase 4 · Catálogo público de freelancers

**Objetivo:** que un visitante anónimo pueda descubrir profesionales vía `/freelancers` con filtros (categoría, ciudad, tarifa, búsqueda libre) y abrir un detalle `/freelancers/:id`. Conectar el buscador y los chips de la landing cliente.

**Backend (Laravel 13)**
- `GET /api/freelancers` (público, paginado 12/pág): filtros combinables `q`, `category` (photo/video/edit via JOIN a `freelancer_skill`→`skills`), `city`, `max_rate`. Excluye `is_available=false`. Ordena por `hourly_rate ASC, display_name ASC`.
- `GET /api/freelancers/{id}` (público): detalle. 404 si no existe o no está disponible. **No** expone `email`/`password` (decisión: el contacto vendrá en Fase 6 vía chat interno).
- Nuevos: `FreelancerCatalogController`, `SearchFreelancersRequest`, `FreelancerCardResource` (con `top_skills`, `skills_count`, `profile_completion`), `FreelancerDetailResource` (incluye `bio`, `price_per_project`, `created_at` y `skills` completo).
- `DemoFreelancersSeeder`: 6 perfiles demo (Lucia, Diego, Nuria, Marcos, Aitana, Pablo) en ciudades españolas, con skills reales del seed. Idempotente (`updateOrCreate` por email). No corre en `migrate:fresh --seed` por defecto.

**Frontend (Angular 21)**
- Tipos nuevos en `auth.types.ts`: `FreelancerCard`, `FreelancerDetail`, `FreelancerCardSkill`, `FreelancerSearchFilters`, `Paginated<T>`.
- `FreelancerCatalogService` con `search(filters)` (devuelve `Paginated<FreelancerCard>`) y `getById(id)` (devuelve `FreelancerDetail`). Construye `HttpParams` solo con filtros no vacíos.
- `FreelancerCardComponent` compartido en `features/freelancers/`: card con avatar (iniciales + gradiente), display_name, ciudad, tarifa (`hourly_rate` o "Consultar" si null), top 3 skills con level, badge Disponible/Ocupado, link al detalle.
- `FreelancerListComponent` en `features/freelancers/list/`: hero, barra de filtros (q, category, city, max_rate) que se sincronizan con `queryParams` para URLs compartibles, grid de cards, paginación, estados loading/empty/error, botón "Limpiar".
- `FreelancerDetailComponent` en `features/freelancers/detail/`: header con avatar + status, tarifas (hourly + project), bio truncada a 4 líneas con "Ver más" (signal `bioExpanded`), grid completo de skills con `level` y `years_experience`, estado 404 ("Perfil no disponible") con botón volver.
- Rutas `/freelancers` y `/freelancers/:id` (públicas, lazy-loaded) en `app.routes.ts`.
- `ClientHomeComponent` refactor: 3 categorías (Foto/Vídeo/Edición) que enlazan a `/freelancers?category=…`. Buscador del hero navega a `/freelancers?q=…&category=…`. Nueva sección "Profesionales destacados" que carga los 6 primeros del catálogo (oculta si está vacía). Botón "Ver todos los profesionales" al final.

### ✅ Fase 5 · Briefs + propuestas (Home + i18n + Brand)

**Objetivo:** reestructurar la home para que el brand "FrameMatch" sea el protagonista visual, añadir soporte bilingüe (es + en) con un selector de idioma, e implementar briefs + propuestas para conectar clientes y profesionales.

#### A · Home restructure con brand prominente
- `BrandLogoComponent` reusable (`core/components/brand-logo/`) con SVG inline (símbolo "F" en gradiente morado→celeste + dot, wordmark con gradient). 4 tamaños: `sm` / `md` / `lg` / `xl`.
- `LandingComponent` restructurado: topbar con brand + 2 categorías, hero XL con el logo grande + wordmark en gradiente, orbes morado/celeste en background con `prefers-reduced-motion`, 3 cards de categoría (Foto/Vídeo/Edición), 3 pasos "Cómo funciona", footer con brand.
- Topbars actualizados en TODAS las páginas (landing, login, register, client home, freelancer home, freelancer list, freelancer detail, profile editor) para usar el `BrandLogoComponent`.
- Hero del landing usa `<h1>` con el wordmark "FrameMatch" en 56-110px con gradiente multicolor.
- Botón "Ver perfil" del card de freelancer (Fase 4) ahora navega correctamente.

#### B · Internacionalización (i18n)
- Diccionarios JSON en `src/assets/i18n/es.json` y `en.json` cargados por HTTP al arrancar.
- `LanguageService` (`core/services/language.service.ts`): signal de idioma activo, carga perezosa de diccionarios, persistencia en `localStorage` con clave `framematch_lang`, fallback a `navigator.language`.
- `TranslatePipe` (`core/pipes/translate.pipe.ts`): `{{ 'key' | t }}` o `{{ 'key' | t : { name: 'X' } }}` con interpolación `{{var}}`.
- `LanguageSelectorComponent` (`core/components/language-selector/`): dropdown en topbar con el código del idioma activo (ES / EN) y menú con los soportados.
- Todos los componentes visibles (landing, login, register, client home, freelancer home, freelancer card/list/detail, profile editor) usan `| t` en vez de strings hard-coded.
- `provideLanguageServiceMock()` helper para tests (`core/testing/language-service.mock.ts`).

#### C · Briefs + Propuestas (matching cliente ↔ profesional)

**Backend (Laravel 13)**
- 2 migraciones nuevas: `briefs` y `proposals`. `proposals` con `UNIQUE(brief_id, freelancer_id)` para prevenir duplicados.
- 2 enums nuevos: `BriefStatus` (draft/published/in_review/assigned/completed/cancelled) y `ProposalStatus` (pending/accepted/rejected/withdrawn).
- 2 modelos Eloquent: `Brief` (belongsTo client, hasMany proposals) y `Proposal` (belongsTo brief + freelancerProfile).
- 4 FormRequests: `StoreBriefRequest`, `UpdateBriefRequest`, `StoreProposalRequest`, `UpdateBriefRequest` con validaciones en español.
- 2 Resources: `BriefResource` (incluye `proposals_count` via `whenCounted`) y `ProposalResource` (con `freelancer` anidado via `whenLoaded`).
- 2 Controllers: `BriefController` (CRUD con `scope=mine`) y `ProposalController` (store + index, solo el cliente del brief ve todas las propuestas).

**Frontend (Angular 21)**
- Tipos nuevos en `auth.types.ts`: `BriefStatus`, `ProposalStatus`, `Brief`, `BriefInput`, `Proposal`, `ProposalInput`, `ProposalFreelancer`.
- 2 servicios: `BriefsService` (list, getById, create, update, delete) y `ProposalsService` (listForBrief, create).
- 3 componentes: `BriefListComponent` (público, con tabs Todos/Mis briefs), `BriefDetailComponent` (público, vista de cliente con propuestas recibidas o form de propuesta para freelancers), `BriefFormComponent` (cliente, con reactive form), `ProposalFormComponent` (freelancer, form embebido en el detalle).
- 3 rutas nuevas: `/briefs`, `/briefs/new` (authGuard + roleGuard['client']), `/briefs/:id` (público).
- Link "Briefs" en el topbar del cliente y botón "+ Nuevo brief" cuando aplica.

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

#### 5.1.1 · Fix de FOUT en i18n + detección de navegador

- **FOUT:** al abrir la app por primera vez se veían las keys literales (`briefs.list.title`, etc.) durante ~100 ms hasta que llegaban los JSON de los diccionarios. Causa: el `LanguageService` disparaba los `HttpClient.get` en el constructor con `void this.loadAll()` fire-and-forget. Fix: `LanguageService` expone `readonly ready: Promise<void>` resuelto al final de `loadAll()`, y `app.config.ts` lo enchufa a `provideAppInitializer(() => inject(LanguageService).ready)`. Angular no arranca el bootstrap hasta que los diccionarios están en memoria → la primera vez que se ve la UI ya viene traducida.
- **Detección de navegador:** `readStoredLanguage` ya no hardcodea `if (nav.startsWith('en'))`. Ahora itera sobre `this.supported` y matchea la primera coincidencia, con fallback explícito a `DEFAULT_LANGUAGE` (`es`). `navigator.language = 'es-ES'` se detecta como `es`; `'fr-FR'` cae a `es` (antes caía "por suerte" al default).
- **Mock:** `provideLanguageServiceMock` ahora expone `ready: Promise.resolve()`.

**Validación 5.1.1:** `npm test` (111/111, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/343) — todo en verde. ✅

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
- i18n ES+EN: namespace `auth.oauth.*` con 11 claves.

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

**Validación 5.4:** `npm test` (137/137, 24 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) — todo en verde. ✅

**Total acumulado:** backend **74 tests / 431 assertions**, frontend **137 tests / 24 suites**.

### ✅ Fase 5.5 · Cloudinary (sub-fases A → F)

**Objetivo:** introducir Cloudinary en el stack y cubrir todos los flujos de subida de imágenes de la plataforma: avatar de usuario, cover del freelancer, portfolio, attachments de brief, y desbloquea el patrón para futuras subidas (comprobantes de pago, etc.).

**Estrategia de upload:** *Frontend → Cloudinary directo con unsigned preset*. El browser sube el archivo a `https://api.cloudinary.com/v1_1/{cloud}/image/upload` con `upload_preset=fm_<tipo>_upl` y devuelve `{ public_id, secure_url, ... }`. El frontend hace `POST /api/<endpoint>` con ese `public_id` y el backend lo **verifica contra la Admin API** antes de persistirlo. Los 4 unsigned presets están configurados en el dashboard con carpeta fija, formatos permitidos, tamaño y dimensiones máximos.

**Carpetas en Cloudinary:**
```
framematch/
├── avatars/                       ← 5.5.A · 1 por user
├── covers/                        ← 5.5.B · cover del freelancer
├── portfolios/                    ← 5.5.B · galería del freelancer
└── briefs/                        ← 5.5.C · imágenes de referencia del brief
```

#### 5.5.A · Foundations + Avatar

- Dependencia backend: `cloudinary/cloudinary_php:^3.1`.
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
- **Frontend (Angular 21)**:
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
- **Tests:** 13 unit (`CloudinaryServiceTest` con `Http::fake()` para Admin API + verificación de URLs y helpers) + 9 feature (`AvatarUploadTest` con `CloudinaryServiceFake`) = 22 nuevos backend. Frontend: 6 nuevos unit (`cloudinary.service.spec.ts` cubre upload, validaciones, formatos) + 3 nuevos (`user.service.spec.ts` cubre setAvatar/removeAvatar) + 10 nuevos (`avatar-uploader.component.spec.ts` cubre render, file selection, success, error, remove, double-call guard, emit) = 19 nuevos en frontend.
- **Bug fix encontrado durante implementación:** un signal se actualiza con `.set()`, no llamándolo como función. En Angular 21, `signal<T>(initial)` retorna un `WritableSignal<T>` que es callable para LEER (sin args) y tiene `.set(value)` para escribir. Llamarlo con argumentos (`this.status({...})`) hace un read con un argumento que se ignora. La skill `frontend-conventions` lo aclara pero es fácil de olvidar. Todos los componentes que escriben a signals deben usar `signal.set(value)`.

**Validación 5.5.A:** `npm test` (156/156, 27 suites) + `npm run build` (sin NG8113) + `php artisan test` (96/96, 511 assertions) — todo en verde. ✅

**Total acumulado:** backend **96 tests / 511 assertions**, frontend **156 tests / 27 suites**.

#### 5.5.B · Cover + Portfolio

**Objetivo:** añadir la imagen de portada del freelancer (visible en su escaparate público) y una galería de portfolio con lightbox accesible.

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

**Frontend (Angular 21)**
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
- **Tests:** 6 nuevos en `lightbox.component.spec.ts` (dialog ARIA, render, navegación, wrap, close) + 7 nuevos en `freelancer-profile.service.spec.ts` (setCover, removeCover, listMyPortfolios, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, reorderPortfolioItems) = 13 nuevos en spec.
- **Bug fix encontrado durante implementación:** un `input.required<T>()` no se puede leer en el constructor del componente porque los inputs se setean DESPUÉS. Mover la inicialización a `ngAfterViewInit` o usar un `effect` reactivo. Aplicado en `LightboxComponent` con `ngAfterViewInit` para setear el `currentIndex` inicial con el `startIndex` válido.

**Validación 5.5.B:** `npm test` (165/165, 28 suites) + `npm run build` (sin NG8113) + `php artisan test` (114/114, 579 assertions) — todo en verde. ✅

**Total acumulado:** backend **114 tests / 579 assertions**, frontend **165 tests / 28 suites**.

#### 5.5.C · Brief attachments

**Objetivo:** permitir al cliente subir hasta 10 imágenes de referencia a un brief, para que el freelancer entienda el estilo y la dirección creativa esperada. Mismo patrón Cloudinary que 5.5.A y 5.5.B.

**Backend (Laravel 13)**
- Migración `2026_06_18_183324_create_brief_attachments_table.php` con `id, brief_id (FK cascade), public_id UNIQUE, url, width, height, format, bytes, title, position, timestamps`. Índice compuesto `(brief_id, position)` para listado ordenado.
- Modelo `BriefAttachment` (nuevo). `Brief` extendido: `attachments()` hasMany ordenada por `position, id DESC`.
- `CloudinaryService` extendido: `briefUrl()` y `briefUrls()` con variantes `thumb` (240×180), `card` (600×450), `full` (1600, sin crop). Mismo fake + interface.
- `config/services.php`: nuevos `presets.brief = 'fm_br_upl'` y `folders.brief = 'framematch/briefs'`.
- `App\Http\Resources\BriefAttachmentResource` (nuevo) con `urls: { thumb, card, full }` pre-construidas. `BriefResource` ahora carga `attachments` con `whenLoaded`.
- `BriefController` extendido con 3 métodos: `attachImage`, `detachImage`, `reorderAttachments`.
  - `POST /api/briefs/{id}/attachments` (auth, owner-only): valida con `AttachBriefImageRequest` (regex `^[A-Za-z0-9_\-/]+$` para `public_id`, max 10 MB, max 1000 chars en title), verifica con `verifyResource` contra la carpeta `framematch/briefs`, asigna `position = max(position) + 1` (con `?? -1`).
  - Límite duro: 422 si el brief ya tiene 10 adjuntos.
  - `DELETE /api/briefs/{id}/attachments/{attachmentId}` (auth, owner-only): borra archivo de Cloudinary best-effort y la fila.
  - `PATCH /api/briefs/{id}/attachments/reorder` (auth, owner-only): valida que `ids` contiene **exactamente** los IDs del brief, reasigna `position = índice` en transacción.
- `AttachBriefImageRequest` con validaciones en español.
- **Tests:** 16 nuevos en `BriefAttachmentTest` (CRUD + reorder + permisos + 422 validaciones + folder mismatch + límite 10) = backend 130/130.

**Frontend (Angular 21)**
- `auth.types.ts`: nuevos `BriefAttachment` interface y `BriefAttachmentInput`. `Brief.attachments?: BriefAttachment[]`.
- `BriefsService` extendido: `attachImage(briefId, input)`, `detachImage(briefId, attachmentId)`, `reorderAttachments(briefId, ids)`.
- 1 componente nuevo: `BriefAttachmentUploaderComponent` (standalone, OnPush, signals). Drop-zone con drag/drop, contador "X / 10", botones ↑/↓ (no drag — accesible), botón eliminar, validación de formato (image/*) y tamaño (max 10 MB), error states con i18n. Refresca al subir vía `output(attachmentChange)`.
- i18n: 26 keys nuevas en `brief_attachments.*` ES + EN.
- `BriefDetailComponent` integrado: galería visible para todos los participantes (grid `auto-fill minmax(180px, 1fr)`, thumb abre en nueva pestaña a la URL `card`), uploader solo para el owner. Llama `load(b.id)` tras cada acción.
- **Tests:** 7 nuevos en `brief-attachment-uploader.component.spec.ts`.

**Validación 5.5.C:** `npm run build` (OK, +14 kB) + `php artisan test` (130/130) + `validate:i18n` OK. ✅

#### 5.5.D · Profile completion + Onboarding wizard

**Objetivo:** guiar al freelancer recién registrado por un wizard de 7 pasos para rellenar su perfil profesional (datos básicos, avatar, bio+tarifa, skills, cover+portfolio) hasta el 100% de progreso. El badge de % de la home refleja esto en tiempo real.

**Backend (Laravel 13)**
- Migración `2026_06_18_145021_add_onboarding_completed_at_to_freelancer_profiles_table.php` añade `onboarding_completed_at TIMESTAMP NULL`.
- `App\Services\ProfileCompletionService` con `WEIGHTS` (10 campos, 100 pts): `display_name 15, bio 20, city 10, hourly_rate 10, price_per_project 10, is_available 5, skills 10, avatar 10, cover 5, portfolio 5`. Método `calculate(profile)` devuelve `{ pct, missing: string[] }`.
- `App\Http\Controllers\Api\ProfileCompletionController::show` (nuevo): `GET /api/me/completion` (JWT) → `{ data: { pct, missing } }`. Lee el perfil actual (con relaciones eager-loaded) y devuelve el cálculo.
- `App\Http\Controllers\Api\OnboardingController` (nuevo):
  - `complete` (POST `/api/me/onboarding-complete`): setea `onboarding_completed_at = now()` solo si es null, **idempotente** (re-llamar no resetea el timestamp). `403` si el user no es freelancer. Carga `freelancerProfile.skills` y re-emite el `UserResource`.
- `FreelancerProfileResource` ahora expone `onboarding_completed_at` (ISO 8601 o `null`).
- **Tests:** 11 nuevos en `ProfileCompletionTest` (6 del servicio, 5 del endpoint) + 9 nuevos en `OnboardingEndpointTest` (3 del endpoint, 6 de idempotencia + permisos). Total backend: 150/150.

**Frontend (Angular 21)**
- `ProfileCompletionService` con cache por `user_id` (signal interno), `refresh()` que llama al endpoint, `reset()` para invalidar, `isComplete()` que mira `pct === 100`. Caché se invalida al re-fetchar `currentUser`.
- `OnboardingService` con `steps: ['welcome','datos','avatar','bio-tarifa','skills','cover-portfolio','done']`, persistencia en `localStorage` con clave `framematch_onboarding_step` (para que si el user cierra y vuelve, retome donde lo dejó), `goNext/goPrev/skip/complete`, `setSubmitting/setError` setters públicos.
- `OnboardingGuard` (nuevo, funcional, **no aplicado aún** — pendiente en backlog P3): pensado para redirigir a `/onboarding/welcome` si el freelancer está autenticado y `onboarding_completed_at` es null y la ruta visitada NO es `/onboarding/*` ni `/home`.
- `OnboardingWizardComponent` (nuevo, ruta `/onboarding/welcome` con `authGuard`, `@switch (step())`):
  - Step 1 `DatosForm`: form con `name/email/phone` (PHONE_PATTERN, city).
  - Step 2: `<app-avatar-uploader>`.
  - Step 3 `BioForm`: `display_name/bio/hourly_rate/price_per_project` → `PUT /api/freelancer/me` + re-fetch `/api/auth/me`.
  - Step 4: chips de skills con level/years → `PUT /api/freelancer/me/skills` + re-fetch.
  - Step 5: `<app-cover-uploader>` + link a portfolio (opcional con "Saltar").
  - Step 6 "Ir a mi home": `POST /api/me/onboarding-complete` + `profileCompletion.refresh(true)` + `router.navigate(['/home/freelancer'])`.
- `OAuthCompleteProfileComponent`: cuando role=freelancer → `/onboarding/welcome` (no `/home`).
- `app-core-topbar`: trata `/onboarding` como variant `auth` (no muestra nav, no muestra user area).
- `FreelancerHomeComponent`: `goToEdit()` redirige a `/onboarding/welcome` si `onboarding_completed_at == null`.
- `freelancer-home.component.html`: `profileCompletion() ?? 0` en 3 sitios (círculo de progreso, mensaje de done, y de missing).
- i18n `onboarding.*` ES + EN (welcome + 5 steps + done + mensajes de error).
- **Tests:** 9 nuevos en `onboarding.service.spec.ts` (steps, persistencia, goNext/goPrev/skip/complete, idempotencia). Frontend: `npm run build` sin warnings.

**Validación 5.5.D:** `npm run build` (OK) + `php artisan test` (150/150) + `validate:i18n` OK. ✅

#### 5.5.E · User account edit (`PUT /api/me`)

**Objetivo:** permitir al usuario autenticado editar sus datos personales (name, email, phone, city) sin tocar el perfil profesional. Endpoint público + form en `/account`.

**Backend (Laravel 13)**
- `App\Http\Controllers\Api\UserAccountController` (nuevo) con `update(Request)`.
- `App\Http\Requests\User\UpdateAccountRequest` con `name/email/phone/city` (todos opcionales, `sometimes`). Valida regex de teléfono `/^[+0-9 ()-]{6,30}$/` (rechaza letras).
- `App\Services\UserService` (nuevo, pequeño) con `updateAccount(user, payload)`: aplica `fill` + `save`, recarga relaciones (`freelancerProfile.skills`).
- Endpoint: `PUT /api/me` (JWT) → `UserResource` actualizado.
- `UserResource` ahora también carga `freelancer_profile.skills` y `oauth_identities` cuando esas relaciones están eager-loaded. Expone `has_password`, `oauth_only`, `oauth_identities[]`.
- **Tests:** 7 nuevos en `UserAccountTest` (200 OK + cambios, 422 email inválido, 422 phone con letras, 401 sin auth, persistencia en BD, re-fetch con perfil completo, phone formato internacional con `+`).

**Frontend (Angular 21)**
- `AccountComponent` (nuevo, ruta `/account` con `authGuard`):
  - Reactive form con `name/email/phone (PHONE_PATTERN) / city`. Muestra `currentUser()` al inicializar.
  - Submit: `UserService.updateAccount(payload)` → `auth.setCurrentUser(...)` (signal y localStorage).
  - Validación 422: bindea `err.error.errors` a un `fieldErrors` signal que la plantilla pinta bajo cada input.
  - Topbar: variant `auth` (con `backLink: '/home'`) para no mostrar nav durante edición.
  - 3 secciones: datos personales, foto de perfil (reusa `<app-avatar-uploader>`), accesos directos al editor profesional si freelancer.
- `UserService` con `updateAccount(payload)`.
- `AuthService.roleLabel(role)` retorna `roles.${role}` (keys i18n, no switch hardcoded).
- i18n: namespace `account.*` con 24 keys (subtitle, sections, fields, errors, success).
- **Tests:** 4 nuevos en `account.component.spec.ts`.

**Validación 5.5.E:** `npm run build` (OK) + `php artisan test` (157/157) + `validate:i18n` OK. ✅

#### 5.5.F · OAuth N:M (un usuario puede vincular varios providers)

**Objetivo:** un user puede tener vinculadas varias identidades OAuth a la vez (Google + Facebook). Una identidad solo puede estar en un user. Flujo "linking" desde un user autenticado (sin perder la sesión).

**Backend (Laravel 13)**
- Migración `2026_06_18_194144_create_user_oauth_identities_table.php` con:
  - `id, user_id (FK cascade), provider, provider_user_id, access_token, refresh_token, token_expires_at, scopes (JSON), provider_email, linked_at, last_used_at, timestamps`.
  - `UNIQUE (provider, provider_user_id)` — una identidad solo puede estar en un user.
  - `INDEX (user_id, provider)`.
  - La migración copia datos existentes de `users.oauth_provider` + `users.oauth_id` a `user_oauth_identities`, y luego **dropea** las columnas legacy de `users`.
- Modelo `UserOAuthIdentity` (nuevo) con cast `provider => OAuthProvider::class` y `scopes => 'array'`. Relación `User::oauthIdentities()`.
- `User` extendido: `hasPassword()`, `isOAuthOnly()` (sin password + al menos una identidad), `hasOAuthProvider(OAuthProvider)`. `oauth_provider` y `oauth_id` **fuera de `$fillable`** (legacy columns eliminadas).
- `App\Services\OAuthIdentityService` (nuevo):
  - `findByProvider(provider, providerUserId)`: busca identidad.
  - `findOrCreateUserFromSocialite(socialite, provider)`: encapsula la lógica de creación/vinculación.
  - `linkIdentityToUser(user, provider, providerUserId, socialite, email?, avatar?)`: crea o actualiza. Si la identidad ya está en otro user → 422. (Esto es lo que el flujo `?link=1` invoca.)
  - `unlinkProvider(user, provider)`: borra la identidad. Si es el único método de login del user (sin password + última identidad) → 422.
  - `markUsed(identity)`: actualiza `last_used_at`.
- `OAuthController` refactorizado: ahora `linkIdentityToUser` + `findOrCreateUserFromSocialite`. Callback distingue entre:
  - **Login flow** (sin `?link=1`): `findOrCreateUserFromSocialite` → emite JWT de login.
  - **Link flow** (con `?link=1` y sesión activa): el `link_intent` (user_id) se guarda en sesión. Al volver, si la sesión tiene un link_intent válido, llama a `linkIdentityToUser` y redirige a `{FRONTEND_URL}/account?oauth_linked={provider}&token=…` (refresca el JWT con el user actualizado) o `?oauth_error=…` si falla.
- 2 endpoints nuevos:
  - `GET /api/me/oauth-identities` (auth) → `OAuthIdentityResource[]`.
  - `DELETE /api/me/oauth-identities/{provider}` (auth, `provider` ∈ `google|facebook`): `204` (en este caso `200` con message, ver test) si la identidad existe, `404` si no, `422` si es el único método de login.
- `OAuthIdentityResource` con `provider_label` (mapea `google → "Google"`, `facebook → "Facebook"`).
- `OAuthService` (legacy) refactorizado para delegar en `OAuthIdentityService`. Eliminado código de escribir `last_used_at` en `users` (esa columna ya no existe).
- **Tests:** 13 actualizados en `OAuthTest` + 11 nuevos en `OAuthIdentityTest` (list, delete OK, delete 404, delete 422 único método, multi-provider, restricción "no puedes desvincular tu único método", `User::hasPassword`/`isOAuthOnly` correctness). Total backend: 178/178.

**Frontend (Angular 21)**
- `auth.types.ts`: nuevos `OAuthIdentity` interface y `ReviewRating`. `User` extendido con `has_password`, `oauth_only`, `oauth_identities[]`. Eliminado `oauth_provider` legacy.
- `AuthService` extendido: `linkOAuthProvider(provider)` (redirige con `?link=1`), `listOAuthIdentities()`, `unlinkOAuthProvider(provider)`, `buildOAuthRedirectUrl(provider, { link: true })`.
- i18n: namespace `account.oauth.*` con 16 keys (link_google/facebook, unlink, unlink_confirm, linked_on, last_used, never_used, provider_email, no_accounts, loading, error_*, linked_success, linked_error, only_warning). 1 key `topbar.nav.messages` (añadida a la nav).
- 1 componente nuevo: `LinkedAccountsComponent` (standalone, OnPush, signals). Grid con un slot por provider (Google, Facebook), badges "vinculado/no vinculado", `last_used_at` o fallback "nunca usada", botón "Desvincular" con confirm, botón "Conectar con X" que dispara linking, warning persistente para users OAuth-only, lectura de query params `oauth_linked` / `oauth_error` al volver del provider (limpia la URL con `replaceState`).
- Integrado en `AccountComponent` debajo de la sección profesional.
- Topbar: añade "Mensajes" en nav (client + freelancer) → `@if (variant === 'client' || variant === 'freelancer')` → muestra el link.
- **Tests:** 4 nuevos en `account.component.spec.ts` (linked-accounts section) + 6 nuevos en `auth.service.spec.ts` (linkOAuthProvider, list/unlink, buildOAuthRedirectUrl con options).

**Validación 5.5.F:** `npm run build` (OK) + `php artisan test` (178/178) + `validate:i18n` OK. ✅

**Total acumulado:** backend **178 tests / 880 assertions**, frontend **~30 suites** (build OK, tests skipped por [bug pre-existente](#pendiente-de-tests-frontend)).

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

**Total acumulado:** docs `deploy.md` nuevo, `roadmap.md` + Fase 5.6, `architecture.md` + sección Deploy, `README.md` + sección Deploy, 2 skills actualizadas. **Cero tests nuevos** (deploy no introduce funcionalidad; los tests existentes cubren el código que se desplegó).

### ✅ Fase 5.7 · Limpieza + Branching + CI

**Objetivo:** eliminar código muerto, tablas no usadas, y formalizar la estrategia de ramas con integración continua.

**Backend**
- Migración `2026_06_17_000000_drop_unused_tables` dropea 5 tablas no usadas (`password_reset_tokens`, `sessions`, `jobs`, `job_batches`, `failed_jobs`). Se conservan `cache` y `cache_locks`.
- Eliminados métodos `briefAttachmentUrl`/`briefAttachmentUrls` de `CloudinaryService`, `CloudinaryServiceFake` y `CloudinaryServiceInterface` (feature de brief attachments no existe aún; re-añadidos como `briefUrl`/`briefUrls` en 5.5.C).
- Eliminado `routes/web.php` vacío y referencias en `bootstrap/app.php`.
- `.env` local: `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync`, `CACHE_STORE=file`.
- Tests: eliminado test `brief_attachment_url_uses_correct_transformations` por dependencia removida.

**Frontend**
- Eliminado `import { BriefInput }` sin uso en `proposal-form.component.ts`.

**Branching & CI**
- Estrategia documentada en `AGENTS.md`: `main` (desarrollo activo + producción). Features vía `feature/<slug>` cortada de `main` y mergeada de vuelta con CI verde. Railway + Vercel despliegan desde `main`.
- `.github/workflows/test.yml`: PHPUnit + Jest en push/PR para `main`. (La rama `beta` se eliminó en [hotfix 0.21](#021--drop-rama-beta-de-la-política-de-ramas-y-de-ci) — toda la actividad de la beta previa se había mergeado siempre a `main` y la rama estaba desincronizada.)

**Validación 5.7:** `npm test` (172/172, 29 suites) + `php artisan test` (133/133, 634 assertions) — todo en verde. ✅

**Total acumulado:** backend **133 tests / 634 assertions**, frontend **172 tests / 29 suites**.

### ✅ Fase 6 · Mensajería (polling primero, websockets después) — cerrada 2026-06-18

**Objetivo:** chat cliente ↔ freelancer dentro de un brief con proposal aceptada. Polling cada 5s mientras hay una conversación abierta (sin websockets todavía — la migración a realtime queda en el backlog).

**Backend (Laravel 13)**
- 2 migraciones nuevas: `conversations` (UNIQUE `brief_id` + índices por client/freelancer+`last_message_at`) y `messages` (índices por `(conversation_id, created_at)` y `(conversation_id, read_at)`).
- Modelos `Conversation` y `Message` + relaciones en `User` (`clientConversations`, `freelancerConversations`, `sentMessages`) y `Brief::conversation()`.
- `Proposal::freelancerUser()` (hasOneThrough) para resolver `User::id` desde `Proposal::freelancer_id` (que apunta a `FreelancerProfile`).
- `ChatService`:
  - `getOrCreateForBrief` (auto-crea al aceptar proposal, 409 si brief sin proposal aceptada)
  - `listForUser` (con `unread_count` por user via withCount subquery)
  - `listMessages` con `?since=<iso8601>` para polling
  - `sendMessage` (transaccional: crea mensaje + actualiza `last_message_at`)
  - `markRead` (no cuenta los mensajes propios)
  - `totalUnread`
- `ChatController` con 6 endpoints:
  - `GET /api/conversations` — lista del user
  - `GET /api/conversations/unread-count` — total para badge
  - `GET /api/conversations/{id}` — detalle
  - `POST /api/briefs/{id}/conversation` — crear/devolver (201, 409 si no hay proposal aceptada, idempotente)
  - `GET /api/conversations/{id}/messages?since=&limit=` — listado paginado con soporte polling
  - `POST /api/conversations/{id}/messages` — enviar (valida 1-2000 chars, actualiza `last_message_at`)
  - `POST /api/conversations/{id}/read` — marcar como leído
- `SendMessageRequest` con validación 1-2000 chars.
- `ConversationResource` y `MessageResource` con `brief`/`client`/`freelancer`/`sender` anidados (lazy via `whenLoaded`).
- `ProposalController::updateStatus` ahora crea la conversación automáticamente al aceptar.
- **Tests:** 18 nuevos en `ChatTest` (creación, listado, mensajes, polling, mark-read, permisos, unread-count, auto-creación al aceptar, validaciones).

**Frontend (Angular 21)**
- Tipos `Conversation` + `ChatMessage` en `auth.types.ts`.
- `ChatService` con `listConversations`, `getConversation`, `ensureForBrief`, `listMessages({ since?, limit? })`, `sendMessage`, `markRead`, `getUnreadCount`.
- 3 componentes standalone:
  - `ChatListComponent` (polling 5s, badges unread, abre con teclado Enter/Space)
  - `ChatThreadComponent` (burbujas own/alien con `data-own`, scroll-to-bottom via `queueMicrotask`, polling `?since=`, validación de longitud, autosend a `markRead` al abrir)
  - `ChatPageComponent` (split-view desktop, switch mobile via grid `data-thread=true/false`)
- Ruta `/messages` con `authGuard`. Topbar añade "Mensajes" en nav (client + freelancer). Home de ambos roles muestra un quick-action card que enlaza a `/messages`.
- i18n `chat.*` (29 keys ES + 29 EN) + `topbar.nav.messages` (ES + EN).
- Accesibilidad: `role="list"`/`role="button"`, `tabindex`, `aria-label`, `aria-live="polite"`, focus visible.
- **Tests:** 6 nuevos en `chat-list.component.spec.ts` + 9 nuevos en `chat-thread.component.spec.ts`.

**Validación 6:** `npm run build` (OK, 299.90 kB) + `php artisan test` (208/208, 880 assertions) + `validate:i18n` OK. ✅

**Total acumulado:** backend **208 tests / 880 assertions**, frontend `npm run build` OK.

**Pendiente para esta fase (backlog):** migrar de polling a WebSockets (Laravel Reverb) + push notifications cuando llega un mensaje nuevo.

> **Cerrado en Sprint 4-5 (`f4f1621`, 2026-06-20).** La Fase 6 sigue marcada como `polling primero`, pero el camino rápido es ahora WS. El polling cada 30s queda como red de seguridad (corporate proxies que bloquean WS, devtools abiertos, etc.). Detalle operativo en [§ Hotfix 0.20](#020--websockets-migración-de-polling-a-reverb).

### ✅ Fase 7 · Reviews y ratings — cerrada 2026-06-18

**Objetivo:** valoración cruzada cliente ↔ freelancer tras completar un brief. Un user solo puede reseñar 1 vez cada proyecto (constraint UNIQUE).

**Backend (Laravel 13)**
- Migración `reviews` con `UNIQUE (brief_id, reviewer_id)` + índice por `(reviewee_id, created_at)`.
- Modelo `Review` + relaciones en `User` (`reviewsAuthored`, `reviewsReceived`) y `Brief::reviews()`.
- `ReviewService`:
  - `completeBrief` (cliente marca `assigned` → `completed`, 403 si no es dueño, 409 si status incorrecto)
  - `canReview` (brief completed + participante + no duplicado)
  - `create` (resuelve automáticamente el reviewee: cliente↔freelancer de la conversación)
  - `listForUser` (paginado), `listForBrief` (solo participantes), `aggregateForUser` (count + average)
- `StoreReviewRequest` con rating 1-5, comment ≤1000 chars, mensajes i18n.
- `ReviewController` con 4 endpoints:
  - `POST /api/briefs/{id}/reviews` (auth, participante, brief completed)
  - `GET /api/briefs/{id}/reviews` (auth, solo participantes)
  - `GET /api/users/{id}/reviews` (público, paginado `?limit=N`)
  - `GET /api/users/{id}/rating` (público, devuelve `{ user_id, count, average }`)
- `PATCH /api/briefs/{id}/complete` en `BriefController` (auth, solo el dueño del brief cuando está `assigned`).
- `FreelancerCardResource` y `FreelancerDetailResource` exponen `rating: { count, average }` (on-the-fly con `selectRaw`).
- **Tests:** 19 nuevos en `ReviewTest` (crear, anti-duplicados, validaciones, permisos, aggregate, complete-brief, rating en resource).

**Frontend (Angular 21)**
- Tipos `Review`, `ReviewRating`.
- `ReviewsService` con `create`, `listForUser`, `listForBrief`, `aggregateForUser`, `completeBrief`.
- 4 componentes standalone:
  - `RatingStarsComponent` (presentacional + interactivo, accesible con `role="radiogroup"`, output `valueChange`)
  - `ReviewListComponent` (lista con empty/error states, avatar con iniciales, fecha, `refreshKey` input para re-fetch)
  - `ReviewFormComponent` (5 estrellas + textarea + contador de chars + validación reactiva, usa `role="group"` para evitar NG8002)
  - `ReviewsSectionComponent` (orquesta form + list + botón "Marcar como completado" cuando `canComplete()`, detecta si el user ya reseñó)
- Integración:
  - `brief-detail` muestra la sección para client y freelancer.
  - `freelancer-detail` muestra hero con rating + lista de reviews.
  - `freelancer-card` (catálogo) muestra rating en la cabecera.
- i18n `reviews.*` (26 keys ES + 26 EN) + `rating.*` (4 keys).
- **Tests:** 4 nuevos en `review-list.component.spec.ts`.

**Validación 7:** `npm run build` (OK, 299.91 kB) + `php artisan test` (227/227, 927 assertions) + `validate:i18n` OK. ✅

**Total acumulado final:** backend **227 tests / 927 assertions**, frontend `npm run build` OK.

**Pendiente para esta fase (backlog):** permitir editar/borrar la propia review, responder a reviews, fotos adjuntas, denuncias.

---

## 🔴 P0 · Bugs y hotfixes (changelog operativo)

> Historial de hotfixes puntuales. Cerrar todo P0 antes de meter features nuevas.

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
- [x] **0.13** · Nueva disciplina `content` (Creación de Contenido)
  - Backend: enum `SkillCategory::Content` + migración `2026_06_12_140000_add_content_to_skills_category_enum.php` (MySQL `ALTER ENUM`, SQLite drop+recreate por CHECK constraint). `SkillSeeder` añade 6 skills a `content` + 4 nuevas a `edit`. 3 FormRequests aceptan `content`.
  - Frontend: `SkillCategory` union con `'content'`. i18n ES/EN: `skill_categories.content`, `landing.tagline_disciplines` (renombrado), 4ª `cat-card` (amber + SVG megáfono) en landing, 4ª categoría en client home, 4ª `<option>` en brief form. Pill de categoría en brief list/detail ahora `('skill_categories.' + b.category) | t`. `freelancer-list` añade la 5ª option de filtro. `freelancer-detail` añade override `[data-cat="content"]` en amber.
- [x] **0.14** · Rebalanceo de `edit` (de 4 a 8 skills)
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
- [x] **0.16** · OAuth frontend (página callback + complete-profile + botones)
  - Archivos: `core/types/auth.types.ts` (+`OAuthProvider`, `User.avatar_url?`), `core/services/auth.service.ts` (+`loginWithOAuth`, `handleOAuthCallback`, `completeOAuthProfile`, `fetchCurrentUser`), `app.routes.ts` (2 rutas nuevas), `features/auth/oauth-callback/`, `features/auth/oauth-complete-profile/`, `features/auth/login/login.component.{ts,html,css}` (botones OAuth), `features/auth/register/register.component.{ts,html}` (botones OAuth), `src/assets/i18n/{es,en}.json` (namespace `auth.oauth.*` con 11 claves), 3 specs nuevos.
  - Flujo: clic "Continuar con Google" → redirección completa al backend → callback redirige al frontend con `?token=…&new_user=…` → `OAuthCallbackComponent` persiste token y decide ruta → si `new_user=1` redirige a `/auth/complete-profile` (selector visual de rol) → POST `/auth/oauth/complete-profile` → home.
  - Botones OAuth con logos SVG inline oficiales (Google 4 colores, Facebook blanco sobre `#1877F2`).
- [x] **0.17** · Topbar unificado (CoreTopbarComponent)
  - 4 variants: `public` (sticky, brand + lang, sin user), `auth` (no-sticky, brand + lang, sin user, sin nav), `client` (sticky, nav [Inicio, Profesionales, Briefs] + name + role-pill + logout), `freelancer` (sticky, nav [Inicio, Mi perfil] + name + avatar con iniciales + logout).
  - Refactors en 11 features. Excepciones: `LandingComponent` (anchors in-page) y `BriefListComponent` (scope tabs + CTA condicional).
  - Fixes de `OAuthCompleteProfileComponent`: brand-logo raw → `<app-brand-logo>`, lang-slot vacío → language-selector real, aria-label hardcoded → key i18n, error hardcoded → key i18n.
  - Fixes de `FreelancerDetailComponent` / `BriefDetailComponent` / `BriefFormComponent` / `ProfileEditorComponent`: back era `<a>← …</a>` hardcoded → key i18n.
  - 10 nuevos en `topbar.component.spec.ts` + 3 nuevos en specs de features. Total: 137/24 suites.
- [x] **0.18** · Setup de tests frontend + seeder roto (P0 batch)
  - **Bug 1 — `php artisan migrate:fresh --seed` fallaba** con `Column not found: 1054 Unknown column 'city' in 'field list'` en `freelancer_profiles`. Causa: la migración `2026_06_18_134617_drop_city_from_freelancer_profiles` (Fase 5.5.D) eliminó la columna `city` pero `DemoFreelancersSeeder` (de la fase inicial) seguía insertándola en las 6 entradas de `$demo` y en el `updateOrCreate`. Fix: borradas las 6 entradas `city` del array y la asignación. Seed verificado: 6 freelancers seeded.
  - **Bug 2 — runner de Jest roto** (pre-existente desde la migración a Angular 21). `setup-jest.ts` no llamaba `setupZoneTestEnv()` de `jest-preset-angular/setup-env/zone`, así que `TestBed.createComponent` reventaba con `Cannot read properties of null (reading 'ngModule')` en cualquier suite que renderizase componentes. Fix en 3 archivos: `setup-jest.ts` (import + call), `package.json` (`zone.js: ~0.16.1` como dep), `tsconfig.spec.json` (eliminado `emitDecoratorMetadata` que generaba warnings ruidosos).
  - **Bug 3 — 5 specs con 16 tests fallando** (distintos del runner, acumulados desde las fases 5.5.C-7). Causas heterogéneas: aserción sobre signal en vez de `textContent` traducido, `mockAuth` incompleto en `AccountComponent` (faltaban métodos OAuth que `LinkedAccountsComponent` hijo necesita), `Object.defineProperty(window, 'location', ...)` no permitido en jsdom v26, parens faltantes en `renderWith(makeConversation)`, test que combinaba 2 escenarios en uno cuando el `ngOnChanges` solo sincroniza desde empty. Detalle por suite en [§ Pendiente de tests frontend](#pendiente-de-tests-frontend).
  - **Resultado:** `php artisan migrate:fresh --seed` ✅. `npx jest` → **36 suites / 249 tests verdes** ✅. `npm run build` ✅. `npm run validate:i18n` ✅. `php artisan test` → 227/927 ✅.
- [x] **0.19** · Navbar duplicada en `/messages` y `/briefs` (regresión post-Fase 5.4 / 6)
  - **Síntoma:** en `/messages` y `/briefs` se renderizaban **dos** topbars idénticos: uno global en `App` y otro dentro de los componentes de feature.
  - **Causa:** `BriefListComponent` y `ChatPageComponent` tenían un `<app-core-topbar />` extra en su HTML. La convención de Fase 5.4 dice que el topbar global lo provee `App` y solo `LandingComponent` debe tener topbar propio (anchors in-page). `BriefListComponent` ya justificaba su "excepción" por los scope tabs (viven en `<app-briefs-sub-bar>`, no en el topbar), y `ChatPageComponent` (Fase 6) nunca debió tener topbar local.
  - **Fix:**
    - `frontend/src/app/features/chat/chat-page/chat-page.component.html` — borrada la línea `<app-core-topbar />`.
    - `frontend/src/app/features/chat/chat-page/chat-page.component.ts` — quitado `CoreTopbarComponent` del `imports[]` y del import.
    - `frontend/src/app/features/briefs/list/brief-list.component.html` — borrada la línea `<app-core-topbar />`.
    - `frontend/src/app/features/briefs/list/brief-list.component.ts` — quitado `CoreTopbarComponent` del `imports[]` y del import.
  - **CSS** (robustez para que el background fluya correctamente con el global topbar):
    - `chat-page.component.css` — `:host` recibe `background: #0f0f12`, `color: #f4f4f5`, `font-family`, `min-height: 100vh`; `.chat-page` mantiene solo `min-height: 100vh`.
    - `brief-list.component.css` — idem, consolidando el `:host` previo.
  - **Validación:** `npx jest` 41/286 ✅, `npm run build` sin warnings ✅, smoke visual en `/`, `/login`, `/home/client`, `/home/freelancer`, `/briefs`, `/briefs/1`, `/briefs/new`, `/messages`, `/freelancers`, `/freelancers/1`, `/account` → un solo topbar en cada ruta (excepto `/`, oculto).
  - **Nota:** la convención de Fase 5.4 ("`BriefListComponent` mantiene su topbar propio") se matiza: en realidad el topbar lo provee el global desde `App`; lo que `BriefListComponent` justifica como "excepción" son los **scope tabs** (`<app-briefs-sub-bar>` con "Todos / Mis proyectos"), no el topbar.
- [x] **0.20** · WebSockets: migración de polling a Reverb
  - **Contexto:** el backlog P3 tenía marcado "Migrar chat de polling a WebSockets" como `sin empezar` aunque el trabajo se había hecho en el commit `f4f1621 feat(sprints 1-5): P0 bugs, P2 UX, Laravel Reverb WebSockets` (2026-06-20). El roadmap no se actualizó en su día. Esta entrada es la formalización retroactiva, no un cambio de código.
  - **Sprint 4 — Backend (Laravel Reverb):**
    - `composer.json`: `laravel/reverb: ^1.10` instalado.
    - `config/broadcasting.php` + `config/reverb.php` + `routes/channels.php`. `BROADCAST_CONNECTION` por defecto `log` en dev, `reverb` en prod; `null` en tests (`phpunit.xml`).
    - 3 eventos en `app/Events/`: `MessageSent`, `ConversationUpdated`, `UnreadCountChanged`. Todos implementan `ShouldBroadcastNow` (no pasan por cola — el realtime es crítico).
    - Canales privados: `private-conversation.{id}` para mensajes y `private-user.{id}` para el badge de no-leídas del topbar. Policy extraída a `app/Broadcasting/ChatChannelAuthorizer.php` (testable sin HTTP).
    - `ChatService` dispara los eventos en `sendMessage` (líneas 141-145) y `markRead` (líneas 159-160). `ConversationUpdated` solo se emite si `markRead` actualizó al menos 1 mensaje.
    - `start-container.sh` arranca Reverb en background (`php artisan reverb:start --host=0.0.0.0 --port=${REVERB_SERVER_PORT:-8080} &`) solo si `BROADCAST_CONNECTION=reverb`. En dev con `BROADCAST_CONNECTION=log` los eventos se escriben a `storage/logs/laravel.log` (suficiente para debug).
    - `railpack.json` añade `php8.4-sockets` para que `pcntl`/`posix` (que Reverb necesita) estén disponibles en el build de Railway.
    - **Tests:** `tests/Feature/BroadcastingTest.php` (10 tests): dispatch de eventos en `sendMessage` y `markRead`, no-dispatch cuando falla la validación, canal correcto en cada evento, autorización de `private-conversation` (participantes OK, extraños KO, conversación inexistente KO), autorización de `private-user` (solo el propio user).
  - **Sprint 5 — Frontend:**
    - `core/services/websocket.service.ts`: cliente Pusher-protocol escrito a mano (sin `pusher-js` para mantener el bundle pequeño). Singleton, JWT auth header pasado en cada `connect()`, reconexión exponencial `1s → 2s → 4s → ... → 30s` con `Math.min(base * 2^(attempts-1), 30_000)`, ping cada 60s (`pusher:ping`), manejo de `pusher:subscription_error` (reconnect full para re-autenticar el canal), `pendingSubs` replay en cada `handleOpen` para que las suscripciones sobrevivan a desconexiones.
    - `core/services/chat-realtime.service.ts`: wrapper de alto nivel. `connect()` en cuanto `auth.currentUser()` es truthy, `disconnect()` cuando se va a `null` (logout). Suscripción automática a `private-user.{id}` para `unread.changed`. `subscribeToConversation(id, onMessage, onUpdate?)` con **multiplexing**: N listeners sobre la misma conversación comparten 1 suscripción WS; cuando el último hace `unsub()` se libera.
    - `chat-list` y `chat-thread` ya **no** hacen `interval(5000)` (polling 5s). Ahora WS es el camino rápido; queda un polling 30s como **fallback explícito** para entornos donde WS está bloqueado (corporate proxies, devtools cerrados, etc.). El comment en `chat-thread.component.ts:85` documenta el porqué.
    - `AuthService.getToken()` añadido para que `WebSocketService` pueda leer el JWT actual en cualquier momento (soporta rotación tras refresh).
    - `environment.{development,production}.ts` con bloque `ws: { key, host, port, scheme }`. Dev = `ws://127.0.0.1:8080`. Prod = `wss://framematch-ws.railway.app:443`.
    - **Tests:** 10 nuevos (split entre `websocket.service.spec.ts` y `chat-realtime.service.spec.ts`). Usan un `FakeWebSocket` global que registra `addEventListener`/`send` y permite `dispatch` síncrono de eventos `open`/`message`/`close` para avanzar el state machine sin red.
  - **Limitaciones conocidas:**
    - **WS en Railway con un solo proceso:** Reverb arranca en el mismo dyno que el backend HTTP (`start-container.sh` lo lanza con `&`). Funciona para el tráfico actual, pero no escala horizontalmente: con varios dynos, las broadcasts de un dyno no llegan a clientes conectados a otro. Cuando esto sea un problema, mover Reverb a un servicio separado en Railway (o a Pusher/Ably externo).
    - **No hay pusher-js:** la implementación cubre el subset que Reverb necesita (Pusher protocol 7), pero si se quisiera compatibilidad con presence channels o client events habría que extenderla.
    - **Auth por JWT plano:** `buildAuthForChannel` pasa el JWT como string de auth. Reverb lo acepta en la mayoría de setups; si en el futuro hace falta HMAC real (`socketId:channel` firmado con el `app_secret`), el hook ya está aislado en esa función.
  - **Cerrado el 2026-06-20.**

**Validaciones P0-P2-Bonus-5.x:**
- **P0:** `npm test` (54/54) + `npm run build` (OK) + `php artisan test` (15/71) ✅
- **P1:** `npm test` (62/62, 11 suites) + `npm run build` (OK) + `php artisan test` (25/190) ✅
- **P2:** `npm test` (84/84, 15 suites) + `npm run build` (OK) + `php artisan test` (38/280) ✅
- **Bonus (Home + i18n + Briefs):** `npm test` (107/107, 21 suites) + `npm run build` (OK) + `php artisan test` (62/343) ✅
- **5.1 (i18n briefs + hotfixes UI):** `npm test` (108/108, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/343) ✅
- **5.1.1 (FOUT + browser detection):** `npm test` (111/111, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/343) ✅
- **5.2 (disciplina Content + rebalanceo):** `npm test` (113/113, 21 suites) + `npm run build` (sin NG8113) + `php artisan test` (62/388) ✅
- **5.3 (OAuth Google + Facebook):** `npm test` (124/124, 23 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) ✅
- **5.4 (Topbar unificado):** `npm test` (137/137, 24 suites) + `npm run build` (sin NG8113) + `php artisan test` (74/431) ✅
- **5.7 (Limpieza + Branching + CI):** `npm test` (172/172, 29 suites) + `npm run build` (sin NG8113) + `php artisan test` (133/133, 634 assertions) ✅
- **0.20 (WebSockets Reverb):** `npx jest` (286 tests / 41 suites) + `npm run build` (OK) + `php artisan test` (240 tests / 970 assertions) ✅
- **0.21 (Drop beta branch):** `npx jest` (316 tests / 43 suites) + `npm run build` (OK) + `php artisan test` (250 tests / 994 assertions) ✅

---

- [x] **0.21** · Drop rama `beta` de la política de ramas y de CI
  - **Síntoma:** la política documentada en `AGENTS.md` desde Fase 5.7 decía que el trabajo iba por `beta` y se mergeaba a `main` vía PR. En la práctica, todos los commits desde entonces (incluido el sprint de WebSockets) se mergeaban directo a `main` o se commiteaban ahí sin feature branch. La rama `beta` llevaba semanas desincronizada y no disparaba deploys.
  - **Fix:**
    - `AGENTS.md` — sustituida la sección "Estrategia de ramas" por una tabla con solo `main`, documentando que es rama activa de trabajo y producción. Aclarado el flujo: `feature/<slug>` desde `main`, PR, merge con CI verde. Excepción explícita para cambios puramente documentales.
    - `.github/workflows/test.yml` — el `on:` ahora dispara solo en `push` y `pull_request` a `main`. Eliminada la referencia a `beta`.
    - `docs/roadmap.md` — actualizadas las menciones legacy a `beta` (Fase 5.7 y P5 §CI/CD) para que apunten a esta entrada como referencia.
  - **Cerrado el 2026-06-20.**

---

## 🟠 P1 · Fase 3 (Edición de perfil de freelancer)

> Portfolio de imágenes queda para Fase 3.5 (futura, ahora en 5.5.B).

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

## 🟡 P2 · Fase 4 (Catálogo público de freelancers)

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

## 🟢 Backlog priorizado

### P3 · Capacidades transversales (orden sugerido)

- [x] **Aceptar / rechazar propuesta** (`PATCH /api/briefs/{id}/proposals/{pid}/status`) — ✅ **cerrado**.
  - Backend: `ProposalController::update:79-130` con validación 401/403/404/422, side-effects (auto-rechaza otras propuestas pending, marca brief como `assigned`, auto-crea conversación con el freelancer ganador).
  - Backend tests: 8 tests en `BriefsAndProposalsTest:364-507` cubriendo todos los casos (incluida idempotencia), más 1 test extra en `ChatTest:333` para el side-effect de crear conversación.
  - Frontend service: `ProposalsService.updateStatus:23-30`.
  - Frontend UI: `BriefDetailComponent.updateProposalStatus:90-102` + botones Aceptar/Rechazar en `brief-detail.component.html:92-107` (solo para owner, solo si `proposal.status === 'pending'`). El update local de `proposalsList` y `brief.status` se hace en el `next` del observable.
  - Frontend tests: 6 tests en `brief-detail.component.spec.ts:129-163` cubriendo render, service call, y state update.
  - i18n: `briefs.proposals.{accept,reject,status_pending,status_accepted,status_rejected,status_withdrawn,confirm_accept,confirm_reject}` (ES+EN). Las claves `confirm_*` están definidas pero los botones actuales disparan la acción sin `confirm()` (decisión de UX: las acciones son reversibles y el botón de "Cancelar" en cada estado del brief permite re-evaluar).
  - **Pendiente menor:** el `confirm_accept` y `confirm_reject` se pueden añadir como `window.confirm()` en el `updateProposalStatus()` si se quiere blindar contra clics accidentales.
- [x] **Editar / borrar la propia review** (`PUT /api/reviews/{id}` + `DELETE /api/reviews/{id}`) — ✅ **cerrado**.
  - Backend: `ReviewController::update` con `UpdateReviewRequest` (rating 1-5, comment ≤1000) y `ReviewController::destroy` con 204. Ambos protegidos por auth y restringidos al `reviewer_id` vía `ReviewService::update`/`destroy` (lanza 403 si el actor no es el autor).
  - Backend tests: 10 nuevos en `ReviewTest.php` cubriendo happy path, 403 non-owner, 401 sin auth, 422 validación de rating y comment, 404 review inexistente (update + destroy).
  - Rutas: `PUT /api/reviews/{id}` y `DELETE /api/reviews/{id}` (auth:api, whereNumber). El backend pasa de **240/927** a **250/994** tests.
  - Frontend service: `ReviewsService.update(id, input)` (PUT, devuelve `r.data`) y `ReviewsService.delete(id)` (DELETE, devuelve void).
  - Frontend UI:
    - `ReviewFormComponent` — el path de edit ya estaba medio cableado (`existing` input + `ngOnInit` que parchaba el form) pero la submit() hacía `of(null)` saltándose el update. Reemplazado por la llamada real a `ReviewsService.update`. El botón "Publicar" cambia a "Guardar cambios" cuando hay `existing`, y aparece un botón "Eliminar reseña" al lado con confirmación vía `window.confirm(this.lang.t('reviews.delete_confirm'))`.
    - `ReviewsSectionComponent` — maneja el `deleteRequested` del form: confirma, llama a `ReviewsService.delete`, resetea `existingReview` a `null` (para que el form vuelva a "crear") e incrementa `refreshKey` para que el `ReviewListComponent` re-fetchee.
  - Frontend tests: spec nuevo `review-form.component.spec.ts` con 10 tests (create title, patch from existing, edit title, delete button visible, create submit, update submit, error_save, error_update, invalid form, deleteRequested emit). Mock reasignable via `get create()`/`get update()` en el provider.
  - i18n: 6 claves nuevas en `reviews.*` (ES+EN): `save_changes`, `edit_title`, `delete_cta`, `delete_confirm`, `error_update`, `error_delete`.
  - El frontend pasa de **42/303** a **43/313** tests.
  - **Cerrado el 2026-06-20.**
- [x] **Migrar chat de polling a WebSockets** (Laravel Reverb + push notifications) — ✅ **cerrado en `f4f1621`**.
  - Backend: `laravel/reverb: ^1.10` + `config/broadcasting.php` + `config/reverb.php` + `routes/channels.php`. Eventos `MessageSent`, `ConversationUpdated`, `UnreadCountChanged` (todos `ShouldBroadcastNow`) sobre canales privados `conversation.{id}` y `user.{id}`. `App\Broadcasting\ChatChannelAuthorizer` con la policy extraída de los closures de `channels.php` para que sea testeable en aislamiento. `ChatService` dispara los eventos en `sendMessage` y `markRead`. `start-container.sh` arranca Reverb en background si `BROADCAST_CONNECTION=reverb`. `railpack.json` con `php8.4-sockets` para producción.
  - Frontend: `WebSocketService` (singleton, Pusher protocol a mano sin `pusher-js`, JWT auth, reconexión exponencial 1s→30s, ping cada 60s). `ChatRealtimeService` (suscripciones a `private-user.{id}` para unread count + `private-conversation.{id}` para mensajes). `chat-list` y `chat-thread` reemplazan el polling 5s por WS; el polling 30s queda como fallback.
  - Tests: 10 backend en `BroadcastingTest` (eventos, canales, autorización) + 10 frontend (`websocket.service.spec.ts` + `chat-realtime.service.spec.ts`).
  - Detalle: [§ Hotfix 0.20](#020--websockets-migración-de-polling-a-reverb).
- [x] **OnboardingGuard** (`CanActivateFn` que redirige a `/onboarding/welcome` si el freelancer autenticado tiene `onboarding_completed_at === null` y la ruta visitada no es `/onboarding/*` ni `/home`).
  - Implementado en `frontend/src/app/core/guards/onboarding.guard.ts`. Lógica:
    - Sin sesión → `true` (deja que `authGuard` aguas arriba haga su trabajo).
    - User con `role !== 'freelancer'` → `true` (el onboarding solo aplica a freelancers).
    - Freelancer con `onboarding_completed_at` definido → `true` (ya completó).
    - Path coincide con `/home`, `/home/*`, `/onboarding` o `/onboarding/*` → `true` (bypass).
    - Resto → `UrlTree('/onboarding/welcome')`.
  - Aplicado en `app.routes.ts` a las rutas autenticadas que NO son bypass: `/account`, `/freelancer/profile/edit`, `/freelancer/portfolio`, `/briefs/new`, `/messages`. Las rutas públicas (`/`, `/login`, `/register`, `/briefs`, `/briefs/:id`, `/freelancers`, `/freelancers/:id`, `/auth/callback`, `/auth/complete-profile`) y las bypass (`/home*`, `/onboarding*`) se quedan como están.
  - Spec `frontend/src/app/core/guards/onboarding.guard.spec.ts` con 11 casos: no auth, no-freelancer, freelancer completo, 5 paths bypass, 6 paths redirigidos, query params (bypass y redirect), freelancer sin `freelancer_profile` (= incompleto).
  - **Cerrado el 2026-06-20.**
- [ ] **Reset de password** (requiere crear tabla `password_reset_tokens` — se eliminó en Fase 5.7 por no usarse). Link firmado con TTL 30 min, email transaccional, `MAIL_MAILER` configurado.
- [ ] **Verificación de email** (campo `email_verified_at` ya existe).
  - Link firmado de un solo uso, reenvío, UI banner persistente si no verificado.
- [x] **Edición de cuenta** (`PUT /api/me`) — ✅ Fase 5.5.E (UserAccountController + UpdateAccountRequest + tests).
- [ ] **Notificaciones in-app** (campana con lista de eventos, persistencia en BD opcional, badge en topbar).

### P4 · Fases del producto
- [x] **Fase 3.5** · Portfolio de imágenes para freelancers — ✅ Fase 5.5.B (tabla `portfolios` + `PortfolioEditorComponent` + `LightboxComponent`).
- [x] **Fase 5.5.A-F** · Cloudinary (avatar + cover + portfolio + brief attachments + OAuth N:M) — ✅ cerrado.
- [x] **Fase 6** · Mensajería (polling primero, websockets después) — ✅ cerrado.
- [x] **Fase 7** · Reviews y ratings — ✅ cerrado.

### P5 · Calidad de plataforma / DevEx
- [ ] E2E con Playwright.
- [x] CI/CD con GitHub Actions — ✅ Fase 5.7 (`.github/workflows/test.yml` con PHPUnit + Jest en push/PR a `main`; la rama `beta` se eliminó en [hotfix 0.21](#021--drop-rama-beta-de-la-política-de-ramas-y-de-ci)).
- [ ] Pipeline de lint (ESLint + Pint) — parcialmente hecho: hay configs y npm scripts, falta integrar como job obligatorio en CI.
- [ ] Docker compose dev (php-fpm + nginx + mysql + node).
- [ ] Búsqueda full-text (Meilisearch) — solo si el catálogo crece.
- [ ] SSR (Angular Universal) para SEO de la landing pública.
- [ ] Logo / favicon / OG image.
- [ ] Auditar accesibilidad con `axe`/Lighthouse.

### P6 · Roles extendidos
- [ ] Sub-perfiles `agency` y `company`.
- [ ] Admin panel.
- [x] OAuth — ✅ Fase 5.3 (Google + Facebook vía Socialite, auto-vincular por email, complete-profile) + ✅ Fase 5.5.F (N:M con `user_oauth_identities` + `?link=1`).

---

## Pendiente de tests frontend

### ✅ Bug del runner — RESUELTO

Había un **bug pre-existente** en `frontend/setup-jest.ts` para Angular 21 + `jest-preset-angular@16`: el `setupZoneTestEnv()` de `jest-preset-angular/setup-env/zone` no se importaba, lo que provocaba que `TestBed.createComponent` fallase con `Cannot read properties of null (reading 'ngModule')` en todas las suites que renderizan componentes. Este bug ya existía en el repo antes de las fases 5.5.C-7.

**Fix aplicado** (en `docs/roadmap.md` revisable en git):
- `frontend/setup-jest.ts` — añadidos `import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';` y llamada antes del mock de `console.error/warn`. El `setupZoneTestEnv()` importa `zone.js` y `zone.js/testing`, registra `BrowserTestingModule` y `provideZoneChangeDetection()` (rama Angular 21), e inicializa el `TestBed` global.
- `frontend/package.json` — añadido `zone.js: ~0.16.1` como dependencia. Era necesario porque el preset lo requiere en runtime, y aunque Angular 21 lo auto-incluye en el bundle de producción, no estaba en `node_modules` para los tests.
- `frontend/tsconfig.spec.json` — eliminado `emitDecoratorMetadata: true` (no necesario para Angular 21 con `isolatedModules: true`; el flag generaba warnings ruidosos en cada compilación de `ts-jest`).

**Resultado:**
- `npx jest` → **31 suites pasan (232 tests)**, 5 suites con fallos (16 tests). Los 16 tests que fallan son bugs en los specs (ver siguiente sección), NO en el runner.
- `npm run build` → OK, 299.91 kB / 82.67 kB transferidos.

### ✅ Specs con bugs pre-existentes (no del runner) — RESUELTO

5 suites con 16 tests fallando. Se han corregido. Resumen por suite:

- `src/app/core/services/auth.service.spec.ts` (2 tests) — el `httpMock` no tenía `delete`; el test de `linkOAuthProvider` usaba `Object.defineProperty(window, 'location', ...)` que jsdom v26 no permite (no-configurable). Reemplazado por el patrón "no throw" + verificación de `buildOAuthRedirectUrl`, igual que `loginWithOAuth() does not throw`.
- `src/app/features/account/account.component.spec.ts` (8 tests) — el `mockAuth` no incluía `listOAuthIdentities` ni el resto de métodos OAuth que `LinkedAccountsComponent` (renderizado dentro de `AccountComponent`) necesita. Añadidos: `listOAuthIdentities`, `unlinkOAuthProvider`, `linkOAuthProvider`, `me` (en los 2 sitios donde se redefine el mock).
- `src/app/features/briefs/brief-attachment-uploader/brief-attachment-uploader.component.spec.ts` (3 tests):
  - `moves attachment down`: el test llamaba `moveUp(list[1])` pero esperaba el orden original `[1, 2]`. Reemplazado por `moveDown(list[0])` con la expectativa correcta `[2, 1]`.
  - `surfaces error when remove fails`: el spec esperaba el texto traducido en la signal, pero la signal guarda la clave i18n (decisión correcta, ver más abajo). Cambiado a `textContent` + `detectChanges()` extra.
  - `exposes canAdd and remainingSlots`: el test combinaba 2 escenarios en uno, pero el `ngOnChanges` del componente solo sincroniza cuando `attachments().length === 0`. Dividido en 2 tests separados (uno por escenario).
- `src/app/features/account/linked-accounts/linked-accounts.component.spec.ts` (1 test) — `surfaces error when unlink fails`: el error se setea dentro del subscribe, pero faltaba `fixture.detectChanges()` para re-renderizar. Añadido.
- `src/app/features/chat/chat-thread/chat-thread.component.spec.ts` (2 tests):
  - `surfaces error when sending fails`: mismo patrón que linked-accounts. Añadido `detectChanges()`.
  - `appends incoming messages from polling`: el spec pasaba `makeConversation` sin `()` (referencia a la función, no llamada). Cambiado a `makeConversation()` + `detectChanges()` para refrescar el DOM tras la poll.

**Decisión de diseño correcta (preservada):** el componente guarda la **clave** (`'brief_attachments.error_remove'`) en el signal `errorMessage`, y el template la resuelve con `{{ msg | t }}` en `brief-attachment-uploader.component.html:37`. Esto evita acoplar el componente a `LanguageService` y permite cambiar el idioma en runtime sin reemitir el error. El test debe comprobar el `textContent` del DOM (ya traducido), no el valor de la signal.

**Resultado final:** `npx jest` → **36 suites / 249 tests verdes** ✅.

---

## Criterios para cerrar una fase

1. ✅ Todos los tests del backend y del frontend en verde.
2. ✅ `npm run build` sin warnings nuevos.
3. ✅ Documentación actualizada (este roadmap + AGENTS.md correspondiente + README si toca).
4. ✅ Smoke E2E manual hecho por el dev.
5. ✅ Cambios en BD documentados en `docs/database.md`.
6. ✅ Cambios en API documentados en `docs/api.md`.
7. ✅ Cambios en UI alineados con `docs/design-system.md`.

---

## Cómo proponer una nueva fase

Abre un PR con:
- Descripción de 1-2 frases del valor que aporta.
- Lista de endpoints / componentes / migraciones que introduce.
- Estimación de tests nuevos.
- Marcar en este roadmap como "🔵 En planificación" hasta que se apruebe.
- Al aprobar, mover a "Fases entregadas" y crear su bloque en P0/P1/P2/Backlog con la atomización de tareas (estilo § Fase 3 / § Fase 4 de este archivo).
