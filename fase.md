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
| **Fase 2** | Núcleo Multitenant, Autenticação e Super Admin | `[~] Em Andamento` | Fase 1 |
| **Fase 3** | Domínio Automotivo no Novo Backend (Eliminar Supabase/LocalStorage) | `[ ] Não Iniciado` | Fase 2 |
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

### [ ] T2.6 — Gestão de Planos, Limites e Feature Flags
- **Descrição:** Motor no backend para aplicar limites contratados por plano (número de colaboradores, unidades, limites de OS e franquia de WhatsApp).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Planos e Preços (Linhas 243–256)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L243-L256)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.6 (Linhas 554–557)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L554-L557)
- **Entrega:** Middleware de checagem de quotas com retorno de erro padronizado caso a oficina atinja o teto de usuários ou serviços do plano.
- **Pronto quando:** Uma loja no plano Essencial é impedida pela API de cadastrar o 4º usuário simultâneo.

---

### [ ] T2.7 — Subdomínio por Loja e White Label Real
- **Descrição:** Resolução dinâmica da oficina a partir do host da requisição (`minhaloja.carx.com.br`) e tabela `tenant_branding`.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.6: Marca da Loja / White Label (Linhas 362–365)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L362-L365)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.7 (Linhas 558–561)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L558-L561)
- **Entrega:** Carregamento de logo, nome fantasia, cores secundárias e redes sociais no contexto da loja; geração dinâmica de `manifest.json` do PWA com o nome e ícone de cada oficina cliente.
- **Pronto quando:** Acessar `loja1.carx.local` e `loja2.carx.local` exibe marcas e logos distintos no Monitor TV e no app do técnico instalado.

---

### [ ] T2.8 — Armazenamento de Arquivos com MinIO (Compatível S3)
- **Descrição:** Sistema de upload de mídias de OS, laudos e fotos da oficina para o container `minio` com URLs pré-assinadas.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Stack / Arquivos (Linha 101)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L101)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.8 (Linhas 562–565)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L562-L565)
- **Entrega:** Serviço de upload com validação de magic bytes reais (não apenas extensão do arquivo), bloqueio de scripts/SVGs arbitrários, redimensionamento de fotos pesadas no servidor e estrutura de pastas `tenant/{id}/...`.
- **Pronto quando:** Um arquivo executável renomeado para `.jpg` é rejeitado na API, e o link de uma imagem de uma oficina não é acessível por outra.

---

### [ ] T2.9 — Super Admin: Backend e Módulo `/admin`
- **Descrição:** Módulo de gerenciamento global das oficinas clientes, com role de banco separada, bypass das regras de tenant isolado e auditoria imutável.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11: Ambiente Super Admin (Linhas 367–402)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L367-L402)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.9 (Linhas 567–570)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L567-L570)
- **Entrega:** Endpoints de métricas globais (MRR, churn, lojas ativas), CRUD de oficinas, suspensão/reativação, log de impersonação e planos.
- **Pronto quando:** Token JWT emitido para usuário do Super Admin é sumariamente rejeitado no app das lojas e vice-versa.

---

### [ ] T2.10 — Super Admin: Frontend (`apps/admin`)
- **Descrição:** Painel administrativo corporativo para o dono do SaaS operar contratos, ver faturamento e gerenciar licenças.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.1: Módulos do Super Admin (Linhas 371–386)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L371-L386)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.10 (Linhas 571–574)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L571-L574)
- **Assets Visuais:** Estilo baseado no Design System CarX com foco em densidade de dados e gráficos corporativos.
- **Entrega:** Aplicação `apps/admin` (container 5) com telas de: Visão Geral de MRR, Tabela de Oficinas, Contratos/Faturas, Gerenciador de WhatsApp e Trilha de Auditoria.
- **Pronto quando:** O acesso é protegido por 2FA e ações destrutivas (suspensão de loja) exigem confirmação com senha.

---

### [ ] T2.11 — Assistente de Criação de Oficina e Provisionamento
- **Descrição:** Wizard que cadastra uma nova oficina, provisiona o subdomínio, injeta o catálogo base do segmento escolhido e envia convite ao proprietário.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.4: Fluxos Principais (Linhas 393–398)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L393-L398)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.11 (Linhas 575–578)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L575-L578)
- **Entrega:** Formulário em etapas: dados cadastrais (CNPJ/Razão Social), segmento (PPF, Insulfilm, Estética, Oficina), plano e criação automática da assinatura.
- **Pronto quando:** Ao concluir o assistente, o proprietário recebe o e-mail de acesso e já encontra a loja com serviços pré-configurados do seu segmento.

---

### [ ] T2.12 — Contratos, Faturas e Régua de Cobrança (Manual/Regras)
- **Descrição:** Máquina de estados de contratos de licença (`trial`, `ativo`, `inadimplente`, `suspenso`, `cancelado`) com bloqueio programado.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.2: Régua de Cobrança (Linhas 387–389)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L387-L389)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T2.12 (Linhas 579–582)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L579-L582)
- **Entrega:** Rotina agendada (Worker) que verifica faturas vencidas, envia avisos, aplica restrição leve aos 7 dias e suspende em modo somente leitura aos 15 dias.
- **Pronto quando:** Loja com fatura em atraso tem a escrita bloqueada na API, mantendo visualização dos dados históricos com banner informativo.

---

## 🚗 FASE 3 — Domínio Automotivo no Novo Backend

**Objetivo:** Reimplementar todas as regras de negócio automotivas ricas do OsSystem no backend Node.js próprio, eliminando 100% das chamadas diretas ao Supabase e qualquer armazenamento de regras em `localStorage`.

### [ ] T3.1 — Clientes e Veículos (Placa por Oficina)
- **Descrição:** Gestão de clientes e frotas, com normalização de telefones (E.164), validação de CPF/CNPJ e placa única **por loja** (permitindo que duas oficinas atendam o mesmo veículo sem choque).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.4: Problema 1 (Linha 67)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L67)
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 154)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L154)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.1 (Linhas 587–590)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L587-L590)
- **Assets Visuais:** [Gestor · Painel (Clientes e frotas)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:** Endpoints CRUD para `customers` e `vehicles` com busca paginada no servidor por nome, telefone, placa ou modelo.
- **Pronto quando:** Duas lojas distintas cadastram a mesma placa `ABC1D23` com sucesso e sem violação de unicidade global.

---

### [ ] T3.2 — Catálogo de Serviços, Preços por Porte e Combos
- **Descrição:** Tabela de serviços normalizada: tempo padrão por porte de veículo (Hatch, Sedan, SUV, Picape, Moto), preços específicos por classe e cálculo automático de combos.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 155)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L155)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.2 (Linhas 591–594)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L591-L594)
- **Entrega:** Tabelas `service_catalog`, `service_prices_by_class`, `packages` e `package_items`.
- **Pronto quando:** A seleção de um serviço em um orçamento calcula o valor exato baseado no porte do veículo cadastrado, aplicando o desconto de combo no backend.

---

### [ ] T3.3 — Orçamentos e Ordens de Serviço (Máquina de Estados)
- **Descrição:** A espinha dorsal do sistema. A OS deixa de ter status como texto solto e passa a operar como máquina de estados estrita no backend.
- **Fluxo de Estados Obrigatório:**
  `QUOTE` ➔ `APPROVED` ➔ `SCHEDULED` ➔ `CHECKED_IN` ➔ `IN_PROGRESS` ➔ `QA` ➔ `READY` ➔ `DELIVERED` (+ `PAUSED`, `CANCELED`).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Status da OS / Máquina de Estados (Linhas 164–165)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L164-L165)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.3 (Linhas 595–598)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L595-L598)
- **Assets e Telas de Referência:**
  - [Gestor · Nova OS (Formulário em etapas, serviços, peças, prazos)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Nova%20OS@2x.png)
  - [Gestor · Painel (Pátio com colunas Aguardando, Em Execução e Prontas)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:**
  - Tabela `work_orders` com número sequencial próprio por loja (`os_number` 1, 2, 3...).
  - Tabelas `work_order_items` e `work_order_events` (histórico de auditoria de cada transição).
  - Geração de token UUID seguro para acompanhamento público pelo cliente.
- **Pronto quando:** Uma tentativa de mover uma OS diretamente de `QUOTE` para `DELIVERED` é rejeitada pela API com erro 422, e todas as transições válidas geram registro na linha do tempo.

---

### [ ] T3.4 — Pagamentos, Adiantamentos (Sinal) e Transações Atômicas
- **Descrição:** Gestão financeira de pagamentos de OS realizada no banco em transação atômica, eliminando a antiga race condition do legado.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 157)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L157)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.4 (Linhas 599–602)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L599-L602)
- **Entrega:** Tabelas `payments` e `deposits`, com cálculo de saldo devedor, estorno, método (Pix, Cartão, Dinheiro) e controle de sinal.
- **Pronto quando:** Teste de concorrência disparando duas liquidações simultâneas na mesma OS calcula o saldo sem duplicidade ou valor negativo.

---

### [ ] T3.5 — Controle de Estoque e Bobinas de Película (PPF e Insulfilm)
- **Descrição:** Controle granular de consumo de insumos por OS e gestão especializada de bobinas/rolos (metragem restante, lote e desperdício).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linhas 158)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L158)
  - [CarX_Documento_Unico.md — Seção 6: Onda 2 / Item 6 (Linhas 215–216)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L215-L216)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.5 (Linhas 603–606)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L603-L606)
- **Assets Visuais:** [Gestor · Painel (Card de Alerta: Bobina de película G20 abaixo do mínimo)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:** Tabelas `materials`, `stock_movements` e `material_rolls` (com campo de metros lineares gastos por OS e baixa idempotente ao concluir a ordem).
- **Pronto quando:** Entregar a mesma OS múltiplas vezes abate o estoque apenas uma única vez e gera alerta visual quando a bobina atinge o nível crítico configurado.

---

### [ ] T3.6 — Agenda Inteligente por Box e Agendamento Online
- **Descrição:** Agenda com alocação por box físico e profissional técnico, respeitando o tempo de serviço pelo porte do veículo para evitar choques de horário.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 159)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L159)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.6 (Linhas 607–610)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L607-L610)
- **Assets e Telas de Referência:**
  - [Gestor · Agenda (Ocupação por boxes, horários, status)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Agenda@2x.png)
- **Entrega:** Tabelas `appointments` e `bays`, com endpoint público de agendamento online (com proteção anti-bot e rate limit) que insere a proposta no status `QUOTE` com origem `ONLINE`.
- **Pronto quando:** Dois clientes são impedidos de agendar no mesmo box e mesmo horário simultaneamente.

---

### [ ] T3.7 — Laudo de Inspeção Digital (VCR), Checklist e Fotos
- **Descrição:** Vistoria visual digital do veículo no celular/tablet: marcação touch dos pontos de avaria (riscos, amassados, trincas), fotos antes/depois por ângulo guiado e assinatura digital salva como arquivo.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.1: O que observei nas telas / Laudo (Linhas 312–313)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L312-L313)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.7 (Linhas 611–614)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L611-L614)
- **Assets e Telas de Referência:**
  - [Operador · Laudo de Inspeção (Mapa touch de avarias no celular, ângulos guiados)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Laudo%20de%20inspe%C3%A7%C3%A3o@2x.png)
- **Entrega:** Tabela `inspections`, upload de imagens dos pontos para MinIO, geração de PDF do laudo no servidor com marcações gráficas e assinatura do cliente.
- **Pronto quando:** O PDF gerado abre com os pontos plotados sobre a silhueta do veículo e fotos anexadas, sem armazenar dados em Base64 no banco.

---

### [ ] T3.8 — App do Técnico (PWA do Operador)
- **Descrição:** Interface otimizada para o chão de oficina em tema escuro: botões grandes (56–60px), fila priorizada ("Minha fila" vs "Toda a loja"), cronômetro oficial calculado no backend e fluxo sem bloqueios.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 10.3: Princípios do App do Operador (Linhas 328–338)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L328-L338)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.8 (Linhas 615–618)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L615-L618)
- **Assets e Telas de Referência:**
  - [Operador · Fila (Cards de serviços, alvos de toque, badge de retrabalho)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Fila@2x.png)
  - [Operador · Execução (Cronômetro Space Grotesk, stepper de etapas, botão gigante)](file:///d:/Repositorios/CarX/rebraind/Operador%20%C2%B7%20Execu%C3%A7%C3%A3o@2x.png)
- **Entrega:**
  - PWA com suporte a Screen Wake Lock (mantém tela ligada durante serviço).
  - Ação inteligente "Fazer checklist e iniciar" caso a OS ainda não tenha checklist de entrada preenchido.
  - Cronômetro calculado a partir do `timestamp` do banco (imune a alterações no relógio do aparelho).
- **Pronto quando:** Fechar o navegador no meio da aplicação de película ou recarregar a página mantém o tempo decorrido sincronizado com exatidão.

---

### [ ] T3.9 — Controle de Qualidade (QA), Garantia e Certificado com QR
- **Descrição:** Gate de validação pós-serviço (QA Audit) para liberação de entrega e emissão de Certificado de Garantia com QR Code público de autenticidade (Passaporte do Veículo).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 2 / Item 7 (Linhas 216–217)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L216-L217)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.9 (Linhas 619–622)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L619-L622)
- **Entrega:** Tabelas `qa_audits` e `warranties`. Geração de PDF do certificado e página pública (`/v/{token}`) para qualquer pessoa escanear o QR e validar a garantia e o lote do material aplicado sem expor dados pessoais do cliente.
- **Pronto quando:** Escanear o QR Code impresso no certificado abre a página pública autenticada mostrando data de vencimento e lote da película/vitrificador.

---

### [ ] T3.10 — Pesquisa NPS, Pós-Venda e Lembretes de Revisão
- **Descrição:** Coleta de NPS por token único (sem necessidade de login do cliente), classificação em Promotor/Neutro/Detrator e alertas de revisões de garantia periódicas.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 4: Domínio Automotivo (Linha 161)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L161)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.10 (Linhas 623–626)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L623-L626)
- **Assets e Telas de Referência:**
  - [Gestor · Relatórios NPS (Score NPS, detratores, promotores, satisfação)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Relat%C3%B3rios%20NPS@2x.png)
- **Entrega:** Tabela `nps_surveys` persistida, jobs agendados de disparo e tela do Gestor com métricas reais (eliminando o antigo mock de NPS).
- **Pronto quando:** O cliente responde o NPS via link seguro e os dados atualizam o scorecard do gestor instantaneamente; responder ao mesmo link duas vezes é bloqueado.

---

### [ ] T3.11 — Financeiro, Comissões e Relatórios no Servidor
- **Descrição:** Cálculo de DRE, margem real por serviço, comissões de técnicos e ranking de produtividade (streak baseado em histórico de QA) calculado exclusivamente por SQL no backend.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: O que o código faz hoje / Comissões e Ranking (Linhas 55–57)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L55-L57)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.11 (Linhas 627–630)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L627-L630)
- **Assets Visuais:** [Gestor · Painel (Faturamento convertido, pátio ao vivo)](file:///d:/Repositorios/CarX/rebraind/Gestor%20%C2%B7%20Painel@2x.png)
- **Entrega:** Endpoints para DRE e extrato de comissões (`commissions_rules`, `commissions_entries`), com streak de dias sem retrabalho calculado de fatos auditados.
- **Pronto quando:** O valor de faturamento do dashboard bate rigorosamente com a soma dos pagamentos e custos de materiais, sem depender de agregação em memória no browser.

---

### [ ] T3.12 — Atualização em Tempo Real (SSE / WebSockets)
- **Descrição:** Barramento de eventos pontuais leves para atualização em tempo real do Monitor TV e da Fila do Operador, eliminando o padrão ineficiente de "refetch de lista inteira".
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.4: Problema 5 (Linha 71)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L71)
  - [CarX_Documento_Unico.md — Seção 2: Stack / Tempo Real (Linha 100)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L100)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.12 (Linhas 631–634)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L631-L634)
- **Assets e Telas de Referência:**
  - [TV da Loja (Monitor de produção com veículos em execução, horários e barra inferior)](file:///d:/Repositorios/CarX/rebraind/TV%20da%20loja@2x.png)
- **Entrega:** Canal SSE (Server-Sent Events) ou WebSocket autenticado emitindo payloads compactos (`work_order.updated`, `work_order.ready`).
- **Pronto quando:** Concluir uma etapa no celular do operador move o card correspondente na TV em menos de 500ms sem recarregar a página inteira, e a TV de uma loja nunca recebe eventos de outra.

---

### [ ] T3.13 — Portal do Cliente Seguro ("Meu Veículo")
- **Descrição:** Reestruturação do portal do cliente com login seguro via OTP (código temporário via WhatsApp ou e-mail), eliminando a vulnerabilidade de login apenas por telefone e o antigo modo demonstração com dados fictícios.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: Portal Meu Veículo (Linha 61)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L61)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.13 (Linhas 635–638)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L635-L638)
- **Entrega:** Fluxo de login com desafio OTP, visualização filtrada no backend das OS do cliente, linha do tempo dos serviços e galeria de fotos antes/depois.
- **Pronto quando:** Inserir o telefone de terceiros não expõe nenhum dado sem o código numérico validado; modo de demonstração falso é completamente extinto em produção.

---

### [ ] T3.14 — API Pública e Webhooks Reais
- **Descrição:** Substituição do antigo mock em localStorage por uma camada de integração real com autenticação por chave de API (com hash no banco) e webhooks assinados com HMAC.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 1.3: API Pública e Webhooks (Linha 54)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L54)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.14 (Linhas 639–642)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L639-L642)
- **Entrega:** Tabelas `api_keys`, `webhook_endpoints`, `webhook_deliveries`, fila de reentrega com backoff exponencial e documentação interativa OpenAPI/Swagger.
- **Pronto quando:** Um evento de OS aprovada dispara um webhook para uma URL externa de teste com cabeçalho `X-CarX-Signature` válido.

---

### [ ] T3.15 — Frontend: Troca da Camada de Dados e Adoção do Design System
- **Descrição:** Migração das telas existentes do OsSystem no `apps/web`: remoção completa do `@supabase/supabase-js`, adoção do TanStack Query com API tipada e aplicação dos componentes do `packages/ui`.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Frontend (Linha 99)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L99)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.15 (Linhas 643–646)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L643-L646)
- **Assets de Telas:** Todos os mockups de [rebraind/](file:///d:/Repositorios/CarX/rebraind/).
- **Entrega:** Telas migradas para TypeScript consumindo a nova API: Painel do Gestor, Nova OS, Agenda, Fila do Operador, Execução, Laudo, Relatórios e Monitor TV.
- **Pronto quando:** O comando `grep -r "supabase" apps/web` retorna 0 ocorrências e o `localStorage` armazena exclusivamente preferências de tema ou UI.

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
