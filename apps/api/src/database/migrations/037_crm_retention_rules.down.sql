-- ==============================================================================
-- CARX SAAS — MIGRATION 037: CRM DE PÓS-VENDA, GARANTIAS & RETENÇÃO ATIVA (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS crm_retention_contacts CASCADE;
DROP TABLE IF EXISTS tenant_customer_coupons CASCADE;
DROP TABLE IF EXISTS crm_retention_rules CASCADE;

