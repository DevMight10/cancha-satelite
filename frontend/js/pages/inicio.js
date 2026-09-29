import { saludApi } from '../api/saludApi.js';

const estadoApi = document.getElementById('estado-api');
const estadoDb = document.getElementById('estado-db');

function pintar(elemento, texto, correcto) {
  elemento.textContent = texto;
  elemento.className = `badge ${correcto ? 'text-bg-success' : 'text-bg-danger'}`;
}

try {
  const salud = await saludApi.verificar();
  pintar(estadoApi, 'funcionando', true);
  pintar(estadoDb, salud.base_de_datos, salud.base_de_datos === 'conectada');
} catch (error) {
  pintar(estadoApi, error.message, false);
  pintar(estadoDb, 'desconocido', false);
}
