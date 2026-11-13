import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { adminPool } from '../database/db.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { PlanSlug, PlanFeatures } from '@carx/shared';
import type { FastifyInstance } from 'fastify';

describe('T2.13 — Super Admin: Configuração de Planos Globais, Limites e Matriz de Feature Gating', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let tenantOwnerToken: string;
  let testTenantId: string;
  let testTenantSlug: string;
  let testPlanId: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Super Administrador canônico
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    const superRes = await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Planos', 'superadmin-plans@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true
       RETURNING id`,
      [superadminPassHash]
    );
    const superadminId = superRes.rows[0].id;

    superadminToken = signJwt(
      {
        sub: superadminId,
        email: 'superadmin-plans@carx.com.br',
        role: 'SUPERADMIN',
        scope: 'superadmin',
        isSuperadmin: true,
      },
      { expiresIn: '1h' }
    );

    // 2. Criar plano isolado para o teste
    const uniqueSlug = `plano-dinamico-${Date.now()}`;
    const planRes = await adminPool.query(
      `INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
       VALUES ($1, $2, 'Plano de Teste Dinâmico', 19900, 'monthly', 
               '{"max_units": 2, "max_users": 5, "max_work_orders_per_month": 300, "max_storage_mb": 5120, "max_whatsapp_messages_per_month": 500}',
               $3, true)
       RETURNING id`,
      [
        'Plano Dinâmico QA',
        uniqueSlug,
        JSON.stringify([
          PlanFeatures.WORK_ORDERS,
          PlanFeatures.CUSTOMERS,
          PlanFeatures.VEHICLES,
          PlanFeatures.INSPECTION_CHECKLIST,
        ]),
      ]
    );
    testPlanId = planRes.rows[0].id;

    // 3. Criar oficina vinculada a este plano
    testTenantSlug = `oficina-dinamica-${Date.now()}`;
    const tenantRes = await adminPool.query(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, 'Oficina Teste Gating', $2, 'active', $3)
       RETURNING id`,
      [testTenantSlug, `${testTenantSlug}@example.com`, testPlanId]
    );
    testTenantId = tenantRes.rows[0].id;

    // Criar unidade
    const unitRes = await adminPool.query(
      `INSERT INTO units (tenant_id, name, slug)
       VALUES ($1, 'Matriz Dinâmica', 'matriz')
       RETURNING id`,
      [testTenantId]
    );
    const unitId = unitRes.rows[0].id;

    // Criar usuário gestor da oficina
    const userPassHash = await hashPassword('GestorPass@2026');
    const userRes = await adminPool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Dinâmico', $1, $2)
       RETURNING id`,
      [`gestor-${Date.now()}@example.com`, userPassHash]
    );
    const ownerUserId = userRes.rows[0].id;

    await adminPool.query(
      `INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active)
       VALUES ($1, $2, $3, 'owner', true)`,
      [testTenantId, unitId, ownerUserId]
    );

    tenantOwnerToken = signJwt(
      {
        sub: ownerUserId,
        userId: ownerUserId,
        email: `${testTenantSlug}@example.com`,
        tenantId: testTenantId,
        unitId: unitId,
        role: 'owner',
        scope: 'tenant',
      },
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await adminPool.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
    await adminPool.query('DELETE FROM plans WHERE id = $1', [testPlanId]);
    await app.close();
  });

  it('1. GET /admin/plans — deve rejeitar token de inquilino comum com HTTP 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/plans',
      headers: {
        authorization: `Bearer ${tenantOwnerToken}`,
      },
    });

    assert.equal(res.statusCode, 403);
  });

  it('2. GET /admin/plans — deve permitir ao Super Admin listar todos os planos com contadores de assinantes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/plans',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const plans = res.json();
    assert.ok(Array.isArray(plans));
    assert.ok(plans.length >= 1);

    const found = plans.find((p: any) => p.id === testPlanId);
    assert.ok(found, 'Plano de teste deve constar na listagem');
    assert.equal(found.tenants_count, 1, 'Contador de assinantes deve indicar 1 oficina');
  });

  it('3. POST /admin/plans — Super Admin cria novo plano com matriz customizada de recursos', async () => {
    const newSlug = `plano-custom-${Date.now()}`;
    const res = await app.inject({
      method: 'POST',
      url: '/admin/plans',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        name: 'Plano Customizado Prime',
        slug: newSlug,
        description: 'Plano criado pelo teste automatizado',
        price_cents: 35000,
        interval: 'monthly',
        limits: {
          max_units: 5,
          max_users: 20,
          max_work_orders_per_month: 2000,
          max_storage_mb: 20480,
          max_whatsapp_messages_per_month: 2000,
        },
        features: [
          PlanFeatures.WORK_ORDERS,
          PlanFeatures.CUSTOMERS,
          PlanFeatures.VEHICLES,
          PlanFeatures.FINANCIAL,
          PlanFeatures.COMMISSIONS,
        ],
        is_active: true,
      },
    });

    assert.equal(res.statusCode, 201);
    const created = res.json();
    assert.equal(created.name, 'Plano Customizado Prime');
    assert.equal(created.slug, newSlug);
    assert.equal(created.price_cents, 35000);

    // Cleanup do plano criado neste teste
    await adminPool.query('DELETE FROM plans WHERE id = $1', [created.id]);
  });

  it('4. Validação Inicial: Oficina consegue acessar rota de checklist enquanto inspection_checklist está ativa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/inspections',
      headers: {
        authorization: `Bearer ${tenantOwnerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    // Deve autorizar a rota de checklist (200 com lista vazia)
    assert.equal(res.statusCode, 200);
  });

  it('5. CRITÉRIO DE ACEITE: Super Admin desabilita inspection_checklist no plano e a oficina é IMEDIATAMENTE bloqueada com HTTP 403', async () => {
    // 5.1 Super Admin desativa a feature 'inspection_checklist' do plano
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/admin/plans/${testPlanId}/features`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        feature: PlanFeatures.INSPECTION_CHECKLIST,
        enabled: false,
      },
    });

    assert.equal(updateRes.statusCode, 200);
    const updatedPlan = updateRes.json();
    const currentFeatures = Array.isArray(updatedPlan.features)
      ? updatedPlan.features
      : JSON.parse(updatedPlan.features);
    assert.ok(!currentFeatures.includes(PlanFeatures.INSPECTION_CHECKLIST), 'Feature deve ter sido removida do plano');

    // 5.2 A oficina tenta acessar a rota de checklist novamente
    const blockedRes = await app.inject({
      method: 'GET',
      url: '/inspections',
      headers: {
        authorization: `Bearer ${tenantOwnerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    // COMPROVAÇÃO: Imediatamente bloqueado em tempo real com HTTP 403 FEATURE_DISABLED
    assert.equal(blockedRes.statusCode, 403);
    const body = blockedRes.json();
    assert.equal(body.code, 'FEATURE_DISABLED');
    assert.equal(body.feature, PlanFeatures.INSPECTION_CHECKLIST);
    assert.ok(body.message.includes('não está incluída no seu plano contratado'));
  });

  it('6. Reativação: Super Admin reabilita inspection_checklist no plano e o acesso da oficina é restabelecido', async () => {
    // 6.1 Super Admin reativa a feature 'inspection_checklist'
    const reactivateRes = await app.inject({
      method: 'PATCH',
      url: `/admin/plans/${testPlanId}/features`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        feature: PlanFeatures.INSPECTION_CHECKLIST,
        enabled: true,
      },
    });

    assert.equal(reactivateRes.statusCode, 200);

    // 6.2 A oficina acessa a rota novamente e tem acesso liberado imediatamente
    const allowedRes = await app.inject({
      method: 'GET',
      url: '/inspections',
      headers: {
        authorization: `Bearer ${tenantOwnerToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(allowedRes.statusCode, 200);
  });
});

