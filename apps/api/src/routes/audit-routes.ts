import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditService, ListAuditLogsFilters } from '../audit/audit-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { UserRole } from '@carx/shared';

interface ListAuditQuery {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

interface AuditParams {
  id: string;
}

export async function auditRoutes(fastify: FastifyInstance) {
  /**
   * GET /audit-logs — Lista a trilha imutável de auditoria da oficina
   * Acesso restrito a OWNER, GESTOR e SUPERADMIN
   */
  fastify.get<{ Querystring: ListAuditQuery }>(
    '/audit-logs',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.GESTOR, UserRole.SUPERADMIN),
      ],
    },
    async (request: FastifyRequest<{ Querystring: ListAuditQuery }>, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Contexto de tenant é obrigatório para consultar trilha de auditoria.',
        });
      }

      const {
        entity,
        entityId,
        action,
        userId,
        startDate,
        endDate,
        page,
        limit,
      } = request.query;

      const filters: ListAuditLogsFilters = {
        tenantId,
        entity,
        entityId,
        action,
        userId,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      };

      const result = await auditService.list(filters);
      return reply.code(200).send(result);
    }
  );

  /**
   * GET /audit-logs/:id — Detalhe e snapshot de um registro de auditoria específico
   */
  fastify.get<{ Params: AuditParams }>(
    '/audit-logs/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.GESTOR, UserRole.SUPERADMIN),
      ],
    },
    async (request: FastifyRequest<{ Params: AuditParams }>, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Contexto de tenant é obrigatório.',
        });
      }

      const log = await auditService.getById(tenantId, request.params.id);
      if (!log) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Registro de auditoria não encontrado.',
        });
      }

      return reply.code(200).send(log);
    }
  );
}

export default auditRoutes;

