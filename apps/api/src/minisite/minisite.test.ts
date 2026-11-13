import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.9 — Mini-Site Institucional da Oficina, Portfólio e Captação de Leads', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let alphaToken: string;
  let betaToken: string;
  const alphaSlug = `alpha-detailing-${Date.now()}`;
  const betaSlug = `beta-garage-${Date.now()}`;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Criar Tenant Alpha
    const tAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
       VALUES ('Alpha Detailing Club', 'Alpha Detailing Club LTDA', 'contato@alphadetailing.com', '11988887777', $1, 'active')
       RETURNING id;`,
      [alphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = tAlpha.rows[0].id;

    // Atualizar branding de Alpha com dados do mini-site
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO tenant_branding (
        tenant_id, trade_name, minisite_enabled, minisite_headline, minisite_about,
        minisite_address, primary_color, whatsapp_phone
      ) VALUES (
        $1, 'Alpha Detailing Club', true, 'Referência em PPF e Vitrificação de Alto Padrão',
        'Há mais de 10 anos cuidando dos veículos mais exclusivos do Brasil.',
        'Av. Europa, 1200 - Jardins, São Paulo - SP', '#C8F52E', '11988887777'
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        minisite_enabled = true,
        minisite_headline = 'Referência em PPF e Vitrificação de Alto Padrão',
        minisite_about = 'Há mais de 10 anos cuidando dos veículos mais exclusivos do Brasil.',
        minisite_address = 'Av. Europa, 1200 - Jardins, São Paulo - SP',
        primary_color = '#C8F52E',
        whatsapp_phone = '11988887777';`,
      [tenantAlphaId]
    );

    // Inserir serviços em Alpha
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, description, category, price_cents, is_active)
       VALUES 
        ($1, 'PPF Frontal Completo', 'Película regenerativa XPEL', 'PPF', 750000, true),
        ($1, 'Polimento Técnico & Vitrificação', 'Correção de verniz e cerâmica Gyeon 5 anos', 'Vitrificação', 280000, true);`,
      [tenantAlphaId]
    );

    // Inserir usuário e token Alpha
    const pwd = await hashPassword('SenhaSegura123!');
    const uAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id;`,
      [`gestor@${alphaSlug}.com`, pwd],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, uAlpha.rows[0].id],
      { bypassRls: true }
    );
    alphaToken = signJwt({
      userId: uAlpha.rows[0].id,
      tenantId: tenantAlphaId,
      email: `gestor@${alphaSlug}.com`,
      role: 'owner',
      permissions: ['*'],
    });

    // 2. Criar Tenant Beta
    const tBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
       VALUES ('Beta Garage', 'Beta Garage Reparação LTDA', 'contato@betagarage.com', '11977776666', $1, 'active')
       RETURNING id;`,
      [betaSlug],
      { bypassRls: true }
    );
    tenantBetaId = tBeta.rows[0].id;

    const uBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id;`,
      [`gestor@${betaSlug}.com`, pwd],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [tenantBetaId, uBeta.rows[0].id],
      { bypassRls: true }
    );
    betaToken = signJwt({
      userId: uBeta.rows[0].id,
      tenantId: tenantBetaId,
      email: `gestor@${betaSlug}.com`,
      role: 'owner',
      permissions: ['*'],
    });
  });

  after(async () => {
    if (tenantAlphaId) {
      await tenantQuery(null, `DELETE FROM tenants WHERE id = $1;`, [tenantAlphaId], { bypassRls: true });
    }
    if (tenantBetaId) {
      await tenantQuery(null, `DELETE FROM tenants WHERE id = $1;`, [tenantBetaId], { bypassRls: true });
    }
    if (app) await app.close();
  });

  it('1. Consulta pública de mini-site por slug (/public/tenant/:slug/site) responde sem JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/tenant/${alphaSlug}/site`,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    assert.strictEqual(body.tenant.name, 'Alpha Detailing Club');
    assert.strictEqual(body.tenant.slug, alphaSlug);
    assert.strictEqual(body.tenant.headline, 'Referência em PPF e Vitrificação de Alto Padrão');
    assert.strictEqual(body.tenant.primaryColor, '#C8F52E');
    assert.strictEqual(Array.isArray(body.services), true);
    assert.ok(body.services.length >= 2);
    assert.strictEqual(body.services[0].name, 'PPF Frontal Completo');
    assert.ok(body.reputation.averageStars >= 4.0);
  });

  it('2. Retorna HTTP 404 para slug inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/tenant/loja-fantasma-inexistente/site`,
    });

    assert.strictEqual(res.statusCode, 404);
  });

  it('3. Captação pública de lead / orçamento (/public/tenant/:slug/leads)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/tenant/${alphaSlug}/leads`,
      payload: {
        name: 'Carlos Drummond',
        phone: '11999991234',
        vehicleModel: 'Porsche Carrera GTS',
        serviceInterest: 'Aplicação de PPF Completo',
        message: 'Gostaria de agendar para a próxima terça-feira.',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const lead = JSON.parse(res.payload);

    assert.strictEqual(lead.name, 'Carlos Drummond');
    assert.strictEqual(lead.vehicleModel, 'Porsche Carrera GTS');
    assert.strictEqual(lead.status, 'new');
    assert.ok(lead.whatsappUrl.includes('wa.me'));
  });

  it('4. Gestor autenticado gerencia itens de portfólio (POST e GET /minisite/portfolio)', async () => {
    // Inserir item
    const postRes = await app.inject({
      method: 'POST',
      url: '/minisite/portfolio',
      headers: { 
        authorization: `Bearer ${alphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        title: 'Vitrificação 9H - Ferrari F8 Tributo',
        category: 'Vitrificação',
        afterImageUrl: 'https://images.unsplash.com/photo-ferrari-after.jpg',
        description: 'Correção profunda em 3 etapas com proteção cerâmica de 5 anos.',
        isFeatured: true,
        displayOrder: 1,
      },
    });

    assert.strictEqual(postRes.statusCode, 201);
    const createdItem = JSON.parse(postRes.payload);
    assert.strictEqual(createdItem.title, 'Vitrificação 9H - Ferrari F8 Tributo');
    assert.strictEqual(createdItem.isFeatured, true);

    // Listar portfólio
    const getRes = await app.inject({
      method: 'GET',
      url: '/minisite/portfolio',
      headers: { 
        authorization: `Bearer ${alphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(getRes.statusCode, 200);
    const list = JSON.parse(getRes.payload);
    assert.ok(list.some((item: any) => item.id === createdItem.id));
  });

  it('5. Gestor autenticado visualiza leads e atualiza status (PATCH /minisite/leads/:id/status)', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/minisite/leads',
      headers: { 
        authorization: `Bearer ${alphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(listRes.statusCode, 200);
    const leads = JSON.parse(listRes.payload);
    assert.ok(leads.length > 0);
    const targetLead = leads[0];

    // Atualizar status para contacted
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/minisite/leads/${targetLead.id}/status`,
      headers: { 
        authorization: `Bearer ${alphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: { status: 'contacted' },
    });

    assert.strictEqual(patchRes.statusCode, 200);
  });

  it('6. ISOLAMENTO MULTI-TENANT: Oficina Beta não consegue visualizar nem alterar dados de Alpha', async () => {
    // 1. Beta tenta listar os leads de Alpha (deve receber lista vazia da sua própria loja)
    const betaLeadsRes = await app.inject({
      method: 'GET',
      url: '/minisite/leads',
      headers: { 
        authorization: `Bearer ${betaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.strictEqual(betaLeadsRes.statusCode, 200);
    const betaLeads = JSON.parse(betaLeadsRes.payload);
    assert.strictEqual(betaLeads.length, 0); // Beta não tem leads ainda

    // 2. Beta tenta listar itens de portfólio de Alpha
    const betaPortfolioRes = await app.inject({
      method: 'GET',
      url: '/minisite/portfolio',
      headers: { 
        authorization: `Bearer ${betaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.strictEqual(betaPortfolioRes.statusCode, 200);
    const betaPortfolio = JSON.parse(betaPortfolioRes.payload);
    assert.strictEqual(betaPortfolio.length, 0); // Beta não enxerga a Ferrari de Alpha
  });
});
