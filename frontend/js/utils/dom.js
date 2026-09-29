// Utilidades de DOM. Todo texto que viene del servidor se escapa antes de insertarlo.

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

export function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Marca HTML de confianza para que html`` no lo escape. */
export const seguro = (texto) => ({ __html: String(texto) });

/**
 * Plantilla que escapa automáticamente los valores interpolados.
 *   html`<p>${nombre}</p>`  -> nombre escapado
 *   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>` -> listas
 */
export function html(partes, ...valores) {
  return seguro(partes.reduce((salida, parte, i) => {
    if (i === 0) return parte;
    return salida + convertir(valores[i - 1]) + parte;
  }, ''));
}

function convertir(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (Array.isArray(valor)) return valor.map(convertir).join('');
  if (typeof valor === 'object' && '__html' in valor) return valor.__html;
  return escaparHtml(valor);
}

/** Reemplaza el contenido de un elemento con una plantilla html``. */
export function pintar(elemento, plantilla) {
  elemento.innerHTML = plantilla.__html;
  iconos();
}

/** Convierte los <i data-lucide="..."> en iconos SVG. */
export function iconos() {
  window.lucide?.createIcons({ attrs: { 'aria-hidden': 'true' } });
}
