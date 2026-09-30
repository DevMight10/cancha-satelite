# Sistema de diseño: Propuesta B "La cancha al centro"

Elegida por el usuario entre tres propuestas con estructura distinta (`frontend/propuestas/`).
Tokens: `frontend/assets/css/app.css` (`:root`) · administración: `assets/css/admin.css` · portada: `assets/css/inicio.css`.

## Idea

La cancha es la imagen de marca (ilustración del campo visto desde arriba en portada, login, ticket y detalle)
y el día se muestra como una **línea de tiempo**: cada turno es un bloque. Tono deportivo, pero de app de reservas.

## Estructura por pantalla

| Pantalla | Estructura |
|---|---|
| Inicio | Cancha a pantalla completa con buscador de turnos encima (día, horario, duración) → "Hoy en la cancha" con la línea de tiempo en vivo → cómo reservar → precios sobre negro → reglas y contacto → franja verde final |
| Reservar | Un solo panel: **calendario del mes** a la izquierda (punto verde = días con horarios libres; cerrados o completos tachados) y a la derecha los **horarios del día agrupados en Mañana / Tarde / Noche** con su precio; el resumen (fecha, hora, precio y botón Confirmar) cierra el panel, sin barras fijas en escritorio |
| Celular | Calendario arriba y horarios debajo en 3 columnas; al elegir un día baja a sus horarios. Solo con un horario elegido aparece una barra blanca fija abajo con precio y botón |
| Login / registro | Pantalla dividida: la cancha a la izquierda, el formulario a la derecha |
| Pagar | Ticket con la cancha arriba y los datos sobre negro; pasos numerados para pagar y enviar el comprobante |
| Administración | Barra negra con secciones en píldora; **cronograma semanal** (una fila por día, cada reserva es un bloque con el nombre del cliente, los espacios libres registran una presencial) y agenda del día elegido |

## Color

| Token | Valor | Uso |
|---|---|---|
| `--negro` | `#0B0D0C` | Cabecera, día y horario elegidos, ticket, pestaña activa, precios |
| `--cesped-vivo` | `#22C55E` | Acción principal (texto negro), horas en el ticket, acentos sobre negro |
| `--cesped` / `--cesped-2` / `--cesped-3` | `#1F8A3B` / `#197331` / `#123D22` | Ilustración de la cancha, reservas confirmadas, gráficos |
| `--cesped-claro` / `--cesped-texto` | `#E3F6E8` / `#145C2A` | Turno libre |
| `--rayado` | gris rayado | Turno ocupado o día cerrado |
| Blanco y grises `--gris-1…8` | | Fondo, superficies, texto secundario |

Estados (chip + texto): pendiente = ámbar · en revisión = azul · confirmada = verde · cancelada = rojo · vencida = gris.
Escala secuencial (precios y mapa de horarios): verde claro → verde medio → césped → negro.

## Tipografía y forma

- **Rubik** (400–800) en todo; títulos en 800 con tracking negativo.
- Botones en **píldora**; radios de 10 · 14 · 22 px; objetivos táctiles ≥ 44 px; foco verde de 3 px.

## Componentes

`js/components/cancha.js` (ilustraciones y logo) · `marcador.js` (línea de tiempo de la portada) ·
`calendario.js` (mes con días disponibles) · `horarios.js` (turnos agrupados por franja) ·
`ticket.js` · `cabecera.js` · `dialogo.js` · `toast.js` · `formulario.js` · `core/admin.js` (barra de secciones).

## Reglas

Iconos solo de Lucide · texto del servidor siempre escapado · sin scroll horizontal a 390 px ·
transiciones de estado de 180 ms y `prefers-reduced-motion` respetado.
