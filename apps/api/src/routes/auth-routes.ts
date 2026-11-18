import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { authService, AuthError, RegisterUserInput, LoginInput } from '../auth/auth-service.js';
import { verifyJwt, JwtPayload } from '../auth/jwt.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { pool, adminPool } from '../database/db.js';

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

    // CRITÉRIO DE ACEITE T2.9: Token JWT de Super Admin é sumariamente rejeitado no app das lojas
    if (payload.scope === 'superadmin' && !payload.isImpersonation) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tokens administrativos de Super Admin não possuem permissão para acesso direto a rotas de lojas sem impersonação ativa.',
      });
    }

    // CRITÉRIO DE ACEITE T3.13: Token do Portal do Cliente é sumariamente rejeitado em rotas de equipe de loja
    if (payload.scope === 'customer_portal') {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tokens do Portal do Cliente não possuem permissão para acesso a rotas de gestão de oficina.',
      });
    }

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

  /**
   * GET /tenant/members — Lista de colaboradores e técnicos da oficina com métricas reais de QA
   */
  fastify.get('/tenant/members', { preHandler: [authenticateBearer, requireTenantContext] }, async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
    }

    const res = await tenantQuery<{
      id: string;
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      created_at: string;
      work_orders_count: string;
      average_qa_score: string | null;
      qa_audits_count: string;
      qa_approved_rate: string | null;
    }>(
      tenantId,
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        m.role,
        m.is_active,
        u.created_at,
        COUNT(DISTINCT wo.id)::int as work_orders_count,
        ROUND(AVG(qa.score), 1) as average_qa_score,
        COUNT(qa.id)::int as qa_audits_count,
        ROUND(
          COUNT(CASE WHEN qa.status = 'approved' THEN 1 END)::numeric 
          / NULLIF(COUNT(qa.id), 0) * 100
        )::int as qa_approved_rate
      FROM users u
      JOIN memberships m ON m.user_id = u.id
      LEFT JOIN work_orders wo ON wo.tenant_id = $1 AND wo.technician_id = u.id AND wo.status IN ('DELIVERED', 'READY', 'COMPLETED')
      LEFT JOIN qa_audits qa ON qa.tenant_id = $1 AND qa.work_order_id = wo.id
      WHERE m.tenant_id = $1
      GROUP BY u.id, u.name, u.email, m.role, m.is_active, u.created_at
      ORDER BY u.name ASC;
      `,
      [tenantId]
    );

    return reply.code(200).send(res.rows);
  });

  /**
   * PATCH /tenant/members/:id — Atualização cadastral/perfil de colaborador
   */
  fastify.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    '/tenant/members/:id',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params;
      const body = (request.body as Record<string, any>) || {};

      if (body.name || body.nome) {
        await tenantQuery(
          tenantId,
          `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2;`,
          [body.name || body.nome, id]
        );
      }

      if (body.role || body.cargo) {
        const rawRole = String(body.role || body.cargo).toLowerCase().trim();
        const roleMap: Record<string, string> = {
          adm: 'owner',
          admin: 'owner',
          owner: 'owner',
          proprietario: 'owner',
          gestor: 'gestor',
          gerente: 'gestor',
          manager: 'gestor',
          operador: 'tecnico',
          operator: 'tecnico',
          tecnico: 'tecnico',
          'técnico': 'tecnico',
          atendente: 'atendente',
          financeiro: 'financeiro',
        };
        const normalizedRole = roleMap[rawRole] || 'tecnico';
        await tenantQuery(
          tenantId,
          `UPDATE memberships SET role = $1, updated_at = NOW() WHERE tenant_id = $2 AND user_id = $3;`,
          [normalizedRole, tenantId, id]
        );
      }

      if (body.is_active !== undefined || body.status !== undefined) {
        const isActive =
          body.is_active !== undefined
            ? Boolean(body.is_active)
            : typeof body.status === 'boolean'
              ? body.status
              : body.status === 'ativo' || body.status === 'true';
        await tenantQuery(
          tenantId,
          `UPDATE memberships SET is_active = $1, updated_at = NOW() WHERE tenant_id = $2 AND user_id = $3;`,
          [isActive, tenantId, id]
        );
      }

      return reply.code(200).send({ success: true });
    }
  );

  /**
   * POST /tenant/members — Criação de colaborador e vinculação à oficina
   */
  fastify.post<{ Body: { name: string; email: string; password?: string; role?: string } }>(
    '/tenant/members',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { name, email, password, role } = request.body || {};
      if (!name || !email) {
        return reply.code(400).send({ statusCode: 400, message: 'Nome e e-mail são obrigatórios.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const rawPassword = password || 'CarX@' + Math.random().toString(36).slice(-6);
      const hash = await hashPassword(rawPassword);

      const userRes = await adminPool.query('SELECT id FROM users WHERE email = $1 LIMIT 1;', [cleanEmail]);
      let userId: string;
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        const ins = await adminPool.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id;',
          [name.trim(), cleanEmail, hash]
        );
        userId = ins.rows[0].id;
      }

      const rawRole = (role || 'tecnico').toLowerCase().trim();
      const roleMap: Record<string, string> = {
        adm: 'owner',
        admin: 'owner',
        owner: 'owner',
        proprietario: 'owner',
        gestor: 'gestor',
        gerente: 'gestor',
        manager: 'gestor',
        operador: 'tecnico',
        operator: 'tecnico',
        tecnico: 'tecnico',
        'técnico': 'tecnico',
        atendente: 'atendente',
        financeiro: 'financeiro',
      };
      const cleanRole = roleMap[rawRole] || 'tecnico';
      const existingMem = await adminPool.query(
        'SELECT id FROM memberships WHERE tenant_id = $1 AND user_id = $2 LIMIT 1;',
        [tenantId, userId]
      );
      if (existingMem.rows.length > 0) {
        await adminPool.query(
          'UPDATE memberships SET role = $1, is_active = true, updated_at = NOW() WHERE id = $2;',
          [cleanRole, existingMem.rows[0].id]
        );
      } else {
        await adminPool.query(
          'INSERT INTO memberships (tenant_id, user_id, role, is_active) VALUES ($1, $2, $3, true);',
          [tenantId, userId, cleanRole]
        );
      }

      return reply.code(201).send({
        success: true,
        user: { id: userId, name: name.trim(), email: cleanEmail, role: cleanRole },
        temporaryPassword: rawPassword,
      });
    }
  );

  /**
   * POST /tenant/members/:id/reset-password — Redefinição de senha de colaborador da oficina
   */
  fastify.post<{ Params: { id: string }; Body: { newPassword: string } }>(
    '/tenant/members/:id/reset-password',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params;
      const { newPassword } = request.body || {};
      if (!newPassword || newPassword.length < 6) {
        return reply.code(400).send({ statusCode: 400, message: 'A senha deve conter no mínimo 6 caracteres.' });
      }

      const memRes = await pool.query(
        'SELECT user_id FROM memberships WHERE tenant_id = $1 AND user_id = $2;',
        [tenantId, id]
      );
      if (memRes.rows.length === 0) {
        return reply.code(404).send({ statusCode: 404, message: 'Colaborador não encontrado nesta oficina.' });
      }

      const hash = await hashPassword(newPassword);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;', [hash, id]);

      return reply.code(200).send({ success: true, message: 'Senha atualizada com sucesso!' });
    }
  );
}

export default authRoutes;
