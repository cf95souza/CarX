import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { qaService, QaError } from '../qa/qa-service.js';
import {
  CreateQaAuditSchema,
  CreateWarrantySchema,
  TransferVehiclePassportInputSchema,
  TransferVehiclePassportInputDto,
  UserRole,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export async function qaRoutes(app: FastifyInstance) {
  // ============================================================================
  // 1. ENDPOINTS PÚBLICOS: VERIFICAÇÃO DE PASSAPORTE DIGITAL (QR CODE)
  // Sem autenticação JWT e sem contexto de tenant prévio (consulta global por token)
  // ============================================================================

  app.get<{ Params: { token: string } }>('/public/passports/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    try {
      const passport = await qaService.verifyPublicPassport(request.params.token);
      return reply.code(200).send(passport);
    } catch (err: any) {
      if (err instanceof QaError) {
        return reply.code(err.statusCode).send({
          statusCode: err.statusCode,
          error: err.code,
          message: err.message,
        });
      }
      request.log.error(err, 'Erro ao verificar passaporte público');
      return reply.code(500).send({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno ao consultar passaporte do veículo.',
      });
    }
  });

  // Alias curto para QR Code: /v/:token
  app.get<{ Params: { token: string } }>('/v/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    try {
      const passport = await qaService.verifyPublicPassport(request.params.token);
      return reply.code(200).send(passport);
    } catch (err: any) {
      if (err instanceof QaError) {
        return reply.code(err.statusCode).send({
          statusCode: err.statusCode,
          error: err.code,
          message: err.message,
        });
      }
      return reply.code(500).send({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno ao consultar passaporte do veículo.',
      });
    }
  });

  // POST /public/passports/:token/transfer — Transferência de titularidade e custódia da garantia na revenda
  app.post<{ Params: { token: string }; Body: TransferVehiclePassportInputDto }>(
    '/public/passports/:token/transfer',
    async (request: FastifyRequest<{ Params: { token: string }; Body: TransferVehiclePassportInputDto }>, reply: FastifyReply) => {
      const parseRes = TransferVehiclePassportInputSchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados de transferência inválidos.',
          errors: parseRes.error.errors,
        });
      }

      try {
        const result = await qaService.transferWarrantyCustody(
          request.params.token,
          parseRes.data,
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
          }
        );
        return reply.code(200).send(result);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        request.log.error(err, 'Erro ao transferir passaporte digital');
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Erro interno ao realizar transferência de custódia.',
        });
      }
    }
  );

  // ============================================================================
  // 2. AUDITORIAS DE QUALIDADE (QA AUDITS) — ROTAS AUTENTICADAS
  // ============================================================================

  // POST /qa/audits — Realizar auditoria de qualidade pós-execução (Owner ou Gestor)
  app.post<{ Body: unknown }>(
    '/qa/audits',
    {
      preHandler: [authenticateBearer, requireTenantContext, requireRole([UserRole.OWNER, UserRole.GESTOR])],
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const inspectorId = (request.user as any)?.userId || (request.user as any)?.sub || (request.user as any)?.id;

      const parseResult = CreateQaAuditSchema.safeParse(request.body);
      if (!parseResult.success) {
        request.log.warn({ errors: parseResult.error.format() }, 'Falha na validação de auditoria QA');
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados de auditoria inválidos: ' + JSON.stringify(parseResult.error.flatten().fieldErrors),
          details: parseResult.error.format(),
        });
      }

      try {
        const audit = await qaService.createAudit(tenantId, inspectorId, parseResult.data);
        return reply.code(201).send(audit);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        request.log.error(err, 'Erro ao criar auditoria de QA');
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /qa/audits/:id — Consultar auditoria por ID
  app.get<{ Params: { id: string } }>(
    '/qa/audits/:id',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      try {
        const audit = await qaService.getAuditById(tenantId, request.params.id);
        return reply.code(200).send(audit);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /work-orders/:workOrderId/qa-audits — Histórico de QA da OS
  app.get<{ Params: { workOrderId: string } }>(
    '/work-orders/:workOrderId/qa-audits',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { workOrderId: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const audits = await qaService.listAuditsByWorkOrder(tenantId, request.params.workOrderId);
      return reply.code(200).send(audits);
    }
  );

  // ============================================================================
  // 3. CERTIFICADOS DE GARANTIA E PASSAPORTE DO VEÍCULO (WARRANTIES)
  // ============================================================================

  // POST /warranties — Emitir certificado de garantia
  app.post<{ Body: unknown }>(
    '/warranties',
    {
      preHandler: [
        authenticateBearer,
        requireTenantContext,
        requireRole([UserRole.OWNER, UserRole.GESTOR, UserRole.ATENDENTE]),
      ],
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;

      const parseResult = CreateWarrantySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Dados de garantia inválidos',
          details: parseResult.error.format(),
        });
      }

      try {
        const warranty = await qaService.createWarranty(tenantId, parseResult.data);
        return reply.code(201).send(warranty);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        request.log.error(err, 'Erro ao criar garantia');
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /warranties/:id — Consulta garantia por ID
  app.get<{ Params: { id: string } }>(
    '/warranties/:id',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      try {
        const warranty = await qaService.getWarrantyById(tenantId, request.params.id);
        return reply.code(200).send(warranty);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /work-orders/:workOrderId/warranties — Garantias vinculadas à OS
  app.get<{ Params: { workOrderId: string } }>(
    '/work-orders/:workOrderId/warranties',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { workOrderId: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const list = await qaService.listWarrantiesByWorkOrder(tenantId, request.params.workOrderId);
      return reply.code(200).send(list);
    }
  );

  // GET /vehicles/:vehicleId/warranties — Histórico de garantias do veículo
  app.get<{ Params: { vehicleId: string } }>(
    '/vehicles/:vehicleId/warranties',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { vehicleId: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const list = await qaService.listWarrantiesByVehicle(tenantId, request.params.vehicleId);
      return reply.code(200).send(list);
    }
  );

  // POST /warranties/:id/revoke — Revoga garantia (Owner/Gestor)
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/warranties/:id/revoke',
    {
      preHandler: [authenticateBearer, requireTenantContext, requireRole([UserRole.OWNER, UserRole.GESTOR])],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      try {
        const updated = await qaService.revokeWarranty(
          tenantId,
          request.params.id,
          request.body?.reason
        );
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );

  // GET /warranties/:id/pdf — Download ou visualização do Certificado em PDF
  app.get<{ Params: { id: string } }>(
    '/warranties/:id/pdf',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      try {
        const pdfBuffer = await qaService.getWarrantyPdfBuffer(tenantId, request.params.id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="certificado_garantia_${request.params.id}.pdf"`)
          .code(200)
          .send(pdfBuffer);
      } catch (err: any) {
        if (err instanceof QaError) {
          return reply.code(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        return reply.code(500).send({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: err.message,
        });
      }
    }
  );
}
