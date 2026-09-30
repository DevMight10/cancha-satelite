// Prueba de interfaz: reservas presenciales, cobro en efectivo, búsqueda y cancelación.
// Ejecutar: node tests/ui/06_admin_reservas.mjs
import { abrirNavegador, afirmar, credencial, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });
const sufijo = Date.now() % 100000;
const pagado = `Equipo Pagado ${sufijo}`;
const debe = `Equipo Debe ${sufijo}`;

const fila = (nombre) => `[...document.querySelectorAll('.tabla tbody tr')].find(tr => tr.innerText.includes(${JSON.stringify(nombre)}))`;

try {
  await paso('el administrador entra', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', credencial('ADMIN_DEV_EMAIL'));
    await nav.escribir('#password', credencial('ADMIN_DEV_PASSWORD'));
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/admin/');
  });

  seccion('Reserva presencial desde el panel');
  await paso('tocar un espacio libre del cronograma abre el formulario con día y hora elegidos', async () => {
    await nav.escribir('#fecha', await nav.evaluar(`(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })()`));
    // La fecha puede caer en otra semana: esperar a que el cronograma de esa semana esté pintado
    const enlace = `[...document.querySelectorAll('.crono-libre')].find(a => a.href.includes('fecha=' + document.querySelector('#fecha').value))`;
    await nav.esperarQue(`document.querySelector('.crono-dia[aria-pressed="true"]')?.dataset.fecha === document.querySelector('#fecha').value && ${enlace}`, { descripcion: 'espacio libre del día' });
    const esperado = await nav.evaluar(`new URL(${enlace}.href).searchParams.get('hora')`);
    await nav.evaluar(`${enlace}.click()`);
    await nav.esperarUrl('/pages/admin/reservas.html');
    await nav.esperarQue(`!document.querySelector('#nueva').hidden && document.querySelector('#n-hora').value === ${JSON.stringify(esperado)}`, { descripcion: 'formulario con hora' });
  });

  await paso('registra una reserva pagada en efectivo y aparece confirmada', async () => {
    await nav.escribir('#n-nombre', pagado);
    await nav.escribir('#n-telefono', '75556666');
    await nav.evaluar(`document.querySelector('#n-pagado').click()`);
    await nav.captura('06-admin-nueva-presencial', { completa: false });
    await nav.clic('#form-nueva [type=submit]');
    await nav.esperarQue(`${fila(pagado)}?.querySelector('.chip-confirmada')`, { descripcion: 'fila confirmada' });
  });

  await paso('muestra el error del celular junto al campo', async () => {
    await nav.clic('#abrir-nueva');
    await nav.escribir('#n-nombre', debe);
    await nav.escribir('#n-telefono', '123');
    await nav.clic('#form-nueva [type=submit]');
    await nav.esperarQue(`document.querySelector('#n-telefono').closest('.campo').classList.contains('invalido')`, { descripcion: 'error del celular' });
  });

  await paso('registra otra sin pagar y luego la cobra en efectivo', async () => {
    await nav.escribir('#n-telefono', '75557777');
    await nav.clic('#form-nueva [type=submit]');
    await nav.esperarQue(`${fila(debe)}?.querySelector('.chip-pendiente_pago')`, { descripcion: 'fila pendiente' });
    await nav.evaluar(`${fila(debe)}.querySelector('[data-cobrar]').click()`);
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`${fila(debe)}?.querySelector('.chip-confirmada')`, { descripcion: 'cobrada' });
  });

  seccion('Búsqueda y cancelación');
  await paso('buscar por nombre filtra la tabla', async () => {
    await nav.escribir('#f-buscar', `Equipo Debe ${sufijo}`);
    await nav.esperarQue(`document.querySelectorAll('.tabla tbody tr').length === 1`, { descripcion: '1 resultado' });
  });

  await paso('cancelar pide motivo y la reserva queda cancelada con el motivo', async () => {
    await nav.evaluar(`${fila(debe)}.querySelector('[data-cancelar]').click()`);
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.escribir('#dialogo-texto', 'Lluvia intensa');
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`${fila(debe)}?.querySelector('.chip-cancelada') && ${fila(debe)}.innerText.includes('Lluvia intensa')`, { descripcion: 'cancelada con motivo' });
    await nav.escribir('#f-buscar', '');
    await nav.esperarQue(`document.querySelectorAll('.tabla tbody tr').length > 1`);
    await nav.captura('06-admin-reservas', { completa: false });
  });

  await paso('en celular la tabla se desplaza dentro de su caja (sin scroll de la página)', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir('/pages/admin/reservas.html');
    await nav.esperarQue(`document.querySelector('.tabla')`);
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
