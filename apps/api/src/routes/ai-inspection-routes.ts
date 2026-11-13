import type { FastifyPluginAsync } from 'fastify';
import { aiInspectionService } from '../ai/ai-inspection-service.js';
import {
  AiAnalyzeDamageInputSchema,
  AiVoiceChecklistInputSchema,
  ApplyAiSuggestionsInputSchema,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';

export const aiInspectionRoutes: FastifyPluginAsync = async (app) => {
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticateBearer);
    protectedApp.addHook('onRequest', requireTenantContext);

    // 1. Análise de Foto para Detecção de Danos & Sugestão de Orçamento
    protectedApp.post(
      '/ai/inspections/analyze-damage',
      async (request, reply) => {
        const tenantId = request.tenantId!;
        const parseResult = AiAnalyzeDamageInputSchema.safeParse(request.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: parseResult.error.errors[0]?.message || 'Dados de entrada inválidos para análise de IA',
          });
        }

        const result = await aiInspectionService.analyzeDamage(tenantId, parseResult.data);
        return reply.send(result);
      }
    );

    // 2. Extração de Checklist e Notas por Voz / Áudio
    protectedApp.post(
      '/ai/inspections/extract-voice',
      async (request, reply) => {
        const tenantId = request.tenantId!;
        const parseResult = AiVoiceChecklistInputSchema.safeParse(request.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: parseResult.error.errors[0]?.message || 'Parâmetros de voz inválidos',
          });
        }

        const result = await aiInspectionService.extractVoiceChecklist(tenantId, parseResult.data);
        return reply.send(result);
      }
    );

    // 3. Aplicação com 1 Clique das Recomendações na OS / Vistoria
    protectedApp.post(
      '/ai/inspections/apply-to-work-order',
      async (request, reply) => {
        const tenantId = request.tenantId!;
        const user = request.user as any;
        const userId = user?.sub || user?.id;

        const parseResult = ApplyAiSuggestionsInputSchema.safeParse(request.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: parseResult.error.errors[0]?.message || 'Dados inválidos para aplicação das sugestões da IA',
          });
        }

        try {
          const result = await aiInspectionService.applyToWorkOrder(
            tenantId,
            userId,
            parseResult.data
          );
          return reply.send(result);
        } catch (err: any) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: err.message || 'Falha ao aplicar sugestões da IA na Ordem de Serviço',
          });
        }
      }
    );

    // 4. Histórico de Análises de IA da OS
    protectedApp.get(
      '/ai/inspections/history/:workOrderId',
      async (request, reply) => {
        const tenantId = request.tenantId!;
        const { workOrderId } = request.params as { workOrderId: string };

        const history = await aiInspectionService.getAnalysisHistory(tenantId, workOrderId);
        return reply.send({ history });
      }
    );
  });
};
