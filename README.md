# 🏎️ CarX — Plataforma SaaS Multitenant para Oficinas Automotivas

O **CarX** é uma solução SaaS completa e de alto desempenho para gestão de oficinas especializadas em estética automotiva, aplicação de PPF (*Paint Protection Film*), insulfilm, vitrificação e detalhamento veicular.

O sistema opera no modelo **Monorepo** com suporte a múltiplos inquilinos (*multitenancy*), isolamento estrito de dados por Row Level Security (RLS), retaguarda própria em Node.js/TypeScript, interface em React/Tailwind com identidade visual Volt/Asfalto e containers Docker otimizados.

---

## 🏗️ Estrutura do Monorepo

O repositório é gerenciado através de workspaces com **pnpm**:

```
carx/
├── apps/
│   ├── web/         # Frontend React/Vite (Gestor, Operador PWA e Portal do Cliente)
│   ├── api/         # Backend Node.js + Fastify + TypeScript (API REST e Módulo /admin)
│   └── admin/       # Frontend React/Vite do Super Admin (Gestão de licenças e contratos)
├── packages/
│   ├── shared/      # Tipos TypeScript, enums de status da OS, schemas Zod e RBAC
│   └── ui/          # Design System CarX com Tailwind, tokens oficiais e componentes
├── infra/           # Arquivos Docker Compose, scripts de deploy e Caddyfile
├── docs/            # Documentação de arquitetura, decisões técnicas e glossário
└── .github/         # Pipelines de CI/CD do GitHub Actions
```

---

## ⚡ Pré-requisitos para Execução Local

Antes de iniciar, certifique-se de possuir instalado em sua máquina:

1. **Node.js**: Versão 20.x ou superior (LTS recomendada).
2. **pnpm**: Versão 10.x ou 12.x (`npm install -g pnpm`).
3. **Docker & Docker Desktop**: Para execução dos bancos e serviços auxiliares (PostgreSQL 16, Redis e MinIO).

---

## 🚀 Como Subir o Ambiente de Desenvolvimento

Siga os passos abaixo para configurar e rodar o projeto localmente:

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/cf95souza/CarX.git
cd CarX
pnpm install
```

### 2. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo para o seu arquivo local:
```bash
cp .env.example .env
```
*(As portas e credenciais padrão contidas no arquivo já são adequadas para o ambiente de desenvolvimento local).*

### 3. Subir os Serviços de Apoio no Docker
Suba o banco PostgreSQL, Redis e MinIO localmente:
```bash
# Executado dentro da pasta infra/ (ou via docker compose local)
docker compose -f infra/compose.dev.yml up -d
```

### 4. Iniciar as Aplicações em Modo de Desenvolvimento

Você pode rodar todo o ecossistema ou iniciar os serviços individualmente:

- **Iniciar Tudo em Paralelo:**
  ```bash
  pnpm dev
  ```
- **Iniciar apenas a API Backend (`localhost:3333`):**
  ```bash
  pnpm dev:api
  ```
- **Iniciar o Painel do Gestor / Operador Web (`localhost:5173`):**
  ```bash
  pnpm dev:web
  ```
- **Iniciar o Painel do Super Admin (`localhost:5174`):**
  ```bash
  pnpm dev:admin
  ```

---

## 🧪 Comandos de Qualidade e Validação

Para garantir integridade antes de qualquer commit ou abertura de PR:

```bash
# Validação de regras e estilo em todos os workspaces (0 erros permitidos)
pnpm lint

# Checagem estrita de tipagem TypeScript (strict: true)
pnpm typecheck

# Compilação e empacotamento de produção de todos os apps e pacotes
pnpm build
```

---

## 📚 Documentação Técnica Adicional

Consulte os guias detalhados na pasta [`docs/`](./docs/):
- [🏛️ Arquitetura de Containers e Redes](./docs/arquitetura.md)
- [📋 Registro de Decisões de Arquitetura (ADR)](./docs/decisoes.md)
- [📖 Glossário de Termos e Regras Automotivas](./docs/glossario.md)
- [🧭 Guia Mestre de Fases e Execução (fase.md)](./fase.md)
- [📜 Especificação Completa do Produto (CarX_Documento_Unico.md)](./CarX_Documento_Unico.md)
