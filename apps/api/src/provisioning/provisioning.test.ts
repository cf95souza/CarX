import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { provisioningService } from './provisioning-service.js';
import { FastifyInstance } from 'fastify';

describe('T2.11 — Assistente de Criação de Oficina e Provisionamento (Segmentos, Catálogo e Convites)', () => {
  let app: FastifyInstance;
  let superadminToken: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // Obter token de autenticação de Super Admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: {
        email: 'admin@carx.com.br',
        password: 'Admin@CarX2026!',
      },
    });

    const body = JSON.parse(loginRes.body);
    superadminToken = body.token;
    assert.ok(superadminToken, 'Deve autenticar superadmin com sucesso');
  });

  after(async () => {
    await app.close();
  });

  test('PROVISIONAMENTO PPF: cria oficina com subdomínio, injeta catálogo PPF e checklist de pintura', async () => {
    const slug = `oficina-ppf-${Date.now()}`;
    const payload = {
      trade_name: 'Studio PPF Elite Car',
      legal_name: 'Studio PPF Elite Automotiva LTDA',
      cnpj: '11.222.333/0001-44',
      slug,
      email: `${slug}@carx.com.br`,
      phone: '(11) 98888-7777',
      segment: 'ppf',
      owner_name: 'Rodrigo PPF Master',
      owner_email: `rodrigo.${slug}@carx.com.br`,
      owner_password: 'Senha@Rodrigo2026',
      plan_slug: 'pro',
      is_trial: true,
      trial_days: 14,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload,
    });

    assert.strictEqual(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const data = JSON.parse(res.body);

    assert.ok(data.tenant.id);
    assert.strictEqual(data.tenant.slug, slug);
    assert.strictEqual(data.tenant.segment, 'ppf');
    assert.strictEqual(data.services_count, 5, 'Deve injetar os 5 serviços base de PPF');
    assert.strictEqual(data.checklists_count, 1, 'Deve injetar 1 template de checklist de PPF');
    assert.ok(data.invitation.invite_url.includes(slug), 'URL de convite deve conter o subdomínio');

    // Verificar se os serviços existem no banco
    const servicesRes = await tenantQuery(
      data.tenant.id,
      'SELECT * FROM services WHERE tenant_id = $1 ORDER BY price_cents DESC',
      [data.tenant.id],
      { isSuperadmin: true }
    );

    assert.strictEqual(servicesRes.rows.length, 5);
    const serviceNames = servicesRes.rows.map((s: any) => s.name);
    assert.ok(serviceNames.some((n: string) => n.includes('PPF Full Body')));
    assert.ok(serviceNames.some((n: string) => n.includes('PPF Frontal Completo')));

    // Verificar checklist template no banco
    const checklistRes = await tenantQuery(
      data.tenant.id,
      'SELECT * FROM checklist_templates WHERE tenant_id = $1',
      [data.tenant.id],
      { isSuperadmin: true }
    );

    assert.strictEqual(checklistRes.rows.length, 1);
    assert.strictEqual(checklistRes.rows[0].segment, 'ppf');
    const items = checklistRes.rows[0].items;
    assert.ok(items.length >= 5, 'Checklist deve ter itens de inspeção');
    assert.ok(items.some((i: any) => i.label.includes('Micragem da Pintura')));
  });

  test('PROVISIONAMENTO INSULFILM: cria oficina e injeta catálogo de películas nano cerâmicas e segurança', async () => {
    const slug = `solar-film-${Date.now()}`;
    const payload = {
      trade_name: 'Solar Film Películas Térmicas',
      slug,
      email: `${slug}@carx.com.br`,
      segment: 'insulfilm',
      owner_name: 'Marcos Insulfilm',
      owner_email: `marcos.${slug}@carx.com.br`,
      plan_slug: 'start',
      is_trial: false,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload,
    });

    assert.strictEqual(res.statusCode, 201);
    const data = JSON.parse(res.body);

    assert.strictEqual(data.tenant.segment, 'insulfilm');
    assert.strictEqual(data.services_count, 5);

    // Consultar serviços via endpoint Super Admin
    const servicesGet = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${data.tenant.id}/services`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.strictEqual(servicesGet.statusCode, 200);
    const services = JSON.parse(servicesGet.body);
    assert.strictEqual(services.length, 5);
    assert.ok(services.some((s: any) => s.name.includes('Nano Cerâmica Térmica')));
    assert.ok(services.some((s: any) => s.name.includes('Antivandalismo PS8')));

    // Consultar convite via endpoint Super Admin
    const inviteGet = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${data.tenant.id}/invitations`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.strictEqual(inviteGet.statusCode, 200);
    const invites = JSON.parse(inviteGet.body);
    assert.strictEqual(invites.length, 1);
    assert.strictEqual(invites[0].recipient_email, payload.owner_email);
  });

  test('PROVISIONAMENTO DETAILING: cria estética automotiva com vitrificação 9H e oxi-sanitização', async () => {
    const slug = `detailing-pro-${Date.now()}`;
    const payload = {
      trade_name: 'Detailing Pro Estética',
      slug,
      email: `${slug}@carx.com.br`,
      segment: 'detailing',
      owner_name: 'Felipe Polidor',
      owner_email: `felipe.${slug}@carx.com.br`,
      plan_slug: 'prime',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload,
    });

    assert.strictEqual(res.statusCode, 201);
    const data = JSON.parse(res.body);

    assert.strictEqual(data.tenant.segment, 'detailing');

    const checklistsGet = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${data.tenant.id}/checklists`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.strictEqual(checklistsGet.statusCode, 200);
    const checklists = JSON.parse(checklistsGet.body);
    assert.strictEqual(checklists.length, 1);
    assert.strictEqual(checklists[0].segment, 'detailing');
  });

  test('PROVISIONAMENTO MECÂNICA GERAL: cria oficina mecânica padrão com revisão e scanner', async () => {
    const slug = `auto-mecanica-${Date.now()}`;
    const payload = {
      trade_name: 'Auto Mecânica São Jorge',
      slug,
      email: `${slug}@carx.com.br`,
      segment: 'mecanica',
      owner_name: 'Jorge Mecânico',
      owner_email: `jorge.${slug}@carx.com.br`,
      plan_slug: 'pro',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload,
    });

    assert.strictEqual(res.statusCode, 201);
    const data = JSON.parse(res.body);

    assert.strictEqual(data.tenant.segment, 'mecanica');
    assert.strictEqual(data.services_count, 5);
  });

  test('CRITÉRIO DE ACEITE: proprietário autentica e consulta serviços da sua loja imediatamente com RLS', async () => {
    const slug = `oficina-pronta-${Date.now()}`;
    const ownerEmail = `proprietario.${slug}@carx.com.br`;
    const ownerPassword = 'Senha@Pronta2026!';

    // 1. Provisionar oficina
    const createRes = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        trade_name: 'Oficina Pronta para Uso',
        slug,
        email: `${slug}@carx.com.br`,
        segment: 'mecanica',
        owner_name: 'Dono da Loja Pronta',
        owner_email: ownerEmail,
        owner_password: ownerPassword,
        plan_slug: 'pro',
      },
    });

    assert.strictEqual(createRes.statusCode, 201);
    const created = JSON.parse(createRes.body);
    const tenantId = created.tenant.id;

    // 2. Fazer login como o Proprietário no app da loja
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'x-tenant-id': tenantId,
      },
      payload: {
        email: ownerEmail,
        password: ownerPassword,
      },
    });

    assert.strictEqual(loginRes.statusCode, 200, `Login do proprietário deve funcionar: ${loginRes.body}`);
    const loginData = JSON.parse(loginRes.body);
    const tenantUserToken = loginData.tokens?.accessToken || loginData.accessToken || loginData.token;
    assert.ok(tenantUserToken, 'Deve emitir token de usuário de loja');

    // 3. Consultar /catalog/services com o token de usuário e cabeçalho do tenant
    const servicesRes = await app.inject({
      method: 'GET',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${tenantUserToken}`,
        'x-tenant-id': tenantId,
      },
    });

    assert.strictEqual(servicesRes.statusCode, 200);
    const servicesList = JSON.parse(servicesRes.body);
    assert.strictEqual(servicesList.length, 5, 'Oficina já possui seus 5 serviços pré-configurados prontos para OS!');

    // 4. Consultar /catalog/checklists
    const checklistsRes = await app.inject({
      method: 'GET',
      url: '/catalog/checklists',
      headers: {
        authorization: `Bearer ${tenantUserToken}`,
        'x-tenant-id': tenantId,
      },
    });

    assert.strictEqual(checklistsRes.statusCode, 200);
    const checklistsList = JSON.parse(checklistsRes.body);
    assert.strictEqual(checklistsList.length, 1, 'Oficina já possui seu modelo de checklist pronto!');
    assert.strictEqual(checklistsList[0].segment, 'mecanica');
  });

  test('SEGURANÇA E RLS: Oficina B não enxerga serviços da Oficina A via /catalog/services', async () => {
    // Criar Oficina A (PPF)
    const slugA = `loja-a-${Date.now()}`;
    const resA = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        trade_name: 'Loja A Isolada',
        slug: slugA,
        email: `${slugA}@carx.com.br`,
        segment: 'ppf',
        owner_name: 'Dono A',
        owner_email: `dono.${slugA}@carx.com.br`,
        owner_password: 'Senha@DonoA2026!',
        plan_slug: 'pro',
      },
    });
    const tenantA = JSON.parse(resA.body).tenant;

    // Criar Oficina B (Mecânica)
    const slugB = `loja-b-${Date.now()}`;
    const resB = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        trade_name: 'Loja B Isolada',
        slug: slugB,
        email: `${slugB}@carx.com.br`,
        segment: 'mecanica',
        owner_name: 'Dono B',
        owner_email: `dono.${slugB}@carx.com.br`,
        owner_password: 'Senha@DonoB2026!',
        plan_slug: 'pro',
      },
    });
    const tenantB = JSON.parse(resB.body).tenant;

    // Login Dono B
    const loginB = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'x-tenant-id': tenantB.id },
      payload: {
        email: `dono.${slugB}@carx.com.br`,
        password: 'Senha@DonoB2026!',
      },
    });
    const loginBData = JSON.parse(loginB.body);
    const tokenB = loginBData.tokens?.accessToken || loginBData.accessToken || loginBData.token;

    // Dono B consulta seus serviços
    const servicesB = await app.inject({
      method: 'GET',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${tokenB}`,
        'x-tenant-id': tenantB.id,
      },
    });

    const bList = JSON.parse(servicesB.body);
    // Todos os serviços retornados devem pertencer estritamente ao tenantB
    for (const s of bList) {
      assert.strictEqual(s.tenant_id, tenantB.id, 'Serviço deve pertencer estritamente à Loja B');
      assert.strictEqual(s.segment, 'mecanica');
    }
  });

  test('VALIDAÇÃO: impede duplicação de subdomínio e subdomínios reservados', async () => {
    // 1. Subdomínio reservado
    const reservedRes = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        trade_name: 'Admin Tentativa',
        slug: 'admin',
        email: 'tentativa@admin.com',
        owner_name: 'Tentativa',
        owner_email: 'tentativa@admin.com',
        plan_slug: 'pro',
      },
    });
    assert.strictEqual(reservedRes.statusCode, 400);

    // 2. Subdomínio duplicado
    const uniqueSlug = `oficina-dup-${Date.now()}`;
    await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        trade_name: 'Oficina Original',
        slug: uniqueSlug,
        email: `${uniqueSlug}@teste.com`,
        owner_name: 'Original',
        owner_email: `${uniqueSlug}@teste.com`,
        plan_slug: 'pro',
      },
    });

    const duplicateRes = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        trade_name: 'Oficina Clonada',
        slug: uniqueSlug,
        email: `outro.${uniqueSlug}@teste.com`,
        owner_name: 'Outro',
        owner_email: `outro.${uniqueSlug}@teste.com`,
        plan_slug: 'pro',
      },
    });
    assert.strictEqual(duplicateRes.statusCode, 400);
  });
});
