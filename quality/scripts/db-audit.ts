import { adminPool } from '../../apps/api/src/database/db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function auditPostgres() {
  console.log('Auditoria do PostgreSQL iniciando...');

  // 1. Configuração e limites do banco
  const settingsRes = await adminPool.query(`
    SELECT name, setting, unit 
    FROM pg_settings 
    WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem');
  `);

  // 2. Conexões ativas
  const connsRes = await adminPool.query(`
    SELECT datname, count(*) as total_connections,
           count(*) FILTER (WHERE state = 'active') as running_queries,
           count(*) FILTER (WHERE state = 'idle') as idle_connections
    FROM pg_stat_activity
    GROUP BY datname;
  `);

  // 3. Verificação de RLS em tabelas com tenant_id
  const rlsRes = await adminPool.query(`
    SELECT c.relname as table_name,
           c.relrowsecurity as rls_enabled,
           c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col 
        WHERE col.table_schema = 'public' 
          AND col.table_name = c.relname 
          AND col.column_name = 'tenant_id'
      )
    ORDER BY c.relname;
  `);

  // 4. Verificação de locks bloqueantes
  const locksRes = await adminPool.query(`
    SELECT blocked_locks.pid AS blocked_pid,
           blocked_activity.usename AS blocked_user,
           blocking_locks.pid AS blocking_pid,
           blocking_activity.usename AS blocking_user,
           blocked_activity.query AS blocked_statement
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
  `);

  const report = {
    timestamp: new Date().toISOString(),
    databaseSettings: settingsRes.rows,
    connectionStats: connsRes.rows,
    tenantTablesRlsAudit: {
      totalTenantTables: rlsRes.rows.length,
      allRlsEnabled: rlsRes.rows.every((r: any) => r.rls_enabled && r.rls_forced),
      tables: rlsRes.rows,
    },
    blockingLocks: locksRes.rows,
  };

  const evidenceDir = path.resolve(__dirname, '..', 'evidence');
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, 'postgres-audit.json');
  await fs.writeFile(evidencePath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Auditoria do PostgreSQL concluída com sucesso! Evidência gravada em ${evidencePath}`);
  await adminPool.end();
}

auditPostgres().catch(err => {
  console.error('Erro na auditoria do PostgreSQL:', err);
  process.exit(1);
});
