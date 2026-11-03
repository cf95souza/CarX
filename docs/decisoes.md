# 📋 Registro de Decisões de Arquitetura e Negócio (ADR) — CarX

Este documento mantém o histórico imutável das decisões técnicas e de produto acordadas para o projeto **CarX**.

---

## 1. Decisões Fechadas

| # | Decisão | Solução Adotada | Justificativa / Impacto | Data |
|---|---|---|---|---|
| **01** | **Nome do Produto** | **CarX** (substitui o antigo *OsSystem*) | Posicionamento premium no segmento automotivo (estética, envelopamento, PPF, mecânica e vitrificação). | 30/10/2026 |
| **02** | **Arquitetura de Dados** | **Rota B (Backend Próprio)** | Abandono do Supabase BaaS gerenciado em favor de API própria Node.js + TypeScript com PostgreSQL 16 na VPS. Garante controle total de custos, transações ACID nativas e multitenancy real com RLS. | 30/10/2026 |
| **03** | **Infraestrutura VPS** | **Ubuntu Server 22.04 LTS / Docker** | Servidor dimensionado (4 vCPU / 16 GB RAM / 200 GB NVMe / 16 TB banda) comportando produção e homologação em containers segmentados. | 30/10/2026 |
| **04** | **Reaproveitamento de Núcleo** | **SaaS Multitenant (OperaBeauty)** | Reúso comprovado dos módulos de isolamento de tenants, gestão de assinaturas, quotas por plano, auditoria e módulo do Super Admin. | 30/10/2026 |
| **05** | **Topologia de Containers** | **5 Blocos + Serviços de Apoio** | Aplicação dividida em `carx-web`, `carx-api` (+ `carx-worker`), `carx-db`, `carx-wa` e `carx-admin-web`, apoiados por Caddy, Redis, MinIO e Uptime Kuma. | 30/10/2026 |
| **06** | **Ambiente Super Admin** | **Painel `/admin` Isolado** | Aplicação e credenciais separadas para gestão global de MRR, criação de lojas e controle de inadimplência sem exposição às lojas clientes. | 30/10/2026 |
| **07** | **Landing Page Comercial** | **Container `carx-web` com SSG** | Construção da vitrine de vendas de alta performance e SEO integrado com formulário de captação de leads. | 30/10/2026 |
| **08** | **Gateway de WhatsApp** | **Driver Desacoplado (`carx-wa`)** | Gateway próprio em container isolado com interface genérica `MessageChannel`, permitindo alternar entre driver não oficial e API Oficial (Meta Cloud). | 30/10/2026 |
| **09** | **Identidade Visual e UX** | **Design System Volt / Asfalto** | Paleta Volt `#C8F52E`, Asfalto `#0E1116`, Grafite `#171C24` e Aço `#232A35`. Fontes Space Grotesk e Inter. App do Operador em dark mode com botões de 56–60px. | 30/10/2026 |
| **10** | **Gerenciador de Pacotes** | **pnpm Workspaces Monorepo** | Gerenciamento unificado de dependências com velocidade extrema, economia de disco e tipagem cruzada entre `packages/*` e `apps/*`. | 03/11/2026 |

---

## 2. Decisões em Aberto / Pendentes de Homologação

| # | Pergunta / Decisão | Tarefa Vinculada | Opções Avaliadas |
|---|---|---|---|
| **01** | Domínio oficial de produção | T1.3, T2.7 | `carx.com.br` vs `carx.app.br` |
| **02** | Gateway de cobrança das assinaturas SaaS | Fase 5 (T5.2) | Asaas (Pix dinâmico + Boleto) vs Mercado Pago vs Stripe |
| **03** | Provedor de e-mail transacional | T2.3 | Resend vs Postmark vs Amazon SES |
| **04** | Storage externo para rotina de backups do banco | T1.4 | Cloudflare R2 vs Backblaze B2 vs AWS S3 |
| **05** | Regras de tolerância da régua de cobrança das lojas | T2.12 | Bloqueio leve com 7 dias; suspensão total com 15 dias |

