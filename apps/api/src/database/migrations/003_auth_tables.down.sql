-- ==============================================================================
-- CARX SAAS — MIGRATION 003: TABELAS E SUPORTE A AUTENTICAÇÃO E 2FA (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS password_resets CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_temp_secret;
