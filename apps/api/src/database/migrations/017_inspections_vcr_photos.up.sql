-- ==============================================================================
-- CARX SAAS — MIGRATION 017: LAUDO DE INSPEÇÃO DIGITAL (VCR), CHECKLIST E FOTOS (UP)
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE INSPEÇÕES / LAUDOS VCR (INSPECTIONS)
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_type VARCHAR(30) NOT NULL DEFAULT 'check_in' CHECK (inspection_type IN ('check_in', 'check_out', 'interim')),
    vehicle_type VARCHAR(30) NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'truck')),
    current_km INTEGER,
    fuel_level VARCHAR(20) DEFAULT '1/2',
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    voice_notes TEXT,
    customer_signature_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    customer_signature_name VARCHAR(255),
    signed_at TIMESTAMPTZ,
    pdf_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    pdf_generated_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'signed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspections
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspections
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

CREATE INDEX IF NOT EXISTS idx_inspections_tenant_id ON inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_wo ON inspections(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_vehicle ON inspections(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_type ON inspections(tenant_id, inspection_type);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(tenant_id, status);


-- 2. TABELA DE PONTOS DE AVARIA TOCADOS NA SILHUETA DO VEÍCULO (DAMAGE POINTS)
CREATE TABLE IF NOT EXISTS inspection_damage_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    part VARCHAR(50) NOT NULL, -- capo, para_choque_dianteiro, porta_dianteira_esquerda, etc.
    damage_type VARCHAR(50) NOT NULL, -- scratch, dent, crack, paint_chip, repainted, rust, stain, tear
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    x_percent NUMERIC(5, 2) NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
    y_percent NUMERIC(5, 2) NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
    view VARCHAR(30) NOT NULL DEFAULT 'top' CHECK (view IN ('top', 'front', 'rear', 'left', 'right', 'isometric')),
    photo_file_id UUID REFERENCES storage_files(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspection_damage_points
ALTER TABLE inspection_damage_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_damage_points FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspection_damage_points
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

CREATE INDEX IF NOT EXISTS idx_damage_points_tenant_id ON inspection_damage_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_damage_points_tenant_inspection ON inspection_damage_points(tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_damage_points_part ON inspection_damage_points(tenant_id, part);


-- 3. TABELA DE FOTOS GUIADAS ANTES / DURANTE / DEPOIS (INSPECTION PHOTOS)
CREATE TABLE IF NOT EXISTS inspection_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    photo_file_id UUID NOT NULL REFERENCES storage_files(id) ON DELETE CASCADE,
    angle VARCHAR(50) NOT NULL, -- front, rear, front_left, front_right, rear_left, rear_right, roof, interior, dashboard, engine, odometer
    phase VARCHAR(30) NOT NULL DEFAULT 'before' CHECK (phase IN ('before', 'during', 'after')),
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para inspection_photos
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON inspection_photos
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

CREATE INDEX IF NOT EXISTS idx_inspection_photos_tenant_id ON inspection_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_tenant_inspection ON inspection_photos(tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_phase ON inspection_photos(tenant_id, phase);

