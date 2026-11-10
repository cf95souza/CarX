-- ==============================================================================
-- CARX SAAS — MIGRATION 023: API PÚBLICA, WEBHOOKS REAIS E ENTREGAS COM RETRY (UP)
-- ==============================================================================

-- 1. EVOLUÇÃO DA TABELA api_keys
-- Ampliar prefixo para comportar formato display 'carx_live_xxxx...yyyy'
ALTER TABLE api_keys ALTER COLUMN prefix TYPE VARCHAR(50);

-- Adicionar status, revogação, rate limit e criador
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER NOT NULL DEFAULT 60;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_status ON api_keys(tenant_id, status);

-- 2. EVOLUÇÃO DA TABELA webhook_endpoints
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS name VARCHAR(150) NOT NULL DEFAULT 'Webhook Integration';
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant_status ON webhook_endpoints(tenant_id, status);

-- 3. EVOLUÇÃO DA TABELA webhook_deliveries
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS signature VARCHAR(255);
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_retry ON webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_status ON webhook_deliveries(tenant_id, status);

