import { adminApi } from '../../api/adminApi.js';
import { manejarError } from '../../components/formulario.js';
import { RUTAS } from '../../config.js';
import { iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { ESTADOS_RESERVA, aFecha, diaCorto, dinero, fechaLarga, hora, hoyIso, sumarDias } from '../../utils/formato.js';
import { describirReserva, enlaceWhatsapp } from '../../utils/whatsapp.js';

await iniciarAdmin('panel');

let fecha = new URLSearchParams(location.search).get('fecha') ?? hoyIso();
const entrada = $('#fecha');

entrada.addEventListener('change', () => entrada.value && cambiarFecha(entrada.value));
$('#dia-anterior').addEventListener('click', () => cambiarFecha(sumarDias(fecha, -1)));
$('#dia-siguiente').addEventListener('click', () => cambiarFecha(sumarDias(fecha, 1)));
$('#hoy').addEventListener('click', () => cambiarFecha(hoyIso()));

function cambiarFecha(nueva) {
  fecha = nueva;
  history.replaceState(null, '', `?fecha=${fecha}`);
  cargar();
}

async function cargar() {
  entrada.value = fecha;
  $('#fecha-texto').textContent = fecha === hoyIso() ? `Hoy, ${fechaLarga(fecha)}` : fechaLarga(fecha);
  try {
    const datos = await adminApi.panel(fecha);
    renderResumen(datos.resumen);
    renderAgenda(datos.dia);
    renderSemana(datos.semana);
  } catch (error) {
    manejarError(error);
  }
}

function renderResumen(r) {
  pintar($('#aviso-pagos'), r.pagos_por_revisar
    ? html`<div class="aviso aviso-advertencia aviso-separado">
        <i data-lucide="receipt"></i>
        <span><strong>${r.pagos_por_revisar} ${r.pagos_por_revisar === 1 ? 'comprobante' : 'comprobantes'} por revisar.</strong>
        <a href="${RUTAS.adminPagos}">Revisar ahora</a></span></div>`
    : html``);

  pintar($('#resumen'), html`
    <div><dt>Reservas</dt><dd>${r.reservas}</dd></div>
    <div><dt>Confirmadas</dt><dd>${r.confirmadas}</dd></div>
    <div><dt>Por cobrar</dt><dd>${r.por_cobrar}</dd></div>
    <div class="destacado"><dt>Cobrado</dt><dd>${dinero(r.ingresos)}</dd></div>
    <div><dt>Turnos libres</dt><dd>${r.libres}</dd></div>`);
}

function renderAgenda(dia) {
  const agenda = $('#agenda');
  if (!dia.abierto) {
    pintar(agenda, html`<div class="vacio"><i data-lucide="calendar-x-2"></i><h3>Cerrado</h3><p>${dia.motivo}</p></div>`);
    return;
  }

  pintar(agenda, html`${dia.turnos.map((t) => {
    const r = t.reserva;
    if (!r) {
      const pasado = t.estado === 'pasado';
      return html`
        <div class="agenda-fila libre ${pasado ? 'pasado' : ''}">
          <span class="agenda-hora">${hora(t.hora_inicio)}</span>
          <span class="agenda-cliente"><strong>${pasado ? 'Sin reserva' : 'Libre'}</strong><small>${dinero(t.precio)}</small></span>
          ${pasado ? '' : html`<a class="btn btn-sm btn-fantasma" href="${RUTAS.adminReservas}?nueva=1&fecha=${dia.fecha}&hora=${hora(t.hora_inicio)}">
            <i data-lucide="plus"></i>Registrar</a>`}
        </div>`;
    }
    const whatsapp = enlaceWhatsapp(r.cliente_telefono, `Hola ${r.cliente_nombre.split(' ')[0]}, te escribimos de la Cancha Satélite Norte por tu reserva del ${describirReserva(r)}.`);
    return html`
      <div class="agenda-fila ${t.estado === 'pasado' ? 'pasado' : ''}">
        <span class="agenda-hora">${hora(t.hora_inicio)}</span>
        <span class="agenda-cliente">
          <strong>${r.cliente_nombre}</strong>
          <small><span class="chip chip-${r.estado}">${ESTADOS_RESERVA[r.estado]}</span>${r.cliente_telefono} · ${dinero(r.precio)}${r.origen === 'presencial' ? ' · presencial' : ''}</small>
        </span>
        <span class="agenda-acciones">
          ${whatsapp ? html`<a class="btn btn-sm btn-fantasma" href="${whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp a ${r.cliente_nombre}"><i data-lucide="message-circle"></i></a>` : ''}
          <a class="btn btn-sm" href="${RUTAS.adminReservas}?desde=${dia.fecha}&hasta=${dia.fecha}&reserva=${r.id}">Gestionar</a>
        </span>
      </div>`;
  })}`);
}

function renderSemana(semana) {
  const horas = [...new Set(semana.flatMap((d) => d.turnos.map((t) => t.hora_inicio)))].sort();
  const celda = (dia, h) => {
    const t = dia.turnos.find((x) => x.hora_inicio === h);
    if (!dia.abierto || !t) return html`<td class="cerrado" title="Cerrado"></td>`;
    if (t.reserva) {
      const clase = t.reserva.estado === 'confirmada' ? 'confirmada' : 'pendiente';
      return html`<td class="${clase}" title="${hora(h)} · ${t.reserva.cliente_nombre} (${ESTADOS_RESERVA[t.reserva.estado]})"></td>`;
    }
    return html`<td class="${t.estado === 'pasado' ? 'pasado' : ''}" title="${hora(h)} · ${t.estado === 'pasado' ? 'pasado' : 'libre'}"></td>`;
  };

  pintar($('#semana'), html`
    <table class="semana">
      <caption class="visualmente-oculto">Ocupación por día y hora</caption>
      <thead><tr><th scope="col"><span class="visualmente-oculto">Hora</span></th>
        ${semana.map((d) => html`<th scope="col">
          <button type="button" data-fecha="${d.fecha}" aria-pressed="${d.fecha === fecha}" aria-label="Ver ${fechaLarga(d.fecha)}">
            ${diaCorto(d.fecha)}<strong>${aFecha(d.fecha).getDate()}</strong></button></th>`)}
      </tr></thead>
      <tbody>${horas.map((h) => html`<tr><th scope="row">${hora(h)}</th>${semana.map((d) => celda(d, h))}</tr>`)}</tbody>
    </table>
    <div class="leyenda-semana">
      <span><i class="l-confirmada"></i>Confirmada</span>
      <span><i class="l-pendiente"></i>Por cobrar / en revisión</span>
      <span><i class="l-libre"></i>Libre</span>
      <span><i class="l-pasado"></i>Pasado</span>
    </div>`);

  $$('.semana [data-fecha]').forEach((b) => b.addEventListener('click', () => cambiarFecha(b.dataset.fecha)));
}

await cargar();
