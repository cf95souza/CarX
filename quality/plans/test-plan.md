# Plano de Testes e Qualidade — System Quality Gate (Fase 7 · T7.1 a T7.5)
**Projeto:** CarX SaaS — Plataforma Multitenant Automotiva  
**Escopo:** Homologação Completa Pós-Fase 6 (Ondas 1, 2 e 3) e Hardening da Fase 7  
**Data:** 13 de Novembro de 2026  

---

## 1. Objetivo
Executar e documentar a bateria corporativa de Qualidade Contínua, Isolamento Multitenant Dinâmico, Carga Progressiva com 100 Conexões Simultâneas (k6/Keep-Alive), Auditoria de Segurança OWASP Top 10 e Simulação de Recuperação de Desastres (DR Drill) para aprovação formal da **Fase 7** e liberação da **Fase 8 (Go-To-Market & Beta Fechado)**.

## 2. Classificação de Risco
- **Classificação:** **CRÍTICO**
- **Justificativa:** O escopo engloba 37 migrações SQL, 58 tabelas multi-tenant com RLS forçado, emissão fiscal de NFS-e com certificado digital A1 criptografado, liquidação financeira de Pix e Mercado Pago, transferências inter-lojas de franquias, sincronização offline-first e retenção ativa com cupons.

## 3. Pirâmide de Validação Aplicada
1. **Análise Estática & Compilação:** `pnpm typecheck` (`tsc -b` nos 5 pacotes) e `pnpm eslint apps packages --quiet`.
2. **Build de Produção Frontend & PWA:** `pnpm --filter @carx/web build` (106 entradas PWA) e `pnpm --filter @carx/admin build`.
3. **Isolamento Multitenant Dinâmico & Estático (T7.2):** `src/database/tenant-isolation.test.ts` inspecionando 100% das 58 tabelas com `tenant_id` no PostgreSQL e auditando estaticamente os serviços de domínio contra uso direto de `adminPool`.
4. **Auditoria de Segurança OWASP Top 10 (T7.4):** `src/security/owasp-hardening.test.ts` validando RBAC vertical, anti-IDOR horizontal, criptografia AES-256-GCM de segredos fiscais, proteção contra SQL Injection, Feature Gating por plano, Honeypot anti-bot e rejeição de JWT adulterado/`alg:none`.
5. **Suítes de Regressão Funcional (Fases 2, 3, 5 e 6 — Ondas 1, 2 e 3):** 47 suítes de testes automatizados + 27 testes E2E Playwright.
6. **Teste de Carga Progressiva até 100 Conexões Simultâneas (T7.3):** Degraus `1 -> 5 -> 10 -> 25 -> 50 -> 100 VUs` com verificação de latência (`p95 < 2000ms`) e taxa de erro (`< 1%`).
7. **Simulação Mensal de Desastre e Restauração (T7.5):** `quality/scripts/dr-restore-drill.ts` validando snapshot externo com SHA-256, deleção em cascata, restauração transacional e paridade exata de linhas (`RPO = 0`).
