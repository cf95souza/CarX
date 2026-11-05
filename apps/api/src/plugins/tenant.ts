import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import pg from 'pg';
import { query } from '../database/db.js';
import { tenantQuery, tenantTransaction, TenantQueryOptions } from '../database/tenant-query.js';
import { RESERVED_SUBDOMAINS } from '@carx/shared';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string | null;
    tenantSlug: string | null;
    isSuperadmin: boolean;
    tenantQuery: <T extends pg.QueryResultRow = pg.QueryResultRow>(
      sqlText: string,
      params?: unknown[],
      options?: Partial<TenantQueryOptions>
    ) => Promise<pg.QueryResult<T>>;
    tenantTransaction: <T>(
      callback: (client: pg.PoolClient) => Promise<T>,
      options?: Partial<TenantQueryOptions>
    ) => Promise<T>;
  }
}

interface TenantRow {
  id: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled' | 'trialing';
}

/**
 * Extrai o slug do tenant a partir do host (ex: loja.carx.com.br -> loja)
 */
export function extractTenantSlugFromHost(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;

  const cleanHost = hostHeader.split(':')[0].toLowerCase().trim();
  const baseDomain = (process.env.BASE_DOMAIN || 'carx.com.br').toLowerCase().trim();

  if (cleanHost.endsWith(`.${baseDomain}`)) {
    const sub = cleanHost.replace(`.${baseDomain}`, '');
    const firstPart = sub.split('.')[0];
    if (firstPart && !(RESERVED_SUBDOMAINS as readonly string[]).includes(firstPart)) {
      return firstPart;
    }
  }

  // Suporte a subdomínios locais no desenvolvimento (ex: oficina1.carx.local)
  if (cleanHost.endsWith('.carx.local') || cleanHost.endsWith('.localhost')) {
    const parts = cleanHost.split('.');
    if (parts.length >= 2 && !(RESERVED_SUBDOMAINS as readonly string[]).includes(parts[0])) {
      return parts[0];
    }
  }

  return null;
}

export const tenantPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decora a requisição com valores padrão
  fastify.decorateRequest('tenantId', null);
  fastify.decorateRequest('tenantSlug', null);
  fastify.decorateRequest('isSuperadmin', false);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Verificar se é superadmin via header interno ou flag do token
    const isSuperadminHeader = request.headers['x-is-superadmin'] === 'true';
    request.isSuperadmin = isSuperadminHeader;

    // 2. Extrair tenant por header direto, subdomínio ou slug
    let rawTenantId = (request.headers['x-tenant-id'] as string) || null;
    let rawTenantSlug = (request.headers['x-tenant-slug'] as string) || null;

    if (!rawTenantSlug) {
      const forwardedHost = (request.headers['x-tenant-host'] as string) || request.headers.host;
      rawTenantSlug = extractTenantSlugFromHost(forwardedHost);
    }

    // 3. Se temos o slug mas não o ID, resolver ID no banco
    if (!rawTenantId && rawTenantSlug) {
      try {
        const res = await tenantQuery<TenantRow>(
          null,
          'SELECT id, slug, status FROM tenants WHERE slug = $1 LIMIT 1',
          [rawTenantSlug],
          { bypassRls: true }
        );

        if (res.rows.length > 0) {
          const tenant = res.rows[0];

          if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
            return reply.code(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message: `Acesso bloqueado: oficina ${tenant.slug} está com status "${tenant.status}".`,
            });
          }

          rawTenantId = tenant.id;
        }
      } catch (err) {
        request.log.error({ err, rawTenantSlug }, 'Falha ao resolver tenant por slug');
      }
    }

    // 3.1 Se ainda não temos tenantId/slug, verificar se o host corresponde a um custom_domain de oficina
    if (!rawTenantId && !rawTenantSlug) {
      const forwardedHost = (request.headers['x-tenant-host'] as string) || request.headers.host;
      if (forwardedHost) {
        const cleanHost = forwardedHost.split(':')[0].toLowerCase().trim();
        if (cleanHost && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1') {
          try {
            const customDomainRes = await tenantQuery<TenantRow>(
              null,
              'SELECT id, slug, status FROM tenants WHERE custom_domain = $1 LIMIT 1',
              [cleanHost],
              { bypassRls: true }
            );

            if (customDomainRes.rows.length > 0) {
              const tenant = customDomainRes.rows[0];

              if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
                return reply.code(403).send({
                  statusCode: 403,
                  error: 'Forbidden',
                  message: `Acesso bloqueado: oficina ${tenant.slug} está com status "${tenant.status}".`,
                });
              }

              rawTenantId = tenant.id;
              rawTenantSlug = tenant.slug;
            }
          } catch (err) {
            request.log.error({ err, cleanHost }, 'Falha ao resolver tenant por custom_domain');
          }
        }
      }
    }

    request.tenantId = rawTenantId;
    request.tenantSlug = rawTenantSlug;

    // Decoradores vinculados ao tenant da requisição
    request.tenantQuery = <T extends pg.QueryResultRow = pg.QueryResultRow>(
      sqlText: string,
      params: unknown[] = [],
      options: Partial<TenantQueryOptions> = {}
    ) => {
      return tenantQuery<T>(request.tenantId, sqlText, params, {
        isSuperadmin: request.isSuperadmin,
        ...options,
      });
    };

    request.tenantTransaction = <T>(
      callback: (client: pg.PoolClient) => Promise<T>,
      options: Partial<TenantQueryOptions> = {}
    ) => {
      return tenantTransaction<T>(request.tenantId, callback, {
        isSuperadmin: request.isSuperadmin,
        ...options,
      });
    };
  });
};

// Evita o encapsulamento de escopo do Fastify para propagar decorators
(tenantPlugin as unknown as Record<symbol, unknown>)[Symbol.for('skip-override')] = true;

/**
 * Hook utilitário para rotas que exigem estritamente um contexto de tenant ativo
 */
export async function requireTenantContext(request: FastifyRequest, reply: FastifyReply) {
  if (!request.isSuperadmin && !request.tenantId) {
    return reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Esta rota exige a identificação do tenant (via subdomínio ou cabeçalho X-Tenant-ID).',
    });
  }
}

export default tenantPlugin;
