import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Fixar fuso horário oficial da aplicação para America/Sao_Paulo
process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

// Parse do pg para retornar DATE (OID 1082) como string 'YYYY-MM-DD' sem distorção de timezone
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const { Pool } = pg;

const appConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://carx_app:carx_local_secret_password@127.0.0.1:5433/carx_dev';

const adminConnectionString =
  process.env.DATABASE_ADMIN_URL ||
  'postgresql://carx_dev_user:carx_dev_password@127.0.0.1:5433/carx_dev';

/**
 * Pool principal da aplicação (Usuário carx_app COM NOBYPASSRLS)
 * Garante que nenhuma query consiga furar o isolamento das políticas de RLS.
 */
export const pool = new Pool({
  connectionString: appConnectionString,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Pool administrativo exclusivo para migrations, setup ou manutenção do sistema
 */
export const adminPool = new Pool({
  connectionString: adminConnectionString,
  max: 5,
  connectionTimeoutMillis: 10000,
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
