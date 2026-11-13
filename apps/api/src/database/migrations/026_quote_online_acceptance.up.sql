-- ==============================================================================
-- CARX SAAS — MIGRATION 026: ORÇAMENTO DIGITAL COM ACEITE ONLINE & SINAL PIX (T6.1)
-- ==============================================================================

-- 1. Campos de Aceite Legal e Sinal Pix na tabela work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(50);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_user_agent TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_signature_name VARCHAR(150);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit_required_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit_pix_code TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit_pix_qr_base64 TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS public_notes TEXT;

-- Índice para busca instantânea e segura por tracking_token público
CREATE INDEX IF NOT EXISTS idx_work_orders_tracking_token ON work_orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_work_orders_accepted_at ON work_orders(tenant_id, accepted_at);

