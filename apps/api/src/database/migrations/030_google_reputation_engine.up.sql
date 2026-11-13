-- ==============================================================================
-- CARX SAAS — MIGRATION 030: MOTOR DE REPUTAÇÃO NO GOOGLE (UP)
-- ==============================================================================

-- 1. ADICIONAR URL DO GOOGLE MEU NEGÓCIO NO BRANDING DA OFICINA
ALTER TABLE tenant_branding 
ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- 2. ENRIQUECER TABELA nps_surveys COM AUDITORIA DE REPUTAÇÃO NO GOOGLE
ALTER TABLE nps_surveys 
ADD COLUMN IF NOT EXISTS google_review_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_review_sent_via VARCHAR(20),
ADD COLUMN IF NOT EXISTS google_review_clicked_at TIMESTAMPTZ;

-- 3. ÍNDICE DE PERFORMANCE PARA CLIENTES PROMOTORES E CONVITES DE REPUTAÇÃO
CREATE INDEX IF NOT EXISTS idx_nps_surveys_promoters_reputation 
ON nps_surveys (tenant_id, classification, google_review_clicked) 
WHERE classification = 'promoter';

