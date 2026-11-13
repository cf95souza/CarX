# ==============================================================================
# CarX — Dockerfile do Frontend Web / PWA (Multi-stage)
# ==============================================================================

# Estágio 1: Build Vite & PWA
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar metadados do monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copiar fontes
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

# Build de produção do Vite e do Service Worker PWA
ARG VITE_API_URL
ARG VITE_APP_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN pnpm --filter @carx/shared build && pnpm --filter @carx/web build

# Estágio 2: Nginx Alpine Otimizado
FROM nginx:alpine AS runner

# Copiar configuração customizada de segurança e SPA
COPY infra/docker/nginx-web.conf /etc/nginx/conf.d/default.conf

# Copiar build estático
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

