-- ==============================================================================
-- CARX SAAS — MIGRATION 012: CATÁLOGO, PREÇOS POR PORTE E COMBOS (UP)
-- ==============================================================================

-- 1. ENRIQUECER TABELA SERVICES (GARANTIA E ESTIMATIVA DE INSUMOS)
ALTER TABLE services ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 3;
ALTER TABLE services ADD COLUMN IF NOT EXISTS material_consumption_estimate JSONB DEFAULT '{}'::jsonb;

-- 2. TABELA DE PREÇOS E TEMPOS ESPECÍFICOS POR PORTE DE VEÍCULO
CREATE TABLE IF NOT EXISTS service_prices_by_class (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    size_class VARCHAR(20) NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    warranty_months INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_prices_tenant_service_class UNIQUE (tenant_id, service_id, size_class)
);

-- Ativar e Forçar RLS em service_prices_by_class
ALTER TABLE service_prices_by_class ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prices_by_class FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON service_prices_by_class;
CREATE POLICY tenant_isolation_policy ON service_prices_by_class
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

CREATE INDEX IF NOT EXISTS idx_service_prices_tenant_service ON service_prices_by_class(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_tenant_class ON service_prices_by_class(tenant_id, size_class);

-- Trigger de updated_at para service_prices_by_class
DROP TRIGGER IF EXISTS trg_service_prices_updated_at ON service_prices_by_class;
CREATE TRIGGER trg_service_prices_updated_at
    BEFORE UPDATE ON service_prices_by_class
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. TABELA DE PACOTES E COMBOS DE SERVIÇOS
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_cents'
    discount_value INTEGER NOT NULL DEFAULT 0, -- percentual (ex: 15 para 15%) ou centavos (ex: 5000 para R$ 50)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar e Forçar RLS em packages
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON packages;
CREATE POLICY tenant_isolation_policy ON packages
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

CREATE INDEX IF NOT EXISTS idx_packages_tenant_id ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_tenant_active ON packages(tenant_id, is_active);

-- Trigger de updated_at para packages
DROP TRIGGER IF EXISTS trg_packages_updated_at ON packages;
CREATE TRIGGER trg_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. TABELA DE ITENS DO PACOTE / COMBO
CREATE TABLE IF NOT EXISTS package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_package_items_package_service UNIQUE (tenant_id, package_id, service_id)
);

-- Ativar e Forçar RLS em package_items
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON package_items;
CREATE POLICY tenant_isolation_policy ON package_items
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

CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(tenant_id, package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_service_id ON package_items(tenant_id, service_id);
