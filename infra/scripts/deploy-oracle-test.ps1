# ==============================================================================
# Disparador de Deploy do CarX na VPS Oracle via PowerShell
# ==============================================================================
$KeyPath = "D:\VPSOracle\ssh-key-2026-08-27.key"
$VpsHost = "ubuntu@137.131.151.125"

Write-Host "🚀 Iniciando deploy remoto do CarX na VPS Oracle ($VpsHost)..." -ForegroundColor Cyan

if (-not (Test-Path $KeyPath)) {
    Write-Error "Chave SSH não encontrada em $KeyPath"
    exit 1
}

# 1. Enviar script de deploy para a VPS
Write-Host "📤 Enviando script de deploy para a VPS..." -ForegroundColor Yellow
scp -i $KeyPath -o StrictHostKeyChecking=no "d:\Repositorios\CarX\infra\scripts\deploy-oracle-test.sh" "${VpsHost}:/tmp/deploy-oracle-test.sh"

# 2. Executar script remotamente
Write-Host "⚡ Executando deploy remoto na VPS..." -ForegroundColor Green
ssh -i $KeyPath -o StrictHostKeyChecking=no $VpsHost "bash -c 'chmod +x /tmp/deploy-oracle-test.sh && /tmp/deploy-oracle-test.sh'"

