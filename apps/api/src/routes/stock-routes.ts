import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  CreateMaterialInputDto,
  CreateMaterialInputSchema,
  UpdateMaterialInputDto,
  UpdateMaterialInputSchema,
  CreateMaterialRollInputDto,
  CreateMaterialRollInputSchema,
  CreateStockMovementInputDto,
  CreateStockMovementInputSchema,
  AllocateWorkOrderMaterialInputDto,
  AllocateWorkOrderMaterialInputSchema,
} from '@carx/shared';
import {
  stockService,
  StockValidationError,
  StockNotFoundError,
  StockInsufficientError,
} from '../stock/stock-service.js';

export async function stockRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // MATERIAIS / PRODUTOS / CONSUMÍVEIS
  // ============================================================================

  /**
   * GET /materials — Lista materiais da oficina
   */
  fastify.get(
    '/materials',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { search, category, isRoll, page, limit } = request.query as {
        search?: string;
        category?: string;
        isRoll?: string;
        page?: string;
        limit?: string;
      };

      const result = await stockService.listMaterials(tenantId, {
        search,
        category,
        isRoll: isRoll !== undefined ? isRoll === 'true' : undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return reply.code(200).send(result);
    }
  );

  /**
   * GET /materials/alerts/low-stock — Alertas de insumos e bobinas abaixo do mínimo
   */
  fastify.get(
    '/materials/alerts/low-stock',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const alerts = await stockService.getLowStockAlerts(tenantId);
      return reply.code(200).send(alerts);
    }
  );

  /**
   * GET /materials/:id — Detalhe do material
   */
  fastify.get<{ Params: { id: string } }>(
    '/materials/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const material = await stockService.getMaterialById(tenantId, request.params.id);
        return reply.code(200).send(material);
      } catch (err: any) {
        if (err instanceof StockNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /materials — Cria novo material / insumo
   */
  fastify.post<{ Body: CreateMaterialInputDto }>(
    '/materials',
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

      const parseRes = CreateMaterialInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de material inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const created = await stockService.createMaterial(tenantId, parseRes.data, userId);
        return reply.code(201).send(created);
      } catch (err: any) {
        if (err instanceof StockValidationError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /materials/:id — Atualização de material
   */
  fastify.put<{ Params: { id: string }; Body: UpdateMaterialInputDto }>(
    '/materials/:id',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = UpdateMaterialInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de atualização inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await stockService.updateMaterial(tenantId, request.params.id, parseRes.data, userId);
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof StockValidationError || err instanceof StockNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // BOBINAS / ROLOS DE PELÍCULA (PPF E INSULFILM)
  // ============================================================================

  /**
   * GET /materials/rolls — Lista bobinas cadastradas
   */
  fastify.get(
    '/materials/rolls',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { materialId, status, brand, lotNumber } = request.query as {
        materialId?: string;
        status?: string;
        brand?: string;
        lotNumber?: string;
      };

      const rolls = await stockService.listRolls(tenantId, { materialId, status, brand, lotNumber });
      return reply.code(200).send(rolls);
    }
  );

  /**
   * GET /materials/rolls/:id — Detalhe da bobina
   */
  fastify.get<{ Params: { id: string } }>(
    '/materials/rolls/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const roll = await stockService.getRollById(tenantId, request.params.id);
        return reply.code(200).send(roll);
      } catch (err: any) {
        if (err instanceof StockNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /materials/rolls — Cadastra nova bobina
   */
  fastify.post<{ Body: CreateMaterialRollInputDto }>(
    '/materials/rolls',
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

      const parseRes = CreateMaterialRollInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de bobina inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const created = await stockService.createRoll(tenantId, parseRes.data, userId);
        return reply.code(201).send(created);
      } catch (err: any) {
        if (err instanceof StockValidationError || err instanceof StockNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // MOVIMENTAÇÕES DE ESTOQUE (HISTÓRICO ATÔMICO)
  // ============================================================================

  /**
   * POST /materials/movements — Registro de movimentação de estoque
   */
  fastify.post<{ Body: CreateStockMovementInputDto }>(
    '/materials/movements',
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

      const parseRes = CreateStockMovementInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados de movimentação de estoque inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const movement = await stockService.createStockMovement(tenantId, parseRes.data, userId);
        return reply.code(201).send(movement);
      } catch (err: any) {
        if (
          err instanceof StockValidationError ||
          err instanceof StockNotFoundError ||
          err instanceof StockInsufficientError
        ) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /materials/:id/movements — Histórico de movimentações de um material
   */
  fastify.get<{ Params: { id: string } }>(
    '/materials/:id/movements',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const movements = await stockService.listMaterialMovements(tenantId, request.params.id);
      return reply.code(200).send(movements);
    }
  );

  // ============================================================================
  // ALOCAÇÃO E BAIXA DE INSUMOS NA ORDEM DE SERVIÇO
  // ============================================================================

  /**
   * POST /work-orders/:id/materials — Aloca material/bobina para a OS
   */
  fastify.post<{ Params: { id: string }; Body: AllocateWorkOrderMaterialInputDto }>(
    '/work-orders/:id/materials',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'tecnico', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = AllocateWorkOrderMaterialInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Dados para alocação de material inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const allocated = await stockService.allocateMaterialToWorkOrder(
          tenantId,
          request.params.id,
          parseRes.data,
          userId
        );
        return reply.code(201).send(allocated);
      } catch (err: any) {
        if (err instanceof StockValidationError || err instanceof StockNotFoundError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /work-orders/:id/materials — Lista materiais alocados à OS
   */
  fastify.get<{ Params: { id: string } }>(
    '/work-orders/:id/materials',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const materials = await stockService.listWorkOrderMaterials(tenantId, request.params.id);
      return reply.code(200).send(materials);
    }
  );

  /**
   * POST /work-orders/:id/consume-materials — Baixa de estoque idempotente para a OS
   */
  fastify.post<{ Params: { id: string } }>(
    '/work-orders/:id/consume-materials',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor', 'atendente', 'tecnico', 'superadmin']),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const result = await stockService.deductWorkOrderMaterials(tenantId, request.params.id, userId);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof StockNotFoundError || err instanceof StockValidationError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );
}

export default stockRoutes;

