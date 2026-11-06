import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  CreateBayInputSchema,
  UpdateBayInputSchema,
  CreateAppointmentInputSchema,
  UpdateAppointmentInputSchema,
  PublicBookingInputSchema,
  AppointmentStatusEnum,
} from '@carx/shared';
import {
  appointmentService,
  BayConflictError,
  BayDuplicateNameError,
  BayNotFoundError,
  AppointmentNotFoundError,
  AppointmentValidationError,
  BotDetectedError,
} from '../appointments/appointment-service.js';

export async function appointmentRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // 1. BOXES DE ATENDIMENTO FÍSICOS (BAYS)
  // ============================================================================

  /**
   * GET /bays — Lista os boxes físicos da oficina
   */
  fastify.get(
    '/bays',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { activeOnly } = request.query as { activeOnly?: string };
      const bays = await appointmentService.listBays(tenantId, {
        activeOnly: activeOnly === 'true',
      });

      return reply.code(200).send(bays);
    }
  );

  /**
   * GET /bays/:id — Busca dados de um box
   */
  fastify.get(
    '/bays/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      const bay = await appointmentService.getBayById(tenantId, id);
      if (!bay) {
        return reply.code(404).send({ statusCode: 404, message: 'Box não encontrado.' });
      }

      return reply.code(200).send(bay);
    }
  );

  /**
   * POST /bays — Cria um novo box de atendimento
   */
  fastify.post(
    '/bays',
    { preHandler: [authenticateBearer, requireTenantContext, requireRole('owner', 'gestor', 'superadmin')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseResult = CreateBayInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const created = await appointmentService.createBay(tenantId, parseResult.data, userId);
        return reply.code(201).send(created);
      } catch (err) {
        if (err instanceof BayDuplicateNameError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /bays/:id — Atualiza um box existente
   */
  fastify.put(
    '/bays/:id',
    { preHandler: [authenticateBearer, requireTenantContext, requireRole('owner', 'gestor', 'superadmin')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = UpdateBayInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await appointmentService.updateBay(tenantId, id, parseResult.data, userId);
        return reply.code(200).send(updated);
      } catch (err) {
        if (err instanceof BayNotFoundError || err instanceof BayDuplicateNameError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /bays/:id — Remove um box
   */
  fastify.delete(
    '/bays/:id',
    { preHandler: [authenticateBearer, requireTenantContext, requireRole('owner', 'superadmin')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        await appointmentService.deleteBay(tenantId, id, userId);
        return reply.code(200).send({ success: true, message: 'Box removido com sucesso.' });
      } catch (err) {
        if (err instanceof BayNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // 2. AGENDAMENTOS (INTERNO)
  // ============================================================================

  /**
   * GET /appointments/availability — Consulta slots de disponibilidade por box para um determinado dia
   */
  fastify.get(
    '/appointments/availability',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { date } = request.query as { date?: string };
      const dateTarget = date || new Date().toISOString().split('T')[0];
      const availability = await appointmentService.getBayAvailability(tenantId, dateTarget);
      return reply.code(200).send(availability);
    }
  );

  /**
   * GET /appointments — Lista agendamentos com filtros
   */
  fastify.get(
    '/appointments',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { startDate, endDate, bayId, technicianId, status } = request.query as {
        startDate?: string;
        endDate?: string;
        bayId?: string;
        technicianId?: string;
        status?: string;
      };

      const appointments = await appointmentService.listAppointments(tenantId, {
        startDate,
        endDate,
        bayId,
        technicianId,
        status,
      });

      return reply.code(200).send(appointments);
    }
  );

  /**
   * GET /appointments/:id — Busca detalhes do agendamento
   */
  fastify.get(
    '/appointments/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      const appointment = await appointmentService.getAppointmentById(tenantId, id);
      if (!appointment) {
        return reply.code(404).send({ statusCode: 404, message: 'Agendamento não encontrado.' });
      }

      return reply.code(200).send(appointment);
    }
  );

  /**
   * POST /appointments — Cria um novo agendamento com validação de conflito de box
   */
  fastify.post(
    '/appointments',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole('owner', 'gestor', 'atendente', 'superadmin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseResult = CreateAppointmentInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const created = await appointmentService.createAppointment(
          tenantId,
          parseResult.data,
          userId
        );
        return reply.code(201).send(created);
      } catch (err) {
        if (
          err instanceof BayConflictError ||
          err instanceof BayNotFoundError ||
          err instanceof AppointmentValidationError
        ) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            message: err.message,
            conflictingAppointment: (err as BayConflictError).conflictingAppointment,
          });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /appointments/:id — Atualiza / Reagenda um agendamento
   */
  fastify.put(
    '/appointments/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole('owner', 'gestor', 'atendente', 'superadmin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = UpdateAppointmentInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await appointmentService.updateAppointment(
          tenantId,
          id,
          parseResult.data,
          userId
        );
        return reply.code(200).send(updated);
      } catch (err) {
        if (
          err instanceof BayConflictError ||
          err instanceof BayNotFoundError ||
          err instanceof AppointmentNotFoundError ||
          err instanceof AppointmentValidationError
        ) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            message: err.message,
            conflictingAppointment: (err as BayConflictError).conflictingAppointment,
          });
        }
        throw err;
      }
    }
  );

  /**
   * PATCH /appointments/:id/status — Atualiza status do agendamento (ex: canceled, confirmed, completed)
   */
  fastify.patch(
    '/appointments/:id/status',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole('owner', 'gestor', 'atendente', 'tecnico', 'superadmin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { id } = request.params as { id: string };
      const { status } = request.body as { status?: string };

      const parseResult = AppointmentStatusEnum.safeParse(status);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Status de agendamento inválido. Valores válidos: scheduled, confirmed, in_progress, completed, canceled, no_show.',
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await appointmentService.updateAppointmentStatus(
          tenantId,
          id,
          parseResult.data,
          userId
        );
        return reply.code(200).send(updated);
      } catch (err) {
        if (err instanceof AppointmentNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // 3. AGENDAMENTO ONLINE PÚBLICO (SEM TOKEN JWT / PROTEÇÃO ANTI-BOT)
  // ============================================================================

  /**
   * POST /public/book/:tenantSlug ou POST /public/book
   * Rota pública para clientes agendarem serviços online.
   * - Cria a OS no status 'QUOTE' com origem 'ONLINE'
   * - Campos estritamente sanitizados e seguros
   */
  const handlePublicBooking = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { tenantSlug?: string };
    const query = request.query as { tenant?: string; slug?: string };
    const headers = request.headers as Record<string, string | undefined>;
    const body = request.body as Record<string, unknown> | undefined;

    const slugOrId =
      params.tenantSlug ||
      query.tenant ||
      query.slug ||
      headers['x-tenant-slug'] ||
      headers['x-tenant-id'] ||
      (body?.tenantSlug as string) ||
      (body?.tenantId as string);

    if (!slugOrId) {
      return reply.code(400).send({
        statusCode: 400,
        message: 'Identificador da oficina (slug ou id) é obrigatório para agendamento online.',
      });
    }

    const parseResult = PublicBookingInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    try {
      const bookingResponse = await appointmentService.bookOnline(slugOrId, parseResult.data);
      return reply.code(201).send(bookingResponse);
    } catch (err) {
      if (
        err instanceof BayConflictError ||
        err instanceof BayNotFoundError ||
        err instanceof AppointmentValidationError ||
        err instanceof BotDetectedError
      ) {
        return reply.code(err.statusCode).send({
          statusCode: err.statusCode,
          message: err.message,
          conflictingAppointment: (err as BayConflictError).conflictingAppointment,
        });
      }
      throw err;
    }
  };

  fastify.post('/public/book/:tenantSlug', handlePublicBooking);
  fastify.post('/public/book', handlePublicBooking);
}
