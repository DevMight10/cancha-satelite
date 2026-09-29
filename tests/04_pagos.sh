#!/usr/bin/env bash
# Pruebas: envío de comprobantes y, con el administrador, aprobación y rechazo.
source "$(dirname "$0")/lib.sh"

PHP="${PHP:-/c/laragon/bin/php/php-8.3.26-Win32-vs16-x64/php.exe}"
ENV_FILE="$(dirname "$0")/../backend/.env"
ADMIN_EMAIL=$(grep 'ADMIN_DEV_EMAIL=' "$ENV_FILE" | cut -d= -f2)
ADMIN_PASS=$(grep 'ADMIN_DEV_PASSWORD=' "$ENV_FILE" | cut -d= -f2)

# Archivos de prueba: una imagen real y un texto disfrazado de imagen
IMG="$TMP_DIR/comprobante.png"
"$PHP" -r "\$i=imagecreatetruecolor(40,40); imagepng(\$i, '$IMG');"
echo "esto no es una imagen" > "$TMP_DIR/falso.png"

reservar_turno() { # reservar_turno <cookies> -> deja RESERVA
  for i in $(seq 2 14); do
    local fecha; fecha=$(node -e "const d=new Date(); d.setDate(d.getDate()+$i); console.log(d.toISOString().slice(0,10))")
    pedir "$1" GET "/disponibilidad?fecha=$fecha"
    local h; h=$(json "(r.data.turnos.find(t=>t.estado==='libre')||{}).hora_inicio||''")
    if [ -n "$h" ]; then pedir "$1" POST /reservas "{\"fecha\":\"$fecha\",\"hora_inicio\":\"${h:0:5}\"}"; RESERVA=$(json 'r.data.id'); return; fi
  done
}

pedir cli POST /auth/registro "{\"nombre\":\"Pagador Prueba\",\"email\":\"pago$SUFIJO@prueba.test\",\"telefono\":\"71112222\",\"password\":\"clave-segura-1\"}"
pedir otro POST /auth/registro "{\"nombre\":\"Otro Cliente\",\"email\":\"otro$SUFIJO@prueba.test\",\"telefono\":\"71113333\",\"password\":\"clave-segura-1\"}"
pedir adm POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
reservar_turno cli

seccion "Envío del comprobante"
subir cli "/reservas/$RESERVA/pagos" "metodo=qr"
espera_status 422 "exige adjuntar el comprobante"
subir cli "/reservas/$RESERVA/pagos" "metodo=bitcoin" "comprobante=@$IMG"
espera_status 422 "rechaza un medio de pago inválido"
subir cli "/reservas/$RESERVA/pagos" "metodo=qr" "comprobante=@$TMP_DIR/falso.png;type=image/png"
espera_status 422 "rechaza archivos que no son imagen aunque digan .png"
subir otro "/reservas/$RESERVA/pagos" "metodo=qr" "comprobante=@$IMG"
espera_status 404 "no se puede pagar la reserva de otro cliente"

subir cli "/reservas/$RESERVA/pagos" "metodo=tigo_money" "referencia=TX-123" "comprobante=@$IMG"
espera_status 201 "acepta el comprobante"
[ "$(json 'r.data.estado')" = "en_revision" ] && ok "la reserva pasa a 'en revisión'" || falla "estado en_revision"
[ "$(json 'r.data.expira_en')" = "null" ] && ok "mientras se revisa, la reserva ya no vence" || falla "sin vencimiento"
subir cli "/reservas/$RESERVA/pagos" "metodo=qr" "comprobante=@$IMG"
espera_status 409 "no permite enviar otro comprobante mientras se revisa"

pedir cli GET "/reservas/$RESERVA"
PAGO=$(json 'r.data.pagos[0].id')
[[ "$BODY" != *'"comprobante":'* ]] && ok "no expone el nombre interno del archivo" || falla "oculta nombre del archivo"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$TMP_DIR/cli" "$BASE/pagos/$PAGO/comprobante"); espera_status 200 "el cliente puede ver su comprobante"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$TMP_DIR/otro" "$BASE/pagos/$PAGO/comprobante"); espera_status 404 "otro cliente no puede ver ese comprobante"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$TMP_DIR/adm" "$BASE/pagos/$PAGO/comprobante"); espera_status 200 "el administrador sí puede verlo"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://cancha-satelite.test/backend/storage/uploads/comprobantes/"); espera_status 403 "la carpeta de comprobantes no es accesible desde el navegador"

if pedir adm GET /admin/pagos?estado=pendiente && [ "$STATUS" = "200" ]; then
  seccion "Revisión por el administrador"
  pedir cli POST "/admin/pagos/$PAGO/aprobar" '{}'
  espera_status 403 "un cliente no puede aprobar pagos"
  pedir adm POST "/admin/pagos/$PAGO/rechazar" '{"motivo":""}'
  espera_status 422 "rechazar exige un motivo"
  pedir adm POST "/admin/pagos/$PAGO/rechazar" '{"motivo":"El monto no coincide"}'
  espera_status 200 "rechaza el pago con motivo"
  [ "$(json 'r.data.estado')" = "pendiente_pago" ] && ok "la reserva vuelve a 'pendiente de pago'" || falla "vuelve a pendiente"
  [ "$(json 'r.data.expira_en !== null')" = "true" ] && ok "y recibe un plazo nuevo para pagar" || falla "plazo nuevo"

  subir cli "/reservas/$RESERVA/pagos" "metodo=transferencia" "comprobante=@$IMG"
  espera_status 201 "el cliente envía un comprobante nuevo"
  pedir cli GET "/reservas/$RESERVA"; PAGO2=$(json 'r.data.pagos[0].id')
  pedir adm POST "/admin/pagos/$PAGO2/aprobar" '{}'
  espera_status 200 "el administrador aprueba el pago"
  [ "$(json 'r.data.estado')" = "confirmada" ] && ok "la reserva queda confirmada" || falla "confirmada"
  pedir adm POST "/admin/pagos/$PAGO2/aprobar" '{}'
  espera_status 409 "un pago ya revisado no se puede revisar otra vez"
fi

resumen
