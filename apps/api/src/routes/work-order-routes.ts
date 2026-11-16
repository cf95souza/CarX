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
  WhatsAppTransactionalEventType,
} from '@carx/shared';
import {
  workOrderService,
  WorkOrderStateError,
  WorkOrderNotFoundError,
} from '../work-orders/work-order-service.js';

export async function workOrderRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ENDPOINTS PÚBLICOS DE ORÇAMENTO DIGITAL & TRACKING (SEM AUTENTICAÇÃO)
  // ============================================================================

  /**
   * GET /public/tv/:slug — Painel público do Monitor TV da oficina isolado por tenant
   */
  fastify.get<{ Params: { slug: string } }>(
    '/public/tv/:slug',
    async (request, reply) => {
      try {
        const result = await workOrderService.getPublicTvData(request.params.slug);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /public/quotes/:token — Consulta pública de orçamento digital com proteção LGPD
   */
  fastify.get<{ Params: { token: string } }>(
    '/public/quotes/:token',
    async (request, reply) => {
      try {
        const result = await workOrderService.getPublicQuote(request.params.token);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /public/quotes/:token/accept — Aceite legal com assinatura digital e IP
   */
  fastify.post<{
    Params: { token: string };
    Body: { signatureName?: string; termsAccepted?: boolean; agreedTerms?: boolean };
  }>(
    '/public/quotes/:token/accept',
    async (request, reply) => {
      const body = (request.body || {}) as any;
      const signatureName = body.signatureName || '';
      const termsAccepted = Boolean(body.termsAccepted ?? body.agreedTerms);
      const ip = (request.headers['x-forwarded-for'] as string) || request.ip;
      const userAgent = request.headers['user-agent'];

      try {
        const result = await workOrderService.acceptPublicQuote(
          request.params.token,
          {
            signatureName,
            termsAccepted,
          },
          ip || '127.0.0.1',
          (userAgent as string) || 'Browser'
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /public/quotes/:token/pix-confirm — Confirmação do pagamento de sinal Pix online
   */
  fastify.post<{ Params: { token: string } }>(
    '/public/quotes/:token/pix-confirm',
    async (request, reply) => {
      try {
        const result = await workOrderService.confirmDepositPix(request.params.token);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /public/quotes/:token/reject — Recusa formal do orçamento pelo cliente
   */
  fastify.post<{ Params: { token: string }; Body: { reason?: string } }>(
    '/public/quotes/:token/reject',
    async (request, reply) => {
      try {
        const result = await workOrderService.rejectPublicQuote(
          request.params.token,
          request.body?.reason || 'Sem justificativa informada'
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

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
      excludeQuote?: string | boolean;
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

      const excludeQuote = request.query.excludeQuote === 'true' || request.query.excludeQuote === true;

      const result = await workOrderService.list(tenantId, {
        status: request.query.status as WorkOrderStatusType,
        customerId: request.query.customerId,
        vehicleId: request.query.vehicleId,
        technicianId: technicianIdFilter,
        search: request.query.search,
        page,
        limit,
        excludeQuote,
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
  const handleUpdateWorkOrder = async (
    request: any,
    reply: any
  ) => {
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
  };

  fastify.put<{ Params: { id: string }; Body: UpdateWorkOrderDto }>(
    '/work-orders/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'superadmin']),
      ],
    },
    handleUpdateWorkOrder
  );

  /**
   * PATCH /work-orders/:id — Atualização parcial/serviços da Ordem de Serviço
   */
  fastify.patch<{ Params: { id: string }; Body: UpdateWorkOrderDto }>(
    '/work-orders/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'superadmin']),
      ],
    },
    handleUpdateWorkOrder
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
      const rawRole = String(user?.role || '').toLowerCase().trim();
      const isTech = rawRole === 'tecnico' || rawRole === 'operador';

      try {
        // Validação de permissões para técnico/operador
        if (isTech && !user?.isSuperadmin) {
          const currentOrder = await workOrderService.getById(tenantId, request.params.id);
          
          // Se a OS já tem outro técnico atribuído diferente do usuário logado
          if (currentOrder.technicianId && currentOrder.technicianId !== currentUserId) {
            return reply.code(403).send({
              statusCode: 403,
              message: 'Acesso negado: técnico só pode alterar status de ordens atribuídas a ele.',
            });
          }

          // Se a OS ainda não tem técnico e o operador está iniciando ou concluindo a execução, autoatribui o técnico
          if (!currentOrder.technicianId && (status === WorkOrderStatus.IN_PROGRESS || status === WorkOrderStatus.QA || status === WorkOrderStatus.READY)) {
            await workOrderService.update(tenantId, request.params.id, { technicianId: currentUserId }, currentUserId);
          }

          // Técnico pode avançar status operacionais da esteira
          const allowedTechnicianTransitions: WorkOrderStatusType[] = [
            WorkOrderStatus.CHECKED_IN,
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.PAUSED,
            WorkOrderStatus.QA,
            WorkOrderStatus.READY,
          ];
          if (!allowedTechnicianTransitions.includes(status)) {
            return reply.code(403).send({
              statusCode: 403,
              message: `Papel técnico/operador não tem permissão para transicionar para o estado "${status}".`,
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

  // ============================================================================
  // ROTAS DE COMUNICAÇÃO TRANSACIONAL VIA WHATSAPP (T6.1 & T6.4)
  // ============================================================================

  /**
   * POST /work-orders/:id/send-whatsapp — Envio ou geração do link da proposta por WhatsApp
   */
  fastify.post<{ Params: { id: string }; Body: { originUrl?: string } }>(
    '/work-orders/:id/send-whatsapp',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      try {
        const originUrl = request.body?.originUrl || request.headers.origin || 'http://localhost:5173';
        const result = await workOrderService.sendQuoteWhatsApp(tenantId, request.params.id, originUrl);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /work-orders/:id/notify-whatsapp — Notificação transacional sob demanda ou automática
   */
  fastify.post<{
    Params: { id: string };
    Body: {
      eventType?: WhatsAppTransactionalEventType;
      customMessage?: string;
      originUrl?: string;
    };
  }>(
    '/work-orders/:id/notify-whatsapp',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const eventType = request.body?.eventType || 'CUSTOM';
      const originUrl = request.body?.originUrl || request.headers.origin || 'http://localhost:5173';

      try {
        const result = await workOrderService.notifyWorkOrderWhatsApp(
          tenantId,
          request.params.id,
          eventType,
          request.body?.customMessage,
          originUrl
        );
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
  // ROTAS DE PIX INTEGRADO PARA ORDENS DE SERVIÇO & CONCILIAÇÃO (T6.3)
  // ============================================================================

  /**
   * POST /work-orders/:id/pix-charge — Gera cobrança Pix dinâmica para a OS no caixa
   */
  fastify.post<{ Params: { id: string }; Body: { amountCents?: number } }>(
    '/work-orders/:id/pix-charge',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      try {
        const result = await workOrderService.createPixCharge(
          tenantId,
          request.params.id,
          request.body?.amountCents,
          userId
        );
        return reply.code(201).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderStateError || err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /work-orders/:id/pix-status/:txid — Consulta status da cobrança Pix da OS
   */
  fastify.get<{ Params: { id: string; txid: string } }>(
    '/work-orders/:id/pix-status/:txid',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;

      try {
        const result = await workOrderService.getPixStatus(
          tenantId,
          request.params.id,
          request.params.txid
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /webhooks/pix/confirm — Webhook de conciliação bancária / liquidação instantânea Pix
   */
  fastify.post<{
    Body: {
      txid: string;
      amountCents?: number;
      e2eId?: string;
      payerName?: string;
      secretToken?: string;
    };
  }>(
    '/webhooks/pix/confirm',
    async (request, reply) => {
      const { txid, amountCents, e2eId, payerName } = request.body || {};

      if (!txid || typeof txid !== 'string') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'BAD_REQUEST',
          message: 'O campo "txid" é obrigatório para conciliação Pix.',
        });
      }

      try {
        const result = await workOrderService.confirmPixPayment(
          txid,
          amountCents,
          e2eId,
          payerName
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof WorkOrderNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );
}

export default workOrderRoutes;
