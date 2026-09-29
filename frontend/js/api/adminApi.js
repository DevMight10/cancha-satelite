import { http, query } from './http.js';

export const adminApi = {
  // Panel
  panel: (fecha) => http.get(`/admin/panel${query({ fecha })}`),
  contadores: () => http.get('/admin/contadores'),

  // Reservas
  reservas: (filtros = {}) => http.get(`/admin/reservas${query(filtros)}`),
  crearPresencial: (datos) => http.post('/admin/reservas', datos),
  cancelarReserva: (id, motivo) => http.post(`/admin/reservas/${id}/cancelar`, { motivo }),
  cobrarEfectivo: (id) => http.post(`/admin/reservas/${id}/cobrar-efectivo`),

  // Pagos
  pagos: (estado = 'pendiente') => http.get(`/admin/pagos${query({ estado })}`),
  aprobarPago: (id) => http.post(`/admin/pagos/${id}/aprobar`),
  rechazarPago: (id, motivo) => http.post(`/admin/pagos/${id}/rechazar`, { motivo }),

  // Configuración
  configuracion: () => http.get('/admin/configuracion'),
  guardarGeneral: (datos) => http.put('/admin/configuracion', datos),
  guardarHorarios: (horarios, duracion) => http.put('/admin/horarios', { horarios, duracion_turno: duracion }),
  crearTarifa: (t) => http.post('/admin/tarifas', t),
  actualizarTarifa: (id, t) => http.put(`/admin/tarifas/${id}`, t),
  eliminarTarifa: (id) => http.delete(`/admin/tarifas/${id}`),
  crearBloqueo: (fecha, motivo) => http.post('/admin/bloqueos', { fecha, motivo }),
  eliminarBloqueo: (id) => http.delete(`/admin/bloqueos/${id}`),
  subirQr: (formData) => http.post('/admin/configuracion/qr', formData),

  // Reportes
  reportes: (desde, hasta) => http.get(`/admin/reportes${query({ desde, hasta })}`),
};
