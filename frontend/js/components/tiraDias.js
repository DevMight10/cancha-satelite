import { $$, html, pintar } from '../utils/dom.js';
import { aFecha, diaCorto, fechaLarga } from '../utils/formato.js';

/**
 * Selector horizontal de días con la cantidad de turnos libres.
 * @param {Array} dias  respuesta de /disponibilidad/dias
 */
export function renderTiraDias(contenedor, dias, seleccionada, alCambiar) {
  pintar(contenedor, html`${dias.map((d, i) => {
    const etiqueta = i === 0 ? 'hoy' : diaCorto(d.fecha);
    const estado = !d.abierto ? 'Cerrado' : d.libres === 0 ? 'Completo' : `${d.libres} libres`;
    return html`
      <button type="button" class="dia ${d.abierto && d.libres ? '' : 'cerrado'}" data-fecha="${d.fecha}"
        aria-pressed="${d.fecha === seleccionada}" aria-label="${fechaLarga(d.fecha)}, ${estado}">
        <span class="dia-nombre">${etiqueta}</span>
        <span class="dia-numero">${aFecha(d.fecha).getDate()}</span>
        <span class="dia-mes">${estado}</span>
      </button>`;
  })}`);

  $$('.dia', contenedor).forEach((boton) => {
    boton.addEventListener('click', () => {
      $$('.dia', contenedor).forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
      alCambiar(boton.dataset.fecha);
    });
  });

  contenedor.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
