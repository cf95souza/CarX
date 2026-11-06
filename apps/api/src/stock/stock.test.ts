import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.5 — Controle de Estoque e Bobinas de Película (PPF e Insulfilm)', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let workOrderAlphaId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  // IDs de teste
  let materialPpfId: string;
  let rollPpfId: string;
  let materialVitrificadorId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@Stock2026!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-stock-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Detailing & PPF', 'Alpha PPF LTDA', $1, $2, '11.222.333/0001-44', 'active', 'ppf')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const userAlphaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha Estoque', $1, $2)
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
       VALUES ($1, 'Rodrigo Prado', '+5511999991234', '12345678909', 'rodrigo@teste.local')
       RETURNING id`,
      [tenantAlphaId]
    );
    customerAlphaId = custAlpha.rows[0].id;

    const vehAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'STK1A01', 'Porsche', '911 Carrera', 2024, 'Cinza', 'esportivo')
       RETURNING id`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = vehAlpha.rows[0].id;

    // Criar OS Alpha inicial para alocação de insumos
    const woRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 1, 'IN_PROGRESS', 850000, 0, 850000, 0)
       RETURNING id`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlphaId = woRes.rows[0].id;

    // 2. Setup Oficina Beta
    tenantBetaSlug = `beta-stock-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Mecânica & Estoque', 'Beta Estoque LTDA', $1, $2, '44.555.666/0001-77', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const userBetaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta Estoque', $1, $2)
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
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // TESTES DE MATERIAIS E CONSUMÍVEIS
  // ============================================================================

  test('1. deve cadastrar material de consumo (Vitrificador) com saldo inicial e estoque mínimo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/materials',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Vitrificador Cerâmico 9H (50ml)',
        sku: 'VIT-9H-50',
        category: 'Proteção',
        unit: 'un',
        costCents: 15000, // R$ 150,00
        initialStock: 10,
        minStock: 3,
        isRoll: false,
        notes: 'Frascos lacrados para aplicação em pintura automotiva',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.name, 'Vitrificador Cerâmico 9H (50ml)');
    assert.equal(body.currentStock, 10);
    assert.equal(body.minStock, 3);
    assert.equal(body.costCents, 15000);
    assert.equal(body.isRoll, false);
    assert.equal(body.isLowStock, false);
    materialVitrificadorId = body.id;

    // Verificar se foi gerado registro inicial de movimentação em stock_movements
    const movRes = await tenantQuery<{ movement_type: string; quantity: number }>(
      tenantAlphaId,
      'SELECT movement_type, quantity FROM stock_movements WHERE tenant_id = $1 AND material_id = $2;',
      [tenantAlphaId, materialVitrificadorId]
    );
    assert.equal(movRes.rows.length, 1);
    assert.equal(movRes.rows[0].movement_type, 'entry');
    assert.equal(Number(movRes.rows[0].quantity), 10);
  });

  test('2. deve atualizar dados cadastrais de um material existente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/materials/${materialVitrificadorId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        minStock: 4,
        costCents: 16000,
        notes: 'Atualização de custo pelo fornecedor',
      },
    });

    assert.equal(res.statusCode, 200);
    const updated = res.json();
    assert.equal(updated.minStock, 4);
    assert.equal(updated.costCents, 16000);
    assert.equal(updated.notes, 'Atualização de custo pelo fornecedor');
  });

  // ============================================================================
  // TESTES DE BOBINAS E ROLOS DE PELÍCULA (PPF E INSULFILM)
  // ============================================================================

  test('3. deve cadastrar material tipo bobina (Película PPF Gloss) e registrar uma bobina de 15 metros', async () => {
    // 1. Criar material base do PPF
    const matRes = await app.inject({
      method: 'POST',
      url: '/materials',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Película PPF Ultra Clear Gloss 1.52m',
        sku: 'PPF-UC-152',
        category: 'PPF',
        unit: 'm',
        costCents: 35000, // R$ 350,00 por metro
        initialStock: 0,
        minStock: 5,
        isRoll: true,
      },
    });
    assert.equal(matRes.statusCode, 201);
    materialPpfId = matRes.json().id;

    // 2. Cadastrar uma bobina de 15 metros associada
    const rollRes = await app.inject({
      method: 'POST',
      url: '/materials/rolls',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: materialPpfId,
        code: 'BOB-PPF-001',
        lotNumber: 'LOT-XPEL-2026-X1',
        brand: 'XPEL Ultimate Plus',
        widthMeters: 1.52,
        initialMeters: 15.0,
        minAlertMeters: 4.0, // Alerta quando sobrar menos de 4m
        costCents: 525000, // R$ 5.250,00 total da bobina
        notes: 'Bobina nova lacrada importada',
      },
    });

    assert.equal(rollRes.statusCode, 201);
    const roll = rollRes.json();
    assert.equal(roll.materialId, materialPpfId);
    assert.equal(roll.lotNumber, 'LOT-XPEL-2026-X1');
    assert.equal(roll.initialMeters, 15.0);
    assert.equal(roll.currentMeters, 15.0);
    assert.equal(roll.minAlertMeters, 4.0);
    assert.equal(roll.status, 'in_use');
    assert.equal(roll.isLowMeters, false);
    rollPpfId = roll.id;

    // Verificar se o estoque do material base foi incrementado automaticamente para 15 metros
    const matCheck = await app.inject({
      method: 'GET',
      url: `/materials/${materialPpfId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(matCheck.json().currentStock, 15.0);
  });

  // ============================================================================
  // TESTES DE MOVIMENTAÇÃO DE ESTOQUE E VALIDAÇÕES MATEMÁTICAS
  // ============================================================================

  test('4. deve registrar perda/desperdício na bobina de PPF e abater metros', async () => {
    // Registrar 1.5m de desperdício/perda na instalação
    const movRes = await app.inject({
      method: 'POST',
      url: '/materials/movements',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: materialPpfId,
        materialRollId: rollPpfId,
        movementType: 'waste',
        quantity: 1.5,
        reason: 'Erro de corte no molde da asa traseira',
      },
    });

    assert.equal(movRes.statusCode, 201);
    const mov = movRes.json();
    assert.equal(mov.movementType, 'waste');
    assert.equal(mov.quantity, -1.5);
    assert.equal(mov.previousStock, 15.0);
    assert.equal(mov.newStock, 13.5);

    // Verificar se a metragem da bobina caiu para 13.5m
    const rollCheck = await app.inject({
      method: 'GET',
      url: `/materials/rolls/${rollPpfId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(rollCheck.json().currentMeters, 13.5);
  });

  test('5. deve rejeitar saída de estoque com quantidade superior ao disponível com HTTP 422', async () => {
    // Tentativa de deduzir 50 metros quando só existem 13.5m
    const res = await app.inject({
      method: 'POST',
      url: '/materials/movements',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: materialPpfId,
        materialRollId: rollPpfId,
        movementType: 'exit',
        quantity: 50.0,
        reason: 'Tentativa indevida de saída maior que estoque',
      },
    });

    assert.equal(res.statusCode, 422, 'Saída acima do saldo deve retornar 422');
  });

  // ============================================================================
  // CRITÉRIO DE ACEITE: ALOCAÇÃO E BAIXA IDEMPOTENTE NA ORDEM DE SERVIÇO
  // ============================================================================

  test('6. deve alocar materiais (Vitrificador e Bobina PPF) para a Ordem de Serviço Alpha', async () => {
    // Alocar 1 frasco de vitrificador
    const res1 = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlphaId}/materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: materialVitrificadorId,
        quantity: 1,
        notes: 'Frasco para proteção do capô e para-choques',
      },
    });
    assert.equal(res1.statusCode, 201);
    assert.equal(res1.json().isConsumed, false);

    // Alocar 10.0 metros da bobina de PPF
    const res2 = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlphaId}/materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: materialPpfId,
        materialRollId: rollPpfId,
        quantity: 10.0,
        notes: 'Cobertura frontal completa e retrovisores',
      },
    });
    assert.equal(res2.statusCode, 201);
    assert.equal(res2.json().isConsumed, false);

    // Listar materiais alocados à OS
    const listRes = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderAlphaId}/materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(listRes.statusCode, 200);
    assert.equal(listRes.json().length, 2);
  });

  test('7. CRITÉRIO DE ACEITE: concluir/entregar a OS abate o estoque com precisão', async () => {
    // Antes da baixa:
    // Vitrificador: 10 unidades
    // Bobina PPF: 13.5 metros
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlphaId}/consume-materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.deductedCount, 2, 'Deve ter processado a baixa de 2 itens de insumo');
    assert.equal(body.alreadyDeducted, false);

    // Conferir novo saldo do Vitrificador: 10 - 1 = 9
    const vitCheck = await app.inject({
      method: 'GET',
      url: `/materials/${materialVitrificadorId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(vitCheck.json().currentStock, 9);

    // Conferir nova metragem da Bobina PPF: 13.5 - 10.0 = 3.5 metros
    const rollCheck = await app.inject({
      method: 'GET',
      url: `/materials/rolls/${rollPpfId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(rollCheck.json().currentMeters, 3.5);
  });

  test('8. CRITÉRIO DE ACEITE DE IDEMPOTÊNCIA: entregar a mesma OS uma 2ª e 3ª vez NÃO abate o estoque novamente', async () => {
    // 2ª execução
    const res2 = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlphaId}/consume-materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res2.statusCode, 200);
    const body2 = res2.json();
    assert.equal(body2.deductedCount, 0, 'Segunda execução deve processar ZERO baixas (Idempotente)');
    assert.equal(body2.alreadyDeducted, true);

    // 3ª execução
    const res3 = await app.inject({
      method: 'POST',
      url: `/work-orders/${workOrderAlphaId}/consume-materials`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(res3.statusCode, 200);
    assert.equal(res3.json().deductedCount, 0);

    // Conferir que o saldo permaneceu estritamente inalterado: 9 frascos e 3.5m
    const vitCheck = await app.inject({
      method: 'GET',
      url: `/materials/${materialVitrificadorId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(vitCheck.json().currentStock, 9, 'Vitrificador não deve ser abatido novamente');

    const rollCheck = await app.inject({
      method: 'GET',
      url: `/materials/rolls/${rollPpfId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(rollCheck.json().currentMeters, 3.5, 'Bobina de PPF não deve sofrer baixa duplicada');
  });

  test('9. CRITÉRIO DE ACEITE: saldo = soma dos movimentos (Consistência Matemática)', async () => {
    // Para o PPF:
    // Entrada inicial da bobina: +15.0m
    // Perda/waste: -1.5m
    // Consumo na OS: -10.0m
    // Soma total esperada = 3.5m
    const sumRes = await tenantQuery<{ sum: string }>(
      tenantAlphaId,
      'SELECT COALESCE(SUM(quantity), 0)::text AS sum FROM stock_movements WHERE tenant_id = $1 AND material_id = $2;',
      [tenantAlphaId, materialPpfId]
    );
    const sum = parseFloat(sumRes.rows[0].sum);
    assert.equal(sum, 3.5, 'Soma das movimentações deve ser estritamente igual a 3.5m');

    const matRes = await tenantQuery<{ current_stock: number }>(
      tenantAlphaId,
      'SELECT current_stock FROM materials WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, materialPpfId]
    );
    assert.equal(Number(matRes.rows[0].current_stock), sum, 'Saldo do material DEVE bater com a soma dos movimentos');
  });

  test('10. CRITÉRIO DE ACEITE: Alerta visual de Bobina de Película abaixo do mínimo configurado', async () => {
    // A bobina de PPF foi configurada com minAlertMeters = 4.0m.
    // Como a metragem atual é de 3.5m (3.5 <= 4.0), ela DEVE constar nos alertas de estoque crítico!
    const alertRes = await app.inject({
      method: 'GET',
      url: '/materials/alerts/low-stock',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(alertRes.statusCode, 200);
    const alerts = alertRes.json();
    assert.ok(alerts.criticalRolls.length >= 1, 'Deve conter pelo menos 1 bobina em nível crítico');
    const criticalRoll = alerts.criticalRolls.find((r: any) => r.id === rollPpfId);
    assert.ok(criticalRoll, 'A bobina de PPF testada deve constar no array de criticalRolls');
    assert.equal(criticalRoll.currentMeters, 3.5);
    assert.equal(criticalRoll.minAlertMeters, 4.0);
    assert.equal(criticalRoll.isLowMeters, true);
  });

  // ============================================================================
  // TESTES DE ISOLAMENTO MULTI-TENANT (RLS)
  // ============================================================================

  test('11. Oficina Beta NÃO pode consultar nem listar materiais da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/materials/${materialPpfId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina Beta não pode ver material da Oficina Alpha');
  });

  test('12. Oficina Beta NÃO pode movimentar nem alocar bobinas da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/materials/movements',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        materialId: materialPpfId,
        materialRollId: rollPpfId,
        movementType: 'exit',
        quantity: 1.0,
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina Beta é bloqueada ao tentar movimentar bobina de Alpha');
  });

  after(async () => {
    await app.close();
  });
});

