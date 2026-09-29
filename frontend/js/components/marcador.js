import { $$, html, pintar } from '../utils/dom.js';
import { dinero, fechaRelativa, hora } from '../utils/formato.js';

// Marcador de turnos: el tablero con las horas del día.
// Libre = dígitos ámbar encendidos · ocupado/pasado = apagado · seleccionado = celda encendida.

const DETALLE = { ocupado: 'Ocupado', pasado: 'Ya pasó' };

export function marcadorCargando(contenedor, fecha) {
  pintar(contenedor, html`
    <div class="marcador-cabecera">
      <span class="marcador-fecha">${fecha ? fechaRelativa(fecha) : 'Cargando…'}</span>
    </div>
    <div class="marcador-grilla" aria-busy="true">
      ${Array.from({ length: 10 }, () => html`<div class="esqueleto"></div>`)}
    </div>`);
}

/**
 * @param {HTMLElement} contenedor
 * @param {object} dia       respuesta de /disponibilidad
 * @param {object} opciones  { seleccion: 'HH:MM:SS', alSeleccionar(turno), detalle(turno) }
 */
export function renderMarcador(contenedor, dia, { seleccion = null, alSeleccionar = null, detalle = null } = {}) {
  const cabecera = html`
    <div class="marcador-cabecera">
      <span class="marcador-fecha">${fechaRelativa(dia.fecha)}</span>
      <span class="marcador-leyenda" aria-hidden="true">
        <span><i></i>Libre</span><span><i class="apagado"></i>Ocupado</span>
      </span>
    </div>`;

  if (!dia.abierto) {
    pintar(contenedor, html`${cabecera}
      <div class="marcador-mensaje">
        <i data-lucide="calendar-x-2"></i>
        <strong>Cerrado</strong>
        <span>${dia.motivo ?? 'La cancha no atiende este día.'}</span>
      </div>`);
    return;
  }

  const libres = dia.turnos.filter((t) => t.estado === 'libre').length;
  if (dia.turnos.length === 0 || (libres === 0 && !detalle)) {
    pintar(contenedor, html`${cabecera}
      <div class="marcador-mensaje">
        <i data-lucide="flag"></i>
        <strong>${dia.turnos.length ? 'Día completo' : 'Sin turnos'}</strong>
        <span>${dia.turnos.length ? 'Todos los horarios de este día ya están reservados. Prueba con otro día.' : 'No hay turnos disponibles este día.'}</span>
      </div>`);
    return;
  }

  pintar(contenedor, html`${cabecera}
    <div class="marcador-grilla" role="group" aria-label="Horarios de ${fechaRelativa(dia.fecha)}">
      ${dia.turnos.map((t) => {
        const libre = t.estado === 'libre';
        const texto = detalle ? detalle(t) : (libre ? dinero(t.precio) : DETALLE[t.estado]);
        return html`
          <button type="button" class="turno ${t.estado}" data-hora="${t.hora_inicio}"
            ${libre || detalle ? '' : 'disabled'}
            aria-pressed="${t.hora_inicio === seleccion}"
            aria-label="${hora(t.hora_inicio)} a ${hora(t.hora_fin)}, ${libre ? `libre, ${dinero(t.precio)}` : DETALLE[t.estado] ?? t.estado}">
            <span class="turno-hora">${hora(t.hora_inicio)}</span>
            <span class="turno-detalle">${texto}</span>
          </button>`;
      })}
    </div>`);

  if (!alSeleccionar) return;
  $$('.turno', contenedor).forEach((boton) => {
    boton.addEventListener('click', () => {
      $$('.turno', contenedor).forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
      alSeleccionar(dia.turnos.find((t) => t.hora_inicio === boton.dataset.hora));
    });
  });
}
