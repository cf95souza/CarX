-- ==============================================================================
-- CARX SAAS — MIGRATION 023: API PÚBLICA, WEBHOOKS REAIS E ENTREGAS COM RETRY (DOWN)
-- ==============================================================================

-- 3. REVERSÃO EM webhook_deliveries
DROP INDEX IF EXISTS idx_webhook_deliveries_tenant_status;
DROP INDEX IF EXISTS idx_webhook_deliveries_status_retry;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS failed_at;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS next_retry_at;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS max_attempts;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS attempts;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS status;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS signature;

-- 2. REVERSÃO EM webhook_endpoints
DROP INDEX IF EXISTS idx_webhook_endpoints_tenant_status;
ALTER TABLE webhook_endpoints DROP COLUMN IF EXISTS failure_count;
ALTER TABLE webhook_endpoints DROP COLUMN IF EXISTS status;
ALTER TABLE webhook_endpoints DROP COLUMN IF EXISTS description;
ALTER TABLE webhook_endpoints DROP COLUMN IF EXISTS name;

-- 1. REVERSÃO EM api_keys
DROP INDEX IF EXISTS idx_api_keys_tenant_status;
DROP INDEX IF EXISTS idx_api_keys_status;
ALTER TABLE api_keys DROP COLUMN IF EXISTS created_by;
ALTER TABLE api_keys DROP COLUMN IF EXISTS rate_limit_per_minute;
ALTER TABLE api_keys DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE api_keys DROP COLUMN IF EXISTS status;
ALTER TABLE api_keys ALTER COLUMN prefix TYPE VARCHAR(10);

