import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { customerService, CustomerError, ListCustomersParams } from '../customers/customer-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { CreateCustomerDto, UpdateCustomerDto } from '@carx/shared';

export async function customerRoutes(fastify: FastifyInstance) {
  /**
   * GET /customers — Listagem paginada de clientes com busca textual no servidor
   */
  fastify.get<{
    Querystring: ListCustomersParams;
  }>(
    '/customers',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest<{ Querystring: ListCustomersParams }>, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const result = await customerService.list(tenantId, request.query);
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /customers/:id — Consulta detalhada de cliente com veículos vinculados
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/customers/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const customer = await customerService.getById(tenantId, request.params.id);
        return reply.code(200).send(customer);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /customers — Cadastro de novo cliente
   */
  fastify.post<{
    Body: CreateCustomerDto;
  }>(
    '/customers',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const newCustomer = await customerService.create(tenantId, request.body, userId);
        return reply.code(201).send(newCustomer);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * PUT /customers/:id — Atualização de dados cadastrais do cliente
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateCustomerDto;
  }>(
    '/customers/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const updated = await customerService.update(tenantId, request.params.id, request.body, userId);
        return reply.code(200).send(updated);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * DELETE /customers/:id — Desativação segura (soft delete) do cliente
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/customers/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const result = await customerService.delete(tenantId, request.params.id, userId);
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );
}

export default customerRoutes;
