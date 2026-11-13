import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { PlanFeatures } from '@carx/shared';

describe('T3.13 — Portal do Cliente Seguro ("Meu Veículo")', () => {
  let app: any;
  const timestamp = Date.now();

  // Tenant Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;

  // Clientes Alpha
  let customerAlpha1Id: string;
  const phoneAlpha1 = '+5511988881111';
  const emailAlpha1 = `cliente1-${timestamp}@gmail.com`;

  let customerAlpha2Id: string; // Cliente novo sem OS (para validar eliminação de modo demo)
  const phoneAlpha2 = '+5511988882222';

  // Veículos e OS de Alpha
  let vehicleAlpha1Id: string;
  let woAlpha1Id: string;
  let warrantyAlpha1Id: string;

  // Tenant Beta (Concorrente)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let customerBetaId: string;
  const phoneBeta = '+5511977773333';

  // Tokens e Códigos do Portal
  let portalTokenAlpha1: string;
  let portalTokenAlpha2: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    const passHash = await hashPassword('SenhaSegura123!');

    // 0. Setup Plano com CUSTOMER_PORTAL e WHATSAPP_GATEWAY
    const resPlan = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
       VALUES ('Plano Portal Test', $1, 'Plano de Teste Portal', 19900, 'monthly',
               '{"max_units": 1, "max_users": 5, "max_storage_mb": 5120, "max_whatsapp_messages_per_month": 1000}',
               $2, true)
       RETURNING id;`,
      [`plan-portal-${timestamp}`, JSON.stringify([PlanFeatures.CUSTOMER_PORTAL, PlanFeatures.WHATSAPP_GATEWAY])],
      { bypassRls: true }
    );
    const planPortalId = resPlan.rows[0].id;

    // 1. Setup Tenant Alpha
    tenantAlphaSlug = `alpha-portal-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment, plan_id)
       VALUES ('CarX Detailing Alpha', 'Alpha Detailing LTDA', $1, $2, '11.888.777/0001-99', 'active', 'estetica', $3)
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug, planPortalId],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Conectar WhatsApp de Alpha
    await tenantQuery(
      null,
      `INSERT INTO tenant_whatsapp_instances (tenant_id, status, phone_number, daily_limit)
       VALUES ($1, 'CONNECTED', '5511999998888', 500)
       ON CONFLICT (tenant_id) DO UPDATE SET status = 'CONNECTED', phone_number = '5511999998888'`,
      [tenantAlphaId],
      { bypassRls: true }
    );

    // Owner de Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Proprietário Alpha', $1, $2)
       RETURNING id;`,
      [`owner-alpha-${timestamp}@carx.com`, passHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, resOwnerAlpha.rows[0].id],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      sub: resOwnerAlpha.rows[0].id,
      email: `owner-alpha-${timestamp}@carx.com`,
      tenant_id: tenantAlphaId,
      role: 'owner',
    });

    // 2. Setup Tenant Beta
    tenantBetaSlug = `beta-portal-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment, plan_id)
       VALUES ('CarX Detailing Beta', 'Beta Detailing LTDA', $1, $2, '22.888.777/0001-99', 'active', 'estetica', $3)
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug, planPortalId],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    // Conectar WhatsApp de Beta
    await tenantQuery(
      null,
      `INSERT INTO tenant_whatsapp_instances (tenant_id, status, phone_number, daily_limit)
       VALUES ($1, 'CONNECTED', '5511988887777', 500)
       ON CONFLICT (tenant_id) DO UPDATE SET status = 'CONNECTED', phone_number = '5511988887777'`,
      [tenantBetaId],
      { bypassRls: true }
    );

    // 3. Cadastrar Cliente 1 em Alpha
    const resCust1 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO customers (tenant_id, name, phone, phone_raw, email, document, document_type, address_city, address_state)
       VALUES ($1, 'Carlos Silva', $2, '11988881111', $3, '12345678909', 'cpf', 'São Paulo', 'SP')
       RETURNING id;`,
      [tenantAlphaId, phoneAlpha1, emailAlpha1],
      { bypassRls: true }
    );
    customerAlpha1Id = resCust1.rows[0].id;

    // 4. Cadastrar Cliente 2 em Alpha (sem OS)
    const resCust2 = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO customers (tenant_id, name, phone, phone_raw, email, document, document_type)
       VALUES ($1, 'Beatriz Santos', $2, '11988882222', 'beatriz@email.com', '98765432100', 'cpf')
       RETURNING id;`,
      [tenantAlphaId, phoneAlpha2],
      { bypassRls: true }
    );
    customerAlpha2Id = resCust2.rows[0].id;

    // 5. Cadastrar Cliente em Beta
    const resCustBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO customers (tenant_id, name, phone, phone_raw, email)
       VALUES ($1, 'Roberto Beta', $2, '11977773333', 'roberto@beta.com')
       RETURNING id;`,
      [tenantBetaId, phoneBeta],
      { bypassRls: true }
    );
    customerBetaId = resCustBeta.rows[0].id;

    // 6. Veículo para Cliente 1
    const resVeh = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'POR-9111', 'Porsche', '911 Carrera S', 'Preto', 2024, 'esportivo')
       RETURNING id;`,
      [tenantAlphaId, customerAlpha1Id],
      { bypassRls: true }
    );
    vehicleAlpha1Id = resVeh.rows[0].id;

    // 7. Ordem de Serviço para Cliente 1
    const resWo = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO work_orders (
         tenant_id, customer_id, vehicle_id, os_number, status, progress,
         total_cents, discount_cents, final_cents, paid_cents,
         tracking_token, created_at
       ) VALUES (
         $1, $2, $3, 1001, 'IN_PROGRESS', 50,
         450000, 50000, 400000, 400000,
         gen_random_uuid(), NOW()
       ) RETURNING id;`,
      [tenantAlphaId, customerAlpha1Id, vehicleAlpha1Id],
      { bypassRls: true }
    );
    woAlpha1Id = resWo.rows[0].id;

    // Itens da OS
    await tenantQuery(
      null,
      `INSERT INTO work_order_items (tenant_id, work_order_id, name, quantity, unit_price_cents, total_cents, warranty_months)
       VALUES ($1, $2, 'PPF Frontal Completo', 1, 450000, 400000, 60);`,
      [tenantAlphaId, woAlpha1Id],
      { bypassRls: true }
    );

    // Linha do Tempo da OS
    await tenantQuery(
      null,
      `INSERT INTO work_order_events (tenant_id, work_order_id, event_type, to_status, notes)
       VALUES 
       ($1, $2, 'CREATED', 'QUOTE', 'Orçamento inicial gerado'),
       ($1, $2, 'STATUS_CHANGED', 'IN_PROGRESS', 'Aplicação de película iniciada na cabine 1');`,
      [tenantAlphaId, woAlpha1Id],
      { bypassRls: true }
    );

    // Inspeção e Foto de Antes
    const resInsp = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO inspections (tenant_id, work_order_id, vehicle_id, inspection_type, status)
       VALUES ($1, $2, $3, 'check_in', 'completed')
       RETURNING id;`,
      [tenantAlphaId, woAlpha1Id, vehicleAlpha1Id],
      { bypassRls: true }
    );
    const inspectionId = resInsp.rows[0].id;

    // Storage file para a foto
    const resFile = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO storage_files (tenant_id, file_key, bucket_name, original_name, mime_type, real_mime_type, size_bytes, category)
       VALUES ($1, 'inspections/foto1.jpg', 'carx-media', 'frente_antes.jpg', 'image/jpeg', 'image/jpeg', 154200, 'inspection')
       RETURNING id;`,
      [tenantAlphaId],
      { bypassRls: true }
    );

    await tenantQuery(
      null,
      `INSERT INTO inspection_photos (tenant_id, inspection_id, photo_file_id, angle, phase, caption)
       VALUES ($1, $2, $3, 'front', 'before', 'Frente sem avarias antes do PPF');`,
      [tenantAlphaId, inspectionId, resFile.rows[0].id],
      { bypassRls: true }
    );

    // Garantia para Cliente 1
    const resWar = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO warranties (
         tenant_id, work_order_id, customer_id, vehicle_id, service_name,
         warranty_months, starts_at, expires_at, verification_token, status
       ) VALUES (
         $1, $2, $3, $4, 'PPF Frontal Completo',
         60, NOW(), NOW() + INTERVAL '60 months', gen_random_uuid(), 'active'
       ) RETURNING id;`,
      [tenantAlphaId, woAlpha1Id, customerAlpha1Id, vehicleAlpha1Id],
      { bypassRls: true }
    );
    warrantyAlpha1Id = resWar.rows[0].id;
  });

  // ============================================================================
  // 1. FLUXO DE OTP E BLINDAGEM ANTI-ENUMERAÇÃO
  // ============================================================================

  test('Gating Arquitetural: Solicitar OTP em oficina com WhatsApp desconectado deve retornar HTTP 403', async () => {
    // Desconecta temporariamente o WhatsApp de Beta
    await tenantQuery(
      null,
      `UPDATE tenant_whatsapp_instances SET status = 'DISCONNECTED' WHERE tenant_id = $1`,
      [tenantBetaId],
      { bypassRls: true }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: {
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        identifier: phoneBeta,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'WHATSAPP_NOT_CONNECTED');
    assert.match(body.message, /WhatsApp desta oficina ainda não foi configurado/i);

    // Reconecta o WhatsApp de Beta
    await tenantQuery(
      null,
      `UPDATE tenant_whatsapp_instances SET status = 'CONNECTED' WHERE tenant_id = $1`,
      [tenantBetaId],
      { bypassRls: true }
    );
  });

  test('Anti-Enumeração: Solicitar OTP para telefone inexistente responde com HTTP 200 e mensagem neutra', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        identifier: '+5511900009999', // Não cadastrado
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.match(body.message, /Se o identificador informado estiver cadastrado/i);
    // Não pode conter código OTP pois o usuário não existe!
    assert.equal(body.devOtpCode, undefined);
  });

  test('Solicitar OTP para telefone cadastrado gera código de 6 dígitos numéricos com sucesso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        identifier: phoneAlpha1,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.match(body.message, /Se o identificador informado estiver cadastrado/i);
    assert.ok(body.devOtpCode);
    assert.match(body.devOtpCode, /^\d{6}$/);

    // Confere se gravou no banco de dados na tabela customer_portal_otps
    const otpDb = await tenantQuery<{ attempts: number; max_attempts: number; otp_hash: string }>(
      null,
      `SELECT attempts, max_attempts, otp_hash FROM customer_portal_otps
       WHERE tenant_id = $1 AND customer_id = $2 AND used_at IS NULL`,
      [tenantAlphaId, customerAlpha1Id],
      { bypassRls: true }
    );
    assert.equal(otpDb.rows.length, 1);
    assert.equal(otpDb.rows[0].attempts, 0);
    assert.equal(otpDb.rows[0].max_attempts, 5);
  });

  test('Solicitar OTP para e-mail cadastrado funciona normalmente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        identifier: emailAlpha1,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.devOtpCode);
  });

  test('Validar OTP com código incorreto incrementa tentativas e retorna HTTP 400 com tentativas restantes', async () => {
    // Solicita um novo OTP limpo para phoneAlpha1
    const reqRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1 },
    });
    assert.equal(reqRes.statusCode, 200);

    // Tenta validar com código errado
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/verify-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: {
        identifier: phoneAlpha1,
        code: '000000', // Código incorreto
      },
    });

    assert.equal(verifyRes.statusCode, 400);
    const body = JSON.parse(verifyRes.payload);
    assert.equal(body.code, 'OTP_INVALID');
    assert.match(body.message, /Código de verificação incorreto.*mais 4 tentativa\(s\)/i);
  });

  test('Anti-Brute Force: Errar o código 5 vezes bloqueia com HTTP 429 Too Many Attempts', async () => {
    // Solicita um novo OTP limpo
    await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1 },
    });

    // Erra 4 vezes
    for (let i = 0; i < 4; i++) {
      await app.inject({
        method: 'POST',
        url: '/portal/auth/verify-otp',
        headers: { 'x-tenant-id': tenantAlphaId },
        payload: { identifier: phoneAlpha1, code: '111111' },
      });
    }

    // A 5ª tentativa incorreta deve esgotar o limite
    const fifthRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/verify-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1, code: '111111' },
    });

    assert.equal(fifthRes.statusCode, 429);
    const body = JSON.parse(fifthRes.payload);
    assert.equal(body.code, 'OTP_TOO_MANY_ATTEMPTS');
  });

  test('Validar OTP expirado retorna HTTP 400 OTP_EXPIRED', async () => {
    // Solicita novo OTP
    const reqRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1 },
    });
    const { devOtpCode } = JSON.parse(reqRes.payload);

    // Força expiração no banco
    await tenantQuery(
      null,
      `UPDATE customer_portal_otps
       SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE tenant_id = $1 AND customer_id = $2 AND used_at IS NULL`,
      [tenantAlphaId, customerAlpha1Id],
      { bypassRls: true }
    );

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/verify-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1, code: devOtpCode },
    });

    assert.equal(verifyRes.statusCode, 400);
    const body = JSON.parse(verifyRes.payload);
    assert.equal(body.code, 'OTP_EXPIRED');
  });

  test('Validar OTP com código correto emite JWT assinado com scope "customer_portal"', async () => {
    // Solicita novo OTP válido
    const reqRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1 },
    });
    const { devOtpCode } = JSON.parse(reqRes.payload);

    // Valida com código correto
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/verify-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha1, code: devOtpCode },
    });

    assert.equal(verifyRes.statusCode, 200);
    const body = JSON.parse(verifyRes.payload);
    assert.ok(body.token);
    assert.equal(body.customer.id, customerAlpha1Id);
    assert.equal(body.customer.name, 'Carlos Silva');
    assert.equal(body.customer.phone, phoneAlpha1);

    portalTokenAlpha1 = body.token;
  });

  // ============================================================================
  // 2. ISOLAMENTO DE ACESSO RBAC E MATRIZ DE PAPÉIS
  // ============================================================================

  test('Segurança: Token do Portal do Cliente é sumariamente rejeitado em rotas de equipe de loja (HTTP 403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/customers',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.match(body.message, /Tokens do Portal do Cliente não possuem permissão/i);
  });

  test('Segurança: Acesso a rotas do portal sem token retorna HTTP 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/me',
      headers: {
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 401);
  });

  // ============================================================================
  // 3. CONSULTA DE PERFIL E VEÍCULOS
  // ============================================================================

  test('GET /portal/me retorna os dados do cliente autenticado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/me',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.id, customerAlpha1Id);
    assert.equal(body.name, 'Carlos Silva');
    assert.equal(body.city, 'São Paulo');
    assert.equal(body.state, 'SP');
  });

  test('GET /portal/vehicles retorna os veículos pertencentes ao cliente autenticado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/vehicles',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.vehicles.length, 1);
    assert.equal(body.vehicles[0].plate, 'POR-9111');
    assert.equal(body.vehicles[0].brand, 'Porsche');
    assert.equal(body.vehicles[0].model, '911 Carrera S');
  });

  // ============================================================================
  // 4. CRITÉRIO FUNDAMENTAL: ERRADICAÇÃO TOTAL DO MODO DEMONSTRAÇÃO
  // ============================================================================

  test('Critério Fundamental: Cliente novo sem ordens de serviço recebe lista vazia [] (ZERO dados fictícios / ZERO modo demo)', async () => {
    // Autentica Cliente 2 (Beatriz Santos, que não possui nenhuma OS nem veículo)
    const reqRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/request-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha2 },
    });
    const { devOtpCode } = JSON.parse(reqRes.payload);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/portal/auth/verify-otp',
      headers: { 'x-tenant-id': tenantAlphaId },
      payload: { identifier: phoneAlpha2, code: devOtpCode },
    });
    portalTokenAlpha2 = JSON.parse(verifyRes.payload).token;

    // Busca OSs do Cliente 2
    const resWo = await app.inject({
      method: 'GET',
      url: '/portal/work-orders',
      headers: {
        authorization: `Bearer ${portalTokenAlpha2}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(resWo.statusCode, 200);
    const bodyWo = JSON.parse(resWo.payload);
    // Deve ser RIGOROSAMENTE uma lista vazia, NUNCA mock, demo ou dados simulados!
    assert.deepEqual(bodyWo.workOrders, []);

    // Busca veículos do Cliente 2
    const resVeh = await app.inject({
      method: 'GET',
      url: '/portal/vehicles',
      headers: {
        authorization: `Bearer ${portalTokenAlpha2}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(resVeh.statusCode, 200);
    const bodyVeh = JSON.parse(resVeh.payload);
    assert.deepEqual(bodyVeh.vehicles, []);
  });

  // ============================================================================
  // 5. DETALHES DA OS, TIMELINE, FOTOS E GARANTIAS
  // ============================================================================

  test('GET /portal/work-orders lista as ordens de serviço reais do cliente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/work-orders',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.workOrders.length, 1);
    const wo = body.workOrders[0];
    assert.equal(wo.id, woAlpha1Id);
    assert.equal(wo.osNumber, 1001);
    assert.equal(wo.status, 'IN_PROGRESS');
    assert.equal(wo.progress, 50);
    assert.equal(wo.vehiclePlate, 'POR-9111');
    assert.equal(wo.finalCents, 400000);
    assert.equal(wo.paidCents, 400000);
    assert.equal(wo.isFullyPaid, true);
  });

  test('GET /portal/work-orders/:id traz detalhes e serviços contratados', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/portal/work-orders/${woAlpha1Id}`,
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.id, woAlpha1Id);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].serviceName, 'PPF Frontal Completo');
    assert.equal(body.items[0].warrantyMonths, 60);
  });

  test('GET /portal/work-orders/:id/timeline traz a linha do tempo dos eventos da OS', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/portal/work-orders/${woAlpha1Id}/timeline`,
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.events.length >= 2);
    assert.equal(body.events[0].title, 'Orçamento Criado');
    assert.equal(body.events[1].title, 'Serviço em Execução');
  });

  test('GET /portal/work-orders/:id/photos traz as fotos de inspeção guiadas antes/depois', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/portal/work-orders/${woAlpha1Id}/photos`,
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.photos.length, 1);
    assert.equal(body.photos[0].angle, 'front');
    assert.equal(body.photos[0].phase, 'before');
    assert.equal(body.photos[0].caption, 'Frente sem avarias antes do PPF');
    assert.match(body.photos[0].url, /\/storage\/files\//);
  });

  test('GET /portal/warranties lista os certificados de garantia do cliente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/warranties',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.warranties.length, 1);
    assert.equal(body.warranties[0].serviceName, 'PPF Frontal Completo');
    assert.equal(body.warranties[0].warrantyMonths, 60);
    assert.ok(body.warranties[0].verificationToken);
    assert.equal(body.warranties[0].status, 'active');
  });

  // ============================================================================
  // 6. ISOLAMENTO CROSS-CUSTOMER E CROSS-TENANT
  // ============================================================================

  test('Privacidade Cross-Customer: Cliente 2 tentando acessar a OS do Cliente 1 recebe HTTP 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/portal/work-orders/${woAlpha1Id}`,
      headers: {
        authorization: `Bearer ${portalTokenAlpha2}`, // Token de Beatriz
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 404);
  });

  test('Privacidade Cross-Customer: Cliente 2 tentando acessar as fotos da OS do Cliente 1 recebe HTTP 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/portal/work-orders/${woAlpha1Id}/photos`,
      headers: {
        authorization: `Bearer ${portalTokenAlpha2}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 404);
  });

  test('Isolamento Cross-Tenant (RLS): Token do Cliente de Alpha não consegue acessar dados na Oficina Beta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/portal/me',
      headers: {
        authorization: `Bearer ${portalTokenAlpha1}`, // Pertence a Alpha
        'x-tenant-id': tenantBetaId, // Enviado para Beta
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.match(body.message, /Token pertence a outra oficina/i);
  });
});
