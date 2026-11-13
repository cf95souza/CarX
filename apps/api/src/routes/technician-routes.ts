import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import {
  TechnicianQueueFilterSchema,
  StartTimerInputSchema,
  PauseTimerInputSchema,
  StartWithChecklistInputSchema,
  BatchSyncActionsSchema,
} from '@carx/shared';
import { technicianService, TechnicianError } from '../technician/technician-service.js';

export async function technicianRoutes(fastify: FastifyInstance) {
  /**
   * GET /technician/queue — Fila de execução priorizada do técnico
   */
  fastify.get(
    '/technician/queue',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const userId = (request.user as any)?.userId || (request.user as any)?.sub;
      const parseResult = TechnicianQueueFilterSchema.safeParse(request.query);
      const filter = parseResult.success ? parseResult.data : { scope: 'mine' as const };

      try {
        const queue = await technicianService.getQueue(tenantId, userId, filter);
        return reply.code(200).send(queue);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/start — Inicia cronômetro oficial calculado no servidor
   */
  fastify.post(
    '/technician/work-orders/:id/start',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;
      const parseResult = StartTimerInputSchema.safeParse(request.body || {});
      const input = parseResult.success ? parseResult.data : undefined;

      try {
        const timer = await technicianService.startTimer(tenantId, id, userId, input);
        return reply.code(200).send(timer);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/pause — Pausa cronômetro oficial
   */
  fastify.post(
    '/technician/work-orders/:id/pause',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;
      const parseResult = PauseTimerInputSchema.safeParse(request.body || {});
      const input = parseResult.success ? parseResult.data : undefined;

      try {
        const timer = await technicianService.pauseTimer(tenantId, id, userId, input);
        return reply.code(200).send(timer);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/resume — Retoma cronômetro oficial
   */
  fastify.post(
    '/technician/work-orders/:id/resume',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      try {
        const timer = await technicianService.resumeTimer(tenantId, id, userId);
        return reply.code(200).send(timer);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/stop — Finaliza cronômetro oficial
   */
  fastify.post(
    '/technician/work-orders/:id/stop',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;

      try {
        const timer = await technicianService.stopTimer(tenantId, id, userId);
        return reply.code(200).send(timer);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /technician/work-orders/:id/timer — Consulta cronômetro oficial em tempo real da OS
   * (Resiliente a recarregamento ou fechamento do navegador)
   */
  fastify.get(
    '/technician/work-orders/:id/timer',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };

      try {
        const timer = await technicianService.getTimer(tenantId, id);
        return reply.code(200).send(timer);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/start-with-checklist — Ação "Fazer checklist e iniciar"
   */
  fastify.post(
    '/technician/work-orders/:id/start-with-checklist',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const userId = (request.user as any)?.userId || (request.user as any)?.sub;
      const parseResult = StartWithChecklistInputSchema.safeParse(request.body || {});

      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados do checklist inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await technicianService.startWithChecklist(
          tenantId,
          id,
          userId,
          parseResult.data
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/work-orders/:id/rework — Aponta retrabalho na OS
   */
  fastify.post(
    '/technician/work-orders/:id/rework',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      if (!reason || reason.trim().length === 0) {
        return reply.code(400).send({ statusCode: 400, message: 'Motivo do retrabalho é obrigatório.' });
      }

      try {
        const success = await technicianService.setRework(tenantId, id, reason);
        return reply.code(200).send({ success, message: 'Retrabalho registrado com prioridade máxima.' });
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /technician/sync — Sincronização em lote de ações offline do técnico (T6.13)
   */
  fastify.post(
    '/technician/sync',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const userId = (request.user as any)?.userId || (request.user as any)?.sub || (request.user as any)?.id;
      const parseResult = BatchSyncActionsSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Payload de sincronização inválido.',
          errors: parseResult.error.flatten().fieldErrors,
        });
      }

      try {
        const result = await technicianService.syncOfflineActions(
          tenantId,
          userId,
          parseResult.data.actions
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof TechnicianError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );
}

