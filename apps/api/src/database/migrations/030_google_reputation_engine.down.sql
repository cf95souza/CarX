-- ==============================================================================
-- CARX SAAS — MIGRATION 030: MOTOR DE REPUTAÇÃO NO GOOGLE (DOWN)
-- ==============================================================================

DROP INDEX IF EXISTS idx_nps_surveys_promoters_reputation;

ALTER TABLE nps_surveys 
DROP COLUMN IF EXISTS google_review_sent_at,
DROP COLUMN IF EXISTS google_review_sent_via,
DROP COLUMN IF EXISTS google_review_clicked_at;

ALTER TABLE tenant_branding 
DROP COLUMN IF EXISTS google_review_url;

