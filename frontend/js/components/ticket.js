import { html } from '../utils/dom.js';
import { ESTADOS_RESERVA, dinero, fechaLarga, hora } from '../utils/formato.js';

/** Ticket de la reserva con la estética del tablero. */
export function ticketReserva(r) {
  return html`
    <article class="ticket" aria-label="Reserva número ${r.id}">
      <div class="ticket-cabecera">
        <span class="ticket-codigo">Reserva #${r.id}</span>
        <span class="chip chip-${r.estado}">${ESTADOS_RESERVA[r.estado] ?? r.estado}</span>
      </div>
      <p class="ticket-fecha">${fechaLarga(r.fecha)}</p>
      <p class="ticket-hora num">${hora(r.hora_inicio)}<span>–</span>${hora(r.hora_fin)}</p>
      <div class="ticket-pie">
        <span>${r.cliente_nombre}</span>
        <strong class="num">${dinero(r.precio)}</strong>
      </div>
    </article>`;
}
