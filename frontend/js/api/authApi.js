import { http } from './http.js';

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (email, password) => http.post('/auth/login', { email, password }),
  registro: (datos) => http.post('/auth/registro', datos),
  logout: () => http.post('/auth/logout'),
  actualizarPerfil: (datos) => http.put('/auth/perfil', datos),
};
