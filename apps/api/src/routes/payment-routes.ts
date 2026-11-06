import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  CreatePaymentInputDto,
  CreatePaymentInputSchema,
  RefundPaymentInputDto,
  RefundPaymentInputSchema,
  CreateDepositInputDto,
  CreateDepositInputSchema,
  ApplyDepositInputDto,
  ApplyDepositInputSchema,
} from '@carx/shared';
import {
  paymentService,
  PaymentValidationError,
  PaymentExcessiveAmountError,
  PaymentNotFoundError,
} from '../billing/payment-service.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // PAGAMENTOS DE ORDENS DE SERVIÇO
  // ============================================================================

  /**
   * POST /work-orders/:id/payments — Registra pagamento atômico para uma OS
   */
  fastify.post<{ Params: { id: string }; Body: CreatePaymentInputDto }>(
    '/work-orders/:id/payments',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'financeiro', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = CreatePaymentInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de pagamento inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const payment = await paymentService.processWorkOrderPayment(
          tenantId,
          request.params.id,
          parseRes.data,
          userId
        );
        return reply.code(201).send(payment);
      } catch (err: any) {
        if (
          err instanceof PaymentValidationError ||
          err instanceof PaymentExcessiveAmountError ||
          err instanceof PaymentNotFoundError
        ) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /payments/:id/refund — Estorno total ou parcial de um pagamento
   */
  fastify.post<{ Params: { id: string }; Body: RefundPaymentInputDto }>(
    '/payments/:id/refund',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'financeiro', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = RefundPaymentInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de estorno inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const refunded = await paymentService.refundPayment(
          tenantId,
          request.params.id,
          parseRes.data,
          userId
        );
        return reply.code(200).send(refunded);
      } catch (err: any) {
        if (
          err instanceof PaymentValidationError ||
          err instanceof PaymentExcessiveAmountError ||
          err instanceof PaymentNotFoundError
        ) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /work-orders/:id/financial — Resumo financeiro completo da OS (Saldos e Pagamentos)
   */
  fastify.get<{ Params: { id: string } }>(
    '/work-orders/:id/financial',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const summary = await paymentService.getWorkOrderFinancialSummary(tenantId, request.params.id);
        return reply.code(200).send(summary);
      } catch (err: any) {
        if (err instanceof PaymentNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // ADIANTAMENTOS E SINAL (DEPOSITS)
  // ============================================================================

  /**
   * POST /deposits — Registra um novo sinal/adiantamento de cliente
   */
  fastify.post<{ Body: CreateDepositInputDto }>(
    '/deposits',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'financeiro', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = CreateDepositInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de adiantamento inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const deposit = await paymentService.createDeposit(tenantId, parseRes.data, userId);
        return reply.code(201).send(deposit);
      } catch (err: any) {
        if (err instanceof PaymentValidationError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /deposits/:id/apply — Aplica o sinal retido a uma OS específica
   */
  fastify.post<{ Params: { id: string }; Body: ApplyDepositInputDto }>(
    '/deposits/:id/apply',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'financeiro', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = ApplyDepositInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados para aplicação de sinal inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const result = await paymentService.applyDepositToWorkOrder(
          tenantId,
          request.params.id,
          parseRes.data,
          userId
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (
          err instanceof PaymentValidationError ||
          err instanceof PaymentExcessiveAmountError ||
          err instanceof PaymentNotFoundError
        ) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );
}

export default paymentRoutes;

