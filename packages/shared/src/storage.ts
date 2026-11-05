import { z } from 'zod';

export const StorageFileCategory = {
  WORK_ORDER: 'work_order',
  INSPECTION: 'inspection',
  BRANDING: 'branding',
  DOCUMENT: 'document',
  GENERAL: 'general',
} as const;

export type StorageFileCategoryType = (typeof StorageFileCategory)[keyof typeof StorageFileCategory];

export const StorageFileSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  file_key: z.string().min(1),
  bucket_name: z.string().min(1).default('carx-media'),
  original_name: z.string().min(1),
  mime_type: z.string().min(1),
  real_mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  category: z.nativeEnum(StorageFileCategory).default(StorageFileCategory.GENERAL),
  entity_id: z.string().uuid().nullable().optional(),
  uploader_user_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.union([z.string(), z.date()]).optional(),
  updated_at: z.union([z.string(), z.date()]).optional(),
});

export type StorageFileDto = z.infer<typeof StorageFileSchema>;

export const PresignedUploadRequestSchema = z.object({
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  mimeType: z.string().min(1, 'Tipo MIME é obrigatório'),
  sizeBytes: z.number().int().positive('Tamanho do arquivo deve ser positivo'),
  category: z.nativeEnum(StorageFileCategory).default(StorageFileCategory.GENERAL),
  entityId: z.string().uuid().optional(),
});

export type PresignedUploadRequestDto = z.infer<typeof PresignedUploadRequestSchema>;

export interface PresignedUploadResponseDto {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
  bucketName: string;
}

export interface TenantStorageUsageDto {
  tenantId: string;
  usedBytes: number;
  usedMb: number;
  quotaMb: number;
  usagePercentage: number;
  totalFiles: number;
}

