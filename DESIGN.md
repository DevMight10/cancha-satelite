# Sistema de diseño: "Marcador de cancha"

La cancha tiene un solo tablero de verdad: el **marcador de turnos**. Todo el sistema sale de ahí:
césped profundo, líneas de cal blancas y los horarios en dígitos ámbar de estadio.
Fuente de los tokens: `frontend/assets/css/app.css` (`:root`). Dirección y razones: `docs/diseno/direccion.md`.

## Modos por superficie

| Superficie | Modo | Criterio |
|---|---|---|
| Inicio público | Persuade | El marcador real de hoy en la portada: se demuestra, no se promete. |
| Reservar, pagar, mis reservas, login | Operate | La tarea manda; el marcador y el ticket son la identidad. |
| Administración | Operate | Denso y restringido; el verde solo marca acciones y estados. |

## Color

| Token | Valor | Uso |
|---|---|---|
| `--tablero` | `#07140d` | Cabecera, marcador, ticket, navegación activa |
| `--tablero-celda` / `--tablero-linea` | `#0f2219` / `#1d3328` | Celdas y divisiones del marcador |
| `--led` | `#ffb23f` | Dígitos de turnos libres, turno elegido, acento sobre oscuro, CTA principal en portada |
| `--cesped-500` | `#15803d` | Acción primaria (botones), barras de gráficos |
| `--cesped-800` / `#0d4229` | | Franjas de corte del césped (fondos de portada, login, cierre) |
| `--cal` | `#f4f6ee` | Líneas de cancha y texto sobre oscuro |
| `--fondo` / `--superficie` / `--superficie-2` | `#f3f4ef` / `#fff` / `#e9ece3` | Fondo de la app, paneles, segundo nivel |
| `--tinta` / `--tinta-2` / `--tinta-3` | `#0f1a14` / `#37443c` / `#56625a` | Texto principal, secundario, atenuado (≥ 4.5:1 sobre blanco) |

**Estados (siempre con texto, nunca solo color):** pendiente de pago = ámbar (`--led-suave`/`--led-texto`),
en revisión = azul (`--azul`), confirmada/aprobado = verde (`--cesped-100`/`--cesped-700`),
cancelada/rechazado = rojo tarjeta (`--rojo-suave`/`--rojo-texto`), vencida = gris.

**Escala secuencial** (vista previa de precios y mapa de horarios): `#d9efe0 → #9fd3b0 → #22a355 → #14532d`,
un solo tono de claro a oscuro, con el número siempre escrito en la celda.

## Tipografía

- **Big Shoulders Display** (700–900): títulos en mayúsculas, dígitos del marcador y del ticket, montos grandes. Números tabulares.
- **Barlow** (400–700): toda la interfaz, formularios, tablas y textos.
- Escala: 13 · 14 · 16 · 18 · 22 · 28 · 40 px; portada con `clamp(3rem, 8vw, 5.75rem)`.

## Forma y espacio

- Espaciado: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px.
- Radios: 4 px (chips internos), 6 px (controles), 10 px (paneles, marcador, ticket).
- Bordes de 2 px en controles, como líneas de cal. Sombras con desplazamiento y desenfoque suave (`--sombra-1`, `--sombra-2`).
- Objetivos táctiles de 44 px como mínimo; foco visible (verde sobre claro, ámbar sobre oscuro).

## Componentes

| Componente | Archivo | Notas |
|---|---|---|
| Marcador de turnos | `js/components/marcador.js` | Libre = dígitos ámbar · ocupado = apagado y rayado · elegido = celda ámbar encendida |
| Tira de días | `js/components/tiraDias.js` | Días con cantidad de turnos libres; el elegido en tablero |
| Ticket de reserva | `js/components/ticket.js` | Tablero con muescas laterales, hora grande en ámbar |
| Cabecera | `js/components/cabecera.js` | Logo de cancha vista desde arriba; menú plegable en celular |
| Botones | `.btn` + `-primario`, `-led`, `-peligro`, `-fantasma`, `-contorno-claro`, `-sm`, `.cargando` | Estado de carga con spinner, sin cambiar el ancho |
| Formularios | `.campo`, `.control`, `.error-campo` | Error junto al campo, aviso general arriba si no hay campo |
| Chips de estado | `.chip-<estado>` | Punto + texto en mayúsculas |
| Diálogo | `js/components/dialogo.js` | `<dialog>` nativo, con motivo opcional u obligatorio |
| Toast | `js/components/toast.js` | Región `aria-live`, abajo al centro |
| Administración | `assets/css/admin.css` | Barra lateral (escritorio) o deslizable (celular), agenda, grilla semanal, bandeja de pagos |
| Gráficos | `js/pages/admin/reportes.js` | Columnas de una serie (≤ 24 px, extremo redondeado de 4 px), grilla de 1 px, tooltip por barra y tabla alternativa |

## Movimiento

Transiciones de 160 ms (`--transicion`), solo para estados: hover, turno elegido, toasts.
Sin animaciones de entrada. Con `prefers-reduced-motion` todo se desactiva.

## Reglas que no se rompen

- Nada de emojis como iconos: siempre Lucide, con un solo trazo y peso.
- Nada de texto con degradado, bordes laterales de color en tarjetas ni "eyebrows" sobre los títulos.
- El texto del servidor se inserta siempre escapado (`html\`\``).
- Sin scroll horizontal a 390 px; las tablas se desplazan dentro de su caja.
