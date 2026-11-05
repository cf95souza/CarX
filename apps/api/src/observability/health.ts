import net from 'node:net';
import { FastifyInstance } from 'fastify';

interface DependencyStatus {
  status: 'healthy' | 'unhealthy' | 'skipped';
  latencyMs?: number;
  error?: string;
}

/**
 * Checa conectividade TCP com timeout estrito
 */
function checkTcpConnection(host: string, port: number, timeoutMs = 1500): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      const latencyMs = Date.now() - start;
      cleanup();
      resolve({ healthy: true, latencyMs });
    });

    socket.once('timeout', () => {
      cleanup();
      resolve({ healthy: false, latencyMs: timeoutMs, error: 'Connection timed out' });
    });

    socket.once('error', (err) => {
      const latencyMs = Date.now() - start;
      cleanup();
      resolve({ healthy: false, latencyMs, error: err.message });
    });

    socket.connect(port, host);
  });
}

function parseHostPort(connectionString: string | undefined, defaultHost: string, defaultPort: number): { host: string; port: number } {
  if (!connectionString) {
    return { host: defaultHost, port: defaultPort };
  }

  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || defaultHost,
      port: Number(url.port) || defaultPort,
    };
  } catch {
    // Caso não seja URL formal (ex: "localhost:5432")
    const parts = connectionString.split(':');
    return {
      host: parts[0] || defaultHost,
      port: Number(parts[1]) || defaultPort,
    };
  }
}

/**
 * Registra os endpoints de monitoramento de saúde do CarX
 */
export function registerHealthRoutes(app: FastifyInstance) {
  /**
   * 1. Liveness Probe (/health)
   * Usado por Kubernetes/Docker/Caddy para verificar se o processo está vivo.
   * Resposta instantânea sem dependências de rede.
   */
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'carx-api',
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * 2. Readiness Probe (/health/ready)
   * Usado pelo Uptime Kuma para verificar se a API está pronta para atender requisições,
   * auditando as conexões vitais com PostgreSQL, Redis e MinIO.
   */
  app.get('/health/ready', async (request, reply) => {
    const checks: Record<string, DependencyStatus> = {};
    let isAllHealthy = true;

    // A. Checagem do Banco PostgreSQL
    if (process.env.DATABASE_URL) {
      const { host, port } = parseHostPort(process.env.DATABASE_URL, 'carx-db', 5432);
      const res = await checkTcpConnection(host, port);
      checks.database = {
        status: res.healthy ? 'healthy' : 'unhealthy',
        latencyMs: res.latencyMs,
        error: res.error,
      };
      if (!res.healthy) isAllHealthy = false;
    } else {
      checks.database = { status: 'skipped' };
    }

    // B. Checagem do Redis
    if (process.env.REDIS_URL) {
      const { host, port } = parseHostPort(process.env.REDIS_URL, 'redis', 6379);
      const res = await checkTcpConnection(host, port);
      checks.redis = {
        status: res.healthy ? 'healthy' : 'unhealthy',
        latencyMs: res.latencyMs,
        error: res.error,
      };
      if (!res.healthy) isAllHealthy = false;
    } else {
      checks.redis = { status: 'skipped' };
    }

    // C. Checagem do MinIO (S3 Local)
    const minioHost = process.env.MINIO_ENDPOINT || 'minio';
    const minioPort = Number(process.env.MINIO_PORT) || 9000;
    const minioRes = await checkTcpConnection(minioHost, minioPort);
    checks.storage = {
      status: minioRes.healthy ? 'healthy' : 'unhealthy',
      latencyMs: minioRes.latencyMs,
      error: minioRes.error,
    };
    if (!minioRes.healthy) {
      // Storage não saudável degrada a prontidão
      isAllHealthy = false;
    }

    const httpCode = isAllHealthy ? 200 : 503;
    return reply.code(httpCode).send({
      status: isAllHealthy ? 'ready' : 'degraded',
      service: 'carx-api',
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}

