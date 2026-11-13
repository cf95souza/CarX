-- ==============================================================================
-- CARX SAAS — MIGRATION 033: DRE GERENCIAL, FLUXO DE CAIXA E CONTAS (UP)
-- ==============================================================================

-- 1. PLANO DE CONTAS E CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = Categoria do Sistema
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('revenue', 'expense', 'deduction')),
    group_type VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (
        group_type IN (
            'gross_revenue',
            'deduction',
            'direct_cost',        -- CSP / CMV (materiais, insumos, bobinas, comissões)
            'fixed_expense',      -- Aluguel, luz, água, folha/pró-labore, SaaS
            'operating_expense',  -- Marketing, ferramentas, frete
            'financial',          -- Juros, taxas de gateway, tarifas bancárias
            'other'
        )
    ),
    is_system BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para financial_categories
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'financial_categories' AND policyname = 'financial_categories_isolation'
    ) THEN
        CREATE POLICY financial_categories_isolation ON financial_categories
            AS PERMISSIVE FOR ALL TO public
            USING (
                tenant_id IS NULL
                OR current_setting('app.current_tenant_id', true) = tenant_id::text
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            )
            WITH CHECK (
                tenant_id IS NOT NULL AND (
                    current_setting('app.current_tenant_id', true) = tenant_id::text
                    OR current_setting('app.is_superadmin', true) = 'true'
                    OR current_setting('app.bypass_rls', true) = 'true'
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_categories_tenant 
ON financial_categories (tenant_id, group_type, display_order);

-- Categorias Padrão Globais do Sistema (Se não existirem)
INSERT INTO financial_categories (name, type, group_type, is_system, display_order)
VALUES 
    ('Serviços Automotivos (Mão de Obra)', 'revenue', 'gross_revenue', true, 1),
    ('Venda de Produtos e Películas', 'revenue', 'gross_revenue', true, 2),
    ('Deduções e Descontos Concedidos', 'deduction', 'deduction', true, 3),
    ('Impostos sobre Serviços (ISS / Simples)', 'deduction', 'deduction', true, 4),
    ('Custo de Bobinas e Películas (PPF / Solar)', 'expense', 'direct_cost', true, 5),
    ('Custo de Químicos e Polidores', 'expense', 'direct_cost', true, 6),
    ('Comissões de Técnicos e Instaladores', 'expense', 'direct_cost', true, 7),
    ('Aluguel do Galpão / Ponto Comercial', 'expense', 'fixed_expense', true, 8),
    ('Energia Elétrica, Água e Internet', 'expense', 'fixed_expense', true, 9),
    ('Pró-labore e Salários Fixos', 'expense', 'fixed_expense', true, 10),
    ('Sistemas, Softwares e Assinaturas (CarX)', 'expense', 'fixed_expense', true, 11),
    ('Marketing, Anúncios e Tráfego Pago', 'expense', 'operating_expense', true, 12),
    ('Manutenção de Ferramentas e Equipamentos', 'expense', 'operating_expense', true, 13),
    ('Taxas de Cartão, Pix e Gateway', 'expense', 'financial', true, 14)
ON CONFLICT DO NOTHING;

-- 2. TABELA DE CONTAS A PAGAR E A RECEBER (FINANCIAL_BILLS)
CREATE TABLE IF NOT EXISTS financial_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payable', 'receivable')),
    description VARCHAR(255) NOT NULL,
    supplier_customer_name VARCHAR(255),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paid_amount_cents INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
    payment_method VARCHAR(30),
    notes TEXT,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativação e Forçamento de RLS Canônico para financial_bills
ALTER TABLE financial_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_bills FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'financial_bills' AND policyname = 'tenant_isolation_policy'
    ) THEN
        CREATE POLICY tenant_isolation_policy ON financial_bills
            AS PERMISSIVE FOR ALL TO public
            USING (
                current_setting('app.current_tenant_id', true) = tenant_id::text
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            )
            WITH CHECK (
                current_setting('app.current_tenant_id', true) = tenant_id::text
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_bills_tenant_due 
ON financial_bills (tenant_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_financial_bills_tenant_type 
ON financial_bills (tenant_id, type, status);

CREATE INDEX IF NOT EXISTS idx_financial_bills_category 
ON financial_bills (tenant_id, category_id);

-- 3. ENRIQUECIMENTO DE COMMISSION_ENTRIES (DEDUÇÃO DE INSUMOS E QUITAÇÃO EM LOTE)
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS spool_cost_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS batch_id VARCHAR(50);
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_entries_batch 
ON commission_entries (tenant_id, batch_id);

