import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateApiKeySchema,
  CreateWebhookEndpointSchema,
  UpdateWebhookEndpointSchema,
  PublicWorkOrderQuerySchema,
  PublicCreateWorkOrderSchema,
  UserRole,
} from '@carx/shared';
import { ApiKeyService } from '../integrations/api-key-service.js';
import { WebhookService } from '../integrations/webhook-service.js';
import { createApiKeyGuard } from '../integrations/api-key-guard.js';
import { openApiSpec, renderSwaggerUiHtml } from '../integrations/openapi-spec.js';
import { tenantQuery } from '../database/tenant-query.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export async function integrationRoutes(app: FastifyInstance) {
  const staffGuards = [
    authenticateBearer,
    requireTenantContext,
    requireRole([UserRole.OWNER, UserRole.GESTOR]),
  ];

  const getTenantId = (request: FastifyRequest): string => {
    return (
      request.tenantId ||
      (request.user as any)?.tenantId ||
      (request.user as any)?.tenant_id ||
      ''
    );
  };

  const getUserId = (request: FastifyRequest): string | undefined => {
    return (
      (request.user as any)?.userId ||
      (request.user as any)?.sub ||
      (request.user as any)?.id ||
      undefined
    );
  };

  // ==============================================================================
  // 1. GESTÃO DE CHAVES DE API (PAINEL DO GESTOR)
  // ==============================================================================

  app.get(
    '/integrations/api-keys',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const keys = await ApiKeyService.listApiKeys(tenantId);
      return reply.send({ apiKeys: keys });
    }
  );

  app.post(
    '/integrations/api-keys',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const parsed = CreateApiKeySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para geração de chave de API',
          details: parsed.error.format(),
        });
      }

      const created = await ApiKeyService.generateApiKey(tenantId, parsed.data, userId);
      return reply.status(201).send(created);
    }
  );

  app.delete(
    '/integrations/api-keys/:id',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const revoked = await ApiKeyService.revokeApiKey(tenantId, id);
      if (!revoked) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Chave de API não encontrada ou já revogada.',
        });
      }

      return reply.send({ message: 'Chave de API revogada com sucesso.' });
    }
  );

  // ==============================================================================
  // 2. GESTÃO DE WEBHOOKS (PAINEL DO GESTOR)
  // ==============================================================================

  app.get(
    '/integrations/webhooks',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const webhooks = await WebhookService.listEndpoints(tenantId);
      return reply.send({ webhooks });
    }
  );

  app.post(
    '/integrations/webhooks',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const parsed = CreateWebhookEndpointSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para cadastro de webhook',
          details: parsed.error.format(),
        });
      }

      const created = await WebhookService.createEndpoint(tenantId, parsed.data);
      return reply.status(201).send({ webhook: created });
    }
  );

  app.get(
    '/integrations/webhooks/:id',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const webhook = await WebhookService.getEndpoint(tenantId, id);
      if (!webhook) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Endpoint de webhook não encontrado.',
        });
      }

      return reply.send({ webhook });
    }
  );

  app.patch(
    '/integrations/webhooks/:id',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const parsed = UpdateWebhookEndpointSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualização de webhook',
          details: parsed.error.format(),
        });
      }

      const updated = await WebhookService.updateEndpoint(tenantId, id, parsed.data);
      if (!updated) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Endpoint de webhook não encontrado.',
        });
      }

      return reply.send({ webhook: updated });
    }
  );

  app.delete(
    '/integrations/webhooks/:id',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const deleted = await WebhookService.deleteEndpoint(tenantId, id);
      if (!deleted) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Endpoint de webhook não encontrado.',
        });
      }

      return reply.send({ message: 'Endpoint de webhook excluído com sucesso.' });
    }
  );

  app.post(
    '/integrations/webhooks/:id/test',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const webhook = await WebhookService.getEndpoint(tenantId, id);
      if (!webhook) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Endpoint de webhook não encontrado.',
        });
      }

      const deliveries = await WebhookService.dispatchWebhook(
        tenantId,
        'ping',
        {
          message: 'Teste de conectividade do Webhook CarX',
          triggeredAt: new Date().toISOString(),
        },
        { endpointId: id, isTest: true }
      );

      return reply.send({
        message: 'Teste de webhook disparado com sucesso.',
        delivery: deliveries[0] || null,
      });
    }
  );

  app.get(
    '/integrations/webhooks/:id/deliveries',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const deliveries = await WebhookService.listDeliveries(tenantId, id);
      return reply.send({ deliveries });
    }
  );

  app.post(
    '/integrations/webhooks/deliveries/:deliveryId/retry',
    { preHandler: staffGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { deliveryId } = request.params as { deliveryId: string };

      const retried = await WebhookService.retryDelivery(tenantId, deliveryId);
      if (!retried) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Entrega de webhook não encontrada.',
        });
      }

      return reply.send({ delivery: retried });
    }
  );

  // ==============================================================================
  // 3. API PÚBLICA V1 (AUTENTICAÇÃO POR CHAVE DE API 'carx_live_...')
  // ==============================================================================

  // GET /v1/work-orders
  app.get(
    '/v1/work-orders',
    { preHandler: [createApiKeyGuard(['read:work_orders'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = (request as any).tenantId;
      const parsed = PublicWorkOrderQuerySchema.safeParse(request.query);
      const { status, limit, offset } = parsed.success
        ? parsed.data
        : { status: undefined, limit: 20, offset: 0 };

      let query = `
        SELECT 
          wo.id,
          wo.os_number,
          wo.status,
          wo.total_cents,
          wo.notes,
          wo.scheduled_at,
          wo.created_at,
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          v.id as vehicle_id,
          v.plate as vehicle_plate,
          v.model as vehicle_model
        FROM work_orders wo
        JOIN customers c ON wo.customer_id = c.id
        JOIN vehicles v ON wo.vehicle_id = v.id
        WHERE wo.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (status) {
        query += ` AND wo.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY wo.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await tenantQuery(tenantId, query, params);

      const workOrders = result.rows.map((r) => ({
        id: r.id,
        osNumber: r.os_number,
        status: r.status,
        totalCents: r.total_cents,
        notes: r.notes,
        scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        customer: {
          id: r.customer_id,
          name: r.customer_name,
          phone: r.customer_phone,
        },
        vehicle: {
          id: r.vehicle_id,
          plate: r.vehicle_plate,
          model: r.vehicle_model,
        },
      }));

      return reply.send({ workOrders, total: workOrders.length });
    }
  );

  // GET /v1/work-orders/:id
  app.get(
    '/v1/work-orders/:id',
    { preHandler: [createApiKeyGuard(['read:work_orders'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = (request as any).tenantId;
      const { id } = request.params as { id: string };

      const query = `
        SELECT 
          wo.id,
          wo.os_number,
          wo.status,
          wo.total_cents,
          wo.notes,
          wo.scheduled_at,
          wo.created_at,
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          v.id as vehicle_id,
          v.plate as vehicle_plate,
          v.model as vehicle_model,
          v.brand as vehicle_brand,
          v.year as vehicle_year
        FROM work_orders wo
        JOIN customers c ON wo.customer_id = c.id
        JOIN vehicles v ON wo.vehicle_id = v.id
        WHERE wo.id = $1 AND wo.tenant_id = $2
      `;

      const result = await tenantQuery(tenantId, query, [id, tenantId]);
      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Ordem de serviço não encontrada.',
        });
      }

      const r = result.rows[0];

      // Buscar itens da OS
      const itemsRes = await tenantQuery(
        tenantId,
        `SELECT id, name, unit_price_cents, quantity, total_cents FROM work_order_items WHERE work_order_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      return reply.send({
        id: r.id,
        osNumber: r.os_number,
        status: r.status,
        totalCents: r.total_cents,
        notes: r.notes,
        scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        customer: {
          id: r.customer_id,
          name: r.customer_name,
          phone: r.customer_phone,
          email: r.customer_email,
        },
        vehicle: {
          id: r.vehicle_id,
          plate: r.vehicle_plate,
          model: r.vehicle_model,
          brand: r.vehicle_brand,
          year: r.vehicle_year,
        },
        items: itemsRes.rows.map((item) => ({
          id: item.id,
          name: item.name,
          unitPriceCents: item.unit_price_cents,
          quantity: item.quantity,
          totalCents: item.total_cents,
        })),
      });
    }
  );

  // POST /v1/work-orders
  app.post(
    '/v1/work-orders',
    { preHandler: [createApiKeyGuard(['write:work_orders'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = (request as any).tenantId;
      const parsed = PublicCreateWorkOrderSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para criação da ordem de serviço',
          details: parsed.error.format(),
        });
      }

      const { customerId, vehicleId, notes, scheduledAt } = parsed.data;

      // Validar existência do cliente no tenant
      const customerCheck = await tenantQuery(
        tenantId,
        `SELECT id, name FROM customers WHERE id = $1 AND tenant_id = $2`,
        [customerId, tenantId]
      );
      if (customerCheck.rows.length === 0) {
        return reply.status(400).send({
          error: 'INVALID_CUSTOMER',
          message: 'Cliente não encontrado no tenant.',
        });
      }

      // Validar existência do veículo no tenant
      const vehicleCheck = await tenantQuery(
        tenantId,
        `SELECT id, plate, model FROM vehicles WHERE id = $1 AND tenant_id = $2`,
        [vehicleId, tenantId]
      );
      if (vehicleCheck.rows.length === 0) {
        return reply.status(400).send({
          error: 'INVALID_VEHICLE',
          message: 'Veículo não encontrado no tenant.',
        });
      }

      // Obter próximo número sequencial de OS do tenant
      const seqRes = await tenantQuery(
        tenantId,
        `SELECT COALESCE(MAX(os_number), 0) + 1 AS next_os FROM work_orders WHERE tenant_id = $1`,
        [tenantId]
      );
      const nextOsNumber = Number(seqRes.rows[0].next_os);

      const insertQuery = `
        INSERT INTO work_orders (
          tenant_id,
          os_number,
          customer_id,
          vehicle_id,
          status,
          total_cents,
          notes,
          scheduled_at
        )
        VALUES ($1, $2, $3, $4, 'DRAFT', 0, $5, $6)
        RETURNING id, os_number, status, total_cents, notes, scheduled_at, created_at
      `;

      const insertRes = await tenantQuery(tenantId, insertQuery, [
        tenantId,
        nextOsNumber,
        customerId,
        vehicleId,
        notes || null,
        scheduledAt || null,
      ]);

      const createdOs = insertRes.rows[0];

      // Disparar Webhook assíncrono em background
      WebhookService.dispatchWebhook(tenantId, 'work_order.created', {
        workOrderId: createdOs.id,
        osNumber: createdOs.os_number,
        status: createdOs.status,
        customerId,
        vehicleId,
        plate: vehicleCheck.rows[0].plate,
        source: 'api_public_v1',
      }).catch(() => {});

      return reply.status(201).send({
        id: createdOs.id,
        osNumber: createdOs.os_number,
        status: createdOs.status,
        totalCents: createdOs.total_cents,
        notes: createdOs.notes,
        scheduledAt: createdOs.scheduled_at ? new Date(createdOs.scheduled_at).toISOString() : null,
        createdAt: new Date(createdOs.created_at).toISOString(),
        customer: customerCheck.rows[0],
        vehicle: vehicleCheck.rows[0],
      });
    }
  );

  // GET /v1/customers
  app.get(
    '/v1/customers',
    { preHandler: [createApiKeyGuard(['read:customers'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = (request as any).tenantId;

      const result = await tenantQuery(
        tenantId,
        `SELECT id, name, phone, email, created_at FROM customers WHERE tenant_id = $1 ORDER BY name ASC LIMIT 100`,
        [tenantId]
      );

      return reply.send({
        customers: result.rows.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          createdAt: new Date(c.created_at).toISOString(),
        })),
      });
    }
  );

  // GET /v1/nps
  app.get(
    '/v1/nps',
    { preHandler: [createApiKeyGuard(['read:nps'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = (request as any).tenantId;

      const result = await tenantQuery(
        tenantId,
        `SELECT id, work_order_id, score, classification, comment, answered_at, created_at
         FROM nps_surveys
         WHERE tenant_id = $1 AND status = 'answered'
         ORDER BY answered_at DESC LIMIT 50`,
        [tenantId]
      );

      return reply.send({
        surveys: result.rows.map((s) => ({
          id: s.id,
          workOrderId: s.work_order_id,
          score: s.score,
          classification: s.classification,
          comment: s.comment,
          answeredAt: s.answered_at ? new Date(s.answered_at).toISOString() : null,
          createdAt: new Date(s.created_at).toISOString(),
        })),
      });
    }
  );

  // ==============================================================================
  // 4. DOCUMENTAÇÃO OPENAPI & SWAGGER UI
  // ==============================================================================

  // Documento OpenAPI 3.0 em JSON
  app.get('/v1/openapi.json', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.header('Content-Type', 'application/json; charset=utf-8').send(openApiSpec);
  });

  // Interface Visual Swagger UI
  app.get('/docs', async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = renderSwaggerUiHtml('/v1/openapi.json');
    return reply.type('text/html; charset=utf-8').send(html);
  });

  app.get('/v1/docs', async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = renderSwaggerUiHtml('/v1/openapi.json');
    return reply.type('text/html; charset=utf-8').send(html);
  });
}
