-- ==============================================================================
-- CARX SAAS — MIGRATION 021: COMISSÕES, DRE E RANKING DE TÉCNICOS (UP)
-- ==============================================================================

-- 1. TABELA DE REGRAS DE COMISSÃO (COMMISSION_RULES)
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

-- 2. TABELA DE EXTRATO DE COMISSÕES POR OS (COMMISSION_ENTRIES)
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

