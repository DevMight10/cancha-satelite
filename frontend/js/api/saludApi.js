import { http } from './http.js';

export const saludApi = {
  verificar: () => http.get('/salud'),
};
