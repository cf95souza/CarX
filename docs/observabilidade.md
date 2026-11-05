# Observabilidade e Monitoramento — CarX

Este documento detalha os pilares de **observabilidade, telemetria, rastreamento de erros e monitoramento de disponibilidade** do **CarX**, projetados para alta confiabilidade e resolução rápida de incidentes com SLA rigoroso (alerta em $\le$ 2 minutos).

---

## 1. Visão Geral da Arquitetura

O sistema de observabilidade do CarX é composto por 4 camadas integradas:

```
┌──────────────────────────────────────────────────────────────────┐
│                   Borda & Proxy Reverso (Caddy)                 │
│              status.carx.com.br -> Uptime Kuma                   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          ▼                       ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Uptime Kuma    │    │   Logs em JSON   │    │ GlitchTip/Sentry │
│ Monitores HTTP/  │    │  (Pino/Fastify)  │    │ Rastreamento de  │
│ TCP + StatusPage │    │  X-Request-ID    │    │   Exceções 5xx   │
└─────────┬────────┘    └─────────┬────────┘    └─────────┬────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
                   ┌─────────────────────────────┐
                   │  API Fastify (@carx/api)    │
                   │  • /health (Liveness)       │
                   │  • /health/ready (Readiness)│
                   │  • /metrics (Prometheus)    │
                   └─────────────────────────────┘
```

---

## 2. Endpoints e Probes de Saúde

A API Fastify disponibiliza três rotas essenciais para automação e sondagem:

### 2.1 Liveness Probe (`GET /health`)
- **Propósito:** Informa se o processo Node.js está vivo e recebendo conexões.
- **Uso:** Utilizado por orquestradores (Docker Compose healthchecks, Caddy, Kubernetes).
- **Tempo de resposta:** $< 2$ ms (não executa consultas a bancos externos).
- **Resposta padrão:**
  ```json
  {
    "status": "ok",
    "service": "carx-api",
    "timestamp": "2026-11-05T13:09:56.224Z"
  }
  ```

### 2.2 Readiness Probe (`GET /health/ready`)
- **Propósito:** Audita a conectividade real com os serviços dos quais a API depende para operar:
  - **PostgreSQL (`DATABASE_URL`):** Checagem de socket TCP na porta 5432.
  - **Redis (`REDIS_URL`):** Checagem de socket TCP na porta 6379.
  - **MinIO Storage (`MINIO_ENDPOINT`):** Checagem de socket TCP na porta 9000.
- **Códigos HTTP de retorno:**
  - `HTTP 200 (Ready)`: Todos os componentes vitais saudáveis.
  - `HTTP 503 (Degraded)`: Alguma dependência falhou ou sofreu timeout (> 1500ms).
- **Resposta estruturada:**
  ```json
  {
    "status": "ready",
    "service": "carx-api",
    "timestamp": "2026-11-05T13:11:28.008Z",
    "checks": {
      "database": { "status": "healthy", "latencyMs": 6 },
      "redis": { "status": "healthy", "latencyMs": 1 },
      "storage": { "status": "healthy", "latencyMs": 1 }
    }
  }
  ```

### 2.3 Métricas Prometheus (`GET /metrics`)
- **Propósito:** Exposição contínua de telemetria no padrão OpenMetrics (Prometheus) ou JSON.
- **Métricas expostas:**
  - `carx_api_uptime_seconds`: Tempo contínuo de atividade da aplicação.
  - `carx_api_memory_bytes`: Uso de memória do processo Node.js (`rss`, `heap_total`, `heap_used`, `external`).
  - `carx_api_requests_total`: Total de requisições processadas.
  - `carx_api_requests_by_status`: Contador de requisições agrupadas por código HTTP (200, 400, 403, 500).
  - `carx_api_errors_total`: Contagem total de erros 5xx.
  - `carx_api_latency_ms_avg`: Latência média de processamento em milissegundos.
- **Suporte JSON:** Adicionar `?format=json` ou cabeçalho `Accept: application/json`.

---

## 3. Logs Estruturados em JSON (Pino)

Todos os logs emitidos pela API são estritamente formatados em JSON (1 linha por log), facilitando ingestão e busca por agentes como Vector, Promtail ou Datadog:

### 3.1 Exemplo de Linha de Log
```json
{
  "level": 30,
  "time": "2026-11-05T13:05:09.866Z",
  "service": "carx-api",
  "env": "production",
  "reqId": "4b441b50-3564-4314-a43a-cc4d6193ca27",
  "req": {
    "id": "4b441b50-3564-4314-a43a-cc4d6193ca27",
    "method": "POST",
    "url": "/api/v1/quotes",
    "headers": {
      "host": "app.carx.com.br",
      "x-request-id": "4b441b50-3564-4314-a43a-cc4d6193ca27",
      "x-tenant-host": "lucasppf.carx.com.br"
    },
    "remoteAddress": "187.50.21.14"
  },
  "res": { "statusCode": 201 },
  "responseTime": 14.2,
  "msg": "request completed"
}
```

### 3.2 Redação Compulsória de Dados Sensíveis (LGPD e Segurança)
Para impedir vazamento inadvertido de dados em logs ou ferramentas terceiras, os seguintes campos são mascarados automaticamente com `[REDACTED]`:
- `headers.authorization`
- `headers.cookie`
- `password` e `senha`
- `token` e `refreshToken`
- `credit_card`, `cartao` e `cvv`
- `cpf`, `rg`, `chave_pix` e `pin`

---

## 4. Rastreamento de Exceções (GlitchTip / Sentry)

A aplicação integra-se de forma nativa com **GlitchTip** (alternativa open-source self-hosted) ou **Sentry**:

- **Ativação:** Basta preencher a variável `SENTRY_DSN` no `.env`. Em ambiente local, se omitida, o sistema opera sem sobrecarga nem erros.
- **Enriquecimento de Contexto:** Erros 5xx são enviados automaticamente com:
  - `request_id`: ID único da requisição para rastrear no arquivo de log.
  - `tenant_host`: Subdomínio ou domínio customizado da oficina originária.
  - `url` e `method`: Rota afetada.
- **Respostas Fail-Closed:** Em ambiente de produção (`NODE_ENV=production`), nenhuma stack trace interna ou mensagem de banco vaza para o cliente externo — o cliente recebe mensagem padronizada e o código `requestId` para suporte.

---

## 5. Uptime Kuma e Página de Status

O serviço `uptime` (`louislam/uptime-kuma:1-alpine`) é provisionado via Docker Compose e servido em `https://status.carx.com.br`.

### 5.1 Monitores Recomendados

| Nome do Monitor | Tipo | Alvo / Configuração | Intervalo | Alerta Se |
|---|---|---|---|---|
| **API Liveness** | HTTP(s) | `http://carx-api:3000/health` | 20s | Código $\ne 200$ por 2 checks |
| **API Readiness** | HTTP(s) | `http://carx-api:3000/health/ready` | 30s | Código $\ne 200$ por 2 checks |
| **PostgreSQL DB** | TCP Port | `carx-db:5432` | 20s | Falha de conexão TCP |
| **Redis Cache** | TCP Port | `redis:6379` | 30s | Falha de conexão TCP |
| **WhatsApp Gateway** | HTTP(s) | `http://carx-wa:8080/health` | 30s | Falha por 3 checks |
| **Web Frontend** | HTTP(s) | `http://carx-web:80/` | 30s | Código $\ne 200$ |

### 5.2 Canais de Alerta (Notificação Imediata)
No painel do Uptime Kuma (`Settings > Notifications`), configurar:
1. **Discord / Slack Webhook**: Notificações em canal `#ops-alerts`.
2. **Telegram Bot**: Alertas push para o administrador do sistema.
3. **E-mail SMTP**: Para avisos formais de indisponibilidade.

---

## 6. Scripts de Teste e Validação de Alertas

Para validar a meta de **detecção de indisponibilidade em menos de 2 minutos**, foram desenvolvidos scripts automatizados de simulação de falhas:

### No Linux / Servidor VPS:
```bash
# Executa simulação derrubando o container, medindo o tempo e recuperando o serviço
bash infra/scripts/test-alert.sh
```

### No Windows / Ambiente Dev:
```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/test-alert.ps1
```

**Resultado Médio da Validação:**
- Detecção de indisponibilidade: **$< 2$ segundos** (requisito: $\le 120$ segundos).
- Restabelecimento do serviço: **$< 2$ segundos**.
- Código de saída do script: `0 (Sucesso)`.
