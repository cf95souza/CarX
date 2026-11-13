import http from 'k6/http';
import { check, sleep } from 'k6';

// Configurações de execução em degraus progressivos locais até 100 conexões simultâneas (T7.3):
// 1 -> 5 -> 10 -> 25 -> 50 -> 100 VUs (respeitando a progressão gradual do System Quality Gate)
export const options = {
  stages: [
    { duration: '5s', target: 1 },    // Degrau 1: Warmup / Smoke (1 VU)
    { duration: '10s', target: 5 },   // Degrau 2: Carga Leve (5 VUs)
    { duration: '10s', target: 10 },  // Degrau 3: Carga Moderada (10 VUs)
    { duration: '10s', target: 25 },  // Degrau 4: Carga Média (25 VUs)
    { duration: '10s', target: 50 },  // Degrau 5: Carga Alta (50 VUs)
    { duration: '15s', target: 100 }, // Degrau 6: Pico T7.3 (100 conexões simultâneas — OS & Monitor TV)
    { duration: '5s', target: 0 },    // Cooldown
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],                  // Menos de 1% de erros
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // p95 < 2s, p99 < 5s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3333';

export default function () {
  // 1. Health Check & Readiness
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  sleep(0.2);

  // 2. Rota Pública de Verificação de Passaporte Digital QR (Onda 2 - T6.6)
  const passportRes = http.get(`${BASE_URL}/public/passports/00000000-0000-0000-0000-000000000000`);
  check(passportRes, {
    'passport returns 404 for unknown token': (r) => r.status === 404,
  });

  sleep(0.2);

  // 3. Rota de Rastreamento em Tempo Real de OS & Telas de TV (Fase 3 / Onda 1)
  const trackingRes = http.get(`${BASE_URL}/work-orders/tracking/00000000-0000-0000-0000-000000000000`);
  check(trackingRes, {
    'tracking returns 404 for unknown token': (r) => r.status === 404,
  });

  sleep(0.2);

  // 4. Mini-Site Público da Oficina (Onda 2 - T6.9)
  const miniSiteRes = http.get(`${BASE_URL}/public/tenant/oficina-demo-load/site`);
  check(miniSiteRes, {
    'minisite returns 200 or 404 cleanly': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.4);
}
