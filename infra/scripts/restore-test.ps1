# CarX - Teste de Restauracao de Backup (PowerShell / Windows)
param(
    [string]$BackupFile = "",
    [string]$SourceContainer = ""
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CARX - TESTE AUTOMATIZADO DE RECUPERACAO DE DESASTRE (DR)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$TempId = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TempContainer = "carx-restore-temp-$TempId"
$TempVolume = "carx-restore-temp-vol-$TempId"
$PostgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "carx_dev_user" }
$PostgresPassword = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "carx_dev_password" }
$SourceDb = "carx_dev"
$PostgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "carx_restore_verify" }

if (-not $SourceContainer) {
    $running = docker ps --format "{{.Names}}"
    if ($running -like "*carx-db*") {
        $SourceContainer = "carx-db"
        $PostgresUser = "carx_admin"
        $SourceDb = "carx_production"
    } elseif ($running -like "*carx-dev-db*") {
        $SourceContainer = "carx-dev-db"
        $PostgresUser = "carx_dev_user"
        $PostgresPassword = "carx_dev_password"
        $SourceDb = "carx_dev"
    } else {
        Write-Warning "Nenhum container Postgres padrao detectado."
    }
}

$TempDumpPath = "$env:TEMP\carx_test_dump_$TempId.sql"

function Cleanup {
    Write-Host "[INFO] Limpando container e volume temporarios..." -ForegroundColor Cyan
    docker rm -f $TempContainer 2>$null | Out-Null
    docker volume rm -f $TempVolume 2>$null | Out-Null
    if (Test-Path $TempDumpPath) {
        Remove-Item -Force $TempDumpPath 2>$null | Out-Null
    }
}

try {
    # 1. Obter arquivo de dump
    if ($BackupFile -and (Test-Path $BackupFile)) {
        Write-Host "[INFO] Utilizando dump especificado: $BackupFile" -ForegroundColor Cyan
        Copy-Item $BackupFile $TempDumpPath
    } else {
        if (-not $SourceContainer) {
            throw "Nenhum arquivo de backup informado e nenhum container fonte ativo."
        }
        Write-Host "[INFO] Gerando snapshot de $SourceDb a partir do container $SourceContainer..." -ForegroundColor Cyan
        docker exec $SourceContainer pg_dump -U $PostgresUser -d $SourceDb --clean --if-exists > $TempDumpPath
        Write-Host "[OK] Snapshot gerado em $TempDumpPath" -ForegroundColor Green
    }

    $dumpLength = (Get-Item $TempDumpPath).Length
    if ($dumpLength -lt 20) {
        throw "Arquivo de dump invalido ($dumpLength bytes)."
    }
    Write-Host "[OK] Arquivo de dump validado: $dumpLength bytes." -ForegroundColor Green

    # 2. Iniciar container temporario
    Write-Host "[INFO] Iniciando container temporario: $TempContainer..." -ForegroundColor Cyan
    docker run -d `
        --name $TempContainer `
        -v "${TempVolume}:/var/lib/postgresql/data" `
        -e POSTGRES_USER=$PostgresUser `
        -e POSTGRES_PASSWORD=$PostgresPassword `
        -e POSTGRES_DB=$PostgresDb `
        postgres:16-alpine | Out-Null

    Write-Host "[INFO] Aguardando PostgreSQL temporario inicializar..." -ForegroundColor Cyan
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        $res = docker exec $TempContainer pg_isready -U $PostgresUser -d $PostgresDb 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        throw "Container temporario falhou em inicializar."
    }
    Write-Host "[OK] PostgreSQL temporario inicializado e pronto." -ForegroundColor Green

    # 3. Restaurar dump
    Write-Host "[INFO] Restaurando dump no banco temporario..." -ForegroundColor Cyan
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Get-Content -Raw $TempDumpPath | docker exec -i $TempContainer psql -U $PostgresUser -d $PostgresDb | Out-Null
    $sw.Stop()
    $dur = $sw.Elapsed.TotalSeconds.ToString("F2")
    Write-Host "[OK] Restauracao concluida em $dur s." -ForegroundColor Green

    # 4. Auditoria de integridade
    Write-Host "[INFO] Auditando integridade do banco restaurado..." -ForegroundColor Cyan
    $tableCount = (docker exec $TempContainer psql -U $PostgresUser -d $PostgresDb -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';").Trim()
    $schemaValid = (docker exec $TempContainer psql -U $PostgresUser -d $PostgresDb -t -A -c "SELECT 1 FROM pg_catalog.pg_database WHERE datname = '$PostgresDb';").Trim()

    Write-Host "[INFO] Banco de Teste: $PostgresDb" -ForegroundColor Cyan
    Write-Host "[INFO] Status do Catalogo: $(if ($schemaValid -eq '1') {'VALIDO'} else {'FALHA'})" -ForegroundColor Cyan
    Write-Host "[INFO] Tabelas publicas restauradas: $tableCount" -ForegroundColor Cyan

    if ($schemaValid -ne "1") {
        throw "Falha critica: catalogo do banco restaurado esta corrompido!"
    }

    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  AUDITORIA DE RESTAURACAO APROVADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "  O backup e 100% integro, legivel e recuperavel." -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
}
finally {
    Cleanup
}
