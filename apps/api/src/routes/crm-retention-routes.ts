import type { FastifyPluginAsync } from 'fastify';
import { CrmRetentionService } from '../crm/crm-retention-service.js';
import {
  CreateCrmRetentionRuleSchema,
  TriggerRetentionContactInputSchema,
  ConvertRetentionContactInputSchema,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';

export const crmRetentionRoutes: FastifyPluginAsync = async (app) => {
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticateBearer);
    protectedApp.addHook('onRequest', requireTenantContext);

    // 1. Dashboard de Métricas e KPIs de Retenção & Churn
    protectedApp.get('/crm/retention/overview', async (request, reply) => {
      const tenantId = request.tenantId!;
      const overview = await CrmRetentionService.getRetentionOverview(tenantId);
      return reply.send(overview);
    });

    // 2. Revisões Periódicas de Garantia (PPF 6m, Vitrificação 12m, etc.)
    protectedApp.get('/crm/retention/warranty-revisions', async (request, reply) => {
      const tenantId = request.tenantId!;
      const revisions = await CrmRetentionService.listWarrantyRevisions(tenantId);
      return reply.send(revisions);
    });

    // 3. Radar de Clientes Inativos (Anti-Churn >90d, >180d, >365d)
    protectedApp.get('/crm/retention/inactive-customers', async (request, reply) => {
      const tenantId = request.tenantId!;
      const query = request.query as { minDays?: string; tier?: string };
      const minDays = query.minDays ? parseInt(query.minDays, 10) : undefined;
      const tier = query.tier as any;

      const customers = await CrmRetentionService.listInactiveCustomers(tenantId, {
        minDays,
        tier,
      });
      return reply.send(customers);
    });

    // 4. Listar Regras de Retenção Configuradas
    protectedApp.get('/crm/retention/rules', async (request, reply) => {
      const tenantId = request.tenantId!;
      const rules = await CrmRetentionService.listRetentionRules(tenantId);
      return reply.send(rules);
    });

    // 5. Criar Nova Regra de Retenção
    protectedApp.post('/crm/retention/rules', async (request, reply) => {
      const tenantId = request.tenantId!;
      const parseResult = CreateCrmRetentionRuleSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message || 'Dados inválidos para regra de retenção',
        });
      }

      const rule = await CrmRetentionService.createRetentionRule(tenantId, parseResult.data);
      return reply.status(201).send(rule);
    });

    // 6. Disparar Ação de Retenção (Gera Cupom + Link WhatsApp)
    protectedApp.post('/crm/retention/trigger-contact', async (request, reply) => {
      const tenantId = request.tenantId!;
      const userId = (request.user as any)?.sub || (request.user as any)?.id || null;
      const parseResult = TriggerRetentionContactInputSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message || 'Parâmetros de contato inválidos',
        });
      }

      const result = await CrmRetentionService.triggerRetentionContact(
        tenantId,
        userId,
        parseResult.data
      );
      return reply.status(201).send(result);
    });

    // 7. Listar Histórico de Contatos de Retenção
    protectedApp.get('/crm/retention/contacts', async (request, reply) => {
      const tenantId = request.tenantId!;
      const contacts = await CrmRetentionService.listRetentionContacts(tenantId);
      return reply.send(contacts);
    });

    // 8. Converter Contato em Agendamento ou OS
    protectedApp.post('/crm/retention/contacts/:id/convert', async (request, reply) => {
      const tenantId = request.tenantId!;
      const { id } = request.params as { id: string };
      const parseResult = ConvertRetentionContactInputSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message || 'Dados de conversão inválidos',
        });
      }

      const result = await CrmRetentionService.convertRetentionContact(
        tenantId,
        id,
        parseResult.data
      );
      return reply.send(result);
    });
  });
};
