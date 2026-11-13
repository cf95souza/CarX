-- ==============================================================================
-- CARX SAAS — MIGRATION 031: MINI-SITE INSTITUCIONAL, PORTFÓLIO E LEADS (UP)
-- ==============================================================================

-- 1. CONFIGURAÇÕES DO MINI-SITE NO BRANDING DA OFICINA
ALTER TABLE tenant_branding 
ADD COLUMN IF NOT EXISTS minisite_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS minisite_headline VARCHAR(255),
ADD COLUMN IF NOT EXISTS minisite_about TEXT,
ADD COLUMN IF NOT EXISTS minisite_address TEXT,
ADD COLUMN IF NOT EXISTS minisite_business_hours JSONB DEFAULT '{"weekdays": "08:00 às 18:00", "saturday": "08:00 às 12:00", "sunday": "Fechado"}'::jsonb,
ADD COLUMN IF NOT EXISTS minisite_features JSONB DEFAULT '["Garantia Certificada", "Profissionais Treinados", "Produtos Nobres", "Atendimento VIP"]'::jsonb;

-- 2. TABELA DE ITENS DE PORTFÓLIO (FOTOS ANTES & DEPOIS / TRABALHOS RECENTES)
CREATE TABLE IF NOT EXISTS minisite_portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Geral',
    before_image_url TEXT,
    after_image_url TEXT NOT NULL,
    description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para minisite_portfolio_items
ALTER TABLE minisite_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE minisite_portfolio_items FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'minisite_portfolio_items' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON minisite_portfolio_items
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
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_minisite_portfolio_tenant_order 
ON minisite_portfolio_items (tenant_id, display_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_minisite_portfolio_category 
ON minisite_portfolio_items (tenant_id, category);

-- 3. TABELA DE LEADS E SOLICITAÇÕES DE ORÇAMENTO RECEBIDAS PELO MINI-SITE
CREATE TABLE IF NOT EXISTS minisite_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vehicle_model VARCHAR(100),
    service_interest VARCHAR(255),
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para minisite_leads
ALTER TABLE minisite_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE minisite_leads FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'minisite_leads' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON minisite_leads
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
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_minisite_leads_tenant_status 
ON minisite_leads (tenant_id, status, created_at DESC);

