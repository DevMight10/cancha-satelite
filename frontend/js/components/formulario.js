import { ApiError } from '../api/http.js';
import { toast } from './toast.js';

// Ayudas para formularios: leer datos, mostrar errores por campo y estado de carga.

export function leerFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function limpiarErrores(form) {
  form.querySelectorAll('.campo.invalido').forEach((campo) => {
    campo.classList.remove('invalido');
    campo.querySelector('.control')?.removeAttribute('aria-invalid');
  });
  form.querySelector('[data-error-general]')?.setAttribute('hidden', '');
}

/** Muestra los errores del backend ({ campo: mensaje }) debajo de cada campo. */
export function mostrarErrores(form, errores = {}, mensajeGeneral = '') {
  limpiarErrores(form);
  let primero = null;

  for (const [nombre, mensaje] of Object.entries(errores)) {
    const control = form.elements.namedItem(nombre);
    const campo = control?.closest?.('.campo');
    if (!campo) continue;
    campo.classList.add('invalido');
    control.setAttribute('aria-invalid', 'true');
    const error = campo.querySelector('.error-campo');
    if (error) error.textContent = mensaje;
    primero ??= control;
  }

  const general = form.querySelector('[data-error-general]');
  if (general && mensajeGeneral && !primero) {
    general.querySelector('span').textContent = mensajeGeneral;
    general.removeAttribute('hidden');
  }
  primero?.focus();
}

/**
 * Envía un formulario con estado de carga en el botón y manejo de errores.
 *   enviarFormulario(form, async (datos) => { ... })
 */
export function enviarFormulario(form, accion) {
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = form.querySelector('[type="submit"]');
    limpiarErrores(form);
    boton?.classList.add('cargando');
    boton?.setAttribute('aria-busy', 'true');
    try {
      await accion(leerFormulario(form), form);
    } catch (error) {
      manejarError(error, form);
    } finally {
      boton?.classList.remove('cargando');
      boton?.removeAttribute('aria-busy');
    }
  });
}

/** Errores de un formulario: junto a cada campo, en el aviso general, o como toast. */
export function manejarError(error, form = null) {
  if (!(error instanceof ApiError)) {
    console.error(error);
    toast('Ocurrió un error inesperado. Intenta de nuevo.', 'error');
    return;
  }
  const hayCampos = Object.keys(error.errores).length > 0;
  if (form && (hayCampos || form.querySelector('[data-error-general]'))) {
    mostrarErrores(form, error.errores, error.message);
    return;
  }
  toast(error.message, 'error');
}
