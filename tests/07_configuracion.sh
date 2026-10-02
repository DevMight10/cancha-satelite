#!/usr/bin/env bash
# Pruebas: configuración de la cancha (reglas, horarios, tarifas, días bloqueados y QR).
# Al terminar, deja la configuración como estaba.
source "$(dirname "$0")/lib.sh"

PHP="${PHP:-/c/laragon/bin/php/php-8.3.26-Win32-vs16-x64/php.exe}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$RAIZ/backend/.env"
ADMIN_EMAIL=$(grep 'ADMIN_DEV_EMAIL=' "$ENV_FILE" | cut -d= -f2)
ADMIN_PASS=$(grep 'ADMIN_DEV_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
pedir adm POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
pedir cli POST /auth/registro "{\"nombre\":\"Curioso Config $SUFIJO\",\"email\":\"cfg$SUFIJO@prueba.test\",\"telefono\":\"73335555\",\"password\":\"clave-segura-1\"}"

proximo() { # proximo <día ISO 1-7> -> fecha del próximo día de la semana (desde pasado mañana)
  node -e "const d=new Date(); d.setDate(d.getDate()+2); while(((d.getDay()+6)%7)+1!==$1) d.setDate(d.getDate()+1); console.log(d.toISOString().slice(0,10))"
}

pedir adm GET /admin/configuracion
ORIGINAL_HORARIOS=$(json 'r.data.horarios'); DURACION=$(json 'r.data.duracion_turno')
ANTICIPACION=$(json 'r.data.valores.reserva_dias_anticipacion')
QR_ACTUAL=$(json 'r.data.tiene_qr')
QR_ARCHIVO=$(/c/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe -uroot cancha_satelite -N -e "SELECT valor FROM configuracion WHERE clave='pago_qr_imagen'")
[ -n "$QR_ARCHIVO" ] && cp "$RAIZ/backend/storage/uploads/config/$QR_ARCHIVO" "$TMP_DIR/qr-original.png"

seccion "Permisos"
pedir cli GET /admin/configuracion
espera_status 403 "un cliente no puede ver la configuración"

seccion "Datos y reglas"
pedir adm PUT /admin/configuracion '{"negocio_whatsapp":"123","reserva_minutos_pago":"2"}'
espera_status 422 "valida el WhatsApp y los minutos para pagar"
pedir adm PUT /admin/configuracion '{"reserva_dias_anticipacion":"20","negocio_whatsapp":"+591 7000 0001"}'
espera_status 200 "guarda las reglas"
[ "$(json 'r.data.valores.negocio_whatsapp')" = "70000001" ] && ok "normaliza el WhatsApp" || falla "normaliza WhatsApp"
pedir anonimo GET /disponibilidad/dias
[ "$(json 'r.data.length')" = "21" ] && ok "la nueva anticipación se aplica al calendario (20 días + hoy)" || falla "anticipación aplicada"
pedir adm PUT /admin/configuracion "{\"reserva_dias_anticipacion\":\"$ANTICIPACION\"}"

seccion "Horario de apertura"
LUNES=$(proximo 1)
CERRADO_LUNES=$(node -e "const h=$ORIGINAL_HORARIOS; h.find(x=>x.dia_semana===1).cerrado=true; console.log(JSON.stringify({horarios:h,duracion_turno:$DURACION}))")
pedir adm PUT /admin/horarios "$CERRADO_LUNES"
espera_status 200 "guarda el horario (lunes cerrado)"
pedir anonimo GET "/disponibilidad?fecha=$LUNES"
[ "$(json 'r.data.abierto')" = "false" ] && ok "el lunes aparece cerrado en el calendario" || falla "lunes cerrado"
MALO=$(node -e "const h=$ORIGINAL_HORARIOS; h[0].hora_apertura='20:00'; h[0].hora_cierre='20:30'; h[0].cerrado=false; console.log(JSON.stringify({horarios:h,duracion_turno:60}))")
pedir adm PUT /admin/horarios "$MALO"
espera_status 422 "rechaza un horario donde no entra ni un turno"
pedir adm PUT /admin/horarios "{\"horarios\":$ORIGINAL_HORARIOS,\"duracion_turno\":$DURACION}"
espera_status 200 "restaura el horario original"

seccion "Tarifas"
MARTES=$(proximo 2)
pedir adm POST /admin/tarifas '{"nombre":"Prueba","dias":[],"hora_desde":"10:00","hora_hasta":"12:00","precio":50}'
espera_status 422 "exige elegir días"
pedir adm POST /admin/tarifas '{"nombre":"Prueba","dias":[2],"hora_desde":"12:00","hora_hasta":"10:00","precio":50}'
espera_status 422 "exige que 'hasta' sea mayor que 'desde'"
pedir adm POST /admin/tarifas '{"nombre":"Promo prueba","dias":[2],"hora_desde":"10:00","hora_hasta":"12:00","precio":999}'
espera_status 201 "crea una tarifa"
TARIFA=$(json "r.data.tarifas.find(t=>t.nombre==='Promo prueba').id")
pedir anonimo GET "/disponibilidad?fecha=$MARTES"
[ "$(json "Number(r.data.turnos.find(t=>t.hora_inicio.startsWith('10:')).precio)")" = "999" ] && ok "el martes 10:00 cobra la tarifa más alta (Bs 999)" || falla "tarifa aplicada"
pedir adm PUT "/admin/tarifas/$TARIFA" '{"nombre":"Promo prueba","dias":[2],"hora_desde":"10:00","hora_hasta":"12:00","precio":999,"activa":false}'
pedir anonimo GET "/disponibilidad?fecha=$MARTES"
[ "$(json "Number(r.data.turnos.find(t=>t.hora_inicio.startsWith('10:')).precio)")" != "999" ] && ok "una tarifa desactivada deja de aplicarse" || falla "tarifa desactivada"
pedir adm DELETE "/admin/tarifas/$TARIFA"
espera_status 200 "elimina la tarifa"

seccion "Días bloqueados"
MIERCOLES=$(proximo 3)
pedir cli GET "/disponibilidad?fecha=$MIERCOLES"; H=$(json "(r.data.turnos.find(t=>t.estado==='libre')||{}).hora_inicio||''")
[ -n "$H" ] && pedir cli POST /reservas "{\"fecha\":\"$MIERCOLES\",\"hora_inicio\":\"${H:0:5}\"}"
pedir adm POST /admin/bloqueos "{\"fecha\":\"$MIERCOLES\",\"motivo\":\"Campeonato interno\"}"
espera_status 201 "bloquea un día"
[ "$(json 'r.data.reservas_afectadas >= 1')" = "true" ] && ok "avisa cuántas reservas activas hay ese día" || falla "reservas afectadas"
BLOQUEO=$(json "r.data.bloqueos.find(b=>b.fecha==='$MIERCOLES').id")
pedir adm POST /admin/bloqueos "{\"fecha\":\"$MIERCOLES\",\"motivo\":\"Otra vez\"}"
espera_status 409 "no permite bloquear dos veces el mismo día"
pedir anonimo GET "/disponibilidad?fecha=$MIERCOLES"
[ "$(json 'r.data.abierto')" = "false" ] && [ "$(json 'r.data.motivo')" = "Campeonato interno" ] && ok "el día aparece cerrado con su motivo" || falla "día bloqueado"
pedir cli POST /reservas "{\"fecha\":\"$MIERCOLES\",\"hora_inicio\":\"22:00\"}"
espera_status 422 "no se puede reservar en un día bloqueado"
pedir adm DELETE "/admin/bloqueos/$BLOQUEO"
espera_status 200 "desbloquea el día"

seccion "QR de pago"
echo "no es imagen" > "$TMP_DIR/qr.png"
subir adm /admin/configuracion/qr "qr=@$TMP_DIR/qr.png;type=image/png"
espera_status 422 "rechaza archivos que no son imagen"
"$PHP" -r "\$i=imagecreatetruecolor(120,120); imagepng(\$i, '$TMP_DIR/qr-nuevo.png');"
subir adm /admin/configuracion/qr "qr=@$TMP_DIR/qr-nuevo.png"
espera_status 200 "sube un QR nuevo"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/publico/qr"); espera_status 200 "el QR nuevo se sirve al público"
if [ -f "$TMP_DIR/qr-original.png" ]; then subir adm /admin/configuracion/qr "qr=@$TMP_DIR/qr-original.png"; espera_status 200 "restaura el QR original"; fi

resumen
