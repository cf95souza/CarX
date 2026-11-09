-- ==============================================================================
-- CARX SAAS — MIGRATION 022: PORTAL DO CLIENTE SEGURO COM DESAFIO OTP (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_customer_portal_otps_updated_at ON customer_portal_otps;
DROP TABLE IF EXISTS customer_portal_otps CASCADE;
