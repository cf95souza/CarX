import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RESERVED_SUBDOMAINS } from '@carx/shared';
import { loggerConfig, generateRequestId } from './observability/logger.js';
import { initSentry, registerSentryErrorHandler } from './observability/sentry.js';
import { registerMetricsHooks, getPrometheusMetrics, getJsonMetrics } from './observability/metrics.js';
import { registerHealthRoutes } from './observability/health.js';
import tenantPlugin from './plugins/tenant.js';
import authRoutes from './routes/auth-routes.js';
import auditRoutes from './routes/audit-routes.js';
import planRoutes from './routes/plan-routes.js';
import multipart from '@fastify/multipart';
import brandingRoutes from './routes/branding-routes.js';
import storageRoutes from './routes/storage-routes.js';
import superadminRoutes from './routes/superadmin-routes.js';
import { tenantQuery } from './database/tenant-query.js';

export function buildServer() {
  // Inicialização opcional do Sentry/GlitchTip
  initSentry();

  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : loggerConfig,
    genReqId: generateRequestId,
    requestIdHeader: 'x-request-id',
    disableRequestLogging: false,
  });

  // Handler de Erros com captura estruturada e integração com Sentry/GlitchTip
  registerSentryErrorHandler(app);

  // Coleta de métricas leves de requisições e latência
  registerMetricsHooks(app);

  app.register(cors, {
    origin: true,
  });

  // Plugin de Isolamento e Resolução de Contexto Multi-Tenant
  app.register(tenantPlugin);

  // Rotas de Autenticação, 2FA e Sessões
  app.register(authRoutes);

  // Trilha de Auditoria Imutável
  app.register(auditRoutes);

  // Gestão de Planos, Limites e Feature Flags
  app.register(planRoutes);

  // Subdomínio por Loja e Identidade Visual White Label
  app.register(brandingRoutes);

  // Upload e Armazenamento de Arquivos com MinIO (Compatível S3)
  app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });
  app.register(storageRoutes);

  // Módulo Super Admin (Dono do SaaS)
  app.register(superadminRoutes);

  // Endpoints de Saúde: Liveness (/health) e Readiness (/health/ready)
  registerHealthRoutes(app);

  /**
   * Endpoint de Métricas (/metrics)
   * Suporta padrão Prometheus OpenMetrics e JSON estruturado
   */
  app.get('/metrics', async (request, reply) => {
    const accept = request.headers['accept'] || '';
    const { format } = request.query as { format?: string };

    if (format === 'json' || accept.includes('application/json')) {
      return reply.code(200).type('application/json').send(getJsonMetrics());
    }

    return reply
      .code(200)
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(getPrometheusMetrics());
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
    try {
      const customDomainRes = await tenantQuery<{ id: string }>(
        null,
        "SELECT id FROM tenants WHERE custom_domain = $1 AND status = 'active' LIMIT 1",
        [cleanDomain],
        { bypassRls: true }
      );

      if (customDomainRes.rows.length > 0) {
        return reply.code(200).send({ allowed: true, domain: cleanDomain, customDomain: true });
      }
    } catch (err) {
      app.log.error({ err, cleanDomain }, 'Erro ao consultar custom_domain no banco');
    }

    // Bloqueia domínios desconhecidos para evitar abuso no Let''s Encrypt
    return reply.code(403).send({
      allowed: false,
      reason: 'Domínio não autorizado para emissão de certificado SSL',
    });
  });

  return app;
}

const isDirectExecution = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')) &&
  !process.env.NODE_TEST_CONTEXT &&
  !process.argv.includes('--test')
);

if (process.env.NODE_ENV !== 'test' && isDirectExecution) {
  const app = buildServer();
  const PORT = Number(process.env.PORT) || 3000;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info({ msg: `CarX API online`, address, port: PORT });
  });
}
