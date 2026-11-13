import type { FastifyPluginAsync } from 'fastify';
import { miniSiteService, MiniSiteNotFoundError } from '../minisite/minisite-service.js';
import {
  CreateMiniSitePortfolioItemSchema,
  UpdateMiniSitePortfolioItemSchema,
  CreateMiniSiteLeadSchema,
  UpdateMiniSiteLeadStatusSchema,
  UpdateMiniSiteSettingsSchema,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';

export const miniSiteRoutes: FastifyPluginAsync = async (app) => {
  // ==============================================================================
  // 1. ROTAS PÚBLICAS (Acesso sem JWT — para clientes e visitantes do mini-site)
  // ==============================================================================

  /**
   * GET /public/tenant/:slug/site
   * Consulta os dados do mini-site público da oficina
   */
  app.get<{ Params: { slug: string } }>('/public/tenant/:slug/site', async (request, reply) => {
    try {
      const data = await miniSiteService.getPublicMiniSiteData(request.params.slug);
      return reply.status(200).send(data);
    } catch (err: any) {
      if (err instanceof MiniSiteNotFoundError || err.code === 'MINISITE_NOT_FOUND') {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: err.message,
        });
      }
      throw err;
    }
  });

  /**
   * POST /public/tenant/:slug/leads
   * Captação pública de orçamento ou lead
   */
  app.post<{ Params: { slug: string } }>('/public/tenant/:slug/leads', async (request, reply) => {
    try {
      const parsed = CreateMiniSiteLeadSchema.parse(request.body);
      const lead = await miniSiteService.createMiniSiteLead(request.params.slug, parsed);
      return reply.status(201).send(lead);
    } catch (err: any) {
      if (err instanceof MiniSiteNotFoundError || err.code === 'MINISITE_NOT_FOUND') {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: err.message,
        });
      }
      throw err;
    }
  });

  // ==============================================================================
  // 2. ROTAS PROTEGIDAS (Gestor / Dono da loja)
  // ==============================================================================

  // Listar itens do portfólio
  app.get(
    '/minisite/portfolio',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const items = await miniSiteService.listPortfolioItems(tenantId);
      return reply.status(200).send(items);
    }
  );

  // Criar item no portfólio
  app.post(
    '/minisite/portfolio',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const parsed = CreateMiniSitePortfolioItemSchema.parse(request.body);
      const item = await miniSiteService.createPortfolioItem(tenantId, parsed);
      return reply.status(201).send(item);
    }
  );

  // Atualizar item do portfólio
  app.put<{ Params: { id: string } }>(
    '/minisite/portfolio/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const parsed = UpdateMiniSitePortfolioItemSchema.parse(request.body);
      const item = await miniSiteService.updatePortfolioItem(tenantId, request.params.id, parsed);
      return reply.status(200).send(item);
    }
  );

  // Deletar item do portfólio
  app.delete<{ Params: { id: string } }>(
    '/minisite/portfolio/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const success = await miniSiteService.deletePortfolioItem(tenantId, request.params.id);
      return reply.status(200).send({ success });
    }
  );

  // Listar leads recebidos no mini-site
  app.get<{ Querystring: { status?: string } }>(
    '/minisite/leads',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const leads = await miniSiteService.listLeads(tenantId, request.query.status);
      return reply.status(200).send(leads);
    }
  );

  // Atualizar status do lead
  app.patch<{ Params: { id: string }; Body: { status: 'new' | 'contacted' | 'converted' | 'discarded' } }>(
    '/minisite/leads/:id/status',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const parsed = UpdateMiniSiteLeadStatusSchema.parse(request.body);
      const success = await miniSiteService.updateLeadStatus(tenantId, request.params.id, parsed.status);
      if (!success) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Lead não encontrado nesta oficina.',
        });
      }
      return reply.status(200).send({ success });
    }
  );

  // Atualizar configurações do mini-site
  app.put(
    '/minisite/settings',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const parsed = UpdateMiniSiteSettingsSchema.parse(request.body);
      const success = await miniSiteService.updateMiniSiteSettings(tenantId, parsed);
      return reply.status(200).send({ success });
    }
  );
};
