# Estrutura do Banco de Dados — CarX SaaS (PostgreSQL 16)

Este documento é a referência canônica e viva da modelagem de dados do **CarX SaaS**, definindo a infraestrutura relacional, migrações versionadas, tabelas centrais, tipos enumerados, índices de alta performance, triggers e integridade relacional.

> [!IMPORTANT]
> O CarX utiliza uma arquitetura multitenant relacional baseada em PostgreSQL 16 com isolamento via **Row Level Security (RLS)** por `tenant_id` e controle de permissões por unidade (`units` / filiais) e papéis RBAC (`memberships`).
> O banco oficial roda no container `carx-dev-db` (PostgreSQL 16 Alpine), gerenciado através do executor de migrações em TypeScript ([`apps/api/src/database/migrate.ts`](file:///d:/Repositorios/CarX/apps/api/src/database/migrate.ts)).

---

## 🛠️ Sistema de Migrações Versionadas

As alterações de banco são obrigatoriamente versionadas em arquivos SQL atômicos (`.up.sql` e `.down.sql`) sob o diretório [`apps/api/src/database/migrations/`](file:///d:/Repositorios/CarX/apps/api/src/database/migrations).

### Comandos de Operação (CLI)
A partir da raiz do monorepo ou dentro de `apps/api`:

```bash
# Executar todas as migrações pendentes em ordem
pnpm db:migrate
# ou: pnpm --filter @carx/api migrate:up

# Reverter a última migração aplicada (Rollback com integridade)
pnpm db:migrate:down
# ou: pnpm --filter @carx/api migrate:down

# Inspecionar o status das migrações (Aplicadas vs Pendentes)
pnpm db:migrate:status
# ou: pnpm --filter @carx/api migrate:status

# Reset total (Down em cascata seguido de Up completo)
pnpm db:migrate:reset
# ou: pnpm --filter @carx/api migrate:reset
```

### Tabela de Controle de Versões (`_carx_migrations`)
```sql
CREATE TABLE IF NOT EXISTS _carx_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🚀 Migração 001: Esquema Relacional do Núcleo (`001_core_schema.up.sql`)

### 1. Extensões PostgreSQL
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
```

### 2. Funções Utilitárias e Triggers
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Tipos e Enums do Domínio
| Tipo Enum | Valores Permitidos | Descrição |
|---|---|---|
| `tenant_status` | `'active'`, `'suspended'`, `'cancelled'`, `'trialing'` | Status do ciclo de vida da oficina/tenant no SaaS |
| `membership_role` | `'owner'`, `'gestor'`, `'atendente'`, `'tecnico'`, `'financeiro'` | Papéis de acesso e permissões RBAC automotivo |
| `billing_interval`| `'monthly'`, `'quarterly'`, `'semi_annual'`, `'annual'` | Intervalo de faturamento recorrente dos planos |
| `subscription_status` | `'trialing'`, `'active'`, `'past_due'`, `'canceled'`, `'incomplete'` | Estado da assinatura do tenant junto ao gateway |
| `invoice_status` | `'pending'`, `'paid'`, `'failed'`, `'cancelled'`, `'refunded'` | Status financeiro das faturas do SaaS |
| `payment_method` | `'credit_card'`, `'pix'`, `'boleto'` | Meios de pagamento suportados |

---

## 📊 Dicionário de Dados do Núcleo Multitenant

### 1. `plans` (Planos de Assinatura da Plataforma)
Contém os planos comerciais oferecidos aos donos de oficina (ex: Starter, Pro, Enterprise).
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `name` (VARCHAR(100), NOT NULL)
- `slug` (VARCHAR(100), UNIQUE, NOT NULL)
- `description` (TEXT)
- `price_cents` (INTEGER, NOT NULL, DEFAULT 0)
- `interval` (billing_interval, NOT NULL, DEFAULT 'monthly')
- `limits` (JSONB, NOT NULL, DEFAULT `{"max_units": 1, "max_users": 5, "max_vehicles": 1000}`)
- `features` (JSONB, NOT NULL, DEFAULT `["financial", "inspections", "whatsapp", "nfse"]`)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 2. `tenants` (Oficinas / Auto Centers / Clientes SaaS)
Entidade raiz de isolamento dos clientes da plataforma.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `slug` (VARCHAR(100), UNIQUE, NOT NULL) — Usado para `{slug}.carx.com.br`
- `trade_name` (VARCHAR(255), NOT NULL) — Nome Fantasia
- `legal_name` (VARCHAR(255)) — Razão Social
- `cnpj` (VARCHAR(18)) — Cadastro Nacional de Pessoa Jurídica
- `email` (VARCHAR(255), NOT NULL) — E-mail principal de contato/cobrança
- `phone` (VARCHAR(20))
- `status` (tenant_status, NOT NULL, DEFAULT 'trialing')
- `plan_id` (UUID, FK -> `plans.id`, ON DELETE SET NULL)
- `custom_domain` (VARCHAR(255), UNIQUE) — Suporte White-Label próprio
- `settings` (JSONB, NOT NULL, DEFAULT '{}') — Cores da marca, logotipo, configurações
- `trial_ends_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 3. `units` (Filiais e Unidades Operacionais)
Permite que uma oficina contratante gerencie matriz e múltiplas filiais.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, NOT NULL, FK -> `tenants.id`, ON DELETE CASCADE)
- `name` (VARCHAR(255), NOT NULL) — Ex: "Matriz Centro", "Filial Sul"
- `slug` (VARCHAR(100), NOT NULL)
- `cnpj` (VARCHAR(18))
- `phone` (VARCHAR(20))
- `email` (VARCHAR(255))
- `address_street`, `address_number`, `address_complement`, `address_neighborhood`, `address_city`, `address_state`, `address_postal_code`
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- *Constraint*: `uq_tenant_unit_slug UNIQUE (tenant_id, slug)`

### 4. `users` (Identidades Globais de Usuário)
Contas globais de usuários que acessam o ecossistema CarX.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255), NOT NULL, UNIQUE)
- `password_hash` (VARCHAR(255), NOT NULL)
- `phone` (VARCHAR(20))
- `avatar_url` (TEXT)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true)
- `email_verified_at` (TIMESTAMPTZ)
- `two_factor_secret` (VARCHAR(64))
- `two_factor_enabled` (BOOLEAN, NOT NULL, DEFAULT false)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 5. `memberships` (Associação Usuário <-> Tenant e Papéis RBAC)
Define o papel de cada usuário dentro de uma oficina ou unidade específica.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, NOT NULL, FK -> `tenants.id`, ON DELETE CASCADE)
- `unit_id` (UUID, FK -> `units.id`, ON DELETE SET NULL)
- `user_id` (UUID, NOT NULL, FK -> `users.id`, ON DELETE CASCADE)
- `role` (membership_role, NOT NULL, DEFAULT 'atendente')
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true)
- `permissions_override` (JSONB, NOT NULL, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- *Constraint*: `uq_tenant_user_unit UNIQUE (tenant_id, user_id, unit_id)`

### 6. `subscriptions` (Assinaturas SaaS Ativas)
Vincula a oficina ao plano contratado e acompanha o ciclo do gateway de pagamento.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, NOT NULL, FK -> `tenants.id`, ON DELETE CASCADE)
- `plan_id` (UUID, NOT NULL, FK -> `plans.id`, ON DELETE RESTRICT)
- `status` (subscription_status, NOT NULL, DEFAULT 'trialing')
- `current_period_start` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `current_period_end` (TIMESTAMPTZ, NOT NULL)
- `cancel_at_period_end` (BOOLEAN, NOT NULL, DEFAULT false)
- `canceled_at` (TIMESTAMPTZ)
- `external_customer_id` (VARCHAR(100)) — ID do cliente no Asaas
- `external_subscription_id` (VARCHAR(100)) — ID da assinatura no Asaas
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 7. `invoices` (Faturas e Cobranças Recorrentes)
Histórico e controle de liquidação das mensalidades do SaaS.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, NOT NULL, FK -> `tenants.id`, ON DELETE CASCADE)
- `subscription_id` (UUID, FK -> `subscriptions.id`, ON DELETE SET NULL)
- `amount_cents` (INTEGER, NOT NULL)
- `status` (invoice_status, NOT NULL, DEFAULT 'pending')
- `payment_method` (payment_method, NOT NULL, DEFAULT 'pix')
- `due_date` (DATE, NOT NULL)
- `paid_at` (TIMESTAMPTZ)
- `external_invoice_id` (VARCHAR(100))
- `external_payment_id` (VARCHAR(100))
- `pdf_url` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 8. `refresh_tokens` (Sessões JWT com Family Rotation)
Blindagem contra ataque de replay de tokens através de rotação contínua e rastreio de família.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `user_id` (UUID, NOT NULL, FK -> `users.id`, ON DELETE CASCADE)
- `token_hash` (VARCHAR(255), NOT NULL, UNIQUE)
- `family_id` (UUID, NOT NULL, DEFAULT gen_random_uuid())
- `is_revoked` (BOOLEAN, NOT NULL, DEFAULT false)
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 9. `platform_admins` (Super Administradores da Plataforma CarX)
Acesso exclusivo ao painel `admin.carx.com.br`.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `user_id` (UUID, NOT NULL, FK -> `users.id`, ON DELETE CASCADE, UNIQUE)
- `is_superadmin` (BOOLEAN, NOT NULL, DEFAULT false)
- `can_manage_tenants` (BOOLEAN, NOT NULL, DEFAULT true)
- `can_manage_billing` (BOOLEAN, NOT NULL, DEFAULT true)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 10. `platform_settings` (Configurações Globais do SaaS)
Pares de chave/valor JSONB para flags globais, avisos e parâmetros do sistema.
- `id` (VARCHAR(50), PK)
- `value` (JSONB, NOT NULL, DEFAULT '{}')
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 11. `audit_logs` (Trilha Imutável de Auditoria)
Registro de auditoria para ações críticas (exclusão de dados, alterações de papel, concessão de descontos).
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, FK -> `tenants.id`, ON DELETE SET NULL)
- `user_id` (UUID, FK -> `users.id`, ON DELETE SET NULL)
- `action` (VARCHAR(100), NOT NULL)
- `entity` (VARCHAR(100), NOT NULL)
- `entity_id` (VARCHAR(100))
- `old_values` (JSONB)
- `new_values` (JSONB)
- `ip_address` (VARCHAR(45))
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 12. `api_keys` (Credenciais de Integração Externa)
Autenticação programática por tenant para ERPs, sistemas de faturamento e parceiros.
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `tenant_id` (UUID, NOT NULL, FK -> `tenants.id`, ON DELETE CASCADE)
- `name` (VARCHAR(100), NOT NULL)
- `key_hash` (VARCHAR(255), NOT NULL, UNIQUE)
- `prefix` (VARCHAR(10), NOT NULL)
- `permissions` (JSONB, NOT NULL, DEFAULT '[]')
- `last_used_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### 13. `webhook_endpoints` e `webhook_deliveries` (Mensageria para Tenants)
Disparo de eventos em tempo real para os tenants (ex: `os.completed`, `invoice.paid`).
- `webhook_endpoints`: `id`, `tenant_id`, `url`, `secret`, `events`, `is_active`, `created_at`, `updated_at`
- `webhook_deliveries`: `id`, `endpoint_id`, `event`, `payload`, `status_code`, `response_body`, `duration_ms`, `error`, `created_at`

---

## ⚡ Índices de Performance e Integridade

```sql
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan_id ON tenants(plan_id);

CREATE INDEX idx_units_tenant_id ON units(tenant_id);
CREATE INDEX idx_units_tenant_slug ON units(tenant_id, slug);

CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_tenant_user ON memberships(tenant_id, user_id);

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE INDEX idx_webhook_deliveries_tenant_id ON webhook_deliveries(tenant_id);
CREATE INDEX idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
```

---

## 🛡️ Migração 002: Isolamento por Tenant em Profundidade e RLS (`002_tenant_rls.up.sql`)

Para garantir isolamento rigoroso entre oficinas a nível de motor de banco de dados, todas as tabelas contendo `tenant_id` e a tabela `tenants` possuem **Row Level Security (RLS)** ativado e forçado (`FORCE ROW LEVEL SECURITY`).

### 1. Papel da Aplicação (`carx_app`)
- O usuário `carx_app` opera com o atributo `NOBYPASSRLS`.
- O pool da aplicação (`DATABASE_URL`) conecta-se obrigatoriamente através do papel `carx_app`.
- Apenas migrações e rotinas de manutenção utilizam `DATABASE_ADMIN_URL` (`adminPool`).

### 2. Política de Isolamento Canônica (`tenant_isolation_policy`)
Aplicada a todas as tabelas com `tenant_id` (`units`, `memberships`, `subscriptions`, `invoices`, `audit_logs`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`):

```sql
CREATE POLICY tenant_isolation_policy ON <table>
AS PERMISSIVE
FOR ALL
TO public
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

### 3. Política de Auto-Isolamento de Tenants (`tenant_self_isolation_policy`)
Aplicada na tabela `tenants`:

```sql
CREATE POLICY tenant_self_isolation_policy ON public.tenants
AS PERMISSIVE
FOR ALL
TO public
USING (
    current_setting('app.current_tenant_id', true) = id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
)
WITH CHECK (
    current_setting('app.current_tenant_id', true) = id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
);
```

### 4. Padrão Fail-Closed (Default Deny)
As funções utilitárias `tenantQuery` e `tenantTransaction` ([`apps/api/src/database/tenant-query.ts`](file:///d:/Repositorios/CarX/apps/api/src/database/tenant-query.ts)) bloqueiam sumariamente qualquer consulta sem `tenant_id` válido, lançando `TenantIsolationError` (HTTP 403) antes de tocar o banco.

---

## 🔑 Migração 003: Tabelas de Suporte a Autenticação e 2FA (`003_auth_tables.up.sql`)

### 1. Extensão da Tabela `users`
- `two_factor_temp_secret` (VARCHAR(64)): Armazena o segredo TOTP gerado durante a etapa de configuração até a confirmação com código de 6 dígitos.

### 2. Tabela `password_resets` (Recuperação Segura de Senha)
Armazena tokens descartáveis com expiração de 1 hora para redefinição de credenciais:
```sql
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Índices de Suporte
```sql
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token_hash ON password_resets(token_hash);
```

---

## 🛡️ Migração 004: Trilha de Auditoria Imutável (`004_audit_immutability.up.sql`)

### 1. Bloqueio Rigoroso de Mutabilidade (Append-Only)
Para conformidade com normas fiscais, LGPD e rastreabilidade da oficina, a tabela `audit_logs` é estritamente imutável: qualquer tentativa de `UPDATE` ou `DELETE` no banco de dados é interceptada e abortada por trigger:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.bypass_audit_immutability', true) = 'true' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    RAISE EXCEPTION 'Audit logs are immutable: records cannot be updated or deleted (action: %, entity: %, id: %)',
        OLD.action, OLD.entity, OLD.id
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
```

### 2. Índices de Performance para Auditoria e Filtros
```sql
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 3. Permissões
```sql
GRANT SELECT, INSERT ON TABLE audit_logs TO carx_app;
```

---

## 💎 Migração 005: Seed dos Planos Canônicos e Cotas (`005_seed_plans.up.sql`)

### 1. Planos Canônicos Inseridos
```sql
-- Essencial (R$ 69,90/mês): 1 unidade, 3 usuários (regra rígida), WhatsApp básico, 100 OS/mês, 1 GB MinIO
-- Profissional (R$ 149,90/mês): 2 unidades, 10 usuários, WhatsApp auto, financeiro, comissões, estoque, checklist, NPS, bobinas de PPF, 500 OS/mês, 10 GB MinIO
-- Premium (R$ 299,90/mês): 10 unidades, 50 usuários, multi-loja, NFS-e, API de integração, domínio customizado White-Label, 50 GB MinIO
```

### 2. Vinculação Padrão de Inquilinos
Inquilinos sem plano contratado explicitamente recebem vinculação automática ao plano `Essencial`.

---

## 🎨 Migração 006: Subdomínio por Loja e White Label Real (`006_tenant_branding.up.sql`)

### 1. Tabela `tenant_branding`
```sql
CREATE TABLE IF NOT EXISTS tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    trade_name VARCHAR(255),
    tagline VARCHAR(255),
    logo_url TEXT,
    logo_icon_url TEXT,
    cover_url TEXT,
    primary_color VARCHAR(30) NOT NULL DEFAULT '#E63946',
    secondary_color VARCHAR(30) NOT NULL DEFAULT '#1D3557',
    accent_color VARCHAR(30) NOT NULL DEFAULT '#457B9D',
    app_title VARCHAR(255),
    app_short_name VARCHAR(50),
    description TEXT,
    whatsapp_phone VARCHAR(30),
    social_instagram VARCHAR(100),
    social_facebook VARCHAR(100),
    website_url VARCHAR(255),
    receipt_footer_notes TEXT,
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'system',
    custom_css TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. RLS Canônico e Segurança
- `ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE tenant_branding FORCE ROW LEVEL SECURITY;`
- Política `tenant_isolation_policy` vinculando isolamento a `app.current_tenant_id = tenant_id::text` com bypass autorizado para superadmin e resolução pública.
- Trigger de criação automática de branding padrão na inserção de novos tenants (`trg_tenants_auto_create_branding`).
- Permissões concedidas a `carx_app`.

---

## 📦 Migração 007: Armazenamento de Arquivos e Mídias com MinIO (`007_storage_media.up.sql`)

### 1. Tabela `storage_files`
```sql
CREATE TABLE IF NOT EXISTS storage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_key VARCHAR(500) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'carx-media',
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    real_mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    entity_id UUID,
    uploader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Índices de Desempenho
```sql
CREATE INDEX IF NOT EXISTS idx_storage_files_tenant_id ON storage_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_tenant_category ON storage_files(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_storage_files_file_key ON storage_files(file_key);
```

### 3. RLS Canônico e Isolamento Rigoroso
- `ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE storage_files FORCE ROW LEVEL SECURITY;`
- Política canônica `tenant_isolation_policy` (impedindo que qualquer consulta ou comando acesse arquivos de outras oficinas).
- Trigger `trg_storage_files_updated_at` acionando `update_updated_at_column()`.
- Permissões concedidas para `carx_app`.

---

## 🛡️ Migração 008: Super Admin, Contratos, Leads e Impersonação (`008_superadmin_schema.up.sql`)

### 1. Tabela `superadmin_users` (Administradores da Plataforma Isolados dos Tenants)
```sql
CREATE TABLE IF NOT EXISTS superadmin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_secret VARCHAR(64),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Tabela `contracts` e `contract_events` (Contratos e Licenças Comerciais)
```sql
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    negotiated_price_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    custom_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar e Forçar RLS na tabela contracts (possui tenant_id)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON contracts
    AS PERMISSIVE FOR ALL TO public
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

CREATE TABLE IF NOT EXISTS contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Tabela `impersonation_log` (Auditoria Rigorosa de Acesso a Oficinas)
```sql
CREATE TABLE IF NOT EXISTS impersonation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    superadmin_user_id UUID NOT NULL REFERENCES superadmin_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    token_jti VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Canônico e Forçado
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON impersonation_log
    AS PERMISSIVE FOR ALL TO public
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

### 4. Tabela `leads` (Funil de Vendas da Landing Page)
```sql
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    converted_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5. Alterações Estruturais Complementares
- `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;`
- `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS superadmin_user_id UUID REFERENCES superadmin_users(id) ON DELETE SET NULL;`

---

## 🚀 Migração 009: Catálogo de Serviços, Checklists e Provisionamento (`009_provisioning_catalog.up.sql`)

### 1. Coluna de Segmentação em `tenants`
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS segment VARCHAR(50) DEFAULT 'mecanica';
CREATE INDEX IF NOT EXISTS idx_tenants_segment ON tenants(segment);
```

### 2. Tabela `services` (Catálogo Multi-Tenant de Serviços)
```sql
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    category VARCHAR(100),
    segment VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON services
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON services(tenant_id, is_active);
```

### 3. Tabela `checklist_templates` (Modelos de Inspeção Veicular Prévia)
```sql
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    segment VARCHAR(50) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON checklist_templates
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_checklist_templates_tenant_id ON checklist_templates(tenant_id);
```

### 4. Tabela `tenant_invitations` (Rastreamento de Convites e Onboarding)
```sql
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'owner',
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    email_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON tenant_invitations
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(recipient_email);
```

---

## 💳 Migração 010: Régua de Cobrança, Dunning e Modo Somente Leitura (`010_billing_dunning.up.sql`)

### 1. Colunas de Controle de Inadimplência na Tabela `tenants`
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_dunning_stage VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dunning_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_is_read_only ON tenants(is_read_only);
```

### 2. Tabela `billing_dunning_events` (Trilha de Eventos da Régua de Cobrança)
```sql
CREATE TABLE IF NOT EXISTS billing_dunning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    stage VARCHAR(50) NOT NULL,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    action_taken VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE billing_dunning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_dunning_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON billing_dunning_events
    AS PERMISSIVE
    FOR ALL
    TO public
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

CREATE INDEX IF NOT EXISTS idx_billing_dunning_events_tenant ON billing_dunning_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_dunning_events_invoice ON billing_dunning_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_dunning_events_created ON billing_dunning_events(created_at DESC);
```

---

## 🚗 Migração 011: Clientes e Veículos — Domínio Automotivo (`011_customers_vehicles.up.sql`)

### 1. Tabela `customers` (Clientes da Oficina)
```sql
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20),
    document_type VARCHAR(10) DEFAULT 'cpf',
    phone VARCHAR(30) NOT NULL,
    phone_raw VARCHAR(30),
    email VARCHAR(255),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip_code VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON customers
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_document ON customers(tenant_id, document);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
```

### 2. Tabela `vehicles` (Veículos com Placa Única por Oficina)
```sql
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    plate VARCHAR(10) NOT NULL,
    plate_raw VARCHAR(15),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    size_class VARCHAR(20) NOT NULL DEFAULT 'sedan',
    vin VARCHAR(30),
    current_km INTEGER DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- REGRA FUNDAMENTAL DE SAAS MULTITENANT AUTOMOTIVO:
    -- A unicidade da placa é EXCLUSIVA POR OFICINA (tenant_id, plate).
    -- Duas oficinas distintas podem cadastrar a mesma placa sem qualquer conflito!
    CONSTRAINT uq_vehicles_tenant_plate UNIQUE (tenant_id, plate)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON vehicles
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_plate ON vehicles(tenant_id, plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_model ON vehicles(tenant_id, model);
```

---

## 🚗 Migração 012: Catálogo de Serviços, Preços por Porte e Combos (`012_services_prices_packages.up.sql`)

### 1. Enriquecimento da Tabela `services`
```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 3;
ALTER TABLE services ADD COLUMN IF NOT EXISTS material_consumption_estimate JSONB DEFAULT '{}'::jsonb;
```

### 2. Tabela `service_prices_by_class` (Preços e Tempos por Porte)
```sql
CREATE TABLE IF NOT EXISTS service_prices_by_class (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    size_class VARCHAR(20) NOT NULL, -- 'moto', 'hatch', 'sedan', 'suv', 'pickup', 'esportivo', 'van'
    price_cents INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    warranty_months INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_prices_tenant_service_class UNIQUE (tenant_id, service_id, size_class)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE service_prices_by_class ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prices_by_class FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON service_prices_by_class
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_service_prices_tenant_service ON service_prices_by_class(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_tenant_class ON service_prices_by_class(tenant_id, size_class);
```

### 3. Tabela `packages` (Combos e Pacotes de Serviços)
```sql
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_cents'
    discount_value INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON packages
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_packages_tenant_id ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_tenant_active ON packages(tenant_id, is_active);
```

### 4. Tabela `package_items` (Itens do Combo)
```sql
CREATE TABLE IF NOT EXISTS package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_package_items_package_service UNIQUE (tenant_id, package_id, service_id)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON package_items
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(tenant_id, package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_service_id ON package_items(tenant_id, service_id);
```

---

## 📋 Migração 013: Ordens de Serviço e Máquina de Estados (`013_work_orders_state_machine.up.sql`)

### 1. Tabela `work_orders` (Ordens de Serviço e Orçamentos)
```sql
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    os_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'QUOTE',
    previous_status VARCHAR(30),
    progress INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    final_cents INTEGER NOT NULL DEFAULT 0,
    paid_cents INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    notes TEXT,
    customer_notes TEXT,
    tracking_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Numeração sequencial única POR OFICINA (os_number 1, 2, 3...)
    CONSTRAINT uq_work_orders_tenant_os_number UNIQUE (tenant_id, os_number)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_orders
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_status ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_os_number ON work_orders(tenant_id, os_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_tracking_token ON work_orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);
```

### 2. Tabela `work_order_items` (Itens da Ordem de Serviço)
```sql
CREATE TABLE IF NOT EXISTS work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 0,
    warranty_months INTEGER DEFAULT 3,
    custom_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_order_items
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_work_order_items_tenant_id ON work_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_order_id ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_service_id ON work_order_items(service_id);
```

### 3. Tabela `work_order_events` (Linha do Tempo e Histórico de Transições)
```sql
CREATE TABLE IF NOT EXISTS work_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'STATUS_CHANGE',
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_order_events
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_work_order_events_tenant_id ON work_order_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_order_events_order_id ON work_order_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_events_created_at ON work_order_events(created_at);
```

---

## 💰 Migração 014: Pagamentos, Adiantamentos (Sinal) e Transações Atômicas (`014_payments_deposits.up.sql`)

### 1. Tipos Enumerados e Tabela `payments` (Liquidações da Ordem de Serviço)
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'failed', 'refunded', 'partially_refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_status') THEN
        CREATE TYPE deposit_status AS ENUM ('held', 'applied', 'refunded');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method VARCHAR(50) NOT NULL, -- pix, credit_card, debit_card, cash, bank_transfer, deposit_applied
    status payment_status NOT NULL DEFAULT 'approved',
    installments INTEGER NOT NULL DEFAULT 1 CHECK (installments >= 1),
    card_brand VARCHAR(50),
    transaction_reference VARCHAR(150),
    notes TEXT,
    refunded_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_cents >= 0),
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON payments
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_order ON payments(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
```

### 2. Tabela `deposits` (Sinal e Adiantamentos Retidos)
```sql
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method VARCHAR(50) NOT NULL, -- pix, credit_card, debit_card, cash, bank_transfer
    status deposit_status NOT NULL DEFAULT 'held',
    applied_to_work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    applied_at TIMESTAMPTZ,
    notes TEXT,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON deposits
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_deposits_tenant_id ON deposits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposits_customer_id ON deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_tenant_customer ON deposits(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_order_id ON deposits(work_order_id);
CREATE INDEX IF NOT EXISTS idx_deposits_applied_order ON deposits(applied_to_work_order_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);
```

---

## 📦 Migração 015: Controle de Estoque, Bobinas de Película e Baixa Idempotente (`015_stock_materials_rolls.up.sql`)

### 1. Tabela `materials` (Insumos e Produtos Gerais)
```sql
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'un', -- un, ml, l, m, m2, kg, par
    cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    is_roll BOOLEAN NOT NULL DEFAULT false, -- True para bobinas de PPF, Insulfilm, etc.
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON materials
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_name ON materials(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_category ON materials(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_materials_is_roll ON materials(tenant_id, is_roll);
```

### 2. Tabela `material_rolls` (Bobinas e Rolos de Película: PPF, Insulfilm)
```sql
CREATE TABLE IF NOT EXISTS material_rolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    code VARCHAR(100), -- Identificador interno/código de barras da bobina
    lot_number VARCHAR(100), -- Lote de fabricação para garantia e rastreabilidade
    brand VARCHAR(100), -- Ex: SunTek, 3M, XPEL, STEK
    width_meters NUMERIC(6, 3) NOT NULL DEFAULT 1.520 CHECK (width_meters > 0),
    initial_meters NUMERIC(10, 3) NOT NULL CHECK (initial_meters > 0),
    current_meters NUMERIC(10, 3) NOT NULL CHECK (current_meters >= 0),
    min_alert_meters NUMERIC(10, 3) NOT NULL DEFAULT 3.000 CHECK (min_alert_meters >= 0),
    cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use', 'depleted', 'reserved', 'discarded')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE material_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_rolls FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON material_rolls
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_material_rolls_tenant_id ON material_rolls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_material_id ON material_rolls(material_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_tenant_material ON material_rolls(tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_status ON material_rolls(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_material_rolls_lot ON material_rolls(tenant_id, lot_number);
```

### 3. Tabela `stock_movements` (Histórico Atômico e Imutável de Movimentações)
```sql
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    material_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('entry', 'exit', 'os_consumption', 'waste', 'adjustment')),
    quantity NUMERIC(12, 3) NOT NULL, -- Positivo (entrada/ajuste +) ou Negativo (saída/consumo/perda)
    unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
    total_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cost_cents >= 0),
    previous_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    new_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON stock_movements
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_material ON stock_movements(tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_work_order ON stock_movements(work_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_roll ON stock_movements(material_roll_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
```

### 4. Tabela `work_order_materials` (Alocação de Materiais na OS)
```sql
CREATE TABLE IF NOT EXISTS work_order_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    material_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE work_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_materials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_order_materials
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_work_order_materials_tenant_id ON work_order_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_order_materials_order_id ON work_order_materials(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_materials_material_id ON work_order_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_work_order_materials_roll_id ON work_order_materials(material_roll_id);
```

---

## 📅 Migração 016: Agenda Inteligente por Box e Agendamento Online (`016_bays_appointments.up.sql`)

### 1. Tabela `bays` (Boxes Físicos de Atendimento)
```sql
CREATE TABLE IF NOT EXISTS bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) NOT NULL DEFAULT '#C8F52E',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_bays_tenant_name UNIQUE (tenant_id, name)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE bays FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON bays
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_bays_tenant_id ON bays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bays_tenant_active ON bays(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bays_tenant_order ON bays(tenant_id, order_index);
```

### 2. Tabela `appointments` (Agendamentos e Ocupação por Box)
```sql
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bay_id UUID REFERENCES bays(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show')),
    origin VARCHAR(30) NOT NULL DEFAULT 'INTERNAL' CHECK (origin IN ('INTERNAL', 'ONLINE', 'WHATSAPP')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    vehicle_plate VARCHAR(20),
    vehicle_model VARCHAR(100),
    vehicle_size_class VARCHAR(30),
    service_summary TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_appointments_time_range CHECK (end_time > start_time)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON appointments
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_bay_time ON appointments(tenant_id, bay_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_tech_time ON appointments(tenant_id, technician_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_wo ON appointments(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(tenant_id, start_time);
```

### 3. Enriquecimento da Tabela `work_orders`
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS origin VARCHAR(30) NOT NULL DEFAULT 'INTERNAL';
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_origin ON work_orders(tenant_id, origin);
```

---

## 📋 Migração 017: Laudo de Inspeção Digital (VCR), Checklist e Fotos (`017_inspections_vcr_photos.up.sql`)

### 1. Tabela `inspections` (Laudo VCR e Vistoria)
```sql
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_type VARCHAR(30) NOT NULL DEFAULT 'check_in' CHECK (inspection_type IN ('check_in', 'check_out', 'interim')),
    vehicle_type VARCHAR(30) NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'truck')),
    current_km INTEGER,
    fuel_level VARCHAR(20) DEFAULT '1/2',
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    voice_notes TEXT,
    customer_signature_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    customer_signature_name VARCHAR(255),
    signed_at TIMESTAMPTZ,
    pdf_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    pdf_generated_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'signed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspections
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspections
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_inspections_tenant_id ON inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_wo ON inspections(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_vehicle ON inspections(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_type ON inspections(tenant_id, inspection_type);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(tenant_id, status);
```

### 2. Tabela `inspection_damage_points` (Pontos de Avaria Touch na Silhueta)
```sql
CREATE TABLE IF NOT EXISTS inspection_damage_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    part VARCHAR(50) NOT NULL,
    damage_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    x_percent NUMERIC(5, 2) NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
    y_percent NUMERIC(5, 2) NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
    view VARCHAR(30) NOT NULL DEFAULT 'top' CHECK (view IN ('top', 'front', 'rear', 'left', 'right', 'isometric')),
    photo_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspection_damage_points
ALTER TABLE inspection_damage_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_damage_points FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspection_damage_points
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_damage_points_tenant_id ON inspection_damage_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_damage_points_tenant_inspection ON inspection_damage_points(tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_damage_points_part ON inspection_damage_points(tenant_id, part);
```

### 3. Tabela `inspection_photos` (Fotos Guiadas Antes / Durante / Depois)
```sql
CREATE TABLE IF NOT EXISTS inspection_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    photo_file_id UUID NOT NULL REFERENCES storage_files(id) ON DELETE CASCADE,
    angle VARCHAR(50) NOT NULL,
    phase VARCHAR(30) NOT NULL DEFAULT 'before' CHECK (phase IN ('before', 'during', 'after')),
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspection_photos
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspection_photos
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_inspection_photos_tenant_id ON inspection_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_tenant_inspection ON inspection_photos(tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_phase ON inspection_photos(tenant_id, phase);
```

---

## ⏱️ Migração 018: App do Técnico, Cronômetro Oficial e Fila (`018_technician_timers_execution.up.sql`)

### 1. Alteração na Tabela `work_orders` (Flags de Retrabalho)
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_rework BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rework_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_rework ON work_orders(tenant_id, is_rework);
```

### 2. Tabela `work_order_timers` (Cronômetros Oficiais Calculados no Servidor)
```sql
CREATE TABLE IF NOT EXISTS work_order_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    service_item_id UUID REFERENCES work_order_items(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
    pause_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para work_order_timers
ALTER TABLE work_order_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_timers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_order_timers
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_wo_timers_tenant_id ON work_order_timers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_timers_tenant_wo ON work_order_timers(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_timers_tenant_tech ON work_order_timers(tenant_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_wo_timers_status ON work_order_timers(tenant_id, status);
```

---

## 🛡️ Migração 019: Controle de Qualidade (QA) e Passaporte de Garantia (`019_qa_warranties_passports.up.sql`)

### 1. Tabela `qa_audits` (Auditorias de Qualidade Pós-Serviço)
```sql
CREATE TABLE IF NOT EXISTS qa_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL CHECK (status IN ('approved', 'rejected_rework')),
    score INTEGER CHECK (score BETWEEN 1 AND 5),
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    rework_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para qa_audits
ALTER TABLE qa_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_audits FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON qa_audits
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_qa_audits_tenant_id ON qa_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_audits_tenant_wo ON qa_audits(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_qa_audits_tenant_inspector ON qa_audits(tenant_id, inspector_id);
CREATE INDEX IF NOT EXISTS idx_qa_audits_status ON qa_audits(tenant_id, status);
```

### 2. Tabela `warranties` (Certificados de Garantia e Passaporte Digital do Veículo)
```sql
CREATE TABLE IF NOT EXISTS warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    material_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    material_lot_number VARCHAR(100),
    warranty_months INTEGER NOT NULL DEFAULT 12 CHECK (warranty_months > 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    verification_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    pdf_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para warranties
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON warranties
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_warranties_tenant_id ON warranties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warranties_tenant_wo ON warranties(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_warranties_tenant_cust ON warranties(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_tenant_veh ON warranties(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_warranties_token ON warranties(verification_token);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(tenant_id, status);
```

---

## 📈 Migração 020: Pesquisa NPS, Pós-Venda e Lembretes de Revisão (`020_nps_surveys_reminders.up.sql`)

### 1. Tabela `nps_surveys` (Pesquisas de Satisfação NPS)
```sql
CREATE TABLE IF NOT EXISTS nps_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    score INTEGER CHECK (score BETWEEN 0 AND 10),
    classification VARCHAR(20) CHECK (classification IN ('promoter', 'passive', 'detractor')),
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'expired')),
    sent_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    google_review_clicked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_nps_surveys_tenant_work_order UNIQUE (tenant_id, work_order_id)
);

-- Ativação e Forçamento de RLS Canônico para nps_surveys
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON nps_surveys
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_nps_surveys_tenant_id ON nps_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_tenant_wo ON nps_surveys(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_tenant_cust ON nps_surveys(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_token ON nps_surveys(token);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_status ON nps_surveys(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_classification ON nps_surveys(tenant_id, classification);
```

### 2. Tabela `maintenance_reminders` (Lembretes de Revisão e Manutenção Periódica)
```sql
CREATE TABLE IF NOT EXISTS maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    warranty_id UUID REFERENCES warranties(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    service_name VARCHAR(255) NOT NULL,
    reminder_type VARCHAR(50) NOT NULL DEFAULT 'warranty_check' CHECK (reminder_type IN ('warranty_check', 'maintenance_return', 'seasonal_care')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'canceled', 'completed')),
    sent_at TIMESTAMPTZ,
    message_preview TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para maintenance_reminders
ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_reminders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON maintenance_reminders
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_reminders_tenant_id ON maintenance_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant_wo ON maintenance_reminders(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant_cust ON maintenance_reminders(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant_veh ON maintenance_reminders(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON maintenance_reminders(tenant_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON maintenance_reminders(tenant_id, status);
```

---

## 🚀 Migração 021: Comissões, DRE Gerencial e Ranking de Produtividade (`021_commissions_financial_reports.up.sql`)

### 1. Tabela `commission_rules` (Regras de Comissão por Técnico e Serviço)
```sql
CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    commission_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed_cents')),
    commission_value INTEGER NOT NULL DEFAULT 0 CHECK (commission_value >= 0),
    base_calculation VARCHAR(30) NOT NULL DEFAULT 'gross_service' CHECK (base_calculation IN ('gross_service', 'net_service_minus_material')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para commission_rules
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON commission_rules
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant_id ON commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_tech ON commission_rules(tenant_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_service ON commission_rules(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(tenant_id, is_active);

-- Trigger de updated_at para commission_rules
DROP TRIGGER IF EXISTS trg_commission_rules_updated_at ON commission_rules;
CREATE TRIGGER trg_commission_rules_updated_at
    BEFORE UPDATE ON commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Tabela `commission_entries` (Extrato de Lançamentos de Comissões por OS)
```sql
CREATE TABLE IF NOT EXISTS commission_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    service_item_id UUID REFERENCES work_order_items(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
    gross_amount_cents INTEGER NOT NULL DEFAULT 0,
    deductions_cents INTEGER NOT NULL DEFAULT 0,
    commission_cents INTEGER NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'canceled')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para commission_entries
ALTER TABLE commission_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON commission_entries
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_commission_entries_tenant_id ON commission_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_wo ON commission_entries(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_tech ON commission_entries(tenant_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_status ON commission_entries(tenant_id, status);

-- Trigger de updated_at para commission_entries
DROP TRIGGER IF EXISTS trg_commission_entries_updated_at ON commission_entries;
CREATE TRIGGER trg_commission_entries_updated_at
    BEFORE UPDATE ON commission_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📱 Migração 022: Portal do Cliente Seguro com Desafio OTP (`022_customer_portal_otps.up.sql`)

### 1. Tabela `customer_portal_otps` (Códigos de Desafio OTP para Login Seguro)
Responsável por gerenciar os códigos de acesso temporários de 6 dígitos numéricos do portal do cliente ("Meu Veículo"), com isolamento multitenant, expiração curta (10 minutos), proteção anti-força bruta (máximo de 5 tentativas) e armazenamento de hash seguro:

```sql
CREATE TABLE IF NOT EXISTS customer_portal_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL, -- telefone normalizado E.164 ou e-mail
    otp_hash VARCHAR(255) NOT NULL, -- hash seguro do código de 6 dígitos
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para customer_portal_otps
ALTER TABLE customer_portal_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_otps FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON customer_portal_otps
    AS PERMISSIVE FOR ALL TO public
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

CREATE INDEX IF NOT EXISTS idx_customer_portal_otps_tenant_id ON customer_portal_otps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_otps_identifier ON customer_portal_otps(tenant_id, identifier);
CREATE INDEX IF NOT EXISTS idx_customer_portal_otps_customer ON customer_portal_otps(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_otps_active ON customer_portal_otps(tenant_id, identifier, expires_at) WHERE used_at IS NULL;

-- Trigger de updated_at para customer_portal_otps
DROP TRIGGER IF EXISTS trg_customer_portal_otps_updated_at ON customer_portal_otps;
CREATE TRIGGER trg_customer_portal_otps_updated_at
    BEFORE UPDATE ON customer_portal_otps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📜 Histórico e Esquema Legado (Arquivo para ETL da Fase 4)

O esquema original do **OsSystem** (Supabase single-tenant com tabelas `clientes`, `veiculos`, `ordens_servico`, `estoque_materiais`, `servicos`, `checklist_avarias`, `os_midia`, `pesquisas_nps`) encontra-se arquivado para servir de fonte para os scripts de extração, transformação e carga (ETL) durante a **Fase 4**. O script completo de recriação do esquema legado está preservado em [`docs/legado-ossystem-schema.sql`](file:///d:/Repositorios/CarX/docs/legado-ossystem-schema.sql).
