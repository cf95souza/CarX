import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { adminPool, pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from './audit-service.js';
import { buildServer } from '../server.js';
import { signJwt } from '../auth/jwt.js';
import { UserRole } from '@carx/shared';
import type { FastifyInstance } from 'fastify';

describe('T2.5 — Trilha de Auditoria Imutável (Audit Log)', () => {
  let app: FastifyInstance;

  const tenantAlphaSlug = 'test-audit-alpha';
  const tenantBetaSlug = 'test-audit-beta';
  let tenantAlphaId: string;
  let tenantBetaId: string;

  let ownerUserId: string;
  let gestorUserId: string;
  let tecnicoUserId: string;
  let atendenteUserId: string;

  let ownerToken: string;
  let gestorToken: string;
  let tecnicoToken: string;
  let atendenteToken: string;

  let sampleLogId: string;

  before(async () => {
    app = buildServer();

    // Limpeza prévia para garantir idempotência dos testes
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantAlphaSlug}', '${tenantBetaSlug}'));
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantAlphaSlug}', '${tenantBetaSlug}'));
      DELETE FROM users WHERE email IN ('owner.audit@alpha.carx.com.br', 'gestor.audit@alpha.carx.com.br', 'tecnico.audit@alpha.carx.com.br', 'atendente.audit@alpha.carx.com.br');
      DELETE FROM tenants WHERE slug IN ('${tenantAlphaSlug}', '${tenantBetaSlug}');
    `);

    // 1. Criar inquilinos de teste
    const resA = await adminPool.query(
      `INSERT INTO tenants (trade_name, slug, email, status)
       VALUES ('Oficina Auditoria Alpha', $1, 'contato@alpha.carx.local', 'active')
       RETURNING id;`,
      [tenantAlphaSlug]
    );
    tenantAlphaId = resA.rows[0].id;

    const resB = await adminPool.query(
      `INSERT INTO tenants (trade_name, slug, email, status)
       VALUES ('Oficina Auditoria Beta', $1, 'contato@beta.carx.local', 'active')
       RETURNING id;`,
      [tenantBetaSlug]
    );
    tenantBetaId = resB.rows[0].id;

    // 2. Criar usuários com papéis distintos
    const userEmails = [
      { email: 'owner.audit@alpha.carx.com.br', name: 'Owner Alpha', role: UserRole.OWNER },
      { email: 'gestor.audit@alpha.carx.com.br', name: 'Gestor Alpha', role: UserRole.GESTOR },
      { email: 'tecnico.audit@alpha.carx.com.br', name: 'Tecnico Alpha', role: UserRole.TECNICO },
      { email: 'atendente.audit@alpha.carx.com.br', name: 'Atendente Alpha', role: UserRole.ATENDENTE },
    ];

    const userIds: Record<string, string> = {};

    for (const u of userEmails) {
      const userRes = await adminPool.query(
        `INSERT INTO users (name, email, password_hash, is_active)
         VALUES ($1, $2, 'hash_test', true)
         RETURNING id;`,
        [u.name, u.email]
      );
      const uid = userRes.rows[0].id;
      userIds[u.role] = uid;

      // Vincular membership
      await adminPool.query(
        `INSERT INTO memberships (tenant_id, user_id, role)
         VALUES ($1, $2, $3);`,
        [tenantAlphaId, uid, u.role]
      );
    }

    ownerUserId = userIds[UserRole.OWNER];
    gestorUserId = userIds[UserRole.GESTOR];
    tecnicoUserId = userIds[UserRole.TECNICO];
    atendenteUserId = userIds[UserRole.ATENDENTE];

    // 3. Gerar tokens JWT assinados
    ownerToken = signJwt({
      sub: ownerUserId,
      email: 'owner.audit@alpha.carx.com.br',
      role: UserRole.OWNER,
      tenant_id: tenantAlphaId,
      session_id: 'sess-owner-1',
    });

    gestorToken = signJwt({
      sub: gestorUserId,
      email: 'gestor.audit@alpha.carx.com.br',
      role: UserRole.GESTOR,
      tenant_id: tenantAlphaId,
      session_id: 'sess-gestor-1',
    });

    tecnicoToken = signJwt({
      sub: tecnicoUserId,
      email: 'tecnico.audit@alpha.carx.com.br',
      role: UserRole.TECNICO,
      tenant_id: tenantAlphaId,
      session_id: 'sess-tech-1',
    });

    atendenteToken = signJwt({
      sub: atendenteUserId,
      email: 'atendente.audit@alpha.carx.com.br',
      role: UserRole.ATENDENTE,
      tenant_id: tenantAlphaId,
      session_id: 'sess-atend-1',
    });
  });

  after(async () => {
    // Limpeza com bypass explícito da trigger de imutabilidade para teardown de testes
    if (tenantAlphaId && tenantBetaId) {
      await adminPool.query(`
        SELECT set_config('app.bypass_audit_immutability', 'true', false);
        DELETE FROM audit_logs WHERE tenant_id IN ('${tenantAlphaId}', '${tenantBetaId}');
        DELETE FROM memberships WHERE tenant_id IN ('${tenantAlphaId}', '${tenantBetaId}');
        DELETE FROM users WHERE id IN ('${ownerUserId}', '${gestorUserId}', '${tecnicoUserId}', '${atendenteUserId}');
        DELETE FROM tenants WHERE id IN ('${tenantAlphaId}', '${tenantBetaId}');
      `);
    }

    await app.close();
  });

  it('deve comprovar IMUTABILIDADE no banco: tentativa de UPDATE ou DELETE em audit_logs é rejeitada pelo PostgreSQL', async () => {
    // 1. Criar um log de teste
    const log = await auditService.record({
      tenantId: tenantAlphaId,
      userId: ownerUserId,
      action: 'PAYMENT_TEST',
      entity: 'payments',
      entityId: 'pay-001',
      oldValues: { amount: 100 },
      newValues: { amount: 120 },
    });

    assert.ok(log.id);
    sampleLogId = log.id;

    // 2. Tentar UPDATE direto no registro -> deve falhar na trigger
    await assert.rejects(
      async () => {
        await tenantQuery(tenantAlphaId, 'UPDATE audit_logs SET action = $1 WHERE id = $2;', ['TAMPERED', log.id]);
      },
      (err: Error) => {
        assert.match(err.message, /Audit logs are immutable/i);
        return true;
      }
    );

    // 3. Tentar DELETE direto no registro -> deve falhar na trigger
    await assert.rejects(
      async () => {
        await tenantQuery(tenantAlphaId, 'DELETE FROM audit_logs WHERE id = $1;', [log.id]);
      },
      (err: Error) => {
        assert.match(err.message, /Audit logs are immutable/i);
        return true;
      }
    );

    // 4. Confirmar que o dado permanece intacto
    const check = await tenantQuery(tenantAlphaId, 'SELECT action FROM audit_logs WHERE id = $1;', [log.id]);
    assert.equal(check.rows[0].action, 'PAYMENT_TEST');
  });

  it('deve registrar e recuperar auditoria de alteração de valor de Ordem de Serviço com snapshot antes/depois', async () => {
    const logged = await auditService.recordWorkOrderPriceChange({
      tenantId: tenantAlphaId,
      userId: gestorUserId,
      workOrderId: 'os-9988',
      oldPrice: 125000, // R$ 1.250,00
      newPrice: 165000, // R$ 1.650,00
      reason: 'Inclusão de polimento técnico de faróis',
      ipAddress: '192.168.1.100',
      userAgent: 'CarX-Browser/1.0',
    });

    assert.ok(logged.id);
    assert.equal(logged.action, 'WORK_ORDER_PRICE_UPDATED');
    assert.equal(logged.entity, 'work_orders');
    assert.equal(logged.entity_id, 'os-9988');
    assert.deepEqual(logged.old_values, { total_amount: 125000 });
    assert.deepEqual(logged.new_values, {
      total_amount: 165000,
      reason: 'Inclusão de polimento técnico de faróis',
    });
    assert.equal(logged.ip_address, '192.168.1.100');
  });

  it('deve registrar e recuperar auditoria de estorno / reembolso financeiro (requisito T2.5)', async () => {
    const refundLog = await auditService.recordPaymentRefund({
      tenantId: tenantAlphaId,
      userId: ownerUserId,
      paymentId: 'pay-776655',
      amount: 45000, // R$ 450,00
      refundReason: 'Cancelamento antes do início da vitrificação',
      previousStatus: 'paid',
      ipAddress: '200.189.10.5',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    assert.ok(refundLog.id);
    assert.equal(refundLog.action, 'PAYMENT_REFUNDED');
    assert.equal(refundLog.entity, 'payments');
    assert.equal(refundLog.entity_id, 'pay-776655');
    assert.deepEqual(refundLog.old_values, { status: 'paid', refunded: false });
    assert.deepEqual(refundLog.new_values, {
      status: 'refunded',
      refunded: true,
      amount: 45000,
      reason: 'Cancelamento antes do início da vitrificação',
    });
  });

  it('deve registrar auditoria de alteração de papel de colaborador (RBAC)', async () => {
    const roleLog = await auditService.recordRoleChange({
      tenantId: tenantAlphaId,
      userId: ownerUserId,
      targetUserId: tecnicoUserId,
      oldRole: 'tecnico',
      newRole: 'gestor',
    });

    assert.ok(roleLog.id);
    assert.equal(roleLog.action, 'USER_ROLE_CHANGED');
    assert.equal(roleLog.entity, 'memberships');
    assert.equal(roleLog.entity_id, tecnicoUserId);
    assert.deepEqual(roleLog.old_values, { role: 'tecnico' });
    assert.deepEqual(roleLog.new_values, { role: 'gestor' });
  });

  it('deve garantir ISOLAMENTO MULTITENANT: Oficina Alpha não enxerga logs da Oficina Beta', async () => {
    // 1. Gravar um log exclusivo para a Oficina Beta
    await auditService.record({
      tenantId: tenantBetaId,
      action: 'BETA_SECRET_ACTION',
      entity: 'confidential',
      entityId: 'beta-secret-1',
      oldValues: { secret: 'data_b' },
    });

    // 2. Consultar lista da Oficina Alpha
    const alphaLogs = await auditService.list({ tenantId: tenantAlphaId, limit: 100 });

    assert.ok(alphaLogs.total > 0);
    // Nenhum log da Oficina Alpha pode ter tenant_id da Oficina Beta
    for (const item of alphaLogs.logs) {
      assert.equal(item.tenant_id, tenantAlphaId);
      assert.notEqual(item.action, 'BETA_SECRET_ACTION');
    }

    // 3. Consultar lista da Oficina Beta
    const betaLogs = await auditService.list({ tenantId: tenantBetaId });
    assert.ok(betaLogs.total >= 1);
    const hasBetaSecret = betaLogs.logs.some((l) => l.action === 'BETA_SECRET_ACTION');
    assert.ok(hasBetaSecret, 'Oficina Beta deve enxergar seu próprio log');
  });

  it('API HTTP: deve rejeitar requisição sem autenticação com HTTP 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 401);
  });

  it('API HTTP: deve rejeitar acesso de TECNICO com HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs',
      headers: {
        authorization: `Bearer ${tecnicoToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Forbidden');
  });

  it('API HTTP: deve rejeitar acesso de ATENDENTE com HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs',
      headers: {
        authorization: `Bearer ${atendenteToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 403);
  });

  it('API HTTP: deve permitir acesso de GESTOR e retornar listagem paginada (HTTP 200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs?page=1&limit=10',
      headers: {
        authorization: `Bearer ${gestorToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body.logs));
    assert.ok(body.total >= 3);
    assert.equal(body.page, 1);
    assert.equal(body.limit, 10);
  });

  it('API HTTP: deve permitir acesso de OWNER e suportar filtros por entidade e ação', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs?entity=work_orders&action=WORK_ORDER_PRICE_UPDATED',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.total >= 1);
    assert.equal(body.logs[0].entity, 'work_orders');
    assert.equal(body.logs[0].action, 'WORK_ORDER_PRICE_UPDATED');
  });

  it('API HTTP: deve retornar detalhe de um log por ID (HTTP 200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/audit-logs/${sampleLogId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.id, sampleLogId);
    assert.equal(body.tenant_id, tenantAlphaId);
    assert.ok(body.created_at);
  });

  it('API HTTP: deve retornar 404 para ID inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs/00000000-0000-0000-0000-000000000000',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 404);
  });
});
