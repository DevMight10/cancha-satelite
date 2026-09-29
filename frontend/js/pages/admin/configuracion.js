import { adminApi } from '../../api/adminApi.js';
import { publicoApi } from '../../api/publicoApi.js';
import { confirmar } from '../../components/dialogo.js';
import { enviarFormulario, manejarError } from '../../components/formulario.js';
import { toast } from '../../components/toast.js';
import { RUTAS } from '../../config.js';
import { iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { dinero, fechaLarga, hora, hoyIso } from '../../utils/formato.js';

await iniciarAdmin('configuracion');

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
let config;

// ---- Pestañas ----------------------------------------------------------------
function mostrarSeccion(id) {
  $$('[data-seccion]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.seccion === id)));
  $$('.seccion-config').forEach((s) => { s.hidden = s.id !== `sec-${id}`; });
  history.replaceState(null, '', `#${id}`);
}
$$('[data-seccion]').forEach((t) => t.addEventListener('click', () => mostrarSeccion(t.dataset.seccion)));
const inicial = location.hash.slice(1);
if (inicial && $(`#sec-${inicial}`)) mostrarSeccion(inicial);

async function cargar() {
  try {
    config = await adminApi.configuracion();
    renderTodo();
  } catch (error) {
    manejarError(error);
  }
}

function aplicar(datos) {
  config = datos;
  renderTodo();
}

function renderTodo() {
  renderHorarios();
  renderTarifas();
  renderBloqueos();
  renderValores();
  renderQr();
}

// ---- Horarios ----------------------------------------------------------------
const formHorarios = $('#form-horarios');

function renderHorarios() {
  pintar($('#duracion'), html`${config.duraciones.map((d) => html`
    <option value="${d}" ${d === config.duracion_turno ? 'selected' : ''}>${d} minutos</option>`)}`);

  pintar($('#filas-horarios'), html`${config.horarios.map((h) => html`
    <tr data-dia="${h.dia_semana}" class="${h.cerrado ? 'fila-cerrada' : ''}">
      <th scope="row">${DIAS[h.dia_semana - 1]}</th>
      <td><label class="casilla"><input type="checkbox" class="abierto" ${h.cerrado ? '' : 'checked'} aria-label="${DIAS[h.dia_semana - 1]} atiende"> Abierto</label></td>
      <td><input class="control apertura" type="time" step="900" value="${hora(h.hora_apertura)}" aria-label="Hora de apertura del ${DIAS[h.dia_semana - 1]}"></td>
      <td><input class="control cierre" type="time" step="900" value="${hora(h.hora_cierre)}" aria-label="Hora de cierre del ${DIAS[h.dia_semana - 1]}"></td>
    </tr>`)}`);

  $$('#filas-horarios .abierto').forEach((c) => c.addEventListener('change', () => c.closest('tr').classList.toggle('fila-cerrada', !c.checked)));
}

enviarFormulario(formHorarios, async () => {
  const horarios = $$('#filas-horarios tr').map((tr) => ({
    dia_semana: Number(tr.dataset.dia),
    cerrado: !tr.querySelector('.abierto').checked,
    hora_apertura: tr.querySelector('.apertura').value,
    hora_cierre: tr.querySelector('.cierre').value,
  }));
  aplicar(await adminApi.guardarHorarios(horarios, Number($('#duracion').value)));
  toast('Horarios guardados. El calendario ya muestra los cambios.');
});

// ---- Tarifas -----------------------------------------------------------------
const formTarifa = $('#form-tarifa');

pintar($('#t-dias'), html`${INICIALES.map((l, i) => html`
  <label class="chip-dia" title="${DIAS[i]}"><input type="checkbox" value="${i + 1}"><span>${l}</span><span class="visualmente-oculto">${DIAS[i]}</span></label>`)}`);

function diasElegidos() {
  return $$('#t-dias input:checked').map((c) => Number(c.value));
}

function editarTarifa(t) {
  formTarifa.id.value = t?.id ?? '';
  formTarifa.nombre.value = t?.nombre ?? '';
  formTarifa.hora_desde.value = t ? hora(t.hora_desde) : '';
  formTarifa.hora_hasta.value = t ? hora(t.hora_hasta) : '';
  formTarifa.precio.value = t ? Number(t.precio) : '';
  $$('#t-dias input').forEach((c) => { c.checked = t ? t.dias.includes(Number(c.value)) : false; });
  $('#t-activa').checked = t ? Boolean(t.activa) : true;
  $('#titulo-tarifa').textContent = t ? `Editar "${t.nombre}"` : 'Nueva tarifa';
  $('#t-boton').textContent = t ? 'Guardar cambios' : 'Agregar tarifa';
  $('#t-cancelar').hidden = !t;
  if (t) formTarifa.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#t-cancelar').addEventListener('click', () => editarTarifa(null));

enviarFormulario(formTarifa, async (datos) => {
  const tarifa = {
    nombre: datos.nombre,
    hora_desde: datos.hora_desde,
    hora_hasta: datos.hora_hasta,
    precio: datos.precio,
    dias: diasElegidos(),
    activa: $('#t-activa').checked,
  };
  const id = Number(datos.id);
  aplicar(id ? await adminApi.actualizarTarifa(id, tarifa) : await adminApi.crearTarifa(tarifa));
  toast(id ? 'Tarifa actualizada.' : 'Tarifa agregada.');
  editarTarifa(null);
});

function textoDias(dias) {
  if (dias.length === 7) return 'Todos los días';
  if (dias.join() === '1,2,3,4,5') return 'Lunes a viernes';
  if (dias.join() === '6,7') return 'Fin de semana';
  return dias.map((d) => DIAS[d - 1].slice(0, 3)).join(', ');
}

function renderTarifas() {
  const lista = $('#lista-tarifas');
  if (!config.tarifas.length) {
    pintar(lista, html`<div class="vacio"><i data-lucide="tag"></i><h3>Sin tarifas</h3>
      <p>Sin tarifas no se ofrece ningún turno. Agrega al menos una tarifa base para todos los días.</p></div>`);
  } else {
    pintar(lista, html`
      <div class="tabla-envoltura"><table class="tabla">
        <thead><tr><th scope="col">Nombre</th><th scope="col">Días</th><th scope="col">Horario</th>
          <th scope="col" class="derecha">Precio</th><th scope="col">Estado</th><th scope="col"><span class="visualmente-oculto">Acciones</span></th></tr></thead>
        <tbody>${config.tarifas.map((t) => html`
          <tr class="${t.activa ? '' : 'fila-cerrada'}">
            <td><strong>${t.nombre}</strong></td>
            <td>${textoDias(t.dias)}</td>
            <td class="num">${hora(t.hora_desde)} – ${hora(t.hora_hasta)}</td>
            <td class="derecha num"><strong>${dinero(t.precio)}</strong></td>
            <td>${t.activa ? html`<span class="chip chip-confirmada">Activa</span>` : html`<span class="chip chip-expirada">Inactiva</span>`}</td>
            <td class="acciones">
              <button type="button" class="btn btn-sm" data-editar="${t.id}">Editar</button>
              <button type="button" class="btn btn-sm btn-peligro" data-eliminar="${t.id}">Eliminar</button>
            </td>
          </tr>`)}</tbody>
      </table></div>`);
    $$('[data-editar]', lista).forEach((b) => b.addEventListener('click', () => editarTarifa(config.tarifas.find((t) => t.id === Number(b.dataset.editar)))));
    $$('[data-eliminar]', lista).forEach((b) => b.addEventListener('click', () => eliminarTarifa(Number(b.dataset.eliminar), b)));
  }
  renderVistaPrecios();
}

async function eliminarTarifa(id, boton) {
  const t = config.tarifas.find((x) => x.id === id);
  if (!await confirmar({ titulo: `¿Eliminar la tarifa "${t.nombre}"?`, mensaje: 'Las reservas ya hechas conservan su precio.', aceptar: 'Eliminar', peligro: true })) return;
  boton.classList.add('cargando');
  try {
    aplicar(await adminApi.eliminarTarifa(id));
    toast('Tarifa eliminada.');
  } catch (error) {
    boton.classList.remove('cargando');
    manejarError(error);
  }
}

/** Precio de cada turno de la semana con la misma regla del backend (la tarifa más alta). */
function renderVistaPrecios() {
  const duracion = config.duracion_turno;
  const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const activas = config.tarifas.filter((t) => t.activa);
  const abiertos = config.horarios.filter((h) => !h.cerrado);
  if (!abiertos.length) {
    pintar($('#vista-precios'), html`<p class="texto-suave">La cancha está cerrada todos los días.</p>`);
    return;
  }

  const desde = Math.min(...abiertos.map((h) => aMin(h.hora_apertura)));
  const hasta = Math.max(...abiertos.map((h) => aMin(h.hora_cierre)));
  const precio = (dia, m) => {
    const h = config.horarios.find((x) => x.dia_semana === dia);
    if (h.cerrado || m < aMin(h.hora_apertura) || m + duracion > aMin(h.hora_cierre)) return null;
    const t = aHora(m);
    const coinciden = activas.filter((x) => x.dias.includes(dia) && hora(x.hora_desde) <= t && t < hora(x.hora_hasta));
    return coinciden.length ? Math.max(...coinciden.map((x) => Number(x.precio))) : 0;
  };

  const filas = [];
  for (let m = desde; m + duracion <= hasta; m += duracion) filas.push(m);
  const precios = [...new Set(filas.flatMap((m) => [1, 2, 3, 4, 5, 6, 7].map((d) => precio(d, m))).filter((p) => p))].sort((a, b) => a - b);
  const nivel = (p) => Math.min(4, Math.round((precios.indexOf(p) / Math.max(1, precios.length - 1)) * 3) + 1);

  pintar($('#vista-precios'), html`
    <table class="semana precios">
      <caption class="visualmente-oculto">Precio de cada turno por día y hora</caption>
      <thead><tr><th scope="col"><span class="visualmente-oculto">Hora</span></th>${INICIALES.map((l, i) => html`<th scope="col" title="${DIAS[i]}">${l}</th>`)}</tr></thead>
      <tbody>${filas.map((m) => html`<tr><th scope="row">${aHora(m)}</th>${[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const p = precio(d, m);
        if (p === null) return html`<td class="cerrado" title="Cerrado"></td>`;
        if (p === 0) return html`<td class="sin-tarifa" title="Sin tarifa: no se ofrece">—</td>`;
        return html`<td class="nivel-${nivel(p)}" title="${DIAS[d - 1]} ${aHora(m)}: ${dinero(p)}">${p}</td>`;
      })}</tr>`)}</tbody>
    </table>
    <p class="texto-sm texto-suave">Montos en Bs. "—" = ninguna tarifa cubre ese turno, por eso no se ofrece a los clientes.</p>`);
}

// ---- Días bloqueados -----------------------------------------------------------
const formBloqueo = $('#form-bloqueo');
formBloqueo.fecha.min = hoyIso();

function renderBloqueos() {
  const lista = $('#lista-bloqueos');
  if (!config.bloqueos.length) {
    pintar(lista, html`<p class="texto-suave">No hay días bloqueados próximos.</p>`);
    return;
  }
  pintar(lista, html`<ul class="lista-simple">${config.bloqueos.map((b) => html`
    <li><span><strong>${fechaLarga(b.fecha)}</strong> · ${b.motivo}</span>
      <button type="button" class="btn btn-sm" data-desbloquear="${b.id}">Desbloquear</button></li>`)}</ul>`);
  $$('[data-desbloquear]', lista).forEach((b) => b.addEventListener('click', async () => {
    b.classList.add('cargando');
    try {
      aplicar(await adminApi.eliminarBloqueo(Number(b.dataset.desbloquear)));
      toast('Día desbloqueado.');
    } catch (error) {
      b.classList.remove('cargando');
      manejarError(error);
    }
  }));
}

enviarFormulario(formBloqueo, async ({ fecha, motivo }) => {
  const respuesta = await adminApi.crearBloqueo(fecha, motivo);
  aplicar(respuesta);
  formBloqueo.reset();
  toast('Día bloqueado.');
  pintar($('#aviso-afectadas'), respuesta.reservas_afectadas
    ? html`<div class="aviso aviso-advertencia aviso-separado"><i data-lucide="triangle-alert"></i>
        <span>Ese día hay <strong>${respuesta.reservas_afectadas} ${respuesta.reservas_afectadas === 1 ? 'reserva activa' : 'reservas activas'}</strong>.
        <a href="${RUTAS.adminReservas}?desde=${fecha}&hasta=${fecha}">Revísalas y cancélalas</a> para avisar a los clientes.</span></div>`
    : html``);
});

// ---- Reglas, negocio y datos de pago -------------------------------------------
function renderValores() {
  for (const [clave, valor] of Object.entries(config.valores)) {
    const campo = document.getElementById(clave);
    if (!campo) continue;
    if (campo.type === 'checkbox') campo.checked = valor === '1';
    else campo.value = valor ?? '';
  }
}

for (const id of ['#form-reglas', '#form-negocio', '#form-pagos']) {
  const form = $(id);
  enviarFormulario(form, async (datos) => {
    if (id === '#form-reglas') datos.notificar_email = $('#notificar_email').checked ? '1' : '0';
    aplicar(await adminApi.guardarGeneral(datos));
    toast('Cambios guardados.');
  });
}

// ---- QR ------------------------------------------------------------------------
const formQr = $('#form-qr');

function renderQr() {
  $('#quitar-qr').hidden = !config.tiene_qr;
  pintar($('#qr-vista'), config.tiene_qr
    ? html`<img src="${publicoApi.urlQr()}?v=${Date.now()}" alt="QR de pago actual" width="180" height="180">`
    : html`<span class="texto-suave texto-sm"><i data-lucide="qr-code"></i>Sin QR cargado</span>`);
}

enviarFormulario(formQr, async (_datos, form) => {
  aplicar(await adminApi.subirQr(new FormData(form)));
  form.reset();
  toast('QR actualizado. Los clientes ya lo ven al pagar.');
});

$('#quitar-qr').addEventListener('click', async () => {
  if (!await confirmar({ titulo: '¿Quitar el QR?', mensaje: 'Los clientes dejarán de ver la opción de pagar con QR.', aceptar: 'Quitar', peligro: true })) return;
  try {
    aplicar(await adminApi.eliminarQr());
    toast('QR eliminado.');
  } catch (error) {
    manejarError(error);
  }
});

await cargar();
