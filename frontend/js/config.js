// Configuración general del frontend.

// Carpeta donde está instalado el sistema: '/' en la raíz del sitio (http://localhost/) o
// '/cancha-satelite/' en una subcarpeta (http://localhost/cancha-satelite/).
// Se calcula desde la ubicación de este archivo, que se sirve en <base>js/config.js.
export const BASE = new URL('..', import.meta.url).pathname;

// Frontend y backend están en el mismo sitio, por eso la API es una ruta relativa a la base.
export const CONFIG = {
  API_URL: `${BASE}api`,
};

// Rutas de las páginas del sitio (un solo lugar para cambiarlas)
export const RUTAS = {
  inicio: BASE,
  login: `${BASE}pages/auth/login.html`,
  registro: `${BASE}pages/auth/registro.html`,
  reservar: `${BASE}pages/reservar.html`,
  pagar: `${BASE}pages/usuario/pagar.html`,
  misReservas: `${BASE}pages/usuario/mis-reservas.html`,
  adminPanel: `${BASE}pages/admin/index.html`,
  adminReservas: `${BASE}pages/admin/reservas.html`,
  adminPagos: `${BASE}pages/admin/pagos.html`,
  adminConfiguracion: `${BASE}pages/admin/configuracion.html`,
  adminReportes: `${BASE}pages/admin/reportes.html`,
};
