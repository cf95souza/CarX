import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';
import { requireFeature } from '../middlewares/plan-guards.js';
import {
  CreateInspectionInputSchema,
  UpdateInspectionInputSchema,
  AddDamagePointInputSchema,
  AddInspectionPhotoInputSchema,
  SignInspectionInputSchema,
  PlanFeatures,
} from '@carx/shared';
import {
  inspectionService,
  InspectionNotFoundError,
  InspectionValidationError,
} from '../inspections/inspection-service.js';

export async function inspectionRoutes(fastify: FastifyInstance) {
  const inspectionGuards = [
    authenticateBearer,
    requireTenantContext,
    requireFeature(PlanFeatures.INSPECTION_CHECKLIST),
  ];
  /**
   * POST /inspections — Cria uma nova inspeção / laudo VCR
   */
  fastify.post(
    '/inspections',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina (tenant) não identificado.' });
      }

      const parseResult = CreateInspectionInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados de inspeção inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const userId = (request.user as any)?.userId || (request.user as any)?.sub;
        const inspection = await inspectionService.createInspection(tenantId, {
          ...parseResult.data,
          inspectorId: parseResult.data.inspectorId || userId,
        });

        return reply.code(201).send(inspection);
      } catch (err: any) {
        if (err instanceof InspectionValidationError) {
          return reply.code(400).send({ statusCode: 400, error: 'Validation Error', message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /inspections/:id — Busca inspeção detalhada
   */
  fastify.get(
    '/inspections/:id',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };

      try {
        const inspection = await inspectionService.getInspectionById(tenantId, id);
        return reply.code(200).send(inspection);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /work-orders/:workOrderId/inspections — Lista inspeções de uma OS
   */
  fastify.get(
    '/work-orders/:workOrderId/inspections',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { workOrderId } = request.params as { workOrderId: string };
      const list = await inspectionService.listByWorkOrder(tenantId, workOrderId);
      return reply.code(200).send(list);
    }
  );

  /**
   * PATCH /inspections/:id — Atualiza dados da inspeção
   */
  fastify.patch(
    '/inspections/:id',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = UpdateInspectionInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados de atualização inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = await inspectionService.updateInspection(
          tenantId,
          id,
          parseResult.data
        );
        return reply.code(200).send(updated);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /inspections/:id/damage-points — Adiciona ponto de avaria tocado na silhueta
   */
  fastify.post(
    '/inspections/:id/damage-points',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = AddDamagePointInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Ponto de avaria inválido.',
          details: parseResult.error.format(),
        });
      }

      try {
        const point = await inspectionService.addDamagePoint(
          tenantId,
          id,
          parseResult.data
        );
        return reply.code(201).send(point);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /inspections/:id/damage-points/:pointId — Remove ponto de avaria
   */
  fastify.delete(
    '/inspections/:id/damage-points/:pointId',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id, pointId } = request.params as { id: string; pointId: string };

      try {
        const removed = await inspectionService.removeDamagePoint(
          tenantId,
          id,
          pointId
        );
        return reply.code(200).send({ success: removed });
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /inspections/:id/photos — Adiciona foto guiada à inspeção
   */
  fastify.post(
    '/inspections/:id/photos',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = AddInspectionPhotoInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Foto de inspeção inválida.',
          details: parseResult.error.format(),
        });
      }

      try {
        const photo = await inspectionService.addPhoto(tenantId, id, parseResult.data);
        return reply.code(201).send(photo);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * DELETE /inspections/:id/photos/:photoId — Remove foto da inspeção
   */
  fastify.delete(
    '/inspections/:id/photos/:photoId',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id, photoId } = request.params as { id: string; photoId: string };

      try {
        const removed = await inspectionService.removePhoto(
          tenantId,
          id,
          photoId
        );
        return reply.code(200).send({ success: removed });
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /inspections/:id/sign — Assina digitalmente a inspeção (salvando imagem no MinIO)
   */
  fastify.post(
    '/inspections/:id/sign',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };
      const parseResult = SignInspectionInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados de assinatura inválidos.',
          details: parseResult.error.format(),
        });
      }

      try {
        const signed = await inspectionService.signInspection(
          tenantId,
          id,
          parseResult.data
        );
        return reply.code(200).send(signed);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        if (err instanceof InspectionValidationError) {
          return reply.code(400).send({ statusCode: 400, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * POST /inspections/:id/generate-pdf — Gera o laudo VCR em PDF, salva no MinIO e retorna
   */
  fastify.post(
    '/inspections/:id/generate-pdf',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };

      try {
        const result = await inspectionService.generateInspectionPdf(tenantId, id);
        return reply.code(200).send({
          message: 'Laudo VCR em PDF gerado com sucesso.',
          inspection: result.inspection,
          pdfUrl: result.inspection.pdfUrl,
          pdfSizeBytes: result.pdfBuffer.length,
        });
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );

  /**
   * GET /inspections/:id/pdf — Faz download direto do PDF do laudo
   */
  fastify.get(
    '/inspections/:id/pdf',
    { preHandler: inspectionGuards },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.code(400).send({ statusCode: 400, message: 'Contexto de oficina não identificado.' });
      }

      const { id } = request.params as { id: string };

      try {
        const result = await inspectionService.generateInspectionPdf(tenantId, id);
        const filename = `laudo_vcr_${result.inspection.vehicle?.plate || 'inspecao'}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(result.pdfBuffer);
      } catch (err: any) {
        if (err instanceof InspectionNotFoundError) {
          return reply.code(404).send({ statusCode: 404, message: err.message });
        }
        throw err;
      }
    }
  );
}
