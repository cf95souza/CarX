-- ==============================================================================
-- CARX SAAS — MIGRATION 018: APP DO TÉCNICO, CRONÔMETRO OFICIAL E FILA (UP)
-- ==============================================================================

-- 1. ADICIONA FLAGS DE RETRABALHO NA TABELA DE ORDENS DE SERVIÇO
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_rework BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rework_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_rework ON work_orders(tenant_id, is_rework);

-- 2. TABELA DE CRONÔMETROS OFICIAIS CALCULADOS NO SERVIDOR (WORK_ORDER_TIMERS)
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

