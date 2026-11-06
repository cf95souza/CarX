-- ==============================================================================
-- CARX SAAS — MIGRATION 010: RÉGUA DE COBRANÇA, DUNNING E MODO SOMENTE LEITURA (UP)
-- ==============================================================================

-- 1. ADICIONAR CAMPOS DE CONTROLE DE INADIMPLÊNCIA E MODO SOMENTE LEITURA EM TENANTS
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_dunning_stage VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dunning_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_is_read_only ON tenants(is_read_only);

-- 2. TABELA DE EVENTOS DA RÉGUA DE COBRANÇA (HISTÓRICO IMUTÁVEL DE DUNNING)
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

-- Ativar e Forçar RLS Canônico na tabela billing_dunning_events
ALTER TABLE billing_dunning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_dunning_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON billing_dunning_events;
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
