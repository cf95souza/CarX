import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { planService, QuotaExceededError, FeatureDisabledError } from '../plans/plan-service.js';

/**
 * Middleware para exigir que uma funcionalidade (Feature Flag) esteja habilitada para a oficina
 */
export function requireFeature(featureName: string): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Superadmin possui acesso irrestrito
    if (request.user?.isSuperadmin) {
      return;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Contexto de tenant é obrigatório para verificar feature flags.',
      });
    }

    try {
      await planService.assertFeature(tenantId, featureName);
    } catch (err) {
      if (err instanceof FeatureDisabledError) {
        return reply.code(err.statusCode).send({
          statusCode: err.statusCode,
          error: err.name,
          code: err.code,
          feature: err.feature,
          message: err.message,
        });
      }
      throw err;
    }
  };
}

/**
 * Middleware para validar que a cota contratada (usuários, unidades) não foi atingida antes de cadastros
 */
export function requireQuota(resource: 'users' | 'units'): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Superadmin possui bypass de cotas
    if (request.user?.isSuperadmin) {
      return;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Contexto de tenant é obrigatório para verificar cotas do plano.',
      });
    }

    try {
      await planService.assertQuota(tenantId, resource);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return reply.code(err.statusCode).send({
          statusCode: err.statusCode,
          error: err.name,
          code: err.code,
          resource: err.resource,
          limit: err.limit,
          current: err.current,
          message: err.message,
        });
      }
      throw err;
    }
  };
}

