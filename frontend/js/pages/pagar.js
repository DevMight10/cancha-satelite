import { publicoApi } from '../api/publicoApi.js';
import { reservasApi } from '../api/reservasApi.js';
import { enviarFormulario, manejarError } from '../components/formulario.js';
import { ticketReserva } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { RUTAS } from '../config.js';
import { iniciarPagina } from '../core/pagina.js';
import { $, $$, html, pintar } from '../utils/dom.js';
import { METODOS_PAGO, dinero } from '../utils/formato.js';
import { describirReserva, enlaceWhatsapp } from '../utils/whatsapp.js';

await iniciarPagina({ acceso: 'sesion', activa: 'mis-reservas' });

const id = Number(new URLSearchParams(location.search).get('reserva'));
if (!id) location.replace(RUTAS.misReservas);

const contenido = $('#contenido');
let reserva;
let desfaseReloj = 0; // diferencia entre el reloj del servidor y el del teléfono
let temporizador;

async function cargar() {
  try {
    reserva = await reservasApi.obtener(id);
    desfaseReloj = new Date(reserva.ahora.replace(' ', 'T')) - new Date();
    render();
  } catch (error) {
    if (error.status === 404) {
      pintar(contenido, html`<div class="vacio"><i data-lucide="search-x"></i><h3>No encontramos esa reserva</h3>
        <a class="btn btn-primario" href="${RUTAS.misReservas}">Ver mis reservas</a></div>`);
      return;
    }
    manejarError(error);
  }
}

const TITULOS = {
  pendiente_pago: ['Paga tu reserva', 'Paga el monto exacto y envía la foto o captura del comprobante.'],
  en_revision: ['Comprobante en revisión', 'La cancha está revisando tu pago. Te avisaremos por correo.'],
  confirmada: ['¡Reserva confirmada!', 'Tu horario está asegurado. Nos vemos en la cancha.'],
  cancelada: ['Reserva cancelada', 'Esta reserva fue cancelada y el horario quedó libre.'],
  expirada: ['Reserva vencida', 'No se recibió el pago a tiempo y el horario se liberó.'],
};

function render() {
  clearInterval(temporizador);
  const [titulo, subtitulo] = TITULOS[reserva.estado];
  $('#titulo').textContent = titulo;
  $('#subtitulo').textContent = subtitulo;
  document.title = `${titulo} · Cancha Satélite Norte`;

  pintar(contenido, html`
    <div class="pagar-lado">
      ${ticketReserva(reserva)}
      ${botonWhatsapp()}
    </div>
    <div class="pagar-principal">${panelSegunEstado()}</div>`);

  if (reserva.estado === 'pendiente_pago') activarPago();
}

function panelSegunEstado() {
  const ultimoPago = reserva.pagos[0];

  switch (reserva.estado) {
    case 'pendiente_pago':
      return html`
        ${reserva.expira_en ? html`
          <div class="aviso aviso-advertencia" id="cuenta-regresiva">
            <i data-lucide="timer"></i><span>Calculando tiempo para pagar…</span>
          </div>` : ''}
        ${ultimoPago?.estado === 'rechazado' ? html`
          <div class="aviso aviso-error">
            <i data-lucide="circle-x"></i>
            <span><strong>Tu comprobante anterior fue rechazado:</strong> ${ultimoPago.observacion}. Envía uno nuevo.</span>
          </div>` : ''}
        ${medioDePago()}`;

    case 'en_revision':
      return html`
        <div class="panel">
          <div class="aviso aviso-info"><i data-lucide="hourglass"></i>
            <span>Recibimos tu comprobante por <strong>${METODOS_PAGO[ultimoPago.metodo]}</strong>${ultimoPago.referencia ? ` (transacción ${ultimoPago.referencia})` : ''}. Cuando la cancha lo apruebe, tu reserva quedará confirmada.</span>
          </div>
          <div class="acciones-fila">
            <a class="btn" href="${reservasApi.urlComprobante(ultimoPago.id)}" target="_blank" rel="noopener"><i data-lucide="file-image"></i>Ver comprobante enviado</a>
            <a class="btn btn-primario" href="${RUTAS.misReservas}">Ir a mis reservas</a>
          </div>
        </div>`;

    case 'confirmada':
      return html`
        <div class="panel">
          <div class="aviso aviso-exito"><i data-lucide="circle-check"></i>
            <span>Pago aprobado. Llega unos minutos antes y muestra tu número de reserva si te lo piden.</span></div>
          <div class="acciones-fila">
            <a class="btn btn-primario" href="${RUTAS.misReservas}">Ver mis reservas</a>
            <a class="btn" href="${RUTAS.reservar}"><i data-lucide="calendar-plus"></i>Reservar otro horario</a>
          </div>
        </div>`;

    default:
      return html`
        <div class="panel">
          <div class="aviso"><i data-lucide="info"></i><span>${reserva.motivo_cancelacion ?? TITULOS[reserva.estado][1]}</span></div>
          <div class="acciones-fila"><a class="btn btn-primario" href="${RUTAS.reservar}"><i data-lucide="calendar-plus"></i>Hacer una nueva reserva</a></div>
        </div>`;
  }
}

function medioDePago() {
  const datos = reserva.datos_pago;
  const metodos = ['qr', 'tigo_money', 'transferencia'].filter((m) => datos[m]);

  if (!metodos.length) {
    return html`<div class="aviso aviso-advertencia"><i data-lucide="triangle-alert"></i>
      <span>La cancha todavía no configuró los pagos digitales. Comunícate por WhatsApp o paga en efectivo en la cancha.</span></div>`;
  }

  const paneles = {
    qr: () => html`
      <div class="metodo-qr">
        <img src="${publicoApi.urlQr()}" alt="Código QR para pagar ${dinero(reserva.precio)}" width="220" height="220">
        <div>
          <p>Escanea el <strong>QR Simple</strong> desde la app de tu banco y paga exactamente <strong>${dinero(reserva.precio)}</strong>.</p>
          ${datos.qr.titular ? html`<p class="texto-suave texto-sm">A nombre de ${datos.qr.titular}</p>` : ''}
        </div>
      </div>`,
    tigo_money: () => html`
      <dl class="datos-pago">
        <div><dt>Número Tigo Money</dt><dd class="num">${datos.tigo_money.numero}${botonCopiar(datos.tigo_money.numero)}</dd></div>
        ${datos.tigo_money.titular ? html`<div><dt>A nombre de</dt><dd>${datos.tigo_money.titular}</dd></div>` : ''}
        <div><dt>Monto</dt><dd class="num">${dinero(reserva.precio)}</dd></div>
      </dl>`,
    transferencia: () => html`
      <dl class="datos-pago">
        <div><dt>Banco</dt><dd>${datos.transferencia.banco}</dd></div>
        <div><dt>Número de cuenta</dt><dd class="num">${datos.transferencia.cuenta}${botonCopiar(datos.transferencia.cuenta)}</dd></div>
        ${datos.transferencia.titular ? html`<div><dt>Titular</dt><dd>${datos.transferencia.titular}</dd></div>` : ''}
        <div><dt>Monto</dt><dd class="num">${dinero(reserva.precio)}</dd></div>
      </dl>`,
  };

  return html`
    <div class="panel pago">
      <h2 class="panel-titulo">1. Paga ${dinero(reserva.precio)}</h2>
      <div class="pestanas" role="tablist" aria-label="Medio de pago">
        ${metodos.map((m, i) => html`
          <button type="button" class="pestana" role="tab" id="tab-${m}" aria-controls="panel-${m}" aria-selected="${i === 0}" data-metodo="${m}">${METODOS_PAGO[m]}</button>`)}
      </div>
      ${metodos.map((m, i) => html`
        <div class="panel-metodo" role="tabpanel" id="panel-${m}" aria-labelledby="tab-${m}" ${i === 0 ? '' : 'hidden'}>${paneles[m]()}</div>`)}

      <h2 class="panel-titulo">2. Envía el comprobante</h2>
      <form id="form-pago" class="formulario" novalidate>
        <input type="hidden" name="metodo" value="${metodos[0]}">
        <div class="campo">
          <label for="comprobante">Foto o captura del comprobante</label>
          <input class="control" type="file" id="comprobante" name="comprobante" accept="image/jpeg,image/png,image/webp,application/pdf" aria-describedby="comprobante-ayuda" required>
          <p class="ayuda" id="comprobante-ayuda">JPG, PNG, WEBP o PDF de hasta 5 MB.</p>
          <p class="error-campo"></p>
        </div>
        <div class="campo">
          <label for="referencia">Número de transacción <span class="texto-suave">(opcional)</span></label>
          <input class="control" id="referencia" name="referencia" maxlength="60" inputmode="text" autocomplete="off">
          <p class="error-campo"></p>
        </div>
        <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="send"></i>Enviar comprobante</button>
      </form>
    </div>`;
}

function botonCopiar(valor) {
  return html`<button type="button" class="btn btn-fantasma btn-sm copiar" data-copiar="${valor}" aria-label="Copiar ${valor}"><i data-lucide="copy"></i></button>`;
}

function botonWhatsapp() {
  const enlace = enlaceWhatsapp(reserva.datos_pago.whatsapp,
    `Hola, soy ${reserva.cliente_nombre}. Escribo por mi reserva del ${describirReserva(reserva)}.`);
  return enlace
    ? html`<a class="btn btn-bloque" href="${enlace}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i>Escribir a la cancha por WhatsApp</a>`
    : '';
}

function activarPago() {
  const form = $('#form-pago');

  $$('.pestana').forEach((tab) => tab.addEventListener('click', () => {
    $$('.pestana').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $$('.panel-metodo').forEach((p) => { p.hidden = p.id !== `panel-${tab.dataset.metodo}`; });
    if (form) form.elements.metodo.value = tab.dataset.metodo;
  }));

  $$('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copiar);
      toast('Copiado');
    } catch {
      toast('No se pudo copiar; mantén presionado el número para copiarlo', 'info');
    }
  }));

  if (form) {
    enviarFormulario(form, async (_datos, formulario) => {
      reserva = { ...reserva, ...(await reservasApi.enviarPago(id, new FormData(formulario))) };
      toast('Comprobante enviado. La cancha lo revisará pronto.');
      await cargar();
    });
  }

  iniciarCuentaRegresiva();
}

function iniciarCuentaRegresiva() {
  const aviso = $('#cuenta-regresiva span');
  if (!aviso) return;
  const vence = new Date(reserva.expira_en.replace(' ', 'T'));

  const actualizar = () => {
    const minutos = Math.ceil((vence - (Date.now() + desfaseReloj)) / 60000);
    if (minutos <= 0) {
      clearInterval(temporizador);
      cargar();
      return;
    }
    aviso.innerHTML = html`Tienes <strong>${minutos} min</strong> para pagar. Si no, el horario se libera para otros.`.__html;
  };
  actualizar();
  temporizador = setInterval(actualizar, 15000);
}

await cargar();
