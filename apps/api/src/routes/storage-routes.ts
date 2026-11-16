import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { storageService, StorageForbiddenError, StorageNotFoundError } from '../storage/storage-service.js';
import { adminPool } from '../database/db.js';
import { MagicBytesError } from '../storage/magic-bytes.js';
import { QuotaExceededError } from '../plans/plan-service.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import {
  PresignedUploadRequestSchema,
  StorageFileCategory,
  type StorageFileCategoryType,
} from '@carx/shared';

export async function storageRoutes(fastify: FastifyInstance) {
  /**
   * POST /storage/upload — Upload direto multipart de mídias de OS, laudos e fotos
   * Valida magic bytes reais e cota de armazenamento antes de persistir no MinIO.
   */
  fastify.post(
    '/storage/upload',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const user = request.user as any;

      try {
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Nenhum arquivo enviado no formulário multipart.',
          });
        }

        const buffer = await data.toBuffer();
        const originalName = data.filename;
        const declaredMimeType = data.mimetype;

        // Campos auxiliares opcionais do multipart
        const fields = data.fields as Record<string, { value?: string }>;
        const category = (fields.category?.value || StorageFileCategory.GENERAL) as StorageFileCategoryType;
        const entityId = fields.entityId?.value || null;

        const fileRecord = await storageService.uploadFile(tenantId, {
          buffer,
          originalName,
          declaredMimeType,
          category,
          entityId,
          uploaderUserId: user?.userId || null,
        });

        // Gera presigned download URL para retorno amigável
        const { downloadUrl } = await storageService.getPresignedDownloadUrl(tenantId, fileRecord.id!);

        return reply.code(201).send({
          ...fileRecord,
          url: downloadUrl,
        });
      } catch (err: unknown) {
        if (err instanceof MagicBytesError) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            code: err.code,
            message: err.message,
          });
        }

        if (err instanceof QuotaExceededError) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            code: err.code,
            message: err.message,
            limit: err.limit,
            current: err.current,
          });
        }

        request.log.error({ err }, 'Falha no processamento de upload');
        const errObj = err as { statusCode?: number; message?: string };
        const code = errObj.statusCode || 500;
        return reply.code(code).send({
          statusCode: code,
          error: code === 403 ? 'Forbidden' : 'Internal Server Error',
          message: errObj.message || 'Erro interno ao processar upload.',
        });
      }
    }
  );

  /**
   * GET /storage/files/:id/view — Redireciona para visualização pública/pré-assinada de foto/arquivo
   */
  fastify.get<{ Params: { id: string } }>(
    '/storage/files/:id/view',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const fileId = request.params.id;
      try {
        const queryRes = await adminPool.query(
          `SELECT tenant_id FROM storage_files WHERE id::text = $1 OR file_key = $1 LIMIT 1`,
          [fileId]
        );
        if (queryRes.rows.length === 0) {
          return reply.code(404).send({ statusCode: 404, message: 'Arquivo não encontrado.' });
        }
        const tenantId = queryRes.rows[0].tenant_id;
        const result = await storageService.getPresignedDownloadUrl(tenantId, fileId, 3600);
        return reply.redirect(result.downloadUrl);
      } catch {
        return reply.code(404).send({ statusCode: 404, message: 'Arquivo não encontrado ou indisponível.' });
      }
    }
  );

  /**
   * POST /storage/presigned-upload — Gera URL pré-assinada para upload direto S3/MinIO
   */
  fastify.post(
    '/storage/presigned-upload',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;

      try {
        const body = PresignedUploadRequestSchema.parse(request.body);
        const presigned = await storageService.getPresignedUploadUrl(tenantId, body);
        return reply.code(200).send(presigned);
      } catch (err: unknown) {
        if (err instanceof QuotaExceededError) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            code: err.code,
            message: err.message,
          });
        }

        const errObj = err as { statusCode?: number; message?: string };
        const code = errObj.statusCode || 400;
        return reply.code(code).send({
          statusCode: code,
          error: code === 403 ? 'Forbidden' : 'Bad Request',
          message: errObj.message || 'Requisição inválida para geração de URL de upload.',
        });
      }
    }
  );

  /**
   * GET /storage/files/:id/url — Gera URL pré-assinada de visualização segura
   * Garante isolamento estrito: rejeita acesso cruzado entre oficinas.
   */
  fastify.get<{ Params: { id: string } }>(
    '/storage/files/:id/url',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const fileId = request.params.id;

      try {
        const result = await storageService.getPresignedDownloadUrl(tenantId, fileId);
        return reply.code(200).send(result);
      } catch (err: unknown) {
        if (err instanceof StorageForbiddenError) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            code: err.code,
            message: err.message,
          });
        }

        if (err instanceof StorageNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            code: err.code,
            message: err.message,
          });
        }

        const errObj = err as { statusCode?: number; message?: string };
        const code = errObj.statusCode || 500;
        return reply.code(code).send({
          statusCode: code,
          error: code === 403 ? 'Forbidden' : 'Internal Server Error',
          message: errObj.message || 'Falha ao gerar link do arquivo.',
        });
      }
    }
  );

  /**
   * GET /tenant/storage-usage — Consulta consumo de disco e quotas da oficina
   */
  fastify.get(
    '/tenant/storage-usage',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const usage = await storageService.getTenantStorageUsage(tenantId);
      return reply.code(200).send(usage);
    }
  );

  /**
   * DELETE /storage/files/:id — Exclui arquivo do MinIO e do banco com isolamento
   */
  fastify.delete<{ Params: { id: string } }>(
    '/storage/files/:id',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const fileId = request.params.id;

      try {
        await storageService.deleteFile(tenantId, fileId);
        return reply.code(200).send({ success: true, message: 'Arquivo excluído com sucesso.' });
      } catch (err: unknown) {
        if (err instanceof StorageNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }

        const errObj = err as { statusCode?: number; message?: string };
        const code = errObj.statusCode || 500;
        return reply.code(code).send({
          statusCode: code,
          error: 'Error',
          message: errObj.message || 'Falha ao excluir arquivo.',
        });
      }
    }
  );

  /**
   * GET /storage/files — Lista arquivos da oficina com URLs assinadas
   */
  fastify.get<{ Querystring: { category?: string } }>(
    '/storage/files',
    {
      preHandler: [authenticateBearer, requireTenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const category = request.query?.category;
      const files = await storageService.listFiles(tenantId, category);
      return reply.code(200).send(files);
    }
  );
}

export default storageRoutes;

