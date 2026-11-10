-- ==============================================================================
-- CARX SAAS — MIGRATION 022: PORTAL DO CLIENTE SEGURO COM DESAFIO OTP (UP)
-- ==============================================================================

-- 1. TABELA DE CÓDIGOS OTP DO PORTAL DO CLIENTE (CUSTOMER_PORTAL_OTPS)
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

