import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { realtimeHub } from './realtime-hub.js';
import { workOrderService } from '../work-orders/work-order-service.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T3.12 — Barramento de Tempo Real SSE (Server-Sent Events) e Eventos Pontuais', () => {
  let app: any;
  const timestamp = Date.now();

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let woAlphaId: string;

  // Oficina Beta (Concorrente)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    const passHash = await hashPassword('SenhaSegura123!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-rt-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Detailing Alpha RT', 'Alpha RT LTDA', $1, $2, '12.333.444/0001-55', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha RT', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'gestor',
    });

    // Cliente e Veículo Alpha
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone)
       VALUES ($1, 'Rodrigo Silveira', 'rodrigo@rt.local', '11999990000')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'RTE2E26', 'Porsche', 'Cayenne GTS', 'Preto', 2024, 'suv')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // Criar OS inicial na Oficina Alpha
    const createdWo = await workOrderService.create(
      tenantAlphaId,
      {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        origin: 'INTERNAL',
        items: [
          {
            name: 'Vitrificação Cerâmica 9H',
            quantity: 1,
            unitPriceCents: 250000,
          },
        ],
      },
      ownerAlphaId
    );
    woAlphaId = createdWo.id;

    // 2. Setup Oficina Beta (Concorrente)
    tenantBetaSlug = `beta-rt-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Detailing Beta RT', 'Beta RT LTDA', $1, $2, '99.888.777/0001-66', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta RT', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'gestor',
    });
  });

  beforeEach(() => {
    realtimeHub.clearAll();
  });

  after(() => {
    realtimeHub.stopHeartbeat();
    realtimeHub.clearAll();
  });

  // ============================================================================
  // TESTE 1: AUTENTICAÇÃO E REJEIÇÃO DE CONEXÕES SEM TOKEN
  // ============================================================================
  test('deve rejeitar conexão SSE sem token de autenticação (HTTP 401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/realtime/events',
    });
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'UNAUTHORIZED');
  });

  test('deve rejeitar conexão SSE com token JWT expirado ou adulterado (HTTP 401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/realtime/events?token=token_invalido_ou_adulterado',
    });
    assert.equal(res.statusCode, 401);
  });

  // ============================================================================
  // TESTE 2: REGISTRO NO HUB E RECEPÇÃO DE EVENTOS FORMATADOS EM SSE
  // ============================================================================
  test('deve registrar cliente no Hub SSE e receber evento inicial connected', () => {
    const emittedMessages: string[] = [];
    const mockRequest = new EventEmitter() as any;
    mockRequest.raw = mockRequest;

    const mockReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: (_statusCode: number, headers: Record<string, string>) => {
          assert.equal(headers['Content-Type'], 'text/event-stream; charset=utf-8');
          assert.equal(headers['Cache-Control'], 'no-cache, no-transform');
        },
        write: (chunk: string) => {
          emittedMessages.push(chunk);
          return true;
        },
      },
    } as any;

    const client = realtimeHub.registerClient(tenantAlphaId, mockRequest, mockReply, ownerAlphaId);

    assert.ok(client);
    assert.equal(client.tenantId, tenantAlphaId);
    assert.equal(emittedMessages.length, 1);

    // Primeiro evento deve ser 'connected'
    assert.match(emittedMessages[0], /event: connected/);
    assert.match(emittedMessages[0], new RegExp(tenantAlphaId));

    // Cleanup
    mockRequest.emit('close');
  });

  // ============================================================================
  // TESTE 3: ISOLAMENTO MULTI-TENANT ESTRITO (ALPHA vs BETA)
  // ============================================================================
  test('CRITÉRIO FUNDAMENTAL: Evento disparado na Oficina Alpha NUNCA é recebido pela Oficina Beta', () => {
    const alphaMessages: string[] = [];
    const betaMessages: string[] = [];

    // Conexão do Monitor TV da Loja Alpha
    const alphaReq = new EventEmitter() as any;
    alphaReq.raw = alphaReq;
    const alphaReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: () => {},
        write: (chunk: string) => {
          alphaMessages.push(chunk);
          return true;
        },
      },
    } as any;
    realtimeHub.registerClient(tenantAlphaId, alphaReq, alphaReply);

    // Conexão do Monitor TV da Loja Beta (Concorrente)
    const betaReq = new EventEmitter() as any;
    betaReq.raw = betaReq;
    const betaReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: () => {},
        write: (chunk: string) => {
          betaMessages.push(chunk);
          return true;
        },
      },
    } as any;
    realtimeHub.registerClient(tenantBetaId, betaReq, betaReply);

    // Limpa mensagens iniciais de 'connected'
    alphaMessages.length = 0;
    betaMessages.length = 0;

    // Dispara evento de atualização de OS exclusiva da Oficina Alpha
    const deliveredCount = realtimeHub.publish(tenantAlphaId, 'work_order.updated', {
      workOrderId: 'wo-alpha-999',
      osNumber: 1001,
      status: 'IN_PROGRESS',
      progress: 50,
      vehiclePlate: 'ALP-1001',
    });

    assert.equal(deliveredCount, 1);
    assert.equal(alphaMessages.length, 1);
    assert.match(alphaMessages[0], /event: work_order.updated/);
    assert.match(alphaMessages[0], /wo-alpha-999/);
    assert.match(alphaMessages[0], /ALP-1001/);

    // CRITÉRIO DE ISOLAMENTO: Beta NÃO recebeu rigorosamente nada!
    assert.equal(betaMessages.length, 0);

    // Cleanup
    alphaReq.emit('close');
    betaReq.emit('close');
  });

  // ============================================================================
  // TESTE 4: EMISSÃO AUTOMÁTICA EM TRANSIÇÃO DE ESTADO NA ORDEM DE SERVIÇO
  // ============================================================================
  test('deve emitir work_order.updated e work_order.ready ao transicionar status da OS via API', async () => {
    const tvMessages: string[] = [];
    const mockReq = new EventEmitter() as any;
    mockReq.raw = mockReq;

    const mockReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: () => {},
        write: (chunk: string) => {
          tvMessages.push(chunk);
          return true;
        },
      },
    } as any;

    realtimeHub.registerClient(tenantAlphaId, mockReq, mockReply);
    tvMessages.length = 0; // descarta 'connected'

    // 1. Move OS de QUOTE para APPROVED
    await workOrderService.transitionStatus(
      tenantAlphaId,
      woAlphaId,
      { status: WorkOrderStatus.APPROVED },
      ownerAlphaId
    );

    assert.equal(tvMessages.length, 1);
    assert.match(tvMessages[0], /event: work_order.updated/);
    assert.match(tvMessages[0], /"status":"APPROVED"/);

    // 2. Move OS para CHECKED_IN
    tvMessages.length = 0;
    await workOrderService.transitionStatus(
      tenantAlphaId,
      woAlphaId,
      { status: WorkOrderStatus.CHECKED_IN },
      ownerAlphaId
    );
    assert.equal(tvMessages.length, 1);
    assert.match(tvMessages[0], /"status":"CHECKED_IN"/);

    // 3. Move OS para IN_PROGRESS
    tvMessages.length = 0;
    await workOrderService.transitionStatus(
      tenantAlphaId,
      woAlphaId,
      { status: WorkOrderStatus.IN_PROGRESS },
      ownerAlphaId
    );
    assert.equal(tvMessages.length, 1);
    assert.match(tvMessages[0], /"status":"IN_PROGRESS"/);

    // 4. Move OS para QA (Inspeção de Qualidade)
    tvMessages.length = 0;
    await workOrderService.transitionStatus(
      tenantAlphaId,
      woAlphaId,
      { status: WorkOrderStatus.QA },
      ownerAlphaId
    );
    assert.equal(tvMessages.length, 1);
    assert.match(tvMessages[0], /"status":"QA"/);

    // 5. Move OS para READY (Veículo Pronto) -> Emite work_order.updated E work_order.ready
    tvMessages.length = 0;
    await workOrderService.transitionStatus(
      tenantAlphaId,
      woAlphaId,
      { status: WorkOrderStatus.READY },
      ownerAlphaId
    );

    assert.equal(tvMessages.length, 2);
    assert.match(tvMessages[0], /event: work_order.updated/);
    assert.match(tvMessages[1], /event: work_order.ready/);
    assert.match(tvMessages[1], /RTE2E26/); // Placa do veículo

    // Cleanup
    mockReq.emit('close');
  });

  // ============================================================================
  // TESTE 5: DESCONEXÃO LIMPA E PREVENÇÃO CONTRA VAZAMENTO DE MEMÓRIA (MEMORY LEAKS)
  // ============================================================================
  test('deve desinscrever cliente ao fechar conexão e manter contador em zero', () => {
    const mockReq = new EventEmitter() as any;
    mockReq.raw = mockReq;

    const mockReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: () => {},
        write: () => true,
      },
    } as any;

    realtimeHub.registerClient(tenantAlphaId, mockReq, mockReply);
    let stats = realtimeHub.getStats(tenantAlphaId);
    assert.equal(stats.tenantConnections, 1);

    // Simula desconexão do cliente (ex: fechou navegador da TV ou celular)
    mockReq.emit('close');

    stats = realtimeHub.getStats(tenantAlphaId);
    assert.equal(stats.tenantConnections, 0); // Desalocado com 100% de sucesso!
  });

  // ============================================================================
  // TESTE 6: DISPARO MANUAL E ESTATÍSTICAS VIA ENDPOINTS HTTP (/realtime/publish, /realtime/stats)
  // ============================================================================
  test('deve disparar evento manual e consultar estatísticas via HTTP autenticado', async () => {
    // 1. Conecta um ouvinte para a oficina
    const mockReq = new EventEmitter() as any;
    mockReq.raw = mockReq;
    const mockReply = {
      raw: {
        writableEnded: false,
        destroyed: false,
        writeHead: () => {},
        write: () => true,
      },
    } as any;
    realtimeHub.registerClient(tenantAlphaId, mockReq, mockReply);

    // 2. Consulta stats via HTTP
    const resStats = await app.inject({
      method: 'GET',
      url: '/realtime/stats',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });
    assert.equal(resStats.statusCode, 200);
    const statsBody = JSON.parse(resStats.body);
    assert.equal(statsBody.tenantConnections, 1);

    // 3. Dispara evento pontual manual via POST /realtime/publish
    const resPublish = await app.inject({
      method: 'POST',
      url: '/realtime/publish',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        event: 'appointment.created',
        data: {
          appointmentId: 'app-1234',
          bayId: 'bay-01',
          scheduledAt: new Date().toISOString(),
          clientName: 'Cliente Teste VIP',
        },
      },
    });

    assert.equal(resPublish.statusCode, 200);
    const pubBody = JSON.parse(resPublish.body);
    assert.equal(pubBody.success, true);
    assert.equal(pubBody.deliveredCount, 1);
    assert.equal(pubBody.event, 'appointment.created');

    // Cleanup
    mockReq.emit('close');
  });
});
