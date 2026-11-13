import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { buildServer } from '../../apps/api/src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StageConfig {
  name: string;
  vus: number;
  durationSeconds: number;
}

interface BenchmarkResult {
  stage: string;
  vus: number;
  durationSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRatePercent: number;
  rps: number;
  latenciesMs: {
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    avg: number;
  };
}

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3333';
const parsedUrl = new URL(BASE_URL);

// Pool HTTP nativo com Keep-Alive suportando até 150 conexões simultâneas (T7.3: 100 VUs)
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 150,
});

function makeRequest(reqPath: string): Promise<{ statusCode: number; durationMs: number; ok: boolean }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.request(
      {
        host: parsedUrl.hostname,
        port: parsedUrl.port || 3333,
        path: reqPath,
        method: 'GET',
        agent,
        timeout: 5000,
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          const durationMs = performance.now() - start;
          const status = res.statusCode || 500;
          resolve({ statusCode: status, durationMs, ok: status < 500 });
        });
      }
    );

    req.on('error', () => {
      const durationMs = performance.now() - start;
      resolve({ statusCode: 0, durationMs, ok: false });
    });

    req.on('timeout', () => {
      req.destroy();
      const durationMs = performance.now() - start;
      resolve({ statusCode: 504, durationMs, ok: false });
    });

    req.end();
  });
}

async function runStage(config: StageConfig): Promise<BenchmarkResult> {
  console.log(`\n▶ Iniciando Degrau [${config.name}]: ${config.vus} VUs por ${config.durationSeconds}s...`);
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  const deadline = Date.now() + config.durationSeconds * 1000;

  // Rotas idempotentes exercitando Saúde, Passaporte Digital, Rastreamento de OS/TV e Mini-Site
  const endpoints = [
    '/health',
    '/public/passports/00000000-0000-0000-0000-000000000000',
    '/work-orders/tracking/00000000-0000-0000-0000-000000000000',
    '/public/tenant/oficina-benchmark/site',
  ];

  async function worker() {
    while (Date.now() < deadline) {
      const p = endpoints[Math.floor(Math.random() * endpoints.length)];
      try {
        const res = await makeRequest(p);
        latencies.push(res.durationMs);
        if (res.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      // Pausa realista de 25ms entre interações por conexão simultânea
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  const workers = Array.from({ length: config.vus }, () => worker());
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  const min = total > 0 ? latencies[0] : 0;
  const max = total > 0 ? latencies[total - 1] : 0;
  const avg = total > 0 ? latencies.reduce((acc, curr) => acc + curr, 0) / total : 0;
  const p50 = total > 0 ? latencies[Math.floor(total * 0.5)] : 0;
  const p90 = total > 0 ? latencies[Math.floor(total * 0.9)] : 0;
  const p95 = total > 0 ? latencies[Math.floor(total * 0.95)] : 0;
  const p99 = total > 0 ? latencies[Math.floor(total * 0.99)] : 0;

  const totalReqs = successful + failed;
  const rps = totalReqs / config.durationSeconds;
  const errorRatePercent = totalReqs > 0 ? (failed / totalReqs) * 100 : 0;

  return {
    stage: config.name,
    vus: config.vus,
    durationSeconds: config.durationSeconds,
    totalRequests: totalReqs,
    successfulRequests: successful,
    failedRequests: failed,
    errorRatePercent,
    rps,
    latenciesMs: {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      avg: Number(avg.toFixed(2)),
      p50: Number(p50.toFixed(2)),
      p90: Number(p90.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      p99: Number(p99.toFixed(2)),
    },
  };
}

async function main() {
  console.log(`================================================================`);
  console.log(`CarX System Quality Gate (T7.3) — Carga Progressiva até 100 VUs`);
  console.log(`Alvo: ${BASE_URL}`);
  console.log(`================================================================`);

  let internalApp: any = null;
  const probe = await makeRequest('/health');
  if (probe.ok && probe.statusCode === 200) {
    console.log(`Servidor já detectado online (HTTP ${probe.statusCode}).`);
  } else {
    console.log(`Iniciando instância Fastify local para benchmark...`);
    process.env.NODE_ENV = 'test'; // Desativa log verboso por request durante benchmark de alta carga
    internalApp = buildServer();
    await internalApp.listen({ port: 3333, host: '127.0.0.1' });
    console.log(`Fastify iniciado com sucesso em 127.0.0.1:3333`);
  }

  // Degraus estritos conforme especificação da skill e T7.3: 1 -> 5 -> 10 -> 25 -> 50 -> 100 VUs
  const stages: StageConfig[] = [
    { name: '1. Smoke / Warmup', vus: 1, durationSeconds: 4 },
    { name: '2. Degrau Leve', vus: 5, durationSeconds: 6 },
    { name: '3. Degrau Moderado', vus: 10, durationSeconds: 6 },
    { name: '4. Degrau Médio', vus: 25, durationSeconds: 8 },
    { name: '5. Degrau Alto', vus: 50, durationSeconds: 8 },
    { name: '6. Pico T7.3 (100 Conexões Simultâneas)', vus: 100, durationSeconds: 10 },
  ];

  const results: BenchmarkResult[] = [];

  try {
    for (const stage of stages) {
      const res = await runStage(stage);
      results.push(res);
      console.log(`   ✔ Total de Requisições: ${res.totalRequests} (${res.rps.toFixed(1)} req/s)`);
      console.log(`   ✔ Taxa de Erro: ${res.errorRatePercent.toFixed(2)}% (Falhas: ${res.failedRequests})`);
      console.log(`   ✔ Latência: p50=${res.latenciesMs.p50}ms | p90=${res.latenciesMs.p90}ms | p95=${res.latenciesMs.p95}ms | p99=${res.latenciesMs.p99}ms | max=${res.latenciesMs.max}ms`);

      // Proteção de parada mandatória da skill: parar se erro > 1% ou p95 > 2000ms
      if (res.errorRatePercent > 1.0) {
        console.error(`🚨 LIMIAR DE ERRO EXCEDIDO (> 1%). Interrompendo execução por segurança.`);
        break;
      }
      if (res.latenciesMs.p95 > 2000) {
        console.error(`🚨 LIMIAR DE LATÊNCIA EXCEDIDO (p95 > 2000ms). Interrompendo execução por segurança.`);
        break;
      }

      // Intervalo de estabilização entre degraus
      await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    if (internalApp) {
      console.log(`Finalizando Fastify local...`);
      await internalApp.close();
    }
  }

  const jsonOutput = JSON.stringify(results, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const evidenceDir = path.resolve(__dirname, '..', 'evidence');
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, `benchmark-${timestamp}.json`);
  const latestPath = path.join(evidenceDir, `benchmark-latest-100vus.json`);
  await fs.writeFile(evidencePath, jsonOutput, 'utf8');
  await fs.writeFile(latestPath, jsonOutput, 'utf8');
  console.log(`\n💾 Evidência bruta salva em: ${evidencePath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro na execução do benchmark:', err);
  process.exit(1);
});
