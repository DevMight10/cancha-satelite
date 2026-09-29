#!/usr/bin/env bash
# Pruebas: avisos por correo (usa Mailpit de Laragon: http://localhost:8025).
source "$(dirname "$0")/lib.sh"

MAILPIT="${MAILPIT:-http://localhost:8025}"
PHP="${PHP:-/c/laragon/bin/php/php-8.3.26-Win32-vs16-x64/php.exe}"
ENV_FILE="$(dirname "$0")/../backend/.env"
ADMIN_EMAIL=$(grep 'ADMIN_DEV_EMAIL=' "$ENV_FILE" | cut -d= -f2)
ADMIN_PASS=$(grep 'ADMIN_DEV_PASSWORD=' "$ENV_FILE" | cut -d= -f2)

if ! curl -s -o /dev/null "$MAILPIT/api/v1/info"; then
  echo "Mailpit no está disponible en $MAILPIT (inicia Laragon)."; exit 1
fi

# correo_llego <destinatario> <texto del asunto>
correo_llego() {
  sleep 0.5
  curl -s "$MAILPIT/api/v1/search?query=$(node -e "console.log(encodeURIComponent('to:\"$1\"'))")" \
    | node -e "const m=JSON.parse(require('fs').readFileSync(0)).messages||[]; process.exit(m.some(x=>x.Subject.includes(process.argv[1]))?0:1)" "$2"
}

EMAIL="avisos$SUFIJO@prueba.test"
IMG="$TMP_DIR/comprobante.png"
"$PHP" -r "\$i=imagecreatetruecolor(40,40); imagepng(\$i, '$IMG');"

pedir cli POST /auth/registro "{\"nombre\":\"Cliente Avisos\",\"email\":\"$EMAIL\",\"telefono\":\"72223333\",\"password\":\"clave-segura-1\"}"
pedir adm POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"

for i in $(seq 3 14); do
  FECHA=$(node -e "const d=new Date(); d.setDate(d.getDate()+$i); console.log(d.toISOString().slice(0,10))")
  pedir cli GET "/disponibilidad?fecha=$FECHA"
  set -- $(json "r.data.turnos.filter(t=>t.estado==='libre').map(t=>t.hora_inicio.slice(0,5)).join(' ')")
  [ $# -ge 2 ] && break
done

seccion "Correos al cliente y a la administración"
pedir cli POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$1\"}"; R1=$(json 'r.data.id')
correo_llego "$EMAIL" "Reserva #$R1 recibida" && ok "al reservar, el cliente recibe las instrucciones de pago" || falla "correo de reserva creada"

subir cli "/reservas/$R1/pagos" "metodo=qr" "comprobante=@$IMG"
correo_llego "$ADMIN_EMAIL" "Reserva #$R1" && ok "al enviar el comprobante, la administración recibe el aviso" || falla "correo al admin"

pedir cli GET "/reservas/$R1"; PAGO=$(json 'r.data.pagos[0].id')
pedir adm POST "/admin/pagos/$PAGO/rechazar" '{"motivo":"La imagen no se lee"}'
if [ "$STATUS" = "200" ]; then
  correo_llego "$EMAIL" "Revisa el pago de tu reserva #$R1" && ok "si se rechaza el pago, el cliente recibe el motivo" || falla "correo de rechazo"
  subir cli "/reservas/$R1/pagos" "metodo=qr" "comprobante=@$IMG"
  pedir cli GET "/reservas/$R1"; PAGO=$(json 'r.data.pagos[0].id')
  pedir adm POST "/admin/pagos/$PAGO/aprobar" '{}'
  correo_llego "$EMAIL" "¡Reserva #$R1 confirmada!" && ok "al aprobar el pago, el cliente recibe la confirmación" || falla "correo de confirmación"
fi

pedir cli POST /reservas "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"$2\"}"; R2=$(json 'r.data.id')
pedir cli POST "/reservas/$R2/cancelar" '{"motivo":"Llueve"}'
correo_llego "$EMAIL" "Reserva #$R2 cancelada" && ok "al cancelar, el cliente recibe el aviso" || falla "correo de cancelación"

seccion "Registro de envíos"
N=$(/c/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe -uroot cancha_satelite -N -e "SELECT COUNT(*) FROM notificaciones WHERE reserva_id IN ($R1,$R2) AND estado='enviada'")
[ "$N" -ge 3 ] && ok "cada envío queda registrado en la tabla notificaciones ($N)" || { BODY="$N"; falla "registro de notificaciones"; }

resumen
