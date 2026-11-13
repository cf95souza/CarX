-- ==============================================================================
-- CARX SAAS — MIGRATION 036: INTELIGÊNCIA ARTIFICIAL APLICADA A VISTORIAS (UP)
-- T6.14: Pré-detecção de danos em fotos de entrada, checklist por voz e sugestão de orçamento
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ai_inspection_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('image_damage_detection', 'voice_checklist_extraction')),
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_damages JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    extracted_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    tokens_used INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico
ALTER TABLE ai_inspection_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inspection_analyses FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON ai_inspection_analyses
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

-- Índices de Alta Eficiência
CREATE INDEX IF NOT EXISTS idx_ai_analyses_tenant_wo ON ai_inspection_analyses(tenant_id, work_order_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_tenant_insp ON ai_inspection_analyses(tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_tenant_type ON ai_inspection_analyses(tenant_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_inspection_analyses(tenant_id, created_at DESC);

-- Permissões para a Role de Aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_inspection_analyses TO carx_app;

