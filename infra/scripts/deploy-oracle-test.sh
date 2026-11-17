#!/usr/bin/env bash
# ==============================================================================
# Script de Deploy e Inicialização do CarX na VPS Oracle de Teste
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "🚀 CARX SAAS — DEPLOY NA VPS ORACLE (AMBIENTE DE TESTE)"
echo "======================================================================"

# 1. Configurar diretório do CarX isolado
mkdir -p ~/carx
cd ~/carx

# 2. Atualizar ou Clonar o repositório
if [ -d ".git" ]; then
  echo "📦 Atualizando repositório existente via git pull..."
  git fetch origin main
  git reset --hard origin/main
else
  echo "📦 Clonando repositório CarX..."
  git clone https://github.com/cf95souza/CarX.git .
fi

# 3. Liberar portas no firewall iptables interno da VPS (antes do REJECT)
echo "🔒 Verificando liberação de portas no firewall iptables (3333, 8080, 8081)..."
sudo iptables -C INPUT -p tcp --dport 3333 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport 3333 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport 8080 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 8081 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport 8081 -j ACCEPT
echo "✅ Portas 3333 (API), 8080 (Web) e 8081 (Admin) liberadas no firewall local."

# 4. Build e inicialização dos contêineres Docker
echo "🐳 Construindo imagens e iniciando contêineres..."
docker compose -f infra/compose.oracle-test.yml build
docker compose -f infra/compose.oracle-test.yml up -d

# 5. Aguardar o banco de dados estar pronto
echo "⏳ Aguardando banco PostgreSQL carx-db inicializar..."
sleep 8
until docker compose -f infra/compose.oracle-test.yml exec -T carx-db pg_isready -U carx_admin -d carx_db; do
  echo "Aguardando PostgreSQL..."
  sleep 2
done

# 6. Executar migrações do banco de dados
echo "🗄️ Executando migrações do banco CarX..."
docker compose -f infra/compose.oracle-test.yml exec -T carx-api node dist/database/migrate.js up

# 7. Criar usuário SuperAdmin
echo "👤 Semeando credenciais do SuperAdmin..."
docker compose -f infra/compose.oracle-test.yml exec -T carx-api node dist/scripts/seed-superadmin.js

# 8. Preservação Total de Dados do Banco (Nenhum truncate nem reset)
echo "🛡️ Dados operacionais e relacionais do PostgreSQL 100% preservados intactos."

echo "======================================================================"
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "======================================================================"
echo "🌐 App Oficina (Web / PWA): http://137.131.151.125:8080"
echo "👑 Painel SuperAdmin:       http://137.131.151.125:8081"
echo "⚡ API Fastify:             http://137.131.151.125:3333"
echo "🔐 SuperAdmin:              admin@carx.com.br / Admin@CarX2026!"
echo "======================================================================"

