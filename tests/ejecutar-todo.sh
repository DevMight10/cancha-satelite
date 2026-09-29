#!/usr/bin/env bash
# Ejecuta todas las pruebas: API (bash + curl) e interfaz (Chrome headless).
# Uso: bash tests/ejecutar-todo.sh          (todo)
#      bash tests/ejecutar-todo.sh api      (solo API)
#      bash tests/ejecutar-todo.sh ui       (solo interfaz)
# Requisitos: Laragon iniciado (Apache, MySQL y Mailpit), Node 22+ y Chrome o Edge.

cd "$(dirname "$0")/.." || exit 1
QUE="${1:-todo}"
FALLARON=()

correr() { # correr <nombre> <comando...>
  printf '\n\033[1;36m━━ %s\033[0m\n' "$1"
  shift
  "$@" || FALLARON+=("$1 $2")
}

if [ "$QUE" != "ui" ]; then
  for f in tests/0*.sh; do correr "$f" bash "$f"; done
fi
if [ "$QUE" != "api" ]; then
  for f in tests/ui/0*.mjs; do correr "$f" node "$f"; done
fi

echo
if [ ${#FALLARON[@]} -eq 0 ]; then
  printf '\033[1;32m✔ Todas las pruebas pasaron\033[0m\n'
else
  printf '\033[1;31m✘ Fallaron: %s\033[0m\n' "${FALLARON[*]}"
  exit 1
fi
