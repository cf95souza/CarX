import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { npsService, NpsError } from '../nps/nps-service.js';
import {
  CreateNpsSurveySchema,
  AnswerNpsSurveySchema,
  CreateReminderSchema,
  UpdateReminderStatusSchema,
  UpdateGoogleReviewUrlSchema,
  UserRole,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export async function npsRoutes(app: FastifyInstance) {
  // ============================================================================
  // 1. ENDPOINTS PÚBLICOS DE RESPOSTA DO CLIENTE (SEM JWT)
  // ============================================================================

  // GET /public/nps/:token — Dados da pesquisa para o formulário no celular do cliente
  app.get<{ Params: { token: string } }>(
    '/public/nps/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      try {
        const survey = await npsService.getSurveyByToken(request.params.token);
        return reply.code(200).send(survey);
      } catch (err: any) {
        if (err instanceof NpsError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Erro interno ao consultar pesquisa de satisfação.',
        });
      }
    }
  );

  // POST /public/nps/:token — Envio de resposta do cliente
  // CRITÉRIO DE ACEITE: Responder pela segunda vez ao mesmo token é bloqueado (409)
  app.post<{ Params: { token: string }; Body: unknown }>(
    '/public/nps/:token',
    async (request: FastifyRequest<{ Params: { token: string }; Body: unknown }>, reply: FastifyReply) => {
      const parseResult = AnswerNpsSurveySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Nota ou dados de resposta inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await npsService.answerSurvey(request.params.token, parseResult.data);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof NpsError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        request.log.error(err, 'Erro ao responder pesquisa NPS');
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // POST /public/nps/:token/google-click — Registro de clique para avaliar no Google (T6.8)
  app.post<{ Params: { token: string } }>(
    '/public/nps/:token/google-click',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const ok = await npsService.recordGoogleReviewClick(request.params.token);
      return reply.code(200).send({ success: ok });
    }
  );

  // ============================================================================
  // 2. ENDPOINTS AUTENTICADOS — PAINEL DO GESTOR E PÓS-VENDA
  // ============================================================================

  // POST /nps/surveys — Criar/disparar pesquisa NPS para uma OS concluída
  app.post<{ Body: unknown }>(
    '/nps/surveys',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;

      const parseResult = CreateNpsSurveySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'ID da ordem de serviço inválido.',
          details: parseResult.error.format(),
        });
      }

      try {
        const survey = await npsService.createSurvey(tenantId, parseResult.data.workOrderId);
        return reply.code(201).send(survey);
      } catch (err: any) {
        if (err instanceof NpsError) {
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

  // GET /nps/surveys — Listagem de pesquisas da oficina com filtros
  app.get<{ Querystring: { classification?: string; status?: string } }>(
    '/nps/surveys',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { classification?: string; status?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId!;
      const list = await npsService.listSurveys(tenantId, request.query);
      return reply.code(200).send(list);
    }
  );

  // GET /nps/metrics — Scorecard de NPS do Gestor (-100 a +100, promotores, neutros, detratores)
  app.get(
    '/nps/metrics',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const metrics = await npsService.getMetrics(tenantId);
      return reply.code(200).send(metrics);
    }
  );

  // GET /nps/reputation-overview — Visão consolidada do Motor de Reputação no Google (T6.8)
  app.get(
    '/nps/reputation-overview',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const overview = await npsService.getReputationOverview(tenantId);
      return reply.code(200).send(overview);
    }
  );

  // PUT /nps/google-review-url — Configuração do link oficial do Google Meu Negócio da loja (T6.8)
  app.put<{ Body: unknown }>(
    '/nps/google-review-url',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const parseResult = UpdateGoogleReviewUrlSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      const updatedUrl = await npsService.updateGoogleReviewUrl(tenantId, parseResult.data.googleReviewUrl);
      return reply.code(200).send({ success: true, googleReviewUrl: updatedUrl });
    }
  );

  // POST /nps/surveys/:id/send-google-invite — Disparo/reenvio do convite para avaliação no Google (T6.8)
  app.post<{ Params: { id: string } }>(
    '/nps/surveys/:id/send-google-invite',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      try {
        const result = await npsService.sendGoogleReviewInvite(tenantId, request.params.id);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof NpsError) {
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

  // --------------------------------------------------------------------------
  // 3. RÉGUA DE LEMBRETES DE REVISÃO E MANUTENÇÃO (MAINTENANCE REMINDERS)
  // --------------------------------------------------------------------------

  // POST /maintenance/reminders — Agendar lembrete de pós-venda
  app.post<{ Body: unknown }>(
    '/maintenance/reminders',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;

      const parseResult = CreateReminderSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados de lembrete de manutenção inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const reminder = await npsService.createReminder(tenantId, parseResult.data);
        return reply.code(201).send(reminder);
      } catch (err: any) {
        if (err instanceof NpsError) {
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

  // GET /maintenance/reminders — Listar lembretes agendados
  app.get<{ Querystring: { status?: string; vehicleId?: string } }>(
    '/maintenance/reminders',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (
      request: FastifyRequest<{ Querystring: { status?: string; vehicleId?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId!;
      const list = await npsService.listReminders(tenantId, request.query);
      return reply.code(200).send(list);
    }
  );

  // PATCH /maintenance/reminders/:id/status — Atualizar status do lembrete
  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/maintenance/reminders/:id/status',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;

      const parseResult = UpdateReminderStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Status de lembrete inválido.',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = await npsService.updateReminderStatus(
          tenantId,
          request.params.id,
          parseResult.data.status
        );
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof NpsError) {
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

