import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.6 — Agenda Inteligente por Box e Agendamento Online', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let techAlphaId: string;
  let techAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let servicePpfId: string;
  let servicePolimentoId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  // IDs gerados durante os testes
  let bayAlpha1Id: string;
  let bayAlpha2Id: string;
  let appointment1Id: string;
  let appointment2Id: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@Agenda2026!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-agenda-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Detailing & PPF', 'Alpha PPF LTDA', $1, $2, '11.222.333/0001-99', 'active', 'ppf')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Proprietário Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = resOwnerAlpha.rows[0].id;
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
      permissions: ['*'],
    });

    // Técnico Alpha
    const resTechAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Técnico Especialista', $1, $2)
       RETURNING id`,
      [`tecnico@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    techAlphaId = resTechAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico')`,
      [tenantAlphaId, techAlphaId],
      { bypassRls: true }
    );
    techAlphaToken = signJwt({
      userId: techAlphaId,
      tenantId: tenantAlphaId,
      role: 'tecnico',
      permissions: ['os:read', 'os:update'],
    });

    // Cliente Alpha
    const resCustAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, phone, email)
       VALUES ($1, 'Roberto Andrade', '+5511999991122', 'roberto@gmail.com')
       RETURNING id`,
      [tenantAlphaId]
    );
    customerAlphaId = resCustAlpha.rows[0].id;

    // Veículo Alpha (Sedan)
    const resVehAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'CAR3600', 'BMW', '320i M Sport', 2024, 'Cinza Dravit', 'sedan')
       RETURNING id`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVehAlpha.rows[0].id;

    // Serviços no catálogo de Alpha
    const resPpf = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, category, price_cents, estimated_minutes, warranty_months, is_active)
       VALUES ($1, 'Aplicação PPF Frontal', 'PPF', 350000, 180, 60, true)
       RETURNING id`,
      [tenantAlphaId]
    );
    servicePpfId = resPpf.rows[0].id;

    // Preço e tempo do PPF por classe (Sedan = 120min, SUV = 180min)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO service_prices_by_class (tenant_id, service_id, size_class, price_cents, estimated_minutes)
       VALUES ($1, $2, 'sedan', 350000, 120), ($1, $2, 'suv', 420000, 180)`,
      [tenantAlphaId, servicePpfId]
    );

    const resPolimento = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO services (tenant_id, name, category, price_cents, estimated_minutes, warranty_months, is_active)
       VALUES ($1, 'Polimento Técnico Comercial', 'Detailing', 80000, 90, 6, true)
       RETURNING id`,
      [tenantAlphaId]
    );
    servicePolimentoId = resPolimento.rows[0].id;

    // 2. Setup Oficina Beta (para validação de isolamento RLS)
    tenantBetaSlug = `beta-agenda-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Estética Automotiva', 'Beta Estética LTDA', $1, $2, '22.333.444/0001-88', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'owner',
      permissions: ['*'],
    });
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // TESTES
  // ============================================================================

  test('1. Cadastro e listagem de Boxes de atendimento (bays)', async () => {
    // Criar Box 1
    const res1 = await app.inject({
      method: 'POST',
      url: '/bays',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Box 1 - PPF & Películas',
        description: 'Cabine climatizada com iluminação especial',
        color: '#C8F52E',
        orderIndex: 1,
      },
    });

    assert.equal(res1.statusCode, 201, 'Deve criar o Box 1 com status 201');
    const body1 = JSON.parse(res1.payload);
    assert.equal(body1.name, 'Box 1 - PPF & Películas');
    assert.equal(body1.color, '#C8F52E');
    assert.equal(body1.isActive, true);
    bayAlpha1Id = body1.id;

    // Criar Box 2
    const res2 = await app.inject({
      method: 'POST',
      url: '/bays',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Box 2 - Polimento & Detailing',
        description: 'Box com elevador pantográfico',
        color: '#5CC8FF',
        orderIndex: 2,
      },
    });

    assert.equal(res2.statusCode, 201, 'Deve criar o Box 2 com status 201');
    const body2 = JSON.parse(res2.payload);
    bayAlpha2Id = body2.id;

    // Listar boxes
    const listRes = await app.inject({
      method: 'GET',
      url: '/bays',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(listRes.statusCode, 200);
    const list = JSON.parse(listRes.payload);
    assert.equal(list.length, 2, 'Deve listar exatamente 2 boxes');

    // Tentativa de duplicar nome do box na mesma oficina deve retornar 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/bays',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Box 1 - PPF & Películas',
      },
    });

    assert.equal(dupRes.statusCode, 409, 'Deve rejeitar duplicação de nome com HTTP 409 Conflict');
  });

  test('2. Agendamento interno com alocação de box, técnico e cliente', async () => {
    const startTime = '2026-11-10T09:00:00.000Z';
    const endTime = '2026-11-10T11:00:00.000Z'; // 120 minutos

    const res = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bayAlpha1Id,
        technicianId: techAlphaId,
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        title: 'Aplicação PPF BMW 320i',
        startTime,
        endTime,
        estimatedMinutes: 120,
        status: 'scheduled',
        notes: 'Cliente aguarda na loja',
      },
    });

    assert.equal(res.statusCode, 201, 'Deve criar agendamento com HTTP 201');
    const body = JSON.parse(res.payload);
    assert.equal(body.bayId, bayAlpha1Id);
    assert.equal(body.technicianId, techAlphaId);
    assert.equal(body.origin, 'INTERNAL');
    assert.equal(body.status, 'scheduled');
    assert.equal(body.bayName, 'Box 1 - PPF & Películas');
    assert.equal(body.technicianName, 'Técnico Especialista');
    appointment1Id = body.id;
  });

  test('3. CRITÉRIO DE ACEITE: Dois clientes são impedidos de agendar no mesmo box e mesmo horário simultaneamente (HTTP 409 Conflict)', async () => {
    // Horário conflitante: 10:00 às 12:00 (sobrepõe o intervalo 09:00 - 11:00 no Box 1)
    const conflictStartTime = '2026-11-10T10:00:00.000Z';
    const conflictEndTime = '2026-11-10T12:00:00.000Z';

    const res = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bayAlpha1Id, // Mesmo Box 1!
        title: 'Tentativa Conflitante no Box 1',
        startTime: conflictStartTime,
        endTime: conflictEndTime,
        estimatedMinutes: 120,
      },
    });

    assert.equal(res.statusCode, 409, 'CRITÉRIO DE ACEITE: Deve retornar HTTP 409 Conflict para sobreposição no mesmo box');
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('Choque de horário'), 'Mensagem de erro deve alertar sobre o choque de horário');
    assert.ok(body.conflictingAppointment, 'Resposta deve indicar o agendamento conflitante');
  });

  test('4. Agendamento em box diferente no mesmo horário é PERMITIDO (boxes paralelos)', async () => {
    // Mesmo horário (09:00 às 11:00), mas no Box 2
    const startTime = '2026-11-10T09:00:00.000Z';
    const endTime = '2026-11-10T11:00:00.000Z';

    const res = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bayAlpha2Id, // Box 2 paralelo!
        title: 'Polimento Paralelo no Box 2',
        startTime,
        endTime,
        estimatedMinutes: 120,
      },
    });

    assert.equal(res.statusCode, 201, 'Agendamento em box diferente no mesmo horário deve ser aprovado');
    const body = JSON.parse(res.payload);
    assert.equal(body.bayId, bayAlpha2Id);
    appointment2Id = body.id;
  });

  test('5. Reagendamento / Atualização de horário para slot livre', async () => {
    // Mover appointment1 do Box 1 para a tarde (14:00 às 16:00)
    const newStartTime = '2026-11-10T14:00:00.000Z';
    const newEndTime = '2026-11-10T16:00:00.000Z';

    const res = await app.inject({
      method: 'PUT',
      url: `/appointments/${appointment1Id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        startTime: newStartTime,
        endTime: newEndTime,
      },
    });

    assert.equal(res.statusCode, 200, 'Reagendamento deve ser aceito');
    const body = JSON.parse(res.payload);
    assert.equal(new Date(body.startTime).toISOString(), newStartTime);
  });

  test('6. Cancelamento de agendamento libera o horário no box para novo agendamento', async () => {
    // Cancelar o agendamento da tarde (14:00 - 16:00 no Box 1)
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/appointments/${appointment1Id}/status`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        status: 'canceled',
      },
    });

    assert.equal(cancelRes.statusCode, 200);
    const cancelBody = JSON.parse(cancelRes.payload);
    assert.equal(cancelBody.status, 'canceled');

    // Agora, novo agendamento no mesmo horário 14:00 - 16:00 no Box 1 deve ser aprovado!
    const rebookRes = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bayAlpha1Id,
        title: 'Novo cliente após cancelamento',
        startTime: '2026-11-10T14:00:00.000Z',
        endTime: '2026-11-10T16:00:00.000Z',
      },
    });

    assert.equal(rebookRes.statusCode, 201, 'Horário cancelado deve estar livre para novas reservas');
  });

  test('7. Consulta de disponibilidade por box (GET /appointments/availability)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/appointments/availability?date=2026-11-10',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const slots = JSON.parse(res.payload);
    assert.ok(Array.isArray(slots));
    assert.ok(slots.length > 0);

    // O slot das 09:00 - 10:00 no Box 2 deve estar indisponível devido ao appointment2
    const occupiedSlot = slots.find(
      (s: any) =>
        s.bayId === bayAlpha2Id &&
        s.startTime.includes('09:00') &&
        s.isAvailable === false
    );
    assert.ok(occupiedSlot, 'Slot ocupado no Box 2 deve estar marcado como isAvailable: false');
  });

  test('8. CRITÉRIO DE ACEITE: Agendamento online público aceita apenas campos seguros e cria OS em status QUOTE e origem ONLINE', async () => {
    const publicPayload = {
      customerName: 'Leandro Pires',
      customerPhone: '+5511977778899',
      customerEmail: 'leandro@empresa.com.br',
      vehiclePlate: 'ABC1D23',
      vehicleModel: 'Audi RS3 Sportback',
      vehicleSizeClass: 'sedan',
      serviceIds: [servicePpfId], // 120 minutos para sedan
      preferredStartTime: '2026-11-11T10:00:00.000Z',
      notes: 'Solicito atenção nas quinas do capô',
    };

    const res = await app.inject({
      method: 'POST',
      url: `/public/book/${tenantAlphaSlug}`,
      payload: publicPayload,
    });

    assert.equal(res.statusCode, 201, 'Endpoint público deve retornar 201 Created');
    const body = JSON.parse(res.payload);

    // Validações da Ordem de Serviço
    assert.ok(body.workOrder, 'Resposta deve conter a OS gerada');
    assert.equal(body.workOrder.status, 'QUOTE', 'CRITÉRIO DE ACEITE: OS pública deve iniciar estritamente em status QUOTE');
    assert.equal(body.workOrder.origin, 'ONLINE', 'CRITÉRIO DE ACEITE: OS pública deve ter origem ONLINE');
    assert.ok(body.workOrder.osNumber > 0, 'OS deve ter os_number atômico sequencial');
    assert.ok(body.workOrder.trackingToken, 'OS pública deve conter token de tracking público');
    assert.ok(body.workOrder.trackingUrl.includes('/work-orders/tracking/'), 'Deve conter link de rastreio');

    // Validações do Agendamento
    assert.ok(body.appointment, 'Resposta deve conter o agendamento');
    assert.equal(body.appointment.origin, 'ONLINE', 'Agendamento público deve ter origem ONLINE');
    assert.equal(body.appointment.status, 'scheduled');
    assert.equal(body.appointment.vehiclePlate, 'ABC1D23');
    assert.equal(body.appointment.estimatedMinutes, 120, 'Tempo estimado do Sedan deve ser 120 minutos');

    // Conferir que endTime foi calculado exatamente como startTime + 120min (10:00 -> 12:00)
    assert.equal(new Date(body.appointment.endTime).toISOString(), '2026-11-11T12:00:00.000Z');
  });

  test('9. CRITÉRIO DE ACEITE DE SEGURANÇA: Endpoint público NÃO consegue definir status, valores pagos nem técnico', async () => {
    const maliciousPayload = {
      customerName: 'Hacker Invasor',
      customerPhone: '+5511999990000',
      vehiclePlate: 'HCK1337',
      vehicleModel: 'Carro Teste',
      serviceIds: [servicePolimentoId],
      preferredStartTime: '2026-11-12T14:00:00.000Z',
      // Injeção maliciosa de campos sensíveis
      status: 'DELIVERED',
      paidCents: 999999,
      paid_cents: 999999,
      technicianId: techAlphaId,
      technician_id: techAlphaId,
      progress: 100,
    };

    const res = await app.inject({
      method: 'POST',
      url: `/public/book/${tenantAlphaSlug}`,
      payload: maliciousPayload,
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    const createdWoId = body.workOrder.id;

    // Inspecionar direto no banco de dados para atestar que os valores injetados foram sumariamente ignorados
    const dbRes = await tenantQuery<{
      status: string;
      origin: string;
      paid_cents: number;
      technician_id: string | null;
      progress: number;
    }>(
      tenantAlphaId,
      'SELECT status, origin, paid_cents, technician_id, progress FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantAlphaId, createdWoId]
    );

    const woInDb = dbRes.rows[0];
    assert.equal(woInDb.status, 'QUOTE', 'Status deve permanecer estritamente QUOTE');
    assert.equal(woInDb.origin, 'ONLINE', 'Origem deve permanecer estritamente ONLINE');
    assert.equal(woInDb.paid_cents, 0, 'Valor pago deve ser 0 (impossível injetar quitação pelo agendamento online)');
    assert.equal(woInDb.technician_id, null, 'Técnico deve permanecer nulo (impossível forçar atribuição sem triagem)');
    assert.equal(woInDb.progress, 0, 'Progresso deve ser 0');
  });

  test('10. PROTEÇÃO ANTI-BOT: Campo honeypot preenchido resulta em rejeição imediata com HTTP 400', async () => {
    const botPayload = {
      customerName: 'Robo Spammer',
      customerPhone: '+5511988887777',
      vehiclePlate: 'BOT0001',
      vehicleModel: 'SpamMobile',
      serviceIds: [servicePpfId],
      preferredStartTime: '2026-11-13T10:00:00.000Z',
      website: 'https://spam-crawler-bot.com/click-here', // Honeypot preenchido!
    };

    const res = await app.inject({
      method: 'POST',
      url: `/public/book/${tenantAlphaSlug}`,
      payload: botPayload,
    });

    assert.equal(res.statusCode, 400, 'Honeypot deve provocar bloqueio imediato com HTTP 400');
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('anti-bot'), 'Mensagem deve indicar bloqueio por proteção anti-bot');
  });

  test('11. ISOLAMENTO RLS: Oficina Beta não consegue consultar boxes nem agendamentos da Oficina Alpha', async () => {
    // Oficina Beta tenta consultar Box 1 da Oficina Alpha
    const bayRes = await app.inject({
      method: 'GET',
      url: `/bays/${bayAlpha1Id}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(bayRes.statusCode, 404, 'Oficina Beta recebe 404 ao tentar ver box de Alpha');

    // Oficina Beta tenta consultar Agendamento 2 da Oficina Alpha
    const appRes = await app.inject({
      method: 'GET',
      url: `/appointments/${appointment2Id}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(appRes.statusCode, 404, 'Oficina Beta recebe 404 ao tentar ver agendamento de Alpha');
  });

  test('12. ISOLAMENTO RLS: Oficina Beta não pode agendar em box da Oficina Alpha', async () => {
    // Oficina Beta tenta criar agendamento passando o bayId da Oficina Alpha
    const res = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        bayId: bayAlpha1Id, // Box de Alpha!
        title: 'Agendamento Indevido entre Lojas',
        startTime: '2026-11-15T09:00:00.000Z',
        endTime: '2026-11-15T10:00:00.000Z',
      },
    });

    assert.equal(res.statusCode, 404, 'Tentativa de usar box de outro tenant deve ser rejeitada com 404 Not Found');
  });
});
