import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { verifyJwt, JwtPayload } from '../auth/jwt.js';
import { query } from '../database/db.js';

export interface SuperadminJwtPayload extends JwtPayload {
  scope: 'superadmin';
  superadminId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    superadmin?: {
      id: string;
      email: string;
      name: string;
    };
  }
}

/**
 * Middleware para proteger rotas do módulo /admin.
 * Rejeita sumariamente qualquer token que não seja de um Super Admin legítimo,
 * incluindo tokens normais de colaboradores ou donos de lojas (HTTP 401/403).
 */
export const requireSuperadminAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticação do Super Admin não fornecido.',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  let payload: SuperadminJwtPayload;
  try {
    payload = verifyJwt<SuperadminJwtPayload>(token);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token inválido';
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: `Autenticação do Super Admin rejeitada: ${message}.`,
    });
  }

  // Validação estrita de escopo: tokens de lojas ou colaboradores são rejeitados
  if (payload.scope !== 'superadmin' || !payload.isSuperadmin) {
    return reply.code(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a Super Administradores da plataforma CarX.',
    });
  }

  // Validação no banco de dados para revogação imediata ou desativação de conta
  const superadminId = payload.superadminId || payload.sub;
  try {
    const res = await query(
      'SELECT id, name, email, is_active FROM superadmin_users WHERE id = $1 LIMIT 1',
      [superadminId]
    );

    if (res.rows.length === 0 || !res.rows[0].is_active) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Conta de Super Administrador inexistente, revogada ou inativa.',
      });
    }

    request.superadmin = {
      id: res.rows[0].id,
      name: res.rows[0].name,
      email: res.rows[0].email,
    };
    request.isSuperadmin = true;
  } catch (err) {
    request.log.error({ err, superadminId }, 'Erro ao validar superadministrador no banco');
    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Falha interna ao validar autorização de Super Admin.',
    });
  }
};

