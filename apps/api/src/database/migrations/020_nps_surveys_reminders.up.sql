-- ==============================================================================
-- CARX SAAS — MIGRATION 020: PESQUISA NPS, PÓS-VENDA E LEMBRETES DE REVISÃO (UP)
-- ==============================================================================

-- 1. TABELA DE PESQUISAS DE SATISFAÇÃO (NPS_SURVEYS)
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

-- Trigger de updated_at para nps_surveys
DROP TRIGGER IF EXISTS trg_nps_surveys_updated_at ON nps_surveys;
CREATE TRIGGER trg_nps_surveys_updated_at
    BEFORE UPDATE ON nps_surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA DE LEMBRETES DE REVISÃO E MANUTENÇÃO PERIÓDICA (MAINTENANCE_REMINDERS)
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

-- Trigger de updated_at para maintenance_reminders
DROP TRIGGER IF EXISTS trg_reminders_updated_at ON maintenance_reminders;
CREATE TRIGGER trg_reminders_updated_at
    BEFORE UPDATE ON maintenance_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
