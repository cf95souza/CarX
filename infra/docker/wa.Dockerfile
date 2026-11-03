# ==============================================================================
# CarX — Dockerfile do Gateway de WhatsApp (carx-wa)
# ==============================================================================

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV WA_SESSION_DIR=/data/sessions

RUN apk add --no-cache curl wget dumb-init

# Criar diretório de sessões persistentes
RUN mkdir -p /data/sessions && chown -R node:node /data

USER node

EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
# Placeholder seguro para execução do daemon de socket/baileys
CMD ["node", "-e", "const http = require('http'); const server = http.createServer((req, res) => { if (req.url === '/health') { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({ status: 'ok', service: 'carx-wa' })); } else { res.writeHead(404); res.end(); } }); server.listen(8080, '0.0.0.0', () => console.log('CarX WhatsApp Gateway escutando na porta 8080 (rede interna)'));"]

