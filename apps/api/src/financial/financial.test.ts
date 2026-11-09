import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T3.11 — Financeiro, Comissões e Relatórios no Servidor', () => {
  let app: any;
  const timestamp = Date.now();

  // Tenant Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let tech1AlphaId: string;
  let tech1AlphaToken: string;
  let tech2AlphaId: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;

  let servicePolimentoId: string;
  let servicePpfId: string;
  let woAlpha1Id: string;
  let woAlpha2Id: string;
  let woAlpha3Id: string;

  // Tenant Beta (Concorrente)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  // Regras e Lançamentos
  let rule1Id: string;
  let rule2Id: string;
  let rule3Id: string;
  let entryWo1Id: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    const passHash = await hashPassword('SenhaSegura123!');

    // 1. Setup Tenant Alpha
    tenantAlphaSlug = `alpha-fin-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Detailing Alpha', 'Alpha Fin LTDA', $1, $2, '11.888.999/0001-44', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Gestor Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Financeiro', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'gestor',
    });

    // Técnico 1 (Lucas)
    const resTech1 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Lucas Polidor', $1, $2)
       RETURNING id;`,
      [`lucas@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    tech1AlphaId = resTech1.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico');`,
      [tenantAlphaId, tech1AlphaId],
      { bypassRls: true }
    );
    tech1AlphaToken = signJwt({
      userId: tech1AlphaId,
      tenantId: tenantAlphaId,
      role: 'tecnico',
    });

    // Técnico 2 (Bruno)
    const resTech2 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Bruno Aplicador', $1, $2)
       RETURNING id;`,
      [`bruno@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    tech2AlphaId = resTech2.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico');`,
      [tenantAlphaId, tech2AlphaId],
      { bypassRls: true }
    );

    // Cliente e Veículo
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone)
       VALUES ($1, 'Marcelo Andrade', 'marcelo@cliente.local', '11987654321')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'BRA2E19', 'Porsche', '911 Carrera', 'Prata GT', 2023, 'sports')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // Serviços no Catálogo
    const resSrv1 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, category, price_cents, estimated_minutes)
       VALUES ($1, 'Polimento Técnico Avançado', 'Estética', 150000, 240)
       RETURNING id;`,
      [tenantAlphaId]
    );
    servicePolimentoId = resSrv1.rows[0].id;

    const resSrv2 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, category, price_cents, estimated_minutes)
       VALUES ($1, 'Aplicação PPF Frontal', 'Proteção', 500000, 480)
       RETURNING id;`,
      [tenantAlphaId]
    );
    servicePpfId = resSrv2.rows[0].id;

    // Material de Estoque (Bobina PPF)
    const resMat = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO materials (tenant_id, name, category, unit, cost_cents, current_stock, is_roll)
       VALUES ($1, 'Bobina PPF Ultra Clear', 'Película', 'm', 5000, 30.0, true)
       RETURNING id;`,
      [tenantAlphaId]
    );
    const materialId = resMat.rows[0].id;

    // 2. Setup Tenant Beta (Concorrente)
    tenantBetaSlug = `beta-fin-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Oficina Beta Concorrente', 'Beta LTDA', $1, $2, '22.777.666/0001-55', 'active', 'funilaria')
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Concorrente', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'gestor',
    });

    // 3. Setup de Ordens de Serviço Alpha para os testes
    // OS 1: Lucas - Polimento R$ 1.500,00 (Total R$ 1.500,00, Pago R$ 1.500,00) - Status DELIVERED
    const resWo1 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, discount_cents, final_cents, paid_cents, is_rework)
       VALUES ($1, $2, $3, $4, 8001, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 150000, 0, 150000, 150000, false)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech1AlphaId]
    );
    woAlpha1Id = resWo1.rows[0].id;
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_order_items (tenant_id, work_order_id, service_id, name, quantity, unit_price_cents, total_cents)
       VALUES ($1, $2, $3, 'Polimento Técnico Avançado', 1, 150000, 150000);`,
      [tenantAlphaId, woAlpha1Id, servicePolimentoId]
    );

    // OS 2: Lucas - PPF Frontal R$ 5.000,00 com Desconto R$ 200,00 (Final R$ 4.800,00, Pago R$ 4.800,00)
    // Consumo de material: R$ 2.000,00 de PPF (200000 centavos)
    const resWo2 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, discount_cents, final_cents, paid_cents, is_rework)
       VALUES ($1, $2, $3, $4, 8002, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 500000, 20000, 480000, 480000, false)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech1AlphaId]
    );
    woAlpha2Id = resWo2.rows[0].id;
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_order_items (tenant_id, work_order_id, service_id, name, quantity, unit_price_cents, discount_cents, total_cents)
       VALUES ($1, $2, $3, 'Aplicação PPF Frontal', 1, 500000, 20000, 480000);`,
      [tenantAlphaId, woAlpha2Id, servicePpfId]
    );
    // Consumo de material registrado em stock_movements
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO stock_movements (tenant_id, material_id, work_order_id, movement_type, quantity, unit_cost_cents, total_cost_cents, previous_stock, new_stock)
       VALUES ($1, $2, $3, 'os_consumption', -4.0, 50000, 200000, 30.0, 26.0);`,
      [tenantAlphaId, materialId, woAlpha2Id]
    );

    // OS 3: Bruno - R$ 1.000,00 (Total R$ 1.000,00, Pago R$ 500,00 -> R$ 500,00 A RECEBER/PENDENTE)
    const resWo3 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, discount_cents, final_cents, paid_cents, is_rework)
       VALUES ($1, $2, $3, $4, 8003, '${WorkOrderStatus.READY}', 'INTERNAL', 100000, 0, 100000, 50000, false)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech2AlphaId]
    );
    woAlpha3Id = resWo3.rows[0].id;
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_order_items (tenant_id, work_order_id, service_id, name, quantity, unit_price_cents, total_cents)
       VALUES ($1, $2, $3, 'Serviço Geral Bruno', 1, 100000, 100000);`,
      [tenantAlphaId, woAlpha3Id, servicePolimentoId]
    );

    // Auditoria de QA com nota 5 para OS 1
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO qa_audits (tenant_id, work_order_id, inspector_id, status, score)
       VALUES ($1, $2, $3, 'approved', 5);`,
      [tenantAlphaId, woAlpha1Id, ownerAlphaId]
    );
  });

  // ============================================================================
  // TESTE 1: CRIAÇÃO DE REGRAS DE COMISSÃO E VALIDAÇÕES
  // ============================================================================
  test('deve criar regras de comissão (percentual e fixo) e rejeitar porcentagem > 100%', async () => {
    // 1. Rejeição de porcentagem inválida (ex: 120%)
    const resInvalid = await app.inject({
      method: 'POST',
      url: '/commissions/rules',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        technicianId: tech1AlphaId,
        commissionType: 'percentage',
        commissionValue: 120,
        baseCalculation: 'gross_service',
      },
    });
    assert.equal(resInvalid.statusCode, 400);

    // 2. Criação da Regra 1: Lucas no Polimento -> 20% com base gross_service
    const resRule1 = await app.inject({
      method: 'POST',
      url: '/commissions/rules',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        technicianId: tech1AlphaId,
        serviceId: servicePolimentoId,
        commissionType: 'percentage',
        commissionValue: 20,
        baseCalculation: 'gross_service',
      },
    });
    assert.equal(resRule1.statusCode, 201);
    const body1 = JSON.parse(resRule1.body);
    assert.equal(body1.commissionValue, 20);
    assert.equal(body1.commissionType, 'percentage');
    assert.equal(body1.baseCalculation, 'gross_service');
    rule1Id = body1.id;

    // 3. Criação da Regra 2: Lucas no PPF -> 10% com dedução de material (net_service_minus_material)
    const resRule2 = await app.inject({
      method: 'POST',
      url: '/commissions/rules',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        technicianId: tech1AlphaId,
        serviceId: servicePpfId,
        commissionType: 'percentage',
        commissionValue: 10,
        baseCalculation: 'net_service_minus_material',
      },
    });
    assert.equal(resRule2.statusCode, 201);
    const body2 = JSON.parse(resRule2.body);
    rule2Id = body2.id;

    // 4. Criação da Regra 3: Bruno -> R$ 150,00 fixo por serviço executado
    const resRule3 = await app.inject({
      method: 'POST',
      url: '/commissions/rules',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        technicianId: tech2AlphaId,
        commissionType: 'fixed_cents',
        commissionValue: 15000,
        baseCalculation: 'gross_service',
      },
    });
    assert.equal(resRule3.statusCode, 201);
    const body3 = JSON.parse(resRule3.body);
    rule3Id = body3.id;
  });

  // ============================================================================
  // TESTE 2: APURAÇÃO DE COMISSÃO COM BASE EM SERVIÇO BRUTO (GROSS)
  // ============================================================================
  test('deve apurar comissão de 20% sobre valor bruto da OS 1 (R$ 1.500,00 -> R$ 300,00)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/commissions/calculate/${woAlpha1Id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const entries = JSON.parse(res.body);
    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.equal(entry.technicianId, tech1AlphaId);
    assert.equal(entry.grossAmountCents, 150000);
    assert.equal(entry.deductionsCents, 0);
    assert.equal(entry.commissionCents, 30000); // 20% de 150000 = 30000
    assert.equal(entry.status, 'pending');
    entryWo1Id = entry.id;
  });

  // ============================================================================
  // TESTE 3: APURAÇÃO COM DEDUÇÃO DE MATERIAIS (NET_SERVICE_MINUS_MATERIAL)
  // ============================================================================
  test('deve apurar comissão deduzindo custo de insumos da OS 2 (Base R$ 4.800 - R$ 2.000 = R$ 2.800 -> 10% = R$ 280,00)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/commissions/calculate/${woAlpha2Id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const entries = JSON.parse(res.body);
    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.equal(entry.grossAmountCents, 480000);
    assert.equal(entry.deductionsCents, 200000); // R$ 2.000,00 de materiais
    // Base líquida = 480.000 - 200.000 = 280.000 centavos
    // 10% de 280.000 = 28.000 centavos (R$ 280,00)
    assert.equal(entry.commissionCents, 28000);
    assert.equal(entry.status, 'pending');
  });

  // ============================================================================
  // TESTE 4: APURAÇÃO COM VALOR FIXO EM CENTAVOS (FIXED_CENTS)
  // ============================================================================
  test('deve apurar comissão de valor fixo para a OS 3 (R$ 150,00 fixo)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/commissions/calculate/${woAlpha3Id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const entries = JSON.parse(res.body);
    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.equal(entry.technicianId, tech2AlphaId);
    assert.equal(entry.commissionCents, 15000); // R$ 150,00
    assert.equal(entry.status, 'pending');
  });

  // ============================================================================
  // TESTE 5: EXTRATO E VISIBILIDADE DO TÉCNICO
  // ============================================================================
  test('deve permitir ao gestor ver todas as comissões e ao técnico ver apenas as suas', async () => {
    // Gestor consulta extrato
    const resGestor = await app.inject({
      method: 'GET',
      url: '/commissions/entries',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });
    assert.equal(resGestor.statusCode, 200);
    const allEntries = JSON.parse(resGestor.body);
    assert.equal(allEntries.length, 3); // OS 1, OS 2 e OS 3

    // Técnico Lucas consulta extrato
    const resTech = await app.inject({
      method: 'GET',
      url: '/commissions/entries',
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });
    assert.equal(resTech.statusCode, 200);
    const techEntries = JSON.parse(resTech.body);
    assert.equal(techEntries.length, 2); // Apenas OS 1 e OS 2 do Lucas
    assert(techEntries.every((e: any) => e.technicianId === tech1AlphaId));
  });

  // ============================================================================
  // TESTE 6: LIQUIDAÇÃO (PAGAMENTO) DE COMISSÃO E BLOQUEIO DE DUPLICIDADE
  // ============================================================================
  test('deve liquidar comissão com paid_at e bloquear pagamento duplicado', async () => {
    // 1. Liquidação da comissão da OS 1
    const resPay = await app.inject({
      method: 'PATCH',
      url: `/commissions/entries/${entryWo1Id}/pay`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        notes: 'Pago via PIX no fechamento semanal',
      },
    });

    assert.equal(resPay.statusCode, 200);
    const paidEntry = JSON.parse(resPay.body);
    assert.equal(paidEntry.status, 'paid');
    assert.ok(paidEntry.paidAt);
    assert.equal(paidEntry.notes, 'Pago via PIX no fechamento semanal');

    // 2. Tentativa de pagar novamente a mesma comissão -> Bloqueio HTTP 400
    const resPayAgain = await app.inject({
      method: 'PATCH',
      url: `/commissions/entries/${entryWo1Id}/pay`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {},
    });

    assert.equal(resPayAgain.statusCode, 400);
    const errBody = JSON.parse(resPayAgain.body);
    assert.equal(errBody.error, 'COMMISSION_ALREADY_PAID');
  });

  // ============================================================================
  // TESTE 7: DRE GERENCIAL CALCULADO NATIVAMENTE NO POSTGRESQL (GET /reports/dre)
  // ============================================================================
  test('deve calcular o DRE gerencial completo exclusivamente via SQL no PostgreSQL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/reports/dre',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const dre = JSON.parse(res.body);

    // Validação dos números consolidados das 3 OS do Tenant Alpha:
    // OS 1: Total R$ 1.500,00, Desc R$ 0,00, Final R$ 1.500,00, Pago R$ 1.500,00
    // OS 2: Total R$ 5.000,00, Desc R$ 200,00, Final R$ 4.800,00, Pago R$ 4.800,00
    // OS 3: Total R$ 1.000,00, Desc R$ 0,00, Final R$ 1.000,00, Pago R$ 500,00 (A receber R$ 500,00)
    // ----------------------------------------------------------------------------------------
    // Receita Bruta = 150000 + 500000 + 100000 = 750000 centavos (R$ 7.500,00)
    // Descontos = 20000 centavos (R$ 200,00)
    // Receita Líquida = 730000 centavos (R$ 7.300,00)
    // Custos de Materiais (CMV) = 200000 centavos (R$ 2.000,00 da bobina consumida na OS 2)
    // Custos de Comissões = 30000 + 28000 + 15000 = 73000 centavos (R$ 730,00)
    // Margem de Contribuição R$ = 730000 - (200000 + 73000) = 457000 centavos (R$ 4.570,00)
    // Margem de Contribuição % = (457000 / 730000) * 100 = 62.6%
    // Inadimplência / A Receber = 50000 centavos (R$ 500,00 da OS 3)
    // Contagem de OS = 3

    assert.equal(dre.grossRevenueCents, 750000);
    assert.equal(dre.discountsCents, 20000);
    assert.equal(dre.netRevenueCents, 730000);
    assert.equal(dre.materialCostsCents, 200000);
    assert.equal(dre.commissionCostsCents, 73000);
    assert.equal(dre.contributionMarginCents, 457000);
    assert.equal(dre.contributionMarginPercent, 62.6);
    assert.equal(dre.pendingReceivablesCents, 50000);
    assert.equal(dre.workOrdersCount, 3);
  });

  // ============================================================================
  // TESTE 8: RANKING DE TÉCNICOS E STREAK REAL AUDITADO (SEM LOCALSTORAGE)
  // ============================================================================
  test('deve calcular o ranking com streak auditado e reiniciar streak de técnico com retrabalho', async () => {
    // 1. Lucas produziu 2 OS (OS 1 + OS 2 = R$ 1.500 + R$ 4.800 = R$ 6.300,00 / 630.000 centavos)
    //    Lucas nunca teve retrabalho ou reprovação no QA -> streak conta desde a primeira OS
    // 2. Bruno produziu 1 OS (OS 3 = R$ 1.000,00 / 100.000 centavos)
    //    Vamos simular um retrabalho auditado para o Bruno para comprovar o cálculo real!

    // Criação de uma OS de Retrabalho oficial para Bruno ocorrida HOJE
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, final_cents, is_rework)
       VALUES ($1, $2, $3, $4, 8004, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 0, 0, true);`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech2AlphaId]
    );

    const resRanking = await app.inject({
      method: 'GET',
      url: '/reports/technicians/ranking',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(resRanking.statusCode, 200);
    const ranking = JSON.parse(resRanking.body);
    assert.equal(ranking.length, 2);

    // Primeiro colocado: Lucas (faturou R$ 6.300,00)
    const lucas = ranking.find((t: any) => t.technicianId === tech1AlphaId);
    assert.ok(lucas);
    assert.equal(lucas.workOrdersCount, 2);
    assert.equal(lucas.totalProducedCents, 630000);
    assert.equal(lucas.averageQaScore, 5.0); // Nota 5 auditada na OS 1
    assert.equal(lucas.lastReworkDate, null); // Nunca teve retrabalho!
    assert.ok(lucas.streakDaysWithoutRework >= 0);

    // Segundo colocado: Bruno (faturou R$ 100.000 centavos)
    const bruno = ranking.find((t: any) => t.technicianId === tech2AlphaId);
    assert.ok(bruno);
    assert.equal(bruno.workOrdersCount, 2); // 1 OS normal + 1 OS de retrabalho
    assert.equal(bruno.totalProducedCents, 100000);
    assert.ok(bruno.lastReworkDate !== null); // Fato auditado: retrabalho detectado no banco de dados!
    assert.equal(bruno.streakDaysWithoutRework, 0); // Reiniciado para 0 dias corridos pelo retrabalho de hoje!
  });

  // ============================================================================
  // TESTE 9: ISOLAMENTO MULTI-TENANT ESTRITO (RLS)
  // ============================================================================
  test('deve garantir isolamento multi-tenant estrito: Concorrente Beta tem DRE e extratos zerados', async () => {
    // 1. Beta consulta DRE -> Deve vir 100% zerado
    const resDreBeta = await app.inject({
      method: 'GET',
      url: '/reports/dre',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });

    assert.equal(resDreBeta.statusCode, 200);
    const dreBeta = JSON.parse(resDreBeta.body);
    assert.equal(dreBeta.grossRevenueCents, 0);
    assert.equal(dreBeta.netRevenueCents, 0);
    assert.equal(dreBeta.workOrdersCount, 0);
    assert.equal(dreBeta.pendingReceivablesCents, 0);

    // 2. Beta tenta consultar regras de comissão -> Retorna array vazio
    const resRulesBeta = await app.inject({
      method: 'GET',
      url: '/commissions/rules',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });
    assert.equal(resRulesBeta.statusCode, 200);
    const rulesBeta = JSON.parse(resRulesBeta.body);
    assert.equal(rulesBeta.length, 0);

    // 3. Beta tenta pagar comissão da Alpha -> HTTP 404 (Invisível pelo RLS)
    const resPayCross = await app.inject({
      method: 'PATCH',
      url: `/commissions/entries/${entryWo1Id}/pay`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
      payload: {},
    });
    assert.equal(resPayCross.statusCode, 404);
  });
});
