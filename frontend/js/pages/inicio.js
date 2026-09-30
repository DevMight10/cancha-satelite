import { publicoApi } from '../api/publicoApi.js';
import { LOGO_SVG, canchaFondo } from '../components/cancha.js';
import { marcadorCargando, renderMarcador } from '../components/marcador.js';
import { RUTAS } from '../config.js';
import { iniciarPagina } from '../core/pagina.js';
import { $, html, pintar } from '../utils/dom.js';
import { dinero, fechaLarga, fechaRelativa, hora } from '../utils/formato.js';
import { enlaceWhatsapp } from '../utils/whatsapp.js';

$('#portada-fondo').innerHTML = canchaFondo().__html;
$('#marca-pie').insertAdjacentHTML('afterbegin', LOGO_SVG);
await iniciarPagina({ acceso: 'publico' });

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const marcador = $('#marcador-hoy');
marcadorCargando(marcador);

// Buscador de la portada: lleva a Reservar con el día y la franja elegidos
$('#buscador').addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = new URLSearchParams(new FormData(e.currentTarget));
  if (datos.get('franja') === 'todo') datos.delete('franja');
  location.href = `${RUTAS.reservar}?${datos}`;
});

try {
  const [info, dias] = await Promise.all([publicoApi.info(), publicoApi.dias()]);

  pintar($('#b-dia'), html`${dias.map((d, i) => html`
    <option value="${d.fecha}" ${d.abierto && d.libres ? '' : 'disabled'}>
      ${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fechaLarga(d.fecha)}${d.abierto ? (d.libres ? '' : ' · completo') : ' · cerrado'}</option>`)}`);
  $('#b-duracion').textContent = info.reglas.duracion_turno % 60 === 0
    ? `${info.reglas.duracion_turno / 60} ${info.reglas.duracion_turno === 60 ? 'hora' : 'horas'}`
    : `${info.reglas.duracion_turno} minutos`;

  renderPrecios(info);
  renderReglasYContacto(info);

  // Hoy, o el próximo día con horarios libres
  const dia = dias.find((d) => d.abierto && d.libres > 0) ?? dias[0];
  $('#b-dia').value = dia.fecha;
  $('#titulo-hoy').textContent = dia.fecha === dias[0].fecha ? 'Hoy en la cancha' : `${fechaRelativa(dia.fecha)} en la cancha`;
  const disponibilidad = await publicoApi.disponibilidad(dia.fecha);
  renderMarcador(marcador, disponibilidad, {
    alSeleccionar: (turno) => {
      location.href = `${RUTAS.reservar}?fecha=${disponibilidad.fecha}&hora=${hora(turno.hora_inicio)}`;
    },
  });
} catch {
  pintar(marcador, html`<div class="marcador-mensaje"><i data-lucide="wifi-off"></i>
    <strong>Sin conexión</strong><span>No pudimos cargar los horarios. <a href="${RUTAS.reservar}">Intenta en la página de reservas</a>.</span></div>`);
}

/** "Todos los días", "Lunes a viernes", "Sábado y domingo"... */
function textoDias(dias) {
  const d = [...dias].sort((a, b) => a - b);
  if (d.length === 7) return 'Todos los días';
  const consecutivos = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  if (consecutivos && d.length > 2) return `${DIAS[d[0] - 1]} a ${DIAS[d.at(-1) - 1].toLowerCase()}`;
  return d.map((x, i) => (i === 0 ? DIAS[x - 1] : DIAS[x - 1].toLowerCase())).join(d.length === 2 ? ' y ' : ', ');
}

function renderPrecios(info) {
  const tarifas = [...info.tarifas].sort((a, b) => Number(a.precio) - Number(b.precio));
  $('#nota-precios').textContent = `Precio por turno de ${info.reglas.duracion_turno} minutos. Si un horario entra en dos tarifas, se aplica la mayor.`;
  pintar($('#tabla-precios'), tarifas.length
    ? html`${tarifas.map((t) => html`
        <article class="tarifa">
          <span class="dias">${textoDias(t.dias)}</span>
          <span class="horas num">${hora(t.hora_desde)} – ${hora(t.hora_hasta)}</span>
          <span class="monto num">${dinero(t.precio)} <small>por turno</small></span>
        </article>`)}`
    : html`<p>Los precios se publicarán pronto.</p>`);

  pintar($('#horario-atencion'), html`
    <h3><i data-lucide="clock"></i>Horario de atención</h3>
    <dl>${info.horarios.map((h) => html`
      <div class="${h.cerrado ? 'cerrado' : ''}"><dt>${DIAS[h.dia_semana - 1]}</dt>
        <dd class="num">${h.cerrado ? 'Cerrado' : `${hora(h.hora_apertura)} – ${hora(h.hora_cierre)}`}</dd></div>`)}
    </dl>`);
}

function renderReglasYContacto(info) {
  const r = info.reglas;
  pintar($('#reglas'), html`
    <li><i data-lucide="calendar-range"></i><span>Reserva con hasta <strong>${r.dias_anticipacion} días</strong> de anticipación.</span></li>
    <li><i data-lucide="timer"></i><span>Tienes <strong>${r.minutos_pago} minutos</strong> para pagar; si no, el horario se libera.</span></li>
    <li><i data-lucide="undo-2"></i><span>Puedes cancelar hasta <strong>${r.horas_cancelacion} horas</strong> antes del partido.</span></li>
    <li><i data-lucide="shield-check"></i><span>Nunca se reserva dos veces el mismo horario: lo que ves libre, está libre.</span></li>`);

  const n = info.negocio;
  const whatsapp = enlaceWhatsapp(n.whatsapp, 'Hola, quiero consultar por la cancha.');
  pintar($('#contacto'), html`
    <h2 class="titulo-seccion">Contacto</h2>
    <p class="contacto-nombre">${n.nombre}</p>
    ${n.direccion ? html`<p class="contacto-linea"><i data-lucide="map-pin"></i>${n.direccion}</p>` : ''}
    ${n.email ? html`<p class="contacto-linea"><i data-lucide="mail"></i><a href="mailto:${n.email}">${n.email}</a></p>` : ''}
    ${whatsapp ? html`<a class="btn btn-primario" href="${whatsapp}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i>Escribir por WhatsApp</a>` : ''}`);
}
