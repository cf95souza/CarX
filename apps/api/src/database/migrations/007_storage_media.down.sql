-- ==============================================================================
-- CARX SAAS — MIGRATION 007: ARMAZENAMENTO DE ARQUIVOS COM MINIO (DOWN)
-- ==============================================================================

DROP POLICY IF EXISTS tenant_isolation_policy ON storage_files;
DROP TABLE IF EXISTS storage_files CASCADE;

