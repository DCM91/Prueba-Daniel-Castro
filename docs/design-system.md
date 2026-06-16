# Sistema de diseño visual

> Última revisión: Fase 4 (catálogo público de freelancers). La estética es **oscura con acentos vibrantes** (morado + celeste). Cuando un componente nuevo no encaje con estas reglas, lo actualizamos aquí primero.

## Principios

1. **Fondo oscuro, acentos vibrantes.** Toda la app vive en `#0f0f12`. Los acentos (morado `#7c3aed`, celeste `#67e8f9`) atraen la mirada sin cansar.
2. **Un acento por contexto.** Cada color de acento significa algo: morado = primario/acción, celeste = informativo/secundario, verde = éxito/disponible, ámbar = advertencia, rojo = error, rosa = especial.
3. **Espaciado generoso.** Padding interior 16-24px en cards, 32-48px entre secciones, 80px en heroes.
4. **Bordes sutiles, sombras suaves.** `rgba(255,255,255,0.08)` para bordes, sin `box-shadow` agresivas.
5. **Texto en jerarquía.** Títulos blancos, cuerpo `#d4d4d8`, metadata `#a1a1aa`, hints `#71717a`.

## Paleta de colores

### Superficies (fondo)

| Token | Hex | Uso |
|---|---|---|
| `--bg-page` | `#0f0f12` | Fondo de página (body) |
| `--bg-card` | `#18181b` | Cards, paneles, inputs |
| `--bg-elevated` | `#1f1f23` | Hover sobre cards |
| `--bg-overlay` | `rgba(15,15,18,0.85)` | Topbar sticky con backdrop-blur |

### Acentos

| Token | Hex | Significado |
|---|---|---|
| `--accent-primary` | `#7c3aed` | Morado. Acciones primarias, CTAs, marca. |
| `--accent-primary-hover` | `#6d28d9` | Hover del primario. |
| `--accent-secondary` | `#6366f1` | Índigo. Degradado con el primario. |
| `--accent-info` | `#67e8f9` | Celeste. Informativo, links, gradientes. |
| `--accent-success` | `#6ee7b7` | Verde. "Disponible", tarifa, success chips. |
| `--accent-warning` | `#fcd34d` | Ámbar. Reseñas, ratings. |
| `--accent-danger` | `#f87171` | Rojo. Errores, validaciones. |
| `--accent-special` | `#f9a8d4` | Rosa. Categoría "Edición" en home cliente. |

**Degradado de marca:** `linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)` (botones primarios).
**Degradado de texto:** `linear-gradient(135deg, #f4f4f5 0%, #c4b5fd 60%, #67e8f9 100%)` (h1 de los heroes).
**Degradado morado→celeste:** `linear-gradient(135deg, #7c3aed 0%, #67e8f9 100%)` (logo de la marca, círculos de progreso).

### Texto

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#f4f4f5` | Títulos, valores, texto principal |
| `--text-secondary` | `#d4d4d8` | Texto del cuerpo, labels |
| `--text-muted` | `#a1a1aa` | Subtítulos, metadata, descripciones |
| `--text-hint` | `#71717a` | Hints, placeholders, footer |
| `--text-on-primary` | `#ffffff` | Texto sobre fondos primarios |

### Bordes y separadores

| Token | Hex / rgba | Uso |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.08)` | Borde por defecto de cards |
| `--border-strong` | `rgba(255,255,255,0.16)` | Hover de cards, dividers en topbar |
| `--border-input` | `rgba(255,255,255,0.14)` | Borde de inputs |
| `--border-input-focus` | `rgba(124,58,237,0.6)` | Borde de input focused |

## Tipografía

- **Familia:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (system stack, sin webfonts por ahora).
- **Pesos:** 400 (cuerpo), 600 (botones, labels), 700 (títulos, valores).
- **Escala (clamp cuando aplica):**

| Token | Tamaño | Uso |
|---|---|---|
| `text-xs` | 11px | Letter-spacing 0.08em, uppercase (badges, pills) |
| `text-sm` | 12-13px | Metadata, hints, chips, botones secundarios |
| `text-base` | 14-15px | Cuerpo, labels, inputs, botones |
| `text-md` | 16-17px | Lead / subtítulos importantes |
| `text-lg` | 18-20px | Títulos de card |
| `text-xl` | 22-24px | Títulos de card grandes, valores de stat |
| `text-2xl` | 28px | Títulos de sección |
| `text-3xl` | 34-38px | H1 de hero secundario |
| `text-4xl` | 52px (clamp) | H1 de hero principal |

## Espaciado

Escala base 4px:

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4px | Gaps mínimos, separación icono-texto |
| `space-2` | 8px | Gaps entre iconos en listas |
| `space-3` | 12px | Padding horizontal de chips, gap en flex |
| `space-4` | 16px | Padding de inputs y botones |
| `space-5` | 20-22px | Padding interior de cards pequeñas |
| `space-6` | 24px | Padding interior de cards medianas, secciones |
| `space-7` | 32px | Padding de cards grandes, padding horizontal de topbar |
| `space-8` | 40-48px | Separación entre secciones |
| `space-9` | 56-64px | Padding vertical de secciones |
| `space-10` | 80-96px | Padding vertical de heroes |

## Radios

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8px | Botones pequeños, inputs, chips |
| `radius-md` | 10-12px | Botones medianos, cards pequeñas |
| `radius-lg` | 14-16px | Cards, avatares grandes, topbar (border) |
| `radius-xl` | 18px | Cards de sección, modales |
| `radius-full` | 9999px (50% para círculos) | Pills, badges, avatares circulares |

## Sombras y elevaciones

Por ahora **no usamos `box-shadow` pesadas**. La elevación viene dada por:
- Cambio de `background` (de `#18181b` a `#1f1f23` en hover).
- Borde que sube de opacidad (`0.08` → `0.16`).
- `transform: translateY(-1px a -3px)` en hover sobre cards.

Excepciones donde sí usamos sombra:
- Botones primarios en hover: `box-shadow: 0 6px 18px -6px rgba(124, 58, 237, 0.6)` (sutil morada).
- Topbar sticky: `backdrop-filter: blur(12px)` sobre `rgba(15,15,18,0.85)`.

## Estados interactivos

| Estado | Cómo se indica |
|---|---|
| **Default** | Borde `0.08`, fondo `0.03-0.04` de blanco. |
| **Hover** (cards) | `transform: translateY(-2px a -3px)`, borde `0.16`, fondo `0.05`. |
| **Hover** (botones primarios) | Fondo oscurece 10%, `translateY(-1px)`, sombra morada. |
| **Hover** (botones secundarios) | Fondo `0.08`, sin transform. |
| **Active / pressed** | `translateY(0)`, sombra más sutil. |
| **Focus** (inputs) | Borde `rgba(124,58,237,0.6)`, `box-shadow: 0 0 0 4px rgba(124,58,237,0.15)`. |
| **Disabled** | `opacity: 0.6`, `cursor: not-allowed`. |
| **Selected** (chips) | Fondo `rgba(124,58,237,0.18)`, borde `0.5` morado, texto `#c4b5fd`. |
| **Error** | Texto `#f87171`, fondo del banner `rgba(248,113,113,0.12)`, borde `rgba(248,113,113,0.3)`. |
| **Loading** (botón) | Texto cambia a gerundio ("Entrando…"), `opacity: 0.6`. |

## Catálogo de componentes (resumen visual)

| Componente | Apariencia | Notas |
|---|---|---|
| **Botón primario** | `background: linear-gradient(135deg, #7c3aed, #6366f1)`, texto blanco, `border-radius: 10px`, padding `12px 22px`. Hover: `translateY(-1px)` + sombra morada. | Usado para CTAs principales (login, register, completar perfil). |
| **Botón secundario** | Borde `1px solid rgba(255,255,255,0.16)`, fondo transparente, texto blanco, mismo radius/padding. Hover: fondo `rgba(255,255,255,0.08)`. | Cancelar, "Ver perfil" (deshabilitado en Fase 2). |
| **Botón de peligro** | Borde `1px solid rgba(248,113,113,0.4)`, texto `#f87171`. | Borrar cuenta (futuro). |
| **Input de texto** | Fondo `#0f0f12`, borde `0.14`, radius `8px`, padding `11px 12px`. Focus: borde morado + ring. | Usado en login, register. |
| **Card** | Fondo `rgba(255,255,255,0.03)`, borde `0.08`, radius `14-16px`, padding `20-28px`. Hover: elevación descrita arriba. | Categorías, freelancers destacados, stats, tips. |
| **Freelancer card** (Fase 4) | Card con avatar 44×44 (iniciales + gradiente morado→índigo), `display_name` + ciudad, badge Disponible/Ocupado, bloque de tarifa (verde, "Consultar" si null), chips de top-3 skills, footer con "N skills · X% completo". Toda la card es un `<a>` router-link al detalle. Hover: elevación + borde 0.18. | Compartido por `ClientHomeComponent` (destacados) y `FreelancerListComponent`. |
| **Chip** | Borde `0.12`, fondo `0.04`, texto `#d4d4d8`, padding `7px 14px`, radius `9999px`. Hover: fondo `0.08`. Active: morado translúcido. | Filtros rápidos en home cliente. |
| **Pill / Badge** | Padding `3-4px 9-10px`, radius `9999px`, font-size 10-11px, `text-transform: uppercase`, `letter-spacing: 0.08em`. | "Modo freelancer", role pills. |
| **Avatar circular** | Diámetro 36-72px según contexto, fondo `linear-gradient(135deg, #7c3aed, #6366f1)` o `linear-gradient(135deg, hsl(H,70%,55%), hsl(H+30,70%,45%))` para avatares variados. Texto blanco, font-weight 700. | Iniciales del usuario. |
| **Meta chip** | Padding `4px 12px`, radius `9999px`, font-size 12px. Variantes: `--accent-success` (tarifa), `--accent-primary` (skill), borde dashed + texto hint (vacío). | Tags de precio y skill en escaparate freelancer. |
| **Stat card** | Card base + icono 40×40 con fondo `rgba(124,58,237,0.15)` y color `#c4b5fd`. Tres líneas: valor (22px 700), label (13px), hint (11px `#71717a`). | Stats del freelancer home. |
| **Progress circle (SVG)** | SVG 96×96, `stroke-dasharray` y `stroke-dashoffset` calculados con `2π·r · (1 - pct/100)`. Gradiente `linear-gradient` morado→celeste. `stroke-linecap: round`. Texto del % centrado. | Card de "Completa tu perfil". |
| **Step number (cómo funciona)** | Círculo 36×36 con fondo `linear-gradient(135deg, #7c3aed, #6366f1)`, texto blanco 15px 700. | Sección "Cómo funciona". |
| **Filter bar (Fase 4)** | Grid `auto-fit minmax(180px, 1fr)` con inputs (text/search/select/number) y grupo de botones (Aplicar / Limpiar). Mismo `card` base que las cards. | Filtros del catálogo público en `/freelancers`. |
| **Pagination** | Fila centrada con `← Anterior` / `Siguiente →` como botones `--ghost` y label "Pagina X de Y" entre ellos. | Pie del catálogo. |
| **Skill row (Fase 4)** | Fila con `skill-name` (peso 600), pill de categoría (color por categoría: photo=morado, video=celeste, edit=rosa, content=amber), `skill-level` (uppercase), `skill-yrs` (alineado a la derecha). | Lista de skills en el detalle del freelancer. |
| **Botón OAuth (Fase 5.3)** | Borde `1px solid rgba(0,0,0,0.12)` (Google) o `border-color: #1877F2` (Facebook), fondo blanco (Google) o `#1877F2` (Facebook), texto `#18181b` (Google) o `#fff` (Facebook), padding `11px 16px`, radius `10px`. Logo SVG inline del provider a la izquierda (18×18px), label a la derecha, gap `10px`. Full-width en login/register, separado del form por un divider "o". Hover: ligero `box-shadow`. | Login y Register como alternativa al email+password. |
| **AvatarUploader (Fase 5.5.A)** | Card con `border-radius: 16px`, fondo `rgba(255,255,255,0.02)`, padding `28px 20px`. Vista previa circular `128×128` con gradiente morado→índigo (`#7c3aed` → `#6366f1`) de fallback, borde `2px solid rgba(255,255,255,0.16)`. Drop zone con borde `2px dashed rgba(255,255,255,0.18)`, padding `20px 16px`, ícono cloud-arrow-up `32×32` en color `--accent-info` (`#67e8f9`), texto en blanco, hint de tamaño/formatos en `--text-muted` (`#a1a1aa`). Hover/dragover: borde `rgba(124,58,237,0.6)`, fondo `rgba(124,58,237,0.06)`. Focus visible: ring morado `0 0 0 4px rgba(124,58,237,0.18)`. Spinner de subida con borde `3px solid rgba(255,255,255,0.18)` + `border-top-color: #67e8f9`. Status bar de error en rojo `rgba(248,113,113,0.08)` o success verde `rgba(110,231,183,0.08)`. Botón "Eliminar foto" borde `1px solid rgba(248,113,113,0.4)`, texto `#f87171`. Animaciones de `0.15s ease`, respetando `prefers-reduced-motion`. | Subida de foto de perfil en `ProfileEditorComponent`. Accesible: `role="button"` + `tabindex="0"` + `aria-label` + `aria-disabled` + `aria-live="polite"` en el spinner. |
| **CoverUploader (Fase 5.5.B)** | Vista previa rectangular `aspect-ratio: 16/5` (full-width), `border-radius: 14px`, fondo gradiente morado→celeste translúcido. Borde `2px dashed rgba(255,255,255,0.18)` (estado vacío) que pasa a `1px solid transparent` cuando hay imagen. Fallback con ícono `image-rectangle` 32×32 en `#67e8f9` y texto "Subir portada". Drag-over: borde `rgba(124,58,237,0.8)` + fondo `rgba(124,58,237,0.1)` + `scale(1.005)`. Botón "Eliminar portada" abajo a la derecha. Mismo spinner y status bar que AvatarUploader. | Subida de portada en `ProfileEditorComponent`. Accesible: `role="button"` + `tabindex="0"` + `aria-label` + `aria-disabled`. |
| **PortfolioEditor (Fase 5.5.B)** | Página dedicada `/freelancer/portfolio`. Hero con drop-zone + form (título/descripción) + botón "Añadir trabajo". Grid de items con `auto-fill minmax(240px, 1fr)`. Cada item: thumb `4:3` clickable (abre lightbox), inputs inline para título/descripción, botones de reorder (↑/↓) y delete. Empty state con ícono `image-grid` 48×48 + título "Aún no has subido trabajo" + body invitador. Status bar arriba (success/error) con `aria-live`. Contador "X / 30" en la drop-zone. | Gestión completa del portfolio del freelancer. Accesible: reorder por teclado (los botones ↑/↓ son reales, no solo drag), inline editing con `change` (no `input`) para no saturar el backend. |
| **Lightbox (Fase 5.5.B)** | Overlay `position: fixed; inset: 0; z-index: 100` con fondo `rgba(15,15,18,0.92)` + `backdrop-filter: blur(8px)`. Imagen centrada con `max-width: min(90vw, 1200px)` + `max-height: 80vh` + `object-fit: contain`. Botones de navegación circulares 48×48 a izquierda/derecha con SVG chevron. Botón cerrar (X) 44×44 top-right. Caption con título + descripción debajo de la imagen. Contador "X / Y" bottom-center con `aria-live="polite"`. Animación de entrada `fade 0.2s ease` (fade + scale 0.96→1), respetando `prefers-reduced-motion: reduce`. | Visor de imágenes para portfolios en `FreelancerDetailComponent` y `PortfolioEditorComponent`. Accesible: `role="dialog"` + `aria-modal="true"` + `aria-label`, focus trap en el primer botón al abrir, `Escape` cierra, `←/→` navega, foco se restaura al elemento que abrió el lightbox al cerrar. |
| **CoreTopbar (Fase 5.4)** | 4 variants: `public`, `auth`, `client`, `freelancer`. Padding `18px 32px` desktop / `14px 18px` mobile. Sticky + `backdrop-filter: blur(12px)` + `z-index: 10` en public/client/freelancer; sin sticky en auth. Border-bottom `1px solid rgba(255,255,255,0.06)`. Brand: `<app-brand-logo brandSize="md">` con aria-label dinámico (`'app.brand' + ', ' + 'topbar.go_home'`). Nav links por variant: `client` = Inicio + Profesionales + Briefs, `freelancer` = Inicio + Mi perfil. Color `#a1a1aa` → `#f4f4f5` en hover. Back-link opcional (botón con border `1px solid rgba(255,255,255,0.16)`). User area condicional: name + role-pill (client) o name + avatar con iniciales (freelancer) + botón logout. Responsive: `@media (max-width:720px)` colapsa nav a 2ª fila + oculta user-name; `@media (max-width:420px)` oculta logout + role-pill + back. | Header global de TODAS las páginas autenticadas y públicas (excepto `LandingComponent` y `BriefListComponent` que mantienen su topbar propio por sus anchors in-page y sus scope tabs). |

## Iconografía

- **Inline SVG** dentro de cada componente (no librería de iconos externa aún).
- Estilo: `stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`.
- Tamaño: 18-22px en cards, 20-24px en stats.
- Color: `currentColor` (lo pinta el padre) o un `--accent-*` específico.

**Iconos actuales en uso:**
- `camera`, `video`, `spark`, `megaphone`, `drone`, `motion`, `palette` (categorías home cliente)
- `eye`, `mail`, `brief`, `star` (stats home freelancer)
- `upload`, `bolt`, `tag` (tips home freelancer)
- Logo Google 4-colores oficial + logo Facebook (Fase 5.3, OAuth)
- `🔍` (emoji en el search bar — pragmático)

## Layouts y grid

- **Topbar sticky:** flex, `position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px)`.
- **Hero:** padding vertical 80px, contenedor interno `max-width: 820px` centrado, texto centrado.
- **Sections:** `max-width: 1100px` (o 980px en home freelancer), padding horizontal `24px`, vertical `56-72px`.
- **Grid responsive:** `grid-template-columns: repeat(auto-fit, minmax(220-260px, 1fr))` con `gap: 14-16px`.
- **Breakpoints implícitos:** el `auto-fit` se adapta solo. Para 2 columnas explícitas, `minmax(240px, 1fr)` o `minmax(260px, 1fr)`.

## Accesibilidad (a mejorar en próximas fases)

- **Contraste:** texto `#f4f4f5` sobre `#0f0f12` → ratio 18:1 (AAA). Texto `#a1a1aa` sobre `#0f0f12` → 7.6:1 (AAA para texto grande). Texto `#71717a` sobre `#0f0f12` → 4.6:1 (AA para texto grande, falla para texto pequeño — usar con cuidado).
- **Foco visible:** los inputs tienen ring morado. Falta extenderlo a botones y links.
- **Roles ARIA:** algunos iconos ya tienen `aria-hidden="true"`. Falta pasar una auditoría completa.
- **Movimiento reducido:** sin animaciones por ahora (todo es `transition: 0.15s ease`). Si se añaden animaciones grandes, respetar `prefers-reduced-motion`.

## Decisiones pendientes / a discutir

- **¿Webfont?** Ahora mismo todo es system stack. Si queremos una identidad más fuerte, Inter o Satoshi serían las candidatas.
- **¿Modo claro?** No por ahora. Si el usuario lo pide, se duplican los tokens.
- **¿Librería de componentes (PrimeNG, Angular Material)?** Explícitamente **no**, para mantener bundle pequeño y look & feel coherente.
- **Ilustraciones custom** para vacíos y errores: futuras, hechas a medida o de un set libre (unDraw, Storyset).
