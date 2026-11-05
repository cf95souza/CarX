-- ==============================================================================
-- CARX SAAS — MIGRATION 008: SUPER ADMIN, CONTRATOS, LEADS E IMPERSONAÇÃO (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS impersonation_log CASCADE;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS superadmin_user_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS contract_id;
DROP TABLE IF EXISTS contract_events CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS superadmin_users CASCADE;
