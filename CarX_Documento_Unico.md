# CarX — Documento Único de Referência de Desenvolvimento

**Produto:** CarX (transformação do OsSystem em SaaS multitenant para o mercado automotivo)
**Base analisada:** repositório `cf95souza/OsSystem` (React 18 + Vite + Tailwind + Supabase + Vercel)
**Destino:** VPS Ubuntu Server + Docker + PostgreSQL, backend próprio (rota B)
**Versão:** 1.1 — 30/10/2026
**Esboços de telas (canvas):** https://claude.ai/artifact/5BzuJnBwngE5zpDuKM8FHX

> Método: li a documentação do repositório (fase.md, avaliações, auditoria, roadmap, schema) e o código das partes críticas (auth, hooks, portal do cliente, self-booking, comissões, API/webhooks, rotas). Não executei o sistema nem vi o banco de produção, então tudo que depende de políticas RLS reais ou de dados em produção está marcado como **"confirmar"**.

## Índice
- **Parte I — Visão, diagnóstico e estratégia**
  1. Diagnóstico do OsSystem hoje
  2. Decisão de arquitetura
  3. Infraestrutura na VPS
  4. Modelo de dados do CarX
  5. Roadmap por fases (Fases 0 a 8)
  6. Planos e preços (hipótese)
  7. Cronograma resumido
  8. Riscos e mitigação
  9. Ações imediatas no OsSystem atual
  10. Rebrand CarX e design system
  11. Ambiente Super Admin (dono do SaaS)
  12. Landing page de vendas
  13. Gateway de WhatsApp próprio
- **Parte II — Execução: tasks (Fases 0 a 3 e primeiros itens da Fase 5)** (para agentes de código)
- **Parte III — Registro de decisões** (fechadas e pendentes)

---

# PARTE I — Visão, diagnóstico e estratégia


### 1. Diagnóstico do OsSystem hoje

#### 1.1 Números
- ~20,6 mil linhas de JS/JSX, **sem TypeScript** e **sem nenhum teste automatizado**.
- 12 tabelas usadas no código, 2 funções RPC (`criar_agendamento_publico`, `registrar_pagamento_atomico`), 2 Edge Functions (`create-user`, `reset-password`).
- 49 chamadas diretas ao Supabase espalhadas por 25 arquivos: **a UI conversa direto com o banco**, sem camada de backend.
- 65 fases entregues; o produto é rico em funcionalidades. Isso é um ativo real.

#### 1.2 Pontos fortes (manter)
- Fluxo completo: orçamento, aprovação, agenda, execução, QA, entrega, garantia.
- Checklist visual de avarias, laudo (VCR), fotos antes/depois com ângulos guiados.
- Monitor TV, link de acompanhamento com QR, NPS, certificado de garantia, preço por porte, combos.
- PWA do técnico, white label (cores/logo/redes sociais).
- Esforço de segurança já feito (Fase 64: backdoor de contingência removido, RPC pública, NPS restrito).

#### 1.3 O que a documentação promete e o código ainda não entrega
Este é o ponto mais importante antes de vender como SaaS. Várias funcionalidades existem na tela, mas **não têm backend real**:

| Funcionalidade | O que o código faz hoje |
|---|---|
| API pública + Webhooks | Chaves de API e webhooks ficam no **localStorage do navegador**. Não existe servidor de API; não funciona como integração. |
| Comissões | O percentual de cada técnico é salvo no localStorage do navegador de quem configurou. |
| Checklist de QA | O histórico de aprovações vai para o localStorage (a tabela `qa_auditorias` só existe em um dos arquivos de schema). |
| Streak / ranking | O streak do técnico vem do localStorage, com valor padrão fictício. |
| NPS | Há fallback e mescla com localStorage; o "disparo em massa" é simulado. |
| Garantia ativa e lembretes | O controle de "alertas enviados" fica no localStorage; o envio é por link `wa.me` (o usuário clica e envia manualmente). Não há automação. |
| Marketplace de templates | Importa para o localStorage. Não há compartilhamento entre lojas. |
| Portal "Meu Veículo" | O login é só telefone (+ placa opcional), **sem OTP nem magic link**, apesar do que a documentação diz. Busca as OS e filtra no navegador. Se não achar nada, entra em **modo demonstração com dados fictícios**. |
| WhatsApp | Somente deep links `wa.me`. Nenhuma mensagem automática. |

Consequência: no modelo SaaS, dados em localStorage não existem para o servidor, não aparecem em outro aparelho e se perdem ao limpar o navegador. **Toda essa camada precisa ser reconstruída com persistência e backend de verdade.** A boa notícia é que a interface e as regras de negócio já estão desenhadas.

#### 1.4 Problemas estruturais para virar SaaS
1. **Banco single-tenant.** Nenhuma tabela tem `tenant_id`. Placa de veículo é `UNIQUE` global (em SaaS, duas lojas atendem o mesmo carro). A OS usa `SERIAL` global (cada loja precisa da sua própria numeração).
2. **Dados importantes em JSONB dentro da OS:** `servicos_detalhados`, `historico_pagamentos`, materiais. Isso impede relatórios confiáveis, DRE, comissões por item, auditoria e baixa de estoque rastreável.
3. **Segurança dependente de RLS escrita à mão** com `check_user_role` e políticas "públicas" para TV/portal. Os documentos de schema (`database.md` e `estrutura_db.md`) estão **fora de sincronia** entre si: não há migrations versionadas, e a fonte da verdade é "o que foi colado no SQL Editor".
4. **Regras de negócio no frontend** (cálculos, validações, transições de status, estoque). Quem usar a API direto burla tudo.
5. **Realtime = refetch.** Cada evento recarrega a lista inteira. Não escala com várias lojas.
6. **Dashboards calculados no navegador** sobre todas as OS carregadas.
7. **Status como texto livre** com inconsistência de acento (`ORCAMENTO` / `ORÇAMENTO`).
8. **Sem observabilidade:** sem logs estruturados, sem trilha de auditoria, sem monitoramento de erros.
9. **Higiene do repositório:** pastas de skills duplicadas (`_skills`, `skills`, `_1*`), arquivos de debug (`debug_config.js`, `tmp_test.cjs`), `.resolved` duplicado, `supabase/.temp/linked-project.json` versionado, branding fixo em lugares (`manifest` = "OsSystem - Auto Wrap Pro").
10. **Existem instâncias de clientes em produção** (o próprio repositório fala em "cada cliente / instância Supabase" e em remote `client`). A migração precisa preservá-las.

---

### 2. Decisão de arquitetura (a mais importante) — DECIDIDA: rota B

O requisito é PostgreSQL na VPS própria, então **o Supabase gerenciado sai**. Duas rotas:

| | **A) Supabase self-hosted** | **B) Backend próprio (recomendada)** |
|---|---|---|
| Esforço de migração | Menor: o frontend continua falando com `supabase-js` | Maior: reescrever a camada de dados |
| Containers | ~10+ (Kong, GoTrue, PostgREST, Realtime, Storage, Studio...) | 5–6 enxutos |
| Consumo de RAM | Alto | Baixo |
| Regras de negócio | Continuam no frontend ou em SQL | Centralizadas na API |
| Multitenancy / planos / cobrança | Improvisado em cima do Supabase | Nativo no desenho |
| API pública, webhooks, filas, integrações | Difícil de encaixar | Natural |
| Manutenção | Você opera a stack do Supabase inteira | Você opera só o que construiu |

**Decisão tomada: rota B.** O sistema já precisa de camada de dados nova por causa do multitenancy, e todas as funcionalidades "de mentira" da seção 1.3 exigem um backend de qualquer forma. Como você já tem um SaaS multitenant pronto (o OperaBeauty) com padrão back/front/Postgres em containers, o caminho mais curto é **reaproveitar o núcleo dele** (tenants, auth, planos, cobrança, painel Super Admin) e plugar nele o domínio automotivo do OsSystem.

#### Stack sugerida
- **Backend:** Node.js + TypeScript (Fastify ou NestJS), validação com Zod, migrations SQL versionadas.
- **Banco:** PostgreSQL 16 com `tenant_id` em todas as tabelas + **Row Level Security** como segunda barreira (a API define `SET LOCAL app.tenant_id` por requisição).
- **Frontend:** manter React + Vite + Tailwind; migrar para TypeScript gradualmente; TanStack Query no lugar dos hooks com refetch.
- **Tempo real:** SSE/WebSocket alimentado por `LISTEN/NOTIFY` ou Redis pub/sub, emitindo eventos pontuais (sem recarregar listas).
- **Arquivos:** MinIO (compatível com S3), URLs assinadas, redimensionamento de imagem no servidor, limite de tamanho por plano.
- **Jobs/filas:** BullMQ (Redis) ou pg-boss: lembretes, NPS, WhatsApp, cobrança, backups, relatórios.
- **Proxy:** Caddy ou Traefik com SSL automático e wildcard para `*.carx.com.br`.

---

### 3. Infraestrutura na VPS

**Avaliação da proposta de containers:** concordo com a separação em 5 blocos de aplicação, com 4 ajustes (marcados com **+**) que evitam problemas conhecidos.

```
Internet → proxy (Caddy, SSL e wildcard)
  ├─ carx.com.br            → [1] carx-web  (landing)
  ├─ app. / {loja}.carx...  → [1] carx-web  (gestão + operador PWA)
  ├─ admin.carx...          → [5] carx-admin-web (Super Admin, acesso restrito)
  └─ api.carx...            → [2] carx-api
[2] carx-api ─┬→ [3] carx-db (PostgreSQL)
              ├→ redis · minio
              ├→ [4] carx-wa (gateway WhatsApp, só rede interna)
              └→ carx-worker (mesma imagem da API, comando diferente)
```

| # | Container | Conteúdo | Observações |
|---|---|---|---|
| 1 | `carx-web` | Nginx servindo 3 apps estáticos: **landing**, **gestão** e **operador (PWA)** | Builds separados e service workers com escopos diferentes. A landing precisa de build estático/SSG próprio por causa de SEO e velocidade. |
| 2 | `carx-api` | Backend Node/TS: API das lojas + módulo `/admin` do Super Admin | **+** `carx-worker` à parte (mesma imagem): lembretes, NPS, fila de WhatsApp, cobrança. Se o worker travar, a API continua. |
| 3 | `carx-db` | PostgreSQL 16 | Sem porta pública. Role separada para o Super Admin (sem RLS de tenant), role da aplicação sem `BYPASSRLS`. |
| 4 | `carx-wa` | Gateway de WhatsApp próprio (seção 13) | **+** Só na rede interna; a API o chama, nunca a internet. Sessões em volume criptografado e com backup. |
| 5 | `carx-admin-web` | Front do Super Admin | **+** Subdomínio próprio, 2FA obrigatório e allowlist de IP ou VPN (WireGuard/Tailscale). |
| apoio | `proxy`, `redis`, `minio`, `backup`, `uptime` | SSL, filas/limites/tempo real, arquivos, backups, monitoramento | **+** Faltavam na proposta; sem eles os 5 blocos não funcionam sozinhos. |

**Redes Docker separadas:** `public` (proxy e fronts), `app` (api, worker, redis, minio), `data` (db) e `wa` (api e gateway). Assim o banco nunca fica na mesma rede dos serviços expostos.

**Domínios:** `carx.com.br` (landing), `app.carx.com.br` (login), `{loja}.carx.com.br` (cada oficina), `admin.carx.com.br` (Super Admin), `api.carx.com.br`, `status.carx.com.br`. (O domínio final ainda está pendente.)

**Landing fora da VPS (opção futura):** servir a landing por CDN (ex.: Cloudflare Pages) a mantém no ar mesmo se a VPS cair. Começar no container 1 e migrar quando o tráfego justificar.

- **Ambientes:** produção e homologação isolados (compose separado, banco separado).
- **Segurança do servidor:** SSH só com chave, `ufw`, `fail2ban`, atualizações automáticas, usuário não-root, segredos em arquivo `.env` fora do git (ou Docker secrets), Postgres sem porta pública.
- **Backups:** `pg_dump` diário + WAL (pgBackRest ou wal-g) para restauração em ponto no tempo, cópia **fora da VPS** (S3/Backblaze), **teste de restauração mensal**. Incluir o volume das sessões do WhatsApp.
- **Observabilidade:** logs estruturados, Uptime Kuma (disponibilidade + página de status), GlitchTip/Sentry para erros, métricas básicas (Prometheus/Grafana ou Netdata).
- **CI/CD:** GitHub Actions: lint, testes, build de imagens por container, deploy por SSH ou registry com tag; rollback com a imagem anterior.
- **Dimensionamento:** a VPS contratada (4 vCPU / 16 GB RAM / 200 GB NVMe / 16 TB de banda) comporta produção e homologação na mesma máquina no início. O consumo do gateway de WhatsApp depende da implementação: se usa navegador headless, cada sessão pesa centenas de MB; se usa conexão direta por socket, bem menos. **Meça com 5 sessões antes de planejar a capacidade.** Reavaliar antes de passar de ~30 lojas ativas.

---

### 4. Modelo de dados do CarX

Princípios: `tenant_id` em tudo; IDs UUID para exposição pública; numeração de OS por loja; sem JSONB para dados que viram relatório.

**Núcleo SaaS (reaproveitar do OperaBeauty; Super Admin na seção 11):** `tenants`, `units` (filiais), `users`, `memberships` (papéis por loja), `plans`, `subscriptions`, `invoices`, `audit_log`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`.

**Domínio automotivo (normalizar o que hoje é JSONB):**
- `customers`, `vehicles` (placa única **por loja**, VIN, cor, ano, porte, km)
- `service_catalog` (serviços, categorias, tempo por porte, garantia em meses), `service_prices_by_class`, `packages`/`package_items`
- `work_orders` (numeração por loja, máquina de estados), `work_order_items`, `work_order_events` (linha do tempo e auditoria), `work_order_media`, `inspections` (checklist de avarias + fotos por ponto), `qa_audits`
- `payments` (método, valor, estorno, conciliação Pix), `deposits` (sinal)
- `materials`, `stock_movements` (entrada, consumo por OS, perda, ajuste), `material_rolls` (bobinas/rolos de PPF e insulfilm com metragem restante e lote)
- `appointments` (agenda por box/profissional), `bays`
- `warranties` (certificado, vencimento, lote do material, QR de verificação), `maintenance_reminders`
- `nps_surveys`, `commissions_rules`, `commissions_entries`
- `message_templates`, `message_log` (WhatsApp/e-mail), `notifications`

**Status da OS como máquina de estados no backend**, não texto: `QUOTE → APPROVED → SCHEDULED → CHECKED_IN → IN_PROGRESS → QA → READY → DELIVERED` (+ `PAUSED`, `CANCELED`), cada transição validada, com evento gravado.

---

### 5. Roadmap por fases

#### Fase 0 — Decisões e fundação (1–2 semanas)
- Fechar nome/domínio (`carx.com.br`?), marca, posicionamento e arquitetura (seção 2).
- Criar repositório novo (monorepo `apps/web`, `apps/api`, `packages/shared`), TypeScript, lint, formatação, CI.
- Limpar o legado: remover duplicatas e arquivos de debug; **rotacionar qualquer credencial** que já tenha circulado.
- Congelar o OsSystem atual (só correções críticas) enquanto o CarX é construído.

#### Fase 1 — Infraestrutura (1–2 semanas)
- VPS endurecida, Docker Compose, proxy com SSL, Postgres, Redis, MinIO.
- Backups automáticos + restauração testada, monitoramento, homologação, deploy automatizado.

#### Fase 2 — Núcleo multitenant (2–3 semanas)
- Importar/adaptar do OperaBeauty: tenants, auth (argon2, JWT de curta duração + refresh, recuperação de senha, 2FA opcional para donos), papéis, planos, limites, audit log, Super Admin.
- RLS + testes automatizados de isolamento (**teste que tenta ler dados de outra loja e precisa falhar**).
- Subdomínio por loja (`minhaloja.carx.com.br`), depois domínio próprio opcional.

#### Fase 3 — Domínio OsSystem no novo backend (4–6 semanas)
- Reimplementar no backend: clientes/veículos, catálogo + preço por porte + combos, orçamento, OS com máquina de estados, pagamentos, estoque com movimentações, agenda, checklist/VCR, fotos, QA, garantia, NPS.
- Frontend: reaproveitar as telas existentes (são o maior ativo) trocando a camada de dados.
- **Eliminar todo uso de localStorage como fonte de dados** (seção 1.3).
- Corrigir os bugs já documentados (status com/sem acento, telefone fixo `11999999999`, validação de upload, debounce do realtime).

#### Fase 4 — Migração dos dados e dos clientes atuais (1–2 semanas)
- Script de ETL: Supabase → Postgres do CarX (clientes, veículos, OS → `work_order_items`/`payments`, mídias → MinIO, usuários).
- Primeiro ensaio com cópia dos dados; conferência por totais (OS, valores pagos, estoque).
- Virada por loja, com o Supabase antigo mantido em paralelo por alguns dias para rollback.
- Comunicação aos clientes atuais e janela de manutenção.

#### Fase 5 — Produto SaaS comercial (3–4 semanas)
- Cadastro self-service + **onboarding guiado por segmento** (PPF, insulfilm, estética/vitrificação, oficina, envelopamento): já cria catálogo, checklists e mensagens prontas.
- Teste grátis (ex.: 14 dias), planos, limites, bloqueio gradual por inadimplência.
- Cobrança recorrente com Pix, cartão e boleto (Asaas, Mercado Pago ou Stripe; comparar taxas).
- Termos, política de privacidade, consentimento e exportação/exclusão de dados (**LGPD**).
- Landing page de vendas (seção 12), página de preços e demonstração com dados fictícios isolada.
- Super Admin com contratos e cobrança das licenças (seção 11).

#### Fase 6 — Diferenciais que vão te destacar (contínuo, em ondas)

**Onda 1 — o que o cliente sente no primeiro mês**
1. **WhatsApp automático de verdade**, pelo gateway próprio (seção 13), com interface de canal que permita trocar para a API oficial se necessário. Fluxos: confirmação de agendamento, status da OS com foto, orçamento, entrega, NPS, revisão de garantia.
2. **Orçamento digital com aceite online:** link, valores por item, aceite com registro de data/IP, sinal por Pix com QR, conversão automática em OS.
3. **Pix integrado:** cobrança dinâmica, baixa automática por webhook, conciliação.
4. **Consulta por placa** para preencher marca/modelo/ano/cor (existem provedores pagos; avaliar custo e LGPD).
5. **Portal do cliente seguro:** login por OTP no WhatsApp/e-mail, histórico do veículo, garantias e fotos. (Hoje é só telefone.)

**Onda 2 — o que o nicho automotivo ainda não tem bem resolvido**
6. **Controle de bobina/rolo (PPF e insulfilm):** metragem usada por OS, sobra, lote/rolo vinculado ao certificado, custo real por serviço e margem. É o tipo de dor que só quem vive a oficina entende.
7. **Passaporte do veículo:** certificado de garantia com **QR de autenticidade público**, lote do material e transferível na revenda do carro (argumento de venda para o dono do carro).
8. **Agenda inteligente:** por box e por profissional, duração por porte, sem choque de horários, previsão de entrega e alerta de atraso.
9. **Reputação:** NPS alto dispara pedido de avaliação no Google; NPS baixo vira alerta imediato ao gestor.
10. **Mini-site da loja** (`minhaloja.carx.com.br`): portfólio dos trabalhos, agendamento, avaliações e SEO local. Vira captação de clientes para a loja.
11. **CRM e retenção:** retorno de 6/12 meses por serviço, aniversário, reativação de inativos, campanhas segmentadas. Reativar indicação/fidelidade, que foram descartadas só por causa do modelo single-tenant.

**Onda 3 — escala e profissionalização**
12. **Fiscal:** NFS-e/NF-e via provedor (ex.: Focus NFe, PlugNotas, eNotas). Para oficinas é muitas vezes requisito de compra.
13. **Financeiro completo:** contas a pagar/receber, fluxo de caixa, DRE e comissões calculados no servidor, metas por técnico.
14. **Multiunidade/franquias** com painel consolidado.
15. **App do técnico offline-first:** câmera guiada, fila de upload quando volta o sinal, push real, cronômetro por etapa.
16. **IA aplicada (avaliar custo/benefício):** detectar avarias nas fotos de entrada, orçamento a partir de fotos, resumo da OS, resposta inicial no WhatsApp, previsão de demanda.
17. **API pública e webhooks reais** (chave com hash, assinatura HMAC, reentrega, rate limit, documentação OpenAPI), **marketplace de templates** compartilhado de fato.

#### Fase 7 — Qualidade contínua (em paralelo a tudo)
- Testes: Vitest (unidade), testes de API, Playwright nos fluxos críticos (OS, pagamento, estoque, agendamento público), **testes de isolamento entre lojas**.
- Teste de carga (k6) antes de cada onda de clientes.
- Revisão de segurança: OWASP, limites de taxa, validação de upload, logs sem dados sensíveis, simulação de restauração de backup.

#### Fase 8 — Go-to-market (começa na Fase 3)
- **Beta fechado** com 3–5 lojas (incluindo as atuais), preço promocional em troca de feedback e depoimento.
- Levantamento de concorrentes **brasileiros** (o roadmap atual compara sobretudo ferramentas americanas): preços, pontos fracos, avaliações. Pesquisa a ser feita na web antes de fechar preços.
- Conteúdo para o nicho (antes/depois, vídeos de uso), parcerias com distribuidores e instaladores de PPF/insulfilm, presença em eventos do setor.
- Suporte por WhatsApp, base de ajuda, onboarding assistido nas primeiras semanas.

---

### 6. Planos e preços (hipótese para validar)

O roadmap antigo supunha ~R$ 197/mês de ticket médio. Uma estrutura inicial para testar com o beta:

| Plano | Para quem | Faixa sugerida | Limites típicos |
|---|---|---|---|
| Essencial | Loja pequena | R$ 149–199/mês | 1 unidade, 3 usuários, WhatsApp básico |
| Profissional | Loja em crescimento | R$ 279–349/mês | Mais usuários, WhatsApp automático, portal, NPS, controle de bobina |
| Premium | Rede / alto volume | R$ 499+/mês | Multiunidade, fiscal, API, IA, suporte prioritário |

Receitas extras: onboarding pago, pacote de mensagens de WhatsApp, módulo fiscal, treinamento. **Valide os preços no beta**, são hipóteses, não conclusões. Lembre que mensagens de WhatsApp e consultas de placa têm custo por uso e precisam entrar na conta da margem.

---

### 7. Cronograma resumido (estimativa grosseira)

| Etapa | Duração |
|---|---|
| Fase 0 + 1 (fundação e infra) | 2–4 semanas |
| Fase 2 (núcleo multitenant, reaproveitando OperaBeauty) | 2–3 semanas |
| Fase 3 (domínio OsSystem no backend novo) | 4–6 semanas |
| Fase 4 (migração) | 1–2 semanas |
| Fase 5 (SaaS comercial e cobrança) | 3–4 semanas |
| **MVP vendável (Fases 0–5, com Onda 1 parcial)** | **~3–4 meses** |
| Ondas 2 e 3 | contínuo, 1 funcionalidade grande por sprint |

Esses prazos assumem desenvolvimento assistido por agentes de código, com você revisando e testando. Dependem muito do quanto do núcleo do OperaBeauty puder ser reaproveitado.

---

### 8. Riscos e como reduzir

| Risco | Mitigação |
|---|---|
| Vazamento de dados entre lojas | `tenant_id` + RLS + testes automatizados de isolamento em CI |
| Perda de dados na VPS | Backup fora do servidor, WAL, restauração testada todo mês |
| Migração quebrar clientes atuais | Ensaio com cópia, virada por loja, rollback com Supabase mantido |
| Reescrever tudo e atrasar o lançamento | Reaproveitar telas e regras já prontas; entregar MVP antes das Ondas 2 e 3 |
| Banimento de número de WhatsApp | API oficial; evitar APIs não oficiais |
| Funcionalidade "de mentira" vendida como real | Auditar cada módulo da seção 1.3 antes de anunciar |
| Sobrecarga de um único servidor | Monitoramento, testes de carga, plano para separar banco em outra VPS |
| LGPD | Termos, consentimento, exportação/exclusão, minimização de dados |

---

### 9. Ações imediatas (enquanto o OsSystem atual segue no ar)

1. **Confirmar no banco de produção** quais políticas RLS públicas ainda existem em `ordens_servico`, `profiles` e `loja_config`, e se o Portal "Meu Veículo" só funciona por causa delas.
2. **Desligar ou corrigir o Portal do cliente** (login só por telefone + modo demo com dados falsos) nas instâncias reais.
3. **Revisar o que já foi vendido** como "API", "Webhooks", "Comissões" e "Garantia ativa" e alinhar a comunicação com a realidade atual.
4. Rotacionar credenciais que já tenham aparecido em comentários, chats ou arquivos antigos (o histórico mostra senhas de teste no `.env`).
5. Garantir backup das instâncias atuais antes de qualquer mudança.
6. Sincronizar o schema oficial (`database.md` × `estrutura_db.md`) em **uma única fonte** versionada.

---

### 10. Rebrand CarX e design system

**Conceito:** o CarX deixa de parecer um painel genérico e passa a parecer uma ferramenta de oficina moderna: escura e de alto contraste onde se trabalha (operador e TV), clara e limpa onde se gerencia (gestor). O esboço visual está no canvas: https://claude.ai/artifact/5BzuJnBwngE5zpDuKM8FHX

#### 10.1 O que observei nas 8 telas atuais (instância Lucas Envelopamento)
- **Gestor:** menu lateral longo e sem agrupamento; títulos em caixa alta com letras coladas ("LUCASENVELOPAMENTO"); rótulos minúsculos em caixa alta com espaçamento exagerado; KPIs sem contexto (sem comparação com período anterior); dashboard sem ações do dia.
- **Marca fixa:** "Lucas Envelopamento / Management v2.5" aparece como identidade do produto.
- **Operador:** a OS fica **bloqueada** quando falta o checklist ("peça ao gestor"); textos de 10–12 px e botões pequenos para quem está com luvas; a fila mostra 53 itens da loja inteira sem priorização.
- **Meu Veículo (cliente):** tema escuro verde, bom conceito de linha do tempo, mas denso, com botões pequenos e um botão fixo que cobre conteúdo.
- **TV:** boa ideia (vídeo + fila), mas sem previsão de entrega, sem destaque para "pronto para retirada" e sem QR.
- **Agenda:** calendário mensal e lista vazia; não mostra ocupação por box nem horários.
- **Vendas/Ordens:** tabelas largas com muitos ícones sem rótulo.
- **Relatórios (NPS):** cartões cinza apagados com "0" e "Sem dados" ocupam a tela; o disparo em massa não deixa claro o que será enviado; faltam alerta de detrator e pedido de avaliação no Google.
- **Laudo de inspeção:** é um modal de desktop com o desenho do carro pequeno e campos desabilitados; para o operador, o laudo deve ser feito no celular, com marcação por toque, foto por avaria, km e relato por voz.

#### 10.2 Identidade
| Item | Definição |
|---|---|
| Nome | **CarX** (X em destaque) |
| Assinatura | "Cada carro. Cada etapa. Sob controle." |
| Logo | Quadrado arredondado Volt com um X traçado em Asfalto; wordmark "Car" + "X" em Volt |
| Cor de destaque | **Volt** `#C8F52E` (texto sobre Volt sempre em Asfalto) |
| Neutros | Asfalto `#0E1116` · Grafite `#171C24` · Aço `#232A35` · Linha `#2E3744` · Texto `#F2F5F8` · Muted `#9AA7B8` · Névoa `#F3F5F7` |
| Semânticas | Alerta `#FFB020` · Info `#5CC8FF` · Erro `#FF6B5E` (claro: `#E5484D`) · Sucesso = Volt |
| Tipografia | **Space Grotesk** (títulos, números, cronômetro) e **Inter** (textos); números tabulares em tempos e valores |
| Formas | Raio 14 px (botões/campos), 20–24 px (cartões); ícones de traço 2 px; sem emoji |
| Tom de voz | Direto, em português, verbos de ação ("Continuar serviço", "Concluir etapa") |
| Acessibilidade | Contraste mínimo 4,5:1; alvos de toque de 48 px (gestor) e 56–60 px (operador); `aria-label` em ícones |

#### 10.3 Princípios do app do operador (PWA)
1. **Mãos ocupadas:** botão principal grande, fixo na base da tela, no alcance do polegar. Uma ação principal por tela.
2. **Nunca bloquear sem saída:** se falta o checklist, o operador o faz na hora ("Fazer checklist e iniciar"), sem depender do gestor.
3. **Tela sempre ligada** durante o serviço (Screen Wake Lock API) e cronômetro calculado no servidor.
4. **Foto em um toque:** câmera direta, ângulos guiados (frente, laterais, traseira) e envio em segundo plano.
5. **Funciona com sinal ruim:** fila de tarefas e uploads em cache local, com sincronização ao voltar a conexão (service worker + background sync).
6. **Prova automática:** tempo, etapas, fotos e material (metragem de película) registrados sem digitar.
7. **Notificações push** para nova OS atribuída, retrabalho solicitado e pausa por falta de material.
8. **Modo escuro por padrão** (luz forte da oficina e economia de bateria); modo claro opcional.
9. **Instalável:** manifest dinâmico por loja, ícones e tela inicial.

#### 10.4 Padrões de componentes
Botão primário (Volt) de 56–60 px; chips de status com cor semântica; cartão de OS (placa, modelo, serviço, tempo, progresso); cronômetro; stepper de etapas; barra de fotos guiadas; barra inferior de navegação com 3 itens; estados de vazio, erro, carregando e **offline**. Tudo implementado como biblioteca de componentes (tarefa T0.5).

#### 10.5 Mapa de telas
| Tela | Status no canvas |
|---|---|
| Marca e paleta | Esboçada |
| Operador: fila de tarefas | Esboçada |
| Operador: execução do serviço | Esboçada |
| Gestor: painel | Esboçada |
| Gestor: nova OS (em etapas) | Esboçada |
| Gestor: agenda por box | Esboçada |
| TV da loja (fila dos clientes) | Esboçada |
| Gestor: relatórios, aba NPS e retenção | Esboçada |
| Operador: laudo de inspeção digital (mapa de avarias no celular) | Esboçada |
| Operador: fotos antes/durante/depois, assinatura do cliente, histórico, perfil | A desenhar |
| Gestor: vendas/orçamentos, lista de OS, clientes e veículos, serviços e preços, estoque e bobinas, demais abas de relatórios (visão gerencial, garantias e revisões, DRE e fluxo de caixa), colaboradores e comissões, configurações | A desenhar |
| Cliente: Meu Veículo, link de acompanhamento, agendamento online, aprovação de orçamento | A desenhar |
| Documentos: certificado de garantia, laudo (VCR), recibo | A desenhar |
| Super Admin (todas as telas da seção 11) | A desenhar |
| Landing page e onboarding | A desenhar |
| Login, recuperação de senha, 2FA | A desenhar |

#### 10.6 Marca da loja (white label): proposta a validar
O CarX mantém a estrutura e a identidade nas áreas internas. Cada loja personaliza **logo, nome e cor de destaque** nas telas voltadas ao cliente final (TV, Meu Veículo, link de acompanhamento, certificados, PDFs e mensagens). Nas telas internas aparece o logo da loja ao lado do CarX. Isso mantém o produto reconhecível sem perder o valor de marca para a oficina.

---

### 11. Ambiente Super Admin (dono do SaaS)

Ambiente separado (container 5, `admin.carx.com.br`) para você operar o negócio: contratos, pagamentos das licenças e criação de oficinas. As rotas ficam no módulo `/admin` da mesma API, com autenticação e permissões próprias, sem nenhum acesso a partir do app das lojas.

#### 11.1 Módulos
| Módulo | O que faz |
|---|---|
| Painel do SaaS | MRR, ARR, lojas ativas, trials em andamento, conversão trial→pago, churn, inadimplência, receita por plano, uso total |
| Oficinas | Lista com filtros; criar, editar, suspender, reativar, cancelar; ver uso e limites; **acessar como a loja (impersonação) com registro** |
| Criar oficina | Assistente: dados da empresa (CNPJ), responsável, plano, trial, subdomínio, segmento (carrega catálogo e checklists), convite ao dono por e-mail, pareamento do WhatsApp |
| Contratos e licenças | Plano, ciclo (mensal/anual), preço negociado, desconto, início, renovação, limites customizados, status (trial, ativo, inadimplente, suspenso, cancelado), histórico de alterações e termo de aceite em PDF |
| Cobranças e pagamentos | Faturas geradas, Pix/boleto/cartão, reenvio, **baixa automática por webhook do provedor**, baixa manual, estorno, conciliação, emissão de nota da própria CarX |
| Planos e preços | Cadastro de planos, limites e funcionalidades liberadas (feature flags) por plano e por loja |
| Uso e limites | Usuários, OS por mês, armazenamento, mensagens de WhatsApp por loja |
| WhatsApp | Status das sessões por loja, reconectar, fila, falhas e limites diários |
| Leads | Contatos vindos da landing page, com botão "converter em oficina" |
| Suporte | Notas por loja, log de ações, impersonação, avisos e comunicados para as lojas |
| Auditoria | Registro imutável de tudo que é feito no Super Admin |
| Configurações | Termos de uso, e-mails e modelos de mensagem, parâmetros da régua de cobrança |

#### 11.2 Régua de cobrança (parâmetros configuráveis)
Lembrete antes do vencimento → cobrança no vencimento → aviso após 3 dias → restrição leve após 7 dias → **suspensão em modo somente leitura** após 15 dias → cancelamento com retenção dos dados por um prazo definido em contrato, com exportação disponível. Nunca apagar dados sem aviso prévio. Os prazos exatos ficam como decisão comercial.

#### 11.3 Modelo de dados adicional
`superadmin_users`, `plans`, `plan_features`, `contracts`, `contract_events`, `invoices`, `invoice_payments`, `leads`, `impersonation_log`, `tenant_usage_daily`, `support_notes`, `announcements`.

#### 11.4 Fluxos principais
- **Criar oficina:** o assistente cria o tenant, carrega o catálogo do segmento, convida o dono por e-mail, cria o contrato (trial ou pago) e gera a primeira cobrança.
- **Trial → pago:** ao fim do trial, o sistema gera a fatura; sem pagamento, entra na régua.
- **Upgrade/downgrade:** troca de plano com ajuste proporcional e novos limites aplicados na hora.
- **Suspensão:** bloqueia escrita, mantém leitura, mostra aviso ao dono e preserva os dados.

#### 11.5 Segurança do Super Admin
Subdomínio próprio; 2FA obrigatório; allowlist de IP ou VPN; sessões curtas; reautenticação para ações destrutivas (suspender, cancelar, excluir, estornar); role de banco separada; log de auditoria sem edição; impersonação sempre registrada e limitada no tempo; nenhum token do Super Admin funciona no app das lojas e vice-versa.

---

### 12. Landing page de vendas

#### 12.1 Objetivo
Gerar **testes grátis e pedidos de demonstração** de donos de oficinas, estéticas, aplicadores de PPF e insulfilm. Métricas a acompanhar: visitantes, leads, trials iniciados, trials convertidos e custo por lead.

#### 12.2 Estrutura sugerida (de cima para baixo)
1. **Hero:** promessa clara ("Do carro entrando ao carro entregue, tudo sob controle"), duas ações (**Testar grátis por 14 dias** e **Ver demonstração**) e uma imagem real do app.
2. **Prova social:** logos das oficinas do beta, depoimentos e, quando existirem, números reais (OS processadas, lojas ativas).
3. **O fluxo da oficina:** orçamento → agendamento → checklist → execução → entrega → garantia → NPS, em uma linha do tempo visual.
4. **Por papel:** dono, atendente, operador e cliente final, cada um com uma tela do app.
5. **Diferenciais:** TV da loja, checklist visual de avarias, controle de bobina, WhatsApp automático, garantia com QR.
6. **Segmentos:** PPF, insulfilm, vitrificação, envelopamento e oficina mecânica (cada um com página própria, por SEO).
7. **Calculadora de retorno:** o dono informa OS por mês e ticket médio e vê quanto ganha com menos retrabalho, mais retorno de clientes e menos ligações.
8. **Planos e preços** com comparativo.
9. **Perguntas frequentes:** migração do sistema atual, segurança e LGPD, suporte, cancelamento, funciona no celular.
10. **CTA final** com formulário curto (nome, WhatsApp, nome da oficina, nº de funcionários) e botão flutuante de WhatsApp.
11. **Rodapé** com termos de uso, política de privacidade e contato.

#### 12.3 Melhorias em relação à ideia inicial
- **Build estático próprio (SSG)** para SEO e velocidade, mesmo servido pelo container 1; meta de nota alta no Lighthouse.
- **Páginas por segmento** (`/para/ppf`, `/para/insulfilm`, `/para/estetica`, `/para/oficina`) para aparecer em buscas específicas.
- **Leads direto no Super Admin** (`POST /public/leads` com limite de taxa, campo oculto anti-robô e captcha), com botão "converter em oficina".
- **Ambiente de demonstração** com dados fictícios, resetado automaticamente.
- **Analytics com consentimento (LGPD):** banner de cookies e eventos de conversão.
- **Só anunciar o que existe de verdade.** A auditoria do OsSystem mostrou módulos que pareciam prontos e não eram; a landing só pode prometer o que estiver funcionando.
- **Opção futura:** hospedar a landing em CDN, fora da VPS.

#### 12.4 Páginas
`/`, `/recursos`, `/precos`, `/para/ppf`, `/para/insulfilm`, `/para/estetica`, `/para/oficina`, `/demo`, `/contato`, `/termos`, `/privacidade` (blog em fase posterior). Tecnologia sugerida: Astro ou Next.js com exportação estática.

---

### 13. Gateway de WhatsApp próprio

#### 13.1 Requisitos
- **Uma sessão por loja** (um número por oficina), pareamento por QR Code no painel da loja, com status e reconexão automática.
- **Envio por fila** com limite de taxa, intervalos variáveis e teto diário por loja e por idade do número.
- **Modelos de mensagem** com variáveis (nome, placa, serviço, link) e anexos (foto e PDF).
- **Recebimento:** respostas de NPS, aprovação de orçamento ("1 = aprovar") e retorno para a loja.
- **Confirmação de entrega e leitura** por webhook interno, **idempotência** e registro de todas as mensagens.
- **Opt-out** ("Responda SAIR") e envio só a quem já é cliente da loja.
- **Métricas** e alertas no Super Admin.

#### 13.2 Interface de canal (recomendado)
O backend não chama o gateway diretamente: usa uma interface `MessageChannel` com drivers trocáveis: `own-gateway` (padrão), `whatsapp-cloud-api` (oficial, para lojas ou planos que preferirem) e `wa.me` (fallback manual). Assim, se o gateway cair ou for bloqueado, a troca não exige reescrever o sistema.

#### 13.3 Risco que precisa estar claro
Gateways não oficiais **descumprem os termos do WhatsApp e podem levar ao banimento do número da loja**, que é o canal de contato dela com os clientes. Como todas as lojas do CarX dependeriam disso, é um risco concentrado no negócio. Mitigações: usar um **número dedicado da oficina** (não o pessoal), mensagens só transacionais para clientes existentes, volume baixo com intervalos, opt-out simples, aviso e termo de ciência no contrato, monitoramento de bloqueios e **plano B pela API oficial** (que tem custo por conversa; valores a confirmar antes de decidir).

#### 13.4 Segurança e operação
Container só na rede interna; autenticação entre API e gateway por token; sessões (que são credenciais) em volume **criptografado e com backup**; limites de memória por container e teste de carga com várias sessões antes de abrir para novas lojas.

---

# PARTE II — Execução: tasks (Fases 0 a 3 e primeiros itens da Fase 5)

> Referência operacional para os agentes de código. As Fases 4 a 8 estão descritas na Parte I (seção 5) e serão detalhadas em tarefas quando as Fases 0 a 3 estiverem encaminhadas.

### Como os agentes devem trabalhar
- Uma tarefa por vez, na ordem. Cada tarefa tem **Entrega** e **Pronto quando**; só avance se o critério passar.
- Uma branch e um PR por tarefa; commits pequenos; nunca commitar segredos.
- Toda tabela de negócio tem `tenant_id`. Toda query passa pelo contexto de tenant. **Sem exceção.**
- Regras de negócio ficam no backend, nunca só no frontend.
- Dinheiro em centavos (`integer`) ou `numeric(12,2)`; datas em `timestamptz` UTC, exibição em America/Sao_Paulo.
- Não usar localStorage como fonte de dados.
- Se algo estiver ambíguo, registrar a dúvida em `docs/decisoes.md` em vez de inventar.

### Dimensionamento da VPS (16 GB)
Sugestão de orçamento de memória: Postgres 4–5 GB · API 1–2 GB · Redis 0,5 GB · MinIO 1 GB · web/proxy 0,5 GB · worker 1 GB · homologação ~3 GB · folga de sistema/cache ~3 GB. Cabe produção e homologação na mesma máquina no início. Reavaliar com métricas reais antes de passar de ~30 lojas ativas.


### FASE 0 — Fundação do projeto

#### T0.1 Repositório e monorepo
- **Entrega:** repo `carx` com `apps/web`, `apps/api`, `packages/shared`, `infra/`, `docs/`. pnpm workspaces. TypeScript estrito. ESLint + Prettier + EditorConfig. Husky/lint-staged.
- **Pronto quando:** `pnpm install && pnpm lint && pnpm typecheck` passam em máquina limpa.

#### T0.2 CI
- **Entrega:** GitHub Actions: lint, typecheck, testes, build das imagens em PR.
- **Pronto quando:** PR com erro de lint é bloqueado.

#### T0.3 Convenções e documentação base
- **Entrega:** `README.md`, `docs/arquitetura.md` (diagrama da seção 3 da Parte I), `docs/decisoes.md`, `docs/glossario.md` (OS, orçamento, porte, bobina, VCR, QA), `.env.example` sem valores reais.
- **Pronto quando:** um dev novo sobe o projeto lendo só o README.

#### T0.4 Higiene do legado (no repo antigo OsSystem)
- **Entrega:** remover `_skills`, `_1*`, arquivos de debug, `.resolved`, `supabase/.temp/`; tag `legacy-final`; rotacionar credenciais que já circularam.
- **Pronto quando:** repo antigo só contém o que é código e docs úteis; nenhuma senha em texto nos arquivos.


#### T0.5 Design system e tokens (seção 10)
- **Entrega:** pacote `packages/ui` com tokens (cores, tipografia, raios, espaçamentos) em Tailwind, e componentes base: Botão, Chip de status, Cartão de OS, Campo, Stepper, Cronômetro, Barra de fotos, Barra inferior, Modal, Estados vazio/erro/offline. Tema claro e escuro.
- **Pronto quando:** as telas Operador Fila, Operador Execução e Gestor Painel do canvas são reproduzidas só com esses componentes e passam em verificação de contraste (4,5:1).

### FASE 1 — Infraestrutura na VPS

#### T1.1 Endurecimento do servidor
- **Entrega:** usuário não-root com sudo, SSH só por chave (sem senha, sem root), `ufw` (22, 80, 443), `fail2ban`, `unattended-upgrades`, fuso e NTP, swap pequeno, limites de log do Docker.
- **Pronto quando:** `ssh root@...` e login por senha falham; `ufw status` mostra só as portas previstas.

#### T1.2 Docker Compose base (topologia da seção 3)
- **Entrega:** `infra/compose.prod.yml` e `infra/compose.staging.yml` com os 5 blocos de aplicação (`carx-web`, `carx-api` + `carx-worker`, `carx-db`, `carx-wa`, `carx-admin-web`) e o apoio (`proxy`, `redis`, `minio`, `backup`, `uptime`). Redes `public`, `app`, `data` e `wa`; **Postgres, Redis, MinIO e gateway sem porta pública**. Healthchecks, `restart: unless-stopped`, limites de memória por serviço.
- **Pronto quando:** `docker compose up -d` sobe tudo saudável; `nmap` externo só vê as portas 80 e 443.

#### T1.3 Domínio, SSL e subdomínios
- **Entrega:** DNS do domínio do CarX, certificado automático, wildcard `*.carx.<dominio>` para as lojas, `app.`, `api.`, `staging.`.
- **Pronto quando:** `https://app.<dominio>` e um subdomínio de teste respondem com SSL válido.
- **Depende de:** definir o domínio (pendente).

#### T1.4 Backups (a tarefa mais importante da fase)
- **Entrega:** `pg_dump` diário + WAL archiving (pgBackRest ou wal-g), retenção 7 diários/4 semanais/6 mensais, cópia **fora da VPS** (S3/Backblaze/R2), backup do MinIO, alerta se o backup falhar.
- **Pronto quando:** script `restore-test.sh` restaura o último backup num banco temporário e confere contagem de linhas; documentado em `docs/runbook-backup.md`.

#### T1.5 Monitoramento
- **Entrega:** Uptime Kuma (ou similar) com página de status, GlitchTip/Sentry para erros, métricas básicas do host e do Postgres, logs estruturados (JSON) com rotação.
- **Pronto quando:** derrubar a API dispara alerta em até 2 minutos.

#### T1.6 Deploy automatizado
- **Entrega:** pipeline que builda imagens, publica no registry, faz deploy por SSH com tag de versão e **rollback** para a imagem anterior com um comando. Migrations rodam como passo separado e controlado.
- **Pronto quando:** merge na `main` publica em homologação; produção por aprovação manual.


### FASE 2 — Núcleo multitenant

> Reaproveitar do OperaBeauty o que já existe (tenants, auth, planos, Super Admin). Primeiro **inventariar** o que dá para copiar e o que precisa mudar.

#### T2.0 Inventário do OperaBeauty
- **Entrega:** `docs/reuso-operabeauty.md` listando módulos reutilizáveis, dívidas conhecidas e adaptações necessárias.
- **Pronto quando:** cada item marcado como copiar / adaptar / refazer.

#### T2.1 Migrations e esquema do núcleo
- **Entrega:** ferramenta de migrations SQL versionadas (ex.: node-pg-migrate ou Drizzle). Tabelas: `tenants`, `units`, `users`, `memberships` (papéis: owner, gestor, atendente, tecnico, financeiro), `plans`, `subscriptions`, `audit_log`, `api_keys`, `webhook_endpoints`.
- **Pronto quando:** `migrate up` do zero cria o banco inteiro; `migrate down` reverte; CI roda as duas.

#### T2.2 Contexto de tenant e RLS
- **Entrega:** middleware que define `SET LOCAL app.tenant_id` por requisição/transação; políticas RLS em todas as tabelas com `tenant_id`; usuário de banco da aplicação **sem** `BYPASSRLS`.
- **Pronto quando:** suíte `tenant-isolation.test` cria 2 lojas e prova que A não lê, altera nem apaga dados de B em **todas** as tabelas (teste gerado automaticamente a partir do catálogo de tabelas, para nenhuma ficar de fora).

#### T2.3 Autenticação
- **Entrega:** cadastro/login com argon2id, access token curto + refresh rotativo, logout, recuperação de senha por e-mail, bloqueio por tentativas (rate limit), 2FA TOTP opcional para owner, convite de usuário por e-mail com papel correto.
- **Pronto quando:** testes cobrem login, refresh, reuso de refresh token invalidado, brute force bloqueado e criação de usuário já com o cargo certo (bug do `handle_new_user` do legado não se repete).

#### T2.4 Autorização por papel
- **Entrega:** matriz papel × ação em `packages/shared/permissions.ts`, usada no backend (obrigatório) e no frontend (só para esconder UI). Técnico só enxerga e altera OS atribuídas a ele.
- **Pronto quando:** testes provam que técnico não deleta OS nem lê financeiro, e que a UI sozinha nunca é a barreira.

#### T2.5 Auditoria
- **Entrega:** `audit_log` (quem, quando, tenant, entidade, antes/depois) para pagamentos, exclusões, mudança de papel, login, exportação de dados.
- **Pronto quando:** estornar um pagamento gera registro consultável.

#### T2.6 Planos, limites e feature flags
- **Entrega:** limites por plano (usuários, unidades, armazenamento, mensagens) e funcionalidades liberadas por plano e por loja, verificados no backend.
- **Pronto quando:** exceder o limite retorna erro claro; desligar uma funcionalidade de uma loja a esconde na UI e a bloqueia na API.

#### T2.7 Subdomínio por loja e identidade (white label)
- **Entrega:** resolução de tenant por subdomínio; tabela `tenant_branding` (nome, logo, cores, redes sociais, WhatsApp) substituindo `loja_config`; manifest PWA e tela de loading dinâmicos por loja (sem “OsSystem” ou nome de cliente fixo).
- **Pronto quando:** duas lojas em subdomínios diferentes mostram marcas diferentes, inclusive no PWA instalado.

#### T2.8 Armazenamento de arquivos
- **Entrega:** upload para MinIO com URL assinada, caminho `tenant/{id}/...`, validação de MIME real (não só extensão), tamanho máximo, compressão/redimensionamento no servidor, cota por plano. SVG não aceito como upload de usuário.
- **Pronto quando:** arquivo malicioso renomeado para `.jpg` é rejeitado; URL de uma loja não abre arquivo de outra.


#### T2.9 Super Admin: backend (seção 11)
- **Entrega:** módulo `/admin` na API com autenticação própria (2FA obrigatório), role de banco separada, tabelas `superadmin_users`, `plans`, `contracts`, `contract_events`, `invoices`, `leads`, `impersonation_log`, `tenant_usage_daily`; endpoints de oficinas, contratos, faturas, planos e uso; auditoria imutável.
- **Pronto quando:** token do Super Admin não acessa rotas das lojas e vice-versa; toda ação gera registro de auditoria.

#### T2.10 Super Admin: front (container 5)
- **Entrega:** app `apps/admin` em subdomínio próprio com painel do SaaS, lista de oficinas, contratos, faturas, planos, uso, leads, auditoria e suporte, usando o design system (T0.5).
- **Pronto quando:** acesso só pela VPN/IP permitido e com 2FA; reautenticação em ações destrutivas.

#### T2.11 Criação de oficina e provisionamento
- **Entrega:** assistente "Nova oficina" no Super Admin que cria o tenant, carrega o catálogo e os checklists do segmento, cria o contrato (trial ou pago), convida o dono por e-mail e reserva o subdomínio.
- **Pronto quando:** em poucos minutos uma oficina nova entra no sistema e cria sua primeira OS sem intervenção manual.

#### T2.12 Contratos, faturas e régua de cobrança (manual primeiro)
- **Entrega:** status de contrato (trial, ativo, inadimplente, suspenso, cancelado), geração de fatura, baixa manual, régua configurável com suspensão em modo somente leitura. A integração com o provedor de pagamento entra na Fase 5 (T5.2).
- **Pronto quando:** uma fatura vencida leva a loja de teste até a suspensão no prazo configurado, e o pagamento a reativa.

### FASE 3 — Domínio OsSystem no backend novo

> Para cada módulo: tabelas + endpoints + regras no servidor + testes + adaptar a tela existente do OsSystem trocando só a camada de dados.

#### T3.1 Clientes e veículos
- **Entrega:** `customers`, `vehicles` (placa única **por loja**, VIN, ano, cor, porte, km), busca por nome/telefone/placa, normalização de telefone e placa no servidor, detecção de cliente duplicado.
- **Pronto quando:** duas lojas cadastram a mesma placa sem conflito; busca paginada no servidor.

#### T3.2 Catálogo de serviços, preços por porte e combos
- **Entrega:** `service_catalog`, `service_prices_by_class`, `packages`/`package_items`, tempo estimado por porte, garantia em meses, consumo de material previsto.
- **Pronto quando:** orçamento sugere preço pelo porte do veículo e aplica desconto do combo no servidor.

#### T3.3 Orçamentos e Ordens de Serviço
- **Entrega:** `work_orders` (número sequencial **por loja**), `work_order_items`, `work_order_events`; máquina de estados `QUOTE → APPROVED → SCHEDULED → CHECKED_IN → IN_PROGRESS → QA → READY → DELIVERED` (+ `PAUSED`, `CANCELED`), transições validadas e registradas; token público de acompanhamento (UUID, nunca ID sequencial).
- **Pronto quando:** transição inválida retorna erro; linha do tempo da OS mostra todos os eventos; os status com e sem acento do legado deixam de existir.

#### T3.4 Pagamentos e sinal
- **Entrega:** `payments` e `deposits` com valor, método, estorno e saldo calculados no servidor, em transação; pagamento negativo ou acima do saldo é recusado.
- **Pronto quando:** teste de concorrência com dois pagamentos simultâneos na mesma OS soma corretamente (resolve a race condition do legado).

#### T3.5 Estoque e bobinas
- **Entrega:** `materials`, `stock_movements` (entrada, consumo por OS, perda, ajuste), `material_rolls` (metragem restante e lote), baixa **idempotente** ao entregar a OS, alerta de mínimo.
- **Pronto quando:** entregar a mesma OS duas vezes baixa o estoque uma vez; saldo = soma dos movimentos.

#### T3.6 Agenda e agendamento público
- **Entrega:** `appointments`, `bays`, disponibilidade por box/profissional e duração do serviço por porte; endpoint público de agendamento que aceita só campos seguros e cria OS em `QUOTE` com origem `ONLINE`; rate limit e proteção anti-bot.
- **Pronto quando:** dois clientes não conseguem reservar o mesmo horário; o endpoint público não consegue definir status, valores pagos nem técnico.

#### T3.7 Checklist de avarias, laudo (VCR) e fotos
- **Entrega:** `inspections` com pontos de avaria por tipo de veículo (carro/moto), fotos por ponto, assinatura salva como arquivo (não base64 no banco), PDF do laudo gerado no servidor; fotos antes/depois por ângulo e fase.
- **Pronto quando:** laudo em PDF abre com marcações, fotos e assinatura; assinatura não está mais em coluna de texto.

#### T3.8 Execução (app do técnico)
- **Entrega:** fila do técnico, início/pausa/fim com cronômetro **calculado no servidor** (não no relógio do aparelho), baixa de materiais, progresso, observações.
- **Pronto quando:** fechar o app no meio de um serviço não perde o tempo contado.

#### T3.9 QA, entrega, garantia e certificado
- **Entrega:** `qa_audits` persistido; entrega exige QA aprovado quando a loja habilitar; `warranties` com vencimento, lote do material e **QR de verificação pública**; certificado em PDF.
- **Pronto quando:** escanear o QR do certificado mostra a garantia autêntica sem expor dados pessoais.

#### T3.10 NPS e pós-venda
- **Entrega:** `nps_surveys` com token por OS, resposta pública sem login, classificação promotor/neutro/detrator, painel do gestor, alerta de detrator. `maintenance_reminders` calculados por serviço. **Envio fica como job na fila** (a integração real de WhatsApp é a Onda 1 da Fase 6).
- **Pronto quando:** responder duas vezes ao mesmo token não duplica; lembretes aparecem na fila de jobs com data correta.

#### T3.11 Financeiro, comissões e relatórios no servidor
- **Entrega:** DRE, margem por serviço, inadimplência, fluxo de caixa previsto e comissões (`commissions_rules`, `commissions_entries`) calculados por SQL no servidor; ranking de técnicos a partir de dados reais (streak calculado por retrabalho no QA, sem valor padrão fictício).
- **Pronto quando:** números do dashboard batem com a soma dos pagamentos e movimentos de estoque; nada depende do navegador ter carregado todas as OS.

#### T3.12 Tempo real
- **Entrega:** canal SSE/WebSocket por tenant com eventos pontuais (`work_order.updated`, `stock.low`, `appointment.created`); Monitor TV e fila do operador consomem eventos sem recarregar listas inteiras.
- **Pronto quando:** 5 OS atualizadas juntas geram 5 eventos leves, não 5 recargas completas; a TV de uma loja nunca recebe evento de outra.

#### T3.13 Portal do cliente e link de acompanhamento
- **Entrega:** link de acompanhamento só por token UUID; portal "Meu Veículo" com login por **OTP** (WhatsApp ou e-mail), listagem filtrada **no servidor**, **sem modo demonstração com dados falsos em produção**.
- **Pronto quando:** digitar o telefone de outra pessoa não dá acesso a nada sem o código; testes cobrem tentativa de enumeração.

#### T3.14 API pública e webhooks reais (base)
- **Entrega:** chaves de API guardadas com hash, escopos por chave, rate limit, webhooks com assinatura HMAC, reentrega com backoff e log de entregas, OpenAPI gerado do código.
- **Pronto quando:** chave revogada para de funcionar na hora; webhook falho é reenviado e aparece no log.

#### T3.15 Frontend: troca da camada de dados
- **Entrega:** cliente HTTP tipado (gerado do OpenAPI) + TanStack Query; remover `@supabase/supabase-js`; os três apps do container 1 (landing, gestão e operador) com base no design system (T0.5); migrar telas existentes para TypeScript por módulo; paginação no servidor; remover todo `localStorage` de dados de negócio (manter só tema e preferências de UI).
- **Pronto quando:** `grep -r "supabase" apps/web` não retorna nada; `grep -r "localStorage" apps/web` só mostra preferências de UI.

#### T3.16 Testes de ponta a ponta dos fluxos críticos
- **Entrega:** Playwright cobrindo: cadastro de loja → orçamento → aprovação → agenda → execução → QA → entrega → pagamento → garantia → NPS; agendamento público; isolamento entre duas lojas.
- **Pronto quando:** a suíte roda no CI e bloqueia merge se falhar.

#### T3.17 Gateway de WhatsApp: integração (seção 13)
- **Entrega:** interface `MessageChannel` com driver `own-gateway`; pareamento por QR na loja; fila de envio com limites; modelos de mensagem; recebimento de respostas (NPS e aprovação de orçamento); opt-out; log de mensagens; painel de sessões no Super Admin.
- **Pronto quando:** uma OS entregue dispara o NPS pelo WhatsApp e a resposta aparece no painel; derrubar o gateway não derruba a API (mensagens ficam na fila).

---

### Critério de saída das Fases 0–3
- Duas lojas de teste operam o ciclo completo sem ver nada uma da outra.
- Backup restaurado com sucesso em ensaio.
- Nenhuma funcionalidade depende de localStorage, de regra só no frontend ou de dados fictícios.
- Cobertura de testes nos fluxos de dinheiro, estoque, isolamento e autenticação.

**Depois disto:** Fase 4 (migração dos clientes atuais) e a Fase 5, cujos primeiros itens estão detalhados abaixo.

### FASE 5 — itens já detalhados (landing e cobrança)

#### T5.1 Landing page de vendas (seção 12)
- **Entrega:** site estático com as seções e páginas por segmento da seção 12, formulário de leads (`POST /public/leads`, com limite de taxa e captcha), banner de cookies e eventos de conversão.
- **Pronto quando:** um lead enviado aparece no Super Admin com botão "converter em oficina"; o site só anuncia funcionalidades que existem.

#### T5.2 Cobrança automática de licenças
- **Entrega:** integração com o provedor escolhido (Pix, boleto e cartão recorrente), geração de fatura, baixa por webhook assinado e conciliação no Super Admin.
- **Pronto quando:** pagamento aprovado reativa a loja e atualiza o contrato sem ação manual.

#### T5.3 Onboarding self-service
- **Entrega:** cadastro da oficina pela landing, escolha de segmento e plano, trial automático e checklist de primeiros passos.
- **Pronto quando:** uma oficina nova sai do cadastro à primeira OS sem ajuda.



---

# PARTE III — Registro de decisões

### Decisões fechadas
| # | Decisão | Valor | Data |
|---|---|---|---|
| 1 | Nome do produto | **CarX** (antigo OsSystem) | 30/10/2026 |
| 2 | Arquitetura | **Rota B**: backend próprio (Node + TypeScript), PostgreSQL com `tenant_id` + RLS; sem Supabase | 30/10/2026 |
| 3 | Infraestrutura | VPS Ubuntu Server + Docker, **4 vCPU / 16 GB RAM / 200 GB NVMe / 16 TB de banda** | 30/10/2026 |
| 4 | Reaproveitamento | Reutilizar o núcleo multitenant do OperaBeauty (tenants, auth, planos, Super Admin), sujeito ao inventário T2.0 | 30/10/2026 |
| 5 | Topologia de containers | 5 blocos: front do cliente (landing, gestão, operador), backend, PostgreSQL, gateway de WhatsApp e front do Super Admin; mais worker, proxy, Redis, MinIO, backup e monitoramento (seção 3) | 30/10/2026 |
| 6 | Super Admin | Ambiente próprio do dono do SaaS para contratos, pagamentos das licenças e criação de oficinas (seção 11) | 30/10/2026 |
| 7 | Landing page | Faz parte do projeto, no container 1, com build estático próprio (seção 12) | 30/10/2026 |
| 8 | WhatsApp | Gateway próprio, com interface de canal para poder trocar de provedor (seção 13) | 30/10/2026 |
| 9 | Rebrand | Identidade Volt/Asfalto, Space Grotesk + Inter, app do operador escuro por padrão (seção 10) | 30/10/2026 |

### Decisões pendentes
| # | Pergunta | Trava qual tarefa |
|---|---|---|
| 1 | Domínio do CarX e uso de subdomínio por loja | T1.3, T2.7 |
| 2 | Provedor de cobrança (Asaas, Mercado Pago ou Stripe) e se já há conta | Fase 5 |
| 3 | E-mail transacional (Resend, Postmark ou SES) | T2.3 (recuperação de senha e convites) |
| 4 | Quantas instâncias do OsSystem estão em produção e o volume de dados de cada uma | Fase 4 |
| 5 | Aceitar o risco de banimento do gateway não oficial e definir o plano B (API oficial para quais lojas/planos) | T3.17 |
| 6 | Quais 3 diferenciais da Fase 6 vêm primeiro | Priorização pós-MVP |
| 7 | Provedor de storage externo para backups (S3, Backblaze, R2) | T1.4 |
| 8 | Marca da loja: validar a proposta de white label da seção 10.6 | T2.7, T0.5 |
| 9 | Landing no container 1 ou em CDN fora da VPS | T5.1 |
| 10 | Prazos da régua de cobrança e retenção de dados após cancelamento | T2.12 |

> Ao decidir algo, mova a linha da tabela de pendentes para a de fechadas e registre a data. Dúvidas técnicas menores ficam em `docs/decisoes.md` no repositório.
