import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { tenantQuery } from '../database/tenant-query.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { ServiceDto, ChecklistTemplateDto } from '@carx/shared';

export async function catalogRoutes(fastify: FastifyInstance) {
  /**
   * GET /catalog/services — Consulta o catálogo de serviços ativos da oficina (RLS)
   */
  fastify.get(
    '/catalog/services',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const res = await tenantQuery<ServiceDto>(
        tenantId,
        'SELECT * FROM services WHERE is_active = true ORDER BY category, name ASC',
        []
      );

      return reply.code(200).send(res.rows);
    }
  );

  /**
   * GET /catalog/checklists — Consulta templates de checklist de inspeção da oficina (RLS)
   */
  fastify.get(
    '/catalog/checklists',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const res = await tenantQuery<ChecklistTemplateDto>(
        tenantId,
        'SELECT * FROM checklist_templates WHERE is_active = true ORDER BY name ASC',
        []
      );

      return reply.code(200).send(res.rows);
    }
  );

  /**
   * POST /catalog/services — Cadastra um novo serviço no catálogo da oficina (RLS)
   */
  fastify.post<{
    Body: {
      name: string;
      category?: string;
      description?: string;
      priceCents?: number;
      estimatedMinutes?: number;
    };
  }>(
    '/catalog/services',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { name, category = 'geral', description = '', priceCents = 0, estimatedMinutes = 60 } = request.body || {};

      if (!name) {
        return reply.code(400).send({ statusCode: 400, message: 'O nome do serviço é obrigatório.' });
      }

      const res = await tenantQuery<ServiceDto>(
        tenantId,
        `INSERT INTO services (tenant_id, name, category, description, price_cents, estimated_minutes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [tenantId, name, category, description, priceCents, estimatedMinutes]
      );

      return reply.code(201).send(res.rows[0]);
    }
  );
}

export default catalogRoutes;
