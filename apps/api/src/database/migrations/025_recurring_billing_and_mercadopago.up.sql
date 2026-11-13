-- ==============================================================================
-- MIGRATION 025: COBRANÇA RECORRENTE AUTOMÁTICA SAAS E MERCADO PAGO (T5.2)
-- ==============================================================================

-- 1. Campos de Gateway e PIX na tabela de Faturas do SaaS (invoices)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pix_code TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pix_qr TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(50) DEFAULT 'mercadopago';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gateway_invoice_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_gateway_transaction_id ON invoices(gateway_transaction_id);

-- 2. Tabela Global de Configurações de Faturamento da Plataforma (Super Admin)
CREATE TABLE IF NOT EXISTS platform_billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50) NOT NULL DEFAULT 'mercadopago',
    mercadopago_access_token TEXT,
    mercadopago_public_key TEXT,
    mercadopago_webhook_secret TEXT,
    pix_key VARCHAR(100),
    pix_key_type VARCHAR(50),
    sandbox_mode BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir registro padrão se não existir
INSERT INTO platform_billing_settings (gateway, sandbox_mode)
SELECT 'mercadopago', true
WHERE NOT EXISTS (SELECT 1 FROM platform_billing_settings);

