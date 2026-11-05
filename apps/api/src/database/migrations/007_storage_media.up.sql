-- ==============================================================================
-- CARX SAAS — MIGRATION 007: ARMAZENAMENTO DE ARQUIVOS COM MINIO (UP)
-- ==============================================================================

-- 1. CRIAR TABELA DE ARQUIVOS E MÍDIAS DA PLATAFORMA
CREATE TABLE IF NOT EXISTS storage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_key VARCHAR(500) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'carx-media',
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    real_mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    entity_id UUID,
    uploader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ÍNDICES DE DESEMPENHO E ISOLAMENTO
CREATE INDEX IF NOT EXISTS idx_storage_files_tenant_id ON storage_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_tenant_category ON storage_files(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_storage_files_file_key ON storage_files(file_key);

-- 3. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE TRIGGER trg_storage_files_updated_at
    BEFORE UPDATE ON storage_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. HABILITAR E FORÇAR ROW LEVEL SECURITY (RLS)
ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_files FORCE ROW LEVEL SECURITY;

-- 5. POLÍTICA CANÔNICA DE ISOLAMENTO RIGOROSO DE TENANT (tenant_isolation_policy)
DROP POLICY IF EXISTS tenant_isolation_policy ON storage_files;

CREATE POLICY tenant_isolation_policy ON storage_files
    AS PERMISSIVE
    FOR ALL
    TO public
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

-- 6. PERMISSÕES PARA O USUÁRIO DE APLICAÇÃO (carx_app)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage_files TO carx_app;

