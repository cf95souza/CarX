import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  RequestPortalOtpSchema,
  VerifyPortalOtpSchema,
  RequestPortalOtpInputDto,
  VerifyPortalOtpInputDto,
} from '@carx/shared';
import {
  customerPortalService,
  CustomerPortalError,
} from '../customer-portal/customer-portal-service.js';
import { authenticateCustomerPortal } from '../customer-portal/customer-portal-guard.js';

export const customerPortalRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ============================================================================
  // AUTENTICAÇÃO DO PORTAL DO CLIENTE ("MEU VEÍCULO")
  // ============================================================================

  /**
   * POST /portal/auth/request-otp — Solicitação de código de 6 dígitos
   * Proteção anti-enumeração: retorna a mesma mensagem neutra se o cliente existir ou não.
   */
  fastify.post<{ Body: RequestPortalOtpInputDto }>(
    '/portal/auth/request-otp',
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Identificação da oficina/loja não fornecida (cabeçalho X-Tenant-Id ou subdomínio).',
        });
      }

      const parseResult = RequestPortalOtpSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message || 'Dados inválidos.',
        });
      }

      try {
        const result = await customerPortalService.requestOtp(
          tenantId,
          parseResult.data.identifier
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /portal/auth/verify-otp — Validação do código de 6 dígitos e emissão do JWT
   */
  fastify.post<{ Body: VerifyPortalOtpInputDto }>(
    '/portal/auth/verify-otp',
    async (request, reply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Identificação da oficina/loja não fornecida (cabeçalho X-Tenant-Id ou subdomínio).',
        });
      }

      const parseResult = VerifyPortalOtpSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message || 'Código OTP inválido.',
        });
      }

      try {
        const result = await customerPortalService.verifyOtp(
          tenantId,
          parseResult.data.identifier,
          parseResult.data.code
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  // ============================================================================
  // ROTAS DO PORTAL DO CLIENTE (EXIGEM AUTENTICAÇÃO DO PORTAL)
  // ============================================================================

  /**
   * GET /portal/me — Perfil do cliente autenticado
   */
  fastify.get(
    '/portal/me',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const profile = await customerPortalService.getProfile(tenantId!, customerId);
        return reply.code(200).send(profile);
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/vehicles — Lista de veículos pertencentes ao cliente autenticado
   * Sem veículos = lista vazia [] (nunca dados falsos ou modo demo)
   */
  fastify.get(
    '/portal/vehicles',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const vehicles = await customerPortalService.getVehicles(tenantId!, customerId);
        return reply.code(200).send({ vehicles });
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/work-orders — Ordens de serviço do cliente autenticado
   * Sem OS = lista vazia [] (nunca dados falsos ou modo demo)
   */
  fastify.get(
    '/portal/work-orders',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const workOrders = await customerPortalService.getWorkOrders(tenantId!, customerId);
        return reply.code(200).send({ workOrders });
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/work-orders/:id — Detalhes completos da OS do cliente
   */
  fastify.get<{ Params: { id: string } }>(
    '/portal/work-orders/:id',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const detail = await customerPortalService.getWorkOrderDetail(
          tenantId!,
          customerId,
          request.params.id
        );
        return reply.code(200).send(detail);
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/work-orders/:id/timeline — Linha do tempo dos eventos da OS
   */
  fastify.get<{ Params: { id: string } }>(
    '/portal/work-orders/:id/timeline',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const events = await customerPortalService.getWorkOrderTimeline(
          tenantId!,
          customerId,
          request.params.id
        );
        return reply.code(200).send({ events });
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/work-orders/:id/photos — Galeria de fotos antes / durante / depois
   */
  fastify.get<{ Params: { id: string } }>(
    '/portal/work-orders/:id/photos',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const photos = await customerPortalService.getWorkOrderPhotos(
          tenantId!,
          customerId,
          request.params.id
        );
        return reply.code(200).send({ photos });
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /portal/warranties — Certificados de garantia ativos do cliente
   */
  fastify.get(
    '/portal/warranties',
    { preHandler: [authenticateCustomerPortal] },
    async (request, reply) => {
      const { tenantId, customerId } = request.portalCustomer!;
      try {
        const warranties = await customerPortalService.getCustomerWarranties(
          tenantId!,
          customerId
        );
        return reply.code(200).send({ warranties });
      } catch (err: any) {
        if (err instanceof CustomerPortalError) {
          return reply
            .code(err.statusCode)
            .send({ statusCode: err.statusCode, code: err.code, message: err.message });
        }
        throw err;
      }
    }
  );
};
