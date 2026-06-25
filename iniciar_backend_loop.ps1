$ErrorActionPreference = 'Continue'
$dir = "c:\xampp\htdocs\sst_roka\laravel-app"
$php = "c:\xampp\php\php.exe"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  SST ROKA - Backend API (auto-restart)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Puerto: http://localhost:8000" -ForegroundColor Green
Write-Host "Reinicia automaticamente si se cae." -ForegroundColor Yellow
Write-Host ""

while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Iniciando servidor backend..." -ForegroundColor Green
    & $php `
        -d extension_dir="c:\xampp\php\ext" `
        -d zend_extension="c:\xampp\php\ext\php_opcache.dll" `
        -d opcache.enable=1 `
        -d opcache.enable_cli=1 `
        -d opcache.memory_consumption=256 `
        -d opcache.interned_strings_buffer=16 `
        -d opcache.max_accelerated_files=20000 `
        -d opcache.revalidate_freq=0 `
        -d opcache.validate_timestamps=0 `
        "$dir\artisan" serve --host=127.0.0.1 --port=8000
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Servidor caido. Reiniciando en 3 segundos..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
