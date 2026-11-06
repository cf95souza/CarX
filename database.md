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

## 📜 Histórico e Esquema Legado (Arquivo para ETL da Fase 4)

O esquema original do **OsSystem** (Supabase single-tenant com tabelas `clientes`, `veiculos`, `ordens_servico`, `estoque_materiais`, `servicos`, `checklist_avarias`, `os_midia`, `pesquisas_nps`) encontra-se arquivado para servir de fonte para os scripts de extração, transformação e carga (ETL) durante a **Fase 4**. O script completo de recriação do esquema legado está preservado em [`docs/legado-ossystem-schema.sql`](file:///d:/Repositorios/CarX/docs/legado-ossystem-schema.sql).
