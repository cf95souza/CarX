import crypto from 'node:crypto';
import { tenantQuery } from '../database/tenant-query.js';
import type { CreateApiKeyInputDto, ApiKeyDto, CreateApiKeyResponseDto } from '@carx/shared';

// Controle de Rate Limit em memória (janela deslizante de 1 minuto)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

export class ApiKeyService {
  /**
   * Gera uma nova chave de API com prefixo identificável e hash SHA-256 no banco
   */
  static async generateApiKey(
    tenantId: string,
    input: CreateApiKeyInputDto,
    userId?: string
  ): Promise<CreateApiKeyResponseDto> {
    // 32 bytes de entropia criptográfica => 64 caracteres hexadecimais
    const randomHex = crypto.randomBytes(32).toString('hex');
    const fullToken = `carx_live_${randomHex}`;
    const prefix = `carx_live_${randomHex.substring(0, 4)}...${randomHex.substring(randomHex.length - 4)}`;

    // Hash SHA-256 para persistência segura
    const keyHash = crypto.createHash('sha256').update(fullToken).digest('hex');

    let expiresAt: Date | null = null;
    if (input.expiresInDays && input.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + input.expiresInDays * 86400000);
    }

    const permissionsJson = JSON.stringify(input.permissions || ['read:work_orders', 'read:customers']);

    const query = `
      INSERT INTO api_keys (
        tenant_id,
        name,
        key_hash,
        prefix,
        permissions,
        status,
        rate_limit_per_minute,
        created_by,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, 'active', $6, $7, $8)
      RETURNING id, tenant_id, name, prefix, permissions, status, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at
    `;

    const result = await tenantQuery(tenantId, query, [
      tenantId,
      input.name,
      keyHash,
      prefix,
      permissionsJson,
      input.rateLimitPerMinute || 60,
      userId || null,
      expiresAt ? expiresAt.toISOString() : null,
    ]);

    const row = result.rows[0];
    const apiKey: ApiKeyDto = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      prefix: row.prefix,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      status: row.status,
      rateLimitPerMinute: row.rate_limit_per_minute,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };

    return {
      apiKey,
      token: fullToken,
    };
  }

  /**
   * Lista todas as chaves de API do tenant (apenas prefixo público, sem token e sem hash)
   */
  static async listApiKeys(tenantId: string): Promise<ApiKeyDto[]> {
    const query = `
      SELECT id, tenant_id, name, prefix, permissions, status, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at
      FROM api_keys
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;

    const result = await tenantQuery(tenantId, query, [tenantId]);

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      prefix: row.prefix,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      status: row.status,
      rateLimitPerMinute: row.rate_limit_per_minute,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  /**
   * Revoga imediatamente uma chave de API
   */
  static async revokeApiKey(tenantId: string, apiKeyId: string): Promise<boolean> {
    const query = `
      UPDATE api_keys
      SET status = 'revoked',
          revoked_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND status = 'active'
      RETURNING id
    `;

    const result = await tenantQuery(tenantId, query, [apiKeyId, tenantId]);
    return result.rows.length > 0;
  }

  /**
   * Autentica uma requisição com API Key, valida hash, status, expiração e rate limit
   */
  static async authenticateKey(rawToken: string): Promise<{
    authenticated: boolean;
    error?: string;
    statusCode?: number;
    apiKey?: ApiKeyDto;
    tenantId?: string;
    limit?: number;
    remaining?: number;
    resetInSeconds?: number;
  }> {
    if (!rawToken || !rawToken.startsWith('carx_live_')) {
      return { authenticated: false, error: 'Chave de API inválida ou mal formatada', statusCode: 401 };
    }

    const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Bypass RLS aqui pois precisamos localizar o tenant da chave a partir do hash único
    const query = `
      SELECT id, tenant_id, name, prefix, permissions, status, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at
      FROM api_keys
      WHERE key_hash = $1
    `;

    const result = await tenantQuery(null, query, [keyHash], { bypassRls: true });
    if (result.rows.length === 0) {
      return { authenticated: false, error: 'Chave de API não encontrada', statusCode: 401 };
    }

    const row = result.rows[0];

    // Verificar se foi revogada
    if (row.status === 'revoked' || row.revoked_at !== null) {
      return { authenticated: false, error: 'Chave de API revogada', statusCode: 401 };
    }

    // Verificar se expirou
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      return { authenticated: false, error: 'Chave de API expirada', statusCode: 401 };
    }

    const limit = row.rate_limit_per_minute || 60;
    const now = Date.now();

    // Verificação de Rate Limit (1 minuto)
    let bucket = rateLimitStore.get(row.id);
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 1,
        resetAt: now + 60000,
      };
      rateLimitStore.set(row.id, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, limit - bucket.count);
    const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    if (bucket.count > limit) {
      return {
        authenticated: false,
        error: 'Limite de requisições excedido (Rate limit exceeded)',
        statusCode: 429,
        limit,
        remaining: 0,
        resetInSeconds,
      };
    }

    // Atualizar last_used_at de forma não-bloqueante
    tenantQuery(
      row.tenant_id,
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [row.id]
    ).catch(() => {});

    const apiKey: ApiKeyDto = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      prefix: row.prefix,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      status: row.status,
      rateLimitPerMinute: row.rate_limit_per_minute,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };

    return {
      authenticated: true,
      apiKey,
      tenantId: row.tenant_id,
      limit,
      remaining,
      resetInSeconds,
    };
  }

  /**
   * Limpa cache de rate limit (útil para testes)
   */
  static clearRateLimitStore(): void {
    rateLimitStore.clear();
  }
}

