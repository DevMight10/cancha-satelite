import { adminApi } from '../api/adminApi.js';
import { RUTAS } from '../config.js';
import { $, html, pintar } from '../utils/dom.js';
import { iniciarPagina } from './pagina.js';

// Arranque de las páginas del administrador: exige rol admin y pinta la barra de secciones.

const SECCIONES = [
  { id: 'panel', texto: 'Cronograma', icono: 'calendar-range', href: RUTAS.adminPanel },
  { id: 'reservas', texto: 'Reservas', icono: 'list', href: RUTAS.adminReservas },
  { id: 'pagos', texto: 'Pagos', icono: 'receipt', href: RUTAS.adminPagos },
  { id: 'configuracion', texto: 'Configuración', icono: 'settings', href: RUTAS.adminConfiguracion },
  { id: 'reportes', texto: 'Reportes', icono: 'chart-column', href: RUTAS.adminReportes },
];

export async function iniciarAdmin(activa) {
  const usuario = await iniciarPagina({ acceso: 'admin', activa: 'panel' });
  pintarNavegacion(activa, null);
  actualizarContadores(activa);
  return usuario;
}

export async function actualizarContadores(activa) {
  try {
    const { pagos_por_revisar: pendientes } = await adminApi.contadores();
    pintarNavegacion(activa, pendientes);
  } catch { /* la navegación funciona sin el contador */ }
}

function pintarNavegacion(activa, pendientes) {
  const nav = $('#admin-nav');
  if (!nav) return;
  pintar(nav, html`
    <div class="contenedor admin-nav-contenido">
      ${SECCIONES.map((s) => html`
        <a class="admin-enlace" href="${s.href}" ${s.id === activa ? html`aria-current="page"` : ''}>
          <i data-lucide="${s.icono}"></i><span>${s.texto}</span>
          ${s.id === 'pagos' && pendientes ? html`<span class="contador" aria-label="${pendientes} por revisar">${pendientes}</span>` : ''}
        </a>`)}
    </div>`);
}
