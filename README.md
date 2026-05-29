# Wikipedia Search App

Aplicación web full-stack que permite buscar términos en Wikipedia, mostrar resultados paginados y persistir el historial de búsquedas en base de datos.

**Stack:** Laravel 13 (backend API REST) + Angular 21 (frontend SPA)

---

## Requisitos previos

| Herramienta | Versión | Notas |
|---|---|---|
| PHP | >= 8.5 | `C:\php\php.ini` |
| Composer | 2.x | |
| Node.js | >= 22 | |
| npm | >= 9 | |
| MySQL | 8.x | XAMPP (localhost:3306) |

### Extensiones PHP requeridas

```
extension=mbstring
extension=pdo_mysql
```

---

## Estructura del proyecto

```
/
├── AGENTS.md                     # Convenciones del monorepo
├── README.md                     # Este archivo
├── backend/                      # Laravel 13
│   ├── AGENTS.md                 # Convenciones backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   └── SearchController.php    # saveHistory, history, delete
│   │   │   └── Resources/
│   │   │       └── SearchHistoryResource.php # Transforma modelo → JSON
│   │   └── Models/
│   │       └── SearchHistory.php           # Modelo Eloquent (insert-only)
│   ├── database/migrations/      # Migraciones
│   ├── routes/api.php            # Endpoints REST
│   ├── tests/
│   │   ├── Feature/              # Tests de integración
│   │   │   ├── ExampleTest.php
│   │   │   ├── SearchTest.php
│   │   │   └── HistoryTest.php
│   │   └── Unit/                 # Tests unitarios
│   │       └── SearchHistoryModelTest.php
│   └── phpunit.xml
│
└── frontend/                     # Angular 21
    ├── AGENTS.md                 # Convenciones frontend
    ├── src/
    │   ├── app/
    │   │   ├── app.ts            # Componente raíz (RouterOutlet)
    │   │   ├── app.config.ts     # Providers
    │   │   ├── app.routes.ts     # Rutas
    │   │   ├── components/search/ # Componente de búsqueda
    │   │   │   ├── search.component.ts
    │   │   │   ├── search.component.html
    │   │   │   └── search.component.css
    │   │   ├── services/
    │   │   │   └── search.service.ts
    │   │   └── types/
    │   │       └── wiki.types.ts
    │   ├── index.html
    │   ├── main.ts
    │   └── styles.css
    └── proxy.conf.json
```

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/test` | Health check → `{ message, timestamp }` |
| GET | `/api/db-test` | Verificar conexión MySQL |
| POST | `/api/search/history` | Guardar búsqueda → `{term, results_count}` |
| GET | `/api/search/history` | Historial de búsquedas (últimos 50) |
| DELETE | `/api/search/history/{id}` | Eliminar un registro del historial |

---

## Instalación y arranque

### 1. Base de datos

```bash
# Asegúrate de que XAMPP MySQL esté corriendo en localhost:3306
# La BD debe llamarse: prueba_tecnica_daniel_castro

# Ejecutar migraciones (requerido una sola vez)
cd backend
php artisan migrate
```

### 2. Backend

```bash
cd backend
composer install          # Solo la primera vez
php artisan serve         # http://127.0.0.1:8000
```

### 3. Frontend

```bash
cd frontend
npm install               # Solo la primera vez
npm start                 # http://localhost:4200
```

El proxy de desarrollo (`proxy.conf.json`) redirige `/api/*` a `http://127.0.0.1:8000`.

---

## Testing

```bash
cd backend
php artisan test
```

### Tests actuales

| Suite | Archivo | Tests | Qué verifican |
|---|---|---|---|
| Feature | `ExampleTest.php` | 1 | Health check `/api/test` → 200 |
| Feature | `SearchTest.php` | 5 | Validación de término (vacío, espacios, longitud), guardado exitoso, trim |
| Feature | `HistoryTest.php` | 5 | GET historial vacío/lleno, orden DESC, DELETE exitoso, DELETE 404 |
| Unit | `SearchHistoryModelTest.php` | 4 | `UPDATED_AT = null`, fillable, casts datetime/integer |

**Total: 15 tests, 41 assertions**

---

## Arquitectura

### Flujo de búsqueda

```
Usuario escribe término en Angular
    │  (keydown.enter) / (click) Search
    ▼
Angular → fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=messi&...')
    │  searchWikipedia() en search.service.ts — llamada directa desde JavaScript
    │  50 resultados por request, formato JSON
    ▼
Angular → parsea response.query.search → WikiSearchResult[]
    │  Limpia tags HTML de snippets (stripHtml)
    │  Paginación client-side: 10 por página
    ▼
Angular → POST /api/search/history {term, results_count}
    │  Guarda el término y el número de resultados en MySQL
    ▼
Laravel → SearchHistory::create()  (insert-only, prepared statement)
    │
    ▼
Usuario ve resultados paginados + historial
```

### Llamada directa a Wikipedia (JavaScript)

La llamada se hace desde `search.service.ts:searchWikipedia()`:

```typescript
const params = new HttpParams()
  .set('action', 'query')
  .set('list', 'search')
  .set('srsearch', term)
  .set('srlimit', '50')
  .set('format', 'json')
  .set('origin', '*');

this.http.get<WikipediaApiResponse>('https://en.wikipedia.org/w/api.php', { params });
```
