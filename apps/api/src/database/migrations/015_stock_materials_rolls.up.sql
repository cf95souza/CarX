-- ==============================================================================
-- CARX SAAS — MIGRATION 015: CONTROLE DE ESTOQUE, CONSUMO POR OS E BOBINAS (UP)
-- ==============================================================================

-- 1. TABELA DE MATERIAIS / PRODUTOS / CONSUMÍVEIS
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'un', -- un, ml, l, m, m2, kg, par
    cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    is_roll BOOLEAN NOT NULL DEFAULT false, -- True para bobinas de PPF, Insulfilm, etc.
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON materials
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

CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_name ON materials(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_category ON materials(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_materials_is_roll ON materials(tenant_id, is_roll);


-- 2. TABELA DE BOBINAS / ROLOS DE PELÍCULA (PPF, INSULFILM)
CREATE TABLE IF NOT EXISTS material_rolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    code VARCHAR(100), -- Identificador interno/código de barras da bobina
    lot_number VARCHAR(100), -- Lote de fabricação para garantia e rastreabilidade
    brand VARCHAR(100), -- Ex: SunTek, 3M, XPEL, STEK
    width_meters NUMERIC(6, 3) NOT NULL DEFAULT 1.520 CHECK (width_meters > 0),
    initial_meters NUMERIC(10, 3) NOT NULL CHECK (initial_meters > 0),
    current_meters NUMERIC(10, 3) NOT NULL CHECK (current_meters >= 0),
    min_alert_meters NUMERIC(10, 3) NOT NULL DEFAULT 3.000 CHECK (min_alert_meters >= 0),
    cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use', 'depleted', 'reserved', 'discarded')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE material_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_rolls FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON material_rolls
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

CREATE INDEX IF NOT EXISTS idx_material_rolls_tenant_id ON material_rolls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_material_id ON material_rolls(material_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_tenant_material ON material_rolls(tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_material_rolls_status ON material_rolls(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_material_rolls_lot ON material_rolls(tenant_id, lot_number);


-- 3. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (HISTÓRICO ATÔMICO E IMUTÁVEL)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    material_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('entry', 'exit', 'os_consumption', 'waste', 'adjustment')),
    quantity NUMERIC(12, 3) NOT NULL, -- Positivo (entrada/ajuste +) ou Negativo (saída/consumo/perda)
    unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
    total_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cost_cents >= 0),
    previous_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    new_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON stock_movements
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_material ON stock_movements(tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_work_order ON stock_movements(work_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_roll ON stock_movements(material_roll_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);


-- 4. TABELA DE ALOCAÇÃO DE MATERIAIS NA ORDEM DE SERVIÇO
CREATE TABLE IF NOT EXISTS work_order_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    material_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE work_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_materials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON work_order_materials
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

CREATE INDEX IF NOT EXISTS idx_wo_materials_tenant_id ON work_order_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_materials_work_order ON work_order_materials(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_materials_material ON work_order_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_wo_materials_consumed ON work_order_materials(tenant_id, is_consumed);

