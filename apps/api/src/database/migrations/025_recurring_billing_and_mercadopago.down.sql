-- ROLLBACK MIGRATION 025
DROP TABLE IF EXISTS platform_billing_settings CASCADE;
DROP INDEX IF EXISTS idx_invoices_gateway_transaction_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS expires_at;
ALTER TABLE invoices DROP COLUMN IF EXISTS gateway_invoice_url;
ALTER TABLE invoices DROP COLUMN IF EXISTS gateway_transaction_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS gateway_provider;
ALTER TABLE invoices DROP COLUMN IF EXISTS pix_qr;
ALTER TABLE invoices DROP COLUMN IF EXISTS pix_code;

