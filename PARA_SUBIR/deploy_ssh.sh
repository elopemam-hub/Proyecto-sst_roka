#!/bin/bash
# ============================================================
# SST ROKA — Script de deploy en Hostinger (2026-07-03)
# Ejecutar en servidor: bash deploy_ssh.sh
# ============================================================

set -e
BACKEND=~/sst_roka_backend

echo "=== [1/4] Actualizando dependencias Composer ==="
cd $BACKEND
composer install --no-dev --optimize-autoloader --quiet

echo "=== [2/4] Limpiando cachés ==="
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "=== [3/4] Generando cachés optimizadas ==="
php artisan config:cache
php artisan route:cache

echo "=== [4/4] Verificando storage link ==="
if [ ! -L public/storage ]; then
  php artisan storage:link
  echo "  Storage link creado"
else
  echo "  Storage link ya existe"
fi

echo ""
echo "✅ Deploy completado exitosamente"
echo "   URL: https://sst.roka50safety.online"
