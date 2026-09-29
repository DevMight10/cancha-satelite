// Prueba de interfaz: reportes con gráficos, mapa de horarios y exportación a Excel y PDF.
// Ejecutar: node tests/ui/08_admin_reportes.mjs
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CAPTURAS, abrirNavegador, afirmar, credencial, paso, seccion, terminar } from './navegador.mjs';

const nav = await abrirNavegador({ ancho: 1440, alto: 900 });
const descargas = join(CAPTURAS, 'descargas');
rmSync(descargas, { recursive: true, force: true });

const esperarArchivo = async (extension) => {
  for (let i = 0; i < 50; i++) {
    const archivo = existsSync(descargas) && readdirSync(descargas).find((f) => f.endsWith(extension));
    if (archivo && statSync(join(descargas, archivo)).size > 0) return archivo;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no se descargó ningún ${extension}`);
};

try {
  await paso('el administrador abre Reportes', async () => {
    await nav.ir('/pages/auth/login.html');
    await nav.escribir('#email', credencial('ADMIN_DEV_EMAIL'));
    await nav.escribir('#password', credencial('ADMIN_DEV_PASSWORD'));
    await nav.clic('#form-login [type=submit]');
    await nav.esperarUrl('/pages/admin/');
    await nav.permitirDescargas(descargas);
    const hoy = await nav.evaluar(`new Date().toISOString().slice(0, 10)`);
    const hasta = await nav.evaluar(`(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })()`);
    await nav.ir(`/pages/admin/reportes.html?desde=${hoy}&hasta=${hasta}`);
    await nav.esperarQue(`document.querySelector('.cifra-principal dd')`, { descripcion: 'cifras' });
  });

  seccion('Contenido');
  await paso('las cifras coinciden con la API', async () => {
    const api = await nav.evaluar(`fetch('/api/admin/reportes' + location.search).then(r => r.json()).then(j => j.data.resumen)`);
    const confirmadas = await nav.evaluar(`[...document.querySelectorAll('.cifras div')].find(d => d.innerText.startsWith('Reservas')).querySelector('dd').textContent`);
    afirmar(Number(confirmadas) === api.confirmadas, `pantalla ${confirmadas} vs API ${api.confirmadas}`);
    afirmar(api.confirmadas > 0, 'no hay datos de prueba en el rango');
  });

  await paso('dibuja los gráficos, el mapa de horarios y el top 5', async () => {
    await nav.esperarQue(`window.Chart && Chart.getChart('grafico-dias') && Chart.getChart('grafico-meses')`, { descripcion: 'gráficos' });
    await nav.esperarQue(`document.querySelectorAll('#mapa-horarios td[class^="nivel-"]').length > 0`, { descripcion: 'mapa' });
    const top = await nav.evaluar(`document.querySelectorAll('.top-lista li').length`);
    afirmar(top >= 1 && top <= 5, `top: ${top}`);
    await nav.captura('08-admin-reportes');
  });

  await paso('"Ver como tabla" muestra los mismos datos del gráfico', async () => {
    await nav.evaluar(`document.querySelector('.ver-tabla').open = true`);
    const filas = await nav.evaluar(`document.querySelectorAll('#tabla-dias tbody tr').length`);
    const conDatos = await nav.evaluar(`Chart.getChart('grafico-dias').data.datasets[0].data.filter(v => v > 0).length`);
    afirmar(filas >= conDatos && filas > 0, `tabla ${filas} filas, gráfico ${conDatos} días con ingresos`);
  });

  let urlReporte;
  await paso('los periodos rápidos cambian el rango', async () => {
    urlReporte = await nav.evaluar('location.pathname + location.search');
    await nav.clic('[data-periodo="30"]');
    await nav.esperarQue(`location.search.includes('desde=')`);
    const dias = await nav.evaluar(`fetch('/api/admin/reportes' + location.search).then(r => r.json()).then(j => j.data.por_dia.length)`);
    afirmar(dias === 30, `días: ${dias}`);
  });

  seccion('Exportar');
  await paso('descarga el reporte en Excel (.xlsx)', async () => {
    await nav.ir(urlReporte);
    await nav.esperarQue(`document.querySelector('.cifra-principal dd')`);
    await nav.clic('#exportar-excel');
    const archivo = await esperarArchivo('.xlsx');
    afirmar(archivo.startsWith('reporte-cancha-'), archivo);
  });

  await paso('descarga el reporte en PDF', async () => {
    await nav.clic('#exportar-pdf');
    await esperarArchivo('.pdf');
  });

  await paso('en celular no hay scroll horizontal', async () => {
    await nav.viewport(390, 844, true);
    await nav.ir(await nav.evaluar('location.pathname + location.search'));
    await nav.esperarQue(`document.querySelector('.cifra-principal dd')`);
    const desborde = await nav.evaluar('document.documentElement.scrollWidth - window.innerWidth');
    afirmar(desborde <= 0, `hay ${desborde}px de scroll horizontal`);
    await nav.captura('08-admin-reportes-celular', { completa: false });
  });

  await paso('sin errores de JavaScript en la consola', async () => {
    afirmar(nav.erroresConsola.length === 0, nav.erroresConsola.join(' | '));
  });
} finally {
  await nav.cerrar();
  terminar();
}
