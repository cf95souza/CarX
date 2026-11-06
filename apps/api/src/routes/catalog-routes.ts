import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { tenantQuery } from '../database/tenant-query.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  ChecklistTemplateDto,
  CreateCatalogServiceDto,
  UpdateCatalogServiceDto,
  SetServicePriceInputDto,
  CreatePackageDto,
  UpdatePackageDto,
  CalculatePricingInputDto,
  CalculatePricingInputSchema,
} from '@carx/shared';
import {
  catalogPricingService,
  CatalogPricingError,
} from '../services/catalog-pricing-service.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CATÁLOGO DE SERVIÇOS
  // ============================================================================

  /**
   * GET /catalog/services — Consulta o catálogo de serviços da oficina (RLS)
   */
  fastify.get<{
    Querystring: {
      category?: string;
      segment?: string;
      isActive?: string;
      search?: string;
    };
  }>(
    '/catalog/services',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request: FastifyRequest<{ Querystring: { category?: string; segment?: string; isActive?: string; search?: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const { category, segment, isActive, search } = request.query;
      const isAct = isActive !== undefined ? isActive === 'true' : undefined;

      const services = await catalogPricingService.listServices(tenantId, {
        category,
        segment,
        isActive: isAct,
        search,
      });

      return reply.code(200).send(services);
    }
  );

  /**
   * GET /catalog/services/:id — Consulta serviço por ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/catalog/services/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const service = await catalogPricingService.getServiceById(tenantId, request.params.id);
        return reply.code(200).send(service);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /catalog/services — Cadastra um novo serviço no catálogo da oficina (RLS)
   */
  fastify.post<{ Body: CreateCatalogServiceDto }>(
    '/catalog/services',
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
        const service = await catalogPricingService.createService(
          tenantId,
          request.body,
          userId
        );
        return reply.code(201).send(service);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /catalog/services/:id — Atualiza um serviço existente
   */
  fastify.put<{ Params: { id: string }; Body: UpdateCatalogServiceDto }>(
    '/catalog/services/:id',
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

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await catalogPricingService.updateService(
          tenantId,
          request.params.id,
          request.body,
          userId
        );
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /catalog/services/:id — Remove um serviço do catálogo
   */
  fastify.delete<{ Params: { id: string } }>(
    '/catalog/services/:id',
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

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const result = await catalogPricingService.deleteService(
          tenantId,
          request.params.id,
          userId
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // PREÇOS E TEMPOS POR PORTE DE VEÍCULO
  // ============================================================================

  /**
   * GET /catalog/services/:id/prices — Consulta tabela de preços por porte do serviço
   */
  fastify.get<{ Params: { id: string } }>(
    '/catalog/services/:id/prices',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const prices = await catalogPricingService.getServicePricesByClass(tenantId, request.params.id);
        return reply.code(200).send(prices);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /catalog/services/:id/prices — Atualiza (UPSERT) preços e tempos por porte
   */
  fastify.put<{ Params: { id: string }; Body: { prices: SetServicePriceInputDto[] } }>(
    '/catalog/services/:id/prices',
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

      const { prices } = request.body || {};
      if (!Array.isArray(prices)) {
        return reply.code(400).send({ statusCode: 400, message: 'O corpo deve conter uma lista "prices".' });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const updated = await catalogPricingService.setServicePricesByClass(
          tenantId,
          request.params.id,
          prices,
          userId
        );
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // COMBOS E PACOTES DE SERVIÇOS
  // ============================================================================

  /**
   * GET /catalog/packages — Lista combos e pacotes
   */
  fastify.get<{ Querystring: { isActive?: string } }>(
    '/catalog/packages',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const isAct = request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined;
      const packages = await catalogPricingService.listPackages(tenantId, { isActive: isAct });
      return reply.code(200).send(packages);
    }
  );

  /**
   * GET /catalog/packages/:id — Consulta combo/pacote por ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/catalog/packages/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      try {
        const pkg = await catalogPricingService.getPackageById(tenantId, request.params.id);
        return reply.code(200).send(pkg);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /catalog/packages — Cria combo de serviços
   */
  fastify.post<{ Body: CreatePackageDto }>(
    '/catalog/packages',
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

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const pkg = await catalogPricingService.createPackage(
          tenantId,
          request.body,
          userId
        );
        return reply.code(201).send(pkg);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * PUT /catalog/packages/:id — Atualiza combo/pacote
   */
  fastify.put<{ Params: { id: string }; Body: UpdatePackageDto }>(
    '/catalog/packages/:id',
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

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const pkg = await catalogPricingService.updatePackage(
          tenantId,
          request.params.id,
          request.body,
          userId
        );
        return reply.code(200).send(pkg);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /catalog/packages/:id — Remove combo/pacote
   */
  fastify.delete<{ Params: { id: string } }>(
    '/catalog/packages/:id',
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

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const result = await catalogPricingService.deletePackage(
          tenantId,
          request.params.id,
          userId
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // CÁLCULO E MOTOR DE ORÇAMENTOS
  // ============================================================================

  /**
   * POST /catalog/calculate-pricing — Calcula orçamento com precisão de porte de veículo e combo
   * Critério de aceite: A seleção de um serviço em um orçamento calcula o valor exato baseado no porte do veículo cadastrado, aplicando o desconto de combo no backend.
   */
  fastify.post<{ Body: CalculatePricingInputDto }>(
    '/catalog/calculate-pricing',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseRes = CalculatePricingInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Parâmetros de cálculo inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const result = await catalogPricingService.calculatePricing(tenantId, parseRes.data);
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof CatalogPricingError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // CHECKLIST TEMPLATES (COMPATIBILIDADE)
  // ============================================================================

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
}

export default catalogRoutes;
