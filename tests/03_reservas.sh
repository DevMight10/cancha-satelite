#!/usr/bin/env bash
# Pruebas: crear reservas, evitar reservas dobles, ver y cancelar.
source "$(dirname "$0")/lib.sh"

registrar() { # registrar <cookies> <email>
  pedir "$1" POST /auth/registro "{\"nombre\":\"Jugador $1 $SUFIJO\",\"email\":\"$2\",\"telefono\":\"7$(printf '%07d' $((RANDOM*7 % 10000000)))\",\"password\":\"clave-segura-1\"}"
}
registrar ana "ana$SUFIJO@prueba.test"
registrar beto "beto$SUFIJO@prueba.test"

# Buscar un día (desde pasado mañana) con al menos 3 turnos libres
for i in $(seq 2 14); do
  FECHA=$(node -e "const d=new Date(); d.setDate(d.getDate()+$i); console.log(d.toISOString().slice(0,10))")
  pedir ana GET "/disponibilidad?fecha=$FECHA"
  LIBRES=$(json "r.data.turnos.filter(t=>t.estado==='libre').map(t=>t.hora_inicio.slice(0,5)).join(' ')")
  set -- $LIBRES
  [ $# -ge 3 ] && break
done
H1=$1; H2=$2; H3=$3

seccion "Validaciones"
pedir anonimo POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\"}"
espera_status 401 "reservar exige sesión"
pedir ana POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"${H1:0:2}:30\"}"
espera_status 422 "rechaza una hora que no es un turno (${H1:0:2}:30)"
pedir ana POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"03:00\"}"
espera_status 422 "rechaza una hora fuera del horario de apertura"
pedir ana POST /reservas '{"fecha":"2020-01-01","hora_inicio":"18:00"}'
espera_status 422 "rechaza fechas pasadas"

seccion "Regla principal: nunca dos reservas en el mismo horario"
# Dos clientes piden el mismo turno exactamente al mismo tiempo
DATOS="{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\"}"
for quien in ana beto; do
  curl -s -o "$TMP_DIR/r_$quien" -w '%{http_code}' -X POST -b "$TMP_DIR/$quien" -H 'Content-Type: application/json' --data "$DATOS" "$BASE/reservas" > "$TMP_DIR/s_$quien" &
done
wait
RESULTADOS="$(cat "$TMP_DIR/s_ana") $(cat "$TMP_DIR/s_beto")"
[[ "$RESULTADOS" == *201* && "$RESULTADOS" == *409* ]] && ok "pedidos simultáneos: uno se crea (201) y el otro se rechaza (409) → $RESULTADOS" || { STATUS="$RESULTADOS"; falla "pedidos simultáneos"; }

GANADOR=ana; [ "$(cat "$TMP_DIR/s_beto")" = "201" ] && GANADOR=beto
PERDEDOR=beto; [ "$GANADOR" = beto ] && PERDEDOR=ana
BODY=$(cat "$TMP_DIR/r_$GANADOR"); RESERVA=$(json 'r.data.id')
[ "$(json 'r.data.estado')" = "pendiente_pago" ] && ok "la reserva queda pendiente de pago" || falla "estado pendiente_pago"
[ "$(json 'r.data.expira_en !== null')" = "true" ] && ok "tiene un plazo para pagar" || falla "plazo de pago"

pedir "$PERDEDOR" POST /reservas "$DATOS"
espera_status 409 "un tercer intento sobre el mismo turno también se rechaza"
pedir ana GET "/disponibilidad?fecha=$FECHA"
[ "$(json "r.data.turnos.find(t=>t.hora_inicio.startsWith('$H1')).estado")" = "ocupado" ] && ok "el marcador muestra el turno como ocupado" || falla "turno ocupado"

pedir "$PERDEDOR" POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H2\"}"
espera_status 201 "el otro cliente reserva un horario distinto sin problema"

seccion "Mis reservas"
pedir "$GANADOR" GET /reservas
[ "$(json "r.data.some(x=>x.id===$RESERVA)")" = "true" ] && ok "aparece en la lista del cliente" || falla "lista del cliente"
pedir "$GANADOR" GET "/reservas/$RESERVA"
espera_status 200 "ve el detalle de su reserva"
espera_contiene '"datos_pago"' "el detalle incluye los datos para pagar"
pedir "$PERDEDOR" GET "/reservas/$RESERVA"
espera_status 404 "no puede ver reservas de otro cliente"

seccion "Cancelación"
pedir "$PERDEDOR" POST "/reservas/$RESERVA/cancelar" '{}'
espera_status 404 "no puede cancelar reservas ajenas"
pedir "$GANADOR" POST "/reservas/$RESERVA/cancelar" '{"motivo":"No juntamos equipo"}'
espera_status 200 "cancela su reserva (faltan más de las horas mínimas)"
[ "$(json 'r.data.estado')" = "cancelada" ] && ok "queda cancelada" || falla "estado cancelada"
pedir "$GANADOR" POST "/reservas/$RESERVA/cancelar" '{}'
espera_status 409 "no se puede cancelar dos veces"
pedir "$PERDEDOR" POST /reservas "$DATOS"
espera_status 201 "el horario cancelado se libera y se puede volver a reservar"

resumen
