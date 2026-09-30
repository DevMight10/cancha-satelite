// Prueba de interfaz: página de inicio pública con el marcador en vivo.
// Ejecutar: node tests/ui/09_inicio.mjs
import { abrirNavegador, afirmar, paso, terminar } from './navegador.mjs';

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });

try {
  await paso('un visitante ve el marcador en vivo con los turnos del día', async () => {
    await nav.ir('/');
    await nav.esperarQue(`document.querySelectorAll('#marcador-hoy .turno').length > 0`, { descripcion: 'turnos en el marcador' });
    await nav.captura('09-inicio', { completa: false });
  });

  await paso('muestra precios y horario de atención reales', async () => {
    const precios = await nav.evaluar(`document.querySelectorAll('.tarifa').length`);
    afirmar(precios > 0, 'no hay precios');
    const dias = await nav.evaluar(`document.querySelectorAll('.horario-atencion dl div').length`);
    afirmar(dias === 7, `días del horario: ${dias}`);
    await nav.captura('09-inicio-completa');
  });

  await paso('tocar una hora libre lleva a Reservar con esa hora ya elegida', async () => {
    const horaElegida = await nav.evaluar(`document.querySelector('#marcador-hoy .turno.libre .turno-hora').textContent`);
    await nav.clic('#marcador-hoy .turno.libre');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.esperarQue(`document.querySelector('.turno[aria-pressed="true"] .turno-hora')?.textContent === ${JSON.stringify(horaElegida)}`, { descripcion: 'hora preseleccionada' });
    const boton = await nav.texto('#resumen a[href*="login"]');
    afirmar(boton.includes('Inicia sesión'), `botón: ${boton}`);
  });

  await paso('en celular el marcador se ve en la portada y no hay scroll horizontal', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir('/');
    await nav.esperarQue(`document.querySelectorAll('#marcador-hoy .turno').length > 0`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
    await nav.captura('09-inicio-celular');
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
