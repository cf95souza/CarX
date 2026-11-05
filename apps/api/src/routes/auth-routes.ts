import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { authService, AuthError, RegisterUserInput, LoginInput } from '../auth/auth-service.js';
import { verifyJwt, JwtPayload } from '../auth/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Hook para autenticação de rotas protegidas via Bearer Token
 */
export const authenticateBearer: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticação não fornecido no cabeçalho Authorization.',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const payload = verifyJwt<JwtPayload>(token);
    request.user = payload;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token inválido';
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: `Autenticação rejeitada: ${message}.`,
    });
  }
};

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register — Cadastro de novo usuário
   */
  fastify.post<{ Body: RegisterUserInput }>('/auth/register', async (request, reply) => {
    try {
      const result = await authService.register(request.body);
      return reply.code(201).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/login — Login com credenciais
   */
  fastify.post<{ Body: LoginInput }>('/auth/login', async (request, reply) => {
    try {
      const ip = request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';
      const userAgent = request.headers['user-agent'];
      const result = await authService.login({
        ...request.body,
        ip,
        userAgent,
      });
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/2fa/verify — Validação do código TOTP
   */
  fastify.post<{ Body: { tempToken: string; code: string } }>('/auth/2fa/verify', async (request, reply) => {
    const { tempToken, code } = request.body || {};
    try {
      const ip = request.ip || 'unknown';
      const result = await authService.verify2fa(tempToken, code, ip);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/2fa/setup — Iniciar configuração de 2FA
   */
  fastify.post('/auth/2fa/setup', { preHandler: [authenticateBearer] }, async (request, reply) => {
    try {
      const userId = request.user!.sub;
      const result = await authService.setup2fa(userId);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/2fa/enable — Ativar 2FA após teste do código
   */
  fastify.post('/auth/2fa/enable', { preHandler: [authenticateBearer] }, async (request, reply) => {
    try {
      const userId = request.user!.sub;
      const { code } = (request.body as { code?: string }) || {};
      const result = await authService.enable2fa(userId, code || '');
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/2fa/disable — Desativar 2FA
   */
  fastify.post('/auth/2fa/disable', { preHandler: [authenticateBearer] }, async (request, reply) => {
    try {
      const userId = request.user!.sub;
      const { code } = (request.body as { code?: string }) || {};
      const result = await authService.disable2fa(userId, code || '');
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/refresh — Rotação de Refresh Token com Family ID
   */
  fastify.post<{ Body: { refreshToken: string } }>('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body || {};
      const tokens = await authService.rotateRefreshToken(refreshToken);
      return reply.code(200).send(tokens);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/logout — Logout e revogação de sessão
   */
  fastify.post<{ Body: { refreshToken?: string } }>('/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body || {};
    const result = await authService.logout(refreshToken);
    return reply.code(200).send(result);
  });

  /**
   * POST /auth/forgot-password — Solicitar redefinição de senha
   */
  fastify.post<{ Body: { email: string } }>('/auth/forgot-password', async (request, reply) => {
    const { email } = request.body || {};
    const result = await authService.requestPasswordReset(email);
    return reply.code(200).send(result);
  });

  /**
   * POST /auth/reset-password — Confirmar redefinição de senha
   */
  fastify.post<{ Body: { token: string; newPassword: string } }>('/auth/reset-password', async (request, reply) => {
    try {
      const { token, newPassword } = request.body || {};
      const result = await authService.resetPassword(token, newPassword);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * GET /auth/me — Perfil e contexto do usuário logado
   */
  fastify.get('/auth/me', { preHandler: [authenticateBearer] }, async (request, reply) => {
    return reply.code(200).send({
      user: request.user,
    });
  });
}

export default authRoutes;
