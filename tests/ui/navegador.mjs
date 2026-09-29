// Controlador mínimo de Chrome/Edge en modo invisible (headless) usando el
// protocolo de depuración (CDP), sin dependencias: solo Node 22+.
// Permite navegar, escribir, hacer clic, esperar condiciones y tomar capturas.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUTAS_NAVEGADOR = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export const BASE = process.env.BASE_UI ?? 'http://cancha-satelite.test';
// VER=1 abre una ventana visible de Chrome y pausa entre acciones para poder seguir la prueba
const VISIBLE = process.env.VER === '1';
const PAUSA = VISIBLE ? Number(process.env.PAUSA ?? 700) : 0;
export const CAPTURAS = join(dirname(fileURLToPath(import.meta.url)), 'capturas');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirNavegador({ ancho = 1280, alto = 900 } = {}) {
  const ejecutable = RUTAS_NAVEGADOR.find(existsSync);
  if (!ejecutable) throw new Error('No se encontró Chrome ni Edge');

  const perfil = mkdtempSync(join(tmpdir(), 'cancha-ui-'));
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const proceso = spawn(ejecutable, [
    ...(VISIBLE ? [] : ['--headless=new']), `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    `--window-size=${ancho},${alto}`, '--no-first-run', '--no-default-browser-check', '--lang=es-BO', 'about:blank',
  ], { stdio: 'ignore' });

  let destino;
  for (let i = 0; i < 50 && !destino; i++) {
    await esperar(200);
    try {
      const paginas = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
      destino = paginas.find((p) => p.type === 'page');
    } catch { /* el navegador todavía está arrancando */ }
  }
  if (!destino) throw new Error('El navegador no respondió');

  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });

  let siguiente = 0;
  const pendientes = new Map();
  const oyentes = [];
  const erroresConsola = [];

  ws.onmessage = (evento) => {
    const msj = JSON.parse(evento.data);
    if (msj.id && pendientes.has(msj.id)) {
      const { ok, mal } = pendientes.get(msj.id);
      pendientes.delete(msj.id);
      msj.error ? mal(new Error(msj.error.message)) : ok(msj.result);
      return;
    }
    if (msj.method === 'Runtime.exceptionThrown') erroresConsola.push(msj.params.exceptionDetails.exception?.description ?? msj.params.exceptionDetails.text);
    if (msj.method === 'Runtime.consoleAPICalled' && msj.params.type === 'error') erroresConsola.push(msj.params.args.map((a) => a.value ?? a.description).join(' '));
    oyentes.forEach((o) => o(msj));
  };

  const enviar = (method, params = {}) => new Promise((ok, mal) => {
    const id = ++siguiente;
    pendientes.set(id, { ok, mal });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await enviar('Page.enable');
  await enviar('Runtime.enable');
  await enviar('Network.enable');
  await enviar('Network.setCacheDisabled', { cacheDisabled: true });

  const nav = {
    erroresConsola,

    async evaluar(expresion) {
      const r = await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`Error en la página: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    },

    async ir(ruta) {
      const cargada = new Promise((ok) => {
        const o = (m) => { if (m.method === 'Page.loadEventFired') { oyentes.splice(oyentes.indexOf(o), 1); ok(); } };
        oyentes.push(o);
      });
      await enviar('Page.navigate', { url: ruta.startsWith('http') ? ruta : BASE + ruta });
      // Un cambio de solo "#hash" no dispara "load": no esperar más de 10 s
      await Promise.race([cargada, esperar(10000)]);
      await esperar(400); // módulos y peticiones iniciales
    },

    /** Espera hasta que la expresión JS sea verdadera. */
    async esperarQue(expresion, { tiempo = 8000, descripcion = expresion } = {}) {
      const limite = Date.now() + tiempo;
      while (Date.now() < limite) {
        if (await nav.evaluar(`!!(${expresion})`).catch(() => false)) return;
        await esperar(100);
      }
      throw new Error(`Tiempo agotado esperando: ${descripcion}`);
    },

    async esperarUrl(fragmento) {
      await nav.esperarQue(`location.href.includes(${JSON.stringify(fragmento)})`, { descripcion: `URL con "${fragmento}"` });
      await esperar(400);
    },

    async escribir(selector, texto) {
      await esperar(PAUSA / 2);
      await nav.esperarQue(`document.querySelector(${JSON.stringify(selector)})`, { descripcion: selector });
      await nav.evaluar(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        el.focus(); el.value = ${JSON.stringify(texto)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    },

    async clic(selector) {
      await esperar(PAUSA);
      await nav.esperarQue(`document.querySelector(${JSON.stringify(selector)})`, { descripcion: selector });
      await nav.evaluar(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await esperar(250);
    },

    /** Sube un archivo local a un <input type="file">. */
    async subirArchivo(selector, rutaArchivo) {
      const { root } = await enviar('DOM.getDocument', { depth: 0 });
      const { nodeId } = await enviar('DOM.querySelector', { nodeId: root.nodeId, selector });
      await enviar('DOM.setFileInputFiles', { nodeId, files: [rutaArchivo.replaceAll('\\', '/')] });
      await nav.evaluar(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change', { bubbles: true }))`);
    },

    texto: (selector) => nav.evaluar(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`),

    async viewport(anchoV, altoV, movil = false) {
      await enviar('Emulation.setDeviceMetricsOverride', { width: anchoV, height: altoV, deviceScaleFactor: 1, mobile: movil });
      await esperar(300);
    },

    /** Captura PNG en tests/ui/capturas/<nombre>.png (página completa por defecto). */
    async captura(nombre, { completa = true } = {}) {
      mkdirSync(CAPTURAS, { recursive: true });
      const { data } = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: completa });
      const archivo = join(CAPTURAS, `${nombre}.png`);
      writeFileSync(archivo, Buffer.from(data, 'base64'));
      return archivo;
    },

    async cerrar() {
      await esperar(PAUSA * 3); // en modo visible, deja ver el resultado final
      try { await enviar('Browser.close'); } catch { /* ya cerrado */ }
      ws.close();
      proceso.kill();
      await esperar(300);
      try { rmSync(perfil, { recursive: true, force: true }); } catch { /* archivos en uso */ }
    },
  };

  await nav.viewport(ancho, alto);
  return nav;
}

// ---- Mini framework de pruebas --------------------------------------------
let pasadas = 0;
let fallidas = 0;

export async function paso(descripcion, fn) {
  try {
    await fn();
    pasadas++;
    console.log(`  \x1b[32m✔\x1b[0m ${descripcion}`);
  } catch (e) {
    fallidas++;
    console.log(`  \x1b[31m✘ ${descripcion}\x1b[0m\n    ${e.message}`);
  }
}

export function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

export function seccion(titulo) {
  console.log(`\n\x1b[1m${titulo}\x1b[0m`);
}

export function terminar() {
  console.log(`\n${pasadas} pasadas, ${fallidas} fallidas`);
  process.exitCode = fallidas ? 1 : 0;
}

/** Lee una variable comentada de backend/.env (credenciales de desarrollo). */
export function credencial(nombre) {
  const env = new URL('../../backend/.env', import.meta.url);
  let contenido = '';
  try { contenido = readFileSync(env, 'utf8'); } catch { /* sin .env */ }
  const linea = contenido.split(/\r?\n/).find((l) => l.includes(`${nombre}=`));
  return linea?.split('=').slice(1).join('=').trim();
}
