# ==============================================================================
# CarX — Dockerfile da API Fastify & Worker (Multi-stage)
# ==============================================================================

# Estágio 1: Build & Compilação TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar arquivos de configuração do monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# Instalar dependências completas para o build
RUN pnpm install --frozen-lockfile

# Copiar código-fonte dos pacotes e da API
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Compilação limpa TypeScript via projeto
RUN pnpm --filter @carx/shared build && pnpm --filter @carx/api build

# Estágio 2: Imagem Mínima de Produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Ferramentas para healthcheck e gerenciamento de processos
RUN apk add --no-cache curl wget dumb-init

USER node

# Copiar artefatos compilados e workspaces necessários
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/shared ./packages/shared
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/assets ./apps/api/assets

WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
