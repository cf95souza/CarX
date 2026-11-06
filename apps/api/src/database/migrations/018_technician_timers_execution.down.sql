-- ==============================================================================
-- CARX SAAS — MIGRATION 018: APP DO TÉCNICO, CRONÔMETRO OFICIAL E FILA (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS work_order_timers CASCADE;

DROP INDEX IF EXISTS idx_work_orders_tenant_rework;
ALTER TABLE work_orders DROP COLUMN IF EXISTS rework_reason;
ALTER TABLE work_orders DROP COLUMN IF EXISTS is_rework;

