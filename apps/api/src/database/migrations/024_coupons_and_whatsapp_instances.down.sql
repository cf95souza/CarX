-- ==============================================================================
-- CARX SAAS — MIGRATION 024: CUPONS PROMOCIONAIS E INSTÂNCIAS DE WHATSAPP (DOWN)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_tenant_whatsapp_instances_updated_at ON tenant_whatsapp_instances;
DROP TABLE IF EXISTS tenant_whatsapp_instances;

DROP TABLE IF EXISTS coupon_redemptions;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
DROP TABLE IF EXISTS coupons;

