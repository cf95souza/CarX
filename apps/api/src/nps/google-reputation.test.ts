import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.8 — Motor de Reputação no Google Meu Negócio', () => {
  let app: FastifyInstance;

  // Tenant Alpha (Oficina com Reputação Google)
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let workOrderAlpha1Id: string;
  let workOrderAlpha2Id: string;

  // Tenant Beta (Isolamento Multi-tenant)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@Reputation2026!');

    // 1. Setup Tenant Alpha
    tenantAlphaSlug = `alpha-reputation-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Prime Detailing', 'Alpha Prime LTDA', $1, $2, '22.333.444/0001-55', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Gestor Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha Prime', $1, $2)
       RETURNING id`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    const ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'owner',
      permissions: ['*'],
    });

    // Cliente e Veículo
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, phone, email)
       VALUES ($1, 'Marcelo Viana', '11988887777', 'marcelo@viana.local')
       RETURNING id`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, size_class)
       VALUES ($1, $2, 'REP1A23', 'BMW', 'M3 Competition', 'esportivo')
       RETURNING id`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // Work Orders
    const resWo1 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 901, 'DELIVERED', 500000, 500000, 500000)
       RETURNING id`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlpha1Id = resWo1.rows[0].id;

    const resWo2 = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 902, 'DELIVERED', 150000, 150000, 150000)
       RETURNING id`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlpha2Id = resWo2.rows[0].id;

    // 2. Setup Tenant Beta
    tenantBetaSlug = `beta-reputation-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Prime Detailing', 'Beta Prime LTDA', $1, $2, '33.444.555/0001-66', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta Prime', $1, $2)
       RETURNING id`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    const ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'owner',
      permissions: ['*'],
    });
  });

  after(async () => {
    await app.close();
  });

  test('1. Configuração do link oficial do Google Meu Negócio (PUT /nps/google-review-url)', async () => {
    const googleUrl = 'https://g.page/r/alphaprimedetailing/review';

    const res = await app.inject({
      method: 'PUT',
      url: '/nps/google-review-url',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        googleReviewUrl: googleUrl,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.googleReviewUrl, googleUrl);
  });

  test('2. Cliente Promotor (Nota 10) recebe convite para o Google Meu Negócio', async () => {
    // 2.1 Criar pesquisa NPS para a OS 901
    const resCreate = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlpha1Id,
      },
    });
    assert.equal(resCreate.statusCode, 201);
    const survey1 = resCreate.json();
    assert.ok(survey1.token);

    // 2.2 Cliente responde à pesquisa pública com nota 10 (Promotor)
    const resAnswer = await app.inject({
      method: 'POST',
      url: `/public/nps/${survey1.token}`,
      payload: {
        score: 10,
        comment: 'Serviço impecável na BMW M3! Acabamento perfeito.',
      },
    });

    assert.equal(resAnswer.statusCode, 200);
    const answerBody = resAnswer.json();
    assert.equal(answerBody.isPromoter, true);
    assert.equal(answerBody.googleReviewSuggested, true);
    assert.equal(answerBody.googleReviewUrl, 'https://g.page/r/alphaprimedetailing/review');
    assert.equal(answerBody.survey.classification, 'promoter');

    // 2.3 Registro de clique no Google Meu Negócio (POST /public/nps/:token/google-click)
    const resClick = await app.inject({
      method: 'POST',
      url: `/public/nps/${survey1.token}/google-click`,
    });
    assert.equal(resClick.statusCode, 200);
    assert.equal(resClick.json().success, true);
  });

  test('3. Cliente Detrator (Nota 4) NÃO recebe convite para o Google e gera alerta', async () => {
    // 3.1 Criar pesquisa NPS para a OS 902
    const resCreate = await app.inject({
      method: 'POST',
      url: '/nps/surveys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlpha2Id,
      },
    });
    assert.equal(resCreate.statusCode, 201);
    const survey2 = resCreate.json();

    // 3.2 Cliente responde com nota 4
    const resAnswer = await app.inject({
      method: 'POST',
      url: `/public/nps/${survey2.token}`,
      payload: {
        score: 4,
        comment: 'Atrasou a entrega do veículo.',
      },
    });

    assert.equal(resAnswer.statusCode, 200);
    const answerBody = resAnswer.json();
    assert.equal(answerBody.isPromoter, false);
    assert.equal(answerBody.isDetractor, true);
    assert.equal(answerBody.googleReviewSuggested, false);
    assert.equal(answerBody.survey.classification, 'detractor');
  });

  test('4. Disparo / Reenvio manual do convite via WhatsApp (POST /nps/surveys/:id/send-google-invite)', async () => {
    // Busca a pesquisa do cliente promotor
    const listRes = await app.inject({
      method: 'GET',
      url: '/nps/surveys?classification=promoter',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const promoters = listRes.json();
    assert.ok(promoters.length >= 1);
    const promoterSurveyId = promoters[0].id;

    // Dispara convite
    const resInvite = await app.inject({
      method: 'POST',
      url: `/nps/surveys/${promoterSurveyId}/send-google-invite`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(resInvite.statusCode, 200);
    const inviteBody = resInvite.json();
    assert.equal(inviteBody.success, true);
    // Como a oficina não possui gateway ativo conectado neste ambiente de teste, utiliza o modo manual wa.me seguro
    assert.ok(inviteBody.mode === 'manual' || inviteBody.mode === 'gateway');
    if (inviteBody.mode === 'manual') {
      assert.ok(inviteBody.whatsappUrl.includes('https://wa.me/'));
      assert.ok(inviteBody.whatsappUrl.includes('alphaprimedetailing'));
    }
  });

  test('5. Visão Consolidada de Reputação no Google (GET /nps/reputation-overview)', async () => {
    const resOverview = await app.inject({
      method: 'GET',
      url: '/nps/reputation-overview',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(resOverview.statusCode, 200);
    const overview = resOverview.json();
    assert.equal(overview.googleReviewUrl, 'https://g.page/r/alphaprimedetailing/review');
    assert.ok(overview.promotersCount >= 1);
    assert.ok(overview.googleReviewsClicked >= 1);
    assert.ok(overview.conversionRatePercent > 0);
    assert.ok(Array.isArray(overview.topPromoters));
    assert.ok(overview.topPromoters.length >= 1);
    assert.equal(overview.topPromoters[0].customerName, 'Marcelo Viana');
    assert.ok(overview.topPromoters[0].manualWhatsAppUrl.includes('https://wa.me/'));
  });

  test('6. ISOLAMENTO MULTI-TENANT: Oficina Beta não visualiza a URL nem os promotores da Oficina Alpha', async () => {
    const resBeta = await app.inject({
      method: 'GET',
      url: '/nps/reputation-overview',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(resBeta.statusCode, 200);
    const betaOverview = resBeta.json();
    assert.equal(betaOverview.googleReviewUrl, null);
    assert.equal(betaOverview.promotersCount, 0);
    assert.equal(betaOverview.topPromoters.length, 0);
  });
});

