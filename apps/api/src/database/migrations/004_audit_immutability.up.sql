-- ==============================================================================
-- CARX SAAS — MIGRATION 004: TRILHA DE AUDITORIA IMUTÁVEL (UP)
-- ==============================================================================

-- 1. FUNÇÃO PARA BLOQUEIO ABSOLUTO DE ATUALIZAÇÃO OU EXCLUSÃO EM audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Permite bypass exclusivamente caso configurado para tarefas controladas de manutenção/testes
    IF current_setting('app.bypass_audit_immutability', true) = 'true' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'Audit logs are immutable: records cannot be updated or deleted (action: %, entity: %, id: %)',
        OLD.action, OLD.entity, OLD.id
        USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER DE IMUTABILIDADE EM audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- 3. ÍNDICES DE PERFORMANCE PARA CONSULTAS E FILTROS AUDITÁVEIS
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. CONCEDER PRIVILÉGIOS À ROLE carx_app
GRANT SELECT, INSERT ON TABLE audit_logs TO carx_app;
