#!/usr/bin/env bash
# Utilidades para las pruebas de la API (bash + curl + node).
# Uso: source tests/lib.sh

BASE="${BASE:-http://cancha-satelite.test/api}"
TMP_DIR="$(mktemp -d)"
# En Windows (Git Bash) se usa la ruta C:/... para que PHP y curl encuentren los archivos
command -v cygpath >/dev/null && TMP_DIR="$(cygpath -m "$TMP_DIR")"
PASADAS=0
FALLIDAS=0
STATUS=""
BODY=""

# pedir <cookies> <METODO> <ruta> [json]  -> deja STATUS y BODY
pedir() {
  local jar="$1" metodo="$2" ruta="$3" datos="${4:-}"
  local args=(-s -o "$TMP_DIR/body" -w '%{http_code}' -X "$metodo" -b "$TMP_DIR/$jar" -c "$TMP_DIR/$jar")
  if [ -n "$datos" ]; then args+=(-H 'Content-Type: application/json' --data "$datos"); fi
  STATUS=$(curl "${args[@]}" "$BASE$ruta")
  BODY=$(cat "$TMP_DIR/body")
}

# subir <cookies> <ruta> <campo=valor>... (multipart, usa @archivo para ficheros)
subir() {
  local jar="$1" ruta="$2"; shift 2
  local args=(-s -o "$TMP_DIR/body" -w '%{http_code}' -X POST -b "$TMP_DIR/$jar" -c "$TMP_DIR/$jar")
  for campo in "$@"; do args+=(-F "$campo"); done
  STATUS=$(curl "${args[@]}" "$BASE$ruta")
  BODY=$(cat "$TMP_DIR/body")
}

# json <expresión JS sobre la respuesta r>  ej: json 'r.data.id'
json() {
  node -e "const r=JSON.parse(process.argv[1]); const v=($1); console.log(typeof v==='object'?JSON.stringify(v):v)" "$BODY"
}

ok()    { PASADAS=$((PASADAS+1)); printf '  \033[32m✔\033[0m %s\n' "$1"; }
falla() { FALLIDAS=$((FALLIDAS+1)); printf '  \033[31m✘ %s\033[0m\n    status=%s body=%s\n' "$1" "$STATUS" "${BODY:0:300}"; }

espera_status() { [ "$STATUS" = "$1" ] && ok "$2" || falla "$2 (esperaba $1)"; }
espera_contiene() { [[ "$BODY" == *"$1"* ]] && ok "$2" || falla "$2 (esperaba '$1')"; }

seccion() { printf '\n\033[1m%s\033[0m\n' "$1"; }

resumen() {
  printf '\n%s pasadas, %s fallidas\n' "$PASADAS" "$FALLIDAS"
  rm -rf "$TMP_DIR"
  [ "$FALLIDAS" -eq 0 ]
}

# Datos únicos por ejecución
SUFIJO="$(date +%s)$RANDOM"
