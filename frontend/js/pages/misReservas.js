import { reservasApi } from '../api/reservasApi.js';
import { confirmar } from '../components/dialogo.js';
import { manejarError } from '../components/formulario.js';
import { toast } from '../components/toast.js';
import { RUTAS } from '../config.js';
import { iniciarPagina } from '../core/pagina.js';
import { $, $$, html, pintar } from '../utils/dom.js';
import { ESTADOS_RESERVA, dinero, fechaRelativa, hora, rangoHoras } from '../utils/formato.js';

await iniciarPagina({ acceso: 'sesion', activa: 'mis-reservas' });

const lista = $('#lista');
let reservas = [];
let vista = new URLSearchParams(location.search).get('vista') === 'historial' ? 'historial' : 'proximas';

$$('[data-vista]').forEach((tab) => {
  tab.setAttribute('aria-selected', String(tab.dataset.vista === vista));
  tab.addEventListener('click', () => {
    vista = tab.dataset.vista;
    $$('[data-vista]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    history.replaceState(null, '', `?vista=${vista}`);
    render();
  });
});

async function cargar() {
  try {
    reservas = await reservasApi.mias();
    render();
  } catch (error) {
    manejarError(error);
  }
}

const esActiva = (r) => ['pendiente_pago', 'en_revision', 'confirmada'].includes(r.estado);
const yaPaso = (r) => new Date(`${r.fecha}T${r.hora_fin}`) < new Date();

function render() {
  const proximas = reservas
    .filter((r) => esActiva(r) && !yaPaso(r))
    .sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`));
  const historial = reservas.filter((r) => !proximas.includes(r));
  const items = vista === 'proximas' ? proximas : historial;

  $('#tab-proximas').innerHTML = html`Próximas${proximas.length ? html`<span class="contador">${proximas.length}</span>` : ''}`.__html;

  if (!items.length) {
    pintar(lista, vista === 'proximas'
      ? html`<div class="vacio"><i data-lucide="calendar-plus"></i><h3>No tienes partidos próximos</h3>
          <p>Elige un horario libre en el marcador y reserva en menos de un minuto.</p>
          <a class="btn btn-primario" href="${RUTAS.reservar}">Reservar ahora</a></div>`
      : html`<div class="vacio"><i data-lucide="history"></i><h3>Todavía no hay historial</h3>
          <p>Aquí verás tus partidos jugados, cancelados o vencidos.</p></div>`);
    return;
  }

  pintar(lista, html`${items.map(tarjeta)}`);

  $$('[data-cancelar]', lista).forEach((b) => b.addEventListener('click', () => cancelar(Number(b.dataset.cancelar), b)));
}

function tarjeta(r) {
  return html`
    <article class="reserva-fila">
      <div class="reserva-hora num"><span>${hora(r.hora_inicio)}</span><small>${fechaRelativa(r.fecha)}</small></div>
      <div class="reserva-info">
        <span class="chip chip-${r.estado}">${ESTADOS_RESERVA[r.estado]}</span>
        <p><strong>${rangoHoras(r.hora_inicio, r.hora_fin)}</strong> · ${dinero(r.precio)} · Reserva #${r.id}</p>
        ${r.estado === 'cancelada' && r.motivo_cancelacion ? html`<p class="texto-sm texto-suave">Motivo: ${r.motivo_cancelacion}</p>` : ''}
        ${esActiva(r) && !r.puede_cancelar && !yaPaso(r) ? html`<p class="texto-sm texto-suave">${r.motivo_no_cancelar}</p>` : ''}
      </div>
      <div class="reserva-acciones">
        ${r.puede_pagar ? html`<a class="btn btn-primario btn-sm" href="${RUTAS.pagar}?reserva=${r.id}"><i data-lucide="wallet"></i>Pagar</a>`
          : html`<a class="btn btn-sm" href="${RUTAS.pagar}?reserva=${r.id}">Ver detalle</a>`}
        ${r.puede_cancelar ? html`<button type="button" class="btn btn-peligro btn-sm" data-cancelar="${r.id}">Cancelar</button>` : ''}
      </div>
    </article>`;
}

async function cancelar(id, boton) {
  const r = reservas.find((x) => x.id === id);
  const motivo = await confirmar({
    titulo: '¿Cancelar esta reserva?',
    mensaje: `${fechaRelativa(r.fecha)}, ${rangoHoras(r.hora_inicio, r.hora_fin)}. El horario quedará libre para otros.${r.estado === 'confirmada' ? ' Como ya pagaste, coordina la devolución con la cancha.' : ''}`,
    aceptar: 'Sí, cancelar',
    cancelar: 'No, mantener',
    peligro: true,
    pedirTexto: { etiqueta: 'Motivo (opcional)', requerido: false, placeholder: 'Ej.: no juntamos equipo' },
  });
  if (motivo === null) return;

  boton.classList.add('cargando');
  try {
    await reservasApi.cancelar(id, motivo);
    toast('Reserva cancelada. El horario quedó libre.');
    await cargar();
  } catch (error) {
    boton.classList.remove('cargando');
    manejarError(error);
  }
}

await cargar();
