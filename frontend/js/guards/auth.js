import { authApi } from '../api/authApi.js';
import { RUTAS } from '../config.js';

// Protección de páginas según la sesión y el rol.

let usuarioActual; // se consulta una sola vez por página

export async function obtenerUsuario() {
  if (usuarioActual === undefined) {
    try {
      usuarioActual = await authApi.me();
    } catch {
      usuarioActual = null;
    }
  }
  return usuarioActual;
}

export function olvidarUsuario() {
  usuarioActual = undefined;
}

/** Página de inicio según el rol. */
export function inicioSegunRol(usuario) {
  return usuario?.rol === 'admin' ? RUTAS.adminPanel : RUTAS.reservar;
}

/** Solo acepta rutas internas del sitio (evita redirecciones a otros dominios). */
export function rutaSegura(ruta) {
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//') ? ruta : null;
}

// Promesa que nunca se resuelve: detiene la lógica de la página mientras el navegador redirige.
const detener = () => new Promise(() => {});

export async function requerirSesion() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    const volver = encodeURIComponent(location.pathname + location.search);
    location.replace(`${RUTAS.login}?volver=${volver}`);
    return detener();
  }
  return usuario;
}

export async function requerirAdmin() {
  const usuario = await requerirSesion();
  if (usuario.rol !== 'admin') {
    location.replace(RUTAS.reservar);
    return detener();
  }
  return usuario;
}

/** Para login y registro: si ya hay sesión, no tiene sentido mostrarlos. */
export async function requerirInvitado() {
  const usuario = await obtenerUsuario();
  if (usuario) {
    location.replace(inicioSegunRol(usuario));
    return detener();
  }
  return null;
}
