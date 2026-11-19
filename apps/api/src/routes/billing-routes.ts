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
   * GET /admin/billing/settings — Configurações de Faturamento do Super Admin (Padrão OperaBeauty)
   */
  fastify.get(
    '/admin/billing/settings',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      const settings = await mercadoPagoService.getSettings();
      const host = (request.headers.host || '137.131.151.125:3333').replace(/^https?:\/\//, '');
      const protocol = request.headers['x-forwarded-proto'] || 'http';
      const defaultWebhookUrl = `${protocol}://${host}/billing/webhook`;

      return reply.code(200).send({
        payment_gateway: settings.gateway,
        gateway: settings.gateway,
        environment: settings.sandboxMode ? 'sandbox' : 'production',
        sandbox_mode: settings.sandboxMode,
        sandboxMode: settings.sandboxMode,
        gateway_api_key: settings.accessToken ? '****' + settings.accessToken.slice(-4) : '',
        access_token: settings.accessToken ? '****' + settings.accessToken.slice(-4) : '',
        has_api_key: Boolean(settings.accessToken),
        hasAccessToken: Boolean(settings.accessToken),
        gateway_public_key: settings.publicKey,
        public_key: settings.publicKey,
        publicKey: settings.publicKey,
        webhook_secret: settings.webhookSecret ? '****' + settings.webhookSecret.slice(-4) : '',
        has_webhook_secret: Boolean(settings.webhookSecret),
        hasWebhookSecret: Boolean(settings.webhookSecret),
        pix_key: settings.pixKey,
        pix_key_type: settings.pixKeyType,
        grace_period_days: settings.gracePeriodDays,
        webhook_url: defaultWebhookUrl,
      });
    }
  );

  /**
   * Handler reutilizável para salvar configurações de faturamento
   */
  const handleSaveBillingSettings = async (request: any, reply: any) => {
    const body = request.body || {};
    const gateway = body.payment_gateway || body.gateway || 'mercadopago';
    const sandboxMode =
      body.environment !== undefined
        ? body.environment === 'sandbox'
        : body.sandbox_mode !== undefined
        ? Boolean(body.sandbox_mode)
        : body.sandboxMode !== undefined
        ? Boolean(body.sandboxMode)
        : true;

    const rawToken =
      body.gateway_api_key || body.access_token || body.mercadopago_access_token;
    const rawPublicKey =
      body.gateway_public_key || body.public_key || body.mercadopago_public_key || body.publicKey;
    const rawWebhookSecret =
      body.webhook_secret || body.mercadopago_webhook_secret;

    // Recupera dados atuais para preservar chaves antigas se vierem vazias ou mascaradas
    const currentRes = await query<{
      mercadopago_access_token: string | null;
      mercadopago_webhook_secret: string | null;
    }>(
      'SELECT mercadopago_access_token, mercadopago_webhook_secret FROM platform_billing_settings LIMIT 1'
    );
    const current = currentRes.rows[0];

    let finalAccessToken: string | null = null;
    if (rawToken && !rawToken.startsWith('****')) {
      finalAccessToken = rawToken.trim();
    } else if (current) {
      finalAccessToken = current.mercadopago_access_token;
    }

    let finalWebhookSecret: string | null = null;
    if (rawWebhookSecret && !rawWebhookSecret.startsWith('****')) {
      finalWebhookSecret = rawWebhookSecret.trim();
    } else if (current) {
      finalWebhookSecret = current.mercadopago_webhook_secret;
    }

    const graceDays = Number(body.grace_period_days) || 5;

    // Verificar se existe registro ou precisa inserir
    const checkCount = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM platform_billing_settings');
    if (Number(checkCount.rows[0]?.count || 0) === 0) {
      await query(
        `INSERT INTO platform_billing_settings (
          gateway, mercadopago_access_token, mercadopago_public_key, mercadopago_webhook_secret,
          pix_key, pix_key_type, sandbox_mode, grace_period_days, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          gateway,
          finalAccessToken,
          rawPublicKey ? rawPublicKey.trim() : null,
          finalWebhookSecret,
          body.pix_key ? body.pix_key.trim() : null,
          body.pix_key_type || 'cnpj',
          sandboxMode,
          graceDays,
        ]
      );
    } else {
      await query(
        `UPDATE platform_billing_settings
         SET gateway = $1,
             mercadopago_access_token = $2,
             mercadopago_public_key = $3,
             mercadopago_webhook_secret = $4,
             pix_key = $5,
             pix_key_type = $6,
             sandbox_mode = $7,
             grace_period_days = $8,
             updated_at = NOW()`,
        [
          gateway,
          finalAccessToken,
          rawPublicKey ? rawPublicKey.trim() : null,
          finalWebhookSecret,
          body.pix_key ? body.pix_key.trim() : null,
          body.pix_key_type || 'cnpj',
          sandboxMode,
          graceDays,
        ]
      );
    }

    const updatedSettings = await mercadoPagoService.getSettings();
    return reply.code(200).send({
      success: true,
      message: 'Configurações de cobrança do SaaS salvas com sucesso!',
      has_api_key: Boolean(updatedSettings.accessToken),
      gateway_api_key: updatedSettings.accessToken ? '****' + updatedSettings.accessToken.slice(-4) : '',
    });
  };

  /**
   * POST /admin/billing/settings — Salva Configurações de Faturamento
   */
  fastify.post('/admin/billing/settings', { preHandler: [requireSuperadminAuth] }, handleSaveBillingSettings);

  /**
   * PUT /admin/billing/settings — Atualiza Configurações de Faturamento
   */
  fastify.put('/admin/billing/settings', { preHandler: [requireSuperadminAuth] }, handleSaveBillingSettings);

  /**
   * POST /admin/billing/settings/test-gateway — Valida credenciais com o gateway (Mercado Pago)
   */
  fastify.post(
    '/admin/billing/settings/test-gateway',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      const body = (request.body as any) || {};
      const gateway = body.payment_gateway || body.gateway;
      const token = body.gateway_api_key || body.access_token || body.mercadopago_access_token;

      const result = await mercadoPagoService.testConnection({
        gateway,
        accessToken: token,
      });

      return reply.code(200).send(result);
    }
  );

  /**
   * Alias: POST /admin/billing/test-gateway
   */
  fastify.post(
    '/admin/billing/test-gateway',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      const body = (request.body as any) || {};
      const gateway = body.payment_gateway || body.gateway;
      const token = body.gateway_api_key || body.access_token;

      const result = await mercadoPagoService.testConnection({
        gateway,
        accessToken: token,
      });

      return reply.code(200).send(result);
    }
  );
}
