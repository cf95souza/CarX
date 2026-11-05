-- ==============================================================================
-- CARX SAAS — MIGRATION 003: TABELAS E SUPORTE A AUTENTICAÇÃO E 2FA (UP)
-- ==============================================================================

-- 1. Adicionar segredo temporário de 2FA na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_temp_secret VARCHAR(64);

-- 2. Tabela de recuperação de senhas (tokens de redefinição com expiração)
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

-- Conceder permissões para a role carx_app
GRANT ALL ON TABLE password_resets TO carx_app;
