import { publicoApi } from '../api/publicoApi.js';
import { reservasApi } from '../api/reservasApi.js';
import { manejarError } from '../components/formulario.js';
import { marcadorCargando, renderMarcador } from '../components/marcador.js';
import { renderTiraDias } from '../components/tiraDias.js';
import { toast } from '../components/toast.js';
import { RUTAS } from '../config.js';
import { iniciarPagina } from '../core/pagina.js';
import { $, html, pintar } from '../utils/dom.js';
import { dinero, fechaLarga, hora, rangoHoras } from '../utils/formato.js';

const usuario = await iniciarPagina({ acceso: 'publico', activa: 'reservar' });

const parametros = new URLSearchParams(location.search);
const estado = {
  info: null,
  dias: [],
  fecha: parametros.get('fecha'),
  turno: null,
  horaPedida: parametros.get('hora'), // al volver del login
};

const tira = $('#tira-dias');
const marcador = $('#marcador');
const resumen = $('#resumen');

try {
  [estado.info, estado.dias] = await Promise.all([publicoApi.info(), publicoApi.dias()]);
} catch (error) {
  manejarError(error);
  throw error;
}

const reglas = estado.info.reglas;
$('#reglas').textContent =
  `Turnos de ${reglas.duracion_turno} minutos. Después de reservar tienes ${reglas.minutos_pago} minutos para pagar con QR, Tigo Money o transferencia.`;

if (!estado.dias.some((d) => d.fecha === estado.fecha)) {
  estado.fecha = (estado.dias.find((d) => d.abierto && d.libres > 0) ?? estado.dias[0]).fecha;
}

renderTiraDias(tira, estado.dias, estado.fecha, (fecha) => {
  estado.fecha = fecha;
  estado.turno = null;
  cargarDia();
});
await cargarDia();

async function cargarDia() {
  marcadorCargando(marcador, estado.fecha);
  renderResumen();
  try {
    const dia = await publicoApi.disponibilidad(estado.fecha);
    if (estado.horaPedida) {
      estado.turno = dia.turnos.find((t) => hora(t.hora_inicio) === estado.horaPedida && t.estado === 'libre') ?? null;
      estado.horaPedida = null;
    }
    renderMarcador(marcador, dia, {
      seleccion: estado.turno?.hora_inicio,
      alSeleccionar: (turno) => {
        estado.turno = turno;
        renderResumen();
      },
    });
    renderResumen();
  } catch (error) {
    manejarError(error);
  }
}

function actualizarUrl() {
  const p = new URLSearchParams({ fecha: estado.fecha });
  if (estado.turno) p.set('hora', hora(estado.turno.hora_inicio));
  history.replaceState(null, '', `?${p}`);
}

function renderResumen() {
  const t = estado.turno;
  actualizarUrl();

  if (!t) {
    resumen.classList.remove('con-turno');
    pintar(resumen, html`
      <h2 class="resumen-titulo" id="resumen-titulo">Tu reserva</h2>
      <div class="resumen-vacio">
        <i data-lucide="mouse-pointer-click"></i>
        <p>Toca un horario <strong>libre</strong> del marcador para ver el precio y reservarlo.</p>
      </div>
      ${reglasHtml()}`);
    return;
  }

  const volver = encodeURIComponent(`${RUTAS.reservar}?fecha=${estado.fecha}&hora=${hora(t.hora_inicio)}`);
  resumen.classList.add('con-turno');
  pintar(resumen, html`
    <h2 class="resumen-titulo" id="resumen-titulo">Tu reserva</h2>
    <dl class="resumen-datos">
      <div><dt>Día</dt><dd>${fechaLarga(estado.fecha)}</dd></div>
      <div><dt>Hora</dt><dd class="num">${rangoHoras(t.hora_inicio, t.hora_fin)}</dd></div>
    </dl>
    <div class="resumen-precio">
      <span>Total</span>
      <strong class="num">${dinero(t.precio)}</strong>
    </div>
    ${usuario
      ? html`<button type="button" class="btn btn-primario btn-bloque" id="confirmar">
          <i data-lucide="check"></i>Confirmar reserva</button>`
      : html`<a class="btn btn-primario btn-bloque" href="${RUTAS.login}?volver=${volver}">
          <i data-lucide="log-in"></i>Inicia sesión para reservar</a>
        <p class="texto-sm texto-suave resumen-nota">¿No tienes cuenta? <a href="${RUTAS.registro}?volver=${volver}">Créala en un minuto</a>.</p>`}
    ${reglasHtml()}`);

  $('#confirmar')?.addEventListener('click', confirmar);
}

function reglasHtml() {
  return html`
    <ul class="resumen-reglas">
      <li><i data-lucide="timer"></i>Tienes ${reglas.minutos_pago} min para pagar; si no, el horario se libera.</li>
      <li><i data-lucide="undo-2"></i>Puedes cancelar hasta ${reglas.horas_cancelacion} h antes del partido.</li>
    </ul>`;
}

async function confirmar(evento) {
  const boton = evento.currentTarget;
  boton.classList.add('cargando');
  try {
    const reserva = await reservasApi.crear(estado.fecha, estado.turno.hora_inicio);
    location.href = `${RUTAS.pagar}?reserva=${reserva.id}`;
  } catch (error) {
    boton.classList.remove('cargando');
    if (error.status === 409) {
      toast(error.message, 'error');
      estado.turno = null;
      cargarDia();
      return;
    }
    manejarError(error);
  }
}
