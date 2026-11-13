-- ==============================================================================
-- CARX SAAS — MIGRATION 029: PASSAPORTE DIGITAL DO VEÍCULO E TRANSFERÊNCIA DE CUSTÓDIA (UP)
-- ==============================================================================

-- 1. ADICIONA CAMPOS DE TRANSFERIBILIDADE NA TABELA WARRANTIES
ALTER TABLE warranties
    ADD COLUMN IF NOT EXISTS is_transferable BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS transferred_from_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 2. TABELA DE HISTÓRICO DE TRANSFERÊNCIAS DE GARANTIA E CUSTÓDIA DO VEÍCULO (WARRANTY_TRANSFERS)
CREATE TABLE IF NOT EXISTS warranty_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    previous_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    previous_customer_name VARCHAR(255),
    new_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    new_customer_name VARCHAR(255) NOT NULL,
    new_customer_phone VARCHAR(50) NOT NULL,
    new_customer_email VARCHAR(255),
    odometer_km INTEGER,
    reason TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para warranty_transfers
ALTER TABLE warranty_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_transfers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON warranty_transfers
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

CREATE INDEX IF NOT EXISTS idx_warranty_transfers_tenant_id ON warranty_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warranty_transfers_warranty_id ON warranty_transfers(tenant_id, warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_transfers_vehicle_id ON warranty_transfers(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_warranty_transfers_new_customer ON warranty_transfers(tenant_id, new_customer_id);

