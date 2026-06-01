# ================================================================
# SST ROKA — Script de preparación para despliegue en Hostinger
# Ejecutar desde la raíz del proyecto: .\deploy\build_produccion.ps1
# ================================================================

$ROOT    = Split-Path -Parent $PSScriptRoot
$DIST    = "$ROOT\deploy\hostinger\dist_deploy"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SST ROKA — Build de Producción" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Limpiar carpeta dist_deploy anterior ──────────────────────
if (Test-Path $DIST) {
    Remove-Item $DIST -Recurse -Force
    Write-Host "  [OK] Carpeta dist_deploy limpiada." -ForegroundColor Green
}
New-Item -ItemType Directory -Path $DIST | Out-Null
New-Item -ItemType Directory -Path "$DIST\public_html" | Out-Null
New-Item -ItemType Directory -Path "$DIST\public_html\api" | Out-Null
New-Item -ItemType Directory -Path "$DIST\sst_roka_backend" | Out-Null

# ── 1. BUILD FRONTEND (React + Vite) ─────────────────────────
Write-Host "`n[1/4] Construyendo frontend React..." -ForegroundColor Yellow
Set-Location "$ROOT\frontend"

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "  Instalando dependencias npm..." -ForegroundColor Gray
    npm install --silent
}

# Build de producción
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] El build del frontend falló." -ForegroundColor Red; exit 1
}
Write-Host "  [OK] Frontend compilado en /frontend/dist" -ForegroundColor Green

# Copiar dist al directorio de deploy
Copy-Item "$ROOT\frontend\dist\*" -Destination "$DIST\public_html\" -Recurse -Force
Write-Host "  [OK] Frontend copiado a dist_deploy/public_html/" -ForegroundColor Green

# ── 2. ARCHIVOS DE CONFIGURACIÓN HOSTINGER ───────────────────
Write-Host "`n[2/4] Copiando archivos de configuración..." -ForegroundColor Yellow

# .htaccess para public_html
Copy-Item "$ROOT\deploy\hostinger\htaccess_public_html" "$DIST\public_html\.htaccess" -Force

# .htaccess para la carpeta api (Laravel)
Copy-Item "$ROOT\deploy\hostinger\htaccess_api" "$DIST\public_html\api\.htaccess" -Force

# index.php de la API
Copy-Item "$ROOT\deploy\hostinger\api_index.php" "$DIST\public_html\api\index.php" -Force

Write-Host "  [OK] Archivos .htaccess e index.php copiados." -ForegroundColor Green

# ── 3. PREPARAR BACKEND LARAVEL ───────────────────────────────
Write-Host "`n[3/4] Preparando backend Laravel..." -ForegroundColor Yellow

$BACKEND_SRC  = "$ROOT\laravel-app"
$BACKEND_DEST = "$DIST\sst_roka_backend"

# Directorios a EXCLUIR del backend
$EXCLUIR = @(
    '.git', 'node_modules', '.env', 'storage\logs\*.log',
    'storage\framework\cache\data\*',
    'storage\framework\sessions\*',
    'storage\framework\views\*',
    'bootstrap\cache\*.php'
)

# Copiar backend completo
Write-Host "  Copiando archivos Laravel (puede tomar un momento)..." -ForegroundColor Gray
$excluirRobocopy = "node_modules .git storage\logs"
robocopy $BACKEND_SRC $BACKEND_DEST /E /XD node_modules .git /XF "*.log" /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

# Limpiar caches de configuración antiguas (se regenerarán en el servidor)
$cachesALimpiar = @(
    "$BACKEND_DEST\bootstrap\cache\config.php",
    "$BACKEND_DEST\bootstrap\cache\routes.php",
    "$BACKEND_DEST\bootstrap\cache\services.php",
    "$BACKEND_DEST\bootstrap\cache\packages.php"
)
foreach ($f in $cachesALimpiar) {
    if (Test-Path $f) { Remove-Item $f -Force }
}

# Copiar .env de producción (como .env.example — el usuario deberá renombrar)
Copy-Item "$ROOT\deploy\hostinger\env_produccion" "$BACKEND_DEST\.env.produccion-EDITAR" -Force

# Crear carpetas de storage necesarias
$storageDirs = @(
    "$BACKEND_DEST\storage\logs",
    "$BACKEND_DEST\storage\framework\cache\data",
    "$BACKEND_DEST\storage\framework\sessions",
    "$BACKEND_DEST\storage\framework\views",
    "$BACKEND_DEST\storage\app\public\hds"
)
foreach ($d in $storageDirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# Crear .gitkeep en carpetas vacías
foreach ($d in $storageDirs) {
    New-Item -ItemType File -Path "$d\.gitkeep" -Force | Out-Null
}

Write-Host "  [OK] Backend Laravel preparado." -ForegroundColor Green

# ── 4. RESUMEN Y GUÍA ─────────────────────────────────────────
Write-Host "`n[4/4] Generando guía de despliegue..." -ForegroundColor Yellow

$guia = @"
========================================================================
  SST ROKA — GUÍA DE DESPLIEGUE EN HOSTINGER
  Generado: $(Get-Date -Format 'dd/MM/yyyy HH:mm')
========================================================================

ESTRUCTURA EN EL SERVIDOR HOSTINGER:
──────────────────────────────────────────────────────────────────────
  /home/TUUSUARIO/
  ├── public_html/                  ← React + API entry point
  │   ├── index.html                ← App React
  │   ├── assets/                   ← JS/CSS compilados
  │   ├── .htaccess                 ← Reglas SPA + GZIP
  │   └── api/
  │       ├── index.php             ← Punto de entrada Laravel
  │       └── .htaccess             ← Reglas API
  └── sst_roka_backend/             ← Laravel (fuera de public_html)
      ├── app/
      ├── routes/
      ├── .env                      ← Configurar con tus datos
      └── vendor/

PASOS DE DESPLIEGUE:
──────────────────────────────────────────────────────────────────────

1. SUBIR ARCHIVOS (vía FTP/FileManager Hostinger):

   a) Sube el contenido de 'dist_deploy/public_html/' a tu 'public_html/'
   b) Sube el contenido de 'dist_deploy/sst_roka_backend/' a una carpeta
      llamada 'sst_roka_backend' en la raíz del servidor (NO dentro de public_html)

2. CONFIGURAR .ENV EN EL SERVIDOR:

   a) Renombra 'sst_roka_backend/.env.produccion-EDITAR' a '.env'
   b) Edita el .env con tus datos de Hostinger:
      - APP_URL=https://TUDOMINIO.COM
      - DB_DATABASE=nombre_de_tu_bd
      - DB_USERNAME=usuario_bd
      - DB_PASSWORD=password_bd
      - SANCTUM_STATEFUL_DOMAINS=TUDOMINIO.COM

3. EDITAR api/index.php:

   Cambia la variable `laravelRoot` con la ruta absoluta en Hostinger:
   $`laravelRoot = '/home/TUUSUARIO/sst_roka_backend';`

4. PERMISOS (vía SSH o FileManager):

   chmod -R 755 sst_roka_backend/storage
   chmod -R 755 sst_roka_backend/bootstrap/cache

5. COMANDOS ARTISAN (vía SSH o Script PHP):

   cd sst_roka_backend
   php artisan key:generate          # Solo si es primera instalación
   php artisan migrate --force       # Ejecutar migraciones
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan storage:link

6. BASE DE DATOS:

   a) Crea la BD en el panel de Hostinger (MySQL)
   b) Importa el backup de tu BD local (phpMyAdmin → Exportar → SQL)
   c) Actualiza DB_DATABASE, DB_USERNAME, DB_PASSWORD en .env

7. VERIFICAR:

   ✓ https://TUDOMINIO.COM → Debe mostrar la app React
   ✓ https://TUDOMINIO.COM/api/ping → Debe responder {"status":"ok"}
   ✓ Login con tus credenciales

NOTAS IMPORTANTES:
──────────────────────────────────────────────────────────────────────
- El dominio en cors.php ya está configurado con env('APP_URL')
- Si usas SSL (HTTPS), asegúrate de que el .env tenga APP_URL con https://
- El storage/app/public/hds se usa para las HDS de sustancias peligrosas
- Ejecuta 'php artisan storage:link' para que los archivos subidos sean accesibles

========================================================================
"@

$guia | Out-File -FilePath "$DIST\GUIA_DESPLIEGUE.txt" -Encoding UTF8
Write-Host "  [OK] Guía creada: dist_deploy/GUIA_DESPLIEGUE.txt" -ForegroundColor Green

# ── RESUMEN FINAL ────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Carpeta de deploy: deploy\hostinger\dist_deploy\" -ForegroundColor White
Write-Host "  [+] public_html\       -- Subir a public_html en Hostinger" -ForegroundColor Gray
Write-Host "  [+] sst_roka_backend\  -- Subir fuera de public_html" -ForegroundColor Gray
Write-Host "  [+] GUIA_DESPLIEGUE.txt -- Leer antes de subir" -ForegroundColor Gray
Write-Host ""

Set-Location $ROOT
