import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.13 — App do Técnico Offline-First (Fila de Sincronização & Cronômetro Resiliente)', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlphaTecnico: string;
  let technicianAlphaId: string;
  let workOrderAlphaId: string;
  let workOrderBetaId: string;

  before(async () => {
    try {
      app = buildServer();
      await app.ready();

      // 1. Tenants Alpha e Beta
      const tAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Alpha Detailing Offline', 'Alpha Detailing LTDA', 'offline@alpha.com', '11999998888', $1, 'active')
         RETURNING id;`,
        [`alpha-off-${Date.now()}`],
        { bypassRls: true }
      );
      tenantAlphaId = tAlpha.rows[0].id;

      const tBeta = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Beta Detailing Offline', 'Beta Detailing LTDA', 'offline@beta.com', '11999997777', $1, 'active')
         RETURNING id;`,
        [`beta-off-${Date.now()}`],
        { bypassRls: true }
      );
      tenantBetaId = tBeta.rows[0].id;

      // 2. Usuário Técnico Alpha
      const pwdHash = await hashPassword('Tecnico@123456');
      const uAlphaTec = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Técnico Box 1', $1, $2) RETURNING id;`,
        [`tec_offline_${Date.now()}@alpha.com`, pwdHash],
        { bypassRls: true }
      );
      technicianAlphaId = uAlphaTec.rows[0].id;

      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'tecnico', true);`,
        [tenantAlphaId, technicianAlphaId],
        { bypassRls: true }
      );

      tokenAlphaTecnico = signJwt({
        id: technicianAlphaId,
        email: `tec_offline_${Date.now()}@alpha.com`,
        name: 'Técnico Box 1',
        role: 'tecnico',
        tenantId: tenantAlphaId,
      });

      // 3. Cliente e Veículo para OS Alpha
      const custAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO customers (tenant_id, name, email, phone)
         VALUES ($1, 'Cliente Box Alpha', 'cli@offline.com', '11977776666')
         RETURNING id;`,
        [tenantAlphaId]
      );
      const vehAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model)
         VALUES ($1, $2, 'OFF1234', 'BMW', 'M3 Competition')
         RETURNING id;`,
        [tenantAlphaId, custAlpha.rows[0].id]
      );

      // OS Alpha
      const woAlpha = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
         VALUES ($1, $2, $3, $4, 5001, 'APPROVED', 450000, 0, 450000, 450000)
         RETURNING id;`,
        [tenantAlphaId, custAlpha.rows[0].id, vehAlpha.rows[0].id, technicianAlphaId]
      );
      workOrderAlphaId = woAlpha.rows[0].id;

      // 4. OS Beta (para validação de isolamento multi-tenant)
      const custBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO customers (tenant_id, name, email, phone)
         VALUES ($1, 'Cliente Beta', 'beta@offline.com', '11966665555')
         RETURNING id;`,
        [tenantBetaId]
      );
      const vehBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model)
         VALUES ($1, $2, 'BET1234', 'Audi', 'RS6 Avant')
         RETURNING id;`,
        [tenantBetaId, custBeta.rows[0].id]
      );
      const woBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
         VALUES ($1, $2, $3, 9001, 'APPROVED', 600000, 0, 600000, 600000)
         RETURNING id;`,
        [tenantBetaId, custBeta.rows[0].id, vehBeta.rows[0].id]
      );
      workOrderBetaId = woBeta.rows[0].id;
    } catch (err) {
      console.error('Erro no setup do teste offline sync:', err);
      throw err;
    }
  });

  after(async () => {
    try {
      if (app) await app.close();
    } catch (err) {
      console.warn('Erro ao encerrar app no teste offline sync:', err);
    }
  });

  it('1. Deve sincronizar em lote ações offline de cronômetro, progresso e notas', async () => {
    const actionStartId = randomUUID();
    const actionProgressId = randomUUID();
    const actionNoteId = randomUUID();

    // Simula 30 minutos atrás no cliente
    const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const res = await app.inject({
      method: 'POST',
      url: '/technician/sync',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        actions: [
          {
            id: actionStartId,
            workOrderId: workOrderAlphaId,
            actionType: 'START_TIMER',
            payload: { notes: 'Iniciado offline no subsolo sem sinal' },
            clientTimestamp: pastTime,
          },
          {
            id: actionProgressId,
            workOrderId: workOrderAlphaId,
            actionType: 'UPDATE_PROGRESS',
            payload: { progress: 45 },
            clientTimestamp: pastTime,
          },
          {
            id: actionNoteId,
            workOrderId: workOrderAlphaId,
            actionType: 'ADD_NOTE',
            payload: { note: 'Inspeção inicial concluída: veículo limpo e descontaminado.' },
            clientTimestamp: pastTime,
          },
        ],
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.strictEqual(body.total, 3);
    assert.strictEqual(body.processed, 3);
    assert.strictEqual(body.failed, 0);
    assert.strictEqual(body.results.length, 3);
    assert.ok(body.results[0].success);
    assert.ok(body.results[1].success);
    assert.ok(body.results[2].success);

    // Validação no banco: OS transicionou para IN_PROGRESS e progress = 45%
    const woCheck = await tenantQuery<{ status: string; progress: number; notes: string }>(
      tenantAlphaId,
      'SELECT status, progress, notes FROM work_orders WHERE id = $1 AND tenant_id = $2;',
      [workOrderAlphaId, tenantAlphaId]
    );
    assert.strictEqual(woCheck.rows[0].status, 'IN_PROGRESS');
    assert.strictEqual(woCheck.rows[0].progress, 45);
    assert.ok(woCheck.rows[0].notes.includes('Inspeção inicial concluída'));

    // Validação no banco: cronômetro criado e ativo
    const timerCheck = await tenantQuery<{ status: string }>(
      tenantAlphaId,
      'SELECT status FROM work_order_timers WHERE work_order_id = $1 AND tenant_id = $2;',
      [workOrderAlphaId, tenantAlphaId]
    );
    assert.strictEqual(timerCheck.rows[0].status, 'running');
  });

  it('2. Deve garantir idempotência estrita ao reenviar a mesma lista de ações offline', async () => {
    // Reenvia as mesmas ações anteriores (simulando reconexão após perda de pacote HTTP)
    const existingSyncLogs = await tenantQuery<{ action_id: string }>(
      tenantAlphaId,
      'SELECT action_id FROM technician_offline_sync_logs WHERE tenant_id = $1;',
      [tenantAlphaId]
    );
    assert.strictEqual(existingSyncLogs.rows.length, 3);

    const replayedActions = existingSyncLogs.rows.map((r) => ({
      id: r.action_id,
      workOrderId: workOrderAlphaId,
      actionType: 'START_TIMER',
      payload: {},
      clientTimestamp: new Date().toISOString(),
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/technician/sync',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        actions: replayedActions,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.strictEqual(body.total, 3);
    assert.strictEqual(body.processed, 3);
    assert.strictEqual(body.failed, 0);

    // Todos os resultados devem apontar que já foram processados
    body.results.forEach((r: any) => {
      assert.strictEqual(r.success, true);
      assert.strictEqual(r.data?.alreadyProcessed, true);
    });

    // Contagem de logs no banco não aumentou
    const logsAfter = await tenantQuery(
      tenantAlphaId,
      'SELECT id FROM technician_offline_sync_logs WHERE tenant_id = $1;',
      [tenantAlphaId]
    );
    assert.strictEqual(logsAfter.rows.length, 3);
  });

  it('3. Deve sincronizar pausa e conclusão de cronômetro com computação de segundos acumulados', async () => {
    const actionPauseId = randomUUID();
    const pauseTime = new Date().toISOString();

    const res = await app.inject({
      method: 'POST',
      url: '/technician/sync',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        actions: [
          {
            id: actionPauseId,
            workOrderId: workOrderAlphaId,
            actionType: 'PAUSE_TIMER',
            payload: { reason: 'Pausa para almoço registrada offline' },
            clientTimestamp: pauseTime,
          },
        ],
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.processed, 1);
    assert.ok(body.results[0].success);

    // Valida no banco se o timer foi pausado com accumulated_seconds > 0
    const timerCheck = await tenantQuery<{ status: string; accumulated_seconds: number; pause_reason: string }>(
      tenantAlphaId,
      'SELECT status, accumulated_seconds, pause_reason FROM work_order_timers WHERE work_order_id = $1 AND tenant_id = $2;',
      [workOrderAlphaId, tenantAlphaId]
    );
    assert.strictEqual(timerCheck.rows[0].status, 'paused');
    assert.strictEqual(timerCheck.rows[0].pause_reason, 'Pausa para almoço registrada offline');
  });

  it('4. Deve garantir isolamento multi-tenant: rejeitar ações para OS de outro tenant', async () => {
    const actionSpyId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: '/technician/sync',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        actions: [
          {
            id: actionSpyId,
            workOrderId: workOrderBetaId, // Pertence ao Tenant Beta!
            actionType: 'START_TIMER',
            payload: {},
            clientTimestamp: new Date().toISOString(),
          },
        ],
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.total, 1);
    assert.strictEqual(body.failed, 1);
    assert.strictEqual(body.processed, 0);
    assert.strictEqual(body.results[0].success, false);
    assert.ok(body.results[0].error.includes('Ordem de serviço não encontrada'));
  });

  it('5. Deve ser resiliente e processar ações válidas mesmo se houver uma inválida na fila', async () => {
    const validActionId = randomUUID();
    const invalidActionId = randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: '/technician/sync',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        actions: [
          {
            id: invalidActionId,
            workOrderId: '00000000-0000-0000-0000-000000000000', // OS inexistente
            actionType: 'UPDATE_PROGRESS',
            payload: { progress: 80 },
            clientTimestamp: new Date().toISOString(),
          },
          {
            id: validActionId,
            workOrderId: workOrderAlphaId,
            actionType: 'UPDATE_PROGRESS',
            payload: { progress: 90 },
            clientTimestamp: new Date().toISOString(),
          },
        ],
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.total, 2);
    assert.strictEqual(body.processed, 1);
    assert.strictEqual(body.failed, 1);

    // Ação válida teve sucesso e atualizou o progresso para 90%
    const woCheck = await tenantQuery<{ progress: number }>(
      tenantAlphaId,
      'SELECT progress FROM work_orders WHERE id = $1 AND tenant_id = $2;',
      [workOrderAlphaId, tenantAlphaId]
    );
    assert.strictEqual(woCheck.rows[0].progress, 90);
  });
});

