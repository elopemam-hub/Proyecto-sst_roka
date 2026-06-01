@echo off
title SST ROKA - Iniciando sistema...
echo ================================================
echo   SST ROKA - Sistema de Seguridad y Salud
echo ================================================
echo.
echo Iniciando Backend (API)  en http://localhost:8000
echo Iniciando Frontend (App) en http://localhost:3000
echo.
echo Los servidores se reinician automaticamente si se caen.
echo NO cierres estas ventanas mientras uses el sistema.
echo.

start "SST ROKA - Backend API" powershell -NoExit -ExecutionPolicy Bypass -File "c:\xampp\htdocs\sst_roka\iniciar_backend_loop.ps1"
timeout /t 4 /nobreak >nul
start "SST ROKA - Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "c:\xampp\htdocs\sst_roka\iniciar_frontend_loop.ps1"
timeout /t 6 /nobreak >nul

echo Abriendo el sistema en el navegador...
start http://localhost:3000
