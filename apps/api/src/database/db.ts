import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Fixar fuso horário oficial da aplicação para America/Sao_Paulo
process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

// Parse do pg para retornar DATE (OID 1082) como string 'YYYY-MM-DD' sem distorção de timezone
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL || 'postgresql://carx_dev_user:carx_dev_password@localhost:5433/carx_dev?schema=public',
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Sao_Paulo'").catch((err) => {
    console.error('[ERRO] Falha ao configurar fuso America/Sao_Paulo na conexão:', err);
  });
});

/**
 * Executa uma consulta direta no pool com parâmetros
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Executa uma operação em transação segura
 */
export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
