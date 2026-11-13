import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.7 — Agenda Inteligente com Ocupação por Box & Duração por Porte', () => {
  let app: FastifyInstance;

  // Tenant Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let techLucasId: string;
  let techRafaId: string;

  // Tenant Beta (Isolamento)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;

  let bay1Id: string;
  let bay2Id: string;
  let servicePpfId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@SmartSchedule2026!');

    // 1. Setup Tenant Alpha
    tenantAlphaSlug = `alpha-smart-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Smart Detailing', 'Alpha Smart LTDA', $1, $2, '11.888.999/0001-22', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Gestor Alpha
    const resOwner = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha Smart', $1, $2)
       RETURNING id`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    const ownerAlphaId = resOwner.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'owner',
      permissions: ['*'],
    });

    // Técnico Lucas
    const resLucas = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Lucas PPF Specialist', $1, $2)
       RETURNING id`,
      [`lucas@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    techLucasId = resLucas.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'tecnico')`,
      [tenantAlphaId, techLucasId],
      { bypassRls: true }
    );

    // Técnico Rafa
    const resRafa = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Rafa Polimento', $1, $2)
       RETURNING id`,
      [`rafa@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    techRafaId = resRafa.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'tecnico')`,
      [tenantAlphaId, techRafaId],
      { bypassRls: true }
    );

    // Boxes de Atendimento
    const resBay1 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO bays (tenant_id, name, color, order_index)
       VALUES ($1, 'Box 1 · Lucas', '#C8F52E', 0)
       RETURNING id;`,
      [tenantAlphaId],
      { bypassRls: true }
    );
    bay1Id = resBay1.rows[0].id;

    const resBay2 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO bays (tenant_id, name, color, order_index)
       VALUES ($1, 'Box 2 · Rafa', '#CDEBFB', 1)
       RETURNING id;`,
      [tenantAlphaId],
      { bypassRls: true }
    );
    bay2Id = resBay2.rows[0].id;

    // Serviço PPF
    const resServ = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO services (tenant_id, name, category, price_cents, estimated_minutes)
       VALUES ($1, 'PPF Frontal Completo', 'PPF', 350000, 240)
       RETURNING id;`,
      [tenantAlphaId],
      { bypassRls: true }
    );
    servicePpfId = resServ.rows[0].id;

    // Preço e tempo diferenciado por porte para SUV
    await tenantQuery(
      null,
      `INSERT INTO service_prices_by_class (tenant_id, service_id, size_class, price_cents, estimated_minutes)
       VALUES ($1, $2, 'suv', 420000, 300);`,
      [tenantAlphaId, servicePpfId],
      { bypassRls: true }
    );

    // 2. Setup Tenant Beta
    tenantBetaSlug = `beta-smart-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Smart Detailing', 'Beta Smart LTDA', $1, $2, '11.444.555/0001-33', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta Smart', $1, $2)
       RETURNING id`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    const ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`,
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

  test('1. Cálculo de Duração Automática por Porte Veicular (POST /appointments/calculate-duration)', async () => {
    // 1.1 Base manual de 120min para hatch (fator 0.85 -> 105 min)
    const resHatch = await app.inject({
      method: 'POST',
      url: '/appointments/calculate-duration',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        baseMinutes: 120,
        sizeClass: 'hatch',
      },
    });

    assert.equal(resHatch.statusCode, 200);
    const bodyHatch = resHatch.json();
    assert.equal(bodyHatch.sizeClass, 'hatch');
    assert.equal(bodyHatch.multiplier, 0.85);
    // 120 * 0.85 = 102 -> arredondado para múltiplo de 15 = 105 min
    assert.equal(bodyHatch.estimatedMinutes, 105);

    // 1.2 Base manual de 120min para SUV (fator 1.25 -> 150 min)
    const resSuv = await app.inject({
      method: 'POST',
      url: '/appointments/calculate-duration',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        baseMinutes: 120,
        sizeClass: 'suv',
      },
    });
    assert.equal(resSuv.statusCode, 200);
    const bodySuv = resSuv.json();
    assert.equal(bodySuv.sizeClass, 'suv');
    assert.equal(bodySuv.multiplier, 1.25);
    assert.equal(bodySuv.estimatedMinutes, 150);

    // 1.3 Base calibrada do serviço cadastrado com duração específica de 300min para SUV
    const resServiceSuv = await app.inject({
      method: 'POST',
      url: '/appointments/calculate-duration',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        serviceIds: [servicePpfId],
        sizeClass: 'suv',
      },
    });
    assert.equal(resServiceSuv.statusCode, 200);
    const bodyServiceSuv = resServiceSuv.json();
    assert.equal(bodyServiceSuv.estimatedMinutes, 300);
    assert.equal(bodyServiceSuv.details?.[0]?.minutes, 300);
  });

  test('2. Anti-Conflito Estrito: Impede colisão de horário no mesmo Box (HTTP 409)', async () => {
    // Cria agendamento no Box 1 das 09:00 às 11:00
    const res1 = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bay1Id,
        technicianId: techLucasId,
        title: 'Chevrolet Montana - Insulfilm',
        customerName: 'Carlos Silveira',
        vehiclePlate: 'BRA2E19',
        vehicleModel: 'Montana',
        startTime: '2026-11-20T09:00:00.000Z',
        endTime: '2026-11-20T11:00:00.000Z',
        estimatedMinutes: 120,
      },
    });
    assert.equal(res1.statusCode, 201);

    // Tentar agendar no Box 1 das 10:00 às 12:00 (sobreposição)
    const resOverlapBay = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bay1Id,
        title: 'Fiat Fiorino - Revisão',
        customerName: 'Renato Alves',
        vehiclePlate: 'FIO1A23',
        vehicleModel: 'Fiorino',
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T12:00:00.000Z',
        estimatedMinutes: 120,
      },
    });
    assert.equal(resOverlapBay.statusCode, 409);
    assert.match(resOverlapBay.json().message, /Choque de horário: O box/);
  });

  test('3. Anti-Conflito Estrito: Impede que o mesmo Técnico seja alocado em dois agendamentos simultâneos (HTTP 409)', async () => {
    // Lucas já está ocupado das 09:00 às 11:00 no Box 1.
    // Tentar alocar o mesmo Lucas no Box 2 das 10:30 às 12:30 deve ser bloqueado!
    const resOverlapTech = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bay2Id, // Box diferente!
        technicianId: techLucasId, // Mesmo técnico!
        title: 'BYD Seal - PPF',
        customerName: 'Daniel Moreira',
        vehiclePlate: 'BYD3E45',
        vehicleModel: 'Seal',
        startTime: '2026-11-20T10:30:00.000Z',
        endTime: '2026-11-20T12:30:00.000Z',
        estimatedMinutes: 120,
      },
    });

    assert.equal(resOverlapTech.statusCode, 409);
    const body = resOverlapTech.json();
    assert.match(body.message, /Choque de horário: O profissional "Lucas PPF Specialist" já possui o agendamento/);
  });

  test('4. Agendamento com outro Técnico no Box 2 é aceito com sucesso', async () => {
    // Alocar Rafa no Box 2 no mesmo horário (09:00 às 11:00) deve funcionar
    const resRafaApp = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bay2Id,
        technicianId: techRafaId,
        title: 'BYD Seal - PPF Frontal',
        customerName: 'Daniel Moreira',
        vehiclePlate: 'BYD3E45',
        vehicleModel: 'Seal',
        startTime: '2026-11-20T09:00:00.000Z',
        endTime: '2026-11-20T11:00:00.000Z',
        estimatedMinutes: 120,
      },
    });

    assert.equal(resRafaApp.statusCode, 201);
  });

  test('5. Visão Inteligente por Box & Detecção de Atrasos (GET /appointments/smart-overview)', async () => {
    // Criar um agendamento no passado recente (ex: 2 horas atrás) em andamento para gerar flag de atraso
    const pastStart = new Date(Date.now() - 3 * 3600000).toISOString();
    const pastEnd = new Date(Date.now() - 1 * 3600000).toISOString();
    const todayStr = new Date().toISOString().split('T')[0];

    await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        bayId: bay1Id,
        technicianId: techLucasId,
        title: 'BMW X5 - PPF Atrasado',
        customerName: 'Marcos Silva',
        vehiclePlate: 'BMW9X99',
        vehicleModel: 'BMW X5',
        startTime: pastStart,
        endTime: pastEnd,
        estimatedMinutes: 120,
        status: 'in_progress',
      },
    });

    const resOverview = await app.inject({
      method: 'GET',
      url: `/appointments/smart-overview?date=${todayStr}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(resOverview.statusCode, 200);
    const overview = resOverview.json();
    assert.equal(overview.date, todayStr);
    assert.ok(Array.isArray(overview.bays));
    assert.ok(overview.bays.length >= 2);

    // O Box 1 deve conter o agendamento em atraso e o status de ocupação 'delayed'
    const box1 = overview.bays.find((b: any) => b.id === bay1Id);
    assert.ok(box1);
    assert.equal(box1.occupancyStatus, 'delayed');

    const delayedApp = box1.appointments.find((a: any) => a.title.includes('BMW X5'));
    assert.ok(delayedApp);
    assert.equal(delayedApp.isDelayed, true);
    assert.ok(delayedApp.delayMinutes > 0);
    assert.equal(delayedApp.statusColor, '#FEE2E2'); // Cor de alerta
    assert.ok(overview.delayedCount >= 1);
  });

  test('6. ISOLAMENTO MULTI-TENANT: Oficina Beta não acessa boxes nem agenda da Oficina Alpha', async () => {
    const resBetaOverview = await app.inject({
      method: 'GET',
      url: `/appointments/smart-overview?date=2026-11-20`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(resBetaOverview.statusCode, 200);
    const betaOverview = resBetaOverview.json();
    // Não deve conter os boxes nem agendamentos da oficina Alpha
    const hasAlphaBay = betaOverview.bays.some((b: any) => b.id === bay1Id || b.id === bay2Id);
    assert.equal(hasAlphaBay, false);
  });
});

