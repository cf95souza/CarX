import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { tenantQuery } from '../database/tenant-query.js';
import { planService } from '../plans/plan-service.js';
import {
  validateFileMagicBytes,
  isDangerousExecutableOrScript,
  ALLOWED_MIME_TYPES,
  type AllowedMimeType,
} from './magic-bytes.js';
import {
  StorageFileDto,
  StorageFileCategory,
  type StorageFileCategoryType,
  PresignedUploadRequestDto,
  PresignedUploadResponseDto,
  TenantStorageUsageDto,
} from '@carx/shared';

export class StorageForbiddenError extends Error {
  public statusCode = 403;
  public code = 'CROSS_TENANT_ACCESS_DENIED';

  constructor(message = 'Acesso negado: você não tem permissão para acessar arquivos desta oficina.') {
    super(message);
    this.name = 'StorageForbiddenError';
  }
}

export class StorageNotFoundError extends Error {
  public statusCode = 404;
  public code = 'FILE_NOT_FOUND';

  constructor(message = 'Arquivo não encontrado.') {
    super(message);
    this.name = 'StorageNotFoundError';
  }
}

export class StorageSecurityError extends Error {
  public statusCode = 400;
  public code = 'SECURITY_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'StorageSecurityError';
  }
}

export interface UploadBufferParams {
  buffer: Buffer;
  originalName: string;
  declaredMimeType?: string;
  category?: StorageFileCategoryType;
  entityId?: string | null;
  uploaderUserId?: string | null;
  metadata?: Record<string, unknown>;
}

export class StorageService {
  private s3: S3Client;
  private defaultBucket: string;
  private bucketInitialized = false;

  constructor() {
    const minioHost = process.env.MINIO_ENDPOINT || '127.0.0.1';
    const minioPort = process.env.MINIO_PORT || '9000';
    const useSsl = process.env.MINIO_USE_SSL === 'true';
    const protocol = useSsl ? 'https' : 'http';

    const accessKeyId =
      process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretAccessKey =
      process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

    this.defaultBucket = process.env.MINIO_BUCKET_MEDIA || 'carx-media';

    this.s3 = new S3Client({
      endpoint: `${protocol}://${minioHost}:${minioPort}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Garante a existência do bucket no MinIO na inicialização
   */
  async ensureBucketExists(bucketName = this.defaultBucket): Promise<void> {
    if (this.bucketInitialized) return;

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.bucketInitialized = true;
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: bucketName }));
        this.bucketInitialized = true;
      } catch (createErr) {
        // Não quebra a inicialização se MinIO estiver temporariamente indisponível
      }
    }
  }

  /**
   * Sanitiza nomes de arquivo e previne Path Traversal
   */
  private sanitizeFileName(fileName: string): string {
    const base = path.basename(fileName);
    // Remove caracteres especiais perigosos
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Gera a chave S3 segura no padrão isolado por oficina: tenant/{tenantId}/{category}/{uuid}-{fileName}
   */
  private buildFileKey(
    tenantId: string,
    category: string,
    originalName: string,
    extension: string
  ): string {
    const cleanCategory = (category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanName = this.sanitizeFileName(originalName);
    const uuid = crypto.randomUUID();
    const safeExt = extension.replace(/^\./, '').toLowerCase();

    return `tenant/${tenantId}/${cleanCategory}/${uuid}-${cleanName}${safeExt ? `.${safeExt}` : ''}`;
  }

  /**
   * Valida se uma chave S3 pertence estritamente ao tenant especificado
   */
  public assertTenantFileKey(tenantId: string, fileKey: string): void {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new StorageSecurityError('Chave de arquivo inválida.');
    }

    // Prevenção contra Path Traversal (ex: ../../tenant2/...)
    if (fileKey.includes('..') || fileKey.startsWith('/') || fileKey.includes('\\')) {
      throw new StorageSecurityError('Tentativa de navegação de caminho (Path Traversal) bloqueada.');
    }

    const expectedPrefix = `tenant/${tenantId}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      throw new StorageForbiddenError(
        'Acesso negado: a chave do arquivo não pertence ao diretório isolado da sua oficina.'
      );
    }
  }

  /**
   * Realiza upload de arquivo em buffer com validação estrita de Magic Bytes e Cotas
   */
  async uploadFile(tenantId: string, params: UploadBufferParams): Promise<StorageFileDto> {
    await this.ensureBucketExists();

    const {
      buffer,
      originalName,
      declaredMimeType,
      category = StorageFileCategory.GENERAL,
      entityId = null,
      uploaderUserId = null,
      metadata = {},
    } = params;

    // 1. Validação compulsória de Magic Bytes
    const detected = validateFileMagicBytes(buffer, declaredMimeType, originalName);

    // 2. Verificação de cota de armazenamento no plano da oficina
    await planService.assertQuota(tenantId, 'storage', buffer.length);

    // 3. Montagem da chave isolada no MinIO
    const fileKey = this.buildFileKey(tenantId, category, originalName, detected.extension);

    // 4. Envio binário para o MinIO / S3 com Fallback Local Resiliente
    let targetBucket = this.defaultBucket;
    try {
      await this.ensureBucketExists();
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.defaultBucket,
          Key: fileKey,
          Body: buffer,
          ContentType: detected.mime,
          Metadata: {
            'tenant-id': tenantId,
            'original-name': encodeURIComponent(originalName),
          },
        })
      );
    } catch (s3Err: any) {
      console.warn(`[StorageService] MinIO offline (${s3Err.message}). Utilizando storage local resiliente.`);
      targetBucket = 'local';
      try {
        const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR || '/tmp/carx-storage', tenantId, category);
        fs.mkdirSync(localDir, { recursive: true });
        const localPath = path.join(localDir, path.basename(fileKey));
        fs.writeFileSync(localPath, buffer);
      } catch (fsErr: any) {
        console.error('[StorageService] Falha ao persistir em storage local:', fsErr.message);
      }
    }

    // 5. Registro na tabela storage_files sob o contexto de RLS
    const res = await tenantQuery<StorageFileDto>(
      tenantId,
      `INSERT INTO storage_files (
        tenant_id,
        file_key,
        bucket_name,
        original_name,
        mime_type,
        real_mime_type,
        size_bytes,
        category,
        entity_id,
        uploader_user_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        tenantId,
        fileKey,
        targetBucket,
        originalName,
        declaredMimeType || detected.mime,
        detected.mime,
        buffer.length,
        category,
        entityId,
        uploaderUserId,
        JSON.stringify(metadata),
      ]
    );

    return res.rows[0];
  }

  /**
   * Gera URL pré-assinada para upload direto cliente-MinIO (Direct to S3)
   */
  async getPresignedUploadUrl(
    tenantId: string,
    params: PresignedUploadRequestDto
  ): Promise<PresignedUploadResponseDto> {
    await this.ensureBucketExists();

    const { fileName, mimeType, sizeBytes, category = StorageFileCategory.GENERAL } = params;

    // Checagem de segurança inicial do tipo MIME declarado
    if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
      throw new StorageSecurityError(
        `Tipo MIME "${mimeType}" não é permitido para upload na plataforma CarX.`
      );
    }

    // Bloqueia tentativas de envio de SVG ou scripts
    if (mimeType.includes('svg') || mimeType.includes('html') || mimeType.includes('javascript')) {
      throw new StorageSecurityError('SVG ou arquivos de script não são permitidos.');
    }

    // Validação antecipada da cota do plano
    await planService.assertQuota(tenantId, 'storage', sizeBytes);

    const ext = path.extname(fileName).replace(/^\./, '') || 'bin';
    const fileKey = this.buildFileKey(tenantId, category, fileName, ext);

    const expiresInSeconds = 900; // 15 minutos

    const command = new PutObjectCommand({
      Bucket: this.defaultBucket,
      Key: fileKey,
      ContentType: mimeType,
      Metadata: {
        'tenant-id': tenantId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds,
      bucketName: this.defaultBucket,
    };
  }

  /**
   * Gera URL pré-assinada de leitura/download com verificação estrita de posse do tenant
   */
  async getDownloadUrl(
    tenantId: string,
    fileIdOrKey: string,
    expiresInSeconds = 900
  ): Promise<{ downloadUrl: string; file: StorageFileDto }> {
    return this.getPresignedDownloadUrl(tenantId, fileIdOrKey, expiresInSeconds);
  }

  async getPresignedDownloadUrl(
    tenantId: string,
    fileIdOrKey: string,
    expiresInSeconds = 900
  ): Promise<{ downloadUrl: string; file: StorageFileDto }> {
    // 1. Localiza o registro do arquivo via tenantQuery (RLS isola consultas de outros tenants)
    const res = await tenantQuery<StorageFileDto>(
      tenantId,
      `SELECT * FROM storage_files
       WHERE tenant_id = $1 AND (id::text = $2 OR file_key = $2)
       LIMIT 1;`,
      [tenantId, fileIdOrKey]
    );

    if (res.rows.length === 0) {
      throw new StorageNotFoundError(
        'Arquivo não encontrado ou você não possui permissão para acessá-lo.'
      );
    }

    const file = res.rows[0];

    // 2. Barreira adicional: valida prefixo tenant/{tenantId}/ na chave S3
    this.assertTenantFileKey(tenantId, file.file_key);

    // Se o arquivo estiver armazenado localmente via fallback resiliente
    if (file.bucket_name === 'local') {
      const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR || '/tmp/carx-storage', tenantId, file.category || 'general');
      const localPath = path.join(localDir, path.basename(file.file_key));
      if (fs.existsSync(localPath)) {
        const fileData = fs.readFileSync(localPath);
        const dataUrl = `data:${file.mime_type || 'image/png'};base64,${fileData.toString('base64')}`;
        return {
          downloadUrl: dataUrl,
          file,
        };
      }
    }

    // 3. Gera URL de leitura assinada
    const command = new GetObjectCommand({
      Bucket: file.bucket_name || this.defaultBucket,
      Key: file.file_key,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });

    return {
      downloadUrl,
      file,
    };
  }

  /**
   * Retorna o uso de armazenamento em disco da oficina versus a cota do plano contratado
   */
  async getTenantStorageUsage(tenantId: string): Promise<TenantStorageUsageDto> {
    const details = await planService.getTenantPlanDetails(tenantId);

    const countRes = await tenantQuery<{ total_files: string; total_bytes: string }>(
      tenantId,
      `SELECT COUNT(*)::text as total_files, COALESCE(SUM(size_bytes), 0)::text as total_bytes
       FROM storage_files
       WHERE tenant_id = $1;`,
      [tenantId]
    );

    const usedBytes = Number(countRes.rows[0]?.total_bytes || '0');
    const totalFiles = Number(countRes.rows[0]?.total_files || '0');
    const quotaMb = details.effectiveLimits.max_storage_mb || 1024;
    const quotaBytes = quotaMb * 1024 * 1024;
    const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
    const usagePercentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 10000) / 100);

    return {
      tenantId,
      usedBytes,
      usedMb,
      quotaMb,
      usagePercentage,
      totalFiles,
    };
  }

  /**
   * Exclui um arquivo do MinIO e da tabela storage_files
   */
  async deleteFile(tenantId: string, fileId: string): Promise<boolean> {
    const res = await tenantQuery<StorageFileDto>(
      tenantId,
      `SELECT * FROM storage_files WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, fileId]
    );

    if (res.rows.length === 0) {
      throw new StorageNotFoundError('Arquivo não encontrado.');
    }

    const file = res.rows[0];
    this.assertTenantFileKey(tenantId, file.file_key);

    // Remove do MinIO
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: file.bucket_name || this.defaultBucket,
        Key: file.file_key,
      })
    );

    // Remove do banco
    await tenantQuery(tenantId, 'DELETE FROM storage_files WHERE tenant_id = $1 AND id = $2;', [
      tenantId,
      fileId,
    ]);

    return true;
  }

  /**
   * Obtém o conteúdo de um arquivo diretamente como Buffer (para geração de PDFs, processamento, etc.)
   */
  async getFileBuffer(tenantId: string, fileId: string): Promise<Buffer> {
    const res = await tenantQuery<StorageFileDto>(
      tenantId,
      `SELECT * FROM storage_files WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, fileId]
    );

    if (res.rows.length === 0) {
      throw new StorageNotFoundError('Arquivo não encontrado.');
    }

    const file = res.rows[0];
    this.assertTenantFileKey(tenantId, file.file_key);

    if (file.bucket_name === 'local') {
      const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR || '/tmp/carx-storage', tenantId, file.category || 'general');
      const localPath = path.join(localDir, path.basename(file.file_key));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: file.bucket_name || this.defaultBucket,
          Key: file.file_key,
        })
      );

      if (!response.Body) {
        throw new Error('Conteúdo do arquivo vazio no MinIO.');
      }

      // AWS SDK v3 Body stream conversion
      const byteArray = await (response.Body as any).transformToByteArray();
      return Buffer.from(byteArray);
    } catch (s3Err: any) {
      const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR || '/tmp/carx-storage', tenantId, file.category || 'general');
      const localPath = path.join(localDir, path.basename(file.file_key));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      throw s3Err;
    }
  }

  /**
   * Lista arquivos do tenant (opcionalmente filtrados por category)
   */
  async listFiles(tenantId: string, category?: string): Promise<Array<StorageFileDto & { downloadUrl: string; url: string }>> {
    const params: unknown[] = [tenantId];
    let whereClause = 'tenant_id = $1';
    if (category) {
      params.push(category);
      whereClause += ` AND category = $${params.length}`;
    }

    const res = await tenantQuery<StorageFileDto>(
      tenantId,
      `SELECT * FROM storage_files WHERE ${whereClause} ORDER BY created_at DESC LIMIT 100;`,
      params
    );

    const filesWithUrls = await Promise.all(
      res.rows.map(async (file) => {
        try {
          const { downloadUrl } = await this.getPresignedDownloadUrl(tenantId, file.id!);
          return { ...file, downloadUrl, url: downloadUrl };
        } catch {
          return { ...file, downloadUrl: '', url: '' };
        }
      })
    );

    return filesWithUrls;
  }
}

export const storageService = new StorageService();

