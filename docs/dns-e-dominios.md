# CarX — Arquitetura de DNS, Domínios e SSL Wildcard

Este documento especifica a estratégia de apontamentos DNS, certificados TLS automáticos e roteamento de subdomínios do ecossistema multitenant **CarX**, conforme definido na Seção 3 e Tarefa T1.3 do Documento Único de Engenharia.

---

## 🌐 1. Tabela Mestra de Apontamentos DNS

Para colocar a plataforma em operação, configure os seguintes registros na zona DNS do seu domínio principal (ex: Cloudflare, Registro.br, AWS Route 53, Hetzner DNS):

| Tipo | Nome (Host) | Alvo / Destino | TTL | Função no Ecossistema |
|---|---|---|---|---|
| **A** | `@` (raiz) | `<IP_DA_VPS>` | 300s | Landing Page institucional do CarX |
| **CNAME** | `www` | `carx.com.br.` | 300s | Redirecionamento para a raiz |
| **A** | `app` | `<IP_DA_VPS>` | 300s | Ponto de entrada central (Login e Seleção de Oficina) |
| **A** | `*` (Wildcard) | `<IP_DA_VPS>` | 300s | **Roteamento dinâmico de lojas** (`{loja}.carx.com.br`) |
| **A** | `api` | `<IP_DA_VPS>` | 300s | Backend Fastify REST / Webhooks |
| **A** | `admin` | `<IP_DA_VPS>` | 300s | Painel do Super Admin (Acesso restrito) |
| **A** | `status` | `<IP_DA_VPS>` | 300s | Monitoramento e Uptime Kuma |
| **A** | `staging` | `<IP_DA_VPS>` | 300s | Ambiente de homologação Web |
| **A** | `staging-api` | `<IP_DA_VPS>` | 300s | Backend de homologação |

> [!NOTE]
> Durante a fase de implantação e migração, mantenha o TTL em **300 segundos (5 minutos)** para permitir rápida propagação de alterações. Em regime de produção estável, pode ser aumentado para **3600 segundos (1 hora)**.

---

## 🔒 2. Como Funciona a Emissão de SSL (Caddy Reverse Proxy)

O CarX adota uma arquitetura de proxy reverso moderna baseada no **Caddy 2**, eliminando a necessidade de scripts manuais do Certbot ou recarregamentos de Nginx.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Internet / Cliente                     │
                  └──────────────────────────┬─────────────────────────────┘
                                             │ HTTPS (:443)
                                             ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                      Caddy Proxy                       │
                  │  - Terminação TLS Automática (Let's Encrypt / ZeroSSL) │
                  │  - On-Demand TLS com proteção anti-DoS                 │
                  └──────────┬───────────────────────────────┬─────────────┘
                             │                               │
        Subdomínio CarX ou   │                               │ Domínio White-Label
        *.carx.com.br        │                               │ (ex: sistema.oficina.com.br)
                             ▼                               ▼
                  ┌────────────────────┐          ┌────────────────────┐
                  │  GET /caddy-check  │          │  GET /caddy-check  │
                  │  (carx-api:3000)   │          │  (carx-api:3000)   │
                  └──────────┬─────────┘          └──────────┬─────────┘
                             │ HTTP 200                      │ HTTP 200
                             ▼                               ▼
                  ┌────────────────────────────────────────────────────────┐
                  │          Certificado Emitido e Armazenado em           │
                  │                Volume Caddy Persistente                │
                  └────────────────────────────────────────────────────────┘
```

### 2.1 Emissão de Certificados para Lojas (`*.carx.com.br`)
1. Quando uma nova oficina é cadastrada na plataforma (ex: `loja-alpha`), o subdomínio `loja-alpha.carx.com.br` passa a responder imediatamente graças ao registro DNS **Wildcard (`*`)**.
2. No primeiro acesso HTTPS, o Caddy solicita o certificado de forma transparente utilizando a diretiva `tls { on_demand }`.
3. Não há necessidade de reiniciar contêineres nem de executar comandos de manutenção no servidor.

### 2.2 Blindagem contra Ataques de Negação de Serviço TLS (`ask` endpoint)
Para evitar que atacantes apontem domínios arbitrários para o IP da VPS e esgotem os limites de emissão do Let's Encrypt, o Caddy foi configurado com a diretiva:
```caddy
on_demand_tls {
    ask http://carx-api:3000/internal/caddy-check
    interval 2m
    burst 10
}
```
- Antes de emitir qualquer certificado novo, o Caddy faz uma requisição interna para o backend.
- O endpoint valida se o domínio pertence à zona oficial ou a uma loja cadastrada. Se não for autorizado, retorna `HTTP 403` e o certificado não é emitido.

---

## 🏷️ 3. Domínios Próprios das Oficinas (White-Label)

Para oficinas que contratam o plano premium e desejam operar sob seu próprio domínio (ex: `sistema.lucasenvelopamento.com.br`):

1. **Configuração pelo Cliente na Zona DNS dele:**
   - Criar um registro do tipo `CNAME`:
     ```
     sistema.lucasenvelopamento.com.br.  IN  CNAME  app.carx.com.br.
     ```
2. **Cadastro no Painel do CarX:**
   - O gestor registra o domínio customizado no módulo de configurações da oficina.
3. **Ativação Instantânea do SSL:**
   - Ao acessar `https://sistema.lucasenvelopamento.com.br`, o Caddy consulta o endpoint `/internal/caddy-check`, confirma que o domínio está vinculado a uma loja ativa e gera o certificado SSL automaticamente em menos de 3 segundos.

---

## 🚫 4. Subdomínios Reservados do Sistema

Nenhum tenant / oficina pode cadastrar os seguintes slugs de loja, pois colidiriam com serviços centrais do ecossistema CarX (padronizados no pacote `@carx/shared`):

```typescript
export const RESERVED_SUBDOMAINS = [
  'app',
  'admin',
  'api',
  'status',
  'staging',
  'staging-api',
  'www',
  'mail',
  'smtp',
  'cdn',
  'assets',
  'static',
  'auth',
  'billing',
  'webhook',
  'webhooks',
  'root',
  'dev',
  'test',
] as const;
```

A tentativa de cadastro de qualquer um desses identificadores é bloqueada na camada de validação de schemas Zod.

---

## 📧 5. Recomendações de E-mail e Entregabilidade (Transacional)

Para garantir que recibos em PDF, orçamentos e notificações por e-mail não caiam na caixa de spam dos clientes das oficinas, configure na zona raiz:

```dns
; SPF — Autoriza os servidores de envio
@   IN  TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"

; DMARC — Política de rejeição de e-mails forjados
_dmarc.carx.com.br.  IN  TXT  "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@carx.com.br"
```

---

## 🧪 6. Como Testar Localmente (Ambiente Docker Desktop)

Para simular o roteamento de subdomínios e domínios de oficinas na sua máquina de desenvolvimento sem precisar de domínio registrado na internet:

1. Edite o arquivo de hosts do seu sistema operacional (`C:\Windows\System32\drivers\etc\hosts` no Windows ou `/etc/hosts` no Linux):
   ```text
   127.0.0.1   carx.local
   127.0.0.1   app.carx.local
   127.0.0.1   api.carx.local
   127.0.0.1   admin.carx.local
   127.0.0.1   loja-lucas.carx.local
   127.0.0.1   loja-teste.carx.local
   ```
2. Inicie os contêineres locais:
   ```bash
   docker compose -f infra/compose.dev.yml up -d
   ```
3. Teste o endpoint de validação do Caddy via terminal:
   ```bash
   curl "http://localhost:3000/internal/caddy-check?domain=loja-teste.carx.com.br"
   # Retorno esperado: {"allowed":true,"domain":"loja-teste.carx.com.br"}

   curl "http://localhost:3000/internal/caddy-check?domain=site-malicioso.com"
   # Retorno esperado: HTTP 403 {"allowed":false,"reason":"Domínio não autorizado para emissão de certificado SSL"}
   ```

