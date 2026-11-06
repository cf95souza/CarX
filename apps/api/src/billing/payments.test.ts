import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.4 — Pagamentos, Adiantamentos (Sinal) e Transações Atômicas', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let workOrderAlpha1Id: string; // OS de R$ 500,00 para teste de concorrência e pagamento regular
  let workOrderAlpha2Id: string; // OS de R$ 1000,00 para teste de estorno e sinal

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;
  let customerBetaId: string;
  let vehicleBetaId: string;
  let workOrderBetaId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@Payments2026!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-pay-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Detail Payments', 'Alpha Detail LTDA', $1, $2, '12.345.678/0001-99', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const userAlphaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id`,
      [`gestor.${tenantAlphaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = userAlphaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );

    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      email: `gestor.${tenantAlphaSlug}@carx.local`,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // Cliente e Veículo Alpha
    const custAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, phone, document, email)
       VALUES ($1, 'Carlos Mendes', '+5511999990001', '12345678901', 'carlos@teste.local')
       RETURNING id`,
      [tenantAlphaId]
    );
    customerAlphaId = custAlpha.rows[0].id;

    const vehAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'PAG1A01', 'BMW', '320i', 2023, 'Preta', 'sedan')
       RETURNING id`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = vehAlpha.rows[0].id;

    // Criar OS Alpha 1: R$ 500,00 total / final, R$ 0,00 pago
    const wo1Res = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 1, 'IN_PROGRESS', 50000, 0, 50000, 0)
       RETURNING id`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlpha1Id = wo1Res.rows[0].id;

    // Criar OS Alpha 2: R$ 1.000,00 total / final, R$ 0,00 pago
    const wo2Res = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 2, 'APPROVED', 100000, 0, 100000, 0)
       RETURNING id`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlpha2Id = wo2Res.rows[0].id;

    // 2. Setup Oficina Beta
    tenantBetaSlug = `beta-pay-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Oficina Mecânica', 'Beta Mecânica LTDA', $1, $2, '98.765.432/0001-11', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const userBetaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id`,
      [`gestor.${tenantBetaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = userBetaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );

    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      email: `gestor.${tenantBetaSlug}@carx.local`,
      tenantId: tenantBetaId,
      role: 'owner',
    });

    // Cliente e Veículo Beta
    const custBeta = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO customers (tenant_id, name, phone, document, email)
       VALUES ($1, 'Mariana Lima', '+5511988880002', '98765432109', 'mariana@teste.local')
       RETURNING id`,
      [tenantBetaId]
    );
    customerBetaId = custBeta.rows[0].id;

    const vehBeta = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'PAG2B02', 'Audi', 'A4', 2022, 'Branco', 'sedan')
       RETURNING id`,
      [tenantBetaId, customerBetaId]
    );
    vehicleBetaId = vehBeta.rows[0].id;

    const woBetaRes = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 1, 'IN_PROGRESS', 30000, 0, 30000, 0)
       RETURNING id`,
      [tenantBetaId, customerBetaId, vehicleBetaId]
    );
    workOrderBetaId = woBetaRes.rows[0].id;
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // TESTES DE PAGAMENTO E VALIDAÇÕES FINANCEIRAS
  // ============================================================================

  test('1. deve rejeitar pagamento com valor negativo ou zero com HTTP 400', async () => {
    // Valor zero
    const resZero = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha1Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        amountCents: 0,
        method: 'pix',
      },
    });
    assert.equal(resZero.statusCode, 400, 'Pagamento com valor zero deve retornar 400');

    // Valor negativo
    const resNeg = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha1Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        amountCents: -5000,
        method: 'pix',
      },
    });
    assert.equal(resNeg.statusCode, 400, 'Pagamento com valor negativo deve retornar 400');
  });

  test('2. deve rejeitar pagamento que excede o saldo devedor restante com HTTP 422', async () => {
    // OS 1 tem saldo total de R$ 500,00 (50000 cents). Tentativa de pagar R$ 500,01 (50001 cents)
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha1Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        amountCents: 50001,
        method: 'pix',
      },
    });

    assert.equal(res.statusCode, 422, 'Pagamento excedente deve retornar 422 Unprocessable Entity');
    const body = res.json();
    assert.match(body.message, /excede o saldo restante devedor/i);
  });

  test('3. TESTE DE CONCORRÊNCIA ANTI-RACE CONDITION: duas liquidações simultâneas de R$ 300 numa OS de R$ 500 devem aprovar 1 e recusar 1', async () => {
    // Ordem de Serviço Alpha 1 possui R$ 500,00 de saldo devedor.
    // Disparamos duas requisições simultâneas de R$ 300,00 (30000 cents) usando Promise.all.
    // No sistema legado, ambas passavam e geravam R$ 600,00 pagos (race condition).
    // No CarX com lock FOR UPDATE, uma é aceita e a outra é recusada com 422 por saldo insuficiente.
    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/work-orders/${workOrderAlpha1Id}/payments`,
        headers: {
          authorization: `Bearer ${ownerAlphaToken}`,
          'x-tenant-id': tenantAlphaId,
        },
        payload: {
          amountCents: 30000,
          method: 'pix',
          notes: 'Pagamento Concorrente Req 1',
        },
      }),
      app.inject({
        method: 'POST',
        url: `/work-orders/${workOrderAlpha1Id}/payments`,
        headers: {
          authorization: `Bearer ${ownerAlphaToken}`,
          'x-tenant-id': tenantAlphaId,
        },
        payload: {
          amountCents: 30000,
          method: 'credit_card',
          installments: 1,
          notes: 'Pagamento Concorrente Req 2',
        },
      }),
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    assert.deepEqual(statuses, [201, 422], 'Exatamente uma requisição deve ter sido aceita (201) e a concorrente recusada (422)');

    // Verificar se o paid_cents na OS é exatamente 30000 e não 60000
    const woRes = await tenantQuery<{ paid_cents: number }>(
      tenantAlphaId,
      'SELECT paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, workOrderAlpha1Id]
    );
    assert.equal(woRes.rows[0].paid_cents, 30000, 'Saldo pago na OS deve ser estritamente R$ 300,00');

    // Verificar se a OS possui evento PAYMENT_RECEIVED registrado na timeline
    const eventRes = await tenantQuery<{ event_type: string; notes: string }>(
      tenantAlphaId,
      'SELECT event_type, notes FROM work_order_events WHERE tenant_id = $1 AND work_order_id = $2;',
      [tenantAlphaId, workOrderAlpha1Id]
    );
    assert.equal(eventRes.rows.length, 1, 'Deve haver exatamente 1 evento de pagamento registrado');
    assert.equal(eventRes.rows[0].event_type, 'PAYMENT_RECEIVED');
  });

  test('4. deve liquidar o saldo restante da OS Alpha 1 (R$ 200) atingindo quitação total', async () => {
    // Saldo restante: 50000 - 30000 = 20000 cents
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha1Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        amountCents: 20000,
        method: 'cash',
        notes: 'Liquidação final em dinheiro',
      },
    });

    assert.equal(res.statusCode, 201);
    const payment = res.json();
    assert.equal(payment.amountCents, 20000);
    assert.equal(payment.method, 'cash');

    // Checar resumo financeiro
    const finRes = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderAlpha1Id}/financial`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(finRes.statusCode, 200);
    const fin = finRes.json();
    assert.equal(fin.totalCents, 50000);
    assert.equal(fin.paidCents, 50000);
    assert.equal(fin.remainingCents, 0);
    assert.equal(fin.isFullyPaid, true, 'OS deve constar como quitada (isFullyPaid = true)');
    assert.equal(fin.payments.length, 2, 'Deve conter os 2 pagamentos aprovados');
  });

  // ============================================================================
  // TESTES DE ESTORNO / REEMBOLSO DE PAGAMENTOS
  // ============================================================================

  let paymentToRefundId: string;

  test('5. deve registrar pagamento em OS Alpha 2 e estornar parcialmente com auditoria', async () => {
    // Registrar pagamento de R$ 600,00 na OS 2 (de R$ 1.000)
    const payRes = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha2Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        amountCents: 60000,
        method: 'pix',
        transactionReference: 'PIX-REF-ALPHA-600',
      },
    });
    assert.equal(payRes.statusCode, 201);
    paymentToRefundId = payRes.json().id;

    // Estorno parcial de R$ 200,00
    const refundRes = await app.inject({
      method: 'POST',
      url: `/payments/${paymentToRefundId}/refund`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        refundAmountCents: 20000,
        reason: 'Cliente cancelou serviço adicional de higienização',
      },
    });

    assert.equal(refundRes.statusCode, 200);
    const refunded = refundRes.json();
    assert.equal(refunded.status, 'partially_refunded');
    assert.equal(refunded.refundedAmountCents, 20000);
    assert.equal(refunded.refundReason, 'Cliente cancelou serviço adicional de higienização');

    // Verificar que paid_cents na OS foi abatido: 60000 - 20000 = 40000
    const woRes = await tenantQuery<{ paid_cents: number }>(
      tenantAlphaId,
      'SELECT paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, workOrderAlpha2Id]
    );
    assert.equal(woRes.rows[0].paid_cents, 40000, 'Saldo pago na OS deve ser reduzido para R$ 400,00');

    // Verificar trilha de auditoria imutável do estorno
    const auditRes = await tenantQuery<{ action: string; new_values: any }>(
      tenantAlphaId,
      `SELECT action, new_values FROM audit_logs 
       WHERE tenant_id = $1 AND action = 'PAYMENT_REFUNDED' AND entity_id = $2;`,
      [tenantAlphaId, paymentToRefundId]
    );
    assert.equal(auditRes.rows.length, 1, 'Deve registrar log de auditoria imutável PAYMENT_REFUNDED');
  });

  test('6. deve estornar o valor restante do pagamento atingindo status "refunded"', async () => {
    // Restam R$ 400,00 reembolsáveis neste pagamento
    const refundRes = await app.inject({
      method: 'POST',
      url: `/payments/${paymentToRefundId}/refund`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        reason: 'Estorno final do restante do pagamento',
      },
    });

    assert.equal(refundRes.statusCode, 200);
    const refunded = refundRes.json();
    assert.equal(refunded.status, 'refunded', 'Status deve passar para refunded integralmente');
    assert.equal(refunded.refundedAmountCents, 60000);

    // Tentativa de estornar novamente após quitação total de estorno deve falhar com 400
    const failedAgain = await app.inject({
      method: 'POST',
      url: `/payments/${paymentToRefundId}/refund`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        reason: 'Tentativa indevida de novo estorno',
      },
    });
    assert.equal(failedAgain.statusCode, 400);

    // OS 2 paid_cents deve ser 0 agora
    const woRes = await tenantQuery<{ paid_cents: number }>(
      tenantAlphaId,
      'SELECT paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, workOrderAlpha2Id]
    );
    assert.equal(woRes.rows[0].paid_cents, 0, 'Saldo pago na OS 2 voltou para 0');
  });

  // ============================================================================
  // TESTES DE ADIANTAMENTOS E SINAL (DEPOSITS)
  // ============================================================================

  let heldDepositId: string;

  test('7. deve criar um adiantamento/sinal (deposit) retido com status "held"', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/deposits',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlphaId,
        amountCents: 35000, // R$ 350,00 de sinal
        method: 'pix',
        notes: 'Sinal para reserva de horário e insumos cerâmicos',
      },
    });

    assert.equal(res.statusCode, 201);
    const deposit = res.json();
    assert.equal(deposit.amountCents, 35000);
    assert.equal(deposit.status, 'held');
    assert.equal(deposit.customerId, customerAlphaId);
    heldDepositId = deposit.id;
  });

  test('8. deve aplicar o sinal retido à OS Alpha 2 abatendo o saldo devedor', async () => {
    // OS Alpha 2: Total R$ 1000,00, Saldo devedor R$ 1000,00
    const applyRes = await app.inject({
      method: 'POST',
      url: `/deposits/${heldDepositId}/apply`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlpha2Id,
      },
    });

    assert.equal(applyRes.statusCode, 200);
    const body = applyRes.json();
    assert.equal(body.deposit.status, 'applied');
    assert.equal(body.deposit.appliedToWorkOrderId, workOrderAlpha2Id);

    // Verificar que paid_cents na OS 2 agora é 35000 (R$ 350,00)
    const woRes = await tenantQuery<{ paid_cents: number }>(
      tenantAlphaId,
      'SELECT paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, workOrderAlpha2Id]
    );
    assert.equal(woRes.rows[0].paid_cents, 35000);

    // Verificar se foi gerado o registro unificado em payments para conciliação contábil
    const payRes = await tenantQuery<{ amount_cents: number }>(
      tenantAlphaId,
      `SELECT amount_cents FROM payments 
       WHERE tenant_id = $1 AND work_order_id = $2 AND status = 'approved' AND notes LIKE '%Sinal%';`,
      [tenantAlphaId, workOrderAlpha2Id]
    );
    assert.equal(payRes.rows.length, 1);
    assert.equal(payRes.rows[0].amount_cents, 35000);

    // Tentativa de aplicar o mesmo sinal novamente deve ser rejeitada com HTTP 400
    const reapplyRes = await app.inject({
      method: 'POST',
      url: `/deposits/${heldDepositId}/apply`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlpha2Id,
      },
    });
    assert.equal(reapplyRes.statusCode, 400);
  });

  // ============================================================================
  // TESTES DE ISOLAMENTO MULTI-TENANT (RLS)
  // ============================================================================

  test('9. Oficina Beta NÃO pode registrar pagamento na OS da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlpha2Id}/payments`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        amountCents: 10000,
        method: 'pix',
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina Beta não pode ver a OS de Alpha (retorna 404 Not Found)');
  });

  test('10. Oficina Beta NÃO pode consultar resumo financeiro de OS da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderAlpha2Id}/financial`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina Beta não pode consultar dados financeiros da OS de Alpha');
  });

  test('11. Oficina Beta NÃO pode estornar pagamento da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/payments/${paymentToRefundId}/refund`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        reason: 'Tentativa indevida de estorno entre tenants',
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina Beta não pode acessar pagamento de Alpha para estorno');
  });

  test('12. Oficina Beta NÃO pode aplicar sinal da Oficina Alpha em suas próprias ordens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/deposits/${heldDepositId}/apply`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        workOrderId: workOrderBetaId,
      },
    });

    assert.equal(res.statusCode, 404, 'Sinal de outro tenant não existe na visão do tenant Beta');
  });
});
