import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RESERVED_SUBDOMAINS } from '@carx/shared';

export function buildServer() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: true,
  });

  // Healthcheck geral da aplicação
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'carx-api',
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * Endpoint de validação para Caddy On-Demand TLS
   * Caddy chama: GET /internal/caddy-check?domain=loja1.carx.com.br
   * Retorna 200 se o domínio for autorizado para emissão de SSL, ou 403 se não for.
   */
  app.get('/internal/caddy-check', async (request, reply) => {
    const { domain } = request.query as { domain?: string };

    if (!domain) {
      return reply.code(400).send({ allowed: false, reason: 'Parâmetro domain ausente' });
    }

    const cleanDomain = domain.toLowerCase().trim();
    const baseDomain = (process.env.BASE_DOMAIN || 'carx.com.br').toLowerCase();

    // 1. Permitir o domínio raiz e subdomínios do ecossistema CarX
    if (cleanDomain === baseDomain || cleanDomain.endsWith(`.${baseDomain}`)) {
      return reply.code(200).send({ allowed: true, domain: cleanDomain });
    }

    // 2. Permitir domínios de homologação e teste local
    if (
      cleanDomain === 'localhost' ||
      cleanDomain.endsWith('.localhost') ||
      cleanDomain.endsWith('.local')
    ) {
      return reply.code(200).send({ allowed: true, domain: cleanDomain });
    }

    // 3. Validação de Domínio Customizado (White-Label)
    // Na Fase 2/3, aqui consultaremos a tabela 'tenants' buscando por custom_domain
    // Por enquanto, bloqueamos domínios desconhecidos para evitar ataques de DoS no Let's Encrypt
    return reply.code(403).send({
      allowed: false,
      reason: 'Domínio não autorizado para emissão de certificado SSL',
    });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const PORT = Number(process.env.PORT) || 3333;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`CarX API running on ${address}`);
  });
}

