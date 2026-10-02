#!/usr/bin/env bash
# Pruebas: reportes de ingresos, ocupación y horarios.
source "$(dirname "$0")/lib.sh"

ENV_FILE="$(dirname "$0")/../backend/.env"
ADMIN_EMAIL=$(grep 'ADMIN_DEV_EMAIL=' "$ENV_FILE" | cut -d= -f2)
ADMIN_PASS=$(grep 'ADMIN_DEV_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
pedir adm POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
pedir cli POST /auth/registro "{\"nombre\":\"Curioso Reportes $SUFIJO\",\"email\":\"rep$SUFIJO@prueba.test\",\"telefono\":\"73336666\",\"password\":\"clave-segura-1\"}"

DESDE=$(date +%F); HASTA=$(date -d '+14 day' +%F)

seccion "Permisos y validación"
pedir cli GET "/admin/reportes?desde=$DESDE&hasta=$HASTA"
espera_status 403 "un cliente no puede ver reportes"
pedir adm GET "/admin/reportes?desde=$HASTA&hasta=$DESDE"
espera_status 422 "la fecha final debe ser posterior a la inicial"
pedir adm GET "/admin/reportes?desde=2024-01-01&hasta=2026-01-01"
espera_status 422 "el rango máximo es de un año"

seccion "Consistencia de los números"
pedir adm GET "/admin/reportes?desde=$DESDE&hasta=$HASTA"
espera_status 200 "genera el reporte"
[ "$(json 'r.data.por_dia.length')" = "15" ] && ok "una fila por cada día del rango (con ceros)" || falla "días completos"
[ "$(json 'Math.abs(r.data.por_dia.reduce((s,d)=>s+d.ingresos,0) - r.data.resumen.ingresos) < 0.01')" = "true" ] && ok "la suma diaria coincide con el total" || falla "suma diaria"
[ "$(json 'Math.abs(r.data.por_mes.reduce((s,d)=>s+d.ingresos,0) - r.data.resumen.ingresos) < 0.01')" = "true" ] && ok "la suma mensual coincide con el total" || falla "suma mensual"
[ "$(json 'r.data.detalle.length === r.data.resumen.confirmadas')" = "true" ] && ok "el detalle tiene una fila por reserva confirmada" || falla "detalle"
[ "$(json 'r.data.por_horario.reduce((s,h)=>s+h.reservas,0) === r.data.resumen.confirmadas')" = "true" ] && ok "los horarios suman las reservas confirmadas" || falla "horarios"
INGRESOS=$(json 'r.data.resumen.ingresos'); CONFIRMADAS=$(json 'r.data.resumen.confirmadas')

seccion "Un cobro nuevo se refleja en el reporte"
FECHA=$(date -d '+13 day' +%F)
pedir adm GET "/disponibilidad?fecha=$FECHA"; H=$(json "r.data.turnos.find(t=>t.estado==='libre').hora_inicio.slice(0,5)"); PRECIO=$(json "Number(r.data.turnos.find(t=>t.estado==='libre').precio)")
pedir adm POST /admin/reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H\",\"cliente_nombre\":\"Reporte $SUFIJO\",\"cliente_telefono\":\"76667777\",\"pagado\":true}"
pedir adm GET "/admin/reportes?desde=$DESDE&hasta=$HASTA"
[ "$(json "r.data.resumen.ingresos === $INGRESOS + $PRECIO")" = "true" ] && ok "los ingresos suben exactamente Bs $PRECIO" || falla "ingresos tras cobro"
[ "$(json "r.data.resumen.confirmadas === $CONFIRMADAS + 1")" = "true" ] && ok "las confirmadas suben en 1" || falla "confirmadas +1"
[ "$(json "r.data.por_metodo.some(m=>m.metodo==='efectivo')")" = "true" ] && ok "aparece en ingresos por medio de pago (efectivo)" || falla "por método"
[ "$(json 'r.data.resumen.ocupacion > 0 && r.data.resumen.ocupacion <= 100')" = "true" ] && ok "la ocupación es un porcentaje válido" || falla "ocupación"

resumen
