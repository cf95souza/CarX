-- ==============================================================================
-- CARX SAAS — MIGRATION 013: ORDENS DE SERVIÇO E MÁQUINA DE ESTADOS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS work_order_events CASCADE;
DROP TABLE IF EXISTS work_order_items CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;

