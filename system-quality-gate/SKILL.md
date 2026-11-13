---
name: system-quality-gate
description: executar e documentar testes de qualidade, regressao, desempenho com k6, cache, postgresql e controle de versao em sistemas saas com ambientes local e producao. usar ao validar novas telas, funcoes, apis, migrations, releases, capacidade, regressao, deploy ou incidentes; gerar relatorio final com evidencias, metricas, riscos e decisao de aprovacao. detectar automaticamente a stack do repositorio e aplicar protecoes rigorosas para nunca executar carga pesada ou operacoes destrutivas em producao sem autorizacao explicita.
---

# Objetivo

Atuar como gate de qualidade e versao para um sistema SaaS com apenas dois ambientes: maquina local e VPS Linux de producao. Inspecionar o repositorio, montar um plano proporcional ao risco, executar somente os testes seguros e disponiveis, registrar evidencias e gerar um relatorio final reproduzivel.

# Principios obrigatorios

- Tratar producao como ambiente protegido, nunca como laboratorio.
- Executar testes pesados localmente por padrao.
- Nunca iniciar com 1.000 usuarios virtuais. Subir carga em degraus e parar quando um limite falhar.
- Nunca inventar resultados, cobertura, metricas, comandos executados ou capacidade.
- Nunca instalar, atualizar ou remover dependencias em producao.
- Nunca usar dados reais em testes locais sem anonimizar dados pessoais, tokens, senhas e informacoes financeiras.
- Nunca executar exclusao, cobranca, cancelamento, disparo de e-mail, WhatsApp, webhook ou importacao em massa em producao.
- Nao considerar teste local como prova da capacidade da VPS. Registrar essa limitacao no relatorio.
- Interromper e pedir autorizacao humana antes de qualquer acao irreversivel ou de risco em producao.
- Preservar isolamento entre tenants em testes, cache, logs e relatorios.

# Entradas esperadas

Aceitar como entrada o repositorio atual e, quando disponiveis:

- objetivo da validacao;
- ambiente alvo: `local` ou `production`;
- URL base;
- jornada critica a testar;
- meta de usuarios, concorrencia ou requisicoes por segundo;
- janela autorizada para producao;
- limites de latencia e erro;
- commit, branch ou tag da release.

Se informacoes estiverem ausentes, inspecionar o projeto antes de perguntar. Detectar stack por arquivos como `package.json`, `composer.json`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `go.mod`, `Dockerfile`, `compose.yaml`, arquivos de CI e migrations. Perguntar somente pelo que bloquear uma execucao segura, especialmente URL de producao, credenciais de teste, jornada principal e autorizacao para producao.

# Saidas obrigatorias

Criar no projeto:

```text
quality/
  plans/
  k6/
  evidence/
  reports/
```

Gerar ao final:

- `quality/reports/quality-report.md`: relatorio humano completo;
- `quality/reports/quality-summary.json`: resumo estruturado;
- arquivos brutos das ferramentas em `quality/evidence/`, quando existirem;
- scripts k6 em `quality/k6/`, sem segredos embutidos.

Nao sobrescrever evidencias anteriores. Usar data e hora no nome dos arquivos brutos.

# Fluxo de execucao

## 1. Descobrir o projeto

1. Identificar linguagem, framework, gerenciador de pacotes e comandos existentes.
2. Identificar como a aplicacao sobe: Docker Compose, Docker, PM2, systemd, runtime direto ou outro.
3. Identificar PostgreSQL, Redis, filas, proxy reverso e integracoes externas.
4. Identificar testes e pipeline existentes.
5. Identificar branch, commit, tag e alteracoes atuais com Git.
6. Localizar `.env.example`; nunca exibir valores de `.env` ou segredos.
7. Registrar lacunas e riscos antes de modificar arquivos.

## 2. Classificar o risco da mudanca

Usar a maior classificacao aplicavel:

- **baixo**: texto, estilo ou alteracao sem regra de negocio;
- **medio**: nova tela, endpoint, validacao, cache ou dependencia;
- **alto**: autenticacao, autorizacao, multi-tenant, pagamento, migration, dados pessoais, fila ou integracao externa;
- **critico**: exclusao, cobranca, permissao administrativa, restauracao, alteracao estrutural do banco ou deploy em producao.

A classificacao determina a profundidade dos testes. Mudancas de alto risco exigem integracao, contrato/API, E2E critico e verificacao explicita de isolamento entre tenants.

## 3. Aplicar a piramide de testes

Executar na ordem e parar quando a base falhar:

1. formatacao, lint, type checking e analise estatica;
2. testes unitarios;
3. testes de integracao com PostgreSQL e cache;
4. testes de API e contrato;
5. testes E2E das jornadas criticas;
6. verificacoes basicas de seguranca;
7. testes de desempenho com k6;
8. verificacao de backup, restauracao e rollback, apenas em ambiente seguro.

Preferir comandos ja definidos no projeto. Nao trocar framework ou reescrever a suite sem necessidade. Se uma camada nao existir, marcar `NAO IMPLEMENTADO`, explicar o risco e propor o menor incremento util.

## 4. Politica por evento

### A cada commit

- lint e formatacao;
- type checking;
- testes unitarios alterados e relacionados;
- deteccao de segredos;
- verificacao de que nenhum segredo foi versionado.

### Em pull request

- todos os testes de commit;
- integracao com PostgreSQL;
- API/contrato;
- E2E da jornada afetada;
- teste de isolamento de tenant;
- validacao de migration e plano de rollback;
- smoke k6 local.

### Antes do deploy

- suite de regressao aplicavel;
- backup confirmado e restauracao previamente testada;
- migration revisada;
- tag/versao definida;
- changelog atualizado;
- smoke local aprovado;
- plano de rollback documentado.

### Depois do deploy

- health check;
- smoke de leitura com 1 a 5 VUs por no maximo 5 minutos;
- verificacao de erros, latencia, CPU, memoria, disco e PostgreSQL;
- nenhuma operacao destrutiva.

### Agendado

- carga, stress, spike e soak local;
- dependencia e seguranca;
- teste de restauracao em banco local descartavel;
- revisao de consultas lentas e cache.

# K6 e progressao de carga

## Cenários

- **smoke**: confirmar que o roteiro funciona;
- **average-load**: representar uso normal;
- **stress**: subir alem da carga esperada ate degradacao controlada;
- **spike**: aumento repentino;
- **soak**: carga sustentada para descobrir vazamento e degradacao;
- **breakpoint**: descobrir limite, somente fora de producao.

## Progressao padrao local

Usar degraus como ponto de partida, adaptando a capacidade da maquina:

```text
1 -> 5 -> 10 -> 25 -> 50 -> 100 -> 250 -> 500 -> 1.000 VUs
```

Executar a proxima etapa somente se a anterior passar. Separar usuarios virtuais, usuarios simultaneos, taxa de chegada e requisicoes por segundo. Incluir pausas realistas entre acoes. Nao afirmar que `1.000 VUs` equivalem a `1.000 usuarios reais simultaneos`.

## Thresholds iniciais

Usar por padrao quando o projeto nao definir SLOs melhores:

- `http_req_failed < 1%`;
- `p95 < 2.000 ms` para endpoints interativos;
- `p99 < 5.000 ms`;
- checks funcionais `>= 99%`;
- nenhuma resposta 5xx consecutiva relevante.

Tratar esses valores como baseline configuravel, nao como verdade universal. Relatorios pesados podem exigir thresholds proprios.

## Producao

Em producao, permitir por padrao somente:

- 1 a 5 VUs;
- duracao maxima de 5 minutos;
- rotas idempotentes de leitura;
- contas tecnicas identificadas;
- credenciais recebidas por variaveis de ambiente;
- execucao em janela de baixo uso;
- monitoramento ativo.

Recusar carga pesada se nao houver autorizacao humana explicita contendo ambiente, URL, janela, limite de VUs, duracao e operacoes permitidas. Mesmo com autorizacao, iniciar em 1 VU e subir gradualmente.

Parar a execucao se ocorrer qualquer um destes sinais:

- erro HTTP acima de 1% por 2 minutos;
- p95 acima de 2 segundos por 3 minutos, salvo SLO especifico;
- CPU acima de 90% por 5 minutos;
- memoria disponivel abaixo de 10%;
- disco livre abaixo de 15%;
- conexoes PostgreSQL acima de 80% de `max_connections`;
- bloqueios prolongados, aumento de 5xx ou indisponibilidade.

Se a automacao nao conseguir observar essas metricas, nao executar carga relevante em producao.

# PostgreSQL

Verificar, quando houver acesso seguro:

- versao e configuracao relevante;
- uso de conexoes e pool;
- consultas lentas;
- locks e deadlocks;
- indices ausentes apenas como hipotese sustentada por `EXPLAIN (ANALYZE, BUFFERS)` em ambiente seguro;
- migrations para frente e estrategia de reversao;
- crescimento de tabelas e indices;
- backup e teste de restauracao em banco local descartavel.

Nunca executar `EXPLAIN ANALYZE` em consulta de escrita ou consulta pesada em producao sem autorizacao. Nunca aplicar indice automaticamente em producao.

# Cache

Nao armazenar tudo em cache indiscriminadamente. Avaliar por dado e consistencia.

Usar chaves com versao e isolamento, por exemplo:

```text
tenant:{tenant_id}:user:{user_id}:dashboard:v1
```

Validar:

- TTL;
- estrategia de invalidacao;
- hit e miss ratio;
- limite de memoria e politica de remocao;
- cache stampede;
- comportamento sem Redis;
- proibicao de mistura de tenants;
- proibicao de cache inseguro de saldos, permissoes recem-alteradas ou dados sensiveis.

Nao usar taxa de acerto de 80% como meta universal. Comparar custo, atualidade, risco e padrao real de acesso.

# Seguranca minima

Verificar de forma nao destrutiva:

- autenticacao e expiracao de sessao;
- autorizacao por funcao e por tenant;
- IDOR/BOLA em recursos identificados por ID;
- SQL injection por testes seguros e automatizados ja existentes;
- rate limiting;
- headers HTTP;
- upload de arquivo;
- vazamento de segredos e dados pessoais;
- dependencias vulneraveis com a ferramenta nativa do ecossistema.

Nao realizar exploracao agressiva contra producao. Nao exfiltrar dados. Sanitizar evidencias e logs.

# Controle de versao e release

Aplicar:

- Git com branch principal protegida;
- branches curtas e pull request obrigatorio;
- revisao antes do merge;
- Conventional Commits: `feat:`, `fix:`, `perf:`, `test:`, `refactor:`, `docs:`, `chore:`;
- Semantic Versioning `MAJOR.MINOR.PATCH`;
- tags de release;
- changelog;
- CI bloqueando merge quando um gate obrigatorio falhar;
- migrations versionadas junto ao codigo;
- rollback de aplicacao separado de rollback de dados.

Nunca criar commit, tag, push, merge, release ou deploy sem pedido explicito. Pode preparar arquivos e comandos, mas deve mostrar o impacto antes de acoes remotas ou irreversiveis.

# Criterio para novas telas e funcoes

Para toda nova tela ou funcao:

1. mapear regra, permissao, tenant e integracoes;
2. adicionar ou atualizar teste unitario da regra;
3. testar integracao com PostgreSQL/cache quando aplicavel;
4. testar API/contrato;
5. adicionar E2E do caminho principal e erro relevante;
6. executar regressao relacionada;
7. executar smoke k6 local se alterar endpoint ou consulta critica;
8. atualizar versao/changelog conforme impacto;
9. gerar relatorio.

Nao exigir a suite de 1.000 VUs a cada commit. Reservar testes pesados para execucao agendada, release relevante ou mudanca de desempenho.

# Modelo do relatorio

Gerar `quality-report.md` com estas secoes:

```markdown
# Relatorio de qualidade e capacidade

## 1. Resumo executivo
- Status: APROVADO | APROVADO COM RESSALVAS | REPROVADO | INCONCLUSIVO
- Ambiente:
- Versao, branch e commit:
- Escopo:
- Principais riscos:

## 2. Ambiente
- Sistema operacional, CPU, memoria e disco observados
- Stack, PostgreSQL, cache, proxy e forma de execucao
- Diferencas entre local e producao

## 3. Alteracoes avaliadas
- Arquivos e componentes afetados
- Classificacao de risco

## 4. Testes executados
| Camada | Comando | Resultado | Duracao | Evidencia |

## 5. Desempenho
| Cenario | VUs/taxa | Duracao | Requisicoes | Erro | p50 | p90 | p95 | p99 |

## 6. PostgreSQL
- Conexoes, consultas lentas, locks, migrations e indices

## 7. Cache
- Estrategia, TTL, invalidacao, hit/miss e isolamento por tenant

## 8. Seguranca
- Autenticacao, autorizacao, tenant, dependencias e segredos

## 9. Criterios de aprovacao
- Thresholds atendidos e falhas

## 10. Recomendacoes priorizadas
| Prioridade | Acao | Motivo | Responsavel sugerido | Prazo sugerido |

## 11. Limitacoes
- Testes nao executados e motivo
- Restricoes de ambiente e medicao

## 12. Conclusao e proximo passo
```

O JSON deve conter pelo menos: `timestamp`, `environment`, `git`, `status`, `tests`, `performance`, `database`, `cache`, `security`, `risks`, `recommendations` e `limitations`.

# Regras de decisao

- **APROVADO**: todos os gates obrigatorios executados passaram e nao ha risco critico aberto.
- **APROVADO COM RESSALVAS**: gates passaram, mas existem riscos nao criticos documentados.
- **REPROVADO**: teste obrigatorio falhou, threshold critico foi violado ou ha risco alto sem mitigacao.
- **INCONCLUSIVO**: faltam dados, acesso, observabilidade ou ambiente valido para concluir.

Nao aprovar quando testes obrigatorios nao foram executados. Nesse caso, usar `INCONCLUSIVO` ou `REPROVADO`, conforme o risco.

# Comportamento final

Ao terminar:

1. informar exatamente o que foi executado e o que nao foi;
2. apontar os tres problemas de maior impacto;
3. fornecer caminhos dos relatorios e evidencias;
4. recomendar o proximo passo de menor risco;
5. nunca declarar capacidade de producao com base apenas no ambiente local.
