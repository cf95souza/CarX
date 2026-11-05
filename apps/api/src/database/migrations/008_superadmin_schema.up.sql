-- ==============================================================================
-- CARX SAAS — MIGRATION 008: SUPER ADMIN, CONTRATOS, LEADS E IMPERSONAÇÃO (UP)
-- ==============================================================================

-- 1. TABELA DE USUÁRIOS SUPERADMINISTRADORES (SEPARADA DA TABELA USERS DOS TENANTS)
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

-- 2. TABELA DE CONTRATOS E LICENÇAS DOS TENANTS
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
DROP POLICY IF EXISTS tenant_isolation_policy ON contracts;
CREATE POLICY tenant_isolation_policy ON contracts
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

-- 3. TABELA DE EVENTOS DE CONTRATO (HISTÓRICO IMUTÁVEL DE ALTERAÇÕES)
CREATE TABLE IF NOT EXISTS contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ADICIONAR RELACIONAMENTO DE CONTRATO NA TABELA INVOICES SE NÃO EXISTIR
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- 5. ADICIONAR COLUNA superadmin_user_id EM audit_logs PARA AÇÕES ADMINISTRATIVAS GLOBAIS
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS superadmin_user_id UUID REFERENCES superadmin_users(id) ON DELETE SET NULL;

-- 6. TABELA DE LOG DE IMPERSONAÇÃO (AUDITORIA RIGOROSA DE ACESSO DO SUPERADMIN ÀS LOJAS)
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

-- Ativar e Forçar RLS na tabela impersonation_log (possui tenant_id)
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON impersonation_log;
CREATE POLICY tenant_isolation_policy ON impersonation_log
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

-- 6. TABELA DE LEADS (LANDING PAGE E PROSPECÇÃO COM CONVERSÃO EM OFICINA)
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

-- 7. SEED DO PRIMEIRO SUPERADMINISTRADOR CANÔNICO DA PLATAFORMA
-- Senha padrão inicial: Admin@CarX2026!
INSERT INTO superadmin_users (name, email, password_hash, is_active)
VALUES (
    'Super Admin CarX',
    'admin@carx.com.br',
    '$2b$10$pNxpP5DdNOL1/zLcUDtC7O0BdsgPK4zG8qIN9zgMbLHyInWkGbez6',
    true
)
ON CONFLICT (email) DO NOTHING;
