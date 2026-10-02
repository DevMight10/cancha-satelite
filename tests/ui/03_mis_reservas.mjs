// Prueba de interfaz: historial de reservas y cancelación.
// Ejecutar: node tests/ui/03_mis_reservas.mjs
import { abrirNavegador, afirmar, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador();
const sufijo = Date.now();

/** Reserva el primer turno libre de dentro de `dias` días, usando la API desde la página. */
const reservarPorApi = (dias) => nav.evaluar(`(async () => {
  const d = new Date(); d.setDate(d.getDate() + ${dias});
  const fecha = d.toISOString().slice(0, 10);
  const disp = await (await fetch('/api/disponibilidad?fecha=' + fecha)).json();
  const turno = disp.data.turnos.find(t => t.estado === 'libre');
  const r = await fetch('/api/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha, hora_inicio: turno.hora_inicio }) });
  return (await r.json()).data.id;
})()`);

try {
  seccion('Mis reservas');
  await paso('un cliente sin reservas ve el estado vacío con un botón para reservar', async () => {
    await nav.ir('/pages/auth/registro.html');
    await nav.escribir('#nombre', `Rosa Historial ${Date.now()}`);
    await nav.escribir('#telefono', '61234567');
    await nav.escribir('#email', `historial${sufijo}@prueba.test`);
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-registro [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.ir('/pages/usuario/mis-reservas.html');
    await nav.esperarQue(`document.querySelector('.vacio')`, { descripcion: 'estado vacío' });
  });

  await paso('muestra las próximas reservas ordenadas con su estado y acciones', async () => {
    await reservarPorApi(3);
    await reservarPorApi(2);
    await nav.ir('/pages/usuario/mis-reservas.html');
    await nav.esperarQue(`document.querySelectorAll('.reserva-fila').length === 2`, { descripcion: '2 reservas' });
    const chips = await nav.evaluar(`[...document.querySelectorAll('.reserva-fila .chip')].map(c => c.textContent)`);
    afirmar(chips.every((c) => c === 'Pendiente de pago'), `estados: ${chips}`);
    afirmar(await nav.evaluar(`document.querySelectorAll('.reserva-fila a[href*="pagar"]').length === 2`), 'faltan botones Pagar');
    await nav.captura('03-mis-reservas');
  });

  await paso('cancelar pide confirmación y la reserva pasa al historial con su motivo', async () => {
    await nav.clic('[data-cancelar]');
    await nav.esperarQue(`document.querySelector('dialog[open]')`, { descripcion: 'diálogo de confirmación' });
    await nav.captura('03-dialogo-cancelar', { completa: false });
    await nav.escribir('#dialogo-texto', 'Se lesionó el arquero');
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`document.querySelectorAll('.reserva-fila').length === 1`, { descripcion: 'queda 1 próxima' });
    await nav.clic('#tab-historial');
    await nav.esperarQue(`document.querySelector('.reserva-fila .chip-cancelada')`, { descripcion: 'cancelada en historial' });
    const texto = await nav.texto('#lista');
    afirmar(texto.includes('Se lesionó el arquero'), 'no muestra el motivo');
  });

  await paso('"No, mantener" no cancela nada', async () => {
    await nav.clic('#tab-proximas');
    await nav.clic('[data-cancelar]');
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.clic('dialog [value=cancelar]');
    await nav.esperarQue(`!document.querySelector('dialog')`, { descripcion: 'diálogo cerrado' });
    afirmar(await nav.evaluar(`document.querySelectorAll('.reserva-fila').length === 1`), 'la reserva desapareció');
  });

  await paso('en celular la lista no tiene scroll horizontal', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir('/pages/usuario/mis-reservas.html');
    await nav.esperarQue(`document.querySelector('.reserva-fila')`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
    await nav.captura('03-mis-reservas-celular');
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
