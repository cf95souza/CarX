import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T3.8 — App do Técnico (PWA do Operador) e Cronômetro Oficial', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let tech1AlphaId: string;
  let tech1AlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let servicePpfId: string;

  // OS da Oficina Alpha
  let woAlphaNormalId: string;
  let woAlphaReworkId: string;
  let woAlphaChecklistPendingId: string;

  // Oficina Beta (Concorrente para testes de isolamento RLS)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let techBetaId: string;
  let techBetaToken: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@Tech2026!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-tech-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Garage Performance', 'Alpha Garage LTDA', $1, $2, '13.579.246/0001-88', 'active', 'estetica')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Gestor / Owner Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    const ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // Técnico 1 Alpha (Operador de chão de fábrica)
    const resTech1 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Técnico Rodrigo Operador', $1, $2)
       RETURNING id`,
      [`rodrigo@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    tech1AlphaId = resTech1.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico')`,
      [tenantAlphaId, tech1AlphaId],
      { bypassRls: true }
    );
    tech1AlphaToken = signJwt({
      userId: tech1AlphaId,
      tenantId: tenantAlphaId,
      role: 'tecnico',
    });

    // Cliente e Veículo Alpha
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone)
       VALUES ($1, 'Renato Silva', 'renato@tech-test.local', '11977776666')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'OPR-2026', 'BMW', 'M3 Competition', 'Verde Isle of Man', 2024, 'sports')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // Serviço de Catálogo
    const resServ = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, description, category, price_cents, estimated_minutes)
       VALUES ($1, 'Aplicação PPF Frontal', 'Proteção de pintura front clip', 'ppf', 350000, 180)
       RETURNING id;`,
      [tenantAlphaId]
    );
    servicePpfId = resServ.rows[0].id;

    // 1ª OS: Normal atribuída ao técnico Rodrigo (em APPROVED)
    const resWoNormal = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, final_cents, estimated_minutes)
       VALUES ($1, $2, $3, $4, 7001, '${WorkOrderStatus.APPROVED}', 'INTERNAL', 350000, 350000, 180)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech1AlphaId]
    );
    woAlphaNormalId = resWoNormal.rows[0].id;
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_order_items (tenant_id, work_order_id, service_id, name, unit_price_cents, total_cents, estimated_minutes)
       VALUES ($1, $2, $3, 'Aplicação PPF Frontal', 350000, 350000, 180);`,
      [tenantAlphaId, woAlphaNormalId, servicePpfId]
    );

    // 2ª OS: Retrabalho com prioridade máxima (is_rework = true)
    const resWoRework = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, is_rework, rework_reason, total_cents, final_cents, estimated_minutes)
       VALUES ($1, $2, $3, $4, 7002, '${WorkOrderStatus.APPROVED}', 'INTERNAL', true, 'Bolha de ar no vinco do capô', 0, 0, 45)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech1AlphaId]
    );
    woAlphaReworkId = resWoRework.rows[0].id;

    // 3ª OS: Sem checklist de entrada preenchido
    const resWoChecklistPending = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, final_cents, estimated_minutes)
       VALUES ($1, $2, $3, $4, 7003, '${WorkOrderStatus.APPROVED}', 'INTERNAL', 120000, 120000, 60)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, tech1AlphaId]
    );
    woAlphaChecklistPendingId = resWoChecklistPending.rows[0].id;

    // 2. Setup Oficina Beta (Concorrente)
    tenantBetaSlug = `beta-tech-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Oficina Concorrente', 'Beta LTDA', $1, $2, '99.888.777/0001-00', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resTechBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Operador Beta', $1, $2)
       RETURNING id`,
      [`operador@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    techBetaId = resTechBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico')`,
      [tenantBetaId, techBetaId],
      { bypassRls: true }
    );
    techBetaToken = signJwt({
      userId: techBetaId,
      tenantId: tenantBetaId,
      role: 'tecnico',
    });
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. FILA DE EXECUÇÃO DO TÉCNICO E PRIORIZAÇÃO DE RETRABALHO
  // ============================================================================

  test('deve listar a fila do técnico (scope: mine) com priorização máxima de retrabalho no topo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/technician/queue?scope=mine',
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const queue = JSON.parse(res.body);

    assert.ok(Array.isArray(queue));
    assert.ok(queue.length >= 2, 'Deve conter as OS atribuídas ao técnico');

    // CRITÉRIO DE ACEITE: Retrabalho (is_rework = true) DEVE estar no topo absoluto da fila
    const firstItem = queue[0];
    assert.equal(firstItem.workOrderId, woAlphaReworkId, 'A primeira OS da fila DEVE ser a de retrabalho');
    assert.equal(firstItem.isRework, true);
    assert.equal(firstItem.reworkReason, 'Bolha de ar no vinco do capô');
    assert.equal(firstItem.vehicle.plate, 'OPR-2026');
    assert.equal(firstItem.vehicle.model, 'M3 Competition');
  });

  test('deve listar a visão global da loja (scope: all) sem bloqueio para operadores', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/technician/queue?scope=all',
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const queue = JSON.parse(res.body);
    assert.ok(queue.length >= 3);
  });

  // ============================================================================
  // 2. CRONÔMETRO OFICIAL CALCULADO NO SERVIDOR (IMUNE A ADULTERAÇÃO)
  // ============================================================================

  test('deve iniciar o cronômetro oficial calculando tempo no servidor e transicionando OS para IN_PROGRESS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaNormalId}/start`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        notes: 'Iniciando limpeza e descontaminação pré-PPF',
      },
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const timer = JSON.parse(res.body);

    assert.ok(timer.id);
    assert.equal(timer.status, 'running');
    assert.equal(timer.isRunning, true);
    assert.ok(timer.startedAt);
    assert.equal(timer.technicianId, tech1AlphaId);

    // Confirma que a OS transicionou para IN_PROGRESS no banco
    const woCheck = await tenantQuery<{ status: string }>(
      tenantAlphaId,
      `SELECT status FROM work_orders WHERE tenant_id = $1 AND id = $2;`,
      [tenantAlphaId, woAlphaNormalId]
    );
    assert.equal(woCheck.rows[0].status, WorkOrderStatus.IN_PROGRESS);
  });

  test('CRITÉRIO FUNDAMENTAL: fechar o app/recarregar consulta o tempo decorrido com precisão do servidor', async () => {
    // Aguarda breve intervalo real de 1.1s para simular passagem de tempo
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await app.inject({
      method: 'GET',
      url: `/technician/work-orders/${woAlphaNormalId}/timer`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);

    assert.equal(data.isTimerRunning, true);
    assert.ok(data.totalElapsedSeconds >= 1, `Tempo decorrido no servidor deve ser >= 1s, atual: ${data.totalElapsedSeconds}`);
    assert.equal(data.activeTimer?.status, 'running');
  });

  test('deve pausar o cronômetro oficial gravando motivo e acumulando segundos', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaNormalId}/pause`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        reason: 'Aguardando secagem de primer adesivo',
      },
    });

    assert.equal(res.statusCode, 200);
    const timer = JSON.parse(res.body);

    assert.equal(timer.status, 'paused');
    assert.equal(timer.isRunning, false);
    assert.ok(timer.pausedAt);
    assert.equal(timer.pauseReason, 'Aguardando secagem de primer adesivo');
    assert.ok(timer.accumulatedSeconds >= 1);
  });

  test('deve retomar o cronômetro oficial a partir de um novo marco temporal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaNormalId}/resume`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const timer = JSON.parse(res.body);

    assert.equal(timer.status, 'running');
    assert.equal(timer.isRunning, true);
  });

  test('REGRA DE FOCO ÚNICO: iniciar cronômetro de outra OS pausa silenciosamente a tarefa anterior', async () => {
    // Inicia cronômetro da OS de retrabalho
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaReworkId}/start`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(res.statusCode, 200);

    // Verifica que a OS anterior (woAlphaNormalId) foi automaticamente pausada
    const prevTimerRes = await app.inject({
      method: 'GET',
      url: `/technician/work-orders/${woAlphaNormalId}/timer`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    const prevTimer = JSON.parse(prevTimerRes.body);
    assert.equal(prevTimer.isTimerRunning, false, 'OS anterior deve ter sido pausada para evitar dupla contagem');
    assert.equal(prevTimer.activeTimer?.status, 'paused');
  });

  test('deve finalizar o cronômetro oficial com status completed', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaReworkId}/stop`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const timer = JSON.parse(res.body);
    assert.equal(timer.status, 'completed');
    assert.ok(timer.stoppedAt);
  });

  // ============================================================================
  // 3. AÇÃO "FAZER CHECKLIST E INICIAR" (NUNCA BLOQUEAR SEM SAÍDA)
  // ============================================================================

  test('CRITÉRIO DE ACEITE: operador preenche checklist na hora e inicia serviço sem depender do gestor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaChecklistPendingId}/start-with-checklist`,
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        currentKm: 14200,
        fuelLevel: 'full',
        checklistItems: [
          { id: 'spare_tire', label: 'Estepe verificado', checked: true },
          { id: 'cleanliness', label: 'Veículo pré-lavado', checked: true },
        ],
        notes: 'Checklist preenchido no box pelo operador Rodrigo.',
      },
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const data = JSON.parse(res.body);

    assert.ok(data.inspection, 'Deve ter criado a inspeção de check-in');
    assert.equal(data.inspection.currentKm, 14200);
    assert.equal(data.inspection.fuelLevel, 'full');

    assert.ok(data.timer, 'Deve ter iniciado o cronômetro oficial imediatamente');
    assert.equal(data.timer.status, 'running');
    assert.equal(data.timer.isRunning, true);

    // Confirma que a fila agora reflete hasCheckinInspection = true
    const queueRes = await app.inject({
      method: 'GET',
      url: '/technician/queue?scope=mine',
      headers: {
        authorization: `Bearer ${tech1AlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    const queue = JSON.parse(queueRes.body);
    const item = queue.find((q: any) => q.workOrderId === woAlphaChecklistPendingId);
    assert.ok(item);
    assert.equal(item.hasCheckinInspection, true, 'Deve acusar checklist preenchido');
  });

  // ============================================================================
  // 4. SEGURANÇA E ISOLAMENTO MULTITENANT (RLS)
  // ============================================================================

  test('ISOLAMENTO RLS: Técnico da Oficina Beta não consegue ver a fila nem operar OS da Oficina Alpha', async () => {
    // Tentativa de consultar a fila da Oficina Alpha com token de Beta
    const queueRes = await app.inject({
      method: 'GET',
      url: '/technician/queue?scope=all',
      headers: {
        authorization: `Bearer ${techBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(queueRes.statusCode, 200);
    const queueBeta = JSON.parse(queueRes.body);
    assert.equal(queueBeta.length, 0, 'Fila da Oficina Beta não deve conter ordens de serviço da Oficina Alpha');

    // Tentativa de iniciar cronômetro da OS da Oficina Alpha
    const startRes = await app.inject({
      method: 'POST',
      url: `/technician/work-orders/${woAlphaNormalId}/start`,
      headers: {
        authorization: `Bearer ${techBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(startRes.statusCode, 404, 'Técnico de outro tenant deve receber 404 ao tentar operar OS alheia');
  });
});
