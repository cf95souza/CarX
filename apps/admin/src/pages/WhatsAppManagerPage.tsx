import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Pagination } from '../components/Pagination';
import { WhatsAppTelemetrySummaryDto, TenantWhatsAppInstanceDto } from '@carx/shared';
import {
  MessageSquareCode,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  RefreshCw,
  Zap,
  ShieldCheck,
  Building2,
  Clock,
  Radio,
  Server,
  Info,
} from 'lucide-react';

export function WhatsAppManagerPage() {
  const [telemetry, setTelemetry] = useState<WhatsAppTelemetrySummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const loadTelemetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getWhatsAppTelemetry();
      setTelemetry(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar telemetria de WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  const instances = telemetry?.instances || [];

  const filteredInstances = instances.filter((inst) => {
    if (filter === 'all') return true;
    if (filter === 'connected') return inst.status === 'CONNECTED';
    if (filter === 'pairing') return inst.status === 'PAIRING' || inst.status === 'QR_CODE';
    if (filter === 'disconnected') return inst.status === 'DISCONNECTED';
    return true;
  });

  const getStatusBadge = (status: TenantWhatsAppInstanceDto['status']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            <CheckCircle2 size={10} /> Conectado
          </span>
        );
      case 'PAIRING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <Radio size={10} className="animate-pulse" /> Pareando (Código)
          </span>
        );
      case 'QR_CODE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <QrCode size={10} /> QR Code Pendente
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
            <AlertTriangle size={10} /> Desconectado
          </span>
        );
    }
  };

  const formatLastActive = (dateStr?: string | null) => {
    if (!dateStr) return 'Sem atividade';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Sem atividade';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Telemetria Técnica de WhatsApp
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Observabilidade da infraestrutura multi-tenant desacoplada (Padrão OperaBeauty). Cada oficina conecta seu próprio número via QR Code ou Pairing Code em seu painel.
          </p>
        </div>

        <button
          onClick={loadTelemetry}
          disabled={loading}
          className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar Telemetria</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTelemetry} className="underline font-semibold ml-2">
            Tentar novamente
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gateway Daemon Health */}
        <div className="bg-grafite border border-aco/50 rounded-card p-4">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Daemon Baileys</span>
            <Server size={13} className="text-volt" />
          </div>
          <div className="font-display text-xl font-bold flex items-center gap-2">
            {telemetry?.gateway_status === 'online' ? (
              <span className="text-volt flex items-center gap-1.5 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-volt animate-pulse" />
                Operacional
              </span>
            ) : telemetry?.gateway_status === 'degraded' ? (
              <span className="text-semantic-alert flex items-center gap-1.5 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-semantic-alert" />
                Degradado
              </span>
            ) : (
              <span className="text-semantic-error flex items-center gap-1.5 text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-semantic-error" />
                Desconectado
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted mt-1.5">Microserviço M2M porta 4000</p>
        </div>

        {/* Instâncias Ativas */}
        <div className="bg-grafite border border-aco/50 rounded-card p-4">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">
            Instâncias Conectadas
          </div>
          <div className="font-display text-xl font-bold text-volt">
            {telemetry?.connected_instances || 0}{' '}
            <span className="text-xs text-muted font-normal">/ {telemetry?.total_instances || 0} total</span>
          </div>
          <p className="text-[10px] text-muted mt-1.5">Disparando laudos e OS ativas</p>
        </div>

        {/* Mensagens Hoje */}
        <div className="bg-grafite border border-aco/50 rounded-card p-4">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">
            Mensagens Hoje
          </div>
          <div className="font-display text-xl font-bold text-white">
            {telemetry?.messages_sent_today || 0}
          </div>
          <p className="text-[10px] text-muted mt-1.5">Disparos consolidados das lojas</p>
        </div>

        {/* Sessões em Pareamento */}
        <div className="bg-grafite border border-aco/50 rounded-card p-4">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">
            Em Pareamento
          </div>
          <div className="font-display text-xl font-bold text-semantic-alert">
            {telemetry?.pairing_instances || 0}
          </div>
          <p className="text-[10px] text-muted mt-1.5">Aguardando código ou QR Code</p>
        </div>

        {/* Desconexões */}
        <div className="bg-grafite border border-aco/50 rounded-card p-4">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">
            Desconectadas
          </div>
          <div className="font-display text-xl font-bold text-semantic-error">
            {telemetry?.disconnected_instances || 0}
          </div>
          <p className="text-[10px] text-muted mt-1.5">Sem aparelho pareado no momento</p>
        </div>
      </div>

      {/* Nota Arquitetural */}
      <div className="p-3.5 rounded-btn bg-volt/5 border border-volt/20 text-xs text-muted flex items-start gap-2.5">
        <Info size={16} className="text-volt shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Identidade da Loja & Gestão Descentralizada:</strong> O número de WhatsApp pertence exclusivamente à oficina cliente. O pareamento por QR Code ou Pairing Code é realizado pelo gestor da oficina em seu painel web (<code className="text-volt font-mono">apps/web ➔ Configurações ➔ WhatsApp</code>). O Super Admin monitora unicamente a saúde técnica dos nós e métricas operacionais agregadas.
        </div>
      </div>

      {/* Tabela de Instâncias */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="p-4 border-b border-aco/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-sm text-white flex items-center gap-2">
            <Building2 size={16} className="text-volt" /> Instâncias por Oficina Cliente
          </h3>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'connected', label: 'Conectadas' },
              { id: 'pairing', label: 'Em Pareamento' },
              { id: 'disconnected', label: 'Desconectadas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === tab.id
                    ? 'bg-volt text-asfalto font-semibold'
                    : 'bg-aco/40 text-muted hover:text-texto'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Oficina / Subdomínio</th>
                <th className="py-3 px-4">Número Conectado</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Disparos Hoje / Limite Diário</th>
                <th className="py-3 px-4 text-center">Última Atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && instances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando instâncias de WhatsApp...
                  </td>
                </tr>
              ) : filteredInstances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    <MessageSquareCode size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhuma instância localizada com o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredInstances
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((inst) => {
                    const percent = inst.daily_limit > 0
                      ? ((inst.daily_messages_count / inst.daily_limit) * 100).toFixed(0)
                      : '0';

                    return (
                      <tr key={inst.id} className="hover:bg-aco/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white text-sm">
                            {inst.tenant_name || 'Oficina'}
                          </div>
                          <div className="font-mono text-[10px] text-volt">
                            {inst.tenant_slug ? `${inst.tenant_slug}.carx.com.br` : 'tenant isolado'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-texto">
                          {inst.phone_number ? (
                            <span className="font-semibold text-white">+{inst.phone_number}</span>
                          ) : (
                            <span className="text-muted italic">Aguardando pareamento</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(inst.status)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-semibold text-white">
                              {inst.daily_messages_count}{' '}
                              <span className="text-muted font-normal text-[10px]">
                                / {inst.daily_limit} msg
                              </span>
                            </span>
                            <div className="w-24 h-1.5 bg-aco rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  Number(percent) > 85
                                    ? 'bg-semantic-alert'
                                    : Number(percent) > 95
                                    ? 'bg-semantic-error'
                                    : 'bg-volt'
                                }`}
                                style={{ width: `${Math.min(100, Number(percent))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                          {formatLastActive(inst.last_activity_at)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {filteredInstances.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInstances.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 15, 25, 50, 100]}
          />
        )}
      </div>
    </div>
  );
}
