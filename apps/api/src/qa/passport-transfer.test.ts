import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { qaService } from './qa-service.js';
import { stockService } from '../stock/stock-service.js';

describe('T6.6 — Passaporte Digital do Veículo & Transferência na Revenda', () => {
  let app: FastifyInstance;
  let tenantId: string;
  let customerId: string;
  let vehicleId: string;
  let workOrderId: string;
  let materialId: string;
  let rollId: string;
  let warrantyToken: string;
  let warrantyId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();

    // 1. Obter plano profissional
    const plansRes = await pool.query<{ id: string }>(
      `SELECT id FROM plans WHERE slug = 'profissional' LIMIT 1;`
    );
    const planId = plansRes.rows[0]?.id || null;

    // 2. Criar Tenant
    const tRes = await tenantQuery<any>(
      null,
      `INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, plan_id)
       VALUES ('Studio CarX Detailing LTDA', 'CarX Prime Studio', $1, 'prime@passaporte.test', '33.333.333/0001-33', '11988887777', 'active', $2)
       RETURNING id;`,
      [`passport-studio-${timestamp}`, planId],
      { bypassRls: true }
    );
    tenantId = tRes.rows[0].id;

    // 3. Criar Cliente Inicial (vendedor do carro)
    const cRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO customers (tenant_id, name, phone, email)
       VALUES ($1, 'Rodrigo Faro Silva', '11999991111', 'rodrigo@cliente.test')
       RETURNING id;`,
      [tenantId]
    );
    customerId = cRes.rows[0].id;

    // 4. Criar Veículo
    const vRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'PPF9X88', 'Porsche', '911 Carrera S', 'Verde Pitón', 2024, 'esportivo')
       RETURNING id;`,
      [tenantId, customerId]
    );
    vehicleId = vRes.rows[0].id;

    // 5. Cadastrar Material PPF e Bobina com Lote
    const matRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO materials (tenant_id, name, category, unit, current_stock, min_stock, cost_cents, is_roll)
       VALUES ($1, 'PPF Gloss Premium Stealth', 'ppf', 'm', 15, 3, 450000, true)
       RETURNING id;`,
      [tenantId]
    );
    materialId = matRes.rows[0].id;

    const rollRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO material_rolls (
         tenant_id, material_id, code, lot_number, brand, width_meters, initial_meters, current_meters, cost_cents, status
       ) VALUES ($1, $2, 'STEK-911-01', 'LOTE-XP9940', 'STEK DynoShield', 1.52, 15.0, 15.0, 450000, 'in_use')
       RETURNING id;`,
      [tenantId, materialId]
    );
    rollId = rollRes.rows[0].id;

    // 6. Criar Ordem de Serviço concluída (DELIVERED)
    const woRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO work_orders (
         tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents, delivered_at
       ) VALUES ($1, $2, $3, 911, 'DELIVERED', 850000, 0, 850000, 850000, NOW())
       RETURNING id;`,
      [tenantId, customerId, vehicleId]
    );
    workOrderId = woRes.rows[0].id;

    // Inserir item e material na OS
    await tenantQuery<any>(
      tenantId,
      `INSERT INTO work_order_items (
         tenant_id, work_order_id, name, category, quantity, unit_price_cents, total_cents
       ) VALUES ($1, $2, 'Envelopamento Frontal Completo com PPF Auto-regenerativo', 'ppf', 1, 850000, 850000);`,
      [tenantId, workOrderId]
    );

    await tenantQuery<any>(
      tenantId,
      `INSERT INTO work_order_materials (
         tenant_id, work_order_id, material_id, material_roll_id, quantity, is_consumed
       ) VALUES ($1, $2, $3, $4, 5.0, true);`,
      [tenantId, workOrderId, materialId, rollId]
    );

    // 7. Emitir Certificado de Garantia de 5 anos (60 meses)
    const warranty = await qaService.createWarranty(tenantId, {
      workOrderId,
      serviceName: 'Proteção de Pintura com Película PPF STEK DynoShield',
      warrantyMonths: 60,
      notes: 'Garantia oficial de 5 anos contra bolhas e amarelamento',
    });

    warrantyId = warranty.id;
    warrantyToken = warranty.verificationToken;
  });

  after(async () => {
    if (tenantId) {
      await tenantQuery(null, 'DELETE FROM warranty_transfers WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM warranties WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_events WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_materials WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_items WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_orders WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM material_rolls WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM materials WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM vehicles WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM customers WHERE tenant_id = $1', [tenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM tenants WHERE id = $1', [tenantId], { bypassRls: true });
    }
    if (app) await app.close();
    await pool.end();
  });

  test('1. Consulta Pública do Passaporte Digital via QR Code (/public/passports/:token e /v/:token)', async () => {
    // 1.1 Endpoint completo
    const res = await app.inject({
      method: 'GET',
      url: `/public/passports/${warrantyToken}`,
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();

    assert.equal(body.isValid, true);
    assert.equal(body.status, 'active');
    assert.equal(body.serviceName, 'Proteção de Pintura com Película PPF STEK DynoShield');
    assert.equal(body.warrantyMonths, 60);
    assert.ok(body.remainingDays > 1500); // 5 anos restantes

    // Proteção LGPD na placa
    assert.equal(body.vehicle.brand, 'Porsche');
    assert.equal(body.vehicle.model, '911 Carrera S');
    assert.match(body.vehicle.plateMasked, /^PPF-\*\*\*8$/);

    // Procedência do PPF
    assert.equal(body.materialLotNumber, 'LOTE-XP9940');
    assert.equal(body.materialRollBrand, 'STEK DynoShield');
    assert.equal(body.isTransferable, true);
    assert.equal(body.transferCount, 0);

    // 1.2 Alias curto /v/:token (usado diretamente na leitura do QR Code pela câmera)
    const qrRes = await app.inject({
      method: 'GET',
      url: `/v/${warrantyToken}`,
    });
    assert.equal(qrRes.statusCode, 200);
    assert.equal(qrRes.json().verificationToken, warrantyToken);
  });

  test('2. Linha do Tempo (Timeline) Completa de Cuidados e Manutenções do Veículo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/passports/${warrantyToken}`,
    });

    const body = res.json();
    assert.ok(Array.isArray(body.timeline));
    assert.ok(body.timeline.length >= 2); // Marco de emissão da garantia + serviço da OS

    // Valida marco de emissão da garantia
    const warrantyEvent = body.timeline.find((t: any) => t.type === 'warranty_issued');
    assert.ok(warrantyEvent);
    assert.match(warrantyEvent.title, /Emissão de Certificado de Garantia/);
    assert.equal(warrantyEvent.lotNumber, 'LOTE-XP9940');

    // Valida serviço concluído da OS na timeline
    const serviceEvent = body.timeline.find((t: any) => t.type === 'service');
    assert.ok(serviceEvent);
    assert.match(serviceEvent.title, /Envelopamento Frontal Completo/);
    assert.equal(serviceEvent.osNumber, 911);
  });

  test('3. Rejeição de Token Inexistente ou Incorreto com HTTP 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/public/passports/00000000-0000-0000-0000-000000000000',
    });

    assert.equal(res.statusCode, 404);
    assert.equal(res.json().error, 'PASSPORT_NOT_FOUND');
  });

  test('4. Transferência de Titularidade na Revenda do Veículo (POST /public/passports/:token/transfer)', async () => {
    // Novo comprador recebe a garantia do Porsche ao fechar a compra
    const transferRes = await app.inject({
      method: 'POST',
      url: `/public/passports/${warrantyToken}/transfer`,
      payload: {
        newCustomerName: 'Carlos Eduardo Barrichello',
        newCustomerPhone: '11977772222',
        newCustomerEmail: 'carlos@comprador.test',
        odometerKm: 3200,
        reason: 'Compra do veículo seminovo e transferência da garantia oficial de PPF',
      },
    });

    assert.equal(transferRes.statusCode, 200);
    const body = transferRes.json();
    assert.equal(body.success, true);
    assert.match(body.newCustomerNameMasked, /^Carlos B\*\*\*$/);
    assert.ok(body.transferredAt);

    // 4.1 Valida no banco se o veículo teve seu customer_id atualizado para o novo dono
    const vCheck = await tenantQuery<any>(
      tenantId,
      `SELECT customer_id FROM vehicles WHERE id = $1;`,
      [vehicleId]
    );
    const newOwnerId = vCheck.rows[0].customer_id;
    assert.notEqual(newOwnerId, customerId);

    // 4.2 Valida se o novo cliente foi criado com os dados corretos
    const cCheck = await tenantQuery<any>(
      tenantId,
      `SELECT name, phone, email FROM customers WHERE id = $1;`,
      [newOwnerId]
    );
    assert.equal(cCheck.rows[0].name, 'Carlos Eduardo Barrichello');
    assert.equal(cCheck.rows[0].phone, '11977772222');

    // 4.3 Valida se a garantia foi atualizada com o novo titular e histórico prévio
    const wCheck = await tenantQuery<any>(
      tenantId,
      `SELECT customer_id, transferred_from_customer_id, transferred_at FROM warranties WHERE id = $1;`,
      [warrantyId]
    );
    assert.equal(wCheck.rows[0].customer_id, newOwnerId);
    assert.equal(wCheck.rows[0].transferred_from_customer_id, customerId);
    assert.ok(wCheck.rows[0].transferred_at);

    // 4.4 Valida se a tabela warranty_transfers registrou os dados da transação com IP/User-Agent
    const tCheck = await tenantQuery<any>(
      tenantId,
      `SELECT previous_customer_name, new_customer_name, odometer_km, reason FROM warranty_transfers WHERE warranty_id = $1;`,
      [warrantyId]
    );
    assert.equal(tCheck.rows.length, 1);
    assert.equal(tCheck.rows[0].previous_customer_name, 'Rodrigo Faro Silva');
    assert.equal(tCheck.rows[0].new_customer_name, 'Carlos Eduardo Barrichello');
    assert.equal(tCheck.rows[0].odometer_km, 3200);

    // 4.5 Consulta o passaporte novamente e valida a timeline enriquecida com a transferência
    const passportRes = await app.inject({
      method: 'GET',
      url: `/public/passports/${warrantyToken}`,
    });
    const updatedPassport = passportRes.json();
    assert.equal(updatedPassport.transferCount, 1);
    assert.ok(updatedPassport.transferredAt);

    const transferTimelineItem = updatedPassport.timeline.find((t: any) => t.type === 'transfer');
    assert.ok(transferTimelineItem);
    assert.match(transferTimelineItem.description, /Carlos B\*\*\*/);
    assert.equal(transferTimelineItem.odometerKm, 3200);
  });

  test('5. Rejeição de Transferência em Garantia Marcada como Intransferível ou Revogada', async () => {
    // 5.1 Marca como intransferível
    await tenantQuery(
      tenantId,
      `UPDATE warranties SET is_transferable = false WHERE id = $1;`,
      [warrantyId]
    );

    const rejectRes = await app.inject({
      method: 'POST',
      url: `/public/passports/${warrantyToken}/transfer`,
      payload: {
        newCustomerName: 'Terceiro Dono',
        newCustomerPhone: '11966665555',
      },
    });

    assert.equal(rejectRes.statusCode, 400);
    assert.equal(rejectRes.json().error, 'WARRANTY_NON_TRANSFERABLE');

    // 5.2 Revoga a garantia
    await tenantQuery(
      tenantId,
      `UPDATE warranties SET is_transferable = true, status = 'revoked' WHERE id = $1;`,
      [warrantyId]
    );

    const revokedRes = await app.inject({
      method: 'POST',
      url: `/public/passports/${warrantyToken}/transfer`,
      payload: {
        newCustomerName: 'Tentativa em Garantia Revogada',
        newCustomerPhone: '11966665555',
      },
    });

    assert.equal(revokedRes.statusCode, 400);
    assert.equal(revokedRes.json().error, 'WARRANTY_NOT_ACTIVE');
  });
});

