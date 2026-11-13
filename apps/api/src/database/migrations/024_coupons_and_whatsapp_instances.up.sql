-- ==============================================================================
-- CARX SAAS — MIGRATION 024: CUPONS PROMOCIONAIS E INSTÂNCIAS DE WHATSAPP (UP)
-- ==============================================================================

-- 1. TABELA DE CUPONS PROMOCIONAIS (SUPER ADMIN)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(30) NOT NULL, -- 'free_months', 'promotional_price', 'percentage', 'fixed_amount'
    discount_value INTEGER NOT NULL, -- centavos ou porcentagem (ex: 100 para 100%, 4900 para R$ 49,00)
    duration_months INTEGER, -- duração em meses (ex: 3 para "3 meses de XX"); NULL para perpétuo/único
    max_uses INTEGER, -- limite máximo global de resgates; NULL = ilimitado
    current_uses INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    applicable_plan_slugs JSONB NOT NULL DEFAULT '[]'::jsonb, -- ex: ["essencial", "profissional"]
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_until);

-- Trigger de updated_at para coupons
DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA DE RESGATES DE CUPOM POR OFICINA (COUPON_REDEMPTIONS)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_months INTEGER,
    expires_at TIMESTAMPTZ,
    discount_applied_cents INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_tenant ON coupon_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON coupon_redemptions
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

-- 3. TABELA DE INSTÂNCIAS DE WHATSAPP POR OFICINA (PADRÃO OPERABEAUTY)
CREATE TABLE IF NOT EXISTS tenant_whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED', -- 'DISCONNECTED', 'PAIRING', 'QR_CODE', 'CONNECTED'
    pairing_code VARCHAR(20),
    qr_code_base64 TEXT,
    daily_messages_count INTEGER NOT NULL DEFAULT 0,
    daily_limit INTEGER NOT NULL DEFAULT 300,
    connected_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_whatsapp_instances FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON tenant_whatsapp_instances
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

CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_instances_tenant ON tenant_whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_instances_status ON tenant_whatsapp_instances(status);

-- Trigger de updated_at para tenant_whatsapp_instances
DROP TRIGGER IF EXISTS trg_tenant_whatsapp_instances_updated_at ON tenant_whatsapp_instances;
CREATE TRIGGER trg_tenant_whatsapp_instances_updated_at
    BEFORE UPDATE ON tenant_whatsapp_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

