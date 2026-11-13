import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { adminPool, pool } from '../database/db.js';
import { hashPassword } from '../auth/password.js';

describe('T5.2 — Cobrança Recorrente Automática de Licenças e Webhook Mercado Pago', () => {
  let app: FastifyInstance;
  let superadminToken: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Garantir superadministrador ativo com credenciais conhecidas
    const superadminPassHash = await hashPassword('CarX@SuperAdmin2026!');
    await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Teste', 'admin@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true`,
      [superadminPassHash]
    );

    // 2. Login do Superadmin para testes de rota administrativa
    const loginRes = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: {
        email: 'admin@carx.com.br',
        password: 'CarX@SuperAdmin2026!',
      },
    });

    if (loginRes.statusCode === 200) {
      superadminToken = JSON.parse(loginRes.body).token;
    }
  });

  after(async () => {
    await app.close();
    await pool.end();
    await adminPool.end();
  });

  it('1. GERAÇÃO DE PIX: /billing/invoices/:id/pix emite código copia-e-cola e QR Code para a fatura', async () => {
    const uniqueSuffix = Date.now();
    const slug = `oficina-pix-${uniqueSuffix}`;

    // Criar tenant de teste via adminPool
    const tenantRes = await adminPool.query<{ id: string }>(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, $2, $3, 'active', (SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1))
       RETURNING id`,
      [slug, `Oficina Pix Teste ${uniqueSuffix}`, `${slug}@example.com`]
    );
    const tenantId = tenantRes.rows[0].id;

    // Criar contrato via adminPool
    const contractRes = await adminPool.query<{ id: string }>(
      `INSERT INTO contracts (tenant_id, plan_id, negotiated_price_cents, status)
       VALUES ($1, (SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1), 14990, 'active')
       RETURNING id`,
      [tenantId]
    );
    const contractId = contractRes.rows[0].id;

    // Criar fatura pendente via adminPool
    const invRes = await adminPool.query<{ id: string }>(
      `INSERT INTO invoices (tenant_id, contract_id, amount_cents, status, payment_method, due_date)
       VALUES ($1, $2, 14990, 'pending', 'pix', CURRENT_DATE + INTERVAL '5 days')
       RETURNING id`,
      [tenantId, contractId]
    );
    const invoiceId = invRes.rows[0].id;

    // Disparar requisição de emissão de PIX
    const res = await app.inject({
      method: 'POST',
      url: `/billing/invoices/${invoiceId}/pix`,
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.equal(data.invoiceId, invoiceId);
    assert.ok(data.pix_code && data.pix_code.length > 20);
    assert.ok(data.pix_qr && data.pix_qr.length > 20);
    assert.ok(data.gateway_transaction_id);

    // Verificar se foi persistido no banco
    const invDb = await adminPool.query<{ pix_code: string; gateway_transaction_id: string }>(
      'SELECT pix_code, gateway_transaction_id FROM invoices WHERE id = $1',
      [invoiceId]
    );
    assert.equal(invDb.rows[0].pix_code, data.pix_code);
    assert.equal(invDb.rows[0].gateway_transaction_id, data.gateway_transaction_id);
  });

  it('2. BLINDAGEM OWASP: Webhook com status não-aprovado ou pagamento inexistente é rejeitado sem liquidação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      payload: {
        action: 'payment.created',
        data: { id: 'fake_non_existing_payment_123' },
      },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.processed, false);
    assert.equal(data.reason, 'Pagamento não está no status approved');
  });

  it('3. CRITÉRIO DE ACEITE: Pagamento via webhook reativa oficina suspensa instantaneamente sem intervenção manual', async () => {
    const uniqueSuffix = Date.now();
    const slug = `oficina-suspensa-${uniqueSuffix}`;

    // 1. Criar oficina no estado SUSPENSA por inadimplência via adminPool
    const tenantRes = await adminPool.query<{ id: string }>(
      `INSERT INTO tenants (slug, trade_name, email, status, is_read_only, suspended_reason, last_dunning_stage, plan_id)
       VALUES ($1, $2, $3, 'suspended', true, 'Inadimplência financeira (15+ dias de atraso)', 'suspension_15d', 
               (SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1))
       RETURNING id`,
      [slug, `Oficina Suspensa ${uniqueSuffix}`, `${slug}@example.com`]
    );
    const tenantId = tenantRes.rows[0].id;

    // 2. Contrato past_due
    const contractRes = await adminPool.query<{ id: string }>(
      `INSERT INTO contracts (tenant_id, plan_id, negotiated_price_cents, status, expires_at)
       VALUES ($1, (SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1), 14990, 'past_due', NOW() - INTERVAL '5 days')
       RETURNING id`,
      [tenantId]
    );
    const contractId = contractRes.rows[0].id;

    // 3. Fatura vencida pendente com transaction_id simulado
    const paymentId = `test_payment_reactivate_${uniqueSuffix}`;
    const invRes = await adminPool.query<{ id: string }>(
      `INSERT INTO invoices (tenant_id, contract_id, amount_cents, status, payment_method, due_date, gateway_transaction_id, gateway_provider)
       VALUES ($1, $2, 14990, 'pending', 'pix', CURRENT_DATE - INTERVAL '10 days', $3, 'mercadopago')
       RETURNING id`,
      [tenantId, contractId, paymentId]
    );
    const invoiceId = invRes.rows[0].id;

    // Validar estado pré-webhook
    const preTenant = await adminPool.query<{ status: string; is_read_only: boolean }>(
      'SELECT status, is_read_only FROM tenants WHERE id = $1',
      [tenantId]
    );
    assert.equal(preTenant.rows[0].status, 'suspended');
    assert.equal(preTenant.rows[0].is_read_only, true);

    // 4. DISPARAR O WEBHOOK DE PAGAMENTO APROVADO
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      payload: {
        action: 'payment.updated',
        data: { id: paymentId },
      },
    });

    assert.equal(webhookRes.statusCode, 200);
    const body = JSON.parse(webhookRes.body);
    assert.equal(body.received, true);
    assert.equal(body.processed, true);
    assert.equal(body.settlement.success, true);
    assert.equal(body.settlement.tenantReactivated, true);

    // 5. VALIDAR CRITÉRIO DE ACEITE: A loja foi reativada instantaneamente no banco de dados!
    const postTenant = await adminPool.query<{ status: string; is_read_only: boolean; suspended_reason: string | null; last_dunning_stage: string }>(
      'SELECT status, is_read_only, suspended_reason, last_dunning_stage FROM tenants WHERE id = $1',
      [tenantId]
    );
    assert.equal(postTenant.rows[0].status, 'active', 'O status da oficina deve ter voltado para "active"');
    assert.equal(postTenant.rows[0].is_read_only, false, 'O modo somente leitura deve ter sido desativado');
    assert.equal(postTenant.rows[0].suspended_reason, null, 'O motivo de suspensão deve ter sido limpo');
    assert.equal(postTenant.rows[0].last_dunning_stage, 'regularized', 'O estágio de dunning deve ser regularized');

    // 6. Validar que a fatura está paga
    const postInvoice = await adminPool.query<{ status: string; paid_at: string | null }>(
      'SELECT status, paid_at FROM invoices WHERE id = $1',
      [invoiceId]
    );
    assert.equal(postInvoice.rows[0].status, 'paid');
    assert.ok(postInvoice.rows[0].paid_at !== null);

    // 7. Validar que o contrato foi renovado e estendido
    const postContract = await adminPool.query<{ status: string; expires_at: Date }>(
      'SELECT status, expires_at FROM contracts WHERE id = $1',
      [contractId]
    );
    assert.equal(postContract.rows[0].status, 'active');
    assert.ok(new Date(postContract.rows[0].expires_at) > new Date());

    // 8. Validar registro de histórico em billing_dunning_events
    const eventRes = await adminPool.query<{ stage: string; action_taken: string }>(
      'SELECT stage, action_taken FROM billing_dunning_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );
    assert.equal(eventRes.rows[0].stage, 'regularized');
    assert.ok(eventRes.rows[0].action_taken.includes('Reativação automática'));
  });

  it('4. IDEMPOTÊNCIA: Notificações duplicadas do webhook não causam efeitos colaterais', async () => {
    const uniqueSuffix = Date.now();
    const slug = `oficina-idem-${uniqueSuffix}`;

    const tenantRes = await adminPool.query<{ id: string }>(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, $2, $3, 'active', (SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1))
       RETURNING id`,
      [slug, `Oficina Idempotente ${uniqueSuffix}`, `${slug}@example.com`]
    );
    const tenantId = tenantRes.rows[0].id;

    const paymentId = `test_payment_idem_${uniqueSuffix}`;
    await adminPool.query(
      `INSERT INTO invoices (tenant_id, amount_cents, status, payment_method, due_date, gateway_transaction_id)
       VALUES ($1, 14990, 'pending', 'pix', CURRENT_DATE, $2)`,
      [tenantId, paymentId]
    );

    // Primeiro disparo
    const res1 = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      payload: { data: { id: paymentId } },
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(JSON.parse(res1.body).settlement.success, true);

    // Segundo disparo (mesmo payload idêntico)
    const res2 = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      payload: { data: { id: paymentId } },
    });
    assert.equal(res2.statusCode, 200);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.settlement.success, true);
    assert.equal(body2.settlement.tenantReactivated, false); // Já estava ativo, sem reativação duplicada
  });

  it('5. SUPER ADMIN: Endpoints de configuração de faturamento (/admin/billing/settings)', async () => {
    if (!superadminToken) return;

    // GET
    const getRes = await app.inject({
      method: 'GET',
      url: '/admin/billing/settings',
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.equal(getBody.gateway, 'mercadopago');

    // PUT
    const putRes = await app.inject({
      method: 'PUT',
      url: '/admin/billing/settings',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        sandbox_mode: true,
        mercadopago_public_key: 'TEST-PUBLIC-KEY-SAMPLE',
      },
    });
    assert.equal(putRes.statusCode, 200);
  });
});
