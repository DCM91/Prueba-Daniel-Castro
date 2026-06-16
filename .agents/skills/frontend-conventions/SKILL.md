---
name: frontend-conventions
description: FrameMatch frontend conventions for Angular 21 (standalone components, signals, new control flow), Jest 30, RxJS, HttpClient, reactive forms, CSS-in-component, and the dark/violet/cyan design system from docs/design-system.md. Use when working on frontend/ TypeScript files, Angular components, services, HttpInterceptorFn, CanActivateFn guards, reactive forms, Jest specs, or anything under frontend/src/app. Triggers include "create a component", "add a service", "add a guard", "add an interceptor", "wire HttpClient", "fix the form", "style the card", "add a spec", "make it reactive", "use signals". Do NOT use for backend/ or docs/ work.
license: MIT
metadata:
  project: FrameMatch
  stack: Angular 21 / Jest 30 / RxJS / CSS-in-component
---

# AGENTS.md · Frontend (Angular 21)

Convenciones del frontend. Para el panorama general, consulta [AGENTS.md](../AGENTS.md). Para la arquitectura, [docs/architecture.md](../docs/architecture.md). Para el sistema visual, [docs/design-system.md](../docs/design-system.md).

## Stack

- **Angular 21.2** (standalone components, signals, new control flow).
- **Node 22+**, **npm 9+**.
- **Jest 30** + `jest-preset-angular` 16 para tests (sin Karma).
- **HttpClient** para API.
- **Sin NgModule raíz**: 100% standalone.
- **Sin librería de UI externa**: cada componente trae su CSS siguiendo `docs/design-system.md`.

## Estructura de carpetas

```
frontend/
├── public/                       ← assets estáticos (logo, favicon, etc.)
├── setup-jest.ts                 ← bootstrap de Jest
├── jest.config.js
├── angular.json
├── package.json
├── proxy.conf.json               ← /api/* → 127.0.0.1:8000
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
└── src/
    ├── main.ts                   ← bootstrapApplication(App, appConfig)
    ├── index.html
    ├── styles.css                ← estilos globales mínimos
    └── app/
        ├── app.ts                ← componente raíz (router-outlet)
        ├── app.config.ts         ← providers (router, http, interceptors)
        ├── app.routes.ts         ← todas las rutas
        ├── core/                 ← singleton, compartido por toda la app
        │   ├── types/            ← tipos compartidos (User, Role, etc.)
        │   ├── services/         ← servicios singleton (Auth, TokenStorage)
        │   ├── interceptors/     ← HttpInterceptorFn (auth, etc.)
        │   ├── guards/           ← CanActivateFn
        │   └── utils/            ← (futuro) helpers
        └── features/             ← componentes de feature, lazy-loaded
            ├── landing/
            ├── auth/
            │   ├── login/
            │   └── register/
            └── home/
                ├── home-redirect.component.ts
                ├── client/
                └── freelancer/
```

### Reglas
- **`core/`**: cosas singleton (servicios, tipos compartidos, guards, interceptors). No se importa nada de `features/` desde aquí.
- **`features/`**: componentes de páginas/funcionalidades. Pueden importar de `core/`. No se importan entre features directamente (si dos features comparten algo, muévelo a `core/`).
- Cada feature en su propia carpeta. Si la feature es grande (`auth/`, `home/`), puede tener subcarpetas.

## Convenciones de naming

- **TypeScript:** inglés para clases, métodos, variables, tipos, archivos de código. Español solo en copy visible al usuario (textos de UI, mensajes de error, copy de marketing).
- **PascalCase** para clases (`LoginComponent`, `AuthService`).
- **camelCase** para métodos, propiedades, signals, variables.
- **kebab-case** para nombres de archivo (`login.component.ts`, `home-redirect.component.ts`).
- **UPPER_SNAKE_CASE** para constantes (`PREFIX_TOKEN = 'framematch_'`).
- Sufijo por tipo: `.component.ts`, `.service.ts`, `.guard.ts`, `.interceptor.ts`, `.types.ts`, `.spec.ts`.

## Standalone components

- Todos los componentes son `standalone: true` (no `NgModule`).
- Importaciones explícitas en `imports: []` del decorador.
- `changeDetection: ChangeDetectionStrategy.OnPush` por defecto (mejor performance).
- HTML y CSS en archivos separados (`*.component.html`, `*.component.css`), inline solo para cosas de 1 línea.

```ts
@Component({
  selector: 'app-foo',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './foo.component.html',
  styleUrl: './foo.component.css',
})
export class FooComponent {}
```

## Signals (no RxJS para estado UI)

- Estado local: `signal<T>(initialValue)`.
- Estado derivado: `computed(() => ...)` — se re-evalúa solo cuando cambian sus dependencias.
- Side effects: `effect(() => ...)` — para log/debug, no para lógica de negocio.
- En plantilla: `currentUser()` para leer, `setValue()` no se usa — solo `currentUser.set(...)` en TS.

```ts
private readonly _user = signal<User | null>(null);
readonly user = this._user.asReadonly();
readonly isAuth = computed(() => !!this._user());
```

## HttpClient e interceptors

- HttpClient se provee en `app.config.ts` con `provideHttpClient(withInterceptors([...]))`.
- Interceptors como **funciones** (`HttpInterceptorFn`), no como clases (Angular 21 lo prefiere).
- Cada interceptor en `core/interceptors/`.
- En tests, usar `provideHttpClientTesting()` + `HttpTestingController`.

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getToken();
  if (!token || req.url.startsWith('http')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

## Routing

- Todas las rutas en `app.routes.ts`.
- Rutas **lazy-loaded** con `loadComponent: () => import('...')`.
- Guards como **funciones** (`CanActivateFn`), no clases.
- Composición de guards: `canActivate: [authGuard, roleGuard(['freelancer'])]`.

```ts
{
  path: 'home/freelancer',
  canActivate: [authGuard, roleGuard(['freelancer'])],
  loadComponent: () => import('./features/home/freelancer/freelancer-home.component').then((m) => m.FreelancerHomeComponent),
}
```

## Forms

- **Reactive Forms** (`ReactiveFormsModule`) para todo. No `ngModel` ni template-driven forms.
- `FormBuilder.nonNullable.group({...})` para que los valores no acepten `null` (mejor tipado).
- Validadores: los built-in (`Validators.required`, `.email`, `.minLength`, etc.) + custom para lógica de negocio (ej: `passwordsMatch`).
- Mensajes de error en plantilla con `@if (control.touched && control.errors) { ... }`.

```ts
readonly form = this.fb.nonNullable.group({
  email:    ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});
```

## Estilos

- **CSS-in-component** (`*.component.css`). No hay CSS modules, no SCSS, no Tailwind.
- Variables en `docs/design-system.md` se referencian en comentarios al inicio del CSS (todavía no usamos CSS custom properties; cuando se añada, se documenta).
- Mobile-first, layouts con `grid` y `auto-fit`/`minmax` para responsividad.
- No usar `!important`. Si hace falta, repensar la especificidad.
- Iconos: SVG inline con `viewBox`, `stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`.

## Tests (Jest)

### Setup
- `jest.config.js` con preset `jest-preset-angular`.
- `setup-jest.ts` solo tiene un comentario (la v16 del preset eliminó `setup-jest.js`; el preset se carga por config).
- `tsconfig.spec.json` hereda de `tsconfig.json` y excluye `src/**/*.spec.ts` de la build de producción.

### Comandos
```bash
npm test                         # corre todos los specs
npm test -- --watch              # modo watch
npm test -- --coverage           # con cobertura
```

### Estructura de un spec
- `describe('ComponentName', () => { ... })` por componente.
- `it('does X', () => { ... })` o `it('does X', (done) => { ... })` para async.
- `beforeEach` para setup común (TestBed.configureTestingModule, mocks, fixture).
- Mocks de servicios con `useValue: { ... }`.

### Patrones

**Test de componente con HttpClient:**
```ts
await TestBed.configureTestingModule({
  imports: [LoginComponent, ReactiveFormsModule],
  providers: [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
  ],
}).compileComponents();

const httpMock = TestBed.inject(HttpTestingController);
const req = httpMock.expectOne('/api/auth/login');
req.flush({...});
```

**Test de signal-driven logic:**
```ts
const userSignal = signal<User | null>(makeUser('freelancer'));
{ provide: AuthService, useValue: { currentUser: userSignal, ... } }
expect(component.profileCompletion()).toBe(50);
```

**Test de guard:**
```ts
TestBed.runInInjectionContext(() => authGuard(route, state));
```

### Cobertura
- Threshold actual: ~90% statements, ~87% branches. Subir si baja, no bajar.
- Specs obligatorios para: services con lógica, guards, componentes con state o computeds, componentes que consumen HttpClient.
- Specs opcionales para: componentes puramente presentacionales (sin lógica, sin servicios).

## Variables de entorno

- No usamos archivos `.env` en Angular 21. Las URLs del backend se asumen en `/api/*` (relativas) y se configuran vía `proxy.conf.json` en dev.
- En prod, el frontend se sirve detrás del mismo dominio del backend, así que las URLs relativas siguen funcionando.

## Comandos útiles

```bash
npm start                        # ng serve, http://localhost:4200
npm run build                    # build de producción → dist/frontend
npm test                         # jest
npm run lint                     # eslint
```

## Angular CLI

```bash
npx ng generate component features/auth/login       # crea carpeta + 4 archivos
npx ng generate service core/services/foo
npx ng generate guard core/guards/foo
npx ng generate interceptor core/interceptors/foo
```

El proyecto tiene configurado en `angular.json` el prefijo `app-` para los selectores y `skipTests: false` (siempre genera el spec).

## Cloudinary (Fase 5.5.A)

Las imágenes de usuario (avatars, covers, portfolios, brief attachments) viven en Cloudinary. El frontend sube **directo a Cloudinary** con un `HttpClient.post` + `FormData` (NO usamos `@cloudinary/ng` — la v2.x es para Angular 12 y arrastra peer-deps incompatibles con Angular 21). El backend solo verifica y persiste el `public_id`.

### Config pública

`core/config/cloudinary.config.ts` exporta `CLOUDINARY_CONFIG` con:
- `cloudName`: cloud público (también en backend `.env`).
- `uploadEndpoint`: URL del endpoint de upload.
- `presets`: 4 unsigned presets (`avatar`, `cover`, `portfolio`, `brief`).
- `folders`: 4 carpetas Cloudinary que matchean los presets.
- `upload.maxXxxBytes`: límites de tamaño client-side.
- `upload.acceptedFormats`: MIME types permitidos (avatar/cover: jpg/png/webp; portfolio/brief: +gif).

Estos valores son PÚBLICOS por diseño — aparecen en cada request de upload y en cada URL de imagen servida. La `api_secret` NUNCA está aquí; vive solo en `backend/.env`.

### Servicio `CloudinaryService`

`core/services/cloudinary.service.ts` expone `uploadImage(file, type, options?)`:
- Valida `file.size` y `file.type` ANTES de subir (defensa en profundidad — el preset de Cloudinary también valida).
- Construye `FormData` con `file`, `upload_preset`, y opcional `public_id` (para overwrite determinista en avatares).
- Retorna `Observable<CloudinaryUploadResult>` con `{ public_id, url, secure_url, width, height, format, bytes }`.

Para avatares, el `UserService.setAvatar()` recibe el resultado y lo postea a `POST /api/me/avatar`. El backend verifica el `public_id` con la Admin API.

### Componente `AvatarUploaderComponent`

`core/components/avatar-uploader/` (standalone, OnPush, signals):
- Inputs: `currentAvatarUrl`, `currentAvatarUrls`, `userName`, `maxBytes` (default 2MB).
- Output: `avatarUpdated: EventEmitter<User>`.
- Estado interno con signals: `status`, `dragOver`, `previewUrl`.
- Computed: `initials`, `displayUrl`, `isUploading`, `errorMessage`, `maxMb`.
- Drag-drop con `dragover`/`dragleave`/`drop` y `tabindex="0"` para activación con teclado.
- Status bar con `role="status"` + `aria-live="polite"`.
- Diseño: drop zone dashed con ícono cloud-arrow-up, preview circular 128×128 con gradiente fallback, spinner con `prefers-reduced-motion` respetado.
- i18n: namespace `uploader.*` y `avatar.*` (ES + EN).

**Reglas de signals:** un `WritableSignal<T>` es callable para LEER (sin args) y tiene `.set(value)` para ESCRIBIR. **NO** lo llames con argumentos (`this.status({...})` es un bug — se ignora el arg). Es un error fácil; revisa siempre que los writes usen `.set()`.

### Regla de oro en signals

```ts
// ❌ Mal — parece un setter pero es un read
this.status({ kind: 'success' });

// ✅ Bien
this.status.set({ kind: 'success' });
```

Si el test de tu componente dice `Expected: "success", Received: "idle"` justo después de un `flush`, lo más probable es que estés leyendo en vez de escribir.

- **Inputs requeridos en el constructor:** `input.required<T>()` no se puede leer en el constructor porque los inputs se setean DESPUÉS de la instanciación. Si necesitas inicializar estado a partir de un input, usa `ngOnInit` o `ngAfterViewInit`, o un `effect()` reactivo:

```ts
constructor() {
  effect(() => {
    // Se re-ejecuta cada vez que items() cambia.
    const list = this.items();
    if (this.currentIndex() >= list.length && list.length > 0) {
      this.currentIndex.set(0);
    }
  });
}

ngOnInit() {
  // Aquí ya puedes leer inputs.required con seguridad.
  this.currentIndex.set(Math.max(0, Math.min(this.startIndex(), this.items().length - 1)));
}
```

### `UserService` vs `AuthService`

- `UserService.setAvatar(payload)` / `removeAvatar()` — HTTP. Devuelven `Observable<User>` con `.data` ya desenvuelto.
- `AuthService.setCurrentUser(user)` — actualiza el signal `_currentUser` y persiste en `TokenStorageService`. Llamado desde el uploader tras éxito del backend.

### i18n

- `uploader.drop_zone`: "Arrastra una imagen aquí o haz clic para seleccionar".
- `uploader.upload_progress`: soporta `{{pct}}` interpolado desde el componente.
- `uploader.error_size` / `error_format` / `error_network` / `error_unknown`: cada uno tiene su clave para que el backend elija el mensaje del 403 (`err.error.message`) o el frontend use el genérico.

## Accesibilidad

- Todos los inputs tienen `<label>` asociado (no `placeholder` como label).
- Iconos decorativos con `aria-hidden="true"`.
- Estados focus visibles (ver `docs/design-system.md`).
- (Pendiente) Auditoría completa con `axe` o Lighthouse.

## Lo que NO usamos (a propósito)

- ❌ **NgModule** (todo standalone).
- ❌ **NgRx / Akita / state global** (signals + services bastan).
- ❌ **ngModel** (siempre Reactive Forms).
- ❌ **Sass / SCSS** (CSS plano por simplicidad).
- ❌ **Tailwind / Bootstrap / Material** (look & feel propio, ver design-system).
- ❌ **Webfonts** (system stack por ahora).
- ❌ **SSR** (SPA pura).
- ❌ **Zone.js** (Angular 21 puede prescindir; por ahora seguimos con zone default).
- ❌ **@angular/localize** (extracción de strings en build) — usamos un servicio propio `LanguageService` + diccionarios JSON cargados en runtime, con el pipe `| t`. Ver sección "Internacionalización (i18n)" abajo.

## Internacionalización (i18n) — Desde Fase "Home + i18n + Briefs"

Idiomas soportados: **es** (default) y **en**.

### Estructura

```
frontend/src/
├── assets/i18n/
│   ├── es.json     ← fuente de verdad para español
│   └── en.json     ← todas las claves deben existir también aquí
├── app/
│   ├── core/
│   │   ├── services/language.service.ts   ← signal de idioma activo + carga diccionarios
│   │   ├── components/language-selector/  ← dropdown en topbar
│   │   ├── pipes/translate.pipe.ts        ← {{ 'key' | t }}  o  {{ 'key' | t : { name: 'X' } }}
│   │   └── testing/language-service.mock.ts ← helper para tests
```

### Reglas

1. **Todo string visible al usuario** pasa por `{{ 'dot.case.key' | t }}`. Sin strings hard-coded en `.html` salvo el wordmark "FrameMatch" (que es la marca y no se traduce).
2. **Interpolación**: la pipe soporta `{{ '{{name}}' | t : { name: 'Lucia' } }}`. Para HTML inline (p. ej. `<strong>`) mejor partir la string en `..._before` / `..._highlight` / `..._after` keys (Angular no acepta `}` dentro de params de pipes).
3. **Nested keys**: usar `section.subsection.element` con puntos, sin prefijos de namespace redundantes.
4. **Persistencia**: la elección se guarda en `localStorage` con clave `framematch_lang`. Al arrancar, se lee y se aplica; si no hay, se mira `navigator.language`.
5. **HTML lang**: el servicio actualiza `document.documentElement.lang` al cambiar.
6. **Tests**: usar `provideLanguageServiceMock('es', { section: { key: 'value' } })` con un diccionario reducido. La pipe `| t` cae al key si no encuentra la traducción, lo que hace los tests resilientes.

### Añadir un nuevo idioma

1. Crear `src/assets/i18n/<code>.json` con la misma estructura que `es.json` (claves idénticas).
2. Añadir `{ code, label }` al array `LanguageService.supported`.
3. (Opcional) Añadir tests en `language.service.spec.ts`.

### NO traducir

- Mensajes de error del backend (el backend ya los devuelve en español, son contratos API).
- Comentarios en código.
- Claves de enums (Role, SkillCategory, SkillLevel): el frontend las traduce con `roles.{{value}} | t` y `skill_categories.{{value}} | t`.

## Próximas mejoras (no urgentes)

- Migrar a `provideZonelessChangeDetection()` cuando estabilice.
- CSS custom properties para los tokens del design system.
- Storybook para documentar componentes.
- Cypress / Playwright para E2E.
- Traducciones con `@angular/localize` cuando haga falta.
- Service worker / PWA si se quiere.

## OAuth frontend (Fase 5.3)

- **Flujo:** redirección de página completa. NUNCA uses `HttpClient` para el redirect — es un `window.location.href = '/api/auth/oauth/{provider}/redirect'`. El backend maneja todo el handshake, incluido el `state` CSRF en sesión.
- **`OAuthCallbackComponent`** (público, ruta `/auth/callback`): lee `token`, `expires_in`, `new_user` de query params. Llama a `auth.handleOAuthCallback(token, expiresIn)` que persiste el token y programa el refresh basándose en el `exp` del JWT (decode manual con `atob` del payload) o en `expiresIn` como fallback. Si `new_user=1` redirige a `/auth/complete-profile`; si no, llama a `auth.fetchCurrentUser()` y luego a `/home`. Maneja `?error=access_denied` mostrando `auth.oauth.error_provider_denied`.
- **`OAuthCompleteProfileComponent`** (`authGuard`, ruta `/auth/complete-profile`): reusa el role selector visual del `RegisterComponent` (mismo markup `.role-selector` + `.role--active`). `auth.completeOAuthProfile(role)` que delega en `POST /api/auth/oauth/complete-profile`. Tras éxito, redirige a `/home`. Si el user ya tiene rol (no es OAuth nuevo), redirige a `/home` directamente sin pedir rol.
- **`AuthService.loginWithOAuth(provider)`:** método sin retorno que setea `window.location.href`. Testear con `expect(() => service.loginWithOAuth('google')).not.toThrow()` (jsdom no permite mockear `window.location.href` fácilmente).
- **`AuthService.handleOAuthCallback(token, expiresIn)`:** persiste el token y programa refresh. NO debe hacer `me()` automáticamente — el caller (componente callback) decide si lo llama.
- **Botones sociales:** logo SVG inline oficial (Google 4 colores, Facebook blanco sobre `#1877F2`). NO usar librería de iconos externa. Estilo: full-width, padding `11px 16px`, border-radius `10px`, gap `10px` entre logo y label. Separado del form principal por un divider "o" (border-top + texto centrado).
- **i18n:** namespace `auth.oauth.*` con `or`, `continue_with_{google,facebook}`, `error_*`, `complete_profile_*`. Las claves del role selector (`role_client_title`, etc.) se reusan de `auth.register.*`.
- **Tests:** mockear `AuthService` con `loginWithOAuth: jest.fn()` no es necesario (es void y dispara side-effect). Mockear `handleOAuthCallback`, `completeOAuthProfile` y `fetchCurrentUser` con `jest.fn().mockReturnValue(of(...))`. Para `OAuthCallbackComponent` y `OAuthCompleteProfileComponent`, mockear el `Router` directamente con `useValue: { navigate: jest.fn().mockResolvedValue(true) }` (más simple que `provideRouter`).
- **Sesión en tests de OAuth callback:** `provideHttpClient` no es necesario en estos tests porque no se hace HTTP. Solo se necesita el mock del `AuthService` y del `Router`.

## Topbar (Fase 5.4)

- **SIEMPRE** usar `<app-core-topbar [variant]="…">`. NUNCA inline un `<header class="topbar">` en un feature.
- **4 variants** (signal input `variant`, required):
  - `'public'` — sticky + backdrop. Brand + lang + NO user. Sin nav.
  - `'auth'` — NO sticky. Brand + lang + NO user. Sin nav. (Para login, register, oauth-complete-profile, brief-form.)
  - `'client'` — sticky. Brand + nav [Inicio, Profesionales, Briefs] + lang + user (name + role-pill) + logout.
  - `'freelancer'` — sticky. Brand + nav [Inicio, Mi perfil] + lang + user (name + avatar con iniciales) + logout.
- **Back-link opcional** (input `backLink: { labelKey, route }`). Si está presente, renderiza un botón con border a la izquierda del lang. **NO usar `Location.back()` ni hardcoded** — siempre `RouterLink` a una ruta explícita.
- **`extraLinks` opcional** (input `readonly NavLink[]`) para sobreescribir los defaults del variant. Usar solo si necesitas links custom (ej. anchors in-page).
- **Outputs**:
  - `logoutClick` (EventEmitter) — el parent inyecta `AuthService.logout()` y navega a `/`.
  - `backClick` (EventEmitter) — el parent decide qué hacer (típicamente `Router.navigate(backLink.route)`). Solo se emite cuando `backLink` está presente; el topbar ya hace la navegación si le pasas `backLink` directamente (el parent puede o no suscribirse).
- **Excepciones documentadas** (siguen con su topbar propio):
  - `LandingComponent` — tiene anchors in-page (`#how`, `#categories`) que no encajan en `RouterLink`.
  - `BriefListComponent` — tiene scope tabs (`Todos`/`Mis briefs`) y CTA `+ Nuevo brief` condicionales por rol, lógica muy específica.
- **Bug del `OAuthCompleteProfileComponent` antes de Fase 5.4**: brand-logo raw (`<span class="brand-text">FrameMatch</span>`), lang-slot vacío, aria-label hardcoded `'FrameMatch, ir al inicio'`, error message hardcoded. Todos arreglados al usar el `CoreTopbarComponent`.
- **Tests:**
  - Spec dedicado en `core/components/topbar/topbar.component.spec.ts` con un `TestHostComponent` que envuelve el topbar. Mockear `AuthService` con `{ currentUser: signal<User | null>(...) }` (forma signal, no función) para que los computeds del topbar (`user`, `navLinks`, `brandHref`, `initials`, `rolePillKey`) reaccionen.
  - ActivatedRoute es necesario como provider (lo usa `RouterLink` internamente): `{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }`.
  - Los specs de features no deben asertar sobre la estructura del topbar — solo sobre el contenido (textContent). Si necesitas verificar un back-link, busca su label en textContent.
