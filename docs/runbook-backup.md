# CarX — Runbook Operacional de Backup & Recuperação de Desastres (DR)

Este manual é o guia definitivo de **continuidade de negócio e tolerância a falhas** do SaaS automotivo **CarX**, atendendo à Seção 3 e Tarefa T1.4 do Documento Único de Engenharia.

> [!IMPORTANT]
> **Regra de Ouro do SRE:** Um backup só existe quando sua restauração já foi testada com sucesso. Backups não testados são apenas arquivos inúteis ocupando espaço.

---

## 🎯 1. Objetivos de Recuperação e SLA

- **RPO (Recovery Point Objective):** Máximo de **24 horas** com os dumps lógicos diários compactados (ou **< 5 minutos** com WAL archiving ativo em produção).
- **RTO (Recovery Time Objective):** Restauração total da operação em **menos de 30 minutos** em caso de perda total da máquina virtual ou corrupção de disco.
- **Estratégia 3-2-1:**
  - **3 cópias** dos dados (Produção + Volume local de backups + Storage remoto na nuvem).
  - **2 formatos/mídias** distintas (Volume Docker montado em NVMe + Arquivo `.sql.gz` em Object Storage).
  - **1 cópia fora da VPS** (Cloudflare R2, AWS S3 ou Backblaze B2 em região geográfica diferente da VPS).

---

## 📦 2. Escopo do que é Protegido

1. **Banco de Dados PostgreSQL 16 (`carx-db`)**:
   - Todas as tabelas de oficinas, ordens de serviço, clientes, fotos, checklists e histórico financeiro.
   - Retenção estrita: **7 diários**, **4 semanais**, **6 mensais**.
2. **Sessões do Gateway WhatsApp (`carx-wa`)**:
   - Volume `carx_prod_wa_sessions` contendo os tokens e credenciais das instâncias conectadas para evitar que os clientes precisem re-escanear o QR Code em caso de falha.
3. **Mídias e Fotos de Vistorias (`carx-minio` / Silo)**:
   - Fotos de entrada, saída, comparação antes/depois e PDFs de recibos/certificados.

---

## ⏰ 3. Agendamento Automático de Rotinas

As rotinas são orquestradas via contêiner dedicado `carx-backup` e cron do host Ubuntu:

| Horário (UTC-3) | Ação Executada | Responsável | Destino |
|---|---|---|---|
| **03:00** | Dump lógico completo compactado (`pg_dump`) | Contêiner `carx-backup` | Volume `/backups` |
| **03:30** | Empacotamento de sessões WA e envio off-site | Script `backup-offsite.sh` | Cloudflare R2 / S3 |
| **04:00** | Teste automatizado de restauração em banco temporário | Script `restore-test.sh` | Contêiner efêmero |

---

## 🚨 4. Procedimento de Restauração de Emergência (Passo a Passo)

### Cenário A: Recuperar o Sistema em uma Nova VPS do Zero

Caso a VPS atual queime ou seja terminada pelo provedor:

#### Passo 1: Provisionar a nova máquina e rodar o bootstrap
```bash
ssh root@<NOVO_IP>
curl -fsSL https://raw.githubusercontent.com/cf95souza/CarX/main/infra/scripts/bootstrap-vps.sh | bash
```

#### Passo 2: Clonar o repositório oficial
```bash
ssh carx@<NOVO_IP>
git clone https://github.com/cf95souza/CarX.git
cd CarX
cp .env.example .env
# Preencha as chaves e senhas no arquivo .env
```

#### Passo 3: Baixar o último bundle do storage externo
```bash
rclone copy r2:carx-backups/latest/ /var/backups/carx/
# Ou via AWS CLI:
# aws s3 cp s3://carx-backups-bucket/carx_bundle_latest.tar.gz /var/backups/carx/
```

#### Passo 4: Subir a infraestrutura base
```bash
docker compose -f infra/compose.prod.yml up -d carx-db redis minio
```

#### Passo 5: Executar a restauração do banco de dados
```bash
gunzip -c /var/backups/carx/database_full_latest.sql.gz | docker exec -i carx-db psql -U carx_admin -d carx_production
```

#### Passo 6: Restaurar as sessões do WhatsApp
```bash
docker cp /var/backups/carx/wa_sessions/. carx-wa:/data/sessions/
```

#### Passo 7: Iniciar o restante da aplicação e validar
```bash
docker compose -f infra/compose.prod.yml up -d
docker compose -f infra/compose.prod.yml ps
curl -k https://localhost/health
```

---

### Cenário B: Recuperar uma Tabela ou Dado Específico Sem Derrubar a Produção

Se um colaborador deletou acidentalmente dados de clientes ou OS:

1. Execute o script de restauração em banco temporário:
   ```bash
   infra/scripts/restore-test.sh /caminho/do/dump.sql.gz
   ```
2. O script manterá o banco temporário ativo se chamado com a flag de inspeção:
   ```bash
   docker exec -it carx-restore-temp psql -U carx_admin -d carx_restore_verify
   ```
3. Exporte a tabela específica desejada e importe de volta na produção:
   ```bash
   docker exec carx-restore-temp pg_dump -U carx_admin -d carx_restore_verify -t ordens_servico | docker exec -i carx-db psql -U carx_admin -d carx_production
   ```

---

## 🧪 5. Rotina Mensal de Teste Obrigatório

Todo primeiro domingo do mês, o script `infra/scripts/restore-test.sh` deve ser executado para conferir:
1. Tempo decorrido de restauração (deve ser menor que 10 minutos).
2. Quantidade de tabelas conferidas (`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`).
3. Ausência de corrupção de índices.
4. Registro do teste com data e responsável na planilha/canal de auditoria.

