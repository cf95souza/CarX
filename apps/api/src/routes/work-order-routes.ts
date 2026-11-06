import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  ChangeWorkOrderStatusDto,
  WorkOrderStatus,
  WorkOrderStatusType,
} from '@carx/shared';
import {
  workOrderService,
  WorkOrderStateError,
  WorkOrderNotFoundError,
} from '../work-orders/work-order-service.js';

export async function workOrderRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ENDPOINT PÚBLICO DE TRACKING (SEM AUTENTICAÇÃO)
  // ============================================================================

  /**
   * GET /work-orders/tracking/:token — Consulta pública de acompanhamento do carro
   */
  fastify.get<{ Params: { token: string } }>(
    '/work-orders/tracking/:token',
    async (request, reply) => {
      try {
        const result = await workOrderService.getPublicTracking(request.params.token);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // ROTAS MULTITENANT PROTEGIDAS
  // ============================================================================

  /**
   * GET /work-orders — Listagem paginada de ordens de serviço
   * - Técnico enxerga apenas suas ordens atribuídas
   * - Gestor, Atendente e Owner têm visão global da oficina
   */
  fastify.get<{
    Querystring: {
      status?: string;
      customerId?: string;
      vehicleId?: string;
      technicianId?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>(
    '/work-orders',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const user = request.user as any;
      const isTechnician = user?.role === 'tecnico';

      // Se for técnico, força o filtro para o seu próprio ID
      const technicianIdFilter = isTechnician
        ? (user?.userId || user?.sub)
        : request.query.technicianId;

      const page = request.query.page ? parseInt(request.query.page, 10) : 1;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;

      const result = await workOrderService.list(tenantId, {
        status: request.query.status as WorkOrderStatusType,
        customerId: request.query.customerId,
        vehicleId: request.query.vehicleId,
        technicianId: technicianIdFilter,
        search: request.query.search,
        page,
        limit,
      });

      return reply.code(200).send(result);
    }
  );

  /**
   * GET /work-orders/:id — Detalhe da Ordem de Serviço com itens e histórico da linha do tempo
   */
  fastify.get<{ Params: { id: string } }>(
    '/work-orders/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const order = await workOrderService.getById(tenantId, request.params.id);

        const user = request.user as any;
        if (user?.role === 'tecnico') {
          const currentUserId = user?.userId || user?.sub;
          if (order.technicianId !== currentUserId) {
            return reply.code(403).send({
              statusCode: 403,
              message: 'Acesso negado: você só pode acessar ordens de serviço atribuídas a você.',
            });
          }
        }

        return reply.code(200).send(order);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /work-orders — Criação de Ordem de Serviço / Orçamento
   */
  fastify.post<{ Body: CreateWorkOrderDto }>(
    '/work-orders',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const created = await workOrderService.create(tenantId, request.body, userId);
        return reply.code(201).send(created);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /work-orders/:id — Atualização cadastral da Ordem de Serviço
   */
  fastify.put<{ Params: { id: string }; Body: UpdateWorkOrderDto }>(
    '/work-orders/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await workOrderService.update(tenantId, request.params.id, request.body, userId);
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /work-orders/:id/status — Transição de Estado da Máquina de Estados (Validada com 422)
   */
  fastify.patch<{ Params: { id: string }; Body: ChangeWorkOrderStatusDto }>(
    '/work-orders/:id/status',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { status, notes, cancelReason, metadata } = request.body || {};
      if (!status) {
        return reply.code(400).send({ statusCode: 400, message: 'O novo status é obrigatório.' });
      }

      const user = request.user as any;
      const currentUserId = user?.userId || user?.sub;

      try {
        // Validação de permissões para técnico
        if (user?.role === 'tecnico') {
          const currentOrder = await workOrderService.getById(tenantId, request.params.id);
          if (currentOrder.technicianId !== currentUserId) {
            return reply.code(403).send({
              statusCode: 403,
              message: 'Acesso negado: técnico só pode alterar status de ordens atribuídas a ele.',
            });
          }

          // Técnico só pode avançar status operacionais
          const allowedTechnicianTransitions: WorkOrderStatusType[] = [
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.PAUSED,
            WorkOrderStatus.QA,
          ];
          if (!allowedTechnicianTransitions.includes(status)) {
            return reply.code(403).send({
              statusCode: 403,
              message: `Papel técnico não tem permissão para transicionar para o estado "${status}".`,
            });
          }
        }

        const updated = await workOrderService.transitionStatus(
          tenantId,
          request.params.id,
          { status, notes, cancelReason, metadata },
          currentUserId
        );

        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );
}

export default workOrderRoutes;
