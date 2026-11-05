import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { adminPool } from '../database/db.js';
import { planService, QuotaExceededError, FeatureDisabledError } from './plan-service.js';
import { requireFeature, requireQuota } from '../middlewares/plan-guards.js';
import { authenticateBearer } from '../routes/auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { buildServer } from '../server.js';
import { signJwt } from '../auth/jwt.js';
import { PlanSlug, UserRole } from '@carx/shared';
import type { FastifyInstance } from 'fastify';

describe('T2.6 — Gestão de Planos, Limites e Feature Flags', () => {
  let app: FastifyInstance;

  const testTenantSlug = 'test-loja-essencial';
  let testTenantId: string;
  let ownerUserId: string;
  let ownerToken: string;
  let superadminToken: string;

  before(async () => {
    app = buildServer();

    // Rotas de teste decoradas com os guards de Feature Flag e Cota
    app.post(
      '/test/cadastrar-usuario',
      {
        preHandler: [authenticateBearer, requireTenantContext, requireQuota('users')],
      },
      async () => ({ success: true, message: 'Usuário cadastrado com sucesso' })
    );

    app.post(
      '/test/cadastrar-unidade',
      {
        preHandler: [authenticateBearer, requireTenantContext, requireQuota('units')],
      },
      async () => ({ success: true, message: 'Unidade cadastrada com sucesso' })
    );

    app.get(
      '/test/feature-nfse',
      {
        preHandler: [authenticateBearer, requireTenantContext, requireFeature('nfse')],
      },
      async () => ({ success: true, module: 'nfse' })
    );

    app.get(
      '/test/feature-quotes',
      {
        preHandler: [authenticateBearer, requireTenantContext, requireFeature('quotes')],
      },
      async () => ({ success: true, module: 'quotes' })
    );

    app.get(
      '/test/feature-whatsapp',
      {
        preHandler: [authenticateBearer, requireTenantContext, requireFeature('whatsapp_basic')],
      },
      async () => ({ success: true, module: 'whatsapp_basic' })
    );

    // Limpeza de testes prévios
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = '${testTenantSlug}');
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = '${testTenantSlug}');
      DELETE FROM units WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = '${testTenantSlug}');
      DELETE FROM users WHERE email LIKE '%@essencial.carx.local';
      DELETE FROM tenants WHERE slug = '${testTenantSlug}';
    `);

    // 1. Obter ID do plano Essencial
    const planRes = await adminPool.query("SELECT id FROM plans WHERE slug = 'essencial' LIMIT 1;");
    const essencialPlanId = planRes.rows[0].id;

    // 2. Criar inquilino no plano Essencial (Cotas: max_users = 3, max_units = 1)
    const tenantRes = await adminPool.query(
      `INSERT INTO tenants (trade_name, slug, email, status, plan_id)
       VALUES ('Loja Essencial Teste', $1, 'contato@essencial.carx.local', 'active', $2)
       RETURNING id;`,
      [testTenantSlug, essencialPlanId]
    );
    testTenantId = tenantRes.rows[0].id;

    // 3. Criar usuário proprietário (1º usuário da loja)
    const ownerRes = await adminPool.query(
      `INSERT INTO users (name, email, password_hash, is_active)
       VALUES ('Dono Essencial', 'dono@essencial.carx.local', 'hash_test', true)
       RETURNING id;`
    );
    ownerUserId = ownerRes.rows[0].id;

    await adminPool.query(
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner');`,
      [testTenantId, ownerUserId]
    );

    // 4. Tokens JWT
    ownerToken = signJwt({
      sub: ownerUserId,
      email: 'dono@essencial.carx.local',
      role: UserRole.OWNER,
      tenant_id: testTenantId,
      session_id: 'sess-essencial-1',
    });

    superadminToken = signJwt({
      sub: 'superadmin-master-id',
      email: 'admin@carx.com.br',
      role: UserRole.SUPERADMIN,
      isSuperadmin: true,
      tenant_id: testTenantId,
      session_id: 'sess-super-1',
    });
  });

  after(async () => {
    if (testTenantId) {
      await adminPool.query(`
        SELECT set_config('app.bypass_audit_immutability', 'true', false);
        DELETE FROM audit_logs WHERE tenant_id = '${testTenantId}';
        DELETE FROM memberships WHERE tenant_id = '${testTenantId}';
        DELETE FROM units WHERE tenant_id = '${testTenantId}';
        DELETE FROM users WHERE email LIKE '%@essencial.carx.local';
        DELETE FROM tenants WHERE id = '${testTenantId}';
      `);
    }

    await app.close();
  });

  it('GET /plans: deve listar todos os planos comerciais com seus limites e features', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/plans',
    });

    assert.equal(res.statusCode, 200);
    const plans = JSON.parse(res.body);
    assert.ok(Array.isArray(plans));
    assert.ok(plans.length >= 3);

    const slugs = plans.map((p: { slug: string }) => p.slug);
    assert.ok(slugs.includes('essencial'));
    assert.ok(slugs.includes('profissional'));
    assert.ok(slugs.includes('premium'));

    const essencial = plans.find((p: { slug: string }) => p.slug === 'essencial');
    assert.equal(essencial.limits.max_users, 3);
    assert.equal(essencial.limits.max_units, 1);
  });

  it('GET /tenant/plan: deve retornar o plano atual da loja com métricas de uso e limites', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/plan',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.plan.slug, 'essencial');
    assert.equal(body.effectiveLimits.max_users, 3);
    assert.equal(body.usage.users, 1); // Somente o proprietário cadastrado até agora
    assert.ok(Array.isArray(body.activeFeatures));
    assert.ok(body.activeFeatures.includes('quotes'));
  });

  it('COTA DE USUÁRIOS: deve permitir cadastro até 3 colaboradores no plano Essencial', async () => {
    // Cadastrar 2º usuário
    const u2 = await adminPool.query(
      `INSERT INTO users (name, email, password_hash, is_active)
       VALUES ('User 2', 'u2@essencial.carx.local', 'hash', true) RETURNING id;`
    );
    await adminPool.query(
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'atendente');`,
      [testTenantId, u2.rows[0].id]
    );

    // Cadastrar 3º usuário
    const u3 = await adminPool.query(
      `INSERT INTO users (name, email, password_hash, is_active)
       VALUES ('User 3', 'u3@essencial.carx.local', 'hash', true) RETURNING id;`
    );
    await adminPool.query(
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'tecnico');`,
      [testTenantId, u3.rows[0].id]
    );

    // Total agora = 3 usuários (limite máximo do Essencial)
    const details = await planService.getTenantPlanDetails(testTenantId);
    assert.equal(details.usage.users, 3);
    assert.equal(details.effectiveLimits.max_users, 3);
  });

  it('CRITÉRIO DE ACEITE T2.6: loja no plano Essencial deve ser impedida de cadastrar o 4º usuário (HTTP 403 QUOTA_EXCEEDED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test/cadastrar-usuario',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'QUOTA_EXCEEDED');
    assert.equal(body.resource, 'users');
    assert.equal(body.limit, 3);
    assert.equal(body.current, 3);
    assert.match(body.message, /plano "Essencial" permite no máximo 3 usuários simultâneos/i);
  });

  it('UPGRADE DE PLANO: após upgrade para Profissional (max_users: 10), o 4º usuário é liberado com sucesso', async () => {
    // 1. Migrar para plano profissional via endpoint
    const upgradeRes = await app.inject({
      method: 'POST',
      url: '/tenant/plan/change',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {
        planSlug: PlanSlug.PROFISSIONAL,
      },
    });

    assert.equal(upgradeRes.statusCode, 200);
    const upgradeBody = JSON.parse(upgradeRes.body);
    assert.equal(upgradeBody.plan.slug, 'profissional');

    // 2. Agora o endpoint deve permitir a inclusão do 4º colaborador!
    const res = await app.inject({
      method: 'POST',
      url: '/test/cadastrar-usuario',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);

    // Voltar para Essencial para os testes seguintes
    await planService.assignPlanToTenant(testTenantId, PlanSlug.ESSENCIAL);
  });

  it('COTA DE UNIDADES: plano Essencial permite 1 unidade e bloqueia a 2ª unidade (HTTP 403)', async () => {
    // 1. Inserir a 1ª filial permitida
    await adminPool.query(
      `INSERT INTO units (tenant_id, name, slug)
       VALUES ($1, 'Matriz Central', 'matriz')
       RETURNING id;`,
      [testTenantId]
    );

    // 2. Tentar cadastrar a 2ª unidade deve ser rejeitado pela cota (max_units: 1)
    const res = await app.inject({
      method: 'POST',
      url: '/test/cadastrar-unidade',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'QUOTA_EXCEEDED');
    assert.equal(body.resource, 'units');
    assert.equal(body.limit, 1);
    assert.equal(body.current, 1);
  });

  it('FEATURE FLAGS: deve bloquear funcionalidade "nfse" não inclusa no plano Essencial (HTTP 403 FEATURE_DISABLED)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/feature-nfse',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'FEATURE_DISABLED');
    assert.equal(body.feature, 'nfse');
  });

  it('FEATURE FLAGS: deve permitir funcionalidade "quotes" inclusa nativamente no plano Essencial (HTTP 200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/feature-quotes',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.module, 'quotes');
  });

  it('FEATURE FLAGS POR LOJA: ligar funcionalidade como Add-on libera o acesso à rota bloqueada', async () => {
    // 1. Ligar "nfse" para esta loja específica via PATCH /tenant/features
    const toggleRes = await app.inject({
      method: 'PATCH',
      url: '/tenant/features',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {
        feature: 'nfse',
        enabled: true,
      },
    });

    assert.equal(toggleRes.statusCode, 200);

    // 2. Agora o endpoint anteriormente bloqueado responde HTTP 200 OK!
    const featureRes = await app.inject({
      method: 'GET',
      url: '/test/feature-nfse',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(featureRes.statusCode, 200);
  });

  it('FEATURE FLAGS POR LOJA: desligar funcionalidade bloqueia a rota mesmo se nativa do plano', async () => {
    // 1. Desligar "whatsapp_basic" (que é nativa do Essencial) especificamente para esta oficina
    const toggleRes = await app.inject({
      method: 'PATCH',
      url: '/tenant/features',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
      payload: {
        feature: 'whatsapp_basic',
        enabled: false,
      },
    });

    assert.equal(toggleRes.statusCode, 200);

    // 2. Chamar o endpoint da feature deve agora retornar 403 FEATURE_DISABLED!
    const featureRes = await app.inject({
      method: 'GET',
      url: '/test/feature-whatsapp',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(featureRes.statusCode, 403);
    const body = JSON.parse(featureRes.body);
    assert.equal(body.code, 'FEATURE_DISABLED');
    assert.equal(body.feature, 'whatsapp_basic');
  });

  it('AUDITORIA: alterações de plano e feature flags devem gerar registros imutáveis em audit_logs', async () => {
    const auditRes = await adminPool.query(
      `SELECT action, entity, old_values, new_values 
       FROM audit_logs 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC;`,
      [testTenantId]
    );

    const actions = auditRes.rows.map((r: { action: string }) => r.action);
    assert.ok(actions.includes('PLAN_CHANGED'));
    assert.ok(actions.includes('FEATURE_FLAG_TOGGLED'));
  });

  it('SUPERADMIN BYPASS: superadministrador possui bypass autorizado de cotas e feature flags', async () => {
    // Superadmin acessa rota com cota cheia sem tomar 403
    const quotaRes = await app.inject({
      method: 'POST',
      url: '/test/cadastrar-usuario',
      headers: {
        authorization: `Bearer ${superadminToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(quotaRes.statusCode, 200);

    // Superadmin acessa rota com feature desativada sem tomar 403
    const featRes = await app.inject({
      method: 'GET',
      url: '/test/feature-whatsapp',
      headers: {
        authorization: `Bearer ${superadminToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(featRes.statusCode, 200);
  });
});

