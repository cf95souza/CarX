-- ==============================================================================
-- CARX SAAS — MIGRATION 021: COMISSÕES, DRE E RANKING DE TÉCNICOS (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_commission_entries_updated_at ON commission_entries;
DROP POLICY IF EXISTS tenant_isolation_policy ON commission_entries;
DROP TABLE IF EXISTS commission_entries CASCADE;

DROP TRIGGER IF EXISTS trg_commission_rules_updated_at ON commission_rules;
DROP POLICY IF EXISTS tenant_isolation_policy ON commission_rules;
DROP TABLE IF EXISTS commission_rules CASCADE;

