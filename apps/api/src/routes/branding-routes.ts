import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { brandingService } from '../branding/branding-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { UserRole, type UpdateTenantBrandingDto } from '@carx/shared';

export async function brandingRoutes(fastify: FastifyInstance) {
  /**
   * GET /tenant/branding — Retorna a identidade visual (White Label) da oficina atual
   * Pode ser consumido publicamente para carregar o tema da loja na tela de login/splash
   */
  fastify.get('/tenant/branding', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySlug = (request.query as { slug?: string })?.slug;
    const queryTenantId = (request.query as { tenantId?: string })?.tenantId;

    const targetTenantId = request.tenantId || queryTenantId;
    const targetSlug = request.tenantSlug || querySlug;

    try {
      if (targetTenantId) {
        const branding = await brandingService.getBrandingByTenantId(targetTenantId);
        reply.header('Cache-Control', 'public, max-age=60');
        return reply.code(200).send(branding);
      }

      if (targetSlug) {
        const branding = await brandingService.getBrandingBySlug(targetSlug);
        reply.header('Cache-Control', 'public, max-age=60');
        return reply.code(200).send(branding);
      }

      // Se não há nenhum contexto de loja no host/cabeçalhos, retorna branding padrão CarX
      const defaultBranding = await brandingService.getBrandingByTenantId('00000000-0000-0000-0000-000000000000').catch(() => null);
      reply.header('Cache-Control', 'public, max-age=60');
      return reply.code(200).send(
        defaultBranding || {
          trade_name: 'CarX Automação Automotiva',
          primary_color: '#E63946',
          secondary_color: '#1D3557',
          accent_color: '#457B9D',
          app_title: 'CarX',
          app_short_name: 'CarX',
        }
      );
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      const statusCode = errorObj.statusCode || 500;
      return reply.code(statusCode).send({
        statusCode,
        error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
        message: errorObj.message || 'Falha ao recuperar identidade visual.',
      });
    }
  });

  /**
   * GET /tenant/manifest.json — Retorna dinamicamente o W3C Web App Manifest para PWA
   * Adapta o nome, ícones, theme_color e modo de exibição (tv, staff ou customer)
   */
  fastify.get('/tenant/manifest.json', async (request: FastifyRequest, reply: FastifyReply) => {
    const mode = ((request.query as { mode?: string })?.mode || 'customer') as 'customer' | 'staff' | 'tv';

    try {
      const manifest = await brandingService.generatePwaManifest(
        {
          tenantId: request.tenantId,
          slug: request.tenantSlug,
        },
        mode
      );

      reply.header('Content-Type', 'application/manifest+json; charset=utf-8');
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      return reply.code(200).send(manifest);
    } catch (err: unknown) {
      request.log.error({ err }, 'Erro ao gerar manifest.json');
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Falha ao compilar manifesto PWA dinâmico.',
      });
    }
  });

  /**
   * GET /branding/:slug — Consulta pública direta de branding por slug
   */
  fastify.get('/branding/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    try {
      const branding = await brandingService.getBrandingBySlug(request.params.slug);
      reply.header('Cache-Control', 'public, max-age=300');
      return reply.code(200).send(branding);
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      const statusCode = errorObj.statusCode || 404;
      return reply.code(statusCode).send({
        statusCode,
        error: 'Not Found',
        message: errorObj.message || `Oficina "${request.params.slug}" não encontrada.`,
      });
    }
  });

  /**
   * PUT /tenant/branding — Atualização de identidade visual e cores da oficina
   * Restrito aos papéis OWNER e GESTOR
   */
  fastify.put(
    '/tenant/branding',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.GESTOR),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const body = request.body as UpdateTenantBrandingDto;

      try {
        const updated = await brandingService.updateBranding(tenantId, body, {
          userId: request.user?.userId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string,
        });

        return reply.code(200).send(updated);
      } catch (err: unknown) {
        request.log.error({ err }, 'Falha ao atualizar branding da oficina');
        const errorObj = err as { message?: string };
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: errorObj.message || 'Dados inválidos para atualização de branding.',
        });
      }
    }
  );

  /**
   * PATCH /tenant/branding — Alias para atualização parcial de branding
   */
  fastify.patch(
    '/tenant/branding',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.GESTOR),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const body = request.body as UpdateTenantBrandingDto;

      try {
        const updated = await brandingService.updateBranding(tenantId, body, {
          userId: request.user?.userId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string,
        });

        return reply.code(200).send(updated);
      } catch (err: unknown) {
        request.log.error({ err }, 'Falha ao atualizar branding da oficina');
        const errorObj = err as { message?: string };
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: errorObj.message || 'Dados inválidos para atualização de branding.',
        });
      }
    }
  );
}

export default brandingRoutes;

