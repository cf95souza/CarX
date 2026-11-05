# CarX - Teste de Incidente e Latencia de Alerta (PowerShell / Windows)
param(
    [string]$ApiContainer = "",
    [string]$ApiUrl = "http://127.0.0.1:3000",
    [string]$AlertWebhookUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CARX - TESTE DE INCIDENTE E LATENCIA DE ALERTA (T1.5 - Windows)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$MaxAllowedDetectionSeconds = 120

if (-not $ApiContainer) {
    $running = docker ps --format "{{.Names}}"
    if ($running -like "*carx-api*") {
        $ApiContainer = "carx-api"
    } elseif ($running -like "*carx-dev-api*") {
        $ApiContainer = "carx-dev-api"
    } else {
        throw "Nenhum container da API CarX detectado em execucao."
    }
}

Write-Host "[INFO] Container alvo: $ApiContainer" -ForegroundColor Cyan
Write-Host "[INFO] Endpoint alvo: $ApiUrl" -ForegroundColor Cyan

# 1. Checagem inicial de saude
Write-Host "[INFO] Auditando endpoints de observabilidade da API..." -ForegroundColor Cyan
$healthRaw = & curl.exe -s -m 5 "$ApiUrl/health"
if (-not $healthRaw -or ($healthRaw -notmatch '"status"\s*:\s*"ok"')) {
    throw "A API nao esta acessivel ou saudavel antes do teste em $ApiUrl/health"
}
Write-Host "[OK] Liveness probe (/health) respondendo HTTP 200 OK." -ForegroundColor Green

$readyRaw = & curl.exe -s -m 5 "$ApiUrl/health/ready"
if ($readyRaw -match '"status"\s*:\s*"ready"') {
    Write-Host "[OK] Readiness probe (/health/ready) operacional (PostgreSQL, Redis e Storage saudaveis)." -ForegroundColor Green
}

$metricsRaw = & curl.exe -s -m 5 "$ApiUrl/metrics"
if ($metricsRaw -match "carx_api_uptime_seconds") {
    Write-Host "[OK] Metricas Prometheus (/metrics) operacionais." -ForegroundColor Green
}

# 2. Simular queda da API
Write-Host "[AVISO] Derrubando container $ApiContainer para simulacao de falha..." -ForegroundColor Yellow
$swDetection = [System.Diagnostics.Stopwatch]::StartNew()
docker stop $ApiContainer | Out-Null

$downDetected = $false
$detectionSeconds = 0

while ($detectionSeconds -lt $MaxAllowedDetectionSeconds) {
    Start-Sleep -Seconds 1
    $detectionSeconds = [int]$swDetection.Elapsed.TotalSeconds
    $check = & curl.exe -s -m 2 -w "%{http_code}" "$ApiUrl/health" -o NUL
    if ($check -ne "200") {
        $downDetected = $true
        break
    }
}
$swDetection.Stop()

if ($downDetected) {
    Write-Host "[OK] Indisponibilidade detectada em $detectionSeconds s! (Limite maximo: $MaxAllowedDetectionSeconds s)" -ForegroundColor Green
} else {
    docker start $ApiContainer | Out-Null
    throw "Tempo limite excedido sem deteccao da queda."
}

# 3. Notificacao de alerta se webhook estiver configurado
if ($AlertWebhookUrl) {
    Write-Host "[INFO] Enviando notificacao de alerta para o webhook..." -ForegroundColor Cyan
    $body = @{
        content = "🚨 **[ALERTA CARX]** API fora do ar detectada em $detectionSeconds s!"
        service = "carx-api"
        incident_duration_sec = $detectionSeconds
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $AlertWebhookUrl -Method Post -Body $body -ContentType "application/json" | Out-Null
    } catch {
        Write-Warning "Falha ao enviar webhook: $_"
    }
}

# 4. Recuperacao do servico
Write-Host "[INFO] Restabelecendo container $ApiContainer..." -ForegroundColor Cyan
$swRecovery = [System.Diagnostics.Stopwatch]::StartNew()
docker start $ApiContainer | Out-Null

$recovered = $false
$recoverySeconds = 0

while ($recoverySeconds -lt 60) {
    Start-Sleep -Seconds 1
    $recoverySeconds = [int]$swRecovery.Elapsed.TotalSeconds
    $check = & curl.exe -s -m 2 -w "%{http_code}" "$ApiUrl/health" -o NUL
    if ($check -eq "200") {
        $recovered = $true
        break
    }
}
$swRecovery.Stop()

if ($recovered) {
    Write-Host "[OK] Servico restabelecido e saudavel em $recoverySeconds s!" -ForegroundColor Green
    if ($AlertWebhookUrl) {
        $recBody = @{
            content = "✅ **[RESOLVIDO CARX]** API restabelecida e saudavel apos $recoverySeconds s."
            service = "carx-api"
        } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri $AlertWebhookUrl -Method Post -Body $recBody -ContentType "application/json" | Out-Null
        } catch {
            Write-Warning "Falha ao enviar webhook de resolucao: $_"
        }
    }
} else {
    throw "A API falhou ao recuperar o estado saudavel."
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  TESTE DE OBSERVABILIDADE APROVADO COM SUCESSO!" -ForegroundColor Green
Write-Host "  Deteccao de queda: $detectionSeconds s (< 2 minutos) | Recuperacao: $recoverySeconds s" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
