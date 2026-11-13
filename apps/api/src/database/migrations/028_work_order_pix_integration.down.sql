-- ==============================================================================
-- CARX SAAS — MIGRATION 028: PIX INTEGRADO PARA ORDENS DE SERVIÇO (DOWN)
-- ==============================================================================

DROP INDEX IF EXISTS idx_work_orders_pix_last_txid;
ALTER TABLE work_orders DROP COLUMN IF EXISTS pix_last_txid;
DROP INDEX IF EXISTS idx_payments_transaction_reference;

