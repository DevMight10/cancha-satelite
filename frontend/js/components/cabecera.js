import { authApi } from '../api/authApi.js';
import { RUTAS } from '../config.js';
import { olvidarUsuario } from '../guards/auth.js';
import { $, html, pintar, seguro } from '../utils/dom.js';
import { iniciales } from '../utils/formato.js';
import { LOGO_SVG } from './cancha.js';

export const LOGO = seguro(LOGO_SVG);

function enlace(href, texto, activa) {
  return html`<a class="nav-enlace" href="${href}" ${activa ? html`aria-current="page"` : ''}>${texto}</a>`;
}

/**
 * Cabecera negra del sitio. `activa`: 'reservar' | 'mis-reservas' | 'panel'.
 * En la portada va transparente sobre la cancha (clase sobre-portada en el HTML).
 */
export function renderCabecera(usuario, activa = '') {
  const contenedor = $('#cabecera');
  if (!contenedor) return;

  let navegacion;
  if (!usuario) {
    navegacion = html`
      ${enlace(RUTAS.reservar, 'Horarios', activa === 'reservar')}
      <a class="nav-enlace" href="${RUTAS.inicio}#precios">Precios</a>
      <a class="nav-enlace" href="${RUTAS.login}">Iniciar sesión</a>
      <a class="btn btn-claro btn-sm" href="${RUTAS.registro}">Crear cuenta</a>`;
  } else {
    const esAdmin = usuario.rol === 'admin';
    navegacion = html`
      ${esAdmin ? enlace(RUTAS.adminPanel, 'Panel', activa === 'panel') : ''}
      ${enlace(RUTAS.reservar, 'Reservar', activa === 'reservar')}
      ${esAdmin ? '' : enlace(RUTAS.misReservas, 'Mis reservas', activa === 'mis-reservas')}
      <span class="nav-usuario" title="${usuario.email}">
        <span class="avatar" aria-hidden="true">${iniciales(usuario.nombre)}</span>
        <span>${usuario.nombre.split(' ')[0]}</span>
      </span>
      <button type="button" class="nav-enlace" data-salir><i data-lucide="log-out"></i>Salir</button>`;
  }

  pintar(contenedor, html`
    <div class="contenedor">
      <a class="marca" href="${RUTAS.inicio}" aria-label="Cancha Satélite Norte, inicio">${LOGO}<span>Cancha Satélite Norte</span></a>
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
