import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
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
import catalogRoutes from './routes/catalog-routes.js';
import customerRoutes from './routes/customer-routes.js';
import vehicleRoutes from './routes/vehicle-routes.js';
import workOrderRoutes from './routes/work-order-routes.js';
import paymentRoutes from './routes/payment-routes.js';
import stockRoutes from './routes/stock-routes.js';
import { appointmentRoutes } from './routes/appointment-routes.js';
import { inspectionRoutes } from './routes/inspection-routes.js';
import { technicianRoutes } from './routes/technician-routes.js';
import { qaRoutes } from './routes/qa-routes.js';
import { npsRoutes } from './routes/nps-routes.js';
import { financialRoutes } from './routes/financial-routes.js';
import { realtimeRoutes } from './routes/realtime-routes.js';
import { customerPortalRoutes } from './routes/customer-portal-routes.js';
import { integrationRoutes } from './routes/integration-routes.js';
import { whatsappRoutes } from './routes/whatsapp-routes.js';
import { billingRoutes } from './routes/billing-routes.js';
import { onboardingRoutes } from './routes/onboarding-routes.js';
import { miniSiteRoutes } from './routes/minisite-routes.js';
import { fiscalRoutes } from './routes/fiscal-routes.js';
import { corporateRoutes } from './routes/corporate-routes.js';
import { aiInspectionRoutes } from './routes/ai-inspection-routes.js';
import { crmRetentionRoutes } from './routes/crm-retention-routes.js';
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

  // Catálogo de Serviços e Checklists dos Tenants (Injeção de Segmento)
  app.register(catalogRoutes);

  // Domínio Automotivo: Clientes e Veículos (T3.1)
  app.register(customerRoutes);
  app.register(vehicleRoutes);

  // Domínio Automotivo: Orçamentos e Ordens de Serviço (T3.3)
  app.register(workOrderRoutes);

  // Domínio Automotivo: Pagamentos, Adiantamentos e Saldos (T3.4)
  app.register(paymentRoutes);

  // Domínio Automotivo: Estoque, Consumo por OS e Bobinas (T3.5)
  app.register(stockRoutes);

  // Domínio Automotivo: Agenda Inteligente por Box e Agendamento Online (T3.6)
  app.register(appointmentRoutes);

  // Domínio Automotivo: Laudo de Inspeção Digital (VCR), Checklist e Fotos (T3.7)
  app.register(inspectionRoutes);

  // Domínio Automotivo: App do Técnico (PWA do Operador) e Cronômetro Oficial (T3.8)
  app.register(technicianRoutes);

  // Domínio Automotivo: Controle de Qualidade (QA), Garantia e Passaporte do Veículo (T3.9)
  app.register(qaRoutes);

  // Domínio Automotivo: Pesquisa NPS, Pós-Venda e Lembretes de Revisão (T3.10)
  app.register(npsRoutes);

  // Domínio Automotivo: Financeiro, Comissões e Relatórios no Servidor (T3.11)
  app.register(financialRoutes);

  // Domínio Automotivo: Barramento de Eventos e Tempo Real SSE (T3.12)
  app.register(realtimeRoutes);

  // Domínio Automotivo: Portal do Cliente Seguro ("Meu Veículo") com Desafio OTP (T3.13)
  app.register(customerPortalRoutes);

  // Integrações: API Pública v1, Chaves de API e Webhooks Reais (T3.14)
  app.register(integrationRoutes);

  // Gateway de WhatsApp Desacoplado Multi-Tenant (T3.17)
  app.register(whatsappRoutes);

  // Cobrança Recorrente Automática do SaaS e Webhooks Mercado Pago (T5.2)
  app.register(billingRoutes);

  // Onboarding Self-Service Guiado por Segmento (T5.3)
  app.register(onboardingRoutes);

  // Mini-Site Institucional da Oficina, Portfólio Antes/Depois e Captação de Leads (T6.9)
  app.register(miniSiteRoutes);

  // Módulo Fiscal: Emissão de NFS-e Automática e Configurações (T6.10)
  app.register(fiscalRoutes);

  // Módulo Corporativo: Painel de Redes e Franquias Multiunidade (T6.12)
  app.register(corporateRoutes);

  // Inteligência Artificial Aplicada a Vistorias & Orçamentos (T6.14)
  app.register(aiInspectionRoutes);

  // CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa (T6.15)
  app.register(crmRetentionRoutes);

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
        "SELECT id FROM tenants WHERE custom_domain = $1 AND status IN ('active', 'trialing') LIMIT 1",
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

if (isDirectExecution) {
  const app = buildServer();
  const PORT = Number(process.env.PORT) || 3333;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info({ msg: `CarX API online`, address, port: PORT });
  });
}
