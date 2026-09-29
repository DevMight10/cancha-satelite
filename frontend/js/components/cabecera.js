import { authApi } from '../api/authApi.js';
import { RUTAS } from '../config.js';
import { olvidarUsuario } from '../guards/auth.js';
import { $, html, pintar } from '../utils/dom.js';
import { iniciales } from '../utils/formato.js';

// Logo: la cancha vista desde arriba (líneas de cal y punto central ámbar)
export const LOGO = html`
  <svg viewBox="0 0 38 26" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="36" height="24" rx="2" stroke="currentColor" stroke-width="2"/>
    <path d="M19 1v24M1 8h5v10H1M37 8h-5v10h5" stroke="currentColor" stroke-width="2"/>
    <circle cx="19" cy="13" r="5" stroke="currentColor" stroke-width="2"/>
    <circle cx="19" cy="13" r="1.8" fill="#ffb23f"/>
  </svg>`;

function enlace(href, texto, icono, activa) {
  return html`<a class="nav-enlace" href="${href}" ${activa ? html`aria-current="page"` : ''}>
    <i data-lucide="${icono}"></i>${texto}</a>`;
}

/**
 * Cabecera del sitio. `activa` marca el enlace de la página actual:
 * 'reservar' | 'mis-reservas' | 'panel'
 */
export function renderCabecera(usuario, activa = '') {
  const contenedor = $('#cabecera');
  if (!contenedor) return;

  let navegacion;
  if (!usuario) {
    navegacion = html`
      ${enlace(RUTAS.reservar, 'Ver horarios', 'calendar-days', activa === 'reservar')}
      <a class="nav-enlace" href="${RUTAS.login}"><i data-lucide="log-in"></i>Iniciar sesión</a>
      <a class="btn btn-led btn-sm" href="${RUTAS.registro}">Crear cuenta</a>`;
  } else {
    const esAdmin = usuario.rol === 'admin';
    navegacion = html`
      ${esAdmin ? enlace(RUTAS.adminPanel, 'Panel', 'layout-dashboard', activa === 'panel') : ''}
      ${enlace(RUTAS.reservar, 'Reservar', 'calendar-plus', activa === 'reservar')}
      ${esAdmin ? '' : enlace(RUTAS.misReservas, 'Mis reservas', 'ticket', activa === 'mis-reservas')}
      <span class="nav-usuario" title="${usuario.email}">
        <span class="avatar" aria-hidden="true">${iniciales(usuario.nombre)}</span>
        <span>${usuario.nombre.split(' ')[0]}</span>
      </span>
      <button type="button" class="nav-enlace" data-salir>
        <i data-lucide="log-out"></i>Salir
      </button>`;
  }

  pintar(contenedor, html`
    <div class="contenedor">
      <a class="marca" href="${RUTAS.inicio}" aria-label="Cancha Satélite Norte, inicio">
        ${LOGO}
        <span class="marca-nombre">Cancha<small>Satélite Norte</small></span>
      </a>
      <button type="button" class="btn btn-contorno-claro btn-sm menu-boton" aria-expanded="false" aria-controls="nav-principal">
        <i data-lucide="menu"></i><span>Menú</span>
      </button>
      <nav class="nav" id="nav-principal" aria-label="Principal">${navegacion}</nav>
    </div>`);

  const boton = $('.menu-boton', contenedor);
  const nav = $('#nav-principal', contenedor);
  boton.addEventListener('click', () => {
    const abierta = nav.classList.toggle('abierta');
    boton.setAttribute('aria-expanded', String(abierta));
  });

  $('[data-salir]', contenedor)?.addEventListener('click', async () => {
    await authApi.logout().catch(() => {});
    olvidarUsuario();
    location.href = RUTAS.inicio;
  });
}
