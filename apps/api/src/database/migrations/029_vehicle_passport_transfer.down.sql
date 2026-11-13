-- ==============================================================================
-- CARX SAAS — MIGRATION 029: PASSAPORTE DIGITAL DO VEÍCULO E TRANSFERÊNCIA DE CUSTÓDIA (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS warranty_transfers CASCADE;

ALTER TABLE warranties
    DROP COLUMN IF EXISTS is_transferable,
    DROP COLUMN IF EXISTS transferred_at,
    DROP COLUMN IF EXISTS transferred_from_customer_id;

