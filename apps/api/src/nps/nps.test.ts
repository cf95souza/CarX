import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T3.10 — Pesquisa NPS, Pós-Venda e Lembretes de Revisão', () => {
  let app: any;
  const timestamp = Date.now();

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let woAlpha1Id: string;
  let woAlpha2Id: string;
  let woAlpha3Id: string;

  // Oficina Beta (Concorrente)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  // Tokens de pesquisa gerados
  let surveyToken1: string;
  let surveyToken2: string;
  let surveyToken3: string;
  let createdReminderId: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    const passHash = await hashPassword('SenhaSegura123!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-nps-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Detailing Alpha', 'Alpha Estética LTDA', $1, $2, '11.444.777/0001-33', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Ricardo', $1, $2)
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

    // Cliente e Veículo Alpha
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone)
       VALUES ($1, 'Fernando Albuquerque', 'fernando@nps.local', '11988882222')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'OPR-2026', 'BMW', 'M2 Coupé', 'Azul Zandvoort', 2024, 'sports')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // 3 Ordens de Serviço Alpha (DELIVERED)
    const resWo1 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, origin, total_cents, final_cents)
       VALUES ($1, $2, $3, 9001, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 400000, 400000)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    woAlpha1Id = resWo1.rows[0].id;

    const resWo2 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, origin, total_cents, final_cents)
       VALUES ($1, $2, $3, 9002, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 250000, 250000)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    woAlpha2Id = resWo2.rows[0].id;

    const resWo3 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, origin, total_cents, final_cents)
       VALUES ($1, $2, $3, 9003, '${WorkOrderStatus.DELIVERED}', 'INTERNAL', 150000, 150000)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    woAlpha3Id = resWo3.rows[0].id;

    // 2. Setup Oficina Beta (Concorrente)
    tenantBetaSlug = `beta-nps-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Oficina Concorrente', 'Beta LTDA', $1, $2, '99.888.333/0001-22', 'active', 'mecanica')
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
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
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. GERAÇÃO E CONSULTA DE PESQUISA NPS
  // ============================================================================

  test('deve criar pesquisa NPS para uma OS com token único (status: pending)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: woAlpha1Id,
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const survey = JSON.parse(res.body);

    surveyToken1 = survey.token;
    assert.ok(surveyToken1, 'Deve conter token UUID de resposta');
    assert.equal(survey.status, 'pending');
    assert.equal(survey.workOrderId, woAlpha1Id);
    assert.equal(survey.customerName, 'Fernando Albuquerque');
  });

  test('idempotência: criar pesquisa para a mesma OS retorna a pesquisa existente sem duplicar', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: woAlpha1Id,
      },
    });

    assert.equal(res.statusCode, 201);
    const survey = JSON.parse(res.body);
    assert.equal(survey.token, surveyToken1, 'Token retornado deve ser o mesmo');
  });

  test('consulta pública (/public/nps/:token) responde sem JWT com primeiro nome e placa mascarada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/nps/${surveyToken1}`,
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.equal(data.status, 'pending');
    assert.equal(data.customerFirstName, 'Fernando');
    assert.match(data.vehiclePlateMasked, /^OPR-\*{3}[0-9A-Z]$/);
    assert.equal(data.workshopTradeName, 'CarX Detailing Alpha');
  });

  // ============================================================================
  // 2. RESPOSTA DE PROMOTOR, NEUTRO E DETRATOR
  // ============================================================================

  test('deve responder NPS como PROMOTOR (nota 10) e sugerir avaliação no Google', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/nps/${surveyToken1}`,
      payload: {
        score: 10,
        comment: 'Serviço de PPF impecável! Atendimento nota 10.',
        googleReviewClicked: true,
      },
    });

    assert.equal(res.statusCode, 200);
    const result = JSON.parse(res.body);

    assert.equal(result.isPromoter, true);
    assert.equal(result.isDetractor, false);
    assert.equal(result.googleReviewSuggested, true);
    assert.equal(result.survey.score, 10);
    assert.equal(result.survey.classification, 'promoter');
    assert.equal(result.survey.status, 'answered');
    assert.ok(result.survey.answeredAt);
  });

  test('CRITÉRIO FUNDAMENTAL: responder pela segunda vez ao mesmo link é estritamente bloqueado (HTTP 409 Conflict)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/nps/${surveyToken1}`,
      payload: {
        score: 9,
        comment: 'Tentando responder novamente para alterar a nota.',
      },
    });

    assert.equal(res.statusCode, 409, `Deve retornar 409 Conflict: ${res.body}`);
    const err = JSON.parse(res.body);
    assert.equal(err.error, 'SURVEY_ALREADY_ANSWERED');
  });

  test('deve responder NPS como DETRATOR (nota 3) e gerar alerta para a gestão', async () => {
    // Cria 2ª pesquisa
    const resSurvey2 = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: { workOrderId: woAlpha2Id },
    });
    surveyToken2 = JSON.parse(resSurvey2.body).token;

    // Responde como Detrator
    const res = await app.inject({
      method: 'POST',
      url: `/public/nps/${surveyToken2}`,
      payload: {
        score: 3,
        comment: 'Houve atraso de 2 horas na entrega e encontrei uma marca no carpete.',
      },
    });

    assert.equal(res.statusCode, 200);
    const result = JSON.parse(res.body);

    assert.equal(result.isPromoter, false);
    assert.equal(result.isDetractor, true);
    assert.equal(result.googleReviewSuggested, false);
    assert.equal(result.survey.classification, 'detractor');

    // Valida registro de alerta em audit_logs
    const auditRes = await tenantQuery<{ action: string }>(
      tenantAlphaId,
      `SELECT action FROM audit_logs WHERE tenant_id = $1 AND action = 'NPS_DETRACTOR_ALERT' ORDER BY created_at DESC LIMIT 1;`,
      [tenantAlphaId]
    );
    assert.equal(auditRes.rows[0].action, 'NPS_DETRACTOR_ALERT');
  });

  test('deve responder NPS como NEUTRO/PASSIVO (nota 8)', async () => {
    // Cria 3ª pesquisa
    const resSurvey3 = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: { workOrderId: woAlpha3Id },
    });
    surveyToken3 = JSON.parse(resSurvey3.body).token;

    const res = await app.inject({
      method: 'POST',
      url: `/public/nps/${surveyToken3}`,
      payload: {
        score: 8,
        comment: 'Bom serviço, dentro do esperado.',
      },
    });

    assert.equal(res.statusCode, 200);
    const result = JSON.parse(res.body);
    assert.equal(result.survey.classification, 'passive');
  });

  // ============================================================================
  // 3. SCORECARD DE MÉTRICAS NPS DO GESTOR
  // ============================================================================

  test('deve calcular o Score NPS (-100 a +100) e distribuição percentual real no servidor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nps/metrics',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const metrics = JSON.parse(res.body);

    assert.equal(metrics.totalSurveys, 3);
    assert.equal(metrics.totalAnswered, 3);
    assert.equal(metrics.responseRate, 100);
    assert.equal(metrics.promotersCount, 1);
    assert.equal(metrics.passivesCount, 1);
    assert.equal(metrics.detractorsCount, 1);

    // 1 Promotor (33%) e 1 Detrator (33%) -> NPS Score = 33 - 33 = 0
    assert.equal(metrics.npsScore, 0);
    assert.equal(metrics.averageScore, 7.0); // (10 + 3 + 8) / 3 = 21 / 3 = 7.0
  });

  // ============================================================================
  // 4. RÉGUA DE LEMBRETES DE REVISÃO E PÓS-VENDA
  // ============================================================================

  test('deve agendar lembrete de revisão de garantia para daqui a 6 meses', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);

    const res = await app.inject({
      method: 'POST',
      url: '/maintenance/reminders',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: woAlpha1Id,
        serviceName: 'PPF Frontal — Revisão Semestral de Cantos',
        reminderType: 'warranty_check',
        scheduledFor: futureDate.toISOString(),
        messagePreview: 'Olá Fernando! Seu PPF completa 6 meses. Venha fazer a inspeção gratuita de garantia.',
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const reminder = JSON.parse(res.body);

    createdReminderId = reminder.id;
    assert.equal(reminder.serviceName, 'PPF Frontal — Revisão Semestral de Cantos');
    assert.equal(reminder.status, 'scheduled');
    assert.equal(reminder.customerName, 'Fernando Albuquerque');
    assert.equal(reminder.vehiclePlate, 'OPR-2026');
  });

  test('deve atualizar status do lembrete para enviado (sent)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/maintenance/reminders/${createdReminderId}/status`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        status: 'sent',
      },
    });

    assert.equal(res.statusCode, 200);
    const updated = JSON.parse(res.body);
    assert.equal(updated.status, 'sent');
    assert.ok(updated.sentAt);
  });

  // ============================================================================
  // 5. ISOLAMENTO RLS CROSS-TENANT
  // ============================================================================

  test('ISOLAMENTO RLS: Oficina Beta não consegue visualizar pesquisas nem métricas da Oficina Alpha', async () => {
    // 1. Pesquisas da Alpha são invisíveis para a Beta
    const resSurveys = await app.inject({
      method: 'GET',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(resSurveys.statusCode, 200);
    const list = JSON.parse(resSurveys.body);
    assert.equal(list.length, 0, 'Oficina Beta deve ver 0 pesquisas da Oficina Alpha');

    // 2. Métricas da Beta são zeradas
    const resMetrics = await app.inject({
      method: 'GET',
      url: '/nps/metrics',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(resMetrics.statusCode, 200);
    const metrics = JSON.parse(resMetrics.body);
    assert.equal(metrics.totalSurveys, 0);
    assert.equal(metrics.npsScore, 0);
  });
});

