import pg from 'pg';
import { pool } from './db.js';

export class TenantIsolationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'TenantIsolationError';
    this.statusCode = statusCode;
  }
}

export interface TenantQueryOptions {
  isSuperadmin?: boolean;
  bypassRls?: boolean;
  client?: pg.PoolClient;
}

/**
 * Valida o identificador de tenant para garantir padrão Fail-Closed (Default Deny).
 */
function validateTenantId(tenantId: string | null | undefined, options: TenantQueryOptions): string {
  const isBypass = options.isSuperadmin || options.bypassRls;

  if (!isBypass) {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new TenantIsolationError(
        'Isolamento Multi-Tenant (RLS): tenant_id é estritamente obrigatório para esta consulta (Fail Closed).'
      );
    }
  }

  return tenantId ? tenantId.trim() : '';
}

/**
 * Configura as variáveis de sessão no PostgreSQL para ativar as políticas de Row Level Security (RLS).
 */
async function applySessionContext(
  client: pg.PoolClient,
  tenantId: string,
  options: TenantQueryOptions
): Promise<void> {
  if (options.isSuperadmin) {
    await client.query("SET LOCAL app.is_superadmin = 'true'");
  } else if (options.bypassRls) {
    await client.query("SET LOCAL app.bypass_rls = 'true'");
  } else {
    // is_local = true garante que a configuração se encerra no fim da transação atual
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);
  }
}

/**
 * Executa uma consulta isolada por tenant no PostgreSQL com contexto de RLS garantido.
 */
export async function tenantQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  tenantId: string | null | undefined,
  sqlText: string,
  params: unknown[] = [],
  options: TenantQueryOptions = {}
): Promise<pg.QueryResult<T>> {
  const validTenantId = validateTenantId(tenantId, options);

  // Se um cliente de transação existente foi fornecido, reusa-o
  if (options.client) {
    await applySessionContext(options.client, validTenantId, options);
    return options.client.query<T>(sqlText, params);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await applySessionContext(client, validTenantId, options);
    const result = await client.query<T>(sqlText, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Executa um bloco transacional completo isolado por tenant com contexto de RLS garantido.
 */
export async function tenantTransaction<T>(
  tenantId: string | null | undefined,
  callback: (client: pg.PoolClient) => Promise<T>,
  options: TenantQueryOptions = {}
): Promise<T> {
  const validTenantId = validateTenantId(tenantId, options);

  const client = options.client || (await pool.connect());
  const isOwner = !options.client;

  try {
    if (isOwner) {
      await client.query('BEGIN');
    }

    await applySessionContext(client, validTenantId, options);
    const result = await callback(client);

    if (isOwner) {
      await client.query('COMMIT');
    }

    return result;
  } catch (err) {
    if (isOwner) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (isOwner) {
      client.release();
    }
  }
}

export default {
  tenantQuery,
  tenantTransaction,
  TenantIsolationError,
};
