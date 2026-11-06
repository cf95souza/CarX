import React, { useEffect, useState } from 'react';
import { adminApi, AdminAuditLogItem } from '../services/api';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Globe,
  ChevronDown,
  ChevronUp,
  FileCode2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.listAuditLogs({ page: pageNum, limit: 15 });
      setLogs(response.data);
      setPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar trilha de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionColor = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('CANCEL')) {
      return 'bg-semantic-error/10 text-semantic-error border-semantic-error/20';
    }
    if (action.includes('IMPERSONATE')) {
      return 'bg-semantic-alert/10 text-semantic-alert border-semantic-alert/20';
    }
    if (action.includes('CREATE') || action.includes('REACTIVATE')) {
      return 'bg-volt/10 text-volt border-volt/20';
    }
    return 'bg-aco/40 text-texto border-aco';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Trilha de Auditoria Imutável
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Registro indelével de compliance e segurança de todas as intervenções administrativas corporativas.
          </p>
        </div>

        <button
          onClick={() => loadLogs(page)}
          disabled={loading}
          className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar Trilha</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadLogs(page)} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

      {/* Tabela de Logs */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Operador Super Admin</th>
                <th className="py-3 px-4">Ação Executada</th>
                <th className="py-3 px-4">Entidade Alvo</th>
                <th className="py-3 px-4 text-center">IP & Origem</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando registros imutáveis...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <ShieldCheck size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-aco/20 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono text-[11px] text-muted whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{log.actor_name}</div>
                          <div className="text-[10px] text-muted">{log.actor_email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getActionColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-texto">{log.entity_type}</div>
                          <div className="font-mono text-[10px] text-muted truncate max-w-[120px]">
                            {log.entity_id || 'Global'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-muted">
                          {log.ip_address || '127.0.0.1'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 rounded text-muted hover:text-white"
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>

                      {/* Linha Expansível com JSON de Auditoria */}
                      {isExpanded && (
                        <tr className="bg-asfalto/90">
                          <td colSpan={6} className="p-4">
                            <div className="rounded-btn bg-asfalto border border-aco p-3">
                              <div className="flex items-center gap-1.5 text-volt text-xs font-semibold mb-2">
                                <FileCode2 size={14} />
                                <span>Payload e Metadados de Auditoria:</span>
                              </div>
                              <pre className="font-mono text-[11px] text-texto/90 overflow-x-auto whitespace-pre-wrap select-all">
                                {JSON.stringify(
                                  {
                                    id: log.id,
                                    action: log.action,
                                    entity_type: log.entity_type,
                                    entity_id: log.entity_id,
                                    actor: {
                                      name: log.actor_name,
                                      email: log.actor_email,
                                    },
                                    ip_address: log.ip_address,
                                    user_agent: log.user_agent,
                                    details: log.details,
                                    timestamp: log.created_at,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-aco/40 bg-asfalto/40 flex items-center justify-between text-xs text-muted">
            <span>
              Total de <strong>{totalCount}</strong> eventos auditados
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-btn bg-aco/40 hover:bg-aco text-texto disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-btn bg-aco/40 hover:bg-aco text-texto disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

