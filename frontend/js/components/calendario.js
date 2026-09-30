import { $$, html, pintar } from '../utils/dom.js';
import { aIso, fechaLarga, hoyIso, nombreMes } from '../utils/formato.js';

// Calendario del mes. Los días con horarios libres llevan un punto verde;
// los cerrados, completos o fuera del rango de reserva quedan deshabilitados.

const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * @param {HTMLElement} contenedor
 * @param {object} opciones
 *   dias: respuesta de /disponibilidad/dias (fecha, abierto, libres)
 *   mes: 'AAAA-MM' que se muestra
 *   seleccionada: 'AAAA-MM-DD'
 *   alElegir(fecha), alCambiarMes(mes)
 */
export function renderCalendario(contenedor, { dias, mes, seleccionada, alElegir, alCambiarMes }) {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const [anio, numMes] = mes.split('-').map(Number);
  const primero = new Date(anio, numMes - 1, 1);
  const diasDelMes = new Date(anio, numMes, 0).getDate();
  const huecos = (primero.getDay() + 6) % 7; // lunes = 0

  const meses = [...new Set(dias.map((d) => d.fecha.slice(0, 7)))];
  const indice = meses.indexOf(mes);
  const hoy = hoyIso();

  const celdas = [];
  for (let i = 0; i < huecos; i++) celdas.push(html`<span class="cal-hueco" aria-hidden="true"></span>`);
  for (let n = 1; n <= diasDelMes; n++) {
    const fecha = aIso(new Date(anio, numMes - 1, n));
    const d = porFecha.get(fecha);
    const estado = !d ? 'fuera' : !d.abierto ? 'cerrado' : d.libres === 0 ? 'completo' : 'disponible';
    const texto = { fuera: 'no disponible', cerrado: 'cerrado', completo: 'sin horarios libres', disponible: `${d?.libres} horarios libres` }[estado];
    celdas.push(html`
      <button type="button" class="cal-dia ${estado} ${fecha === hoy ? 'hoy' : ''}" data-fecha="${fecha}"
        ${estado === 'disponible' ? '' : 'disabled'} aria-pressed="${fecha === seleccionada}"
        aria-label="${fechaLarga(fecha)}, ${texto}">
        <span>${n}</span>
      </button>`);
  }

  pintar(contenedor, html`
    <div class="cal-cabecera">
      <button type="button" class="flecha" data-mes="-1" aria-label="Mes anterior" ${indice > 0 ? '' : 'disabled'}><i data-lucide="chevron-left"></i></button>
      <strong class="cal-mes">${nombreMes(numMes)} ${anio}</strong>
      <button type="button" class="flecha" data-mes="1" aria-label="Mes siguiente" ${indice < meses.length - 1 ? '' : 'disabled'}><i data-lucide="chevron-right"></i></button>
    </div>
    <div class="cal-grilla" role="group" aria-label="Días de ${nombreMes(numMes)}">
      ${CABECERA.map((c) => html`<span class="cal-semana" aria-hidden="true">${c}</span>`)}
      ${celdas}
    </div>
    <div class="cal-leyenda" aria-hidden="true">
      <span><i class="l-disponible"></i>Con horarios libres</span>
      <span><i class="l-no"></i>Completo o cerrado</span>
    </div>`);

  $$('.cal-dia:not(:disabled)', contenedor).forEach((b) => b.addEventListener('click', () => alElegir(b.dataset.fecha)));
  $$('[data-mes]', contenedor).forEach((b) => b.addEventListener('click', () => {
    const destino = meses[indice + Number(b.dataset.mes)];
    if (destino) alCambiarMes(destino);
  }));
}

/** Mes ('AAAA-MM') de una fecha. */
export const mesDe = (fecha) => fecha.slice(0, 7);

/** Primer día del mes con horarios libres, o null. */
export function primerDisponibleDelMes(dias, mes) {
  return dias.find((d) => d.fecha.startsWith(mes) && d.abierto && d.libres > 0)?.fecha ?? null;
}
