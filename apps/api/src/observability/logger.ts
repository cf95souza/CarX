import { FastifyServerOptions, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import crypto from 'node:crypto';

// Lista de chaves confidenciais para redação compulsória nos logs (LGPD e Segurança)
export const SENSITIVE_FIELDS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'headers.authorization',
  'headers.cookie',
  'password',
  'senha',
  'token',
  'refreshToken',
  'secret',
  'credit_card',
  'cartao',
  'cvv',
  'cpf',
  'rg',
  'chave_pix',
  'pin',
];

/**
 * Configuração do Logger Estruturado JSON (Pino / Fastify)
 */
export const loggerConfig: FastifyServerOptions['logger'] = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  serializers: {
    req(request: FastifyRequest) {
      return {
        id: request.id,
        method: request.method,
        url: request.url,
        path: request.routerPath,
        parameters: request.params,
        query: request.query,
        headers: {
          host: request.headers?.host,
          'user-agent': request.headers?.['user-agent'],
          'x-forwarded-for': request.headers?.['x-forwarded-for'],
          'x-request-id': request.headers?.['x-request-id'],
          'x-tenant-host': request.headers?.['x-tenant-host'],
        },
        remoteAddress: request.ip,
      };
    },
    res(reply: { statusCode: number | string }) {
      return {
        statusCode: reply.statusCode,
      };
    },
    err(error: FastifyError) {
      return {
        type: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '' : (error.stack || ''),
      };
    },
  },
  redact: {
    paths: SENSITIVE_FIELDS,
    censor: '[REDACTED]',
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    service: 'carx-api',
    env: process.env.NODE_ENV || 'development',
  },
};

/**
 * Gerador de Request ID com suporte a cabeçalho 'X-Request-ID' de entrada
 */
export function generateRequestId(req: { headers: Record<string, string | string[] | undefined> }): string {
  const existingId = req.headers['x-request-id'];
  if (typeof existingId === 'string' && existingId.length > 0) {
    return existingId;
  }
  return crypto.randomUUID();
}
