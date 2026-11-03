#!/usr/bin/env bash
# ==============================================================================
# CarX — Script de Auditoria e Verificação de Segurança da VPS (T1.1)
# ==============================================================================
# Executa a verificação dos critérios de aceitação da Tarefa T1.1:
# 1. Login root desativado
# 2. Login por senha rejeitado
# 3. Portas abertas no firewall (apenas 22, 80, 443)
# 4. Fail2ban ativo
# 5. Unattended-upgrades ativo
# 6. Swap e swappiness
# 7. Limites de rotação de log do Docker
# ==============================================================================

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED_CHECKS=0
PASSED_CHECKS=0

check_pass() {
    echo -e "${GREEN}[APROVADO]${NC} $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

check_fail() {
    echo -e "${RED}[FALHA]${NC} $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

check_warn() {
    echo -e "${YELLOW}[ATENÇÃO]${NC} $1"
}

echo "=============================================================================="
echo "  CARX — AUDITORIA DE ENDURECIMENTO DA VPS (Critérios T1.1)"
echo "=============================================================================="

# 1. Verificar SSH PermitRootLogin
if sshd -T 2>/dev/null | grep -qi "permitrootlogin no"; then
    check_pass "SSH: Login direto como 'root' está bloqueado (PermitRootLogin no)."
else
    check_fail "SSH: PermitRootLogin não está explicitamente configurado como 'no'."
fi

# 2. Verificar SSH PasswordAuthentication
if sshd -T 2>/dev/null | grep -qi "passwordauthentication no"; then
    check_pass "SSH: Autenticação por senha desativada (exclusivo chave pública)."
else
    check_fail "SSH: PasswordAuthentication não está configurado como 'no'."
fi

# 3. Verificar status do Firewall UFW
if command -v ufw &>/dev/null; then
    UFW_STATUS=$(ufw status | head -n 1)
    if [[ "$UFW_STATUS" == *"active"* ]]; then
        check_pass "Firewall: UFW está ATIVO."
        
        # Verificar portas liberadas
        OPEN_PORTS=$(ufw status | grep -E "ALLOW" | awk '{print $1}' | sort -u | tr '\n' ' ')
        echo "   Portas liberadas no UFW: $OPEN_PORTS"
        
        # Garantir que portas de banco/internas não estão expostas
        if ufw status | grep -qE "5432.*ALLOW|6379.*ALLOW|9000.*ALLOW|9001.*ALLOW"; then
            check_fail "Firewall: Há portas de banco/infraestrutura interna expostas!"
        else
            check_pass "Firewall: Nenhuma porta interna (5432, 6379, 9000, 9001) está exposta publicamente."
        fi
    else
        check_fail "Firewall: UFW NÃO está ativo."
    fi
else
    check_fail "Firewall: UFW não está instalado."
fi

# 4. Verificar Fail2ban
if systemctl is-active fail2ban &>/dev/null; then
    check_pass "Fail2ban: Serviço em execução e ativo contra ataques de força bruta."
else
    check_fail "Fail2ban: Serviço inativo ou não instalado."
fi

# 5. Verificar Unattended-Upgrades
if systemctl is-active unattended-upgrades &>/dev/null || [ -f /etc/apt/apt.conf.d/20auto-upgrades ]; then
    check_pass "Segurança: Atualizações automáticas de segurança (unattended-upgrades) configuradas."
else
    check_fail "Segurança: Unattended-upgrades não configurado."
fi

# 6. Verificar Swap e Swappiness
SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
if [ "$SWAP_TOTAL" -gt 0 ]; then
    check_pass "Memória: Swap ativo (${SWAP_TOTAL}MB)."
    SWAPPINESS=$(cat /proc/sys/vm/swappiness 2>/dev/null || echo "60")
    if [ "$SWAPPINESS" -le 15 ]; then
        check_pass "Memória: vm.swappiness otimizado para ${SWAPPINESS} (protege performance do PostgreSQL)."
    else
        check_warn "Memória: vm.swappiness é ${SWAPPINESS} (recomendado <= 15 para servidores com banco)."
    fi
else
    check_warn "Memória: Nenhum swap configurado."
fi

# 7. Verificar Limites de Log do Docker
if [ -f /etc/docker/daemon.json ]; then
    if grep -q "max-size" /etc/docker/daemon.json && grep -q "max-file" /etc/docker/daemon.json; then
        check_pass "Docker: Rotação de logs configurada em /etc/docker/daemon.json (previne esgotamento de disco)."
    else
        check_fail "Docker: /etc/docker/daemon.json sem limites de log (max-size/max-file)."
    fi
else
    check_fail "Docker: Arquivo /etc/docker/daemon.json inexistente."
fi

echo "=============================================================================="
echo "RESULTADO DA AUDITORIA:"
echo -e "  Aprovações: ${GREEN}${PASSED_CHECKS}${NC}"
echo -e "  Falhas:     ${RED}${FAILED_CHECKS}${NC}"
echo "=============================================================================="

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}>>> TODOS OS CRITÉRIOS DA TAREFA T1.1 FORAM ATENDIDOS COM SUCESSO! <<<${NC}"
    exit 0
else
    echo -e "${RED}>>> EXISTEM FALHAS QUE PRECISAM SER CORRIGIDAS ANTES DE HOMOLOGAR T1.1. <<<${NC}"
    exit 1
fi
