import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { adminPool } from '../database/db.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { couponService } from './coupon-service.js';
import { superadminService } from '../superadmin/superadmin-service.js';
import type { FastifyInstance } from 'fastify';

describe('T2.14 — Módulo de Cupons de Desconto & Promoções no Super Admin', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let testCouponId1: string;
  let testCouponId2: string;
  const couponCode1 = `TEST3M_${Date.now()}`;
  const couponCode2 = `PROMO49_${Date.now()}`;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Super Administrador canônico
    const superadminPassHash = await hashPassword('Admin@CarX2026!');
    const superRes = await adminPool.query(
      `INSERT INTO superadmin_users (name, email, password_hash, is_active)
       VALUES ('Super Admin Cupons', 'superadmin-coupons@carx.com.br', $1, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true
       RETURNING id`,
      [superadminPassHash]
    );
    const superadminId = superRes.rows[0].id;

    superadminToken = signJwt(
      {
        sub: superadminId,
        email: 'superadmin-coupons@carx.com.br',
        role: 'SUPERADMIN',
        scope: 'superadmin',
        isSuperadmin: true,
      },
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. GET /admin/coupons sem autenticação deve retornar 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/coupons',
    });
    assert.equal(res.statusCode, 401);
  });

  it('2. POST /admin/coupons deve permitir Super Admin criar cupom de meses grátis (free_months)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/coupons',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode1,
        description: '3 Meses Grátis de Boas-Vindas',
        discount_type: 'free_months',
        discount_value: 0,
        duration_months: 3,
        max_redemptions: 50,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.code, couponCode1);
    assert.equal(body.discount_type, 'free_months');
    assert.equal(body.duration_months, 3);
    assert.equal(body.is_active, true);
    testCouponId1 = body.id;
  });

  it('3. POST /admin/coupons deve permitir criar cupom de preço promocional fixo restrito a um plano', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/coupons',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode2,
        description: '3 meses do Plano Pro por R$ 49,00/mês',
        discount_type: 'promotional_price',
        discount_value: 4900,
        duration_months: 3,
        applicable_plan_slug: 'pro',
        max_redemptions: 10,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.code, couponCode2);
    assert.equal(body.discount_type, 'promotional_price');
    assert.equal(body.discount_value, 4900);
    assert.equal(body.applicable_plan_slug, 'pro');
    testCouponId2 = body.id;
  });

  it('4. POST /admin/coupons com código duplicado deve retornar 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/coupons',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode1,
        description: 'Duplicado',
        discount_type: 'percentage',
        discount_value: 10,
      },
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.match(body.message, /já existe/i);
  });

  it('5. POST /admin/coupons/validate deve validar cupom aplicável com sucesso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/coupons/validate',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode2,
        plan_slug: 'pro',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.valid, true);
    assert.equal(body.coupon.code, couponCode2);
  });

  it('6. POST /admin/coupons/validate deve rejeitar cupom quando plano informado não é o aplicável', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/coupons/validate',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode2,
        plan_slug: 'basico',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.valid, false);
    assert.match(body.message, /válido apenas para o plano/i);
  });

  it('7. Provisionamento de oficina com cupom promocional deve abater o valor do contrato', async () => {
    const testSlug = `oficina-cupom-${Date.now()}`;
    const result = await superadminService.createTenant(
      {
        trade_name: 'Oficina com Cupom',
        legal_name: 'Oficina Cupom LTDA',
        cnpj: '12.345.678/0001-99',
        slug: testSlug,
        email: `${testSlug}@carx.com.br`,
        segment: 'mecanica',
        owner_name: 'Gestor Promocional',
        owner_email: `owner-${testSlug}@carx.com.br`,
        plan_slug: 'pro',
        coupon_code: couponCode2,
        is_trial: false,
      },
      'system-superadmin'
    );

    assert.ok(result.tenant.id);
    assert.ok(result.contract.id);
    // O preço normal do plano pro é 19900; com o cupom PROMO49, negociated_price_cents deve ser 4900
    assert.equal(result.contract.negotiated_price_cents, 4900);

    // Verificar se a redenção foi registrada na tabela coupon_redemptions
    const redemptionsRes = await adminPool.query(
      `SELECT cr.*, c.code 
       FROM coupon_redemptions cr
       JOIN coupons c ON c.id = cr.coupon_id
       WHERE cr.tenant_id = $1`,
      [result.tenant.id]
    );
    assert.equal(redemptionsRes.rows.length, 1);
    assert.equal(redemptionsRes.rows[0].code, couponCode2);
    assert.equal(Number(redemptionsRes.rows[0].applied_discount_cents), 15000); // 19900 - 4900 = 15000
  });

  it('8. DELETE /admin/coupons/:id deve desativar o cupom e subsequente validação deve falhar', async () => {
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/admin/coupons/${testCouponId1}`,
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
    });

    assert.equal(delRes.statusCode, 204);

    // Tentar validar o cupom desativado
    const valRes = await app.inject({
      method: 'POST',
      url: '/admin/coupons/validate',
      headers: {
        authorization: `Bearer ${superadminToken}`,
      },
      payload: {
        code: couponCode1,
        plan_slug: 'pro',
      },
    });

    assert.equal(valRes.statusCode, 200);
    const body = valRes.json();
    assert.equal(body.valid, false);
    assert.match(body.message, /inativo/i);
  });
});

