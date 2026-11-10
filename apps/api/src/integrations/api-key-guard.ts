import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from './api-key-service.js';

export function createApiKeyGuard(requiredScopes: string[] = []) {
  return async function apiKeyGuard(request: FastifyRequest, reply: FastifyReply) {
    let token: string | undefined;

    const xApiKey = request.headers['x-api-key'];
    if (typeof xApiKey === 'string' && xApiKey.trim()) {
      token = xApiKey.trim();
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const potentialToken = authHeader.substring(7).trim();
        if (potentialToken.startsWith('carx_live_')) {
          token = potentialToken;
        }
      }
    }

    if (!token) {
      return reply.status(401).send({
        error: 'AUTHENTICATION_REQUIRED',
        message:
          "Chave de API pública não fornecida. Envie o cabeçalho 'X-API-Key: carx_live_...' ou 'Authorization: Bearer carx_live_...'.",
      });
    }

    const auth = await ApiKeyService.authenticateKey(token);

    if (!auth.authenticated || !auth.apiKey || !auth.tenantId) {
      if (auth.statusCode === 429) {
        reply.header('X-RateLimit-Limit', auth.limit ?? 60);
        reply.header('X-RateLimit-Remaining', 0);
        reply.header('X-RateLimit-Reset', auth.resetInSeconds ?? 60);
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requisições excedido para esta chave de API. Aguarde o reset da janela.',
          resetInSeconds: auth.resetInSeconds,
        });
      }

      return reply.status(auth.statusCode || 401).send({
        error: 'INVALID_API_KEY',
        message: auth.error || 'Chave de API inválida, expirada ou revogada.',
      });
    }

    // Definir headers informativos de Rate Limit
    reply.header('X-RateLimit-Limit', auth.limit ?? 60);
    reply.header('X-RateLimit-Remaining', auth.remaining ?? 60);
    reply.header('X-RateLimit-Reset', auth.resetInSeconds ?? 60);

    // Validação de Escopos
    if (requiredScopes.length > 0) {
      const keyScopes = auth.apiKey.permissions || [];
      const hasWildcard = keyScopes.includes('*');
      const hasAllRequired = requiredScopes.every((scope) => keyScopes.includes(scope));

      if (!hasWildcard && !hasAllRequired) {
        return reply.status(403).send({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `Esta chave de API não possui as permissões necessárias: ${requiredScopes.join(', ')}`,
          requiredScopes,
          grantedScopes: keyScopes,
        });
      }
    }

    // Injetar contexto para uso nas rotas e isolamento RLS
    (request as any).tenantId = auth.tenantId;
    (request as any).apiKey = auth.apiKey;
  };
}

