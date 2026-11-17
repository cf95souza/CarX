import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mercadoPagoService, MercadoPagoWebhookPayload } from '../billing/mercadopago-service.js';
import { adminPool, query } from '../database/db.js';
import { requireSuperadminAuth } from '../middlewares/superadmin-guards.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { planService } from '../plans/plan-service.js';

export async function billingRoutes(fastify: FastifyInstance) {
  /**
   * GET /tenant/billing/status — Status de faturamento, assinatura, carência e faturas do tenant
   */
  fastify.get(
    '/tenant/billing/status',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de tenant é obrigatório.' });
      }

      // 1. Dados cadastrais e operacionais do tenant
      const tenantRes = await adminPool.query<{
        id: string;
        name: string;
        slug: string;
        status: string;
        is_read_only: boolean;
        suspended_reason: string | null;
        created_at: string;
      }>(
        `SELECT id, trade_name AS name, slug, status, is_read_only, suspended_reason, created_at
         FROM tenants
         WHERE id = $1
         LIMIT 1`,
        [tenantId]
      );

      if (tenantRes.rows.length === 0) {
        return reply.code(404).send({ statusCode: 404, message: 'Oficina não encontrada.' });
      }

      const tenant = tenantRes.rows[0];

      // 2. Detalhes de plano e quotas via planService
      const planDetails = await planService.getTenantPlanDetails(tenantId);

      // 3. Contrato da oficina
      const contractRes = await adminPool.query<{
        id: string;
        plan_id: string;
        status: string;
        billing_cycle: string;
        starts_at: string;
        expires_at: string | null;
      }>(
        `SELECT id, plan_id, status, billing_cycle, starts_at, expires_at
         FROM contracts
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      );

      const contract = contractRes.rows[0] || null;
      let daysRemaining = 0;
      if (contract?.expires_at) {
        const exp = new Date(contract.expires_at).getTime();
        const now = Date.now();
        daysRemaining = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
      }

      // 4. Faturas ativas (pendentes ou vencidas)
      const activeInvoicesRes = await adminPool.query<{
        id: string;
        amount_cents: number;
        status: string;
        due_date: string;
        pix_code: string | null;
        pix_qr: string | null;
        gateway_transaction_id: string | null;
        gateway_invoice_url: string | null;
        expires_at: string | null;
      }>(
        `SELECT id, amount_cents, status, due_date::text, pix_code, pix_qr, gateway_transaction_id, gateway_invoice_url, expires_at
         FROM invoices
         WHERE tenant_id = $1 AND status = 'pending'
         ORDER BY due_date ASC`,
        [tenantId]
      );

      let activeInvoices = activeInvoicesRes.rows;

      // Se houver fatura ativa sem PIX gerado, gera em tempo real
      for (let i = 0; i < activeInvoices.length; i++) {
        const inv = activeInvoices[i];
        if (!inv.pix_code) {
          try {
            const charge = await mercadoPagoService.generateInvoicePixCharge({
              invoiceId: inv.id,
              amountCents: inv.amount_cents,
              tenantId: tenant.id,
              tenantSlug: tenant.slug,
              tenantName: tenant.name,
            });
            activeInvoices[i] = {
              ...inv,
              pix_code: charge.pix_code,
              pix_qr: charge.pix_qr,
              gateway_transaction_id: charge.gateway_transaction_id,
              gateway_invoice_url: charge.gateway_invoice_url || null,
            };
          } catch (e) {
            // Silencioso se der falha transitória
          }
        }
      }

      // Se a loja não tiver nenhuma fatura ativa e o contrato estiver vencendo ou sem faturas pendentes,
      // garantir que exista uma fatura gerada para permitir a quitação
      if (activeInvoices.length === 0 && (tenant.status === 'suspended' || tenant.is_read_only || daysRemaining <= 7)) {
        try {
          const planPriceCents = planDetails.plan.price_cents || 14990;
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + 3);
          const dueDateStr = newDueDate.toISOString().split('T')[0];

          const insInv = await adminPool.query<{ id: string }>(
            `INSERT INTO invoices (tenant_id, subscription_id, amount_cents, due_date, status, payment_method)
             VALUES ($1, $2, $3, $4::date, 'pending', 'pix')
             RETURNING id`,
            [tenant.id, contract?.id || null, planPriceCents, dueDateStr]
          );

          if (insInv.rows.length > 0) {
            const newId = insInv.rows[0].id;
            const charge = await mercadoPagoService.generateInvoicePixCharge({
              invoiceId: newId,
              amountCents: planPriceCents,
              tenantId: tenant.id,
              tenantSlug: tenant.slug,
              tenantName: tenant.name,
            });

            activeInvoices = [{
              id: newId,
              amount_cents: planPriceCents,
              status: 'pending',
              due_date: dueDateStr,
              pix_code: charge.pix_code,
              pix_qr: charge.pix_qr,
              gateway_transaction_id: charge.gateway_transaction_id,
              gateway_invoice_url: charge.gateway_invoice_url || null,
              expires_at: charge.expires_at,
            }];
          }
        } catch (e) {
          // Fallback silencioso
        }
      }

      // 5. Histórico de faturas pagas
      const historyRes = await adminPool.query<{
        id: string;
        amount_cents: number;
        status: string;
        due_date: string;
        paid_at: string | null;
        payment_method: string;
      }>(
        `SELECT id, amount_cents, status, due_date::text, paid_at, payment_method
         FROM invoices
         WHERE tenant_id = $1 AND status = 'paid'
         ORDER BY paid_at DESC NULLS LAST, due_date DESC
         LIMIT 12`,
        [tenantId]
      );

      // 6. Cálculo de Carência e Atraso (Padrão OperaBeauty: 5 dias de tolerância)
      let daysOverdue = 0;
      let isGracePeriod = false;
      let remainingGraceDays = 5;

      const oldestPending = activeInvoices[0];
      if (oldestPending) {
        const due = new Date(oldestPending.due_date).getTime();
        const now = Date.now();
        if (now > due) {
          daysOverdue = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 0 && daysOverdue <= 5) {
            isGracePeriod = true;
            remainingGraceDays = Math.max(0, 5 - daysOverdue);
          }
        }
      }

      const isBlocked = Boolean(tenant.is_read_only) || daysOverdue > 5 || tenant.status === 'suspended';

      // 7. Configurações de Sandbox
      const settings = await mercadoPagoService.getSettings();

      return reply.code(200).send({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          is_read_only: tenant.is_read_only,
          suspended_reason: tenant.suspended_reason,
        },
        plan: {
          id: planDetails.plan.id,
          name: planDetails.plan.name,
          slug: planDetails.plan.slug,
          priceCents: planDetails.plan.price_cents,
          billingCycle: contract?.billing_cycle || 'monthly',
          limits: planDetails.effectiveLimits,
          features: planDetails.activeFeatures,
          usage: planDetails.usage,
        },
        contract: contract ? {
          id: contract.id,
          status: contract.status,
          starts_at: contract.starts_at,
          expires_at: contract.expires_at,
          days_remaining: daysRemaining,
        } : null,
        is_grace_period: isGracePeriod,
        remaining_grace_days: remainingGraceDays,
        days_overdue: daysOverdue,
        is_blocked: isBlocked,
        active_invoices: activeInvoices,
        history: historyRes.rows,
        is_sandbox: Boolean(settings.sandboxMode),
      });
    }
  );

  /**
   * GET /tenant/billing/invoices — Lista todas as faturas da oficina autenticada
   */
  fastify.get(
    '/tenant/billing/invoices',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de tenant é obrigatório.' });
      }

      const res = await adminPool.query<{
        id: string;
        amount_cents: number;
        status: string;
        due_date: string;
        paid_at: string | null;
        payment_method: string;
        pix_code: string | null;
        pix_qr: string | null;
        gateway_transaction_id: string | null;
        created_at: string;
      }>(
        `SELECT id, amount_cents, status, due_date::text, paid_at, payment_method, pix_code, pix_qr, gateway_transaction_id, created_at
         FROM invoices
         WHERE tenant_id = $1
         ORDER BY due_date DESC`,
        [tenantId]
      );

      return reply.code(200).send(res.rows);
    }
  );

  /**
   * POST /billing/invoices/:id/simulate-payment — Simula pagamento instantâneo via PIX em Sandbox (Padrão OperaBeauty)
   */
  fastify.post<{ Params: { id: string } }>(
    '/billing/invoices/:id/simulate-payment',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.tenantId;

      const invRes = await adminPool.query<{
        id: string;
        tenant_id: string;
        status: string;
      }>(
        'SELECT id, tenant_id, status FROM invoices WHERE id = $1 LIMIT 1',
        [id]
      );

      if (invRes.rows.length === 0) {
        return reply.code(404).send({ statusCode: 404, message: `Fatura "${id}" não encontrada.` });
      }

      const inv = invRes.rows[0];

      if (tenantId && inv.tenant_id !== tenantId && !request.isSuperadmin) {
        return reply.code(403).send({ statusCode: 403, message: 'Acesso não autorizado a esta fatura.' });
      }

      if (inv.status === 'paid') {
        return reply.code(200).send({ success: true, message: 'Esta fatura já consta como paga.' });
      }

      const simPaymentId = `mp_sim_${String(inv.id).replace(/-/g, '').slice(0, 16)}_${Date.now()}`;

      const settlement = await mercadoPagoService.settleInvoicePayment({
        paymentId: simPaymentId,
        externalReference: inv.id,
        paymentMethod: 'pix',
      });

      return reply.code(200).send({
        success: true,
        message: 'Pagamento simulado compensado com sucesso! Licença CarX ativada e oficina regularizada.',
        settlement,
      });
    }
  );

  /**
   * POST /billing/invoices/:id/refresh-pix — Atualiza QR Code PIX da fatura
   */
  fastify.post<{ Params: { id: string } }>(
    '/billing/invoices/:id/refresh-pix',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.tenantId;

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

      if (tenantId && inv.tenant_id !== tenantId && !request.isSuperadmin) {
        return reply.code(403).send({ statusCode: 403, message: 'Acesso não autorizado a esta fatura.' });
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
        invoice: {
          id: inv.id,
          amount_cents: inv.amount_cents,
          status: inv.status,
          pix_code: charge.pix_code,
          pix_qr: charge.pix_qr,
          gateway_transaction_id: charge.gateway_transaction_id,
          gateway_invoice_url: charge.gateway_invoice_url || null,
          expires_at: charge.expires_at,
        },
      });
    }
  );

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
