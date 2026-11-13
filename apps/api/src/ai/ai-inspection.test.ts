import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.14 — Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento)', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlphaGestor: string;
  let userAlphaGestorId: string;
  let workOrderAlphaId: string;
  let workOrderBetaId: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;

  before(async () => {
    try {
      app = buildServer();
      await app.ready();

      // 1. Tenants Alpha e Beta
      const tAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Alpha AI Studio', 'Alpha AI Detailing LTDA', 'ai@alpha.com', '11999993333', $1, 'active')
         RETURNING id;`,
        [`alpha-ai-${Date.now()}`],
        { bypassRls: true }
      );
      tenantAlphaId = tAlpha.rows[0].id;

      const tBeta = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Beta AI Studio', 'Beta AI Detailing LTDA', 'ai@beta.com', '11999994444', $1, 'active')
         RETURNING id;`,
        [`beta-ai-${Date.now()}`],
        { bypassRls: true }
      );
      tenantBetaId = tBeta.rows[0].id;

      // 2. Usuário Gestor Alpha
      const pwdHash = await hashPassword('Gestor@123456');
      const uAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Gestor Vistoria AI', $1, $2) RETURNING id;`,
        [`gestor_ai_${Date.now()}@alpha.com`, pwdHash],
        { bypassRls: true }
      );
      userAlphaGestorId = uAlpha.rows[0].id;

      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'gestor', true);`,
        [tenantAlphaId, userAlphaGestorId],
        { bypassRls: true }
      );

      tokenAlphaGestor = signJwt({
        id: userAlphaGestorId,
        email: `gestor_ai_${Date.now()}@alpha.com`,
        name: 'Gestor Vistoria AI',
        role: 'gestor',
        tenantId: tenantAlphaId,
      });

      // 3. Cliente e Veículo Alpha
      const cAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO customers (tenant_id, name, phone, email)
         VALUES ($1, 'Cliente Vistoria AI', '11988887777', 'cliente.ai@alpha.com')
         RETURNING id;`,
        [tenantAlphaId]
      );
      customerAlphaId = cAlpha.rows[0].id;

      const vAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, current_km)
         VALUES ($1, $2, $3, 'Porsche', '911 Carrera GTS', 'Cinza Giz', 12500)
         RETURNING id;`,
        [tenantAlphaId, customerAlphaId, `AI${Math.floor(1000 + Math.random() * 9000)}`]
      );
      vehicleAlphaId = vAlpha.rows[0].id;

      // 4. Ordem de Serviço Alpha
      const woAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents)
         VALUES ($1, $2, $3, 8001, 'PENDING', 0)
         RETURNING id;`,
        [tenantAlphaId, customerAlphaId, vehicleAlphaId]
      );
      workOrderAlphaId = woAlpha.rows[0].id;

      // 5. Ordem de Serviço Beta (para teste de isolamento multi-tenant)
      const cBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO customers (tenant_id, name, phone)
         VALUES ($1, 'Cliente Beta', '11977776666') RETURNING id;`,
        [tenantBetaId]
      );
      const vBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model)
         VALUES ($1, $2, 'BET9999', 'BMW', 'M3 Competition') RETURNING id;`,
        [tenantBetaId, cBeta.rows[0].id]
      );
      const woBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents)
         VALUES ($1, $2, $3, 9001, 'PENDING', 0) RETURNING id;`,
        [tenantBetaId, cBeta.rows[0].id, vBeta.rows[0].id]
      );
      workOrderBetaId = woBeta.rows[0].id;
    } catch (err) {
      console.error('Erro no setup do teste de IA de vistoria:', err);
      throw err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. Deve analisar foto de veículo (ângulo frontal) e pré-detectar avarias no capô com sugestão de PPF e Polimento', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/inspections/analyze-damage',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlphaId,
        angleHint: 'front',
        vehicleType: 'car',
        imageUrl: 'https://minio.carx.local/inspections/porsche_front.jpg',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    assert.ok(body.analysisId, 'Deve retornar ID da análise de IA');
    assert.ok(Array.isArray(body.detectedDamages), 'Deve retornar lista de avarias');
    assert.ok(body.detectedDamages.length >= 2, 'Deve identificar ao menos 2 avarias no conjunto frontal');

    const capoDmg = body.detectedDamages.find((d: any) => d.part === 'capo');
    assert.ok(capoDmg, 'Deve identificar dano no capô');
    assert.strictEqual(capoDmg.damageType, 'paint_chip');
    assert.ok(capoDmg.confidence >= 0.8, 'Confiança deve ser alta');
    assert.strictEqual(capoDmg.view, 'top');
    assert.ok(capoDmg.xPercent > 0 && capoDmg.yPercent > 0, 'Deve conter coordenadas para o diagrama 2D');

    // Serviços sugeridos
    assert.ok(Array.isArray(body.suggestedServices), 'Deve sugerir serviços pertinentes');
    const ppfSrv = body.suggestedServices.find((s: any) => s.category === 'ppf');
    assert.ok(ppfSrv, 'Deve sugerir serviço de Película PPF Frontal');
    assert.ok(ppfSrv.estimatedPriceCents > 0, 'Serviço deve ter valor estimado em centavos');

    // Verifica persistência na tabela ai_inspection_analyses
    const dbCheck = await tenantQuery<{ id: string; provider: string }>(
      tenantAlphaId,
      `SELECT id, provider FROM ai_inspection_analyses WHERE id = $1 AND tenant_id = $2;`,
      [body.analysisId, tenantAlphaId]
    );
    assert.strictEqual(dbCheck.rows.length, 1);
  });

  it('2. Deve analisar foto de ângulo lateral e detectar avaria de porta com sugestão de Martelinho de Ouro PDR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/inspections/analyze-damage',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlphaId,
        angleHint: 'lateral_esquerda',
        vehicleType: 'car',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    const dentDmg = body.detectedDamages.find((d: any) => d.damageType === 'dent');
    assert.ok(dentDmg, 'Deve identificar amassado sem quebra de tinta');
    assert.strictEqual(dentDmg.view, 'left');

    const pdrSrv = body.suggestedServices.find((s: any) => s.name.includes('Martelinho'));
    assert.ok(pdrSrv, 'Deve sugerir serviço de Martelinho de Ouro PDR');
    assert.strictEqual(pdrSrv.estimatedPriceCents, 18000);
  });

  it('3. Deve extrair dados estruturados de check-in a partir de notas de voz (KM, combustível, checklist e queixas)', async () => {
    const spokenVoiceText =
      'Carro entregue com setenta e dois mil km, tanque meio cheio, estepe conferido presente no porta-malas, cliente pediu orçamento para vitrificação cerâmica e tirar um risco no para-choque.';

    const res = await app.inject({
      method: 'POST',
      url: '/ai/inspections/extract-voice',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlphaId,
        spokenText: spokenVoiceText,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    assert.strictEqual(body.currentKm, 72000, 'Deve extrair 72.000 KM com precisão');
    assert.strictEqual(body.fuelLevel, '1/2', 'Deve extrair nível meio tanque');
    assert.ok(Array.isArray(body.checklistItems), 'Deve conter itens de checklist inferidos');

    const spareTire = body.checklistItems.find((i: any) => i.id === 'spare_tire');
    assert.ok(spareTire, 'Item estepe deve estar na lista');
    assert.strictEqual(spareTire.checked, true, 'Estepe deve constar como presente');

    // Serviços sugeridos a partir da fala do cliente
    assert.ok(Array.isArray(body.suggestedServices), 'Deve sugerir serviços');
    const vtr = body.suggestedServices.find((s: any) => s.category === 'vitrificacao');
    assert.ok(vtr, 'Deve sugerir vitrificação citada na fala');
    const pol = body.suggestedServices.find((s: any) => s.category === 'estetica');
    assert.ok(pol, 'Deve sugerir polimento técnico citado');
  });

  it('4. Deve aplicar com 1 clique as sugestões da IA na OS, criando pontos de dano e itens de serviço', async () => {
    const applyPayload = {
      workOrderId: workOrderAlphaId,
      damages: [
        {
          part: 'capo',
          damageType: 'paint_chip',
          severity: 'medium',
          confidence: 0.95,
          view: 'top',
          xPercent: 50.0,
          yPercent: 30.0,
          description: 'Avaria detectada por Visão Computacional CarX',
        },
      ],
      services: [
        {
          name: 'Película de Proteção PPF Frontal',
          category: 'ppf',
          estimatedPriceCents: 240000,
          estimatedMinutes: 180,
          reason: 'Proteção contra lascas',
          selected: true,
        },
        {
          name: 'Polimento Técnico Localizado',
          category: 'estetica',
          estimatedPriceCents: 35000,
          estimatedMinutes: 60,
          reason: 'Correção de verniz',
          selected: true,
        },
      ],
      checklist: {
        currentKm: 72000,
        fuelLevel: '1/2',
        generalNotes: 'Vistoria aprovada com apontamentos da IA',
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/ai/inspections/apply-to-work-order',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: applyPayload,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.damagesAddedCount, 1);
    assert.strictEqual(body.servicesAddedCount, 2);
    assert.strictEqual(body.inspectionUpdated, true);

    // Confirma persistência em inspection_damage_points
    const dpCheck = await tenantQuery<{ count: string }>(
      tenantAlphaId,
      `SELECT COUNT(*)::text as count FROM inspection_damage_points
       WHERE tenant_id = $1 AND part = 'capo';`,
      [tenantAlphaId]
    );
    assert.strictEqual(parseInt(dpCheck.rows[0].count, 10) >= 1, true);

    // Confirma itens de serviço inseridos em work_order_items
    const srvCheck = await tenantQuery<{ total: string }>(
      tenantAlphaId,
      `SELECT SUM(total_cents)::text as total FROM work_order_items
       WHERE tenant_id = $1 AND work_order_id = $2;`,
      [tenantAlphaId, workOrderAlphaId]
    );
    assert.strictEqual(parseInt(srvCheck.rows[0].total, 10), 275000); // 240000 + 35000

    // Confirma atualização do total_cents na OS
    const woCheck = await tenantQuery<{ total_cents: number }>(
      tenantAlphaId,
      `SELECT total_cents FROM work_orders WHERE id = $1 AND tenant_id = $2;`,
      [workOrderAlphaId, tenantAlphaId]
    );
    assert.strictEqual(woCheck.rows[0].total_cents, 275000);

    // Confirma atualização do KM no veículo
    const vehCheck = await tenantQuery<{ current_km: number }>(
      tenantAlphaId,
      `SELECT current_km FROM vehicles WHERE id = $1 AND tenant_id = $2;`,
      [vehicleAlphaId, tenantAlphaId]
    );
    assert.strictEqual(vehCheck.rows[0].current_km, 72000);
  });

  it('5. Deve garantir isolamento multi-tenant estrito: rejeitar aplicação de IA em OS de outro tenant', async () => {
    // Tenta aplicar sugestão na OS da Beta usando o tenantId Alpha
    const res = await app.inject({
      method: 'POST',
      url: '/ai/inspections/apply-to-work-order',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderBetaId,
        damages: [],
        services: [
          {
            name: 'Serviço Ilícito Cross-Tenant',
            category: 'estetica',
            estimatedPriceCents: 99999,
          },
        ],
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('não encontrada ou acesso não autorizado'));
  });

  it('6. Deve consultar o histórico de análises de IA realizadas para a OS', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/ai/inspections/history/${workOrderAlphaId}`,
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    assert.ok(Array.isArray(body.history));
    assert.ok(body.history.length >= 2, 'Deve conter ao menos 2 análises realizadas para a OS');
    assert.strictEqual(body.history[0].workOrderId, workOrderAlphaId);
  });
});

