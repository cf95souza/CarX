import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { ApiKeyService } from './api-key-service.js';
import { WebhookService } from './webhook-service.js';

describe('T3.14 — API Pública, Chaves de API e Webhooks Reais', () => {
  let app: any;
  const timestamp = Date.now();

  // Servidor HTTP mock para simulação de recebimento de webhooks
  let mockWebhookServer: http.Server;
  let mockServerPort: number;
  let receivedWebhookHeaders: Record<string, string> = {};
  let receivedWebhookBody: any = null;
  let mockServerResponseStatus = 200;

  // Tenant Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let woAlphaId: string;

  // Tenant Beta (Concorrente para testes de isolamento multi-tenant)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaToken: string;
  let customerBetaId: string;
  let vehicleBetaId: string;
  let woBetaId: string;

  // Chaves de API de teste
  let apiKeyAlphaToken: string;
  let apiKeyAlphaId: string;
  let apiKeyReadOnlyToken: string;
  let apiKeyRateLimitedToken: string;

  // Webhooks de teste
  let webhookAlphaId: string;
  let webhookAlphaSecret: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    // 1. Subir servidor mock local para escutar webhooks nos testes
    await new Promise<void>((resolve) => {
      mockWebhookServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          receivedWebhookHeaders = req.headers as Record<string, string>;
          try {
            receivedWebhookBody = JSON.parse(body);
          } catch {
            receivedWebhookBody = body;
          }
          res.writeHead(mockServerResponseStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: mockServerResponseStatus < 400 }));
        });
      });

      mockWebhookServer.listen(0, '127.0.0.1', () => {
        const addr = mockWebhookServer.address() as any;
        mockServerPort = addr.port;
        resolve();
      });
    });

    const passHash = await hashPassword('SenhaSegura123!');

    // 2. Setup Tenant Alpha
    tenantAlphaSlug = `alpha-integrations-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Studio Alpha', 'Alpha Studio LTDA', $1, $2, '33.888.777/0001-99', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Owner Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Alpha', $1, $2)
       RETURNING id;`,
      [`gestor-alpha-${timestamp}@carx.com`, passHash],
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
      email: `gestor-alpha-${timestamp}@carx.com`,
      tenant_id: tenantAlphaId,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // Cliente e Veículo Alpha
    const resCustAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO customers (tenant_id, name, phone, phone_raw, email, document, document_type)
       VALUES ($1, 'Rodrigo Fernandes', '+5511999991111', '11999991111', $2, '23456789012', 'cpf')
       RETURNING id;`,
      [tenantAlphaId, `rodrigo-${timestamp}@gmail.com`],
      { bypassRls: true }
    );
    customerAlphaId = resCustAlpha.rows[0].id;

    const resVehAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color)
       VALUES ($1, $2, 'ALP-1010', 'Porsche', '911 Carrera', 2024, 'Cinza')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId],
      { bypassRls: true }
    );
    vehicleAlphaId = resVehAlpha.rows[0].id;

    // OS Alpha
    const resWoAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO work_orders (tenant_id, os_number, customer_id, vehicle_id, status, total_cents, notes)
       VALUES ($1, 101, $2, $3, 'IN_PROGRESS', 450000, 'PPF Frontal e Ceramic')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId],
      { bypassRls: true }
    );
    woAlphaId = resWoAlpha.rows[0].id;

    // 3. Setup Tenant Beta
    tenantBetaSlug = `beta-integrations-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Studio Beta', 'Beta Studio LTDA', $1, $2, '44.888.777/0001-99', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id;`,
      [`gestor-beta-${timestamp}@carx.com`, passHash],
      { bypassRls: true }
    );
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, resOwnerBeta.rows[0].id],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      sub: resOwnerBeta.rows[0].id,
      email: `gestor-beta-${timestamp}@carx.com`,
      tenant_id: tenantBetaId,
      tenantId: tenantBetaId,
      role: 'owner',
    });

    const resCustBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO customers (tenant_id, name, phone, phone_raw, email, document, document_type)
       VALUES ($1, 'Camila Duarte', '+5511999992222', '11999992222', $2, '34567890123', 'cpf')
       RETURNING id;`,
      [tenantBetaId, `camila-${timestamp}@gmail.com`],
      { bypassRls: true }
    );
    customerBetaId = resCustBeta.rows[0].id;

    const resVehBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, year, color)
       VALUES ($1, $2, 'BET-2020', 'BMW', 'M3 Competition', 2024, 'Azul')
       RETURNING id;`,
      [tenantBetaId, customerBetaId],
      { bypassRls: true }
    );
    vehicleBetaId = resVehBeta.rows[0].id;

    const resWoBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO work_orders (tenant_id, os_number, customer_id, vehicle_id, status, total_cents)
       VALUES ($1, 201, $2, $3, 'READY', 250000)
       RETURNING id;`,
      [tenantBetaId, customerBetaId, vehicleBetaId],
      { bypassRls: true }
    );
    woBetaId = resWoBeta.rows[0].id;
  });

  after(async () => {
    if (mockWebhookServer) {
      mockWebhookServer.close();
    }
  });

  // ==============================================================================
  // 1. OPENAPI & SWAGGER UI DOCUMENTATION
  // ==============================================================================

  test('GET /v1/openapi.json retorna especificação OpenAPI 3.0 válida', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/openapi.json',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.openapi, '3.0.3');
    assert.equal(body.info.title, 'CarX Public API & Webhooks');
    assert.ok(body.paths['/v1/work-orders']);
    assert.ok(body.paths['/v1/work-orders/{id}']);
    assert.ok(body.paths['/v1/customers']);
    assert.ok(body.components.securitySchemes.ApiKeyAuth);
  });

  test('GET /docs retorna visualizador Swagger UI interativo em HTML', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type']?.includes('text/html'));
    assert.ok(res.payload.includes('<title>CarX — Documentação da API Pública & Webhooks</title>'));
    assert.ok(res.payload.includes('swagger-ui'));
  });

  // ==============================================================================
  // 2. GESTÃO DE CHAVES DE API
  // ==============================================================================

  test('POST /integrations/api-keys gera chave com hash SHA-256 e exibe token plaintext uma única vez', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'ERP Faturamento Alpha',
        permissions: ['read:work_orders', 'write:work_orders', 'read:customers', 'read:nps'],
        rateLimitPerMinute: 60,
        expiresInDays: 90,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.ok(body.apiKey.id);
    assert.equal(body.apiKey.name, 'ERP Faturamento Alpha');
    assert.ok(body.apiKey.prefix.startsWith('carx_live_'));
    assert.equal(body.apiKey.status, 'active');

    // O token completo deve ser retornado no momento da criação
    assert.ok(body.token.startsWith('carx_live_'));
    assert.ok(body.token.length >= 40);

    apiKeyAlphaToken = body.token;
    apiKeyAlphaId = body.apiKey.id;

    // Verificar integridade no banco: token plaintext NUNCA deve estar gravado
    const dbRes = await tenantQuery(
      tenantAlphaId,
      `SELECT key_hash, prefix FROM api_keys WHERE id = $1`,
      [apiKeyAlphaId]
    );
    assert.equal(dbRes.rows.length, 1);
    const expectedHash = crypto.createHash('sha256').update(apiKeyAlphaToken).digest('hex');
    assert.equal(dbRes.rows[0].key_hash, expectedHash);
    assert.notEqual(dbRes.rows[0].key_hash, apiKeyAlphaToken);
  });

  test('GET /integrations/api-keys lista as chaves do tenant sem expor hashes ou tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.apiKeys));
    assert.ok(body.apiKeys.length >= 1);

    const found = body.apiKeys.find((k: any) => k.id === apiKeyAlphaId);
    assert.ok(found);
    assert.equal(found.name, 'ERP Faturamento Alpha');
    assert.ok(found.prefix);
    assert.equal(found.token, undefined); // Token completo ausente
    assert.equal(found.key_hash, undefined); // Hash ausente
  });

  // ==============================================================================
  // 3. AUTENTICAÇÃO E CONSUMO DA API PÚBLICA V1
  // ==============================================================================

  test('GET /v1/work-orders com X-API-Key válido responde HTTP 200 com headers de Rate Limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyAlphaToken },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-ratelimit-limit'], '60');
    assert.ok(Number(res.headers['x-ratelimit-remaining']) <= 60);
    assert.ok(res.headers['x-ratelimit-reset']);

    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.workOrders));
    assert.ok(body.workOrders.length >= 1);
    assert.equal(body.workOrders[0].osNumber, 101);
  });

  test('GET /v1/work-orders com Authorization: Bearer carx_live_... também funciona perfeitamente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { authorization: `Bearer ${apiKeyAlphaToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.workOrders.length >= 1);
  });

  test('Chamada sem chave de API retorna HTTP 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'AUTHENTICATION_REQUIRED');
  });

  test('Chamada com chave inexistente ou adulterada retorna HTTP 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': 'carx_live_000000000000000000000000000000000000000000000000' },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'INVALID_API_KEY');
  });

  // ==============================================================================
  // 4. CRITÉRIO OBRIGATÓRIO: REVOGAÇÃO IMEDIATA DA CHAVE
  // ==============================================================================

  test('Critério Fundamental: Chave revogada para de funcionar na hora', async () => {
    // 1. Gerar uma chave temporária
    const genRes = await app.inject({
      method: 'POST',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Chave Efêmera',
        permissions: ['read:work_orders'],
      },
    });
    assert.equal(genRes.statusCode, 201);
    const { apiKey, token: tempToken } = JSON.parse(genRes.payload);

    // 2. Comprovar que funciona antes da revogação
    const beforeRes = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': tempToken },
    });
    assert.equal(beforeRes.statusCode, 200);

    // 3. Revogar imediatamente
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/integrations/api-keys/${apiKey.id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });
    assert.equal(delRes.statusCode, 200);

    // 4. Testar no mesmo instante: deve ser bloqueada com HTTP 401
    const afterRes = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': tempToken },
    });
    assert.equal(afterRes.statusCode, 401);
    const afterBody = JSON.parse(afterRes.payload);
    assert.equal(afterBody.error, 'INVALID_API_KEY');
    assert.ok(afterBody.message.includes('revogada'));
  });

  // ==============================================================================
  // 5. VALIDAÇÃO DE ESCOPOS GRANULARES
  // ==============================================================================

  test('Chave com escopo restrito é bloqueada com HTTP 403 em endpoints que exigem outras permissões', async () => {
    // Criar chave apenas com read:customers
    const genRes = await app.inject({
      method: 'POST',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Chave Somente Clientes',
        permissions: ['read:customers'],
      },
    });
    const { token: readCustToken } = JSON.parse(genRes.payload);
    apiKeyReadOnlyToken = readCustToken;

    // 1. Acesso a /v1/customers deve funcionar
    const custRes = await app.inject({
      method: 'GET',
      url: '/v1/customers',
      headers: { 'x-api-key': apiKeyReadOnlyToken },
    });
    assert.equal(custRes.statusCode, 200);

    // 2. Acesso a /v1/work-orders (exige read:work_orders) deve ser bloqueado com 403
    const woRes = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyReadOnlyToken },
    });
    assert.equal(woRes.statusCode, 403);
    const woBody = JSON.parse(woRes.payload);
    assert.equal(woBody.error, 'INSUFFICIENT_PERMISSIONS');

    // 3. Tentativa de criar OS em /v1/work-orders (exige write:work_orders) deve ser bloqueada com 403
    const postWoRes = await app.inject({
      method: 'POST',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyReadOnlyToken },
      payload: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
      },
    });
    assert.equal(postWoRes.statusCode, 403);
  });

  test('POST /v1/work-orders com escopo write:work_orders cria OS externa com sucesso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyAlphaToken },
      payload: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        notes: 'OS originada via API externa de ERP',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.ok(body.id);
    assert.equal(body.status, 'DRAFT');
    assert.ok(body.osNumber > 100);
    assert.equal(body.customer.name, 'Rodrigo Fernandes');
    assert.equal(body.vehicle.plate, 'ALP-1010');
  });

  // ==============================================================================
  // 6. RATE LIMITING EM MEMÓRIA
  // ==============================================================================

  test('Rate limit por chave bloqueia excesso com HTTP 429 e headers corretos', async () => {
    // Criar chave com limite de 2 req/min
    const genRes = await app.inject({
      method: 'POST',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'Chave Rate Limit Test',
        permissions: ['read:work_orders'],
        rateLimitPerMinute: 2,
      },
    });
    const { token: rlToken } = JSON.parse(genRes.payload);
    apiKeyRateLimitedToken = rlToken;

    // Requisição 1: Sucesso (Remaining = 1)
    const req1 = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyRateLimitedToken },
    });
    assert.equal(req1.statusCode, 200);
    assert.equal(req1.headers['x-ratelimit-remaining'], '1');

    // Requisição 2: Sucesso (Remaining = 0)
    const req2 = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyRateLimitedToken },
    });
    assert.equal(req2.statusCode, 200);
    assert.equal(req2.headers['x-ratelimit-remaining'], '0');

    // Requisição 3: Bloqueado com HTTP 429
    const req3 = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyRateLimitedToken },
    });
    assert.equal(req3.statusCode, 429);
    assert.equal(req3.headers['x-ratelimit-remaining'], '0');
    const r3Body = JSON.parse(req3.payload);
    assert.equal(r3Body.error, 'RATE_LIMIT_EXCEEDED');
    assert.ok(r3Body.resetInSeconds > 0);
  });

  // ==============================================================================
  // 7. GESTÃO E DISPARO DE WEBHOOKS COM ASSINATURA HMAC-SHA256
  // ==============================================================================

  test('POST /integrations/webhooks cadastra endpoint com segredo HMAC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/integrations/webhooks',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
      payload: {
        name: 'CRM Webhook Test',
        url: `http://127.0.0.1:${mockServerPort}/webhook`,
        events: ['work_order.created', 'work_order.ready', 'ping'],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.ok(body.webhook.id);
    assert.equal(body.webhook.name, 'CRM Webhook Test');
    assert.ok(body.webhook.secret.startsWith('whsec_'));

    webhookAlphaId = body.webhook.id;
    webhookAlphaSecret = body.webhook.secret;
  });

  test('POST /integrations/webhooks/:id/test dispara webhook com assinatura HMAC X-CarX-Signature válida', async () => {
    mockServerResponseStatus = 200;

    const res = await app.inject({
      method: 'POST',
      url: `/integrations/webhooks/${webhookAlphaId}/test`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.delivery);
    assert.equal(body.delivery.status, 'success');
    assert.equal(body.delivery.statusCode, 200);

    // Validar headers recebidos no servidor mock receptor
    assert.ok(receivedWebhookHeaders['x-carx-signature']);
    assert.ok(receivedWebhookHeaders['x-carx-signature'].startsWith('sha256='));
    assert.equal(receivedWebhookHeaders['x-carx-event'], 'ping');

    // Validação matemática do HMAC: recalcular e conferir
    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', webhookAlphaSecret)
        .update(JSON.stringify(receivedWebhookBody))
        .digest('hex');

    assert.equal(receivedWebhookHeaders['x-carx-signature'], expectedSignature);
  });

  // ==============================================================================
  // 8. CRITÉRIO OBRIGATÓRIO: WEBHOOK FALHO É REENVIADO E APARECE NO LOG
  // ==============================================================================

  test('Critério Fundamental: Webhook falho é agendado com retentativa (backoff) e aparece no histórico', async () => {
    // Configurar o servidor receptor mock para responder HTTP 500
    mockServerResponseStatus = 500;

    const res = await app.inject({
      method: 'POST',
      url: `/integrations/webhooks/${webhookAlphaId}/test`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.delivery);
    assert.equal(body.delivery.status, 'retrying');
    assert.equal(body.delivery.statusCode, 500);
    assert.ok(body.delivery.nextRetryAt);

    const failedDeliveryId = body.delivery.id;

    // 1. Validar que aparece no log/histórico de entregas
    const listRes = await app.inject({
      method: 'GET',
      url: `/integrations/webhooks/${webhookAlphaId}/deliveries`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const listBody = JSON.parse(listRes.payload);
    assert.ok(Array.isArray(listBody.deliveries));
    const foundLog = listBody.deliveries.find((d: any) => d.id === failedDeliveryId);
    assert.ok(foundLog);
    assert.equal(foundLog.statusCode, 500);
    assert.equal(foundLog.status, 'retrying');

    // 2. Reenvio manual: restaurar mock para HTTP 200 e acionar o retry
    mockServerResponseStatus = 200;
    const retryRes = await app.inject({
      method: 'POST',
      url: `/integrations/webhooks/deliveries/${failedDeliveryId}/retry`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(retryRes.statusCode, 200);
    const retryBody = JSON.parse(retryRes.payload);
    assert.equal(retryBody.delivery.id, failedDeliveryId);
    assert.equal(retryBody.delivery.status, 'success');
    assert.equal(retryBody.delivery.statusCode, 200);
    assert.equal(retryBody.delivery.attempts, 2); // Contador incrementado
  });

  // ==============================================================================
  // 9. ISOLAMENTO MULTI-TENANT (FAIL-CLOSED RLS)
  // ==============================================================================

  test('Chave de API de Alpha consultando /v1/work-orders recebe ZERO ordens de serviço de Beta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/work-orders',
      headers: { 'x-api-key': apiKeyAlphaToken },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    // Nenhuma OS pertencente a Beta (ex: os_number = 201) pode ser visível
    const hasBeta = body.workOrders.some((wo: any) => wo.id === woBetaId || wo.osNumber === 201);
    assert.equal(hasBeta, false);
  });

  test('Gestor de Beta tentando excluir webhook de Alpha recebe HTTP 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/integrations/webhooks/${webhookAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });

    assert.equal(res.statusCode, 404);
  });

  test('Gestor de Beta tentando revogar chave de API de Alpha recebe HTTP 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/integrations/api-keys/${apiKeyAlphaId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-slug': tenantBetaSlug,
      },
    });

    assert.equal(res.statusCode, 404);
  });

  test('Tokens do portal do cliente são bloqueados de acessar rotas de integrações', async () => {
    const customerToken = signJwt({
      sub: customerAlphaId,
      customerId: customerAlphaId,
      tenantId: tenantAlphaId,
      scope: 'customer_portal',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/integrations/api-keys',
      headers: {
        authorization: `Bearer ${customerToken}`,
        'x-tenant-slug': tenantAlphaSlug,
      },
    });

    assert.equal(res.statusCode, 403);
  });
});
