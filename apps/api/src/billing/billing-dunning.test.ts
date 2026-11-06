import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { pool } from '../database/db.js';
import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { dunningService } from './dunning-service.js';

describe('T2.12 — Contratos, Faturas e Régua de Cobrança (Manual/Regras)', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let testTenantId: string;
  let testTenantSlug: string;
  let testPlanId: string;
  let testContractId: string;
  let ownerToken: string;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Garantir superadmin no banco e obter token
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    await pool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Teste', 'superadmin@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true`,
      [superadminPassHash]
    );

    const loginRes = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: {
        email: 'superadmin@carx.com.br',
        password: 'Admin@CarX2026!',
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.body);
    superadminToken = loginBody.token;

    // 2. Obter plano essencial ou profissional
    const planRes = await tenantQuery<{ id: string }>(
      null,
      "SELECT id FROM plans WHERE slug = 'essencial' LIMIT 1",
      [],
      { bypassRls: true }
    );
    testPlanId = planRes.rows[0].id;

    // 3. Criar tenant exclusivo para os testes de dunning
    testTenantSlug = `dunning-oficina-${Date.now()}`;
    const cleanCnpj = `99${Date.now().toString().slice(-6)}000199`.slice(0, 14);
    const formattedCnpj = `${cleanCnpj.slice(0, 2)}.${cleanCnpj.slice(2, 5)}.${cleanCnpj.slice(5, 8)}/${cleanCnpj.slice(8, 12)}-${cleanCnpj.slice(12, 14)}`;
    const createTenantRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment, is_read_only)
       VALUES ($1, $1, $2, $3, $4, 'active', 'mecanica', false)
       RETURNING id`,
      [`Oficina Dunning Test`, `contato@${testTenantSlug}.local`, testTenantSlug, formattedCnpj],
      { bypassRls: true }
    );
    testTenantId = createTenantRes.rows[0].id;

    // 4. Criar contrato ativo
    const contractRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO contracts (tenant_id, plan_id, status, starts_at, negotiated_price_cents)
       VALUES ($1, $2, 'active', NOW(), 19900)
       RETURNING id`,
      [testTenantId, testPlanId],
      { bypassRls: true }
    );
    testContractId = contractRes.rows[0].id;

    // 5. Criar usuário e membership owner para simular requisições de loja
    const userPassHash = await hashPassword('TenantPass@2026');
    const userRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Dono Oficina Dunning', $1, $2)
       RETURNING id`,
      [`owner.${testTenantSlug}@carx.local`, userPassHash],
      { bypassRls: true }
    );
    const ownerUserId = userRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [testTenantId, ownerUserId],
      { bypassRls: true }
    );

    // Gerar JWT de loja para o owner usando o helper de auth da CarX API
    const { signJwt } = await import('../auth/jwt.js');
    ownerToken = signJwt({
      userId: ownerUserId,
      email: `owner.${testTenantSlug}@carx.local`,
      tenantId: testTenantId,
      role: 'owner',
    });
  });

  after(async () => {
    await app.close();
  });

  test('EMISSÃO MANUAL: Super Admin emite fatura avulsa para a oficina', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/invoices',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        tenantId: testTenantId,
        amountCents: 19900,
        dueDate: '2026-11-20',
        paymentMethod: 'pix',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.tenant_id, testTenantId);
    assert.equal(body.amount_cents, 19900);
    assert.equal(body.status, 'pending');
  });

  test('RÉGUA DE COBRANÇA (3 DIAS): fatura com 4 dias de atraso gera estágio warning_3d', async () => {
    // Inserir fatura com vencimento há 4 dias
    const invoiceRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO invoices (tenant_id, amount_cents, status, due_date, payment_method)
       VALUES ($1, 19900, 'pending', NOW() - INTERVAL '4 days', 'pix')
       RETURNING id`,
      [testTenantId],
      { bypassRls: true }
    );
    const invId = invoiceRes.rows[0].id;

    // Executar a régua de cobrança
    const dunningRes = await dunningService.runDunningRoutine();
    assert.ok(dunningRes.invoicesEvaluated >= 1);

    // Verificar se o tenant foi marcado com warning_3d e permanece active
    const tenantCheck = await tenantQuery<{ status: string; is_read_only: boolean; last_dunning_stage: string }>(
      null,
      'SELECT status, is_read_only, last_dunning_stage FROM tenants WHERE id = $1',
      [testTenantId],
      { bypassRls: true }
    );

    assert.equal(tenantCheck.rows[0].status, 'active');
    assert.equal(tenantCheck.rows[0].is_read_only, false);
    assert.equal(tenantCheck.rows[0].last_dunning_stage, 'warning_3d');

    // Verificar evento registrado em billing_dunning_events
    const eventCheck = await tenantQuery<{ stage: string; action_taken: string }>(
      null,
      `SELECT stage, action_taken FROM billing_dunning_events 
       WHERE tenant_id = $1 AND invoice_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [testTenantId, invId],
      { bypassRls: true }
    );

    assert.equal(eventCheck.rows[0].stage, 'warning_3d');
    assert.equal(eventCheck.rows[0].action_taken, 'WARNING_DISPATCHED_3D');

    // Limpar fatura do teste de 3 dias
    await tenantQuery(null, 'DELETE FROM invoices WHERE id = $1', [invId], { bypassRls: true });
  });

  test('RÉGUA DE COBRANÇA (7 DIAS): fatura com 8 dias de atraso aplica restrição leve soft_restriction_7d', async () => {
    // Inserir fatura com vencimento há 8 dias
    const invoiceRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO invoices (tenant_id, amount_cents, status, due_date, payment_method)
       VALUES ($1, 19900, 'pending', NOW() - INTERVAL '8 days', 'pix')
       RETURNING id`,
      [testTenantId],
      { bypassRls: true }
    );
    const invId = invoiceRes.rows[0].id;

    await dunningService.runDunningRoutine();

    const tenantCheck = await tenantQuery<{ status: string; is_read_only: boolean; last_dunning_stage: string }>(
      null,
      'SELECT status, is_read_only, last_dunning_stage FROM tenants WHERE id = $1',
      [testTenantId],
      { bypassRls: true }
    );

    assert.equal(tenantCheck.rows[0].status, 'active');
    assert.equal(tenantCheck.rows[0].is_read_only, false);
    assert.equal(tenantCheck.rows[0].last_dunning_stage, 'soft_restriction_7d');

    await tenantQuery(null, 'DELETE FROM invoices WHERE id = $1', [invId], { bypassRls: true });
  });

  test('RÉGUA DE COBRANÇA (15 DIAS): suspensão em modo SOMENTE LEITURA e bloqueio de escrita', async () => {
    // Inserir fatura com vencimento há 16 dias
    const invoiceRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO invoices (tenant_id, amount_cents, status, due_date, payment_method)
       VALUES ($1, 19900, 'pending', NOW() - INTERVAL '16 days', 'pix')
       RETURNING id`,
      [testTenantId],
      { bypassRls: true }
    );
    const invId = invoiceRes.rows[0].id;

    // Executar a régua
    await dunningService.runDunningRoutine();

    // 1. Verificar se a oficina foi transicionada para status suspended e is_read_only = true
    const tenantCheck = await tenantQuery<{
      status: string;
      is_read_only: boolean;
      suspended_reason: string;
      last_dunning_stage: string;
    }>(
      null,
      'SELECT status, is_read_only, suspended_reason, last_dunning_stage FROM tenants WHERE id = $1',
      [testTenantId],
      { bypassRls: true }
    );

    assert.equal(tenantCheck.rows[0].status, 'suspended');
    assert.equal(tenantCheck.rows[0].is_read_only, true);
    assert.equal(tenantCheck.rows[0].last_dunning_stage, 'suspension_15d');
    assert.ok(tenantCheck.rows[0].suspended_reason.includes('15+ dias'));

    // 2. Verificar que o contrato foi marcado como past_due
    const contractCheck = await tenantQuery<{ status: string }>(
      null,
      'SELECT status FROM contracts WHERE id = $1',
      [testContractId],
      { bypassRls: true }
    );
    assert.equal(contractCheck.rows[0].status, 'past_due');

    // 3. COMPORTAMENTO HTTP MODO SOMENTE LEITURA (Seção 11.2):
    // 3.1 Consulta GET /catalog/services deve FUNCIONAR (leitura histórica permitida)
    const getRes = await app.inject({
      method: 'GET',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.headers['x-tenant-read-only'], 'true');

    // 3.2 Tentativa de escrita POST /catalog/services deve ser BLOQUEADA com HTTP 403 e TENANT_SUSPENDED_READ_ONLY
    const postRes = await app.inject({
      method: 'POST',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {
        name: 'Tentativa de Novo Serviço Durante Suspensão',
        category: 'geral',
        priceCents: 10000,
      },
    });

    assert.equal(postRes.statusCode, 403);
    const postBody = JSON.parse(postRes.body);
    assert.equal(postBody.error, 'TENANT_SUSPENDED_READ_ONLY');
    assert.ok(postBody.message.includes('modo somente leitura'));

    // 4. BAIXA MANUAL NO SUPER ADMIN: Quitar fatura reativa oficina imediatamente!
    const payRes = await app.inject({
      method: 'POST',
      url: `/admin/invoices/${invId}/pay`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        paymentMethod: 'pix',
        notes: 'Comprovante Pix recebido e validado pelo suporte CarX',
      },
    });

    assert.equal(payRes.statusCode, 200);
    const payBody = JSON.parse(payRes.body);
    assert.equal(payBody.invoice.status, 'paid');
    assert.equal(payBody.tenantReactivated, true);
    assert.equal(payBody.tenant.status, 'active');
    assert.equal(payBody.tenant.is_read_only, false);

    // 5. Verificar que a oficina voltou a aceitar operações de escrita POST!
    const postAfterPayRes = await app.inject({
      method: 'POST',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {
        name: 'Serviço Criado Pós-Reativação Imediata',
        category: 'geral',
        priceCents: 15000,
      },
    });

    assert.equal(postAfterPayRes.statusCode, 201);
  });

  test('CANCELAMENTO MANUAL: Super Admin cancela fatura pendente', async () => {
    // Inserir fatura avulsa
    const invoiceRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO invoices (tenant_id, amount_cents, status, due_date, payment_method)
       VALUES ($1, 8900, 'pending', NOW() + INTERVAL '10 days', 'pix')
       RETURNING id`,
      [testTenantId],
      { bypassRls: true }
    );
    const invId = invoiceRes.rows[0].id;

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/admin/invoices/${invId}/cancel`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        reason: 'Renegociação com desconto especial',
      },
    });

    assert.equal(cancelRes.statusCode, 200);
    const cancelBody = JSON.parse(cancelRes.body);
    assert.equal(cancelBody.status, 'cancelled');

    // Confirmar no banco
    const dbCheck = await tenantQuery<{ status: string }>(
      null,
      'SELECT status FROM invoices WHERE id = $1',
      [invId],
      { bypassRls: true }
    );
    assert.equal(dbCheck.rows[0].status, 'cancelled');
  });

  test('HISTÓRICO DE DUNNING: /admin/billing/dunning-events retorna eventos auditados', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/billing/dunning-events?tenantId=${testTenantId}`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body.events));
    assert.ok(body.total >= 1);
    assert.ok(body.events.some((e: any) => e.stage === 'suspension_15d' || e.stage === 'regularized'));
  });
});
