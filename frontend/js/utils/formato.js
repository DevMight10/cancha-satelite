// Formatos para mostrar datos (fechas, horas, dinero, estados).

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Date local a partir de "AAAA-MM-DD" (sin desfase de zona horaria). */
export function aFecha(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function aIso(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export const hoyIso = () => aIso(new Date());

export function sumarDias(iso, dias) {
  const f = aFecha(iso);
  f.setDate(f.getDate() + dias);
  return aIso(f);
}

/** "sábado 4 de octubre" */
export function fechaLarga(iso) {
  const f = aFecha(iso);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
}

/** "sáb 4 oct" */
export function fechaCorta(iso) {
  const f = aFecha(iso);
  return `${DIAS_CORTOS[f.getDay()]} ${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
}

export const diaCorto = (iso) => DIAS_CORTOS[aFecha(iso).getDay()];
export const mesCorto = (iso) => MESES_CORTOS[aFecha(iso).getMonth()];
export const nombreMes = (numero) => MESES[numero - 1];

/** "Hoy", "Mañana" o "sábado 4 de octubre" */
export function fechaRelativa(iso) {
  if (iso === hoyIso()) return 'Hoy';
  if (iso === sumarDias(hoyIso(), 1)) return 'Mañana';
  return fechaLarga(iso);
}

/** "18:00:00" -> "18:00" */
export const hora = (valor) => String(valor ?? '').slice(0, 5);

export const rangoHoras = (inicio, fin) => `${hora(inicio)} – ${hora(fin)}`;

const numeroBs = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
/** 150 -> "Bs 150" · 150.5 -> "Bs 150,5" */
export const dinero = (monto) => `Bs ${numeroBs.format(Number(monto))}`;

/** Minutos que faltan hasta una fecha-hora "AAAA-MM-DD HH:MM:SS". */
export function minutosHasta(fechaHora) {
  const destino = new Date(fechaHora.replace(' ', 'T'));
  return Math.max(0, Math.ceil((destino - new Date()) / 60000));
}

export const ESTADOS_RESERVA = {
  pendiente_pago: 'Pendiente de pago',
  en_revision: 'Pago en revisión',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  expirada: 'Vencida',
};

export const ESTADOS_PAGO = {
  pendiente: 'Por revisar',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const METODOS_PAGO = {
  qr: 'QR Simple',
  tigo_money: 'Tigo Money',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
};

export const iniciales = (nombre) => String(nombre ?? '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
