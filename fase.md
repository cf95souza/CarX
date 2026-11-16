# CarX — Guia Mestre de Fases e Execução (fase.md)

Este documento é a **bússola oficial de execução** do **CarX** (transformação do legado *OsSystem* em SaaS multitenant automotivo de alta performance).

```
================================================================================
🚨 PAINEL DE CONTROLE DE EXECUÇÃO EM TEMPO REAL — ONDE ESTAMOS & ONDE PAROU
================================================================================

📍 ONDE O PROJETO PAROU:
   • Fase 7 — Qualidade Contínua, Testes de Carga (k6), Hardening OWASP & Simulação DR: 100% CONCLUÍDA E HOMOLOGADA!
   • Fase 8 — Homologação VPS, Usabilidade e Esteira Operacional:
     - [T8.2a] Remoção de Fallbacks Visuais, Correções de Equipe/Orçamento e Roteamento Padrão OperaBeauty: 100% CONCLUÍDA!
     - [T8.2b] Homologação Operacional do Ciclo de Vendas e Redesenho do App do Operador (Design System rebraind/): 100% CONCLUÍDA!
     - [T8.2c] Refinamentos de Integração, Inspeção e Homologação VPS (Itens 30 a 37): 100% CONCLUÍDA E VALIDADA!
       * Item 30: APIs & Webhooks Reais (Validado visualmente com 5 evidências PNG)
       * Item 31: Silhuetas Vetoriais do Veículo por Ângulo no Laudo (4 vistas)
       * Item 32: Compactação Client-Side Canvas/WebP e Radios Modernos nas Fotos
       * Item 33: Persistência e Sincronização do Cronômetro Oficial do Servidor
       * Item 34: Desbloqueio RBAC do Ranking de Técnicos para Operadores
       * Item 35: Idempotência e Correção HTTP 400 em Parada do Cronômetro
       * Item 36: Transições Legítimas de Status na Esteira Operacional (HTTP 422)
       * Item 37: Conclusão de Serviço e Movimentação Imediata para o Histórico
       * Item 39: Limpeza Rigorosa do Cache de Placas e Lookup 100% Limpo (Print 1)
       * Item 40: Correção do Progresso Inicial da OS (0% em Agendado/Aprovado) (Print 2)
       * Item 41: Isolamento Multitenant da URL do Monitor TV (/:slug/tv) (Print 3)
       * Item 42: Eliminação de Emojis e Modernização dos Botões de Fases de Fotos (Print 3)
       * Item 43: Redesenho de Alta Fidelidade do Checklist / Laudo e Silhuetas por Categoria (5x5 Clay Renders)
        * Item 44: Resiliência de Storage Local (Fix Erro 500 MinIO), Agendamento com Seleção de Box em Orçamentos e Data de Cadastro em Clientes
        * Item 45: Resolução de Agenda Real, Auto-Sync Retroativo, Laudo Técnico & PDF na OS e Redirecionamento de Orçamento para Vendas
         * Item 46: Novo Layout da Vistoria Digital (Design System Rebrand), Resolução de Cliente e Veículo, Silhuetas Hatch 3D e Botões de Alto Contraste (100% sem perda de dados)

🎯 PRÓXIMO PASSO IMEDIATO:
   • Item 38: Teste E2E de Fluxo Sistêmico Completo 100% Visual pela Tela (Frontend)

📊 MAPA DE TODAS AS TAREFAS DA FASE 6 (DIFERENCIAIS COMPETITIVOS):
--------------------------------------------------------------------------------
| Onda   | Tarefa | Nome do Módulo                                     | Status          | Detalhes da Entrega |
|--------|--------|---------------------------------------------------|-----------------|----------------------|
| Onda 1 | T6.1   | Orçamento Digital com Aceite Online & Sinal Pix    | [x] Concluído   | Proposta pública /proposta/:token, assinatura digital e Pix Bacen |
| Onda 1 | T6.2   | Consulta Automática de Placa com Cache e Porte     | [x] Concluído   | Placas Mercosul/antiga, cache 90d, inferência de porte de veículo |
| Onda 1 | T6.3   | Pix Integrado para OS (Baixa Instantânea no Caixa) | [x] Concluído   | QR Code EMV dinâmico, webhook idempotente, liquidação atômica e SSE |
| Onda 1 | T6.4   | WhatsApp Transacional Automático por Evento de OS  | [x] Concluído   | Baileys por tenant, fallback manual wa.me gratuito e gating por plano |
| Onda 2 | T6.5   | Controle Fino de Bobinas (PPF/Películas, Margem/m) | [x] Concluído   | Metragem linear, custo/m, consumo por OS, descarte e Garantia |
| Onda 2 | T6.6   | Passaporte Digital & Transferência na Revenda      | [x] Concluído   | QR Code público /v/:token, procedência do lote e troca de titularidade |
| Onda 2 | T6.7   | Agenda Inteligente com Ocupação por Box & Duração  | [x] Concluído   | Visão por box, anti-conflito técnico/box (409), slots livres e atrasos |
| Onda 2 | T6.8   | Motor de Reputação no Google Meu Negócio           | [x] Concluído   | Promotores NPS (9/10), redirecionamento 5 estrelas e disparos WhatsApp |
| Onda 2 | T6.9   | Mini-Site Institucional, Portfólio & Leads         | [x] Concluído   | Mini-site da loja (/loja/:slug), antes/depois e triagem de orçamentos |
| Onda 3 | T6.10  | Módulo Fiscal: Emissão de NFS-e Automática na OS   | [x] Concluído   | Emissão automática ao entregar OS, Certificado A1, XML/PDF MinIO, 7/7 testes |
| Onda 3 | T6.11  | DRE Gerencial, Fluxo de Caixa & Comissões Técnicos | [x] Concluído   | EBITDA real, dedução de insumos na comissão, previsão de caixa diário, 7/7 testes |
| Onda 3 | T6.12  | Painel Corporativo de Franquias (Multiunidade)     | [x] Concluído   | Faturamento consolidado por rede, ranking, transferência de bobinas e estoque, 9/9 testes |
| Onda 3 | T6.13  | App Técnico Offline-First (PWA com IndexedDB)      | [x] Concluído   | IndexedDB nativo (4 stores), fila de sync idempotente, cronômetro resiliente, 5/5 testes |
| Onda 3 | T6.14  | Inteligência Artificial (Vistoria & Avarias)       | [x] Concluído   | Visão computacional (fotos), voz para checklist, sugestão de orçamento, 6/6 testes |
| Onda 3 | T6.15  | CRM de Pós-Venda, Garantias & Retenção Ativa       | [x] Concluído   | Revisões periódicas (PPF 6m, vitrificação 12m), cupons e reativação, 9/9 testes |

🛡️ MAPA DE TODAS AS TAREFAS DA FASE 7 (QUALIDADE CONTÍNUA & HARDENING):
--------------------------------------------------------------------------------
| Tarefa | Nome do Módulo / Gate                                      | Status          | Detalhes da Entrega |
|--------|------------------------------------------------------------|-----------------|----------------------|
| T7.1   | Quality Gate Automatizado (System Quality Gate)            | [x] Concluído   | Typecheck 0 erros, ESLint 0 erros, 58/58 tabelas RLS, quality-report.md |
| T7.2   | Testes de Isolamento Multitenant (CI Obrigatório)          | [x] Concluído   | 10/10 testes dinâmicos nas 58 tabelas + varredura estática AST |
| T7.3   | Testes de Carga Progressivos com k6 (Até 100 VUs)          | [x] Concluído   | 26.085 reqs (0% erro), 1.052,4 req/s @ 100 VUs, p95=131,98ms |
| T7.4   | Auditoria de Segurança e Hardening OWASP Top 10            | [x] Concluído   | 6/6 suítes OWASP (RBAC, IDOR, AES-256-GCM, SQLi, XSS, JWT) |
| T7.5   | Simulação Mensal de Desastre e Restauração (DR Drill)      | [x] Concluído   | Backup SHA-256, wipe simulado e restore transacional (RTO=343ms, RPO=0) |

🚀 FASES SUBSEQUENTES DO PROJETO (ROADMAP GERAL):
--------------------------------------------------------------------------------
| Fase   | Nome                                               | Status          | Dependência / Quando Inicia |
|--------|----------------------------------------------------|-----------------|-----------------------------|
| Fase 7 | Qualidade Contínua, Testes de Carga k6 & OWASP     | [x] 100% Concluída | Todas as 5 tarefas (T7.1 a T7.5) homologadas com evidências |
| Fase 8 | Go-To-Market, Beta Fechado & Lançamento em Produção | [🟡 PRÓXIMA FASE] | Pronta para iniciar após homologação da Fase 7 |
================================================================================
```

> **Aviso Obrigatório para Agentes de Código:**
> Nenhuma implementação deve ser feita sem consultar previamente as seções indicadas de [**CarX_Documento_Unico.md**](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md) e as referências visuais da pasta [**rebraind/**](file:///d:/Repositorios/CarX/rebraind/).
> Cada etapa possui: **Entrega**, **Critério "Pronto quando"**, **Seção de Referência** e **Assets Visuais**. Só avance para a próxima tarefa quando o critério for 100% satisfeito.

---

## 🧭 Painel Geral de Progresso

| Fase | Descrição | Status | Detalhes & Progresso |
|---|---|---|---|
| **Fase 0** | Fundação do Projeto, Monorepo e Design System | `[x] Concluído` | Monorepo pnpm, TypeScript estrito, CI GitHub Actions e Design System |
| **Fase 1** | Infraestrutura VPS, Docker Compose e Redes | `[x] Concluído` | Postgres 16, Redis 7, MinIO S3, Nginx Proxy e isolamento de redes |
| **Fase 2** | Núcleo Multitenant, Autenticação e Super Admin | `[x] Concluído` | RLS canônico, Argon2, JWT/Refresh, 2FA TOTP e painel Super Admin |
| **Fase 3** | Domínio Automotivo no Novo Backend | `[x] Concluído` | Clientes, Veículos, Catálogo por porte, OS, Estoque, VCR, QA e NPS |
| **Fase 4** | Migração de Dados e Clientes Legados (ETL) | `[x] Dispensado` | Banco iniciado do zero sem carregar vícios legados |
| **Fase 5** | Produto SaaS Comercial, Landing Page e Faturamento | `[x] Concluído` | Planos, Dunning, Gateway Mercado Pago e Onboarding Self-Service |
| **Fase 5.5** | Revitalização Visual do Cockpit do Gestor & Rebrand | `[x] Concluído` | 10 telas homologadas com fidelidade total a `rebraind/` |
| **Fase 6 · Onda 1** | Diferenciais: Impacto Imediato (WhatsApp, Orçamento, Pix, Placa, Portal) | `[x] 100% Concluída` | Tarefas T6.1, T6.2, T6.3 e T6.4 homologadas com sucesso |
| **Fase 6 · Onda 2** | Diferenciais: Domínio Especializado (Bobinas, Passaporte, Agenda, Reputação, Mini-Site) | `[x] 100% Concluída` | Tarefas T6.5, T6.6, T6.7, T6.8 e T6.9 homologadas com sucesso |
| **Fase 6 · Onda 3** | Diferenciais: Escala, Fiscal & IA (NFS-e, DRE, Franquias, Offline-First, IA, CRM) | `[x] 100% Concluída` | Tarefas T6.10, T6.11, T6.12, T6.13, T6.14 e T6.15 homologadas com sucesso |
| **Fase 7** | Qualidade Contínua, Testes de Carga (k6) e Hardening OWASP | `[x] 100% Concluída` | Tarefas T7.1, T7.2, T7.3, T7.4 e T7.5 homologadas com evidências |
| **Fase 8** | Go-To-Market e Beta Fechado (Oficinas Piloto) | `[🟡 PRÓXIMA FASE]` | Pronta para iniciar (Release Gate da Fase 7 100% aprovado) |

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

---

### [x] T2.13 — Super Admin: Configuração de Planos Globais, Limites e Matriz de Feature Gating `(Concluído)`
- **Descrição:** Módulo no Super Admin para criação, edição e parametrização dos planos comerciais, com matriz visual de habilitação e desabilitação de funcionalidades (Feature Flags / Entitlements).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Planos e Preços](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L243-L256)
  - [CarX_Documento_Unico.md — Seção 11.1: Módulos do Super Admin](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L371-L386)
- **Entrega Concluída:**
  - **Contratos e Metadados Compartilhados (`packages/shared/src/plans.ts`)**:
    - Adicionadas as features `WHATSAPP_GATEWAY` e `CUSTOMER_PORTAL`.
    - DTOs `AdminPlanDto`, `CreatePlanDto` e `UpdatePlanDto`.
    - Catálogo `ALL_PLAN_FEATURES` categorizado em: Operacional, Financeiro/Fiscal, Comunicação e Avançado/Escala.
  - **Serviço de Planos no Backend (`apps/api/src/plans/plan-service.ts`)**:
    - `listAllPlansAdmin()`: Listagem enriquecida com contagem de oficinas assinantes (`tenants_count`).
    - `getPlanById()`: Detalhes do plano.
    - `createPlan()`: Cadastro de novos planos com validação de slug e limites.
    - `updatePlan()`: Atualização dinâmica de preços, quotas e matriz de features com auditoria imutável (`PLAN_UPDATED`).
    - `togglePlanFeature()`: Alternância atômica de feature flag individual no plano com auditoria (`PLAN_FEATURE_TOGGLED`).
  - **Endpoints Fastify Protegidos por Super Admin (`apps/api/src/routes/superadmin-routes.ts`)**:
    - `GET /admin/plans` (200 com lista completa de planos e assinantes).
    - `GET /admin/plans/:id` (200 ou 404).
    - `POST /admin/plans` (201 Created).
    - `PUT /admin/plans/:id` (200 OK com atualização atômica).
    - `PATCH /admin/plans/:id/features` (200 OK com toggle rápido).
  - **Guards e Propagação Dinâmica nos Módulos de Domínio**:
    - Proteção das rotas de checklist ([`inspection-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/inspection-routes.ts)) com `requireFeature(PlanFeatures.INSPECTION_CHECKLIST)`.
    - Proteção das rotas financeiras e comissões ([`financial-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/financial-routes.ts)) com `requireFeature(PlanFeatures.FINANCIAL)`.
    - Desabilitar a feature no plano bloqueia imediatamente o acesso de todas as oficinas assinantes com `HTTP 403 FEATURE_DISABLED`.
  - **Interface no Super Admin (`apps/admin/src/pages/PlansPage.tsx`)**:
    - Tela completa com KPIs de planos ativos, oficinas assinantes, preço médio e planos com WhatsApp Gateway.
    - Grid de cards com visual Dark Volt, tags de cotas (usuários, filiais, OS/mês, MinIO GB, WhatsApp msg/mês) e badges de recursos ativos vs inativos.
    - Modal avançado de criação e edição com validação de dados comerciais, ajuste de quotas e matriz interativa de switches para as 19 funcionalidades do software.
    - Item "Planos e Recursos" integrado ao menu lateral ([`AdminLayout.tsx`](file:///d:/Repositorios/CarX/apps/admin/src/components/AdminLayout.tsx)) e roteamento no [`App.tsx`](file:///d:/Repositorios/CarX/apps/admin/src/App.tsx).
  - **Comprovação Automatizada do Critério de Aceite (`apps/api/src/plans/plan-admin.test.ts`)**:
    - 6 testes cobrindo rejeição de token comum, listagem com `tenants_count`, criação de plano, acesso inicial liberado à vistoria/checklist, **bloqueio imediato com HTTP 403 FEATURE_DISABLED ao desativar a feature no plano**, e restabelecimento imediato de acesso ao reativar a feature.
- **Pronto quando:** O Super Admin desabilita a feature `inspection_checklist` em um plano e os usuários da oficina naquele plano são imediatamente impedidos de acessar a rota de checklist com HTTP 403 `FEATURE_DISABLED`. *(Validado com sucesso absoluto)*.

---

### [x] T2.14 — Super Admin: Módulo de Cupons Promocionais (Meses Grátis, 3 Meses por R$ XX) `(Concluído)`
- **Descrição:** Módulo completo de criação, governança e resgate de cupons de desconto pelo Super Admin para campanhas de vendas e retenção (ex: "3 meses de R$ 99 por R$ 49", "1 a 3 meses grátis de carência", descontos percentuais ou fixos).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Planos e Preços (Linhas 243–256)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L243-L256)
  - [CarX_Documento_Unico.md — Seção 11: Ambiente Super Admin](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L367-L402)
- **Entrega Concluída:**
  - **Migration 024 (`024_coupons_and_whatsapp_instances.up.sql`)**:
    - Tabelas `coupons` e `coupon_redemptions` com índices, checagens de validação e auditoria.
  - **Contratos e Schemas Compartilhados (`packages/shared/src/coupons.ts`)**:
    - Tipos `CouponDto`, `CreateCouponDto`, `ValidateCouponInputDto`, `ValidateCouponResponseDto`, `CouponDiscountType`.
    - Campo `coupon_code?: string` adicionado ao `AdminCreateTenantDto`.
  - **Serviço de Cupons no Backend (`apps/api/src/coupons/coupon-service.ts`)**:
    - `listCouponsAdmin()`: Listagem com contador dinâmico de resgates (`redemptions_count`).
    - `createCoupon()`: Criação com suporte a `free_months`, `promotional_price`, `percentage`, `fixed_amount`.
    - `deactivateCoupon()`: Revogação lógica com registro imutável em `audit_logs`.
    - `validateCoupon()`: Validação de vigência, status, cota máxima de usos e restrição de plano.
    - `redeemCoupon()`: Resgate atômico, cálculo do desconto aplicado e registro em `coupon_redemptions`.
  - **Integração no Provisionamento (`apps/api/src/superadmin/superadmin-service.ts`)**:
    - `createTenant()` valida e resgata cupons automaticamente, ajustando o valor contratado (`negotiated_price_cents`).
  - **Endpoints Fastify Protegidos por Super Admin (`apps/api/src/routes/superadmin-routes.ts`)**:
    - `GET /admin/coupons`, `POST /admin/coupons`, `DELETE /admin/coupons/:id`, `POST /admin/coupons/validate`.
  - **Frontend no Super Admin (`apps/admin`)**:
    - Tela de Cupons (`apps/admin/src/pages/CouponsPage.tsx`) com KPIs, tabela de cupons, cópia de código e modal completo de cadastro.
    - Assistente de Oficinas (`apps/admin/src/pages/TenantWizardPage.tsx`) com campo de cupom, botão de validação em tempo real e visualização de desconto aplicado na confirmação.
    - Rota `/coupons` registrada em `App.tsx` e atalho com ícone de Ticket em `AdminLayout.tsx`.
  - **Suíte de Testes Automatizada (`apps/api/src/coupons/coupon.test.ts`)**:
    - 8 testes cobrindo bloqueio de tokens não autorizados, criação de meses grátis, preço promocional por plano, rejeição de duplicatas, validação de regras de plano, aplicação e cálculo de abatimento no contrato da oficina, e desativação imediata de cupom.
- **Pronto quando:** O Super Admin cria o cupom `INAUGURACAO3M` oferecendo 3 meses a R$ 49/mês para o plano Profissional, o cupom é aplicado na criação de uma oficina e a fatura gerada reflete exatamente o valor promocional nos primeiros 3 meses. *(Validado com sucesso absoluto)*.

---

### [x] T2.15 — Super Admin: Gestão de Credenciais e Redefinição de Senha do Gestor da Oficina `(Concluído)`
- **Descrição:** Ferramentas operacionais de suporte no Super Admin para criação direta de credenciais no provisionamento e recuperação/redefinição imediata de senha do gestor titular da oficina, sem dependência de provedores externos de e-mail.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 11.1: Módulos do Super Admin (Linhas 371–386)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L371-L386)
- **Entrega Concluída:**
  - **Contratos e DTOs Compartilhados (`packages/shared/src/superadmin.ts`)**:
    - `ResetOwnerPasswordInputDto`: Parâmetro opcional `new_password` para senha customizada.
    - `ResetOwnerPasswordResponseDto`: Resposta estruturada com `temporary_password`, `owner_email`, `owner_name`, `user_id` e `tenant_id`.
  - **Serviço de Negócio no Backend (`apps/api/src/superadmin/superadmin-service.ts`)**:
    - `resetOwnerPassword()`: Localiza a oficina e o usuário com role `owner`/`gestor`, gera senha provisória criptograficamente segura (`CarX@<hex>!`) ou aplica senha informada com mínimo de 8 caracteres, calcula hash seguro (Argon2id/Bcrypt), encerra sessões ativas e registra na trilha imutável `audit_logs` (`OWNER_PASSWORD_RESET_BY_SUPERADMIN`).
  - **Endpoint Fastify Protegido (`apps/api/src/routes/superadmin-routes.ts`)**:
    - `POST /admin/tenants/:id/reset-owner-password`: Exclusivo para Super Admins autenticados.
  - **Frontend na Gestão de Oficinas (`apps/admin/src/pages/TenantsPage.tsx`)**:
    - Botão de ação direta com ícone de Chave (`Key`) em cada oficina na tabela.
    - Botão de acesso rápido no modal de detalhes técnicos da oficina.
    - Modal interativo com opção de geração automática de senha forte ou digitação manual.
    - Tela de sucesso com credenciais geradas, botão de cópia de senha e botão com um clique para copiar mensagem formatada pronta para envio ao cliente via WhatsApp.
  - **Suíte de Testes Automatizada (`apps/api/src/superadmin/owner-password-reset.test.ts`)**:
    - 5 testes cobrindo rejeição de requisição não autenticada (401), rejeição de senhas curtas (400), redefinição com senha customizada e invalidação da senha antiga, geração automática de senha forte, e auditoria imutável em `audit_logs`.
- **Pronto quando:** O Super Admin clica em "Redefinir Senha" para o gestor da "Oficina Alpha", define uma nova senha temporária, e o gestor consegue efetuar login imediatamente no `apps/web` com a nova credencial. *(Validado com sucesso absoluto)*.

---

## 🚗 FASE 3 — Domínio Automotivo no Novo Backend `(Concluída)`

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
  - **Regra Arquitetural de Gating e Dependência do WhatsApp**:
    - Como o sistema não possui provedor de e-mail ativo nesta fase, o canal exclusivo para transmissão dos desafios de OTP é o **WhatsApp**.
    - Consequentemente, o portal "Meu Veículo" possui dependência estrita de: (1) O plano contratado pela oficina possuir a funcionalidade de WhatsApp Gateway liberada (`whatsapp_gateway` / `whatsapp_auto`); e (2) A oficina possuir uma sessão ativa e conectada (`status = 'CONNECTED'`).
    - Oficinas em planos sem WhatsApp ou que ainda não tenham pareado o seu número têm o portal "Meu Veículo" **desabilitado**, e requisições públicas de solicitação de OTP retornam mensagem explicativa amigável, prevenindo que o cliente final fique sem receber o código.
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
    - 21 testes dedicados em [`apps/api/src/customer-portal/customer-portal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customer-portal/customer-portal.test.ts) passando 100%, incluindo:
      - Validação de isolamento e anti-enumeração.
      - **Gating Arquitetural de WhatsApp**: Bloqueio compulsório com HTTP 403 `WHATSAPP_NOT_CONNECTED` e `PORTAL_UNAVAILABLE` quando a oficina não possui plano com WhatsApp Gateway ou quando a sessão Baileys está desconectada.
      - Disparo real do código de desafio OTP via WhatsApp partindo do número da própria oficina.
    - **Total Consolidado da API CarX**: **269/269 testes passando com 100% de sucesso** em 30 suítes completas.
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

### [x] T3.15 — Frontend: Troca da Camada de Dados e Adoção do Design System `(Concluído — 10 de 10 Telas Entregues — 100% do Frontend)`
- **Descrição:** Migração das telas existentes do OsSystem no `apps/web`: remoção completa do `@supabase/supabase-js`, adoção do TanStack Query com API tipada e aplicação dos componentes do `packages/ui`. Executado tela por tela.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Frontend (Linha 99)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L99)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.15 (Linhas 643–646)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L643-L646)
- **Assets de Telas:** Todos os mockups de [rebraind/](file:///d:/Repositorios/CarX/rebraind/).
- **Entrega:** Telas migradas para TypeScript consumindo a nova API: Painel do Gestor, Nova OS, Agenda, Fila do Operador, Execução, Laudo, Relatórios, Monitor TV e Portal do Cliente.
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
  - [x] **Tela 4: Agenda Inteligente por Box (`apps/web/src/pages/Agenda.tsx`)**:
    - Migrada para TypeScript e `@tanstack/react-query` consumindo `api.appointments`.
    - Visualização estruturada por Boxes Físicos de atendimento (`bays`).
    - Navegador temporal por dia com seleção rápida ("Dia Anterior", "Hoje", "Próximo Dia" e data picker).
    - Detalhes de agendamento por horário com início/fim, modelo, placa, cliente e serviço.
    - Modal integrado para criação de agendamento diretamente no Box com validação de slot e prevenção anti-conflito.
    - Ações rápidas de cancelamento (liberação de box) e integração com portal público de Self-Booking.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 5: Fila do Operador / PWA do Técnico (`apps/web/src/pages/OperadorHome.tsx`)**:
    - Migrada para TypeScript e `@tanstack/react-query` consumindo `api.technician.getQueue()`.
    - Eliminação completa de mocks em `localStorage` (como o streak fictício antigo): streak e performance agora auditados pelo backend (`/reports/technicians/ranking` e histórico de QA).
    - Interface tátil Mobile-First otimizada para uso com luvas na oficina (botões de 56px `Button size="mobile"`).
    - Placas em destaque industrial automotivo estilo Mercosul (`font-mono tracking-wider font-extrabold`).
    - Badges táteis com `Badge`: Retrabalho com prioridade máxima (`variant="error"`), Checklist de Entrada (`variant="volt"` vs `variant="alert"`) e status da OS.
    - Integração de cronômetro oficial do servidor com componente `Stopwatch` exibindo contagem acumulada.
    - Seletor tátil de 3 pilares rápidos da oficina: *Minhas OS*, *Fila Oficina (Disponíveis)* e *Todas*.
    - Sincronização sob demanda com vibração háptica (`navigator.vibrate`) e polling automático de 15s.
    - Compatibilidade retroativa e suave com o `ExecutorView` e navegação de rotas.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 6: Execução, Checklist de Entrada e Cronômetro Oficial (`apps/web/src/pages/ExecutorView.tsx`)**:
    - Migrada para TypeScript e `@tanstack/react-query`.
    - Cronômetro Oficial do Servidor: `api.technician.getTimer(workOrderId)` com persistência ao fechar a página ou desligar o celular, e comandos de `start`, `pause` (com motivo operacional) e `resume`.
    - Critério fundamental "Nunca bloquear sem saída": botão "Fazer Checklist Rápido" que abre modal dinâmico de entrada (KM, combustível, itens vistoriados e observações), acionando `api.technician.startWithChecklist` para liberar o serviço imediatamente sem depender da recepção.
    - Barra de progresso interativa individual por item de serviço e cálculo global.
    - Documentação fotográfica guiada 360° conectada diretamente ao MinIO (`api.storage.upload` com categoria `inspection`).
    - Diário técnico do operador com observações e números de série de bobinas.
    - Modal de confirmação de entrega com transição automática para QA (`api.workOrders.updateStatus(workOrderId, 'QA')`).
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 7: Laudo de Inspeção Digital e QA (`CustomerStatus.tsx` / `QaChecklistModal.tsx` / `VcrReportModal.tsx`)**:
    - Substituição completa de mocks e `localStorage` por auditoria relacional com `api.qa.createAudit` e transição de estado da OS.
    - `QaChecklistModal.tsx`: Critérios objetivos de conformidade visual (alinhamento, bolhas, limpeza, acabamento), classificação por estrelas (1 a 5), aprovação para `READY` com emissão de garantia e incremento de streak do técnico, ou rejeição com justificativa obrigatória, marcação de retrabalho (`is_rework = true`), redefinição de streak e envio imediato ao topo da fila do operador com badge prioritária.
    - `CustomerStatus.tsx`: Portal público sem necessidade de login JWT para acompanhamento em tempo real (`/status/:token`) com proteção LGPD de dados sensíveis e IDOR, timeline de eventos da OS, dados do veículo e links para WhatsApp e certificados.
    - `VcrReportModal.tsx`: Modal interativo do laudo VCR com pontos de avaria na silhueta, severidades, fotos de inspeção guiada e download do PDF oficial vetorial (`api.inspections.getPdfUrl`).
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 8: Relatórios (DRE no Servidor, Ranking de Técnicos com Streak Auditado e NPS em `Relatorios.tsx`)**:
    - `Relatorios.tsx`: Navegação estratégica em abas (*Visão Gerencial*, *DRE no Servidor*, *Ranking de Técnicos*, *NPS & Retenção*, *Comissões & Extrato*).
    - `DreDashboard.tsx`: Demonstrativo de Resultado do Exercício com agregação SQL 100% no servidor (`api.reports.getDre`), exibindo receita bruta, descontos, receita líquida, custos variáveis (CMV de materiais e películas PPF + comissões da equipe), margem de contribuição (R$ e %) e saldo pendente a receber (inadimplência).
    - `TecnicosRanking.tsx`: Pódio dos Top 3 e tabela com Streak Real de dias invicto sem retrabalho, apurado a partir de auditorias de QA (`qa_audits`) e fatos operacionais reais, com notas de inspeção e volume produzido.
    - `NpsDashboard.tsx`: Scorecard oficial do NPS (-100 a +100) consumindo `api.nps.getMetrics` e `api.nps.listSurveys`, com distribuição de Promotores, Neutros e Detratores, alertas de pós-venda e contato direto por WhatsApp.
    - `ComissoesDashboard.tsx`: Extrato financeiro de comissões por colaborador com regras automáticas (`api.commissions.listEntries`) e liquidação rápida (`api.commissions.payEntry`).
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 9: Monitor TV da Loja (`MonitorTV.tsx`)**:
    - Substituição completa de `MonitorTV.jsx` por TypeScript com design Dark Volt industrial de alto impacto.
    - Telão em tempo real otimizado para galpão e recepção com visibilidade nítida à distância (5 a 10 metros).
    - Conexão nativa com Server-Sent Events (SSE) via `api.realtime.getEventsUrl()` escutando eventos de OS (`work_order.updated`, `work_order.ready`), invalidando o cache do React Query em segundo plano sem reload da página e com indicador "SSE Ao Vivo" pulsante.
    - Suporte a modo Fullscreen nativo em 1 clique (`toggleFullscreen`).
    - Relógio de precisão digital em tempo real no topo com formatação em Português do Brasil.
    - Modo de exibição flexível com integração de vídeo institucional do YouTube da loja (`branding.youtube_id` em tela dividida 50/50) ou grade expandida com cards automotivos de 2x2.
    - Cards gigantes exibindo placa Mercosul em alto contraste, modelo do veículo, cliente, técnico encarregado, box de atendimento, badge do status da OS e barra de progresso com animação shimmer.
    - Destaque com badge prioritária vermelha pulsante para ordens de serviço marcadas com retrabalho (`is_rework: true`).
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.
  - [x] **Tela 10: Portal do Cliente Seguro ("Meu Veículo" em `ClientPortal.tsx`)**:
    - Substituição completa de `ClientPortal.jsx` por TypeScript e `@tanstack/react-query`, erradicando por completo o antigo modo demonstração fictício de `localStorage` (carros e fotos fakes quando não havia OS).
    - Autenticação por OTP em duas etapas (`api.portal.requestOtp` e `api.portal.verifyOtp`) sem senhas e com estrita proteção anti-enumeração de clientes, gerando tokens JWT com escopo restrito `customer_portal` e isolamento RLS.
    - Seletor de frota do cliente com placas estilo Mercosul e contagem dinâmica de ordens de serviço por veículo (`api.portal.getVehicles`).
    - Linha do tempo e histórico de serviços em tempo real (`api.portal.getWorkOrders`), com progresso da execução no box, status financeiro (quitado vs pendente) e acionamento de detalhes sob demanda.
    - Galeria de evidências fotográficas em alta resolução categorizadas por fase (*Antes*, *Durante*, *Depois*) via `api.portal.getWorkOrderPhotos`, com modal Lightbox fullscreen em um clique.
    - Linha do tempo de eventos auditada (`api.portal.getWorkOrderTimeline`) com carimbo de data e hora.
    - Visualização e emissão de Certificados Digitais de Garantia ativos com cálculo de dias restantes e link para o Passaporte Digital público (`/status/:token`).
    - Sincronização direta de compromissos com Apple, Google e Outlook Calendar (`CalendarSyncModal`), emissão de recibos e botão de contato direto via WhatsApp oficial da loja.
    - Compilação e tipagem validadas: `vite build` e `tsc --noEmit` passando com 0 erros.

---

### [x] T3.16 — Testes de Ponta a Ponta (E2E) dos Fluxos Críticos `(Concluído)`
- **Descrição:** Suíte de testes automatizados com Playwright cobrindo todo o ciclo operacional automotivo, agendamento online anti-bot e isolamento estrito entre tenants com RLS.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 7: Fase 7 (Linhas 231–234)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L231-L234)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.16 (Linhas 647–650)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L647-L650)
- **Entrega Concluída:**
  - **Suíte Playwright Integrada (`playwright.config.ts`, `pnpm test:e2e`)**:
    - WebServer configurado com boot automático da API Fastify na porta 3333 e health check ativo.
    - Execução sequencial determinística de 27 testes de ponta a ponta com 100% de aprovação.
  - **1. Ciclo Operacional Completo (`e2e/01-critical-flow.spec.ts` — 13 testes)**:
    - 01. Onboarding e Registro da Oficina com provisionamento simultâneo de Gestor e Técnico via `POST /tenant/members`.
    - 02. Cadastro de Cliente, Veículo e Box de Atendimento Físico.
    - 03. Criação de Orçamento (`QUOTE`) com Numeração Sequencial Atômica via sequence isolada.
    - 04. Aprovação do Orçamento (`APPROVED`) pelo cliente/gestor.
    - 05. Agendamento com Alocação de Box (`SCHEDULED`) e validação de disponibilidade.
    - 06. Checklist de Entrada / VCR (`CHECKED_IN`) com registro fotográfico e avarias.
    - 07. Execução Técnica e Cronômetro Oficial (`IN_PROGRESS`) operado pelo Técnico atribuído.
    - 08. Auditoria de QA (`POST /qa/audits`) e Aprovação para `READY`.
    - 09. Pagamento e Liquidação Financeira Atômica via PIX/Cartão.
    - 10. Entrega Oficial do Veículo (`DELIVERED`) com progresso 100%.
    - 11. Emissão de Certificado de Garantia e Passaporte Digital com QR Code (`/public/passports/:token`).
    - 12. Pesquisa NPS Pós-Venda (`/nps/surveys`) com envio de nota pelo link público (`/public/nps/:token`) e bloqueio de resposta duplicada.
    - 13. Rastreamento Público da OS (`/work-orders/tracking/:token`) em tempo real sem exigência de JWT.
  - **2. Agendamento Online e Proteção Anti-Bot (`e2e/02-self-booking.spec.ts` — 6 testes)**:
    - Bloqueio imediato com HTTP 400 em caso de preenchimento do campo armadilha honeypot (`website`).
    - Agendamento público legítimo criando cliente, veículo, OS forçada para `QUOTE`/`ONLINE`, técnico nulo e alocação de box.
    - Prevenção de conflito de horário no mesmo box (HTTP 409 Conflict).
    - Validação de integridade de placa Mercosul e rejeição de tenant inexistente (HTTP 404).
    - Acompanhamento da OS agendada via tracking público por token.
  - **3. Isolamento Estrito Multi-Tenant e RLS (`e2e/03-tenant-isolation.spec.ts` — 8 testes)**:
    - Onboarding simultâneo de Oficina Alpha e Oficina Beta.
    - Listagens de clientes, veículos, boxes e OS estritamente filtradas pelo `tenant_id` da sessão.
    - Acesso direto cruzado (`GET /customers/:id`, `GET /vehicles/:id`, `GET /bays/:id`, `GET /work-orders/:id`) resultando em HTTP 404 Not Found.
    - Mutação cruzada (`PUT /customers/:id`, `PUT /work-orders/:id`) bloqueada com HTTP 404.
    - Simetria total de isolamento e rejeição rigorosa de slugs inexistentes no cabeçalho `x-tenant-slug`.
- **Status da Validação:** 27 de 27 testes Playwright aprovados com sucesso via `pnpm test:e2e`.

---

### [x] T3.17 — Gateway de WhatsApp Desacoplado por Oficina (Padrão OperaBeauty) e Mensagens Transacionais `(Concluído)`
- **Descrição:** Integração com o container `carx-wa-gateway` (Baileys) através de interface desacoplada (`MessageChannel`), replicando estritamente a arquitetura multi-tenant isolada do OperaBeauty (`file:///d:/Repositorios/OperaBeauty/gateway-whatsapp`).
  - **Identidade e Propriedade do Número**: O número de WhatsApp pertence exclusivamente à **oficina cliente (tenant)** e é gerenciado por ela no seu próprio painel web (`apps/web` em *Configurações ➔ WhatsApp da Loja*). Cada loja realiza o pareamento por QR Code ou Pairing Code.
  - **Remetente Oficial**: Todas as notificações de OS, orçamentos, pesquisas NPS e códigos de desafio OTP do portal "Meu Veículo" saem do número da **própria oficina**, nunca da software house, mantendo a confiança e a legitimidade para o cliente final.
  - **Papel no Super Admin**: O Super Admin não gerencia nem envia mensagens pelas lojas. Sua visão é restrita à **telemetria técnica da infraestrutura Docker** (status do daemon `carx-wa`, fila BullMQ e diagnósticos M2M para suporte).
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 13: Gateway de WhatsApp Próprio (Linhas 436–456)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L436-L456)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T3.17 (Linhas 651–654)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L651-L654)
- **Entrega Concluída:**
  - **Contratos e DTOs Compartilhados (`packages/shared/src/whatsapp.ts`)**:
    - Tipos `TenantWhatsAppInstanceDto`, `ConnectWhatsAppInputDto`, `ConnectWhatsAppResponseDto`, `SendWhatsAppMessageInputDto`, `SendWhatsAppMessageResponseDto`, `WhatsAppTelemetrySummaryDto`.
  - **Tabela Relacional & RLS (`tenant_whatsapp_instances`)**:
    - Criada na Migration 024 com isolamento total por tenant, índices e cotas diárias de proteção anti-bloqueio (`daily_limit`).
  - **Serviço de Negócio no Backend (`apps/api/src/whatsapp/whatsapp-service.ts`)**:
    - `getInstance()`: Retorna o status da sessão isolada da oficina.
    - `connectInstance()`: Gating compulsório por plano (`PlanFeatures.WHATSAPP_GATEWAY`), suporte a pareamento sem câmera via **Pairing Code** (código de 8 dígitos) e via **QR Code**, com fallback resiliente e trilha de auditoria (`WHATSAPP_CONNECT_REQUESTED`).
    - `disconnectInstance()`: Desconexão e encerramento seguro do socket Baileys.
    - `sendMessage()`: Validação de plano, checagem de status `CONNECTED`, proteção de cota diária (`daily_limit`), despacho de mensagem e atualização atômica de `daily_messages_count`.
    - `getTelemetryAdmin()`: Telemetria técnica agregada real no PostgreSQL para o Super Admin.
  - **Endpoints Fastify Registrados (`apps/api/src/routes/whatsapp-routes.ts`)**:
    - `GET /tenant/whatsapp/instance` e `POST /tenant/whatsapp/connect`.
    - `POST /tenant/whatsapp/disconnect` e `POST /tenant/whatsapp/send-test`.
    - `POST /internal/whatsapp/webhook`: Sincronização M2M protegida por `timingSafeEqual`.
    - `GET /admin/whatsapp/telemetry`: Endpoint do Super Admin em `superadmin-routes.ts`.
  - **Frontend da Oficina Cliente (`apps/web`)**:
    - Componente [`WhatsAppManager.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/WhatsAppManager.tsx) integrado na página de configurações (`Settings.jsx` na aba *WhatsApp da Loja*).
    - Permite alternar entre Código de Pareamento e QR Code, copiar código com um clique, visualizar cotas diárias e realizar teste de disparo em tempo real.
    - Bloqueio amigável informando ausência de plano com WhatsApp Gateway caso a oficina esteja no plano Básico/Start.
  - **Frontend do Super Admin (`apps/admin`)**:
    - Tela [`WhatsAppManagerPage.tsx`](file:///d:/Repositorios/CarX/apps/admin/src/pages/WhatsAppManagerPage.tsx) 100% livre de dados mockados estáticos, consumindo `adminApi.getWhatsAppTelemetry()` com status do daemon, instâncias ativas, consumo diário e total de disparos.
  - **Suíte de Testes Automatizada (`apps/api/src/whatsapp/whatsapp.test.ts`)**:
    - 9 testes cobrindo bloqueio não autenticado, bloqueio de feature gating para planos sem WhatsApp (403), geração de pairing code, rejeição de envio em sessão não conectada, envio com sucesso e incremento de cota após conexão, desconexão, segurança de webhook M2M e telemetria do Super Admin.
- **Pronto quando:** Concluir uma OS dispara notificação via WhatsApp partindo do número da própria oficina conectada, e a parada do container de WhatsApp enfileira as mensagens sem derrubar a API. *(Validado com sucesso absoluto)*.

---

### [x] T3.18 — Erradicação Definitiva de Dados Mockados no Frontend e Super Admin `(Concluído)`
- **Descrição:** Remoção completa da lógica legada `hasRealConnection()`, eliminação de fallbacks em `localStorage` e substituição de arrays estáticos por chamadas reais aos serviços da API Fastify (`apps/api`) conectados ao PostgreSQL.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 2: Decisão de Arquitetura (Linhas 80–105)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L80-L105)
  - [CarX_Documento_Unico.md — Seção 1.3: O Que Funciona e o Que Precisa Mudar](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L48-L62)
- **Entrega e Higienização Concluída:**
  - **Higienização de Hooks no `apps/web`**:
    - `useCatalog.js`: 100% migrado para `api.catalog` (`getServices`, `getPackages`, `createService`, `updateService`, `deleteService`).
    - `useClients.js`: 100% migrado para `api.customers` (`list`, `getById`, `create`, `update`).
    - `useVehicles.js`: 100% migrado para `api.vehicles` (`list`, `getById`, `getByPlate`, `create`, `update`, `delete`).
    - `useInventory.js`: 100% migrado para `api.materials` (`list`, `getById`, `create`, `update`, `delete`, `createMovement`).
    - `useOrders.js`: 100% migrado para `api.workOrders`, `api.payments`, `api.storage` e `api.inspections`.
    - `useQuotes.js`: 100% migrado para `api.workOrders` e `api.payments`.
    - `useProfiles.js`: 100% migrado para `api.members` (`list`, `update`).
    - `useWorks.js`: 100% migrado para `api.storage` (`listFiles`, `upload`, `deleteFile`).
    - `useNotifications.js`: 100% migrado para conexão em tempo real via Server-Sent Events (`api.realtime.getEventsUrl()`) e persistência segura no cliente.
  - **Higienização de Páginas e Componentes Especiais**:
    - `PesquisaNPS.jsx`: 100% migrado para `api.workOrders` e `api.nps.createSurvey`.
    - `SelfBooking.jsx`: 100% migrado para `api.catalog.getServices()` e `api.appointments.bookOnline(...)`.
    - `CarVisualChecklist.jsx`: 100% migrado para `api.inspections.getByWorkOrder(...)`.
    - `Tv360OfficeView.jsx`: 100% migrado para `api.nps.getMetrics()` e sincronização em tempo real (SSE).
    - `Colaboradores.jsx`: 100% migrado para endpoints nativos `api.members.create(...)` e `api.members.resetPassword(...)` com hash `bcryptjs`.
    - `Profile.jsx`: 100% migrado para `api.members.resetPassword(...)`.
    - `Settings.jsx`: 100% migrado para `api.branding`.
    - `BrandContext.jsx`: 100% migrado para `api.branding.get()` e `api.branding.update(...)`.
    - `ApiWebhooksManager.jsx`: 100% migrado para endpoints reais da API Fastify.
    - `TemplatesMarketplace.jsx`: 100% migrado para `api.catalog.createService(...)`.
    - `lib/supabase.js`: Arquivo neutralizado com `supabase = null` e `hasRealConnection = () => false`.
  - **Eliminação Definitiva de Mocks e Hardcodes no Super Admin (`apps/admin` e `apps/api`)**:
    - `TenantWizardPage.tsx`: Removido array estático `plans = [...]` hardcoded. O assistente de criação de oficina agora consome 100% de dados dinâmicos da rota `/admin/plans` (`adminApi.listPlans()`), vinculando `slug`, `name`, `price_cents` e `interval` reais dos planos cadastrados no banco de dados com estado de carregamento amigável e exibição dinâmica na tela de confirmação.
    - `LeadsPage.tsx`: Substituído `<select>` estático de planos no modal de conversão de leads por busca dinâmica via `adminApi.listPlans()`, garantindo que novos planos ou planos canônicos criados apareçam em tempo real para seleção comercial.
    - `DashboardPage.tsx`: Implementado empty state amigável na tabela de distribuição de receita por plano e blindagem de cálculos para evitar divisões por zero ou valores indefinidos.
    - `apps/api/src/superadmin/superadmin-service.ts`:
      - Em `getSaasMetrics()`: Substituído `total_work_orders: 0` fixo por agregação real `SELECT COUNT(*)::int as count FROM work_orders`.
      - Em `listTenants()`: Substituído `0 as work_orders_count` fixo por subquery relacional `(SELECT COUNT(*)::int FROM work_orders w WHERE w.tenant_id = t.id) as work_orders_count`.
      - Em `getTenantDetails()`: Agregadas contagens reais de `units_count`, `users_count`, `work_orders_count` e `storage_bytes`.
    - `AdminLayout.tsx`: Garantido atributo `end` nos `NavLink` para que a rota `/tenants` não permaneça selecionada quando o usuário navegar para `/tenants/new` (Criar Oficina).
    - `WhatsAppManagerPage.tsx`: Integrado 100% ao endpoint real de telemetria `adminApi.getWhatsAppTelemetry()` com dados reais de sessões do gateway multi-tenant.
  - **Expurgo e Limpeza Geral de Dados Mockados do Banco de Dados (`apps/api/src/scripts/clean-mock-data.ts`)**:
    - **Planos Preservados**: Mantidos 100% intactos os planos comerciais canônicos (`Essencial`, `Profissional`, `Premium`) na tabela `plans`.
    - **Acessos de Super Admin Preservados**: Mantidos os operadores `superadmin_users` e `platform_admins`.
    - **Limpeza de Testes e Mocks**: Expurgadas 585 oficinas de testes (`tenants`), 247 contratos de testes (`contracts`), 60 faturas de testes (`invoices`), 28 leads de testes (`leads`), 1.076 logs residuais de testes (`audit_logs`) e 633 usuários de testes (`users`), deixando as telas do Super Admin 100% limpas e prontas para uso real.
  - **Correção de Erros de Execução e Console no Super Admin**:
    - **Migration 024**: Aplicada a migração `024_coupons_and_whatsapp_instances.up.sql`, criando as tabelas `coupons`, `coupon_redemptions` e `tenant_whatsapp_instances`, eliminando o erro HTTP 500 em `GET /admin/coupons` e `GET /admin/whatsapp/telemetry`.
    - **AuditLogsPage.tsx**: Corrigido `TypeError: Cannot read properties of undefined (reading 'length')` alinhando o payload retornado pelo Fastify com `{ data: [], logs: [], pagination: {} }` e protegendo o estado local contra valores indefinidos.
    - **React Router Future Flags**: Habilitados `v7_startTransition` e `v7_relativeSplatPath` em `apps/admin/src/App.tsx`, eliminando os avisos de deprecation do console.
- **Status da Validação:**
  - Banco de Dados (Tenants): **0 registros** (limpo).
  - Banco de Dados (Contratos): **0 registros** (limpo).
  - Banco de Dados (Faturas): **0 registros** (limpo).
  - Banco de Dados (Leads): **0 registros** (limpo).
  - Banco de Dados (Planos Preservados): **3 planos comerciais intactos**.
  - Banco de Dados (Superadmins Preservados): **2 contas administrativas ativas**.
  - Rota `/admin/coupons`: **HTTP 200 OK** (0 erros).
  - Rota `/admin/whatsapp/telemetry`: **HTTP 200 OK** (0 erros).
  - Tela `/audit`: **HTTP 200 OK** (renderiza perfeitamente com empty state).
  - Console do navegador: **0 erros e 0 warnings de React Router**.
  - Typecheck Monorepo (`pnpm typecheck`): **0 erros**.
  - ESLint Monorepo (`apps/admin`): **0 erros**.
  - Build de Produção `@carx/admin`: **Sucesso (5.28s)**.
  - Build de Produção `@carx/web` (PWA): **Sucesso (14.64s, 89 precached assets)**.
  - Build de Produção Monorepo (`pnpm -r build`): **100% Concluído com código de saída 0**.

---

### [x] T3.19 — Homologação de Qualidade, Desempenho k6 e Segurança Corporativa (System Quality Gate) `(Concluído)`
- **Descrição:** Execução do pipeline oficial de auditoria de qualidade, regressão, testes de carga progressivos com k6/runner de alta precisão (1 -> 5 -> 10 -> 25 VUs locais), inspeção de conexões e RLS no PostgreSQL, isolamento de cache e testes de segurança corporativa, gerando relatório auditado em `quality/reports/quality-report.md` e `quality/reports/quality-summary.json`.
- **Melhor Momento de Execução:** Imediatamente após a conclusão dos testes E2E do T3.16 e erradicação de dados mockados do T3.18, atuando como o gate final de aprovação (Quality Gate) para o encerramento da Fase 3 e pré-requisito de release.
- **Referência do Arquivo de Instruções:** [`system-quality-gate/SKILL.md`](file:///d:/Repositorios/CarX/system-quality-gate/SKILL.md).
- **Pronto quando:** O relatório `quality-report.md` e o resumo `quality-summary.json` forem gerados com status APROVADO ou APROVADO COM RESSALVAS documentadas.
- **Status da Validação — 100% APROVADO:**
  - **Plano de Teste Estruturado:** [`quality/plans/test-plan.md`](file:///d:/Repositorios/CarX/quality/plans/test-plan.md) com análise de risco ALTO/CRÍTICO e matriz de testes.
  - **Análise Estática & Tipos:** `pnpm typecheck` (0 erros em 5 pacotes) e `pnpm lint` (0 erros em 165+ arquivos).
  - **Testes Unitários & Integração Backend:** **288 de 288 testes aprovados** (0 falhas) cobrindo autenticação, RBAC, auditoria, planos, storage, superadmin, OS, financeiro, agendamentos, estoque, checklists e RLS. Evidência: [`quality/evidence/unit-tests-evidence.txt`](file:///d:/Repositorios/CarX/quality/evidence/unit-tests-evidence.txt).
  - **Testes E2E (Playwright):** **27 de 27 testes aprovados** (0 falhas) cobrindo ciclo de vida operacional de 13 etapas, agendamento online público anti-bot e isolamento multi-tenant simétrico. Evidência: [`quality/evidence/playwright-evidence.txt`](file:///d:/Repositorios/CarX/quality/evidence/playwright-evidence.txt).
  - **Desempenho sob Carga Progressiva (k6 / Runner):** 4 degraus executados (1, 5, 10 e 25 VUs locais), totalizando **9.743 requisições processadas** com **0.00% de taxa de erro**, vazão de pico de **388.4 req/s** e **p95 de 117.83 ms** (muito abaixo do teto de 2.000 ms). Evidência: [`quality/evidence/benchmark-2026-11-10T22-30-13-461Z.json`](file:///d:/Repositorios/CarX/quality/evidence/benchmark-2026-11-10T22-30-13-461Z.json).
  - **Auditoria do Banco PostgreSQL:** 100% das 45 tabelas de tenant com RLS ativo e forçado (`relrowsecurity = true`, `relforcerowsecurity = true`), zero transações zumbis e zero locks bloqueantes (`blockingLocks: []`). Evidência: [`quality/evidence/postgres-audit.json`](file:///d:/Repositorios/CarX/quality/evidence/postgres-audit.json).
  - **Relatórios Oficiais Gerados:**
    - Documento Humano Completo (12 seções): [`quality/reports/quality-report.md`](file:///d:/Repositorios/CarX/quality/reports/quality-report.md).
    - Resumo Estruturado em JSON: [`quality/reports/quality-summary.json`](file:///d:/Repositorios/CarX/quality/reports/quality-summary.json).

---

## 🔄 FASE 4 — Migração de Dados do Legado (ETL)

**Objetivo:** Script de migração para transportar com segurança o histórico das instâncias em produção do Supabase legado para o novo banco de dados relacional multitenant do CarX.

### [x] T4.1 — Script de ETL e Ensaio de Carga `(Dispensado — Início do Zero)`
- **Descrição:** Conforme definição expressa do projeto, o CarX não migrará bases legadas em Supabase/LocalStorage, iniciando sua operação comercial e técnica do absoluto zero com garantia total de integridade relacional, RLS e dados limpos.
- **Status:** `[x] Concluído / Dispensado`.

---

## 💰 FASE 5 — Produto SaaS Comercial & Faturamento

**Objetivo:** Habilitar os canais de aquisição de novas oficinas, cobrança recorrente e processo de onboarding self-service.

### [x] T5.1 — Landing Page de Vendas de Alta Conversão `(Concluído)`
- **Descrição:** Landing page corporativa de alta conversão, responsiva e performática, com SEO focado nos segmentos automotivos, calculadora interativa de ROI e captura de leads integrada ao Super Admin via endpoint com proteção honeypot.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 12: Landing Page de Vendas (Linhas 404–434)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L404-L434)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.1 (Linhas 667–670)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L667-L670)
- **Assets Visuais & Design System:** Identidade Volt `#C8F52E` e Asfalto `#0E1116`, tipografia limpa, ícones do Lucide React e layout em grid de acordo com `skills/ui-design-system`.
- **Entrega Concluída:**
  - **Backend (`apps/api`)**: Endpoint público `POST /public/leads` com proteção honeypot anti-bot (`website`), enriquecimento de notas com segmento e tamanho de equipe, validado por teste automatizado (`superadmin.test.ts`).
  - **Página Principal da Landing Page (`apps/web/src/pages/LandingPage.tsx`)**:
    - Navbar corporativa com logo CarX, links de ancoragem e botões de ação ("Entrar" e "Testar Grátis").
    - Hero Section com badge de status, promessa de valor central, botões de ação e mockup do cockpit operacional.
    - Prova social com estatísticas de mercado (+50.000 OS, 99.9% uptime, 100% isolamento RLS).
    - Linha do tempo visual do fluxo da oficina (Orçamento, Agendamento, Execução PWA, Garantia & NPS).
    - Visão por Papel (Dono, Atendente, Operador PWA e Cliente Final).
    - Grid de Grandes Diferenciais Competitivos (TV da Oficina, Bobinas de PPF/Insulfilm, WhatsApp próprio, Passaporte Digital QR, Laudo VCR com S3 e Cronômetro de Foco Único).
    - Segmentos Automotivos com abas dedicadas para PPF, Películas Solares, Estética/Detailing e Mecânica Geral.
    - Calculadora Interativa de ROI calculando horas economizadas e receita recuperada em tempo real.
    - Tabela de Planos e Preços (Essencial R$ 69,90, Profissional R$ 149,90, Premium R$ 299,90).
    - FAQ interativo em accordion.
    - Formulário de Captura de Leads com honeypot anti-bot e integração com `POST /public/leads`.
    - Banner LGPD de Cookies com persistência em `localStorage`.
    - Rodapé institucional completo.
  - **Páginas Institucionais Legais**:
    - Termos de Uso: [`apps/web/src/pages/TermsOfService.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/TermsOfService.tsx).
    - Política de Privacidade e LGPD: [`apps/web/src/pages/PrivacyPolicy.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/PrivacyPolicy.tsx).
  - **Roteamento Integrado (`apps/web/src/App.jsx`)**: Rotas `/landing`, `/precos`, `/recursos`, `/para/:segment`, `/termos` e `/privacidade`.
- **Pronto quando:** O formulário público cadastra leads reais que aparecem instantaneamente na aba de Leads do Super Admin com o botão "Converter em Oficina". Validação 100% aprovada.

---

### [x] T5.2 — Cobrança Recorrente Automática de Licenças `(Concluído)`
- **Descrição:** Integração completa do backend com o gateway de pagamentos Mercado Pago para cobrança automática das mensalidades do SaaS via Pix dinâmico, código copia-e-cola e QR Code nativo, conciliados por webhook assíncrono com blindagem OWASP e reativação instantânea de lojas em atraso.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.2 (Linhas 671–674)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L671-L674)
- **Entrega Concluída:**
  - **Migration 025 (`025_recurring_billing_and_mercadopago.up.sql`)**: Adicionou colunas `pix_code`, `pix_qr`, `gateway_provider`, `gateway_transaction_id`, `gateway_invoice_url`, `expires_at` na tabela `invoices` e criou a tabela `platform_billing_settings` com isolamento e criptografia para credenciais globais do gateway.
  - **Serviço Mercado Pago (`apps/api/src/billing/mercadopago-service.ts`)**:
    - `generateInvoicePixCharge`: Emite cobrança oficial no Mercado Pago com expiração configurada e fallback determinístico no modo sandbox/simulador.
    - `verifyPayment`: Validação em tempo real do status com o gateway (`approved`).
    - `settleInvoicePayment`: Baixa atômica na fatura, renovação do contrato por 30 dias e reativação instantânea do tenant (`status = 'active'`, `is_read_only = false`, limpeza de `suspended_reason` e registro de evento em `billing_dunning_events`).
    - `processWebhook`: Processamento idempotente de notificações de pagamento.
  - **Rotas de Faturamento (`apps/api/src/routes/billing-routes.ts`)**:
    - `POST /billing/invoices/:id/pix`: Gera PIX com QR code e copia-e-cola para a fatura.
    - `POST /billing/webhook/mercadopago` e `POST /billing/webhook`: Recepção e liquidação automática via webhook.
    - `GET /admin/billing/settings` e `PUT /admin/billing/settings`: Gerenciamento seguro das chaves e modo sandbox pelo Super Admin.
  - **Testes Automatizados (`apps/api/src/billing/recurring-billing.test.ts`)**: 5 testes cobrindo geração de PIX, blindagem OWASP, reativação automática em suspensão, idempotência e rotas administrativas (100% de aprovação).
- **Pronto quando:** O pagamento de uma fatura de teste via webhook reativa uma loja suspensa instantaneamente sem intervenção manual. `[VALIDADO E HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.3 — Onboarding Self-Service Guiado por Segmento `(Concluído)`
- **Descrição:** Experiência completa de auto-cadastro e boas-vindas na qual o novo dono de oficina cria sua conta diretamente pela Landing Page, escolhe seu nicho automotivo (PPF, Películas Solares, Estética/Detailing ou Mecânica) e inicia o período de testes de 14 dias com checklists e catálogo prontos, acompanhado por um checklist interativo de primeiros passos.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 5: Fase 5 (Linhas 197–204)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L197-L204)
  - [CarX_Documento_Unico.md — Seção Parte II: Tarefa T5.3 (Linhas 675–678)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L675-L678)
- **Entrega Concluída:**
  - **Backend (`apps/api`)**:
    - Endpoints públicos `POST /public/onboarding` e `POST /auth/self-register`: Provisionamento transacional atômico de tenant, matriz, usuário proprietário, contrato trial de 14 dias, injeção dos 5 serviços base e checklist do nicho, emissão de par de tokens JWT (acesso de 24h e refresh rotativo de 7 dias) e proteção honeypot anti-bot (`website`).
    - Endpoint `GET /tenant/onboarding/status`: Consulta do status dos 4 passos essenciais com apuração real no banco de dados (`customers` e `work_orders`).
    - Endpoints `POST /tenant/onboarding/complete` e `POST /tenant/onboarding/step`: Gestão do ciclo de onboarding persistido em `tenants.settings`.
  - **Frontend (`apps/web`)**:
    - Página de Onboarding Completa ([`apps/web/src/pages/OnboardingPage.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OnboardingPage.tsx)): Stepper visual em 3 passos (Sua Oficina com subdomínio `.carx.com.br`, Especialidade do Nicho com prévia dos serviços e Acesso com 14 Dias Grátis sem cartão). Rotas registradas: `/onboarding`, `/comecar-gratis` e `/cadastro`.
    - Componente de Guia de Primeiros Passos ([`apps/web/src/components/OnboardingGuideBanner.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/OnboardingGuideBanner.tsx)): Banner de boas-vindas no Dashboard com barra de progresso, contador de dias de trial e botões de atalho para os 4 passos.
    - Integração de CTAs na Landing Page: Botões da Navbar, Hero e Tabela de Planos apontando diretamente para `/onboarding`.
  - **Testes Automatizados (`apps/api/src/provisioning/self-onboarding.test.ts`)**: 4 testes cobrindo auto-cadastro, injeção de catálogo, honeypot anti-bot, rejeição de e-mail duplicado (409) e fluxo completo: cadastro -> cliente -> veículo -> primeira OS emitida -> onboarding 100% concluído.
- **Pronto quando:** Um novo usuário realiza o cadastro e cria sua primeira OS completa em menos de 5 minutos sem auxílio de suporte. `[VALIDADO E HOMOLOGADO COM SUCESSO]`.

---

### [x] Higienização e Purificação Geral de Dados Mockados `(Concluído)`
- **Descrição:** Higienização total de dados de testes e desenvolvimento em 55 tabelas públicas do PostgreSQL através de rotina atômica (`TRUNCATE TABLE ... RESTART IDENTITY CASCADE`), preservando com integridade estrita a tabela `plans` com os 3 planos comerciais definitivos (`essencial`, `profissional`, `premium`) e o usuário Super Admin canônico (`admin@carx.com.br`) para governança da plataforma.
- **Tabelas Higienizadas:** `tenants`, `units`, `users`, `memberships`, `customers`, `vehicles`, `work_orders`, `work_order_items`, `work_order_events`, `work_order_photos`, `payments`, `stock_items`, `stock_transactions`, `bays`, `appointments`, `inspections`, `inspection_photos`, `technician_timers`, `qa_inspections`, `warranty_certificates`, `nps_surveys`, `commission_rules`, `commission_entries`, `customer_portal_otps`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`, `tenant_whatsapp_instances`, `coupons`, `coupon_redemptions`, `leads`, `invoices`, `contracts`, `billing_dunning_events`, `audit_logs`, etc.
- **Resultado da Verificação:**
  - `tenants`: 0
  - `work_orders`: 0
  - `customers`: 0
  - `leads`: 0
  - `plans`: 3 planos comerciais ativos (Essencial R$ 69,90, Profissional R$ 149,90, Premium R$ 299,90)
  - `superadmin_users`: 1 usuário ativo (`admin@carx.com.br`)
- **Status:** Concluído com sucesso absoluto. Sistema CarX pronto para início com dados 100% limpos.

---

## 🎨 FASE 5.5 — Revitalização Visual do Cockpit do Gestor & Fidelidade Total ao Rebrand (`rebraind/`)

> **Objetivo:** Reformulação completa da experiência visual e funcional do painel de gestão do lojista (`apps/web`), extirpando de forma definitiva todos os resquícios estéticos do legado OsSystem e implementando com 100% de fidelidade os protótipos de alta fidelidade da pasta [**rebraind/**](file:///d:/Repositorios/CarX/rebraind/).
> **Assets Visuais Oficiais de Referência:**
> - [**`rebraind/Gestor · Agenda@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Agenda@2x.png)
> - [**`rebraind/Gestor · Nova OS@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Nova%20OS@2x.png)
> - [**`rebraind/Gestor · Relatórios NPS@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Relat%C3%B3rios%20NPS@2x.png)
> - [**`rebraind/Gestor · Painel@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Painel@2x.png)
> - [**`rebraind/TV da loja@2x.png`**](file:///d:/Repositorios/CarX/rebraind/TV%20da%20loja@2x.png)

---

### [x] T5.5.1 — Correção de Rotas & Ações Críticas do Dashboard `(Concluído)`
- **Descrição:** Resolver de imediato os botões com rotas quebradas no topo do Dashboard do gestor (`apps/web/src/pages/Dashboard.tsx`).
- **Problemas Identificados:**
  - Botão **Monitor TV**: Atualmente executa `navigate('/monitor-tv')`, mas a rota oficial configurada no `App.jsx` é `/tv`. Redireciona incorretamente para a raiz gerando efeito de botão inoperante.
  - Botão **+ Nova OS**: Atualmente executa `navigate('/ordens-servico')`, enquanto a rota do sistema é `/ordens`.
  - Botão **Agenda Boxes**: Garantir transição fluida para a nova rota `/agenda`.
- **Entrega:**
  - Correção dos disparadores de navegação no `Dashboard.tsx`.
  - Criação de aliases de rota no `App.jsx` (`/monitor-tv` -> `/tv`, `/ordens-servico` -> `/ordens`) para robustez absoluta contra links antigos ou favoritos do navegador.
- **Pronto quando:** O clique no botão "Monitor TV" abre instantaneamente a visão de pátio em tela cheia e o botão "+ Nova OS" abre a criação guiada sem recarregar a tela. `[HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.5.2 — Redesenho Completo da Agenda por Box & Operador `(Concluído)`
- **Descrição:** Reconstrução integral da tela de Agenda ([`apps/web/src/pages/Agenda.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Agenda.tsx)) eliminando a grade sem vida e implementando fielmente o layout de [**`rebraind/Gestor · Agenda@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Agenda@2x.png).
- **Especificações Visuais e Funcionais Concluídas:**
  - **Cabeçalho:**
    - Título `Agenda` com seletor de data dinâmico ("Sex, 30 de out").
    - Toggle de visualização em pílulas: `Dia` (ativo com fundo preto `#0E1116` e texto branco) e `Semana` (inativo com fundo branco/cinza).
    - Botão de ação primária em Verde Volt (`#C8F52E`): `+ Novo agendamento`.
  - **Barra Informativa de Agendamento Online:**
    - Faixa clean superior destacando: *"Agendamento online ativo · 3 pedidos novos aguardam sua aprovação"*.
    - Botão de ação rápida na direita: *"Copiar link da loja"* com feedback de cópia instantânea.
  - **Grade Temporal de Ocupação por Box:**
    - Eixo vertical com horários das **08h às 18h** em linhas horizontais suaves.
    - Colunas divididas por estações de trabalho:
      - `Box 1 · Lucas` (Técnico responsável)
      - `Box 2 · Rafa` (Técnico responsável)
      - `Box 3 · livre` (Box disponível)
  - **Cards de Agendamento Modernos (Paleta Pastel Premium do Rebrand):**
    - **Serviço em Execução:** Card com destaque em Verde Volt suave (`#C8F52E`) para insulfilm/detailing com informações do veículo e serviço (ex: *"Chevrolet Montana / Insulfilme completo · em execução"*).
    - **PPF em Execução:** Card em Azul Pastel Suave (`#BAE6FD`) para Paint Protection Film (ex: *"BYD Seal / PPF frontal · em execução"*).
    - **Aguardando Aprovação:** Card em Âmbar/Pêssego Pastel (`#FED7AA`) para orçamentos pendentes do cliente (ex: *"VW Tera / Aguardando aprovação do cliente"*).
    - **Agendado / Entrada Prevista:** Card em Cinza Suave (`#EEF2F6`) para carros com chegada marcada (ex: *"Fiat Fiorino / Lalamove 3AD · 12:00"*).
    - **Slots Livres Interativos:** Área delimitada com borda tracejada em Verde Volt (`border-2 border-dashed border-[#C8F52E]`) exibindo *"Horário livre · 15h"* que permite ao gestor agendar diretamente com 1 clique no horário vazio.
- **Pronto quando:** A tela de Agenda estiver visualmente idêntica à imagem oficial do Rebrand, com suporte a troca de dias, visualização de boxes e clique para novo agendamento. `[HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.5.3 — Redesenho da Criação de Ordem de Serviço & Orçamento Guiado `(Concluído)`
- **Descrição:** Reconstrução integral da tela de abertura de OS e orçamentos ([`apps/web/src/pages/NovaOrdemServico.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/NovaOrdemServico.tsx)) seguindo rigorosamente o protótipo [**`rebraind/Gestor · Nova OS@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Nova%20OS@2x.png).
- **Especificações Visuais e Funcionais Concluídas:**
  - **Stepper Superior em 5 Etapas (Navegação Visual do Rebrand):**
    - `✓ Cliente` (concluído)
    - `✓ Veículo` (concluído)
    - `3. Serviços` (etapa atual ativa com pill arredondada em Verde Volt)
    - `4. Checklist` (próxima etapa)
    - `5. Agenda` (etapa final)
  - **Layout em 2 Colunas (Cards Arredondados `rounded-3xl` em Fundo Off-White):**
    - **Coluna Esquerda (Dados do Atendimento):**
      - **Card Cliente:** Nome em negrito (ex: *"Cleiton Alves"*), telefone formatado e indicador de fidelidade (ex: *"3 serviços anteriores"*).
      - **Card Veículo com Destaque de Placa:**
        - Badge de Placa Mercosul destacada (`ABC1D23`).
        - Tag preta com texto em Verde Volt: `Preenchido pela placa`.
        - Detalhamento veicular: Modelo, Ano, Cor e Porte (ex: *"VW Tera 2026 · Prata · porte SUV compacto"*).
      - **Card Serviços & Combos Sugeridos:**
        - Banner verde claro de Upsell Automático: *"Combo sugerido: Insulfilme + Vitrificação com 10% de desconto"*.
        - Lista de serviços com seleção visual rica (checkbox redondo, nome, valor monetário formatado).
        - Exemplo: *Insulfilme completo (R$ 560,00)*, *Vitrificação de faróis (R$ 180,00)*, *PPF frontal (R$ 2.400,00)*.
        - Legenda de rodapé: *"Preços calculados pelo porte do veículo."*
    - **Coluna Direita (Painel Fixo de Fechamento Financeiro):**
      - Resumo discriminado: Serviços selecionados e Descontos aplicados.
      - Total em destaque tipográfico gigante (ex: **R$ 560,00**).
      - Campo de **Sinal por Pix** (ex: *R$ 50,00*).
      - Botão primário Verde Volt: **Gerar OS e agendar**.
      - Botão secundário branco com borda: **Salvar como orçamento**.
      - Link rápido de ação: **Enviar orçamento por WhatsApp**.
- **Pronto quando:** O operador/gestor cria uma OS pelo stepper visual idêntico ao Rebrand, selecionando combos e gerando o orçamento e sinal via Pix com 1 clique. `[HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.5.4 — Redesenho de Relatórios & Cockpit de Retenção NPS `(Concluído)`
- **Descrição:** Reestruturação do módulo de Relatórios ([`apps/web/src/pages/Relatorios.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Relatorios.tsx)) implementando a aba de inteligência de retenção e pesquisa NPS idêntica a [**`rebraind/Gestor · Relatórios NPS@2x.png`**](file:///d:/Repositorios/CarX/rebraind/Gestor%20·%20Relat%C3%B3rios%20NPS@2x.png).
- **Especificações Visuais e Funcionais Concluídas:**
  - **Navegação Superior por Abas (Pills do Rebrand):**
    - `Visão gerencial`
    - `NPS e retenção` (aba ativa em preto com texto branco)
    - `Garantias e revisões` com badge de alerta (ex: `4 vencendo`)
    - `DRE e fluxo de caixa`
  - **Filtros e Controles do Topo:**
    - Dropdown de período: *"Este mês"*.
    - Dropdown de categoria: *"Todos os serviços"*.
    - Botão de privacidade: *"Ocultar valores"*.
    - Botão de exportação: *"Imprimir"* (preto com texto branco).
  - **Grid de Cards de Métricas de Satisfação:**
    - **Card Preto de Destaque:** NPS do mês em fonte gigante Verde Volt (`72`), acompanhado de *"38 avaliações · zona de excelência"*.
    - **Card Promotores (9-10):** `74%` com barra de progresso em Verde Volt.
    - **Card Neutros (7-8):** `24%` com barra de progresso em Âmbar/Laranja.
    - **Card Detratores (0-6):** `2%` com barra de progresso em Vermelho.
  - **Painel de Ações de Disparo via WhatsApp:**
    - Seção à esquerda: *"Avaliar hoje · 10 clientes (Serviços entregues nas últimas 24 horas)"*.
    - Botão de disparo em massa em Verde Volt: **"Enviar para os 10 pelo WhatsApp"**.
    - Lista de veículos entregues recentemente com botão individual *"Enviar"* para cada cliente.
    - Seção à direita:
      - Card *"Envio automático: 24 h após a entrega"* com toggle switch em Verde Volt.
      - Card de Alerta de Detrator com borda vermelha suave: *"Atenção: detrator / Nota 4 · OS 548 / 'Atrasou a entrega.' Ligar hoje para o cliente."* com botão *"Registrar contato"*.
      - Card de Integração com Google Reviews: *"Pedir avaliação no Google / Promotores recebem o link automaticamente."*
- **Pronto quando:** O gestor visualiza os índices reais de NPS, dispara mensagens de pós-venda em lote pelo WhatsApp e recebe alertas de clientes insatisfeitos para reversão imediata. `[HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.5.5 — Higienização & Harmonização Visual das Telas Restantes `(Concluído)`
- **Descrição:** Realizar varredura estética nas telas secundárias (`/clientes`, `/vendas`, `/servicos`, `/estoque`, `/colaboradores`, `/settings`) eliminando elementos desbotados, fundos pesados e estilos residuais do legado OsSystem.
- **Diretrizes de Aplicação:**
  - Fundo geral das telas em cinza off-white limpo (`#F3F5F7`).
  - Cards e tabelas em branco puro com bordas finas e cantos arredondados (`rounded-3xl` e borda `#E1E6EC`).
  - Substituição de quaisquer botões verdes esmeralda (`#059669`) pelos tokens oficiais do CarX: Verde Volt (`#C8F52E` com texto `#0E1116`) e Preto Grafite (`#0E1116`).
  - Padronização de toolbars de busca, paginação e badges de status automotivo.
- **Pronto quando:** Toda e qualquer tela acessível pelo menu lateral do gestor exibir padrão visual coeso, premium e idêntico à linguagem visual estabelecida em `rebraind/`. `[HOMOLOGADO COM SUCESSO]`.

---

### [x] T5.5.6 — Unificação Estrita do Design System Fiel a `rebraind/` e `rebraind/HTML/` `(Concluído)`
- **Descrição:** Implementação de layout base unificado no Gestor (`apps/web`), alinhando o menu e casca 100% com o Super Admin e o protótipo `rebraind/Gestor · Painel@2x.png`, aplicando os tokens canônicos dos templates HTML oficiais (`rebraind/HTML/*.dc.html`).
- **Entregas Concluídas:**
  - **Sidebar Oficial Escura (`#0E1116`):**
    - Logo CarX com badge Volt `[CX]` + tipografia Space Grotesk branca e subtítulo do tenant.
    - Navegação com pills verticais: `Painel`, `Agenda`, `Vendas`, `Ordens de serviço`, `Clientes`, `Estoque`, `Relatórios`, `Serviços`, `Colaboradores` e `Configurações`.
    - Item ativo destacado em Verde Volt (`bg-[#C8F52E] text-[#0E1116] font-bold rounded-2xl`).
    - Itens inativos com texto `#9AA7B8`, hover branco com fundo sutil.
    - Rodapé com atalho Monitor TV (badge pulsante "Ao vivo"), mini-card do gestor e logout.
  - **Remoção do Header Legado:**
    - O `Header.jsx` antigo cinza com sininho legado e barra duplicada foi eliminado no desktop. Cada tela comanda seu próprio cabeçalho integrado.
    - Topbar minimalista preta `#0E1116` exclusiva para mobile (`lg:hidden`).
  - **Dashboard Fiel a `Gestor · Painel@2x.png`:**
    - Topo integrado: `Bom dia, [Nome]`, data e pátio ao vivo com ponto verde pulsando, botões Monitor TV, Agenda e `+ Nova OS`.
    - Grid de 4 Cards de Métricas Brancos com borda `#E1E6EC` e cantos `rounded-3xl`: Faturamento convertido, Aguardando início, Em execução e Entregues.
    - Bloco `Pátio agora` em container `#ECEFF3` com colunas `Aguardando`, `Em execução` (borda verde volt de 2px) e `Prontas`.
    - Bloco `Atenção hoje` com alertas de orçamentos pendentes, estoque crítico de bobina e satisfação NPS.
  - **Harmonização Total de TODAS as Telas:**
    - `Agenda.tsx` fiel ao HTML do designer com grid de horários e boxes.
    - `NovaOrdemServico.tsx` fiel a `Nova_OS.dc.html` com stepper e fechamento.
    - `Relatorios.tsx` fiel a `Relatorios_NPS.dc.html` com cards de NPS e disparos.
    - `Clientes.jsx`, `Vendas.jsx`, `OrdensServico.tsx`, `Materiais.jsx`, `Servicos.jsx`, `Colaboradores.jsx` e `Settings.jsx` com cabeçalho limpo, botões Volt/Dark e cards `rounded-3xl` sobre fundo `#F3F5F7`.
- **Validação:**
  - Build Vite de produção executado com 100% de sucesso (`✓ built in 46.09s`).
  - Checagem estrita de tipos (`tsc --noEmit`) com zero erros.

---



## ⚡ FASE 6 — Diferenciais Competitivos em Ondas

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 6 (Linhas 205–229)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L205-L229).

### [🟡 Em Andamento] Onda 1 — Impacto Imediato (Primeiro Mês)

#### [x] T6.1 — Orçamento Digital com Aceite Online & Sinal Pix `(Concluído)`
- **Descrição:** Implementação do fluxo ponta a ponta do Orçamento Digital com link público seguro (`/proposta/:token` e `/orcamento/:token`), termo de aceite formal com captura de IP e assinatura digital, cobrança e liquidação atômica de sinal Pix dinâmico (com EMV padrão Banco Central e QR Code), com avanço automático da OS e notificação em tempo real (SSE) para o painel do gestor.
- **Respeito Estrito ao Isolamento de WhatsApp por Plano:**
  - A conexão de WhatsApp é de propriedade exclusiva de cada oficina conectada em seu próprio painel via socket Baileys.
  - Oficinas no Plano Básico/Essencial (sem módulo de gateway) não geram custos de infraestrutura: utilizam exclusivamente o compartilhamento manual via link direto do WhatsApp Web (`https://wa.me/...`) com a mensagem pré-formatada contendo o link da proposta.
  - Oficinas em planos com `WHATSAPP_GATEWAY` e socket conectado realizam o envio automatizado em segundo plano.
- **Entregas Concluídas:**
  - **Migration 026 (`026_quote_online_acceptance.up.sql`)**: Adicionadas as colunas `accepted_at`, `accepted_ip`, `accepted_user_agent`, `accepted_signature_name`, `deposit_required_cents`, `deposit_pix_code`, `deposit_pix_qr_base64`, `deposit_paid_at` e `public_notes` na tabela `work_orders`.
  - **Gerador de Pix EMV Bacen (`apps/api/src/payments/pix-generator.ts`)**: Geração de código Pix Copia e Cola dinâmico e QR Code compatível com todas as instituições financeiras nacionais.
  - **Serviço de Negócio (`apps/api/src/work-orders/work-order-service.ts`)**:
    - `getPublicQuote`: Consulta pública protegida contra IDOR por UUID, com dados completos da loja, veículo e mascaramento LGPD de dados sensíveis.
    - `acceptPublicQuote`: Validação de assinatura digital, aceite dos termos legais, auditoria de IP/User-Agent, geração de Pix dinâmico se houver sinal e emissão de evento SSE (`work_order.updated`).
    - `confirmDepositPix`: Liquidação atômica do sinal nas tabelas `payments` e `deposits`, atualização de `paid_cents` e transição para `APPROVED`.
    - `rejectPublicQuote`: Recusa formal do orçamento pelo cliente com motivo registrado.
    - `sendQuoteWhatsApp`: Roteamento inteligente entre envio via socket Baileys (se plano compatível) ou link manual `wa.me`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/work-order-routes.ts`)**:
    - `GET /public/quotes/:token`
    - `POST /public/quotes/:token/accept`
    - `POST /public/quotes/:token/pix-confirm`
    - `POST /public/quotes/:token/reject`
    - `POST /work-orders/:id/send-whatsapp`
  - **Frontend do Cliente (`apps/web/src/pages/PublicQuotePage.tsx`)**:
    - Página pública responsiva e limpa no design system CarX (cards brancos `#FFFFFF`, bordas `#E1E6EC`, fundo `#F3F5F7`).
    - Exibição de logo e dados da loja, dados do cliente e placa Mercosul em alto contraste.
    - Tabela de serviços com valores, subtotal, desconto e total em destaque.
    - Termo de autorização formal com campo de assinatura, checkbox legal e botão Verde Volt `#C8F52E`.
    - Área de pagamento de sinal Pix com QR Code, botão de cópia de código em 1 clique e botão "Já realizei o pagamento Pix".
    - Contato rápido no rodapé via WhatsApp da oficina.
  - **Integração no Cockpit do Gestor (`NovaOrdemServico.tsx` e `whatsappUtils.js`)**:
    - Botão "Enviar orçamento por WhatsApp" conectado à rotina inteligente e botão de cópia do link da proposta online.
  - **Suíte de Testes Automatizada (`apps/api/src/work-orders/quote-acceptance.test.ts`)**:
    - 6 testes cobrindo consulta pública LGPD, rejeição de assinatura inválida, aceite sem sinal, aceite com sinal Pix EMV, liquidação atômica e cancelamento de proposta.
- **Status da Validação:** 100% dos testes aprovados, typecheck com 0 erros e build de produção concluído com sucesso.

---

#### [x] T6.2 — Consulta Automática de Placa com Cache e Porte Automotivo `(Concluído)`
- **Descrição:** Implementação do motor de consulta instantânea de veículos brasileiros por placa (Mercosul `AAA9A99` e padrão antigo `AAA-9999`) integrado à API Fastify, ao cadastro de veículos (`Clientes.jsx`) e ao cockpit de abertura de ordens e propostas (`NovaOrdemServico.tsx`).
- **Entregas Concluídas:**
  - **Migration 027 (`027_vehicle_plate_lookup_cache.up.sql`)**: Tabela global `vehicle_plate_cache` com campos de veículo, porte, valor FIPE e expiração com validade de 90 dias com índice temporal.
  - **Motor de Domínio (`inferVehicleSizeClass`) em `@carx/shared`**: Inferência automática de porte entre 7 categorias automotivas (`hatch`, `sedan`, `suv`, `pickup`, `van`, `moto`, `esportivo`), com proteção contra ambiguidades de siglas comerciais (ex: `Corolla Cross XRE` -> `suv`).
  - **Serviço de Negócio (`apps/api/src/customers/plate-lookup-service.ts`)**:
    - **Nível 1 (Local do Tenant)**: Prioridade absoluta para histórico da própria oficina, preenchendo automaticamente o cliente existente (`source: 'local_tenant'`).
    - **Nível 2 (Cache Compartilhado)**: Recuperação instantânea em `< 5ms` (`source: 'cache'`).
    - **Nível 3 (Motor Automotivo)**: Catálogo determinístico de modelos nacionais com FIPE estimada (`source: 'national_registry'`).
    - **Nível 4 (Persistência no Cache)**: Gravação e renovação atômica por 90 dias.
  - **Rotas Fastify (`apps/api/src/routes/vehicle-routes.ts`)**:
    - `GET /vehicles/lookup-plate/:plate`: Rota protegida por autenticação JWT e contexto de tenant (`requireTenantContext`).
  - **Frontend Integrado (`apps/web`)**:
    - `api.vehicles.lookupPlate`: Método no cliente HTTP tipado com `PlateLookupResultDto`.
    - `NovaOrdemServico.tsx`: Campo de placa interativo com auto-consulta ao completar 7 caracteres, preenchimento de modelo, cor, porte e cliente vinculado com badge de status.
    - `Clientes.jsx`: Botão "Buscar" por placa no modal de veículo com auto-preenchimento de Marca, Modelo, Ano e Porte.
  - **Suíte de Testes Automatizada (`apps/api/src/customers/plate-lookup.test.ts`)**:
    - 5 testes cobrindo rejeição de formato inválido (400), consulta de placa Mercosul nova com classificação SUV, recuperação do cache global de 90 dias, vínculo de cliente e veículo local do tenant e inferência de portes para todas as categorias automotivas.
- **Status da Validação:** 100% dos testes aprovados (`5/5`), `pnpm typecheck` com zero erros e build Vite de produção validado.

---

#### [x] T6.3 — Pix Integrado para Ordens de Serviço (Baixa Instantânea no Caixa via Webhook) `(Concluído)`
- **Descrição:** Geração de cobrança Pix dinâmica padrão Banco Central (BR Code EMV e QR Code em alta definição) para liquidação no caixa ou balcão da oficina, com cálculo automático de saldo devedor (`final_cents - paid_cents`), baixa atômica e instantânea via webhook de conciliação bancária (`POST /webhooks/pix/confirm`) com idempotência estrita, transição automática para `DELIVERED` ao quitar OS pronta para retirada e transmissão de eventos em tempo real (`realtimeHub` / SSE).
- **Entregas Concluídas:**
  - **Migration 028 (`028_work_order_pix_integration.up.sql`)**: Índice `idx_payments_transaction_reference` na tabela `payments` e coluna `pix_last_txid` na tabela `work_orders`.
  - **Contratos e Tipagens em `@carx/shared`**: Schemas Zod e DTOs `CreateWorkOrderPixChargeInputDto`, `WorkOrderPixChargeResultDto`, `ConfirmWorkOrderPixWebhookDto` e `WorkOrderPixStatusResultDto`. Adicionado `'payment.received'` em `RealtimeEventType`.
  - **Gerador de Pix EMV Bacen (`apps/api/src/payments/pix-generator.ts`)**: Suporte a QR Code Base64 nativo via lib `qrcode` para renderização offline instantânea e sanitização de dados do recebedor (txid oficial Bacen).
  - **Serviço de Domínio (`apps/api/src/work-orders/work-order-service.ts`)**:
    - `createPixCharge`: Cálculo de saldo restante, emissão de cobrança pendente em `payments`, associação de `pix_last_txid` e disparo de SSE.
    - `confirmPixPayment`: Idempotência estrita, transação atômica entre `payments` (`approved`) e `work_orders` (`paid_cents`), atualização de histórico em `work_order_events`, avanço automático de `READY` para `DELIVERED` se quitada, e publicação nos canais SSE (`work_order.updated` e `payment.received`).
    - `getPixStatus`: Consulta pontual do status da transação Pix por `txid`.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/pix-charge`: Geração protegida por autenticação JWT e contexto de tenant.
    - `GET /work-orders/:id/pix-status/:txid`: Consulta do status da cobrança Pix.
    - `POST /webhooks/pix/confirm`: Endpoint público e idempotente para gateways bancários e conciliação de caixa.
  - **Frontend do Gestor (`apps/web`)**:
    - Métodos `createPixCharge`, `getPixStatus` e `confirmPixPayment` no cliente `api.ts`.
    - Modal de Caixa e Recebimento canônico em `OrdensServico.tsx` com visual moderno Rebrand (fundo branco, bordas `#E1E6EC`, seletor de métodos Pix/Crédito/Débito/Dinheiro).
    - Exibição de QR Code Base64 em alta definição, valor em destaque, botão de cópia de código Pix em 1 clique, polling resiliente a cada 3s, botão de simulação bancária no caixa e feedback verde vibrante de liquidação.
  - **Suíte de Testes Automatizada (`apps/api/src/payments/work-order-pix.test.ts`)**:
    - 6 testes cobrindo geração dinâmica com saldo automático, status pendente, liquidação instantânea via webhook, garantia de idempotência estrita sem duplicar saldo, rejeição de cobrança em OS já quitada e transição automática de `READY` para `DELIVERED` na entrega do veículo.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro e servidores operacionais.

---

#### [x] T6.4 — WhatsApp Automático Transacional por Evento de OS (Gating por Plano e Respeito a Instâncias) `(Concluído)`
- **Descrição:** Motor transacional de comunicação via WhatsApp conectado ao ciclo de vida da OS automotiva (`CHECKED_IN`, `IN_PROGRESS`, `READY`, `DELIVERED` e `APPOINTMENT_CONFIRMED`), garantindo respeito absoluto ao plano contratado da oficina e às suas credenciais de infraestrutura.
- **Respeito Estrito ao Isolamento de WhatsApp por Plano & Instância Própria:**
  - A plataforma CarX não assume a custódia nem o número das oficinas: cada oficina conecta e opera exclusivamente seu próprio aparelho/número de WhatsApp via socket Baileys.
  - **Planos sem Gateway / Essencial:** Custo zero de infraestrutura para a plataforma. O sistema **nunca** tenta conexões ou disparos em segundo plano; gera automaticamente link direto e pré-formatado `https://wa.me/...` com 1 clique para envio manual via WhatsApp Web ou Desktop pelo gestor.
  - **Planos com Gateway (Profissional e Premium):**
    - Se a instância estiver conectada (`status: 'CONNECTED'`), dispara em segundo plano pelo socket da oficina e registra o evento na timeline da OS (`work_order_events`).
    - Se a instância estiver desconectada (`status: 'DISCONNECTED'`), realiza **fallback suave** para `wa.me` com aviso explicativo, sem bloquear a transição de status ou a rotina da loja.
- **Entregas Concluídas:**
  - **Contratos e DTOs em `@carx/shared`**: Tipagens `WhatsAppTransactionalEventType`, `SendTransactionalWhatsAppInputDto`, `SendTransactionalWhatsAppResultDto` e inclusão canônica de `PlanFeatures.WHATSAPP_GATEWAY`.
  - **Serviço de Mensageria (`apps/api/src/whatsapp/whatsapp-service.ts`)**:
    - `formatTransactionalTemplate`: Templates ricos com primeiro nome do cliente, nome fantasia da loja, modelo do veículo, placa e link dinâmico da proposta/tracking.
    - `dispatchTransactionalNotification`: Checagem rigorosa de feature flags (`WHATSAPP_GATEWAY` / `WHATSAPP_AUTO`), verificação de status da instância, envio Baileys ou geração imediata de link `wa.me`.
  - **Integração no Ciclo de Vida da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparo assíncrono e não-bloqueante no método `transitionStatus` ao avançar a OS para `CHECKED_IN`, `READY` ou `DELIVERED`.
    - Método `notifyWorkOrderWhatsApp` para auditoria, histórico em `work_order_events` e notificação sob demanda.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/notify-whatsapp`: Endpoint autenticado com validação de tenant para reenvio e geração manual de links sob demanda.
  - **Frontend do Gestor (`apps/web`)**:
    - Método `api.workOrders.notifyWhatsApp` no cliente centralizado.
    - Botão de ação rápida com ícone do WhatsApp na tabela de OS (`OrdensServico.tsx`).
    - Modal dedicado de Notificação WhatsApp com prévia de mensagem, seleção de eventos, aviso explicativo de planos, feedback imediato e abertura de nova aba para `wa.me`.
    - Modernização do modal de detalhes da OS no Design System Rebrand CarX.
  - **Suíte de Testes Automatizada (`apps/api/src/whatsapp/whatsapp-transactional.test.ts`)**:
    - 6 testes cobrindo: Gating plano Básico (modo manual `wa.me`), Fallback suave para plano Pro desconectado com warning, Envio automático via socket no plano Pro conectado com histórico na OS, Formatação completa de templates e Disparo não-bloqueante na máquina de estados.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

### [x] Onda 1 — Impacto Imediato (Primeiro Mês) `(100% Concluída)`
1. [x] **WhatsApp Automático Transacional:** Concluído na tarefa T6.4.
2. [x] **Orçamento Digital com Aceite Online & Sinal Pix:** Concluído na tarefa T6.1.
3. [x] **Pix Integrado para Ordens de Serviço:** Concluído na tarefa T6.3.
4. [x] **Consulta Automática de Placa:** Concluído na tarefa T6.2.
5. [x] **Portal do Cliente Seguro com OTP:** Concluído na tarefa T3.13 / Tela 10.

### [x] Onda 2 — Domínio Especializado Automotivo `(100% Concluída)`

#### [x] T6.5 — Controle Fino de Bobinas (PPF / Películas, Margem Real por Metro e Garantia) `(Concluído)`
- **Descrição:** Motor de gestão especializada para envelopamento automotivo, películas de proteção de pintura (PPF) e insulfilm, com controle de metragem linear, custo por metro, dedução atômica ao entregar a OS, cálculo de rentabilidade real por veículo e vinculação automática ao Certificado de Garantia / Passaporte Digital.
- **Gating por Plano e Respeito a Recursos:**
  - Feature `ppf_spool_control` restrita aos planos `Profissional` e `Premium`.
  - Lojas no plano `Essencial` recebem HTTP 403 ao tentar manipular bobinas e visualizam no frontend um card hero de upgrade destacando as vantagens do módulo de PPF.
- **Entregas Concluídas:**
  - **DTOs e Contratos em `@carx/shared`**: Schemas Zod e DTOs `RegisterRollScrapInputSchema`, `MaterialRollHistoryItemDto`, `MaterialRollDetailWithHistoryDto` e expansão de `MaterialRollDto`.
  - **Lógica de Domínio em `StockService` (`apps/api/src/stock/stock-service.ts`)**:
    - `assertSpoolControlFeature`: Verificação de plano via `planService.assertFeature`.
    - `getRollDetailedHistory`: Rastreabilidade completa cruzando `work_order_materials`, `work_orders`, `customers`, `vehicles`, `work_order_items`, `warranties` e `stock_movements`.
    - `registerRollScrap`: Registro transacional de retalhos/desperdício com auditoria em `stock_movements` (`movement_type: 'waste'`), abatimento no saldo do material e transição automática para `depleted` ao zerar o saldo da bobina.
  - **Auto-vínculo de Garantia em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - Detecção automática de `material_roll_id` e `material_lot_number` a partir dos materiais alocados na OS ao emitir certificado de garantia.
  - **Rotas Fastify Registradas (`apps/api/src/routes/stock-routes.ts`)**:
    - `GET /materials/rolls/:id/history`
    - `POST /materials/rolls/:id/scrap`
  - **Frontend Modernizado (`apps/web/src/pages/Materiais.tsx`)**:
    - Substituição total do legado `Materiais.jsx` por TypeScript puro.
    - Abas: "Bobinas (PPF & Películas)" e "Insumos Gerais & Químicos".
    - Tabela de bobinas com barra de progresso visual de metragem (`current / initial`), custo linear por metro e tags de status.
    - Modal de Histórico e Margem Real por veículo com taxa de aproveitamento (`efficiencyPercent`), lucro bruto e selo de garantia.
    - Modal de Registro de Retalho com abatimento imediato.
    - Modal de Cadastro de Bobina com validação de dimensões e custo.
    - Card Hero de Upgrade para lojas no plano Essencial.
  - **Suíte de Testes Automatizada (`apps/api/src/stock/spool-control.test.ts`)**:
    - 6 testes cobrindo: Gating HTTP 403 no Básico, Cadastro atômico no Pro, Alocação e consumo com baixa atômica na OS, Auto-vínculo de garantia com lote e token de verificação, Histórico com margem real por metro e Registro de descarte com esgotamento automático (`depleted`).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todos os workspaces.

---

#### [x] T6.6 — Passaporte Digital do Veículo & Transferência na Revenda `(Concluído)`
- **Descrição:** Certificado de garantia e histórico veicular com selo de autenticidade antifraude acessível via QR Code público (`/v/:token` e `/passaporte/:token`), exibindo a procedência de películas/vitrificadores (marca e lote oficial), linha do tempo cronológica de serviços e manutenções, com proteção LGPD nos dados do antigo proprietário e motor de transferência instantânea de titularidade na revenda do carro.
- **Entregas Concluídas:**
  - **Migration 029 (`029_vehicle_passport_transfer.up.sql`)**:
    - Colunas `is_transferable`, `transferred_at` e `transferred_from_customer_id` adicionadas à tabela `warranties`.
    - Tabela `warranty_transfers` com RLS ativado e forçado, auditoria completa de cliente anterior, novo cliente, KM do hodômetro, IP e User-Agent.
  - **Contratos e DTOs em `@carx/shared`**:
    - `PublicVehiclePassportDto` expandido com `timeline`, `transfersHistory`, `materialRollBrand`, `materialRollCode` e contagem de transferências.
    - `TransferVehiclePassportInputSchema`, `TransferVehiclePassportInputDto`, `TransferVehiclePassportResultDto`.
  - **Motor de Domínio em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - `verifyPublicPassport`: Consulta pública protegida contra IDOR, com máscara LGPD na placa (`PPF-***8`) e nomes anonimizados (`Rodrigo F***`), cruzando histórico completo de manutenções da oficina e lote do rolo de PPF.
    - `transferWarrantyCustody`: Transação atômica que localiza ou cadastra o novo comprador em `customers`, atualiza o veículo em `vehicles.customer_id`, atualiza a titularidade da garantia em `warranties` e insere registros em `warranty_transfers` e na timeline da OS (`work_order_events`).
  - **Rotas Fastify Registradas (`apps/api/src/routes/qa-routes.ts`)**:
    - `GET /public/passports/:token` e `GET /v/:token` (consulta pública por QR Code).
    - `POST /public/passports/:token/transfer` (transferência de titularidade na revenda).
  - **Frontend Público (`apps/web/src/pages/PublicPassportPage.tsx` e `App.jsx`)**:
    - Página web responsiva no Design System Rebrand CarX (fundo escuro `#0E1116`, detalhes em Verde Volt `#CCFF00`).
    - Selo de Autenticidade Antifraude, badge Mercosul, detalhes do serviço e lote do material.
    - Linha do tempo visual de manutenções com marcos de garantia e transferências.
    - Banner e Modal interativo de Transferência de Custódia na Revenda para valorização do carro na Webmotors/OLX.
    - Rotas registradas no frontend: `/v/:token`, `/passaporte/:token` e `/garantia/:token`.
  - **Suíte de Testes Automatizada (`apps/api/src/qa/passport-transfer.test.ts`)**:
    - 5 testes cobrindo consulta por QR Code com LGPD, timeline completa, tratamento de 404, transferência de titularidade ponta a ponta e bloqueio de transferências em certificados revogados ou intransferíveis.
- **Status da Validação:** 100% dos testes aprovados (`5/5`), `pnpm typecheck` com zero erros no monorepo inteiro.

#### [x] T6.7 — Agenda Inteligente com Ocupação por Box & Duração por Porte `(Concluído)`
- **Descrição:** Motor de agendamento avançado com ocupação visual por box (`bays`), cálculo automático de duração calibrado por porte veicular (`moto`, `hatch`, `sedan`, `suv`, `pickup`, `van`, `esportivo`), prevenção estrita de choque duplo de horários (anti-conflito no mesmo box e do mesmo técnico simultaneamente), monitoramento de atrasos em tempo real com alertas visuais no Rebrand CarX e suporte a slots livres rápidos com 1 clique.
- **Entregas Concluídas:**
  - **Contratos e DTOs em `@carx/shared`**:
    - Tabela automotiva `VEHICLE_SIZE_DURATION_MULTIPLIERS` (Hatch 0.85x, Sedan 1.0x, SUV 1.25x, Picape 1.35x, Van 1.5x, etc.).
    - Schemas e DTOs `CalculateDurationInputSchema`, `CalculateDurationInputDto`, `CalculatedDurationResultDto`, `SmartAppointmentDto`, `SmartBayOverviewDto` e `SmartScheduleOverviewResponseDto`.
  - **Lógica de Domínio em `AppointmentService` (`apps/api/src/appointments/appointment-service.ts`)**:
    - `checkTechnicianConflict`: Validação matemática `(start_time < endTime AND end_time > startTime)` que impede que o mesmo profissional seja alocado em dois agendamentos sobrepostos (HTTP 409 `TechnicianConflictError`).
    - `calculateEstimatedDuration`: Cálculo inteligente que busca tempos cadastrados na tabela `service_prices_by_class` ou aplica os multiplicadores padrão da categoria por porte.
    - `getSmartScheduleOverview`: Visão consolidada da ocupação dos boxes (`free`, `occupied`, `delayed`), identificação de categorias de serviço para estilização cromática Rebrand CarX, detecção de atrasos em tempo real (`NOW() > end_time` com OS em andamento) e geração de slots livres.
    - Inclusão da checagem em `createAppointment` e `updateAppointment`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/appointment-routes.ts`)**:
    - `GET /appointments/smart-overview` (visão consolidada de boxes com atrasos em tempo real).
    - `POST /appointments/calculate-duration` (cálculo de duração por porte veicular).
    - Tratamento unificado de `TechnicianConflictError` e `BayConflictError` retornando HTTP 409 com detalhes do agendamento conflitante.
  - **Frontend Modernizado (`apps/web/src/pages/Agenda.tsx`)**:
    - Grid oficial do Rebrand CarX (`rebraind/Gestor · Agenda@2x.png` e `rebraind/HTML/Gestor · Agenda-html/Agenda.dc.html`).
    - Colunas dos boxes com técnico atribuído (`Box 1 · Lucas`, `Box 2 · Rafa`, `Box 3 · livre`) e status em tempo real.
    - Cores cromáticas por categoria: Verde Volt `#C8F52E` (Insulfilm/Detailing), Azul Céu `#CDEBFB` (PPF), Âmbar `#FFE2A8` (Aguardando aprovação), Cinza neutro `#E8EEF4` (Concluídos) e Alerta Vermelho `#FEE2E2` com borda pulsante `#EF4444` para atrasos.
    - Badges em destaque indicando tempo de atraso `⚠️ Atraso (+X min)`.
    - Modal de Novo Agendamento inteligente com seletor de porte veicular, multiplicadores visuais, detecção automática do porte ao digitar o modelo, seleção de técnico responsável e validação de conflitos.
    - Slots livres tracejados com clique direto para pré-preenchimento de box e horário.
    - Modal de Detalhes do Agendamento com dados do cliente, veículo, WhatsApp e botão de conclusão rápida.
  - **Suíte de Testes Automatizada (`apps/api/src/appointments/smart-schedule.test.ts`)**:
    - 6 testes cobrindo: Cálculo de duração por porte (hatch vs SUV vs serviço calibrado), Anti-conflito no mesmo box (HTTP 409), Anti-conflito do mesmo técnico em boxes diferentes (HTTP 409), Agendamento simultâneo com técnicos distintos aceito, Visão inteligente por box com detecção de agendamentos em atraso e Isolamento multi-tenant estrito.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em `@carx/shared`, `@carx/api` e `@carx/web`.

#### [x] T6.8 — Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor inteligente de conversão e reputação pública no Google Meu Negócio / Google Maps para oficinas automotivas. Identifica promotores (notas 9 e 10 na pesquisa pública de satisfação NPS), direciona o cliente em um clique para avaliação 5 estrelas no perfil oficial da oficina e integra disparos transacionais via WhatsApp com respeito estrito ao modelo comercial de assinaturas (cada loja com seu próprio número Baileys ou link direto manual `wa.me` gratuito para planos sem gateway).
- **Entregas Concluídas:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - Coluna `tenant_branding.google_review_url`: Armazena o link curto oficial de avaliação do Google Meu Negócio da loja (`https://g.page/r/.../review`).
    - Colunas de auditoria e conversão em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation` (`tenant_id, score, google_review_clicked_at`).
  - **Contratos e Schemas em `@carx/shared`**:
    - Evento transacional `'GOOGLE_REVIEW_INVITE'` em `WhatsAppTransactionalEventType`.
    - DTOs Zod: `UpdateGoogleReviewUrlSchema`, `GoogleReputationOverviewDto`, `AnswerNpsSurveyResponseDto` e campos de auditoria em `NpsSurveyDto`.
  - **Serviço WhatsApp e Gating Estrito por Plano (`WhatsAppService`)**:
    - Respeito absoluto à regra de negócio: cada loja utiliza seu próprio chip/número conectado via Baileys. O sistema não assume custos de envio por fora da loja.
    - Lojas com Plano Pro (`PlanFeatures.WHATSAPP_GATEWAY`) e instância conectada: disparo automatizado com template oficial `GOOGLE_REVIEW_INVITE`.
    - Lojas sem gateway ou desconectadas: retorno suave com modo manual e URL direta `https://wa.me/{phone}?text={mensagem_formatada}` para disparo em 1 clique pelo WhatsApp Web sem nenhum custo adicional.
  - **Serviço de NPS e Reputação (`NpsService` — `apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl`: Obtém a URL cadastrada ou gera automaticamente um fallback amigável de busca no Google Maps baseada na razão social/fantasia da oficina (`https://www.google.com/maps/search/?api=1&query=...`).
    - `updateGoogleReviewUrl`: Salva a URL oficial de avaliação da oficina com isolamento multitenant.
    - `answerSurvey`: Ao receber nota 9 ou 10 (Promotor), ativa o fluxo de incentivo ao Google Review, dispara o WhatsApp automático se elegível ou provê link manual `wa.me`, mantendo a barreira idempotente contra múltiplas respostas (HTTP 409 Conflict).
    - `recordGoogleReviewClick`: Registra o clique do cliente no botão de 5 estrelas (`POST /public/nps/:token/google-click`), atualizando `google_review_clicked_at` e contabilizando a conversão.
    - `sendGoogleReviewInvite`: Permite ao gestor disparar ou reenviar o convite de avaliação para qualquer promotor a qualquer momento.
    - `getReputationOverview`: Retorna métricas consolidadas: promotores registrados, convites enviados, cliques no Google, taxa de conversão (`conversionRatePercent`) e lista dos principais promotores com status individual e link manual `wa.me`.
  - **Rotas Fastify (`apps/api/src/routes/nps-routes.ts`)**:
    - `GET /nps/reputation-overview` (métricas e lista de promotores).
    - `PUT /nps/google-review-url` (atualização da URL da ficha do Google).
    - `POST /nps/surveys/:id/send-google-invite` (disparo de convite de avaliação).
    - `POST /public/nps/:token/google-click` (registro público de clique no botão do Google).
  - **Frontend no Padrão Rebrand CarX**:
    - **Painel NPS do Gestor (`apps/web/src/components/features/NpsDashboard.tsx`)**:
      - Card 3 interativo de Reputação no Google com input editável para cadastrar a URL da ficha, métricas em tempo real de cliques e taxa de conversão, alerta caso esteja em modo fallback de busca no Maps, e aviso explicativo da regra por plano.
      - Seção consolidada de Promotores (9 e 10) com badges de status (`Clicou no Google`, `Convite enviado (Auto/Manual)`, `Aguardando convite`) e botão inteligente para pedir/reenviar avaliação no WhatsApp via gateway ou WhatsApp Web em 1 clique.
    - **Página Pública de Resposta (`apps/web/src/pages/PesquisaNPS.jsx`)**:
      - Conectada aos endpoints reais `/public/nps/:token`.
      - Identificação visual no padrão escuro Rebrand CarX (`#0E1116` / `#C8F52E`).
      - Quando o cliente avalia com nota 9 ou 10, exibe banner heróico de celebração com 5 estrelas amarelas e botão proeminente de alta conversão: `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
      - Ao clicar, grava a conversão na API (`recordGoogleClick`) e abre a página de avaliação do Google em nova aba sem travar o usuário.
      - Opção de compartilhamento do elogio diretamente no WhatsApp da oficina.
  - **Suíte de Testes Automatizada (`apps/api/src/nps/google-reputation.test.ts`)**:
    - 6 testes cobrindo todo o ciclo: Configuração do link (PUT), Cliente Promotor (nota 10) recebendo convite Google, Cliente Detrator (nota 4) sem convite e gerando alerta de resgate, Disparo manual wa.me para planos sem gateway, Visão consolidada de conversão e Isolamento multitenant estrito.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

#### [x] T6.9 — Mini-Site Institucional da Oficina, Portfólio Antes/Depois e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), otimizada para SEO local, dispositivos móveis e atração de novos clientes automotivos.
- **Entregas Concluídas:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio de trabalhos recentes com suporte a fotos antes/depois (`before_image_url`, `after_image_url`), categorias (`PPF`, `Vitrificação`, `Polimento`, `Insulfilm`), ordenação e flag de destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com nome, WhatsApp, veículo, serviço de interesse e status do lead (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de Row Level Security (RLS) canônico com `FORCE ROW LEVEL SECURITY` e índices por tenant e ordenação.
  - **Contratos e DTOs Zod (`packages/shared/src/schemas.ts`)**:
    - Schemas e tipos: `CreateMiniSitePortfolioItemSchema`, `UpdateMiniSitePortfolioItemSchema`, `MiniSitePortfolioItemDto`, `CreateMiniSiteLeadSchema`, `UpdateMiniSiteLeadStatusSchema`, `MiniSiteLeadDto`, `UpdateMiniSiteSettingsSchema` e `PublicMiniSiteResponseDto`.
  - **Serviço de Negócio (`MiniSiteService` — `apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública (sem JWT) consolidando dados de branding, catálogo de serviços com preço inicial ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de novo lead no banco com geração automática de link profundo wa.me formatado para atendimento imediato.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio com isolamento multi-tenant.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de bio, headline e horários de atendimento.
  - **Rotas Fastify Registradas (`apps/api/src/routes/minisite-routes.ts` & `server.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id`.
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings`.
  - **Frontend Público e Administrativo (`apps/web`)**:
    - **Página Pública do Mini-Site (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium no padrão Rebrand CarX (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preços "A partir de", Galeria de portfólio com botão interativo para alternar fotos Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de solicitação de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Suíte de Testes Automatizada (`apps/api/src/minisite/minisite.test.ts`)**:
    - 6 testes cobrindo todo o ciclo: Consulta pública sem JWT (200), Tratamento de 404 para slug inexistente, Captação pública de lead (201), Gestão de portfólio pelo gestor autenticado, Atualização de status de lead e Isolamento multi-tenant estrito entre oficinas.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

### [x] Resumo de Conclusão da Onda 2 `(100% Homologada)`
- [x] **T6.5 — Controle Fino de Bobinas (PPF/Insulfilm):** Metragem linear, custo por metro e dedução automática.
- [x] **T6.6 — Passaporte Digital do Veículo & Transferência na Revenda:** QR Code antifraude `/v/:token` e troca de titularidade.
- [x] **T6.7 — Agenda Inteligente com Ocupação por Box & Duração por Porte:** Ocupação visual, anti-conflito (409) e detecção de atrasos.
- [x] **T6.8 — Motor de Reputação no Google Meu Negócio:** Captação de promotores NPS (9 e 10) e avaliação 5 estrelas.
- [x] **T6.9 — Mini-Site Institucional da Oficina, Portfólio & Leads:** Vitrine pública `/loja/:slug`, antes/depois e captação de leads.

---

### [🟡 EM EXECUÇÃO AGORA] Onda 3 — Escala, Fiscal & Funcionalidades Avançadas

A **Onda 3** consolida as ferramentas de escala corporativa, profissionalização contábil/fiscal, inteligência artificial e expansão multi-loja do CarX SaaS, transformando a oficina em uma operação de padrão industrial.

```
Onda 3 Roadmap de Execução:
[x] T6.10 NFS-e Automática ➔ [x] T6.11 DRE & Caixa ➔ [x] T6.12 Franquias ➔ [x] T6.13 Offline PWA ➔ [x] T6.14 IA Vistorias ➔ [🟡 T6.15] CRM Retenção
```

---

#### [x] T6.10 — Módulo Fiscal: Emissão Automática de NFS-e ao Liquidar a OS `(Concluído e Homologado)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão automática de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação financeira integral do saldo). Suporte a provedores SaaS consolidados de mensageria fiscal (Focus NFe) com fallback/mock para sandbox e testes, webhook de atualização de status da prefeitura municipal e armazenamento seguro de RPS, XML e DANFSE PDF.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 12 (Linhas 223)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L223)
  - [CarX_Documento_Unico.md — Seção 4: Modelo de Dados / Tabela invoices (Linhas 152)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L152)
- **Gating por Plano e Respeito a Recursos:**
  - Feature `PlanFeatures.NFSE` restrita aos planos `Profissional` e `Premium`.
  - Lojas no plano `Essencial` recebem bloqueio com HTTP 403 Forbidden e banner no frontend.
- **Entregas Concluídas:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado com chave simétrica AES-256-GCM), senha criptografada, inscrição municipal, regime tributário (Simples Nacional, Lucro Presumido), alíquota de ISS municipal, código de tributação do município (CNAE de estética e reparação automotiva) e ambiente (`sandbox` / `production`).
    - Tabela `fiscal_invoices`: Vínculo com `work_order_id`, `customer_id`, número de RPS, série, número oficial da NFS-e municipal, código de verificação da prefeitura, protocolo, chave de acesso, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), erro da prefeitura se houver, URL do XML e DANFSE em PDF.
    - Ativação e forçamento de RLS canônico com `FORCE ROW LEVEL SECURITY`.
  - **Contratos e Schemas Zod em `@carx/shared`**:
    - DTOs e Schemas: `TenantFiscalSettingsDto`, `UpdateFiscalSettingsSchema`, `FiscalInvoiceDto`, `IssueWorkOrderNfseInputSchema`, `CancelNfseInputSchema`.
  - **Serviço Fiscal (`FiscalService` — `apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getFiscalSettings` e `updateFiscalSettings`: Configuração fiscal da oficina com criptografia simétrica AES-256-GCM.
    - `issueWorkOrderNfse`: Geração atômica do RPS com itens da OS, retenções de impostos e disparo para a API do provedor fiscal com chave de idempotência.
    - `handleFiscalWebhook`: Endpoint público seguro para recepção de eventos de autorização ou rejeição da prefeitura.
    - `cancelNfse`: Cancelamento de nota fiscal autorizada com justificativa legal obrigatória (mínimo 15 caracteres).
    - Auto-emissão não-bloqueante na máquina de estados da OS (`work-order-service.ts`) ao transicionar para `DELIVERED` ou na quitação total via Pix.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`: Webhook com processamento de callbacks.
  - **Frontend do Gestor (`apps/web`)**:
    - Aba "Módulo Fiscal (NFS-e)" em `Settings.jsx` com `FiscalSettingsManager.tsx`.
    - Card de Nota Fiscal no modal de detalhes da Ordem de Serviço (`OrdensServico.tsx`), com botão para emitir NFS-e em 1 clique, badges de status, download de PDF/XML e modal de cancelamento com justificativa legal.
  - **Suíte de Testes Automatizada (`apps/api/src/fiscal/fiscal.test.ts`)**:
    - **100% de aprovação (7/7 testes)** cobrindo configuração criptografada, feature gating por plano (HTTP 403), emissão no plano Pro (HTTP 201), bloqueio de emissão duplicada (HTTP 409), processamento de webhook, cancelamento com justificativa e isolamento multi-tenant estrito (RLS).
- **Status:** `[x] 100% Concluído e Homologado`

---

#### [x] T6.11 — DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído e Homologado)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), plano de contas automotivo com contas a pagar e a receber, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e fechamento em lote atômico.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 13 (Linhas 224)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L224)
- **Entregas Concluídas:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas automotivo pré-semeado (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com suporte a fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total, comprovante e notas.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação e forçamento de RLS canônico com `FORCE ROW LEVEL SECURITY`.
  - **Contratos e Schemas Zod em `@carx/shared`**:
    - `FinancialCategoryDto`, `CreateFinancialCategorySchema`, `FinancialBillDto`, `CreateFinancialBillSchema`, `AdvancedDreReportDto`, `CashFlowDayPointDto`, `CashFlowProjectionDto`, `BatchPayCommissionsSchema`, `BatchPayCommissionsResultDto`.
  - **Lógica de Domínio Backend (`FinancialService` — `apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: DRE em cascata nativo no PostgreSQL computando Receita Bruta, Deduções (Descontos e ISS de NFS-e da T6.10), Receita Líquida (ROL), CSP/CMV (Estoque, Bobinas de PPF/Películas e Comissões de Técnicos), Margem de Contribuição, Despesas Fixas, Despesas Operacionais e **EBITDA Real**.
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas, saídas e saldo acumulado projetado com identificação de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber com conciliação auditada.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da despesa quitada no contas a pagar.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`: DRE analítico consolidado.
    - `GET /financial/cashflow/projection`: Projeção de fluxo de caixa horizon diário.
    - `POST /commissions/batch-pay`: Fechamento em lote por técnico.
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Suíte de Testes Automatizada (`apps/api/src/financial/financial-advanced.test.ts`)**:
    - **100% de aprovação (7/7 testes)** validando plano de contas, contas a pagar/receber, quitação, cálculo de EBITDA real no DRE, projeção de fluxo de caixa, batch-pay de comissões e isolamento RLS multi-tenant estrito entre oficinas.
- **Status:** `[x] 100% Concluído e Homologado`

---

#### [x] T6.12 — Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído e Homologado)`
- **Descrição:** Cockpit executivo para gestores e franqueadoras que operam múltiplas oficinas ou filiais no CarX.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 14 (Linhas 225)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L225)
- **Entregas Concluídas:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada em `work_orders`, `bays`, `materials` e `material_rolls` para alocação por loja.
    - Tabela `unit_transfers`: rastreabilidade auditada de transferências inter-lojas de bobinas de PPF e insumos de estoque com `from_unit_id`, `to_unit_id`, `transfer_type`, `quantity`, `status`, `notes`, `transferred_by` e `chk_different_units`.
    - RLS compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com isolamento multi-tenant canônico.
  - **Contratos e Schemas Zod em `@carx/shared`**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend (`CorporateService` — `apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais com métricas de OSs, boxes ativos e bobinas.
    - `createUnit`: Criação de filiais com respeito compulsório à quota `max_units` do plano ativo do tenant e unicidade de `slug`.
    - `updateUnit`: Atualização de dados cadastrais da filial com trilha de auditoria.
    - `getCorporateOverview`: Métricas executivas agregadas (Faturamento Consolidado, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes) e Ranking de Produtividade & Faturamento entre lojas, além de inventário de bobinas e estoque por filial.
    - `transferInventory`: Transferência atômica e auditada de bobinas de PPF ou insumos entre filiais com atualização imediata de alocação física, validação de saldos e registro de histórico.
    - `listTransfers`: Listagem histórica de transferências com nomes de filiais e colaboradores.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` e `GET /corporate/units`
    - `POST /corporate/units` e `PATCH /corporate/units/:id`
    - `POST /corporate/transfers` e `GET /corporate/transfers`
    - Guardas RBAC exigindo papéis corporativos (`owner`, `gestor`).
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com seletor de unidade no topo, 4 cards de KPIs executivos, ranking de produtividade entre lojas, tabela analítica de filiais, gestão de logística inter-lojas e modais de cadastro e transferência.
    - Item de menu "Redes / Franquias" integrado no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx) e rotas `/corporate`, `/redes` e `/multiunidade` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Suíte de Testes Automatizada (`apps/api/src/corporate/corporate-units.test.ts`)**:
    - **100% de aprovação (9/9 testes)** validando listagem, criação com quota `max_units`, bloqueio ao exceder quota, edição, consolidação do cockpit com ranking, transferência de bobina XPEL, transferência de insumo, isolamento multi-tenant estrito entre lojas de tenants diferentes e bloqueio RBAC para técnicos.
- **Status:** `[x] 100% Concluído e Homologado`

---

#### [x] T6.13 — App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído e Homologado)`
- **Descrição:** Operação contínua do PWA do Operador (`/operador`) em galpões, subsolos e boxes automotivos com conectividade intermitente ou sem sinal de internet.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 15 (Linhas 226)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L226)
- **Entregas Concluídas:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**: Tabela `technician_offline_sync_logs` com restrição única `UNIQUE (tenant_id, action_id)` para garantia de idempotência estrita, RLS canônico e índices de busca.
  - **Contratos Compartilhados (`packages/shared/src/schemas.ts`)**: `OfflineActionTypeSchema`, `SingleOfflineActionSchema`, `BatchSyncActionsSchema`, `BatchSyncResultDto` e `SyncActionResultDto`.
  - **Backend Fastify (`apps/api/src/technician`)**:
    - Método `syncOfflineActions` com suporte a `START_TIMER`, `PAUSE_TIMER`, `RESUME_TIMER`, `STOP_TIMER`, `UPDATE_PROGRESS`, `CHECKLIST_ITEM`, `ADD_NOTE`.
    - Rota `POST /technician/sync` registrada e protegida por autenticação.
  - **IndexedDB Nativo (`apps/web/src/services/offlineStorage.ts`)**: 4 Object Stores (`offline_actions`, `cached_queue`, `local_timers`, `offline_photos`).
  - **Hook `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**: Monitoramento online/offline, envio em lote com idempotência, purga automática de ações confirmadas e disparos em segundo plano.
  - **UI do Operador (`apps/web/src/pages`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx): Cache de fila no IndexedDB com fallback transparente offline, banner de telemetria com contador de pendências e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx): Cronômetro desacoplado persistido no IndexedDB com badge `Offline (Local)`, mutations com retenção offline automática para início, pausa, retomada e conclusão de OS.
  - **Suíte de Testes Automatizada (`apps/api/src/technician/technician-offline-sync.test.ts`)**:
    - **100% de aprovação (5/5 testes)** validando envio em lote de ações offline, idempotência ao reenviar ações, sincronização de pausas com segundos acumulados, isolamento multi-tenant estrito e resiliência com processamento de ações válidas na presença de itens inválidos.
- **Status:** `[x] 100% Concluído e Homologado`

---

#### [x] T6.14 — Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído e Homologado)`
- **Descrição:** Motor de inteligência artificial aplicada ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report) e elaboração instantânea de propostas comerciais de alto ticket.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 16 (Linhas 227)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L227)
- **Entregas Concluídas:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**: Tabela `ai_inspection_analyses` com histórico auditado de análises, RLS canônico compulsório e índices otimizados.
  - **Contratos Tipados (`packages/shared/src/schemas.ts`)**: `AiDetectedDamageItemSchema`, `AiSuggestedServiceItemSchema`, `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto` e `ApplyAiSuggestionsInputSchema`.
  - **Backend Fastify (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - Motor de Visão Computacional para detecção de avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - Motor Speech-to-Checklist com parser de KM (numeral e por extenso até 999 mil), nível de combustível e queixas por voz.
    - Aplicação atômica com 1 clique que atualiza a inspeção, insere avarias em `inspection_damage_points`, serviços em `work_order_items`, recalcula o total da OS e atualiza o KM do veículo.
  - **Rotas Fastify (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx) com 3 abas (Visão Computacional, Checklist por Voz e Serviços para Orçamento).
    - Botão de acesso rápido "✨ Vistoria com IA" no laudo de inspeção em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx) com plotagem automática de pontos no carro.
  - **Suíte de Testes Automatizada (`apps/api/src/ai/ai-inspection.test.ts`)**:
    - **100% de aprovação (6/6 testes)** validando visão frontal com capô, visão lateral com porta/martelinho, extração por voz, aplicação atômica na OS com recálculo de valor, isolamento multi-tenant estrito e histórico de análises.
- **Status:** `[x] 100% Concluído e Homologado`

---

#### [x] T6.15 — CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Régua de automação de retenção para fidelização do cliente ao longo do ano.
- **Onde ler no Documento Único:**
  - [CarX_Documento_Unico.md — Seção 6: Onda 3 / Item 11 (Linhas 220)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L220)
- **Entregas Concluídas:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras configuráveis por categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos exclusivos gerados pela oficina para retenção dos seus clientes com validade e unicidade `(tenant_id, UPPER(code))`.
    - Tabela `crm_retention_contacts`: histórico de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo com OS de retorno, receita gerada e usuário que disparou.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) nas 3 tabelas com `tenant_isolation_policy` e índices otimizados.
  - **Contratos e Schemas Zod em `@carx/shared`**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: clientes ativos, em risco, inativos, taxa de recompra anual, pendências de garantia e receita gerada por retenção.
    - `WarrantyRevisionItemDto`: garantias com marcos periódicos (6m, 12m) vencendo em até 30d ou atrasadas.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade (>90d, >180d, >365d) com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Serviço de Domínio Backend (`CrmRetentionService` — `apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina.
    - `getRetentionOverview`: cálculo analítico de KPIs executivos de churn e recompra.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias devidos.
    - `listInactiveCustomers`: segmentação por tempo sem visita com cupom recomendado.
    - `triggerRetentionContact`: interpolação de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão em venda confirmada com receita faturada registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`, `GET /crm/retention/warranty-revisions`, `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules`, `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`, `GET /crm/retention/contacts`, `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rotas `/crm` e `/retencao` em [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Suíte de Testes Automatizada (`apps/api/src/crm/crm-retention.test.ts`)**:
    - **100% de aprovação (9/9 testes)** validando regras padrão, criação de regra, detecção de garantia aos 6 meses, clientes inativos, disparo com cupom e link wa.me, conversão de contato, KPIs consolidados, isolamento multi-tenant estrito e bloqueio sem autenticação.
- **Status:** `[x] 100% Concluído e Homologado`

---

## 🛡️ FASE 7 — Qualidade Contínua, Testes & Hardening `[x] 100% CONCLUÍDA E HOMOLOGADA`

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 7 (Linhas 230–234)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L230-L234).
**Referência da Skill Oficial:** [`SKILL.md`](file:///d:/Repositorios/CarX/system-quality-gate/SKILL.md).

### [x] T7.1 — Quality Gate Automatizado (System Quality Gate) `(Concluído e Homologado)`
- **Descrição:** Execução completa do motor corporativo de inspeção de código, validação estática, builds de produção, auditoria de catálogo e conexões no PostgreSQL 16, isolamento Redis e emissão formal dos artefatos de governança.
- **Entregas Realizadas:**
  - **Análise Estática e Linting (`pnpm typecheck` & `pnpm eslint`)**: **0 erros** em todos os pacotes (`@carx/shared`, `@carx/ui`, `@carx/api`, `@carx/web`, `@carx/admin`), incluindo correção de tipagem estrita em [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e expressão regular em [`ai-inspection-service.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection-service.ts).
  - **Builds de Produção**: `@carx/web` compilado em `8.81s` (106 entradas PWA precached, Service Worker ativo) e `@carx/admin` compilado em `9.45s`.
  - **Auditoria PostgreSQL ([`db-audit.ts`](file:///d:/Repositorios/CarX/quality/scripts/db-audit.ts))**: 37/37 migrações aplicadas; **58/58 tabelas com `tenant_id` protegidas com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` (100% de cobertura)**; `0` locks bloqueantes e `0` transações órfãs (`idle in transaction`). Evidência salva em [`postgres-audit.json`](file:///d:/Repositorios/CarX/quality/evidence/postgres-audit.json).
  - **Relatórios Executivos**: Emissão de [`test-plan.md`](file:///d:/Repositorios/CarX/quality/plans/test-plan.md), [`quality-report.md`](file:///d:/Repositorios/CarX/quality/reports/quality-report.md) e [`quality-summary.json`](file:///d:/Repositorios/CarX/quality/reports/quality-summary.json) com decisão formal `APPROVED_FOR_RELEASE`.
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T7.2 — Testes de Isolamento Multitenant (CI Obrigatório) `(Concluído e Homologado)`
- **Descrição:** Suíte dinâmica e estática obrigatória de CI para garantir que nenhuma tabela com `tenant_id` fique sem RLS forçado e que nenhum serviço de domínio consulte dados sem o contexto transacional do tenant.
- **Entregas Realizadas:**
  - **Suíte Expandida ([`tenant-isolation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/database/tenant-isolation.test.ts))**: **10/10 testes aprovados** validando:
    1. Falha fechada (*fail-closed*) sem contexto de tenant.
    2. Isolamento total entre Tenant A e Tenant B em consultas concorrentes.
    3. Prevenção de vazamento de `app.current_tenant_id` entre conexões recicladas do pool.
    4. Auditoria dinâmica no `pg_catalog` de todas as 58 tabelas com `tenant_id`, incluindo nominalmente todas as tabelas das Ondas 1, 2 e 3 da Fase 6 (`warranty_transfers`, `minisite_portfolio_items`, `minisite_leads`, `tenant_fiscal_settings`, `fiscal_invoices`, `financial_categories`, `financial_bills`, `unit_transfers`, `technician_offline_sync_logs`, `ai_inspection_analyses`, `crm_retention_rules`, `tenant_customer_coupons`, `crm_retention_contacts`).
    5. Varredura estática de código em todos os 15 diretórios de domínio da API garantindo `0` chamadas diretas a `adminPool.query`.
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T7.3 — Testes de Carga com k6 (100 Conexões Simultâneas) `(Concluído e Homologado)`
- **Descrição:** Simulação progressiva de carga (`1 -> 5 -> 10 -> 25 -> 50 -> 100 VUs`) exercitando simultaneamente o Monitor TV / Tracking de OS (`/work-orders/tracking/:token`), Passaporte Digital QR Code (`/public/passports/:token`), Mini-Site Institucional (`/public/tenant/:slug/site`) e sonda de saúde (`/health`).
- **Entregas Realizadas:**
  - **Scripts de Carga ([`load-test.js`](file:///d:/Repositorios/CarX/quality/k6/load-test.js) e [`load-runner.ts`](file:///d:/Repositorios/CarX/quality/k6/load-runner.ts))**: Execução em 6 estágios progressivos totalizando **26.085 requisições** com **0 falhas (0,00% de erro)**.
  - **Métricas no Pico de 100 Conexões Simultâneas (`100 VUs`)**:
    - Requisições processadas no estágio de 100 VUs: **10.524 reqs**
    - Throughput sustentado: **1.052,4 req/s**
    - Taxa de erro HTTP: **0,00%** (meta `< 1%`)
    - Latência `p50`: **78,93 ms** | `p90`: **120,53 ms** | `p95`: **131,98 ms** (meta `< 500 ms`) | `p99`: **152,06 ms**
  - **Evidências Persistidas**: [`benchmark-latest-100vus.json`](file:///d:/Repositorios/CarX/quality/evidence/benchmark-latest-100vus.json).
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T7.4 — Auditoria de Segurança e Hardening OWASP Top 10 `(Concluído e Homologado)`
- **Descrição:** Validação automatizada e hardening ativo contra as principais categorias do OWASP Top 10 (Broken Access Control, Cryptographic Failures, SQL Injection, XSS, Insecure Design e Authentication Failures).
- **Entregas Realizadas:**
  - **Hardening Aplicado em Rotas Críticas**:
    - [`fiscal-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/fiscal-routes.ts): Adicionado guard `requireFiscalRole` restringindo `GET /fiscal/settings` e `PUT /fiscal/settings` exclusivamente a `gestor`/`proprietario`/`admin` (bloqueando perfil `tecnico` com HTTP 403).
    - [`minisite-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/minisite-routes.ts): `PATCH /minisite/leads/:id/status` endurecido para retornar HTTP 404 imediato quando `rowCount === 0` em tentativas de IDOR cross-tenant.
  - **Suíte Automatizada ([`owasp-hardening.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/security/owasp-hardening.test.ts))**: **6/6 suítes aprovadas**:
    1. **A01 Broken Access Control**: Bloqueio vertical RBAC (`403 Forbidden`) e horizontal IDOR/BOLA (`404 Not Found`) entre oficinas distintas.
    2. **A02 Cryptographic Failures**: Certificado Digital A1 e tokens fiscais cifrados em repouso no PostgreSQL (`AES-256-GCM`) e jamais expostos em texto claro nas respostas da API.
    3. **A03 Injection (SQLi & XSS)**: Neutralização de payloads `' OR 1=1 --` e `'; DROP TABLE customers; --` com preservação total das tabelas.
    4. **A04 Insecure Design**: Feature gating por plano (`403 PLAN_UPGRADE_REQUIRED` para `essencial` em módulos exclusivos) e honeypot silencioso anti-bot em rotas públicas.
    5. **A05 Security Misconfiguration**: Headers HTTP de segurança via Helmet (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) e ocultação de stacktraces em erros.
    6. **A07 Authentication Failures**: Rejeição determinística (`401 Unauthorized`) de tokens JWT com assinatura adulterada, expirados ou com ataque `alg: "none"`.
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T7.5 — Simulação Mensal de Desastre e Restauração (DR Drill) `(Concluído e Homologado)`
- **Descrição:** Procedimento automatizado e auditável de backup lógico externo com verificação criptográfica, simulação de desastre catastrófico e restauração transacional completa.
- **Entregas Realizadas:**
  - **Motor de Simulação DR ([`dr-restore-drill.ts`](file:///d:/Repositorios/CarX/quality/scripts/dr-restore-drill.ts))**:
    1. Exportação de snapshot completo do tenant (`tenants`, `users`, `customers`, `vehicles`, `work_orders`, `warranties`, `crm_retention_rules`) com manifesto de integridade `SHA-256` (`5c768fd31db9ffda04462fc65d18d78f986ef7999c4e5eb09b4a0ff51a48a037`).
    2. Simulação de perda catastrófica (`DELETE ... CASCADE`) confirmando `0` registros remanescentes no banco.
    3. Restauração transacional a partir do backup externo preservando chaves primárias, vínculos relacionais e políticas RLS.
    4. **Métricas Atingidas**: **RTO = 343 ms** (meta `< 15 minutos`), **RPO = 0 registros perdidos**, **100% de paridade exata de linhas e atributos**.
  - **Evidências Persistidas**: [`dr-restore-drill.json`](file:///d:/Repositorios/CarX/quality/evidence/dr-restore-drill.json) e [`dr-backup-snapshot.json`](file:///d:/Repositorios/CarX/quality/evidence/dr-backup-snapshot.json).
- **Status:** `[x] 100% Concluído e Homologado`

---

## 🚀 FASE 8 — Go-To-Market & Beta Fechado `[🔵 EM EXECUÇÃO]`

**Onde ler no Documento Único:** [CarX_Documento_Unico.md — Seção 5: Fase 8 (Linhas 235–240)](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L235-L240).

### [x] T8.1 — Remoção de Mocks, Homologação em VPS de Teste e Sincronização Git `(Concluído e Homologado)`
- **Descrição:** Higienização completa da base de dados e do frontend (removendo clientes, placas e ordens mockadas), preservando unicamente os planos cadastrados (Essencial, Profissional, Elite) e superadmin. Criação da topologia Docker de homologação para VPS Oracle sem conflito com aplicações pré-existentes.
- **Entregas Realizadas:**
  - **Eliminação de Mocks em Frontend**: Refatoração de [`NovaOrdemServico.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/NovaOrdemServico.tsx) para resolução dinâmica de clientes e veículos via API REST, com suporte a cadastro instantâneo e consulta real ao catálogo de serviços da oficina.
  - **Script de Limpeza Transacional**: Criação de [`clean-mock-data.ts`](file:///d:/Repositorios/CarX/apps/api/src/scripts/clean-mock-data.ts) com limpeza em cascata de dados operacionais residuais mantendo 100% íntegros os planos cadastrados na migration `005_seed_plans.up.sql`.
  - **Topologia de Homologação VPS Oracle**: Criação de [`compose.oracle-test.yml`](file:///d:/Repositorios/CarX/infra/compose.oracle-test.yml) isolando portas (`3333` Fastify, `8080` Web, `8081` Admin e `5434` DB) para rodar simultaneamente sem conflitar com o sistema Cozinha existente no host.
  - **Scripts Automatizados de Deploy**: Criação de [`deploy-oracle-test.sh`](file:///d:/Repositorios/CarX/infra/scripts/deploy-oracle-test.sh) e [`deploy-oracle-test.ps1`](file:///d:/Repositorios/CarX/infra/scripts/deploy-oracle-test.ps1) para provisionamento zero-touch via SSH/SCP.
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T8.2a — Remoção de Fallbacks Visuais, Correções de Equipe/Orçamento e Roteamento Padrão OperaBeauty `(Concluído e Homologado)`
- **Escopo Solicitado na Homologação VPS:**
  - **Correção de Equipe (`POST /tenant/members` / `PATCH /tenant/members/:id`)**: Normalizar papéis enviados pelo frontend (`OPERADOR`, `GESTOR`, `ADM`, `operador`, `gestor`, `adm`) para o enum PostgreSQL `membership_role` (`tecnico`, `gestor`, `owner`, `atendente`, `financeiro`) e aceitar status booleano/string sem gerar Erro 500.
  - **Correção do Botão "+ Novo Orçamento" (`Vendas.jsx`)**: Garantir abertura e salvamento corretos do modal de orçamento.
  - **Saudação Dinâmica e Remoção de Mocks Visuais**: Substituir saudação fixa `"Bom dia"` por saudação dinâmica por horário (`Bom dia` / `Boa tarde` / `Boa noite`), zerar/buscar dados reais em `Dashboard.tsx`, `NpsDashboard.tsx`, `Relatorios.tsx` (aba Garantias e Revisões) e remover fallback demo quando uma oficina real está carregada em `MiniSiteOficina.tsx`.
  - **Roteamento Unificado Padrão OperaBeauty (Entrada Única na porta 8080 / domínio principal)**:
    - `/` ➔ Landing Page oficial
    - `/superadm` ➔ Painel SuperAdmin SaaS (`@carx/admin` servido sob `/superadm/` no Nginx principal)
    - `/dashboard` (e `/:slug/dashboard`) ➔ Painel do Gestor autenticado
    - `/:slug` ➔ Site público da oficina
    - `/:slug/login` ➔ Login do Gestor e Operacional da oficina
    - `/:slug/meuportal` (e `/:slug/portal`) ➔ Portal do Cliente da oficina
    - `/:slug/agendar` ➔ Agendamento online da oficina
- **Status:** `[x] 100% Concluído e Homologado`

---

### [x] T8.2b — Auditoria de Usabilidade, Fluxo Completo de Vendas/Orçamentos e Redesenho do App do Operador (Design System rebraind/) `(100% Concluído)`
- **Itens Críticos Levantados pelo Usuário na Homologação Real e Solucionados:**
  1. **Lookup de Placa de Veículo**: Removido gerador aleatório por hash de marcas/modelos fictícios em `plate-lookup-service.ts`. Se o veículo não estiver no catálogo ou no banco da loja, retorna `source: 'not_found'` com campos em branco para digitação livre.
  2. **Controle de Desconto no Orçamento (`NovoOrcamentoModal.tsx`)**: Input numérico ajustado para permitir zerar, limpar e editar livremente sem travar o estado.
  3. **Eliminação de `alert()` Nativo**: Substituídos alerts nativos por toasts modernos do CarX Design System (`NovaOrdemServico.tsx`, `OrdensServico.tsx`, etc.).
  4. **Identificador Amigável de OS/Orçamento no Grid de Vendas**: Substituído o UUID longo por formatação sequencial `#OS-0001` via `formatOsNumber`.
  5. **Correção de Valores e Tradução de Status**:
     - `NovoOrcamentoModal.tsx` e `work-order-service.ts` sincronizados para enviar e salvar `items` e `discountCents`, calculando perfeitamente o valor total e final da OS.
     - Status técnicos traduzidos para português nativo (`QUOTE` ➔ `Orçamento`, `APPROVED` ➔ `Aprovado`, `SCHEDULED` ➔ `Agendado`, `IN_PROGRESS` ➔ `Em Execução`, `QA` ➔ `Controle QA`, `READY` ➔ `Pronto p/ Retirada`, etc.) via `getStatusLabel`.
  6. **Redesenho do Modal de Detalhes do Orçamento**: Modernizado no padrão Dark Card (`#171C24` e `#0E1116`), exibindo placa, serviços detalhados com preços, subtotal, desconto e botão "Aprovar e Agendar" para ordens em status `QUOTE`.
  7. **Redesenho do Modal de Pagamento (`PagamentoModal.jsx`)**: Alinhado ao Dark Card com acentos Volt, exibindo `#OS-0001`, valor real devido, métodos modernos (PIX, Dinheiro, Cartão) e tratamento compatível.
  8. **Mensagem WhatsApp de Orçamento**: Ajustada em `useQuotes.js` e `whatsappUtils.js` para iterar sobre a lista real de serviços contratados e o valor total consolidado.
  9. **Edição de Serviços da OS (`EditOrderServicesModal.jsx`)**:
     - Inicialização corrigida para carregar tanto `items` quanto `servicos_detalhados`.
     - Implementada a rota `PATCH /work-orders/:id` no backend Fastify com recálculo atômico dos totais da OS e substituição dos itens em `work_order_items`.
  10. **Aprovação de Orçamento e Agendamento**: Máquina de estados atualizada em `ALLOWED_WORK_ORDER_TRANSITIONS` para permitir transição direta de `QUOTE` para `SCHEDULED` e `CHECKED_IN`, integrando a OS à agenda da oficina.
  11. **Redesenho Fiel da Interface do Operador (Design System rebraind/)**:
      - `MobileLayout.jsx`: Transição 100% para o tema escuro `#0E1116`, header dark com badge da loja e bottom navigation dark com destaques Volt `#C8F52E`.
      - `OperadorHome.tsx`: Reconstruído fielmente ao layout do Figma `rebraind/Operador · Fila@2x.png` (saudação "Olá, [Nome]", pill "12 dias sem retrabalho", abas "Minha fila" e "Toda a loja", card "EM EXECUÇÃO" marcante verde Volt `#C8F52E` com cronômetro grande tabular-nums e cards "PRÓXIMAS" escuros `#171C24`).
      - `ExecutorView.tsx` & `PhotoGuideGallery.jsx`: Reconstruídos conforme `rebraind/Operador · Execução@2x.png` com cronômetro gigante 46px, 4 barras de progresso horizontais, botões táteis e vistoria guiada 360° em tema escuro coerente.
  12. **Laudo de Inspeção 360° Interativo do Operador (`OperadorLaudoInspecao.tsx`)**:
      - Criado componente mobile fiel ao Figma `rebraind/Operador · Laudo de inspeção@2x.png`.
      - Silhueta vetorial do veículo em SVG escuro com mapeamento por toque/clique de avarias e pinos laranjas numerados (#FF9500).
      - Abas Superior, Frente, Traseira e Laterais; pills de seleção (Risco, Amassado, Pedra, Mancha); fotos de evidência por dano.
      - Input de KM atual, relato técnico por voz (Speech Recognition) e etapa 2 com assinatura tátil do cliente em canvas digital.
  13. **Unificação Dark Completa do App do Operador (Histórico e Perfil)**:
      - Aba de Histórico em `App.jsx` e página `Profile.jsx` migradas para o tema escuro Rebraind (`#0E1116`, `#171C24`, `#2E3744`), eliminando qualquer fundo branco destoante.
  14. **Bateria de Testes Visuais Automatizados (Playwright)**:
      - Validada a jornada do Operador e Gestor via script headless em viewport mobile e desktop com captura de evidências visuais em PNG.
- **Status:** `[x] 100% Concluído e Homologado`

---

### [ ] T8.2 — Seleção do Grupo Beta e Testes com Analistas
- [ ] Recrutamento de 3 a 5 oficinas parceiras em condições especiais em troca de homologação e feedbacks semanais.
- [ ] Rodada de homologação e testes práticos com analistas no ambiente de teste da VPS.

### [ ] T8.3 — Base de Conhecimento e Suporte
- [ ] Criação de tutoriais guiados em vídeo e guias rápidos para o Operador e Gestor da oficina.

### [ ] T8.4 — Lançamento Oficial na VPS Hostinger de Produção
- [ ] Validação final dos planos e transição definitiva para produção na VPS Hostinger.

---

### [ ] T8.2c — Ajustes Finos de Homologação da Oficina (Apontamentos do Usuário)
- [x] **Item 1 — Autocompletar da Placa no Novo Orçamento (Print 1)**: Ao digitar a placa (ex: `EVH0H22`), o formulário preenche automaticamente o campo com "Veículo", cor "Prata" e porte "Sedan". Ajustar para não forçar valores padrão estáticos indevidos e permitir digitação limpa.
- [x] **Item 2 — Prefixo Indevido "Geral" no Nome do Veículo (Print 2)**: Ao salvar o orçamento/OS, o veículo é exibido com a palavra "Geral" na frente (ex: "Geral Honda Civic"). Identificar a origem dessa concatenação (marca/categoria/box) e garantir que seja exibido apenas a marca e modelo corretos.
- [x] **Item 3 — Contraste e Legibilidade do Badge de Status (Print 3)**: No grid de Ordens de Serviço / Vendas, o badge de status (ex: "Orçamento") está com texto cinza escuro sobre fundo cinza escuro, ficando ilegível. Ajustar classes de cores e contraste do badge para leitura nítida.
- [x] **Item 4 — Redundância nos Botões de Pagamento nas Ações (Print 4)**: Na coluna AÇÕES do grid, há dois botões voltados para pagamento/cobrança (ícone QR Code Pix e ícone Cifrão $). Avaliar a unificação em um único modal de checkout ou diferenciar claramente a função de cada um.
- [x] **Item 5 — Tradução dos Filtros de Status em Ordens de Serviço (Print 1)**: As abas/pills de filtro de status na tela de Ordens de Serviço estão em inglês (`Todos os Status`, `QUOTE`, `APPROVED`, `IN_PROGRESS`, `QA`, `READY`, `DELIVERED`). Traduzir para português nativo (`Todos os Status`, `Orçamentos`, `Aprovadas`, `Em Execução`, `Controle QA`, `Prontos`, `Entregues`).
- [x] **Item 6 — Segregação de Orçamentos (QUOTE) da Fila de Execução e do Operador**: Orçamentos pendentes de aprovação não podem aparecer misturados na fila principal de execução nem na tela de tarefas do Operador. A OS só deve ser despachada para o pátio/técnico após a aprovação formal do orçamento.
- [x] **Item 7 — Modernização Visual do Modal "Detalhes da Proposta" (Print 2)**: Na tela de Vendas, o modal de detalhes do orçamento ainda está com aparência legada. Aplicar o padrão canônico novo do CarX Design System (Dark Card refinado, tipografia Space Grotesk, hierarquia de informações e badges modernos).
- [x] **Item 8 — Modernização Visual do Modal de Pagamentos (Print 3)**: O modal de registrar pagamento precisa ser refinado para o novo padrão visual moderno do sistema, com acabamento refinado de cartões, botões e tipografia.
- [x] **Item 9 — Persistência e Exibição Correta dos Serviços no WhatsApp e Proposta**: A mensagem do WhatsApp e a visualização de detalhes exibiram o texto genérico "• Serviços Especializados" mesmo após o usuário selecionar o serviço específico na criação do orçamento. Corrigir para persistir e exibir exatamente os serviços selecionados com nomes e valores corretos.
- [x] **Item 10 — Redesenho do Modal de Ações Rápidas da OS/Orçamento (Print 1)**: O modal de ações (`AÇÕES • #OS-0002`) está no layout branco antigo com botões legados. Modernizar para o padrão Dark Card do CarX Design System (`#171C24`, borda `#2E3744`, ícones e ações com visual premium).
- [x] **Item 11 — Unificação do Fluxo de Aprovação e Agendamento sem Telas Sobrepostas (Print 2 e 3)**: Eliminar o modal branco legado "AGENDAR SERVIÇO" que aparece sobreposto ao fechar e causa duplicidade com a tela de detalhes. O fluxo de aprovação e agendamento deve ser integrado e resolvido diretamente dentro do modal moderno de Detalhes da Proposta.
- [x] **Item 12 — Correção do Erro HTTP 400 em Pagamento na Aprovação (`approveQuote`)**: Ao clicar em confirmar agendamento/aprovação com adiantamento, ocorre o erro `POST /work-orders/:id/payments 400 Bad Request: Dados de pagamento inválidos`. Corrigir o payload enviado por `approveQuote` em `useQuotes.js` para bater exatamente com o schema esperado pela API Fastify.
- [x] **Item 13 — Correção de Asset Ausente 404 (`carx-logo.svg`)**: O arquivo `carx-logo.svg` está gerando erro 404 no console. Assegurar que o arquivo esteja presente na pasta `public/assets/` do web para servir corretamente.
- [x] **Item 14 — Tratamento de Erros de Console (401 Unauthorized e 404 Fiscal Invoice)**:
  - Eliminar os erros 401 em consultas em segundo plano ajustando os interceptores de renovação de token JWT.
  - Ajustar a consulta de NFS-e (`GET /work-orders/:id/fiscal-invoice`) para não estourar erro 404 quando a OS ainda não possui nota emitida (deve retornar null de forma transparente).
  - Tratar chamadas de fotos do portal para usar as credenciais corretas do tenant/cliente.
- [x] **Item 15 — Agendamento Flexível sem Exigência de Operador**: O agendamento da OS não pode obrigar a seleção de um colaborador. Permitir agendar sem técnico pré-alocado, mantendo o serviço na fila geral para atribuição posterior ou para o operador puxar no pátio.
- [x] **Item 16 — Padronização Visual do Grid de Vendas e Orçamentos (Print 1)**: Harmonizar o grid de Vendas com o padrão moderno da tela de Ordens de Serviço (bordas, espaçamentos, tipografia, badges de status com alto contraste e botões de ação limpos).
- [x] **Item 17 — Redesenho Moderno da Tela de Clientes (Print 2)**: Atualizar a página de Clientes eliminando resquícios do layout legado no banner do portal, na tabela de clientes e na paginação, alinhando ao Design System CarX.
- [x] **Item 18 — Modal Elegante e Mobile-First de Detalhes do Cliente (Print 3)**: Substituir a gaveta lateral branca (drawer com botão "Cadastrar" cortado, UUID longo e status `QUOTE` em inglês) por um modal moderno, elegante, escuro e 100% responsivo para celulares de gestores de oficina.
- [x] **Item 19 — Persistência da Data de Agendamento na Agenda e Histórico do Cliente**: Ao aprovar e agendar, a data/hora selecionadas não estão sendo salvas na tabela de agendamentos (`appointments`) nem no histórico de serviços do cliente (`--/--/----`). Garantir persistência e exibição correta na Agenda e no perfil do cliente.
- [x] **Item 20 — Permissão de Reabertura de OS Agendada (SCHEDULED ➔ QUOTE)**: Corrigir a máquina de estados em `ALLOWED_WORK_ORDER_TRANSITIONS` para permitir reverter `SCHEDULED ➔ QUOTE`, possibilitando reabrir e renegociar orçamentos agendados quando o cliente pedir alterações antes do check-in.
- [x] **Item 21 — Rota Inicial de Relatórios e Enriquecimento da Visão Gerencial (Print 1)**: Ao clicar no menu lateral "Relatórios", a página deve abrir diretamente na "Visão Gerencial" (em vez de cair direto em NPS). Além disso, enriquecer a Visão Gerencial com gráficos de faturamento, volume de serviços e distribuição financeira, preenchendo o espaço vazio abaixo dos cards.
- [x] **Item 22 — Modernização Visual do CRM de Retenção & Pós-Venda (Print 2)**: Eliminar traços antigos com arredondamentos estranhos e linhas desproporcionais na tela de CRM de Retenção. Aplicar o Design System CarX com Dark Cards `#171C24`, bordas `#2E3744` e hierarquia nítida.
- [x] **Item 23 — Ajuste Visual do Botão "Nova Transferência" em Redes/Franquias (Print 3)**: O botão "Nova Transferência" no histórico de insumos entre lojas está com proporções e ícone estranhos. Harmonizar com o padrão de botões canônicos do sistema.
- [x] **Item 24 — Correção Crítica de Responsividade Mobile em Redes / Franquias (Print 4)**: Na visualização móvel/celular, a tela Corporativa de Redes vaza horizontalmente, cortando botões de ação ("Transferir Insumos", "Nova Filial") e abas de filiais. Aplicar layout flexível com quebra de linha inteligente e adaptabilidade total a smartphones.
- [x] **Item 25 — Modernização do Modal "Cadastrar Serviço" e Catálogo (Print 5)**: O modal de cadastro de serviços e a tela de serviços estão com visual legado e campos básicos. Modernizar o modal em Dark Card com inputs táteis modernos (tempo estimado, comissão, porte do veículo, garantia) e refinamento do catálogo.
- [x] **Item 26 — Redesenho Moderno da Tela de Equipe & Colaboradores (Print 6)**: A aba de Membros & Acessos está em cartões brancos antigos com botões de rodapé legados. Modernizar para o novo padrão visual com badges de cargo, status do técnico e ações com botões modernos.
- [x] **Item 27 — Refinamento do Ranking de Técnicos e Gamificação (Print 7)**: O card do líder e o quadro geral de técnicos precisam de acabamento moderno e do cálculo dinâmico correto do streak auditado ("Dias Sem Retrabalho") conectado aos laudos de QA e OS entregues.
- [x] **Item 28 — Modernização de Configurações e Limpeza de Cores Legadas (Print 1)**: A tela de Configurações > Identidade Visual possui seletores de cores (primária, secundária e fundo) que quebram o Design System canônico. Remover esses color pickers herdados do sistema legado e focar a customização no Nome da Loja, Logomarca, Contatos e TV da Loja com layout Dark Card moderno.
- [x] **Item 29 — Correção Dinâmica de Slug do Mini-Site da Loja (Print 2)**: O link do mini-site público está apontando estaticamente para `/loja/minha-oficina`, disparando erro "Oficina Não Encontrada". Ajustar para usar o slug real da oficina logada (ex: `http://137.131.151.125:8080/caiocar` ou `carx.tech/:slug`), garantindo que ao clicar o site abra perfeitamente com os dados da oficina.
- [x] **Item 30 — Avaliação e Conclusão ou Simplificação de APIs & Webhooks**: Auditar a aba de APIs & Webhooks: se for mantida para integrações externas (CRM, automações Zapier/Webhooks), consolidar para funcionar 100% com emissão de token real; se o foco for a operação direta da oficina, simplificar ou reposicionar para planos corporativos para manter o painel limpo. Consolidação 100% concluída: endpoints REST reais integrados no client `api.integrations` (geração de chaves criptografadas SHA-256 `carx_live_...`, revogação no banco, cadastro de webhooks reais com segredos HMAC, testes de disparo via Fastify e documentação Swagger UI `/v1/docs` no CarX Design System Dark Card).
- [x] **Item 31 — Silhuetas Gráficas do Veículo por Ângulo no Laudo de Inspeção (Print 2)**: No Laudo 360° do operador (`OperadorLaudoInspecao.tsx`), ao alternar entre as abas (*Superior, Frente, Traseira, Laterais*), o diagrama continua mostrando apenas a silhueta da vista superior do carro. Implementar as silhuetas em SVG vetoriais específicas para cada visão (*frente, traseira e perfil lateral*) para marcação precisa dos pinos de avaria. Silhuetas SVG vetoriais detalhadas implementadas para as 4 vistas com mapeamento inteligente de peças e pinos numerados no padrão CarX Dark.
- [x] **Item 32 — Redimensionamento, Compactação Client-Side e Redução de Bordas nas Fotos da Vistoria Guiada (Print 3)**: Na vistoria guiada (`PhotoGuideGallery.jsx`), os cards de foto estão com bordas e cantos arredondados excessivos (`rounded-[2rem]`). Ajustar para um raio moderno e proporcional (`rounded-xl` / `rounded-2xl`). Implementar compactação client-side de imagem (Canvas/WebP max 1280px / 80% qualidade) antes do envio para a API, prevenindo o esgotamento do disco na VPS. Implementada compactação automática em `imageCompressor.ts` (Canvas/WebP max 1280px / 80%) integrada no upload de fotos e redesign dos cards em `rounded-2xl` e `rounded-xl` no Dark Card CarX.
- [x] **Item 33 — Persistência Real e Sincronização do Cronômetro Oficial do Servidor (Print 4)**: Corrigir a sincronização do cronômetro da OS com o backend Fastify: quando o operador sai da tela ou fecha o app por engano (ex: estava em 2min, aguardou até 2m05s e recarregou), o tempo não pode regredir nem descompassar. O tempo decorrido deve persistir atomicamente no banco para continuidade sem perdas. Ajustada a autoridade do cronômetro para priorizar `timerData` do servidor Fastify sobre o cache do IndexedDB durante conexão online, evitando regressão ou congelamento de tempo ao recarregar a tela.
- [x] **Item 34 — Correção do Erro HTTP 403 Forbidden em Ranking de Técnicos (`GET /reports/technicians/ranking`)**: Ajustar o RBAC/permissões no backend Fastify para que operadores e técnicos autenticados possam consultar o ranking de técnicos e gamificação sem bloqueio de permissão (403 Forbidden).
- [x] **Item 35 — Correção do Erro HTTP 400 Bad Request em Parada do Cronômetro (`POST /technician/work-orders/:id/stop`)**: Ao tentar parar/pausar o serviço pelo operador, a API retorna erro 400. Corrigido o interceptor central `fetchClient` para não enviar cabeçalho `application/json` com corpo vazio em requisições POST sem payload e implementada idempotência resiliente no método `stopTimer` do backend.
- [x] **Item 36 — Correção do Erro HTTP 422 Unprocessable Entity em Transição de Status (`PATCH /work-orders/:id/status`)**: Ao tentar atualizar o status ou finalizar o serviço pela tela do operador, a máquina de estados rejeita a transição com erro 422. Atualizada a máquina canônica `ALLOWED_WORK_ORDER_TRANSITIONS` em `@carx/shared` para permitir transições legítimas da esteira operacional (`CHECKED_IN`, `SCHEDULED`, `PAUSED`, `IN_PROGRESS` ➔ `QA` e `READY`), autoatribuindo o operador caso a OS ainda não tivesse técnico alocado.
- [x] **Item 37 — Conclusão de Serviço pelo Operador e Movimentação para o Histórico**: Ao finalizar o serviço, a OS deve ser movida imediatamente para o histórico de concluídas do operador e removida da fila de pendentes ("Minha fila"), sincronizando a lista local e o estado no servidor. Atualizados `isClosed` na fila do operador para excluir OS em `QA` e `READY` das tarefas a executar e refinada a listagem da aba Histórico em `App.jsx` com invalidação de cache via React Query.
- [ ] **Item 38 — Teste E2E de Fluxo Sistêmico Completo 100% Visual pela Tela (Frontend)**: Realizar homologação de ponta a ponta operando o sistema exclusivamente pela interface gráfica (via automação de browser/Playwright na tela real, sem atalhos e sem manipulação de banco/código por trás).
- [x] **Item 39 — Limpeza Rigorosa do Cache de Placas e Lookup 100% Limpo (Print 1)**: Ao digitar placas não cadastradas (ex: `EVH0H11`), o sistema ainda está preenchendo automaticamente veículos incorretos (ex: `HONDA Civic Touring Híbrido 2.`, `VERMELHO`, `Sedan`) por resquício de registros legados no cache global `vehicle_plate_cache`. Purgar o cache no banco de dados da VPS e do ambiente local, e garantir que placas fora do catálogo benchmark oficial retornem estritamente `source: 'not_found'` com todos os campos em branco para digitação livre e verdadeira do operador/gestor.
- [x] **Item 40 — Correção do Progresso Inicial da Ordem de Serviço (0% em Agendado/Aprovado) (Print 2)**: Uma OS recém-criada ou com status `Agendado` (`SCHEDULED`) e `Aprovado` (`APPROVED`) estava aparecendo na tabela do Gestor com a barra de progresso em 20%, antes mesmo de o operador tocar no carro. Corrigido o método `getProgressByStatus` em `work-order-service.ts` e o frontend (`useOrders.js`) para retornar `0%` para `QUOTE`, `APPROVED`, `SCHEDULED` e `CHECKED_IN`. O percentual de progresso só inicia quando a ordem for iniciada no pátio (`IN_PROGRESS`). Atualizadas ordens pendentes no banco e validado visualmente na VPS com a OS #1 exibindo 0%.
- [x] **Item 41 — Isolamento Multitenant da URL do Monitor TV (`/:slug/tv`) (Print 3)**: A URL do Monitor TV estava fixa e global como `http://137.131.151.125:8080/tv`. Em ambiente SaaS com múltiplas oficinas, todas acessariam a mesma rota `/tv`, causando conflito e quebra de isolamento multitenant. Criado o endpoint público no Fastify `GET /public/tv/:slug` com resolução de branding e ordens de produção (`CHECKED_IN`, `IN_PROGRESS`, `QA`, `READY`), parametrizado o SSE em `/realtime/events?slug=:slug`, configurada a rota canônica `/:slug/tv` e `/:slug/monitor-tv` no React Router com redirecionamento automático de `/tv` para `/${slug}/tv` da oficina logada, e atualizados os botões no `Sidebar.jsx` (`href="/${tenantSlug}/tv"`) e no `Dashboard.tsx`. Validado visualmente via Playwright em `caioteste/tv`.
- [x] **Item 42 — Eliminação de Emojis e Modernização dos Botões de Fases de Fotos (Print 3)**: Na galeria de vistoria guiada (`PhotoGuideGallery.jsx` e `photoConstants.js`), os seletores das fases de fotos (`Antes (Recepção)`, `Durante (Processo)`, `Depois (Acabamento)`) e dos ângulos estavam usando emojis nativos (`📥`, `⚙️`, `📤`, `🏎️`, etc.) com contadores desajeitados. Todos os emojis foram removidos e substituídos por botões de alta precisão em estilo Segmented Control Dark do Design System CarX com ícones Lucide vetoriais (`Camera`, `Wrench`, `Sparkles`, `Layers`, `Car`, `Focus`), acentos em verde Volt `#C8F52E` e contadores pill numéricos alinhados. Validado visualmente na tela do Operador com evidências PNG.
- [x] **Item 43 — Redesenho de Alta Fidelidade do Checklist / Laudo e Silhuetas por Categoria (Print 4 e Print 5)**: A silhueta lateral antiga do laudo possuía traçado desproporcional e cartunesco ("carro de lado horrível"). A experiência do laudo e checklist de entrada foi totalmente reconstruída no padrão de excelência de estúdio automotivo 3D clay neutro (cinza fosco #808384 sobre fundo estúdio branco puro com sombra de solo suave). Foram geradas e normalizadas as 25 representações visuais (5 categorias: *Hatch*, *Sedan*, *SUV*, *Picape* e *Moto* x 5 ângulos: *Principal 3/4*, *Frontal*, *Traseira*, *Lateral Direita* e *Lateral Esquerda*) em `apps/web/public/assets/inspection/` e substituídos os legados em `apps/web/public/assets/checklist/`. Desenvolvidos os componentes `VehicleStage.tsx` com toque tátil de avarias, detecção heurística da peça atingida (`detectPart`), seleção de severidade/tipo, compressão client-side de foto de evidência, navegação tátil por gestos/swipe, relato técnico por voz e assinatura digital em canvas tátil integrado na etapa 2 com o Fastify. Validado com typecheck e build 100% aprovados. Evidência visual do catálogo 5x5: `clay_renders_showcase.png`.
- [x] **Item 44 — Resiliência de Storage MinIO (Fix Erro 500 no Sign/Laudo), Agendamento com Seleção de Box em Orçamentos e Persistência de Data de Cadastro em Clientes**:
  - **Fix Erro 500 no Salvamento do Checklist/Assinatura**: Ao salvar a assinatura da inspeção (`POST /inspections/:id/sign`), a API gerava `ECONNREFUSED 127.0.0.1:9000` por ausência do container MinIO na topologia de teste da VPS. Implementado fallback de armazenamento local resiliente em `apps/api/src/storage/storage-service.ts` (`uploadFile`, `getFileBuffer` e `getPresignedDownloadUrl`), garantindo que assinaturas e fotos sejam salvas sem interrupção do fluxo técnico mesmo se o S3 estiver offline; adicionado o serviço `carx-minio` persistido em `infra/compose.oracle-test.yml`.
  - **Seleção de Box de Atendimento e Sincronização na Agenda**: Adicionado seletor de Box no modal de aprovação/agendamento de orçamento em `apps/web/src/pages/Vendas.jsx`; atualizado payload em `apps/web/src/hooks/useQuotes.js` e DTO `UpdateWorkOrderDto` com `bayId`; sincronizada a criação/atualização de `appointments` com provisionamento automático dos 3 boxes canônicos (`Box 1 · Principal`, `Box 2 · Secundário`, `Box 3 · Rápido`) no banco do tenant e exibição garantida na timeline da Agenda.
  - **Data de Cadastro na Tela de Clientes**: Corrigida a discrepância entre `createdAt` (retornado pelo Fastify) e `created_at` (esperado pelo frontend) em `apps/web/src/hooks/useClients.js` e `apps/web/src/pages/Clientes.jsx`, exibindo a data de cadastro correta tanto na listagem quanto no perfil de clientes cadastrados automaticamente pela Nova OS.


