-- ==============================================================================
-- CARX SAAS — MIGRATION 038: REESTRUTURAÇÃO COMERCIAL DE PLANOS (DOWN)
-- ==============================================================================

UPDATE plans
SET
    name = 'Essencial',
    description = 'Para lojas e estéticas automotivas em fase inicial',
    price_cents = 6990,
    interval = 'monthly',
    limits = '{"max_units": 1, "max_users": 3, "max_work_orders_per_month": 100, "max_storage_mb": 1024, "max_whatsapp_messages_per_month": 200}'::jsonb,
    features = '["work_orders", "customers", "vehicles", "quotes", "basic_reports", "whatsapp_basic"]'::jsonb,
    is_active = true,
    updated_at = NOW()
WHERE slug = 'essencial';

UPDATE plans
SET
    name = 'Profissional',
    description = 'Para centros automotivos com equipe estruturada e alto volume de produção',
    price_cents = 14990,
    interval = 'monthly',
    limits = '{"max_units": 2, "max_users": 10, "max_work_orders_per_month": 500, "max_storage_mb": 10240, "max_whatsapp_messages_per_month": 1000}'::jsonb,
    features = '["work_orders", "customers", "vehicles", "quotes", "basic_reports", "financial", "commissions", "inventory", "inspection_checklist", "nps", "whatsapp_auto", "ppf_spool_control"]'::jsonb,
    is_active = true,
    updated_at = NOW()
WHERE slug = 'profissional';

UPDATE plans
SET
    name = 'Premium',
    is_active = true,
    updated_at = NOW()
WHERE slug = 'premium';
