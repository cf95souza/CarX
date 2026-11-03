# 🌐 Controle de Repositórios e Fluxo de Deploy Git — CarX

Este arquivo define a estrutura de versionamento e as regras obrigatórias de deploy para o ecossistema **CarX**.

---

## 🔗 Mapeamento de Repositórios

Existem **2 (dois) repositórios Git** no projeto:

### 1. 🛠️ Repositório Principal de Desenvolvimento (CarX)
* **URL:** `https://github.com/cf95souza/CarX.git`
* **Tipo:** Ambiente Principal de Desenvolvimento e Homologação Multitenant.
* **Função:** É o novo repositório oficial do CarX. **Toda e qualquer alteração de código, nova funcionalidade do monorepo, pacotes, CI/CD ou melhoria DEVE ser enviada (pushed) para este repositório (`origin`).**

---

### 2. 🏢 Repositório do Cliente Piloto / Legado (Lucas Envelopamento)
* **URL:** `https://github.com/LucasEnvelopamento/LucasSystem.git`
* **Tipo:** Ambiente Legado de Produção do Cliente Piloto.
* **Função:** Atende a operação legado da loja do Lucas Envelopamento até a conclusão da migração total (Fase 4 - ETL) para a nova plataforma CarX.

---

## 🚨 REGRA DE OURO DO FLUXO DE TRABALHO (NÃO VIOLAR)

> [!CAUTION]
> **NOSSO CLIENTE SÓ VAMOS ENVIAR DEPOIS DE TUDO PRONTO E TESTADO!**

1. **Primeira Etapa (Desenvolvimento CarX):** Sobe-se o código **exclusivamente** para o novo repositório oficial (`https://github.com/cf95souza/CarX.git`).
2. **Segunda Etapa (Validação):** O código é testado rigorosamente localmente (Docker Desktop) e em homologação (VPS).
3. **Terceira Etapa (Deploy Cliente / Migração):** Somente após a validação completa da Fase 4 (ETL) e homologação pelo usuário, a loja piloto é migrada.

---

## 📋 Resumo de Comandos Git

* **Atualizar nosso desenvolvimento:** `git push origin main` (onde `origin` aponta para `https://github.com/cf95souza/CarX.git`).
* **Deploy/Migração do piloto:** Executado somente após homologação formal das Fases 0 a 4.
