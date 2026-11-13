-- ==============================================================================
-- CARX SAAS — MIGRATION 026: ORÇAMENTO DIGITAL COM ACEITE ONLINE (DOWN / ROLLBACK)
-- ==============================================================================

DROP INDEX IF EXISTS idx_work_orders_accepted_at;
DROP INDEX IF EXISTS idx_work_orders_tracking_token;

ALTER TABLE work_orders DROP COLUMN IF EXISTS public_notes;
ALTER TABLE work_orders DROP COLUMN IF EXISTS deposit_paid_at;
ALTER TABLE work_orders DROP COLUMN IF EXISTS deposit_pix_qr_base64;
ALTER TABLE work_orders DROP COLUMN IF EXISTS deposit_pix_code;
ALTER TABLE work_orders DROP COLUMN IF EXISTS deposit_required_cents;
ALTER TABLE work_orders DROP COLUMN IF EXISTS accepted_signature_name;
ALTER TABLE work_orders DROP COLUMN IF EXISTS accepted_user_agent;
ALTER TABLE work_orders DROP COLUMN IF EXISTS accepted_ip;
ALTER TABLE work_orders DROP COLUMN IF EXISTS accepted_at;

