# 🏛️ Arquitetura do Sistema — CarX

Este documento detalha a topologia de containers, a segmentação de redes Docker, os fluxos de dados e a infraestrutura do ecossistema **CarX**.

---

## 1. Visão Geral da Topologia de Containers

O CarX opera em uma arquitetura de microsserviços enxutos orquestrados via Docker Compose, divididos em **5 blocos centrais de aplicação** e **serviços de apoio**, hospedados em VPS Linux (Ubuntu Server).

```
                     [ INTERNET ]
                          │
                          ▼
            ┌──────────────────────────┐
            │   Proxy Reverso Caddy    │ (SSL Automático / Let's Encrypt / Wildcard)
            │      (Portas 80/443)     │
            └─────────────┬────────────┘
                          │
     ┌────────────────────┼────────────────────┬────────────────────┐
     ▼                    ▼                    ▼                    ▼
[carx.com.br]      [app./{loja}]        [admin.carx...]      [api.carx...]
(Landing Page)    (Gestor/PWA)        (Super Admin)             │
     │                    │                    │                ▼
     └──────────┬─────────┴────────────────────┘         ┌──────────────┐
                │                                        │   carx-api   │
                ▼                                        │  (Node.js /  │
         ┌──────────────┐                                │  TypeScript) │
         │   carx-web   │                                └──────┬───────┘
         │ (Nginx HTML) │                                       │
         └──────────────┘                    ┌──────────────────┼──────────────────┐
                                             ▼                  ▼                  ▼
                                      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                                      │ carx-worker  │   │    Redis     │   │    MinIO     │
                                      │ (Background) │   │ (Filas BullMQ│   │ (Upload S3)  │
                                      └──────────────┘   │ / RateLimit) │   └──────────────┘
                                                         └──────────────┘
                                                                │
                                       ┌────────────────────────┴────────────────────────┐
                                       ▼                                                 ▼
                                ┌──────────────┐                                  ┌──────────────┐
                                │   carx-db    │                                  │   carx-wa    │
                                │ (PostgreSQL  │                                  │  (WhatsApp   │
                                │  16 + RLS)   │                                  │   Gateway)   │
                                └──────────────┘                                  └──────────────┘
```

---

## 2. Blocos de Aplicação

| Bloco | Container | Tecnologia | Responsabilidade | Exposição Pública |
|---|---|---|---|---|
| **1** | `carx-web` | Nginx Alpine | Servir builds estáticos da Landing Page, Painel do Gestor e App do Operador (PWA) | Sim (via Proxy) |
| **2** | `carx-api` | Node.js + Fastify + TS | Regras de negócio, autenticação JWT rotativo, isolamento multitenant e módulo `/admin` | Sim (via Proxy) |
| **2.1** | `carx-worker` | Node.js + TS | Execução de tarefas em segundo plano (disparos WhatsApp, lembretes de revisão, conciliação e relatórios) | Não (Rede interna) |
| **3** | `carx-db` | PostgreSQL 16 | Banco relacional multitenant com `tenant_id` e políticas de Row Level Security (RLS) | **NÃO** (Sem porta externa) |
| **4** | `carx-wa` | Node.js / Baileys | Gateway isolado para mensageria de WhatsApp das oficinas | **NÃO** (Somente rede `wa`) |
| **5** | `carx-admin-web` | React + Vite | Painel exclusivo do Super Admin (gestão de planos, contratos de oficinas e auditoria) | Restrita (2FA / Subdomínio) |

---

## 3. Serviços de Apoio e Infraestrutura

- **Proxy Reverso (`proxy`):** Caddy com renovação automática de TLS e suporte a wildcard (`*.carx.com.br`).
- **Cache & Filas (`redis`):** Instância Redis 7 protegida por senha, alimentando as filas de background do BullMQ e rate limiting.
- **Armazenamento de Arquivos (`minio`):** Storage compatível com AWS S3 para fotos de avarias, laudos e fotos guiadas com geração de URLs pré-assinadas.
- **Monitoramento (`uptime`):** Uptime Kuma gerando página de status pública e alertas de parada.
- **Auditoria de Erros:** Integração da API e Frontends com GlitchTip / Sentry.

---

## 4. Segmentação de Redes Docker (Isolamento de Segurança)

Para garantir o princípio de menor privilégio e defesa em profundidade (*Defense in Depth*), os containers operam em 4 redes isoladas:

1. **`public`**: Conecta o `proxy` com `carx-web`, `carx-admin-web` e `carx-api`.
2. **`app`**: Conecta `carx-api`, `carx-worker`, `redis` e `minio`.
3. **`data`**: Conecta exclusivamente `carx-api` e `carx-worker` com o `carx-db`. O banco de dados **nunca** se comunica com a rede pública ou com o container de WhatsApp.
4. **`wa`**: Conecta exclusivamente `carx-api` com `carx-wa`.

---

## 5. Roteamento de Subdomínios e White Label

- `carx.com.br`: Landing page institucional e atração de novos clientes SaaS.
- `app.carx.com.br`: Ponto de entrada de login global para gestores e colaboradores.
- `{loja}.carx.com.br`: Contexto dedicado da oficina cliente. O frontend carrega logotipo, tema, catálogo e configurações personalizadas a partir do subdomínio da requisição.
- `admin.carx.com.br`: Acesso seguro ao painel do Super Admin com validação de segundo fator (2FA TOTP).
- `api.carx.com.br`: Gateway da API RESTful com autenticação por Bearer JWT e assinaturas HMAC para Webhooks.

