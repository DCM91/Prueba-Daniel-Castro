#!/bin/bash

set -e

if [ "$IS_LARAVEL" = "true" ]; then
  if [ "$RAILPACK_SKIP_MIGRATIONS" != "true" ]; then
    echo "Running migrations and seeding database ..."
    php artisan migrate --force --seed
  fi

  php artisan storage:link
  php artisan optimize:clear
  php artisan optimize

  # ─── Reverb (WebSockets) ──────────────────────────────────────────
  # Solo se arranca si BROADCAST_CONNECTION=reverb (prod).
  # En dev se usa el driver "log" (las broadcasts se escriben a storage/logs).
  # En Railway con un solo proceso, Reverb corre en background; para
  # producción real lo ideal es un servicio separado en Railway.
  if [ "$BROADCAST_CONNECTION" = "reverb" ]; then
    echo "Starting Reverb WebSocket server on port ${REVERB_SERVER_PORT:-8080} ..."
    php artisan reverb:start --host=0.0.0.0 --port=${REVERB_SERVER_PORT:-8080} &
  fi

  echo "Starting Laravel server ..."
fi

docker-php-entrypoint --config /Caddyfile --adapter caddyfile 2>&1
