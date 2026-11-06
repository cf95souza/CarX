-- ==============================================================================
-- CARX SAAS — MIGRATION 016: AGENDA INTELIGENTE POR BOX E AGENDAMENTO (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS appointments CASCADE;
DROP INDEX IF EXISTS idx_work_orders_tenant_origin;
ALTER TABLE work_orders DROP COLUMN IF EXISTS origin;
DROP TABLE IF EXISTS bays CASCADE;

