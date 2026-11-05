#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Rollback em 1 Comando (T1.6)
# ==============================================================================
# Uso:
#   bash infra/scripts/rollback.sh [staging|production] [TAG_ESPECÍFICA]
#
# Procedimento:
# 1. Identifica o ambiente e a versão anterior estável
# 2. Atualiza variáveis de tag de imagem
# 3. Recria os containers para restaurar a versão anterior
# 4. Audita o healthcheck para confirmar a estabilização
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

ENV_TARGET="${1:-production}"
SPECIFIC_TAG="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ "${ENV_TARGET}" != "staging" ] && [ "${ENV_TARGET}" != "production" ]; then
    log_error "Ambiente inválido: '${ENV_TARGET}'. Utilize 'staging' ou 'production'."
    exit 1
fi

COMPOSE_FILE="${PROJECT_ROOT}/infra/compose.${ENV_TARGET}.yml"
if [ ! -f "${COMPOSE_FILE}" ]; then
    log_error "Arquivo compose não encontrado: ${COMPOSE_FILE}"
    exit 1
fi

STATE_DIR="${HOME}/.carx-deploy"
mkdir -p "${STATE_DIR}"
CURRENT_VERSION_FILE="${STATE_DIR}/${ENV_TARGET}-current.txt"
PREVIOUS_VERSION_FILE="${STATE_DIR}/${ENV_TARGET}-previous.txt"

TARGET_TAG="${SPECIFIC_TAG}"
if [ -z "${TARGET_TAG}" ]; then
    if [ -f "${PREVIOUS_VERSION_FILE}" ]; then
        TARGET_TAG=$(cat "${PREVIOUS_VERSION_FILE}" | tr -d '\r\n')
    else
        log_warn "Nenhum registro anterior encontrado em ${PREVIOUS_VERSION_FILE}. Recuando para 'latest'..."
        TARGET_TAG="latest"
    fi
fi

CURRENT_TAG="desconhecida"
if [ -f "${CURRENT_VERSION_FILE}" ]; then
    CURRENT_TAG=$(cat "${CURRENT_VERSION_FILE}" | tr -d '\r\n')
fi

log_info "======================================================================"
log_info "  CARX — PROCEDIMENTO DE ROLLBACK EM 1 COMANDO (${ENV_TARGET^^})"
log_info "======================================================================"
log_info "Versão com falha: ${CURRENT_TAG}"
log_info "Restaurando versão estável anterior: ${TARGET_TAG}"

# 1. Atualizar arquivo de variáveis
export IMAGE_TAG="${TARGET_TAG}"
ENV_FILE="${PROJECT_ROOT}/infra/.env.${ENV_TARGET}"
if [ -f "${ENV_FILE}" ]; then
    if grep -q "^IMAGE_TAG=" "${ENV_FILE}"; then
        sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TARGET_TAG}/" "${ENV_FILE}"
    else
        echo "IMAGE_TAG=${TARGET_TAG}" >> "${ENV_FILE}"
    fi
fi

# 2. Recriar os containers com a versão anterior
log_info "Recriando containers com imagem tag: ${TARGET_TAG}..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# 3. Auditoria de recuperação
log_info "Auditando saúde do serviço pós-rollback..."
API_PORT="3000"

RECOVERED=false
ATTEMPTS=0
MAX_ATTEMPTS=20

while [ ${ATTEMPTS} -lt ${MAX_ATTEMPTS} ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))

    CHECK=$(curl -s -m 3 "http://localhost:${API_PORT}/health" -w "\n%{http_code}" 2>/dev/null || true)
    HTTP_CODE=$(echo "${CHECK}" | tail -n 1)

    if [ "${HTTP_CODE}" = "200" ]; then
        RECOVERED=true
        break
    fi
    log_warn "Aguardando estabilização... tentativa ${ATTEMPTS}/${MAX_ATTEMPTS}"
done

if [ "${RECOVERED}" = true ]; then
    # Inverter registros para permitir re-rollback se desejado
    echo "${CURRENT_TAG}" > "${PREVIOUS_VERSION_FILE}"
    echo "${TARGET_TAG}" > "${CURRENT_VERSION_FILE}"

    log_ok "======================================================================"
    log_ok "  ROLLBACK EXECUTADO COM SUCESSO!"
    log_ok "  Ambiente: ${ENV_TARGET} restaurado para a versão '${TARGET_TAG}'."
    log_ok "  Status: Saudável e operacional (HTTP 200)."
    log_ok "======================================================================"
    exit 0
else
    log_error "Falha crítica: o serviço não restabeleceu saúde após o rollback."
    exit 1
fi

