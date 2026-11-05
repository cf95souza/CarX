-- ==============================================================================
-- CARX SAAS — MIGRATION 005: SEED DOS PLANOS CANÔNICOS E COTAS (DOWN)
-- ==============================================================================

UPDATE tenants SET plan_id = NULL WHERE plan_id IN (SELECT id FROM plans WHERE slug IN ('essencial', 'profissional', 'premium'));
DELETE FROM plans WHERE slug IN ('essencial', 'profissional', 'premium');
