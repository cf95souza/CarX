-- ==============================================================================
-- CARX SAAS — MIGRATION 016: AGENDA INTELIGENTE POR BOX E AGENDAMENTO (UP)
-- ==============================================================================

-- 1. TABELA DE BOXES FÍSICOS DE ATENDIMENTO (BAYS)
CREATE TABLE IF NOT EXISTS bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) NOT NULL DEFAULT '#C8F52E',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_bays_tenant_name UNIQUE (tenant_id, name)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE bays FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON bays
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

CREATE INDEX IF NOT EXISTS idx_bays_tenant_id ON bays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bays_tenant_active ON bays(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bays_tenant_order ON bays(tenant_id, order_index);


-- 2. ENRIQUECIMENTO DA TABELA DE ORDENS DE SERVIÇO COM ORIGEM
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS origin VARCHAR(30) NOT NULL DEFAULT 'INTERNAL';
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_origin ON work_orders(tenant_id, origin);


-- 3. TABELA DE AGENDAMENTOS (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bay_id UUID REFERENCES bays(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show')),
    origin VARCHAR(30) NOT NULL DEFAULT 'INTERNAL' CHECK (origin IN ('INTERNAL', 'ONLINE', 'WHATSAPP')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    vehicle_plate VARCHAR(20),
    vehicle_model VARCHAR(100),
    vehicle_size_class VARCHAR(30),
    service_summary TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_appointments_time_range CHECK (end_time > start_time)
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON appointments
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

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_bay_time ON appointments(tenant_id, bay_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_tech_time ON appointments(tenant_id, technician_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_wo ON appointments(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(tenant_id, start_time);

