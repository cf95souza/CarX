import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { inferVehicleSizeClass } from '@carx/shared';
import { plateLookupService } from './plate-lookup-service.js';

describe('T6.2 — Consulta Automática de Placa com Cache e Porte Automotivo', () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testCustomerId: string;
  let authToken: string;

  before(async () => {
    try {
      app = await buildServer();
      await app.ready();

      // 1. Limpar cache prévio para garantir ambiente limpo
      await tenantQuery(null, "DELETE FROM vehicle_plate_cache WHERE plate IN ('ABC1D23', 'TEST999', 'LOC4L12', 'CIV1C99')", [], { bypassRls: true });

      // 2. Criar tenant de teste isolado
      const timestamp = Date.now();
      const slug = `plate-test-${timestamp}`;
      const tenantRes = await tenantQuery<any>(
        null,
        `
        INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, settings)
        VALUES ('Oficina Placas LTDA', 'CarX Placas Test', $1, 'placas@carx.test', '99.888.777/0001-66', '11977776666', 'active', '{}'::jsonb)
        RETURNING id;
        `,
        [slug],
        { bypassRls: true }
      );
      testTenantId = tenantRes.rows[0].id;

      // 2. Criar cliente no tenant
      const custRes = await tenantQuery<any>(
        testTenantId,
        `
        INSERT INTO customers (tenant_id, name, phone, email)
        VALUES ($1, 'Roberto Andrade', '11999887766', 'roberto@cliente.test')
        RETURNING id;
        `,
        [testTenantId]
      );
      testCustomerId = custRes.rows[0].id;

      // 3. Cadastrar um veículo local conhecido
      await tenantQuery(
        testTenantId,
        `
        INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class, notes)
        VALUES ($1, $2, 'LOC4L12', 'Toyota', 'Corolla Cross XRE', 'Branco Pérola', 2024, 'suv', 'Cliente VIP da oficina');
        `,
        [testTenantId, testCustomerId]
      );

      // 4. Obter token JWT de autenticação para as chamadas HTTP
      authToken = signJwt({
        userId: 'usr-test-plate',
        tenantId: testTenantId,
        role: 'owner',
      });
    } catch (err) {
      console.error('FATAL BEFORE ERROR:', err);
      throw err;
    }
  });

  after(async () => {
    if (testTenantId) {
      await tenantQuery(null, `DELETE FROM vehicles WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM customers WHERE tenant_id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM tenants WHERE id = $1`, [testTenantId], { bypassRls: true });
      await tenantQuery(null, `DELETE FROM vehicle_plate_cache WHERE plate IN ('ABC1D23', 'TEST999', 'LOC4L12', 'CIV1C99')`, [], { bypassRls: true });
    }
    if (app) {
      await app.close();
    }
  });

  test('Deve rejeitar placa com formato inválido (HTTP 400)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/vehicles/lookup-plate/INVALIDA_123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.match(body.message, /formato válido|padrão mercosul/i);
  });

  test('Deve consultar placa Mercosul nova e classificar porte SUV', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/vehicles/lookup-plate/ABC1D23',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);

    assert.equal(data.plate, 'ABC1D23');
    assert.ok(data.brand, 'Deveria retornar marca');
    assert.ok(data.model, 'Deveria retornar modelo');
    assert.ok(data.sizeClass, 'Deveria inferir sizeClass');
    assert.ok(['external', 'national_registry'].includes(data.source));
    assert.ok(data.cachedAt, 'Deveria possuir data de cache');
  });

  test('Deve recuperar do cache compartilhado na segunda consulta (source: cache)', async () => {
    // Consulta repetida da placa ABC1D23
    const response = await app.inject({
      method: 'GET',
      url: '/vehicles/lookup-plate/ABC1D23',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);

    assert.equal(data.plate, 'ABC1D23');
    assert.equal(data.source, 'cache');
    assert.ok(data.cachedAt);
  });

  test('Deve identificar veículo já cadastrado na oficina (source: local_tenant) com dados do cliente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/vehicles/lookup-plate/LOC-4L12', // com hífen deve sanitizar
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': testTenantId,
      },
    });

    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);

    assert.equal(data.plate, 'LOC4L12');
    assert.equal(data.source, 'local_tenant');
    assert.equal(data.brand, 'Toyota');
    assert.match(data.model, /Corolla Cross/);
    assert.equal(data.sizeClass, 'suv');
    assert.ok(data.existingCustomer, 'Deveria vincular ao cliente existente da loja');
    assert.equal(data.existingCustomer.name, 'Roberto Andrade');
    assert.equal(data.existingCustomer.phone, '11999887766');
  });

  test('Deve inferir corretamente portes para modelos conhecidos via função de domínio', () => {
    assert.equal(inferVehicleSizeClass('Toyota', 'Hilux CD SRX'), 'pickup');
    assert.equal(inferVehicleSizeClass('Volkswagen', 'Tera Highline'), 'suv');
    assert.equal(inferVehicleSizeClass('Honda', 'Civic Touring'), 'sedan');
    assert.equal(inferVehicleSizeClass('Fiat', 'Fiorino Endurance'), 'van');
    assert.equal(inferVehicleSizeClass('BMW', 'S1000RR'), 'moto');
    assert.equal(inferVehicleSizeClass('Porsche', '911 Carrera GTS'), 'esportivo');
    assert.equal(inferVehicleSizeClass('Chevrolet', 'Onix Premier'), 'hatch');
  });
});
