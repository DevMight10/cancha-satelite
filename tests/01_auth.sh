#!/usr/bin/env bash
# Pruebas: registro, inicio de sesión, sesión, perfil y cierre de sesión.
source "$(dirname "$0")/lib.sh"

EMAIL="jugador$SUFIJO@prueba.test"

seccion "Registro"
pedir c POST /auth/registro '{"nombre":"","email":"malo","telefono":"123","password":"corta"}'
espera_status 422 "rechaza datos inválidos"
espera_contiene '"telefono"' "indica el error del celular"

pedir c POST /auth/registro "{\"nombre\":\"Jugador Prueba\",\"email\":\"$EMAIL\",\"telefono\":\"+591 7123 4567\",\"password\":\"clave-segura-1\"}"
espera_status 201 "crea la cuenta"
[ "$(json 'r.data.telefono')" = "71234567" ] && ok "normaliza el celular a 8 dígitos" || falla "normaliza el celular"
[ "$(json 'r.data.rol')" = "cliente" ] && ok "la cuenta nueva es de cliente" || falla "rol cliente"
[[ "$BODY" != *password* ]] && ok "no devuelve la contraseña" || falla "no devuelve la contraseña"

pedir c GET /auth/me
[ "$(json 'r.data.email')" = "$EMAIL" ] && ok "queda con la sesión iniciada" || falla "sesión tras registro"

pedir otro POST /auth/registro "{\"nombre\":\"Otro\",\"email\":\"$EMAIL\",\"telefono\":\"71234567\",\"password\":\"clave-segura-1\"}"
espera_status 422 "no permite correos repetidos"

seccion "Cierre e inicio de sesión"
pedir c POST /auth/logout
espera_status 204 "cierra la sesión"
pedir c GET /auth/me
[ "$(json 'r.data')" = "null" ] && ok "sin sesión, /auth/me devuelve null" || falla "me sin sesión"

pedir c POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"incorrecta\"}"
espera_status 401 "rechaza contraseña incorrecta"
pedir c POST /auth/login "{\"email\":\"$(echo "$EMAIL" | tr a-z A-Z)\",\"password\":\"clave-segura-1\"}"
espera_status 200 "inicia sesión (correo sin importar mayúsculas)"

seccion "Perfil y permisos"
pedir c PUT /auth/perfil '{"nombre":"Jugador Editado","telefono":"61234567"}'
espera_status 200 "actualiza el perfil"
[ "$(json 'r.data.nombre')" = "Jugador Editado" ] && ok "guarda el nombre nuevo" || falla "nombre nuevo"

pedir anonimo PUT /auth/perfil '{"nombre":"X","telefono":"61234567"}'
espera_status 401 "el perfil exige sesión"

STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: http://sitio-malicioso.test' -H 'Content-Type: application/json' --data '{}' "$BASE/auth/login")
espera_status 403 "bloquea peticiones desde otro sitio (CSRF)"

resumen
