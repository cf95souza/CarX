-- ==============================================================================
-- CARX SAAS — MIGRATION 006: SUBDOMÍNIO POR LOJA E WHITE LABEL REAL (UP)
-- ==============================================================================

-- 1. CRIAR TABELA DE IDENTIDADE VISUAL E BRANDING POR OFICINA
CREATE TABLE IF NOT EXISTS tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    trade_name VARCHAR(255),
    tagline VARCHAR(255),
    logo_url TEXT,
    logo_icon_url TEXT,
    cover_url TEXT,
    primary_color VARCHAR(30) NOT NULL DEFAULT '#E63946',
    secondary_color VARCHAR(30) NOT NULL DEFAULT '#1D3557',
    accent_color VARCHAR(30) NOT NULL DEFAULT '#457B9D',
    app_title VARCHAR(255),
    app_short_name VARCHAR(50),
    description TEXT,
    whatsapp_phone VARCHAR(30),
    social_instagram VARCHAR(100),
    social_facebook VARCHAR(100),
    website_url VARCHAR(255),
    receipt_footer_notes TEXT,
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'system',
    custom_css TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE TRIGGER trg_tenant_branding_updated_at
    BEFORE UPDATE ON tenant_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. HABILITAR E FORÇAR ROW LEVEL SECURITY (RLS)
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding FORCE ROW LEVEL SECURITY;

-- 4. POLÍTICA CANÔNICA DE ISOLAMENTO RIGOROSO DE TENANT (tenant_isolation_policy)
DROP POLICY IF EXISTS tenant_branding_isolation_policy ON tenant_branding;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_branding;

CREATE POLICY tenant_isolation_policy ON tenant_branding
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

-- 5. PERMISSÕES PARA O USUÁRIO DE APLICAÇÃO (carx_app)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenant_branding TO carx_app;

-- 6. TRIGGER PARA CRIAR REGISTRO PADRÃO DE BRANDING NA CRIAÇÃO DE QUALQUER TENANT
CREATE OR REPLACE FUNCTION trg_fn_auto_create_tenant_branding()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_branding (
        tenant_id,
        trade_name,
        app_title,
        app_short_name
    ) VALUES (
        NEW.id,
        NEW.trade_name,
        NEW.trade_name,
        SUBSTRING(NEW.trade_name FROM 1 FOR 30)
    )
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_auto_create_branding
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_auto_create_tenant_branding();

-- 7. BACKFILL DE BRANDING PARA TENANTS EXISTENTES
INSERT INTO tenant_branding (tenant_id, trade_name, app_title, app_short_name)
SELECT id, trade_name, trade_name, SUBSTRING(trade_name FROM 1 FOR 30)
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

