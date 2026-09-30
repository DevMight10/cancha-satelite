import { seguro } from '../utils/dom.js';

// Ilustraciones de la cancha vista desde arriba (SVG): la imagen de marca del sitio.

/** Cancha a pantalla completa, con degradado oscuro hacia `desde` (izquierda o abajo) para leer el texto. */
export function canchaFondo({ oscurecer = 'izquierda' } = {}) {
  const degradado = oscurecer === 'abajo'
    ? '<linearGradient id="osc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d0c" stop-opacity=".15"/><stop offset=".55" stop-color="#0b0d0c" stop-opacity=".45"/><stop offset="1" stop-color="#0b0d0c" stop-opacity=".95"/></linearGradient>'
    : '<linearGradient id="osc" x1="0" x2="1"><stop offset="0" stop-color="#0b0d0c" stop-opacity=".94"/><stop offset=".55" stop-color="#0b0d0c" stop-opacity=".45"/><stop offset="1" stop-color="#0b0d0c" stop-opacity=".12"/></linearGradient>';
  return seguro(`
    <svg class="cancha-fondo" viewBox="0 0 1280 640" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <rect width="1280" height="640" fill="#123d22"/>
      <g fill="#164a29"><rect x="0" width="128" height="640"/><rect x="256" width="128" height="640"/><rect x="512" width="128" height="640"/><rect x="768" width="128" height="640"/><rect x="1024" width="128" height="640"/></g>
      <g stroke="#fff" stroke-opacity=".22" stroke-width="4">
        <rect x="40" y="40" width="1200" height="560" rx="8"/><path d="M640 40v560"/><circle cx="640" cy="320" r="104"/><circle cx="640" cy="320" r="5" fill="#fff" fill-opacity=".22"/>
        <rect x="40" y="170" width="150" height="300"/><rect x="1090" y="170" width="150" height="300"/><rect x="40" y="245" width="56" height="150"/><rect x="1184" y="245" width="56" height="150"/>
      </g>
      <defs>${degradado}</defs>
      <rect width="1280" height="640" fill="url(#osc)"/>
    </svg>`);
}

/** Cancha pequeña en colores vivos (tarjetas de detalle y ticket). */
export function canchaMini(clase = 'cancha-mini') {
  return seguro(`
    <svg class="${clase}" viewBox="0 0 260 150" fill="none" aria-hidden="true">
      <rect width="260" height="150" fill="#1f8a3b"/>
      <g fill="#197331"><rect x="0" width="32" height="150"/><rect x="65" width="32" height="150"/><rect x="130" width="32" height="150"/><rect x="195" width="32" height="150"/></g>
      <g stroke="#fff" stroke-width="2.5"><rect x="10" y="10" width="240" height="130" rx="3"/><path d="M130 10v130"/><circle cx="130" cy="75" r="22"/><rect x="10" y="45" width="30" height="60"/><rect x="220" y="45" width="30" height="60"/></g>
    </svg>`);
}

/** Logo: la cancha en líneas (usa currentColor). */
export const LOGO_SVG = `
  <svg viewBox="0 0 38 26" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
    <rect x="1.5" y="1.5" width="35" height="23" rx="3"/><path d="M19 1.5v23"/><circle cx="19" cy="13" r="4.5"/>
  </svg>`;
