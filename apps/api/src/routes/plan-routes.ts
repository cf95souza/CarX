import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { planService } from '../plans/plan-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { UserRole, type PlanSlugType } from '@carx/shared';

interface ToggleFeatureBody {
  feature: string;
  enabled: boolean;
}

interface ChangePlanBody {
  planSlug: PlanSlugType;
}

export async function planRoutes(fastify: FastifyInstance) {
  /**
   * GET /plans — Lista os planos comerciais ativos da plataforma
   */
  fastify.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = await planService.listPlans();
    return reply.code(200).send(plans);
  });

  /**
   * GET /tenant/plan — Retorna o plano da oficina com limites, uso em tempo real e features
   */
  fastify.get(
    '/tenant/plan',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Contexto de tenant é obrigatório.',
        });
      }

      const details = await planService.getTenantPlanDetails(tenantId);
      return reply.code(200).send(details);
    }
  );

  /**
   * PATCH /tenant/features — Liga ou desliga uma Feature Flag específica para a oficina
   * Acesso restrito a OWNER e SUPERADMIN
   */
  fastify.patch<{ Body: ToggleFeatureBody }>(
    '/tenant/features',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.SUPERADMIN),
      ],
    },
    async (request: FastifyRequest<{ Body: ToggleFeatureBody }>, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Contexto de tenant é obrigatório.',
        });
      }

      const { feature, enabled } = request.body || {};
      if (!feature || typeof enabled !== 'boolean') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Os campos "feature" (string) e "enabled" (boolean) são obrigatórios.',
        });
      }

      const updated = await planService.setTenantFeatureFlag(
        tenantId,
        feature,
        enabled,
        request.user?.sub
      );

      return reply.code(200).send({
        success: true,
        feature,
        enabled,
        featureOverrides: updated,
      });
    }
  );

  /**
   * POST /tenant/plan/change — Altera o plano contratado da oficina
   */
  fastify.post<{ Body: ChangePlanBody }>(
    '/tenant/plan/change',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(UserRole.OWNER, UserRole.SUPERADMIN),
      ],
    },
    async (request: FastifyRequest<{ Body: ChangePlanBody }>, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Contexto de tenant é obrigatório.',
        });
      }

      const { planSlug } = request.body || {};
      if (!planSlug) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'O campo "planSlug" é obrigatório.',
        });
      }

      try {
        const newPlan = await planService.assignPlanToTenant(tenantId, planSlug, request.user?.sub);
        return reply.code(200).send({
          success: true,
          plan: newPlan,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao alterar plano';
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message,
        });
      }
    }
  );
}

export default planRoutes;
