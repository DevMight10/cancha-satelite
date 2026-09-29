import { http, query } from './http.js';

export const publicoApi = {
  info: () => http.get('/publico/info'),
  disponibilidad: (fecha) => http.get(`/disponibilidad${query({ fecha })}`),
  dias: () => http.get('/disponibilidad/dias'),
  urlQr: () => '/api/publico/qr',
};
