import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.3 — Orçamentos e Ordens de Serviço (Máquina de Estados)', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let technicianAlphaId: string;
  let technicianAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let servicePolimentoId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;
  let customerBetaId: string;
  let vehicleBetaId: string;

  // Dados da OS testada
  let orderAlphaId: string;
  let orderAlphaTrackingToken: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();

    // 1. Criar Oficina Alpha
    tenantAlphaSlug = `alpha-wo-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Garagem Pro', 'Alpha Garagem LTDA', $1, $2, '55.555.555/0001-55', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const passHash = await hashPassword('CarX@Alpha2026!');

    // Gestor / Owner Alpha
    const ownerAlphaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id`,
      [`gestor.${tenantAlphaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    const ownerAlphaId = ownerAlphaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );

    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      email: `gestor.${tenantAlphaSlug}@carx.local`,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // Técnico Alpha
    const techAlphaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Técnico Roberto', $1, $2)
       RETURNING id`,
      [`tecnico.${tenantAlphaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    technicianAlphaId = techAlphaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico')`,
      [tenantAlphaId, technicianAlphaId],
      { bypassRls: true }
    );

    technicianAlphaToken = signJwt({
      userId: technicianAlphaId,
      email: `tecnico.${tenantAlphaSlug}@carx.local`,
      tenantId: tenantAlphaId,
      role: 'tecnico',
    });

    // Cliente e Veículo Alpha
    const custAlphaRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, phone, document, email)
       VALUES ($1, 'Marcelo Silveira', '+5511988887777', '98765432100', 'marcelo@teste.local')
       RETURNING id`,
      [tenantAlphaId]
    );
    customerAlphaId = custAlphaRes.rows[0].id;

    const vehAlphaRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'ALP1A01', 'Honda', 'Civic', 2023, 'Prata', 'sedan')
       RETURNING id`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = vehAlphaRes.rows[0].id;

    // Serviço Alpha
    const srvAlphaRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, price_cents, estimated_minutes, category, segment)
       VALUES ($1, 'Vitrificação Cerâmica 9H', 120000, 240, 'Proteção', 'detailing')
       RETURNING id`,
      [tenantAlphaId]
    );
    servicePolimentoId = srvAlphaRes.rows[0].id;

    // 2. Criar Oficina Beta
    tenantBetaSlug = `beta-wo-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Oficina Mecânica', 'Beta Mecânica LTDA', $1, $2, '66.666.666/0002-66', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const ownerBetaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id`,
      [`gestor.${tenantBetaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    const ownerBetaId = ownerBetaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );

    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      email: `gestor.${tenantBetaSlug}@carx.local`,
      tenantId: tenantBetaId,
      role: 'owner',
    });

    // Cliente e Veículo Beta
    const custBetaRes = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO customers (tenant_id, name, phone, document, email)
       VALUES ($1, 'Fernanda Costa', '+5511977776666', '11122233344', 'fernanda@teste.local')
       RETURNING id`,
      [tenantBetaId]
    );
    customerBetaId = custBetaRes.rows[0].id;

    const vehBetaRes = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'BET2B02', 'Toyota', 'Corolla', 2022, 'Branco', 'sedan')
       RETURNING id`,
      [tenantBetaId, customerBetaId]
    );
    vehicleBetaId = vehBetaRes.rows[0].id;
  });

  after(async () => {
    await app.close();
  });

  test('1. deve criar uma OS inicial com status QUOTE e numeração os_number sequencial iniciando em 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/work-orders',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        technicianId: technicianAlphaId,
        status: 'QUOTE',
        discountCents: 5000, // Desconto de R$ 50,00
        notes: 'Cliente solicitou orçamento para vitrificação completa',
        items: [
          {
            serviceId: servicePolimentoId,
            name: 'Vitrificação Cerâmica 9H',
            category: 'Proteção',
            quantity: 1,
            unitPriceCents: 120000,
            estimatedMinutes: 240,
            warrantyMonths: 12,
          },
        ],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.id);
    assert.equal(body.osNumber, 1, 'Primeira OS da Oficina Alpha deve ser #1');
    assert.equal(body.status, 'QUOTE');
    assert.equal(body.progress, 0);
    assert.equal(body.totalCents, 120000);
    assert.equal(body.discountCents, 5000);
    assert.equal(body.finalCents, 115000);
    assert.equal(body.estimatedMinutes, 240);
    assert.ok(body.trackingToken);
    assert.equal(body.items.length, 1);
    assert.equal(body.events.length, 1);
    assert.equal(body.events[0].toStatus, 'QUOTE');

    orderAlphaId = body.id;
    orderAlphaTrackingToken = body.trackingToken;
  });

  test('2. deve criar segunda OS na Oficina Alpha recebendo os_number = 2 atômico', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/work-orders',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        status: 'QUOTE',
        items: [
          {
            name: 'Lavagem Detalhada',
            unitPriceCents: 15000,
            estimatedMinutes: 60,
          },
        ],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.osNumber, 2, 'Segunda OS da Oficina Alpha deve ser estritamente #2');
  });

  test('3. deve criar primeira OS na Oficina Beta recebendo seu próprio os_number = 1 (sem colisão)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/work-orders',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
      payload: {
        customerId: customerBetaId,
        vehicleId: vehicleBetaId,
        status: 'QUOTE',
        items: [
          {
            name: 'Troca de Óleo e Filtros',
            unitPriceCents: 35000,
            estimatedMinutes: 45,
          },
        ],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.osNumber, 1, 'Primeira OS da Oficina Beta deve ser #1, independente da Alpha');
  });

  test('4. CRITÉRIO DE ACEITE: transição inválida QUOTE -> DELIVERED deve ser rejeitada com HTTP 422', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        status: 'DELIVERED',
        notes: 'Tentativa de pular todas as etapas',
      },
    });

    assert.equal(res.statusCode, 422, 'Pular de QUOTE diretamente para DELIVERED deve retornar HTTP 422');
    const body = JSON.parse(res.body);
    assert.ok(body.message.includes('Transição de estado inválida'));
  });

  test('5. MÁQUINA DE ESTADOS: deve executar ciclo de transições válidas de QUOTE até DELIVERED', async () => {
    // 1. QUOTE -> APPROVED
    const res1 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'APPROVED', notes: 'Cliente aprovou o orçamento via WhatsApp' },
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(JSON.parse(res1.body).status, 'APPROVED');
    assert.equal(JSON.parse(res1.body).progress, 0);

    // 2. APPROVED -> SCHEDULED
    const res2 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'SCHEDULED', notes: 'Agendado para amanhã 09:00' },
    });
    assert.equal(res2.statusCode, 200);
    assert.equal(JSON.parse(res2.body).status, 'SCHEDULED');
    assert.equal(JSON.parse(res2.body).progress, 20);

    // 3. SCHEDULED -> CHECKED_IN
    const res3 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'CHECKED_IN', notes: 'Veículo deu entrada e foi vistoriado no pátio' },
    });
    assert.equal(res3.statusCode, 200);
    const body3 = JSON.parse(res3.body);
    assert.equal(body3.status, 'CHECKED_IN');
    assert.ok(body3.checkedInAt, 'checkedInAt deve ser preenchido');

    // 4. CHECKED_IN -> IN_PROGRESS
    const res4 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${technicianAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'IN_PROGRESS', notes: 'Técnico iniciou polimento e preparação da pintura' },
    });
    assert.equal(res4.statusCode, 200);
    const body4 = JSON.parse(res4.body);
    assert.equal(body4.status, 'IN_PROGRESS');
    assert.ok(body4.startedAt, 'startedAt deve ser preenchido');

    // 5. IN_PROGRESS -> QA (Técnico finaliza serviço e envia para Controle de Qualidade)
    const res5 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${technicianAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'QA', notes: 'Serviço concluído, aguardando inspeção sob luz UV' },
    });
    assert.equal(res5.statusCode, 200);
    const body5 = JSON.parse(res5.body);
    assert.equal(body5.status, 'QA');
    assert.ok(body5.completedAt, 'completedAt deve ser preenchido');
    assert.equal(body5.progress, 85);

    // 6. QA -> READY (Gestor aprova inspeção e marca como pronto)
    const res6 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'READY', notes: 'Inspeção aprovada com nota 10. Veículo no pátio de saída' },
    });
    assert.equal(res6.statusCode, 200);
    assert.equal(JSON.parse(res6.body).status, 'READY');
    assert.equal(JSON.parse(res6.body).progress, 95);

    // 7. READY -> DELIVERED (Cliente retira veículo)
    const res7 = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'DELIVERED', notes: 'Veículo entregue ao proprietário com termo assinado' },
    });
    assert.equal(res7.statusCode, 200);
    const body7 = JSON.parse(res7.body);
    assert.equal(body7.status, 'DELIVERED');
    assert.ok(body7.deliveredAt, 'deliveredAt deve ser preenchido');
    assert.equal(body7.progress, 100);
  });

  test('6. ESTADO TERMINAL: deve rejeitar qualquer transição a partir de DELIVERED com HTTP 422', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        status: 'QUOTE',
        notes: 'Tentativa de reabrir OS entregue',
      },
    });

    assert.equal(res.statusCode, 422);
  });

  test('7. LINHA DO TEMPO: consulta detalhada da OS deve conter o histórico cronológico de todos os eventos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/work-orders/${orderAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body.events));
    // Esperado pelo menos 8 eventos (CREATED + 7 transições)
    assert.ok(body.events.length >= 8, `Esperado no mínimo 8 eventos, recebido ${body.events.length}`);

    const statuses = body.events.map((e: any) => e.toStatus);
    assert.ok(statuses.includes('QUOTE'));
    assert.ok(statuses.includes('APPROVED'));
    assert.ok(statuses.includes('SCHEDULED'));
    assert.ok(statuses.includes('CHECKED_IN'));
    assert.ok(statuses.includes('IN_PROGRESS'));
    assert.ok(statuses.includes('QA'));
    assert.ok(statuses.includes('READY'));
    assert.ok(statuses.includes('DELIVERED'));
  });

  test('8. TRACKING PÚBLICO: /work-orders/tracking/:token responde sem token JWT com status e progresso', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/work-orders/tracking/${orderAlphaTrackingToken}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.osNumber, 1);
    assert.equal(body.status, 'DELIVERED');
    assert.equal(body.progress, 100);
    assert.equal(body.brand, 'Honda');
    assert.equal(body.model, 'Civic');
    assert.ok(Array.isArray(body.items));
    assert.ok(Array.isArray(body.timeline));
    assert.ok(body.timeline.length >= 8);
  });

  test('9. RBAC DE TÉCNICO: técnico não pode alterar OS que não está atribuída a ele (HTTP 403)', async () => {
    // Cria OS sem técnico atribuído ou para outro usuário
    const createRes = await app.inject({
      method: 'POST',
      url: '/work-orders',
      headers: { authorization: `Bearer ${ownerAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        technicianId: null, // sem técnico atribuído
        status: 'CHECKED_IN',
        items: [{ name: 'Polimento de Faróis', unitPriceCents: 15000 }],
      },
    });
    const newOs = JSON.parse(createRes.body);

    // Técnico tenta consultar a OS
    const getRes = await app.inject({
      method: 'GET',
      url: `/work-orders/${newOs.id}`,
      headers: { authorization: `Bearer ${technicianAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
    });
    assert.equal(getRes.statusCode, 403);

    // Técnico tenta mover status da OS não atribuída
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${newOs.id}/status`,
      headers: { authorization: `Bearer ${technicianAlphaToken}`, 'x-tenant-slug': tenantAlphaSlug },
      payload: { status: 'IN_PROGRESS' },
    });
    assert.equal(patchRes.statusCode, 403);
  });

  test('10. ISOLAMENTO RLS: Oficina Beta não consegue ler nem alterar OS da Oficina Alpha (HTTP 404)', async () => {
    // Oficina Beta tenta ler OS da Oficina Alpha
    const getRes = await app.inject({
      method: 'GET',
      url: `/work-orders/${orderAlphaId}`,
      headers: { authorization: `Bearer ${ownerBetaToken}`, 'x-tenant-slug': tenantBetaSlug },
    });
    assert.equal(getRes.statusCode, 404);

    // Oficina Beta tenta alterar status da OS da Oficina Alpha
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/work-orders/${orderAlphaId}/status`,
      headers: { authorization: `Bearer ${ownerBetaToken}`, 'x-tenant-slug': tenantBetaSlug },
      payload: { status: 'CANCELED' },
    });
    assert.equal(patchRes.statusCode, 404);
  });

  test('11. AUDITORIA IMUTÁVEL: eventos de criação e transição de status devem estar em audit_logs', async () => {
    const res = await tenantQuery<{ action: string; entity: string }>(
      tenantAlphaId,
      `SELECT action, entity 
       FROM audit_logs 
       WHERE tenant_id = $1 AND entity = 'work_orders'
       ORDER BY created_at DESC;`,
      [tenantAlphaId]
    );

    assert.ok(res.rows.length >= 2);
    const actions = res.rows.map((r) => r.action);
    assert.ok(actions.includes('WORK_ORDER_CREATED'));
    assert.ok(actions.includes('WORK_ORDER_STATUS_CHANGED'));
  });
});

