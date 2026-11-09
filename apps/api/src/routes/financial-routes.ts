import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { financialService, FinancialError } from '../financial/financial-service.js';
import {
  CreateCommissionRuleSchema,
  PayCommissionEntrySchema,
  UserRole,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export async function financialRoutes(app: FastifyInstance) {
  // ============================================================================
  // 1. RELATÓRIOS GERENCIAIS (DRE & RANKING DE TÉCNICOS)
  // ============================================================================

  // GET /reports/dre — Demonstrativo de Resultado do Exercício 100% no servidor
  app.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      unitId?: string;
    };
  }>(
    '/reports/dre',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const report = await financialService.getDreReport(tenantId, request.query);
      return reply.code(200).send(report);
    }
  );

  // GET /reports/technicians/ranking — Ranking com Streak Real Auditado
  app.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/reports/technicians/ranking',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const ranking = await financialService.getTechniciansRanking(tenantId, request.query);
      return reply.code(200).send(ranking);
    }
  );

  // ============================================================================
  // 2. REGRAS DE COMISSÃO (COMMISSION_RULES)
  // ============================================================================

  // POST /commissions/rules — Criar regra de comissão
  app.post<{ Body: unknown }>(
    '/commissions/rules',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      const parseResult = CreateCommissionRuleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros da regra de comissão inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const rule = await financialService.createRule(tenantId, parseResult.data, userId);
        return reply.code(201).send(rule);
      } catch (err: any) {
        if (err instanceof FinancialError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /commissions/rules — Listar regras de comissão da oficina
  app.get(
    '/commissions/rules',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const rules = await financialService.listRules(tenantId);
      return reply.code(200).send(rules);
    }
  );

  // DELETE /commissions/rules/:id — Excluir regra de comissão
  app.delete<{ Params: { id: string } }>(
    '/commissions/rules/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      try {
        const result = await financialService.deleteRule(tenantId, request.params.id, userId);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof FinancialError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // ============================================================================
  // 3. APURAÇÃO E EXTRATO DE COMISSÕES (COMMISSION_ENTRIES)
  // ============================================================================

  // POST /commissions/calculate/:workOrderId — Apuração de comissões para a OS
  app.post<{ Params: { workOrderId: string } }>(
    '/commissions/calculate/:workOrderId',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      try {
        const entries = await financialService.calculateWorkOrderCommissions(
          tenantId,
          request.params.workOrderId,
          userId
        );
        return reply.code(200).send(entries);
      } catch (err: any) {
        if (err instanceof FinancialError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /commissions/entries — Extrato de comissões
  app.get<{
    Querystring: {
      technicianId?: string;
      workOrderId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/commissions/entries',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.TECNICO]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const user = (request as any).user;
      const currentUserId = user?.userId || user?.sub;

      const filters = { ...request.query };
      // Se for técnico, só pode visualizar o seu próprio extrato
      if (user?.role === UserRole.TECNICO) {
        filters.technicianId = currentUserId;
      }

      const entries = await financialService.listEntries(tenantId, filters);
      return reply.code(200).send(entries);
    }
  );

  // PATCH /commissions/entries/:id/pay — Liquidação (pagamento) de comissão
  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/commissions/entries/:id/pay',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.id)) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Lançamento de comissão não encontrado.',
        });
      }

      const parseResult = PayCommissionEntrySchema.safeParse(request.body || {});
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de pagamento inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const entry = await financialService.payCommissionEntry(
          tenantId,
          request.params.id,
          parseResult.data,
          userId
        );
        return reply.code(200).send(entry);
      } catch (err: any) {
        if (err instanceof FinancialError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );
}
