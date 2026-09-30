import { $$, html, pintar } from '../utils/dom.js';
import { dinero, hora } from '../utils/formato.js';

// Línea de tiempo del día: cada turno es un bloque.
// Libre = verde claro con precio · ocupado = rayado · elegido = negro.
// En celular (CSS) la línea se vuelve vertical, como una agenda.

const DETALLE = { ocupado: 'Ocupado', pasado: 'Ya pasó' };

export const FRANJAS = {
  todo: { texto: 'Todo el día', desde: '00:00', hasta: '24:00' },
  manana: { texto: 'Mañana', desde: '00:00', hasta: '12:00' },
  tarde: { texto: 'Tarde', desde: '12:00', hasta: '18:00' },
  noche: { texto: 'Noche', desde: '18:00', hasta: '24:00' },
};

const enFranja = (turno, franja) => {
  const f = FRANJAS[franja] ?? FRANJAS.todo;
  return hora(turno.hora_inicio) >= f.desde && hora(turno.hora_inicio) < f.hasta;
};

export function marcadorCargando(contenedor) {
  pintar(contenedor, html`<div class="pista" aria-busy="true">${Array.from({ length: 12 }, () => html`<div class="esqueleto"></div>`)}</div>`);
}

/**
 * @param {object} dia       respuesta de /disponibilidad
 * @param {object} opciones  { seleccion, alSeleccionar(turno), franja, leyenda }
 */
export function renderMarcador(contenedor, dia, { seleccion = null, alSeleccionar = null, franja = 'todo', leyenda = true } = {}) {
  if (!dia.abierto) {
    pintar(contenedor, html`<div class="marcador-mensaje"><i data-lucide="calendar-x-2"></i>
      <strong>Cerrado</strong><span>${dia.motivo ?? 'La cancha no atiende este día.'}</span></div>`);
    return;
  }
  if (!dia.turnos.length) {
    pintar(contenedor, html`<div class="marcador-mensaje"><i data-lucide="calendar-x-2"></i>
      <strong>Sin turnos</strong><span>No hay turnos disponibles este día.</span></div>`);
    return;
  }

  const libres = dia.turnos.filter((t) => t.estado === 'libre').length;
  pintar(contenedor, html`
    ${libres === 0 ? html`<div class="aviso aviso-advertencia aviso-marcador"><i data-lucide="flag"></i><span>Día completo: todos los horarios ya están reservados. Prueba con otro día.</span></div>` : ''}
    <div class="pista" role="group" aria-label="Horarios del día">
      ${dia.turnos.map((t) => {
        const libre = t.estado === 'libre';
        return html`
          <button type="button" class="turno ${t.estado} ${enFranja(t, franja) ? '' : 'fuera-de-franja'}" data-hora="${t.hora_inicio}"
            ${libre ? '' : 'disabled'} aria-pressed="${t.hora_inicio === seleccion}"
            aria-label="${hora(t.hora_inicio)} a ${hora(t.hora_fin)}, ${libre ? `libre, ${dinero(t.precio)}` : DETALLE[t.estado]}">
            <span class="turno-hora">${hora(t.hora_inicio)}</span>
            <span class="turno-detalle">${libre ? dinero(t.precio) : DETALLE[t.estado]}</span>
          </button>`;
      })}
    </div>
    ${leyenda ? html`<div class="leyenda" aria-hidden="true"><span><i class="l-libre"></i>Libre</span><span><i class="l-ocupado"></i>Ocupado</span><span><i class="l-elegido"></i>Tu elección</span></div>` : ''}`);

  // Llevar a la vista el turno elegido o el primero libre (útil cuando la línea se desplaza)
  const foco = contenedor.querySelector('.turno[aria-pressed="true"]') ?? contenedor.querySelector('.turno.libre:not(.fuera-de-franja)');
  const pista = contenedor.querySelector('.pista');
  if (foco && pista.scrollWidth > pista.clientWidth) pista.scrollLeft = foco.offsetLeft - pista.offsetLeft - 8;

  if (!alSeleccionar) return;
  $$('.turno', contenedor).forEach((boton) => {
    boton.addEventListener('click', () => {
      $$('.turno', contenedor).forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
      alSeleccionar(dia.turnos.find((t) => t.hora_inicio === boton.dataset.hora));
    });
  });
}
