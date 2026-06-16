# Deploy · FrameMatch

> Guía completa para desplegar el monorepo en producción. Última revisión: **Fase 5.6** (deploy inicial Railway + Vercel).

## Arquitectura de deploy

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GitHub · DCM91/Prueba-Daniel-Castro (rama main)                         │
└────────────┬───────────────────────────────────┬──────────────────────────┘
             │ push a main                      │ push a main
             ▼                                   ▼
┌──────────────────────────────┐    ┌─────────────────────────────────────┐
│  Railway · Servicio Laravel │    │  Vercel · Proyecto Angular         │
│  Root: backend/             │    │  Root: frontend/                    │
│                              │    │                                     │
│  · railpack.json (PHP 8.4)  │    │  · vercel.json                      │
│  · start-container.sh       │    │    (rewrites + installCommand)      │
│    (migrate --force --seed, │    │                                     │
│     storage:link, optimize) │    │  Build: Angular 21                  │
│  · FrankenPHP (auto)        │    │  Output: dist/frontend/browser      │
│  · MySQL plugin (mismo proj)│    │                                     │
│                              │    │  URL: https://framematch.vercel.app │
│  URL: https://<slug>.        │    └──────────┬──────────────────────────┘
│        up.railway.app        │               │
└──────────────┬───────────────┘               │ rewrite /api/* → Railway
               │                               │
               └───────────────┬───────────────┘
                               ▼
                  Llamadas API desde el navegador
                  (mismo origen, sin CORS)
```

**Por qué Vercel rewrites y no CORS**: el frontend usa URLs relativas (`/api/...`) en todos los servicios. Con el rewrite, el navegador cree que habla con Vercel cuando en realidad Vercel proxia a Railway. Esto evita CORS, evita preflights, y permite que el futuro flujo OAuth (con `state` en sesión) funcione: la sesión queda en la BD del backend pero la cookie se establece en el dominio de Vercel, que es el que aparece en la barra del navegador.

---

## Servicios usados

| Servicio | Qué corre | Coste |
|---|---|---|
| **GitHub** | Repo único `DCM91/Prueba-Daniel-Castro` | $0 |
| **Railway** | Backend Laravel + plugin MySQL | $5/mes + uso (plan hobby) |
| **Vercel** | Frontend Angular estático | $0 (hobby) |
| **Cloudinary** | Avatares / cover / portfolio (fase 5.5) | Free tier OK |

> El backend en Railway comparte proyecto con el plugin MySQL, lo que permite usar `DB_URL=${{MySQL.MYSQL_URL}}` como variable interna sin exponer credenciales.

---

## Backend · Railway (paso a paso)

### 1. Archivos del repo que controlan el deploy

```
backend/
├── railpack.json          # Pin de PHP 8.4 (Railpack, no Nixpacks)
├── start-container.sh     # Override del script por defecto de Railpack
└── composer.json          # ^8.3 — Railpack detecta esto y elige 8.3;
                           # por eso forzamos 8.4 en railpack.json
```

**`backend/railpack.json`**
```json
{
  "$schema": "https://schema.railpack.com",
  "packages": {
    "php": "8.4"
  }
}
```

> **Por qué `railpack.json` y no `nixpacks.toml`**: Railway usa el builder Railpack (no Nixpacks). `nixpacks.toml` se ignora silenciosamente. El error que sale es `Build fails because composer.lock requires PHP 8.4+ but Railpack auto-selected PHP 8.3.31` si no se pincha la versión.

**`backend/start-container.sh`**
```bash
#!/bin/bash

set -e

if [ "$IS_LARAVEL" = "true" ]; then
  if [ "$RAILPACK_SKIP_MIGRATIONS" != "true" ]; then
    echo "Running migrations and seeding database ..."
    php artisan migrate --force --seed
  fi

  php artisan storage:link
  php artisan optimize:clear
  php artisan optimize

  echo "Starting Laravel server ..."
fi

docker-php-entrypoint --config /Caddyfile --adapter caddyfile 2>&1
```

> **Por qué custom**: el script por defecto de Railpack para Laravel hace `php artisan migrate --force` (sin `--seed`). Nosotros queremos también seedear para que `skills` y los 6 freelancers demo estén poblados desde el primer deploy. El resto del script se copia tal cual del original de Railpack. El servidor web es **FrankenPHP** (no `php artisan serve`); Railpack lo configura automáticamente.
>
> El archivo debe tener bit ejecutable (`chmod +x` en Git: `git update-index --chmod=+x backend/start-container.sh`).

### 2. Crear proyecto en Railway

1. https://railway.com/dashboard → **New Project** → **Provision MySQL**.
2. Espera a que la BD pase a `Active` (30-60 s).
3. **+ Add → GitHub Repo** → autoriza → elige `DCM91/Prueba-Daniel-Castro`.
4. En el servicio Laravel: **Settings → Source → Root Directory = `backend`**.

### 3. Variables de entorno

En **Variables** del servicio Laravel (no en MySQL), pegar en **Raw Editor**:

```dotenv
APP_NAME=FrameMatch
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<tu-dominio>.up.railway.app
APP_TIMEZONE=UTC
APP_KEY=<generar con `php artisan key:generate --show`>
BCRYPT_ROUNDS=12

DB_CONNECTION=mysql
DB_URL=${{MySQL.MYSQL_URL}}

CACHE_STORE=database
SESSION_DRIVER=database
SESSION_LIFETIME=120
QUEUE_CONNECTION=sync

JWT_SECRET=<min 32 chars, ver "Issues" abajo>
JWT_ALGO=HS256
JWT_TTL=60
JWT_REFRESH_TTL=20160

FRONTEND_URL=https://framematch.vercel.app

# Cloudinary (placeholders válidos; sin estos, los endpoints de upload
# devuelven 500 pero el resto de la app arranca)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_PRESET_AVATAR=fm_av_upl
CLOUDINARY_PRESET_COVER=fm_cv_upl
CLOUDINARY_PRESET_PORTFOLIO=fm_pf_upl
CLOUDINARY_PRESET_BRIEF=fm_br_upl

# OAuth (de momento vacíos — sin estos, los botones Google/Facebook
# devuelven 500 pero el resto de la app sigue funcionando)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/oauth/google/callback"
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI="${APP_URL}/api/auth/oauth/facebook/callback"
```

`${{MySQL.MYSQL_URL}}` es la **referencia interna** de Railway al plugin MySQL del mismo proyecto. Se expande en runtime; nunca hay que escribir la URL real a mano.

### 4. Generar `APP_KEY` y `JWT_SECRET` en local

```powershell
cd "C:\Users\castr\Desktop\a\Prueba Daniel Castro\backend"

# APP_KEY (32 bytes base64, incluye el prefijo "base64:")
php artisan key:generate --show

# JWT_SECRET: `php artisan jwt:secret --show` NO existe en este paquete.
# El comando modifica .env directamente. Para ver el valor, abre .env:
php artisan jwt:secret
notepad .env
# Busca JWT_SECRET= y copia lo que haya (sin comillas, sin "JWT_SECRET=")
```

> ⚠️ **`JWT_SECRET` debe tener ≥ 32 caracteres** (256 bits). HS256 falla con `Key provided is shorter than 256 bits, only 192 bits provided` si es más corto. Ver "Issues" abajo.

### 5. Generar dominio público

**Settings → Networking → Generate Domain**. Railway asigna algo como `prueba-daniel-castro-production.up.railway.app`. Copia esa URL y actualiza `APP_URL` en Variables → redeploy automático.

### 6. Verificación backend

```powershell
curl.exe -sS https://<tu-dominio>.up.railway.app/api/health
# → {"status":"ok","service":"FrameMatch",...}

curl.exe -sS https://<tu-dominio>.up.railway.app/api/skills
# → 30 skills (8 photo, 8 video, 8 edit, 6 content)

curl.exe -sS https://<tu-dominio>.up.railway.app/api/freelancers
# → 6 freelancers demo (Lucia, Diego, Nuria, Marcos, Aitana, Pablo)
```

---

## Frontend · Vercel (paso a paso)

### 1. Archivo del repo que controla el deploy

```
frontend/
└── vercel.json
```

**`frontend/vercel.json`**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "angular",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/frontend/browser",
  "installCommand": "npm install --legacy-peer-deps",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://<tu-dominio>.up.railway.app/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> **Por qué `--legacy-peer-deps`**: `@angular-builders/jest@21.0.3` (solo para tests, devDep) tiene un peer dep que choca con `@angular/compiler@21.2.14`. Con `legacy-peer-deps` se salta la comprobación. La alternativa sería una env var `NPM_CONFIG_LEGACY_PEER_DEPS=true` en Vercel, pero tenerlo en el `vercel.json` es más portable.
>
> **Orden de rewrites importa**: el específico de `/api/` va primero para que las llamadas a la API no caigan en el catch-all.

### 2. Crear proyecto en Vercel

1. https://vercel.com/new → **Add New → Project** → **Import** `DCM91/Prueba-Daniel-Castro`.
2. **Root Directory = `frontend`** (botón **Edit**).
3. **Framework Preset = Angular**.
4. **Build Command = `npm run build`** (default).
5. **Output Directory = `dist/frontend/browser`** (sobrescribe el default).
6. **Deploy**.

### 3. Verificación frontend

```powershell
# Landing SPA
curl.exe -sS -o /dev/null -w "%{http_code}\n" https://framematch.vercel.app/
# → 200

# Catch-all rewrite (SPA routing)
curl.exe -sS -o /dev/null -w "%{http_code}\n" https://framematch.vercel.app/home
# → 200 (no 404 — el rewrite sirve index.html)

# API proxy (Vercel → Railway)
curl.exe -sS https://framematch.vercel.app/api/health
# → {"status":"ok","service":"FrameMatch",...}
```

Y desde el navegador: abrir `https://framematch.vercel.app` → landing con el logo "FrameMatch" en gradiente, hero, 4 categorías, "Cómo funciona", selector de idioma. Registrarse, hacer login, navegar briefs y freelancers.

---

## Variables de entorno (referencia completa)

### Backend (Railway)

| Variable | Ejemplo / formato | Notas |
|---|---|---|
| `APP_NAME` | `FrameMatch` | |
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | Ponlo `true` solo para diagnosticar |
| `APP_URL` | `https://xxx.up.railway.app` | URL del servicio Railway |
| `APP_KEY` | `base64:...` (44 chars) | `php artisan key:generate --show` |
| `BCRYPT_ROUNDS` | `12` | |
| `DB_CONNECTION` | `mysql` | |
| `DB_URL` | `${{MySQL.MYSQL_URL}}` | Referencia interna al plugin MySQL |
| `CACHE_STORE` | `database` | Requiere tabla `cache` (creada por migración) |
| `SESSION_DRIVER` | `database` | Requiere tabla `sessions` |
| `QUEUE_CONNECTION` | `sync` | Sin colas reales en MVP |
| `JWT_SECRET` | ≥ 32 chars | Ver "Issues" si falla con "shorter than 256 bits" |
| `JWT_ALGO` | `HS256` | |
| `JWT_TTL` | `60` | Minutos |
| `JWT_REFRESH_TTL` | `20160` | Minutos (14 días) |
| `FRONTEND_URL` | `https://framematch.vercel.app` | Usado por OAuth callback; cambia a Vercel URL |
| `CLOUDINARY_*` | placeholders OK | Vacíos → endpoints de upload devuelven 500, app arranca |
| `GOOGLE_*` / `FACEBOOK_*` | vacíos | Sin estos, OAuth no funciona, resto OK |

### Frontend (Vercel)

Ninguna variable es necesaria en MVP: el frontend usa URLs relativas (`/api/...`) y el rewrite de Vercel las manda a Railway. Si en el futuro se añade algo dependiente de entorno, se gestiona con Vercel Environment Variables por rama (Production / Preview / Development).

---

## Issues encontrados durante el primer deploy (y resoluciones)

### 1. PHP 8.3 vs Symfony 8 (require 8.4)

**Síntoma**: el build falla con `symfony/clock v8.0.8 requires php >=8.4 -> your php version (8.3.31) does not satisfy that requirement`.

**Causa**: `composer.lock` tiene `symfony/*` v8.0.x que exige PHP 8.4. `composer.json` dice `^8.3` así que Railpack eligió 8.3.31 (la menor que cumple). Symfony 8 con PHP 8.3 no encaja.

**Fix**: `backend/railpack.json` con `{"packages": {"php": "8.4"}}`. Composer 8.4 sigue cumpliendo `^8.3`.

### 2. Railpack ignora `Procfile` y `nixpacks.toml`

**Síntoma**: el `release:` del Procfile no se ejecuta. Las migraciones nunca corren. La app arranca pero `/api/skills` y `/api/freelancers` devuelven `Server Error` con tablas vacías/inexistentes.

**Causa**: Railway ahora usa el builder **Railpack**, que ignora `Procfile` (incluido `release:`) y `nixpacks.toml`. Railpack usa FrankenPHP por defecto para Laravel y tiene su propio script de arranque.

**Fix**: crear `backend/start-container.sh` (custom) que Railpack SÍ respeta. Bit ejecutable obligatorio (`git update-index --chmod=+x`).

### 3. Railpack corre `migrate` pero NO `--seed` por defecto

**Síntoma**: deploy OK, `/api/health` 200, pero `/api/skills` devuelve `{"data":[]}` (tabla existe pero vacía).

**Causa**: el `start-container.sh` por defecto de Railpack ejecuta `php artisan migrate --force` (sin `--seed`). El comentario en su script dice "migrations and seeding" pero el comando real es solo migrate.

**Fix**: custom `backend/start-container.sh` con `php artisan migrate --force --seed`.

### 4. `JWT_SECRET` demasiado corto (24 chars)

**Síntoma**: register y login devuelven 500 con `Could not create token: Key provided is shorter than 256 bits, only 192 bits provided`.

**Causa**: el `JWT_SECRET` que se pegó en Railway tenía 24 caracteres (192 bits). HS256 requiere ≥ 32 caracteres (256 bits). El error es de `firebase/php-jwt` (usado por `php-open-source-saver/jwt-auth`).

**Cómo pasó**: `php artisan jwt:secret --show` no existe en este paquete. `jwt:secret` modifica directamente el `.env` local; el valor a copiar hay que leerlo del archivo. Si el `.env` tenía un valor de pruebas corto o truncado, eso es lo que se pegó en Railway.

**Fix**: 
- Generar uno nuevo con `php artisan jwt:secret` (o `Str::random(64)` en tinker) y copiar el valor completo.
- Pegar en Railway Variables → `JWT_SECRET` → redeploy.
- Verificar: `curl -X POST .../api/auth/register` debe devolver 201 con token.

### 5. Vercel build falla por peer dep conflict

**Síntoma**: `ERESOLVE could not resolve` con `@angular-builders/jest@21.0.3` y `@angular/compiler@21.2.14`.

**Causa**: `@angular-builders/jest@21.0.3` (solo devDep para tests) tiene un peer dep estricto que no encaja con `@angular/compiler@21.2.14`. Solo afecta al `npm install`; el `ng build` real no necesita `@angular-builders/jest`.

**Fix**: `installCommand: "npm install --legacy-peer-deps"` en `vercel.json`. Equivalente a la env var `NPM_CONFIG_LEGACY_PEER_DEPS=true` en el dashboard.

### 6. Vercel 404 en rutas SPA

**Síntoma**: la landing carga (`/` → 200) pero `/home`, `/login`, `/briefs` devuelven 404 al refrescar o acceder directo.

**Causa**: Vercel no sabe que es una SPA. Sin un rewrite catch-all a `/index.html`, sirve 404 para cualquier ruta que no sea un archivo estático.

**Fix**: añadir el rewrite catch-all en `vercel.json`:
```json
{ "source": "/(.*)", "destination": "/index.html" }
```
(Después del rewrite específico de `/api/`.)

---

## Smoke tests completos (post-deploy)

```powershell
# Backend directo
curl.exe -sS https://<railway>.up.railway.app/api/health
curl.exe -sS https://<railway>.up.railway.app/api/skills
curl.exe -sS https://<railway>.up.railway.app/api/freelancers

# Frontend (Vercel)
curl.exe -sS -o /dev/null -w "%{http_code}\n" https://framematch.vercel.app/
curl.exe -sS -o /dev/null -w "%{http_code}\n" https://framematch.vercel.app/home

# API via Vercel rewrite
curl.exe -sS https://framematch.vercel.app/api/health

# Register end-to-end (genera usuario + token)
$tmp = "C:\Temp\fm-test"; New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$email = "test_$(Get-Random)@example.com"
$body = '{"name":"Test","email":"' + $email + '","password":"password123","password_confirmation":"password123","role":"client"}'
[System.IO.File]::WriteAllText("$tmp\reg.json", $body, [System.Text.UTF8Encoding]::new($false))
$reg = curl.exe -sS -X POST https://framematch.vercel.app/api/auth/register -H "Content-Type: application/json" --data-binary "@$tmp\reg.json"
$tok = ($reg | ConvertFrom-Json).data.access_token
Write-Host "Token: $($tok.Substring(0,40))..."

# /me con el token
curl.exe -sS -H "Authorization: Bearer $tok" https://framematch.vercel.app/api/auth/me

# Login con la misma cuenta
$body2 = '{"email":"' + $email + '","password":"password123"}'
[System.IO.File]::WriteAllText("$tmp\log.json", $body2, [System.Text.UTF8Encoding]::new($false))
curl.exe -sS -X POST https://framematch.vercel.app/api/auth/login -H "Content-Type: application/json" --data-binary "@$tmp\log.json"

# Limpieza
Remove-Item -LiteralPath $tmp -Recurse -Force
```

**Esperado**:
- `GET /api/health` → `{"status":"ok",...}`
- `GET /api/skills` → 30 skills
- `GET /api/freelancers` → 6 freelancers demo
- `GET /` y `GET /home` (Vercel) → 200
- `POST /api/auth/register` → 201 con `data.access_token`
- `GET /api/auth/me` con Bearer → 200 con el user
- `POST /api/auth/login` (correcto) → 200 con `data.access_token`
- `POST /api/auth/login` (incorrecto) → 401 `Credenciales inválidas`

---

## OAuth (cuando se monte)

1. Crear OAuth apps en Google Cloud Console y Facebook Developers.
2. **Authorized redirect URIs** (en la consola del provider):
   - `https://framematch.vercel.app/api/auth/oauth/google/callback`
   - `https://framematch.vercel.app/api/auth/oauth/facebook/callback`
3. **Crítico**: las redirect URIs deben apuntar a la **URL de Vercel**, no a Railway. La razón: el `OAuthController` guarda el `state` CSRF en la sesión (BD), y la cookie de sesión se establece en el dominio que aparece en la barra del navegador. Con el rewrite, ese dominio es Vercel. Si el callback fuera directamente a Railway, la cookie no llegaría y el `hash_equals` del state fallaría con 419.
4. Pegar `GOOGLE_CLIENT_ID/SECRET` y `FACEBOOK_CLIENT_ID/SECRET` en Railway → Variables → redeploy.
5. Verificar: `GET /api/auth/oauth/google/redirect` debe devolver 302 a `accounts.google.com`.

---

## CORS y dominios

`config/cors.php` actual:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['*'],
'supports_credentials' => false,
```

Con el rewrite de Vercel, **el navegador nunca ve un request cross-origin** (Vercel proxy hace que `/api/...` se vea como mismo origen). Por eso `allowed_origins: ['*']` no es un problema de seguridad en producción actual.

Si en el futuro se hace una **app móvil nativa** o un **cliente JS en otro dominio** que llame a Railway directamente, conviene restringir `allowed_origins` a esos dominios concretos.

---

## Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| Build falla con `requires php >= 8.4` | Railpack eligió PHP 8.3 | Verifica `backend/railpack.json` con `{"packages":{"php":"8.4"}}` |
| `/api/skills` devuelve `{"data":[]}` | Seed no se ejecutó | Verifica que `start-container.sh` está en el repo con bit `+x` |
| Register/login 500 con "shorter than 256 bits" | `JWT_SECRET` < 32 chars | Regenera con `php artisan jwt:secret`, copia del `.env`, pega en Railway |
| Vercel 404 en `/home` | Falta rewrite catch-all | Verifica `vercel.json` con `{ "source": "/(.*)", "destination": "/index.html" }` |
| Vercel build falla con `ERESOLVE` | Peer dep `@angular-builders/jest` | Verifica `installCommand: "npm install --legacy-peer-deps"` en `vercel.json` |
| Cambias env var y no se refleja | Caché de `config:cache` o `optimize` | Trigger redeploy manual desde el dashboard |
| `/api/auth/me` sin token devuelve 500 con "Route [login] not defined" | Bug pre-existente en `bootstrap/app.php` (no captura `RouteNotFoundException`) | Conocido, fix pendiente — solo afecta a errores 401 sin token |

---

## Resumen de archivos de deploy

| Archivo | Plataforma | Propósito |
|---|---|---|
| `backend/railpack.json` | Railway | Pin de PHP 8.4 |
| `backend/start-container.sh` | Railway | Override del start de Railpack: `migrate --force --seed` + optimize + FrankenPHP |
| `frontend/vercel.json` | Vercel | Build config, install con `--legacy-peer-deps`, rewrites `/api/*` y catch-all SPA |
| (ninguno) | GitHub | El push a `main` es lo único que dispara los deploys |
