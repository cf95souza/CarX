-- ==============================================================================
-- CARX SAAS — MIGRATION 035: APP DO TÉCNICO OFFLINE-FIRST & FILA DE SINCRONIZAÇÃO (UP)
-- ==============================================================================

-- 1. TABELA DE SINCRONIZAÇÃO OFFLINE DE AÇÕES DO TÉCNICO (IDEMPOTÊNCIA & AUDITORIA)
CREATE TABLE IF NOT EXISTS technician_offline_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id UUID NOT NULL UNIQUE, -- Garante idempotência: se o cliente reenviar após queda, não duplica
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_timestamp TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE technician_offline_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_offline_sync_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON technician_offline_sync_logs
    AS PERMISSIVE FOR ALL TO public
    USING (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    )
    WITH CHECK (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE INDEX IF NOT EXISTS idx_offline_sync_tenant_action ON technician_offline_sync_logs(tenant_id, action_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_tenant_tech ON technician_offline_sync_logs(tenant_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_tenant_wo ON technician_offline_sync_logs(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_client_time ON technician_offline_sync_logs(tenant_id, client_timestamp DESC);

