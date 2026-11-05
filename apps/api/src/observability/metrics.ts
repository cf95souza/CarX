import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface MetricsData {
  requestsTotal: number;
  statusCodes: Record<string, number>;
  totalResponseTimeMs: number;
  errorsTotal: number;
}

const metrics: MetricsData = {
  requestsTotal: 0,
  statusCodes: {},
  totalResponseTimeMs: 0,
  errorsTotal: 0,
};

const startTime = Date.now();

/**
 * Hook para contabilizar requisições e latência da API
 */
export function registerMetricsHooks(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as unknown as { startTime: number }).startTime = Date.now();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Ignorar requisições ao próprio endpoint de métricas e healthchecks no contador geral
    if (request.url.startsWith('/metrics') || request.url.startsWith('/health')) {
      return;
    }

    const duration = Date.now() - ((request as unknown as { startTime: number }).startTime || Date.now());
    metrics.requestsTotal += 1;
    metrics.totalResponseTimeMs += duration;

    const code = String(reply.statusCode);
    metrics.statusCodes[code] = (metrics.statusCodes[code] || 0) + 1;

    if (reply.statusCode >= 500) {
      metrics.errorsTotal += 1;
    }
  });
}

/**
 * Formata as métricas coletadas no padrão oficial do Prometheus (OpenMetrics)
 */
export function getPrometheusMetrics(): string {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgLatencyMs = metrics.requestsTotal > 0
    ? (metrics.totalResponseTimeMs / metrics.requestsTotal).toFixed(2)
    : '0.00';

  let output = '';

  // Metadados do Serviço
  output += '# HELP carx_api_uptime_seconds Tempo de atividade da API em segundos\n';
  output += '# TYPE carx_api_uptime_seconds gauge\n';
  output += `carx_api_uptime_seconds ${uptimeSeconds}\n\n`;

  // Uso de Memória
  output += '# HELP carx_api_memory_bytes Uso de memória do processo Node.js em bytes\n';
  output += '# TYPE carx_api_memory_bytes gauge\n';
  output += `carx_api_memory_bytes{type="rss"} ${mem.rss}\n`;
  output += `carx_api_memory_bytes{type="heap_total"} ${mem.heapTotal}\n`;
  output += `carx_api_memory_bytes{type="heap_used"} ${mem.heapUsed}\n`;
  output += `carx_api_memory_bytes{type="external"} ${mem.external}\n\n`;

  // Total de Requisições
  output += '# HELP carx_api_requests_total Total de requisições HTTP processadas\n';
  output += '# TYPE carx_api_requests_total counter\n';
  output += `carx_api_requests_total ${metrics.requestsTotal}\n\n`;

  // Requisições por Código HTTP
  output += '# HELP carx_api_requests_by_status Total de requisições agrupadas por status code\n';
  output += '# TYPE carx_api_requests_by_status counter\n';
  for (const [code, count] of Object.entries(metrics.statusCodes)) {
    output += `carx_api_requests_by_status{status="${code}"} ${count}\n`;
  }
  output += '\n';

  // Total de Erros 5xx
  output += '# HELP carx_api_errors_total Total de erros internos 5xx\n';
  output += '# TYPE carx_api_errors_total counter\n';
  output += `carx_api_errors_total ${metrics.errorsTotal}\n\n`;

  // Latência Média
  output += '# HELP carx_api_latency_ms_avg Latência média de resposta em milissegundos\n';
  output += '# TYPE carx_api_latency_ms_avg gauge\n';
  output += `carx_api_latency_ms_avg ${avgLatencyMs}\n`;

  return output;
}

/**
 * Retorna as métricas em formato JSON estruturado
 */
export function getJsonMetrics() {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgLatencyMs = metrics.requestsTotal > 0
    ? Number((metrics.totalResponseTimeMs / metrics.requestsTotal).toFixed(2))
    : 0;

  return {
    service: 'carx-api',
    uptimeSeconds,
    memory: {
      rssBytes: mem.rss,
      heapTotalBytes: mem.heapTotal,
      heapUsedBytes: mem.heapUsed,
      externalBytes: mem.external,
    },
    http: {
      requestsTotal: metrics.requestsTotal,
      statusCodes: metrics.statusCodes,
      errorsTotal: metrics.errorsTotal,
      avgLatencyMs,
    },
    timestamp: new Date().toISOString(),
  };
}

