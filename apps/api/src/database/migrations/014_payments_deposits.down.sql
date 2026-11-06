-- ==============================================================================
-- CARX SAAS — MIGRATION 014: PAGAMENTOS, SINAL E TRANSAÇÕES ATÔMICAS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
