import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { pool, adminPool } from '../database/db.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';

describe('T7.4 — Auditoria de Segurança OWASP Top 10 & Hardening Automatizado', () => {
  let app: any;
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let tokenAlphaGestor: string;
  let tokenAlphaTecnico: string;
  let tokenBetaGestor: string;
  let userAlphaGestorId: string;
  let userAlphaTecnicoId: string;
  let userBetaGestorId: string;
  let betaBillId: string;
  let betaLeadId: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // Obter plano essencial e premium para teste de Feature Gating
    const planEssencialRes = await tenantQuery<{ id: string }>(
      null,
      `SELECT id FROM plans WHERE slug = 'essencial' LIMIT 1;`,
      [],
      { bypassRls: true }
    );
    const planPremiumRes = await tenantQuery<{ id: string }>(
      null,
      `SELECT id FROM plans WHERE slug = 'premium' LIMIT 1;`,
      [],
      { bypassRls: true }
    );

    const planEssencialId = planEssencialRes.rows[0]?.id || null;
    const planPremiumId = planPremiumRes.rows[0]?.id || null;

    // 1. Criar Oficina Alpha (Plano Essencial para testar gating + RBAC) e Oficina Beta (Plano Premium)
    const tAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       VALUES ('Alpha Security Lab', 'Alpha Security LTDA', 'sec@alpha.com', '11999990001', $1, 'active', $2)
       RETURNING id;`,
      [`alpha-sec-${Date.now()}`, planEssencialId],
      { bypassRls: true }
    );
    tenantAlphaId = tAlpha.rows[0].id;

    if (planEssencialId) {
      await tenantQuery(
        null,
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days');`,
        [tenantAlphaId, planEssencialId],
        { bypassRls: true }
      );
    }

    const tBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, phone, slug, status, plan_id)
       VALUES ('Beta Vault Studio', 'Beta Vault LTDA', 'sec@beta.com', '11999990002', $1, 'active', $2)
       RETURNING id;`,
      [`beta-sec-${Date.now()}`, planPremiumId],
      { bypassRls: true }
    );
    tenantBetaId = tBeta.rows[0].id;

    if (planPremiumId) {
      await tenantQuery(
        null,
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days');`,
        [tenantBetaId, planPremiumId],
        { bypassRls: true }
      );
    }

    const pwdHash = await hashPassword('SecTest@2026!');

    // Usuário Gestor Alpha
    const uAlphaGestor = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha Sec', $1, $2) RETURNING id;`,
      [`gestor_sec_${Date.now()}@alpha.com`, pwdHash],
      { bypassRls: true }
    );
    userAlphaGestorId = uAlphaGestor.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role, is_active)
       VALUES ($1, $2, 'gestor', true);`,
      [tenantAlphaId, userAlphaGestorId],
      { bypassRls: true }
    );

    // Usuário Técnico Alpha (Menor privilégio)
    const uAlphaTec = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Tecnico Alpha Sec', $1, $2) RETURNING id;`,
      [`tec_sec_${Date.now()}@alpha.com`, pwdHash],
      { bypassRls: true }
    );
    userAlphaTecnicoId = uAlphaTec.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role, is_active)
       VALUES ($1, $2, 'tecnico', true);`,
      [tenantAlphaId, userAlphaTecnicoId],
      { bypassRls: true }
    );

    // Usuário Gestor Beta
    const uBetaGestor = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta Sec', $1, $2) RETURNING id;`,
      [`gestor_sec_${Date.now()}@beta.com`, pwdHash],
      { bypassRls: true }
    );
    userBetaGestorId = uBetaGestor.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role, is_active)
       VALUES ($1, $2, 'gestor', true);`,
      [tenantBetaId, userBetaGestorId],
      { bypassRls: true }
    );

    tokenAlphaGestor = signJwt({
      sub: userAlphaGestorId,
      email: 'gestor@alpha.com',
      role: 'gestor',
      tenantId: tenantAlphaId,
    });

    tokenAlphaTecnico = signJwt({
      sub: userAlphaTecnicoId,
      email: 'tecnico@alpha.com',
      role: 'tecnico',
      tenantId: tenantAlphaId,
    });

    tokenBetaGestor = signJwt({
      sub: userBetaGestorId,
      email: 'gestor@beta.com',
      role: 'gestor',
      tenantId: tenantBetaId,
    });

    // Criar recursos na Oficina Beta para tentativa de IDOR a partir da Oficina Alpha
    const billRes = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO financial_bills (tenant_id, type, description, amount_cents, due_date, status)
       VALUES ($1, 'payable', 'Conta Confidencial Beta', 120000, CURRENT_DATE, 'pending')
       RETURNING id;`,
      [tenantBetaId]
    );
    betaBillId = billRes.rows[0].id;

    const leadRes = await tenantQuery<{ id: string }>(
      tenantBetaId,
      `INSERT INTO minisite_leads (tenant_id, name, phone, vehicle_model, service_interest)
       VALUES ($1, 'Cliente VIP Beta', '11977776666', 'Ferrari F8', 'PPF Full')
       RETURNING id;`,
      [tenantBetaId]
    );
    betaLeadId = leadRes.rows[0].id;
  });

  after(async () => {
    if (tenantAlphaId && tenantBetaId) {
      await tenantQuery(
        null,
        `DELETE FROM tenants WHERE id IN ($1, $2);`,
        [tenantAlphaId, tenantBetaId],
        { bypassRls: true }
      );
    }
    if (userAlphaGestorId && userAlphaTecnicoId && userBetaGestorId) {
      await tenantQuery(
        null,
        `DELETE FROM users WHERE id IN ($1, $2, $3);`,
        [userAlphaGestorId, userAlphaTecnicoId, userBetaGestorId],
        { bypassRls: true }
      );
    }
    await app.close();
    await pool.end();
    await adminPool.end();
  });

  it('OWASP A01 — Broken Access Control (Escalada Vertical RBAC): Técnico não pode acessar rotas corporativas nem configurações fiscais', async () => {
    const corpRes = await app.inject({
      method: 'GET',
      url: '/corporate/overview',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(corpRes.statusCode, 403, 'Técnico deve ser bloqueado no cockpit corporativo (HTTP 403)');

    const fiscalRes = await app.inject({
      method: 'PUT',
      url: '/fiscal/settings',
      headers: {
        authorization: `Bearer ${tokenAlphaTecnico}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        environment: 'sandbox',
        provider: 'focus_nfe',
        taxRegime: 'simples_nacional',
        defaultServiceCode: '14.01',
        cnaeCode: '4520-0/05',
        defaultIssRateBasisPoints: 200,
      },
    });
    assert.equal(fiscalRes.statusCode, 403, 'Técnico deve ser bloqueado ao tentar alterar configurações fiscais');
  });

  it('OWASP A01 — Broken Access Control (IDOR / BOLA Horizontal): Oficina Alpha não pode manipular recursos da Oficina Beta por UUID', async () => {
    // 1. Tentativa de quitar ou deletar conta financeira da Oficina Beta usando token da Oficina Alpha
    const payBillRes = await app.inject({
      method: 'PATCH',
      url: `/financial/bills/${betaBillId}/pay`,
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        paymentMethod: 'pix',
      },
    });
    assert.ok(
      [403, 404].includes(payBillRes.statusCode),
      `Tentativa de IDOR em financial_bills deve retornar 403 ou 404 (recebido: ${payBillRes.statusCode})`
    );

    // 2. Tentativa de alterar status de lead do Mini-Site da Oficina Beta
    const leadPatchRes = await app.inject({
      method: 'PATCH',
      url: `/minisite/leads/${betaLeadId}/status`,
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        status: 'converted',
      },
    });
    assert.ok(
      [403, 404].includes(leadPatchRes.statusCode),
      `Tentativa de IDOR em minisite_leads deve retornar 403 ou 404 (recebido: ${leadPatchRes.statusCode})`
    );
  });

  it('OWASP A02 — Cryptographic Failures: Segredos fiscais (Token Focus NFe e Certificado A1) são cifrados em AES-256-GCM e nunca expostos na API', async () => {
    const rawSecretToken = 'focus_live_secret_token_99887766';
    const rawCertPfx = Buffer.from('FAKE_PFX_BINARY_CONTENT_2026').toString('base64');
    const rawCertPass = 'SenhaCertificadoA1@SuperSecreta';

    const updateRes = await app.inject({
      method: 'PUT',
      url: '/fiscal/settings',
      headers: {
        authorization: `Bearer ${tokenBetaGestor}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        environment: 'sandbox',
        provider: 'focus_nfe',
        apiToken: rawSecretToken,
        certificatePfxBase64: rawCertPfx,
        certificatePassword: rawCertPass,
        companyLegalName: 'Beta Vault LTDA',
        companyCnpj: '12345678000199',
        municipalInscription: '998877',
        taxRegime: 'simples_nacional',
        defaultServiceCode: '14.01',
        cnaeCode: '4520-0/05',
        defaultIssRateBasisPoints: 200,
      },
    });

    assert.equal(updateRes.statusCode, 200);
    const body = updateRes.json();

    // Resposta JSON nunca pode conter o segredo em texto claro
    const rawJsonString = JSON.stringify(body);
    assert.equal(rawJsonString.includes(rawSecretToken), false, 'API não pode retornar apiToken em texto claro');
    assert.equal(rawJsonString.includes(rawCertPass), false, 'API não pode retornar certificatePassword em texto claro');
    assert.equal(body.hasApiToken, true);
    assert.equal(body.hasCertificate, true);

    // Verificar no banco de dados que os valores em repouso estão cifrados (AES-256-GCM)
    const dbRes = await tenantQuery<{
      api_token_encrypted: string;
      certificate_pfx_base64_encrypted: string;
      certificate_password_encrypted: string;
    }>(
      tenantBetaId,
      `SELECT api_token_encrypted, certificate_pfx_base64_encrypted, certificate_password_encrypted
       FROM tenant_fiscal_settings WHERE tenant_id = $1;`,
      [tenantBetaId]
    );

    assert.equal(dbRes.rows.length, 1);
    const row = dbRes.rows[0];
    assert.notEqual(row.api_token_encrypted, rawSecretToken, 'Token no banco deve estar cifrado');
    assert.notEqual(row.certificate_password_encrypted, rawCertPass, 'Senha do certificado no banco deve estar cifrada');
    assert.ok(row.api_token_encrypted.includes(':'), 'Formato cifrado AES-256-GCM deve conter separadores iv:authTag:cipher');
  });

  it('OWASP A03 — Injection (SQLi & Malicious Input): Payloads de SQL Injection em buscas e rotas públicas são neutralizados', async () => {
    const sqliPayloads = [
      "' OR '1'='1'; DROP TABLE customers; --",
      "1' UNION SELECT id, email, password_hash FROM users --",
      "'; SELECT pg_sleep(5); --",
    ];

    for (const payload of sqliPayloads) {
      const searchRes = await app.inject({
        method: 'GET',
        url: `/customers?search=${encodeURIComponent(payload)}`,
        headers: {
          authorization: `Bearer ${tokenBetaGestor}`,
          'x-tenant-id': tenantBetaId,
        },
      });

      assert.notEqual(searchRes.statusCode, 500, 'Busca com payload SQLi não pode causar erro 500 de sintaxe SQL');

      const publicSiteRes = await app.inject({
        method: 'GET',
        url: `/public/tenant/${encodeURIComponent(payload)}/site`,
      });
      assert.equal(publicSiteRes.statusCode, 404, 'Slug malicioso em rota pública deve retornar 404 seguro');
    }

    // Confirmar que a tabela customers permanece intacta
    const checkTable = await tenantQuery<{ count: string }>(
      tenantBetaId,
      `SELECT COUNT(*)::text as count FROM customers;`
    );
    assert.ok(Number(checkTable.rows[0].count) >= 0);
  });

  it('OWASP A04 — Insecure Design: Feature Gating por plano (HTTP 403 no plano Essencial) e Honeypot Anti-Bot em rotas públicas', async () => {
    // 1. Oficina Alpha está no plano Essencial -> tentar cadastrar bobina de PPF (exclusivo Pro/Premium)
    const rollRes = await app.inject({
      method: 'POST',
      url: '/materials/rolls',
      headers: {
        authorization: `Bearer ${tokenAlphaGestor}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        materialId: '00000000-0000-0000-0000-000000000000',
        brand: 'XPEL',
        model: 'Ultimate Plus',
        serialNumber: 'XPEL-SEC-01',
        lotNumber: 'LOT-01',
        widthMeters: 1.52,
        initialMeters: 15,
        costCents: 650000,
      },
    });
    assert.equal(rollRes.statusCode, 403, 'Plano Essencial deve ser bloqueado no controle de bobinas PPF com HTTP 403');

    // 2. Honeypot Anti-Bot em POST /public/leads
    const botEmail = `bot_spam_${Date.now()}@evil.com`;
    const leadBotRes = await app.inject({
      method: 'POST',
      url: '/public/leads',
      payload: {
        name: 'Bot Spammer',
        email: botEmail,
        phone: '11999999999',
        workshopName: 'Oficina Fake Bot',
        website: 'http://spammer-bot-link.com', // Campo honeypot preenchido!
      },
    });
    // Honeypot descarta silenciosamente (200/201 fake) ou bloqueia (400), mas NUNCA grava no banco
    assert.ok([200, 201, 400].includes(leadBotRes.statusCode));

    const checkBotDb = await tenantQuery(
      null,
      `SELECT id FROM leads WHERE email = $1;`,
      [botEmail],
      { bypassRls: true }
    );
    assert.equal(checkBotDb.rows.length, 0, 'Bot capturado pelo honeypot nunca deve ser persistido na tabela leads');
  });

  it('OWASP A05 & A07 — Authentication & Security Misconfiguration: Rejeição de JWT forjado e sanitização de erros', async () => {
    // 1. Token JWT com assinatura adulterada
    const forgedToken = `${tokenBetaGestor.slice(0, -5)}XXXXX`;
    const forgedRes = await app.inject({
      method: 'GET',
      url: '/crm/retention/overview',
      headers: {
        authorization: `Bearer ${forgedToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(forgedRes.statusCode, 401, 'JWT com assinatura adulterada deve retornar HTTP 401');

    // 2. Algoritmo "none" attack
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const nonePayload = Buffer.from(
      JSON.stringify({ sub: userBetaGestorId, role: 'owner', tenantId: tenantBetaId })
    ).toString('base64url');
    const algNoneToken = `${noneHeader}.${nonePayload}.`;

    const algNoneRes = await app.inject({
      method: 'GET',
      url: '/crm/retention/overview',
      headers: {
        authorization: `Bearer ${algNoneToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(algNoneRes.statusCode, 401, 'JWT com ataque alg:none deve ser rejeitado com HTTP 401');
  });
});

