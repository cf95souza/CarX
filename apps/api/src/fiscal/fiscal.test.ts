import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.10 — Módulo Fiscal (NFS-e Automática ao Liquidar OS)', () => {
  let app: any;
  let tenantProId: string;
  let tenantBasicId: string;
  let proToken: string;
  let basicToken: string;
  let workOrderProId: string;
  let customerProId: string;
  let vehicleProId: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // Garantir que o plano profissional contenha a feature 'nfse'
    await tenantQuery(
      null,
      `UPDATE plans 
       SET features = features || '["nfse"]'::jsonb
       WHERE slug = 'profissional' AND NOT (features @> '["nfse"]'::jsonb);`,
      [],
      { bypassRls: true }
    );

    // 1. Criar Tenant Pro (com feature nfse)
    const tPro = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       SELECT 'Fiscal Auto Care Pro', 'Fiscal Auto Care Pro LTDA', 'fiscal@pro.com', '11999990001', $1, 'active', id
       FROM plans WHERE slug = 'profissional' LIMIT 1
       RETURNING id;`,
      [`fiscal-pro-${Date.now()}`],
      { bypassRls: true }
    );
    tenantProId = tPro.rows[0].id;

    // 2. Criar Tenant Básico (sem feature nfse)
    const tBasic = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       SELECT 'Oficina Basica Simples', 'Oficina Basica LTDA', 'basica@simples.com', '11999990002', $1, 'active', id
       FROM plans WHERE slug = 'essencial' LIMIT 1
       RETURNING id;`,
      [`fiscal-basic-${Date.now()}`],
      { bypassRls: true }
    );
    tenantBasicId = tBasic.rows[0].id;

    // 3. Criar Usuários e Tokens
    const pwdHash = await hashPassword('Admin@123456');

    const uPro = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Pro Fiscal', $1, $2) RETURNING id;`,
      [`gestor_pro_${Date.now()}@fiscal.com`, pwdHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner');`,
      [tenantProId, uPro.rows[0].id],
      { bypassRls: true }
    );
    proToken = signJwt({
      userId: uPro.rows[0].id,
      tenantId: tenantProId,
      email: `gestor_pro@fiscal.com`,
      role: 'owner',
      permissions: ['*'],
    });

    const uBasic = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Basico', $1, $2) RETURNING id;`,
      [`gestor_basic_${Date.now()}@fiscal.com`, pwdHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner');`,
      [tenantBasicId, uBasic.rows[0].id],
      { bypassRls: true }
    );
    basicToken = signJwt({
      userId: uBasic.rows[0].id,
      tenantId: tenantBasicId,
      email: `gestor_basic@fiscal.com`,
      role: 'owner',
      permissions: ['*'],
    });

    // 4. Criar Cliente e Veículo no Tenant Pro
    const cRes = await tenantQuery<{ id: string }>(
      tenantProId,
      `INSERT INTO customers (tenant_id, name, email, phone, document)
       VALUES ($1, 'Marcelo Empresário', 'marcelo@empresa.com.br', '11988884444', '12.345.678/0001-90')
       RETURNING id;`,
      [tenantProId]
    );
    customerProId = cRes.rows[0].id;

    const vRes = await tenantQuery<{ id: string }>(
      tenantProId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, size_class)
       VALUES ($1, $2, 'FSC9B88', 'Porsche', 'Cayenne GTS', 'suv')
       RETURNING id;`,
      [tenantProId, customerProId]
    );
    vehicleProId = vRes.rows[0].id;

    // 5. Criar Ordem de Serviço no Tenant Pro
    const woRes = await tenantQuery<{ id: string }>(
      tenantProId,
      `INSERT INTO work_orders (
        tenant_id, customer_id, vehicle_id, os_number, status, progress,
        total_cents, discount_cents, final_cents, paid_cents
      ) VALUES ($1, $2, $3, 9001, 'READY', 90, 850000, 50000, 800000, 800000)
      RETURNING id;`,
      [tenantProId, customerProId, vehicleProId]
    );
    workOrderProId = woRes.rows[0].id;

    // Inserir item na OS
    await tenantQuery(
      tenantProId,
      `INSERT INTO work_order_items (
        tenant_id, work_order_id, name, category, quantity, unit_price_cents, total_cents
      ) VALUES ($1, $2, 'PPF Frontal e Proteção Cerâmica', 'PPF', 1, 850000, 850000);`,
      [tenantProId, workOrderProId]
    );
  });

  after(async () => {
    await app.close();
  });

  it('1. Deve configurar dados fiscais da oficina com criptografia segura', async () => {
    const payload = {
      environment: 'sandbox',
      provider: 'focus_nfe',
      apiToken: 'test_focus_token_secret_xyz123',
      companyLegalName: 'Fiscal Auto Care Pro LTDA',
      companyCnpj: '12.345.678/0001-90',
      municipalInscription: '12345678-9',
      taxRegime: 'simples_nacional',
      defaultServiceCode: '14.01',
      cnaeCode: '4520-0/05',
      defaultIssRateBasisPoints: 200,
      issRetentionDefault: false,
      autoIssueOnDelivery: true,
      autoIssueOnPayment: true,
      sendEmailToCustomer: true,
      rpsSeries: '1',
    };

    const res = await app.inject({
      method: 'PUT',
      url: '/fiscal/settings',
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
      payload,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.companyLegalName, 'Fiscal Auto Care Pro LTDA');
    assert.strictEqual(body.companyCnpj, '12.345.678/0001-90');
    assert.strictEqual(body.hasApiToken, true); // O token nunca deve ser retornado em texto claro
    assert.strictEqual(body.hasCertificate, false);
    assert.strictEqual(body.defaultIssRateBasisPoints, 200);
    assert.strictEqual(body.autoIssueOnDelivery, true);

    // Conferir GET /fiscal/settings
    const getRes = await app.inject({
      method: 'GET',
      url: '/fiscal/settings',
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
    });
    assert.strictEqual(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.strictEqual(getBody.companyCnpj, '12.345.678/0001-90');
    assert.strictEqual(getBody.hasApiToken, true);
  });

  it('2. Deve bloquear emissão de NFS-e para lojas no plano Básico (HTTP 403 Forbidden)', async () => {
    // Criar uma OS rápida no plano básico
    const woBasic = await tenantQuery<{ id: string }>(
      tenantBasicId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents)
       VALUES ($1, $2, $3, 1001, 'DELIVERED', 50000, 50000) RETURNING id;`,
      [tenantBasicId, customerProId, vehicleProId]
    );

    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${woBasic.rows[0].id}/issue-nfse`,
      headers: {
        authorization: `Bearer ${basicToken}`,
        'x-tenant-id': tenantBasicId,
      },
      payload: {},
    });

    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.statusCode, 403);
    assert.match(body.message, /não está incluída no seu plano/i);
  });

  it('3. Deve emitir NFS-e com sucesso para a OS no plano Pro (HTTP 201 Created)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderProId}/issue-nfse`,
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
      payload: {
        issRateBasisPoints: 200,
        customDescription: 'Serviço especializado de PPF Frontal completo e proteção cerâmica 9H.',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.workOrderId, workOrderProId);
    assert.strictEqual(body.status, 'authorized');
    assert.strictEqual(body.grossAmountCents, 800000);
    assert.strictEqual(body.netAmountCents, 800000);
    assert.strictEqual(body.issAmountCents, 16000); // 2% de R$ 8.000,00 = R$ 160,00
    assert.strictEqual(body.rpsNumber, 1);
    assert.ok(body.invoiceNumber, 'Deve conter número de NFS-e gerado');
    assert.ok(body.verificationCode, 'Deve conter código de verificação');
    assert.ok(body.pdfUrl, 'Deve conter URL do DANFSE em PDF');
    assert.ok(body.xmlUrl, 'Deve conter URL do XML da nota');

    // Verificar se a consulta vinculada à OS retorna a mesma nota
    const getInvRes = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderProId}/fiscal-invoice`,
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
    });
    assert.strictEqual(getInvRes.statusCode, 200);
    const getInvBody = JSON.parse(getInvRes.body);
    assert.strictEqual(getInvBody.id, body.id);
    assert.strictEqual(getInvBody.invoiceNumber, body.invoiceNumber);
  });

  it('4. Deve impedir emissão duplicada de NFS-e para a mesma OS (Idempotência / HTTP 409 Conflict)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderProId}/issue-nfse`,
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
      payload: {},
    });

    assert.strictEqual(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.statusCode, 409);
    assert.match(body.message, /já possui uma NFS-e com status/i);
  });

  it('5. Deve processar Webhook fiscal atualizando status da nota com resiliência', async () => {
    const testWebhookRef = `foc_ref_webhook_${Date.now()}`;

    // 1. Criar uma OS e nota em estado 'processing'
    const wo2Res = await tenantQuery<{ id: string }>(
      tenantProId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents)
       VALUES ($1, $2, $3, 9002, 'READY', 250000, 250000) RETURNING id;`,
      [tenantProId, customerProId, vehicleProId]
    );

    const inv2Res = await tenantQuery<{ id: string }>(
      tenantProId,
      `INSERT INTO fiscal_invoices (
        tenant_id, work_order_id, rps_number, rps_series, provider_invoice_id,
        status, gross_amount_cents, net_amount_cents, iss_rate_basis_points,
        iss_amount_cents, description
      ) VALUES ($1, $2, 2, '1', $3, 'processing', 250000, 250000, 200, 5000, 'Serviço pendente')
      RETURNING id;`,
      [tenantProId, wo2Res.rows[0].id, testWebhookRef]
    );

    // 2. Disparar Webhook simulado da Focus NFe com evento de autorização
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/webhooks/fiscal',
      payload: {
        referencia: testWebhookRef,
        status: 'autorizado',
        numero: '2026000099',
        codigo_verificacao: 'WH-AUTH-OK',
        caminho_xml_nota_fiscal: 'https://storage.carx.com.br/xml/2026000099.xml',
        caminho_danfe: 'https://storage.carx.com.br/danfse/2026000099.pdf',
      },
    });

    assert.strictEqual(webhookRes.statusCode, 200);
    const webhookBody = JSON.parse(webhookRes.body);
    assert.strictEqual(webhookBody.handled, true);
    assert.strictEqual(webhookBody.status, 'authorized');

    // 3. Confirmar que a nota no banco foi atualizada para authorized
    const checkRes = await tenantQuery<any>(
      tenantProId,
      `SELECT status, invoice_number, verification_code FROM fiscal_invoices WHERE id = $1;`,
      [inv2Res.rows[0].id]
    );
    assert.strictEqual(checkRes.rows[0].status, 'authorized');
    assert.strictEqual(checkRes.rows[0].invoice_number, '2026000099');
    assert.strictEqual(checkRes.rows[0].verification_code, 'WH-AUTH-OK');
  });

  it('6. Deve cancelar NFS-e autorizada com justificativa legal obrigatória', async () => {
    // Buscar a primeira nota autorizada emitida
    const invRes = await tenantQuery<{ id: string }>(
      tenantProId,
      `SELECT id FROM fiscal_invoices WHERE tenant_id = $1 AND status = 'authorized' LIMIT 1;`,
      [tenantProId]
    );
    const invoiceId = invRes.rows[0].id;

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/fiscal/invoices/${invoiceId}/cancel`,
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
      payload: {
        reason: 'Cliente solicitou estorno por cancelamento do serviço automotivo.',
      },
    });

    assert.strictEqual(cancelRes.statusCode, 200);
    const cancelBody = JSON.parse(cancelRes.body);
    assert.strictEqual(cancelBody.status, 'cancelled');
    assert.strictEqual(cancelBody.cancelReason, 'Cliente solicitou estorno por cancelamento do serviço automotivo.');
    assert.ok(cancelBody.cancelledAt);
  });

  it('7. Deve garantir isolamento multi-tenant estrito na listagem e acesso a notas', async () => {
    // Tenant Básico tenta listar notas fiscais
    const listRes = await app.inject({
      method: 'GET',
      url: '/fiscal/invoices',
      headers: {
        authorization: `Bearer ${basicToken}`,
        'x-tenant-id': tenantBasicId,
      },
    });

    assert.strictEqual(listRes.statusCode, 200);
    const listBody = JSON.parse(listRes.body);
    assert.strictEqual(listBody.total, 0, 'Tenant básico não deve ver nenhuma nota do tenant Pro');

    // Tenant Pro lista suas notas
    const proListRes = await app.inject({
      method: 'GET',
      url: '/fiscal/invoices',
      headers: {
        authorization: `Bearer ${proToken}`,
        'x-tenant-id': tenantProId,
      },
    });

    assert.strictEqual(proListRes.statusCode, 200);
    const proListBody = JSON.parse(proListRes.body);
    assert.ok(proListBody.total >= 2, 'Tenant Pro deve ver suas próprias notas');
  });
});
