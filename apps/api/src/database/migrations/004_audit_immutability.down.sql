-- ==============================================================================
-- CARX SAAS — MIGRATION 004: TRILHA DE AUDITORIA IMUTÁVEL (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_modification();

DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_tenant_action;
DROP INDEX IF EXISTS idx_audit_logs_tenant_entity;

