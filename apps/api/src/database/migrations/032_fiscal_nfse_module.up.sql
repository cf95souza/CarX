-- ==============================================================================
-- CARX SAAS — MIGRATION 032: MÓDULO FISCAL (NFS-E AUTOMÁTICA) (UP)
-- ==============================================================================

-- 1. TABELA DE CONFIGURAÇÕES FISCAIS DO TENANT (CERTIFICADO A1, CNAE, ISS)
CREATE TABLE IF NOT EXISTS tenant_fiscal_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    provider VARCHAR(50) NOT NULL DEFAULT 'focus_nfe',
    api_token_encrypted TEXT,
    certificate_pfx_base64_encrypted TEXT,
    certificate_password_encrypted TEXT,
    certificate_expires_at TIMESTAMPTZ,
    company_legal_name VARCHAR(255),
    company_cnpj VARCHAR(20),
    municipal_inscription VARCHAR(50),
    tax_regime VARCHAR(30) NOT NULL DEFAULT 'simples_nacional',
    special_tax_regime VARCHAR(30),
    default_service_code VARCHAR(30) NOT NULL DEFAULT '14.01',
    cnae_code VARCHAR(30) NOT NULL DEFAULT '4520-0/05',
    default_iss_rate_basis_points INTEGER NOT NULL DEFAULT 200, -- 200 = 2.00%
    iss_retention_default BOOLEAN NOT NULL DEFAULT false,
    auto_issue_on_delivery BOOLEAN NOT NULL DEFAULT false,
    auto_issue_on_payment BOOLEAN NOT NULL DEFAULT false,
    send_email_to_customer BOOLEAN NOT NULL DEFAULT true,
    last_rps_number INTEGER NOT NULL DEFAULT 0,
    rps_series VARCHAR(10) NOT NULL DEFAULT '1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para tenant_fiscal_settings
ALTER TABLE tenant_fiscal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_fiscal_settings FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenant_fiscal_settings' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON tenant_fiscal_settings
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

-- 2. TABELA DE NOTAS FISCAIS DE SERVIÇO (NFS-E)
CREATE TABLE IF NOT EXISTS fiscal_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    provider VARCHAR(50) NOT NULL DEFAULT 'focus_nfe',
    provider_invoice_id VARCHAR(100),
    rps_number INTEGER NOT NULL,
    rps_series VARCHAR(10) NOT NULL DEFAULT '1',
    invoice_number VARCHAR(50),
    verification_code VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, processing, authorized, error, cancelled
    gross_amount_cents INTEGER NOT NULL,
    deductions_cents INTEGER NOT NULL DEFAULT 0,
    net_amount_cents INTEGER NOT NULL,
    iss_rate_basis_points INTEGER NOT NULL DEFAULT 200,
    iss_amount_cents INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    service_code VARCHAR(30) NOT NULL DEFAULT '14.01',
    cnae_code VARCHAR(30) NOT NULL DEFAULT '4520-0/05',
    error_message TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para fiscal_invoices
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_invoices FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fiscal_invoices' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON fiscal_invoices
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

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_tenant_wo 
ON fiscal_invoices (tenant_id, work_order_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_status 
ON fiscal_invoices (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_rps 
ON fiscal_invoices (tenant_id, rps_number, rps_series);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_provider_id 
ON fiscal_invoices (provider, provider_invoice_id);

-- 3. HABILITAR A FEATURE 'nfse' NO PLANO PROFISSIONAL
UPDATE plans 
SET features = features || '["nfse"]'::jsonb
WHERE slug = 'profissional' AND NOT (features @> '["nfse"]'::jsonb);

