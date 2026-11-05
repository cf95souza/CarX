import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';

let isSentryInitialized = false;

/**
 * Inicializa a integração com Sentry / GlitchTip se SENTRY_DSN for informado.
 * GlitchTip é 100% compatível com a SDK oficial do Sentry.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || 'carx-api@0.1.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      // Garantir remoção de senhas e tokens de eventos enviados ao GlitchTip/Sentry
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  isSentryInitialized = true;
  return true;
}

/**
 * Registra o handler de erros global para captura de exceções pelo Sentry / GlitchTip
 */
export function registerSentryErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Log estruturado local em JSON
    request.log.error(error);

    // Se Sentry/GlitchTip estiver ativo e for erro 5xx (erro de servidor)
    const statusCode = error.statusCode || 500;
    if (isSentryInitialized && statusCode >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('request_id', request.id);
        scope.setTag('url', request.url);
        scope.setTag('method', request.method);
        if (request.headers['x-tenant-host']) {
          scope.setTag('tenant_host', String(request.headers['x-tenant-host']));
        }
        scope.setExtra('query', request.query);
        scope.setExtra('params', request.params);

        Sentry.captureException(error);
      });
    }

    // Resposta amigável e segura (sem vazar stack trace em produção)
    const isProd = process.env.NODE_ENV === 'production';
    const message = statusCode >= 500 && isProd
      ? 'Erro interno do servidor. A equipe de suporte já foi notificada.'
      : error.message;

    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message,
      requestId: request.id,
    });
  });
}

