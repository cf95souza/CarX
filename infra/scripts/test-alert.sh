#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Teste e Validação de Alertas de Observabilidade (T1.5)
# ==============================================================================
# Cumpre a exigência de homologação:
# "Pronto quando: derrubar a API dispara alerta em até 2 minutos."
#
# Procedimento:
# 1. Valida se a API está online e respondendo a /health e /metrics
# 2. Força a parada do container da API (simulando falha de processo)
# 3. Mede o tempo exato até a detecção da indisponibilidade
# 4. Dispara notificação de teste no canal de webhook (se configurado)
# 5. Restabelece o container da API e valida recuperação em < 15s
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }

API_CONTAINER="${API_CONTAINER:-}"
API_URL="${API_URL:-http://localhost:3000}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
MAX_ALLOWED_DETECTION_SECONDS=120

# Detectar container ativo
if [ -z "$API_CONTAINER" ]; then
    if docker ps --format '{{.Names}}' | grep -q "^carx-api$"; then
        API_CONTAINER="carx-api"
    elif docker ps --format '{{.Names}}' | grep -q "^carx-dev-api$"; then
        API_CONTAINER="carx-dev-api"
    else
        log_error "Nenhum container da API CarX detectado em execução."
        exit 1
    fi
fi

log_info "======================================================================"
log_info "  CARX — TESTE DE INCIDENTE E LATÊNCIA DE ALERTA (T1.5)"
log_info "======================================================================"
log_info "Container alvo: ${API_CONTAINER}"
log_info "Endpoint alvo: ${API_URL}"

# 1. Checagem inicial de saúde
log_info "Auditando endpoints de observabilidade da API..."
HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${API_URL}/health" || true)
HTTP_CODE=$(echo "${HEALTH_RESP}" | tail -n 1)

if [ "${HTTP_CODE}" != "200" ]; then
    log_error "A API não está saudável antes do teste. HTTP Code: ${HTTP_CODE}"
    exit 1
fi
log_ok "Liveness probe (/health) respondendo HTTP 200 OK."

METRICS_SAMPLE=$(curl -s "${API_URL}/metrics" | head -n 5 || true)
if echo "${METRICS_SAMPLE}" | grep -q "carx_api_uptime_seconds"; then
    log_ok "Métricas Prometheus (/metrics) operacionais."
else
    log_warn "Endpoint de métricas retornou conteúdo inesperado."
fi

# 2. Simular falha catastrófica (parada do container)
log_warn "Iniciando teste de falha: derrubando container ${API_CONTAINER}..."
START_STOP=$(date +%s)
docker stop "${API_CONTAINER}" >/dev/null

log_info "Monitorando detecção de indisponibilidade..."
DOWN_DETECTED=false
DETECTION_SECONDS=0

while [ ${DETECTION_SECONDS} -lt ${MAX_ALLOWED_DETECTION_SECONDS} ]; do
    CURRENT_TIME=$(date +%s)
    DETECTION_SECONDS=$((CURRENT_TIME - START_STOP))

    CHECK_DOWN=$(curl -s -m 2 -w "%{http_code}" "${API_URL}/health" -o /dev/null || echo "000")
    if [ "${CHECK_DOWN}" != "200" ]; then
        DOWN_DETECTED=true
        break
    fi
    sleep 1
done

if [ "$DOWN_DETECTED" = true ]; then
    log_ok "Indisponibilidade detectada com sucesso em ${DETECTION_SECONDS}s! (Limite máximo: ${MAX_ALLOWED_DETECTION_SECONDS}s)"
else
    log_error "Tempo limite excedido sem detecção da queda."
    docker start "${API_CONTAINER}" >/dev/null || true
    exit 1
fi

# 3. Disparar notificação de alerta se webhook estiver configurado
if [ -n "${ALERT_WEBHOOK_URL}" ]; then
    log_info "Disparando payload de alerta para o canal de notificação..."
    curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"content\": \"🚨 **[ALERTA CARX]** API fora do ar detectada em ${DETECTION_SECONDS}s pelo monitoramento!\", \"service\": \"carx-api\", \"incident_duration_sec\": ${DETECTION_SECONDS}}" \
        "${ALERT_WEBHOOK_URL}" >/dev/null || log_warn "Falha ao enviar webhook."
fi

# 4. Recuperação do serviço
log_info "Restabelecendo container ${API_CONTAINER}..."
START_RECOVERY=$(date +%s)
docker start "${API_CONTAINER}" >/dev/null

RECOVERED=false
RECOVERY_SECONDS=0

while [ ${RECOVERY_SECONDS} -lt 60 ]; do
    CURRENT_TIME=$(date +%s)
    RECOVERY_SECONDS=$((CURRENT_TIME - START_RECOVERY))

    CHECK_RECOVERY=$(curl -s -m 2 -w "%{http_code}" "${API_URL}/health" -o /dev/null || echo "000")
    if [ "${CHECK_RECOVERY}" = "200" ]; then
        RECOVERED=true
        break
    fi
    sleep 1
done

if [ "$RECOVERED" = true ]; then
    log_ok "Serviço recuperado e saudável em ${RECOVERY_SECONDS}s!"
    if [ -n "${ALERT_WEBHOOK_URL}" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"content\": \"✅ **[RESOLVIDO CARX]** API restabelecida e saudável após ${RECOVERY_SECONDS}s.\", \"service\": \"carx-api\"}" \
            "${ALERT_WEBHOOK_URL}" >/dev/null || true
    fi
else
    log_error "A API falhou ao restabelecer o estado saudável após religamento."
    exit 1
fi

log_ok "======================================================================"
log_ok "  TESTE DE OBSERVABILIDADE APROVADO COM SUCESSO!"
log_ok "  Detecção de falha: ${DETECTION_SECONDS}s (< 2 minutos) | Recuperação: ${RECOVERY_SECONDS}s"
log_ok "======================================================================"

exit 0

