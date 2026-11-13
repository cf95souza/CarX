import type { FastifyPluginAsync } from 'fastify';
import {
  fiscalService,
  FiscalConfigError,
  FiscalConflictError,
  FiscalNotFoundError,
  FiscalValidationError,
} from '../fiscal/fiscal-service.js';
import {
  UpdateFiscalSettingsSchema,
  IssueWorkOrderNfseInputSchema,
  CancelNfseInputSchema,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';

export const fiscalRoutes: FastifyPluginAsync = async (app) => {
  // ==============================================================================
  // 1. ROTAS PÚBLICAS (Webhook da prefeitura / provedor fiscal Focus NFe)
  // ==============================================================================

  /**
   * POST /webhooks/fiscal
   * Recepção assíncrona de eventos de autorização ou cancelamento de NFS-e
   */
  app.post('/webhooks/fiscal', async (request, reply) => {
    try {
      const result = await fiscalService.handleFiscalWebhook(request.body);
      return reply.status(200).send({
        received: true,
        handled: result.handled,
        invoiceId: result.invoiceId,
        status: result.status,
      });
    } catch (err: any) {
      app.log.error(err, 'Erro ao processar webhook fiscal');
      // Retorna 200 para evitar que o provedor fique tentando indefinidamente em caso de payload irrelevante
      return reply.status(200).send({ received: true, handled: false, error: err.message });
    }
  });

  // ==============================================================================
  // 2. ROTAS PROTEGIDAS (Gestão Fiscal da Oficina)
  // ==============================================================================

  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticateBearer);
    protectedApp.addHook('onRequest', requireTenantContext);

    const requireFiscalRole = async (request: any, reply: any) => {
      const role = request.user?.role;
      if (!role || !['owner', 'gestor', 'financeiro', 'atendente'].includes(role)) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          code: 'RBAC_FORBIDDEN',
          message: 'Acesso negado: seu perfil não possui permissão para gerenciar o módulo fiscal.',
        });
      }
    };

    /**
     * GET /fiscal/settings
     * Obtém configurações fiscais do tenant
     */
    protectedApp.get('/fiscal/settings', { preHandler: [requireFiscalRole] }, async (request, reply) => {
      const tenantId = (request as any).tenantId;
      const settings = await fiscalService.getFiscalSettings(tenantId);
      return reply.status(200).send(settings);
    });

    /**
     * PUT /fiscal/settings
     * Atualiza dados fiscais e certificado digital A1
     */
    protectedApp.put('/fiscal/settings', { preHandler: [requireFiscalRole] }, async (request, reply) => {
      const tenantId = (request as any).tenantId;
      const parsed = UpdateFiscalSettingsSchema.parse(request.body);
      const updated = await fiscalService.updateFiscalSettings(tenantId, parsed);
      return reply.status(200).send(updated);
    });

    /**
     * GET /work-orders/:id/fiscal-invoice
     * Consulta NFS-e vinculada a uma OS
     */
    protectedApp.get<{ Params: { id: string } }>(
      '/work-orders/:id/fiscal-invoice',
      async (request, reply) => {
        const tenantId = (request as any).tenantId;
        const invoice = await fiscalService.getInvoiceByWorkOrder(tenantId, request.params.id);
        if (!invoice) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Nenhuma nota fiscal emitida para esta Ordem de Serviço.',
          });
        }
        return reply.status(200).send(invoice);
      }
    );

    /**
     * POST /work-orders/:id/issue-nfse
     * Emite NFS-e para a Ordem de Serviço
     */
    protectedApp.post<{ Params: { id: string } }>(
      '/work-orders/:id/issue-nfse',
      async (request, reply) => {
        const tenantId = (request as any).tenantId;
        const parsed = IssueWorkOrderNfseInputSchema.parse(request.body || {});

        try {
          const invoice = await fiscalService.issueWorkOrderNfse(
            tenantId,
            request.params.id,
            parsed
          );
          return reply.status(201).send(invoice);
        } catch (err: any) {
          if (err instanceof FiscalConflictError || err.code === 'FISCAL_INVOICE_CONFLICT') {
            return reply.status(409).send({
              statusCode: 409,
              error: 'Conflict',
              message: err.message,
            });
          }
          if (err instanceof FiscalConfigError || err.code === 'FISCAL_CONFIG_ERROR') {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: err.message,
            });
          }
          if (err instanceof FiscalValidationError || err.code === 'FISCAL_VALIDATION_ERROR') {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: err.message,
            });
          }
          if (err.statusCode === 403 || err.code === 'FEATURE_DISABLED') {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message: err.message,
            });
          }
          throw err;
        }
      }
    );

    /**
     * GET /fiscal/invoices
     * Lista notas fiscais da oficina com filtros e paginação
     */
    protectedApp.get<{
      Querystring: { status?: string; limit?: string; offset?: string };
    }>('/fiscal/invoices', async (request, reply) => {
      const tenantId = (request as any).tenantId;
      const { status, limit, offset } = request.query;

      const result = await fiscalService.listInvoices(tenantId, {
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return reply.status(200).send(result);
    });

    /**
     * POST /fiscal/invoices/:id/cancel
     * Cancela uma NFS-e autorizada
     */
    protectedApp.post<{ Params: { id: string } }>(
      '/fiscal/invoices/:id/cancel',
      async (request, reply) => {
        const tenantId = (request as any).tenantId;
        const parsed = CancelNfseInputSchema.parse(request.body);

        try {
          const cancelled = await fiscalService.cancelNfse(tenantId, request.params.id, parsed);
          return reply.status(200).send(cancelled);
        } catch (err: any) {
          if (err instanceof FiscalNotFoundError || err.code === 'FISCAL_INVOICE_NOT_FOUND') {
            return reply.status(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: err.message,
            });
          }
          if (err instanceof FiscalValidationError || err.code === 'FISCAL_VALIDATION_ERROR') {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: err.message,
            });
          }
          if (err.statusCode === 403 || err.code === 'FEATURE_DISABLED') {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message: err.message,
            });
          }
          throw err;
        }
      }
    );
  });
};

