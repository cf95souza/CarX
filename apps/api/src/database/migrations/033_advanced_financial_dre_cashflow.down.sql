-- ==============================================================================
-- CARX SAAS — MIGRATION 033: DRE GERENCIAL, FLUXO DE CAIXA E CONTAS (DOWN)
-- ==============================================================================

ALTER TABLE commission_entries DROP COLUMN IF EXISTS paid_by;
ALTER TABLE commission_entries DROP COLUMN IF EXISTS batch_id;
ALTER TABLE commission_entries DROP COLUMN IF EXISTS spool_cost_cents;

DROP TABLE IF EXISTS financial_bills CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;

