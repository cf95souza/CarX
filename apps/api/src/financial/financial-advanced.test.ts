import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.11 — DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlpha: string;
  let tokenBeta: string;
  let technicianAlphaId: string;
  let categoryAluguelId: string;
  let billAluguelId: string;
  let workOrderAlphaId: string;

  before(async () => {
    try {
    app = buildServer();
    await app.ready();

    // 1. Criar Tenant Alpha
    const tAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       SELECT 'Alpha Garage Detailing', 'Alpha Garage LTDA', 'alpha@garage.com', '11999990111', $1, 'active', id
       FROM plans WHERE slug = 'profissional' LIMIT 1
       RETURNING id;`,
      [`alpha-dre-${Date.now()}`],
      { bypassRls: true }
    );
    tenantAlphaId = tAlpha.rows[0].id;

    // 2. Criar Tenant Beta
    const tBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       SELECT 'Beta Car Detail', 'Beta Car LTDA', 'beta@cardetail.com', '11999990222', $1, 'active', id
       FROM plans WHERE slug = 'profissional' LIMIT 1
       RETURNING id;`,
      [`beta-dre-${Date.now()}`],
      { bypassRls: true }
    );
    tenantBetaId = tBeta.rows[0].id;

    // 3. Criar Usuários, Técnicos e Tokens
    const pwdHash = await hashPassword('Admin@123456');

    // Gestor Alpha
    const uAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2) RETURNING id;`,
      [`gestor_alpha_${Date.now()}@alpha.com`, pwdHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner');`,
      [tenantAlphaId, uAlpha.rows[0].id],
      { bypassRls: true }
    );
    tokenAlpha = signJwt({
      userId: uAlpha.rows[0].id,
      tenantId: tenantAlphaId,
      email: 'gestor@alpha.com',
      role: 'owner',
      permissions: ['*'],
    });

    // Técnico Alpha
    const techAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Técnico Lucas PPF', $1, $2) RETURNING id;`,
      [`lucas_tech_${Date.now()}@alpha.com`, pwdHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'tecnico');`,
      [tenantAlphaId, techAlpha.rows[0].id],
      { bypassRls: true }
    );
    technicianAlphaId = techAlpha.rows[0].id;

    // Gestor Beta
    const uBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2) RETURNING id;`,
      [`gestor_beta_${Date.now()}@beta.com`, pwdHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner');`,
      [tenantBetaId, uBeta.rows[0].id],
      { bypassRls: true }
    );
    tokenBeta = signJwt({
      userId: uBeta.rows[0].id,
      tenantId: tenantBetaId,
      email: 'gestor@beta.com',
      role: 'owner',
      permissions: ['*'],
    });

    // 4. Criar dados de suporte para OS Alpha (Cliente, Veículo, OS)
    const custAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, document, email, phone)
       VALUES ($1, 'Cliente Alpha DRE', '123.456.789-00', 'cliente@alpha.com', '11988887777')
       RETURNING id;`,
      [tenantAlphaId]
    );

    const vehAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color)
       VALUES ($1, $2, 'DRE1111', 'Porsche', '911 Carrera', 2024, 'Preto')
       RETURNING id;`,
      [tenantAlphaId, custAlpha.rows[0].id]
    );

    const woAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (
        tenant_id, customer_id, vehicle_id, technician_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents
      ) VALUES ($1, $2, $3, $4, 1001, 'DELIVERED', 500000, 20000, 480000, 480000)
      RETURNING id;`,
      [tenantAlphaId, custAlpha.rows[0].id, vehAlpha.rows[0].id, technicianAlphaId]
    );
    workOrderAlphaId = woAlpha.rows[0].id;

    // Item da OS
    const itemRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_order_items (
        tenant_id, work_order_id, name, quantity, unit_price_cents, total_cents
      ) VALUES ($1, $2, 'Aplicação PPF Frontal Completo', 1, 500000, 500000)
      RETURNING id;`,
      [tenantAlphaId, workOrderAlphaId]
    );

    // Criar material de suporte
    const matRow = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO materials (tenant_id, name, unit, cost_cents, current_stock, is_roll)
       VALUES ($1, 'Bobina PPF Xpel Ultimate', 'm', 10000, 50, true)
       RETURNING id;`,
      [tenantAlphaId]
    );

    // Consumo de Estoque / Bobina na OS (Custo do material: R$ 1.500,00)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO stock_movements (
        tenant_id, material_id, work_order_id, movement_type, quantity, unit_cost_cents, total_cost_cents, reason
      ) VALUES ($1, $2, $3, 'os_consumption', 15, 10000, 150000, 'Consumo de 15m Bobina PPF')
      RETURNING id;`,
      [tenantAlphaId, matRow.rows[0].id, workOrderAlphaId]
    );

    // Regra de comissão com dedução de material: 20% sobre o líquido após deduzir material
    const ruleRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO commission_rules (
        tenant_id, technician_id, commission_type, commission_value, base_calculation, is_active
      ) VALUES ($1, $2, 'percentage', 20, 'net_service_minus_material', true)
      RETURNING id;`,
      [tenantAlphaId, technicianAlphaId]
    );

    // Calcula comissão para a OS
    // Base: 500000 - 150000 = 350000. 20% de 350000 = 70000 (R$ 700,00)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO commission_entries (
        tenant_id, work_order_id, service_item_id, technician_id, rule_id,
        gross_amount_cents, deductions_cents, commission_cents, spool_cost_cents, status
      ) VALUES ($1, $2, $3, $4, $5, 500000, 150000, 70000, 150000, 'pending');`,
      [tenantAlphaId, workOrderAlphaId, itemRes.rows[0].id, technicianAlphaId, ruleRes.rows[0].id]
    );

    // Nota Fiscal NFS-e autorizada para compor dedução de impostos (ISS: R$ 96,00)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO fiscal_invoices (
        tenant_id, work_order_id, rps_number, rps_series, invoice_number, status,
        gross_amount_cents, net_amount_cents, iss_rate_basis_points, iss_amount_cents, description
      ) VALUES ($1, $2, 1, '1', 'NF-1001', 'authorized', 480000, 480000, 200, 9600, 'Serviços de PPF');`,
      [tenantAlphaId, workOrderAlphaId]
    );
    } catch (err: any) {
      console.error('*** ERRO DETALHADO NO BEFORE HOOK ***:', err);
      throw err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. Deve listar categorias do sistema e permitir criar categoria personalizada', async () => {
    const resList = await app.inject({
      method: 'GET',
      url: '/financial/categories',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
    });

    assert.strictEqual(resList.statusCode, 200);
    const categories = JSON.parse(resList.payload);
    assert.ok(Array.isArray(categories));
    assert.ok(categories.length >= 10, 'Deve conter as categorias padrão do sistema');

    const catAluguel = categories.find((c: any) => c.name.includes('Aluguel'));
    assert.ok(catAluguel, 'Deve conter categoria de Aluguel');
    categoryAluguelId = catAluguel.id;

    // Criar categoria personalizada
    const resCreate = await app.inject({
      method: 'POST',
      url: '/financial/categories',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
      payload: {
        name: 'Uniformes & EPIs Técnicos',
        type: 'expense',
        groupType: 'operating_expense',
      },
    });

    assert.strictEqual(resCreate.statusCode, 201);
    const newCat = JSON.parse(resCreate.payload);
    assert.strictEqual(newCat.name, 'Uniformes & EPIs Técnicos');
    assert.strictEqual(newCat.tenantId, tenantAlphaId);
  });

  it('2. Deve criar conta a pagar (despesa operacional fixa de aluguel) e conta a receber', async () => {
    // Conta a Pagar: Aluguel do Galpão R$ 3.500,00
    const resPayable = await app.inject({
      method: 'POST',
      url: '/financial/bills',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
      payload: {
        categoryId: categoryAluguelId,
        type: 'payable',
        description: 'Aluguel Galpão Principal - Mês Corrente',
        supplierCustomerName: 'Imobiliária Alpha Prime',
        amountCents: 350000,
        dueDate: new Date().toISOString().slice(0, 10),
      },
    });

    assert.strictEqual(resPayable.statusCode, 201);
    const billPayable = JSON.parse(resPayable.payload);
    assert.strictEqual(billPayable.description, 'Aluguel Galpão Principal - Mês Corrente');
    assert.strictEqual(billPayable.amountCents, 350000);
    assert.strictEqual(billPayable.status, 'pending');
    billAluguelId = billPayable.id;

    // Conta a Receber: Venda avulsa de produto R$ 450,00
    const resReceivable = await app.inject({
      method: 'POST',
      url: '/financial/bills',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
      payload: {
        type: 'receivable',
        description: 'Venda de Kit Cuidados Cerâmica',
        supplierCustomerName: 'Cliente Particular',
        amountCents: 45000,
        dueDate: new Date().toISOString().slice(0, 10),
      },
    });

    assert.strictEqual(resReceivable.statusCode, 201);
    const billReceivable = JSON.parse(resReceivable.payload);
    assert.strictEqual(billReceivable.amountCents, 45000);
    assert.strictEqual(billReceivable.type, 'receivable');
  });

  it('3. Deve quitar conta financeira registrando paid_at e atualizando sumário', async () => {
    const resPay = await app.inject({
      method: 'PATCH',
      url: `/financial/bills/${billAluguelId}/pay`,
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
      payload: {
        paidAmountCents: 350000,
        paymentMethod: 'pix',
      },
    });

    assert.strictEqual(resPay.statusCode, 200);
    const paidBill = JSON.parse(resPay.payload);
    assert.strictEqual(paidBill.status, 'paid');
    assert.strictEqual(paidBill.paidAmountCents, 350000);
    assert.ok(paidBill.paidAt);

    // Listar contas para conferir sumário
    const resList = await app.inject({
      method: 'GET',
      url: '/financial/bills',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
    });

    assert.strictEqual(resList.statusCode, 200);
    const data = JSON.parse(resList.payload);
    assert.ok(data.summary.totalPaidCents >= 350000);
  });

  it('4. Deve gerar DRE Gerencial Avançado calculando Receita Bruta, CSP, Despesas Fixas e EBITDA Real', async () => {
    const resDre = await app.inject({
      method: 'GET',
      url: '/reports/dre/advanced',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
    });

    assert.strictEqual(resDre.statusCode, 200);
    const dre = JSON.parse(resDre.payload);

    // Receita de OS: R$ 5.000,00 bruto
    assert.ok(dre.serviceRevenueCents >= 500000);
    // Deduções: Desconto (R$ 200,00) + ISS da NFS-e (R$ 96,00) = R$ 296,00 (29600 cents)
    assert.strictEqual(dre.deductions.discountsCents, 20000);
    assert.strictEqual(dre.deductions.issTaxesCents, 9600);
    assert.strictEqual(dre.deductions.totalDeductionsCents, 29600);

    // Receita Líquida esperada: 500.000 - 29.600 = 470.400 cents
    assert.strictEqual(dre.netRevenueCents, 470400);

    // Custos Variáveis (CSP):
    // Material/Estoque (150.000) + Bobina (150.000) + Comissão (70.000)
    assert.ok(dre.variableCosts.materialStockCostsCents >= 150000);
    assert.ok(dre.variableCosts.technicianCommissionsCents >= 70000);
    assert.ok(dre.variableCosts.totalVariableCostsCents > 0);

    // Margem de Contribuição Bruta
    assert.ok(dre.contributionMarginCents > 0);
    assert.ok(dre.contributionMarginPercent > 0);

    // Despesas Fixas: Aluguel R$ 3.500,00 (350000 cents)
    assert.ok(dre.fixedExpenses.rentCents >= 350000);
    assert.ok(dre.fixedExpenses.totalFixedExpensesCents >= 350000);

    // EBITDA e Lucro Real
    assert.ok(typeof dre.ebitdaCents === 'number');
    assert.ok(typeof dre.netIncomeCents === 'number');
  });

  it('5. Deve gerar Projeção de Fluxo de Caixa para 30, 60 e 90 dias com saldos diários', async () => {
    const resCashflow = await app.inject({
      method: 'GET',
      url: '/financial/cashflow/projection?days=30',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
    });

    assert.strictEqual(resCashflow.statusCode, 200);
    const flow = JSON.parse(resCashflow.payload);

    assert.ok(Array.isArray(flow.dailyTimeline));
    assert.strictEqual(flow.dailyTimeline.length, 31); // Hoje + 30 dias

    assert.ok(typeof flow.currentBalanceCents === 'number');
    assert.ok(flow.summary30Days);
    assert.ok(flow.summary60Days);
    assert.ok(flow.summary90Days);
    assert.ok(typeof flow.summary30Days.projectedNetCents === 'number');
  });

  it('6. Deve realizar fechamento e quitação em lote de comissões por colaborador (batch-pay)', async () => {
    // Buscar lançamentos pendentes do técnico Lucas
    const resEntries = await app.inject({
      method: 'GET',
      url: `/commissions/entries?technicianId=${technicianAlphaId}&status=pending`,
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
    });

    assert.strictEqual(resEntries.statusCode, 200);
    const entries = JSON.parse(resEntries.payload);
    assert.ok(entries.length >= 1, 'Deve possuir lançamentos pendentes');

    const entryIds = entries.map((e: any) => e.id);

    // Executa quitação em lote
    const resBatch = await app.inject({
      method: 'POST',
      url: '/commissions/batch-pay',
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-id': tenantAlphaId },
      payload: {
        technicianId: technicianAlphaId,
        entryIds,
        paymentMethod: 'pix',
        notes: 'Fechamento quinzena 1 de novembro',
      },
    });

    assert.strictEqual(resBatch.statusCode, 200);
    const batchResult = JSON.parse(resBatch.payload);

    assert.ok(batchResult.batchId.startsWith('batch_comm_'));
    assert.strictEqual(batchResult.technicianId, technicianAlphaId);
    assert.strictEqual(batchResult.paidCount, entryIds.length);
    assert.strictEqual(batchResult.totalPaidCents, 70000); // R$ 700,00

    // Verifica se os lançamentos foram atualizados no banco
    const checkRes = await tenantQuery<any>(
      tenantAlphaId,
      `SELECT status, batch_id, spool_cost_cents FROM commission_entries WHERE id = $1;`,
      [entryIds[0]]
    );
    assert.strictEqual(checkRes.rows[0].status, 'paid');
    assert.strictEqual(checkRes.rows[0].batch_id, batchResult.batchId);
    assert.strictEqual(checkRes.rows[0].spool_cost_cents, 150000); // R$ 1.500,00 deduzidos de insumos
  });

  it('7. ISOLAMENTO RLS: Oficina Beta não consegue visualizar nem alterar contas da Oficina Alpha', async () => {
    // Oficina Beta tenta listar contas a pagar
    const resBetaList = await app.inject({
      method: 'GET',
      url: '/financial/bills',
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-id': tenantBetaId },
    });

    assert.strictEqual(resBetaList.statusCode, 200);
    const betaBills = JSON.parse(resBetaList.payload);
    assert.strictEqual(betaBills.total, 0, 'Oficina Beta não pode ver as contas da Oficina Alpha');

    // Oficina Beta tenta baixar conta da Oficina Alpha (deve dar 404)
    const resBetaPay = await app.inject({
      method: 'PATCH',
      url: `/financial/bills/${billAluguelId}/pay`,
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-id': tenantBetaId },
      payload: { paidAmountCents: 100 },
    });

    assert.strictEqual(resBetaPay.statusCode, 404);
  });
});
