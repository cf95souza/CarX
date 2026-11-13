-- ==============================================================================
-- CARX SAAS — MIGRATION 034: PAINEL CORPORATIVO DE REDES E FRANQUIAS (MULTIUNIDADE) (UP)
-- ==============================================================================

-- 1. VINCULAÇÃO DE RECURSOS OPERACIONAIS A UNIDADES / FILIAIS FÍSICAS
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_unit ON work_orders(tenant_id, unit_id);

ALTER TABLE bays ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bays_tenant_unit ON bays(tenant_id, unit_id);

ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_materials_tenant_unit ON materials(tenant_id, unit_id);

ALTER TABLE material_rolls ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_material_rolls_tenant_unit ON material_rolls(tenant_id, unit_id);

-- 2. TABELA DE TRANSFERÊNCIAS DE INSUMOS E BOBINAS ENTRE FILIAIS (LOGÍSTICA INTER-LOJAS)
CREATE TABLE IF NOT EXISTS unit_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('material', 'roll')),
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'canceled')),
    notes TEXT,
    transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE unit_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_transfers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON unit_transfers
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

CREATE INDEX IF NOT EXISTS idx_unit_transfers_tenant ON unit_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_transfers_from_unit ON unit_transfers(tenant_id, from_unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_transfers_to_unit ON unit_transfers(tenant_id, to_unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_transfers_created_at ON unit_transfers(tenant_id, created_at DESC);

