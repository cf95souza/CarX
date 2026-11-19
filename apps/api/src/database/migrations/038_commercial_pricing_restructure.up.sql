-- ==============================================================================
-- CARX SAAS — MIGRATION 038: REESTRUTURAÇÃO COMERCIAL DE PLANOS (UP)
-- ==============================================================================

-- 1. ATUALIZAR PLANO ESSENCIAL: R$ 39,90/mês, 1 usuário, 2 GB MinIO, OS ilimitadas
UPDATE plans
SET
    name = 'Essencial',
    description = 'Ideal para profissionais autônomos e estúdios em fase inicial',
    price_cents = 3990,
    interval = 'monthly',
    limits = '{"max_units": 1, "max_users": 1, "max_work_orders_per_month": 999999, "max_storage_mb": 2048, "max_whatsapp_messages_per_month": 0}'::jsonb,
    features = '["work_orders", "customers", "vehicles", "quotes", "inspection_checklist", "basic_reports", "whatsapp_basic"]'::jsonb,
    is_active = true,
    updated_at = NOW()
WHERE slug = 'essencial';

-- 2. ATUALIZAR PLANO PROFISSIONAL: R$ 69,90/mês, 5 colaboradores, 10 GB MinIO, OS ilimitadas, App do Operador, Comissões e PPF
UPDATE plans
SET
    name = 'Profissional',
    description = 'Para oficinas e centros automotivos com equipe e alto volume de produção',
    price_cents = 6990,
    interval = 'monthly',
    limits = '{"max_units": 1, "max_users": 5, "max_work_orders_per_month": 999999, "max_storage_mb": 10240, "max_whatsapp_messages_per_month": 1000}'::jsonb,
    features = '["work_orders", "customers", "vehicles", "quotes", "inspection_checklist", "basic_reports", "financial", "commissions", "inventory", "nps", "whatsapp_auto", "whatsapp_gateway", "ppf_spool_control", "customer_portal"]'::jsonb,
    is_active = true,
    updated_at = NOW()
WHERE slug = 'profissional';

-- 3. INATIVAR PLANO PREMIUM PARA NOVAS ASSINATURAS (RESTRITO AO MODELO DE 2 NÍVEIS)
UPDATE plans
SET
    name = 'Premium (Legado)',
    is_active = false,
    updated_at = NOW()
WHERE slug = 'premium';
