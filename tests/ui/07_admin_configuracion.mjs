// Prueba de interfaz: configuración (horarios, tarifas con vista previa, días bloqueados, reglas y QR).
// Ejecutar: node tests/ui/07_admin_configuracion.mjs   (deja la configuración como estaba)
import { API, abrirNavegador, afirmar, credencial, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });
const api = (ruta) => nav.evaluar(`fetch('${API}${ruta}').then(r => r.json()).then(j => j.data)`);
const enDias = (n) => nav.evaluar(`(() => { const d = new Date(); d.setDate(d.getDate() + ${n}); return d.toISOString().slice(0, 10); })()`);
const filaTarifa = `[...document.querySelectorAll('#lista-tarifas tbody tr')].find(tr => tr.innerText.includes('Promo UI'))`;

try {
  await paso('el administrador abre Configuración y ve el horario de los 7 días', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', credencial('ADMIN_DEV_EMAIL'));
    await nav.escribir('#password', credencial('ADMIN_DEV_PASSWORD'));
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/admin/');
    await nav.ir('/pages/admin/configuracion.html');
    await nav.esperarQue(`document.querySelectorAll('#filas-horarios tr').length === 7`, { descripcion: '7 días' });
  });

  seccion('Precios');
  await paso('la vista previa muestra el precio de cada turno', async () => {
    await nav.clic('#tab-precios');
    await nav.esperarQue(`document.querySelectorAll('#vista-precios td[class^="nivel-"]').length > 50`, { descripcion: 'celdas con precio' });
  });

  await paso('agregar una tarifa exige elegir días', async () => {
    await nav.escribir('#t-nombre', 'Promo UI');
    await nav.escribir('#t-desde', '10:00');
    await nav.escribir('#t-hasta', '12:00');
    await nav.escribir('#t-precio', '999');
    await nav.clic('#form-tarifa [type=submit]');
    await nav.esperarQue(`document.querySelector('.dias-semana').classList.contains('invalido')`, { descripcion: 'error de días' });
  });

  await paso('con el martes elegido se agrega y la vista previa cobra Bs 999 el martes de 10 a 12', async () => {
    await nav.evaluar(`document.querySelector('#t-dias input[value="2"]').click()`);
    await nav.clic('#form-tarifa [type=submit]');
    await nav.esperarQue(filaTarifa, { descripcion: 'tarifa en la tabla' });
    const celdas = await nav.evaluar(`[...document.querySelectorAll('#vista-precios td')].filter(td => td.textContent === '999').map(td => td.title)`);
    afirmar(celdas.length === 2 && celdas.every((t) => t.startsWith('Martes')), `celdas con 999: ${celdas}`);
    await nav.captura('07-config-precios');
  });

  await paso('editar la tarifa cambia el precio y eliminarla la quita', async () => {
    await nav.evaluar(`${filaTarifa}.querySelector('[data-editar]').click()`);
    await nav.esperarQue(`document.querySelector('#t-nombre').value === 'Promo UI'`, { descripcion: 'formulario cargado' });
    await nav.escribir('#t-precio', '888');
    await nav.clic('#form-tarifa [type=submit]');
    await nav.esperarQue(`${filaTarifa}?.innerText.includes('888')`, { descripcion: 'precio 888' });
    await nav.evaluar(`${filaTarifa}.querySelector('[data-eliminar]').click()`);
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`!(${filaTarifa})`, { descripcion: 'tarifa eliminada' });
  });

  seccion('Días bloqueados');
  await paso('bloquear un día lo cierra en el calendario público y se puede desbloquear', async () => {
    const fecha = await enDias(12);
    await nav.clic('#tab-bloqueos');
    await nav.escribir('#b-fecha', fecha);
    await nav.escribir('#b-motivo', 'Prueba de interfaz');
    await nav.clic('#form-bloqueo [type=submit]');
    await nav.esperarQue(`document.querySelector('#lista-bloqueos').innerText.includes('Prueba de interfaz')`, { descripcion: 'día en la lista' });
    const dia = await api(`/disponibilidad?fecha=${fecha}`);
    afirmar(dia.abierto === false && dia.motivo === 'Prueba de interfaz', 'el día sigue abierto');
    await nav.evaluar(`[...document.querySelectorAll('#lista-bloqueos li')].find(li => li.innerText.includes('Prueba de interfaz')).querySelector('button').click()`);
    await nav.esperarQue(`!document.querySelector('#lista-bloqueos').innerText.includes('Prueba de interfaz')`, { descripcion: 'desbloqueado' });
  });

  seccion('Reglas y medios de pago');
  await paso('cambiar los minutos para pagar se guarda y se aplica', async () => {
    await nav.clic('#tab-reglas');
    const original = await nav.evaluar(`document.querySelector('#reserva_minutos_pago').value`);
    await nav.escribir('#reserva_minutos_pago', '25');
    await nav.clic('#form-reglas [type=submit]');
    await nav.esperarQue(`document.querySelector('.toast')`);
    const info = await api('/publico/info');
    afirmar(info.reglas.minutos_pago === 25, `minutos: ${info.reglas.minutos_pago}`);
    await nav.escribir('#reserva_minutos_pago', original);
    await nav.clic('#form-reglas [type=submit]');
  });

  await paso('Medios de pago muestra el QR actual', async () => {
    await nav.clic('#tab-pagos');
    await nav.esperarQue(`document.querySelector('#qr-vista img')?.naturalWidth > 0`, { descripcion: 'QR cargado' });
    await nav.captura('07-config-pagos', { completa: false });
  });

  await paso('en celular no hay scroll horizontal', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir('/pages/admin/index.html');
    await nav.ir('/pages/admin/configuracion.html#precios');
    await nav.esperarQue(`document.querySelectorAll('#vista-precios td').length > 0`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
