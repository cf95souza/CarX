-- ==============================================================================
-- CARX SAAS — MIGRATION 001: ESQUEMA RELACIONAL DO NÚCLEO (DOWN / ROLLBACK)
-- ==============================================================================

-- 1. REMOVER TRIGGERS
DROP TRIGGER IF EXISTS set_timestamp_webhook_endpoints ON webhook_endpoints;
DROP TRIGGER IF EXISTS set_timestamp_platform_admins ON platform_admins;
DROP TRIGGER IF EXISTS set_timestamp_invoices ON invoices;
DROP TRIGGER IF EXISTS set_timestamp_subscriptions ON subscriptions;
DROP TRIGGER IF EXISTS set_timestamp_memberships ON memberships;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
DROP TRIGGER IF EXISTS set_timestamp_units ON units;
DROP TRIGGER IF EXISTS set_timestamp_tenants ON tenants;
DROP TRIGGER IF EXISTS set_timestamp_plans ON plans;

-- 2. REMOVER TABELAS EM ORDEM REVERSA DE DEPENDÊNCIA
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS platform_admins CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- 3. REMOVER TIPOS / ENUMS
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS billing_interval CASCADE;
DROP TYPE IF EXISTS membership_role CASCADE;
DROP TYPE IF EXISTS tenant_status CASCADE;

-- 4. REMOVER FUNÇÃO AUXILIAR
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

