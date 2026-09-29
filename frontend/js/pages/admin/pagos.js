import { adminApi } from '../../api/adminApi.js';
import { reservasApi } from '../../api/reservasApi.js';
import { confirmar } from '../../components/dialogo.js';
import { manejarError } from '../../components/formulario.js';
import { toast } from '../../components/toast.js';
import { actualizarContadores, iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { ESTADOS_RESERVA, METODOS_PAGO, dinero, fechaLarga, rangoHoras } from '../../utils/formato.js';
import { describirReserva, enlaceWhatsapp } from '../../utils/whatsapp.js';

await iniciarAdmin('pagos');

const lista = $('#lista');
let estado = 'pendiente';
let pagos = [];

$$('[data-estado]').forEach((tab) => tab.addEventListener('click', () => {
  estado = tab.dataset.estado;
  $$('[data-estado]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
  cargar();
}));

async function cargar() {
  pintar(lista, html`<div class="esqueleto bloque-cargando"></div>`);
  try {
    pagos = await adminApi.pagos(estado);
    render();
  } catch (error) {
    manejarError(error);
  }
}

const hace = (fechaHora) => {
  const minutos = Math.round((new Date() - new Date(fechaHora.replace(' ', 'T'))) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 1440) return `hace ${Math.round(minutos / 60)} h`;
  return `hace ${Math.round(minutos / 1440)} días`;
};

function render() {
  if (!pagos.length) {
    const textos = {
      pendiente: ['Todo al día', 'No hay comprobantes por revisar. Cuando un cliente envíe uno, aparecerá aquí.'],
      aprobado: ['Sin pagos aprobados', 'Los pagos que apruebes aparecerán aquí.'],
      rechazado: ['Sin pagos rechazados', 'Los comprobantes rechazados aparecerán aquí con su motivo.'],
    };
    pintar(lista, html`<div class="vacio"><i data-lucide="${estado === 'pendiente' ? 'circle-check' : 'receipt'}"></i>
      <h3>${textos[estado][0]}</h3><p>${textos[estado][1]}</p></div>`);
    return;
  }

  pintar(lista, html`${pagos.map((p) => {
    const whatsapp = enlaceWhatsapp(p.cliente_telefono, `Hola ${p.cliente_nombre.split(' ')[0]}, te escribimos de la Cancha Satélite Norte por el pago de tu reserva del ${describirReserva({ ...p, id: p.reserva_id })}.`);
    const url = reservasApi.urlComprobante(p.id);
    return html`
      <article class="pago-tarjeta" data-pago="${p.id}">
        <a class="pago-vista" href="${url}" target="_blank" rel="noopener" aria-label="Abrir comprobante de ${p.cliente_nombre} en otra pestaña">
          ${p.tiene_comprobante ? html`<img src="${url}" alt="Comprobante de ${p.cliente_nombre}" loading="lazy">` : html`<i data-lucide="banknote"></i>`}
          <span class="pago-vista-pdf" hidden><i data-lucide="file-text"></i>Ver PDF</span>
        </a>
        <div class="pago-datos">
          <div class="pago-cabecera">
            <strong class="pago-monto num">${dinero(p.monto)}</strong>
            <span class="chip chip-${p.estado}">${METODOS_PAGO[p.metodo]}</span>
          </div>
          <p><strong>${p.cliente_nombre}</strong> · ${p.cliente_telefono}</p>
          <p class="texto-sm">Reserva #${p.reserva_id}: ${fechaLarga(p.fecha)}, ${rangoHoras(p.hora_inicio, p.hora_fin)}
            <span class="chip chip-${p.reserva_estado}">${ESTADOS_RESERVA[p.reserva_estado]}</span></p>
          <p class="texto-sm texto-suave">Enviado ${hace(p.creado_en)}${p.referencia ? html` · Transacción <strong>${p.referencia}</strong>` : ''}</p>
          ${p.estado === 'rechazado' ? html`<p class="texto-sm">Motivo del rechazo: <strong>${p.observacion}</strong></p>` : ''}
          ${Number(p.monto) !== Number(p.precio) ? html`<div class="aviso aviso-advertencia"><i data-lucide="triangle-alert"></i><span>El precio de la reserva es ${dinero(p.precio)}.</span></div>` : ''}
          <div class="acciones-fila">
            ${p.estado === 'pendiente' ? html`
              <button type="button" class="btn btn-primario" data-aprobar="${p.id}"><i data-lucide="check"></i>Aprobar</button>
              <button type="button" class="btn btn-peligro" data-rechazar="${p.id}"><i data-lucide="x"></i>Rechazar</button>` : ''}
            ${whatsapp ? html`<a class="btn" href="${whatsapp}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i>WhatsApp</a>` : ''}
          </div>
        </div>
      </article>`;
  })}`);

  // Un PDF no se puede mostrar como imagen: se reemplaza por un enlace
  $$('.pago-vista img', lista).forEach((img) => img.addEventListener('error', () => {
    img.hidden = true;
    img.nextElementSibling.hidden = false;
  }));
  $$('[data-aprobar]', lista).forEach((b) => b.addEventListener('click', () => aprobar(Number(b.dataset.aprobar), b)));
  $$('[data-rechazar]', lista).forEach((b) => b.addEventListener('click', () => rechazar(Number(b.dataset.rechazar), b)));
}

async function aprobar(id, boton) {
  const p = pagos.find((x) => x.id === id);
  const ok = await confirmar({
    titulo: `¿Aprobar ${dinero(p.monto)}?`,
    mensaje: `Confirma que recibiste el pago de ${p.cliente_nombre}. La reserva quedará confirmada y el cliente recibirá un correo.`,
    aceptar: 'Sí, aprobar',
  });
  if (!ok) return;
  await ejecutar(boton, () => adminApi.aprobarPago(id), 'Pago aprobado. La reserva quedó confirmada.');
}

async function rechazar(id, boton) {
  const p = pagos.find((x) => x.id === id);
  const motivo = await confirmar({
    titulo: 'Rechazar comprobante',
    mensaje: `${p.cliente_nombre} recibirá el motivo por correo y podrá enviar un comprobante nuevo.`,
    aceptar: 'Rechazar',
    peligro: true,
    pedirTexto: { etiqueta: 'Motivo', requerido: true, placeholder: 'Ej.: el monto no coincide, la imagen no se lee' },
  });
  if (!motivo) return;
  await ejecutar(boton, () => adminApi.rechazarPago(id, motivo), 'Comprobante rechazado. Se avisó al cliente.');
}

async function ejecutar(boton, accion, mensaje) {
  boton.classList.add('cargando');
  try {
    await accion();
    toast(mensaje);
    await cargar();
    actualizarContadores('pagos');
  } catch (error) {
    boton.classList.remove('cargando');
    manejarError(error);
    if (error.status === 409) cargar();
  }
}

await cargar();
