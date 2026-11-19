-- Migration 039 Down: Remover coluna grace_period_days da tabela platform_billing_settings
ALTER TABLE platform_billing_settings DROP COLUMN IF EXISTS grace_period_days;
