-- ==============================================================================
-- CARX SAAS — MIGRATION 019: CONTROLE DE QUALIDADE (QA) E PASSAPORTE DE GARANTIA (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_warranties_updated_at ON warranties;
DROP TABLE IF EXISTS warranties CASCADE;

DROP TRIGGER IF EXISTS trg_qa_audits_updated_at ON qa_audits;
DROP TABLE IF EXISTS qa_audits CASCADE;

