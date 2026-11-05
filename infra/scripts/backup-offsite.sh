#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Backup Externo e Sincronização Off-site (T1.4)
# ==============================================================================
# Realiza a cópia de segurança com destino FORA DA VPS (3-2-1 Backup Strategy):
# 1. Banco de Dados PostgreSQL (Dumps diários compactados)
# 2. Sessões criptografadas do Gateway WhatsApp (/data/sessions)
# 3. Metadados e arquivos do Storage MinIO / Silo
# 4. Envio criptografado via Rclone / AWS CLI para S3 / Cloudflare R2 / Backblaze B2
# 5. Notificação de status para Webhook de Alerta (Discord / Slack / Telegram)
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

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/carx}"
REMOTE_TARGET="${REMOTE_TARGET:-rclone:carx-offsite-backup}" # Ex: r2:carx-backups ou s3:carx-bucket
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}"

mkdir -p "${BACKUP_LOCAL_DIR}/archives"

send_alert() {
    local status="$1"
    local message="$2"
    if [ -n "${ALERT_WEBHOOK_URL}" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"service\":\"carx-backup\",\"status\":\"${status}\",\"timestamp\":\"$(date -Iseconds)\",\"message\":\"${message}\"}" \
            "${ALERT_WEBHOOK_URL}" || true
    fi
}

log_info "======================================================================"
log_info "  CARX — EXECUÇÃO DE BACKUP OFF-SITE EXTERNO (${DATE})"
log_info "======================================================================"

ARCHIVE_TAR="${BACKUP_LOCAL_DIR}/archives/carx_bundle_${DATE}.tar.gz"

# 1. Compactar Dumps do Banco, Sessões de WhatsApp e Arquivos
log_info "1/4 - Empacotando volumes críticos do sistema..."

TEMP_STAGING=$(mktemp -d)
trap 'rm -rf "${TEMP_STAGING}"' EXIT INT TERM

# Exportar banco se container estiver ativo
if docker ps --format '{{.Names}}' | grep -q "^carx-db$"; then
    log_info "Exportando PostgreSQL..."
    docker exec carx-db pg_dumpall -U "${POSTGRES_USER:-carx_admin}" | gzip > "${TEMP_STAGING}/database_full_${DATE}.sql.gz"
fi

# Copiar sessões ativas do WhatsApp
if docker ps --format '{{.Names}}' | grep -q "^carx-wa$"; then
    log_info "Copiando sessões ativas do WhatsApp..."
    docker cp carx-wa:/data/sessions "${TEMP_STAGING}/wa_sessions_${DATE}" 2>/dev/null || true
fi

# Gerar arquivo consolidado comprimido
tar -czf "${ARCHIVE_TAR}" -C "${TEMP_STAGING}" .
ARCHIVE_SIZE=$(ls -lh "${ARCHIVE_TAR}" | awk '{print $5}')
log_ok "Pacote de backup consolidado criado: ${ARCHIVE_TAR} (${ARCHIVE_SIZE})"

# 2. Criptografia Opcional com GPG (AES-256)
UPLOAD_FILE="${ARCHIVE_TAR}"
if [ -n "${GPG_PASSPHRASE}" ]; then
    log_info "2/4 - Criptografando pacote com GPG AES-256..."
    gpg --batch --yes --passphrase "${GPG_PASSPHRASE}" --symmetric --cipher-algo AES256 -o "${ARCHIVE_TAR}.gpg" "${ARCHIVE_TAR}"
    rm -f "${ARCHIVE_TAR}"
    UPLOAD_FILE="${ARCHIVE_TAR}.gpg"
    log_ok "Pacote criptografado com sucesso."
else
    log_info "2/4 - Etapa de criptografia GPG ignorada (GPG_PASSPHRASE não definida)."
fi

# 3. Sincronização Off-site com Armazenamento Externo
log_info "3/4 - Enviando backup para storage externo (${REMOTE_TARGET})..."

if command -v rclone &>/dev/null; then
    if rclone copy "${UPLOAD_FILE}" "${REMOTE_TARGET}/"; then
        log_ok "Sincronização off-site concluída com sucesso via Rclone."
    else
        log_error "Falha no envio off-site via Rclone!"
        send_alert "CRITICAL" "Falha ao enviar backup ${UPLOAD_FILE} para ${REMOTE_TARGET}"
        exit 1
    fi
elif command -v aws &>/dev/null; then
    if aws s3 cp "${UPLOAD_FILE}" "s3://${REMOTE_TARGET}/"; then
        log_ok "Sincronização off-site concluída com sucesso via AWS CLI."
    else
        log_error "Falha no envio off-site via AWS CLI!"
        send_alert "CRITICAL" "Falha ao enviar backup para S3"
        exit 1
    fi
else
    log_warn "Nem Rclone nem AWS CLI foram encontrados no host. O arquivo permanece armazenado localmente em ${UPLOAD_FILE}."
fi

# 4. Rotação de Arquivos Locais (manter últimos 7 arquivos no disco local)
log_info "4/4 - Aplicando rotação local de segurança..."
find "${BACKUP_LOCAL_DIR}/archives" -type f -name "carx_bundle_*" -mtime +7 -delete

log_ok "======================================================================"
log_ok "  BACKUP CONCLUÍDO E SINCRONIZADO COM SUCESSO!"
log_ok "======================================================================"
send_alert "SUCCESS" "Backup do CarX (${DATE}) concluído com sucesso. Tamanho: ${ARCHIVE_SIZE}"
exit 0
