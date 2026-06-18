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

### `POST /api/briefs/{id}/attachments`

Adjunta una imagen de referencia al brief (Cloudinary). **Requiere JWT y que el usuario sea el `client_id` del brief.** Máximo 10 adjuntos por brief.

**Body (JSON):**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `public_id` | string | sí | `public_id` devuelto por Cloudinary (debe estar en la carpeta `framematch/briefs`). Regex: `^[A-Za-z0-9_\-/]+$`, max 191. |
| `url` | string (url) | sí | URL segura (`https://...`) del recurso. |
| `width` | int | no | Ancho en px. |
| `height` | int | no | Alto en px. |
| `format` | string | no | Formato (`jpg`, `png`, `webp`, …). |
| `bytes` | int | no | Tamaño en bytes (max 10 MB). |
| `title` | string | no | Título opcional (max 120). |

El backend verifica que el `public_id` exista en Cloudinary, pertenezca a la carpeta esperada y sea una imagen.

**Respuesta `201`:**

```json
{
  "data": {
    "id": 12,
    "brief_id": 5,
    "public_id": "framematch/briefs/abc123",
    "url": "https://res.cloudinary.com/.../abc123.jpg",
    "urls": { "thumb": "...", "card": "...", "full": "..." },
    "width": 1200,
    "height": 800,
    "format": "jpg",
    "bytes": 120000,
    "title": "Moodboard principal",
    "position": 0,
    "created_at": "2026-06-18T17:00:00+00:00"
  }
}
```

**Códigos de error:**

- `401` — sin token.
- `403` — no es el autor del brief o el recurso no pertenece a la carpeta `framematch/briefs`.
- `422` — validaciones (`public_id` regex, url inválida, etc.) o límite de 10 adjuntos alcanzado.
- `404` — brief no encontrado.

---

### `DELETE /api/briefs/{id}/attachments/{attachmentId}`

Elimina un adjunto del brief. **Requiere JWT y que el usuario sea el `client_id` del brief.** Borra el recurso en Cloudinary (best-effort) y la fila en `brief_attachments`.

**Respuesta `200`:** `{ "message": "Imagen eliminada." }`

---

### `PATCH /api/briefs/{id}/attachments/reorder`

Reordena los adjuntos del brief. **Requiere JWT y que el usuario sea el `client_id` del brief.**

**Body (JSON):**

```json
{ "ids": [3, 1, 2] }
```

`ids` debe contener **exactamente** los IDs de todos los adjuntos del brief en el orden deseado. El backend asigna `position = índice` en una transacción.

**Respuesta `200`:** array de `BriefAttachmentResource` ordenados.

**Códigos de error:**

- `401` — sin token.
- `403` — no es el autor del brief.
- `404` — brief no encontrado.
- `422` — validaciones o IDs que no pertenecen al brief / falta alguno.

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

## Mensajería (chat) — Fase 6

Chat 1:1 entre cliente y freelancer dentro de un **brief con propuesta aceptada** (status `assigned` o `completed`). El chat se crea automáticamente al aceptar la proposal. **Polling cada 5s** mientras hay una conversación abierta (no hay websockets todavía — la migración a realtime queda en el backlog).

### `GET /api/conversations`

Lista las conversaciones del usuario autenticado. **Requiere JWT.** Ordenadas por `last_message_at` desc.

**Response 200**

```json
{
  "data": [
    {
      "id": 1,
      "brief_id": 5,
      "client_id": 1,
      "freelancer_id": 2,
      "last_message_at": "2026-06-18T18:30:00+00:00",
      "created_at": "2026-06-18T10:00:00+00:00",
      "unread_count": 3,
      "brief":     { "id": 5, "title": "Vídeo boda", "status": "assigned" },
      "client":    { "id": 1, "name": "Ana",   "avatar_url": null },
      "freelancer":{ "id": 2, "name": "Lucia", "avatar_url": null },
      "latest_message": {
        "id": 12, "conversation_id": 1, "sender_id": 2,
        "body": "¿Te paso el guion?", "read_at": null,
        "created_at": "2026-06-18T18:30:00+00:00"
      }
    }
  ]
}
```

`unread_count` cuenta mensajes cuyo `read_at` es null y cuyo `sender_id != user_id`. **Errores:** `401` sin token.

---

### `GET /api/conversations/unread-count`

Devuelve el total de mensajes sin leer para el usuario autenticado. **Requiere JWT.** Útil para el badge en el topbar.

**Response 200:** `{ "data": { "unread_count": 5 } }`

---

### `GET /api/conversations/{id}`

Devuelve el detalle de una conversación. **Requiere JWT.** Solo accesible a `client_id` o `freelancer_id` (otro user → 403).

**Response 200:** `ConversationResource` con `brief`, `client`, `freelancer`.

**Errores**
- `401` sin token.
- `403` no participante.
- `404` conversación no encontrada.

---

### `POST /api/briefs/{id}/conversation`

Crea o devuelve la conversación de un brief. **Requiere JWT.** El brief debe tener una proposal aceptada; en caso contrario `409`.

**Response 201:** `ConversationResource`.

**Errores**
- `401` sin token.
- `404` brief no encontrado.
- `409` el brief no tiene proposal aceptada.

> Cuando un cliente acepta una proposal, la conversación se crea automáticamente desde `ProposalController::updateStatus`. Este endpoint está pensado para los casos en los que el cliente quiere abrir el chat "manualmente" sin esperar a la redirección.

---

### `GET /api/conversations/{id}/messages`

Lista los mensajes de una conversación. **Requiere JWT.** Solo participante.

**Query params**
- `since` (opcional, ISO 8601): devuelve solo mensajes con `created_at > since`. Se usa para polling.
- `limit` (opcional, default 50, max 100).

**Response 200**

```json
{
  "data": [
    { "id": 1, "conversation_id": 1, "sender_id": 1, "body": "Hola",
      "read_at": "2026-06-18T10:01:00+00:00", "created_at": "2026-06-18T10:00:00+00:00",
      "sender": { "id": 1, "name": "Ana", "avatar_url": null } }
  ],
  "has_more": false,
  "earliest_at": "2026-06-18T10:00:00+00:00",
  "latest_at":   "2026-06-18T10:00:00+00:00"
}
```

**Errores:** `401`, `403`, `404`.

---

### `POST /api/conversations/{id}/messages`

Envía un mensaje. **Requiere JWT.** Solo participante.

**Body (JSON):** `{ "body": "Texto del mensaje" }` (1-2000 chars).

**Response 201:** `MessageResource` con `sender` anidado.

**Errores**
- `401` sin token.
- `403` no participante.
- `404` conversación no encontrada.
- `422` `body` vacío o > 2000 chars.

Tras enviar, el backend actualiza `last_message_at` en la conversación.

---

### `POST /api/conversations/{id}/read`

Marca como leídos todos los mensajes del interlocutor que aún no tenían `read_at`. **Requiere JWT.** Solo participante. Idempotente.

**Response 200:** `{ "data": { "conversation_id": 1, "marked_count": 3 } }`

---

## Reviews y ratings — Fase 7

Sistema de valoración cruzada entre cliente y freelancer tras completar un proyecto. Cada par `(brief, reviewer)` solo puede tener una review (constraint `UNIQUE (brief_id, reviewer_id)`), así que un user solo puede dejar **una review por proyecto**. La puntuación es 1-5 con comentario opcional (max 1000 chars). El rating agregado (`count` + `average`) se expone en `FreelancerCardResource` y `FreelancerDetailResource` para que el catálogo y la ficha muestren la reputación.

### `PATCH /api/briefs/{id}/complete`

Marca el brief como `completed`. **Solo el cliente dueño y solo cuando el brief está en `assigned`.** Útil para iniciar el flujo de reviews.

**Response 200:** `BriefResource`.

**Errores**
- `401` sin token.
- `403` no es el dueño.
- `409` el brief no está en `assigned`.
- `404` brief no encontrado.

---

### `POST /api/briefs/{id}/reviews`

Crea una review. **Requiere JWT.** El reviewer debe ser participante del brief (`client_id` o `freelancer_id` de la conversación) y el brief debe estar en `completed`. No se puede reseñar dos veces el mismo proyecto.

**Body (JSON):**

```json
{ "rating": 5, "comment": "Trabajo impecable" }
```

- `rating` (int, required): 1-5.
- `comment` (string, optional, max 1000).

**Response 201:** `ReviewResource` con `reviewer`, `reviewee`, `brief` anidados.

**Errores**
- `401` sin token.
- `403` no participa en el brief.
- `404` brief no encontrado.
- `409` brief no completado / ya reseñado.
- `422` `rating` fuera de 1-5 o `comment` > 1000 chars.

---

### `GET /api/briefs/{id}/reviews`

Lista las reviews de un brief (las 2 direcciones: cliente→freelancer y freelancer→cliente). **Requiere JWT.** Solo accesible a participantes.

**Response 200:** array de `ReviewResource`.

**Errores:** `401`, `403`, `404`.

---

### `GET /api/users/{id}/reviews`

Lista las reviews recibidas por un user (paginado, default 20, max 100 vía `?limit=N`). **Público.**

**Response 200:** array de `ReviewResource` con `brief` resumido.

---

### `GET /api/users/{id}/rating`

Devuelve el rating agregado de un user. **Público.**

**Response 200:**

```json
{ "data": { "user_id": 7, "count": 12, "average": 4.75 } }
```

`average` es `null` si no hay reviews.

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
2. Si el `redirect` se hizo con `?link=1` y el usuario estaba autenticado, el `user_id` se guarda en sesión como "link intent" y al volver del provider se vincula la identidad al usuario actual (no se crea un nuevo JWT de login).
3. Intercambia el `code` por un access token del provider.
4. Obtiene email, nombre, avatar y provider_id del provider.
5. Delega en `OAuthIdentityService::findOrCreateUserFromSocialite()`:
   - **Una identidad puede estar en N users distintos no**: el constraint `UNIQUE (provider, provider_user_id)` lo garantiza. Así que:
   - Si existe identidad `(provider, provider_user_id)`: actualiza tokens y datos del provider.
   - Si no existe identidad pero el email ya está en `users`: vincula la nueva identidad al user existente (no cambia su `role`).
   - Si no existe ni identidad ni user: crea un user nuevo (`role=client`, `email_verified_at=now()`) y le vincula la identidad.
6. Emite un JWT vía `Auth::guard('api')->login($user)`.
7. Redirige `302` a `{FRONTEND_URL}/auth/callback?token={jwt}&expires_in={ttl*60}&new_user={0|1}` (o `{FRONTEND_URL}/account?token=...&oauth_linked={provider}` en el flujo de linking).

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

### `GET /api/me/oauth-identities`

Lista las identidades OAuth vinculadas al usuario autenticado. **Requiere JWT.** (Fase 5.5.F)

**Response 200**

```json
{
  "data": [
    {
      "id": 1,
      "provider": "google",
      "provider_label": "Google",
      "provider_email": "user@gmail.com",
      "linked_at": "2026-06-18T17:00:00+00:00",
      "last_used_at": "2026-06-18T18:00:00+00:00",
      "token_expires_at": null,
      "has_refresh_token": true
    }
  ]
}
```

---

### `DELETE /api/me/oauth-identities/{provider}`

Desvincula una identidad OAuth del usuario autenticado. **Requiere JWT.** `provider` ∈ `google` | `facebook`. (Fase 5.5.F)

**Response 200:** `{ "message": "Cuenta desvinculada." }`

**Errores**
- `401` — sin token.
- `404` — provider no soportado o el usuario no tiene esa identidad vinculada.
- `422` — es el único método de login del usuario y no tiene `password` configurada. Debe añadir una contraseña antes de desvincular.

---

### Flujo de linking (vinculación desde un usuario logueado)

Si el usuario ya está autenticado y quiere añadir Google/Facebook a su cuenta, el frontend llama a `GET /api/auth/oauth/{provider}/redirect?link=1`. El backend marca la sesión con un `link_intent` que contiene el `user_id` actual. Al volver del provider, el callback detecta ese intent y, en lugar de crear/recuperar un user, vincula la nueva identidad al usuario actual. Si la operación tiene éxito, redirige a `{FRONTEND_URL}/account?oauth_linked={provider}&token={jwt}`; si falla, redirige a `{FRONTEND_URL}/account?oauth_error={mensaje}&provider={provider}`.

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

Cubiertos por 15 Feature suites + 2 Unit suites en `backend/tests/`:

- `AuthTest.php` — 16 tests (register, login, me, logout, refresh, skills, health).
- `FreelancerProfileTest.php` — 11 tests (edición de perfil + skills + sync).
- `FreelancerCatalogTest.php` — 17 tests (catálogo público, filtros, paginación, orden).
- `BriefsAndProposalsTest.php` — 16 tests (CRUD briefs + propuestas).
- `BriefAttachmentTest.php` — 16 tests (attach/detach/reorder de imágenes de referencia en briefs).
- `ChatTest.php` — 18 tests (creación de conversación, listado, envío, polling, mark-read, permisos, unread-count, auto-creación al aceptar proposal).
- `ReviewTest.php` — 19 tests (crear review, validación, anti-duplicados, permisos, aggregate, complete-brief, rating en resource).
- `AvatarUploadTest.php` — 12 tests (subir/borrar avatar con Cloudinary).
- `CoverUploadTest.php` — 9 tests (subir/borrar cover con Cloudinary).
- `PortfolioTest.php` — 13 tests (CRUD portfolio, reorder, endpoint público).
- `OAuthTest.php` — 13 tests (redirect, callback, complete-profile, identity de un user que vuelve).
- `OAuthIdentityTest.php` — 11 tests (`GET/DELETE /me/oauth-identities`, multi-provider, restricción "no puedes desvincular tu único método de login").
- `UserAccountTest.php` — 7 tests (edición de cuenta, validaciones).
- `OnboardingEndpointTest.php` — 9 tests (endpoint `onboarding-complete`).
- `ProfileCompletionTest.php` — 11 tests (servicio de progreso + endpoint `/api/me/completion`).
- `CloudinaryServiceTest.php` (Unit) — 14 tests (Admin API, URLs, transformaciones).
- `UserTest.php` (Unit) — 5 tests (modelo, JWT claims, relaciones).

**Total: 227 tests, 927 assertions.** Para correrlos:

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

**BriefAttachmentTest**
- `POST /api/briefs/{id}/attachments` con cliente dueño → 201 + posición incrementada
- Solo el dueño puede adjuntar; otros clientes / freelancers → 403
- `public_id` faltante o con formato inválido → 422
- Recurso inexistente en Cloudinary → 403
- `public_id` que pertenece a otra carpeta (`portfolios`) → 403
- Brief con 10 adjuntos → 422 (límite alcanzado)
- Sin token → 401
- `DELETE /api/briefs/{id}/attachments/{attachmentId}` con cliente dueño → 200 + borrado en Cloudinary (best-effort)
- `DELETE` con no-dueño → 403, no se borra
- `PATCH /api/briefs/{id}/attachments/reorder` con cliente dueño → 200 + nueva lista ordenada
- `PATCH reorder` con IDs que no pertenecen al brief → 422
- `GET /api/briefs/{id}` incluye `attachments` con sus `urls` (thumb/card/full)
- `GET /api/briefs` (index) incluye los `attachments` de cada brief

**OAuthIdentityTest**
- `GET /api/me/oauth-identities` sin identidades → 200 con `data: []`
- `GET /api/me/oauth-identities` con varias identidades → 200 con `data` ordenado por provider
- `GET /api/me/oauth-identities` sin token → 401
- `DELETE /api/me/oauth-identities/{provider}` con identidad existente → 200 + fila eliminada
- `DELETE /api/me/oauth-identities/{provider}` sin tener esa identidad → 404
- `DELETE /api/me/oauth-identities/twitter` (provider inválido) → 404
- `DELETE /api/me/oauth-identities/{provider}` con esa identidad como único login y sin password → 422
- `DELETE /api/me/oauth-identities/{provider}` con varias identidades (OAuth-only) → 200 (puede borrar una)
- `DELETE` sin token → 401
- `User::hasPassword()` / `User::isOAuthOnly()` reflejan el estado real del user

**ChatTest**
- `GET /api/conversations` devuelve solo las del user (no fuga a otros) + `unread_count` correcto
- `GET /api/conversations/{id}` → 200 con `brief`/`client`/`freelancer`; `404` si no existe; `403` si no participante
- `POST /api/briefs/{id}/conversation` → 201 cuando hay proposal aceptada; `409` cuando no
- `POST /api/briefs/{id}/conversation` es idempotente (devuelve la misma conversación si ya existe)
- Aceptar una proposal crea la conversación automáticamente
- `GET /api/conversations/{id}/messages` con `limit=3` pagina, con `since` filtra por fecha
- `POST /api/conversations/{id}/messages` con body vacío / > 2000 chars → 422
- `POST /api/conversations/{id}/messages` actualiza `last_message_at` de la conversación
- `POST /api/conversations/{id}/read` marca solo los mensajes del interlocutor, no los propios
- `GET /api/conversations/unread-count` descuenta los mensajes marcados como leídos
- `send` y `list` requieren JWT (`401`)

**ReviewTest**
- Cliente/freelancer pueden crear review cuando el brief está `completed` → 201
- Mismo user no puede reseñar dos veces el mismo brief → 409
- Rating fuera de 1-5 o ausente → 422; comment > 1000 → 422
- No participantes → 403; sin token → 401
- Brief `assigned` (no completado) → 409
- `GET /api/users/{id}/reviews` lista las recibidas; `GET /api/users/{id}/rating` devuelve `{ count, average }`
- `GET /api/briefs/{id}/reviews` solo accesible a participantes (403 a extraños)
- `PATCH /api/briefs/{id}/complete` (cliente) → status `completed`; freelancer o estado incorrecto → 403/409
- `FreelancerDetailResource` expone `rating: { count, average }`

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
