# Dirección visual: "Marcador de cancha"

Documento de desarrollo (no se sirve al navegador). Fuente: skills UI UX Pro Max (design system "sports", patrón hero + CTA fijo) e Impeccable (new-work, craft-floor, operate).

## Superficies y modo

| Superficie | Modo | Nota |
|---|---|---|
| Inicio público | Persuade | Mostrar la disponibilidad REAL de hoy en el marcador (probar, no prometer). |
| Reservar, pagar, mis reservas, login | Operate | La tarea manda; el marcador es el componente firma. |
| Panel del administrador | Operate | Denso, restringido, verde solo para acciones y estados. |

## Direction contract

THESIS: la cancha tiene un solo tablero de verdad: el marcador de turnos. Todo el sistema gira en torno a él. Rechaza el "calendario de citas" azul genérico y las tarjetas iguales con iconos.

OWN-WORLD: césped profundo (#0B3B24 → #14532D), líneas de cal (#F4F6EE), tablero negro-verdoso (#07140D) con dígitos ámbar LED (#FFB23F); acciones en verde cancha (#15803D); estados: libre = cal/verde, ocupado = tablero apagado, pendiente = ámbar, cancelado = rojo tarjeta (#DC2626). Tipografía: Big Shoulders Display (títulos y dígitos del marcador, tabulares) + Barlow (interfaz). Bordes de 2px como líneas de cal, radios pequeños (6px), sombras suaves con desplazamiento.

STORY: el jugador ve de inmediato qué horas quedan libres hoy y cuánto cuestan, toca una, confirma y paga con QR; el administrador ve el mismo tablero con nombres y cobra.

FIRST VIEWPORT (inicio): fondo césped con franjas de corte y el círculo central en líneas de cal; a la izquierda "Reservá tu hora" + botón Reservar; a la derecha el marcador con los turnos de hoy en vivo (LIBRE/OCUPADO, precio). En celular el marcador queda debajo del título y visible sin scroll.

FORM: tablero de estadio (scoreboard) como lenguaje de datos; líneas de cancha como divisores. Seed: n/a (launcher de impeccable no ejecutado; dirección elegida por el usuario en ronda de preguntas).

Interacción firma: al elegir un turno, la celda del marcador se "enciende" (ámbar LED) y el resumen de la reserva se arma al lado/abajo con el precio.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
