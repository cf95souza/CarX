-- ==============================================================================
-- CARX SAAS — MIGRATION 014: PAGAMENTOS, SINAL E TRANSAÇÕES ATÔMICAS (UP)
-- ==============================================================================

-- 1. TABELA DE PAGAMENTOS DE ORDENS DE SERVIÇO (PAYMENTS)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method VARCHAR(30) NOT NULL, -- 'pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'link'
    status VARCHAR(30) NOT NULL DEFAULT 'approved', -- 'approved', 'refunded', 'partially_refunded', 'pending', 'failed'
    installments INTEGER NOT NULL DEFAULT 1,
    card_brand VARCHAR(50),
    transaction_reference VARCHAR(255),
    notes TEXT,
    refunded_amount_cents INTEGER NOT NULL DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar e Forçar RLS em payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON payments;
CREATE POLICY tenant_isolation_policy ON payments
    AS PERMISSIVE
    FOR ALL
    TO public
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

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_work_order_id ON payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(tenant_id, method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Trigger de updated_at para payments
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA DE ADIANTAMENTOS / SINAL (DEPOSITS)
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method VARCHAR(30) NOT NULL, -- 'pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer'
    status VARCHAR(30) NOT NULL DEFAULT 'held', -- 'held' (retido como sinal), 'applied' (abatido na OS), 'refunded' (estornado)
    applied_to_work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    applied_at TIMESTAMPTZ,
    notes TEXT,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar e Forçar RLS em deposits
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON deposits;
CREATE POLICY tenant_isolation_policy ON deposits
    AS PERMISSIVE
    FOR ALL
    TO public
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

CREATE INDEX IF NOT EXISTS idx_deposits_tenant_id ON deposits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposits_customer_id ON deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_work_order_id ON deposits(work_order_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(tenant_id, status);

-- Trigger de updated_at para deposits
DROP TRIGGER IF EXISTS trg_deposits_updated_at ON deposits;
CREATE TRIGGER trg_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
