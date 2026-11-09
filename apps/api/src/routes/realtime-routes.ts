import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { realtimeHub } from '../realtime/realtime-hub.js';
import { verifyJwt, JwtPayload } from '../auth/jwt.js';
import {
  PublishRealtimeEventSchema,
  UserRole,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export async function realtimeRoutes(app: FastifyInstance) {
  // ============================================================================
  // 1. CANAL SSE (SERVER-SENT EVENTS) EM TEMPO REAL
  // ============================================================================

  // GET /realtime/events — Stream contínuo de eventos do tenant
  app.get<{
    Querystring: {
      token?: string;
    };
  }>(
    '/realtime/events',
    async (request: FastifyRequest<{ Querystring: { token?: string } }>, reply: FastifyReply) => {
      // 1. Resolução do token: suporte tanto a Authorization Bearer quanto query param token (necessário para EventSource nativo do browser)
      let rawToken = '';
      const authHeader = request.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.replace('Bearer ', '').trim();
      } else if (request.query.token) {
        rawToken = request.query.token.trim();
      }

      if (!rawToken) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: 'Token de autenticação não fornecido no cabeçalho ou parâmetro token.',
        });
      }

      let payload: JwtPayload;
      try {
        payload = verifyJwt<JwtPayload>(rawToken);
      } catch (err: any) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: `Token inválido ou expirado: ${err.message}`,
        });
      }

      const tenantId = (payload.tenantId || payload.tenant_id) as string;
      if (!tenantId || typeof tenantId !== 'string') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'FORBIDDEN',
          message: 'Token não possui associação com uma oficina/tenant.',
        });
      }

      const userId = (payload.userId || payload.sub) as string | undefined;

      // 2. Registro da conexão no Hub SSE isolado por tenant
      realtimeHub.registerClient(tenantId, request, reply, userId);

      // Não chama reply.send(), pois a conexão permanece aberta em stream contínuo
    }
  );

  // ============================================================================
  // 2. DISPARO E ESTATÍSTICAS DE TEMPO REAL
  // ============================================================================

  // POST /realtime/publish — Disparo de evento manual pelo gestor
  app.post<{ Body: unknown }>(
    '/realtime/publish',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;

      const parseResult = PublishRealtimeEventSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados do evento em tempo real inválidos.',
          details: parseResult.error.format(),
        });
      }

      const { event, data } = parseResult.data;
      const deliveredCount = realtimeHub.publish(tenantId, event, data);

      return reply.code(200).send({
        success: true,
        deliveredCount,
        event,
        tenantId,
      });
    }
  );

  // GET /realtime/stats — Estatísticas de conexões ativas
  app.get(
    '/realtime/stats',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR]),
      ],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const stats = realtimeHub.getStats(tenantId);
      return reply.code(200).send(stats);
    }
  );
}
