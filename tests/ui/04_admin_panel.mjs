// Prueba de interfaz: panel del administrador (agenda del día y semana).
// Ejecutar: node tests/ui/04_admin_panel.mjs
import { abrirNavegador, afirmar, credencial, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });

try {
  seccion('Acceso');
  await paso('un cliente no puede entrar al panel (lo manda a Reservar)', async () => {
    await nav.ir('/pages/auth/registro.html');
    await nav.escribir('#nombre', 'Cliente Curioso');
    await nav.escribir('#telefono', '71230000');
    await nav.escribir('#email', `curioso${Date.now()}@prueba.test`);
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-registro [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.ir('/pages/admin/index.html');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.evaluar(`fetch('/api/auth/logout', { method: 'POST' })`);
  });

  await paso('el administrador inicia sesión y llega al panel', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', credencial('ADMIN_DEV_EMAIL'));
    await nav.escribir('#password', credencial('ADMIN_DEV_PASSWORD'));
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/admin/');
    await nav.esperarQue(`document.querySelectorAll('.crono-fila').length === 7`, { descripcion: 'cronograma cargado' });
  });

  seccion('Panel');
  await paso('muestra el resumen, la agenda y la navegación de administración', async () => {
    const resumen = await nav.texto('#resumen');
    for (const t of ['RESERVAS', 'CONFIRMADAS', 'POR COBRAR', 'COBRADO', 'TURNOS LIBRES']) afirmar(resumen.toUpperCase().includes(t), `falta ${t}`);
    const enlaces = await nav.evaluar(`[...document.querySelectorAll('.admin-enlace')].map(a => a.querySelector('span').textContent)`);
    afirmar(enlaces.join() === 'Cronograma,Reservas,Pagos,Configuración,Reportes', `navegación: ${enlaces}`);
  });

  await paso('el cronograma y la agenda muestran el nombre de cada cliente', async () => {
    const conReservas = await nav.evaluar(`(async () => {
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() + i); const f = d.toISOString().slice(0, 10);
        const p = await (await fetch('/api/admin/panel?fecha=' + f)).json();
        if (p.data.resumen.reservas > 0) return f;
      }
      return null;
    })()`);
    afirmar(conReservas, 'no hay reservas en los próximos 14 días');
    await nav.escribir('#fecha', conReservas);
    await nav.esperarQue(`document.querySelector('.crono-res span') && document.querySelector('.agenda-fila .agenda-cliente strong')`, { descripcion: 'bloque y fila con cliente' });
    await nav.captura('04-admin-panel');
  });

  await paso('el cronograma tiene 7 días y tocar un día cambia la agenda', async () => {
    const dias = await nav.evaluar(`document.querySelectorAll('.crono-dia').length`);
    afirmar(dias === 7, `días: ${dias}`);
    const antes = await nav.evaluar(`document.querySelector('#fecha').value`);
    await nav.clic('.crono-dia:not([aria-pressed="true"])');
    await nav.esperarQue(`document.querySelector('#fecha').value !== ${JSON.stringify(antes)}`, { descripcion: 'cambio de día' });
  });

  await paso('en celular la navegación se vuelve una barra deslizable sin scroll horizontal de la página', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir('/pages/admin/index.html');
    await nav.esperarQue(`document.querySelectorAll('.crono-fila').length === 7`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
    await nav.captura('04-admin-panel-celular', { completa: false });
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
