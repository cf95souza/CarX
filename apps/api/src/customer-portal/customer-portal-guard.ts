import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJwt, JwtPayload } from '../auth/jwt.js';

export interface CustomerPortalJwtPayload extends JwtPayload {
  customerId: string;
  scope: 'customer_portal';
  name: string;
  phone: string;
  tenantId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    portalCustomer?: CustomerPortalJwtPayload;
  }
}

/**
 * Guard de autenticação para o Portal do Cliente ("Meu Veículo").
 * Exige um JWT válido assinado com scope 'customer_portal' e valida o tenant.
 */
export async function authenticateCustomerPortal(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticação do Portal do Cliente não fornecido.',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const payload = verifyJwt<CustomerPortalJwtPayload>(token);

    if (payload.scope !== 'customer_portal' || (!payload.customerId && !payload.sub)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Acesso negado: token inválido para o Portal do Cliente.',
      });
    }

    const payloadTenantId = (payload.tenant_id || (payload as any).tenantId) as string;

    // Se a requisição veio para um tenant específico via header ou host, valida compatibilidade
    if (request.tenantId && payloadTenantId && request.tenantId !== payloadTenantId) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Token pertence a outra oficina/loja.',
      });
    }

    // Vincula o tenantId do token à requisição se ainda não estiver definido
    if (!request.tenantId && payloadTenantId) {
      request.tenantId = payloadTenantId;
    }

    request.portalCustomer = {
      ...payload,
      tenantId: payloadTenantId,
      customerId: payload.customerId || payload.sub,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token inválido';
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: `Autenticação do portal rejeitada: ${message}.`,
    });
  }
}
