-- ==============================================================================
-- CARX SAAS — MIGRATION 002: CONTEXTO DE TENANT E RLS EM PROFUNDIDADE (UP)
-- ==============================================================================

-- 1. ADICIONAR tenant_id EM webhook_deliveries PARA ISOLAMENTO DIRETO
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_id ON webhook_deliveries(tenant_id);

-- 2. GARANTIR PAPEL DA APLICAÇÃO COM RESTRIÇÃO NOBYPASSRLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carx_app') THEN
    CREATE ROLE carx_app WITH LOGIN PASSWORD 'carx_local_secret_password' NOBYPASSRLS;
  ELSE
    ALTER ROLE carx_app NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO carx_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO carx_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO carx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO carx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO carx_app;

-- 3. HABILITAR E FORÇAR RLS EM TODAS AS TABELAS QUE POSSUEM tenant_id
DO $$
DECLARE
    tbl_rec RECORD;
BEGIN
    FOR tbl_rec IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
        ORDER BY table_name
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl_rec.table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl_rec.table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl_rec.table_name);
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON public.%I
            AS PERMISSIVE
            FOR ALL
            TO public
            USING (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            )
            WITH CHECK (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            );
        ', tbl_rec.table_name);

        RAISE NOTICE 'RLS ativado e forçado com política tenant_isolation_policy para public.%', tbl_rec.table_name;
    END LOOP;
END $$;

-- 4. HABILITAR E FORÇAR RLS NA TABELA tenants (ISOLADA PELO PRÓPRIO id)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self_isolation_policy ON public.tenants;

CREATE POLICY tenant_self_isolation_policy ON public.tenants
AS PERMISSIVE
FOR ALL
TO public
USING (
    current_setting('app.current_tenant_id', true) = id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
)
WITH CHECK (
    current_setting('app.current_tenant_id', true) = id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
);

