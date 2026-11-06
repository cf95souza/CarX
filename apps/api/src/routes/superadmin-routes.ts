import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { superadminService, SuperadminError } from '../superadmin/superadmin-service.js';
import { requireSuperadminAuth } from '../middlewares/superadmin-guards.js';
import {
  SuperadminLoginInput,
  AdminCreateTenantDto,
  AdminUpdateTenantStatusDto,
  ImpersonateTenantDto,
  ConvertLeadDto,
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
}

export default superadminRoutes;

