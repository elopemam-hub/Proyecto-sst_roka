#!/bin/bash
# ================================================================
# SST ROKA — Instalación INICIAL en Hostinger (solo una vez)
# Ejecutar via SSH:
#   bash setup_inicial.sh "https://github.com/TUUSUARIO/sst-roka.git"
# ================================================================

GITHUB_URL="${1:-https://github.com/TUUSUARIO/sst-roka.git}"
REPO_DIR="$HOME/sst_roka_repo"
BACKEND_DIR="$HOME/sst_roka_backend"
PUBLIC_HTML="$HOME/domains/sst.roka50safety.online/public_html"
PHP="php8.2"

echo "============================================"
echo "  SST ROKA — Setup Inicial"
echo "  Repo: $GITHUB_URL"
echo "============================================"

# ── 1. Clonar repositorio ────────────────────────────────────
echo ""
echo "[1/7] Clonando repositorio..."
if [ -d "$REPO_DIR" ]; then
    echo "  El repo ya existe, actualizando..."
    cd "$REPO_DIR" && git pull origin main
else
    git clone "$GITHUB_URL" "$REPO_DIR"
fi
echo "  OK"

# ── 2. Crear estructura de carpetas ─────────────────────────
echo ""
echo "[2/7] Creando estructura de carpetas..."
mkdir -p "$BACKEND_DIR"
mkdir -p "$PUBLIC_HTML/api"
mkdir -p "$BACKEND_DIR/storage/logs"
mkdir -p "$BACKEND_DIR/storage/framework/cache/data"
mkdir -p "$BACKEND_DIR/storage/framework/sessions"
mkdir -p "$BACKEND_DIR/storage/framework/views"
mkdir -p "$BACKEND_DIR/storage/app/public/hds"
mkdir -p "$BACKEND_DIR/bootstrap/cache"
echo "  OK"

# ── 3. Sincronizar backend ───────────────────────────────────
echo ""
echo "[3/7] Copiando archivos Laravel..."
rsync -av --delete \
  --exclude=".env" \
  --exclude="vendor/" \
  "$REPO_DIR/laravel-app/" "$BACKEND_DIR/"
echo "  OK"

# ── 4. Instalar Composer ─────────────────────────────────────
echo ""
echo "[4/7] Instalando dependencias PHP con Composer..."
cd "$BACKEND_DIR"
$PHP $(which composer) install --no-dev --optimize-autoloader --no-interaction
echo "  OK"

# ── 5. Crear .env ────────────────────────────────────────────
echo ""
echo "[5/7] Configurando .env..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cat > "$BACKEND_DIR/.env" << 'EOF'
APP_NAME="SST ROKA"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://TU_SUBDOMINIO.TUDOMINIO.COM
APP_TIMEZONE=America/Lima

LOG_CHANNEL=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=TU_NOMBRE_BD
DB_USERNAME=TU_USUARIO_BD
DB_PASSWORD=TU_PASSWORD_BD

SESSION_DRIVER=file
SESSION_LIFETIME=480
CACHE_STORE=file
QUEUE_CONNECTION=sync

SANCTUM_STATEFUL_DOMAINS=TU_SUBDOMINIO.TUDOMINIO.COM
FRONTEND_URL=https://TU_SUBDOMINIO.TUDOMINIO.COM

FILESYSTEM_DISK=public
EOF
    echo "  .env creado"
    # Generar APP_KEY
    $PHP artisan key:generate
else
    echo "  .env ya existe, omitiendo"
fi

# ── 6. Artisan ───────────────────────────────────────────────
echo ""
echo "[6/7] Ejecutando Artisan..."
cd "$BACKEND_DIR"
$PHP artisan migrate --force
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan storage:link 2>/dev/null || true
chmod -R 775 storage bootstrap/cache
echo "  OK"

# ── 7. Copiar frontend y config ──────────────────────────────
echo ""
echo "[7/7] Copiando frontend y configuración..."
rsync -av --delete \
  --exclude="api/" \
  "$REPO_DIR/frontend/dist/" "$PUBLIC_HTML/"
cp "$REPO_DIR/deploy/hostinger/api_index.php"        "$PUBLIC_HTML/api/index.php"
cp "$REPO_DIR/deploy/hostinger/htaccess_api"         "$PUBLIC_HTML/api/.htaccess"
cp "$REPO_DIR/deploy/hostinger/htaccess_public_html" "$PUBLIC_HTML/.htaccess"
echo "  OK"

echo ""
echo "============================================"
echo "  SETUP COMPLETADO"
echo "  Abre: https://sst.roka50safety.online"
echo "============================================"
echo ""
echo "Para actualizaciones futuras ejecuta:"
echo "  bash $REPO_DIR/deploy/hostinger/deploy.sh"
echo ""
