-- ==============================================================================
-- CARX SAAS — MIGRATION 005: SEED DOS PLANOS CANÔNICOS E COTAS (UP)
-- ==============================================================================

-- 1. INSERIR PLANO ESSENCIAL
INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
VALUES (
    'Essencial',
    'essencial',
    'Para lojas e estéticas automotivas em fase inicial',
    6990,
    'monthly',
    '{"max_units": 1, "max_users": 3, "max_work_orders_per_month": 100, "max_storage_mb": 1024, "max_whatsapp_messages_per_month": 200}'::jsonb,
    '["work_orders", "customers", "vehicles", "quotes", "basic_reports", "whatsapp_basic"]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

-- 2. INSERIR PLANO PROFISSIONAL
INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
VALUES (
    'Profissional',
    'profissional',
    'Para centros automotivos com equipe estruturada e alto volume de produção',
    14990,
    'monthly',
    '{"max_units": 2, "max_users": 10, "max_work_orders_per_month": 500, "max_storage_mb": 10240, "max_whatsapp_messages_per_month": 1000}'::jsonb,
    '["work_orders", "customers", "vehicles", "quotes", "basic_reports", "financial", "commissions", "inventory", "inspection_checklist", "nps", "whatsapp_auto", "ppf_spool_control"]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

-- 3. INSERIR PLANO PREMIUM
INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
VALUES (
    'Premium',
    'premium',
    'Para redes de oficinas, franquias e operações multiloja de grande porte',
    29990,
    'monthly',
    '{"max_units": 10, "max_users": 50, "max_work_orders_per_month": 999999, "max_storage_mb": 51200, "max_whatsapp_messages_per_month": 5000}'::jsonb,
    '["work_orders", "customers", "vehicles", "quotes", "basic_reports", "financial", "commissions", "inventory", "inspection_checklist", "nps", "whatsapp_auto", "ppf_spool_control", "multi_unit", "nfse", "api_access", "custom_domain"]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

-- 4. VINCULAR TENANTS SEM PLANO AO PLANO ESSENCIAL POR PADRÃO
UPDATE tenants
SET plan_id = (SELECT id FROM plans WHERE slug = 'essencial' LIMIT 1)
WHERE plan_id IS NULL;

