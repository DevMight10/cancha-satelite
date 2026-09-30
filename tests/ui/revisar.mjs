// Captura una pantalla: node tests/ui/revisar.mjs <ruta> <nombre> [ancho] [alto] [movil]
// Variables opcionales: CLIC="<js a ejecutar antes>" PARCIAL=1 (solo lo visible)
import { abrirNavegador } from './navegador.mjs';
const [ruta, nombre, ancho = 1366, alto = 900, movil] = process.argv.slice(2);
const nav = await abrirNavegador({ ancho: +ancho, alto: +alto });
if (movil) await nav.viewport(+ancho, +alto, true);
if (process.env.ADMIN) {
  const { credencial } = await import('./navegador.mjs');
  await nav.evaluar(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ${JSON.stringify(credencial('ADMIN_DEV_EMAIL'))}, password: ${JSON.stringify(credencial('ADMIN_DEV_PASSWORD'))} }) })`).catch(() => {});
}
if (process.env.ADMIN) await nav.ir('/');
if (process.env.ADMIN) await nav.evaluar(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ${JSON.stringify((await import('./navegador.mjs')).credencial('ADMIN_DEV_EMAIL'))}, password: ${JSON.stringify((await import('./navegador.mjs')).credencial('ADMIN_DEV_PASSWORD'))} }) })`);
await nav.ir(ruta);
await new Promise(r => setTimeout(r, 1500));
if (process.env.CLIC) { await nav.evaluar(process.env.CLIC); await new Promise(r => setTimeout(r, 800)); }
console.log(await nav.captura(nombre, { completa: !process.env.PARCIAL }), 'errores:', nav.erroresConsola.join(' | ') || 'ninguno');
await nav.cerrar();
