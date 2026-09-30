import { adminApi } from '../../api/adminApi.js';
import { manejarError } from '../../components/formulario.js';
import { RUTAS } from '../../config.js';
import { iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { ESTADOS_RESERVA, aFecha, diaCorto, dinero, fechaCorta, fechaLarga, hora, hoyIso, sumarDias } from '../../utils/formato.js';
import { describirReserva, enlaceWhatsapp } from '../../utils/whatsapp.js';

await iniciarAdmin('panel');

let fecha = new URLSearchParams(location.search).get('fecha') ?? hoyIso();
const entrada = $('#fecha');

entrada.addEventListener('change', () => entrada.value && cambiarFecha(entrada.value));
$('#semana-anterior').addEventListener('click', () => cambiarFecha(sumarDias(fecha, -7)));
$('#semana-siguiente').addEventListener('click', () => cambiarFecha(sumarDias(fecha, 7)));
$('#hoy').addEventListener('click', () => cambiarFecha(hoyIso()));

function cambiarFecha(nueva) {
  fecha = nueva;
  history.replaceState(null, '', `?fecha=${fecha}`);
  cargar();
}

async function cargar() {
  entrada.value = fecha;
  try {
    const datos = await adminApi.panel(fecha);
    const semana = datos.semana;
    $('#rango-semana').textContent = `Semana del ${fechaCorta(semana[0].fecha)} al ${fechaCorta(semana[6].fecha)}`;
    renderResumen(datos.resumen);
    renderCronograma(semana);
    renderAgenda(datos.dia);
  } catch (error) {
    manejarError(error);
  }
}

function renderResumen(r) {
  pintar($('#aviso-pagos'), r.pagos_por_revisar
    ? html`<div class="aviso aviso-advertencia aviso-separado"><i data-lucide="receipt"></i>
        <span><strong>${r.pagos_por_revisar} ${r.pagos_por_revisar === 1 ? 'comprobante' : 'comprobantes'} por revisar.</strong>
        <a href="${RUTAS.adminPagos}">Revisar ahora</a></span></div>`
    : html``);

  const esHoy = fecha === hoyIso();
  pintar($('#resumen'), html`
    <div class="destacado"><dt>Cobrado ${esHoy ? 'hoy' : fechaCorta(fecha)}</dt><dd class="num">${dinero(r.ingresos)}</dd></div>
    <div><dt>Reservas</dt><dd class="num">${r.reservas}</dd></div>
    <div><dt>Confirmadas</dt><dd class="num">${r.confirmadas}</dd></div>
    <div><dt>Por cobrar</dt><dd class="num">${r.por_cobrar}</dd></div>
    <div><dt>Turnos libres</dt><dd class="num">${r.libres}</dd></div>`);
}

/** Cronograma: una fila por día; cada reserva es un bloque en su hora, con el nombre del cliente. */
function renderCronograma(semana) {
  const horas = [...new Set(semana.flatMap((d) => d.turnos.map((t) => t.hora_inicio)))].sort();
  if (!horas.length) {
    pintar($('#cronograma'), html`<div class="vacio"><i data-lucide="calendar-x-2"></i><h3>Sin turnos esta semana</h3>
      <p>Revisa el horario de apertura y las tarifas en Configuración.</p></div>`);
    return;
  }
  const columna = (h) => horas.indexOf(h) + 2; // la columna 1 es la del día

  const fila = (d) => {
    const etiqueta = html`<button type="button" class="crono-dia" data-fecha="${d.fecha}" aria-pressed="${d.fecha === fecha}" aria-label="Ver la agenda del ${fechaLarga(d.fecha)}">
      ${d.fecha === hoyIso() ? 'hoy' : diaCorto(d.fecha)}<strong>${aFecha(d.fecha).getDate()}</strong></button>`;

    if (!d.abierto) {
      return html`<div class="crono-fila cerrado">${etiqueta}<div class="crono-pista">${d.motivo ?? 'Cerrado'}</div></div>`;
    }

    // Reservas consecutivas del mismo cliente se muestran como un solo bloque
    const bloques = [];
    for (const t of d.turnos) {
      const r = t.reserva;
      const ultimo = bloques.at(-1);
      if (r && ultimo?.r && ultimo.r.cliente_telefono === r.cliente_telefono && ultimo.r.cliente_nombre === r.cliente_nombre && ultimo.fin === t.hora_inicio && ultimo.r.estado === r.estado) {
        ultimo.fin = t.hora_fin;
        ultimo.span++;
        ultimo.ids.push(r.id);
      } else {
        bloques.push({ t, r, fin: t.hora_fin, span: 1, ids: r ? [r.id] : [] });
      }
    }

    return html`<div class="crono-fila">
      ${etiqueta}
      <div class="crono-pista"></div>
      ${bloques.map(({ t, r, fin, span, ids }) => {
        const estilo = `grid-column: ${columna(t.hora_inicio)} / span ${span}`;
        if (!r) {
          return t.estado === 'libre'
            ? html`<a class="crono-libre" style="${estilo}" href="${RUTAS.adminReservas}?nueva=1&fecha=${d.fecha}&hora=${hora(t.hora_inicio)}"
                aria-label="Registrar reserva el ${fechaLarga(d.fecha)} a las ${hora(t.hora_inicio)}"><i data-lucide="plus"></i></a>`
            : '';
        }
        const clase = t.estado === 'pasado' && r.estado === 'confirmada' ? 'pasada' : r.estado === 'confirmada' ? '' : 'pendiente';
        return html`<a class="crono-res ${clase}" style="${estilo}" href="${RUTAS.adminReservas}?desde=${d.fecha}&hasta=${d.fecha}&reserva=${ids[0]}"
          title="${hora(t.hora_inicio)}–${hora(fin)} · ${r.cliente_nombre} · ${ESTADOS_RESERVA[r.estado]}">
          <span>${r.cliente_nombre}</span><small>${span > 1 ? `${span} turnos · ` : ''}${r.estado === 'confirmada' ? (r.origen === 'presencial' ? 'presencial' : 'pagado') : 'por cobrar'}</small></a>`;
      })}
    </div>`;
  };

  pintar($('#cronograma'), html`
    <div class="crono-grilla" style="--horas: ${horas.length}">
      <div class="crono-regla"><span></span>${horas.map((h) => html`<span>${hora(h)}</span>`)}</div>
      ${semana.map(fila)}
    </div>`);

  $$('.crono-dia').forEach((b) => b.addEventListener('click', () => cambiarFecha(b.dataset.fecha)));
}

/** Agenda del día elegido: solo las reservas, con sus acciones. */
function renderAgenda(dia) {
  $('#titulo-agenda').textContent = `Agenda del ${fechaLarga(dia.fecha)}`;
  const reservas = dia.turnos.filter((t) => t.reserva);
  if (!dia.abierto || !reservas.length) {
    pintar($('#agenda'), html`<div class="vacio"><i data-lucide="calendar-check"></i>
      <h3>${dia.abierto ? 'Sin reservas este día' : 'Cerrado'}</h3>
      <p>${dia.abierto ? 'Toca un espacio libre del cronograma para registrar una reserva presencial.' : dia.motivo}</p></div>`);
    return;
  }

  pintar($('#agenda'), html`${reservas.map((t) => {
    const r = t.reserva;
    const whatsapp = enlaceWhatsapp(r.cliente_telefono, `Hola ${r.cliente_nombre.split(' ')[0]}, te escribimos de la Cancha Satélite Norte por tu reserva del ${describirReserva(r)}.`);
    return html`
      <div class="agenda-fila">
        <span class="agenda-hora">${hora(t.hora_inicio)}</span>
        <span class="agenda-cliente">
          <span class="agenda-nombre"><strong>${r.cliente_nombre}</strong><span class="chip chip-${r.estado}">${ESTADOS_RESERVA[r.estado]}</span></span>
          <small>${r.cliente_telefono} · ${dinero(r.precio)}${r.origen === 'presencial' ? ' · presencial' : ''}</small>
        </span>
        <span class="agenda-acciones">
          ${whatsapp ? html`<a class="btn btn-sm btn-fantasma" href="${whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp a ${r.cliente_nombre}"><i data-lucide="message-circle"></i></a>` : ''}
          <a class="btn btn-sm" href="${RUTAS.adminReservas}?desde=${dia.fecha}&hasta=${dia.fecha}&reserva=${r.id}">Gestionar</a>
        </span>
      </div>`;
  })}`);
}

await cargar();
