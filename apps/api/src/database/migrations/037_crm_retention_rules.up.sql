-- ==============================================================================
-- CARX SAAS — MIGRATION 037: CRM DE PÓS-VENDA, GARANTIAS & RETENÇÃO ATIVA (UP)
-- ==============================================================================

-- 1. TABELA DE REGRAS DE RETENÇÃO E PÓS-VENDA (CRM_RETENTION_RULES)
CREATE TABLE IF NOT EXISTS crm_retention_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    service_category VARCHAR(100) NOT NULL DEFAULT 'geral', -- 'ppf', 'vitrificacao', 'higienizacao', 'insulfilm', 'polimento', 'geral'
    trigger_type VARCHAR(50) NOT NULL, -- 'warranty_revision', 'service_interval', 'customer_inactivity'
    interval_days INTEGER NOT NULL DEFAULT 180 CHECK (interval_days > 0),
    channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms')),
    message_template TEXT NOT NULL,
    discount_type VARCHAR(30) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_service')),
    discount_value INTEGER DEFAULT 10 CHECK (discount_value >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para crm_retention_rules
ALTER TABLE crm_retention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_retention_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON crm_retention_rules
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

CREATE INDEX IF NOT EXISTS idx_crm_retention_rules_tenant ON crm_retention_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_retention_rules_trigger ON crm_retention_rules(tenant_id, trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_retention_rules_category ON crm_retention_rules(tenant_id, service_category);

DROP TRIGGER IF EXISTS trg_crm_retention_rules_updated_at ON crm_retention_rules;
CREATE TRIGGER trg_crm_retention_rules_updated_at
    BEFORE UPDATE ON crm_retention_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA DE CUPONS DINÂMICOS DE CLIENTES DO TENANT (TENANT_CUSTOMER_COUPONS)
CREATE TABLE IF NOT EXISTS tenant_customer_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(30) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value INTEGER NOT NULL CHECK (discount_value > 0),
    min_service_value_cents INTEGER NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    times_used INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_tenant_customer_coupons_code UNIQUE (tenant_id, code)
);

-- Ativação e Forçamento de RLS Canônico para tenant_customer_coupons
ALTER TABLE tenant_customer_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_customer_coupons FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON tenant_customer_coupons
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

CREATE INDEX IF NOT EXISTS idx_tenant_coupons_tenant_code ON tenant_customer_coupons(tenant_id, UPPER(code));
CREATE INDEX IF NOT EXISTS idx_tenant_coupons_customer ON tenant_customer_coupons(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_tenant_coupons_status ON tenant_customer_coupons(tenant_id, status, valid_until);

DROP TRIGGER IF EXISTS trg_tenant_customer_coupons_updated_at ON tenant_customer_coupons;
CREATE TRIGGER trg_tenant_customer_coupons_updated_at
    BEFORE UPDATE ON tenant_customer_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. TABELA DE CONTATOS E HISTÓRICO DE RETENÇÃO (CRM_RETENTION_CONTACTS)
CREATE TABLE IF NOT EXISTS crm_retention_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES crm_retention_rules(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    warranty_id UUID REFERENCES warranties(id) ON DELETE SET NULL,
    coupon_id UUID REFERENCES tenant_customer_coupons(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50),
    channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms')),
    destination VARCHAR(100) NOT NULL,
    message_content TEXT NOT NULL,
    whatsapp_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'contacted', 'scheduled', 'converted', 'ignored')),
    converted_work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,
    conversion_revenue_cents INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para crm_retention_contacts
ALTER TABLE crm_retention_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_retention_contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON crm_retention_contacts
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

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_retention_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer ON crm_retention_contacts(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_retention_contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_at ON crm_retention_contacts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_rule ON crm_retention_contacts(tenant_id, rule_id);

DROP TRIGGER IF EXISTS trg_crm_retention_contacts_updated_at ON crm_retention_contacts;
CREATE TRIGGER trg_crm_retention_contacts_updated_at
    BEFORE UPDATE ON crm_retention_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

