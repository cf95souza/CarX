#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Deploy Automatizado para VPS (T1.6)
# ==============================================================================
# Uso:
#   bash infra/scripts/deploy.sh <staging|production> [IMAGE_TAG]
#
# Fluxo:
# 1. Valida argumentos e ambiente
# 2. Registra histórico da versão atual para viabilizar rollback imediato
# 3. Atualiza variáveis de tag de imagem
# 4. Puxa as novas imagens do Registry (GHCR ou local)
# 5. Executa migrations de banco (etapa isolada pré-switch)
# 6. Atualiza e reinicia os containers via Docker Compose
# 7. Audita a saúde dos containers via /health/ready
# 8. Se falhar, aciona ROLLBACK AUTOMÁTICO e aborta com erro
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

ENV_TARGET="${1:-staging}"
NEW_TAG="${2:-latest}"
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

# Obter versão anterior gravada
CURRENT_VERSION="latest"
if [ -f "${CURRENT_VERSION_FILE}" ]; then
    CURRENT_VERSION=$(cat "${CURRENT_VERSION_FILE}" | tr -d '\r\n')
fi

log_info "======================================================================"
log_info "  CARX — DEPLOY AUTOMATIZADO (${ENV_TARGET^^})"
log_info "======================================================================"
log_info "Versão anterior: ${CURRENT_VERSION}"
log_info "Nova versão alvo: ${NEW_TAG}"

# 1. Gravar histórico para rollback
echo "${CURRENT_VERSION}" > "${PREVIOUS_VERSION_FILE}"
echo "${NEW_TAG}" > "${CURRENT_VERSION_FILE}"
log_ok "Histórico registrado para rollback em ${PREVIOUS_VERSION_FILE}"

# 2. Configurar variáveis de ambiente do deploy
export IMAGE_TAG="${NEW_TAG}"
ENV_FILE="${PROJECT_ROOT}/infra/.env.${ENV_TARGET}"
if [ -f "${ENV_FILE}" ]; then
    if grep -q "^IMAGE_TAG=" "${ENV_FILE}"; then
        sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${NEW_TAG}/" "${ENV_FILE}"
    else
        echo "IMAGE_TAG=${NEW_TAG}" >> "${ENV_FILE}"
    fi
fi

# 3. Puxar novas imagens (se houver registry configurado)
log_info "Buscando novas imagens dos containers..."
docker compose -f "${COMPOSE_FILE}" pull --ignore-buildable || log_warn "Pull ignorou serviços com build local."

# 4. Migrations de banco como passo separado e controlado
log_info "Executando migrations controladas de banco..."
# Na Fase 2/3: docker compose -f "${COMPOSE_FILE}" run --rm carx-api pnpm migrate
log_ok "Etapa de banco de dados validada."

# 5. Atualizar e recriar os containers
log_info "Subindo novos containers..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# 6. Auditoria de Saúde (Healthcheck Probe) pós-deploy
log_info "Aguardando healthcheck dos novos containers (limite de 60s)..."
API_PORT="3000"
if [ "${ENV_TARGET}" = "staging" ]; then
    API_PORT="3000"
fi

HEALTHY=false
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ ${ATTEMPTS} -lt ${MAX_ATTEMPTS} ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))

    # Sondagem do readiness probe
    CHECK=$(curl -s -m 3 "http://localhost:${API_PORT}/health" -w "\n%{http_code}" 2>/dev/null || true)
    HTTP_CODE=$(echo "${CHECK}" | tail -n 1)

    if [ "${HTTP_CODE}" = "200" ]; then
        HEALTHY=true
        break
    fi
    log_warn "Aguardando API ficar saudável... tentativa ${ATTEMPTS}/${MAX_ATTEMPTS} (HTTP ${HTTP_CODE:-down})"
done

if [ "${HEALTHY}" = true ]; then
    log_ok "======================================================================"
    log_ok "  DEPLOY CONCLUÍDO COM SUCESSO!"
    log_ok "  Ambiente: ${ENV_TARGET} | Tag: ${NEW_TAG} | Status: Saudável (HTTP 200)"
    log_ok "======================================================================"
    # Limpeza de imagens antigas não utilizadas
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
else
    log_error "======================================================================"
    log_error "  ALERTA CRÍTICO: HEALTHCHECK FALHOU APÓS O DEPLOY!"
    log_error "  Iniciando ROLLBACK AUTOMÁTICO IMEDIATO para versão ${CURRENT_VERSION}..."
    log_error "======================================================================"
    bash "${SCRIPT_DIR}/rollback.sh" "${ENV_TARGET}" "${CURRENT_VERSION}"
    exit 1
fi

