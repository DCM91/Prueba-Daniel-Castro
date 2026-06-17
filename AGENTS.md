# AGENTS.md · FrameMatch (raíz)

Convenciones generales del monorepo. Para detalles específicos, consulta:

- **Backend (Laravel 13):** skill `backend-conventions` (`.agents/skills/backend-conventions/SKILL.md`)
- **Frontend (Angular 21):** skill `frontend-conventions` (`.agents/skills/frontend-conventions/SKILL.md`)
- **Arquitectura del sistema:** [docs/architecture.md](./docs/architecture.md)
- **Sistema de diseño visual:** [docs/design-system.md](./docs/design-system.md)
- **Referencia de la API:** [docs/api.md](./docs/api.md)
- **Esquema de base de datos:** [docs/database.md](./docs/database.md)
- **Roadmap y fases:** [docs/roadmap.md](./docs/roadmap.md)

---

## Skills disponibles en la raíz

Todas viven en `.agents/skills/<nombre>/SKILL.md` y son **auto-descubiertas** por opencode (no requieren registro manual). Se invocan con la tool `skill` cuando la descripción coincide con la tarea.

| Skill | Cuándo invocarla |
|---|---|
| `backend-conventions` | Cualquier trabajo en `backend/` (Laravel, PHP, Eloquent, migraciones, FormRequest, Resource, JWT, PHPUnit). |
| `frontend-conventions` | Cualquier trabajo en `frontend/` (Angular 21, signals, reactive forms, HttpClient, interceptors, guards, Jest). |
| `accessibility` | Auditorías WCAG 2.2, etiquetas, contraste, foco, navegación por teclado, ARIA, `aria-live`. |
| `frontend-design` | Crear interfaces con dirección estética intencional (tipografía, color, motion, composición) sin caer en "AI slop". |
| `seo` | Meta tags, sitemap, JSON-LD, headings, URLs canónicas, hreflang, mobile SEO, Lighthouse SEO. |

**Regla de oro:** para una tarea de backend **invoca siempre** `backend-conventions`; para frontend, `frontend-conventions`. Las skills transversales (`accessibility`, `frontend-design`, `seo`) son **opt-in** según la tarea (p.ej. al crear un nuevo componente público, carga `frontend-design` y `accessibility`).

> Migración: las antiguas guías específicas en `backend/AGENTS.md` y `frontend/AGENTS.md` se fusionaron en sus skills homónimas en esta consolidación. El comportamiento difiere: las AGENTS.md se cargaban siempre, las skills se cargan **bajo demanda** por coincidencia de descripción.

> **Política de skills:** las únicas skills que se cargan en este proyecto son las
> cinco listadas en la tabla anterior. Cualquier skill adicional propuesta debe
> evaluarse caso por caso y aprobarse explícitamente antes de añadirla. Se
> desaconseja sincronizar desde registros externos (`autoskills-registry`)
> porque pueden introducir recomendaciones incompatibles con las convenciones
> del proyecto (p. ej. Sanctum, Pest, Livewire, PHPStan, DTOs readonly). Esto
> ya ocurrió con `laravel-specialist`, `laravel-patterns` y `php-pro` que se
> encontraban en `backend/.agents/skills/` y fueron eliminadas por conflicto
> con el stack real (JWT + PHPUnit + API pura sin framework frontend PHP).

---

## TL;DR

- **Stack:** Laravel 13 (PHP 8.5) + JWT + Angular 21 + MySQL 8 (XAMPP).
- **Nombre:** FrameMatch. APP_NAME en backend, prefijo `framematch_` en localStorage del frontend.
- **Monorepo simple:** `backend/` y `frontend/` independientes, comparten solo convenciones y la base de datos. No hay workspaces de npm ni de composer.
- **Arranque típico:** backend en `127.0.0.1:8000`, frontend en `localhost:4200`, MySQL en `127.0.0.1:3306`. El frontend hace proxy de `/api/*` al backend (ver `frontend/proxy.conf.json`).

## Estructura del monorepo

```
/
├── AGENTS.md                  ← este archivo (convenciones generales)
├── opencode.jsonc             ← config de opencode del proyecto
├── skills-lock.json           ← manifest de skills (auto-gestionado)
├── README.md                  ← pitch, quickstart, endpoints, testing
├── docs/                      ← arquitectura, API, BD, design system, roadmap
├── .agents/
│   └── skills/                ← skills on-demand (backend, frontend, a11y, design, seo)
├── backend/                   ← Laravel 13 + JWT (convenciones en skill backend-conventions)
└── frontend/                  ← Angular 21 standalone (convenciones en skill frontend-conventions)
```

Más detalles sobre la arquitectura, decisiones técnicas y diagrama de BD en `docs/`.

## Convenciones compartidas

- **Naming:** inglés para código (clases, variables, archivos de código). Español para copy visible al usuario (textos de UI, mensajes de error, copy de marketing).
- **Roles:** un único `enum` con cinco valores (`client`, `freelancer`, `agency`, `company`, `admin`). Solo los dos primeros son auto-registrables; el resto los asigna un admin en el futuro.
- **Fechas:** ISO 8601 en APIs y en payloads. Internamente Laravel las maneja como Carbon.
- **Formato de error JSON:** todas las rutas `api/*` devuelven `{ "message": "...", "errors"?: { field: ["msg", ...] } }`. Nunca HTML.
- **Auth:** JWT (HS256, `php-open-source-saver/jwt-auth` en backend, `HttpInterceptor` funcional en frontend). TTL 60 min, refresh 14 días.
- **Tests:** PHPUnit en backend (sqlite `:memory:` en CI), Jest en frontend (jsdom). Antes de mergear, los dos suites deben estar en verde.

## Setup local desde cero

```bash
# 1) Extensiones PHP (en C:\php\php.ini, descomenta):
#    extension=mbstring, pdo_mysql, fileinfo, sodium, zip, openssl

# 2) Backend
cd backend
php composer.phar install   # o `composer install` si lo tienes global
php artisan jwt:secret
php artisan migrate:fresh --seed
php artisan serve

# 3) Frontend (otra terminal)
cd frontend
npm install
npm start
```

Si XAMPP MySQL no está corriendo o la BD `prueba_tecnica_daniel_castro` no existe, los tests de PHPUnit siguen funcionando porque usan `sqlite :memory:`, pero el flujo end-to-end contra la API real necesita la BD levantada.

## Cómo añadir una nueva feature

1. **Si toca BD:** crear migración en `backend/database/migrations/` siguiendo el orden timestamp. Si es una tabla nueva, añadir también al README y a `docs/database.md`.
2. **Si toca API:** controller en `app/Http/Controllers/Api/`, FormRequest para validar, Resource para serializar. Rutas en `routes/api.php`. Documentar en `docs/api.md`.
3. **Si toca UI:** componente standalone en `frontend/src/app/features/<feature>/`, tipos en `core/types/`, servicio si hay estado compartido en `core/services/`. Estilos siguiendo `docs/design-system.md`.
4. **Tests:** añadir Feature test en backend (cubre happy path + 422/401/403), spec en frontend para componentes con lógica (signals, computed, formularios, guards). Mockear HTTP con `HttpTestingController`.
5. **Documentar:** actualizar la skill correspondiente en `.agents/skills/<nombre>/SKILL.md` si introduces una convención nueva.

## Comprobaciones antes de hacer commit

- `cd backend && php artisan test` → verde.
- `cd frontend && npm test` → verde.
- `cd frontend && npm run build` → verde (sin warnings nuevos).

## Estrategia de ramas

| Rama | Entorno | Descripción |
|---|---|---|
| `main` | Producción | Código estable, probado y desplegado. Railway + Vercel escuchan push a `main`. **Solo se escribe vía PR desde `beta`.** |
| `beta` | Desarrollo | Rama activa de trabajo. Features nuevas, fixes y experimentos. Se mergea a `main` cuando está lista para release. |

**Flujo:**

```
beta (desarrollo activo)
  │
  ├─ feature, fix, refactor...
  │  ├─ php artisan test  → verde
  │  ├─ npm test          → verde
  │  └─ commit
  │
  ├─ Listo para release:
  │   1. PR: beta → main
  │   2. Revisión + CI en verde
  │   3. Merge
  │   4. Railway + Vercel despliegan automáticamente desde main
  │
  ▼
main (producción, intocable directamente)
```

> Los deploys de Railway y Vercel están configurados para dispararse con push a `main`. La rama `beta` no dispara deploys de producción. Para previews de `beta`, se puede configurar Vercel Preview Deployments en el dashboard.

## Glosario del dominio

| Término | Significado |
|---|---|
| **Cliente** | Usuario que contrata freelancers. Tiene `role='client'`. |
| **Freelancer** | Usuario que ofrece servicios de foto/vídeo. Tiene `role='freelancer'` + fila en `freelancer_profiles`. |
| **Skill** | Capacidad específica del freelancer (foto de producto, edición, etc.). Catálogo en `skills`. |
| **Perfil de freelancer** | Datos específicos (bio, tarifas, ciudad) en `freelancer_profiles`. Vinculado 1:1 al `User`. |
| **Brief** | (futuro) Proyecto que un cliente publica para recibir propuestas de freelancers. |
| **Encargo** | (futuro) Aceptación de un brief por un freelancer; da lugar a la entrega. |
