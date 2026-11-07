-- ==============================================================================
-- CARX SAAS — MIGRATION 019: CONTROLE DE QUALIDADE (QA) E PASSAPORTE DE GARANTIA (UP)
-- ==============================================================================

-- 1. TABELA DE AUDITORIAS DE QUALIDADE (QA_AUDITS)
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

-- Trigger de updated_at para qa_audits
DROP TRIGGER IF EXISTS trg_qa_audits_updated_at ON qa_audits;
CREATE TRIGGER trg_qa_audits_updated_at
    BEFORE UPDATE ON qa_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA DE CERTIFICADOS DE GARANTIA E PASSAPORTE DIGITAL (WARRANTIES)
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

-- Trigger de updated_at para warranties
DROP TRIGGER IF EXISTS trg_warranties_updated_at ON warranties;
CREATE TRIGGER trg_warranties_updated_at
    BEFORE UPDATE ON warranties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

