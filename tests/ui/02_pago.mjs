// Prueba de interfaz: reservar, ver la pantalla de pago y enviar el comprobante.
// Ejecutar: node tests/ui/02_pago.mjs
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CAPTURAS, abrirNavegador, afirmar, elegirDia, paso, seccion, terminar } from './navegador.mjs';
import { mkdirSync } from 'node:fs';

const PHP = process.env.PHP ?? 'C:/laragon/bin/php/php-8.3.26-Win32-vs16-x64/php.exe';
mkdirSync(CAPTURAS, { recursive: true });
const comprobante = join(CAPTURAS, 'comprobante-prueba.png');
execFileSync(PHP, ['-r', `$i=imagecreatetruecolor(300,500); imagefill($i,0,0,imagecolorallocate($i,230,240,235)); imagestring($i,5,60,240,"COMPROBANTE DE PRUEBA",imagecolorallocate($i,0,0,0)); imagepng($i, ${JSON.stringify(comprobante)});`]);

const nav = await abrirNavegador();
const sufijo = Date.now();

try {
  seccion('Pantalla de pago');
  await paso('un cliente nuevo reserva y llega a pagar', async () => {
    await nav.ir('/pages/auth/registro.html');
    await nav.escribir('#nombre', `Mario Pago ${sufijo}`);
    await nav.escribir('#telefono', '71234599');
    await nav.escribir('#email', `pago-ui${sufijo}@prueba.test`);
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-registro [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await elegirDia(nav, 2);
    await nav.esperarQue(`document.querySelector('.turno.libre')`, { descripcion: 'turnos libres' });
    await nav.clic('.turno.libre');
    await nav.clic('#confirmar');
    await nav.esperarUrl('/pages/usuario/pagar.html?reserva=');
    await nav.esperarQue(`document.querySelector('.ticket')`, { descripcion: 'ticket' });
  });

  await paso('muestra el ticket, la cuenta regresiva y los 3 medios de pago', async () => {
    const regresiva = await nav.texto('#cuenta-regresiva');
    afirmar(/\d+ min/.test(regresiva), `cuenta regresiva: ${regresiva}`);
    const pestanas = await nav.evaluar(`[...document.querySelectorAll('.pestana')].map(p => p.innerText)`);
    afirmar(pestanas.join() === 'QR Simple,Tigo Money,Transferencia bancaria', `pestañas: ${pestanas}`);
    await nav.esperarQue(`document.querySelector('.metodo-qr img').naturalWidth > 0`, { descripcion: 'imagen del QR cargada' });
    await nav.captura('02-pagar-escritorio');
  });

  await paso('cambiar a Tigo Money muestra el número y ajusta el método del formulario', async () => {
    await nav.clic('#tab-tigo_money');
    afirmar(!(await nav.evaluar(`document.querySelector('#panel-tigo_money').hidden`)), 'panel oculto');
    afirmar((await nav.evaluar(`document.querySelector('[name=metodo]').value`)) === 'tigo_money', 'método no cambió');
  });

  await paso('sin archivo, muestra el error junto al campo', async () => {
    await nav.clic('#form-pago [type=submit]');
    await nav.esperarQue(`document.querySelector('#comprobante').closest('.campo').classList.contains('invalido')`, { descripcion: 'error del archivo' });
  });

  await paso('al enviar el comprobante la reserva queda "en revisión"', async () => {
    await nav.subirArchivo('#comprobante', comprobante);
    await nav.escribir('#referencia', 'TX-998877');
    await nav.clic('#form-pago [type=submit]');
    await nav.esperarQue(`document.querySelector('#titulo').textContent.toLowerCase().includes('revisión')`, { descripcion: 'título en revisión' });
    const texto = await nav.texto('.pagar-principal');
    afirmar(texto.includes('Tigo Money') && texto.includes('TX-998877'), 'no muestra el método o la referencia');
    await nav.captura('02-pagar-en-revision', { completa: false });
  });

  seccion('Celular (390 px)');
  await paso('la pantalla de pago se adapta al celular sin scroll horizontal', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir(await nav.evaluar('location.pathname + location.search'));
    await nav.esperarQue(`document.querySelector('.ticket')`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
    await nav.captura('02-pagar-celular');
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
