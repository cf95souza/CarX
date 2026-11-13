import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { adminPool } from '../database/db.js';
import { hashPassword, comparePassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { superadminService } from './superadmin-service.js';
import type { FastifyInstance } from 'fastify';

describe('T2.15 — Super Admin: Gestão de Credenciais e Redefinição de Senha do Gestor da Oficina', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let testTenantId: string;
  let testOwnerUserId: string;
  const testOwnerEmail = `gestor-teste-${Date.now()}@carx.com.br`;
  const initialPassword = 'SenhaOriginal@123';

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Super Administrador canônico
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    const superRes = await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Suporte', 'superadmin-support@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true
       RETURNING id`,
      [superadminPassHash]
    );
    const superadminId = superRes.rows[0].id;

    superadminToken = signJwt(
      {
        sub: superadminId,
        email: 'superadmin-support@carx.com.br',
        role: 'SUPERADMIN',
        scope: 'superadmin',
        isSuperadmin: true,
      },
      { expiresIn: '1h' }
    );

    // 2. Criar oficina de teste via provisionamento
    const tenantSlug = `oficina-pwd-${Date.now()}`;
    const result = await superadminService.createTenant(
      {
        trade_name: 'Oficina Teste Suporte',
        legal_name: 'Oficina Teste Suporte LTDA',
        cnpj: '44.555.666/0001-77',
        slug: tenantSlug,
        email: `${tenantSlug}@carx.com.br`,
        segment: 'mecanica',
        owner_name: 'Gestor Titular',
        owner_email: testOwnerEmail,
        owner_password: initialPassword,
        plan_slug: 'pro',
        is_trial: false,
      },
      superadminId
    );

    testTenantId = (result.tenant as any).id;

    // Buscar o ID do usuário criado
    const userRes = await adminPool.query(
      'SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1',
      [testOwnerEmail]
    );
    testOwnerUserId = userRes.rows[0].id;

    // Valida que a senha inicial bate
    const matchInitial = await comparePassword(initialPassword, userRes.rows[0].password_hash);
    assert.equal(matchInitial, true);
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. POST /admin/tenants/:id/reset-owner-password sem autenticação deve retornar 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/reset-owner-password`,
      payload: {},
    });
    assert.equal(res.statusCode, 401);
  });

  it('2. POST /admin/tenants/:id/reset-owner-password com senha manual menor que 8 caracteres deve retornar 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/reset-owner-password`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        new_password: '12345',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.match(body.message, /mínimo 8 caracteres/i);
  });

  it('3. POST /admin/tenants/:id/reset-owner-password deve redefinir senha do gestor com valor customizado', async () => {
    const newCustomPassword = 'NovaSenhaSuporte@2026';

    const res = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/reset-owner-password`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        new_password: newCustomPassword,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.owner_email, testOwnerEmail);
    assert.equal(body.temporary_password, newCustomPassword);

    // Verificar se o hash no banco foi realmente alterado
    const userRes = await adminPool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [testOwnerUserId]
    );
    const newHash = userRes.rows[0].password_hash;

    // A senha antiga não pode mais ser válida
    const matchOld = await comparePassword(initialPassword, newHash);
    assert.equal(matchOld, false);

    // A nova senha customizada deve ser válida
    const matchNew = await comparePassword(newCustomPassword, newHash);
    assert.equal(matchNew, true);
  });

  it('4. POST /admin/tenants/:id/reset-owner-password sem payload deve gerar senha forte provisória', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/admin/tenants/${testTenantId}/reset-owner-password`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {},
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.ok(body.temporary_password);
    assert.match(body.temporary_password, /^CarX@[A-F0-9]{8}!$/);

    // Verificar que a senha temporária gerada autentica no banco
    const userRes = await adminPool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [testOwnerUserId]
    );
    const matchGenerated = await comparePassword(body.temporary_password, userRes.rows[0].password_hash);
    assert.equal(matchGenerated, true);
  });

  it('5. A redefinição de senha deve registrar evento imutável na trilha de auditoria', async () => {
    const auditRes = await adminPool.query(
      `SELECT * FROM audit_logs 
       WHERE tenant_id = $1 AND action = 'OWNER_PASSWORD_RESET_BY_SUPERADMIN'
       ORDER BY created_at DESC LIMIT 1`,
      [testTenantId]
    );

    assert.equal(auditRes.rows.length, 1);
    const log = auditRes.rows[0];
    assert.equal(log.entity, 'users');
    assert.equal(log.entity_id, testOwnerUserId);
    assert.equal(log.new_values.owner_email, testOwnerEmail);
  });
});

