// Prueba de interfaz: el cliente paga y el administrador rechaza y luego aprueba.
// Ejecutar: node tests/ui/05_admin_pagos.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CAPTURAS, abrirNavegador, afirmar, credencial, paso, seccion, terminar } from './navegador.mjs';

const PHP = process.env.PHP ?? 'C:/laragon/bin/php/php-8.3.26-Win32-vs16-x64/php.exe';
mkdirSync(CAPTURAS, { recursive: true });
const comprobante = join(CAPTURAS, 'comprobante-prueba.png');
execFileSync(PHP, ['-r', `$i=imagecreatetruecolor(300,500); imagefill($i,0,0,imagecolorallocate($i,230,240,235)); imagestring($i,5,60,240,"COMPROBANTE DE PRUEBA",imagecolorallocate($i,0,0,0)); imagepng($i, ${JSON.stringify(comprobante)});`]);

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });
const sufijo = Date.now();
const nombre = `Tomás Revisión ${sufijo % 1000}`;
const emailCliente = `revision${sufijo}@prueba.test`;
let reservaId;

const entrarComo = async (email, password) => {
  await nav.evaluar(`fetch('/api/auth/logout', { method: 'POST' })`);
  await nav.ir('/pages/auth/login.html');
  await nav.escribir('#email', email);
  await nav.escribir('#password', password);
  await nav.clic('#form-login [type=submit]');
  await nav.esperarQue(`!location.pathname.includes('login')`, { descripcion: 'salir del login' });
};

const enviarComprobante = async () => {
  await nav.ir(`/pages/usuario/pagar.html?reserva=${reservaId}`);
  await nav.esperarQue(`document.querySelector('#comprobante')`, { descripcion: 'formulario de pago' });
  await nav.subirArchivo('#comprobante', comprobante);
  await nav.clic('#form-pago [type=submit]');
  await nav.esperarQue(`document.querySelector('#titulo').textContent.toLowerCase().includes('revisión')`, { descripcion: 'en revisión' });
};

const tarjeta = `[...document.querySelectorAll('.pago-tarjeta')].find(t => t.innerText.includes(${JSON.stringify(nombre)}))`;

try {
  seccion('Preparación: un cliente reserva y envía su comprobante');
  await paso('el cliente reserva y envía el comprobante', async () => {
    await nav.ir('/pages/auth/registro.html');
    await nav.escribir('#nombre', nombre);
    await nav.escribir('#telefono', '72345678');
    await nav.escribir('#email', emailCliente);
    await nav.escribir('#password', 'clave-segura-1');
    await nav.clic('#form-registro [type=submit]');
    await nav.esperarUrl('/pages/reservar.html');
    await nav.clic('.dia:nth-child(6)');
    await nav.esperarQue(`document.querySelector('.turno.libre')`);
    await nav.clic('.turno.libre');
    await nav.clic('#confirmar');
    await nav.esperarUrl('pagar.html?reserva=');
    reservaId = Number(await nav.evaluar(`new URLSearchParams(location.search).get('reserva')`));
    await enviarComprobante();
  });

  seccion('Administrador');
  await paso('ve el comprobante en "Por revisar" con su vista previa', async () => {
    await entrarComo(credencial('ADMIN_DEV_EMAIL'), credencial('ADMIN_DEV_PASSWORD'));
    await nav.ir('/pages/admin/pagos.html');
    await nav.esperarQue(tarjeta, { descripcion: 'tarjeta del cliente' });
    // Las vistas previas cargan de forma diferida: se llevan a la pantalla como haría una persona
    await nav.evaluar(`${tarjeta}.scrollIntoView()`);
    await nav.esperarQue(`${tarjeta}.querySelector('img').naturalWidth > 0`, { descripcion: 'vista previa cargada' });
    await nav.captura('05-admin-pagos', { completa: false });
  });

  await paso('rechazar exige motivo; con motivo el pago sale de "Por revisar"', async () => {
    await nav.evaluar(`${tarjeta}.querySelector('[data-rechazar]').click()`);
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.clic('dialog [value=aceptar]'); // sin motivo: no debe cerrarse
    afirmar(await nav.evaluar(`!!document.querySelector('dialog[open]')`), 'se cerró sin motivo');
    await nav.escribir('#dialogo-texto', 'La imagen no se lee');
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`!(${tarjeta})`, { descripcion: 'sale de la lista' });
    await nav.clic('#tab-rechazado');
    await nav.esperarQue(`${tarjeta} && ${tarjeta}.innerText.includes('La imagen no se lee')`, { descripcion: 'aparece en rechazados con motivo' });
  });

  await paso('el cliente ve el motivo del rechazo y envía otro comprobante', async () => {
    await entrarComo(emailCliente, 'clave-segura-1');
    await nav.ir(`/pages/usuario/pagar.html?reserva=${reservaId}`);
    await nav.esperarQue(`document.body.innerText.includes('La imagen no se lee')`, { descripcion: 'motivo visible' });
    await enviarComprobante();
  });

  await paso('el administrador aprueba y el pago pasa a "Aprobados"', async () => {
    await entrarComo(credencial('ADMIN_DEV_EMAIL'), credencial('ADMIN_DEV_PASSWORD'));
    await nav.ir('/pages/admin/pagos.html');
    await nav.esperarQue(tarjeta, { descripcion: 'tarjeta pendiente' });
    await nav.evaluar(`${tarjeta}.querySelector('[data-aprobar]').click()`);
    await nav.esperarQue(`document.querySelector('dialog[open]')`);
    await nav.clic('dialog [value=aceptar]');
    await nav.esperarQue(`!(${tarjeta})`, { descripcion: 'sale de por revisar' });
    await nav.clic('#tab-aprobado');
    await nav.esperarQue(tarjeta, { descripcion: 'aparece en aprobados' });
  });

  await paso('el cliente ve su reserva confirmada', async () => {
    await entrarComo(emailCliente, 'clave-segura-1');
    await nav.ir(`/pages/usuario/pagar.html?reserva=${reservaId}`);
    await nav.esperarQue(`document.querySelector('.chip-confirmada')`, { descripcion: 'chip confirmada' });
    await nav.captura('05-cliente-confirmada', { completa: false });
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
