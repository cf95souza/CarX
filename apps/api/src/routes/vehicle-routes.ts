import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { vehicleService, VehicleError, ListVehiclesParams } from '../customers/vehicle-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { CreateVehicleDto, UpdateVehicleDto } from '@carx/shared';

export async function vehicleRoutes(fastify: FastifyInstance) {
  /**
   * GET /vehicles — Listagem paginada de veículos com filtros por placa, modelo, cliente
   */
  fastify.get<{
    Querystring: ListVehiclesParams;
  }>(
    '/vehicles',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest<{ Querystring: ListVehiclesParams }>, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const result = await vehicleService.list(tenantId, request.query);
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /vehicles/by-plate/:plate — Busca rápida de veículo por placa dentro da oficina
   */
  fastify.get<{
    Params: { plate: string };
  }>(
    '/vehicles/by-plate/:plate',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const vehicle = await vehicleService.getByPlate(tenantId, request.params.plate);
        if (!vehicle) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: `Nenhum veículo com a placa "${request.params.plate}" foi encontrado nesta oficina.`,
          });
        }
        return reply.code(200).send(vehicle);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /vehicles/:id — Consulta detalhada de veículo por ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/vehicles/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const vehicle = await vehicleService.getById(tenantId, request.params.id);
        return reply.code(200).send(vehicle);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /vehicles — Cadastro de veículo (Placa Única por Oficina)
   */
  fastify.post<{
    Body: CreateVehicleDto;
  }>(
    '/vehicles',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const newVehicle = await vehicleService.create(tenantId, request.body, userId);
        return reply.code(201).send(newVehicle);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * PUT /vehicles/:id — Atualização de dados cadastrais do veículo
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateVehicleDto;
  }>(
    '/vehicles/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const updated = await vehicleService.update(tenantId, request.params.id, request.body, userId);
        return reply.code(200).send(updated);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * DELETE /vehicles/:id — Desativação segura do veículo
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/vehicles/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = (request.user as any)?.userId;
        const result = await vehicleService.delete(tenantId, request.params.id, userId);
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );
}

export default vehicleRoutes;
