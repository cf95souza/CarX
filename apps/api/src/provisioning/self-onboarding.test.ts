import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { adminPool, pool } from '../database/db.js';

describe('T5.3 — Onboarding Self-Service Guiado por Segmento Automotivo', () => {
  let app: FastifyInstance;

  before(async () => {
    app = buildServer();
    await app.ready();
  });

  after(async () => {
    await app.close();
    await pool.end();
    await adminPool.end();
  });

  it('1. AUTO-CADASTRO: POST /public/onboarding cria oficina, injeta catálogo/checklists de PPF e retorna tokens de login', async () => {
    const uniqueSuffix = Date.now();
    const tradeName = `Elite PPF Studio ${uniqueSuffix}`;
    const ownerEmail = `proprietario-${uniqueSuffix}@eliteppf.com.br`;

    const res = await app.inject({
      method: 'POST',
      url: '/public/onboarding',
      payload: {
        trade_name: tradeName,
        owner_name: 'Marcos Vinicius',
        owner_email: ownerEmail,
        owner_password: 'SenhaSegura@2026',
        phone: '11999887766',
        segment: 'ppf',
        plan_slug: 'profissional',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);

    assert.equal(body.success, true);
    assert.ok(body.tokens?.accessToken, 'Deve retornar accessToken');
    assert.ok(body.tokens?.refreshToken, 'Deve retornar refreshToken');
    assert.equal(body.tenant.trade_name, tradeName);
    assert.equal(body.tenant.segment, 'ppf');
    assert.equal(body.user.email, ownerEmail);
    assert.equal(body.user.role, 'owner');

    // Validar injeção do catálogo de PPF
    assert.equal(body.injectedCatalog.servicesCount, 5, 'Deve ter injetado 5 serviços de PPF');
    assert.equal(body.injectedCatalog.checklistTemplatesCount, 1, 'Deve ter injetado 1 template de checklist');

    // Validar checklist de boas-vindas retornado
    assert.equal(body.firstStepsChecklist.length, 4);
    assert.equal(body.firstStepsChecklist[0].completed, true, 'Primeiro passo (Setup) já deve nascer concluído');

    // Validar no PostgreSQL
    const tenantDb = await adminPool.query<{ id: string; status: string; trial_ends_at: string }>(
      'SELECT id, status, trial_ends_at FROM tenants WHERE id = $1',
      [body.tenant.id]
    );
    assert.equal(tenantDb.rows[0].status, 'trialing');
    assert.ok(new Date(tenantDb.rows[0].trial_ends_at) > new Date());

    // Validar serviços inseridos
    const servDb = await adminPool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM services WHERE tenant_id = $1 AND segment = $2',
      [body.tenant.id, 'ppf']
    );
    assert.equal(parseInt(servDb.rows[0].count, 10), 5);
  });

  it('2. BLINDAGEM ANTI-BOT: Campo website (honeypot) preenchido descarta silenciosamente sem cadastrar', async () => {
    const uniqueSuffix = Date.now();
    const spamEmail = `spammer-${uniqueSuffix}@bot.com`;

    const res = await app.inject({
      method: 'POST',
      url: '/public/onboarding',
      payload: {
        trade_name: 'Bot Spam Oficina',
        owner_name: 'Spam Bot',
        owner_email: spamEmail,
        owner_password: 'Password123!',
        segment: 'mecanica',
        website: 'https://spam-link-viagra.com', // Honeypot ativo
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);

    // Conferir que o bot NÃO foi gravado no banco de dados
    const userDb = await adminPool.query('SELECT id FROM users WHERE email = $1', [spamEmail]);
    assert.equal(userDb.rows.length, 0, 'Spam não pode ser gravado');
  });

  it('3. CONFLITO DE E-MAIL: Rejeita cadastro duplicado com HTTP 409', async () => {
    const uniqueSuffix = Date.now();
    const email = `duplicado-${uniqueSuffix}@autocenter.com`;

    // 1º Cadastro
    const res1 = await app.inject({
      method: 'POST',
      url: '/public/onboarding',
      payload: {
        trade_name: 'Primeira Loja',
        owner_name: 'Carlos',
        owner_email: email,
        owner_password: 'SenhaValida@2026',
        segment: 'detailing',
      },
    });
    assert.equal(res1.statusCode, 201);

    // 2º Cadastro com o mesmo e-mail
    const res2 = await app.inject({
      method: 'POST',
      url: '/public/onboarding',
      payload: {
        trade_name: 'Segunda Loja Concorrente',
        owner_name: 'Carlos Fake',
        owner_email: email,
        owner_password: 'OutraSenha@2026',
        segment: 'detailing',
      },
    });
    assert.equal(res2.statusCode, 409);
    const body2 = JSON.parse(res2.body);
    assert.ok(body2.message.includes('já possui uma conta'));
  });

  it('4. CRITÉRIO DE ACEITE ESTREITO: Usuário sai do auto-cadastro e cria seu primeiro cliente, veículo e primeira OS completa', async () => {
    const uniqueSuffix = Date.now();
    const ownerEmail = `diretor-${uniqueSuffix}@detailingpro.com.br`;

    // 1. O dono realiza o cadastro na Landing Page
    const signupRes = await app.inject({
      method: 'POST',
      url: '/public/onboarding',
      payload: {
        trade_name: `Detailing Pro Elite ${uniqueSuffix}`,
        owner_name: 'Guilherme Detailing',
        owner_email: ownerEmail,
        owner_password: 'SenhaForte@2026',
        segment: 'detailing',
        plan_slug: 'profissional',
      },
    });

    assert.equal(signupRes.statusCode, 201);
    const signupData = JSON.parse(signupRes.body);
    const token = signupData.tokens.accessToken;
    const tenantId = signupData.tenant.id;

    const authHeaders = {
      authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    };

    // 2. Verificar status inicial do Onboarding: apenas passo 1 (setup) concluído
    const initialStatusRes = await app.inject({
      method: 'GET',
      url: '/tenant/onboarding/status',
      headers: authHeaders,
    });
    assert.equal(initialStatusRes.statusCode, 200);
    const initialStatus = JSON.parse(initialStatusRes.body);
    assert.equal(initialStatus.is_completed, false);
    assert.equal(initialStatus.progress_percent, 25);
    assert.equal(initialStatus.steps[0].completed, true);
    assert.equal(initialStatus.steps[1].completed, false);
    assert.equal(initialStatus.steps[2].completed, false);

    // 3. Cadastrar Primeiro Cliente e Veículo
    const customerRes = await app.inject({
      method: 'POST',
      url: '/customers',
      headers: authHeaders,
      payload: {
        name: 'Roberto Porsche',
        email: `cliente-${uniqueSuffix}@gmail.com`,
        phone: '11988887777',
      },
    });
    assert.equal(customerRes.statusCode, 201);
    const customerData = JSON.parse(customerRes.body);
    const customerId = customerData.id || customerData.customer?.id;

    const plate = `POR${uniqueSuffix.toString().slice(-4)}`;
    const vehicleRes = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: authHeaders,
      payload: {
        customer_id: customerId,
        plate,
        brand: 'Porsche',
        model: '911 Carrera S',
        year: 2024,
        color: 'Preto Metálico',
        size_class: 'esportivo',
      },
    });
    assert.equal(vehicleRes.statusCode, 201);
    const vehicleData = JSON.parse(vehicleRes.body);
    const vehicleId = vehicleData.id || vehicleData.vehicle?.id;

    // 4. Obter um dos serviços injetados automaticamente no provisionamento
    const servicesRes = await app.inject({
      method: 'GET',
      url: '/catalog/services',
      headers: authHeaders,
    });
    assert.equal(servicesRes.statusCode, 200);
    const servicesList = JSON.parse(servicesRes.body);
    assert.ok(servicesList.length >= 1, 'Deve ter pelo menos um serviço do catálogo de detailing');
    const chosenService = servicesList[0];

    // 5. Criar a Primeira Ordem de Serviço (OS) com o serviço injetado
    const orderRes = await app.inject({
      method: 'POST',
      url: '/work-orders',
      headers: authHeaders,
      payload: {
        customerId,
        vehicleId,
        status: 'QUOTE',
        notes: 'Cliente quer vitrificação cerâmica completa e polimento técnico.',
        items: [
          {
            serviceId: chosenService.id,
            name: chosenService.name,
            quantity: 1,
            unitPriceCents: chosenService.price_cents || 120000,
            estimatedMinutes: chosenService.estimated_minutes || 180,
          },
        ],
      },
    });
    assert.equal(orderRes.statusCode, 201);
    const orderData = JSON.parse(orderRes.body);
    assert.ok(orderData.id || orderData.workOrder?.id, 'OS deve ser gerada');

    // 6. Consultar o Status do Onboarding atualizado: agora tem cliente e OS!
    const midStatusRes = await app.inject({
      method: 'GET',
      url: '/tenant/onboarding/status',
      headers: authHeaders,
    });
    assert.equal(midStatusRes.statusCode, 200);
    const midStatus = JSON.parse(midStatusRes.body);
    assert.equal(midStatus.steps[1].completed, true, 'Passo de cliente cadastrado deve estar concluído');
    assert.equal(midStatus.steps[2].completed, true, 'Passo de primeira OS aberta deve estar concluído');
    assert.ok(midStatus.progress_percent >= 75);

    // 7. Marcar passo do PWA e concluir o Onboarding
    const stepRes = await app.inject({
      method: 'POST',
      url: '/tenant/onboarding/step',
      headers: authHeaders,
      payload: { stepId: 'explore_pwa' },
    });
    assert.equal(stepRes.statusCode, 200);

    const completeRes = await app.inject({
      method: 'POST',
      url: '/tenant/onboarding/complete',
      headers: authHeaders,
    });
    assert.equal(completeRes.statusCode, 200);
    assert.equal(JSON.parse(completeRes.body).is_completed, true);

    // 8. Validação final: Onboarding agora marca 100% completo
    const finalStatusRes = await app.inject({
      method: 'GET',
      url: '/tenant/onboarding/status',
      headers: authHeaders,
    });
    assert.equal(finalStatusRes.statusCode, 200);
    assert.equal(JSON.parse(finalStatusRes.body).is_completed, true);
  });
});
