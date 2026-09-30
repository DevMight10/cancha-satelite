import { $$, html, pintar } from '../utils/dom.js';
import { dinero, hora } from '../utils/formato.js';

// Horarios de un día agrupados en Mañana / Tarde / Noche, como botones compactos con su precio.
// Libre = verde claro · ocupado o pasado = rayado y deshabilitado · elegido = negro.

export const GRUPOS = [
  { clave: 'manana', texto: 'Mañana', icono: 'sunrise', desde: '00:00', hasta: '12:00' },
  { clave: 'tarde', texto: 'Tarde', icono: 'sun', desde: '12:00', hasta: '18:00' },
  { clave: 'noche', texto: 'Noche', icono: 'moon', desde: '18:00', hasta: '24:00' },
];

const DETALLE = { ocupado: 'Ocupado', pasado: 'Ya pasó' };

export function horariosCargando(contenedor) {
  pintar(contenedor, html`<div class="horarios-grupo"><div class="horarios-grilla">
    ${Array.from({ length: 8 }, () => html`<div class="esqueleto horario-cargando"></div>`)}</div></div>`);
}

/**
 * @param {object} dia       respuesta de /disponibilidad
 * @param {object} opciones  { seleccion, alSeleccionar(turno) }
 */
export function renderHorarios(contenedor, dia, { seleccion = null, alSeleccionar } = {}) {
  if (!dia.abierto || !dia.turnos.length) {
    pintar(contenedor, html`<div class="horarios-vacio"><i data-lucide="calendar-x-2"></i>
      <strong>${dia.abierto ? 'Sin turnos' : 'Cerrado'}</strong><span>${dia.motivo ?? 'No hay turnos este día.'}</span></div>`);
    return;
  }

  const grupos = GRUPOS
    .map((g) => ({ ...g, turnos: dia.turnos.filter((t) => hora(t.hora_inicio) >= g.desde && hora(t.hora_inicio) < g.hasta) }))
    .filter((g) => g.turnos.length);

  pintar(contenedor, html`${grupos.map((g) => {
    const libres = g.turnos.filter((t) => t.estado === 'libre').length;
    return html`
      <section class="horarios-grupo" id="grupo-${g.clave}" aria-label="${g.texto}">
        <h3><i data-lucide="${g.icono}"></i>${g.texto}<small>${libres ? `${libres} ${libres === 1 ? 'libre' : 'libres'}` : 'sin lugar'}</small></h3>
        <div class="horarios-grilla">
          ${g.turnos.map((t) => {
            const libre = t.estado === 'libre';
            return html`
              <button type="button" class="turno ${t.estado}" data-hora="${t.hora_inicio}" ${libre ? '' : 'disabled'}
                aria-pressed="${t.hora_inicio === seleccion}"
                aria-label="${hora(t.hora_inicio)} a ${hora(t.hora_fin)}, ${libre ? `libre, ${dinero(t.precio)}` : DETALLE[t.estado]}">
                <span class="turno-hora">${hora(t.hora_inicio)}</span>
                <span class="turno-detalle">${libre ? dinero(t.precio) : DETALLE[t.estado]}</span>
              </button>`;
          })}
        </div>
      </section>`;
  })}`);

  $$('.turno:not(:disabled)', contenedor).forEach((boton) => boton.addEventListener('click', () => {
    $$('.turno', contenedor).forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    alSeleccionar?.(dia.turnos.find((t) => t.hora_inicio === boton.dataset.hora));
  }));
}
