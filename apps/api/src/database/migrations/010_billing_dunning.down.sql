-- ==============================================================================
-- CARX SAAS — MIGRATION 010: RÉGUA DE COBRANÇA, DUNNING E MODO SOMENTE LEITURA (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS billing_dunning_events CASCADE;
ALTER TABLE tenants DROP COLUMN IF EXISTS dunning_updated_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS last_dunning_stage;
ALTER TABLE tenants DROP COLUMN IF EXISTS suspended_reason;
ALTER TABLE tenants DROP COLUMN IF EXISTS is_read_only;

