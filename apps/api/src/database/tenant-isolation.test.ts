import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminPool, pool } from './db.js';
import { tenantQuery, tenantTransaction, TenantIsolationError } from './tenant-query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('T2.2 — Contexto de Tenant e RLS (Row Level Security em Profundidade)', () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let tenantIsolatedTables: string[] = [];

  before(async () => {
    // 1. Descobrir dinamicamente todas as tabelas públicas que possuem a coluna tenant_id
    const catalogRes = await adminPool.query<{ table_name: string }>(`
      SELECT DISTINCT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
      ORDER BY table_name;
    `);

    tenantIsolatedTables = catalogRes.rows.map((r) => r.table_name);
    assert.ok(
      tenantIsolatedTables.length > 0,
      'O catálogo de tabelas isoladas por tenant_id não pode estar vazio.'
    );

    // 2. Limpar tenants de testes anteriores se existirem (Via adminPool de setup)
    await adminPool.query(
      "DELETE FROM tenants WHERE slug IN ('test-oficina-alpha', 'test-oficina-beta');"
    );

    // 3. Criar Oficina A e Oficina B no banco
    const resA = await adminPool.query<{ id: string; slug: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status)
      VALUES ('test-oficina-alpha', 'Oficina Alpha Teste', 'Oficina Alpha LTDA', 'alpha@teste.carx.com.br', 'active')
      RETURNING id, slug;
    `);
    tenantA = resA.rows[0];

    const resB = await adminPool.query<{ id: string; slug: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status)
      VALUES ('test-oficina-beta', 'Oficina Beta Teste', 'Oficina Beta LTDA', 'beta@teste.carx.com.br', 'active')
      RETURNING id, slug;
    `);
    tenantB = resB.rows[0];

    assert.ok(tenantA.id, 'Tenant A deve ter sido criado com sucesso');
    assert.ok(tenantB.id, 'Tenant B deve ter sido criado com sucesso');
    assert.notEqual(tenantA.id, tenantB.id, 'Tenants A e B devem ter IDs distintos');
  });

  after(async () => {
    // Limpeza garantida dos tenants e registros de teste
    if (tenantA?.id && tenantB?.id) {
      await adminPool.query(
        'DELETE FROM tenants WHERE id IN ($1, $2);',
        [tenantA.id, tenantB.id]
      );
    }
    await pool.end();
    await adminPool.end();
  });

  it('deve confirmar que TODAS as tabelas com tenant_id e a tabela tenants possuem RLS e FORCE RLS ativados', async () => {
    const rlsAudit = await adminPool.query<{
      table_name: string;
      has_rls: boolean;
      has_force_rls: boolean;
    }>(`
      SELECT c.relname AS table_name, c.relrowsecurity AS has_rls, c.relforcerowsecurity AS has_force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname IN (
          SELECT DISTINCT table_name 
          FROM information_schema.columns 
          WHERE column_name = 'tenant_id' AND table_schema = 'public'
          UNION
          SELECT 'tenants'
        )
      ORDER BY c.relname;
    `);

    assert.ok(rlsAudit.rows.length >= tenantIsolatedTables.length);

    for (const row of rlsAudit.rows) {
      assert.equal(
        row.has_rls,
        true,
        `Tabela "${row.table_name}" deve possuir Row Level Security (RLS) habilitado`
      );
      assert.equal(
        row.has_force_rls,
        true,
        `Tabela "${row.table_name}" deve possuir FORCE ROW LEVEL SECURITY habilitado`
      );
    }
  });

  it('deve rejeitar consultas sem tenant_id (Fail-Closed / Default Deny)', async () => {
    await assert.rejects(
      async () => {
        await tenantQuery(null, 'SELECT 1');
      },
      (err: Error) => {
        assert.ok(err instanceof TenantIsolationError);
        assert.equal((err as TenantIsolationError).statusCode, 403);
        assert.match(err.message, /tenant_id é estritamente obrigatório/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await tenantQuery('', 'SELECT 1');
      },
      TenantIsolationError
    );

    await assert.rejects(
      async () => {
        await tenantTransaction('   ', async () => {});
      },
      TenantIsolationError
    );
  });

  it('deve isolar a tabela "tenants": Oficina A não pode ver o registro da Oficina B', async () => {
    const resA = await tenantQuery<{ id: string; slug: string }>(
      tenantA.id,
      'SELECT id, slug FROM tenants;'
    );

    // Oficina A só pode ver a si mesma
    assert.equal(resA.rows.length, 1);
    assert.equal(resA.rows[0].id, tenantA.id);
    assert.equal(resA.rows[0].slug, 'test-oficina-alpha');

    // Nenhuma menção a Oficina B
    const foundB = resA.rows.find((r) => r.id === tenantB.id);
    assert.equal(foundB, undefined, 'Oficina A não pode enxergar o registro da Oficina B');
  });

  it('deve isolar a tabela "units" (filiais): Oficina A não pode ler, atualizar nem deletar filiais da Oficina B', async () => {
    // 1. Criar unidade pertencente à Oficina B
    const insertB = await tenantQuery<{ id: string }>(
      tenantB.id,
      `INSERT INTO units (tenant_id, name, slug) 
       VALUES ($1, 'Filial Beta Matriz', 'beta-matriz') 
       RETURNING id;`,
      [tenantB.id]
    );
    const unitBId = insertB.rows[0].id;

    // 2. Oficina A tenta LER filiais
    const selectA = await tenantQuery<{ id: string }>(
      tenantA.id,
      'SELECT id FROM units;'
    );
    assert.equal(selectA.rows.length, 0, 'Oficina A não deve ver a filial da Oficina B');

    // 3. Oficina A tenta ATUALIZAR a filial da Oficina B
    const updateA = await tenantQuery(
      tenantA.id,
      "UPDATE units SET name = 'Hackeada por Alpha' WHERE id = $1;",
      [unitBId]
    );
    assert.equal(updateA.rowCount, 0, 'UPDATE cruzado de A em B deve afetar 0 linhas');

    // 4. Oficina A tenta DELETAR a filial da Oficina B
    const deleteA = await tenantQuery(
      tenantA.id,
      'DELETE FROM units WHERE id = $1;',
      [unitBId]
    );
    assert.equal(deleteA.rowCount, 0, 'DELETE cruzado de A em B deve afetar 0 linhas');

    // 5. Oficina B acessa e comprova que seus dados continuam 100% intactos
    const selectB = await tenantQuery<{ id: string; name: string }>(
      tenantB.id,
      'SELECT id, name FROM units WHERE id = $1;',
      [unitBId]
    );
    assert.equal(selectB.rows.length, 1);
    assert.equal(selectB.rows[0].name, 'Filial Beta Matriz');
  });

  it('deve isolar a tabela "api_keys": chaves de integração da Oficina B são invisíveis para a Oficina A', async () => {
    // Criar chave para Oficina B
    const insertApiKey = await tenantQuery<{ id: string }>(
      tenantB.id,
      `INSERT INTO api_keys (tenant_id, name, key_hash, prefix)
       VALUES ($1, 'API Externa ERP', 'hash_secreto_sha256_beta', 'cx_live_')
       RETURNING id;`,
      [tenantB.id]
    );
    const apiKeyId = insertApiKey.rows[0].id;

    // Oficina A não enxerga
    const selectA = await tenantQuery(
      tenantA.id,
      'SELECT * FROM api_keys WHERE id = $1;',
      [apiKeyId]
    );
    assert.equal(selectA.rows.length, 0);

    // Oficina A não consegue deletar
    const deleteA = await tenantQuery(
      tenantA.id,
      'DELETE FROM api_keys WHERE id = $1;',
      [apiKeyId]
    );
    assert.equal(deleteA.rowCount, 0);

    // Oficina B vê sua chave normalmente
    const selectB = await tenantQuery(
      tenantB.id,
      'SELECT * FROM api_keys WHERE id = $1;',
      [apiKeyId]
    );
    assert.equal(selectB.rows.length, 1);
  });

  it('deve isolar a tabela "webhook_endpoints": Oficina A não pode disparar nem alterar webhooks da Oficina B', async () => {
    const insertWh = await tenantQuery<{ id: string }>(
      tenantB.id,
      `INSERT INTO webhook_endpoints (tenant_id, url, secret, events)
       VALUES ($1, 'https://beta.com/webhook', 'whsec_beta_123', ARRAY['os.completed'])
       RETURNING id;`,
      [tenantB.id]
    );
    const whId = insertWh.rows[0].id;

    const selectA = await tenantQuery(
      tenantA.id,
      'SELECT * FROM webhook_endpoints WHERE id = $1;',
      [whId]
    );
    assert.equal(selectA.rows.length, 0);

    const updateA = await tenantQuery(
      tenantA.id,
      "UPDATE webhook_endpoints SET url = 'https://malicious.com' WHERE id = $1;",
      [whId]
    );
    assert.equal(updateA.rowCount, 0);

    const selectB = await tenantQuery<{ url: string }>(
      tenantB.id,
      'SELECT url FROM webhook_endpoints WHERE id = $1;',
      [whId]
    );
    assert.equal(selectB.rows[0].url, 'https://beta.com/webhook');
  });

  it('deve permitir que Superadmin inspecione dados entre tenants (Bypass autorizado)', async () => {
    const superadminRes = await tenantQuery<{ id: string }>(
      null,
      'SELECT id FROM units;',
      [],
      { isSuperadmin: true }
    );

    // Superadmin consegue ler dados criados por qualquer tenant
    assert.ok(superadminRes.rows.length >= 1);
  });

  it('deve comprovar isolamento matemático em loop automático sobre o catálogo completo de tabelas com tenant_id', async () => {
    // Garante que nenhuma tabela com tenant_id passe desapercebida pelo RLS
    for (const tableName of tenantIsolatedTables) {
      // Inspeciona as políticas ativas da tabela
      const policies = await adminPool.query<{ polname: string; polcmd: string }>(`
        SELECT polname, polcmd
        FROM pg_policy pol
        JOIN pg_class c ON c.oid = pol.polrelid
        WHERE c.relname = $1;
      `, [tableName]);

      assert.ok(
        policies.rows.length > 0,
        `Tabela "${tableName}" do catálogo de dados DEVE possuir política de RLS registrada!`
      );

      const hasIsolationPolicy = policies.rows.some(
        (p) =>
          p.polname === 'tenant_isolation_policy' ||
          p.polname === `${tableName}_isolation`
      );
      assert.equal(
        hasIsolationPolicy,
        true,
        `Tabela "${tableName}" deve ter a política canônica "tenant_isolation_policy" ou "${tableName}_isolation"`
      );
    }
  });

  it('T7.2 — deve validar que todas as tabelas das Ondas 1, 2 e 3 da Fase 6 estão protegidas no catálogo RLS e isolam dados entre Oficina A e B', async () => {
    const waveTables = [
      'warranty_transfers',
      'minisite_portfolio_items',
      'minisite_leads',
      'tenant_fiscal_settings',
      'fiscal_invoices',
      'financial_categories',
      'financial_bills',
      'unit_transfers',
      'technician_offline_sync_logs',
      'ai_inspection_analyses',
      'crm_retention_rules',
      'tenant_customer_coupons',
      'crm_retention_contacts',
    ];

    for (const expectedTable of waveTables) {
      assert.ok(
        tenantIsolatedTables.includes(expectedTable),
        `A tabela da Fase 6 "${expectedTable}" deve constar no catálogo de tabelas isoladas por tenant_id`
      );
    }

    // Inserir dados sensíveis na Oficina B (Fiscal, Financeiro, CRM e Mini-Site)
    await tenantQuery(
      tenantB.id,
      `INSERT INTO crm_retention_rules (tenant_id, name, service_category, trigger_type, interval_days, channel, message_template)
       VALUES ($1, 'Regra Secreta Beta', 'ppf', 'warranty_revision', 180, 'whatsapp', 'Olá {cliente}')`,
      [tenantB.id]
    );

    await tenantQuery(
      tenantB.id,
      `INSERT INTO financial_bills (tenant_id, type, description, amount_cents, due_date, status)
       VALUES ($1, 'payable', 'Aluguel Secreto Beta', 500000, CURRENT_DATE, 'pending')`,
      [tenantB.id]
    );

    await tenantQuery(
      tenantB.id,
      `INSERT INTO minisite_leads (tenant_id, name, phone, vehicle_model, service_interest)
       VALUES ($1, 'Lead VIP Beta', '11988887777', 'Porsche 911', 'PPF Full')`,
      [tenantB.id]
    );

    // Oficina A consulta todas as 3 tabelas e deve receber 0 registros da Oficina B
    const rulesA = await tenantQuery(tenantA.id, 'SELECT * FROM crm_retention_rules');
    const billsA = await tenantQuery(tenantA.id, 'SELECT * FROM financial_bills');
    const leadsA = await tenantQuery(tenantA.id, 'SELECT * FROM minisite_leads');

    assert.equal(rulesA.rows.length, 0, 'Oficina A não pode ver regras de CRM da Oficina B');
    assert.equal(billsA.rows.length, 0, 'Oficina A não pode ver contas financeiras da Oficina B');
    assert.equal(leadsA.rows.length, 0, 'Oficina A não pode ver leads do mini-site da Oficina B');
  });

  it('T7.2 — deve auditar estaticamente os serviços de domínio da loja garantindo ausência de uso direto de adminPool', async () => {
    const tenantDomainDirs = [
      'ai',
      'appointments',
      'corporate',
      'crm',
      'financial',
      'fiscal',
      'inspections',
      'minisite',
      'nps',
      'payments',
      'qa',
      'services',
      'stock',
      'technician',
      'work-orders',
    ];

    const srcRoot = path.resolve(__dirname, '..');

    for (const dir of tenantDomainDirs) {
      const fullDir = path.join(srcRoot, dir);
      const entries = await fs.readdir(fullDir);
      const serviceFiles = entries.filter(
        (f) => f.endsWith('-service.ts') && !f.endsWith('.test.ts')
      );

      for (const file of serviceFiles) {
        const content = await fs.readFile(path.join(fullDir, file), 'utf8');
        assert.equal(
          content.includes('adminPool.query'),
          false,
          `O arquivo de domínio "${dir}/${file}" NÃO pode utilizar adminPool.query diretamente (deve usar tenantQuery/tenantTransaction)!`
        );
      }
    }
  });
});
