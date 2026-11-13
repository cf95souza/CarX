import { adminPool } from '../database/db.js';

/**
 * Script de Limpeza de Dados Mockados do CarX
 * Remove todas as ordens de serviço, clientes, veículos, estoque e tenants de teste,
 * mantendo 100% intactos os planos cadastrados (essencial, profissional, elite)
 * e o superadmin do sistema.
 */
async function cleanMockData() {
  console.log('[CLEAN] Iniciando limpeza de dados mockados do sistema CarX...');

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Limpar tabelas dependentes de ordens de serviço e operações
    console.log('[CLEAN] Limpando ordens de serviço, itens, vistorias e garantias...');
    await client.query(`
      TRUNCATE TABLE
        warranty_revision_history,
        work_order_warranties,
        inspection_photos,
        inspection_checklists,
        work_order_inspections,
        work_order_events,
        work_order_payments,
        work_order_items,
        work_orders
      CASCADE;
    `);

    // 2. Limpar estoque, agendamentos, avaliações NPS e CRM
    console.log('[CLEAN] Limpando estoque, agendamentos, NPS e CRM...');
    await client.query(`
      TRUNCATE TABLE
        crm_retention_rules,
        nps_surveys,
        appointments,
        stock_movements,
        stock_materials,
        stock_items,
        financial_transactions,
        cash_flow_projections
      CASCADE;
    `);

    // 3. Limpar veículos, clientes, leads e orçamentos públicos
    console.log('[CLEAN] Limpando clientes, veículos, leads e propostas...');
    await client.query(`
      TRUNCATE TABLE
        minisite_leads,
        minisite_portfolios,
        vehicles,
        customers
      CASCADE;
    `);

    // 4. Limpar colaboradores e tenants mockados/de teste (se houver), preservando superadmin
    console.log('[CLEAN] Limpando dados operacionais de tenants...');
    await client.query(`
      TRUNCATE TABLE
        tenant_branding,
        corporate_units,
        whatsapp_instances,
        coupons
      CASCADE;
    `);

    // 5. Verificar e garantir a integridade dos planos cadastrados
    console.log('[CLEAN] Validando planos cadastrados...');
    const plansCheck = await client.query('SELECT count(*) as count FROM plans;');
    console.log(`[CLEAN] Total de planos ativos no banco: ${plansCheck.rows[0].count}`);

    if (Number(plansCheck.rows[0].count) === 0) {
      console.log('[CLEAN] Re-semeando os 3 planos canônicos...');
      await client.query(`
        INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
        VALUES 
        ('Essencial', 'essencial', 'Ideal para oficinas e estúdios iniciantes', 9900, 'monthly', 
         '{"max_users": 2, "max_work_orders_per_month": 50, "storage_mb": 1024, "custom_domain": false, "whatsapp_notifications": false, "api_access": false}',
         '["gestao_os", "checklist_fotos", "financeiro_basico", "recibo_digital"]', true),
        ('Profissional', 'profissional', 'Para operações consolidadas com alto volume', 19900, 'monthly',
         '{"max_users": 5, "max_work_orders_per_month": 200, "storage_mb": 5120, "custom_domain": false, "whatsapp_notifications": true, "api_access": false}',
         '["gestao_os", "checklist_fotos", "financeiro_avancado", "whatsapp_automatico", "gestao_estoque", "passaporte_digital", "comissoes", "nfse"]', true),
        ('Elite', 'elite', 'Escala total para redes, franquias e centros de estética', 39900, 'monthly',
         '{"max_users": 20, "max_work_orders_per_month": -1, "storage_mb": 20480, "custom_domain": true, "whatsapp_notifications": true, "api_access": true}',
         '["gestao_os", "checklist_fotos", "financeiro_avancado", "whatsapp_automatico", "gestao_estoque", "passaporte_digital", "comissoes", "nfse", "multi_unidades", "dre_completo", "api_webhooks", "white_label", "crm_retencao"]', true)
        ON CONFLICT (slug) DO NOTHING;
      `);
    }

    await client.query('COMMIT;');
    console.log('[CLEAN] Limpeza concluída com sucesso! Banco pronto para novas oficinas e serviços.');
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error('[CLEAN] Erro durante a limpeza de dados:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

cleanMockData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
