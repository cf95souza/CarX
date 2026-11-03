#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Bootstrap e Endurecimento da VPS (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================
# Responsável por aplicar as diretrizes de segurança da Seção 3 e Tarefa T1.1
# do Documento Único de Engenharia do CarX.
#
# Entregas:
# - Criação de usuário não-root com sudo dedicado
# - Desativação de login SSH por senha e bloqueio total de login root direto
# - Firewall UFW em modo fail-closed (apenas portas 22, 80 e 443 permitidas)
# - Fail2ban configurado para proteção contra ataques de força bruta
# - Unattended-upgrades ativo para aplicação diária de patches de segurança
# - Configuração de Timezone (America/Sao_Paulo) e sincronização NTP via chrony
# - Criação de Swap de 4GB com swappiness reduzido (10) e proteção de memória
# - Sysctl com endurecimento de rede (anti-spoofing, SYN flood protection)
# - Instalação do Docker CE e Docker Compose com rotação obrigatória de logs
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Cores e Formatação de Log
# ------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# ------------------------------------------------------------------------------
# Validações Pré-Execução
# ------------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
   log_error "Este script deve ser executado como root ou com privilégios sudo."
   exit 1
fi

# Detectar distribuição
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log_warn "Sistema detectado: $NAME. Este script foi otimizado para Ubuntu Server LTS."
    fi
else
    log_error "Não foi possível identificar a distribuição Linux."
    exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-carx}"
TIMEZONE="${TIMEZONE:-America/Sao_Paulo}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-4}"

log_info "Iniciando processo de endurecimento e provisionamento CarX VPS..."
log_info "Usuário de deploy: ${DEPLOY_USER}"
log_info "Fuso horário: ${TIMEZONE}"
log_info "Tamanho de Swap: ${SWAP_SIZE_GB}GB"

# ------------------------------------------------------------------------------
# 1. Atualização Base do Sistema
# ------------------------------------------------------------------------------
log_info "1/9 - Atualizando repositórios e pacotes do sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    ufw \
    fail2ban \
    chrony \
    unattended-upgrades \
    update-notifier-common \
    htop \
    ncdu \
    net-tools \
    git \
    jq

log_success "Pacotes base instalados com sucesso."

# ------------------------------------------------------------------------------
# 2. Configuração de Fuso Horário e Sincronização NTP
# ------------------------------------------------------------------------------
log_info "2/9 - Configurando fuso horário (${TIMEZONE}) e sincronização NTP..."
timedatectl set-timezone "${TIMEZONE}"
systemctl enable --now chrony
systemctl restart chrony
log_success "Fuso e NTP configurados: $(date)"

# ------------------------------------------------------------------------------
# 3. Criação de Usuário Não-Root Dedicado
# ------------------------------------------------------------------------------
log_info "3/9 - Configurando usuário não-root (${DEPLOY_USER})..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
    useradd -m -s /bin/bash -g sudo "${DEPLOY_USER}" || useradd -m -s /bin/bash -G sudo "${DEPLOY_USER}"
    log_info "Usuário ${DEPLOY_USER} criado."
else
    log_info "Usuário ${DEPLOY_USER} já existe."
    usermod -aG sudo "${DEPLOY_USER}"
fi

# Configurar sudo sem senha para o grupo sudo para automações de deploy
mkdir -p /etc/sudoers.d
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/99-carx-deploy"
chmod 0440 "/etc/sudoers.d/99-carx-deploy"

# Propagar chaves SSH do root para o usuário carx caso existam
DEPLOY_HOME=$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)
mkdir -p "${DEPLOY_HOME}/.ssh"

if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys "${DEPLOY_HOME}/.ssh/authorized_keys"
    log_info "Chaves públicas SSH copiadas de /root/.ssh/authorized_keys para ${DEPLOY_HOME}/.ssh/"
else
    log_warn "Nenhuma chave em /root/.ssh/authorized_keys. Certifique-se de adicionar sua chave pública antes de reiniciar o SSH!"
    touch "${DEPLOY_HOME}/.ssh/authorized_keys"
fi

chmod 700 "${DEPLOY_HOME}/.ssh"
chmod 600 "${DEPLOY_HOME}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"

log_success "Usuário ${DEPLOY_USER} provisionado com acesso SSH seguro."

# ------------------------------------------------------------------------------
# 4. Endurecimento do Servidor SSH (sshd)
# ------------------------------------------------------------------------------
log_info "4/9 - Endurecendo configurações do OpenSSH Server..."
SSH_CONFIG_DROPIN="/etc/ssh/sshd_config.d/99-carx-hardening.conf"
mkdir -p /etc/ssh/sshd_config.d

cat << 'EOF' > "${SSH_CONFIG_DROPIN}"
# CarX Security Constitution — SSH Hardening
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Validar sintaxe da configuração antes de reiniciar
if sshd -t; then
    log_info "Sintaxe do sshd validada com sucesso."
    systemctl restart ssh || systemctl restart sshd
    log_success "OpenSSH reconfigurado: Login root desativado, autenticação exclusiva por chave."
else
    log_error "Falha na validação de sintaxe do OpenSSH! Revertendo arquivo de hardening."
    rm -f "${SSH_CONFIG_DROPIN}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 5. Configuração de Firewall UFW (Modo Fail-Closed)
# ------------------------------------------------------------------------------
log_info "5/9 - Configurando firewall UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Liberar apenas portas estritamente essenciais
ufw limit 22/tcp comment "SSH com limitador de conexao"
ufw allow 80/tcp comment "HTTP (Caddy Let's Encrypt / Redirect)"
ufw allow 443/tcp comment "HTTPS (Trafego Criptografado)"

# Garantir que portas sensíveis de banco/cache não sejam expostas
ufw deny 5432 comment "PostgreSQL Bloqueado na WAN"
ufw deny 6379 comment "Redis Bloqueado na WAN"
ufw deny 9000 comment "MinIO API Bloqueado na WAN"
ufw deny 9001 comment "MinIO Console Bloqueado na WAN"

echo "y" | ufw enable
log_success "Firewall UFW ativo e configurado (portas 22, 80 e 443 permitidas)."

# ------------------------------------------------------------------------------
# 6. Configuração do Fail2ban
# ------------------------------------------------------------------------------
log_info "6/9 - Configurando Fail2ban contra força bruta..."
cat << 'EOF' > /etc/fail2ban/jail.d/carx-sshd.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
banaction = ufw

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban
log_success "Fail2ban ativo protegendo a porta SSH."

# ------------------------------------------------------------------------------
# 7. Unattended Upgrades (Atualizações de Segurança Automáticas)
# ------------------------------------------------------------------------------
log_info "7/9 - Configurando Unattended-Upgrades..."
cat << 'EOF' > /etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

cat << 'EOF' > /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF

systemctl enable --now unattended-upgrades
log_success "Atualizações de segurança automáticas configuradas (reinicialização agendada às 04:00 se exigido pelo kernel)."

# ------------------------------------------------------------------------------
# 8. Otimização de Memória: Swapfile e Parâmetros Sysctl de Kernel
# ------------------------------------------------------------------------------
log_info "8/9 - Configurando Swap (${SWAP_SIZE_GB}GB) e proteção de memória..."
if [ ! -f /swapfile ] && [ "$(swapon --show | wc -l)" -le 1 ]; then
    fallocate -l "${SWAP_SIZE_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024))
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    log_success "Swap de ${SWAP_SIZE_GB}GB ativado com sucesso."
else
    log_info "Swap já existente no sistema."
fi

# Ajustar sysctl para servidor de banco de dados e containers
cat << 'EOF' > /etc/sysctl.d/99-carx-sysctl.conf
# Priorizar uso de memória física sobre swap (ideal para PostgreSQL e Redis)
vm.swappiness = 10
vm.vfs_cache_pressure = 50

# Proteção de rede contra ataques comuns
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Aumentar limites de conexões e sockets para tráfego web
net.core.somaxconn = 65535
fs.file-max = 2097152
EOF

sysctl --system > /dev/null
log_success "Parâmetros de kernel e proteção de rede aplicados com sucesso."

# ------------------------------------------------------------------------------
# 9. Instalação e Configuração Segura do Docker CE
# ------------------------------------------------------------------------------
log_info "9/9 - Instalando e configurando Docker CE com limites de log..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    log_success "Docker CE e Docker Compose instalados."
else
    log_info "Docker já instalado no sistema."
fi

# Adicionar usuário deploy ao grupo docker
usermod -aG docker "${DEPLOY_USER}"

# Configuração de rotação estrita de logs do daemon Docker para evitar disco cheio
mkdir -p /etc/docker
cat << 'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "live-restore": true,
  "no-new-privileges": true,
  "userland-proxy": false
}
EOF

systemctl enable --now docker
systemctl restart docker
log_success "Docker configurado com limites de log (máx 50MB x 3 arquivos) e live-restore."

# ------------------------------------------------------------------------------
# Relatório Final de Auditoria Local
# ------------------------------------------------------------------------------
echo ""
echo "=============================================================================="
echo -e "${GREEN}  CARX VPS BOOTSTRAP CONCLUÍDO COM SUCESSO!${NC}"
echo "=============================================================================="
echo "Status do Sistema:"
echo " - Usuário de Deploy: ${DEPLOY_USER} (pertence aos grupos sudo e docker)"
echo " - Fuso Horário: $(timedatectl | grep 'Time zone' | awk '{print $3}')"
echo " - Swap Ativo: $(free -h | awk '/Swap:/ {print $2}')"
echo " - Portas UFW:"
ufw status numbered | grep -E "(22|80|443|DENY)"
echo " - SSH Hardening: Root Login = Proibido, Senhas = Desativadas"
echo " - Fail2ban: $(systemctl is-active fail2ban)"
echo " - Docker Version: $(docker --version)"
echo " - Docker Compose: $(docker compose version)"
echo "=============================================================================="
echo -e "${YELLOW}IMPORTANTE:${NC} Antes de desconectar da sessão atual, teste o login"
echo -e "em um novo terminal com: ${GREEN}ssh ${DEPLOY_USER}@<IP_DO_SERVIDOR>${NC}"
echo "=============================================================================="

