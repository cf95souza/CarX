import type { FastifyPluginAsync } from 'fastify';
import {
  corporateService,
  CorporateError,
} from '../corporate/corporate-service.js';
import {
  CreateUnitSchema,
  UpdateUnitSchema,
  CreateUnitTransferSchema,
  UserRole,
} from '@carx/shared';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { requireRole } from '../middlewares/rbac.js';

export const corporateRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas corporativas exigem autenticação e contexto de tenant
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticateBearer);
    protectedApp.addHook('onRequest', requireTenantContext);

    /**
     * GET /corporate/overview
     * Cockpit executivo consolidado da rede (faturamento, ranking, ocupação de boxes e resumo de estoque)
     */
    protectedApp.get(
      '/corporate/overview',
      {
        preHandler: [requireRole(UserRole.OWNER, UserRole.GESTOR)],
      },
      async (request, reply) => {
        try {
          const tenantId = request.tenantId!;
          const { startDate, endDate } = request.query as {
            startDate?: string;
            endDate?: string;
          };

          const overview = await corporateService.getCorporateOverview(tenantId, {
            startDate,
            endDate,
          });

          return reply.status(200).send(overview);
        } catch (err: any) {
          if (err instanceof CorporateError) {
            return reply.status(err.statusCode).send({
              statusCode: err.statusCode,
              code: err.code,
              message: err.message,
            });
          }
          request.log.error(err, 'Erro ao obter visão corporativa multiunidade');
          return reply.status(500).send({
            statusCode: 500,
            message: 'Erro interno ao processar visão corporativa.',
          });
        }
      }
    );

    /**
     * GET /corporate/units
     * Lista todas as filiais cadastradas do tenant
     */
    protectedApp.get('/corporate/units', async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const units = await corporateService.listUnits(tenantId);
        return reply.status(200).send(units);
      } catch (err: any) {
        if (err instanceof CorporateError) {
          return reply.status(err.statusCode).send({
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
          });
        }
        return reply.status(500).send({
          statusCode: 500,
          message: 'Erro ao listar filiais.',
        });
      }
    });

    /**
     * GET /corporate/units/:id
     * Detalhes de uma filial específica
     */
    protectedApp.get('/corporate/units/:id', async (request, reply) => {
      try {
        const tenantId = request.tenantId!;
        const { id } = request.params as { id: string };
        const unit = await corporateService.getUnitById(tenantId, id);
        return reply.status(200).send(unit);
      } catch (err: any) {
        if (err instanceof CorporateError) {
          return reply.status(err.statusCode).send({
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
          });
        }
        return reply.status(500).send({
          statusCode: 500,
          message: 'Erro ao buscar filial.',
        });
      }
    });

    /**
     * POST /corporate/units
     * Cadastra nova filial respeitando a quota max_units do plano
     */
    protectedApp.post(
      '/corporate/units',
      {
        preHandler: [requireRole(UserRole.OWNER, UserRole.GESTOR)],
      },
      async (request, reply) => {
        try {
          const tenantId = request.tenantId!;
          const userId = (request.user as any)?.id as string | undefined;
          const parsed = CreateUnitSchema.safeParse(request.body);

          if (!parsed.success) {
            return reply.status(400).send({
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              message: 'Dados de filial inválidos.',
              errors: parsed.error.flatten().fieldErrors,
            });
          }

          const unit = await corporateService.createUnit(
            tenantId,
            parsed.data,
            userId
          );

          return reply.status(201).send(unit);
        } catch (err: any) {
          if (err instanceof CorporateError) {
            return reply.status(err.statusCode).send({
              statusCode: err.statusCode,
              code: err.code,
              message: err.message,
            });
          }
          request.log.error(err, 'Erro ao criar filial');
          return reply.status(500).send({
            statusCode: 500,
            message: 'Erro interno ao cadastrar filial.',
          });
        }
      }
    );

    /**
     * PATCH /corporate/units/:id
     * Atualiza dados de uma filial existente
     */
    protectedApp.patch(
      '/corporate/units/:id',
      {
        preHandler: [requireRole(UserRole.OWNER, UserRole.GESTOR)],
      },
      async (request, reply) => {
        try {
          const tenantId = request.tenantId!;
          const userId = (request.user as any)?.id as string | undefined;
          const { id } = request.params as { id: string };
          const parsed = UpdateUnitSchema.safeParse(request.body);

          if (!parsed.success) {
            return reply.status(400).send({
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              message: 'Dados de atualização inválidos.',
              errors: parsed.error.flatten().fieldErrors,
            });
          }

          const updated = await corporateService.updateUnit(
            tenantId,
            id,
            parsed.data,
            userId
          );

          return reply.status(200).send(updated);
        } catch (err: any) {
          if (err instanceof CorporateError) {
            return reply.status(err.statusCode).send({
              statusCode: err.statusCode,
              code: err.code,
              message: err.message,
            });
          }
          return reply.status(500).send({
            statusCode: 500,
            message: 'Erro interno ao atualizar filial.',
          });
        }
      }
    );

    /**
     * POST /corporate/transfers
     * Transfere bobina ou insumo de estoque entre duas filiais
     */
    protectedApp.post(
      '/corporate/transfers',
      {
        preHandler: [requireRole(UserRole.OWNER, UserRole.GESTOR)],
      },
      async (request, reply) => {
        try {
          const tenantId = request.tenantId!;
          const userId = (request.user as any)?.id as string | undefined;
          const parsed = CreateUnitTransferSchema.safeParse(request.body);

          if (!parsed.success) {
            return reply.status(400).send({
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              message: 'Dados de transferência inválidos.',
              errors: parsed.error.flatten().fieldErrors,
            });
          }

          const transfer = await corporateService.transferInventory(
            tenantId,
            parsed.data,
            userId
          );

          return reply.status(201).send(transfer);
        } catch (err: any) {
          if (err instanceof CorporateError) {
            return reply.status(err.statusCode).send({
              statusCode: err.statusCode,
              code: err.code,
              message: err.message,
            });
          }
          request.log.error(err, 'Erro ao transferir insumos entre filiais');
          return reply.status(500).send({
            statusCode: 500,
            message: 'Erro interno ao processar transferência.',
          });
        }
      }
    );

    /**
     * GET /corporate/transfers
     * Histórico auditado de transferências entre filiais
     */
    protectedApp.get(
      '/corporate/transfers',
      {
        preHandler: [requireRole(UserRole.OWNER, UserRole.GESTOR)],
      },
      async (request, reply) => {
        try {
          const tenantId = request.tenantId!;
          const transfers = await corporateService.listTransfers(tenantId);
          return reply.status(200).send(transfers);
        } catch (err: any) {
          if (err instanceof CorporateError) {
            return reply.status(err.statusCode).send({
              statusCode: err.statusCode,
              code: err.code,
              message: err.message,
            });
          }
          return reply.status(500).send({
            statusCode: 500,
            message: 'Erro ao listar transferências.',
          });
        }
      }
    );
  });
};
