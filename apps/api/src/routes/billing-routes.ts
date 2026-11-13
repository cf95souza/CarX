import { FastifyInstance } from 'fastify';
import { mercadoPagoService, MercadoPagoWebhookPayload } from '../billing/mercadopago-service.js';
import { adminPool, query } from '../database/db.js';
import { requireSuperadminAuth } from '../middlewares/superadmin-guards.js';

export async function billingRoutes(fastify: FastifyInstance) {
  /**
   * POST /billing/invoices/:id/pix — Gera cobrança PIX oficial no Mercado Pago para a fatura
   */
  fastify.post<{ Params: { id: string } }>(
    '/billing/invoices/:id/pix',
    async (request, reply) => {
      const { id } = request.params;

      const invRes = await adminPool.query<{
        id: string;
        tenant_id: string;
        amount_cents: number;
        status: string;
        tenant_slug: string;
        tenant_name: string;
      }>(
        `SELECT i.id, i.tenant_id, i.amount_cents, i.status, t.slug as tenant_slug, t.trade_name as tenant_name
         FROM invoices i
         JOIN tenants t ON t.id = i.tenant_id
         WHERE i.id = $1
         LIMIT 1`,
        [id]
      );

      if (invRes.rows.length === 0) {
        return reply.code(404).send({ statusCode: 404, message: `Fatura "${id}" não encontrada.` });
      }

      const inv = invRes.rows[0];

      if (inv.status === 'paid') {
        return reply.code(400).send({ statusCode: 400, message: 'Esta fatura já consta como paga.' });
      }

      const charge = await mercadoPagoService.generateInvoicePixCharge({
        invoiceId: inv.id,
        amountCents: inv.amount_cents,
        tenantId: inv.tenant_id,
        tenantSlug: inv.tenant_slug,
        tenantName: inv.tenant_name,
      });

      return reply.code(200).send({
        success: true,
        invoiceId: inv.id,
        ...charge,
      });
    }
  );

  /**
   * POST /billing/webhook/mercadopago — Webhook oficial para liquidação automática e reativação da loja
   */
  fastify.post<{ Body: MercadoPagoWebhookPayload; Querystring: Record<string, string> }>(
    '/billing/webhook/mercadopago',
    async (request, reply) => {
      try {
        const payload = request.body || {};
        const queryParams = (request.query as Record<string, string>) || {};

        request.log.info({ payload, query: queryParams }, 'Webhook Mercado Pago recebido');

        const result = await mercadoPagoService.processWebhook(payload, queryParams);
        return reply.code(200).send(result);
      } catch (err: any) {
        request.log.error(err, 'Erro ao processar webhook do Mercado Pago');
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /billing/webhook — Alias genérico para gateway
   */
  fastify.post<{ Body: MercadoPagoWebhookPayload; Querystring: Record<string, string> }>(
    '/billing/webhook',
    async (request, reply) => {
      try {
        const payload = request.body || {};
        const queryParams = (request.query as Record<string, string>) || {};
        const result = await mercadoPagoService.processWebhook(payload, queryParams);
        return reply.code(200).send(result);
      } catch (err: any) {
        request.log.error(err, 'Erro no webhook genérico de faturamento');
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /admin/billing/settings — Configurações de Faturamento do Super Admin
   */
  fastify.get(
    '/admin/billing/settings',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      const settings = await mercadoPagoService.getSettings();
      return reply.code(200).send({
        gateway: settings.gateway,
        hasAccessToken: Boolean(settings.accessToken),
        publicKey: settings.publicKey,
        hasWebhookSecret: Boolean(settings.webhookSecret),
        sandboxMode: settings.sandboxMode,
      });
    }
  );

  /**
   * PUT /admin/billing/settings — Atualiza Configurações de Faturamento do Super Admin
   */
  fastify.put<{
    Body: {
      gateway?: string;
      mercadopago_access_token?: string;
      mercadopago_public_key?: string;
      mercadopago_webhook_secret?: string;
      sandbox_mode?: boolean;
    };
  }>(
    '/admin/billing/settings',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      const body = request.body;

      await query(
        `UPDATE platform_billing_settings
         SET gateway = COALESCE($1, gateway),
             mercadopago_access_token = COALESCE($2, mercadopago_access_token),
             mercadopago_public_key = COALESCE($3, mercadopago_public_key),
             mercadopago_webhook_secret = COALESCE($4, mercadopago_webhook_secret),
             sandbox_mode = COALESCE($5, sandbox_mode),
             updated_at = NOW()`,
        [
          body.gateway || null,
          body.mercadopago_access_token || null,
          body.mercadopago_public_key || null,
          body.mercadopago_webhook_secret || null,
          body.sandbox_mode ?? null,
        ]
      );

      return reply.code(200).send({ success: true, message: 'Configurações de faturamento salvas com sucesso!' });
    }
  );
}
