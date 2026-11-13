import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.3 — Pix Integrado para Ordens de Serviço (Baixa Instantânea no Caixa via Webhook)', () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testCustomerId: string;
  let testVehicleId: string;
  let authToken: string;

  let orderOpenId: string;
  let orderReadyId: string;

  before(async () => {
    try {
      app = await buildServer();
      await app.ready();

      // 1. Criar tenant de teste isolado
      const timestamp = Date.now();
      const slug = `pix-test-${timestamp}`;
      const tenantRes = await tenantQuery<any>(
        null,
        `
        INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, settings)
        VALUES ('Detailer Pix LTDA', 'CarX Detailer Pix', $1, 'caixa@pixdetailer.test', '88.777.666/0001-55', '11988889999', 'active', '{"pix_key": "pix@detailer.test", "pix_key_type": "email", "city": "Sao Paulo"}'::jsonb)
        RETURNING id;
        `,
        [slug],
        { bypassRls: true }
      );
      testTenantId = tenantRes.rows[0].id;

      // 2. Criar cliente e veículo
      const custRes = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO customers (tenant_id, name, phone, email)
        VALUES ($1, 'Marcelo Siqueira', '11987654321', 'marcelo@cliente.test')
        RETURNING id;
        `,
        [testTenantId]
      );
      testCustomerId = custRes.rows[0].id;

      const vehRes = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
        VALUES ($1, $2, 'PIX3E14', 'BYD', 'Song Plus DM-i', 'Cinza', 2025, 'suv')
        RETURNING id;
        `,
        [testTenantId, testCustomerId]
      );
      testVehicleId = vehRes.rows[0].id;

      // 3. Criar OS 1: Aberta em execução com total R$ 600,00 (60000 cents), 0 pago
      const o1Res = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO work_orders (
          tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents
        ) VALUES ($1, $2, $3, 301, 'IN_PROGRESS', 60000, 0, 60000, 0)
        RETURNING id;
        `,
        [testTenantId, testCustomerId, testVehicleId]
      );
      orderOpenId = o1Res.rows[0].id;

      // 4. Criar OS 2: Pronta para retirada (READY) com total R$ 350,00 e sinal pago de R$ 50,00 (saldo restante: R$ 300,00)
      const o2Res = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO work_orders (
          tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents
        ) VALUES ($1, $2, $3, 302, 'READY', 350000, 0, 350000, 50000)
        RETURNING id;
        `,
        [testTenantId, testCustomerId, testVehicleId]
      );
      orderReadyId = o2Res.rows[0].id;

      // 5. Gerar token JWT de autenticação
      authToken = signJwt({
        userId: 'usr-caixa-pix',
        tenantId: testTenantId,
        role: 'owner',
      });
    } catch (err) {
      console.error('FATAL BEFORE ERROR:', err);
      throw err;
    }
  });

  after(async () => {
    if (testTenantId) {
      await tenantQuery(null, `DELETE FROM payments WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM work_order_events WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM work_orders WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM vehicles WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM customers WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM tenants WHERE id = $1`, [testTenantId], { bypassRls: true });
    }
    if (app) {
      await app.close();
    }
  });

  let generatedTxid: string;

  test('1. Deve gerar cobrança Pix dinâmica para OS calculando automaticamente saldo restante', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/work-orders/${orderOpenId}/pix-charge`,
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {},
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);

    assert.equal(body.workOrderId, orderOpenId);
    assert.equal(body.osNumber, 301);
    assert.equal(body.amountCents, 60000);
    assert.equal(body.remainingBalanceCents, 60000);
    assert.ok(body.pixCode.startsWith('000201'), 'Pix Copia e Cola deve ser EMV BACEN');
    assert.ok(body.pixQrBase64.startsWith('data:image/png;base64,'));
    assert.ok(body.txid.startsWith('CX'));

    generatedTxid = body.txid;

    // Verificar se registrou na tabela payments com status pending
    const checkRes = await tenantQuery<any>(
      testTenantId,
      `SELECT status, amount_cents FROM payments WHERE transaction_reference = $1;`,
      [generatedTxid]
    );
    assert.equal(checkRes.rows.length, 1);
    assert.equal(checkRes.rows[0].status, 'pending');
    assert.equal(checkRes.rows[0].amount_cents, 60000);
  });

  test('2. Deve consultar status da cobrança Pix ainda como pendente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/work-orders/${orderOpenId}/pix-status/${generatedTxid}`,
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);

    assert.equal(body.status, 'pending');
    assert.equal(body.isFullyPaid, false);
    assert.equal(body.paidCents, 0);
  });

  test('3. Deve liquidar instantaneamente o pagamento via webhook e atualizar saldo da OS', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pix/confirm',
      payload: {
        txid: generatedTxid,
        payerName: 'Marcelo Siqueira',
        e2eId: 'E1823612020261112113001',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);

    assert.equal(body.status, 'approved');
    assert.equal(body.paidCents, 60000);
    assert.equal(body.isFullyPaid, true);
    assert.ok(body.paidAt);

    // Verificar no banco
    const orderRes = await tenantQuery<any>(
      testTenantId,
      `SELECT paid_cents, status FROM work_orders WHERE id = $1;`,
      [orderOpenId]
    );
    assert.equal(orderRes.rows[0].paid_cents, 60000);
  });

  test('4. Deve garantir idempotência estrita (webhook repetido não duplica saldo)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/pix/confirm',
      payload: {
        txid: generatedTxid,
        payerName: 'Marcelo Siqueira',
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);

    assert.equal(body.status, 'approved');
    assert.equal(body.paidCents, 60000); // Continua 60000, não vira 120000!

    const orderRes = await tenantQuery<any>(
      testTenantId,
      `SELECT paid_cents FROM work_orders WHERE id = $1;`,
      [orderOpenId]
    );
    assert.equal(orderRes.rows[0].paid_cents, 60000);
  });

  test('5. Deve rejeitar nova cobrança Pix se a OS já estiver 100% quitada', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/work-orders/${orderOpenId}/pix-charge`,
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {},
    });

    assert.equal(response.statusCode, 422);
    const body = JSON.parse(response.body);
    assert.match(body.message, /totalmente quitada/i);
  });

  test('6. Deve transicionar OS de READY para DELIVERED ao quitar saldo restante na retirada', async () => {
    // OS 302: Total 3500,00, Pago 500,00. Saldo restante: 3000,00
    const chargeRes = await app.inject({
      method: 'POST',
      url: `/work-orders/${orderReadyId}/pix-charge`,
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {},
    });

    assert.equal(chargeRes.statusCode, 201);
    const charge = JSON.parse(chargeRes.body);
    assert.equal(charge.amountCents, 300000); // 3000,00 restantes

    // Liquidação via Webhook no caixa
    const confirmRes = await app.inject({
      method: 'POST',
      url: '/webhooks/pix/confirm',
      payload: {
        txid: charge.txid,
        payerName: 'Cliente Caixa',
      },
    });

    assert.equal(confirmRes.statusCode, 200);

    // Verificar se transicionou automaticamente para DELIVERED (entregue)
    const checkOrder = await tenantQuery<any>(
      testTenantId,
      `SELECT status, paid_cents, delivered_at FROM work_orders WHERE id = $1;`,
      [orderReadyId]
    );
    assert.equal(checkOrder.rows[0].status, 'DELIVERED');
    assert.equal(checkOrder.rows[0].paid_cents, 350000);
    assert.ok(checkOrder.rows[0].delivered_at);
  });
});

