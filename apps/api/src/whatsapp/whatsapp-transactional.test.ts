import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { whatsappService } from './whatsapp-service.js';
import { workOrderService } from '../work-orders/work-order-service.js';

describe('T6.4 — WhatsApp Automático Transacional por Evento de OS (Gating por Plano e Respeito a Instâncias)', () => {
  let app: FastifyInstance;
  let basicTenantId: string;
  let proTenantId: string;
  let basicAuthToken: string;
  let proAuthToken: string;

  let basicOrderId: string;
  let proOrderId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();

    // 1. Obter os planos: Essencial (sem gateway) e Profissional (com gateway)
    const plansRes = await tenantQuery<any>(
      null,
      `SELECT id, slug FROM plans WHERE slug IN ('essencial', 'profissional');`,
      [],
      { isSuperadmin: true }
    );
    const essencialPlan = plansRes.rows.find((p) => p.slug === 'essencial');
    const proPlan = plansRes.rows.find((p) => p.slug === 'profissional');

    assert.ok(essencialPlan, 'Plano essencial deve existir');
    assert.ok(proPlan, 'Plano profissional deve existir');

    // 2. Criar Tenant Básico (Plano Essencial - SEM WHATSAPP_GATEWAY)
    const basicRes = await tenantQuery<any>(
      null,
      `
      INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, plan_id)
      VALUES ('Oficina Básica ME', 'CarX Estética Básica', $1, 'contato@basica.test', '11.222.333/0001-99', '11977778888', 'active', $2)
      RETURNING id;
      `,
      [`wa-basic-${timestamp}`, essencialPlan.id],
      { bypassRls: true }
    );
    basicTenantId = basicRes.rows[0].id;

    // 3. Criar Tenant Pro (Plano Profissional - COM WHATSAPP_GATEWAY)
    const proRes = await tenantQuery<any>(
      null,
      `
      INSERT INTO tenants (legal_name, trade_name, slug, email, cnpj, phone, status, plan_id)
      VALUES ('Oficina Premium Detail LTDA', 'CarX Detail Pro', $1, 'contato@pro.test', '22.333.444/0001-88', '11988887777', 'active', $2)
      RETURNING id;
      `,
      [`wa-pro-${timestamp}`, proPlan.id],
      { bypassRls: true }
    );
    proTenantId = proRes.rows[0].id;

    // 4. Criar Clientes e Veículos para ambos os tenants
    const c1 = await tenantQuery<any>(
      basicTenantId,
      `INSERT INTO customers (tenant_id, name, phone, email) VALUES ($1, 'João da Silva', '11911112222', 'joao@cliente.test') RETURNING id;`,
      [basicTenantId]
    );
    const v1 = await tenantQuery<any>(
      basicTenantId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year) VALUES ($1, $2, 'BAS1C01', 'Fiat', 'Pulse Audace', 'Cinza', 2024) RETURNING id;`,
      [basicTenantId, c1.rows[0].id]
    );
    const o1 = await tenantQuery<any>(
      basicTenantId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 1001, 'APPROVED', 45000, 45000, 0) RETURNING id;`,
      [basicTenantId, c1.rows[0].id, v1.rows[0].id]
    );
    basicOrderId = o1.rows[0].id;

    const c2 = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO customers (tenant_id, name, phone, email) VALUES ($1, 'Camila Rodrigues', '11922223333', 'camila@cliente.test') RETURNING id;`,
      [proTenantId]
    );
    const v2 = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year) VALUES ($1, $2, 'PRO9D99', 'Porsche', 'Macan GTS', 'Preto', 2025) RETURNING id;`,
      [proTenantId, c2.rows[0].id]
    );
    const o2 = await tenantQuery<any>(
      proTenantId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, total_cents, final_cents, paid_cents)
       VALUES ($1, $2, $3, 2001, 'APPROVED', 180000, 180000, 50000) RETURNING id;`,
      [proTenantId, c2.rows[0].id, v2.rows[0].id]
    );
    proOrderId = o2.rows[0].id;

    // Tokens JWT
    basicAuthToken = signJwt({ userId: 'usr-gestor-basic', tenantId: basicTenantId, role: 'owner' });
    proAuthToken = signJwt({ userId: 'usr-gestor-pro', tenantId: proTenantId, role: 'owner' });
  });

  after(async () => {
    if (basicTenantId) {
      await tenantQuery(null, 'DELETE FROM work_order_events WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_orders WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM vehicles WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM customers WHERE tenant_id = $1', [basicTenantId], { bypassRls: true });
    }
    if (proTenantId) {
      await tenantQuery(null, 'DELETE FROM tenant_whatsapp_instances WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_order_events WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM work_orders WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM vehicles WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
      await tenantQuery(null, 'DELETE FROM customers WHERE tenant_id = $1', [proTenantId], { bypassRls: true });
    }
    if (app) await app.close();
  });

  test('1. Loja no plano BÁSICO (sem gateway) não dispara background e gera link manual wa.me', async () => {
    const result = await workOrderService.notifyWorkOrderWhatsApp(
      basicTenantId,
      basicOrderId,
      'CHECKED_IN'
    );

    assert.equal(result.success, true);
    assert.equal(result.mode, 'manual');
    assert.ok(result.whatsappUrl);
    assert.ok(result.whatsappUrl.startsWith('https://wa.me/5511911112222'));
    assert.match(result.messageText, /Fiat Pulse Audace/i);
    assert.match(result.messageText, /Confirmamos a entrada do seu veículo/i);
    assert.match(result.messageText, /CarX Estética Básica/i);

    // Não deve ter registrado evento de envio de gateway na timeline da OS
    const events = await tenantQuery<any>(
      basicTenantId,
      `SELECT * FROM work_order_events WHERE work_order_id = $1 AND event_type = 'WHATSAPP_NOTIFICATION';`,
      [basicOrderId]
    );
    assert.equal(events.rows.length, 0);
  });

  test('2. Loja no plano PRO com WhatsApp DESCONECTADO faz fallback suave para wa.me com aviso', async () => {
    // Garante que a instância esteja DISCONNECTED
    await whatsappService.disconnectInstance(proTenantId);

    const result = await workOrderService.notifyWorkOrderWhatsApp(
      proTenantId,
      proOrderId,
      'READY'
    );

    assert.equal(result.success, true);
    assert.equal(result.mode, 'manual');
    assert.ok(result.whatsappUrl);
    assert.ok(result.whatsappUrl.startsWith('https://wa.me/5511922223333'));
    assert.match(result.messageText, /pronto para retirada/i);
    assert.match(result.messageText, /Saldo restante a pagar: R\$ 1300.00/i);
    assert.match(result.warning || '', /desconectado/i);
  });

  test('3. Loja no plano PRO com WhatsApp CONECTADO envia mensagem transacional via socket oficial da loja', async () => {
    // Ativa status CONNECTED para a oficina
    await whatsappService.setConnectedStatus(proTenantId, '11988887777');

    const result = await workOrderService.notifyWorkOrderWhatsApp(
      proTenantId,
      proOrderId,
      'READY'
    );

    assert.equal(result.success, true);
    assert.equal(result.mode, 'gateway');
    assert.match(result.messageText, /pronto para retirada/i);
    assert.match(result.messageText, /Porsche Macan GTS/i);
    assert.match(result.messageText, /CarX Detail Pro/i);

    // Deve ter registrado evento de histórico na OS
    const events = await tenantQuery<any>(
      proTenantId,
      `SELECT * FROM work_order_events WHERE work_order_id = $1 AND event_type = 'WHATSAPP_NOTIFICATION';`,
      [proOrderId]
    );
    assert.equal(events.rows.length, 1);
    assert.match(events.rows[0].notes, /Notificação automática de WhatsApp \(READY\)/i);
  });

  test('4. Templates transacionais cobrem Check-in, Ready, Delivered e Agendamento', () => {
    const tplCheckin = whatsappService.formatTransactionalTemplate({
      eventType: 'CHECKED_IN',
      customerName: 'Renato Silva',
      tenantTradeName: 'Studio Detail',
      vehicleText: 'BMW 320i (ABC1D23)',
      osNumber: 450,
      trackingUrl: 'https://carx.app/proposta/token123',
    });
    assert.match(tplCheckin, /Olá, Renato! 🚗/);
    assert.match(tplCheckin, /BMW 320i \(ABC1D23\)/);
    assert.match(tplCheckin, /https:\/\/carx\.app\/proposta\/token123/);

    const tplDelivered = whatsappService.formatTransactionalTemplate({
      eventType: 'DELIVERED',
      customerName: 'Fernanda Lima',
      tenantTradeName: 'Studio Detail',
      vehicleText: 'BYD Dolphin (XYZ9K88)',
      trackingUrl: 'https://carx.app/proposta/token456',
    });
    assert.match(tplDelivered, /Olá, Fernanda! 🌟/);
    assert.match(tplDelivered, /Seu veículo foi entregue/);
    assert.match(tplDelivered, /termo de garantia digital/);

    const tplAppointment = whatsappService.formatTransactionalTemplate({
      eventType: 'APPOINTMENT_CONFIRMED',
      customerName: 'Marcos Paulo',
      tenantTradeName: 'Studio Detail',
      vehicleText: 'Audi A3 (AUD1A23)',
      appointmentDate: '15/11/2026',
      appointmentTime: '09:00',
    });
    assert.match(tplAppointment, /Olá, Marcos! 📅/);
    assert.match(tplAppointment, /15\/11\/2026/);
    assert.match(tplAppointment, /09:00/);
  });

  test('5. Transição de status da OS (transitionStatus) dispara WhatsApp sem bloquear fluxo operacional', async () => {
    // Transiciona OS do tenant básico para CHECKED_IN
    const updated = await workOrderService.transitionStatus(
      basicTenantId,
      basicOrderId,
      { status: 'CHECKED_IN', notes: 'Veículo entrou no pátio' }
    );

    assert.equal(updated.status, 'CHECKED_IN');
    assert.ok(updated.checkedInAt);
  });

  test('6. Rota POST /work-orders/:id/notify-whatsapp permite envio sob demanda pelo gestor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/work-orders/${proOrderId}/notify-whatsapp`,
      headers: {
        authorization: `Bearer ${proAuthToken}`,
        'x-tenant-id': proTenantId,
      },
      payload: {
        eventType: 'DELIVERED',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.mode, 'gateway');
    assert.match(body.messageText, /Seu veículo foi entregue/i);
  });
});
