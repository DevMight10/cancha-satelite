import { renderCabecera } from '../components/cabecera.js';
import { obtenerUsuario, requerirAdmin, requerirInvitado, requerirSesion } from '../guards/auth.js';
import { iconos } from '../utils/dom.js';

/**
 * Arranque común de cada página: verifica el acceso, pinta la cabecera y los iconos.
 *   acceso: 'publico' | 'sesion' | 'admin' | 'invitado'
 *   activa: enlace de la cabecera a resaltar
 * Devuelve el usuario de la sesión (o null).
 */
export async function iniciarPagina({ acceso = 'publico', activa = '' } = {}) {
  const guardias = { sesion: requerirSesion, admin: requerirAdmin, invitado: requerirInvitado, publico: obtenerUsuario };
  const usuario = await guardias[acceso]();
  renderCabecera(usuario, activa);
  iconos();
  return usuario;
}
