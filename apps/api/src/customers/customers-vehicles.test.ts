import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.1 — Clientes e Veículos (Placa por Oficina)', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;
  let customerBetaId: string;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Criar Oficina Alpha
    tenantAlphaSlug = `oficina-alpha-${Date.now()}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Auto Center Alpha', 'Auto Center Alpha LTDA', $1, $2, '11.111.111/0001-11', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    const passHash = await hashPassword('CarX@Alpha2026!');
    const userAlphaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id`,
      [`gestor.${tenantAlphaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    const userAlphaId = userAlphaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, userAlphaId],
      { bypassRls: true }
    );

    ownerAlphaToken = signJwt({
      userId: userAlphaId,
      email: `gestor.${tenantAlphaSlug}@carx.local`,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // 2. Criar Oficina Beta
    tenantBetaSlug = `oficina-beta-${Date.now()}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Estética Beta', 'Estética Beta LTDA', $1, $2, '22.222.222/0002-22', 'active', 'detailing')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const userBetaRes = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id`,
      [`gestor.${tenantBetaSlug}@carx.local`, passHash],
      { bypassRls: true }
    );
    const userBetaId = userBetaRes.rows[0].id;

    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, userBetaId],
      { bypassRls: true }
    );

    ownerBetaToken = signJwt({
      userId: userBetaId,
      email: `gestor.${tenantBetaSlug}@carx.local`,
      tenantId: tenantBetaId,
      role: 'owner',
    });
  });

  after(async () => {
    await app.close();
  });

  test('CADASTRO DE CLIENTE: Oficina Alpha cadastra cliente com telefone normalizado para E.164', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/customers',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Carlos Eduardo da Silva',
        phone: '(11) 98765-4321', // Entrada com máscara
        document: '529.982.247-25', // CPF válido formatado
        email: 'carlos.silva@exemplo.com.br',
        addressStreet: 'Av. Paulista',
        addressNumber: '1000',
        addressCity: 'São Paulo',
        addressState: 'SP',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    customerAlphaId = body.id;

    assert.equal(body.name, 'Carlos Eduardo da Silva');
    assert.equal(body.phone, '+5511987654321'); // Normalização E.164 comprovada!
    assert.equal(body.document, '52998224725');
    assert.equal(body.documentType, 'cpf');
    assert.equal(body.tenantId, tenantAlphaId);
  });

  test('CADASTRO DE CLIENTE: Oficina Beta cadastra cliente próprio de forma isolada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/customers',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        name: 'Mariana Albuquerque',
        phone: '41991234567',
        email: 'mariana@exemplo.com.br',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    customerBetaId = body.id;

    assert.equal(body.name, 'Mariana Albuquerque');
    assert.equal(body.phone, '+5541991234567');
    assert.equal(body.tenantId, tenantBetaId);
  });

  test('CRITÉRIO FUNDAMENTAL T3.1: Oficina Alpha e Oficina Beta cadastram a MESMA PLACA sem choque', async () => {
    const sharedPlate = 'ABC1D23'; // Placa Padrão Mercosul

    // 1. Oficina Alpha cadastra Corolla com a placa ABC1D23
    const resAlpha = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlphaId,
        plate: sharedPlate,
        brand: 'Toyota',
        model: 'Corolla Altis',
        year: 2023,
        color: 'Branco Perolizado',
        sizeClass: 'sedan',
        currentKm: 25000,
      },
    });

    assert.equal(resAlpha.statusCode, 201);
    const bodyAlpha = JSON.parse(resAlpha.body);
    vehicleAlphaId = bodyAlpha.id;
    assert.equal(bodyAlpha.plate, 'ABC1D23');
    assert.equal(bodyAlpha.tenantId, tenantAlphaId);

    // 2. Oficina Beta cadastra Honda Civic com a EXATA MESMA PLACA ABC1D23
    // Em SaaS multitenant, a restrição de placa é ÚNICA POR OFICINA (uq_vehicles_tenant_plate)
    const resBeta = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        customerId: customerBetaId,
        plate: 'abc-1d23', // Teste de case-insensitive e normalização com hífen
        brand: 'Honda',
        model: 'Civic Touring',
        year: 2022,
        color: 'Cinza Bário',
        sizeClass: 'sedan',
        currentKm: 32000,
      },
    });

    assert.equal(resBeta.statusCode, 201);
    const bodyBeta = JSON.parse(resBeta.body);
    assert.equal(bodyBeta.plate, 'ABC1D23');
    assert.equal(bodyBeta.tenantId, tenantBetaId);
    assert.notEqual(bodyAlpha.id, bodyBeta.id);
  });

  test('UNICIDADE POR OFICINA: Impede que a mesma oficina cadastre duas vezes a mesma placa (HTTP 409)', async () => {
    // Oficina Alpha tenta cadastrar novamente a placa ABC1D23 que já possui
    const res = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlphaId,
        plate: 'ABC1D23',
        brand: 'Outro Veículo',
        model: 'Modelo Conflitante',
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.ok(body.message.includes('já está cadastrado nesta oficina'));
  });

  test('VALIDAÇÃO DE PLACA: Rejeita formatos inválidos de placa automotiva (HTTP 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlphaId,
        plate: 'PLACA_INVALIDA_123',
        brand: 'BMW',
        model: '320i',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.ok(body.message.includes('formato automotivo válido'));
  });

  test('BUSCA POR PLACA: /vehicles/by-plate/:plate retorna veículo e dados do proprietário', async () => {
    // Busca na Oficina Alpha pela placa ABC1D23
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/by-plate/abc-1d23', // Normaliza hífen na busca
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.plate, 'ABC1D23');
    assert.equal(body.model, 'Corolla Altis');
    assert.equal(body.customer.name, 'Carlos Eduardo da Silva');
  });

  test('ISOLAMENTO RLS: Oficina Alpha NÃO enxerga clientes nem veículos da Oficina Beta', async () => {
    // 1. Alpha consulta listagem de clientes
    const customersRes = await app.inject({
      method: 'GET',
      url: '/customers',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(customersRes.statusCode, 200);
    const customersBody = JSON.parse(customersRes.body);
    assert.ok(customersBody.customers.some((c: any) => c.name === 'Carlos Eduardo da Silva'));
    assert.ok(!customersBody.customers.some((c: any) => c.name === 'Mariana Albuquerque')); // Mariana é de Beta!

    // 2. Alpha tenta buscar diretamente o cliente de Beta por ID
    const directCustomerRes = await app.inject({
      method: 'GET',
      url: `/customers/${customerBetaId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(directCustomerRes.statusCode, 404);

    // 3. Alpha consulta listagem de veículos
    const vehiclesRes = await app.inject({
      method: 'GET',
      url: '/vehicles',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(vehiclesRes.statusCode, 200);
    const vehiclesBody = JSON.parse(vehiclesRes.body);
    assert.ok(vehiclesBody.vehicles.some((v: any) => v.model === 'Corolla Altis'));
    assert.ok(!vehiclesBody.vehicles.some((v: any) => v.model === 'Civic Touring')); // Civic é de Beta!
  });

  test('BUSCA PAGINADA NO SERVIDOR: Filtro por termo textual encontra cliente e veículo', async () => {
    // Busca por "Eduardo"
    const res = await app.inject({
      method: 'GET',
      url: '/customers?search=eduardo',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.total, 1);
    assert.equal(body.customers[0].name, 'Carlos Eduardo da Silva');
  });

  test('ATUALIZAÇÃO DE VEÍCULO: Atualiza quilometragem, cor e notas cadastrais', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/vehicles/${vehicleAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        currentKm: 27500,
        notes: 'Cliente realizou revisão de 25k em concessionária',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.currentKm, 27500);
    assert.equal(body.notes, 'Cliente realizou revisão de 25k em concessionária');
  });

  test('DETALHE DO CLIENTE COM VEÍCULOS: /customers/:id traz frota completa vinculada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/customers/${customerAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.name, 'Carlos Eduardo da Silva');
    assert.ok(Array.isArray(body.vehicles));
    assert.equal(body.vehicles.length, 1);
    assert.equal(body.vehicles[0].plate, 'ABC1D23');
  });
});
