# Inventário e Mapeamento de Reúso do OperaBeauty para o CarX

> **Documento Oficial de Engenharia — Tarefa T2.0 (Fase 2)**  
> **Referência:** Repositório [`d:\Repositorios\OperaBeauty`](file:///d:/Repositorios/OperaBeauty)  
> **Objetivo:** Mapear os módulos reutilizáveis, classificar componentes em **Copiar**, **Adaptar** ou **Descartar**, mapear dívidas técnicas conhecidas e guiar a arquitetura multitenant do **CarX**.

---

## 1. Contexto Estratégico

O **OperaBeauty** é um SaaS multitenant maduro em produção, operando com isolamento no PostgreSQL via Row Level Security (RLS), autenticação JWT rotativa, gestão de planos e billing com PIX/Mercado Pago, painel de Super Admin e controle perimetral de containers Docker.

O **CarX**, por sua vez, é a transformação do legado monolítico *OsSystem* (anteriormente acoplado a Supabase/LocalStorage) em um SaaS automotivo premium e de alta escalabilidade. Conforme estabelecido na [Seção 2 (Rota B) do Documento Único](file:///d:/Repositorios/CarX/CarX_Documento_Unico.md#L88-L105), a rota mais rápida, segura e robusta é **aproveitar o núcleo multitenant comprovado do OperaBeauty** e acoplar a ele as regras especializadas do domínio automotivo (ordens de serviço, checklist fotográfico VCR, controle de bobinas de PPF e garantias).

---

## 2. Matriz Geral de Classificação dos Módulos

| Módulo do OperaBeauty | Classificação | Destino no CarX | Justificativa Técnica |
|---|:---:|---|---|
| **RLS e Isolamento em Banco** (`phase15_enable_rls`) | **COPIAR** | `apps/api` (Migrations SQL) | Mecanismo dinâmico em PL/pgSQL que ativa RLS em todas as tabelas com `tenant_id` e cria a política de sessão `app.current_tenant_id`. |
| **Sessão & Refresh Token Rotativo** (`cap_refresh_tokens`) | **COPIAR** | `apps/api/src/modules/auth` | Família de tokens (`family_id`), detecção de replay attack, expiração curta de 15m para access token e 7d para refresh token. |
| **Super Admin & Métricas SaaS** (`superadminService.js`) | **COPIAR** | `apps/api/src/modules/superadmin` e `apps/admin` | Métricas de MRR, Churn Rate, lista de lojas, inadimplência e suspensão/reativação. |
| **Autenticação Super Admin 2FA** (`totp.js`, `cap_platform_admins`) | **COPIAR** | `apps/api/src/modules/auth` | TOTP via RFC 6238, QR code de ativação e rastreamento de IP/User-Agent. |
| **Cobrança Recorrente & PIX** (`saasBillingService.js`) | **ADAPTAR** | `apps/api/src/modules/billing` | Reutilizar motor de PIX dinâmico e tolerância (*grace period*), adaptando para Asaas + Mercado Pago e planos automotivos. |
| **Modelo de Tenants** (`cap_tenants`) | **ADAPTAR** | `tenants` + `units` | No OperaBeauty o tenant era plano. No CarX suportará matriz e filiais (`units`), dados de CNPJ, razão social e subdomínios wildcard. |
| **Modelo de Usuários e RBAC** (`cap_staff`) | **ADAPTAR** | `users` + `memberships` | Unificar modelo de usuário e introduzir papéis automotivos: `owner`, `gestor`, `atendente`, `tecnico`, `financeiro`. |
| **Gestão de Planos & Quotas** (`cap_plans`) | **ADAPTAR** | `plans` + `subscriptions` | Substituir limites de esteticistas por limites de técnicos, bobinas de PPF, armazenamento de fotos e disparos WhatsApp. |
| **Gateway WhatsApp** (`whatsappService.js`, `gateway-whatsapp`) | **ADAPTAR** | `carx-wa` (Container isolado) | Manter isolamento na rede interna `wa`, adaptando mensagens para notificações de OS e aprovação de orçamentos. |
| **Storage de Arquivos** (`privateUploads.js`) | **REFATORAR** | `MinIO` (S3 Compatível) | No OperaBeauty os arquivos eram salvos em disco local (`/private_uploads`). No CarX utilizaremos MinIO com URLs pré-assinadas. |
| **Stack de Código** (Express + JS puro) | **REFATORAR** | Fastify + TypeScript estrito | Migrar a implementação para Fastify 4, schemas Zod, decorators e compilação TypeScript com verificação estrita de tipos. |
| **Módulos de Beleza & Cuidados** (Anamnese, Salão) | **DESCARTAR** | *Não migrado* | Anamnese corporal/facial, cardápio de espera, clube de corte de cabelo e comissões por procedimento estético. |

---

## 3. Análise Detalhada por Domínio

### 3.1 Isolamento Multitenant & RLS (Aproveitamento Direto - COPIAR)
- **Origem:** [`OperaBeauty/migrations/phase15_enable_rls_tenant_isolation.sql`](file:///d:/Repositorios/OperaBeauty/migrations/phase15_enable_rls_tenant_isolation.sql)
- **Como funciona:**
  - O banco de dados possui dois papéis:
    1. `carx_admin` (com privilégios totais, usado exclusivamente para migrations e Super Admin).
    2. `carx_app` (papel sem privilégio de bypass, `NOBYPASSRLS`).
  - Um loop PL/pgSQL busca todas as tabelas com a coluna `tenant_id` e habilita `ENABLE ROW LEVEL SECURITY`.
  - Injeta a política idempotente:
    ```sql
    CREATE POLICY tenant_isolation_policy ON public.tabela
    AS PERMISSIVE FOR ALL TO carx_app, postgres
    USING (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    )
    WITH CHECK (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    );
    ```
- **Melhoria no CarX:** Implementar middleware no Fastify que executa `SET LOCAL app.current_tenant_id = $1` dentro da transação da requisição, garantindo isolamento a nível de conexão física e prevenindo vazamento de dados entre threads.

---

### 3.2 Autenticação, Sessões e RBAC (Aproveitamento Adaptado - ADAPTAR)
- **Origem:** [`OperaBeauty/backend/services/authService.js`](file:///d:/Repositorios/OperaBeauty/backend/services/authService.js) e [`OperaBeauty/backend/middlewares/auth.js`](file:///d:/Repositorios/OperaBeauty/backend/middlewares/auth.js)
- **Pontos Fortes Reaproveitados:**
  - Token JWT com tempo de vida curto (15 minutos).
  - Refresh Tokens armazenados em tabela (`refresh_tokens`), vinculados a uma família (`family_id`).
  - **Detecção de Replay Attack:** Se um refresh token já substituído for apresentado, todos os tokens da mesma família são revogados imediatamente (sequestro de sessão evitado).
  - Controle de 2FA (TOTP) para Super Admin.
- **Adaptações Necessárias para o CarX:**
  - **Hashing de Senha:** Trocar `bcryptjs` pelo padrão moderno **Argon2id** (ou manter bcrypt com fator 12).
  - **Estrutura de Usuários & Memberships:** No OperaBeauty o usuário era amarrado ao salão na própria tabela `cap_staff`. No CarX, criaremos uma tabela `users` global e uma tabela `memberships` (`tenant_id`, `unit_id`, `user_id`, `role`), permitindo que um mesmo gestor opere múltiplas oficinas ou mude de loja sem criar outro login.
  - **Papéis Automotivos (RBAC):**
    - `owner`: Dono da oficina (acesso total à conta, faturamento SaaS, filiais e dados).
    - `gestor`: Gerente de loja (acesso a ordens de serviço, clientes, estoque e comissões).
    - `atendente`: Recepção e orçamentos (abertura de OS, cadastro de clientes e veículos).
    - `tecnico`: Operador de bancada/galpão (fila de execução, checklist de entrada, fotos, cronômetro de aplicação de PPF/vitrificação).
    - `financeiro`: Gestão de contas a pagar/receber, fechamento de caixa e emissão de notas.

---

### 3.3 Gestão de Planos, Quotas e Faturamento SaaS (ADAPTAR)
- **Origem:** [`OperaBeauty/backend/services/saasBillingService.js`](file:///d:/Repositorios/OperaBeauty/backend/services/saasBillingService.js) e [`OperaBeauty/backend/services/planService.js`](file:///d:/Repositorios/OperaBeauty/backend/services/planService.js)
- **Pontos Fortes Reaproveitados:**
  - Geração de cobranças via PIX dinâmico com baixa automática via Webhook.
  - Régua de cobrança automática:
    - 5 dias antes: envio de lembrete preventivo.
    - Dia do vencimento: emissão da fatura com QR code PIX.
    - Período de tolerância (*grace period* de 5 dias após vencimento).
    - Inadimplência: bloqueio progressivo e suspensão do acesso da oficina.
- **Adaptações Necessárias para o CarX:**
  - **Gateways Híbridos:** Suporte nativo ao **Asaas** (provedor oficial preferencial no CarX para boletos, PIX e cartão recorrente) com fallback para Mercado Pago.
  - **Quotas dos Planos Automotivos:**
    | Métrica / Recurso | Plano Starter (Oficina Solo) | Plano Pro (Média Oficina) | Plano Enterprise (Rede / Franquia) |
    |---|:---:|:---:|:---:|
    | **Técnicos Simultâneos** | Até 2 | Até 8 | Ilimitado |
    | **Unidades / Filiais** | 1 | Até 3 | Múltiplas |
    | **Controle de Bobinas PPF** | Básico | Completo com corte | Completo + rastreio por lote |
    | **Armazenamento MinIO** | 10 GB | 50 GB | 200 GB+ |
    | **Disparos WhatsApp** | 200 / mês | 1.000 / mês | Ilimitado |
    | **Domínio Próprio White-Label** | Não | Sim | Sim |

---

### 3.4 Super Admin (Painel Master da Plataforma) (Aproveitamento Direto - COPIAR)
- **Origem:** [`OperaBeauty/backend/services/superadminService.js`](file:///d:/Repositorios/OperaBeauty/backend/services/superadminService.js) e rotas em `superadmin.js`
- **Capacidades a Transferir Diretamente para `apps/admin`:**
  - Dashboard geral com MRR em tempo real, receita por plano e taxa de cancelamento (Churn Rate).
  - Tabela master de tenants com busca, filtros por status (`active`, `suspended`, `trial`), contagem de usuários e faturamento.
  - Ações operacionais:
    - Bloquear / Desbloquear oficina com 1 clique.
    - Alterar plano e definir isenção ou preço fundador (*founder price*).
    - Login de Suporte (*Impersonate Tenant*): permite ao suporte entrar na visão do gestor com log de auditoria obrigatório.
  - Configurações globais da plataforma (`platform_settings`): chave de gateway, tolerância em dias e chaves de webhook.

---

### 3.5 Storage de Mídia e Fotos de Vistoria (REFATORAR PARA MINIO)
- **Dívida Técnica Identificada no OperaBeauty:**
  - O OperaBeauty utilizava uploads locais em disco (`backend/private_uploads/`), exigindo montagem de volumes Docker específicos e criando dificuldade de escalabilidade horizontal.
- **Evolução Arquitetural no CarX:**
  - No CarX, todo upload de mídia (fotos do checklist VCR de avarias, fotos de garantia, avarias de pintura, recibos) é armazenado diretamente no **MinIO (S3 compatível)**.
  - O backend gera URLs pré-assinadas (*Presigned URLs*) com validade curta para upload direto a partir do PWA do operador, aliviando a CPU do backend Node.js.
  - Download protegido: visualização pública apenas sob token de laudo/garantia anti-IDOR.

---

## 4. Dívidas Técnicas Conhecidas no OperaBeauty e Como Evitá-las no CarX

| Dívida Técnica no OperaBeauty | Impacto no OperaBeauty | Padrão Adotado no CarX |
|---|---|---|
| **JavaScript Puro (CJS/ESM misto)** | Erros de tipagem em tempo de execução e dependências inconsistentes. | **TypeScript Estrito (`strict: true`)** em todo o monorepo (API, Web, Admin e Shared). |
| **SQL Cru sem Validação de Esquema** | Strings SQL espalhadas nos serviços sem verificação de tipos nas colunas. | **Migrations SQL Versionadas** + Validação com **Zod** em todos os inputs/outputs. |
| **Uploads em Disco Local** | Dificuldade de backup e contenção de espaço em disco na VPS. | **MinIO S3** com buckets organizados por tenant (`/tenants/{tenant_id}/os/{os_id}/...`). |
| **Ausência de Testes Automatizados de RLS** | Risco de esquecer de aplicar `tenant_id` em novas tabelas. | **Suíte Automatizada `tenant-isolation.test.ts`** gerada dinamicamente a partir do catálogo do banco. |
| **Express com callbacks e middlewares manuais** | Maior overhead de memória e latência em comparação com frameworks modernos. | **Fastify 4** com serialização Pino nativa e tempo de resposta $< 1$ms. |

---

## 5. Plano de Ação para a Fase 2

Com o mapeamento concluído, a sequência de execução das próximas tarefas da Fase 2 fica estabelecida:

1. **T2.1 — Migrations e Esquema Relacional do Núcleo:**
   - Criar migrations SQL versionadas criando as tabelas centrais: `tenants`, `units`, `users`, `memberships`, `plans`, `subscriptions`, `invoices`, `refresh_tokens`, `audit_logs`, `platform_settings` e `platform_admins`.
2. **T2.2 — Contexto de Tenant e RLS em Profundidade:**
   - Implementar o gerador PL/pgSQL dinâmico de políticas RLS baseado no OperaBeauty.
   - Criar middleware Fastify para injeção de `SET LOCAL app.current_tenant_id`.
   - Implementar a suíte de testes de isolamento entre lojas com código de saída fail-closed.
3. **T2.3 — Autenticação e Gestão de Sessões:**
   - Implementar endpoints de login, refresh rotativo, logout com revogação e 2FA TOTP do Super Admin.
4. **T2.4 — Super Admin API e Interface de Gestão:**
   - Portar os endpoints de métricas de MRR, listagem de tenants e impersonation para `apps/api` e `apps/admin`.
5. **T2.5 — Billing Recorrente e Integração com Gateway:**
   - Implementar serviços de faturamento, emissão de faturas PIX e webhooks de baixa.

