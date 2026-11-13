import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const connectionString =
  process.env.DATABASE_ADMIN_URL ||
  process.env.DATABASE_URL ||
  'postgresql://carx_dev_user:carx_dev_password@127.0.0.1:5433/carx_dev';

const pool = new pg.Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 10000,
});

async function ensureMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _carx_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<string[]> {
  const result = await client.query<{ name: string }>(
    'SELECT name FROM _carx_migrations ORDER BY id ASC;'
  );
  return result.rows.map((row) => row.name);
}

export async function up(): Promise<void> {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log(`[MIGRATE] Diretório de migrations não encontrado: ${MIGRATIONS_DIR}`);
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.up.sql'))
      .sort();

    const pending = files.filter((file) => !applied.includes(file));

    if (pending.length === 0) {
      console.log('✅ [MIGRATE] Banco de dados já está atualizado. Nenhuma migration pendente.');
      return;
    }

    console.log(`🚀 [MIGRATE] Executando ${pending.length} migration(s) pendente(s)...`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`   ⚙️ Aplicando: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _carx_migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`   ✔️ Aplicada com sucesso: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Falha ao aplicar migration ${file}:`, err);
        throw err;
      }
    }

    console.log('🎉 [MIGRATE] Todas as migrations foram aplicadas com sucesso!');
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    if (applied.length === 0) {
      console.log('ℹ️ [MIGRATE] Nenhuma migration aplicada para reverter.');
      return;
    }

    const lastApplied = applied[applied.length - 1];
    const downFile = lastApplied.replace('.up.sql', '.down.sql');
    const downPath = path.join(MIGRATIONS_DIR, downFile);

    if (!fs.existsSync(downPath)) {
      throw new Error(`Arquivo de rollback não encontrado para ${lastApplied}: esperado ${downFile}`);
    }

    const sql = fs.readFileSync(downPath, 'utf-8');
    console.log(`⏪ [MIGRATE] Revertendo: ${downFile}...`);

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('DELETE FROM _carx_migrations WHERE name = $1;', [lastApplied]);
      await client.query('COMMIT');
      console.log(`   ✔️ Rollback concluído com sucesso: ${lastApplied}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Falha ao reverter ${downFile}:`, err);
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function status(): Promise<void> {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const appliedResult = await client.query<{ name: string; applied_at: Date }>(
      'SELECT name, applied_at FROM _carx_migrations ORDER BY id ASC;'
    );
    const appliedMap = new Map<string, Date>(
      appliedResult.rows.map((r) => [r.name, r.applied_at])
    );

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.up.sql')).sort()
      : [];

    console.log('\n📊 [MIGRATE STATUS] Status das Migrations:');
    console.log('------------------------------------------------------------');
    for (const file of files) {
      if (appliedMap.has(file)) {
        const date = appliedMap.get(file)?.toISOString();
        console.log(` [APLICADA]  ${file} (em: ${date})`);
      } else {
        console.log(` [PENDENTE]  ${file}`);
      }
    }
    console.log('------------------------------------------------------------\n');
  } finally {
    client.release();
  }
}

export async function reset(): Promise<void> {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    let applied = await getAppliedMigrations(client);

    console.log(`⚠️ [MIGRATE RESET] Revertendo ${applied.length} migration(s)...`);
    while (applied.length > 0) {
      await down();
      applied = await getAppliedMigrations(client);
    }

    console.log('🔄 [MIGRATE RESET] Reaplicando todas as migrations...');
    await up();
  } finally {
    client.release();
  }
}

// Execução direta via CLI: tsx src/database/migrate.ts [up|down|status|reset]
const command = process.argv[2] || 'up';

async function main() {
  try {
    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else if (command === 'status') {
      await status();
    } else if (command === 'reset') {
      await reset();
    } else {
      console.error(`Comando desconhecido: "${command}". Use: up | down | status | reset`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Erro na execução do migrate:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))
) {
  main();
}

