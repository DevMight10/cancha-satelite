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

  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${CONFIG.API_URL}${ruta}`, opciones);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  if (respuesta.status === 204) return null;

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ApiError(json.error ?? 'Ocurrió un error inesperado', respuesta.status, json.errores ?? {});
  }

  return json.data;
}

export const http = {
  get: (ruta) => request('GET', ruta),
  post: (ruta, cuerpo = {}) => request('POST', ruta, cuerpo),
  put: (ruta, cuerpo = {}) => request('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => request('PATCH', ruta, cuerpo),
  delete: (ruta) => request('DELETE', ruta),
};
