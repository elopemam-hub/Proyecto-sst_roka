#!/bin/bash
# ================================================================
# SST ROKA — Script de despliegue en Hostinger
# Ejecutar en el servidor via SSH:
#   bash ~/sst_roka_repo/deploy/hostinger/deploy.sh
# ================================================================

set -e  # Detener si hay error

# ── Configuración ────────────────────────────────────────────
REPO_DIR="$HOME/sst_roka_repo"
BACKEND_DIR="$HOME/sst_roka_backend"
PUBLIC_HTML="$HOME/domains/sst.roka50safety.online/public_html"
PHP="php8.2"           # Comando PHP en Hostinger
BRANCH="main"

echo ""
echo "============================================"
echo "  SST ROKA — Deploy $(date '+%d/%m/%Y %H:%M')"
echo "============================================"

# ── 1. Actualizar repo ───────────────────────────────────────
echo ""
echo "[1/6] Actualizando repositorio Git..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/$BRANCH
git pull origin $BRANCH
echo "  OK — Commit: $(git log --oneline -1)"

# ── 2. Sincronizar Backend → sst_roka_backend ────────────────
echo ""
echo "[2/6] Sincronizando backend Laravel..."
rsync -av --delete \
  --exclude=".env" \
  --exclude="vendor/" \
  --exclude="storage/logs/*.log" \
  --exclude="storage/framework/cache/data/*" \
  --exclude="storage/framework/sessions/*" \
  --exclude="storage/framework/views/*" \
  --exclude="bootstrap/cache/*.php" \
  "$REPO_DIR/laravel-app/" "$BACKEND_DIR/"
echo "  OK — Backend sincronizado"

# ── 3. Instalar/actualizar dependencias PHP ──────────────────
echo ""
echo "[3/6] Instalando dependencias Composer..."
cd "$BACKEND_DIR"
$PHP $(which composer) install --no-dev --optimize-autoloader --no-interaction
echo "  OK — vendor/ actualizado"

# ── 4. Artisan: migraciones y cache ─────────────────────────
echo ""
echo "[4/6] Ejecutando Artisan..."
cd "$BACKEND_DIR"
$PHP artisan migrate --force
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache
$PHP artisan storage:link 2>/dev/null || true
chmod -R 775 storage bootstrap/cache
echo "  OK — Artisan completado"

# ── 5. Sincronizar Frontend → public_html ───────────────────
echo ""
echo "[5/6] Sincronizando frontend React..."
rsync -av --delete \
  --exclude="api/" \
  "$REPO_DIR/frontend/dist/" "$PUBLIC_HTML/"

# Asegurar que api/ tenga sus archivos
mkdir -p "$PUBLIC_HTML/api"
cp "$REPO_DIR/deploy/hostinger/api_index.php"  "$PUBLIC_HTML/api/index.php"
cp "$REPO_DIR/deploy/hostinger/htaccess_api"   "$PUBLIC_HTML/api/.htaccess"
cp "$REPO_DIR/deploy/hostinger/htaccess_public_html" "$PUBLIC_HTML/.htaccess"
echo "  OK — Frontend sincronizado"

# ── 6. Verificar ────────────────────────────────────────────
echo ""
echo "[6/6] Verificando despliegue..."
if [ -f "$PUBLIC_HTML/index.html" ]; then
    echo "  OK — index.html existe"
fi
if [ -f "$PUBLIC_HTML/api/index.php" ]; then
    echo "  OK — api/index.php existe"
fi
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "  OK — .env existe en backend"
else
    echo "  ADVERTENCIA: .env NO encontrado en $BACKEND_DIR"
    echo "  Crea el .env manualmente con tus credenciales"
fi

echo ""
echo "============================================"
echo "  DEPLOY COMPLETADO"
echo "  URL: https://sst.roka50safety.online"
echo "============================================"
echo ""
