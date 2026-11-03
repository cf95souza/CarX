import Fastify from 'fastify';
import cors from '@fastify/cors';

export function buildServer() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'carx-api',
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const PORT = Number(process.env.PORT) || 3333;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`CarX API running on ${address}`);
  });
}

