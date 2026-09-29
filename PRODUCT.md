# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS y JavaScript (módulos ES, sin framework) en el frontend; API REST en PHP 8 sin framework; MySQL 8. Decidido por el equipo del proyecto (bibliografía del perfil: MDN, PHP, MySQL). Entorno local: Laragon. Destino: hosting compartido con PHP y MySQL.

## Users

- **Jugador / cliente:** vecinos y equipos de la zona de Satélite Norte que alquilan la cancha por hora, casi siempre desde el celular y a último momento (tarde/noche), para partidos entre amigos o de equipo.
- **Administrador de la cancha:** la persona que atiende la cancha; controla la agenda del día, cobra, valida pagos digitales y registra reservas presenciales. Trabaja desde un celular o una computadora en el lugar.

## Product Purpose

Reemplazar la reserva y el cobro manual (cuaderno, efectivo, mensajes sueltos) por una plataforma web que centralice reservas y pagos, evite reservas dobles y dé al administrador control y reportes. Éxito: el jugador reserva y paga en minutos sin llamar; el administrador ve toda la agenda y los ingresos en un solo lugar, sin errores.

## Positioning

Es la agenda real de UNA cancha de barrio concreta, con sus horarios, sus precios y sus medios de pago locales (QR Simple interbancario, Tigo Money, transferencia, efectivo), no un marketplace genérico.

## Operating Context

- Turnos de duración fija (por defecto 60 min) dentro del horario de apertura de cada día.
- Precios por franja horaria y día (p. ej. más caro de noche o fin de semana); se aplica la tarifa más alta que corresponda.
- Pago digital con comprobante que el administrador valida manualmente; una reserva sin pago vence a los N minutos y libera el horario.
- Reservas presenciales y cobros en efectivo registrados por el administrador.
- Avisos por correo automáticos; WhatsApp mediante enlaces con mensaje prellenado (la API oficial de WhatsApp es de pago).

## Capabilities and Constraints

- Regla más importante: **nunca dos reservas activas en el mismo horario** (validación en servicio + índice único en BD).
- Moneda: bolivianos (Bs). Zona horaria: America/La_Paz. Idioma: español de Bolivia.
- Teléfonos celulares bolivianos de 8 dígitos (empiezan con 6 o 7).
- Sin datos reales todavía: horarios, precios, número de Tigo Money, cuenta bancaria y QR los carga el administrador. Los datos de ejemplo de la instalación están marcados como tales.

## Brand Commitments

- Nombre: **Cancha Satélite Norte**.
- Dirección visual elegida por el usuario: **"Marcador de cancha"** (césped, líneas de cal, horarios como tablero de estadio).

## Evidence on Hand

- Perfil de proyecto (U.E. Bolivariana Juancito Pinto, 2026). No hay fotos, logo, testimonios ni precios reales: no inventarlos.

## Product Principles

1. Reservar un horario libre debe tomar menos de un minuto desde el celular.
2. El estado de cada horario y de cada reserva siempre es inequívoco (libre, ocupado, pendiente, confirmada).
3. El administrador nunca necesita el cuaderno: todo lo que pasa en la cancha se puede registrar en el sistema.
4. Ninguna regla de negocio vive solo en el frontend: el backend valida todo.

## Accessibility & Inclusion

Uso al aire libre y con poca batería: alto contraste (WCAG AA), objetivos táctiles de 44px, funciona sin animaciones (`prefers-reduced-motion`).
