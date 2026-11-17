# ==============================================================================
# Disparador de Deploy do CarX na VPS Oracle via PowerShell
# ==============================================================================
$KeyPath = "D:\VPSOracle\ssh-key-2026-08-27.key"
$VpsHost = "ubuntu@137.131.151.125"

Write-Host "Iniciando deploy remoto do CarX na VPS Oracle ($VpsHost)..." -ForegroundColor Cyan

if (-not (Test-Path $KeyPath)) {
    Write-Error "Chave SSH nao encontrada em $KeyPath"
    exit 1
}

# 1. Normalizar finais de linha e enviar script de deploy para a VPS
Write-Host "Enviando script de deploy para a VPS..." -ForegroundColor Yellow
$shPath = "d:\Repositorios\CarX\infra\scripts\deploy-oracle-test.sh"
$content = [System.IO.File]::ReadAllText($shPath)
[System.IO.File]::WriteAllText($shPath, ($content.Replace("`r`n", "`n")), [System.Text.UTF8Encoding]::new($false))
scp -i $KeyPath -o StrictHostKeyChecking=no $shPath "${VpsHost}:/tmp/deploy-oracle-test.sh"

# 2. Executar script remotamente
Write-Host "Executando deploy remoto na VPS..." -ForegroundColor Green
ssh -i $KeyPath -o StrictHostKeyChecking=no $VpsHost 'bash /tmp/deploy-oracle-test.sh'
