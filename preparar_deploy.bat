@echo off
echo ============================================================
echo   SST ROKA - Preparar archivos para Hostinger
echo ============================================================
echo.

REM 1. Build del frontend
echo [1/3] Compilando frontend...
cd /d "c:\xampp\htdocs\sst_roka\frontend"
call npm run build
if errorlevel 1 (
    echo ERROR: npm run build fallo
    pause
    exit /b 1
)
echo     OK - Frontend compilado

REM 2. Sync backend laravel-app -> PARA_SUBIR/sst_roka_backend
echo.
echo [2/3] Sincronizando backend...
robocopy "c:\xampp\htdocs\sst_roka\laravel-app" ^
         "c:\xampp\htdocs\sst_roka\PARA_SUBIR\sst_roka_backend" ^
         /MIR /E ^
         /XD vendor ^
             "c:\xampp\htdocs\sst_roka\laravel-app\public" ^
             "c:\xampp\htdocs\sst_roka\laravel-app\storage\logs" ^
             "c:\xampp\htdocs\sst_roka\laravel-app\storage\framework\cache" ^
             "c:\xampp\htdocs\sst_roka\laravel-app\storage\framework\sessions" ^
             "c:\xampp\htdocs\sst_roka\laravel-app\storage\framework\views" ^
             "c:\xampp\htdocs\sst_roka\laravel-app\docker" ^
             node_modules ^
         /XF .env "*.log" tmp_test.php ^
             "check_*.php" "sincronizar*.php" ^
             "*.bat" "*.ps1" "*.vbs" ^
             Dockerfile docker-compose.yml ^
         /NP /NFL /NDL
if errorlevel 8 (
    echo ERROR: Robocopy fallo en backend
    pause
    exit /b 1
)
echo     OK - Backend sincronizado

REM 3. Sync frontend dist -> PARA_SUBIR/public_html
echo.
echo [3/3] Copiando frontend a public_html...
robocopy "c:\xampp\htdocs\sst_roka\frontend\dist\assets" ^
         "c:\xampp\htdocs\sst_roka\PARA_SUBIR\public_html\assets" ^
         /MIR /NP /NFL /NDL

copy /Y "c:\xampp\htdocs\sst_roka\frontend\dist\index.html"           "c:\xampp\htdocs\sst_roka\PARA_SUBIR\public_html\index.html"
copy /Y "c:\xampp\htdocs\sst_roka\frontend\dist\sw.js"                "c:\xampp\htdocs\sst_roka\PARA_SUBIR\public_html\sw.js"
copy /Y "c:\xampp\htdocs\sst_roka\frontend\dist\manifest.webmanifest" "c:\xampp\htdocs\sst_roka\PARA_SUBIR\public_html\manifest.webmanifest"
echo     OK - Frontend copiado

echo.
echo ============================================================
echo   LISTO - PARA_SUBIR actualizado
echo ============================================================
echo.
echo Siguiente paso en Hostinger SSH:
echo   cd /home/u248634042/domains/roka50safety.online/sst_roka_backend
echo   composer dump-autoload -o ^&^& php artisan migrate --force ^&^& php artisan config:cache ^&^& php artisan route:cache
echo.
pause
