#!/usr/bin/env bash
# Pruebas: gestión de reservas por la administración (presenciales, efectivo, cancelación, listado).
source "$(dirname "$0")/lib.sh"

ENV_FILE="$(dirname "$0")/../backend/.env"
ADMIN_EMAIL=$(grep 'ADMIN_DEV_EMAIL=' "$ENV_FILE" | cut -d= -f2)
ADMIN_PASS=$(grep 'ADMIN_DEV_PASSWORD=' "$ENV_FILE" | cut -d= -f2)

pedir adm POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
pedir cli POST /auth/registro "{\"nombre\":\"Cliente Web $SUFIJO\",\"email\":\"web$SUFIJO@prueba.test\",\"telefono\":\"73334444\",\"password\":\"clave-segura-1\"}"

for i in $(seq 4 14); do
  FECHA=$(node -e "const d=new Date(); d.setDate(d.getDate()+$i); console.log(d.toISOString().slice(0,10))")
  pedir adm GET "/disponibilidad?fecha=$FECHA"
  set -- $(json "r.data.turnos.filter(t=>t.estado==='libre').map(t=>t.hora_inicio.slice(0,5)).join(' ')")
  [ $# -ge 3 ] && break
done
H1=$1; H2=$2; H3=$3
NOMBRE="Presencial $SUFIJO"

seccion "Permisos"
pedir cli GET /admin/reservas
espera_status 403 "un cliente no puede ver el listado de la administración"
pedir anonimo GET /admin/reservas
espera_status 401 "sin sesión tampoco"

seccion "Reserva presencial"
pedir adm POST /admin/reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\",\"cliente_nombre\":\"$NOMBRE\",\"cliente_telefono\":\"123\"}"
espera_status 422 "valida el celular del cliente"
pedir adm POST /admin/reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\",\"cliente_nombre\":\"$NOMBRE\",\"cliente_telefono\":\"74445555\",\"pagado\":true}"
espera_status 201 "registra una reserva presencial pagada en efectivo"
[ "$(json 'r.data.estado')" = "confirmada" ] && ok "queda confirmada" || falla "confirmada"
[ "$(json 'r.data.origen')" = "presencial" ] && ok "queda marcada como presencial" || falla "origen presencial"

pedir adm POST /admin/reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H2\",\"cliente_nombre\":\"$NOMBRE B\",\"cliente_telefono\":\"74445556\",\"pagado\":false}"
espera_status 201 "registra una presencial sin pagar"
R2=$(json 'r.data.id')
[ "$(json 'r.data.estado')" = "pendiente_pago" ] && [ "$(json 'r.data.expira_en')" = "null" ] && ok "queda pendiente y sin vencimiento (se cobra en la cancha)" || falla "pendiente sin vencimiento"

pedir cli POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\"}"
espera_status 409 "un cliente web no puede reservar el turno tomado en la cancha"
pedir adm POST /admin/reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H1\",\"cliente_nombre\":\"Otro\",\"cliente_telefono\":\"74445557\"}"
espera_status 409 "ni la administración puede duplicar un turno"

seccion "Cobro en efectivo"
pedir adm POST "/admin/reservas/$R2/cobrar-efectivo"
espera_status 200 "registra el cobro en efectivo"
[ "$(json 'r.data.estado')" = "confirmada" ] && ok "la reserva queda confirmada" || falla "confirmada tras cobro"
pedir adm POST "/admin/reservas/$R2/cobrar-efectivo"
espera_status 409 "no se puede cobrar dos veces"

seccion "Cancelación por la administración"
pedir cli POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H3\"}"; R3=$(json 'r.data.id')
pedir adm POST "/admin/reservas/$R3/cancelar" '{"motivo":""}'
espera_status 422 "exige un motivo"
pedir adm POST "/admin/reservas/$R3/cancelar" '{"motivo":"Mantenimiento de la cancha"}'
espera_status 200 "cancela la reserva de un cliente"
pedir cli GET "/reservas/$R3"
[ "$(json 'r.data.cancelada_por')" = "admin" ] && [ "$(json 'r.data.motivo_cancelacion')" = "Mantenimiento de la cancha" ] && ok "el cliente ve que la canceló la cancha y el motivo" || falla "cancelada_por admin"
pedir cli POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$H3\"}"
espera_status 201 "el turno cancelado queda libre otra vez"

seccion "Listado y filtros"
pedir adm GET "/admin/reservas?desde=$FECHA&hasta=$FECHA"
[ "$(json 'r.data.every(x => x.fecha === "'"$FECHA"'")')" = "true" ] && ok "filtra por rango de fechas" || falla "filtro de fechas"
pedir adm GET "/admin/reservas?buscar=$(node -e "console.log(encodeURIComponent('$NOMBRE'))")"
[ "$(json 'r.data.length')" = "2" ] && ok "busca por nombre del cliente" || falla "búsqueda por nombre"
pedir adm GET "/admin/reservas?desde=$FECHA&hasta=$FECHA&estado=cancelada"
[ "$(json 'r.data.length >= 1 && r.data.every(x => x.estado === "cancelada")')" = "true" ] && ok "filtra por estado" || falla "filtro de estado"
[ "$(json 'r.data[0].pago_estado === null || typeof r.data[0].pago_estado === "string"')" = "true" ] && ok "incluye el estado del último pago" || falla "estado de pago"
pedir adm GET "/admin/reservas?estado=otro"
espera_status 422 "rechaza estados inválidos"

resumen
