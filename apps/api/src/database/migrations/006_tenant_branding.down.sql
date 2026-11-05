-- ==============================================================================
-- CARX SAAS — MIGRATION 006: SUBDOMÍNIO POR LOJA E WHITE LABEL REAL (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_tenants_auto_create_branding ON tenants;
DROP FUNCTION IF EXISTS trg_fn_auto_create_tenant_branding();

DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_branding;
DROP POLICY IF EXISTS tenant_branding_isolation_policy ON tenant_branding;
DROP TABLE IF EXISTS tenant_branding CASCADE;

