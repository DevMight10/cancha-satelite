import { publicoApi } from '../api/publicoApi.js';
import { reservasApi } from '../api/reservasApi.js';
import { mesDe, primerDisponibleDelMes, renderCalendario } from '../components/calendario.js';
import { manejarError } from '../components/formulario.js';
import { horariosCargando, renderHorarios } from '../components/horarios.js';
import { toast } from '../components/toast.js';
import { RUTAS } from '../config.js';
import { iniciarPagina } from '../core/pagina.js';
import { $, html, pintar } from '../utils/dom.js';
import { dinero, fechaCorta, fechaLarga, fechaRelativa, hora, rangoHoras } from '../utils/formato.js';

const usuario = await iniciarPagina({ acceso: 'publico', activa: 'reservar' });

const parametros = new URLSearchParams(location.search);
const estado = {
  dias: [],
  dia: null,
  fecha: parametros.get('fecha'),
  mes: null,
  turno: null,
  horaPedida: parametros.get('hora'),     // al volver del login o desde la portada
  franja: parametros.get('franja'),       // desde el buscador de la portada
};

const horarios = $('#marcador');
const resumen = $('#resumen');

let info;
try {
  [info, estado.dias] = await Promise.all([publicoApi.info(), publicoApi.dias()]);
} catch (error) {
  manejarError(error);
  throw error;
}
const reglas = info.reglas;
$('#reglas').textContent = `Turnos de ${reglas.duracion_turno} minutos. Tienes ${reglas.minutos_pago} minutos para pagar con QR, Tigo Money o transferencia.`;

if (!estado.dias.some((d) => d.fecha === estado.fecha && d.abierto && d.libres > 0)) {
  estado.fecha = (estado.dias.find((d) => d.abierto && d.libres > 0) ?? estado.dias[0]).fecha;
}
estado.mes = mesDe(estado.fecha);

pintarCalendario();
await cargarDia();

function pintarCalendario() {
  renderCalendario($('#calendario'), {
    dias: estado.dias,
    mes: estado.mes,
    seleccionada: estado.fecha,
    alElegir: (fecha) => {
      estado.fecha = fecha;
      estado.turno = null;
      pintarCalendario();
      cargarDia();
      // En celular el calendario ocupa la pantalla: bajamos a los horarios del día elegido.
      if (matchMedia('(max-width: 899px)').matches) $('.panel-horarios').scrollIntoView({ behavior: 'smooth' });
    },
    alCambiarMes: (mes) => {
      estado.mes = mes;
      const disponible = primerDisponibleDelMes(estado.dias, mes);
      if (disponible && mesDe(estado.fecha) !== mes) {
        estado.fecha = disponible;
        estado.turno = null;
        cargarDia();
      }
      pintarCalendario();
    },
  });
}

async function cargarDia() {
  $('#titulo-dia').textContent = fechaRelativa(estado.fecha) === 'Hoy' ? `Hoy, ${fechaLarga(estado.fecha)}` : fechaLarga(estado.fecha);
  $('#libres-dia').hidden = true;
  horariosCargando(horarios);
  renderResumen();
  try {
    estado.dia = await publicoApi.disponibilidad(estado.fecha);
    if (estado.horaPedida) {
      estado.turno = estado.dia.turnos.find((t) => hora(t.hora_inicio) === estado.horaPedida && t.estado === 'libre') ?? null;
      estado.horaPedida = null;
    }
    const libres = estado.dia.turnos.filter((t) => t.estado === 'libre').length;
    $('#libres-dia').textContent = `${libres} ${libres === 1 ? 'horario libre' : 'horarios libres'}`;
    $('#libres-dia').hidden = !estado.dia.abierto;

    renderHorarios(horarios, estado.dia, {
      seleccion: estado.turno?.hora_inicio,
      alSeleccionar: (turno) => {
        estado.turno = turno;
        renderResumen();
      },
    });
    if (estado.franja) {
      $(`#grupo-${estado.franja}`)?.scrollIntoView({ block: 'center' });
      estado.franja = null;
    }
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
  document.body.classList.toggle('con-turno', Boolean(t));

  if (!t) {
    pintar(resumen, html`<p class="resumen-pista"><i data-lucide="mouse-pointer-click"></i>Elige un horario libre para continuar.</p>`);
    return;
  }

  const volver = encodeURIComponent(`${RUTAS.reservar}?fecha=${estado.fecha}&hora=${hora(t.hora_inicio)}`);
  pintar(resumen, html`
    <div class="resumen-precio">
      <span class="resumen-titulo">
        <span class="texto-largo">${fechaLarga(estado.fecha)}</span><span class="texto-corto">${fechaCorta(estado.fecha)}</span>
        · ${rangoHoras(t.hora_inicio, t.hora_fin)}</span>
      <strong class="num">${dinero(t.precio)}</strong>
    </div>
    <div class="acciones-resumen">
      ${usuario
        ? html`<button type="button" class="btn btn-primario btn-grande" id="confirmar"><i data-lucide="check"></i><span>Confirmar<span class="texto-largo"> reserva</span></span></button>`
        : html`<a class="btn btn-primario btn-grande" href="${RUTAS.login}?volver=${volver}"><i data-lucide="log-in"></i><span class="texto-largo">Inicia sesión para reservar</span><span class="texto-corto">Ingresa y reserva</span></a>
               <a class="enlace-registro" href="${RUTAS.registro}?volver=${volver}">¿No tienes cuenta? Créala</a>`}
    </div>`);

  $('#confirmar')?.addEventListener('click', confirmar);
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
