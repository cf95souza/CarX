# CarX — Infraestrutura e Operações (infra/)

Este diretório contém os scripts de provisionamento, configurações de topologia de containers, proxy reverso e automações de observabilidade do ecossistema **CarX**.

---

## 📁 Estrutura de Diretórios

```
infra/
├── scripts/
│   ├── bootstrap-vps.sh        # Script mestre de provisionamento e endurecimento da VPS Ubuntu
│   └── verify-vps-security.sh  # Script de auditoria de conformidade dos critérios de segurança
├── docker/                     # Dockerfiles otimizados multi-stage (api, web, admin, worker)
├── caddy/                      # Caddyfile com terminação TLS automática e roteamento de subdomínios
├── compose.dev.yml             # Topologia Docker Compose para desenvolvimento local
├── compose.staging.yml         # Topologia Docker Compose para homologação na VPS
└── compose.prod.yml            # Topologia Docker Compose para produção
```

---

## 🛡️ Tarefa T1.1 — Endurecimento e Segurança da VPS

O script [`infra/scripts/bootstrap-vps.sh`](file:///d:/Repositorios/CarX/infra/scripts/bootstrap-vps.sh) é o ponto de entrada único para transformar qualquer servidor recém-contratado (Ubuntu 22.04 ou 24.04 LTS) em uma máquina com padrão militar de segurança operacional.

### 1. Camadas de Proteção Aplicadas

1. **Acesso Não-Root Obrigatório**:
   - Cria o usuário de sistema `carx` (ou configurável via `DEPLOY_USER`).
   - Associa ao grupo `sudo` com permissão estrita.
   - Copia de forma segura as chaves públicas SSH existentes em `/root/.ssh/authorized_keys` para `~/.ssh/authorized_keys` com permissões `700/600`.

2. **Endurecimento do OpenSSH Server (`/etc/ssh/sshd_config.d/99-carx-hardening.conf`)**:
   - `PermitRootLogin no`: Proíbe terminantemente logins com usuário root direto via SSH.
   - `PasswordAuthentication no`: Desativa autenticação por senha. Apenas chaves criptográficas (Ed25519 ou RSA 4096) são aceitas.
   - `MaxAuthTries 3`: Limite estrito de tentativas por sessão.
   - `X11Forwarding no`: Desativa tunelamento gráfico.

3. **Firewall Fail-Closed (UFW)**:
   - Política padrão: nega todo o tráfego de entrada (`default deny incoming`).
   - Portas públicas autorizadas:
     - `22/tcp`: SSH protegido com rate limiting (`ufw limit 22/tcp`).
     - `80/tcp`: HTTP (utilizado pelo Caddy para desafio ACME Let's Encrypt e redirecionamento HTTPS).
     - `443/tcp`: HTTPS (tráfego criptografado da aplicação).
   - Bloqueio explícito de bancos e serviços internos (`5432` PostgreSQL, `6379` Redis, `9000/9001` MinIO).

4. **Mitigação de Força Bruta (Fail2ban)**:
   - Jail ativo monitorando `/var/log/auth.log`.
   - Bloqueia automaticamente por 1 hora (`bantime = 3600`) qualquer IP que falhar 3 tentativas em 10 minutos.

5. **Atualizações de Segurança Automáticas (Unattended-Upgrades)**:
   - Aplica correções críticas de segurança do Debian/Ubuntu diariamente de forma silenciosa.
   - Configurado para reiniciar automaticamente às 04:00 da manhã caso um patch de kernel exija reboot.

6. **Gerenciamento de Memória & Kernel (`sysctl`)**:
   - Criação de Swapfile de 4GB (`/swapfile`) com `chmod 600`.
   - `vm.swappiness = 10`: Evita que o Linux troque páginas de memória do PostgreSQL para disco desnecessariamente.
   - Ativação de `SYN Cookies` e filtros anti-spoofing (`rp_filter = 1`) no kernel.

7. **Limites de Logs do Docker (`/etc/docker/daemon.json`)**:
   - Rotação mandatória de logs: `max-size: 50m`, `max-file: 3`. Garante que containers nunca esgotem o armazenamento NVMe da VPS com saídas stdout/stderr.
   - `live-restore: true`: Garante que os containers continuem funcionando sem downtime durante atualizações do daemon Docker.

---

## 🚀 Como Executar o Bootstrap em uma VPS Nova

### Pré-requisito
Ter sua chave SSH cadastrada na VPS (ex.: pela interface da Hetzner, DigitalOcean, Contabo ou AWS).

### Passo 1: Transferir ou clonar o script na VPS
```bash
ssh root@<IP_DA_VPS> "curl -fsSL https://raw.githubusercontent.com/cf95souza/CarX/main/infra/scripts/bootstrap-vps.sh | bash"
```
Ou clonando diretamente o repositório:
```bash
ssh root@<IP_DA_VPS>
git clone https://github.com/cf95souza/CarX.git
cd CarX/infra/scripts
chmod +x bootstrap-vps.sh verify-vps-security.sh
sudo ./bootstrap-vps.sh
```

### Passo 2: Validar o Acesso antes de desconectar
Abra uma **nova janela de terminal** na sua máquina local:
```bash
ssh carx@<IP_DA_VPS>
```

### Passo 3: Executar a Auditoria de Segurança
Na sessão conectada como `carx`:
```bash
sudo ./verify-vps-security.sh
```
O script testará todos os requisitos de segurança e acusará aprovação total (`Aprovações: 7/7, Falhas: 0`).
