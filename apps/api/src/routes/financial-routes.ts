import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { financialService, FinancialError } from '../financial/financial-service.js';
import {
  CreateCommissionRuleSchema,
  PayCommissionEntrySchema,
  CreateFinancialCategorySchema,
  CreateFinancialBillSchema,
  UpdateFinancialBillSchema,
  BatchPayCommissionsSchema,
  FinancialBillType,
  FinancialBillStatus,
  UserRole,
  PlanFeatures,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { requireFeature } from '../middlewares/plan-guards.js';

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
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.TECNICO, UserRole.ATENDENTE]),
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireFeature(PlanFeatures.FINANCIAL),
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
        requireFeature(PlanFeatures.FINANCIAL),
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

  // ============================================================================
  // 4. PLANO DE CONTAS & CATEGORIAS FINANCEIRAS - T6.11
  // ============================================================================

  // GET /financial/categories — Listar categorias do sistema e do tenant
  app.get(
    '/financial/categories',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const categories = await financialService.listCategories(tenantId);
      return reply.code(200).send(categories);
    }
  );

  // POST /financial/categories — Criar categoria personalizada
  app.post<{ Body: unknown }>(
    '/financial/categories',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      const parseResult = CreateFinancialCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados da categoria inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const cat = await financialService.createCategory(tenantId, parseResult.data, userId);
        return reply.code(201).send(cat);
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
  // 5. CONTAS A PAGAR E A RECEBER (FINANCIAL_BILLS) - T6.11
  // ============================================================================

  // GET /financial/bills — Listar lançamentos financeiros com sumário
  app.get<{
    Querystring: {
      type?: FinancialBillType;
      status?: FinancialBillStatus;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    '/financial/bills',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const data = await financialService.listBills(tenantId, request.query);
      return reply.code(200).send(data);
    }
  );

  // POST /financial/bills — Criar conta a pagar ou receber
  app.post<{ Body: unknown }>(
    '/financial/bills',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      const parseResult = CreateFinancialBillSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados da conta inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const bill = await financialService.createBill(tenantId, parseResult.data, userId);
        return reply.code(201).send(bill);
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

  // PATCH /financial/bills/:id/pay — Baixar/Quitar conta
  app.patch<{
    Params: { id: string };
    Body: { paidAmountCents?: number; paymentMethod?: string };
  }>(
    '/financial/bills/:id/pay',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.id)) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Conta financeira não encontrada.',
        });
      }

      try {
        const updated = await financialService.markBillPaid(
          tenantId,
          request.params.id,
          request.body?.paidAmountCents,
          request.body?.paymentMethod,
          userId
        );
        return reply.code(200).send(updated);
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

  // DELETE /financial/bills/:id — Excluir conta
  app.delete<{ Params: { id: string } }>(
    '/financial/bills/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.id)) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Conta financeira não encontrada.',
        });
      }

      try {
        await financialService.deleteBill(tenantId, request.params.id, userId);
        return reply.code(200).send({ success: true, message: 'Conta excluída com sucesso.' });
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
  // 6. DRE AVANÇADO & PROJEÇÃO DE FLUXO DE CAIXA - T6.11
  // ============================================================================

  // GET /reports/dre/advanced — DRE Gerencial Consolidado com EBITDA Real
  app.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/reports/dre/advanced',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const report = await financialService.getAdvancedDre(tenantId, request.query);
      return reply.code(200).send(report);
    }
  );

  // GET /financial/cashflow/projection — Projeção de Fluxo de Caixa (dia a dia)
  app.get<{
    Querystring: {
      days?: number;
    };
  }>(
    '/financial/cashflow/projection',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const days = Number(request.query?.days) || 30;
      const projection = await financialService.getCashFlowProjection(tenantId, days);
      return reply.code(200).send(projection);
    }
  );

  // ============================================================================
  // 7. FECHAMENTO E LIQUIDAÇÃO EM LOTE DE COMISSÕES - T6.11
  // ============================================================================

  // POST /commissions/batch-pay — Quitação em lote de comissões por colaborador
  app.post<{ Body: unknown }>(
    '/commissions/batch-pay',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
        requireFeature(PlanFeatures.FINANCIAL),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      const parseResult = BatchPayCommissionsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de fechamento em lote inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await financialService.batchPayCommissions(tenantId, parseResult.data, userId);
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
}
