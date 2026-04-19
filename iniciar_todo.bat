@echo off
title SST ROKA - Iniciando sistema...
echo ================================================
echo   SST ROKA - Sistema de Seguridad y Salud
echo ================================================
echo.
echo Iniciando Backend (API)  en http://localhost:8000
echo Iniciando Frontend (App) en http://localhost:3000
echo.
echo NO cierres estas ventanas mientras uses el sistema.
echo.

start "SST ROKA - Backend API" cmd /k "cd /d c:\xampp\htdocs\sst_roka\laravel-app && c:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000"
timeout /t 3 /nobreak >nul
start "SST ROKA - Frontend" cmd /k "cd /d c:\xampp\htdocs\sst_roka\frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo Abriendo el sistema en el navegador...
start http://localhost:3000
