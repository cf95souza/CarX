-- ==============================================================================
-- CARX SAAS — MIGRATION 012: CATÁLOGO, PREÇOS POR PORTE E COMBOS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS package_items CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS service_prices_by_class CASCADE;

ALTER TABLE services DROP COLUMN IF EXISTS material_consumption_estimate;
ALTER TABLE services DROP COLUMN IF EXISTS warranty_months;
