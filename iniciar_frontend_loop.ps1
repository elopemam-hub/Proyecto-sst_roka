$ErrorActionPreference = 'Continue'
$dir = "c:\xampp\htdocs\sst_roka\frontend"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  SST ROKA - Frontend (auto-restart)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Puerto: http://localhost:3000" -ForegroundColor Green
Write-Host "Reinicia automaticamente si se cae." -ForegroundColor Yellow
Write-Host ""

Set-Location $dir

while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Iniciando servidor frontend..." -ForegroundColor Green
    npm run dev
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Servidor caido. Reiniciando en 3 segundos..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
