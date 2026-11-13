-- ==============================================================================
-- CARX SAAS — MIGRATION 028: PIX INTEGRADO PARA ORDENS DE SERVIÇO (T6.3)
-- ==============================================================================

-- 1. Índice de alta performance para busca e conciliação atômica por txid / transaction_reference
CREATE INDEX IF NOT EXISTS idx_payments_transaction_reference ON payments(transaction_reference) WHERE transaction_reference IS NOT NULL;

-- 2. Coluna para rastrear o último identificador Pix gerado na OS
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS pix_last_txid VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_work_orders_pix_last_txid ON work_orders(pix_last_txid) WHERE pix_last_txid IS NOT NULL;

