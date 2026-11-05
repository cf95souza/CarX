import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { signJwt } from '../auth/jwt.js';
import { authenticateBearer } from '../routes/auth-routes.js';
import { requirePermission, requireRole, requireAssignedTechnician } from './rbac.js';
import { Permissions, UserRole } from '@carx/shared';

describe('T2.4 — Matriz de Autorização RBAC por Papel', () => {
  let app: FastifyInstance;

  // Mock de OSs com técnicos atribuídos
  const workOrdersMock: Record<string, { id: string; technician_id: string }> = {
    'os-100': { id: 'os-100', technician_id: 'tech-user-1' },
    'os-200': { id: 'os-200', technician_id: 'tech-user-2' },
  };

  before(async () => {
    app = buildServer();

    // 1. Rota financeira protegida por permissão FINANCIAL_VIEW
    app.get(
      '/test/financial/reports',
      { preHandler: [authenticateBearer, requirePermission(Permissions.FINANCIAL_VIEW)] },
      async () => ({ success: true, module: 'financial' })
    );

    // 2. Rota de deleção de OS (permissão estrita WORK_ORDER_DELETE)
    app.delete(
      '/test/work-orders/:id',
      { preHandler: [authenticateBearer, requirePermission(Permissions.WORK_ORDER_DELETE)] },
      async (req) => ({ success: true, deletedId: (req.params as { id: string }).id })
    );

    // 3. Rota de gestão de clientes (permissão CUSTOMERS_MANAGE)
    app.post(
      '/test/customers',
      { preHandler: [authenticateBearer, requirePermission(Permissions.CUSTOMERS_MANAGE)] },
      async () => ({ success: true, module: 'customers' })
    );

    // 4. Rota de configurações de tenant (permissão TENANT_SETTINGS)
    app.post(
      '/test/tenant/settings',
      { preHandler: [authenticateBearer, requirePermission(Permissions.TENANT_SETTINGS)] },
      async () => ({ success: true, module: 'settings' })
    );

    // 5. Rota restrita por papel explícito (somente OWNER)
    app.post(
      '/test/admin-only',
      { preHandler: [authenticateBearer, requireRole(UserRole.OWNER)] },
      async () => ({ success: true, role: 'owner' })
    );

    // 6. Rota com escopo técnico (técnico só altera OS atribuída a ele)
    app.patch(
      '/test/work-orders/:id/status',
      {
        preHandler: [
          authenticateBearer,
          requirePermission(Permissions.WORK_ORDER_UPDATE_STATUS),
          requireAssignedTechnician((req) => {
            const osId = (req.params as { id: string }).id;
            return workOrdersMock[osId]?.technician_id;
          }),
        ],
      },
      async (req) => ({ success: true, updatedOsId: (req.params as { id: string }).id })
    );

    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // Helpers para tokens assinados por papel
  function createToken(role: string, userId = 'test-user-id', isSuperadmin = false) {
    return signJwt({
      sub: userId,
      email: `${role}@teste.carx.com.br`,
      role,
      tenant_id: 'tenant-test-123',
      isSuperadmin,
    });
  }

  it('deve rejeitar requisição sem token com HTTP 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/financial/reports',
    });

    assert.equal(res.statusCode, 401);
  });

  describe('Papel: TECNICO', () => {
    const tokenTech1 = createToken(UserRole.TECNICO, 'tech-user-1');

    it('TÉCNICO: deve receber 403 Forbidden ao tentar acessar relatórios financeiros', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/financial/reports',
        headers: { authorization: `Bearer ${tokenTech1}` },
      });

      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.match(body.message, /financial:view/);
    });

    it('TÉCNICO: deve receber 403 Forbidden ao tentar deletar uma Ordem de Serviço', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/test/work-orders/os-100',
        headers: { authorization: `Bearer ${tokenTech1}` },
      });

      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.match(body.message, /work_order:delete/);
    });

    it('TÉCNICO: deve receber 403 Forbidden ao tentar alterar configurações da oficina', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/test/tenant/settings',
        headers: { authorization: `Bearer ${tokenTech1}` },
      });

      assert.equal(res.statusCode, 403);
    });

    it('TÉCNICO: deve receber 403 Forbidden ao tentar alterar OS atribuída a OUTRO técnico', async () => {
      // Tech-user-1 tenta alterar os-200 (atribuída a tech-user-2)
      const res = await app.inject({
        method: 'PATCH',
        url: '/test/work-orders/os-200/status',
        headers: { authorization: `Bearer ${tokenTech1}` },
      });

      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.body);
      assert.match(body.message, /técnicos só podem acessar e atualizar ordens de serviço atribuídas a eles/);
    });

    it('TÉCNICO: deve receber 200 OK ao atualizar OS atribuída a ELE mesmo', async () => {
      // Tech-user-1 atualiza os-100 (atribuída a tech-user-1)
      const res = await app.inject({
        method: 'PATCH',
        url: '/test/work-orders/os-100/status',
        headers: { authorization: `Bearer ${tokenTech1}` },
      });

      assert.equal(res.statusCode, 200);
      assert.equal(JSON.parse(res.body).success, true);
    });
  });

  describe('Papel: ATENDENTE', () => {
    const tokenAtendente = createToken(UserRole.ATENDENTE);

    it('ATENDENTE: deve receber 200 OK ao gerenciar clientes e orçamentos', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/test/customers',
        headers: { authorization: `Bearer ${tokenAtendente}` },
      });

      assert.equal(res.statusCode, 200);
    });

    it('ATENDENTE: deve receber 403 Forbidden ao tentar acessar relatórios financeiros', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/financial/reports',
        headers: { authorization: `Bearer ${tokenAtendente}` },
      });

      assert.equal(res.statusCode, 403);
    });

    it('ATENDENTE: deve receber 403 Forbidden ao tentar deletar uma Ordem de Serviço', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/test/work-orders/os-100',
        headers: { authorization: `Bearer ${tokenAtendente}` },
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('Papel: FINANCEIRO', () => {
    const tokenFinanceiro = createToken(UserRole.FINANCEIRO);

    it('FINANCEIRO: deve receber 200 OK ao acessar módulo financeiro', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/financial/reports',
        headers: { authorization: `Bearer ${tokenFinanceiro}` },
      });

      assert.equal(res.statusCode, 200);
    });

    it('FINANCEIRO: deve receber 403 Forbidden ao tentar deletar uma Ordem de Serviço', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/test/work-orders/os-100',
        headers: { authorization: `Bearer ${tokenFinanceiro}` },
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('Papel: GESTOR', () => {
    const tokenGestor = createToken(UserRole.GESTOR);

    it('GESTOR: deve receber 200 OK no financeiro e clientes', async () => {
      const resFin = await app.inject({
        method: 'GET',
        url: '/test/financial/reports',
        headers: { authorization: `Bearer ${tokenGestor}` },
      });
      assert.equal(resFin.statusCode, 200);

      const resCust = await app.inject({
        method: 'POST',
        url: '/test/customers',
        headers: { authorization: `Bearer ${tokenGestor}` },
      });
      assert.equal(resCust.statusCode, 200);
    });

    it('GESTOR: deve receber 403 Forbidden ao tentar deletar OS (deleção restrita a OWNER)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/test/work-orders/os-100',
        headers: { authorization: `Bearer ${tokenGestor}` },
      });

      assert.equal(res.statusCode, 403);
    });

    it('GESTOR: tem visão global e pode atualizar OS de qualquer técnico', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/test/work-orders/os-200/status',
        headers: { authorization: `Bearer ${tokenGestor}` },
      });

      assert.equal(res.statusCode, 200);
    });
  });

  describe('Papel: OWNER (Proprietário)', () => {
    const tokenOwner = createToken(UserRole.OWNER);

    it('OWNER: possui acesso irrestrito dentro da sua oficina (incluindo deleção e settings)', async () => {
      const resDelete = await app.inject({
        method: 'DELETE',
        url: '/test/work-orders/os-100',
        headers: { authorization: `Bearer ${tokenOwner}` },
      });
      assert.equal(resDelete.statusCode, 200);

      const resSettings = await app.inject({
        method: 'POST',
        url: '/test/tenant/settings',
        headers: { authorization: `Bearer ${tokenOwner}` },
      });
      assert.equal(resSettings.statusCode, 200);

      const resAdmin = await app.inject({
        method: 'POST',
        url: '/test/admin-only',
        headers: { authorization: `Bearer ${tokenOwner}` },
      });
      assert.equal(resAdmin.statusCode, 200);
    });
  });

  describe('Papel: SUPERADMIN', () => {
    const tokenSuper = createToken('superadmin', 'super-admin-user', true);

    it('SUPERADMIN: possui bypass autorizado para qualquer recurso do sistema', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/financial/reports',
        headers: { authorization: `Bearer ${tokenSuper}` },
      });

      assert.equal(res.statusCode, 200);
    });
  });
});

