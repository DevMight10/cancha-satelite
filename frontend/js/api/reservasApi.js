import { http } from './http.js';

export const reservasApi = {
  crear: (fecha, horaInicio) => http.post('/reservas', { fecha, hora_inicio: horaInicio }),
  mias: () => http.get('/reservas'),
  obtener: (id) => http.get(`/reservas/${id}`),
  cancelar: (id, motivo = '') => http.post(`/reservas/${id}/cancelar`, { motivo }),
  enviarPago: (id, formData) => http.post(`/reservas/${id}/pagos`, formData),
  urlComprobante: (pagoId) => `/api/pagos/${pagoId}/comprobante`,
};
