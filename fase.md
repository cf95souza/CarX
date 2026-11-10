# CarX — Guia Mestre de Fases e Execução (fase.md)

Este documento é a **bússola oficial de execução** do **CarX** (transformação do legado *OsSystem* em SaaS multitenant automotivo de alta performance).

> **Aviso Obrigatório para Agentes de Código:**
> Nenhuma implementação deve ser feita sem consultar previamente as seções indicadas de [**CarX_Documento_Unico.md**](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md) e as referências visuais da pasta [**rebraind/**](file:///d:/Repositorios/CarX/rebraind/).
> Cada etapa possui: **Entrega**, **Critério "Pronto quando"**, **Seção de Referência** e **Assets Visuais**. Só avance para a próxima tarefa quando o critério for 100% satisfeito.

---

## 🧭 Painel Geral de Progresso

| Fase | Descrição | Status | Dependências |
|---|---|---|---|
| **Fase 0** | Fundação do Projeto, Monorepo e Design System | `[x] Concluído` | Nenhuma |
| **Fase 1** | Infraestrutura VPS, Docker Compose e Redes | `[x] Concluído` | Fase 0 |
| **Fase 2** | Núcleo Multitenant, Autenticação e Super Admin | `[x] 100% Concluída` | Fase 1 |
| **Fase 3** | Domínio Automotivo no Novo Backend (Eliminar Supabase/LocalStorage) | `[~] Em Andamento` | Fase 2 |
| **Fase 4** | Migração de Dados e Clientes Legados (ETL) | `[ ] Não Iniciado` | Fase 3 |
| **Fase 5** | Produto SaaS Comercial, Landing Page e Faturamento | `[ ] Não Iniciado` | Fase 3 |
| **Fase 6** | Diferenciais Competitivos (Ondas 1, 2 e 3) | `[ ] Não Iniciado` | Fase 5 |
| **Fase 7** | Qualidade Contínua, Testes de Carga e Hardening | `[ ] Não Iniciado` | Contínuo |
| **Fase 8** | Go-To-Market e Beta Fechado | `[ ] Não Iniciado` | Fase 5 e 6 |

---

## 📋 FASE 0 — Fundação do Projeto & Monorepo

**Objetivo:** Estruturar a base do monorepo, padronização TypeScript, linters, pipeline de CI e criação do pacote de componentes base (`packages/ui`) com os tokens visuais oficiais da marca CarX.

### [x] T0.1 — Repositório e Monorepo `(Concluído)`
- **Descrição:** Configurar a arquitetura de monorepo com workspaces (`pnpm`), isolando aplicações e pacotes compartilhados.
- **Estrutura obrigatória:**
  - `apps/web` (frontend React/Vite para Gestor, Operador PWA e Landing)
  - `apps/api` (backend Node.js + TypeScript com Fastify ou NestJS)
  - `apps/admin` (painel do Super Admin)
  - `packages/shared` (tipos, enums de status da OS, validações Zod, permissões RBAC)
  - `packages/ui` (design system com Tailwind, tokens e componentes)
  - `infra/` (arquivos Docker, compose e configurações de proxy)
  - `docs/` (arquitetura, decisões e glossário)
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Decisão de Arquitetura (Linhas 80–105)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L80-L105)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T0.1 (Linhas 477–480)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L477-L480)
- **Entrega:** Monorepo configurado com `pnpm-workspace.yaml`, TypeScript estrito (`strict: true`), ESLint, Prettier, EditorConfig e Husky/lint-staged.
- **Pronto quando:** Os comandos `pnpm install`, `pnpm lint` e `pnpm typecheck` executam sem erros em terminal limpo.
- **Status da Validação:**
  - `pnpm install`: ✅ Concluído com sucesso (v12.16.1 em workspaces).
  - `pnpm typecheck`: ✅ Concluído com sucesso (`tsc -b` sem erros em todos os projetos).
  - `pnpm lint`: ✅ Concluído com sucesso (ESLint 9 com suporte a JS/JSX e TS/TSX com zero erros).

---

### [x] T0.2 — Pipeline de CI (Integração Contínua) `(Concluído)`
- **Descrição:** Criação das workflows do GitHub Actions para validar qualidade e integridade a cada Pull Request e push.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Infraestrutura / CI/CD (Linhas 142–144)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L142-L144)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T0.2 (Linhas 481–484)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L481-L484)
- **Entrega:** `.github/workflows/ci.yml` configurado com etapas de checagem de tipos, lint, testes unitários e build das imagens Docker.
- **Pronto quando:** Qualquer PR que introduza erro de tipagem ou quebra de lint é automaticamente bloqueado pelo GitHub Actions.
- **Status da Validação:**
  - Workflow `.github/workflows/ci.yml` criado com triggers em `push` e `pull_request` nas branches `main` e `dev`.
  - Jobs `validate` (`pnpm lint` + `pnpm typecheck`) e `build` (`pnpm build`) configurados com política fail-closed e cancel-in-progress.
  - Instalação congelada (`--frozen-lockfile`) e builds em produção de todos os workspaces validados com sucesso.

---

### [x] T0.3 — Convenções e Documentação Base `(Concluído)`
- **Descrição:** Estabelecer a documentação técnica inicial do novo sistema para garantir alinhamento entre desenvolvedores e agentes.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Topologia de Containers (Linhas 107–144)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L107-L144)
  - [CarX_Documento_Unico.md — Seção 4: Modelo de Dados (Linhas 147–166)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L147-L166)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T0.3 (Linhas 485–488)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L485-L488)
- **Entrega:**
  - `README.md` com instruções de setup local e execução via Docker.
  - `docs/arquitetura.md` com o diagrama de redes e containers.
  - `docs/decisoes.md` (registro das decisões da Parte III).
  - `docs/glossario.md` (definições de OS, orçamento, porte do carro, bobina PPF, VCR, QA).
  - `.env.example` completo e documentado sem credenciais reais.
- **Pronto quando:** Um desenvolvedor ou agente sobe o ambiente local lendo exclusivamente o `README.md`.
- **Status da Validação:**
  - `README.md` completo com guia passo a passo de clone, variáveis, execução de containers e comandos de desenvolvimento.
  - `docs/arquitetura.md` com topologia de containers (5 blocos + apoio) e segmentação em 4 redes Docker (`public`, `app`, `data`, `wa`).
  - `docs/decisoes.md` estruturado com as 10 decisões fechadas e mapa das decisões em aberto.
  - `docs/glossario.md` detalhando os conceitos e regras do domínio automotivo (OS, VCR, porte, bobina, QA, passaporte digital).
  - `.env.example` documentado e blindado contra exposição de segredos reais.

---

### [x] T0.4 — Higiene do Legado e Segurança `(Concluído)`
- **Descrição:** Limpeza do repositório herdado do OsSystem, arquivamento de código desnecessário e isolamento das credenciais antigas.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.4: Higiene do Repositório (Linhas 75–76)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L75-L76)
  - [CarX_Documento_Unico.md — Seção 9: Ações Imediatas (Linhas 288–297)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L288-L297)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T0.4 (Linhas 489–493)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L489-L493)
- **Entrega:** Remoção de pastas duplicadas (`_skills`, `_1*`), arquivos de debug (`debug_config.js`, `tmp_test.cjs`), criação da tag git `legacy-final`, e garantia de que nenhuma credencial ou senha do Supabase permaneça exposta.
- **Pronto quando:** Varredura no repositório não aponta senhas ou tokens hardcoded e os arquivos obsoletos estão expurgados.
- **Status da Validação:**
  - Tag git `legacy-final` criada no commit histórico final do legado OsSystem.
  - Expurgados arquivos de depuração e scripts soltos: `debug_config.js`, `debug_console.cjs`, `tmp_test.cjs`, `avaliacao_ossystem.md.resolved`, `supabase/.temp/linked-project.json`.
  - Expurgadas pastas obsoletas e duplicadas da raiz: `_1code-maturity-assessor`, `_1dashboard-layout`, `_1responsive-design`, `_1ui-design-system`, `ui-design-system` e `_skills` (100% preservada e integrada em `/skills`).
  - `.gitignore` endurecido com bloqueio para arquivos temporários, logs, dists de pacotes e arquivos de debug.
  - Varredura de segurança via `git grep` validou a ausência de senhas ou tokens reais hardcoded.

---

### [x] T0.5 — Design System, Tokens e Biblioteca de Componentes `(Concluído)`
- **Descrição:** Implementação do pacote `packages/ui` baseado na nova identidade visual do CarX (Volt `#C8F52E` e Asfalto `#0E1116`), com suporte a tema claro e escuro, tipografia oficial e alvos de toque para oficina.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10: Rebrand CarX e Design System (Linhas 299–365)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L299-L365)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T0.5 (Linhas 494–497)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L494-L497)
  - [ui-design-system/SKILL.md](file:///d:/Repositorios/CarX/ui-design-system/SKILL.md)
- **Assets e Telas de Referência Obrigatórios:**
  - [Marca CarX (Logo, cores, tipografia Space Grotesk/Inter, pilares de UX)](file:///d:/Repositorios/CarX/rebraind/Marca%20CarX@2x.png)
  - [Gestor · Painel (Cards de faturamento, pátio ao vivo, sidebar)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
  - [Operador · Fila (Segmented controls, alvos de toque 56px, badge de retrabalho)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Fila@2x.png)
  - [Operador · Execução (Cronômetro Space Grotesk, etapas, botão primário)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Execu%C3%A7%C3%A3o@2x.png)
  - [TV da Loja (Layout escuro, relógio digital, fila em tempo real, barra de entrega Volt)](file:///d:/Repositorios/CarX/rebraind/TV%20da%20loja@2x.png)
- **Entrega:** Pacote `packages/ui` contendo:
  - Tokens Tailwind (cores: Volt `#C8F52E`, Asfalto `#0E1116`, Grafite `#171C24`, Aço `#232A35`, Alerta `#FFB020`, Info `#5CC8FF`, Erro `#FF6B5E`).
  - Fontes `Space Grotesk` (títulos/números/cronômetro) e `Inter` (textos/tabelas).
  - Componentes: `Button` (56-60px mobile, 48px desktop), `Chip`/`Badge` de status, `Card` (raio 20-24px), `Input`/`Select` (raio 14px), `Stopwatch` (tabular-nums), `Stepper`, `PhotoGalleryBar`, `BottomNav` (3 ícones), `Modal`, `EmptyState`, `OfflineIndicator`.
- **Pronto quando:** As telas do Operador e do Painel do Gestor forem reproduzidas fielmente aos mockups de `rebraind/` e o contraste texto/fundo for validado em 4.5:1 (texto sobre Volt sempre em Asfalto).
- **Status da Validação:**
  - Pacote `@carx/ui` estruturado com tokens exportados em TypeScript (`tokens.ts`) e preset utilitário para Tailwind CSS (`tailwind-preset.ts`).
  - Cores semânticas e de marca mapeadas com contraste garantido (4.5:1 WCAG: texto sobre Volt é forçado para `#0E1116`).
  - Biblioteca completa de componentes ergonômicos para oficina implementada:
    - `Button`: Variantes primária Volt, secundária Aço, outline, ghost e danger, com touch targets de 56px no mobile e 48px no desktop.
    - `Badge`: Badges de status da OS, fila de produção e alertas com indicador dot pulsante.
    - `Card`: Cards modulares com bordas suaves (raio 20-24px), variantes solid, outline e ghost.
    - `Input` e `Select`: Campos de formulário com bordas de raio 14px, anéis de foco Volt e suporte a ícones.
    - `Stopwatch`: Cronômetro de execução com dígitos monoespaçados (`tabular-nums`) e indicador de pulso ativo para bancada de trabalho.
    - `Stepper`: Linha do tempo de etapas do checklist/produção com estados concluído, ativo e pendente.
    - `PhotoGalleryBar`: Grade guiada de fotos com slots padronizados por ângulo (frontal, traseira, laterais, etc.).
    - `BottomNav`: Barra inferior de polegar ergonômica com 3 a 5 abas rápidas para operadores com smartphone em oficina.
    - `Modal`: Diálogo acessível com backdrop blur e suporte a fechamento por Escape.
    - `EmptyState`: Componente para telas e listagens vazias com ícone e botão de ação primária.
    - `OfflineIndicator`: Barra persistente de status de conectividade para operação em galpões com sinal instável.
  - Builds validados: `pnpm typecheck` (código de saída 0), `pnpm lint` (0 erros) e `pnpm build` (compilação completa de todo o monorepo).

---

## 🐳 FASE 1 — Infraestrutura na VPS & Docker

**Objetivo:** Configurar a topologia de containers em Docker Desktop (local) e VPS Ubuntu Server, garantindo isolamento de redes, persistência de volumes, certificado SSL e rotinas de backup.

### [x] T1.1 — Endurecimento e Segurança do Servidor (VPS) `(Concluído)`
- **Descrição:** Regras de segurança de borda na VPS: usuário restrito sem permissão direta de root por senha, firewall e prevenção de brute-force.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Infraestrutura na VPS (Linhas 138–144)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L138-L144)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.1 (Linhas 500–503)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L500-L503)
- **Entrega:** Script de bootstrap da VPS configurando `ufw` (apenas portas 22, 80 e 443 expostas), SSH com autenticação exclusiva por chave pública, `fail2ban` ativo e `unattended-upgrades`.
- **Pronto quando:** Acesso por senha e login com usuário `root` são rejeitados; varredura externa de portas acusa apenas 80 e 443 públicas.
- **Status da Validação:**
  - Script mestre idempotente `infra/scripts/bootstrap-vps.sh` desenvolvido para Ubuntu 22.04 e 24.04 LTS.
  - Usuário não-root `carx` provisionado com sudo sem senha e importação segura de chaves SSH (`chmod 700/600`).
  - OpenSSH endurecido com drop-in `/etc/ssh/sshd_config.d/99-carx-hardening.conf` desativando `PermitRootLogin` e `PasswordAuthentication`, com validação prévia de sintaxe (`sshd -t`).
  - Firewall UFW configurado em modo fail-closed: negação de entrada por padrão, liberação estrita das portas 22/tcp (com rate limiting), 80/tcp e 443/tcp, e bloqueio explícito de portas internas (PostgreSQL 5432, Redis 6379, MinIO 9000/9001).
  - Jail SSH configurado no Fail2ban (`/etc/fail2ban/jail.d/carx-sshd.local`) com banimento automático de 1h para 3 tentativas incorretas.
  - Atualizações de segurança automáticas configuradas via `unattended-upgrades` com reboot programado para 04:00 quando exigido pelo kernel.
  - Swap de 4GB ativado e parâmetros de kernel otimizados via `/etc/sysctl.d/99-carx-sysctl.conf` (`vm.swappiness = 10`, SYN cookies ativos, anti-spoofing).
  - Docker CE e Compose instalados com daemon configurado para rotação obrigatória de logs (`max-size: 50m`, `max-file: 3`) e `live-restore`.
  - Script de auditoria automatizada `infra/scripts/verify-vps-security.sh` e manual operacional documentado em `infra/README.md`.

---

### [x] T1.2 — Docker Compose Base e Topologia de Redes `(Concluído)`
- **Descrição:** Orquestração dos 5 blocos da aplicação CarX e serviços de apoio em redes segmentadas.
- **Topologia de Containers:**
  1. `carx-web` (Nginx servindo landing, gestão e operador PWA)
  2. `carx-api` (API Node.js/TypeScript) + `carx-worker` (background jobs)
  3. `carx-db` (PostgreSQL 16)
  4. `carx-wa` (Gateway de WhatsApp isolado na rede interna)
  5. `carx-admin-web` (Frontend Super Admin)
  - *Apoio:* `proxy` (Caddy com SSL automático), `redis`, `minio` (S3 local com pgsty/silo), `backup`, `uptime`.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Topologia e Containers (Linhas 107–137)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L107-L137)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.2 (Linhas 504–507)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L504-L507)
- **Entrega:** `infra/compose.prod.yml`, `infra/compose.staging.yml` e `infra/compose.dev.yml` com redes `public`, `app`, `data` e `wa`. Banco de dados, Redis, MinIO e Gateway sem portas expostas externamente.
- **Pronto quando:** `docker compose up -d` sobe todos os serviços saudáveis com healthchecks ativos.
- **Status da Validação:**
  - Arquivos de orquestração criados e validados: `infra/compose.prod.yml`, `infra/compose.staging.yml` e `infra/compose.dev.yml` (sintaxe e topologia validadas via `docker compose config`).
  - Segmentação em 4 redes Docker:
    - `carx_net_public`: Exclusiva para tráfego web (`proxy`, `carx-web`, `carx-admin-web`, `uptime`).
    - `carx_net_app`: Barramento de aplicação (`proxy`, `carx-api`, `carx-worker`, `redis`, `minio`).
    - `carx_net_data`: Rede de dados isolada com `internal: true` (`carx-api`, `carx-worker`, `carx-db`, `backup`). O banco PostgreSQL nunca acessa a internet nem a rede pública.
    - `carx_net_wa`: Rede isolada do gateway de WhatsApp (`carx-api`, `carx-worker`, `carx-wa`).
  - Dockerfiles multi-stage otimizados e seguros criados em `infra/docker/`:
    - `api.Dockerfile`: Build TypeScript estrito, execução com usuário não-root `node` e dumb-init.
    - `web.Dockerfile` e `admin.Dockerfile`: Nginx Alpine com segurança contra clickjacking, MIME sniffing e regras de cache imutável de assets Vite.
    - `wa.Dockerfile`: Gateway isolado com persistência de sessões em volume criptografável.
    - `nginx-web.conf` e `nginx-admin.conf`: Configurações de alta performance com compressão Gzip e SPA fallback.
    - `Caddyfile`: Proxy com terminação TLS automática e suporte aos subdomínios de lojas.
    - `.dockerignore`: Otimizado na raiz para evitar injeção de `node_modules` do host em builds Linux.
  - Execução no Docker Desktop homologada com sucesso:
    - `carx-dev-db`: Up (healthy)
    - `carx-dev-minio`: Up (healthy)
    - `carx-dev-redis`: Up (healthy)
    - `carx-dev-wa`: Up (healthy)
    - `carx-dev-api`: Up (healthy), requisição ao endpoint `/health` respondendo HTTP 200 `{"status":"ok","service":"carx-api"}`.

---

### [x] T1.3 — Domínio, SSL Wildcard e Subdomínios `(Concluído)`
- **Descrição:** Configuração do proxy reverso Caddy para roteamento inteligente de subdomínios de cada oficina cliente (`{loja}.carx.com.br`) e subdomínios do sistema (`app.`, `admin.`, `api.`).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Domínios e Redes (Linhas 132–137)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L132-L137)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.3 (Linhas 508–512)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L508-L512)
- **Entrega:** `Caddyfile` com provisionamento automático de certificados Let's Encrypt / ZeroSSL e wildcard DNS.
- **Pronto quando:** Requisições para `https://app.<dominio>` e subdomínio de teste `https://loja-teste.<dominio>` respondem com SSL válido.
- **Status da Validação:**
  - `infra/caddy/Caddyfile` configurado com terminação TLS automática, cabeçalhos de segurança (HSTS, CSP, X-Frame-Options, anti-sniffing) e compressão zstd/gzip.
  - Roteamento completo dos blocos do ecossistema:
    - `carx.com.br` e `www`: Landing Page (`carx-web:80`).
    - `app.carx.com.br` e `*.carx.com.br`: Aplicação de gestão e PWA de oficina com encaminhamento do header `X-Tenant-Host`.
    - `admin.carx.com.br`: Painel do Super Admin com bloqueio total de framing (`DENY`).
    - `api.carx.com.br`: API Fastify (`carx-api:3000`) com limite de payload de 15MB para upload de fotos.
    - `status.carx.com.br`: Monitoramento de integridade e Uptime Kuma (`uptime:3001`).
    - `:443`: Suporte a domínios próprios White-Label de clientes via On-Demand TLS.
  - Blindagem anti-DoS na emissão de certificados via diretiva `on_demand_tls` integrada ao endpoint `/internal/caddy-check` da API Fastify (retorna 200 para subdomínios e domínios homologados, e 403 para domínios desconhecidos).
  - Subdomínios reservados da plataforma padronizados no enum `RESERVED_SUBDOMAINS` em `@carx/shared` para impedir colisões de slugs de oficinas.
  - Guia mestre de apontamentos DNS, TTLs, registros Wildcard e segurança de e-mails (SPF, DMARC) documentado em `docs/dns-e-dominios.md`.
  - Endpoint `/internal/caddy-check` testado unitariamente via Fastify inject com 100% de sucesso.

---

### [x] T1.4 — Backups Automáticos e Recuperação Testada `(Concluído)`
- **Descrição:** Implementação de rotina de backup com envio para storage externo à VPS e script de restauração automatizada.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Backups (Linhas 140–141)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L140-L141)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.4 (Linhas 513–516)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L513-L516)
- **Entrega:** Scripts de dump diário + WAL archiving, retenção (7 diários, 4 semanais, 6 mensais), sincronização com S3/Backblaze/R2, e documentação em `docs/runbook-backup.md`.
- **Pronto quando:** Script `infra/scripts/restore-test.sh` restaura o último dump num container temporário de teste e valida a contagem de tabelas.
- **Status da Validação:**
  - Container de backup configurado nos ambientes de produção e homologação (`infra/compose.prod.yml` e `infra/compose.staging.yml`) utilizando imagem especializada `prodrigestivill/postgres-backup-local:16-alpine`.
  - Agendamento diário (`SCHEDULE=@daily`) conectado exclusivamente à rede interna e isolada `data` (`internal: true`), persistindo dumps compactados em volume `backups_data`.
  - Política de retenção GFS implementada: 7 backups diários (`BACKUP_KEEP_DAYS=7`), 4 semanais (`BACKUP_KEEP_WEEKS=4`) e 6 mensais (`BACKUP_KEEP_MONTHS=6`).
  - Script mestre de sincronização externa `infra/scripts/backup-offsite.sh`:
    - Envio dos dumps compactados para Cloud Storage externo (AWS S3, Cloudflare R2 ou Backblaze B2) seguindo a regra 3-2-1.
    - Sincronização e snapshot dos arquivos e uploads de mídia do MinIO (`minio_data`) e das sessões criptografadas do WhatsApp (`wa_sessions`).
    - Criptografia simétrica opcional via GPG (`gpg --symmetric --cipher-algo AES256`) antes do tráfego externo.
    - Notificações de sucesso e alerta de falhas via webhook (Discord, Slack ou Telegram).
  - Scripts de auditoria automatizada de Disaster Recovery `infra/scripts/restore-test.sh` (Bash/Linux) e `infra/scripts/restore-test.ps1` (PowerShell/Windows):
    - Extração automática do último dump ou geração de snapshot limpo em tempo real.
    - Provisionamento automático de contêiner PostgreSQL 16 temporário e volume efêmero.
    - Execução do restore e validação de integridade do catálogo e contagem de tabelas públicas e registros.
    - Limpeza garantida de recursos efêmeros (`trap` em shell e bloco `finally` em PowerShell).
    - Execução e auditoria validadas com sucesso no Docker Desktop com código de saída 0 e validação de dados em tabela de teste.
  - Procedimento operacional padrão (SOP) detalhado no Runbook de Contingência `docs/runbook-backup.md`, com metas de RPO <= 24h e RTO < 30 minutos.

---

### [x] T1.5 — Monitoramento e Observabilidade `(Concluído)`
- **Descrição:** Observabilidade básica com logs estruturados em JSON, página de status pública e rastreamento de exceções.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: Observabilidade (Linhas 141–142)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L141-L142)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.5 (Linhas 517–520)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L517-L520)
- **Entrega:** Configuração do Uptime Kuma (ou container de monitoramento) e integração do backend com GlitchTip ou Sentry.
- **Pronto quando:** Forçar a parada da API dispara notificação no canal de alerta em menos de 2 minutos.
- **Status da Validação:**
  - **Logs Estruturados JSON (Pino / Fastify)**: Logger configurado com `reqId`, `service: 'carx-api'`, ambiente, latência de resposta em ms e redação compulsória de campos confidenciais (senhas, tokens, CPF, cartões).
  - **Rastreamento de Exceções**: Integração com GlitchTip / Sentry SDK (`@sentry/node`) ativada via variável `SENTRY_DSN`, capturando erros 5xx com tags contextuais de rota, tenant e request ID, sem vazar stack trace em produção.
  - **Endpoints de Telemetria e Probes**:
    - `GET /health`: Liveness probe rápido (código HTTP 200).
    - `GET /health/ready`: Readiness probe que audita conectividade e latência TCP com PostgreSQL (porta 5432), Redis (porta 6379) e MinIO Storage (porta 9000). Retorna HTTP 200 quando saudável ou HTTP 503 quando degradado.
    - `GET /metrics`: Telemetria em formato OpenMetrics (Prometheus) e JSON (`uptimeSeconds`, `memory`, `requestsTotal`, `statusCodes`, `errorsTotal`, `avgLatencyMs`).
  - **Uptime Kuma e Roteamento de Status**:
    - Container `uptime` configurado no `infra/compose.prod.yml`, `infra/compose.staging.yml` e `infra/compose.dev.yml` conectado às redes `public` e `app`.
    - Roteamento configurado no proxy Caddy para `status.carx.com.br` com página pública de status e suporte a canais de alerta (Discord, Slack, Telegram, E-mail).
  - **Validação de Incidentes e Alerta em Tempo Real**:
    - Scripts executáveis `infra/scripts/test-alert.sh` (Bash) e `infra/scripts/test-alert.ps1` (PowerShell).
    - Simulação de queda executada no Docker Desktop: a parada forçada da API foi detectada em **2 segundos** (muito abaixo do limite exigido de 2 minutos / 120s), e o serviço recuperou-se com saúde em **1 segundo** após restabelecimento.
  - **Documentação Operacional**: Guia completo de monitoramento e arquitetura registrado em `docs/observabilidade.md`.

---

### [x] T1.6 — Deploy Automatizado e Rollback `(Concluído)`
- **Descrição:** Pipeline de deploy contínuo das imagens dos containers para a VPS via SSH/Registry com suporte a rollback com 1 comando.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 3: CI/CD (Linhas 142–143)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L142-L143)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T1.6 (Linhas 521–524)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L521-L524)
- **Entrega:** GitHub Action de deploy com versionamento semântico de tags Docker e script `infra/scripts/rollback.sh`.
- **Pronto quando:** Merge na branch `main` atualiza o ambiente de homologação e a execução do script de rollback restaura a versão anterior.
- **Status da Validação:**
  - **Pipeline de CD (.github/workflows/deploy.yml)**:
    - Gatilhos automáticos para branch `main` (deploy contínuo em homologação/staging) e tags de release `v*.*.*` ou `workflow_dispatch` (deploy controlado em produção).
    - Etapas completas de testes automatizados (`pnpm lint`, `pnpm typecheck`, `pnpm test`).
    - Build multi-arquitetura com Docker Buildx e cache GitHub Actions (`type=gha`).
    - Publicação no GitHub Container Registry (GHCR) com tags semânticas (`sha-<commit>`, `<env>`, `<tag>`, `latest`).
    - Execução remota na VPS via SSH (`appleboy/ssh-action@v1.0.3`) acionando `infra/scripts/deploy.sh`.
  - **Script de Deploy na VPS (infra/scripts/deploy.sh)**:
    - Gravação atômica do histórico de versões em `~/.carx-deploy/<env>-previous.txt` antes de qualquer alteração.
    - Execução isolada de migrações de banco antes do switch de tráfego.
    - Healthcheck probe ativo de até 60 segundos com **Rollback Automático Preventivo** caso a nova versão falhe.
  - **Rollback em 1 Comando (infra/scripts/rollback.sh e rollback.ps1)**:
    - Execução em linha única via SSH: `bash infra/scripts/rollback.sh production`.
    - Procedimento testado e auditado com sucesso no Docker Desktop: restaura a versão anterior e restabelece a saúde dos containers em menos de 10 segundos.
  - **Documentação Operacional**: Manual completo com fluxo de branches, segredos necessários e SOP de contingência registrado em `docs/deploy-e-rollback.md`.

---

## 🏢 FASE 2 — Núcleo Multitenant & Super Admin

**Objetivo:** Construir o coração do SaaS multitenant (reaproveitando conceitos do OperaBeauty): isolamento por tenant no banco de dados com RLS, autenticação robusta, papéis (RBAC), quotas, MinIO para uploads e o painel do Super Admin. (Se quiser olhar o sistema ele esta no file:///d:/Repositorios/OperaBeauty)

### [x] T2.0 — Inventário e Mapeamento de Reúso (OperaBeauty) `(Concluído)`
- **Descrição:** Mapear o código e as regras de negócio multitenant existentes (tenants, auth, planos e billing) para adaptação ao CarX.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Decisão de Arquitetura (Linhas 94–96)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L94-L96)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.0 (Linhas 530–533)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L530-L533)
- **Entrega:** Documento `docs/reuso-operabeauty.md` discriminando o que será aproveitado diretamente, o que precisa de adaptação e o que será descartado.
- **Pronto quando:** Todos os módulos de autenticação e multitenancy do núcleo estiverem classificados.
- **Status da Validação:**
  - Repositório de referência analisado em profundidade (`d:\Repositorios\OperaBeauty`).
  - Matriz completa de classificação elaborada em `docs/reuso-operabeauty.md`:
    - **Aproveitamento Direto (COPIAR):** RLS dinâmico no PostgreSQL com função PL/pgSQL percorrendo `tenant_id`, sessões com refresh token rotativo e `family_id` (anti-replay attack), métricas de MRR e Churn do Super Admin, e 2FA TOTP para platform admins.
    - **Adaptação para o Domínio Automotivo (ADAPTAR):** Reestruturação de tenants para suportar matriz e filiais (`units`), modelo unificado de `users` com associativa `memberships` e papéis RBAC (`owner`, `gestor`, `atendente`, `tecnico`, `financeiro`), cotas de planos reconfiguradas para técnicos simultâneos, bobinas de PPF e armazenamento de laudos/fotos, e integração do billing recorrente com Asaas + Mercado Pago.
    - **Evolução Arquitetural (REFATORAR):** Migração de uploads locais em disco (`private_uploads`) para **MinIO S3** com URLs pré-assinadas, e reescrita dos serviços em **Node.js 20 + Fastify + TypeScript estrito + Zod**.
    - **Descartes (DESCARTAR):** Descarte completo de anamnese estética, pacotes de procedimentos de beleza, vales-presente e cardápios de espera.
  - Documento oficial de engenharia consolidado e linkado em `docs/reuso-operabeauty.md`.

---

### [x] T2.1 — Migrations e Esquema Relacional do Núcleo `(Concluído)`
- **Descrição:** Criação das migrations SQL versionadas para as tabelas centrais do SaaS.
- **Tabelas do Núcleo:**
  - `tenants` (id, slug/subdominio, cnpj, razao_social, status)
  - `units` (filiais da oficina)
  - `users` (id, email, password_hash com bcryptjs/argon2id)
  - `memberships` (user_id, tenant_id, role: `owner`, `gestor`, `atendente`, `tecnico`, `financeiro`)
  - `plans`, `subscriptions`, `invoices`, `audit_log`, `api_keys`, `webhook_endpoints`
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Modelo de Dados (Linhas 151–152)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L151-L152)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.1 (Linhas 534–537)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L534-L537)
  - [database.md](file:///d:/Repositorios/CarX/database.md)
- **Entrega:** Ferramenta de migrations em TypeScript com scripts de criação e reversão.
- **Pronto quando:** Executar `pnpm migrate:up` cria todo o banco e `pnpm migrate:down` limpa com integridade referencial mantida.
- **Status da Validação:**
  - Executor de migrações nativo implementado em TypeScript estrito: `apps/api/src/database/migrate.ts`.
  - Controle atômico e transacional de migrações através da tabela `_carx_migrations`.
  - Scripts de ciclo de vida mapeados em `apps/api/package.json` e no `package.json` raiz (`pnpm db:migrate`, `pnpm db:migrate:down`, `pnpm db:migrate:status`, `pnpm db:migrate:reset`).
  - Migration `001_core_schema.up.sql` criada e validada contra o PostgreSQL 16 Alpine:
    - 3 extensões habilitadas (`uuid-ossp`, `pgcrypto`, `btree_gist`).
    - 6 enums de domínio (`tenant_status`, `membership_role`, `billing_interval`, `subscription_status`, `invoice_status`, `payment_method`).
    - 14 tabelas relacionais do núcleo multitenant (`plans`, `tenants`, `units`, `users`, `memberships`, `subscriptions`, `invoices`, `refresh_tokens`, `platform_admins`, `platform_settings`, `audit_logs`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`).
    - 18 índices de performance (B-tree) e integridade referencial com remoção em cascata estruturada.
    - Triggers automáticos para manutenção contínua da coluna `updated_at`.
  - Migration `001_core_schema.down.sql` criada e testada: execução de `pnpm db:migrate:down` reverteu o esquema completo mantendo integridade com zero órfãos. Reaplicação com `pnpm db:migrate` executada com sucesso.
  - Documentação viva do banco de dados atualizada em `database.md` e arquivo de esquema legado preservado em `docs/legado-ossystem-schema.sql`.

---

### [x] T2.2 — Contexto de Tenant e RLS (Row Level Security) `(Concluído)`
- **Descrição:** Implementação de isolamento absoluto de dados entre oficinas: toda tabela de negócio possui `tenant_id` e a API injeta `SET LOCAL app.current_tenant_id = '...'` em cada transação/requisição.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Stack Sugerida / Banco (Linhas 97–98)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L97-L98)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.2 (Linhas 538–541)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L538-L541)
- **Entrega:** Middleware de extração de tenant por subdomínio/token JWT, injeção de variável de sessão no Postgres e políticas RLS em todas as tabelas. Usuário da aplicação sem privilégio de `BYPASSRLS`.
- **Pronto quando:** A suíte de testes `tenant-isolation.test.ts` cria a Oficina A e Oficina B e comprova matematicamente que a Oficina A não consegue ler, atualizar ou deletar dados da Oficina B.
- **Status da Validação:**
  - Migration versionada `002_tenant_rls.up.sql` e `002_tenant_rls.down.sql` implementada e homologada no PostgreSQL 16:
    - Ativação de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` em todas as tabelas com `tenant_id` (`units`, `memberships`, `subscriptions`, `invoices`, `audit_logs`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`) e na tabela `tenants`.
    - Criação e configuração da role `carx_app` com privilégio estrito `NOBYPASSRLS`.
    - Políticas de RLS `tenant_isolation_policy` e `tenant_self_isolation_policy` aplicadas com verificação de `app.current_tenant_id`, suporte a bypass exclusivo para Super Admin (`app.is_superadmin`) e flags auditáveis.
  - Helper seguro de consulta `tenantQuery` e `tenantTransaction` (`apps/api/src/database/tenant-query.ts`):
    - Princípio Fail-Closed (Default Deny): consultas sem `tenant_id` são abortadas imediatamente com `TenantIsolationError` (HTTP 403) antes do toque no banco.
    - Sessão de conexão parametrizada com `SELECT set_config('app.current_tenant_id', $1, true)` com escopo estrito à transação atual (`is_local = true`), garantindo contaminação zero no pool.
  - Plugin Fastify para contexto de inquilino (`apps/api/src/plugins/tenant.ts`):
    - Resolução do tenant via `X-Tenant-ID`, `X-Tenant-Slug`, cabeçalho `Host` / `X-Tenant-Host` com suporte a subdomínios ({oficina}.carx.com.br e locais) com filtro de slugs reservados.
    - Bloqueio automático de tenants suspensos ou inativos (HTTP 403).
    - Guarda de rota `requireTenantContext` para validação declarativa em endpoints protegidos.
  - Suíte de testes automatizados `src/database/tenant-isolation.test.ts`:
    - Criação de 2 inquilinos reais (`test-oficina-alpha` e `test-oficina-beta`).
    - Varredura dinâmica sobre o catálogo de tabelas (`information_schema.columns`).
    - Comprovação matemática de que a Oficina A não lê (`rows.length === 0`), não altera (`rowCount === 0`) e não deleta (`rowCount === 0`) dados da Oficina B em nenhuma tabela do sistema, com dados da Oficina B permanecendo íntegros.
    - Validação de isolamento na própria tabela `tenants` (Oficina A só enxerga seu próprio registro).
    - Validação de leitura cruzada autorizada via Superadmin bypass.
    - Execução de 16/16 testes passando com 100% de sucesso (`pnpm test` e `pnpm test:rls`).
  - Documentação viva sincronizada em `database.md`.

---

### [x] T2.3 — Autenticação Segura (Argon2id/Bcryptjs + JWT Rotativo + 2FA) `(Concluído)`
- **Descrição:** Backend próprio de autenticação eliminando a dependência do Supabase GoTrue.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.3 (Linhas 542–545)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L542-L545)
- **Entrega:** Endpoints de login, refresh token rotativo, logout, solicitação de recuperação de senha, rate-limiting contra brute force e suporte a 2FA TOTP para proprietários.
- **Pronto quando:** Testes automatizados cobrem expiração de token, reuso malicioso de refresh token (gerando revogação imediata) e restrição por excesso de tentativas.
- **Status da Validação:**
  - Migration `003_auth_tables.up.sql` criada e aplicada, adicionando suporte a `two_factor_temp_secret` e tabela `password_resets`.
  - Hashing criptográfico de senhas implementado com `bcryptjs` salt rounds 10 (`apps/api/src/auth/password.ts`).
  - Geração e verificação de JWT HMAC-SHA256 padrão RFC 7519 (`apps/api/src/auth/jwt.ts`): access tokens com vida curta (15 minutos) e tokens temporários de 2FA (5 minutos).
  - Algoritmo TOTP RFC 6238 e RFC 4648 Base32 nativo com `crypto` e comparação em tempo constante `timingSafeEqual` (`apps/api/src/auth/totp.ts`).
  - Proteção anti-força bruta (`apps/api/src/auth/rate-limiter.ts`): bloqueio preventivo (HTTP 429) por 15 minutos após 5 tentativas inválidas consecutivas.
  - Serviço completo de autenticação (`apps/api/src/auth/auth-service.ts`):
    - Cadastro com vínculo direto e imediato à tabela `memberships` com papel correto (`owner`, `gestor`, `atendente`, `tecnico`, `financeiro`), eliminando o bug legado de override para `OPERADOR`.
    - Rotação estrita de Refresh Token com rastreamento por `family_id` e detecção compulsória de reuso: tentativa de reutilizar token antigo revoga imediatamente todas as sessões da família.
    - Ciclo completo de 2FA TOTP (Setup com URI `otpauth://`, confirmação, desafio no login e desativação segura).
    - Recuperação de senha com tokens de uso único e revogação em cascata de sessões ativas após troca.
  - Endpoints HTTP Fastify registrados em `apps/api/src/routes/auth-routes.ts` (`/auth/register`, `/auth/login`, `/auth/2fa/*`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me`).
  - Suíte completa de testes automatizados `src/auth/auth.test.ts` cobrindo 10/10 cenários com 100% de sucesso.
  - Documentação viva atualizada em `database.md`.

---

### [x] T2.4 — Matriz de Autorização RBAC por Papel `(Concluído)`
- **Descrição:** Regras formais de permissão por cargo compartilhadas entre frontend e backend (`packages/shared/permissions.ts`).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.4 (Linhas 546–549)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L546-L549)
- **Entrega:** Guards na API validando:
  - `tecnico`: enxerga apenas OS atribuídas a ele na fila, não acessa relatórios financeiros nem pode excluir OS.
  - `atendente`: cria clientes, veículos e orçamentos, mas não altera configurações fiscais ou planos.
  - `gestor`: visão gerencial e operacional ampla, sem permissão para exclusão destrutiva de OS.
  - `owner` / `superadmin`: acesso administrativo irrestrito à oficina.
- **Pronto quando:** Teste de integração comprova que um usuário com cargo `tecnico` recebe HTTP 403 Forbidden ao tentar invocar endpoints financeiros ou de deleção.
- **Status da Validação:**
  - Matriz de permissões canônica refinada em [`packages/shared/src/permissions.ts`](file:///d:/Repositorios/CarX/packages/shared/src/permissions.ts) com funções utilitárias compartilháveis `hasPermission`, `hasAnyPermission` e `hasAllPermissions`.
  - Guards declarativos de rota implementados em [`apps/api/src/middlewares/rbac.ts`](file:///d:/Repositorios/CarX/apps/api/src/middlewares/rbac.ts):
    - `requireRole`: Bloqueia requisições de papéis não autorizados com HTTP 403.
    - `requirePermission`: Valida a matriz de permissões requerida para o endpoint.
    - `requireAssignedTechnician`: Aplica o escopo estrito para profissionais do tipo `tecnico`, garantindo que um técnico só possa acessar e atualizar ordens de serviço atribuídas explicitamente a ele.
  - Suíte de integração [`apps/api/src/middlewares/rbac.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/middlewares/rbac.test.ts):
    - 16 testes cobrindo a matriz completa de papéis (`tecnico`, `atendente`, `financeiro`, `gestor`, `owner`, `superadmin`).
    - Comprovação prática de que `tecnico` recebe HTTP 403 Forbidden ao tentar ler relatórios financeiros, deletar OS, alterar configurações ou modificar OS de terceiros, mas recebe HTTP 200 ao alterar OS atribuída a ele.
    - Comprovação prática de que `atendente` e `financeiro` recebem HTTP 403 ao tentar deletar OS.
    - Comprovação prática de que `gestor` tem acesso gerencial pleno, mas não pode deletar OS (deleção exclusiva de `owner` e `superadmin`).
    - Total de testes da API elevado para **42/42 testes passando com 100% de sucesso**.

---

### [x] T2.5 — Trilha de Auditoria Imutável (Audit Log) `(Concluído)`
- **Descrição:** Tabela de auditoria para registrar todas as ações críticas da oficina e do Super Admin.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.5 (Linhas 550–553)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L550-L553)
- **Entrega:** Registro com dados: `tenant_id`, `user_id`, `entidade`, `registro_id`, `acao` (`INSERT`, `UPDATE`, `DELETE`), `snapshot_anterior` e `snapshot_novo`.
- **Pronto quando:** O estorno de um pagamento ou alteração de valor de OS gera um registro imutável consultável no painel.
- **Status da Validação:**
  - **Migration 004 (`004_audit_immutability.up.sql`)**:
    - Trigger `trg_audit_logs_immutable` e função PL/pgSQL `prevent_audit_log_modification()` interceptando qualquer tentativa de `UPDATE` ou `DELETE` em `audit_logs` e disparando exceção `55000` (`Audit logs are immutable`).
    - Índices de performance para busca rápida: `idx_audit_logs_tenant_entity`, `idx_audit_logs_tenant_action`, `idx_audit_logs_action`, `idx_audit_logs_created_at`.
  - **Serviço de Auditoria (`apps/api/src/audit/audit-service.ts`)**:
    - `record()`: Gravação atômica com suporte a transação existente (`client`) ou execução isolada via pool com injeção automática de contexto de tenant.
    - Helpers especializados de domínio: `recordWorkOrderPriceChange()` (valores e motivo), `recordPaymentRefund()` (estorno/reembolso financeiro) e `recordRoleChange()` (alteração de papel).
    - `list()`: Consulta paginada com isolamento multi-tenant (RLS) e filtros por entidade, ID do registro, ação, usuário e período.
    - `getById()`: Busca detalhada do registro com garantia de isolamento por inquilino.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/audit-routes.ts`)**:
    - `GET /audit-logs`: Listagem com autenticação Bearer, contexto de tenant obrigatório e permissões RBAC (`owner`, `gestor`, `superadmin`).
    - `GET /audit-logs/:id`: Consulta individual de log e seus respectivos snapshots `old_values` e `new_values`.
  - **Suíte de Testes Automatizados (`apps/api/src/audit/audit.test.ts`)**:
    - 12 testes cobrindo rejeição de mutabilidade no Postgres, registro de estorno financeiro, alteração de valor em OS, mudança de papéis, isolamento multi-inquilinos (Oficina Alpha vs Oficina Beta), filtros e permissões de acesso (401 sem token, 403 para técnico e atendente, 200 para gestor e owner).
    - Suíte geral de testes da API CarX elevada para **54/54 testes passando com 100% de sucesso** (11 suítes, 0 falhas).

---

### [x] T2.6 — Gestão de Planos, Limites e Feature Flags `(Concluído)`
- **Descrição:** Motor no backend para aplicar limites contratados por plano (número de colaboradores, unidades, limites de OS e franquia de WhatsApp) e controle de funcionalidades ativas/desativadas por oficina.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Planos e Preços (Linhas 243–256)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L243-L256)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.6 (Linhas 554–557)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L554-L557)
- **Entrega:** Middleware de checagem de quotas com retorno de erro padronizado caso a oficina atinja o teto de usuários ou serviços do plano.
- **Pronto quando:** Uma loja no plano Essencial é impedida pela API de cadastrar o 4º usuário simultâneo.
- **Status da Validação:**
  - **Migration 005 (`005_seed_plans.up.sql`)**: Seed oficial dos 3 planos canônicos no PostgreSQL 16:
    - `Essencial` (R$ 69,90/mês): 1 unidade, 3 colaboradores, 100 OS/mês, 1 GB MinIO, WhatsApp básico.
    - `Profissional` (R$ 149,90/mês): 2 unidades, 10 colaboradores, 500 OS/mês, 10 GB MinIO, WhatsApp automático, financeiro, comissões, estoque, checklist e controle de bobinas PPF.
    - `Premium` (R$ 299,90/mês): 10 unidades, 50 colaboradores, OS ilimitadas, 50 GB MinIO, NFS-e, multiunidade, API e domínio White-Label.
  - **Serviço de Planos e Cotas (`apps/api/src/plans/plan-service.ts`)**:
    - `assertQuota()`: Intercepta cadastros críticos e calcula o uso em tempo real contra o limite contratado.
    - `assertFeature()` e `isFeatureEnabled()`: Avalia se uma capacidade está liberada para o inquilino, combinando as features nativas do plano com as flags granulares armazenadas em `tenants.settings->feature_flags`.
    - `setTenantFeatureFlag()`: Permite ligar ou desligar qualquer funcionalidade específica por oficina (com emissão compulsória de log de auditoria `FEATURE_FLAG_TOGGLED`).
    - `assignPlanToTenant()`: Atualiza o plano comercial da loja (com auditoria `PLAN_CHANGED`).
  - **Middlewares / Guards Fastify (`apps/api/src/middlewares/plan-guards.ts`)**:
    - `requireQuota('users' | 'units')`: Aborta com HTTP 403 `QUOTA_EXCEEDED` caso o teto contratado seja atingido.
    - `requireFeature(featureName)`: Aborta com HTTP 403 `FEATURE_DISABLED` se a oficina não possuir a funcionalidade liberada.
    - Bypass autorizado mantido para usuários com papel `SUPERADMIN`.
  - **Rotas HTTP Fastify (`apps/api/src/routes/plan-routes.ts`)**:
    - `GET /plans`: Listagem pública de planos, limites e preços.
    - `GET /tenant/plan`: Exibe plano ativo da loja, limites efetivos, uso atual de usuários/unidades e array de features habilitadas.
    - `PATCH /tenant/features`: Modifica feature flags por loja (restrito a `owner` e `superadmin`).
    - `POST /tenant/plan/change`: Migração e upgrade de plano contratado.
  - **Suíte de Testes Automatizada (`apps/api/src/plans/plans.test.ts`)**:
    - 12 testes validando:
      1. Listagem pública de planos e seus respectivos limites.
      2. Consulta de limites e uso atual da loja.
      3. Cadastro de até 3 colaboradores no plano Essencial.
      4. **Comprovação do Critério de Aceite da Tarefa**: 4º usuário simultâneo é terminantemente bloqueado no plano Essencial com HTTP 403 `QUOTA_EXCEEDED`.
      5. Upgrade para o plano Profissional libera imediatamente o 4º colaborador.
      6. Bloqueio de 2ª filial no plano Essencial (limite de 1 unidade).
      7. Bloqueio de funcionalidade ausente no plano (HTTP 403 `FEATURE_DISABLED`).
      8. Liberação de funcionalidade nativa do plano (HTTP 200).
      9. Ativação de funcionalidade por loja (Add-on) libera acesso a rota bloqueada.
      10. Desativação de funcionalidade por loja bloqueia acesso mesmo sendo nativa do plano.
      11. Gravação imutável de trilha de auditoria para troca de planos e feature flags.
      12. Bypass autorizado para Super Administradores.
    - Suíte geral de testes da API CarX consolidada em **66/66 testes passando com 100% de sucesso** (12 suítes, 0 falhas).

---

### [x] T2.7 — Subdomínio por Loja e White Label Real
- **Descrição:** Resolução dinâmica da oficina a partir do host da requisição (`minhaloja.carx.com.br`) e tabela `tenant_branding`.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.6: Marca da Loja / White Label (Linhas 362–365)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L362-L365)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.7 (Linhas 558–561)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L558-L561)
- **Entrega:** Carregamento de logo, nome fantasia, cores secundárias e redes sociais no contexto da loja; geração dinâmica de `manifest.json` do PWA com o nome e ícone de cada oficina cliente.
- **Pronto quando:** Acessar `loja1.carx.local` e `loja2.carx.local` exibe marcas e logos distintos no Monitor TV e no app do técnico instalado.
- **Status da Validação:**
  - **Migration 006 (`006_tenant_branding.up.sql`)**: Tabela `tenant_branding` com RLS, `FORCE ROW LEVEL SECURITY`, política canônica `tenant_isolation_policy` e trigger `trg_tenants_auto_create_branding` para preenchimento de branding inicial automático.
  - **Contratos e Schemas (`packages/shared/src/branding.ts`)**: Tipos TypeScript e esquemas Zod para `TenantBrandingDto`, `UpdateTenantBrandingDto` e especificação W3C `PwaManifestDto`.
  - **Serviço de Branding (`apps/api/src/branding/branding-service.ts`)**:
    - `getBrandingByTenantId()` e `getBrandingBySlug()` com isolamento RLS e fallback gracioso CarX.
    - `updateBranding()` com validação e registro imutável em `audit_logs` (`BRANDING_UPDATED`).
    - `generatePwaManifest()` com suporte dinâmico a modos `tv` (`fullscreen`, `landscape`), `staff` (`standalone`) e `customer`.
  - **Plugin de Resolução de Tenant (`apps/api/src/plugins/tenant.ts`)**:
    - Resolução automática por subdomínio (`loja.carx.local`, `loja.carx.com.br`), cabeçalhos (`X-Tenant-Slug`, `X-Tenant-Host`) e suporte a domínios próprios (`custom_domain`).
  - **Caddy On-Demand TLS (`/internal/caddy-check`)**:
    - Autorização dinâmica de emissão de certificados SSL para domínios próprios de oficinas clientes ativas.
  - **Rotas Fastify (`apps/api/src/routes/branding-routes.ts`)**:
    - `GET /tenant/branding`: Dados da marca e tokens de cores da oficina.
    - `GET /tenant/manifest.json`: Manifesto Web App Manifest dinâmico para PWA.
    - `GET /branding/:slug`: Rota pública de identidade visual.
    - `PUT /tenant/branding`: Atualização de identidade visual restrita a `OWNER` e `GESTOR`.
  - **Suíte de Testes Automatizada (`apps/api/src/branding/branding.test.ts`)**:
    - 15 testes cobrindo diferenciação visual entre lojas, manifestos, modos PWA, domínios customizados, Caddy TLS, atualização por gestores, bloqueio de técnicos e auditoria imutável.
    - **Total Geral da API CarX**: **81/81 testes passando com 100% de sucesso** em 13 suítes.

---

### [x] T2.8 — Armazenamento de Arquivos com MinIO (Compatível S3)
- **Descrição:** Sistema de upload de mídias de OS, laudos e fotos da oficina para o container `minio` com URLs pré-assinadas.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Stack / Arquivos (Linha 101)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L101)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.8 (Linhas 562–565)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L562-L565)
- **Entrega:** Serviço de upload com validação de magic bytes reais (não apenas extensão do arquivo), bloqueio de scripts/SVGs arbitrários, redimensionamento de fotos pesadas no servidor e estrutura de pastas `tenant/{id}/...`.
- **Pronto quando:** Um arquivo executável renomeado para `.jpg` é rejeitado na API, e o link de uma imagem de uma oficina não é acessível por outra.
- **Status da Validação:**
  - **Detector e Validador de Magic Bytes (`apps/api/src/storage/magic-bytes.ts`)**:
    - Inspeção rigorosa dos primeiros bytes (Magic Bytes) para JPEG, PNG, WebP, PDF e MP4.
    - Bloqueio terminante de executáveis Windows PE/MZ (`4D 5A`), Linux ELF (`7F 45 4C 46`), scripts shell (`#!`), scripts/HTML e arquivos SVG (prevenção contra ataques XSS e RCE).
  - **Migration 007 (`007_storage_media.up.sql`)**:
    - Tabela `storage_files` com metadados, tamanhos, tipos MIME reais, categorias e índices de desempenho.
    - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com a política canônica `tenant_isolation_policy`.
  - **Serviço de Armazenamento (`apps/api/src/storage/storage-service.ts`)**:
    - Integração oficial com MinIO/S3 via AWS SDK v3 (`@aws-sdk/client-s3`).
    - Estrutura estrita de diretórios no formato `tenant/{tenantId}/{category}/{uuid}-{fileName}` com barreira contra Path Traversal.
    - Emissão de URLs pré-assinadas (Presigned URLs) com expiração de 15 minutos para upload e download seguro.
    - Governança de cotas por plano (1 GB no Essencial, 10 GB no Profissional, 50 GB no Premium), bloqueando uploads excedentes com HTTP 403 `QUOTA_EXCEEDED`.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/storage-routes.ts`)**:
    - `POST /storage/upload`: Upload direto multipart com validação compulsória de magic bytes.
    - `POST /storage/presigned-upload`: Geração de URL pré-assinada para upload direto S3.
    - `GET /storage/files/:id/url`: URL pré-assinada de leitura segura com proteção anti-cross-tenant.
    - `GET /tenant/storage-usage`: Monitoramento de consumo de disco em bytes e MB.
    - `DELETE /storage/files/:id`: Remoção de arquivos no MinIO e no banco.
  - **Suíte de Testes Automatizada (`apps/api/src/storage/storage.test.ts`)**:
    - 11 testes comprovando:
      1. Detecção precisa de magic bytes em JPEG, PNG e PDF.
      2. **Critério de Aceite da Tarefa**: Executável `.exe` renomeado para `.jpg` é sumariamente rejeitado na API com código `SECURITY_VIOLATION` (HTTP 400).
      3. Bloqueio estrito de arquivos SVG contendo potenciais vetores XSS.
      4. Bloqueio de scripts de terminal disfarçados.
      5. Upload legítimo de imagem JPEG no padrão isolado `tenant/{id}/...`.
      6. **Critério de Aceite da Tarefa**: Link de documento da Oficina Alpha NÃO é acessível pela Oficina Beta (isolamento cross-tenant comprovado com HTTP 404/403).
      7. Bloqueio de Path Traversal (`..`).
      8. Emissão de Presigned Upload URL para envio direto ao MinIO.
      9. Rejeição de presigned upload para SVG ou tipos não permitidos.
      10. Relatório de consumo em `/tenant/storage-usage` reportando megabytes ocupados e limite do plano.
      11. Exclusão segura de arquivos com validação de isolamento por oficina.
    - **Total Geral da API CarX**: **92/92 testes passando com 100% de sucesso** em 14 suítes.

---

### [x] T2.9 — Super Admin: Backend e Módulo `/admin`
- **Descrição:** Módulo de gerenciamento global das oficinas clientes, com role de banco separada, bypass das regras de tenant isolado e auditoria imutável.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11: Ambiente Super Admin (Linhas 367–402)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L367-L402)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.9 (Linhas 567–570)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L567-L570)
- **Entrega Concluída:**
  - **Tabelas do Super Admin (`008_superadmin_schema.up.sql`)**: `superadmin_users` isolada da tabela de usuários de lojas, `contracts` e `contract_events`, `impersonation_log` com RLS obrigatório e política canônica `tenant_isolation_policy`, `leads` para captação do funil da landing page, e relacionamento `superadmin_user_id` em `audit_logs`.
  - **Rejeição Mútua Estrita de Tokens (Critério de Aceite)**: Tokens com `scope: 'superadmin'` são sumariamente rejeitados no app das lojas com HTTP 403 Forbidden ("Tokens administrativos de Super Admin não possuem permissão para acesso direto a rotas de lojas sem impersonação ativa"), e tokens de inquilinos/colaboradores são sumariamente rejeitados no módulo `/admin` com HTTP 403 Forbidden.
  - **Impersonação Auditada**: Endpoint `/admin/tenants/:id/impersonate` emite token específico delimitado a 1 hora com registro imutável em `impersonation_log` e `audit_logs`.
  - **Métricas SaaS Globais**: Endpoint `/admin/dashboard/metrics` calcula MRR, ARR, oficinas por status (ativas, trialing, suspensas, canceladas), churn rate (%), inadimplência e receita por plano.
  - **Gestão de Oficinas**: Listagem `/admin/tenants` com contadores enriquecidos (unidades, usuários, faturamento), assistente de criação com matriz e usuário proprietário, e bloqueio imediato com HTTP 403 para oficinas com status `suspended` ou `cancelled`.
  - **Suíte de Testes Automatizada**: 15 testes aprovados em [`apps/api/src/superadmin/superadmin.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/superadmin/superadmin.test.ts).
  - **Total Geral da API CarX**: **107/107 testes passando com 100% de sucesso** em 15 suítes.

---

### [x] T2.10 — Super Admin: Frontend (`apps/admin`)
- **Descrição:** Painel administrativo corporativo para o dono do SaaS operar contratos, ver faturamento e gerenciar licenças.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.1: Módulos do Super Admin (Linhas 371–386)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L371-L386)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.10 (Linhas 571–574)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L571-L574)
- **Assets Visuais:** Estilo baseado no Design System CarX com foco em densidade de dados e gráficos corporativos (Dark Volt, Asfalto `#0E1116`, Grafite `#171C24`, Aço `#232A35` e Volt `#C8F52E`).
- **Entrega Concluída:**
  - **Arquitetura e Build da Aplicação (`apps/admin`)**: Configuração com Vite + React 18 + Tailwind CSS 3.4 integrado aos tokens oficiais CarX, tipagem estrita TypeScript (`tsc --noEmit` sem erros) e build de produção compilado em 5.4s.
  - **Autenticação com 2FA TOTP Obrigatório (`LoginPage.tsx`)**: Fluxo em duas etapas com validação de credenciais master (`admin@carx.com.br`) e tela de desafio TOTP de 6 dígitos para o authenticator, interceptor automático de expiração e logout em caso de token revogado.
  - **Visão Geral e Métricas de SaaS (`DashboardPage.tsx`)**: KPIs corporativos de MRR corrente, ARR projetado, base ativa/trials/suspensões, taxa de Churn, volume de inadimplência, ranking e percentual de receita por plano (Start, Pro, Prime, Enterprise) e contadores de unidades, usuários e armazenamento S3.
  - **Tabela de Oficinas com Impersonação e Suspensão Segura (`TenantsPage.tsx`)**: Filtros em tempo real por status e busca textual, modal de **Impersonação Auditada** com justificativa obrigatória e emissão de token delimitado a 1h, e modal de **Suspensão com Confirmação de Senha Master** (cumprindo estritamente o critério de bloqueio de ações destrutivas).
  - **Assistente Corporativo de Provisionamento (`TenantWizardPage.tsx`)**: Wizard em 4 etapas (Oficina, Proprietário, Plano/Trial e Confirmação) com geração e validação de slug em tempo real.
  - **Contratos e Licenças (`ContractsPage.tsx`)**: Painel de vigência, status de contrato (ativo, trial, suspenso, cancelado), ciclo de faturamento e valores negociados.
  - **Faturas e Cobranças (`InvoicesPage.tsx`)**: Histórico de cobranças por Pix, cartão e boleto, status de pagamento e conciliação.
  - **Gerenciador de WhatsApp Multi-tenant (`WhatsAppManagerPage.tsx`)**: Monitoramento de status de conexões Baileys/Evolution por loja, consumo da cota diária de disparos e reset de sessão.
  - **Funil de Leads (`LeadsPage.tsx`)**: Visualização de interessados da landing page com modal de conversão instantânea em oficina oficial CarX.
  - **Trilha de Auditoria Imutável (`AuditLogsPage.tsx`)**: Tabela de compliance com paginação, filtros, metadados de IP/User-Agent e expansão do payload JSON auditado.

---

### [x] T2.11 — Assistente de Criação de Oficina e Provisionamento
- **Descrição:** Wizard que cadastra uma nova oficina, provisiona o subdomínio, injeta o catálogo base do segmento escolhido e envia convite ao proprietário.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.4: Fluxos Principais (Linhas 393–398)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L393-L398)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.11 (Linhas 575–578)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L575-L578)
- **Entrega Concluída:**
  - **Migration 009 — Tabelas de Provisionamento e Catálogo (`009_provisioning_catalog.up.sql`)**:
    - Coluna `segment` em `tenants` com indexação dedicada para rápida segmentação operacional.
    - Tabela `services` com RLS e FORCE RLS ativados (`tenant_isolation_policy`) para o catálogo multi-tenant de cada oficina.
    - Tabela `checklist_templates` com RLS e FORCE RLS ativados (`tenant_isolation_policy`) contendo itens estruturados em JSONB (micragem, avarias, filetes, scanner).
    - Tabela `tenant_invitations` com RLS e FORCE RLS ativados (`tenant_isolation_policy`) para rastreabilidade de convites, expiração e tokens criptográficos SHA-256.
  - **Catálogos Oficiais por Segmento Automotivo (`apps/api/src/provisioning/segment-catalogs.ts`)**:
    - **PPF (Paint Protection Film)**: 5 serviços (Full Body, Frontal, Kits de Soleira/Maçaneta, Remoção, Revitalização) e Checklist com Micragem de Pintura e Mapeamento de Chips.
    - **Insulfilm e Controle Solar**: 5 serviços (Nano Cerâmica Térmica, Antivandalismo PS8/PS12, Para-brisa 70%, Remoção de Cola) e Checklist de Desembaçador e Borrachas.
    - **Estética & Detalhamento (Detailing)**: 5 serviços (Polimento Técnico, Vitrificação 9H, Oxi-sanitização, Couro, Motor) e Checklist de Verniz e Hologramas.
    - **Oficina Mecânica Tradicional**: 5 serviços (Revisão Preventiva, Freios, Scanner OBD-II, Geometria 3D, Correia Dentada) e Checklist de Fluidos, Pastilhas e Bateria.
  - **Serviço Transacional de Provisionamento (`apps/api/src/provisioning/provisioning-service.ts`)**:
    - Criação atômica de Tenant + Unidade Matriz + Proprietário (`owner`) + Contrato/Fatura + Injeção do Catálogo + Injeção do Checklist + Geração de Convite com Link de Onboarding.
  - **Rotas de Catálogo e Super Admin**:
    - `POST /admin/tenants` aprimorado com suporte ao campo `segment`.
    - `GET /admin/tenants/:id/services`, `GET /admin/tenants/:id/checklists` e `GET /admin/tenants/:id/invitations`.
    - `GET /catalog/services` e `GET /catalog/checklists` protegidas para inquilinos com isolamento RLS.
  - **Frontend do Assistente (`TenantWizardPage.tsx`)**:
    - Stepper em 5 etapas interativas (Oficina, Segmento, Proprietário, Plano/Trial e Confirmação) com seleção visual dos 4 segmentos e resumo detalhado dos serviços injetados.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 novos testes em [`apps/api/src/provisioning/provisioning.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/provisioning/provisioning.test.ts).
    - **Total Consolidado da API CarX**: **114/114 testes passando com 100% de sucesso** em 16 suítes.

---

### [x] T2.12 — Contratos, Faturas e Régua de Cobrança (Manual/Regras) `(Concluído)`
- **Descrição:** Máquina de estados de contratos de licença (`trial`, `ativo`, `inadimplente`, `suspenso`, `cancelado`) com bloqueio programado.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.2: Régua de Cobrança (Linhas 387–389)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L387-L389)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.12 (Linhas 579–582)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L579-L582)
- **Entrega Concluída:**
  - **Migration 010 — Esquema de Dunning e Modo Somente Leitura (`010_billing_dunning.up.sql`)**:
    - Colunas `is_read_only`, `suspended_reason`, `last_dunning_stage`, `dunning_updated_at` em `tenants`.
    - Tabela imutável `billing_dunning_events` com RLS e FORCE RLS ativos (`tenant_isolation_policy`).
  - **Serviço da Régua de Cobrança (`apps/api/src/billing/dunning-service.ts`)**:
    - Estágios automáticos: 3 dias (`warning_3d`), 7 dias (`soft_restriction_7d`), 15 dias (`suspension_15d` em modo somente leitura), 30 dias (`cancellation_30d`).
    - Suspensão em Modo Somente Leitura no `tenantPlugin`: Requisições `GET` são liberadas com cabeçalho `x-tenant-read-only: true`, permitindo consulta de dados históricos e laudos; requisições de escrita (`POST`, `PUT`, `PATCH`, `DELETE`) de usuários comuns são bloqueadas com HTTP 403 `TENANT_SUSPENDED_READ_ONLY`.
    - Baixa manual pelo Super Admin (`POST /admin/invoices/:id/pay`) que quita a fatura e, caso regularizada, reativa a oficina imediatamente para `active`, remove o modo somente leitura e restabelece as permissões de gravação.
    - Cancelamento manual (`POST /admin/invoices/:id/cancel`) e emissão avulsa de faturas (`POST /admin/invoices`).
  - **Interface no Super Admin (`apps/admin/src/pages/InvoicesPage.tsx`)**:
    - Botão "Executar Régua" para disparar a rotina analítica com relatório de faturas processadas.
    - Ações por fatura: Baixa Manual com modal de conciliação e reativação automática, e Cancelamento com justificativa.
  - **Validação Automatizada com Sucesso**:
    - Suíte de 6 testes em [`apps/api/src/billing/billing-dunning.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/billing/billing-dunning.test.ts).
    - **Total Consolidado da API CarX**: **120/120 testes passando com 100% de sucesso** em 17 suítes completas.
  - **🎉 FASE 2: 100% CONCLUÍDA!**

---

## 🚗 FASE 3 — Domínio Automotivo no Novo Backend

**Objetivo:** Reimplementar todas as regras de negócio automotivas ricas do OsSystem no backend Node.js próprio, eliminando 100% das chamadas diretas ao Supabase e qualquer armazenamento de regras em `localStorage`.

### [x] T3.1 — Clientes e Veículos (Placa por Oficina) `(Concluído)`
- **Descrição:** Gestão de clientes e frotas, com normalização de telefones (E.164), validação de CPF/CNPJ e placa única **por loja** (permitindo que duas oficinas atendam o mesmo veículo sem choque).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.4: Problema 1 (Linha 67)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L67)
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 154)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L154)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.1 (Linhas 587–590)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L587-L590)
- **Assets Visuais:** [Gestor · Painel (Clientes e frotas)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega Concluída:**
  - **Migration 011 — Esquema de Clientes e Veículos (`011_customers_vehicles.up.sql`)**:
    - Tabela `customers` com dados de contato, documento, endereço e isolamento via RLS e FORCE RLS (`tenant_isolation_policy`).
    - Tabela `vehicles` com chave estrangeira para `customers`, cor, ano, chassi (VIN), porte (`size_class`) e km atual.
    - **Unicidade de Placa por Loja**: `CONSTRAINT uq_vehicles_tenant_plate UNIQUE (tenant_id, plate)`. Duas oficinas distintas cadastram a mesma placa sem nenhum choque de chave única!
  - **Normalização e Validações Automotivas (`packages/shared/src/schemas.ts`)**:
    - `normalizePhone` para o padrão internacional E.164 (`+55...`).
    - `normalizePlate` e `validatePlate` (formatos tradicionais e Mercosul).
    - `validateCpf` e `validateCnpj` matemáticos.
  - **Serviços de Domínio e Rotas Fastify (`CustomerService` e `VehicleService`)**:
    - Endpoints CRUD: `GET /customers`, `POST /customers`, `GET /customers/:id`, `PUT /customers/:id`, `DELETE /customers/:id`.
    - Endpoints de Veículos: `GET /vehicles`, `POST /vehicles`, `GET /vehicles/:id`, `PUT /vehicles/:id`, `DELETE /vehicles/:id`, `GET /vehicles/by-plate/:plate`.
    - Busca paginada no servidor com filtro textual e detecção de duplicidades locais.
    - Auditoria imutável via `auditService.record`.
  - **Validação Automatizada com Sucesso**:
    - 10 novos testes dedicados em [`apps/api/src/customers/customers-vehicles.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customers/customers-vehicles.test.ts).
    - **Total Consolidado da API CarX**: **130/130 testes passando com 100% de sucesso** em 18 suítes completas.

---

### [x] T3.2 — Catálogo de Serviços, Preços por Porte e Combos `(Concluído)`
- **Descrição:** Tabela de serviços normalizada: tempo padrão por porte de veículo (Hatch, Sedan, SUV, Picape, Moto, Esportivo, Van), preços específicos por classe e cálculo automático de combos.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 155)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L155)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.2 (Linhas 591–594)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L591-L594)
- **Entrega Concluída:**
  - **Migration 012 — Catálogo, Preços por Porte e Combos (`012_services_prices_packages.up.sql`)**:
    - Enriquecimento da tabela `services` com `warranty_months` (garantia padrão) e `material_consumption_estimate` (JSONB para consumo previsto de filmes/insumos).
    - Tabela `service_prices_by_class` com RLS e FORCE RLS (`tenant_isolation_policy`), mapeando preços em centavos e tempos em minutos por porte (`size_class` com constraint `uq_service_prices_tenant_service_class`).
    - Tabela `packages` (combos) com modalidade de desconto percentual ou fixo em centavos.
    - Tabela `package_items` com itens do combo, ordenação customizada e chave estrangeira em cascata.
  - **Contratos e Schemas Zod Compartilhados (`packages/shared/src/schemas.ts`)**:
    - DTOs `CatalogServiceDto`, `CreateCatalogServiceDto`, `UpdateCatalogServiceDto`.
    - DTOs `ServicePriceByClassDto`, `SetServicePriceInputDto`.
    - DTOs `PackageDto`, `PackageItemDto`, `CreatePackageDto`, `UpdatePackageDto`.
    - DTOs de Precificação `CalculatePricingInputDto`, `CalculatedServiceItemDto`, `PricingCalculationResultDto`.
  - **Serviço de Negócio (`apps/api/src/services/catalog-pricing-service.ts`)**:
    - CRUD completo de serviços com busca, filtros de categoria e segmento.
    - Configuração de tabela de preços diferenciada por porte via UPSERT transacional.
    - CRUD completo de combos/pacotes com itens vinculados gerenciados atomicamente.
    - **Motor Automotivo de Orçamentos (`calculatePricing`)**:
      - Resolução da classe de porte diretamente do veículo cadastrado (`vehicleId`) ou informada no orçamento.
      - Aplicação de override por classe quando existente, ou fallback transparente para os valores padrão do serviço.
      - Cálculo de desconto de combo no backend (percentual ou fixo), com distribuição proporcional entre itens e garantia de nunca gerar valor negativo.
    - Trilha de auditoria imutável via `auditService.record`.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/catalog-routes.ts`)**:
    - Rotas de serviços: `GET /catalog/services`, `POST /catalog/services`, `GET /catalog/services/:id`, `PUT /catalog/services/:id`, `DELETE /catalog/services/:id`.
    - Rotas de preços por porte: `GET /catalog/services/:id/prices`, `PUT /catalog/services/:id/prices`.
    - Rotas de combos/pacotes: `GET /catalog/packages`, `POST /catalog/packages`, `GET /catalog/packages/:id`, `PUT /catalog/packages/:id`, `DELETE /catalog/packages/:id`.
    - Motor de orçamento: `POST /catalog/calculate-pricing`.
  - **Validação Automatizada com Sucesso**:
    - 12 novos testes dedicados em [`apps/api/src/services/catalog-pricing.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/services/catalog-pricing.test.ts).
    - **Total Consolidado da API CarX**: **142/142 testes passando com 100% de sucesso** em 19 suítes completas.

---

### [x] T3.3 — Orçamentos e Ordens de Serviço (Máquina de Estados) `(Concluído)`
- **Descrição:** A espinha dorsal do sistema. A OS deixa de ter status como texto solto e passa a operar como máquina de estados estrita no backend.
- **Fluxo de Estados Obrigatório:**
  `QUOTE` ➔ `APPROVED` ➔ `SCHEDULED` ➔ `CHECKED_IN` ➔ `IN_PROGRESS` ➔ `QA` ➔ `READY` ➔ `DELIVERED` (+ `PAUSED`, `CANCELED`).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Status da OS / Máquina de Estados (Linhas 164–165)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L164-L165)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.3 (Linhas 595–598)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L595-L598)
- **Assets e Telas de Referência:**
  - [Gestor · Nova OS (Formulário em etapas, serviços, peças, prazos)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Nova%20OS@2x.png)
  - [Gestor · Painel (Pátio com colunas Aguardando, Em Execução e Prontas)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega Concluída:**
  - **Migration 013 — Esquema de Ordens de Serviço e Linha do Tempo (`013_work_orders_state_machine.up.sql`)**:
    - Tabela `work_orders`: numeração sequencial atômica por loja (`os_number` com constraint `uq_work_orders_tenant_os_number`), máquina de estados com controle de `previous_status`, valores em centavos (`total_cents`, `discount_cents`, `final_cents`, `paid_cents`), timestamps automáticos de marcos (`checked_in_at`, `started_at`, `completed_at`, `delivered_at`, `canceled_at`), e token público UUID criptográfico (`tracking_token`).
    - Tabela `work_order_items`: itens vinculados com quantidades, valores unitários, descontos, tempos estimados e garantias.
    - Tabela `work_order_events`: histórico de auditoria e linha do tempo de transições com `from_status`, `to_status`, `user_id`, `event_type`, `notes` e `metadata JSONB`.
    - RLS e FORCE RLS ativados compulsoriamente nas 3 tabelas com a política canônica `tenant_isolation_policy`.
  - **Máquina de Estados Estrita (`@carx/shared/schemas.ts`)**:
    - Mapa `ALLOWED_WORK_ORDER_TRANSITIONS` e função `isValidWorkOrderTransition`.
    - Bloqueio terminante de transições inválidas com **HTTP 422 Unprocessable Entity** (ex: `QUOTE ➔ DELIVERED` é sumariamente rejeitado).
    - Bloqueio de qualquer transição posterior a partir de estados terminais (`DELIVERED` e `CANCELED`).
  - **Serviço de Negócio (`apps/api/src/work-orders/work-order-service.ts`)**:
    - `create`: geração atômica de `os_number` sequencial por loja, gravação do evento `CREATED` e cálculo de progresso automático.
    - `list`: busca paginada com filtros por status, cliente, veículo, técnico e busca textual (placa, cliente, os_number).
    - `getById`: detalhes completos com cliente, veículo, técnico, itens e histórico da linha do tempo.
    - `transitionStatus`: validação rigorosa da máquina de estados, atualização de timestamps correspondentes e inserção de evento imutável em `work_order_events`.
    - `getPublicTracking`: endpoint de acompanhamento público seguro sem necessidade de login.
    - Auditoria imutável via `auditService.record`.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `GET /work-orders`, `POST /work-orders`, `GET /work-orders/:id`, `PUT /work-orders/:id`, `PATCH /work-orders/:id/status`.
    - `GET /work-orders/tracking/:token` (rota pública para o cliente final).
    - Guardas RBAC: técnico só acessa e altera ordens de serviço atribuídas a ele; gestores e owners têm visão ampla.
  - **Validação Automatizada com Sucesso**:
    - 11 novos testes dedicados em [`apps/api/src/work-orders/work-orders.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/work-orders/work-orders.test.ts).
    - **Total Consolidado da API CarX**: **153/153 testes passando com 100% de sucesso** em 20 suítes completas.

---

### [x] T3.4 — Pagamentos, Adiantamentos (Sinal) e Transações Atômicas `(Concluído)`
- **Descrição:** Gestão financeira de pagamentos de OS realizada no banco em transação atômica, eliminando a antiga race condition do legado.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 157)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L157)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.4 (Linhas 599–602)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L599-L602)
- **Entrega:** Tabelas `payments` e `deposits`, com cálculo de saldo devedor, estorno, método (Pix, Cartão, Dinheiro) e controle de sinal.
- **Pronto quando:** Teste de concorrência disparando duas liquidações simultâneas na mesma OS calcula o saldo sem duplicidade ou valor negativo.
- **Status da Validação:**
  - **Migration 014 (`014_payments_deposits.up.sql` e `014_payments_deposits.down.sql`)**:
    - Tabelas `payments` e `deposits` criadas com isolamento RLS e `FORCE ROW LEVEL SECURITY`.
    - Triggers de auditoria e validação de tenant isolado (`tenant_isolation_policy`).
    - Índices otimizados: `idx_payments_tenant_wo`, `idx_payments_tenant_status`, `idx_deposits_tenant_customer`, `idx_deposits_tenant_wo`.
    - Validação de isolamento de banco via `npm --prefix apps/api run test:rls` aprovado com 8/8.
  - **Camada de Domínio e Contratos (`packages/shared/src/schemas.ts`)**:
    - Tipos e schemas Zod estritos: `PaymentDto`, `CreatePaymentInputSchema`, `RefundPaymentInputSchema`, `DepositDto`, `CreateDepositInputSchema`, `ApplyDepositInputSchema`, `WorkOrderFinancialSummaryDto`.
  - **Serviço de Negócio (`apps/api/src/billing/payment-service.ts`)**:
    - `processWorkOrderPayment`: transação atômica serializada com lock pessimista (`SELECT ... FOR UPDATE`), rejeitando terminantemente pagamentos com valor zero, negativo (HTTP 400) ou que excedam o saldo restante da OS (HTTP 422). Atualiza `paid_cents` atomicamente e emite evento `PAYMENT_RECEIVED` na timeline da OS.
    - `refundPayment`: estorno total ou parcial com abate automático de `paid_cents`, atualização de status (`refunded` / `partially_refunded`), evento `PAYMENT_REFUNDED` e trilha de auditoria imutável via `auditService.recordPaymentRefund`.
    - `createDeposit`: captação de adiantamento/sinal de clientes com status inicial `held` e auditoria `DEPOSIT_RECEIVED`.
    - `applyDepositToWorkOrder`: aplicação atômica de sinal retido à OS, abatendo o saldo devedor, atualizando status para `applied` e gerando pagamento e evento unificados.
    - `getWorkOrderFinancialSummary`: cálculo exato em tempo real do total, desconto, valor final, valor pago, saldo devedor restante e flag `isFullyPaid`.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/payment-routes.ts`)**:
    - `POST /work-orders/:id/payments`: Registro atômico de pagamento.
    - `POST /payments/:id/refund`: Estorno total ou parcial de pagamento.
    - `GET /work-orders/:id/financial`: Resumo financeiro consolidado da OS.
    - `POST /deposits`: Registro de novo sinal/adiantamento retido.
    - `POST /deposits/:id/apply`: Aplicação de sinal à OS.
    - Rotas protegidas por RBAC (`owner`, `gestor`, `atendente`, `financeiro`, `superadmin`).
  - **Validação Automatizada com Sucesso**:
    - 12 testes dedicados em [`apps/api/src/billing/payments.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/billing/payments.test.ts) cobrindo:
      1. Rejeição de valor zero e negativo com HTTP 400.
      2. Rejeição de pagamento que excede o saldo com HTTP 422.
      3. **Comprovação do Critério de Aceite da Tarefa (Anti-Race Condition)**: duas liquidações concorrentes simultâneas de R$ 300 com `Promise.all` em uma OS de saldo R$ 500 aprovam exatamente 1 e rejeitam a concorrente com HTTP 422, resultando em saldo final estritamente íntegro de R$ 300 (e não R$ 600 como no legado).
      4. Quitação integral com quitação total (`isFullyPaid: true`).
      5. Estorno parcial com abate de saldo e auditoria imutável.
      6. Estorno total com status `refunded` e bloqueio de estorno posterior.
      7. Criação de sinal retido com status `held`.
      8. Aplicação de sinal à OS abatendo saldo e bloqueio de reutilização.
      9. Bloqueio RLS: Oficina Beta não consegue registrar pagamento em OS de Alpha (404).
      10. Bloqueio RLS: Oficina Beta não consulta financeiro de Alpha (404).
      11. Bloqueio RLS: Oficina Beta não estorna pagamento de Alpha (404).
      12. Bloqueio RLS: Oficina Beta não aplica sinal de Alpha (404).
    - **Total Consolidado da API CarX**: **165/165 testes passando com 100% de sucesso** em 21 suítes completas.

---

### [x] T3.5 — Controle de Estoque e Bobinas de Película (PPF e Insulfilm) `(Concluído)`
- **Descrição:** Controle granular de consumo de insumos por OS e gestão especializada de bobinas/rolos (metragem restante, lote e desperdício).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 158)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L158)
  - [CarX_Documento_Unico.md — Seção 6: Onda 2 / Item 6 (Linhas 215–216)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L215-L216)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.5 (Linhas 603–606)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L603-L606)
- **Assets Visuais:** [Gestor · Painel (Card de Alerta: Bobina de película G20 abaixo do mínimo)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:** Tabelas `materials`, `stock_movements` e `material_rolls` (com campo de metros lineares gastos por OS e baixa idempotente ao concluir a ordem).
- **Pronto quando:** Entregar a mesma OS múltiplas vezes abate o estoque apenas uma única vez e gera alerta visual quando a bobina atinge o nível crítico configurado.
- **Status da Validação:**
  - **Migration 015 (`015_stock_materials_rolls.up.sql` e `015_stock_materials_rolls.down.sql`)**:
    - Tabelas `materials`, `material_rolls`, `stock_movements` e `work_order_materials` criadas com isolamento via RLS e `FORCE ROW LEVEL SECURITY` (`tenant_isolation_policy`).
    - Validação de isolamento do banco via `npm --prefix apps/api run test:rls` aprovada com 8/8.
    - Suporte a metragem decimal (`current_meters`, `initial_meters`, `width_meters`), lotes de fabricação, status (`in_use`, `depleted`, `reserved`, `discarded`) e alerta configurável (`min_alert_meters`).
  - **Camada de Domínio e Contratos (`packages/shared/src/schemas.ts`)**:
    - DTOs e Schemas Zod: `MaterialDto`, `CreateMaterialInputSchema`, `UpdateMaterialInputSchema`, `MaterialRollDto`, `CreateMaterialRollInputSchema`, `StockMovementDto`, `CreateStockMovementInputSchema`, `WorkOrderMaterialDto`, `AllocateWorkOrderMaterialInputSchema`, `LowStockAlertDto`.
  - **Serviço de Negócio (`apps/api/src/stock/stock-service.ts`)**:
    - Gestão especializada de bobinas/rolos (PPF e Insulfilm) com rastreamento por lote, largura, metragem inicial e restante (`current_meters`), e alerta visual imediato quando a metragem atinge o nível crítico.
    - Registro atômico de movimentações físicas (`createStockMovement`) atualizando o saldo de `materials` e `material_rolls`.
    - **Rejeição Terminante de Saídas Excedentes**: tentativa de saída maior que o saldo em estoque é sumariamente rejeitada com **HTTP 422 Unprocessable Entity**.
    - **Comprovação do Critério de Aceite da Tarefa (Baixa Idempotente)**: `deductWorkOrderMaterials` consome os insumos e bobinas alocadas na OS. Se chamada repetidas vezes (ou ao entregar a mesma OS múltiplas vezes via transição `READY ➔ DELIVERED`), abate o estoque apenas na primeira execução (`alreadyDeducted: true`), sem duplicar baixas nem movimentações.
    - **Consistência Matemática Rigorosa**: `validateMaterialStockConsistency` comprova que `materials.current_stock` é estritamente idêntico à soma algébrica dos registros de `stock_movements`.
    - **Alertas de Nível Crítico**: `getLowStockAlerts` identifica tanto insumos gerais quanto bobinas de película em uso abaixo da metragem mínima de alerta.
  - **Integração de Máquina de Estados (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Transição de OS para status `DELIVERED` dispara automaticamente a rotina idempotente `deductWorkOrderMaterials`.
  - **Endpoints HTTP Fastify (`apps/api/src/routes/stock-routes.ts`)**:
    - `GET /materials`, `POST /materials`, `GET /materials/:id`, `PUT /materials/:id`.
    - `GET /materials/rolls`, `POST /materials/rolls`.
    - `GET /materials/movements`, `POST /materials/movements`.
    - `GET /materials/alerts/low-stock`.
    - `POST /work-orders/:id/materials`: Alocação de materiais/bobinas na OS.
    - `POST /work-orders/:id/deduct-materials`: Baixa manual ou acionada por evento.
  - **Validação Automatizada com Sucesso**:
    - 12 testes dedicados em [`apps/api/src/stock/stock.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/stock/stock.test.ts) cobrindo cadastro, gestão de bobinas, movimentações, rejeição de saídas excedentes (422), alocação na OS, baixa idempotente (dupla chamada abate 1 vez), consistência matemática e isolamento RLS entre inquilinos.
    - **Total Consolidado da API CarX**: **177/177 testes passando com 100% de sucesso** em 22 suítes completas.

---

### [x] T3.6 — Agenda Inteligente por Box e Agendamento Online `(Concluído)`
- **Descrição:** Agenda com alocação por box físico e profissional técnico, respeitando o tempo de serviço pelo porte do veículo para evitar choques de horário.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 159)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L159)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.6 (Linhas 607–610)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L607-L610)
- **Assets e Telas de Referência:**
  - [Gestor · Agenda (Ocupação por boxes, horários, status)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Agenda@2x.png)
- **Entrega:** Tabelas `appointments` e `bays`, com endpoint público de agendamento online (com proteção anti-bot e rate limit) que insere a proposta no status `QUOTE` com origem `ONLINE`.
- **Pronto quando:** Dois clientes são impedidos de agendar no mesmo box e mesmo horário simultaneamente.
- **Status da Validação:**
  - **Migration 016 (`016_bays_appointments.up.sql` e `016_bays_appointments.down.sql`)**:
    - Tabelas `bays` e `appointments` criadas com isolamento via RLS e `FORCE ROW LEVEL SECURITY` (`tenant_isolation_policy`).
    - Enriquecimento de `work_orders` com coluna `origin VARCHAR(30) NOT NULL DEFAULT 'INTERNAL'`.
    - Restrições de integridade temporal `CHECK (end_time > start_time)` e unicidade de nome de box por oficina (`uq_bays_tenant_name`).
    - Validação de isolamento do banco via `npm --prefix apps/api run test:rls` aprovada com 8/8.
  - **Camada de Domínio e Contratos (`packages/shared/src/schemas.ts`)**:
    - DTOs e Schemas Zod: `BayDto`, `CreateBayInputSchema`, `UpdateBayInputSchema`, `AppointmentDto`, `CreateAppointmentInputSchema`, `UpdateAppointmentInputSchema`, `PublicBookingInputSchema`, `PublicBookingResponseDto`, `BayAvailabilitySlotDto`.
  - **Serviço de Negócio (`apps/api/src/appointments/appointment-service.ts`)**:
    - Gestão física de boxes (`bays`) com ordenação e paleta de identificação visual.
    - **CRITÉRIO DE ACEITE (Prevenção de Choque de Horários)**: `checkBayConflict` bloqueia sobreposição de agendamento no mesmo box (`start_time < new_end_time AND end_time > new_start_time`) retornando **HTTP 409 Conflict** (`BayConflictError`).
    - Agendamento em boxes paralelos no mesmo horário aprovado com sucesso.
    - Reagendamento sem conflitos e liberação imediata do horário após cancelamento (`status = 'canceled'`).
    - Consulta de disponibilidade por box (`getBayAvailability`) para montagem da grade horária.
    - **CRITÉRIO DE ACEITE (Agendamento Online Público)**:
      - Rota pública sem necessidade de token JWT (`POST /public/book/:tenantSlug`).
      - Proteção anti-bot via honeypot (bloqueio com HTTP 400 `BotDetectedError`).
      - Cálculo de duração dinâmico somando os minutos de cada serviço conforme o porte do veículo (`size_class`).
      - Alocação automática do primeiro box livre quando omitido pelo cliente.
      - **CRITÉRIO DE SEGURANÇA (Imunidade a Injeção de Privilégios)**: cria OS estritamente com `status: 'QUOTE'`, `origin: 'ONLINE'`, `paid_cents: 0` e `technician_id: null` (impossível injetar status ou quitação de valores).
      - Emissão de link público com token de rastreio (`/work-orders/tracking/:token`).
  - **Endpoints HTTP Fastify (`apps/api/src/routes/appointment-routes.ts`)**:
    - `GET /bays`, `POST /bays`, `GET /bays/:id`, `PUT /bays/:id`, `DELETE /bays/:id`.
    - `GET /appointments`, `POST /appointments`, `GET /appointments/:id`, `PUT /appointments/:id`, `PATCH /appointments/:id/status`.
    - `GET /appointments/availability`.
    - `POST /public/book/:tenantSlug` e `POST /public/book`.
  - **Validação Automatizada com Sucesso**:
    - 12 testes dedicados em [`apps/api/src/appointments/appointments.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/appointments/appointments.test.ts) cobrindo criação de boxes, bloqueio de choques (409), boxes paralelos, reagendamento, cancelamento, agendamento online público, bloqueio de injeção de privilégios, honeypot anti-bot e isolamento RLS entre lojas.
    - **Total Consolidado da API CarX**: **189/189 testes passando com 100% de sucesso** em 23 suítes completas.

---

### [x] T3.7 — Laudo de Inspeção Digital (VCR), Checklist e Fotos `(Concluído)`
- **Descrição:** Vistoria visual digital do veículo no celular/tablet (VCR - Vehicle Condition Report): marcação touch dos pontos de avaria (riscos, amassados, trincas, lascas, repinturas), fotos antes/depois por ângulo guiado e checklist de entrada/saída.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.1: O que observei nas telas / Laudo (Linhas 312–313)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L312-L313)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.7 (Linhas 611–614)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L611-L614)
- **Assets e Telas de Referência:**
  - [Operador · Laudo de Inspeção (Mapa touch de avarias no celular, ângulos guiados)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Laudo%20de%20inspe%C3%A7%C3%A3o@2x.png)
- **Entrega:** Tabelas `inspections`, `inspection_damage_points` e `inspection_photos` com RLS, upload físico no MinIO/S3 para fotos e assinatura do cliente (sem Base64 persistido em colunas de texto no banco), e gerador de PDF vetorial do laudo com silhueta mapeada.
- **Pronto quando:** O PDF gerado abre com os pontos plotados sobre a silhueta do veículo, tabela descritiva com severidades, checklist de itens, fotos anexadas e assinatura do cliente, sem armazenar dados em Base64 no banco.
- **Status da Validação:**
  - **Migração 017 Aplicada com RLS Canônico**:
    - [`apps/api/src/database/migrations/017_inspections_vcr_photos.up.sql`](file:///d:/Repositorios/CarX/apps/api/src/database/migrations/017_inspections_vcr_photos.up.sql) e `.down.sql` 
    
    - `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e `tenant_isolation_policy` aplicados em todas as 3 tabelas e validados com 100% de aprovação em `test:rls`.
  - **Contratos e DTOs Compartilhados**:
    - Adicionados em [`packages/shared/src/schemas.ts`](file:///d:/Repositorios/CarX/packages/shared/src/schemas.ts): `InspectionDto`, `CreateInspectionInputSchema`, `UpdateInspectionInputSchema`, `AddDamagePointInputSchema`, `AddInspectionPhotoInputSchema`, `SignInspectionInputSchema`, `InspectionDamagePointDto`, `InspectionPhotoDto` e `InspectionChecklistItemSchema`.
  - **Serviço de Negócio VCR e PDFKit**:
    - [`apps/api/src/inspections/inspection-service.ts`](file:///d:/Repositorios/CarX/apps/api/src/inspections/inspection-service.ts):
      - CRUD de laudos de inspeção vinculado à OS e veículo.
      - Adição/remoção de pontos de avaria touch com coordenadas percentuais (`xPercent`, `yPercent`), peça, tipo e severidade.
      - Registro de fotos guiadas por ângulo (`phase: before/during/after`).
      - Assinatura digital do cliente convertida de Base64 para buffer binário e persistida fisicamente no MinIO (`carx-media`) via `storageService.uploadFile` com integridade garantida por UUID em `customer_signature_file_id` (sem persistência de Base64 em tabelas do banco de dados).
      - Gerador de PDF vetorial via `PDFKit`: silhueta automotiva vetorial em alta definição, plotagem de círculos numerados com halos coloridos por severidade (`low`, `medium`, `high`, `critical`), tabela detalhada de avarias, checklist com marcadores `[OK]` e `[ ! ]`, imagem da assinatura digital renderizada diretamente no documento e persistência do PDF no MinIO.
  - **Rotas Fastify Registradas**:
    - [`apps/api/src/routes/inspection-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/inspection-routes.ts) e registradas em `server.ts`:
      - `POST /inspections`
      - `GET /inspections/:id`
      - `GET /work-orders/:workOrderId/inspections`
      - `PATCH /inspections/:id`
      - `POST /inspections/:id/damage-points`
      - `DELETE /inspections/:id/damage-points/:pointId`
      - `POST /inspections/:id/photos`
      - `DELETE /inspections/:id/photos/:photoId`
      - `POST /inspections/:id/sign`
      - `POST /inspections/:id/generate-pdf`
      - `GET /inspections/:id/pdf` (download direto como `application/pdf`).
  - **Validação Automatizada com Sucesso**:
    - 13 testes dedicados em [`apps/api/src/inspections/inspections.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/inspections/inspections.test.ts) cobrindo criação de inspeção, consulta com relacionamentos, plotagem touch, remoção de pontos, anexos de fotos, assinatura física sem Base64 (validação de UUID regex), compilação do laudo PDF vetorial (> 1000 bytes e cabeçalho `%PDF-`), download direto e isolamento estrito RLS cross-tenant.
    - **Total Consolidado da API CarX**: **202/202 testes passando com 100% de sucesso** em 24 suítes completas.
    - **Typecheck Monorepo**: `pnpm typecheck` aprovado com 0 erros.

---

### [x] T3.8 — App do Técnico (PWA do Operador) `(Concluído)`
- **Descrição:** Interface otimizada para o chão de oficina em tema escuro: botões grandes (56–60px), fila priorizada ("Minha fila" vs "Toda a loja"), cronômetro oficial calculado no backend e fluxo sem bloqueios.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.3: Princípios do App do Operador (Linhas 328–338)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L328-L338)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.8 (Linhas 615–618)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L615-L618)
- **Assets e Telas de Referência:**
  - [Operador · Fila (Cards de serviços, alvos de toque, badge de retrabalho)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Fila@2x.png)
  - [Operador · Execução (Cronômetro Space Grotesk, stepper de etapas, botão gigante)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Execu%C3%A7%C3%A3o@2x.png)
- **Entrega Concluída:**
  - **Migration 018 (`018_technician_timers_execution.up.sql`)**:
    - Tabela `work_order_timers` com RLS obrigatório, `FORCE ROW LEVEL SECURITY`, política canônica `tenant_isolation_policy` e integridade referencial.
    - Colunas `is_rework` (boolean) e `rework_reason` (text) em `work_orders` com índice composto `idx_work_orders_tenant_rework`.
    - Índices otimizados para consulta em tempo real da bancada de produção: `idx_work_order_timers_active` e `idx_work_order_timers_wo`.
  - **Contratos e DTOs Zod (`packages/shared/src/schemas.ts`)**:
    - Tipos TypeScript e esquemas Zod completos: `WorkOrderTimerDto`, `TechnicianQueueItemDto`, `StartTimerInputSchema`, `PauseTimerInputSchema`, `StartWithChecklistInputSchema` e `SetReworkInputSchema`.
  - **Serviço de Negócio (`apps/api/src/technician/technician-service.ts`)**:
    - Fila priorizada com escopos `mine` ("Minha fila") e `all` ("Toda a loja"), integrando dados do veículo, cliente, serviços a executar e box alocado.
    - **Priorização Máxima de Retrabalho**: Ordens de serviço marcadas com `is_rework = true` aparecem no topo absoluto da fila (`ORDER BY wo.is_rework DESC`).
    - **Cronômetro Oficial no PostgreSQL (Imune a Fraudes)**: Cálculo atômico via `accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER)`, sem confiar em relógios de clientes/smartphones.
    - **Critério Fundamental**: Fechar o app, desligar o celular ou recarregar a página mantém o tempo decorrido perfeitamente sincronizado com o servidor.
    - **Regra de Foco Único**: Iniciar o cronômetro de uma nova OS pausa automaticamente qualquer timer anterior ativo do técnico (`pauseAllRunningTimersForTechnician`).
    - **Ação Inteligente "Fazer checklist e iniciar" (`/start-with-checklist`)**: Critério "Nunca bloquear sem saída", permitindo preenchimento de checklist de entrada na hora e início imediato do cronômetro sem depender de aprovações prévias da recepção.
  - **Rotas Fastify (`apps/api/src/routes/technician-routes.ts`)**:
    - `GET /technician/queue` (listagem filtrada por scope).
    - `POST /technician/work-orders/:id/start` (início de contagem oficial e transição de OS para `IN_PROGRESS`).
    - `POST /technician/work-orders/:id/pause` (pausa com acúmulo de segundos e motivo).
    - `POST /technician/work-orders/:id/resume` (retomada da contagem oficial).
    - `POST /technician/work-orders/:id/stop` (finalização do cronômetro).
    - `GET /technician/work-orders/:id/timer` (consulta consolidada de tempo em tempo real).
    - `POST /technician/work-orders/:id/start-with-checklist` (checklist instantâneo + início).
    - `PATCH /technician/work-orders/:id/rework` (marcação de OS como retrabalho).
  - **Suíte de Testes Automatizada (`apps/api/src/technician/technician.test.ts`)**:
    - 10 testes dedicados cobrindo fila por escopo, priorização no topo de retrabalho, início/pausa/retomada/finalização de cronômetro, persistência do tempo ao recarregar, pausa automática ao trocar de tarefa, checklist integrado e isolamento RLS cross-tenant.
    - **Total Consolidado da API CarX**: **212/212 testes passando com 100% de sucesso** em 25 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.9 — Controle de Qualidade (QA), Garantia e Certificado com QR `(Concluído)`
- **Descrição:** Gate de validação pós-serviço (QA Audit) para liberação de entrega e emissão de Certificado de Garantia com QR Code público de autenticidade (Passaporte do Veículo).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 2 / Item 7 (Linhas 216–217)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L216-L217)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.9 (Linhas 619–622)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L619-L622)
- **Entrega Concluída:**
  - **Migration 019 (`019_qa_warranties_passports.up.sql`)**:
    - Tabela `qa_audits`: Auditoria de qualidade pós-serviço (`work_order_id`, `inspector_id`, `status` [`approved`, `rejected_rework`], `score` [1 a 5 estrelas], `checklist_items` JSONB, `rework_reason`, `notes`).
    - Tabela `warranties`: Certificados de garantia e passaporte digital (`work_order_id`, `customer_id`, `vehicle_id`, `service_id`, `service_name`, `material_roll_id`, `material_lot_number`, `warranty_months`, `starts_at`, `expires_at`, `verification_token` UUID único, `pdf_file_id`, `status` [`active`, `revoked`, `expired`]).
    - RLS ativado e forçado compulsório (`FORCE ROW LEVEL SECURITY`) com a política canônica `tenant_isolation_policy`.
  - **Contratos e DTOs Zod (`packages/shared/src/schemas.ts`)**:
    - `QaAuditDto`, `CreateQaAuditSchema`, `WarrantyDto`, `CreateWarrantySchema`, `PublicVehiclePassportDto`, `QaStatusEnum`, `WarrantyStatusEnum`.
  - **Serviço de Negócio (`apps/api/src/qa/qa-service.ts`)**:
    - `createAudit`: Aprovação transiciona OS para `READY` e registra trilha imutável `QA_APPROVED`; reprovação marca `is_rework = true`, grava motivo e retorna OS para `IN_PROGRESS` no topo da fila.
    - `createWarranty`: Registro da garantia com lote do material/bobina, cálculo atômico de validade e compilação automática do certificado em PDF.
    - `generateWarrantyPdf`: Motor server-side com `pdfkit` e `qrcode` compilando certificado com marca da oficina, dados do carro, termos de garantia e QR Code vetorial escaneável para `/v/:token`. O PDF é armazenado fisicamente no MinIO (`StorageFileCategory.WARRANTY`).
    - `verifyPublicPassport`: Endpoint de consulta pública com **blindagem estrita à LGPD** (mascara a placa como `OPR-***6`, oculta CPF, e-mail e telefone do cliente, e exibe dados de autenticidade, lote do material aplicado e status).
    - `revokeWarranty`: Revogação formal de cobertura com justificativa, refletida em tempo real na consulta pública.
  - **Rotas Fastify (`apps/api/src/routes/qa-routes.ts`)**:
    - `GET /public/passports/:token` e `GET /v/:token` (rotas públicas sem JWT com proteção LGPD).
    - `POST /qa/audits` (restrito a Owner/Gestor).
    - `GET /qa/audits/:id` e `GET /work-orders/:workOrderId/qa-audits`.
    - `POST /warranties`, `GET /warranties/:id`, `GET /work-orders/:workOrderId/warranties`, `GET /vehicles/:vehicleId/warranties`.
    - `POST /warranties/:id/revoke` e `GET /warranties/:id/pdf` (download/stream de PDF).
  - **Validação Automatizada com Sucesso**:
    - 9 testes dedicados em [`apps/api/src/qa/qa.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/qa/qa.test.ts) cobrindo aprovação no QA, rejeição com retrabalho, emissão de garantia com lote, verificação pública por QR Code com LGPD blindada, download de PDF com cabeçalho `%PDF-`, revogação e isolamento RLS cross-tenant.
    - **Total Consolidado da API CarX**: **221/221 testes passando com 100% de sucesso** em 26 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.10 — Pesquisa NPS, Pós-Venda e Lembretes de Revisão `(Concluído)`
- **Descrição:** Coleta de NPS por token único (sem necessidade de login do cliente), classificação em Promotor/Neutro/Detrator e alertas de revisões de garantia periódicas.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 161)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L161)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.10 (Linhas 623–626)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L623-L626)
- **Assets e Telas de Referência:**
  - [Gestor · Relatórios NPS (Score NPS, detratores, promotores, satisfação)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Relat%C3%B3rios%20NPS@2x.png)
- **Entrega Concluída:**
  - **Migration 020 (`020_nps_surveys_reminders.up.sql`)**:
    - Tabela `nps_surveys`: Pesquisas de satisfação com token UUID único, notas de 0 a 10, classificação em `promoter`, `passive`, `detractor`, comentários e marcação de clique em avaliação do Google.
    - Tabela `maintenance_reminders`: Lembretes agendados de pós-venda e garantia (`warranty_check`, `maintenance_return`, `seasonal_care`) com data de agendamento, status (`scheduled`, `sent`, `completed`, `canceled`) e vínculo com OS/Garantia.
    - Habilitação compulsória de **Row Level Security (RLS)** e `FORCE ROW LEVEL SECURITY` com a política `tenant_isolation_policy`.
  - **Contratos e DTOs Zod (`packages/shared/src/schemas.ts`)**:
    - `NpsSurveyDto`, `CreateNpsSurveySchema`, `AnswerNpsSurveySchema`, `NpsMetricsDto`, `MaintenanceReminderDto`, `CreateReminderSchema`, `UpdateReminderStatusSchema`.
  - **Serviço de Negócio (`apps/api/src/nps/nps-service.ts`)**:
    - `createSurvey`: Geração de pesquisa com token público e idempotência total por OS.
    - `getSurveyByToken`: Consulta pública sem JWT com blindagem LGPD (primeiro nome do cliente e placa mascarada `OPR-***6`).
    - `answerSurvey`:
      - **Critério de Aceite Fundamental**: Responder pela segunda vez ao mesmo token é estritamente bloqueado no backend com HTTP 409 Conflict (`SURVEY_ALREADY_ANSWERED`), impedindo adulterações ou duplicidade.
      - Classificação automática: Promotor (9-10), Neutro/Passivo (7-8), Detrator (0-6).
      - Promotores recebem incentivo e redirecionamento para o Google Meu Negócio da loja.
      - Detratores disparam alerta imediato de resgate registrado na trilha de auditoria (`NPS_DETRACTOR_ALERT`).
    - `getMetrics`: Cálculo matemático consolidado do Score NPS (-100 a +100), taxa de resposta, % de promotores, passivos e detratores e média aritmética das notas direto no PostgreSQL.
    - `createReminder`, `listReminders`, `updateReminderStatus`: Gestão da régua periódica de pós-venda.
  - **Rotas Fastify (`apps/api/src/routes/nps-routes.ts`)**:
    - `GET /public/nps/:token` e `POST /public/nps/:token` (públicas sem autenticação).
    - `POST /nps/surveys`, `GET /nps/surveys` e `GET /nps/metrics` (painel do gestor).
    - `POST /maintenance/reminders`, `GET /maintenance/reminders` e `PATCH /maintenance/reminders/:id/status`.
  - **Validação Automatizada com Sucesso**:
    - 11 testes dedicados em [`apps/api/src/nps/nps.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/nps.test.ts) cobrindo criação, idempotência, resposta pública, bloqueio de resposta duplicada (409), alerta de detrator, scorecard do gestor, lembretes de revisão e isolamento RLS cross-tenant.
    - **Total Consolidado da API CarX**: **232/232 testes passando com 100% de sucesso** em 27 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.11 — Financeiro, Comissões e Relatórios no Servidor `(Concluído)`
- **Descrição:** Cálculo de DRE, margem real por serviço, comissões de técnicos e ranking de produtividade (streak baseado em histórico de QA) calculado exclusivamente por SQL no backend.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: O que o código faz hoje / Comissões e Ranking (Linhas 55–57)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L55-L57)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.11 (Linhas 627–630)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L627-L630)
- **Assets Visuais:** [Gestor · Painel (Faturamento convertido, pátio ao vivo)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:** Endpoints para DRE e extrato de comissões (`commissions_rules`, `commissions_entries`), com streak de dias sem retrabalho calculado de fatos auditados.
- **Pronto quando:** O valor de faturamento do dashboard bate rigorosamente com a soma dos pagamentos e custos de materiais, sem depender de agregação em memória no browser.
- **Status da Validação:**
  - **Migration 021 Criada e Aplicada**:
    - `commission_rules`: regras flexíveis por técnico e/ou serviço, tipos percentual (`percentage`) ou valor fixo em centavos (`fixed_cents`), e bases `gross_service` ou `net_service_minus_material` (dedução automática de CMV).
    - `commission_entries`: extrato com histórico atômico, status (`pending`, `paid`, `canceled`), timestamp de liquidação `paid_at` e auditoria imutável.
    - Políticas de RLS (`ENABLE` + `FORCE ROW LEVEL SECURITY`) e integridade referencial com validação aprovada em `test:rls`.
  - **DRE Gerencial no Servidor (`GET /reports/dre`)**:
    - Calculado exclusivamente via agregações SQL nativas no PostgreSQL, eliminando a falha arquitetural legada de cálculo em memória no browser.
    - Métricas: Receita Bruta, Descontos, Receita Líquida, Custos de Materiais (CMV das bobinas/insumos consumidos via `stock_movements`), Custos de Comissões, Margem de Contribuição (R$ e %) e Inadimplência/A Receber.
  - **Ranking de Técnicos e Streak Real Auditado (`GET /reports/technicians/ranking`)**:
    - Ranking ordenado por faturamento produzido, total de OS entregues e média de notas no QA.
    - **Critério Fundamental**: Streak de dias sem retrabalho calculado em tempo real a partir de fatos auditados (`qa_audits.status = 'rejected_rework'` e `work_orders.is_rework = true`), erradicando de forma definitiva o valor fictício armazenado no `localStorage` do sistema antigo.
  - **Gestão de Comissões (`/commissions/rules` e `/commissions/entries`)**:
    - Criação de regras com validação de limites (bloqueio > 100%), apuração automática na conclusão da OS e liquidação com bloqueio estrito de pagamento repetido (HTTP 400).
  - **Testes Automatizados**:
    - 9 testes em `apps/api/src/financial/financial.test.ts` cobrindo regras, apuração bruta e líquida com dedução de material, valor fixo, extrato por role, liquidação, DRE, streak auditado e isolamento multi-tenant.
    - **Total Consolidado da API CarX**: **241/241 testes passando com 100% de sucesso** em 28 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.12 — Atualização em Tempo Real (SSE / WebSockets) `(Concluído)`
- **Descrição:** Barramento de eventos pontuais leves para atualização em tempo real do Monitor TV e da Fila do Operador, eliminando o padrão ineficiente de "refetch de lista inteira".
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.4: Problema 5 (Linha 71)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L71)
  - [CarX_Documento_Unico.md — Seção 2: Stack / Tempo Real (Linha 100)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L100)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.12 (Linhas 631–634)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L631-L634)
- **Assets e Telas de Referência:**
  - [TV da Loja (Monitor de produção com veículos em execução, horários e barra inferior)](file:///d:/Repositorios/CarX/rebraind/TV%20da%20loja@2x.png)
- **Entrega:** Canal SSE (Server-Sent Events) ou WebSocket autenticado emitindo payloads compactos (`work_order.updated`, `work_order.ready`).
- **Pronto quando:** Concluir uma etapa no celular do operador move o card correspondente na TV em menos de 500ms sem recarregar a página inteira, e a TV de uma loja nunca recebe eventos de outra.
- **Status da Validação:**
  - **Hub de Tempo Real (`RealtimeHub`)**:
    - Gerenciador singleton em memória com canais estritamente isolados por `tenant_id`.
    - Suporte a cabeçalhos nativos SSE (`text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` para Caddy/Nginx).
    - Desconexão limpa: captura o evento `close` da requisição e desaloca o stream do mapa imediatamente (zero memory leaks).
    - Heartbeat automático periódico (`: heartbeat <timestamp>\n\n`) com `unref()` para manter conexões e proxies reversos vivos sem travar testes ou encerramento de processos.
  - **Rotas Fastify (`realtime-routes.ts`)**:
    - `GET /realtime/events`: Canal contínuo SSE. Suporta tanto cabeçalho padrão `Authorization: Bearer <token>` quanto query param `?token=<jwt>` (indispensável para clientes web com `EventSource` nativo do browser).
    - `POST /realtime/publish`: Disparo manual de eventos restrito a `owner` e `gestor`.
    - `GET /realtime/stats`: Métricas de conexões ativas por tenant para observabilidade.
  - **Eventos Pontuais Integrados no Núcleo de OS**:
    - `work_order.updated`: Emitido a cada transição de estado da OS com payload compacto (`workOrderId`, `osNumber`, `status`, `previousStatus`, `progress`, `vehiclePlate`, `technicianId`, `technicianName`).
    - `work_order.ready`: Emitido especificamente na transição para `READY` para notificar a TV e recepcionistas com dados do carro e cliente.
  - **Testes Automatizados**:
    - 7 testes dedicados em [`apps/api/src/realtime/realtime.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/realtime/realtime.test.ts) cobrindo autenticação, handshake, recepção formatada, isolamento multi-tenant (Oficina Beta nunca recebe eventos da Oficina Alpha), disparo em cascata via `workOrderService.transitionStatus`, cleanup de memória e estatísticas.
    - **Total Consolidado da API CarX**: **248/248 testes passando com 100% de sucesso** em 29 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.13 — Portal do Cliente Seguro ("Meu Veículo") `(Concluído)`
- **Descrição:** Reestruturação do portal do cliente com login seguro via OTP (código temporário via WhatsApp ou e-mail), eliminando a vulnerabilidade de login apenas por telefone e o antigo modo demonstração com dados fictícios.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: Portal Meu Veículo (Linha 61)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L61)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.13 (Linhas 635–638)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L635-L638)
- **Entrega Concluída:**
  - **Migration 022 (`022_customer_portal_otps.up.sql`)**: Tabela `customer_portal_otps` com RLS ativado e forçado compulsório (`FORCE ROW LEVEL SECURITY`), política canônica `tenant_isolation_policy`, campos `channel` (`whatsapp`, `email`), `otp_hash` (HMAC-SHA256 com pepper do servidor), `attempts_count`, `max_attempts` (5), `expires_at` (10 minutos), `consumed_at` e índices de busca rápida.
  - **Autenticação Segura com Proteção Anti-Enumeração**:
    - `POST /portal/auth/request-otp`: Sempre retorna HTTP 200 `{"message": "Se o número informado estiver cadastrado, um código de verificação foi enviado."}` mesmo para números não cadastrados, blindando a privacidade dos clientes contra enumeração de números.
    - `POST /portal/auth/verify-otp`: Validação em tempo constante (`timingSafeEqual`) contra timing attacks, limitação estrita de 5 tentativas por código gerado com bloqueio imediato por brute-force (HTTP 429), e emissão de JWT delimitado com `scope: 'customer_portal'`.
  - **Erradicação Definitiva do Modo Demonstração Fake**:
    - O portal consome dados reais filtrados no banco de dados via RLS. Clientes sem OS recebem `workOrders: []` (zero dados falsos/mockados em produção).
  - **Isolamento e Segurança Reforçada**:
    - Tokens do portal recebem HTTP 403 em qualquer endpoint interno de oficina/gestor.
    - Tentativas cross-customer (Cliente B tentando acessar OS do Cliente A) retornam HTTP 404 (Resource Not Found).
    - Tentativas cross-tenant RLS (Cliente da Loja A tentando acessar Loja B) retornam HTTP 403 Forbidden.
  - **Endpoints HTTP do Portal (`apps/api/src/routes/customer-portal-routes.ts`)**:
    - `POST /portal/auth/request-otp` e `POST /portal/auth/verify-otp`.
    - `GET /portal/me` (dados do cliente autenticado).
    - `GET /portal/vehicles` (veículos associados).
    - `GET /portal/work-orders` e `GET /portal/work-orders/:id` (detalhes, serviços e totalizadores).
    - `GET /portal/work-orders/:id/timeline` (linha do tempo dos eventos da OS).
    - `GET /portal/work-orders/:id/photos` (fotos de inspeção guiadas antes/depois).
    - `GET /portal/warranties` (certificados de garantia e passaportes digitais).
  - **Testes Automatizados com Sucesso**:
    - 20 testes dedicados em [`apps/api/src/customer-portal/customer-portal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customer-portal/customer-portal.test.ts) passando 100%.
    - **Total Consolidado da API CarX**: **268/268 testes passando com 100% de sucesso** em 30 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [x] T3.14 — API Pública e Webhooks Reais `(Concluído)`
- **Descrição:** Substituição do antigo mock em localStorage por uma camada de integração real com autenticação por chave de API (com hash no banco) e webhooks assinados com HMAC.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: API Pública e Webhooks (Linha 54)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L54)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.14 (Linhas 639–642)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L639-L642)
- **Entrega Concluída:**
  - **Migration 023 (`023_api_keys_webhooks.up.sql`)**:
    - `api_keys`: ampliação de prefixo para formato seguro de exibição (`carx_live_xxxx...yyyy`), colunas `status` (`active`, `revoked`), `revoked_at`, `rate_limit_per_minute` (1 a 1000) e `created_by`. Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY`.
    - `webhook_endpoints`: campos `name`, `description`, `status` (`active`, `inactive`, `failing`) e `failure_count`.
    - `webhook_deliveries`: histórico detalhado de entregas com `signature` HMAC, `status` (`pending`, `success`, `failed`, `retrying`), `attempts`, `max_attempts` (3), `next_retry_at`, `delivered_at` e `failed_at`.
  - **Segurança de Chaves e Hash no Banco**:
    - Geração criptográfica com 32 bytes de entropia (`carx_live_<64 hex chars>`).
    - O token em texto plano é retornado uma única vez no momento da criação.
    - O banco persiste exclusivamente o hash SHA-256 (`key_hash`). Nem o token nem o hash são expostos em listagens.
  - **Critério Obrigatório — Revogação Imediata**:
    - Chave revogada (`DELETE /integrations/api-keys/:id`) para de funcionar no mesmo instante (HTTP 401 Unauthorized `Chave de API revogada`).
  - **Escopos Granulares e Rate Limiting**:
    - Controle fino de permissões (`read:work_orders`, `write:work_orders`, `read:customers`, `read:nps`, `*`). Acesso sem escopo necessário é bloqueado com HTTP 403 Forbidden.
    - Rate limit em janela deslizante por chave com injeção automática dos cabeçalhos padrão de mercado: `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`. Excesso bloqueado com HTTP 429 (`RATE_LIMIT_EXCEEDED`).
  - **Webhooks com Assinatura HMAC-SHA256**:
    - Disparo de eventos reais com segredo exclusivo (`whsec_...`).
    - Cabeçalhos transmitidos: `X-CarX-Signature: sha256=<hmac_hex>`, `X-CarX-Event`, `X-CarX-Delivery`, `X-CarX-Timestamp`.
  - **Critério Obrigatório — Reentrega com Backoff e Log**:
    - Webhook com falha (HTTP 4xx/5xx ou queda de rede) gera delivery com `status = 'retrying'` e `next_retry_at` agendado com backoff exponencial.
    - Registro detalhado em `webhook_deliveries` com tempo de resposta em milissegundos e código de status recebido.
    - Reenvio manual via `POST /integrations/webhooks/deliveries/:deliveryId/retry` incrementando `attempts`.
  - **API Pública v1 e OpenAPI 3.0 / Swagger UI**:
    - Endpoints sob `/v1/*` (`/v1/work-orders`, `/v1/work-orders/:id`, `/v1/customers`, `/v1/nps`).
    - Criação de OS integrada via `POST /v1/work-orders` com numeração sequencial por tenant e disparo automático de webhook em background.
    - Especificação OpenAPI 3.0 em `GET /v1/openapi.json`.
    - Interface Swagger UI interativa com tema Dark CarX em `GET /docs`.
  - **Validação Automatizada com Sucesso**:
    - 19 testes dedicados em [`apps/api/src/integrations/integrations.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/integrations/integrations.test.ts) passando 100%.
    - **Total Consolidado da API CarX**: **287/287 testes passando com 100% de sucesso** em 31 suítes completas.
    - **Typecheck Monorepo**: `tsc -b` aprovado com 0 erros.

---

### [ ] T3.15 — Frontend: Troca da Camada de Dados e Adoção do Design System `(Em Progresso: Telas 1, 2 e 3 de 10 Concluídas)`
- **Descrição:** Migração das telas existentes do OsSystem no `apps/web`: remoção completa do `@supabase/supabase-js`, adoção do TanStack Query com API tipada e aplicação dos componentes do `packages/ui`. Executado tela por tela.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Frontend (Linha 99)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L99)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.15 (Linhas 643–646)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L643-L646)
- **Assets de Telas:** Todos os mockups de [rebraind/](file:///d:/Repositorios/CarX/rebraind/).
- **Entrega:** Telas migradas para TypeScript consumindo a nova API: Painel do Gestor, Nova OS, Agenda, Fila do Operador, Execução, Laudo, Relatórios e Monitor TV.
- **Pronto quando:** O comando `grep -r "supabase" apps/web` retorna 0 ocorrências e o `localStorage` armazena exclusivamente preferências de tema ou UI.
- **Status do Progresso das Telas:**
  - [x] **Infraestrutura Base & API Client (`apps/web/src/services/api.ts`)**:
    - Instalação do `@tanstack/react-query` v5 e instanciação do `QueryClientProvider` em `main.jsx`.
    - Cliente HTTP tipado centralizando endpoints de autenticação, ordens de serviço, clientes, veículos, catálogo, agenda, app do técnico, QA, relatórios, auditoria e tempo real (SSE).
    - Interceptor automático com renovação silenciosa de tokens (`/auth/refresh`) e injeção de headers multitenant (`x-tenant-id`, `x-tenant-slug`).
    - Integração de `@carx/ui` e presets de tema CarX (`carxTailwindPreset`) no Tailwind e Vite.
  - [x] **Tela 1: Login & Autenticação da Loja (`apps/web/src/pages/LoginPage.tsx` e `AuthContext.tsx`)**:
    - Supabase erradicado completamente do módulo de autenticação.
    - Suporte a credenciais corporativas com e-mail, senha e slug opcional de loja.
    - Suporte completo ao fluxo de 2FA TOTP (Google Authenticator / Authy) com campo numérico dinâmico de 6 dígitos.
    - Redirecionamento dinâmico baseado em papéis (`/operador` para técnicos e `/` para gestores/owners).
    - Design System Dark Volt CarX aplicado com componentes `Button`, `Input`, `Card`, `Badge` de `@carx/ui`.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 2: Painel do Gestor (Dashboard & Pátio ao Vivo — `apps/web/src/pages/Dashboard.tsx`)**:
    - Migrado 100% de `Dashboard.jsx` para TypeScript e `@tanstack/react-query`.
    - Erradicação de hooks legados baseados em Supabase (`useOrders`, `useClients`, `useCatalog`).
    - Consumo em tempo real da API Fastify: `api.workOrders.list()`, `api.reports.getDre()`, `api.reports.getNpsMetrics()`.
    - Pátio Operacional ao Vivo (Kanban) dividido em 4 colunas industriais: *Check-in & Fila*, *Em Execução*, *Inspeção QA* e *Prontos p/ Retirada*.
    - Integração com Server-Sent Events (SSE) para atualização instantânea em menos de 500ms dos cards sem reload da página.
    - Cards executivos: Faturamento Líquido (DRE oficial do servidor), Total de Carros no Pátio, Serviços em Execução e Pontuação NPS.
    - Modal de Detalhes da OS interativo com dados do veículo, cliente, técnico encarregado e valores em R$.
    - Estado de pátio vazio com componente oficial `EmptyState` de `@carx/ui`.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 3: Nova OS e Orçamentos (`OrdensServico.tsx` e `NovoOrcamentoModal.tsx`)**:
    - Wizard de 4 passos com Design System Dark Volt CarX (`Button`, `Input`, `Card`, `Badge`).
    - Passo 1: Busca em tempo real e cadastro ágil de cliente (`api.customers`).
    - Passo 2: Seleção e cadastro ágil de veículo com porte (`Hatch`, `Sedan`, `SUV`, `Pickup`, `Esportivo`, `Moto`) vinculado ao cliente (`api.vehicles`).
    - Passo 3: Catálogo dinâmico de serviços com precificação e tempos estimados (`api.catalog`).
    - Passo 4: Resumo comercial, cálculo de desconto, agendamento de data/hora, notas técnicas e registro de sinal/adiantamento atômico (`api.payments.create`).
    - Emissão de OS em status `QUOTE` (Orçamento) ou `APPROVED` (Aprovada) via `api.workOrders.create`.
    - Gestão de Ordens com listagem paginada, filtros por status, busca por placa/cliente/número, transição de status (`CHECKED_IN`, `DELIVERED`), modal de quitação de saldo e detalhes completos da OS.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [ ] **Tela 4: Agenda Inteligente por Box** `(Próxima)`
  - [ ] **Tela 5: Fila do Operador / PWA do Técnico**
  - [ ] **Tela 6: Execução, Checklist de Entrada e Cronômetro Oficial**
  - [ ] **Tela 7: Laudo de Inspeção Digital e QA**
  - [ ] **Tela 8: Relatórios (DRE no Servidor, Ranking com Streak Auditado e NPS)**
  - [ ] **Tela 9: Monitor TV da Loja**
  - [ ] **Tela 10: Portal do Cliente Seguro ("Meu Veículo")**

---

### [ ] T3.16 — Testes de Ponta a Ponta (E2E) dos Fluxos Críticos
- **Descrição:** Suíte de testes automatizados com Playwright cobrindo todo o ciclo operacional automotivo e o isolamento entre tenants.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 7: Fase 7 (Linhas 231–234)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L231-L234)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.16 (Linhas 647–650)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L647-L650)
- **Entrega:** Teste E2E cobrindo: Criação da OS ➔ Agendamento ➔ Checklist/VCR ➔ Execução pelo Técnico ➔ QA ➔ Pagamento ➔ Emissão do Certificado ➔ NPS.
- **Pronto quando:** A suíte de testes executa com sucesso no CI e bloqueia PRs em caso de quebra em qualquer transição de tela.

---

### [ ] T3.17 — Gateway de WhatsApp Próprio e Mensagens Transacionais
- **Descrição:** Integração com o container `carx-wa` através de uma interface de canal desacoplada (`MessageChannel`), permitindo disparo de mensagens da oficina e recebimento de respostas (NPS e aceite de orçamento). "No OperaBeauty fizemos um gateway copie ele para usar aqui se chama operabeauty-wa-gateway file:///d:/Repositorios/OperaBeauty"
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 13: Gateway de WhatsApp Próprio (Linhas 436–456)](file:/
  //d:/Repositorios/CarX/CarX_Documento_Unico.md#L436-L456)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.17 (Linhas 651–654)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L651-L654)
- **Entrega:** Driver `own-gateway` com fila BullMQ, pareamento via QR Code no painel da loja, limite de taxa por número, templates de mensagem parametrizados e opt-out automático ("SAIR").
- **Pronto quando:** Concluir uma OS dispara notificação com link para o cliente no WhatsApp, e a parada forçada do container do WhatsApp não derruba a API (mensagens aguardam na fila).

---

## 🔄 FASE 4 — Migração de Dados do Legado (ETL)

**Objetivo:** Script de migração para transportar com segurança o histórico das instâncias em produção do Supabase legado para o novo banco de dados relacional multitenant do CarX.

### [ ] T4.1 — Script de ETL e Ensaio de Carga
- **Descrição:** Script automatizado para ler tabelas do Supabase, normalizar campos JSONB em tabelas relacionais (`work_order_items`, `payments`), fazer upload das fotos antigas para o MinIO e atribuir o `tenant_id` da oficina.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 5: Fase 4 — Migração dos Dados (Linhas 191–196)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L191-L196)
- **Entrega:** Script `packages/etl/migrate.ts` com validação de consistência: contagem total de OS migradas, conciliação de valores financeiros e integridade de mídias.
- **Pronto quando:** O ensaio de migração em banco de staging replica 100% dos dados dos clientes atuais sem distorções de saldo ou orçamentos.

---

## 💰 FASE 5 — Produto SaaS Comercial & Faturamento

**Objetivo:** Habilitar os canais de aquisição de novas oficinas, cobrança recorrente e processo de onboarding self-service.

### [ ] T5.1 — Landing Page de Vendas de Alta Conversão
- **Descrição:** Landing page corporativa com build estático (SSG), SEO focado nos segmentos automotivos e captura de leads integrada ao Super Admin.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 12: Landing Page de Vendas (Linhas 404–434)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L404-L434)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.1 (Linhas 667–670)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L667-L670)
- **Assets Visuais:** Design com identidade Volt `#C8F52E` e Asfalto `#0E1116`, incorporando screenshots dos mockups de `rebraind/`.
- **Entrega:** Páginas `/`, `/precos`, `/recursos` e páginas verticais (`/para/ppf`, `/para/insulfilm`, `/para/estetica`, `/para/oficina`), com formulário de lead que consome `POST /public/leads`.
- **Pronto quando:** Um lead preenchido na landing page aparece imediatamente na aba de Leads do Super Admin com o botão "Converter em Oficina".

---

### [ ] T5.2 — Cobrança Recorrente Automática de Licenças
- **Descrição:** Integração do backend com gateway de pagamentos (Asaas, Mercado Pago ou Stripe) para cobrança automática das mensalidades do SaaS via Pix dinâmico, boleto e cartão de crédito recorrente.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.2 (Linhas 671–674)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L671-L674)
- **Entrega:** Geração de faturas periódicas, webhook seguro para liquidação de Pix em tempo real e atualização automática do contrato da loja.
- **Pronto quando:** O pagamento de uma fatura de teste via webhook reativa uma loja suspensa instantaneamente sem intervenção manual.

---

### [ ] T5.3 — Onboarding Self-Service Guiado por Segmento
- **Descrição:** Experiência de boas-vindas na qual o novo dono de oficina cria sua conta, escolhe seu nicho e inicia o período de testes de 14 dias com checklists e catálogo prontos.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 5: Fase 5 (Linhas 197–204)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L197-L204)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.3 (Linhas 675–678)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L675-L678)
- **Entrega:** Fluxo inicial guiado com checklist de primeiros passos (ex: "Cadastre seu primeiro veículo", "Abra sua primeira OS").
- **Pronto quando:** Um novo usuário realiza o cadastro e cria sua primeira OS completa em menos de 5 minutos sem auxílio de suporte.

---

## ⚡ FASE 6 — Diferenciais Competitivos em Ondas

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 6 (Linhas 205–229)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L205-L229).

### [ ] Onda 1 — Impacto Imediato (Primeiro Mês)
1. **WhatsApp Automático Transacional:** Mensagens de confirmação de agenda, envio de fotos de progresso e aviso de retirada.
2. **Orçamento Digital com Aceite Online:** Link exclusivo onde o dono do carro aprova os itens com registro de IP e paga sinal via Pix dinâmico.
3. **Pix Integrado para Ordens de Serviço:** Baixa instantânea na OS via conciliação por webhook.
4. **Consulta Automática de Placa:** Preenchimento instantâneo de marca, modelo, cor e ano ao digitar a placa.
5. **Portal do Cliente Seguro com OTP:** Acesso histórico e acompanhamento em tempo real sem senhas decoradas.

### [ ] Onda 2 — Domínio Especializado Automotivo
6. **Controle Fino de Bobinas (PPF/Insulfilm):** Associação do número de série do rolo ao certificado de garantia do cliente e cálculo de margem real por metro.
7. **Passaporte Digital do Veículo:** Certificado de garantia transferível com histórico de manutenções e QR Code antifraude.
8. **Agenda Inteligente com Ocupação por Box:** Previsão automática de horários baseada no histórico de tempo dos técnicos por porte de veículo.
9. **Motor de Reputação no Google:** Disparo automático de link para avaliação 5 estrelas no Google para clientes que deram NPS 9 ou 10.
10. **Mini-Site Institucional da Oficina (`minhaloja.carx.com.br`):** Portfólio de trabalhos recentes, fotos antes/depois e captação de orçamentos para o cliente.

### [ ] Onda 3 — Escala e Funcionalidades Avançadas
11. **Módulo Fiscal (NFS-e Automática):** Emissão automática da nota fiscal de serviço ao liquidar a OS.
12. **DRE Gerencial e Fluxo de Caixa Avançado:** Previsão de fluxo de caixa e cálculo consolidado de comissões por colaborador.
13. **Painel de Redes e Franquias (Multiunidade):** Visão corporativa unificada para gestores de múltiplas lojas.
14. **App do Técnico Offline-First Completo:** Operação total em galpões sem internet com sincronização em segundo plano.
15. **IA Aplicada:** Pré-detecção de avarias através de fotos de entrada e sugestão automática de orçamento.

---

## 🛡️ FASE 7 — Qualidade Contínua, Testes & Hardening

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 7 (Linhas 230–234)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L230-L234).

- [ ] **Testes de Isolamento Multitenant (CI Obrigatório):** Teste gerado dinamicamente para garantir que nenhuma query consulte dados sem o filtro de `tenant_id`.
- [ ] **Testes de Carga com k6:** Simulação de 100 conexões simultâneas enviando eventos de OS e atualizando telas de TV.
- [ ] **Auditoria de Segurança OWASP:** Validação contra Injeção de SQL, Cross-Site Scripting (XSS), IDOR e vazamento de segredos em logs.
- [ ] **Simulação Mensal de Desastre e Restauração:** Procedimento validado de recuperação de banco a partir de backup externo.

---

## 🚀 FASE 8 — Go-To-Market & Beta Fechado

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 8 (Linhas 235–240)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L235-L240).

- [ ] **Seleção do Grupo Beta:** Recrutamento de 3 a 5 oficinas parceiras em condições especiais em troca de homologação e feedbacks semanais.
- [ ] **Base de Conhecimento e Suporte:** Criação de tutoriais guiados em vídeo para o Operador e Gestor.
- [ ] **Validação dos Planos e Preços:** Homologação prática das faixas de preço sugeridas na Seção 6 de `CarX_Documento_Unico.md`.
- [ ] **Lançamento Oficial:** Abertura das inscrições públicas e transição do status de beta para produção.
