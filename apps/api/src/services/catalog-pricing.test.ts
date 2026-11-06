import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T3.2 — Catálogo de Serviços, Preços por Porte e Combos', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let serviceAlphaPolimentoId: string;
  let serviceAlphaHigienizacaoId: string;
  let packageAlphaId: string;
  let vehicleAlphaSuvId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();

    const timestamp = Date.now();

    // 1. Criar Oficina Alpha
    tenantAlphaSlug = `alpha-catalog-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha Estética Automotiva', 'Alpha Detailer LTDA', $1, $2, '33.333.333/0001-33', 'active', 'detailing')
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
    tenantBetaSlug = `beta-catalog-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Mecânica e Pintura', 'Beta Reparos LTDA', $1, $2, '44.444.444/0002-44', 'active', 'mecanica')
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

    // 3. Criar cliente e veículo SUV na Oficina Alpha para testes com vehicleId
    const custRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, phone, document, email)
       VALUES ($1, 'Carlos Silva', '+5511999887766', '12345678901', 'carlos@teste.local')
       RETURNING id`,
      [tenantAlphaId]
    );
    const customerId = custRes.rows[0].id;

    const vehRes = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color, size_class)
       VALUES ($1, $2, 'SUV1A23', 'Toyota', 'Corolla Cross', 2024, 'Preto', 'suv')
       RETURNING id`,
      [tenantAlphaId, customerId]
    );
    vehicleAlphaSuvId = vehRes.rows[0].id;
  });

  after(async () => {
    await app.close();
  });

  test('1. deve cadastrar serviços no catálogo com categoria, garantia em meses e estimativa de insumo', async () => {
    // Serviço 1: Polimento Técnico Comercial
    const res1 = await app.inject({
      method: 'POST',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Polimento Técnico Comercial',
        description: 'Correção de verniz em 2 etapas com corte e refino',
        category: 'Estética Externa',
        priceCents: 35000, // Preço base Sedan: R$ 350,00
        estimatedMinutes: 120, // 2 horas
        warrantyMonths: 6,
        materialConsumptionEstimate: { pastaPolirGramas: 100, boinaCorteUnidades: 1 },
      },
    });

    assert.equal(res1.statusCode, 201);
    const body1 = JSON.parse(res1.body);
    assert.ok(body1.id);
    assert.equal(body1.name, 'Polimento Técnico Comercial');
    assert.equal(body1.priceCents, 35000);
    assert.equal(body1.warrantyMonths, 6);
    assert.equal(body1.materialConsumptionEstimate.pastaPolirGramas, 100);
    serviceAlphaPolimentoId = body1.id;

    // Serviço 2: Higienização Interna Completa
    const res2 = await app.inject({
      method: 'POST',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Higienização Interna Completa',
        description: 'Limpeza a vapor, bancos, teto e hidratação de plásticos',
        category: 'Estética Interna',
        priceCents: 25000, // Preço base Sedan: R$ 250,00
        estimatedMinutes: 90,
        warrantyMonths: 3,
      },
    });

    assert.equal(res2.statusCode, 201);
    const body2 = JSON.parse(res2.body);
    assert.ok(body2.id);
    serviceAlphaHigienizacaoId = body2.id;
  });

  test('2. deve configurar tabela de preços e tempos específicos por porte de veículo (UPSERT)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/catalog/services/${serviceAlphaPolimentoId}/prices`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        prices: [
          { sizeClass: 'moto', priceCents: 18000, estimatedMinutes: 60, warrantyMonths: 3 },
          { sizeClass: 'hatch', priceCents: 30000, estimatedMinutes: 100, warrantyMonths: 6 },
          { sizeClass: 'sedan', priceCents: 35000, estimatedMinutes: 120, warrantyMonths: 6 },
          { sizeClass: 'suv', priceCents: 48000, estimatedMinutes: 180, warrantyMonths: 6 },
          { sizeClass: 'pickup', priceCents: 55000, estimatedMinutes: 210, warrantyMonths: 6 },
        ],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 5);

    // Consulta os preços cadastrados
    const getRes = await app.inject({
      method: 'GET',
      url: `/catalog/services/${serviceAlphaPolimentoId}/prices`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    const suvPrice = getBody.find((p: any) => p.sizeClass === 'suv');
    assert.ok(suvPrice);
    assert.equal(suvPrice.priceCents, 48000);
    assert.equal(suvPrice.estimatedMinutes, 180);
  });

  test('3. deve criar combo de serviços com desconto percentual no servidor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/packages',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Combo Proteção Total (Polimento + Higienização)',
        description: 'Pacote completo estético com 15% de desconto promocional',
        discountType: 'percentage',
        discountValue: 15, // 15% de desconto
        serviceIds: [serviceAlphaPolimentoId, serviceAlphaHigienizacaoId],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.id);
    assert.equal(body.name, 'Combo Proteção Total (Polimento + Higienização)');
    assert.equal(body.discountType, 'percentage');
    assert.equal(body.discountValue, 15);
    assert.equal(body.items.length, 2);
    packageAlphaId = body.id;
  });

  test('4. deve calcular orçamento sugerindo preço e tempo para veículo HATCH', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleSizeClass: 'hatch',
        serviceIds: [serviceAlphaPolimentoId],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.vehicleSizeClass, 'hatch');
    assert.equal(body.items.length, 1);

    const item = body.items[0];
    assert.equal(item.serviceId, serviceAlphaPolimentoId);
    assert.equal(item.basePriceCents, 35000); // Base: 350
    assert.equal(item.appliedPriceCents, 30000); // Hatch: 300
    assert.equal(item.appliedMinutes, 100); // Hatch: 100 min
    assert.equal(item.isOverriddenByClass, true);
    assert.equal(body.subtotalCents, 30000);
    assert.equal(body.discountCents, 0);
    assert.equal(body.totalCents, 30000);
    assert.equal(body.totalEstimatedMinutes, 100);
  });

  test('5. deve calcular orçamento sugerindo preço e tempo majorados para veículo SUV', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleSizeClass: 'suv',
        serviceIds: [serviceAlphaPolimentoId],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.vehicleSizeClass, 'suv');

    const item = body.items[0];
    assert.equal(item.appliedPriceCents, 48000); // SUV: 480
    assert.equal(item.appliedMinutes, 180); // SUV: 180 min
    assert.equal(body.totalCents, 48000);
    assert.equal(body.totalEstimatedMinutes, 180);
  });

  test('6. deve fazer fallback gracioso para os valores base quando a classe do veículo não possuir override', async () => {
    // 'van' não foi cadastrada na tabela de preços por porte do Polimento
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleSizeClass: 'van',
        serviceIds: [serviceAlphaPolimentoId],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.vehicleSizeClass, 'van');

    const item = body.items[0];
    assert.equal(item.isOverriddenByClass, false);
    assert.equal(item.appliedPriceCents, 35000); // Usa o preço base
    assert.equal(item.appliedMinutes, 120); // Usa o tempo base
    assert.equal(body.totalCents, 35000);
  });

  test('7. deve calcular orçamento buscando automaticamente a classe de porte a partir de um vehicleId cadastrado', async () => {
    // Passa vehicleAlphaSuvId diretamente (cadastrado como 'suv')
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleId: vehicleAlphaSuvId,
        serviceIds: [serviceAlphaPolimentoId],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.vehicleSizeClass, 'suv');
    assert.equal(body.items[0].appliedPriceCents, 48000);
    assert.equal(body.totalCents, 48000);
  });

  test('8. deve aplicar desconto de combo no servidor distribuindo proporcionalmente entre os itens', async () => {
    // Orçamento do combo para um SUV:
    // Polimento SUV: R$ 480,00
    // Higienização (sem override para SUV, usa base): R$ 250,00
    // Subtotal: 480 + 250 = R$ 730,00 (73000 centavos)
    // Desconto 15%: round(73000 * 0.15) = 10950 centavos (R$ 109,50)
    // Total esperado: 73000 - 10950 = 62050 centavos (R$ 620,50)
    const res = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleSizeClass: 'suv',
        packageId: packageAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.package);
    assert.equal(body.package.id, packageAlphaId);
    assert.equal(body.items.length, 2);

    assert.equal(body.subtotalCents, 73000);
    assert.equal(body.discountCents, 10950);
    assert.equal(body.totalCents, 62050);

    // Soma dos descontos individuais deve bater exatamente com o desconto total
    const sumDiscounts = body.items.reduce((acc: number, it: any) => acc + it.packageDiscountCents, 0);
    assert.equal(sumDiscounts, 10950);

    // Soma dos preços finais individuais deve bater exatamente com o totalCents
    const sumFinal = body.items.reduce((acc: number, it: any) => acc + it.finalPriceCents, 0);
    assert.equal(sumFinal, 62050);
  });

  test('9. deve criar e calcular combo com desconto fixo em centavos (R$ 100 de desconto)', async () => {
    // Cria combo com R$ 100 (10000 centavos) de desconto fixo
    const pkgRes = await app.inject({
      method: 'POST',
      url: '/catalog/packages',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Combo Desconto Fixo',
        discountType: 'fixed_cents',
        discountValue: 10000,
        serviceIds: [serviceAlphaPolimentoId, serviceAlphaHigienizacaoId],
      },
    });
    assert.equal(pkgRes.statusCode, 201);
    const pkgBody = JSON.parse(pkgRes.body);

    const calcRes = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        vehicleSizeClass: 'sedan',
        packageId: pkgBody.id,
      },
    });

    assert.equal(calcRes.statusCode, 200);
    const calcBody = JSON.parse(calcRes.body);
    // Sedan: Polimento (35000) + Higienização (25000) = Subtotal 60000
    // Desconto fixo: 10000
    // Total: 50000
    assert.equal(calcBody.subtotalCents, 60000);
    assert.equal(calcBody.discountCents, 10000);
    assert.equal(calcBody.totalCents, 50000);
  });

  test('10. deve garantir isolamento RLS entre lojas: Oficina Beta não vê serviços nem pacotes da Oficina Alpha', async () => {
    // Oficina Beta consulta lista de serviços: deve receber array vazio
    const resBetaServices = await app.inject({
      method: 'GET',
      url: '/catalog/services',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });

    assert.equal(resBetaServices.statusCode, 200);
    const betaServices = JSON.parse(resBetaServices.body);
    assert.equal(betaServices.length, 0);

    // Oficina Beta tenta consultar serviço da Oficina Alpha diretamente por ID
    const resBetaGet = await app.inject({
      method: 'GET',
      url: `/catalog/services/${serviceAlphaPolimentoId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });
    assert.equal(resBetaGet.statusCode, 404);

    // Oficina Beta tenta consultar pacote da Oficina Alpha diretamente por ID
    const resBetaPkg = await app.inject({
      method: 'GET',
      url: `/catalog/packages/${packageAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });
    assert.equal(resBetaPkg.statusCode, 404);
  });

  test('11. deve impedir que Oficina Beta calcule orçamento utilizando ID de serviço da Oficina Alpha', async () => {
    // Oficina Beta tenta calcular preço com serviceId da Oficina Alpha
    const resBetaCalc = await app.inject({
      method: 'POST',
      url: '/catalog/calculate-pricing',
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
      payload: {
        vehicleSizeClass: 'suv',
        serviceIds: [serviceAlphaPolimentoId],
      },
    });

    assert.equal(resBetaCalc.statusCode, 200);
    const betaCalc = JSON.parse(resBetaCalc.body);
    // Como o serviço pertence à Alpha, o tenantQuery isolado por RLS retorna vazio para a Beta
    assert.equal(betaCalc.items.length, 0);
    assert.equal(betaCalc.totalCents, 0);
  });

  test('12. deve comprovar gravação de trilha de auditoria imutável para eventos do catálogo', async () => {
    const auditRes = await tenantQuery<{ action: string; entity: string }>(
      tenantAlphaId,
      `SELECT action, entity 
       FROM audit_logs 
       WHERE tenant_id = $1 AND entity IN ('services', 'service_prices_by_class', 'packages')
       ORDER BY created_at DESC;`,
      [tenantAlphaId]
    );

    assert.ok(auditRes.rows.length >= 3);
    const actions = auditRes.rows.map((r) => r.action);
    assert.ok(actions.includes('SERVICE_CREATED'));
    assert.ok(actions.includes('SERVICE_PRICES_BY_CLASS_UPDATED'));
    assert.ok(actions.includes('PACKAGE_CREATED'));
  });
});

