import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.12 — Painel Corporativo de Redes e Franquias (Multiunidade)', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlphaGestor: string;
  let tokenAlphaTecnico: string;
  let tokenBetaGestor: string;
  let unitMatrizId: string;
  let unitFilial1Id: string;
  let unitBetaId: string;
  let rollId: string;
  let materialId: string;
  let custAlphaId: string;
  let vehAlphaId: string;

  before(async () => {
    try {
      app = buildServer();
      await app.ready();

      // 1. Criar Plano Multiunidade com max_units = 3
      const planRes = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO plans (name, slug, price_cents, limits, features)
         VALUES ('Rede Multiunidade', $1, 49900, '{"max_units": 3, "max_users": 15}'::jsonb, '["corporate", "transfers"]'::jsonb)
         RETURNING id;`,
        [`plan-multi-${Date.now()}`],
        { bypassRls: true }
      );
      const multiPlanId = planRes.rows[0].id;

      // 2. Criar Tenant Alpha (Rede de Oficinas)
      const tAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
         VALUES ('Alpha Motors Group', 'Alpha Motors LTDA', 'contato@alphagroup.com', '11999990001', $1, 'active', $2)
         RETURNING id;`,
        [`alpha-group-${Date.now()}`, multiPlanId],
        { bypassRls: true }
      );
      tenantAlphaId = tAlpha.rows[0].id;

      // 3. Criar Tenant Beta (Concorrente)
      const tBeta = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
         VALUES ('Beta Detailers', 'Beta Detailers LTDA', 'contato@betadetail.com', '11999990002', $1, 'active', $2)
         RETURNING id;`,
        [`beta-group-${Date.now()}`, multiPlanId],
        { bypassRls: true }
      );
      tenantBetaId = tBeta.rows[0].id;

      // 4. Usuários e Tokens
      const pwdHash = await hashPassword('Admin@123456');

      // Gestor Alpha
      const uAlphaGestor = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Diretor Alpha', $1, $2) RETURNING id;`,
        [`diretor_alpha_${Date.now()}@alpha.com`, pwdHash],
        { bypassRls: true }
      );
      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true);`,
        [tenantAlphaId, uAlphaGestor.rows[0].id],
        { bypassRls: true }
      );
      tokenAlphaGestor = signJwt({
        id: uAlphaGestor.rows[0].id,
        email: `diretor_alpha_${Date.now()}@alpha.com`,
        name: 'Diretor Alpha',
        role: 'owner',
        tenantId: tenantAlphaId,
      });

      // Técnico Alpha (papel restrito sem permissão corporativa)
      const uAlphaTec = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Técnico Alpha', $1, $2) RETURNING id;`,
        [`tec_alpha_${Date.now()}@alpha.com`, pwdHash],
        { bypassRls: true }
      );
      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'tecnico', true);`,
        [tenantAlphaId, uAlphaTec.rows[0].id],
        { bypassRls: true }
      );
      tokenAlphaTecnico = signJwt({
        id: uAlphaTec.rows[0].id,
        email: `tec_alpha_${Date.now()}@alpha.com`,
        name: 'Técnico Alpha',
        role: 'tecnico',
        tenantId: tenantAlphaId,
      });

      // Gestor Beta
      const uBetaGestor = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Diretor Beta', $1, $2) RETURNING id;`,
        [`diretor_beta_${Date.now()}@beta.com`, pwdHash],
        { bypassRls: true }
      );
      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true);`,
        [tenantBetaId, uBetaGestor.rows[0].id],
        { bypassRls: true }
      );
      tokenBetaGestor = signJwt({
        id: uBetaGestor.rows[0].id,
        email: `diretor_beta_${Date.now()}@beta.com`,
        name: 'Diretor Beta',
        role: 'owner',
        tenantId: tenantBetaId,
      });

      // 5. Cadastrar Filial Matriz Alpha e Filial Beta
      const uMatriz = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO units (tenant_id, name, slug, address_city, address_state, is_active)
         VALUES ($1, 'Alpha Matriz - Jardins', 'alpha-jardins', 'São Paulo', 'SP', true)
         RETURNING id;`,
        [tenantAlphaId]
      );
      unitMatrizId = uMatriz.rows[0].id;

      const uBeta = await tenantQuery<{ id: string }>(
        tenantBetaId,
        `INSERT INTO units (tenant_id, name, slug, address_city, address_state, is_active)
         VALUES ($1, 'Beta Centro', 'beta-centro', 'São Paulo', 'SP', true)
         RETURNING id;`,
        [tenantBetaId]
      );
      unitBetaId = uBeta.rows[0].id;

      // 6. Cadastrar Bobina e Material na Matriz Alpha
      const mat = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO materials (tenant_id, unit_id, name, sku, category, unit, cost_cents, current_stock, min_stock, is_roll)
         VALUES ($1, $2, 'Vitrificador Cerâmico 9H', 'VIT-9H', 'Químicos', 'un', 15000, 10, 2, false)
         RETURNING id;`,
        [tenantAlphaId, unitMatrizId]
      );
      materialId = mat.rows[0].id;

      const roll = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO material_rolls (tenant_id, unit_id, material_id, code, brand, initial_meters, current_meters, cost_cents, status)
         VALUES ($1, $2, $3, 'BOB-PPF-001', 'XPEL Ultimate Plus', 15.0, 15.0, 450000, 'in_use')
         RETURNING id;`,
        [tenantAlphaId, unitMatrizId, materialId]
      );
      rollId = roll.rows[0].id;

      // 7. Cadastrar Cliente e Veículo para testes de OS
      const cust = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO customers (tenant_id, name, email, phone)
         VALUES ($1, 'Cliente Corporativo Alpha', 'cli@corp.com', '11988887777')
         RETURNING id;`,
        [tenantAlphaId]
      );
      custAlphaId = cust.rows[0].id;

      const veh = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model)
         VALUES ($1, $2, 'COR1234', 'Porsche', '911 GT3')
         RETURNING id;`,
        [tenantAlphaId, custAlphaId]
      );
      vehAlphaId = veh.rows[0].id;
    } catch (err) {
      console.error('Erro no setup do teste corporativo:', err);
      throw err;
    }
  });

  after(async () => {
    try {
      if (app) {
        await app.close();
      }
    } catch (err) {
      console.warn('Erro ao fechar app de teste corporativo:', err);
    }
  });

  it('deve listar as unidades ativas da rede', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/corporate/units',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].name, 'Alpha Matriz - Jardins');
    assert.strictEqual(body[0].slug, 'alpha-jardins');
  });

  it('deve cadastrar uma nova filial respeitando os limites do plano (quota max_units)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/corporate/units',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Alpha Filial Moema',
        slug: 'alpha-moema',
        cnpj: '12.345.678/0002-99',
        addressCity: 'São Paulo',
        addressState: 'SP',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.id);
    assert.strictEqual(body.name, 'Alpha Filial Moema');
    assert.strictEqual(body.slug, 'alpha-moema');
    unitFilial1Id = body.id;
  });

  it('deve bloquear criação de filiais quando exceder o limite contratado de max_units', async () => {
    // Cadastra 3ª unidade (limite contratado é 3)
    const resThird = await app.inject({
      method: 'POST',
      url: '/corporate/units',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Alpha Filial Alphaville',
        slug: 'alpha-alphaville',
      },
    });
    assert.strictEqual(resThird.statusCode, 201);

    // Tenta cadastrar 4ª unidade (deve ser rejeitado com 403 Forbidden / Quota Exceeded)
    const resFourth = await app.inject({
      method: 'POST',
      url: '/corporate/units',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Alpha Filial Morumbi',
        slug: 'alpha-morumbi',
      },
    });

    assert.strictEqual(resFourth.statusCode, 403);
    const body = JSON.parse(resFourth.body);
    assert.strictEqual(body.code, 'QUOTA_EXCEEDED');
    assert.ok(body.message.includes('Limite de unidades/filiais atingido'));
  });

  it('deve atualizar dados de uma filial com sucesso', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/corporate/units/${unitFilial1Id}`,
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        phone: '11988887777',
        addressStreet: 'Av. Ibirapuera, 1500',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.phone, '11988887777');
    assert.strictEqual(body.addressStreet, 'Av. Ibirapuera, 1500');
  });

  it('deve consolidar o cockpit corporativo da rede com ranking e métricas de desempenho', async () => {
    // Criar box na Matriz e Filial Moema
    const bayMatriz = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO bays (tenant_id, unit_id, name, is_active)
       VALUES ($1, $2, 'Box 1 - PPF Matriz', true) RETURNING id;`,
      [tenantAlphaId, unitMatrizId]
    );

    // Criar OS na Matriz (R$ 3.500,00)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, unit_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, $4, 3001, 'COMPLETED', 350000, 0, 350000, 350000);`,
      [tenantAlphaId, unitMatrizId, custAlphaId, vehAlphaId]
    );

    // Criar agendamento em andamento ocupando o Box 1 na Matriz
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO appointments (tenant_id, bay_id, title, start_time, end_time, status)
       VALUES ($1, $2, 'Instalação PPF Frontal', NOW(), NOW() + INTERVAL '4 hours', 'in_progress');`,
      [tenantAlphaId, bayMatriz.rows[0].id]
    );

    // Criar OS na Filial Moema (R$ 1.500,00)
    await tenantQuery(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, unit_id, customer_id, vehicle_id, os_number, status, total_cents, discount_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, $4, 3002, 'COMPLETED', 150000, 0, 150000, 150000);`,
      [tenantAlphaId, unitFilial1Id, custAlphaId, vehAlphaId]
    );

    const res = await app.inject({
      method: 'GET',
      url: '/corporate/overview',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.strictEqual(body.totalRevenueCents, 500000); // 350000 + 150000
    assert.strictEqual(body.totalWorkOrders, 2);
    assert.strictEqual(body.averageTicketCents, 250000);
    assert.strictEqual(body.totalUnitsCount, 3);
    assert.ok(Array.isArray(body.unitsRanking));
    assert.strictEqual(body.unitsRanking.length, 3);

    // Matriz faturou 350000 e deve ser Rank 1
    assert.strictEqual(body.unitsRanking[0].unitId, unitMatrizId);
    assert.strictEqual(body.unitsRanking[0].rank, 1);
    assert.strictEqual(body.unitsRanking[0].revenueCents, 350000);

    // Moema faturou 150000 e deve ser Rank 2
    assert.strictEqual(body.unitsRanking[1].unitId, unitFilial1Id);
    assert.strictEqual(body.unitsRanking[1].rank, 2);
    assert.strictEqual(body.unitsRanking[1].revenueCents, 150000);
  });

  it('deve transferir bobina de PPF da Matriz para a Filial com rastreabilidade auditada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/corporate/transfers',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        fromUnitId: unitMatrizId,
        toUnitId: unitFilial1Id,
        transferType: 'roll',
        rollId: rollId,
        quantity: 1,
        notes: 'Transferência de bobina XPEL para suprir demanda da Filial Moema',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.fromUnitId, unitMatrizId);
    assert.strictEqual(body.toUnitId, unitFilial1Id);
    assert.strictEqual(body.transferType, 'roll');
    assert.strictEqual(body.rollId, rollId);
    assert.strictEqual(body.status, 'completed');

    // Valida que a bobina agora está fisicamente alocada na Filial Moema no banco
    const rollCheck = await tenantQuery<{ unit_id: string }>(
      tenantAlphaId,
      'SELECT unit_id FROM material_rolls WHERE id = $1 AND tenant_id = $2;',
      [rollId, tenantAlphaId]
    );
    assert.strictEqual(rollCheck.rows[0].unit_id, unitFilial1Id);
  });

  it('deve transferir insumo fracionado decrementando na origem e incrementando no destino', async () => {
    // Matriz tinha 10 unidades de Vitrificador Cerâmico. Transfere 4 para Filial Moema.
    const res = await app.inject({
      method: 'POST',
      url: '/corporate/transfers',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        fromUnitId: unitMatrizId,
        toUnitId: unitFilial1Id,
        transferType: 'material',
        materialId: materialId,
        quantity: 4,
        notes: 'Envio de 4 frascos de vitrificador para atendimento agendado',
      },
    });

    assert.strictEqual(res.statusCode, 201);

    // Valida saldo na origem: 10 - 4 = 6
    const sourceCheck = await tenantQuery<{ current_stock: string }>(
      tenantAlphaId,
      'SELECT current_stock FROM materials WHERE id = $1 AND tenant_id = $2;',
      [materialId, tenantAlphaId]
    );
    assert.strictEqual(Number(sourceCheck.rows[0].current_stock), 6);

    // Valida saldo no destino: 4
    const destCheck = await tenantQuery<{ current_stock: string }>(
      tenantAlphaId,
      'SELECT current_stock FROM materials WHERE unit_id = $1 AND tenant_id = $2 AND sku = $3;',
      [unitFilial1Id, tenantAlphaId, 'VIT-9H']
    );
    assert.strictEqual(Number(destCheck.rows[0].current_stock), 4);
  });

  it('deve garantir isolamento multi-tenant estrito: proibir transferência entre filiais de diferentes oficinas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/corporate/transfers',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        fromUnitId: unitMatrizId,
        toUnitId: unitBetaId, // Unidade que pertence ao Tenant Beta!
        transferType: 'roll',
        rollId: rollId,
        quantity: 1,
      },
    });

    // Deve rejeitar com 404 (Unidade não encontrada ou não pertence a esta oficina)
    assert.strictEqual(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.code, 'UNITS_NOT_FOUND');
  });

  it('deve aplicar controle RBAC: bloquear usuário técnico de acessar o painel corporativo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/corporate/overview',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error, 'Forbidden');
    assert.ok(body.message.includes('Acesso negado'));
  });
});
