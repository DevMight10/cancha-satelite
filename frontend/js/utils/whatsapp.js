// Enlaces de WhatsApp con mensaje prellenado (wa.me). No requieren la API de pago de WhatsApp.

import { fechaLarga, rangoHoras } from './formato.js';

export function enlaceWhatsapp(celular, mensaje) {
  const numero = String(celular ?? '').replace(/\D/g, '').replace(/^591/, '');
  if (numero.length !== 8) return null;
  return `https://wa.me/591${numero}?text=${encodeURIComponent(mensaje)}`;
}

export const describirReserva = (r) =>
  `${fechaLarga(r.fecha)}, ${rangoHoras(r.hora_inicio, r.hora_fin)} (reserva #${r.id})`;
