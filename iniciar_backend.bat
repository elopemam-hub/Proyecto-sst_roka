@echo off
title SST ROKA - Backend API
echo Iniciando SST ROKA Backend en http://localhost:8000 ...
cd /d c:\xampp\htdocs\sst_roka\laravel-app
c:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000
pause
