// Configuración general del frontend.
// Frontend y backend están en el mismo dominio, por eso la API es una ruta relativa.
export const CONFIG = {
  API_URL: '/api',
};

// Rutas de las páginas del sitio (un solo lugar para cambiarlas)
export const RUTAS = {
  inicio: '/',
  login: '/pages/auth/login.html',
  registro: '/pages/auth/registro.html',
  reservar: '/pages/reservar.html',
  pagar: '/pages/usuario/pagar.html',
  misReservas: '/pages/usuario/mis-reservas.html',
  adminPanel: '/pages/admin/index.html',
  adminReservas: '/pages/admin/reservas.html',
  adminPagos: '/pages/admin/pagos.html',
  adminConfiguracion: '/pages/admin/configuracion.html',
  adminReportes: '/pages/admin/reportes.html',
};
