import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { stockService } from './stock-service.js';
import { qaService } from '../qa/qa-service.js';

describe('T6.5 — Controle Fino de Bobinas (PPF / Películas, Margem Real por Metro e Garantia)', () => {
  let app: FastifyInstance;
  let basicTenantId: string;
  let proTenantId: string;

  let basicAuthToken: string;
  let proAuthToken: string;

  let proMaterialId: string;
  let proRollId: string;
  let proCustomerId: string;
  let proVehicleId: string;
  let proWorkOrderId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();

    // 1. Obter os planos canônicos
    const plansRes = await pool.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM plans WHERE slug IN ('essencial', 'profissional');`
    );
    const basicPlan = plansRes.rows.find((p) => p.slug === 'essencial');
    const proPlan = plansRes.rows.find((p) => p.slug === 'profissional');

    // 2. Criar Tenant no Plano Básico (sem ppf_spool_control)
    const tBasic = await tenantQuery<any>(
      null,
      `INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, plan_id)
       VALUES ('Estetica Basica LTDA', 'Estética Básica', $1, 'basica@spool.test', '11.111.111/0001-11', '11911112222', 'active', $2)
       RETURNING id;`,
      [`spool-basic-${timestamp}`, basicPlan?.id || null],
      { bypassRls: true }
    );
    basicTenantId = tBasic.rows[0].id;

    // 3. Criar Tenant no Plano Pro (com ppf_spool_control)
    const tPro = await tenantQuery<any>(
      null,
      `INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, plan_id)
       VALUES ('Pro Detailer PPF LTDA', 'CarX Detail Pro', $1, 'pro@spool.test', '22.222.222/0001-22', '11922223333', 'active', $2)
       RETURNING id;`,
      [`spool-pro-${timestamp}`, proPlan?.id || null],
      { bypassRls: true }
    );
    proTenantId = tPro.rows[0].id;

    // 4. Inserir Material PPF no Tenant Pro
    const matRes = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO materials (tenant_id, name, category, unit, current_stock, min_stock, cost_cents, is_roll)
       VALUES ($1, 'PPF Gloss Premium 1.52m', 'ppf', 'm', 0, 3, 30000, true)
       RETURNING id;`,
      [proTenantId]
    );
    proMaterialId = matRes.rows[0].id;

    // 5. Inserir Material no Tenant Básico
    await tenantQuery<any>(
      basicTenantId,
      `INSERT INTO materials (tenant_id, name, category, unit, current_stock, min_stock, cost_cents, is_roll)
       VALUES ($1, 'Insulfilm Básico', 'pelicula', 'm', 0, 2, 10000, true);`,
      [basicTenantId]
    );

    // 6. Criar Cliente e Veículo no Tenant Pro
    const cRes = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO customers (tenant_id, name, phone, email)
       VALUES ($1, 'Rodrigo Faro', '11999998888', 'rodrigo@cliente.test')
       RETURNING id;`,
      [proTenantId]
    );
    proCustomerId = cRes.rows[0].id;

    const vRes = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'PPF9X88', 'BMW', 'M3 Competition', 'Azul Portimao', 2024, 'sedan')
       RETURNING id;`,
      [proTenantId, proCustomerId]
    );
    proVehicleId = vRes.rows[0].id;

    // 7. Criar Ordem de Serviço de Aplicação de PPF Frontal no Tenant Pro
    const woRes = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO work_orders (
         tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents
       ) VALUES ($1, $2, $3, 701, 'IN_PROGRESS', 550000, 0, 550000, 0)
       RETURNING id;`,
      [proTenantId, proCustomerId, proVehicleId]
    );
    proWorkOrderId = woRes.rows[0].id;

    // Inserir item de serviço na OS
    await tenantQuery<any>(
      proTenantId,
      `INSERT INTO work_order_items (
         tenant_id, work_order_id, name, category, quantity, unit_price_cents, total_cents
       ) VALUES ($1, $2, 'Aplicação de PPF Frontal Completo (Capô, Parachoque e Faróis)', 'ppf', 1, 550000, 550000);`,
      [proTenantId, proWorkOrderId]
    );

    // Inserir usuários reais para satisfazer FK em audit_logs e stock_movements
    const uBasicRes = await tenantQuery<any>(
      null,
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, 'Gestor Básico Spool', 'hash123')
       RETURNING id;`,
      [`gestor-basic-${timestamp}@spool.test`],
      { bypassRls: true }
    );
    const basicUserId = uBasicRes.rows[0].id;

    const uProRes = await tenantQuery<any>(
      null,
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, 'Gestor Pro Spool', 'hash123')
       RETURNING id;`,
      [`gestor-pro-${timestamp}@spool.test`],
      { bypassRls: true }
    );
    const proUserId = uProRes.rows[0].id;

    // Tokens JWT
    basicAuthToken = signJwt({ userId: basicUserId, tenantId: basicTenantId, role: 'owner' });
    proAuthToken = signJwt({ userId: proUserId, tenantId: proTenantId, role: 'owner' });
  });

  after(async () => {
    if (basicTenantId) {
      await tenantQuery(null, 'DELETE FROM stock_movements WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM material_rolls WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM materials WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
    }
    if (proTenantId) {
      await tenantQuery(null, 'DELETE FROM warranties WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_materials WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_items WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM stock_movements WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM material_rolls WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM materials WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_orders WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM vehicles WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM customers WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
    }
    if (app) await app.close();
    await pool.end();
  });

  test('1. Gating de Plano: Loja no plano BÁSICO é bloqueada ao tentar cadastrar bobina (HTTP 403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/materials/rolls',
      headers: {
        authorization: `Bearer ${basicAuthToken}`,
        'x-tenant-id': basicTenantId,
      },
      payload: {
        materialId: proMaterialId, // qualquer ID
        initialMeters: 15,
        code: 'BOB-BASICA-01',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.match(body.message, /ppf_spool_control/i);
  });

  test('2. Cadastro de Bobina com Custo e Metragem no plano PRO atualiza estoque atomicamente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/materials/rolls',
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
      payload: {
        materialId: proMaterialId,
        code: 'PPF-STEK-2026-A1',
        lotNumber: 'LOTE-XP9940',
        brand: 'STEK DynoShield',
        widthMeters: 1.52,
        initialMeters: 15.0,
        minAlertMeters: 3.0,
        costCents: 450000, // R$ 4.500,00 por rolo de 15 metros (R$ 300/metro)
        notes: 'Bobina nova lacrada importada',
      },
    });

    assert.equal(res.statusCode, 201);
    const roll = res.json();
    proRollId = roll.id;

    assert.equal(roll.brand, 'STEK DynoShield');
    assert.equal(roll.lotNumber, 'LOTE-XP9940');
    assert.equal(roll.initialMeters, 15.0);
    assert.equal(roll.currentMeters, 15.0);
    assert.equal(roll.status, 'in_use');

    // Valida se o estoque total do material base foi incrementado para 15 metros
    const mat = await stockService.getMaterialById(proTenantId, proMaterialId);
    assert.equal(Number(mat.currentStock), 15.0);
  });

  test('3. Alocação e Consumo na OS com Baixa Atômica de Metragem', async () => {
    // 3.1 Aloca 4.5 metros na Ordem de Serviço
    const alloc = await stockService.allocateMaterialToWorkOrder(proTenantId, proWorkOrderId, {
      materialId: proMaterialId,
      materialRollId: proRollId,
      quantity: 4.5,
      notes: 'Capô e parachoque dianteiro BMW M3',
    });
    assert.equal(alloc.quantity, 4.5);
    assert.equal(alloc.isConsumed, false);

    // 3.2 Executa a baixa atômica de materiais da OS
    const deduction = await stockService.deductWorkOrderMaterials(proTenantId, proWorkOrderId);
    assert.equal(deduction.deductedCount, 1);

    // 3.3 Valida que a bobina teve seu saldo reduzido para 10.5 metros
    const roll = await stockService.getRollById(proTenantId, proRollId);
    assert.equal(roll.currentMeters, 10.5);
    assert.equal(roll.status, 'in_use');

    // 3.4 Valida que o material base também teve seu saldo reduzido para 10.5 metros
    const mat = await stockService.getMaterialById(proTenantId, proMaterialId);
    assert.equal(Number(mat.currentStock), 10.5);
  });

  test('4. Vínculo Automático da Bobina e Lote ao Certificado de Garantia do Veículo', async () => {
    // Emite Certificado de Garantia sem passar explicitamente a bobina
    const warranty = await qaService.createWarranty(proTenantId, {
      workOrderId: proWorkOrderId,
      serviceName: 'Aplicação de Película de Proteção de Pintura (PPF)',
      warrantyMonths: 60, // 5 anos de garantia
      notes: 'Garantia contra amarelamento e bolhas de PPF STEK',
    });

    assert.ok(warranty.id);
    assert.equal(warranty.materialRollId, proRollId);
    assert.equal(warranty.materialLotNumber, 'LOTE-XP9940');
    assert.equal(warranty.status, 'active');
    assert.ok(warranty.verificationToken);
  });

  test('5. Histórico Detalhado, Rastreabilidade e Cálculo de Margem Real por Metro', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/materials/rolls/${proRollId}/history`,
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
    });

    assert.equal(res.statusCode, 200);
    const details = res.json();

    assert.equal(details.id, proRollId);
    assert.equal(details.materialName, 'PPF Gloss Premium 1.52m');
    assert.equal(details.costPerMeterCents, 30000); // R$ 300,00 por metro
    assert.equal(details.consumedMeters, 4.5);
    assert.equal(details.scrapMeters, 0);
    assert.equal(details.efficiencyPercent, 100);

    // Valida a aplicação na OS da BMW M3
    assert.equal(details.history.length, 1);
    const item = details.history[0];
    assert.equal(item.osNumber, 701);
    assert.equal(item.customerName, 'Rodrigo Faro');
    assert.equal(item.vehiclePlate, 'PPF9X88');
    assert.equal(item.vehicleModel, 'BMW M3 Competition');
    assert.equal(item.metersUsed, 4.5);
    assert.equal(item.costAllocatedCents, 135000); // 4.5 * 300 = R$ 1.350,00
    assert.equal(item.servicePriceCents, 550000); // R$ 5.500,00
    assert.equal(item.grossProfitCents, 415000); // 5500 - 1350 = R$ 4.150,00 de lucro
    assert.equal(item.grossMarginPercent, 75.45); // Margem de 75.45%
    assert.ok(item.warrantyToken); // Vinculado ao passaporte/garantia
  });

  test('6. Registro de Retalho/Desperdício (scrap) e Esgotamento Automático (depleted)', async () => {
    // 6.1 Registra retalho de 2.5 metros por corte errado
    const scrapRes = await app.inject({
      method: 'POST',
      url: `/materials/rolls/${proRollId}/scrap`,
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
      payload: {
        meters: 2.5,
        reason: 'Corte desalinhado no para-choque dianteiro',
        workOrderId: proWorkOrderId,
      },
    });

    assert.equal(scrapRes.statusCode, 200);
    const rollAfterScrap = scrapRes.json();
    assert.equal(rollAfterScrap.currentMeters, 8.0); // 10.5 - 2.5 = 8.0m
    assert.equal(rollAfterScrap.status, 'in_use');

    // 6.2 Consulta histórico e verifica taxa de eficiência recalculada
    const histRes = await app.inject({
      method: 'GET',
      url: `/materials/rolls/${proRollId}/history`,
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
    });
    const historyData = histRes.json();
    assert.equal(historyData.scrapMeters, 2.5);
    assert.equal(historyData.consumedMeters, 4.5);
    // Eficiência: 4.5 / (4.5 + 2.5) = 4.5 / 7 = 64.29%
    assert.equal(historyData.efficiencyPercent, 64.29);

    // 6.3 Descarte dos 8 metros finais -> bobina deve ir automaticamente para status 'depleted'
    const finalScrapRes = await app.inject({
      method: 'POST',
      url: `/materials/rolls/${proRollId}/scrap`,
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
      payload: {
        meters: 8.0,
        reason: 'Fim de rolo e descarte do miolo',
      },
    });

    assert.equal(finalScrapRes.statusCode, 200);
    const depletedRoll = finalScrapRes.json();
    assert.equal(depletedRoll.currentMeters, 0);
    assert.equal(depletedRoll.status, 'depleted');
  });
});
