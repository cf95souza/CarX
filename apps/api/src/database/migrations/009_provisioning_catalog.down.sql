-- ==============================================================================
-- CARX SAAS — MIGRATION 009: PROVISIONAMENTO, CATÁLOGO E CHECKLISTS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS tenant_invitations CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS services CASCADE;
ALTER TABLE tenants DROP COLUMN IF EXISTS segment;

