# ================================================================
# SST ROKA — Deploy a Hostinger via SSH + PowerShell
# Ejecutar: .\deploy\deploy_hostinger.ps1
# ================================================================
param(
    [Parameter(Mandatory=$false)]
    [string]$Password
)

$SSH_HOST = "88.223.85.34"
$SSH_PORT = 65002
$SSH_USER = "u248634042"

Import-Module Posh-SSH -ErrorAction Stop

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  SST ROKA — Deploy a Hostinger" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

if (-not $Password) {
    $secPass = Read-Host "Contrasena SSH de Hostinger" -AsSecureString
} else {
    $secPass = ConvertTo-SecureString $Password -AsPlainText -Force
}
$cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $secPass)

function NewSession {
    Write-Host "Conectando a ${SSH_HOST}:${SSH_PORT}..." -ForegroundColor Yellow
    $s = New-SSHSession -ComputerName $SSH_HOST -Port $SSH_PORT -Credential $cred `
        -AcceptKey -ErrorAction Stop
    Write-Host "  OK — Conectado (Session $($s.SessionId))" -ForegroundColor Green
    return $s
}

function Run($cmd, $sess) {
    Write-Host "`n> $cmd" -ForegroundColor Gray
    $r = Invoke-SSHCommand -SessionId $sess.SessionId -Command $cmd -TimeOut 600
    if ($r.Output) { $r.Output | ForEach-Object { Write-Host "  $_" } }
    if ($r.Error)  { $r.Error  | ForEach-Object { Write-Host "  [ERR] $_" -ForegroundColor DarkYellow } }
    if ($r.ExitStatus -ne 0) {
        Write-Host "  [WARN] Exit code: $($r.ExitStatus)" -ForegroundColor Red
    }
    return $r
}

# ── 1. Git pull (sesion corta) ───────────────────────────────
Write-Host "`n[1/5] Actualizando repositorio..." -ForegroundColor Yellow
$s1 = NewSession
Run "cd ~/sst_roka_repo && git fetch origin && git reset --hard origin/main && git log -1 --oneline" $s1
Remove-SSHSession -SessionId $s1.SessionId | Out-Null

# ── 2. Rsync backend (sesion propia) ────────────────────────
Write-Host "`n[2/5] Sincronizando backend Laravel..." -ForegroundColor Yellow
$s2 = NewSession
$rsyncCmd = "rsync -a --delete --exclude='.env' --exclude='vendor/' --exclude='storage/logs/*.log' --exclude='storage/framework/cache/data/*' --exclude='storage/framework/sessions/*' --exclude='storage/framework/views/*' --exclude='bootstrap/cache/*.php' ~/sst_roka_repo/laravel-app/ ~/sst_roka_backend/"
Run $rsyncCmd $s2
Remove-SSHSession -SessionId $s2.SessionId | Out-Null

# ── 3. Composer + Artisan (sesion propia, timeout largo) ────
Write-Host "`n[3/5] Composer + Artisan..." -ForegroundColor Yellow
$s3 = NewSession
$composerPath = "/usr/local/bin/composer"
Run "cd ~/sst_roka_backend && php $composerPath install --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -5" $s3
Run "cd ~/sst_roka_backend && php artisan migrate --force" $s3
Run "cd ~/sst_roka_backend && php artisan config:clear && php artisan route:clear && php artisan view:clear" $s3
Run "cd ~/sst_roka_backend && chmod -R 775 storage bootstrap/cache" $s3
Remove-SSHSession -SessionId $s3.SessionId | Out-Null

# ── 4. Rsync frontend (sesion propia) ───────────────────────
Write-Host "`n[4/5] Sincronizando frontend React..." -ForegroundColor Yellow
$s4 = NewSession
$PUBLIC = "/home/u248634042/domains/roka50safety.online/public_html/sst"
Run "rsync -a --delete --exclude='api/' ~/sst_roka_repo/frontend/dist/ ${PUBLIC}/" $s4
Run "cp ~/sst_roka_repo/deploy/hostinger/api_index.php ${PUBLIC}/api/index.php" $s4
Run "cp ~/sst_roka_repo/deploy/hostinger/htaccess_api ${PUBLIC}/api/.htaccess" $s4
Run "cp ~/sst_roka_repo/deploy/hostinger/htaccess_public_html ${PUBLIC}/.htaccess" $s4
Remove-SSHSession -SessionId $s4.SessionId | Out-Null

# ── 5. Verificar ─────────────────────────────────────────────
Write-Host "`n[5/5] Verificando..." -ForegroundColor Yellow
$s5 = NewSession
Run "ls -la ${PUBLIC}/index.html && ls -la ${PUBLIC}/api/index.php" $s5
Run "cd ~/sst_roka_backend && php artisan --version" $s5
Run "cd ~/sst_roka_repo && git log -1 --oneline" $s5
Remove-SSHSession -SessionId $s5.SessionId | Out-Null

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "  URL: https://sst.roka50safety.online" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
