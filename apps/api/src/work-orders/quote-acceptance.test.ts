import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T6.1 — Orçamento Digital com Aceite Online & Sinal Pix', () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testCustomerId: string;
  let testVehicleId: string;
  let quoteNoDepositToken: string;
  let quoteNoDepositId: string;
  let quoteWithDepositToken: string;
  let quoteWithDepositId: string;

  before(async () => {
    try {
      app = await buildServer();
      await app.ready();

      // 1. Criar tenant de teste isolado
      const timestamp = Date.now();
      const slug = `autodetail-test-${timestamp}`;
      const tenantRes = await tenantQuery<any>(
        null,
        `
        INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, settings)
        VALUES ('Oficina Aceite LTDA', 'AutoDetail Pro', $1, 'contato@autodetail.test', '11.222.333/0001-44', '11988887777', 'active', '{"pix_key": "pix@autodetail.test"}'::jsonb)
        RETURNING id;
        `,
        [slug],
        { bypassRls: true }
      );
      testTenantId = tenantRes.rows[0].id;

      // Criar branding
      await tenantQuery(
        testTenantId,
        `
        INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, whatsapp_phone)
        VALUES ($1, '#C8F52E', '#0E1116', '11988887777')
        ON CONFLICT (tenant_id) DO UPDATE SET whatsapp_phone = '11988887777';
        `,
        [testTenantId]
      );

      // 2. Criar cliente e veículo
      const custRes = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO customers (tenant_id, name, email, phone, document)
        VALUES ($1, 'Carlos Alberto Silva', 'carlos@teste.com', '11977776666', '12345678909')
        RETURNING id;
        `,
        [testTenantId]
      );
      testCustomerId = custRes.rows[0].id;

      const vehRes = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
        VALUES ($1, $2, 'CAR6A10', 'Toyota', 'Corolla Cross', 2024, 'Preto', 'SUV')
        RETURNING id;
        `,
        [testTenantId, testCustomerId]
      );
      testVehicleId = vehRes.rows[0].id;

      // 3. Orçamento 1: Sem sinal exigido (deposit_required_cents = 0)
      const quote1Res = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO work_orders (
          tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, deposit_required_cents
        ) VALUES ($1, $2, $3, 101, 'QUOTE', 80000, 5000, 75000, 0)
        RETURNING id, tracking_token;
        `,
        [testTenantId, testCustomerId, testVehicleId]
      );
      quoteNoDepositId = quote1Res.rows[0].id;
      quoteNoDepositToken = quote1Res.rows[0].tracking_token;

      // Inserir item no orçamento 1
      await tenantQuery(
        testTenantId,
        `
        INSERT INTO work_order_items (tenant_id, work_order_id, name, quantity, unit_price_cents, total_cents)
        VALUES ($1, $2, 'Vitrificação de Pintura 9H', 1, 80000, 75000);
        `,
        [testTenantId, quoteNoDepositId]
      );

      // 4. Orçamento 2: Com sinal exigido de R$ 100,00 (deposit_required_cents = 10000)
      const quote2Res = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO work_orders (
          tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, deposit_required_cents
        ) VALUES ($1, $2, $3, 102, 'QUOTE', 150000, 0, 150000, 10000)
        RETURNING id, tracking_token;
        `,
        [testTenantId, testCustomerId, testVehicleId]
      );
      quoteWithDepositId = quote2Res.rows[0].id;
      quoteWithDepositToken = quote2Res.rows[0].tracking_token;

      await tenantQuery(
        testTenantId,
        `
        INSERT INTO work_order_items (tenant_id, work_order_id, name, quantity, unit_price_cents, total_cents)
        VALUES ($1, $2, 'PPF Frontal Completo', 1, 150000, 150000);
        `,
        [testTenantId, quoteWithDepositId]
      );
    } catch (err: any) {
      console.error('FATAL BEFORE ERROR:', err);
      throw err;
    }
  });

  after(async () => {
    if (testTenantId) {
      await tenantQuery(
        null,
        'DELETE FROM tenants WHERE id = $1;',
        [testTenantId],
        { isSuperadmin: true }
      );
    }
    await app.close();
  });

  test('1. Deve consultar orçamento público sem JWT e mascarar telefone do cliente (LGPD)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/quotes/${quoteNoDepositToken}`,
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.osNumber, 101);
    assert.equal(body.status, 'QUOTE');
    assert.equal(body.tenant.name, 'AutoDetail Pro');
    assert.equal(body.customer.name, 'Carlos Alberto Silva');
    assert.ok(body.customer.phoneMasked.includes('*****'));
    assert.equal(body.vehicle.plate, 'CAR6A10');
    assert.equal(body.vehicle.model, 'Corolla Cross');
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].name, 'Vitrificação de Pintura 9H');
    assert.equal(body.finalCents, 75000);
    assert.equal(body.depositRequiredCents, 0);
  });

  test('2. Deve rejeitar aceite se o nome de assinatura for omitido ou curto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/quotes/${quoteNoDepositToken}/accept`,
      payload: {
        signatureName: 'Al',
        termsAccepted: true,
      },
    });

    assert.equal(res.statusCode, 400);
    assert.ok(res.json().message.includes('nome completo é obrigatório'));
  });

  test('3. Deve aceitar orçamento sem sinal, avançando direto para APPROVED e auditando IP e Assinatura', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/quotes/${quoteNoDepositToken}/accept`,
      headers: {
        'x-forwarded-for': '187.65.43.21',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      },
      payload: {
        signatureName: 'Carlos Alberto Silva',
        termsAccepted: true,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.status, WorkOrderStatus.APPROVED);
    assert.equal(body.depositRequiredCents, 0);

    // Verificar persistência no banco
    const checkDb = await tenantQuery<any>(
      testTenantId,
      'SELECT status, accepted_signature_name, accepted_ip, accepted_user_agent FROM work_orders WHERE id = $1;',
      [quoteNoDepositId]
    );
    assert.equal(checkDb.rows[0].status, 'APPROVED');
    assert.equal(checkDb.rows[0].accepted_signature_name, 'Carlos Alberto Silva');
    assert.equal(checkDb.rows[0].accepted_ip, '187.65.43.21');
    assert.ok(checkDb.rows[0].accepted_user_agent.includes('iPhone'));
  });

  test('4. Deve aceitar orçamento COM SINAL, gerando código PIX padrão EMV e QR Code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/quotes/${quoteWithDepositToken}/accept`,
      headers: {
        'x-forwarded-for': '201.12.34.56',
        'user-agent': 'Chrome/120.0.0.0',
      },
      payload: {
        signatureName: 'Carlos Alberto Silva',
        termsAccepted: true,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.depositRequiredCents, 10000); // R$ 100,00
    assert.ok(body.depositPixCode);
    assert.ok(body.depositPixCode.includes('000201')); // Padrão Bacen
    assert.ok(body.depositPixCode.includes('br.gov.bcb.pix'));
    assert.ok(body.depositPixQrBase64.includes('api.qrserver.com') || body.depositPixQrBase64.startsWith('data:image/'));

    // Checar banco
    const checkDb = await tenantQuery<any>(
      testTenantId,
      'SELECT deposit_pix_code, deposit_pix_qr_base64, accepted_at FROM work_orders WHERE id = $1;',
      [quoteWithDepositId]
    );
    assert.equal(checkDb.rows[0].deposit_pix_code, body.depositPixCode);
    assert.ok(checkDb.rows[0].accepted_at !== null);
  });

  test('5. Deve confirmar e liquidar o sinal Pix gerado, incrementando paid_cents e gravando payments', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/quotes/${quoteWithDepositToken}/pix-confirm`,
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.paidCents, 10000);

    // Verificar se o pagamento e o depósito foram criados no banco
    const payRes = await tenantQuery<any>(
      testTenantId,
      'SELECT amount_cents, method, status FROM payments WHERE work_order_id = $1;',
      [quoteWithDepositId]
    );
    assert.equal(payRes.rows.length, 1);
    assert.equal(payRes.rows[0].amount_cents, 10000);
    assert.equal(payRes.rows[0].method, 'pix');
    assert.equal(payRes.rows[0].status, 'approved');

    // Verificar se a OS virou APPROVED
    const woRes = await tenantQuery<any>(
      testTenantId,
      'SELECT status, paid_cents, deposit_paid_at FROM work_orders WHERE id = $1;',
      [quoteWithDepositId]
    );
    assert.equal(woRes.rows[0].status, 'APPROVED');
    assert.equal(woRes.rows[0].paid_cents, 10000);
    assert.ok(woRes.rows[0].deposit_paid_at !== null);
  });

  test('6. Deve permitir recusar uma proposta justificando o motivo', async () => {
    const quote3Res = await tenantQuery<any>(
      testTenantId,
      `
      INSERT INTO work_orders (
        tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents
      ) VALUES ($1, $2, $3, 103, 'QUOTE', 20000, 0, 20000)
      RETURNING tracking_token, id;
      `,
      [testTenantId, testCustomerId, testVehicleId]
    );
    const token = quote3Res.rows[0].tracking_token;
    const woId = quote3Res.rows[0].id;

    const res = await app.inject({
      method: 'POST',
      url: `/public/quotes/${token}/reject`,
      payload: {
        reason: 'Achei o valor elevado para o momento.',
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().success, true);

    const checkDb = await tenantQuery<any>(
      testTenantId,
      'SELECT status, cancel_reason FROM work_orders WHERE id = $1;',
      [woId]
    );
    assert.equal(checkDb.rows[0].status, 'CANCELED');
    assert.ok(checkDb.rows[0].cancel_reason.includes('Achei o valor elevado'));
  });
});
