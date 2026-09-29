import { CONFIG } from '../config.js';

// Único punto del frontend que usa fetch(). Los módulos de api/ se apoyan en este archivo.

export class ApiError extends Error {
  constructor(mensaje, status, errores = {}) {
    super(mensaje);
    this.status = status;
    this.errores = errores;
  }
}

async function request(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo,
    credentials: 'same-origin', // envía la cookie de sesión
    headers: { Accept: 'application/json' },
  };

  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo; // el navegador pone el Content-Type multipart
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${CONFIG.API_URL}${ruta}`, opciones);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 0);
  }

  if (respuesta.status === 204) return null;

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ApiError(json.error ?? 'Ocurrió un error inesperado. Intenta de nuevo.', respuesta.status, json.errores ?? {});
  }

  return json.data;
}

/** Arma "?a=1&b=2" ignorando valores vacíos. */
export function query(params = {}) {
  const limpio = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return limpio.length ? `?${new URLSearchParams(limpio)}` : '';
}

export const http = {
  get: (ruta) => request('GET', ruta),
  post: (ruta, cuerpo = {}) => request('POST', ruta, cuerpo),
  put: (ruta, cuerpo = {}) => request('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => request('PATCH', ruta, cuerpo),
  delete: (ruta) => request('DELETE', ruta),
};
