import { adminApi } from '../../api/adminApi.js';
import { manejarError } from '../../components/formulario.js';
import { toast } from '../../components/toast.js';
import { iniciarAdmin } from '../../core/admin.js';
import { $, $$, html, pintar } from '../../utils/dom.js';
import { METODOS_PAGO, aIso, dinero, fechaCorta, hora, hoyIso, nombreMes, sumarDias } from '../../utils/formato.js';

await iniciarAdmin('reportes');

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const COLOR = { barra: '#1f8a3b', barraHover: '#0b0d0c', grilla: '#e3e6e4', texto: '#5b605d', tinta: '#0b0d0c' };
const filtros = $('#filtros');
const graficos = {};
let reporte;

// ---- Rango ---------------------------------------------------------------------
function periodo(tipo) {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (tipo) {
    case 'mes-anterior': return [aIso(new Date(y, m - 1, 1)), aIso(new Date(y, m, 0))];
    case '30': return [sumarDias(hoyIso(), -29), hoyIso()];
    case 'anio': return [aIso(new Date(y, 0, 1)), hoyIso()];
    default: return [aIso(new Date(y, m, 1)), hoyIso()];
  }
}

function elegirPeriodo(tipo) {
  [filtros.desde.value, filtros.hasta.value] = periodo(tipo);
  $$('.segmento').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.periodo === tipo)));
  cargar();
}

$$('.segmento').forEach((b) => b.addEventListener('click', () => elegirPeriodo(b.dataset.periodo)));
filtros.addEventListener('change', () => {
  $$('.segmento').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  cargar();
});
filtros.addEventListener('submit', (e) => e.preventDefault());

async function cargar() {
  const { desde, hasta } = Object.fromEntries(new FormData(filtros));
  if (!desde || !hasta) return;
  history.replaceState(null, '', `?desde=${desde}&hasta=${hasta}`);
  try {
    reporte = await adminApi.reportes(desde, hasta);
    render();
  } catch (error) {
    manejarError(error);
  }
}

// ---- Render --------------------------------------------------------------------
function render() {
  const r = reporte.resumen;
  pintar($('#cifras'), html`
    <div class="cifra-principal"><dt>Ingresos</dt><dd class="num">${dinero(r.ingresos)}</dd></div>
    <div><dt>Reservas confirmadas</dt><dd class="num">${r.confirmadas}</dd></div>
    <div><dt>Ocupación</dt><dd class="num">${String(r.ocupacion).replace('.', ',')}%</dd><small>${r.confirmadas} de ${r.turnos_ofrecidos} turnos</small></div>
    <div><dt>Promedio por reserva</dt><dd class="num">${dinero(r.promedio_por_reserva)}</dd></div>
    <div><dt>Canceladas / vencidas</dt><dd class="num">${r.canceladas} / ${r.vencidas}</dd>${r.pendientes ? html`<small>${r.pendientes} aún por cobrar</small>` : ''}</div>`);

  const muchos = reporte.por_dia.length > 45;
  graficoBarras('dias', reporte.por_dia.map((d) => muchos ? d.fecha.slice(5).split('-').reverse().join('/') : fechaCorta(d.fecha)),
    reporte.por_dia.map((d) => d.ingresos), (i) => `${fechaCorta(reporte.por_dia[i].fecha)} · ${reporte.por_dia[i].reservas} reservas`);
  graficoBarras('meses', reporte.por_mes.map(etiquetaMes), reporte.por_mes.map((m) => m.ingresos),
    (i) => `${etiquetaMes(reporte.por_mes[i])} · ${reporte.por_mes[i].reservas} reservas`);

  pintar($('#tabla-dias'), tabla(['Día', 'Reservas', 'Ingresos'], reporte.por_dia.filter((d) => d.reservas)
    .map((d) => [fechaCorta(d.fecha), d.reservas, dinero(d.ingresos)]), 'No hubo reservas confirmadas en este rango.'));
  pintar($('#tabla-meses'), tabla(['Mes', 'Reservas', 'Ingresos'], reporte.por_mes.map((m) => [etiquetaMes(m), m.reservas, dinero(m.ingresos)])));

  renderMetodos();
  renderHorarios();

  $('#t-detalle').textContent = `Detalle de reservas confirmadas (${reporte.detalle.length})`;
  pintar($('#tabla-detalle'), tabla(['Día', 'Hora', 'Cliente', 'Celular', 'Origen', 'Pago', 'Cobrado'],
    reporte.detalle.map((d) => [fechaCorta(d.fecha), hora(d.hora_inicio), d.cliente_nombre, d.cliente_telefono,
      d.origen === 'web' ? 'Web' : 'Presencial', METODOS_PAGO[d.metodo] ?? '—', dinero(d.cobrado)]), 'Sin reservas confirmadas.'));
}

const etiquetaMes = (m) => {
  const [a, mes] = m.mes.split('-').map(Number);
  return `${nombreMes(mes).slice(0, 3)} ${a}`;
};

function tabla(columnas, filas, vacio = 'Sin datos.') {
  if (!filas.length) return html`<p class="texto-suave texto-sm">${vacio}</p>`;
  return html`<div class="tabla-envoltura"><table class="tabla">
    <thead><tr>${columnas.map((c) => html`<th scope="col">${c}</th>`)}</tr></thead>
    <tbody>${filas.map((f) => html`<tr>${f.map((v) => html`<td>${v}</td>`)}</tr>`)}</tbody>
  </table></div>`;
}

/** Columnas de una sola serie: finas, extremo redondeado, cuadradas en la base, tooltip por barra. */
function graficoBarras(id, etiquetas, valores, detalle) {
  if (!window.Chart) return;
  graficos[id]?.destroy();
  const Chart = window.Chart;
  Chart.defaults.font.family = "'Rubik', system-ui, sans-serif";
  Chart.defaults.color = COLOR.texto;

  graficos[id] = new Chart(document.getElementById(`grafico-${id}`), {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        data: valores,
        backgroundColor: COLOR.barra,
        hoverBackgroundColor: COLOR.barraHover,
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'start',
        maxBarThickness: 24,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b0d0c',
          titleColor: '#ffffff',
          bodyColor: '#f4f6ee',
          titleFont: { weight: '700', size: 15 },
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => dinero(items[0].parsed.y),
            label: (item) => detalle(item.dataIndex),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { color: COLOR.grilla }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: COLOR.grilla, lineWidth: 1 },
          ticks: { precision: 0, callback: (v) => `Bs ${Number(v).toLocaleString('es-BO')}` },
        },
      },
    },
  });
}

function renderMetodos() {
  const metodos = reporte.por_metodo;
  if (!metodos.length) {
    pintar($('#metodos'), html`<p class="texto-suave texto-sm">Sin pagos aprobados en este rango.</p>`);
    return;
  }
  const max = Math.max(...metodos.map((m) => m.monto));
  pintar($('#metodos'), html`<ul class="barras-h">${metodos.map((m) => html`
    <li>
      <span class="barras-h-etiqueta">${METODOS_PAGO[m.metodo]}<small>${m.pagos} ${m.pagos === 1 ? 'pago' : 'pagos'}</small></span>
      <span class="barras-h-pista"><span class="barras-h-barra" style="width:${Math.max(2, (m.monto / max) * 100)}%"></span></span>
      <strong class="num">${dinero(m.monto)}</strong>
    </li>`)}</ul>`);
}

function renderHorarios() {
  const datos = reporte.por_horario;
  if (!datos.length) {
    pintar($('#mapa-horarios'), html`<p class="texto-suave texto-sm">Todavía no hay reservas confirmadas en este rango.</p>`);
    pintar($('#top-horarios'), html``);
    return;
  }
  const horas = [...new Set(datos.map((d) => d.hora_inicio))].sort();
  const valor = (dia, h) => datos.find((d) => d.dia_semana === dia && d.hora_inicio === h)?.reservas ?? 0;
  const max = Math.max(...datos.map((d) => d.reservas));
  const nivel = (v) => Math.min(4, Math.ceil((v / max) * 4));

  pintar($('#mapa-horarios'), html`
    <table class="semana precios mapa">
      <caption class="visualmente-oculto">Reservas confirmadas por día de la semana y hora</caption>
      <thead><tr><th scope="col"><span class="visualmente-oculto">Hora</span></th>${INICIALES.map((l, i) => html`<th scope="col" title="${DIAS[i]}">${l}</th>`)}</tr></thead>
      <tbody>${horas.map((h) => html`<tr><th scope="row">${hora(h)}</th>${[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const v = valor(d, h);
        return v
          ? html`<td class="nivel-${nivel(v)}" title="${DIAS[d - 1]} ${hora(h)}: ${v} ${v === 1 ? 'reserva' : 'reservas'}" tabindex="0">${v}</td>`
          : html`<td class="vacia" title="${DIAS[d - 1]} ${hora(h)}: sin reservas"></td>`;
      })}</tr>`)}</tbody>
    </table>`);

  pintar($('#top-horarios'), html`
    <h3 class="texto-sm texto-suave top-titulo">Los 5 más pedidos</h3>
    <ol class="top-lista">${datos.slice(0, 5).map((d) => html`
      <li><strong>${DIAS[d.dia_semana - 1]} ${hora(d.hora_inicio)}</strong><span class="num">${d.reservas} ${d.reservas === 1 ? 'reserva' : 'reservas'}</span></li>`)}</ol>`);
}

// ---- Exportar ------------------------------------------------------------------
const cargarScript = (src) => new Promise((ok, mal) => {
  if (document.querySelector(`script[src="${src}"]`)) return ok();
  const s = document.createElement('script');
  s.src = src;
  s.onload = ok;
  s.onerror = () => mal(new Error('No se pudo descargar la librería de exportación'));
  document.head.append(s);
});

const nombreArchivo = (ext) => `reporte-cancha-${reporte.desde}_a_${reporte.hasta}.${ext}`;

function filasResumen() {
  const r = reporte.resumen;
  return [
    ['Desde', reporte.desde], ['Hasta', reporte.hasta],
    ['Ingresos (Bs)', r.ingresos], ['Reservas confirmadas', r.confirmadas],
    ['Ocupación (%)', r.ocupacion], ['Turnos ofrecidos', r.turnos_ofrecidos],
    ['Promedio por reserva (Bs)', r.promedio_por_reserva],
    ['Canceladas', r.canceladas], ['Vencidas', r.vencidas], ['Pendientes de cobro', r.pendientes],
  ];
}

async function exportarExcel(boton) {
  boton.classList.add('cargando');
  try {
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const XLSX = window.XLSX;
    const libro = XLSX.utils.book_new();
    const hoja = (filas, anchos) => { const h = XLSX.utils.aoa_to_sheet(filas); h['!cols'] = anchos.map((w) => ({ wch: w })); return h; };
    XLSX.utils.book_append_sheet(libro, hoja([['Indicador', 'Valor'], ...filasResumen()], [28, 16]), 'Resumen');
    XLSX.utils.book_append_sheet(libro, hoja([['Fecha', 'Reservas', 'Ingresos (Bs)'], ...reporte.por_dia.map((d) => [d.fecha, d.reservas, d.ingresos])], [12, 10, 14]), 'Por día');
    XLSX.utils.book_append_sheet(libro, hoja([['Mes', 'Reservas', 'Ingresos (Bs)'], ...reporte.por_mes.map((m) => [m.mes, m.reservas, m.ingresos])], [10, 10, 14]), 'Por mes');
    XLSX.utils.book_append_sheet(libro, hoja([['Día', 'Hora', 'Reservas'], ...reporte.por_horario.map((h) => [DIAS[h.dia_semana - 1], hora(h.hora_inicio), h.reservas])], [12, 8, 10]), 'Horarios');
    XLSX.utils.book_append_sheet(libro, hoja([['Medio de pago', 'Pagos', 'Monto (Bs)'], ...reporte.por_metodo.map((m) => [METODOS_PAGO[m.metodo], m.pagos, m.monto])], [22, 8, 12]), 'Medios de pago');
    XLSX.utils.book_append_sheet(libro, hoja([['N°', 'Fecha', 'Hora', 'Cliente', 'Celular', 'Origen', 'Medio de pago', 'Cobrado (Bs)'],
      ...reporte.detalle.map((d) => [d.id, d.fecha, hora(d.hora_inicio), d.cliente_nombre, d.cliente_telefono, d.origen, METODOS_PAGO[d.metodo] ?? '', Number(d.cobrado)])],
    [6, 12, 7, 26, 11, 11, 20, 12]), 'Detalle');
    XLSX.writeFile(libro, nombreArchivo('xlsx'));
    toast('Reporte de Excel descargado.');
  } catch (error) {
    manejarError(error);
  } finally {
    boton.classList.remove('cargando');
  }
}

async function exportarPdf(boton) {
  boton.classList.add('cargando');
  try {
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const verde = [31, 138, 59];
    const tablero = [11, 13, 12];

    pdf.setFillColor(...tablero);
    pdf.rect(0, 0, 595, 70, 'F');
    pdf.setTextColor(34, 197, 94);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('CANCHA SATÉLITE NORTE', 40, 38);
    pdf.setTextColor(244, 246, 238);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Reporte del ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}`, 40, 56);

    const estilos = { headStyles: { fillColor: verde }, styles: { font: 'helvetica', fontSize: 9 }, margin: { left: 40, right: 40 } };
    const r = reporte.resumen;
    pdf.autoTable({ ...estilos, startY: 90, head: [['Indicador', 'Valor']], body: [
      ['Ingresos', dinero(r.ingresos)], ['Reservas confirmadas', r.confirmadas],
      ['Ocupación', `${r.ocupacion}% (${r.confirmadas} de ${r.turnos_ofrecidos} turnos)`],
      ['Promedio por reserva', dinero(r.promedio_por_reserva)], ['Canceladas / vencidas', `${r.canceladas} / ${r.vencidas}`],
    ] });
    pdf.autoTable({ ...estilos, head: [['Mes', 'Reservas', 'Ingresos']], body: reporte.por_mes.map((m) => [etiquetaMes(m), m.reservas, dinero(m.ingresos)]) });
    pdf.autoTable({ ...estilos, head: [['Medio de pago', 'Pagos', 'Monto']], body: reporte.por_metodo.map((m) => [METODOS_PAGO[m.metodo], m.pagos, dinero(m.monto)]) });
    pdf.autoTable({ ...estilos, head: [['Horario más usado', 'Reservas']], body: reporte.por_horario.slice(0, 10).map((h) => [`${DIAS[h.dia_semana - 1]} ${hora(h.hora_inicio)}`, h.reservas]) });
    pdf.autoTable({ ...estilos, head: [['Día', 'Reservas', 'Ingresos']], body: reporte.por_dia.filter((d) => d.reservas).map((d) => [fechaCorta(d.fecha), d.reservas, dinero(d.ingresos)]) });
    pdf.autoTable({ ...estilos, head: [['Fecha', 'Hora', 'Cliente', 'Pago', 'Cobrado']], body: reporte.detalle.map((d) => [fechaCorta(d.fecha), hora(d.hora_inicio), d.cliente_nombre, METODOS_PAGO[d.metodo] ?? '—', dinero(d.cobrado)]) });

    const paginas = pdf.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Generado el ${fechaCorta(hoyIso())} · Página ${i} de ${paginas}`, 40, 820);
    }
    pdf.save(nombreArchivo('pdf'));
    toast('Reporte PDF descargado.');
  } catch (error) {
    manejarError(error);
  } finally {
    boton.classList.remove('cargando');
  }
}

$('#exportar-excel').addEventListener('click', (e) => reporte && exportarExcel(e.currentTarget));
$('#exportar-pdf').addEventListener('click', (e) => reporte && exportarPdf(e.currentTarget));

// ---- Inicio ------------------------------------------------------------------------
const params = new URLSearchParams(location.search);
if (params.get('desde') && params.get('hasta')) {
  filtros.desde.value = params.get('desde');
  filtros.hasta.value = params.get('hasta');
  await cargar();
} else {
  elegirPeriodo('mes');
}
