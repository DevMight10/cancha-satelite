import { html, iconos } from '../utils/dom.js';

// Mensajes breves que aparecen abajo y desaparecen solos.

const ICONOS = { exito: 'circle-check', error: 'circle-alert', info: 'info' };

function contenedor() {
  let zona = document.getElementById('toasts');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'toasts';
    zona.className = 'toasts';
    zona.setAttribute('role', 'status');
    zona.setAttribute('aria-live', 'polite');
    document.body.append(zona);
  }
  return zona;
}

export function toast(mensaje, tipo = 'exito', duracion = 4500) {
  const aviso = document.createElement('div');
  aviso.className = `toast toast-${tipo}`;
  aviso.innerHTML = html`<i data-lucide="${ICONOS[tipo] ?? 'info'}"></i><span>${mensaje}</span>`.__html;
  contenedor().append(aviso);
  iconos();
  setTimeout(() => aviso.remove(), duracion);
}
