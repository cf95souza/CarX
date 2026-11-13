import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T6.15 — CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlphaGestor: string;
  let tokenBetaGestor: string;
  let userAlphaGestorId: string;
  let customerAlpha1Id: string;
  let customerAlpha2Id: string;
  let vehicleAlpha1Id: string;
  let vehicleAlpha2Id: string;
  let warrantyAlpha1Id: string;
  let workOrderAlpha1Id: string;

  before(async () => {
    try {
      app = buildServer();
      await app.ready();

      // 1. Tenants Alpha e Beta
      const tAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Alpha CRM Studio', 'Alpha CRM Detailing LTDA', 'crm@alpha.com', '11999995555', $1, 'active')
         RETURNING id;`,
        [`alpha-crm-${Date.now()}`],
        { bypassRls: true }
      );
      tenantAlphaId = tAlpha.rows[0].id;

      const tBeta = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status)
         VALUES ('Beta CRM Studio', 'Beta CRM Detailing LTDA', 'crm@beta.com', '11999996666', $1, 'active')
         RETURNING id;`,
        [`beta-crm-${Date.now()}`],
        { bypassRls: true }
      );
      tenantBetaId = tBeta.rows[0].id;

      // 2. Usuários Gestores
      const pwdHash = await hashPassword('Gestor@123456');

      const uAlpha = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Gestor CRM Alpha', $1, $2) RETURNING id;`,
        [`gestor_crm_${Date.now()}@alpha.com`, pwdHash],
        { bypassRls: true }
      );
      userAlphaGestorId = uAlpha.rows[0].id;

      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'gestor', true);`,
        [tenantAlphaId, userAlphaGestorId],
        { bypassRls: true }
      );

      const uBeta = await tenantQuery<{ id: string }>(
        null,
        `INSERT INTO users (name, email, password_hash)
         VALUES ('Gestor CRM Beta', $1, $2) RETURNING id;`,
        [`gestor_crm_${Date.now()}@beta.com`, pwdHash],
        { bypassRls: true }
      );
      const userBetaGestorId = uBeta.rows[0].id;

      await tenantQuery(
        null,
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'gestor', true);`,
        [tenantBetaId, userBetaGestorId],
        { bypassRls: true }
      );

      // Tokens JWT
      tokenAlphaGestor = signJwt({
        sub: userAlphaGestorId,
        email: `gestor_crm_${Date.now()}@alpha.com`,
        role: 'gestor',
        tenantId: tenantAlphaId,
      });

      tokenBetaGestor = signJwt({
        sub: userBetaGestorId,
        email: `gestor_crm_${Date.now()}@beta.com`,
        role: 'gestor',
        tenantId: tenantBetaId,
      });

      // 3. Clientes no Tenant Alpha
      // Cliente 1: Ativo, fez PPF há 170 dias (revisão de 180 dias devida em 10 dias)
      const c1 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO customers (tenant_id, name, phone, email, document)
         VALUES ($1, 'Carlos Retenção PPF', '11988881111', 'carlos@crm.com', '12345678901')
         RETURNING id;`,
        [tenantAlphaId]
      );
      customerAlpha1Id = c1.rows[0].id;

      const v1 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year)
         VALUES ($1, $2, 'PPF9X88', 'Porsche', '911 Carrera S', 'Preto', 2024)
         RETURNING id;`,
        [tenantAlphaId, customerAlpha1Id]
      );
      vehicleAlpha1Id = v1.rows[0].id;

      // OS antiga (170 dias atrás)
      const date170dAgo = new Date(Date.now() - 170 * 24 * 60 * 60 * 1000);
      const wo1 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, delivered_at, created_at)
         VALUES ($1, $2, $3, 9001, 'completed', 1500000, $4, $4)
         RETURNING id;`,
        [tenantAlphaId, customerAlpha1Id, vehicleAlpha1Id, date170dAgo.toISOString()]
      );
      workOrderAlpha1Id = wo1.rows[0].id;

      // Garantia de PPF de 5 anos (60 meses) iniciada há 170 dias
      const expires5y = new Date(date170dAgo.getTime() + 60 * 30 * 24 * 60 * 60 * 1000);
      const w1 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO warranties (tenant_id, work_order_id, customer_id, vehicle_id, service_name, warranty_months, starts_at, expires_at, status)
         VALUES ($1, $2, $3, $4, 'PPF Full Frontal XPEL Ultimate', 60, $5, $6, 'active')
         RETURNING id;`,
        [
          tenantAlphaId,
          workOrderAlpha1Id,
          customerAlpha1Id,
          vehicleAlpha1Id,
          date170dAgo.toISOString(),
          expires5y.toISOString(),
        ]
      );
      warrantyAlpha1Id = w1.rows[0].id;

      // Cliente 2: Inativo há 220 dias (>180d tier de risco de churn)
      const c2 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO customers (tenant_id, name, phone, email, document)
         VALUES ($1, 'Renata Inativa Churn', '11977772222', 'renata@crm.com', '98765432100')
         RETURNING id;`,
        [tenantAlphaId]
      );
      customerAlpha2Id = c2.rows[0].id;

      const v2 = await tenantQuery<{ id: string }>(
        tenantAlphaId,
        `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year)
         VALUES ($1, $2, 'INAT777', 'BMW', 'X5 M Competition', 'Azul', 2023)
         RETURNING id;`,
        [tenantAlphaId, customerAlpha2Id]
      );
      vehicleAlpha2Id = v2.rows[0].id;

      const date220dAgo = new Date(Date.now() - 220 * 24 * 60 * 60 * 1000);
      await tenantQuery(
        tenantAlphaId,
        `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, delivered_at, created_at)
         VALUES ($1, $2, $3, 9002, 'completed', 250000, $4, $4);`,
        [tenantAlphaId, customerAlpha2Id, vehicleAlpha2Id, date220dAgo.toISOString()]
      );
    } catch (err) {
      console.error('Falha no before dos testes de CRM:', err);
      throw err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. GET /crm/retention/rules — deve auto-inicializar e listar as regras padrão de retenção', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/crm/retention/rules',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200, res.payload);
    const rules = JSON.parse(res.payload);
    assert(Array.isArray(rules), 'Deve retornar array de regras');
    assert(rules.length >= 4, 'Deve conter as 4 regras padrão');

    const ppfRule = rules.find((r: any) => r.serviceCategory === 'ppf');
    assert(ppfRule, 'Deve conter regra para PPF');
    assert.strictEqual(ppfRule.intervalDays, 180, 'Regra PPF deve ser de 180 dias (6 meses)');
  });

  it('2. POST /crm/retention/rules — deve cadastrar uma regra personalizada de pós-venda', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/crm/retention/rules',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        name: 'Polimento e Cristalização (90 Dias)',
        serviceCategory: 'polimento',
        triggerType: 'service_interval',
        intervalDays: 90,
        channel: 'whatsapp',
        messageTemplate:
          'Olá, {cliente}! Já se passaram 90 dias do polimento da sua {veiculo}. Use o cupom {cupom_codigo} para ter {cupom_beneficio} na lavagem detalhada de manutenção!',
        discountType: 'percentage',
        discountValue: 20,
      },
    });

    assert.strictEqual(res.statusCode, 201, res.payload);
    const created = JSON.parse(res.payload);
    assert.strictEqual(created.name, 'Polimento e Cristalização (90 Dias)');
    assert.strictEqual(created.discountValue, 20);
  });

  it('3. GET /crm/retention/warranty-revisions — deve detectar revisão periódica de PPF aos 6 meses', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/crm/retention/warranty-revisions',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200, res.payload);
    const revisions = JSON.parse(res.payload);
    assert(Array.isArray(revisions), 'Deve retornar lista de revisões');

    const ppfRevision = revisions.find((r: any) => r.warrantyId === warrantyAlpha1Id);
    assert(ppfRevision, 'Deve identificar a garantia de PPF pendente de revisão de 6 meses');
    assert.strictEqual(ppfRevision.customerName, 'Carlos Retenção PPF');
    assert.strictEqual(ppfRevision.vehiclePlate, 'PPF9X88');
    assert.strictEqual(ppfRevision.isOverdue, false, 'Como tem 170 dias, faltam ~10 dias (não vencido ainda)');
    assert(ppfRevision.daysRemainingOrOverdue >= 5 && ppfRevision.daysRemainingOrOverdue <= 15);
  });

  it('4. GET /crm/retention/inactive-customers — deve listar clientes inativos com cálculo de dias e faixa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/crm/retention/inactive-customers?minDays=90',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200, res.payload);
    const inactives = JSON.parse(res.payload);
    assert(Array.isArray(inactives));

    const renata = inactives.find((c: any) => c.customerId === customerAlpha2Id);
    assert(renata, 'Deve encontrar a cliente inativa há mais de 180 dias');
    assert.strictEqual(renata.inactivityTier, '180_days');
    assert(renata.daysInactive >= 210, 'Dias inativos devem ser >= 210');
    assert.strictEqual(renata.suggestedDiscountPercent, 15, 'Tier de 180d sugere 15% de desconto');
  });

  it('5. POST /crm/retention/trigger-contact — deve gerar cupom dinâmico e link do WhatsApp', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/crm/retention/trigger-contact',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlpha2Id,
        vehicleId: vehicleAlpha2Id,
        discountPercent: 15,
        couponDaysValid: 20,
      },
    });

    assert.strictEqual(res.statusCode, 201, res.payload);
    const result = JSON.parse(res.payload);

    assert(result.contactId, 'Deve gerar contactId');
    assert(result.couponCode.startsWith('RETORNO15-'), 'Código do cupom deve ter padrão RETORNO15-XXXX');
    assert.strictEqual(result.discountValue, 15);
    assert(result.whatsappUrl.includes('https://wa.me/5511977772222'), 'URL deve apontar para o WhatsApp do cliente');
    assert(result.messageContent.includes(result.couponCode), 'Mensagem deve conter o código do cupom gerado');
    assert(result.messageContent.includes('Renata'), 'Mensagem deve conter o primeiro nome da cliente');
  });

  it('6. POST /crm/retention/contacts/:id/convert — deve marcar contato como convertido e registrar receita', async () => {
    // 1. Criar um contato de retenção para Carlos
    const triggerRes = await app.inject({
      method: 'POST',
      url: '/crm/retention/trigger-contact',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerId: customerAlpha1Id,
        warrantyId: warrantyAlpha1Id,
        discountPercent: 10,
      },
    });

    const contact = JSON.parse(triggerRes.payload);

    // 2. Converter o contato
    const convertRes = await app.inject({
      method: 'POST',
      url: `/crm/retention/contacts/${contact.contactId}/convert`,
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        conversionRevenueCents: 45000, // R$ 450,00 gerados na revisão/recompra
        notes: 'Cliente retornou e fez revisão + higienização com cupom',
      },
    });

    assert.strictEqual(convertRes.statusCode, 200, convertRes.payload);
    const convertData = JSON.parse(convertRes.payload);
    assert.strictEqual(convertData.success, true);

    // 3. Verificar listagem de contatos
    const listRes = await app.inject({
      method: 'GET',
      url: '/crm/retention/contacts',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    const contactsList = JSON.parse(listRes.payload);
    const convertedItem = contactsList.find((c: any) => c.id === contact.contactId);
    assert(convertedItem, 'Deve listar o contato');
    assert.strictEqual(convertedItem.status, 'converted');
    assert.strictEqual(convertedItem.conversionRevenueCents, 45000);
  });

  it('7. GET /crm/retention/overview — deve calcular indicadores executivos de retenção', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/crm/retention/overview',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 200, res.payload);
    const overview = JSON.parse(res.payload);

    assert(overview.totalCustomers >= 2, 'Total de clientes >= 2');
    assert(overview.pendingWarrantyRevisionsCount >= 1, 'Deve ter ao menos 1 revisão de garantia pendente');
    assert(overview.convertedContactsCount >= 1, 'Deve registrar o contato convertido');
    assert.strictEqual(overview.convertedRevenueCents, 45000, 'Deve registrar R$ 450,00 (45000 cents) de receita');
    assert(overview.conversionRatePercent > 0, 'Taxa de conversão deve ser > 0');
  });

  it('8. Isolamento Multi-Tenant Estrito — Tenant Beta não deve acessar dados nem contatos do Tenant Alpha', async () => {
    // 1. Overview no Tenant Beta deve ter 0 revisões e 0 contatos convertidos de Alpha
    const overviewRes = await app.inject({
      method: 'GET',
      url: '/crm/retention/overview',
      headers: {
        authorization: `Bearer ${tokenBetaGestor}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.strictEqual(overviewRes.statusCode, 200);
    const betaOverview = JSON.parse(overviewRes.payload);
    assert.strictEqual(betaOverview.pendingWarrantyRevisionsCount, 0);
    assert.strictEqual(betaOverview.convertedContactsCount, 0);
    assert.strictEqual(betaOverview.convertedRevenueCents, 0);

    // 2. Tentativa de listar contatos em Beta não deve conter os contatos de Alpha
    const contactsRes = await app.inject({
      method: 'GET',
      url: '/crm/retention/contacts',
      headers: {
        authorization: `Bearer ${tokenBetaGestor}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    const betaContacts = JSON.parse(contactsRes.payload);
    assert.strictEqual(betaContacts.length, 0, 'Beta não deve ver nenhum contato de Alpha');
  });

  it('9. Segurança e Autenticação — Requisições sem token devem retornar 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/crm/retention/overview',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.strictEqual(res.statusCode, 401);
  });
});

