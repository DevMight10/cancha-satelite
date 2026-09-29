#!/usr/bin/env bash
# Pruebas: información pública y calendario de disponibilidad.
source "$(dirname "$0")/lib.sh"

HOY=$(date +%F)

seccion "Información pública"
pedir c GET /publico/info
espera_status 200 "devuelve la información de la cancha"
[ "$(json 'r.data.horarios.length')" = "7" ] && ok "incluye el horario de los 7 días" || falla "horario de 7 días"
[ "$(json 'r.data.tarifas.length > 0')" = "true" ] && ok "incluye las tarifas" || falla "tarifas"
ANTICIPACION=$(json 'r.data.reglas.dias_anticipacion')

seccion "Disponibilidad por día"
pedir c GET "/disponibilidad?fecha=$HOY"
espera_status 200 "turnos de hoy"
[ "$(json "r.data.turnos.every(t => ['libre','ocupado','pasado'].includes(t.estado))")" = "true" ] && ok "cada turno tiene un estado válido" || falla "estados válidos"
[ "$(json "r.data.turnos.every(t => Number(t.precio) > 0)")" = "true" ] && ok "cada turno tiene precio" || falla "precios"

# Próximo sábado: la tarifa de fin de semana (la más alta) debe aplicarse
SABADO=$(node -e "const d=new Date(); d.setDate(d.getDate()+((6-d.getDay()+7)%7||7)); console.log(d.toISOString().slice(0,10))")
pedir c GET "/disponibilidad?fecha=$SABADO"
MAX=$(json "Math.max(...r.data.turnos.map(t=>Number(t.precio)))")
MIN=$(json "Math.min(...r.data.turnos.map(t=>Number(t.precio)))")
[ "$MAX" = "$MIN" ] && ok "sábado: se cobra la tarifa más alta que corresponde (Bs $MAX en todos los turnos)" || falla "tarifa de fin de semana"

pedir c GET "/disponibilidad?fecha=2020-01-01"
espera_status 422 "rechaza fechas pasadas"
pedir c GET "/disponibilidad?fecha=2026-02-30"
espera_status 422 "rechaza fechas inexistentes"
LEJOS=$(node -e "const d=new Date(); d.setDate(d.getDate()+$ANTICIPACION+1); console.log(d.toISOString().slice(0,10))")
pedir c GET "/disponibilidad?fecha=$LEJOS"
espera_status 422 "rechaza fechas fuera de la anticipación permitida"

seccion "Resumen de días"
pedir c GET /disponibilidad/dias
espera_status 200 "devuelve los próximos días"
[ "$(json 'r.data.length')" = "$((ANTICIPACION + 1))" ] && ok "un día por cada día de anticipación (+ hoy)" || falla "cantidad de días"

resumen
