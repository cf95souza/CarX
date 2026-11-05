import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { adminPool } from '../database/db.js';
import { buildServer } from '../server.js';
import { signJwt } from '../auth/jwt.js';
import { UserRole } from '@carx/shared';
import type { FastifyInstance } from 'fastify';

describe('T2.7 — Subdomínio por Loja e White Label Real', () => {
  let app: FastifyInstance;

  const tenantSlugAlpha = 'oficina-alpha';
  const tenantSlugBeta = 'oficina-beta';
  const customDomainBeta = 'estetica-beta.local';

  let tenantIdAlpha: string;
  let tenantIdBeta: string;

  let ownerUserIdAlpha: string;
  let tecnicoUserIdAlpha: string;

  let ownerTokenAlpha: string;
  let tecnicoTokenAlpha: string;

  before(async () => {
    app = buildServer();

    // Limpeza de testes prévios
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM tenant_branding WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM units WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM users WHERE email IN ('owner.alpha@carx.local', 'tecnico.alpha@carx.local');
      DELETE FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}');
    `);

    // 1. Criar Tenant Alpha
    const alphaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status)
      VALUES ('${tenantSlugAlpha}', 'Auto Center Alpha', 'Alpha Reparadora Automotiva LTDA', 'contato@alpha.local', 'active')
      RETURNING id;
    `);
    tenantIdAlpha = alphaRes.rows[0].id;

    // Configurar branding específico de Alpha
    await adminPool.query(`
      INSERT INTO tenant_branding (
        tenant_id, trade_name, tagline, logo_url, logo_icon_url,
        primary_color, secondary_color, accent_color, app_title, app_short_name,
        whatsapp_phone, receipt_footer_notes
      ) VALUES (
        '${tenantIdAlpha}', 'Auto Center Alpha', 'Mecânica e Diagnóstico Avançado',
        'https://alpha.cdn.carx.local/logo.png', 'https://alpha.cdn.carx.local/icon.png',
        '#0055FF', '#001133', '#3388FF', 'Alpha Auto Center', 'Alpha',
        '+55 11 98888-1111', 'Obrigado por escolher o Auto Center Alpha!'
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        trade_name = EXCLUDED.trade_name,
        tagline = EXCLUDED.tagline,
        logo_url = EXCLUDED.logo_url,
        logo_icon_url = EXCLUDED.logo_icon_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        accent_color = EXCLUDED.accent_color,
        app_title = EXCLUDED.app_title,
        app_short_name = EXCLUDED.app_short_name,
        whatsapp_phone = EXCLUDED.whatsapp_phone,
        receipt_footer_notes = EXCLUDED.receipt_footer_notes;
    `);

    // 2. Criar Tenant Beta (com custom_domain)
    const betaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status, custom_domain)
      VALUES ('${tenantSlugBeta}', 'Estética Automotiva Beta', 'Beta Detailer e PPF LTDA', 'contato@beta.local', 'active', '${customDomainBeta}')
      RETURNING id;
    `);
    tenantIdBeta = betaRes.rows[0].id;

    // Configurar branding específico de Beta
    await adminPool.query(`
      INSERT INTO tenant_branding (
        tenant_id, trade_name, tagline, logo_url, logo_icon_url,
        primary_color, secondary_color, accent_color, app_title, app_short_name,
        whatsapp_phone, receipt_footer_notes
      ) VALUES (
        '${tenantIdBeta}', 'Estética Automotiva Beta', 'Vitrificação, PPF e Polimento Técnico',
        'https://beta.cdn.carx.local/logo.png', 'https://beta.cdn.carx.local/icon.png',
        '#FF8800', '#331100', '#FFAA33', 'Beta Estética', 'Beta Detail',
        '+55 21 97777-2222', 'Garantia de 3 anos na vitrificação cerâmica Beta.'
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        trade_name = EXCLUDED.trade_name,
        tagline = EXCLUDED.tagline,
        logo_url = EXCLUDED.logo_url,
        logo_icon_url = EXCLUDED.logo_icon_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        accent_color = EXCLUDED.accent_color,
        app_title = EXCLUDED.app_title,
        app_short_name = EXCLUDED.app_short_name,
        whatsapp_phone = EXCLUDED.whatsapp_phone,
        receipt_footer_notes = EXCLUDED.receipt_footer_notes;
    `);

    // 3. Criar Usuários para Alpha
    const ownerRes = await adminPool.query<{ id: string }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ('owner.alpha@carx.local', 'Proprietário Alpha', 'hash')
      RETURNING id;
    `);
    ownerUserIdAlpha = ownerRes.rows[0].id;

    const tecnicoRes = await adminPool.query<{ id: string }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ('tecnico.alpha@carx.local', 'Técnico Alpha', 'hash')
      RETURNING id;
    `);
    tecnicoUserIdAlpha = tecnicoRes.rows[0].id;

    // Criar Unidade padrão Alpha
    const unitRes = await adminPool.query<{ id: string }>(`
      INSERT INTO units (tenant_id, name, slug)
      VALUES ('${tenantIdAlpha}', 'Matriz Alpha', 'matriz')
      RETURNING id;
    `);
    const unitId = unitRes.rows[0].id;

    // Memberships
    await adminPool.query(`
      INSERT INTO memberships (tenant_id, user_id, unit_id, role)
      VALUES
        ('${tenantIdAlpha}', '${ownerUserIdAlpha}', '${unitId}', 'owner'),
        ('${tenantIdAlpha}', '${tecnicoUserIdAlpha}', '${unitId}', 'tecnico');
    `);

    // Gerar Tokens JWT
    ownerTokenAlpha = signJwt({
      userId: ownerUserIdAlpha,
      email: 'owner.alpha@carx.local',
      role: UserRole.OWNER,
      tenantId: tenantIdAlpha,
      unitId,
    });

    tecnicoTokenAlpha = signJwt({
      userId: tecnicoUserIdAlpha,
      email: 'tecnico.alpha@carx.local',
      role: UserRole.TECNICO,
      tenantId: tenantIdAlpha,
      unitId,
    });
  });

  after(async () => {
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM tenant_branding WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM units WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM users WHERE email IN ('owner.alpha@carx.local', 'tecnico.alpha@carx.local');
      DELETE FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}');
    `);
  });

  it('CRITÉRIO DE ACEITE: subdomínio oficina-alpha.carx.local retorna branding exclusivo do Auto Center Alpha', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/branding',
      headers: {
        host: 'oficina-alpha.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.equal(body.trade_name, 'Auto Center Alpha');
    assert.equal(body.primary_color, '#0055FF');
    assert.equal(body.secondary_color, '#001133');
    assert.equal(body.logo_url, 'https://alpha.cdn.carx.local/logo.png');
    assert.equal(body.whatsapp_phone, '+55 11 98888-1111');
  });

  it('CRITÉRIO DE ACEITE: subdomínio oficina-beta.carx.local retorna branding completamente distinto do Estética Beta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/branding',
      headers: {
        host: 'oficina-beta.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.equal(body.trade_name, 'Estética Automotiva Beta');
    assert.equal(body.primary_color, '#FF8800');
    assert.equal(body.secondary_color, '#331100');
    assert.equal(body.logo_url, 'https://beta.cdn.carx.local/logo.png');
    assert.equal(body.whatsapp_phone, '+55 21 97777-2222');
  });

  it('PWA MANIFEST: oficina-alpha.carx.local gera manifest.json dinâmico com nome e cor de Alpha', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/manifest.json',
      headers: {
        host: 'oficina-alpha.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] || '', /application\/manifest\+json/);

    const manifest = JSON.parse(res.body);
    assert.equal(manifest.name, 'Alpha Auto Center');
    assert.equal(manifest.theme_color, '#0055FF');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/oficina-alpha/meu-veiculo');
    assert.ok(manifest.icons.length >= 2);
    assert.equal(manifest.icons[0].src, 'https://alpha.cdn.carx.local/icon.png');
  });

  it('PWA MANIFEST: oficina-beta.carx.local gera manifest.json dinâmico com nome e cor de Beta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/manifest.json',
      headers: {
        host: 'oficina-beta.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    const manifest = JSON.parse(res.body);

    assert.equal(manifest.name, 'Beta Estética');
    assert.equal(manifest.theme_color, '#FF8800');
    assert.equal(manifest.start_url, '/oficina-beta/meu-veiculo');
    assert.equal(manifest.icons[0].src, 'https://beta.cdn.carx.local/icon.png');
  });

  it('PWA MODOS: mode=tv gera manifesto otimizado para Monitor TV de oficina (fullscreen, landscape)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/manifest.json?mode=tv',
      headers: {
        host: 'oficina-alpha.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    const manifest = JSON.parse(res.body);

    assert.equal(manifest.name, 'Auto Center Alpha — Monitor TV');
    assert.equal(manifest.display, 'fullscreen');
    assert.equal(manifest.orientation, 'landscape');
    assert.equal(manifest.start_url, '/oficina-alpha/tv');
  });

  it('PWA MODOS: mode=staff gera manifesto para app do técnico operacional', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/manifest.json?mode=staff',
      headers: {
        host: 'oficina-alpha.carx.local',
      },
    });

    assert.equal(res.statusCode, 200);
    const manifest = JSON.parse(res.body);

    assert.equal(manifest.name, 'Auto Center Alpha — Operação');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, 'portrait');
    assert.equal(manifest.start_url, '/oficina-alpha/app');
  });

  it('CUSTOM DOMAIN: resolução dinâmica de tenant e branding via domínio próprio (beta-custom.local)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/branding',
      headers: {
        host: customDomainBeta,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.equal(body.trade_name, 'Estética Automotiva Beta');
    assert.equal(body.primary_color, '#FF8800');
  });

  it('CADDY ON-DEMAND TLS: endpoint /internal/caddy-check autoriza emissão SSL para domínio customizado ativo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/internal/caddy-check?domain=${customDomainBeta}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.allowed, true);
    assert.equal(body.domain, customDomainBeta);
  });

  it("CADDY ON-DEMAND TLS: domínio desconhecido é recusado para evitar sobrecarga no Let's Encrypt", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/caddy-check?domain=dominio-estranho-nao-autorizado.com',
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.allowed, false);
  });

  it('ATUALIZAÇÃO DE BRANDING: OWNER pode alterar cores e identidade visual da oficina', async () => {
    const updatePayload = {
      primary_color: '#00CC66',
      secondary_color: '#004D26',
      tagline: 'Nova frase de efeito Alpha 2026',
      whatsapp_phone: '+55 11 99999-7777',
      theme_mode: 'dark' as const,
    };

    const res = await app.inject({
      method: 'PUT',
      url: '/tenant/branding',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
      payload: updatePayload,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.primary_color, '#00CC66');
    assert.equal(body.secondary_color, '#004D26');
    assert.equal(body.tagline, 'Nova frase de efeito Alpha 2026');
    assert.equal(body.whatsapp_phone, '+55 11 99999-7777');

    // Valida que o endpoint público de branding agora retorna imediatamente os novos valores
    const checkRes = await app.inject({
      method: 'GET',
      url: '/tenant/branding',
      headers: {
        host: 'oficina-alpha.carx.local',
      },
    });

    assert.equal(checkRes.statusCode, 200);
    const checkBody = JSON.parse(checkRes.body);
    assert.equal(checkBody.primary_color, '#00CC66');
    assert.equal(checkBody.tagline, 'Nova frase de efeito Alpha 2026');
  });

  it('AUDITORIA IMUTÁVEL: alteração de branding gera registro audit_logs comprovado', async () => {
    const auditRes = await adminPool.query<{
      action: string;
      entity: string;
      old_values: Record<string, unknown>;
      new_values: Record<string, unknown>;
    }>(
      `SELECT action, entity, old_values, new_values
       FROM audit_logs
       WHERE tenant_id = $1 AND action = 'BRANDING_UPDATED'
       ORDER BY created_at DESC
       LIMIT 1;`,
      [tenantIdAlpha]
    );

    assert.equal(auditRes.rows.length, 1);
    const log = auditRes.rows[0];
    assert.equal(log.action, 'BRANDING_UPDATED');
    assert.equal(log.entity, 'tenant_branding');
    assert.ok(log.new_values);
    assert.equal(log.new_values.primary_color, '#00CC66');
  });

  it('SEGURANÇA RBAC: TECNICO não pode alterar branding da loja (HTTP 403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/tenant/branding',
      headers: {
        authorization: `Bearer ${tecnicoTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
      payload: {
        primary_color: '#FF00FF',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.match(body.message, /Acesso negado/);
  });

  it('ROTA PÚBLICA /branding/:slug: permite preview e loading sem autenticação', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/branding/${tenantSlugBeta}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.trade_name, 'Estética Automotiva Beta');
    assert.equal(body.primary_color, '#FF8800');
  });

  it('ROTA PÚBLICA /branding/:slug: retorna 404 para subdomínio inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/branding/subdominio-fantasma-123',
    });

    assert.equal(res.statusCode, 404);
  });

  it('FALLBACK GRACIOSO: requisição sem contexto de loja retorna branding padrão CarX sem falhar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/branding',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.trade_name.includes('CarX'));
    assert.equal(body.primary_color, '#E63946');
  });
});
