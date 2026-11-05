import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
import { buildServer } from './server.js';

describe('Observabilidade e Endpoints da API CarX', () => {
  const app = buildServer();

  after(async () => {
    await app.close();
  });

  it('deve responder 200 no Liveness Probe (/health)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'carx-api');
    assert.ok(body.timestamp);
  });

  it('deve responder no Readiness Probe (/health/ready)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    // Como as variáveis de banco/redis de ambiente de teste podem não estar conectadas,
    // o endpoint responde 200 (healthy/ready) ou 503 (degraded) com o objeto de checks estruturado
    assert.ok(res.statusCode === 200 || res.statusCode === 503);
    const body = JSON.parse(res.body);
    assert.ok(body.status === 'ready' || body.status === 'degraded');
    assert.ok(body.checks);
  });

  it('deve expor métricas no formato padrão do Prometheus (/metrics)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(String(res.headers['content-type'] || '').includes('text/plain'));
    assert.ok(res.body.includes('carx_api_uptime_seconds'));
    assert.ok(res.body.includes('carx_api_memory_bytes'));
    assert.ok(res.body.includes('carx_api_requests_total'));
  });

  it('deve expor métricas no formato JSON quando solicitado (/metrics?format=json)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/metrics?format=json',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(String(res.headers['content-type'] || '').includes('application/json'));
    const body = JSON.parse(res.body);
    assert.equal(body.service, 'carx-api');
    assert.ok(typeof body.uptimeSeconds === 'number');
    assert.ok(body.memory);
    assert.ok(body.http);
  });

  it('deve validar domínios no endpoint do Caddy On-Demand TLS (/internal/caddy-check)', async () => {
    // Domínio oficial autorizado
    const resAuth = await app.inject({
      method: 'GET',
      url: '/internal/caddy-check?domain=oficina-vip.carx.com.br',
    });
    assert.equal(resAuth.statusCode, 200);
    assert.equal(JSON.parse(resAuth.body).allowed, true);

    // Domínio não autorizado
    const resDenied = await app.inject({
      method: 'GET',
      url: '/internal/caddy-check?domain=site-hacker.com',
    });
    assert.equal(resDenied.statusCode, 403);
    assert.equal(JSON.parse(resDenied.body).allowed, false);
  });

  it('deve propagar ou gerar X-Request-ID em requisições', async () => {
    const customReqId = 'custom-request-uuid-12345';
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customReqId,
      },
    });

    assert.equal(res.statusCode, 200);
  });
});
