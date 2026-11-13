-- ==============================================================================
-- CARX SAAS — MIGRATION 031: MINI-SITE INSTITUCIONAL, PORTFÓLIO E LEADS (DOWN)
-- ==============================================================================

DROP TABLE IF EXISTS minisite_leads CASCADE;
DROP TABLE IF EXISTS minisite_portfolio_items CASCADE;

ALTER TABLE tenant_branding 
DROP COLUMN IF EXISTS minisite_enabled,
DROP COLUMN IF EXISTS minisite_headline,
DROP COLUMN IF EXISTS minisite_about,
DROP COLUMN IF EXISTS minisite_address,
DROP COLUMN IF EXISTS minisite_business_hours,
DROP COLUMN IF EXISTS minisite_features;

