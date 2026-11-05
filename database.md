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

## 📜 Histórico e Esquema Legado (Arquivo para ETL da Fase 4)

O esquema original do **OsSystem** (Supabase single-tenant com tabelas `clientes`, `veiculos`, `ordens_servico`, `estoque_materiais`, `servicos`, `checklist_avarias`, `os_midia`, `pesquisas_nps`) encontra-se arquivado para servir de fonte para os scripts de extração, transformação e carga (ETL) durante a **Fase 4**. O script completo de recriação do esquema legado está preservado em [`docs/legado-ossystem-schema.sql`](file:///d:/Repositorios/CarX/docs/legado-ossystem-schema.sql).
