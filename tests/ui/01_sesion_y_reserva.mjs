// Prueba de interfaz: registro, cierre e inicio de sesión, y reservar un turno.
// Ejecutar: node tests/ui/01_sesion_y_reserva.mjs
import { API, RAIZ, abrirNavegador, afirmar, credencial, elegirDia, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador();
const sufijo = Date.now();

try {
  seccion('Registro desde la interfaz');
  await paso('crea una cuenta y entra directo a Reservar con la sesión iniciada', async () => {
    await nav.ir('/pages/auth/registro.html');
    await nav.escribir('#nombre', `Lucía Prueba ${Date.now()}`);
    await nav.escribir('#telefono', '7 123 4567');
    await nav.escribir('#email', `ui${sufijo}@prueba.test`);
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-registro [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.esperarQue(`document.querySelector('.nav-usuario')?.innerText.includes('Lucía')`, { descripcion: 'nombre en la cabecera' });
  });

  await paso('"Salir" cierra la sesión y vuelve al inicio', async () => {
    await nav.clic('[data-salir]');
    await nav.esperarQue(`location.pathname === ${JSON.stringify(RAIZ)}`, { descripcion: 'volver al inicio' });
    const me = await nav.evaluar(`fetch('${API}/auth/me').then(r => r.json())`);
    afirmar(me.data === null, 'la sesión sigue abierta');
  });

  seccion('Inicio de sesión desde la interfaz');
  await paso('muestra el error con una contraseña incorrecta', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', `ui${sufijo}@prueba.test`);
    await nav.escribir('#password', 'incorrecta-123');
    await nav.clic('#form-login [type=submit]');
    await nav.esperarQue(`!document.querySelector('[data-error-general]').hidden`, { descripcion: 'aviso de error' });
    await nav.captura('01-login-error', { completa: false });
  });

  await paso('entra con la contraseña correcta y llega a Reservar', async () => {
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.esperarQue(`document.querySelector('.nav-usuario')`, { descripcion: 'usuario en la cabecera' });
  });

  await paso('con sesión, login.html redirige a Reservar (no muestra el formulario)', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.esperarUrl('/pages/reservar.html');
  });

  seccion('Reservar un turno con la sesión iniciada');
  await paso('elegir un turno libre muestra el precio y el botón Confirmar', async () => {
    await elegirDia(nav, 1); // en el calendario: un día con turnos libres que no sea el primero
    await nav.esperarQue(`document.querySelector('.turno.libre')`, { descripcion: 'turnos libres' });
    await nav.evaluar(`[...document.querySelectorAll('.turno.libre')].at(-1).click()`); // el último libre del día
    await nav.esperarQue(`document.querySelector('#confirmar')`, { descripcion: 'botón Confirmar' });
    const precio = await nav.texto('.resumen-precio strong');
    afirmar(/^Bs \d+/.test(precio), `precio inesperado: ${precio}`);
    await nav.captura('01-reservar-seleccion', { completa: false });
  });

  await paso('el horario elegido sigue en negro con el mouse encima (el hover no lo tapa)', async () => {
    await nav.pasarMouse('.turno[aria-pressed="true"]');
    const e = await nav.evaluar(`(() => { const b = document.querySelector('.turno[aria-pressed="true"]');
      return { hover: b.matches(':hover'), fondo: getComputedStyle(b).backgroundColor }; })()`);
    afirmar(e.hover, 'el mouse no quedó encima del horario');
    afirmar(e.fondo === 'rgb(11, 13, 12)', `fondo con hover: ${e.fondo}`);
    await nav.captura('01-reservar-hover', { completa: false });
  });

  await paso('Confirmar crea la reserva y lleva a la pantalla de pago', async () => {
    await nav.clic('#confirmar');
    await nav.esperarUrl('/pages/usuario/pagar.html?reserva=');
  });

  seccion('Administrador');
  await paso('el administrador entra y llega a su panel', async () => {
    await nav.evaluar(`fetch('${API}/auth/logout', { method: 'POST' })`);
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', credencial('ADMIN_DEV_EMAIL'));
    await nav.escribir('#password', credencial('ADMIN_DEV_PASSWORD'));
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/admin/');
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
