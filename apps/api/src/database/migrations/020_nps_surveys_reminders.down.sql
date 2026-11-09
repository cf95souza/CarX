-- ==============================================================================
-- CARX SAAS — MIGRATION 020: PESQUISA NPS, PÓS-VENDA E LEMBRETES DE REVISÃO (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_reminders_updated_at ON maintenance_reminders;
DROP TABLE IF EXISTS maintenance_reminders CASCADE;

DROP TRIGGER IF EXISTS trg_nps_surveys_updated_at ON nps_surveys;
DROP TABLE IF EXISTS nps_surveys CASCADE;
