# Deploy Automatizado e Rollback — CarX

Este documento descreve o pipeline de **Integração e Entrega Contínua (CI/CD)** do **CarX**, os gatilhos por ambiente, o versionamento de imagens e o procedimento de **Rollback em 1 comando**.

---

## 1. Visão Geral do Pipeline de CI/CD

O fluxo de publicação é 100% automatizado via **GitHub Actions** e **GitHub Container Registry (GHCR)**:

```
[ Desenvolvedor / PR ]
        │
        ▼
   (CI: Lint, Typecheck, Testes)
        │
   [ Merge na branch main ]
        │
        ├────────────────────────────────────────┐
        ▼                                        ▼
  [ Build das Imagens Docker ]              [ Push para GHCR ]
  (Buildx com cache GHA)            ghcr.io/cf95souza/carx-api:sha-...
        │                           ghcr.io/cf95souza/carx-web:sha-...
        ▼                           ghcr.io/cf95souza/carx-admin-web:sha-...
  [ Deploy Automático em Staging ]  ghcr.io/cf95souza/carx-wa:sha-...
  (Homologação na VPS)
        │
        ▼ (Validação / Release Tag v*.*.*)
  [ Deploy em Produção ]
  (Aprovação Manual ou Tag Git)
```

---

## 2. Ambientes e Políticas de Deploy

| Ambiente | Branch / Gatilho | Ação do Pipeline | Política de Aprovação |
|---|---|---|---|
| **Homologação (Staging)** | Push / Merge em `main` | Build de imagens `sha-<commit>` e `staging` -> SSH na VPS -> `deploy.sh staging <tag>` | **Automática** (Continuous Deployment) |
| **Produção (Production)** | Tag Git `v*.*.*` ou `workflow_dispatch` | Build com tag de release -> SSH na VPS -> `deploy.sh production <tag>` | **Aprovação Manual / Release Formal** |

---

## 3. Segredos do Repositório (GitHub Secrets)

Para que o GitHub Actions consiga acessar a VPS e executar o deploy, devem ser cadastrados no repositório (`Settings > Secrets and variables > Actions`):

| Secret | Descrição | Exemplo |
|---|---|---|
| `VPS_HOST` | IP público ou hostname do servidor | `192.241.xxx.xxx` ou `vps.carx.com.br` |
| `VPS_SSH_USER` | Usuário seguro sem root provisionado | `carx` |
| `VPS_SSH_KEY` | Chave privada SSH correspondente | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_SSH_PORT` | Porta do serviço SSH endurecido | `22` |

> [!NOTE]
> O token de publicação de imagens no GHCR (`GITHUB_TOKEN`) é fornecido nativamente pelo GitHub Actions com permissão `packages: write`.

---

## 4. O Script de Deploy (`infra/scripts/deploy.sh`)

O script de deploy é executado diretamente na VPS (ou localmente):

```bash
bash infra/scripts/deploy.sh <staging|production> [IMAGE_TAG]
```

### Etapas Executadas:
1. **Histórico para Rollback:** Registra a versão que está no ar em `~/.carx-deploy/<env>-previous.txt` antes de qualquer alteração.
2. **Atualização de Variáveis:** Atualiza `IMAGE_TAG` no arquivo de ambiente correspondente (`infra/.env.<env>`).
3. **Pull das Novas Imagens:** Faz o download das camadas atualizadas a partir do GHCR.
4. **Migrations Controladas:** Executa as migrações de banco como passo isolado pré-switch.
5. **Recriação dos Containers:** Executa `docker compose up -d --remove-orphans`.
6. **Auditoria de Saúde (Fail-Closed):** Dispara sondagens ativas em `GET /health/ready` por até 60 segundos.
7. **Rollback Preventivo Automático:** Caso a nova versão não responda com HTTP 200 dentro da janela limite, o script aciona imediatamente o `rollback.sh` restaurando a versão anterior e aborta com erro.

---

## 5. Rollback em 1 Comando (`infra/scripts/rollback.sh`)

Se qualquer anomalia não detectada em testes ocorrer em produção, o operador ou administrador pode reverter a versão instantaneamente com um único comando:

### 5.1 No Servidor VPS (Linux):
```bash
# Reverte produção para a versão anterior estável
bash infra/scripts/rollback.sh production

# Ou reverte homologação
bash infra/scripts/rollback.sh staging

# Ou reverte para um commit específico
bash infra/scripts/rollback.sh production sha-800df68
```

### 5.2 Em Desenvolvimento Local (Windows PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/rollback.ps1 -EnvTarget dev
```

### Comportamento do Rollback:
- Substitui a tag no arquivo de ambiente para a versão anterior gravada.
- Recria os containers instantaneamente via Docker Compose.
- Audita a estabilização via `/health`.
- Tempo médio de execução: **$< 10$ segundos**.
- **Idempotência:** O script inverte os ponteiros de versão, permitindo reverter e avançar com segurança.

---

## 6. Política de Migrações de Banco (Expand and Contract)

Para que o rollback de código funcione sem quebrar o banco de dados:

1. **Fase de Expansão (Deploy N):**
   - Adicionar novas colunas como opcionais (`NULL`) ou com `DEFAULT`.
   - Nunca renomear ou deletar colunas em uso pela versão anterior.
2. **Fase de Contração (Deploy N+1):**
   - Somente após a versão estar consolidada em produção e sem risco de rollback imediato, remover colunas ou tabelas descontinuadas.
