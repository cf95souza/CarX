import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { adminPool } from '../database/db.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { PlanFeatures } from '@carx/shared';
import { whatsappService } from './whatsapp-service.js';
import type { FastifyInstance } from 'fastify';

describe('T3.17 — Gateway de WhatsApp Desacoplado Multi-Tenant (Padrão OperaBeauty)', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let tenantOwnerTokenAllowed: string;
  let tenantOwnerTokenBlocked: string;
  let tenantIdAllowed: string;
  let tenantSlugAllowed: string;
  let tenantIdBlocked: string;
  let tenantSlugBlocked: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Super Admin
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    const superRes = await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin WhatsApp', 'superadmin-wa@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true
       RETURNING id`,
      [superadminPassHash]
    );
    const superadminId = superRes.rows[0].id;

    superadminToken = signJwt(
      {
        sub: superadminId,
        email: 'superadmin-wa@carx.com.br',
        role: 'SUPERADMIN',
        scope: 'superadmin',
        isSuperadmin: true,
      },
      { expiresIn: '1h' }
    );

    // 2. Plano com WhatsApp Gateway habilitado
    const planAllowedSlug = `plan-wa-ok-${Date.now()}`;
    const planAllowedRes = await adminPool.query(
      `INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
       VALUES ('Plano com WhatsApp', $1, 'Plano Pro com WhatsApp', 29900, 'monthly',
               '{"max_units": 2, "max_users": 10, "max_work_orders_per_month": 500, "max_storage_mb": 10240, "max_whatsapp_messages_per_month": 3000}',
               $2, true)
       RETURNING id`,
      [planAllowedSlug, JSON.stringify([PlanFeatures.WORK_ORDERS, PlanFeatures.WHATSAPP_GATEWAY])]
    );
    const planAllowedId = planAllowedRes.rows[0].id;

    // 3. Plano SEM WhatsApp Gateway
    const planBlockedSlug = `plan-wa-no-${Date.now()}`;
    const planBlockedRes = await adminPool.query(
      `INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
       VALUES ('Plano sem WhatsApp', $1, 'Plano Básico sem WhatsApp', 9900, 'monthly',
               '{"max_units": 1, "max_users": 2, "max_work_orders_per_month": 50, "max_storage_mb": 1024, "max_whatsapp_messages_per_month": 0}',
               $2, true)
       RETURNING id`,
      [planBlockedSlug, JSON.stringify([PlanFeatures.WORK_ORDERS])]
    );
    const planBlockedId = planBlockedRes.rows[0].id;

    // 4. Inquilino com WhatsApp permitido
    tenantSlugAllowed = `oficina-wa-ok-${Date.now()}`;
    const tenantAllowedRes = await adminPool.query(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, 'Oficina com WhatsApp', $2, 'active', $3)
       RETURNING id`,
      [tenantSlugAllowed, `${tenantSlugAllowed}@carx.com.br`, planAllowedId]
    );
    tenantIdAllowed = tenantAllowedRes.rows[0].id;

    const unitAllowedRes = await adminPool.query(
      `INSERT INTO units (tenant_id, name, slug) VALUES ($1, 'Matriz', 'matriz') RETURNING id`,
      [tenantIdAllowed]
    );
    const unitAllowedId = unitAllowedRes.rows[0].id;

    const userAllowedRes = await adminPool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor WA Ok', $1, $2) RETURNING id`,
      [`gestor-${tenantSlugAllowed}@carx.com.br`, superadminPassHash]
    );
    const userAllowedId = userAllowedRes.rows[0].id;

    await adminPool.query(
      `INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active)
       VALUES ($1, $2, $3, 'owner', true)`,
      [tenantIdAllowed, unitAllowedId, userAllowedId]
    );

    tenantOwnerTokenAllowed = signJwt(
      {
        sub: userAllowedId,
        tenant_id: tenantIdAllowed,
        unit_id: unitAllowedId,
        role: 'owner',
        scope: 'tenant',
      },
      { expiresIn: '1h' }
    );

    // 5. Inquilino com WhatsApp bloqueado
    tenantSlugBlocked = `oficina-wa-block-${Date.now()}`;
    const tenantBlockedRes = await adminPool.query(
      `INSERT INTO tenants (slug, trade_name, email, status, plan_id)
       VALUES ($1, 'Oficina sem WhatsApp', $2, 'active', $3)
       RETURNING id`,
      [tenantSlugBlocked, `${tenantSlugBlocked}@carx.com.br`, planBlockedId]
    );
    tenantIdBlocked = tenantBlockedRes.rows[0].id;

    const unitBlockedRes = await adminPool.query(
      `INSERT INTO units (tenant_id, name, slug) VALUES ($1, 'Matriz', 'matriz') RETURNING id`,
      [tenantIdBlocked]
    );
    const unitBlockedId = unitBlockedRes.rows[0].id;

    const userBlockedRes = await adminPool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor WA Block', $1, $2) RETURNING id`,
      [`gestor-${tenantSlugBlocked}@carx.com.br`, superadminPassHash]
    );
    const userBlockedId = userBlockedRes.rows[0].id;

    await adminPool.query(
      `INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active)
       VALUES ($1, $2, $3, 'owner', true)`,
      [tenantIdBlocked, unitBlockedId, userBlockedId]
    );

    tenantOwnerTokenBlocked = signJwt(
      {
        sub: userBlockedId,
        tenant_id: tenantIdBlocked,
        unit_id: unitBlockedId,
        role: 'owner',
        scope: 'tenant',
      },
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. GET /tenant/whatsapp/instance sem autenticação deve retornar 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/whatsapp/instance',
    });
    assert.equal(res.statusCode, 401);
  });

  it('2. GET /tenant/whatsapp/instance com autenticação inicial deve retornar status DISCONNECTED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/whatsapp/instance',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'DISCONNECTED');
    assert.equal(body.tenant_id, tenantIdAllowed);
  });

  it('3. POST /tenant/whatsapp/connect em plano sem a feature deve retornar 403 FEATURE_DISABLED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/whatsapp/connect',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenBlocked}`,
        'x-tenant-id': tenantIdBlocked,
        'x-tenant-slug': tenantSlugBlocked,
      },
      payload: {
        method: 'pairing_code',
        phone_number: '11999998888',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.match(body.message, /recurso .* não está habilitado/i);
  });

  it('4. POST /tenant/whatsapp/connect com pairing_code deve gerar código de pareamento para a oficina', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/whatsapp/connect',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
      payload: {
        method: 'pairing_code',
        phone_number: '11987654321',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'PAIRING');
    assert.ok(body.pairing_code);
    assert.equal(body.phone_number, '5511987654321');
  });

  it('5. POST /tenant/whatsapp/send-test enquanto não conectado deve retornar 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/whatsapp/send-test',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
      payload: {
        to: '11988887777',
        message: 'Teste antes de conectar',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.match(body.message, /não possui uma sessão de WhatsApp conectada/i);
  });

  it('6. Após conexão ativada, POST /tenant/whatsapp/send-test deve enviar com sucesso e incrementar cota', async () => {
    // Simula a conclusão do pareamento
    await whatsappService.setConnectedStatus(tenantIdAllowed, '11987654321');

    const checkRes = await app.inject({
      method: 'GET',
      url: '/tenant/whatsapp/instance',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
    });
    assert.equal(checkRes.json().status, 'CONNECTED');

    const sendRes = await app.inject({
      method: 'POST',
      url: '/tenant/whatsapp/send-test',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
      payload: {
        to: '11977776666',
        message: '🏁 Teste de disparo oficial CarX',
      },
    });

    assert.equal(sendRes.statusCode, 200);
    const sendBody = sendRes.json();
    assert.equal(sendBody.success, true);
    assert.ok(sendBody.message_id);

    // Verificar incremento da cota diária
    const postCheckRes = await app.inject({
      method: 'GET',
      url: '/tenant/whatsapp/instance',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
    });
    assert.equal(postCheckRes.json().daily_messages_count, 1);
  });

  it('7. POST /tenant/whatsapp/disconnect deve desconectar a sessão da oficina', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/whatsapp/disconnect',
      headers: {
        authorization: `Bearer ${tenantOwnerTokenAllowed}`,
        'x-tenant-id': tenantIdAllowed,
        'x-tenant-slug': tenantSlugAllowed,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'DISCONNECTED');
    assert.equal(body.phone_number, null);
  });

  it('8. POST /internal/whatsapp/webhook sem token M2M válido deve retornar 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/whatsapp/webhook',
      payload: {
        tenantId: tenantIdAllowed,
        event: 'connected',
      },
    });
    assert.equal(res.statusCode, 401);
  });

  it('9. GET /admin/whatsapp/telemetry deve retornar métricas agregadas reais do Super Admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/whatsapp/telemetry',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.total_instances >= 1);
    assert.ok(Array.isArray(body.instances));
    assert.ok(typeof body.messages_sent_today === 'number');
  });
});

