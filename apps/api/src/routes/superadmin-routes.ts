import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { superadminService, SuperadminError } from '../superadmin/superadmin-service.js';
import { dunningService, PayInvoiceInput, CreateInvoiceInput } from '../billing/dunning-service.js';
import { planService } from '../plans/plan-service.js';
import { couponService, CouponError } from '../coupons/coupon-service.js';
import { whatsappService } from '../whatsapp/whatsapp-service.js';
import { requireSuperadminAuth } from '../middlewares/superadmin-guards.js';
import {
  SuperadminLoginInput,
  AdminCreateTenantDto,
  AdminUpdateTenantStatusDto,
  ImpersonateTenantDto,
  ConvertLeadDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreateCouponDto,
  ValidateCouponInputDto,
  ResetOwnerPasswordInputDto,
} from '@carx/shared';

export async function superadminRoutes(fastify: FastifyInstance) {
  /**
   * POST /admin/auth/login — Autenticação do Super Administrador
   */
  fastify.post<{ Body: SuperadminLoginInput }>('/admin/auth/login', async (request, reply) => {
    try {
      const ip = request.ip || '127.0.0.1';
      const userAgent = request.headers['user-agent'] || 'unknown';
      const result = await superadminService.login(request.body, ip, userAgent);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof SuperadminError) {
        return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /admin/auth/2fa/verify — Validação de código TOTP do Super Admin
   */
  fastify.post<{ Body: { tempToken: string; code: string } }>(
    '/admin/auth/2fa/verify',
    async (request, reply) => {
      try {
        const { tempToken, code } = request.body || {};
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const result = await superadminService.verify2fa(tempToken, code, ip, userAgent);
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/dashboard/metrics — Métricas Analíticas Globais do SaaS
   */
  fastify.get(
    '/admin/dashboard/metrics',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const metrics = await superadminService.getSaasMetrics();
        return reply.code(200).send(metrics);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/tenants — Listagem de Oficinas Clientes
   */
  fastify.get<{ Querystring: { search?: string; status?: string } }>(
    '/admin/tenants',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const tenants = await superadminService.listTenants(request.query);
        return reply.code(200).send(tenants);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants — Criação de Oficina pelo Assistente Corporativo
   */
  fastify.post<{ Body: AdminCreateTenantDto }>(
    '/admin/tenants',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.createTenant(request.body, superadminId, ip, userAgent);
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/tenants/:id — Detalhes Completos da Oficina
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const details = await superadminService.getTenantDetails(request.params.id);
        return reply.code(200).send(details);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants/:id/suspend — Suspensão de Oficina
   */
  fastify.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/admin/tenants/:id/suspend',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.updateTenantStatus(
          request.params.id,
          { status: 'suspended', reason: request.body?.reason || 'Suspensão determinada pelo Super Admin' },
          superadminId,
          ip,
          userAgent
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants/:id/reactivate — Reativação de Oficina
   */
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/admin/tenants/:id/reactivate',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.updateTenantStatus(
          request.params.id,
          { status: 'active', reason: request.body?.reason || 'Reativação efetuada com sucesso' },
          superadminId,
          ip,
          userAgent
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants/:id/cancel — Cancelamento de Contrato de Oficina
   */
  fastify.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/admin/tenants/:id/cancel',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.updateTenantStatus(
          request.params.id,
          { status: 'cancelled', reason: request.body?.reason || 'Cancelamento solicitado' },
          superadminId,
          ip,
          userAgent
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants/:id/reset-owner-password — Redefinição de Senha do Gestor/Dono da Oficina
   */
  fastify.post<{ Params: { id: string }; Body: ResetOwnerPasswordInputDto }>(
    '/admin/tenants/:id/reset-owner-password',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.resetOwnerPassword(
          request.params.id,
          request.body || {},
          superadminId,
          ip,
          userAgent
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/tenants/:id/impersonate — Impersonação Auditada
   */
  fastify.post<{ Params: { id: string }; Body: ImpersonateTenantDto }>(
    '/admin/tenants/:id/impersonate',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const reason = request.body?.reason;
        const result = await superadminService.impersonateTenant(
          request.params.id,
          superadminId,
          reason,
          ip,
          userAgent
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/contracts — Contratos e Licenças
   */
  fastify.get(
    '/admin/contracts',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const contracts = await superadminService.listContracts();
        return reply.code(200).send(contracts);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/invoices — Faturas e Cobranças
   */
  fastify.get(
    '/admin/invoices',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const invoices = await superadminService.listInvoices();
        return reply.code(200).send(invoices);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/invoices — Emissão Manual de Fatura pelo Super Admin
   */
  fastify.post<{ Body: CreateInvoiceInput }>(
    '/admin/invoices',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const superadminId = request.superadmin!.id;
        const result = await dunningService.createInvoiceManual(request.body, superadminId);
        return reply.code(201).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /admin/invoices/:id/pay — Baixa Manual de Fatura com Reativação Imediata
   */
  fastify.post<{ Params: { id: string }; Body: PayInvoiceInput }>(
    '/admin/invoices/:id/pay',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const superadminId = request.superadmin!.id;
        const result = await dunningService.payInvoiceManual(
          request.params.id,
          request.body || {},
          superadminId
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /admin/invoices/:id/cancel — Cancelamento Manual de Fatura
   */
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/admin/invoices/:id/cancel',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const superadminId = request.superadmin!.id;
        const result = await dunningService.cancelInvoiceManual(
          request.params.id,
          request.body?.reason || 'Cancelamento solicitado pelo administrador',
          superadminId
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * POST /admin/billing/run-dunning — Execução Manual ou Agendada da Régua de Cobrança
   */
  fastify.post<{ Body: { targetDate?: string } }>(
    '/admin/billing/run-dunning',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const targetDate = request.body?.targetDate ? new Date(request.body.targetDate) : undefined;
        const result = await dunningService.runDunningRoutine(targetDate);
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /admin/billing/dunning-events — Histórico de Eventos da Régua de Cobrança
   */
  fastify.get<{ Querystring: { tenantId?: string; limit?: string; offset?: string } }>(
    '/admin/billing/dunning-events',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
        const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
        const result = await dunningService.getDunningEvents({
          tenantId: request.query.tenantId,
          limit,
          offset,
        });
        return reply.code(200).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.code(statusCode).send({ statusCode, message: err.message });
      }
    }
  );

  /**
   * GET /admin/leads — Leads da Landing Page
   */
  fastify.get(
    '/admin/leads',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const leads = await superadminService.listLeads();
        return reply.code(200).send(leads);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/leads — Cadastro de Lead (Landing Page ou Admin)
   */
  fastify.post<{ Body: { name: string; email: string; phone?: string; company_name?: string; notes?: string } }>(
    '/admin/leads',
    async (request, reply) => {
      try {
        const lead = await superadminService.createLead(request.body);
        return reply.code(201).send(lead);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /public/leads — Cadastro Público de Lead da Landing Page (com Honeypot Anti-Bot)
   */
  fastify.post<{
    Body: {
      name: string;
      email: string;
      phone?: string;
      company_name?: string;
      segment?: string;
      employees_count?: string;
      notes?: string;
      website?: string;
      website_hp?: string;
    };
  }>(
    '/public/leads',
    async (request, reply) => {
      try {
        const body = request.body || ({} as any);
        // Proteção anti-bot honeypot: se campo invisível estiver preenchido, descarta com 200 sintético
        if (body.website || body.website_hp) {
          request.log.warn({ ip: request.ip }, 'Bot detectado no formulário público de leads (honeypot acionado)');
          return reply.code(200).send({ success: true, message: 'Solicitação recebida com sucesso!' });
        }

        if (!body.name || !body.email) {
          return reply.code(400).send({
            statusCode: 400,
            message: 'Nome e e-mail são obrigatórios para registrar o interesse.',
          });
        }

        let combinedNotes = body.notes || '';
        if (body.segment) {
          combinedNotes = `Segmento: ${body.segment}` + (combinedNotes ? ` | ${combinedNotes}` : '');
        }
        if (body.employees_count) {
          combinedNotes = (combinedNotes ? `${combinedNotes} | ` : '') + `Equipe: ${body.employees_count}`;
        }

        const lead = await superadminService.createLead({
          name: body.name,
          email: body.email,
          phone: body.phone,
          company_name: body.company_name,
          notes: combinedNotes || undefined,
        });

        return reply.code(201).send({
          success: true,
          lead,
          message: 'Solicitação recebida com sucesso! Em breve você receberá os dados de acesso.',
        });
      } catch (err: any) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /admin/leads/:id/convert — Conversão de Lead em Oficina
   */
  fastify.post<{ Params: { id: string }; Body: ConvertLeadDto }>(
    '/admin/leads/:id/convert',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const ip = request.ip || '127.0.0.1';
        const userAgent = request.headers['user-agent'] || 'unknown';
        const superadminId = request.superadmin!.id;
        const result = await superadminService.convertLeadToTenant(
          request.params.id,
          request.body,
          superadminId,
          ip,
          userAgent
        );
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/audit-logs — Trilha de Auditoria Imutável do Super Admin
   */
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/admin/audit-logs',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
        const logs = await superadminService.listAdminAuditLogs({ page, limit });
        return reply.code(200).send(logs);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/tenants/:id/services — Consulta Serviços Injetados da Oficina
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id/services',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const services = await superadminService.listTenantServices(request.params.id);
        return reply.code(200).send(services);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/tenants/:id/checklists — Consulta Templates de Checklist da Oficina
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id/checklists',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const checklists = await superadminService.listTenantChecklists(request.params.id);
        return reply.code(200).send(checklists);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/tenants/:id/invitations — Consulta Convites do Proprietário da Oficina
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id/invitations',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const invitations = await superadminService.listTenantInvitations(request.params.id);
        return reply.code(200).send(invitations);
      } catch (err) {
        if (err instanceof SuperadminError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /admin/plans — Lista todos os planos comerciais com contadores de assinantes
   */
  fastify.get(
    '/admin/plans',
    { preHandler: [requireSuperadminAuth] },
    async (_request, reply) => {
      try {
        const plans = await planService.listAllPlansAdmin();
        return reply.code(200).send(plans);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao listar planos';
        return reply.code(500).send({ statusCode: 500, message: msg });
      }
    }
  );

  /**
   * GET /admin/plans/:id — Obtém detalhes de um plano específico
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/plans/:id',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const plan = await planService.getPlanById(request.params.id);
        if (!plan) {
          return reply.code(404).send({ statusCode: 404, message: 'Plano não encontrado.' });
        }
        return reply.code(200).send(plan);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao buscar plano';
        return reply.code(500).send({ statusCode: 500, message: msg });
      }
    }
  );

  /**
   * POST /admin/plans — Cria um novo plano comercial na plataforma
   */
  fastify.post<{ Body: CreatePlanDto }>(
    '/admin/plans',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const adminId = (request.user as any)?.sub || (request.user as any)?.id;
        const created = await planService.createPlan(request.body, adminId);
        return reply.code(201).send(created);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar plano';
        return reply.code(400).send({ statusCode: 400, message: msg });
      }
    }
  );

  /**
   * PUT /admin/plans/:id — Atualiza dados, cotas e matriz de features do plano
   */
  fastify.put<{ Params: { id: string }; Body: UpdatePlanDto }>(
    '/admin/plans/:id',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const adminId = (request.user as any)?.sub || (request.user as any)?.id;
        const updated = await planService.updatePlan(request.params.id, request.body, adminId);
        return reply.code(200).send(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar plano';
        return reply.code(400).send({ statusCode: 400, message: msg });
      }
    }
  );

  /**
   * PATCH /admin/plans/:id/features — Alternância rápida de uma feature flag no plano
   */
  fastify.patch<{ Params: { id: string }; Body: { feature: string; enabled: boolean } }>(
    '/admin/plans/:id/features',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const { feature, enabled } = request.body || {};
        if (!feature || typeof enabled !== 'boolean') {
          return reply.code(400).send({ statusCode: 400, message: 'feature (string) e enabled (boolean) são obrigatórios.' });
        }
        const adminId = (request.user as any)?.sub || (request.user as any)?.id;
        const updated = await planService.togglePlanFeature(request.params.id, feature, enabled, adminId);
        return reply.code(200).send(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao alternar funcionalidade do plano';
        return reply.code(400).send({ statusCode: 400, message: msg });
      }
    }
  );

  /**
   * GET /admin/coupons — Lista todos os cupons comerciais cadastrados
   */
  fastify.get(
    '/admin/coupons',
    { preHandler: [requireSuperadminAuth] },
    async (_request, reply) => {
      try {
        const coupons = await couponService.listCouponsAdmin();
        return reply.code(200).send(coupons);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao listar cupons';
        return reply.code(500).send({ statusCode: 500, message: msg });
      }
    }
  );

  /**
   * POST /admin/coupons — Cria um novo cupom promocional
   */
  fastify.post<{ Body: CreateCouponDto }>(
    '/admin/coupons',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const adminId = (request.user as any)?.sub || (request.user as any)?.id;
        const created = await couponService.createCoupon(request.body, adminId);
        return reply.code(201).send(created);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar cupom';
        const statusCode = err instanceof CouponError ? err.statusCode : 400;
        return reply.code(statusCode).send({ statusCode, message: msg });
      }
    }
  );

  /**
   * DELETE /admin/coupons/:id — Desativa / revoga um cupom promocional
   */
  fastify.delete<{ Params: { id: string } }>(
    '/admin/coupons/:id',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const adminId = (request.user as any)?.sub || (request.user as any)?.id;
        const deactivated = await couponService.deactivateCoupon(request.params.id, adminId);
        return reply.code(200).send(deactivated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao desativar cupom';
        const statusCode = err instanceof CouponError ? err.statusCode : 400;
        return reply.code(statusCode).send({ statusCode, message: msg });
      }
    }
  );

  /**
   * POST /admin/coupons/validate — Validação de código de cupom para planos/checkout
   */
  fastify.post<{ Body: ValidateCouponInputDto }>(
    '/admin/coupons/validate',
    async (request, reply) => {
      try {
        const result = await couponService.validateCoupon(request.body || {});
        return reply.code(200).send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao validar cupom';
        return reply.code(400).send({ statusCode: 400, message: msg });
      }
    }
  );

  /**
   * GET /admin/whatsapp/telemetry — Telemetria Real de WhatsApp dos Tenants (Sem Mocks)
   */
  fastify.get(
    '/admin/whatsapp/telemetry',
    { preHandler: [requireSuperadminAuth] },
    async (request, reply) => {
      try {
        const telemetry = await whatsappService.getTelemetryAdmin();
        return reply.code(200).send(telemetry);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar telemetria de WhatsApp';
        return reply.code(500).send({ statusCode: 500, message: msg });
      }
    }
  );
}

export default superadminRoutes;

