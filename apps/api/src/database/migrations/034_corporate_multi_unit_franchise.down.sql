-- ==============================================================================
-- CARX SAAS — MIGRATION 034: PAINEL CORPORATIVO DE REDES E FRANQUIAS (MULTIUNIDADE) (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS unit_transfers CASCADE;

DROP INDEX IF EXISTS idx_material_rolls_tenant_unit;
ALTER TABLE material_rolls DROP COLUMN IF EXISTS unit_id;

DROP INDEX IF EXISTS idx_materials_tenant_unit;
ALTER TABLE materials DROP COLUMN IF EXISTS unit_id;

DROP INDEX IF EXISTS idx_bays_tenant_unit;
ALTER TABLE bays DROP COLUMN IF EXISTS unit_id;

DROP INDEX IF EXISTS idx_work_orders_tenant_unit;
ALTER TABLE work_orders DROP COLUMN IF EXISTS unit_id;

