# Referencia de la API

> Última revisión: Fase 5.7 (limpieza + branching + CI). Base URL en dev: `http://127.0.0.1:8000` (backend Laravel). El frontend hace proxy de `/api/*` desde `localhost:4200` (ver `frontend/proxy.conf.json`). En producción, Vercel hace rewrite de `/api/*` a Railway (ver `frontend/vercel.json`).

## Convenciones

- **Content-Type** de salida: `application/json; charset=utf-8` siempre.
- **Fechas:** ISO 8601 (`2026-06-11T09:00:00+00:00`).
- **Enveloping:** **todas las respuestas de éxito** van envueltas en `{ "data": ... }` (convención de Laravel API Resources, aplicada en `respondWithToken` y en cada Resource). El frontend desempaqueta con `map(r => r.data)` dentro de `AuthService` antes de exponer el `AuthPayload` plano al resto de la app. Si añades un endpoint nuevo, manten el wrapper para no romper este contrato.
- **Errores:** formato `{ "message": "Resumen del error", "errors"?: { "campo": ["msg1", "msg2"] } }`. **NO** se envuelven en `data` (van planos en la raíz). Nunca HTML.
- **JWT:** header `Authorization: Bearer <token>` en endpoints protegidos. TTL 60 min, refresh 14 días.
- **CORS:** abierto (`*`) en dev. En prod se limitará al dominio del frontend.

> ⚠️ **Bug histórico:** durante la Fase 2.5, el frontend esperaba la forma plana (`response.access_token`) en vez de la envuelta (`response.data.access_token`). El login parecía exitoso pero los signals quedaban `undefined` y el `authGuard` te devolvía a `/login`. Lección: cualquier endpoint nuevo debe documentar aquí su shape exacto, y el servicio frontend debe usar `map(r => r.data)` consistentemente.

## Endpoints

### `GET /api/health`

Health check. **Público.**

**Response 200**
```json
{
  "status": "ok",
  "service": "FrameMatch",
  "timestamp": "2026-06-11T09:00:00+00:00"
}
```

---

### `POST /api/auth/register`

Crea un usuario y devuelve token. **Público.**

**Request body**
```json
{
  "name": "Luis Foto",
  "email": "luis@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "freelancer"
}
```

**Validaciones**
- `name`: required, string, 2-100 chars.
- `email`: required, email, único en `users.email`.
- `password`: required, string, mínimo 8 chars, debe tener confirmación.
- `role`: required, string, `in:client,freelancer` (los demás roles los asigna admin).

**Response 201**
```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Luis Foto",
      "email": "luis@example.com",
      "role": "freelancer",
      "created_at": "2026-06-11T09:00:00+00:00",
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
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

> Si `role=client`, el campo `freelancer_profile` **no aparece** y la fila en `freelancer_profiles` no se crea.

**Errores**
- `422 Unprocessable Entity` — validaciones fallidas (con detalle por campo).
- `500 Internal Server Error` — error inesperado.

---

### `POST /api/auth/login`

Autentica y devuelve token. **Público.**

**Request body**
```json
{
  "email": "luis@example.com",
  "password": "password123"
}
```

**Response 200**
```json
{
  "data": {
    "user": { "id": 1, "name": "Luis Foto", "email": "...", "role": "freelancer", "created_at": "..." },
    "access_token": "eyJ0eXAi...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

**Errores**
- `401 Unauthorized` — credenciales inválidas. Body: `{ "message": "Credenciales inválidas." }`.

---

### `GET /api/auth/me`

Devuelve el usuario autenticado. **Requiere JWT.**

**Response 200**
```json
{
  "data": {
    "id": 1,
    "name": "Luis Foto",
    "email": "luis@example.com",
    "role": "freelancer",
    "created_at": "2026-06-11T09:00:00+00:00",
    "avatar_url": "https://res.cloudinary.com/demo/image/upload/.../avatar.jpg",
    "avatar_urls": {
      "xs":  "https://res.cloudinary.com/demo/image/upload/w_40,.../avatar.jpg",
      "sm":  "https://res.cloudinary.com/demo/image/upload/w_80,.../avatar.jpg",
      "md":  "https://res.cloudinary.com/demo/image/upload/w_200,.../avatar.jpg",
      "lg":  "https://res.cloudinary.com/demo/image/upload/w_400,.../avatar.jpg",
      "xxl": "https://res.cloudinary.com/demo/image/upload/w_800,.../avatar.jpg"
    },
    "freelancer_profile": {
      "id": 1,
      "display_name": "Luis Foto Pro",
      "bio": "Fotógrafo de producto",
      "city": "Madrid",
      "hourly_rate": "55.00",
      "price_per_project": "350.00",
      "is_available": true,
      "skills": [
        { "id": 1, "name": "Fotografía de producto", "slug": "fotografia-de-producto", "category": "photo" }
      ]
    }
  }
}
```

> `avatar_url` es la URL original subida. `avatar_urls` son las URLs transformadas (cuadradas, con `g_auto` para foco en la cara, `r_max` para círculo, `q_auto,f_auto` para servir WebP/AVIF). Todos los campos son `null` cuando el usuario no tiene avatar.

**Errores**
- `401 Unauthorized` — sin token, token inválido o expirado.

---

### `POST /api/auth/logout`

Invalida el token actual (lo añade a la blacklist). **Requiere JWT.**

**Response 200**
```json
{ "message": "Sesión cerrada correctamente." }
```

**Errores**
- `401 Unauthorized` — sin token o token inválido.
- `500 Internal Server Error` — no se pudo escribir en la blacklist.

---

### `POST /api/auth/refresh`

Renueva el token. **Requiere JWT.** El token viejo se invalida; se devuelve uno nuevo con TTL renovado.

**Response 200**
```json
{
  "data": {
    "user": { ... },
    "access_token": "eyJ0eXAi...(nuevo)...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

**Errores**
- `401 Unauthorized` — token expirado o revocado.

---

### `GET /api/skills`

Devuelve el catálogo de skills activas (20 en seed). **Público.** Usado por el editor de perfil del profesional para pintar el selector de chips.

**Response 200**
```json
{
  "data": [
    { "id": 1,  "name": "Fotografía de producto",         "slug": "fotografia-de-producto",         "category": "photo" },
    { "id": 9,  "name": "Video corporativo",               "slug": "video-corporativo",               "category": "video" },
    { "id": 17, "name": "Edición de video",                "slug": "edicion-de-video",                "category": "edit" },
    { "id": 25, "name": "Copywriting",                     "slug": "copywriting",                     "category": "content" }
  ]
}
```

> `category` ∈ `photo` | `video` | `edit` | `content`. Ordenado alfabéticamente por `name`. Total: **30 skills seedeadas**.

---

### `GET /api/freelancer/me`

Devuelve el perfil completo del profesional autenticado (datos + skills con su `level` y `years_experience`). **Requiere JWT.** El usuario debe tener `role=freelancer`; cualquier otro rol recibe `403`.

**Response 200**
```json
{
  "data": {
    "id": 1,
    "user_id": 7,
    "display_name": "Luis Foto Pro",
    "bio": "Fotógrafo especializado en producto.",
    "city": "Madrid",
    "hourly_rate": 60,
    "price_per_project": 450,
    "is_available": true,
    "cover_url": "https://res.cloudinary.com/demo/image/upload/.../cover.jpg",
    "cover_urls": {
      "sm":  "https://res.cloudinary.com/demo/image/upload/w_800,.../cover.jpg",
      "md":  "https://res.cloudinary.com/demo/image/upload/w_1200,.../cover.jpg",
      "lg":  "https://res.cloudinary.com/demo/image/upload/w_1600,.../cover.jpg",
      "xxl": "https://res.cloudinary.com/demo/image/upload/w_2000,.../cover.jpg"
    },
    "portfolios": [
      {
        "id": 1,
        "public_id": "framematch/portfolios/1-abc",
        "url": "https://res.cloudinary.com/demo/image/upload/.../p1.jpg",
        "urls": {
          "thumb": "https://res.cloudinary.com/demo/image/upload/w_200,h_150,c_fill,q_auto,f_auto/.../p1.jpg",
          "card":  "https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill,q_auto,f_auto/.../p1.jpg",
          "full":  "https://res.cloudinary.com/demo/image/upload/w_1200,c_limit,q_auto,f_auto/.../p1.jpg"
        },
        "width": 1600, "height": 1067, "format": "jpg", "bytes": 234567,
        "title": "Campaña de Navidad 2025",
        "description": "Sesión de producto para e-commerce.",
        "position": 0,
        "created_at": "2026-06-12T10:00:00+00:00"
      }
    ],
    "skills": [
      { "id": 1, "name": "Fotografía de producto", "slug": "fotografia-de-producto", "category": "photo", "level": "senior", "years_experience": 5 }
    ]
  }
}
```

**Errores**
- `401 Unauthorized` — sin token o token inválido.
- `403 Forbidden` — usuario autenticado con `role != freelancer`. Body: `{ "message": "Solo los profesionales pueden gestionar su perfil." }`.

---

### `PUT /api/freelancer/me`

Actualiza los datos básicos del perfil (NO skills). **Requiere JWT freelancer.**

**Request body** (todos los campos opcionales; se aplica `PATCH`-semantics parcial)
```json
{
  "display_name": "Luis Foto Pro",
  "bio": "Fotógrafo especializado en producto.",
  "city": "Madrid",
  "hourly_rate": 60,
  "price_per_project": 450,
  "is_available": true
}
```

**Validaciones**
- `display_name`: nullable, string, máx 100.
- `bio`: nullable, string, máx 1000.
- `city`: nullable, string, máx 80.
- `hourly_rate`: nullable, numeric, min 0.
- `price_per_project`: nullable, numeric, min 0.
- `is_available`: boolean.

> El backend convierte strings vacíos a `null` en `display_name`, `bio` y `city` para que la UI pueda limpiar campos enviando `""` sin provocar error 422.

**Response 200** — mismo shape que `GET /api/freelancer/me`.

**Errores**
- `401` / `403` — como arriba.
- `422` — validaciones fallidas (con detalle por campo, en español).

---

### `PUT /api/freelancer/me/skills`

Reemplaza **todas** las skills del freelancer con el array enviado (semántica `sync`, no `attach`). **Requiere JWT freelancer.**

**Request body**
```json
{
  "skills": [
    { "skill_id": 1, "level": "senior", "years_experience": 5 },
    { "skill_id": 9, "level": "mid",    "years_experience": 2 }
  ]
}
```

**Validaciones**
- `skills`: required, array, máx 20 entradas (vacío permitido para limpiar).
- `skills.*.skill_id`: required, integer, debe existir en `skills.id`.
- `skills.*.level`: required, string, ∈ `junior` | `mid` | `senior`.
- `skills.*.years_experience`: required, integer, 0-50.

**Response 200** — mismo shape que `GET /api/freelancer/me` con la lista de skills actualizada.

**Errores**
- `401` / `403` — como arriba.
- `422` — validaciones fallidas. Los errores anidados se exponen en `errors` con la notación punto: `{"errors": {"skills.0.skill_id": ["La skill seleccionada no existe."]}}`.

---

### `GET /api/freelancers`

Catálogo público de profesionales. Solo lista los que tienen `is_available=true`. **Público.** Paginado a 12 por página.

**Query params** (todos opcionales y combinables)
- `q`: string ≤ 100. Busca `ILIKE` en `display_name`, `city` y `name` de las skills.
- `category`: `photo` | `video` | `edit` | `content`. Filtra via JOIN a `freelancer_skill` → `skills`.
- `city`: string ≤ 80. Match exacto.
- `max_rate`: numérico ≥ 0. `hourly_rate <= max_rate`.
- `page`: entero ≥ 1. Página a devolver.

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 7,
      "display_name": "Lucia Marin Foto",
      "city": "Madrid",
      "hourly_rate": 55,
      "is_available": true,
      "top_skills": [
        { "id": 1, "name": "Fotografía de producto", "slug": "fotografia-de-producto", "category": "photo", "level": "senior" }
      ],
      "skills_count": 2,
      "profile_completion": 80
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 12,
    "total": 1
  }
}
```

> `top_skills` trae las 3 primeras del freelancer (en orden de creación del pivot). `profile_completion` es un porcentaje 0-100 calculado en backend (display_name 20, bio 25, city 15, hourly_rate 20, price_per_project 10, al menos 1 skill 10). Orden por `hourly_rate ASC, display_name ASC`.

**Ejemplo**
```bash
curl 'http://127.0.0.1:8000/api/freelancers?category=video&city=Madrid&max_rate=80'
```

**Errores**
- `422 Unprocessable Entity` — query params inválidos (p.ej. `category=foo`).

---

### `GET /api/freelancers/{id}`

Detalle público de un profesional. Devuelve 404 si el `id` no existe **o** si el freelancer tiene `is_available=false`. **Público.**

> Decisión: **no** se expone el `email` ni el `password` del usuario asociado. El contacto se hará en una fase futura vía mensajería interna.

**Response 200**
```json
{
  "data": {
    "id": 1,
    "user_id": 7,
    "display_name": "Lucia Marin Foto",
    "bio": "Fotógrafa de producto con 8 años de experiencia...",
    "city": "Madrid",
    "hourly_rate": 55,
    "price_per_project": 420,
    "is_available": true,
    "created_at": "2026-06-11T09:00:00+00:00",
    "skills": [
      {
        "id": 1,
        "name": "Fotografía de producto",
        "slug": "fotografia-de-producto",
        "category": "photo",
        "level": "senior",
        "years_experience": 5
      }
    ]
  }
}
```

**Errores**
- `404 Not Found` — id inexistente o profesional no disponible. Body: `{ "message": "Profesional no encontrado." }`.

---

### `GET /api/briefs`

Catálogo público de briefs publicados. **Público.** Paginado a 12 por página.

**Query params** (todos opcionales)
- `scope`: `all` (default, briefs publicados) o `mine` (los del cliente autenticado).
- `page`: entero ≥ 1.

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "client_id": 7,
      "title": "Vídeo corporativo para startup",
      "description": "Buscamos profesional para grabar un vídeo institucional de 60s...",
      "category": "video",
      "city": "Madrid",
      "budget_min": 800,
      "budget_max": 1500,
      "deadline": "2026-07-01",
      "status": "published",
      "published_at": "2026-06-12T10:00:00+00:00",
      "created_at": "2026-06-12T10:00:00+00:00",
      "proposals_count": 3,
      "client": { "id": 7, "name": "Ana Cliente" }
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 12, "total": 1 }
}
```

---

### `GET /api/briefs/{id}`

Detalle de un brief. **Público.**

**Response 200** — mismo shape que el item del listado, con `proposals_count`.

**Errores**
- `404 Not Found` — `{ "message": "Brief no encontrado." }`

---

### `POST /api/briefs`

Publica un nuevo brief. **Requiere JWT con `role=client`.**

**Request body**
```json
{
  "title": "Vídeo corporativo para startup",
  "description": "Buscamos profesional para grabar un vídeo institucional de 60s con tomas en oficina y entrevistas a fundadores.",
  "category": "video",
  "city": "Madrid",
  "budget_min": 800,
  "budget_max": 1500,
  "deadline": "2026-07-01"
}
```

**Validaciones**
- `title`: 5-120 chars.
- `description`: 20-4000 chars.
- `category`: `photo` | `video` | `edit` | `content`.
- `city`: opcional, ≤80.
- `budget_min`/`budget_max`: opcionales, numéricos ≥0.
- `deadline`: opcional, fecha futura.

**Response 201** — brief creado, `status=published`.

**Errores**
- `401` — sin token.
- `403` — usuario con rol distinto a `client`.
- `422` — validaciones fallidas.

---

### `PUT /api/briefs/{id}` / `DELETE /api/briefs/{id}`

Edición y borrado del brief. **Requiere JWT y que el usuario sea el `client_id` del brief.**

- `PUT` acepta un subset del body de `POST`. Todos los campos son `sometimes`.
- `DELETE` borra en cascada las propuestas asociadas.

---

### `GET /api/briefs/{briefId}/proposals`

Lista de propuestas recibidas en un brief. **Requiere JWT y que el usuario sea el `client_id` del brief.**

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "brief_id": 5,
      "freelancer_id": 3,
      "message": "Tengo 8 años de experiencia en vídeo corporativo y puedo entregar en 10 días.",
      "price": 1200,
      "status": "pending",
      "created_at": "2026-06-12T11:00:00+00:00",
      "freelancer": {
        "id": 3,
        "user_id": 12,
        "display_name": "Lucia Marin Foto",
        "city": "Madrid",
        "hourly_rate": 55
      }
    }
  ]
}
```

**Errores**
- `403` — el usuario no es el autor del brief.
- `404` — brief no encontrado.

---

### `POST /api/briefs/{briefId}/proposals`

Envía una propuesta a un brief. **Requiere JWT con `role=freelancer`.**

**Request body**
```json
{
  "message": "Tengo 8 años de experiencia en vídeo corporativo y puedo entregar en 10 días.",
  "price": 1200
}
```

**Validaciones**
- `message`: 20-2000 chars.
- `price`: numérico ≥0.

**Reglas de negocio**
- El brief debe estar en `status=published`.
- Un freelancer no puede enviar dos propuestas al mismo brief.

**Response 201** — propuesta creada con `status=pending`.

**Errores**
- `403` — usuario no es `freelancer`.
- `404` — brief no encontrado.
- `422` — brief cerrado / propuesta duplicada / validaciones.

---

## Avatar del usuario (Cloudinary) — Fase 5.5.A

Gestiona la foto de perfil subida a Cloudinary. El browser sube el archivo directamente a Cloudinary con un **unsigned upload preset** y luego envía el `public_id` devuelto al backend, que lo verifica contra la Admin API antes de persistirlo.

### `POST /api/me/avatar`

Registra el avatar subido. **Requiere JWT.** Throttle: 30 req/min.

> El frontend sube la imagen a `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` con `upload_preset=fm_av_upl` y recibe `{ public_id, secure_url, width, height, format, bytes }`. Después llama a este endpoint con ese mismo `public_id` y `url`.

**Request body**
```json
{
  "public_id": "framematch/avatars/42-abc123",
  "url": "https://res.cloudinary.com/dftvmkc1c/image/upload/v123/abc.jpg",
  "width": 800,
  "height": 800,
  "format": "jpg",
  "bytes": 12345
}
```

**Validaciones**
- `public_id`: required, regex `^[A-Za-z0-9_\-\/]+$`, max 191.
- `url`: required, url, max 500.
- `width` / `height`: optional, integer 1-10000.
- `format`: optional, in: `jpg, jpeg, png, webp, gif, avif`.
- `bytes`: optional, integer 0-10485760 (10 MB).

> **Limite uniforme de subida:** desde el ajuste de limites 10 MB, el frontend acepta archivos de hasta **10 MB para avatar, cover y portfolio** (antes 2/5/8 MB respectivamente). El backend rechazara cualquier `bytes` superior a 10 MB con 422. Cloudinary free tier capa tambien en 10 MB por archivo.

**Validaciones de seguridad server-side** (no vienen del cliente, las aplica `CloudinaryService::verifyResource()`):
- El `public_id` debe existir en Cloudinary (vía Admin API).
- El recurso debe estar en la carpeta esperada (`framematch/avatars`).
- El `resource_type` debe ser `image`.

**Response 200** — mismo shape que `GET /api/auth/me` (con `avatar_url` y `avatar_urls` actualizados).

**Errores**
- `401 Unauthorized` — sin token.
- `422 Unprocessable Entity` — validaciones fallidas (con detalle por campo).
- `403 Forbidden` — el `public_id` no existe en Cloudinary, está en otra carpeta, o no es una imagen. Body: `{ "message": "..." }`.

> **Idempotencia:** si el usuario ya tenía avatar y sube uno nuevo, el backend borra el archivo anterior de Cloudinary antes de guardar el nuevo.

---

### `DELETE /api/me/avatar`

Elimina el avatar actual. **Requiere JWT.** Throttle: 30 req/min.

**Response 200** — `User` con `avatar_url` y `avatar_urls` a `null`.

**Errores**
- `401 Unauthorized` — sin token.

> El archivo en Cloudinary se borra best-effort. Si el borrado falla (red, credenciales), el usuario ya queda sin avatar en BD; se loguea el warning en `storage/logs/laravel.log`.

---

## Cover y Portfolio del freelancer (Cloudinary) — Fase 5.5.B

Gestiona la imagen de portada y la galería de trabajos del freelancer. Misma estrategia de upload que avatares: browser sube a Cloudinary con un unsigned preset, backend verifica con Admin API y persiste.

### `PUT /api/freelancer/me/cover`

Registra la portada del freelancer autenticado. **Requiere JWT + rol freelancer.** Throttle: 30 req/min.

> El frontend sube a `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` con `upload_preset=fm_cv_upl` y la carpeta `framematch/covers`.

**Request body**: mismo shape que `POST /api/me/avatar` pero con `public_id` en `framematch/covers/...`.

**Response 200** — `FreelancerProfile` con `cover_url`, `cover_urls` y la lista de `portfolios` (si `relationLoaded`).

**Errores**: 401 / 403 (no eres freelancer) / 422 / 403 (carpeta incorrecta o recurso inexistente).

### `DELETE /api/freelancer/me/cover`

Elimina la portada. **Requiere JWT + rol freelancer.** Throttle: 30 req/min.

**Response 200** — `FreelancerProfile` con `cover_url` y `cover_urls` a `null`.

---

### `GET /api/freelancer/me/portfolios`

Lista los portfolios del freelancer autenticado, ordenados por `position ASC, id DESC`. **Requiere JWT + rol freelancer.**

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "public_id": "framematch/portfolios/1",
      "url": "https://res.cloudinary.com/demo/.../p1.jpg",
      "urls": { "thumb": "...", "card": "...", "full": "..." },
      "width": 1600, "height": 1067, "format": "jpg", "bytes": 234567,
      "title": "Campaña de Navidad",
      "description": "Sesión de producto",
      "position": 0,
      "created_at": "2026-06-12T10:00:00+00:00"
    }
  ]
}
```

### `POST /api/freelancer/me/portfolios`

Añade un nuevo portfolio. **Requiere JWT + rol freelancer.** Throttle: 60 req/min.

> El frontend sube con `upload_preset=fm_pf_upl` y la carpeta `framematch/portfolios/{freelancer_profile_id}/`.

**Request body**
```json
{
  "public_id": "framematch/portfolios/1-abc",
  "url": "https://res.cloudinary.com/demo/.../p1.jpg",
  "width": 1600,
  "height": 1067,
  "format": "jpg",
  "bytes": 234567,
  "title": "Campaña de Navidad",
  "description": "Sesión de producto para e-commerce."
}
```

**Validaciones** (campos opcionales marcados con `nullable`):
- `title`: nullable, string, max 120.
- `description`: nullable, string, max 500.
- Resto igual que avatar/cover.

**Response 201** — `PortfolioItem` con `position` auto-asignado (`max(position) + 1`).

**Errores**: 401 / 403 (no eres freelancer) / 422 / 403 (carpeta incorrecta).

### `PATCH /api/freelancer/me/portfolios/{id}`

Edita título, descripción o posición de un portfolio del freelancer. **Requiere JWT + rol freelancer.**

**Request body** (todos opcionales):
```json
{ "title": "Nuevo título", "description": "Nueva descripción", "position": 3 }
```

**Response 200** — `PortfolioItem` actualizado.

**Errores**: 401 / 403 (no eres freelancer) / 404 (id no existe o no es tuyo).

### `DELETE /api/freelancer/me/portfolios/{id}`

Elimina un portfolio y borra el archivo de Cloudinary. **Requiere JWT + rol freelancer.**

**Response 200** — `{ "message": "Elemento eliminado." }`

**Errores**: 401 / 403 / 404.

### `POST /api/freelancer/me/portfolios/reorder`

Reasigna posiciones en bulk. **Requiere JWT + rol freelancer.**

**Request body**
```json
{ "ids": [3, 1, 2] }
```

> El backend asigna `position = índice` para cada id. Si algún id no pertenece al freelancer, se ignora silenciosamente.

**Response 200** — `PortfolioItem[]` reordenados por posición.

**Errores**: 401 / 403 / 422 (ids no es array, > 100, o algún id no es integer ≥ 1).

### `GET /api/freelancers/{id}/portfolios`

Lista pública de portfolios de un freelancer. **Público.** El freelancer debe tener `is_available=true` (mismo filtro que el resto del catálogo).

**Response 200** — mismo shape que `GET /api/freelancer/me/portfolios`.

**Errores**: 404 (freelancer no existe o no disponible).

---

Gestiona la foto de perfil subida a Cloudinary. El browser sube el archivo directamente a Cloudinary con un **unsigned upload preset** y luego envía el `public_id` devuelto al backend, que lo verifica contra la Admin API antes de persistirlo.

### `POST /api/me/avatar`

Registra el avatar subido. **Requiere JWT.** Throttle: 30 req/min.

> El frontend sube la imagen a `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` con `upload_preset=fm_av_upl` y recibe `{ public_id, secure_url, width, height, format, bytes }`. Después llama a este endpoint con ese mismo `public_id` y `url`.

**Request body**
```json
{
  "public_id": "framematch/avatars/42-abc123",
  "url": "https://res.cloudinary.com/dftvmkc1c/image/upload/v123/abc.jpg",
  "width": 800,
  "height": 800,
  "format": "jpg",
  "bytes": 12345
}
```

**Validaciones**
- `public_id`: required, regex `^[A-Za-z0-9_\-\/]+$`, max 191.
- `url`: required, url, max 500.
- `width` / `height`: optional, integer 1-10000.
- `format`: optional, in: `jpg, jpeg, png, webp, gif, avif`.
- `bytes`: optional, integer 0-10485760 (10 MB).

> **Limite uniforme de subida:** desde el ajuste de limites 10 MB, el frontend acepta archivos de hasta **10 MB para avatar, cover y portfolio** (antes 2/5/8 MB respectivamente). El backend rechazara cualquier `bytes` superior a 10 MB con 422. Cloudinary free tier capa tambien en 10 MB por archivo.

**Validaciones de seguridad server-side** (no vienen del cliente, las aplica `CloudinaryService::verifyResource()`):
- El `public_id` debe existir en Cloudinary (vía Admin API).
- El recurso debe estar en la carpeta esperada (`framematch/avatars`).
- El `resource_type` debe ser `image`.

**Response 200** — mismo shape que `GET /api/auth/me` (con `avatar_url` y `avatar_urls` actualizados).

**Errores**
- `401 Unauthorized` — sin token.
- `422 Unprocessable Entity` — validaciones fallidas (con detalle por campo).
- `403 Forbidden` — el `public_id` no existe en Cloudinary, está en otra carpeta, o no es una imagen. Body: `{ "message": "..." }`.

> **Idempotencia:** si el usuario ya tenía avatar y sube uno nuevo, el backend borra el archivo anterior de Cloudinary antes de guardar el nuevo.

---

### `DELETE /api/me/avatar`

Elimina el avatar actual. **Requiere JWT.** Throttle: 30 req/min.

**Response 200** — `User` con `avatar_url` y `avatar_urls` a `null`.

**Errores**
- `401 Unauthorized` — sin token.

> El archivo en Cloudinary se borra best-effort. Si el borrado falla (red, credenciales), el usuario ya queda sin avatar en BD; se loguea el warning en `storage/logs/laravel.log`.

---

## OAuth (Google / Facebook) — Fase 5.3

Flujo **Authorization Code** con redirección de página completa. El backend genera un `state` CSRF, redirige al provider, intercambia el `code` por un access token, crea/vincula el `User`, emite JWT, y redirige al frontend con el token en query string. La SPA completa el flujo y (si es user nuevo) le pide que elija rol.

### `GET /api/auth/oauth/{provider}/redirect`

Inicia el flujo OAuth. **Público.** `provider` ∈ `google` | `facebook`.

Genera un `state` aleatorio, lo guarda en la sesión, y devuelve `302` a la pantalla de autorización del provider (Google o Facebook) con el `state` como parámetro. Tras aprobar, el provider redirige a `/api/auth/oauth/{provider}/callback`.

**Errores**
- `404` — provider no soportado.

---

### `GET /api/auth/oauth/{provider}/callback`

Callback del provider. **Público.** Recibe `code` y `state` del provider.

1. Valida que el `state` recibido coincide con el guardado en sesión. Si no → `419 Estado OAuth inválido. Inténtalo de nuevo.`
2. Intercambia el `code` por un access token del provider.
3. Obtiene email, nombre, avatar y provider_id del provider.
4. Delega en `OAuthService::findOrCreateUser()`:
   - Si no existe user con `(oauth_provider, oauth_id)` ni con `email`: crea uno nuevo con `role=client` y `email_verified_at=now()`.
   - Si existe user con `email` (sin OAuth): auto-vincula `oauth_provider` + `oauth_id` al user existente (no cambia su `role`).
   - Si ya existe user con `(oauth_provider, oauth_id)`: lo actualiza (nombre, avatar) y le mantiene el rol.
5. Emite un JWT vía `Auth::guard('api')->login($user)`.
6. Redirige `302` a `{FRONTEND_URL}/auth/callback?token={jwt}&expires_in={ttl*60}&new_user={0|1}`.

**Errores**
- `419` — state inválido o ausente.
- `422` — el provider no devolvió un email.
- `500` — error intercambiando el code o contactando al provider.

> El `state` se consume una sola vez (`$request->session()->pull(...)`), así que un refresh del browser no permite re-entrar con un state viejo.

---

### `POST /api/auth/oauth/complete-profile`

Para users nuevos que acaban de aterrizar del flujo OAuth. **Requiere JWT.**

Solo se llama si el `OAuthCallbackComponent` del frontend detecta `new_user=1` y redirige a `/auth/complete-profile`.

**Request body**
```json
{ "role": "freelancer" }
```

**Validaciones**
- `role`: required, ∈ `client` | `freelancer`.

**Response 200** — mismo shape que `/api/auth/login` (user + access_token + token_type + expires_in). Si `role=freelancer` y el user no tiene `freelancer_profile`, se crea uno vacío.

**Errores**
- `401` — sin token o token inválido.
- `422` — `role` no está en la lista.

---

## Manejo de errores

### Validación (422)
```json
{
  "message": "The name field is required. (and 1 more error)",
  "errors": {
    "name":     ["The name field is required."],
    "password": ["The password field must be at least 8 characters."]
  }
}
```

### No autenticado (401)
```json
{ "message": "No autenticado. Token inválido o expirado." }
```

### No autorizado (403)
```json
{ "message": "Solo los profesionales pueden gestionar su perfil." }
```

Se devuelve cuando un usuario autenticado con `role != freelancer` intenta acceder a `/api/freelancer/*`. El middleware responsable es `App\Http\Middleware\EnsureUserIsFreelancer`.

### Recurso no encontrado (404, futuro)
```json
{ "message": "No se encontró el recurso solicitado." }
```

### Error de servidor (500)
```json
{ "message": "Error interno del servidor." }
```

## JWT en detalle

- **Algoritmo:** HS256.
- **Secret:** variable `JWT_SECRET` en `.env`. Generado con `php artisan jwt:secret`.
- **TTL:** 60 minutos (`JWT_TTL=60`).
- **Refresh TTL:** 14 días (`JWT_REFRESH_TTL=20160` minutos).
- **Blacklist:** activada por defecto. Al hacer `logout`, el `jti` del token se añade a la blacklist (almacenada en `CACHE_STORE`, configurado a `database` en dev).
- **Claims custom:** `{ "role": "client" | "freelancer" | ... }` — útil para `roleGuard` server-side en el futuro.
- **Cómo enviarlo:** en cada request a un endpoint protegido:
  ```
  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
  ```

## Versionado

Por ahora, sin prefijo de versión (v1 implícito). Cuando haya un breaking change, se introducirá `/api/v2/...` y `/api/v1` quedará deprecado con aviso de 6 meses.

## Tests de la API

Cubiertos por 10 Feature suites + 2 Unit suites en `backend/tests/`:

- `AuthTest.php` — 16 tests (register, login, me, logout, refresh, skills, health).
- `FreelancerProfileTest.php` — 11 tests (edición de perfil + skills + sync).
- `FreelancerCatalogTest.php` — 17 tests (catálogo público, filtros, paginación, orden).
- `BriefsAndProposalsTest.php` — 16 tests (CRUD briefs + propuestas).
- `AvatarUploadTest.php` — 12 tests (subir/borrar avatar con Cloudinary).
- `CoverUploadTest.php` — 9 tests (subir/borrar cover con Cloudinary).
- `PortfolioTest.php` — 13 tests (CRUD portfolio, reorder, endpoint público).
- `OAuthTest.php` — 12 tests (redirect, callback, complete-profile).
- `UserAccountTest.php` — 7 tests (edición de cuenta, validaciones).
- `CloudinaryServiceTest.php` (Unit) — 14 tests (Admin API, URLs, transformaciones).
- `UserTest.php` (Unit) — 5 tests (modelo, JWT claims, relaciones).

**Total: 133 tests, 634 assertions.** Para correrlos:

```bash
cd backend
php artisan test
```

Los tests usan `sqlite :memory:` con `RefreshDatabase`, no tocan MySQL. Verifican:

**AuthTest**
- Registro cliente (sin perfil freelancer)
- Registro freelancer (con perfil vacío)
- Email duplicado → 422
- Role inválido → 422
- Password corto / sin confirmación → 422
- Login OK / credenciales inválidas
- `me` sin token / con token
- `me` con perfil freelancer
- `me` cliente sin perfil
- `logout` invalida el token
- Seeder de skills
- Health check

**FreelancerProfileTest**
- `GET /api/skills` devuelve las 20 skills seedeadas
- `GET /api/freelancer/me` con freelancer → 200 + perfil con skills
- `GET /api/freelancer/me` con cliente → 403
- `GET /api/freelancer/me` sin token → 401
- `PUT /api/freelancer/me` con datos válidos → 200 + cambios en BD
- `PUT /api/freelancer/me` con bio > 1000 → 422
- `PUT /api/freelancer/me/skills` con 3 skills → 200 + filas en `freelancer_skill`
- `PUT /api/freelancer/me/skills` con `skill_id` inexistente → 422
- `PUT /api/freelancer/me/skills` re-sincroniza (borra anteriores)
- `PUT /api/freelancer/me/skills` con cliente → 403

**FreelancerCatalogTest**
- `GET /api/freelancers` devuelve cards paginadas por defecto
- Filtro por `category`, por `city`, por `max_rate`, combinación con `q`
- Empty results cuando ningún freelancer coincide
- Excluye freelancers con `is_available=false`
- Pagina correctamente con 13+ freelancers
- `GET /api/freelancers/{id}` → 200 con detalle
- El detalle NO expone `email`, `password`
- `GET /api/freelancers/{id_inexistente}` → 404
- `GET /api/freelancers/{id}` con `is_available=false` → 404
- `GET /api/freelancers?category=foo` → 422

**BriefsAndProposalsTest**
- `GET /api/briefs` lista publicados y excluye drafts
- `GET /api/briefs?scope=mine` filtra por autor
- `GET /api/briefs/{id}` → 200 / 404
- `POST /api/briefs` con cliente → 201; con freelancer → 403; 422 en validación
- `PUT /api/briefs/{id}` solo el autor puede editar; otros → 403
- `DELETE /api/briefs/{id}` solo el autor
- `GET /api/briefs/{id}/proposals` solo el autor puede verlas
- `POST /api/briefs/{id}/proposals` con freelancer → 201; con cliente → 403
- Previene duplicados (freelancer no puede enviar 2 al mismo brief)
- Brief cerrado (status != published) → 422

## Smoke test rápido con curl

```bash
# Health
curl http://127.0.0.1:8000/api/health

# Register
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"password123","password_confirmation":"password123","role":"client"}'

# Login
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"ana@example.com","password":"password123"}'

# Me (sustituye <TOKEN> por el access_token devuelto)
curl http://127.0.0.1:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# Skills (público)
curl http://127.0.0.1:8000/api/skills

# Mi perfil freelancer (JWT)
curl http://127.0.0.1:8000/api/freelancer/me \
  -H "Authorization: Bearer <TOKEN>"

# Actualizar mi perfil
curl -X PUT http://127.0.0.1:8000/api/freelancer/me \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"display_name":"Luis Foto Pro","city":"Madrid","hourly_rate":60}'

# Sincronizar mis skills (reemplaza todas)
curl -X PUT http://127.0.0.1:8000/api/freelancer/me/skills \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"skills":[{"skill_id":1,"level":"senior","years_experience":5}]}'

# Catalogo publico con filtros
curl 'http://127.0.0.1:8000/api/freelancers?category=video&city=Madrid&max_rate=80'

# Detalle de un freelancer
curl http://127.0.0.1:8000/api/freelancers/1

# Catalogo publico de briefs
curl http://127.0.0.1:8000/api/briefs

# Crear un brief (requiere JWT client)
curl -X POST http://127.0.0.1:8000/api/briefs \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"title":"Video corporativo para startup","description":"Buscamos profesional para grabar video institucional de 60s con tomas en oficina y entrevistas a fundadores.","category":"video","budget_min":800,"budget_max":1500}'

# Enviar propuesta a un brief (requiere JWT freelancer)
curl -X POST http://127.0.0.1:8000/api/briefs/1/proposals \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"message":"Tengo 8 años de experiencia en video corporativo y puedo entregar en 10 dias.","price":1200}'
```

`Accept: application/json` fuerza a Laravel a devolver errores como JSON incluso cuando vienen de validación o auth (sin él, un 401 de web devuelve redirect a una ruta de login que no existe).

> **OAuth (Google / Facebook) no se puede probar con curl** porque requiere un navegador para hacer click en "Approve" en la pantalla del provider. Para probar en local necesitas:
> 1. Crear apps en [Google Cloud Console](https://console.cloud.google.com/) y/o [Facebook Developers](https://developers.facebook.com/).
> 2. Configurar las URIs de redirect: `{BACKEND_URL}/api/auth/oauth/google/callback` y `{BACKEND_URL}/api/auth/oauth/facebook/callback`.
> 3. Rellenar `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` en `.env`.
> 4. Arrancar el dev server (`php artisan serve` + `ng start`) y hacer click en "Continuar con Google" en `http://localhost:4200/login`.

## Próximos endpoints (roadmap)

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/me/stats` | GET | JWT freelancer | Métricas (visitas, contactos…) |
| `/api/briefs/{id}/proposals/{pid}/status` | PATCH | JWT client | Aceptar/rechazar propuesta |
| `/api/conversations` | GET/POST | JWT | Hilos de chat de un usuario |
| `/api/auth/password/reset` | POST | público | Reset de password vía email |
| `/api/auth/email/verify/{id}/{hash}` | GET | JWT | Verificación de email |
