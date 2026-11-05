-- ==============================================================================
-- CARX SAAS — MIGRATION 002: CONTEXTO DE TENANT E RLS EM PROFUNDIDADE (DOWN)
-- ==============================================================================

-- 1. DESATIVAR RLS NA TABELA tenants
DROP POLICY IF EXISTS tenant_self_isolation_policy ON public.tenants;
ALTER TABLE public.tenants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 2. DESATIVAR RLS NAS DEMAIS TABELAS COM tenant_id
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
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl_rec.table_name);
        EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY;', tbl_rec.table_name);
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl_rec.table_name);
        RAISE NOTICE 'RLS desativado para public.%', tbl_rec.table_name;
    END LOOP;
END $$;

-- 3. REMOVER COLUNA tenant_id DE webhook_deliveries
DROP INDEX IF EXISTS idx_webhook_deliveries_tenant_id;
ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS tenant_id;
