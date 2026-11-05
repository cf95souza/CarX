# CarX - Script de Rollback em 1 Comando (PowerShell / Windows)
param(
    [string]$EnvTarget = "staging",
    [string]$SpecificTag = ""
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CARX - PROCEDIMENTO DE ROLLBACK EM 1 COMANDO (Windows)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."
$ComposeFile = "$ProjectRoot\infra\compose.$EnvTarget.yml"

if (-not (Test-Path $ComposeFile)) {
    # Fallback para compose.dev.yml se testando localmente
    if (Test-Path "$ProjectRoot\infra\compose.dev.yml") {
        $ComposeFile = "$ProjectRoot\infra\compose.dev.yml"
        Write-Host "[INFO] Usando compose.dev.yml para ambiente local." -ForegroundColor Cyan
    } else {
        throw "Arquivo compose nao encontrado para ambiente ${EnvTarget}: $ComposeFile"
    }
}

$StateDir = "$env:TEMP\.carx-deploy"
if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir | Out-Null
}

$CurrentVersionFile = "$StateDir\$EnvTarget-current.txt"
$PreviousVersionFile = "$StateDir\$EnvTarget-previous.txt"

$TargetTag = $SpecificTag
if (-not $TargetTag) {
    if (Test-Path $PreviousVersionFile) {
        $TargetTag = (Get-Content $PreviousVersionFile -Raw).Trim()
    } else {
        $TargetTag = "latest"
    }
}

$CurrentTag = "desconhecida"
if (Test-Path $CurrentVersionFile) {
    $CurrentTag = (Get-Content $CurrentVersionFile -Raw).Trim()
}

Write-Host "[INFO] Versao com falha: $CurrentTag" -ForegroundColor Cyan
Write-Host "[INFO] Restaurando versao estavel anterior: $TargetTag" -ForegroundColor Cyan

# 1. Definir variavel de ambiente
$env:IMAGE_TAG = $TargetTag

# 2. Recriar containers
Write-Host "[INFO] Recriando containers com imagem tag: $TargetTag..." -ForegroundColor Cyan
docker compose -f $ComposeFile up -d --remove-orphans | Out-Null

# 3. Auditoria de saude
Write-Host "[INFO] Auditando saude do servico pos-rollback..." -ForegroundColor Cyan
$recovered = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    $check = & curl.exe -s -m 2 -w "%{http_code}" "http://127.0.0.1:3000/health" -o NUL
    if ($check -eq "200") {
        $recovered = $true
        break
    }
}

if ($recovered) {
    Set-Content -Path $PreviousVersionFile -Value $CurrentTag
    Set-Content -Path $CurrentVersionFile -Value $TargetTag

    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  ROLLBACK EXECUTADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "  Ambiente: $EnvTarget restaurado para a versao '$TargetTag'." -ForegroundColor Green
    Write-Host "  Status: Saudavel e operacional (HTTP 200)." -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
} else {
    throw "Falha critica: o servico nao restabeleceu saude apos o rollback."
}
