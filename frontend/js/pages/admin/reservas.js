import { adminApi } from '../../api/adminApi.js';
import { confirmar } from '../../components/dialogo.js';
import { enviarFormulario, manejarError } from '../../components/formulario.js';
import { toast } from '../../components/toast.js';
import { RUTAS } from '../../config.js';
import { iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { ESTADOS_PAGO, ESTADOS_RESERVA, METODOS_PAGO, dinero, fechaCorta, hora, hoyIso, rangoHoras, sumarDias } from '../../utils/formato.js';
import { describirReserva, enlaceWhatsapp } from '../../utils/whatsapp.js';

await iniciarAdmin('reservas');

const params = new URLSearchParams(location.search);
const filtros = $('#filtros');
const resaltar = Number(params.get('reserva')) || null;
let reservas = [];

filtros.desde.value = params.get('desde') ?? hoyIso();
filtros.hasta.value = params.get('hasta') ?? sumarDias(hoyIso(), 13);
filtros.estado.value = params.get('estado') ?? '';

let espera;
filtros.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(cargar, 300); // no consultar en cada tecla
});
filtros.addEventListener('submit', (e) => e.preventDefault());

async function cargar() {
  const datos = Object.fromEntries(new FormData(filtros));
  history.replaceState(null, '', `?${new URLSearchParams(Object.entries(datos).filter(([, v]) => v))}`);
  try {
    reservas = await adminApi.reservas(datos);
    render();
  } catch (error) {
    manejarError(error);
  }
}

const activa = (r) => ['pendiente_pago', 'en_revision', 'confirmada'].includes(r.estado);

function render() {
  $('#conteo').textContent = `${reservas.length} ${reservas.length === 1 ? 'reserva' : 'reservas'}` +
    (reservas.length ? ` · Confirmado: ${dinero(reservas.filter((r) => r.estado === 'confirmada').reduce((s, r) => s + Number(r.precio), 0))}` : '');

  if (!reservas.length) {
    pintar($('#tabla'), html`<div class="vacio"><i data-lucide="search-x"></i><h3>Sin resultados</h3>
      <p>Prueba con otro rango de fechas, estado o nombre.</p></div>`);
    return;
  }

  pintar($('#tabla'), html`
    <div class="tabla-envoltura">
      <table class="tabla">
        <thead><tr>
          <th scope="col">Día y hora</th><th scope="col">Cliente</th><th scope="col">Estado</th>
          <th scope="col">Pago</th><th scope="col" class="derecha">Precio</th><th scope="col"><span class="visualmente-oculto">Acciones</span></th>
        </tr></thead>
        <tbody>${reservas.map((r) => {
          const whatsapp = enlaceWhatsapp(r.cliente_telefono, `Hola ${r.cliente_nombre.split(' ')[0]}, te escribimos de la Cancha Satélite Norte por tu reserva del ${describirReserva(r)}.`);
          const cobrable = ['pendiente_pago', 'en_revision'].includes(r.estado) && r.pago_estado !== 'pendiente';
          return html`
            <tr id="reserva-${r.id}" class="${r.id === resaltar ? 'resaltada' : ''}">
              <td><strong class="num">${hora(r.hora_inicio)}</strong> <span class="texto-suave">${fechaCorta(r.fecha)}</span>
                <div class="texto-sm texto-suave">#${r.id}${r.origen === 'presencial' ? ' · presencial' : ''}</div></td>
              <td><strong>${r.cliente_nombre}</strong><div class="texto-sm texto-suave">${r.cliente_telefono}</div></td>
              <td><span class="chip chip-${r.estado}">${ESTADOS_RESERVA[r.estado]}</span>
                ${r.motivo_cancelacion ? html`<div class="texto-sm texto-suave">${r.motivo_cancelacion}</div>` : ''}</td>
              <td>${r.pago_metodo ? html`${METODOS_PAGO[r.pago_metodo]}<div class="texto-sm texto-suave">${ESTADOS_PAGO[r.pago_estado]}</div>` : html`<span class="texto-suave">—</span>`}</td>
              <td class="derecha num">${dinero(r.precio)}</td>
              <td class="acciones">
                ${cobrable ? html`<button type="button" class="btn btn-sm btn-primario" data-cobrar="${r.id}"><i data-lucide="banknote"></i>Cobrar</button>` : ''}
                ${r.pago_estado === 'pendiente' ? html`<a class="btn btn-sm" href="${RUTAS.adminPagos}">Revisar pago</a>` : ''}
                ${whatsapp ? html`<a class="btn btn-sm btn-fantasma" href="${whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp a ${r.cliente_nombre}"><i data-lucide="message-circle"></i></a>` : ''}
                ${activa(r) ? html`<button type="button" class="btn btn-sm btn-peligro" data-cancelar="${r.id}">Cancelar</button>` : ''}
              </td>
            </tr>`;
        })}</tbody>
      </table>
    </div>`);

  $$('[data-cobrar]').forEach((b) => b.addEventListener('click', () => cobrar(Number(b.dataset.cobrar), b)));
  $$('[data-cancelar]').forEach((b) => b.addEventListener('click', () => cancelar(Number(b.dataset.cancelar), b)));
  if (resaltar) $(`#reserva-${resaltar}`)?.scrollIntoView({ block: 'center' });
}

async function cobrar(id, boton) {
  const r = reservas.find((x) => x.id === id);
  const ok = await confirmar({
    titulo: `¿Cobrar ${dinero(r.precio)} en efectivo?`,
    mensaje: `${r.cliente_nombre} · ${rangoHoras(r.hora_inicio, r.hora_fin)}, ${fechaCorta(r.fecha)}. La reserva quedará confirmada.`,
    aceptar: 'Sí, cobrado',
  });
  if (!ok) return;
  await ejecutar(boton, () => adminApi.cobrarEfectivo(id), 'Cobro registrado. Reserva confirmada.');
}

async function cancelar(id, boton) {
  const r = reservas.find((x) => x.id === id);
  const motivo = await confirmar({
    titulo: 'Cancelar reserva',
    mensaje: `${r.cliente_nombre} · ${rangoHoras(r.hora_inicio, r.hora_fin)}, ${fechaCorta(r.fecha)}. El horario quedará libre${r.estado === 'confirmada' ? ' y deberás coordinar la devolución del pago' : ''}.`,
    aceptar: 'Cancelar reserva',
    cancelar: 'Volver',
    peligro: true,
    pedirTexto: { etiqueta: 'Motivo (el cliente lo verá)', requerido: true, placeholder: 'Ej.: mantenimiento de la cancha' },
  });
  if (!motivo) return;
  await ejecutar(boton, () => adminApi.cancelarReserva(id, motivo), 'Reserva cancelada.');
}

async function ejecutar(boton, accion, mensaje) {
  boton.classList.add('cargando');
  try {
    await accion();
    toast(mensaje);
    await cargar();
  } catch (error) {
    boton.classList.remove('cargando');
    manejarError(error);
  }
}

// ---- Reserva presencial -------------------------------------------------
const panelNueva = $('#nueva');
const formNueva = $('#form-nueva');
const abrir = $('#abrir-nueva');
let turnosNueva = [];

function mostrarNueva(visible) {
  panelNueva.hidden = !visible;
  abrir.setAttribute('aria-expanded', String(visible));
  if (visible) formNueva.fecha.focus();
}

abrir.addEventListener('click', () => mostrarNueva(panelNueva.hidden));
$('#cerrar-nueva').addEventListener('click', () => mostrarNueva(false));
formNueva.fecha.addEventListener('change', () => cargarTurnos());
formNueva.hora_inicio.addEventListener('change', mostrarPrecio);

async function cargarTurnos(horaPreferida = null) {
  const select = formNueva.hora_inicio;
  pintar(select, html`<option value="">Cargando…</option>`);
  try {
    const { dia } = await adminApi.panel(formNueva.fecha.value);
    const ahora = new Date();
    turnosNueva = dia.abierto ? dia.turnos.filter((t) => !t.reserva && new Date(`${dia.fecha}T${t.hora_fin}`) > ahora) : [];
    pintar(select, turnosNueva.length
      ? html`${turnosNueva.map((t) => html`<option value="${hora(t.hora_inicio)}" ${hora(t.hora_inicio) === horaPreferida ? 'selected' : ''}>
          ${rangoHoras(t.hora_inicio, t.hora_fin)} · ${dinero(t.precio)}</option>`)}`
      : html`<option value="">${dia.abierto ? 'No quedan horarios libres' : `Cerrado: ${dia.motivo}`}</option>`);
  } catch (error) {
    manejarError(error);
  }
  mostrarPrecio();
}

function mostrarPrecio() {
  const t = turnosNueva.find((x) => hora(x.hora_inicio) === formNueva.hora_inicio.value);
  $('#n-precio').textContent = t ? dinero(t.precio) : '—';
}

enviarFormulario(formNueva, async (datos) => {
  const reserva = await adminApi.crearPresencial({ ...datos, pagado: formNueva.pagado.checked });
  toast(`Reserva #${reserva.id} registrada${reserva.estado === 'confirmada' ? ' y cobrada' : ''}.`);
  // Se conserva el día (suelen registrarse varias seguidas) y se limpian los datos del cliente
  formNueva.cliente_nombre.value = '';
  formNueva.cliente_telefono.value = '';
  formNueva.pagado.checked = false;
  mostrarNueva(false);
  if (reserva.fecha < filtros.desde.value) filtros.desde.value = reserva.fecha;
  if (reserva.fecha > filtros.hasta.value) filtros.hasta.value = reserva.fecha;
  await Promise.all([cargarTurnos(), cargar()]);
});

formNueva.fecha.value = params.get('fecha') ?? hoyIso();
await cargarTurnos(params.get('hora'));
if (params.get('nueva')) mostrarNueva(true);

await cargar();
