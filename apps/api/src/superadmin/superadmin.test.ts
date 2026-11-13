import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { adminPool, query } from '../database/db.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T2.9 — Super Admin: Backend e Módulo /admin', () => {
  let app: ReturnType<typeof buildServer>;
  let superadminToken: string;
  let regularUserToken: string;
  let testTenantId: string;
  let testTenantSlug: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Garantir superadministrador canônico ativo no banco
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Teste', 'superadmin@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true`,
      [superadminPassHash]
    );

    // 2. Criar inquilino e colaborador para testes de isolamento e rejeição mútua
    testTenantSlug = `oficina-supertest-${Date.now()}`;
    const planRes = await adminPool.query("SELECT id FROM plans WHERE slug = 'essencial' LIMIT 1");
    const planId = planRes.rows[0].id;

    const tenantRes = await adminPool.query(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, 'Oficina SuperTest Ltda', $2, 'active', $3)
       RETURNING id, slug`,
      [testTenantSlug, `${testTenantSlug}@example.com`, planId]
    );
    testTenantId = tenantRes.rows[0].id;

    // Criar unidade e usuário do tenant
    const unitRes = await adminPool.query(
      `INSERT INTO units (tenant_id, name, slug)
       VALUES ($1, 'Matriz SuperTest', 'matriz')
       RETURNING id`,
      [testTenantId]
    );
    const unitId = unitRes.rows[0].id;

    const userPassHash = await hashPassword('TenantPass@2026');
    const userRes = await adminPool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Proprietário Loja', $1, $2)
       RETURNING id`,
      [`dono-${Date.now()}@example.com`, userPassHash]
    );
    const regularUserId = userRes.rows[0].id;

    await adminPool.query(
      `INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active)
       VALUES ($1, $2, $3, 'owner', true)`,
      [testTenantId, unitId, regularUserId]
    );

    // Criar contrato ativo
    await adminPool.query(
      `INSERT INTO contracts (tenant_id, plan_id, billing_cycle, negotiated_price_cents, status)
       VALUES ($1, $2, 'monthly', 6990, 'active')`,
      [testTenantId, planId]
    );

    // Token JWT normal da loja (sem escopo de superadmin)
    regularUserToken = signJwt({
      sub: regularUserId,
      tenant_id: testTenantId,
      role: 'owner',
      scope: 'tenant',
    });
  });

  after(async () => {
    // Limpeza segura pós-testes
    if (testTenantId) {
      await adminPool.query("SELECT set_config('app.bypass_audit_immutability', 'true', false)");
      await adminPool.query('DELETE FROM audit_logs WHERE tenant_id = $1', [testTenantId]);
      await adminPool.query('DELETE FROM impersonation_log WHERE tenant_id = $1', [testTenantId]);
      await adminPool.query('DELETE FROM contracts WHERE tenant_id = $1', [testTenantId]);
      await adminPool.query('DELETE FROM memberships WHERE tenant_id = $1', [testTenantId]);
      await adminPool.query('DELETE FROM units WHERE tenant_id = $1', [testTenantId]);
      await adminPool.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
    }
    await app.close();
  });

  it('AUTENTICAÇÃO: login do Super Admin com credenciais válidas retorna token com scope superadmin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: {
        email: 'superadmin@carx.com.br',
        password: 'Admin@CarX2026!',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.token, 'Token JWT deve ser gerado');
    assert.ok(body.user, 'Dados do superadmin devem ser retornados');
    assert.equal(body.user.email, 'superadmin@carx.com.br');

    superadminToken = body.token;
  });

  it('AUTENTICAÇÃO: login com senha incorreta é rejeitado com HTTP 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/auth/login',
      payload: {
        email: 'superadmin@carx.com.br',
        password: 'SenhaIncorretaErrada!',
      },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.match(body.message, /inválidas/i);
  });

  it('CRITÉRIO DE ACEITE: token JWT do Super Admin é sumariamente rejeitado no app das lojas (HTTP 403)', async () => {
    // Tenta acessar uma rota protegida de loja usando o token do Super Admin
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 403, 'Token de superadmin direto não pode acessar rotas da loja sem impersonação');
    const body = JSON.parse(res.body);
    assert.match(body.message, /impersonação/i);
  });

  it('CRITÉRIO DE ACEITE: token JWT de usuário da loja é sumariamente rejeitado no módulo /admin (HTTP 403)', async () => {
    // Tenta acessar endpoints do Super Admin com token de inquilino
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: {
        authorization: `Bearer ${regularUserToken}`,
      },
    });

    assert.equal(res.statusCode, 403, 'Token normal da loja deve ser sumariamente bloqueado no /admin');
    const body = JSON.parse(res.body);
    assert.match(body.message, /restrito a super administradores/i);
  });

  it('MÉTRICAS DO SAAS: /admin/dashboard/metrics retorna consolidação de MRR, lojas ativas e churn', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const metrics = JSON.parse(res.body);

    assert.ok(typeof metrics.total_tenants === 'number');
    assert.ok(typeof metrics.active_tenants === 'number');
    assert.ok(typeof metrics.mrr_cents === 'number');
    assert.ok(typeof metrics.arr_cents === 'number');
    assert.ok(typeof metrics.churn_rate_percent === 'number');
    assert.ok(Array.isArray(metrics.revenue_by_plan));
    assert.ok(metrics.global_usage);
    assert.ok(typeof metrics.global_usage.total_work_orders === 'number');
    assert.ok(typeof metrics.global_usage.total_storage_bytes === 'number');
  });

  it('LISTAGEM DE OFICINAS: /admin/tenants lista oficinas com contadores e filtros', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/tenants?search=${testTenantSlug}`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const tenants = JSON.parse(res.body);
    assert.ok(Array.isArray(tenants));
    assert.ok(tenants.length >= 1);

    const found = tenants.find((t: { slug: string }) => t.slug === testTenantSlug);
    assert.ok(found, 'Oficina criada deve estar presente na listagem');
    assert.equal(found.status, 'active');
    assert.equal(found.units_count, 1);
    assert.equal(found.users_count, 1);
  });

  it('DETALHES DA OFICINA: /admin/tenants/:id retorna detalhes, unidades, branding e contratos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/tenants/${testTenantId}`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const details = JSON.parse(res.body);
    assert.equal(details.tenant.id, testTenantId);
    assert.ok(Array.isArray(details.units));
    assert.ok(Array.isArray(details.contracts));
    assert.ok(Array.isArray(details.members));
  });

  it('ASSISTENTE DE CRIAÇÃO: /admin/tenants cria nova oficina com matriz, dono e contrato', async () => {
    const newSlug = `oficina-nova-${Date.now()}`;
    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        trade_name: 'Nova Oficina Criada pelo Admin',
        legal_name: 'Nova Oficina Criada pelo Admin Razao Social',
        cnpj: '11.222.333/0001-44',
        slug: newSlug,
        email: `${newSlug}@carx.com`,
        phone: '11988887777',
        owner_name: 'Carlos Proprietário',
        owner_email: `carlos-${newSlug}@carx.com`,
        owner_password: 'NovaOficinaPass@2026',
        plan_slug: 'profissional',
        is_trial: false,
      },
    });

    assert.equal(res.statusCode, 201);
    const data = JSON.parse(res.body);
    assert.equal(data.tenant.slug, newSlug);
    assert.equal(data.tenant.status, 'active');
    assert.equal(data.unit.name, 'Matriz');
    assert.equal(data.contract.billing_cycle, 'monthly');
  });

  it('BLOQUEIO DE SUBDOMÍNIO: assistente rejeita subdomínios reservados (admin, api, app)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/tenants',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        trade_name: 'Tentativa Invasão Admin',
        slug: 'admin',
        email: 'hacker@teste.com',
        owner_name: 'Hacker',
        owner_email: 'hacker@teste.com',
        plan_slug: 'essencial',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.match(body.message, /reservado/i);
  });

  it('SUSPENSÃO DE OFICINA: /admin/tenants/:id/suspend altera status e bloqueia acesso do inquilino', async () => {
    const suspendRes = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/suspend`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        reason: 'Suspensão por inadimplência após 15 dias sem pagamento',
      },
    });

    assert.equal(suspendRes.statusCode, 200);
    const tenant = JSON.parse(suspendRes.body);
    assert.equal(tenant.status, 'suspended');

    // Comprova que o inquilino suspenso é bloqueado nas rotas normais
    const tenantAccessRes = await app.inject({
      method: 'GET',
      url: '/tenant/plan',
      headers: {
        authorization: `Bearer ${regularUserToken}`,
        'x-tenant-id': testTenantId,
        'x-tenant-slug': testTenantSlug,
      },
    });

    assert.equal(tenantAccessRes.statusCode, 403, 'Inquilino suspenso deve ser bloqueado com HTTP 403');
    const accessBody = JSON.parse(tenantAccessRes.body);
    assert.match(accessBody.message, /suspended/i);
  });

  it('REATIVAÇÃO DE OFICINA: /admin/tenants/:id/reactivate restaura status para active', async () => {
    const reactivateRes = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/reactivate`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        reason: 'Pagamento de fatura atrasada regularizado',
      },
    });

    assert.equal(reactivateRes.statusCode, 200);
    const tenant = JSON.parse(reactivateRes.body);
    assert.equal(tenant.status, 'active');
  });

  it('IMPERSONAÇÃO AUDITADA: /admin/tenants/:id/impersonate emite token específico e grava impersonation_log', async () => {
    const impRes = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/impersonate`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        reason: 'Suporte técnico de atendimento ao ticket #4891',
      },
    });

    assert.equal(impRes.statusCode, 200);
    const impBody = JSON.parse(impRes.body);
    assert.ok(impBody.token, 'Token de impersonação deve ser gerado');
    assert.ok(impBody.impersonation_id, 'Identificador de log de impersonação deve ser gerado');
    assert.equal(impBody.tenant.id, testTenantId);

    // Valida que o token de impersonação consegue acessar a rota da oficina
    const storeAccessRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${impBody.token}`,
      },
    });

    assert.equal(storeAccessRes.statusCode, 200, 'Token de impersonação deve permitir acesso com auditoria');

    // Valida registro em impersonation_log
    const logDbRes = await adminPool.query(
      'SELECT id, reason, tenant_id, token_jti FROM impersonation_log WHERE id = $1',
      [impBody.impersonation_id]
    );
    assert.equal(logDbRes.rows.length, 1);
    assert.equal(logDbRes.rows[0].reason, 'Suporte técnico de atendimento ao ticket #4891');
    assert.equal(logDbRes.rows[0].tenant_id, testTenantId);
  });

  it('CONTRATOS E FATURAS: endpoints /admin/contracts e /admin/invoices retornam listagens globais', async () => {
    const [contractsRes, invoicesRes] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/admin/contracts',
        headers: { authorization: `Bearer ${superadminToken}` },
      }),
      app.inject({
        method: 'GET',
        url: '/admin/invoices',
        headers: { authorization: `Bearer ${superadminToken}` },
      }),
    ]);

    assert.equal(contractsRes.statusCode, 200);
    assert.equal(invoicesRes.statusCode, 200);
    assert.ok(Array.isArray(JSON.parse(contractsRes.body)));
    assert.ok(Array.isArray(JSON.parse(invoicesRes.body)));
  });

  it('LEADS E CONVERSÃO: captação de lead e conversão automática em oficina oficial CarX', async () => {
    const leadEmail = `lead-${Date.now()}@autocenter.com`;
    const leadRes = await app.inject({
      method: 'POST',
      url: '/admin/leads',
      payload: {
        name: 'Marcos Funilaria',
        email: leadEmail,
        phone: '11977776666',
        company_name: 'Marcos Martelinho e Pintura',
        notes: 'Contato via Landing page demonstrativo',
      },
    });

    assert.equal(leadRes.statusCode, 201);
    const lead = JSON.parse(leadRes.body);
    assert.equal(lead.email, leadEmail);
    assert.equal(lead.status, 'new');

    // Conversão do Lead em Oficina
    const convSlug = `marcos-auto-${Date.now()}`;
    const convertRes = await app.inject({
      method: 'POST',
      url: `/admin/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${superadminToken}` },
      payload: {
        slug: convSlug,
        plan_slug: 'essencial',
        is_trial: true,
      },
    });

    assert.equal(convertRes.statusCode, 201);
    const convData = JSON.parse(convertRes.body);
    assert.equal(convData.tenant.slug, convSlug);

    // Verificar se lead agora está com status converted
    const updatedLeadRes = await query('SELECT status, converted_tenant_id FROM leads WHERE id = $1', [lead.id]);
    assert.equal(updatedLeadRes.rows[0].status, 'converted');
    assert.equal(updatedLeadRes.rows[0].converted_tenant_id, convData.tenant.id);
  });

  it('T5.1 — LANDING PAGE: POST /public/leads registra lead público com honeypot e notas enriquecidas', async () => {
    // 1. Rejeição de requisição sem campos obrigatórios
    const badRes = await app.inject({
      method: 'POST',
      url: '/public/leads',
      payload: { name: 'Sem Email' },
    });
    assert.equal(badRes.statusCode, 400);

    // 2. Proteção Honeypot Anti-Bot: Campo website preenchido retorna 200 sintético sem poluir a base
    const botEmail = `bot-${Date.now()}@spam.com`;
    const botRes = await app.inject({
      method: 'POST',
      url: '/public/leads',
      payload: {
        name: 'Spam Bot',
        email: botEmail,
        website: 'http://malicious-spam.com',
      },
    });
    assert.equal(botRes.statusCode, 200);
    const botCheck = await query('SELECT id FROM leads WHERE email = $1', [botEmail]);
    assert.equal(botCheck.rows.length, 0); // Não gravou nada no banco!

    // 3. Submissão legítima da Landing Page
    const validEmail = `lead-landing-${Date.now()}@autocenter.com`;
    const validRes = await app.inject({
      method: 'POST',
      url: '/public/leads',
      payload: {
        name: 'Roberto PPF & Estética',
        email: validEmail,
        phone: '11988887777',
        company_name: 'Studio Roberto PPF',
        segment: 'PPF & Películas',
        employees_count: '6 a 15 colaboradores',
        notes: 'Gostaria de ver o módulo de corte de bobinas.',
      },
    });
    assert.equal(validRes.statusCode, 201);
    const body = JSON.parse(validRes.body);
    assert.equal(body.success, true);
    assert.equal(body.lead.email, validEmail);
    assert.ok(body.lead.notes.includes('Segmento: PPF & Películas'));
    assert.ok(body.lead.notes.includes('Equipe: 6 a 15 colaboradores'));
  });

  it('AUDITORIA ADMINISTRATIVA: /admin/audit-logs retorna histórico imutável das ações do Super Admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/audit-logs',
      headers: { authorization: `Bearer ${superadminToken}` },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.ok(Array.isArray(data.logs));
    assert.ok(data.total >= 1);
    assert.ok(data.logs.some((l: { action: string }) => l.action.startsWith('ADMIN_') || l.action.startsWith('SUPERADMIN_')));
  });
});
