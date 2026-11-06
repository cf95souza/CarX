-- ==============================================================================
-- CARX SAAS — MIGRATION 015: CONTROLE DE ESTOQUE, CONSUMO POR OS E BOBINAS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS work_order_materials CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS material_rolls CASCADE;
DROP TABLE IF EXISTS materials CASCADE;

