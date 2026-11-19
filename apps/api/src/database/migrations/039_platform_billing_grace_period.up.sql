-- Migration 039: Adicionar coluna grace_period_days na tabela platform_billing_settings
ALTER TABLE platform_billing_settings ADD COLUMN IF NOT EXISTS grace_period_days INTEGER NOT NULL DEFAULT 5;
