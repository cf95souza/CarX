import crypto from 'crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { whatsappService, WhatsAppError } from '../whatsapp/whatsapp-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { requireFeature } from '../middlewares/plan-guards.js';
import { PlanFeatures, ConnectWhatsAppInputDto, SendWhatsAppMessageInputDto } from '@carx/shared';

export async function whatsappRoutes(fastify: FastifyInstance) {
  /**
   * GET /tenant/whatsapp/instance — Status da Instância de WhatsApp da Loja
   */
  fastify.get(
    '/tenant/whatsapp/instance',
    { preHandler: [authenticateBearer, requireTenantContext, requireRole(['owner', 'gestor', 'atendente'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const instance = await whatsappService.getInstance(tenantId);
        return reply.code(200).send(instance);
      } catch (err) {
        if (err instanceof WhatsAppError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /tenant/whatsapp/connect — Iniciar Conexão (Pairing Code / QR Code)
   */
  fastify.post<{ Body: ConnectWhatsAppInputDto }>(
    '/tenant/whatsapp/connect',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor']),
        requireFeature(PlanFeatures.WHATSAPP_GATEWAY),
      ],
    },
    async (request: FastifyRequest<{ Body: ConnectWhatsAppInputDto }>, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = request.user?.sub;
        const result = await whatsappService.connectInstance(tenantId, request.body || { method: 'pairing_code' }, userId);
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof WhatsAppError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /tenant/whatsapp/disconnect — Desconectar Aparelho da Oficina
   */
  fastify.post(
    '/tenant/whatsapp/disconnect',
    { preHandler: [authenticateBearer, requireTenantContext, requireRole(['owner', 'gestor'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const userId = request.user?.sub;
        const result = await whatsappService.disconnectInstance(tenantId, userId);
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof WhatsAppError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /tenant/whatsapp/send-test — Envio de Mensagem de Teste da Oficina
   */
  fastify.post<{ Body: SendWhatsAppMessageInputDto }>(
    '/tenant/whatsapp/send-test',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole(['owner', 'gestor']),
        requireFeature(PlanFeatures.WHATSAPP_GATEWAY),
      ],
    },
    async (request: FastifyRequest<{ Body: SendWhatsAppMessageInputDto }>, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId!;
        const body = request.body;
        if (!body || !body.to) {
          return reply.code(400).send({ statusCode: 400, message: 'Número de telefone de destino é obrigatório.' });
        }
        const message = body.message || 'Olá! Esta é uma mensagem de teste enviada pelo sistema CarX da sua oficina.';
        const result = await whatsappService.sendMessage(tenantId, {
          to: body.to,
          message,
          media_url: body.media_url,
        });
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof WhatsAppError) {
          return reply.code(err.statusCode).send({ statusCode: err.statusCode, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /internal/whatsapp/webhook — Notificação M2M do Gateway Baileys
   */
  fastify.post<{ Body: { tenantId: string; event: string; phoneNumber?: string } }>(
    '/internal/whatsapp/webhook',
    async (request, reply) => {
      const incomingSecret = (request.headers['x-internal-secret'] as string) || '';
      const expectedSecret = process.env.WA_GATEWAY_INTERNAL_SECRET || 'carx-wa-internal-secret-token-32chars';

      const incomingBuf = Buffer.from(incomingSecret);
      const expectedBuf = Buffer.from(expectedSecret);

      if (
        incomingBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(incomingBuf, expectedBuf)
      ) {
        return reply.code(401).send({ error: 'Acesso M2M não autorizado' });
      }

      const { tenantId, event, phoneNumber } = request.body || {};
      if (tenantId && event === 'connected' && phoneNumber) {
        await whatsappService.setConnectedStatus(tenantId, phoneNumber);
      } else if (tenantId && event === 'disconnected') {
        await whatsappService.disconnectInstance(tenantId);
      }

      return reply.code(200).send({ received: true });
    }
  );
}
