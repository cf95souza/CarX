import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import { SaasMetricsDto } from '@carx/shared';
import {
  DollarSign,
  TrendingUp,
  Building2,
  AlertTriangle,
  Clock,
  HardDrive,
  Users,
  Wrench,
  Layers,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  FileCheck2,
} from 'lucide-react';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<SaasMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSaasMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Painel Geral do SaaS
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitoramento em tempo real de receita recorrente, ciclo de vida de clientes e utilização global.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/tenants/new"
            className="px-3.5 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20"
          >
            <PlusCircle size={15} />
            <span>Provisionar Oficina</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadMetrics} className="underline font-semibold ml-2">
            Tentar novamente
          </button>
        </div>
      )}

      {loading && !metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-grafite border border-aco/40 rounded-card" />
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MRR Card */}
            <div className="bg-grafite border border-aco/50 rounded-card p-5 relative overflow-hidden transition-card hover:border-aco">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">MRR Atual</span>
                <div className="w-8 h-8 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-white tracking-tight">
                {formatCurrency(metrics.mrr_cents)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted">
                <span className="text-volt font-medium">ARR Projetado:</span>
                <span>{formatCurrency(metrics.arr_cents)}</span>
              </div>
            </div>

            {/* Oficinas Ativas Card */}
            <div className="bg-grafite border border-aco/50 rounded-card p-5 relative overflow-hidden transition-card hover:border-aco">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Oficinas Ativas</span>
                <div className="w-8 h-8 rounded-lg bg-semantic-info/10 border border-semantic-info/20 flex items-center justify-center text-semantic-info">
                  <Building2 size={16} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-white tracking-tight">
                {metrics.active_tenants} <span className="text-xs text-muted font-normal">/ {metrics.total_tenants} total</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
                <span className="flex items-center gap-1 text-semantic-alert">
                  <Clock size={11} /> {metrics.trialing_tenants} trials
                </span>
                <span>•</span>
                <span className="text-semantic-error">
                  {metrics.suspended_tenants} suspensas
                </span>
              </div>
            </div>

            {/* Churn Rate Card */}
            <div className="bg-grafite border border-aco/50 rounded-card p-5 relative overflow-hidden transition-card hover:border-aco">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Churn</span>
                <div className="w-8 h-8 rounded-lg bg-aco/80 border border-aco flex items-center justify-center text-muted">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-white tracking-tight">
                {metrics.churn_rate_percent.toFixed(1)}%
              </div>
              <p className="mt-2 text-[11px] text-muted">
                {metrics.cancelled_tenants} cancelamentos no período
              </p>
            </div>

            {/* Inadimplência Card */}
            <div className="bg-grafite border border-aco/50 rounded-card p-5 relative overflow-hidden transition-card hover:border-aco">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Inadimplência</span>
                <div className="w-8 h-8 rounded-lg bg-semantic-error/10 border border-semantic-error/20 flex items-center justify-center text-semantic-error">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-semantic-error tracking-tight">
                {formatCurrency(metrics.overdue_amount_cents)}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                {metrics.overdue_invoices_count} faturas em atraso
              </p>
            </div>
          </div>

          {/* Grid de Seções: Distribuição de Planos & Infraestrutura Global */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela de Receita por Plano (2 colunas) */}
            <div className="lg:col-span-2 bg-grafite border border-aco/50 rounded-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-aco/30">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-volt" />
                    <h2 className="font-display font-semibold text-sm text-white">
                      Distribuição de Receita por Plano
                    </h2>
                  </div>
                  <span className="text-xs text-muted">Base de Assinaturas</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-aco/40 text-muted uppercase font-semibold text-[10px]">
                        <th className="py-2.5 px-3">Plano</th>
                        <th className="py-2.5 px-3 text-center">Oficinas</th>
                        <th className="py-2.5 px-3 text-right">MRR Gerado</th>
                        <th className="py-2.5 px-3 text-right">% do MRR Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-aco/20">
                      {metrics.revenue_by_plan.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted">
                            Nenhum plano com oficinas ativas no momento.
                          </td>
                        </tr>
                      ) : (
                        metrics.revenue_by_plan.map((item) => {
                          const percent =
                            metrics.mrr_cents > 0
                              ? ((item.total_mrr_cents / metrics.mrr_cents) * 100).toFixed(1)
                              : '0.0';
                          return (
                            <tr key={item.plan_id} className="hover:bg-aco/20 transition-colors">
                              <td className="py-3 px-3 font-medium text-texto">
                                <span className="font-semibold text-white">{item.plan_name}</span>
                                <span className="text-[10px] text-muted block uppercase">{item.plan_slug}</span>
                              </td>
                              <td className="py-3 px-3 text-center text-muted font-medium">
                                {item.tenants_count}
                              </td>
                              <td className="py-3 px-3 text-right font-display font-semibold text-texto">
                                {formatCurrency(item.total_mrr_cents)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <span className="font-medium text-volt">{percent}%</span>
                                  <div className="w-16 h-1.5 bg-aco rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-volt rounded-full"
                                      style={{ width: `${Math.min(100, Number(percent))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-aco/30 flex items-center justify-between text-xs text-muted">
                <span>Régua de cobrança automática e estorno integrados</span>
                <Link to="/contracts" className="text-volt hover:underline flex items-center gap-1 font-medium">
                  Ver todos os contratos <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            {/* Utilização Global de Recursos (1 coluna) */}
            <div className="bg-grafite border border-aco/50 rounded-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-aco/30">
                  <div className="flex items-center gap-2">
                    <HardDrive size={16} className="text-volt" />
                    <h2 className="font-display font-semibold text-sm text-white">
                      Utilização Global
                    </h2>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-semantic-success bg-semantic-success/10 px-2 py-0.5 rounded-full">
                    Cluster Saudável
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Total Units */}
                  <div className="flex items-center justify-between p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-aco/50 flex items-center justify-center text-volt">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-texto">Filiais Provisionadas</div>
                        <div className="text-[11px] text-muted">Unidades operacionais</div>
                      </div>
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {metrics.global_usage.total_units}
                    </div>
                  </div>

                  {/* Total Users */}
                  <div className="flex items-center justify-between p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-aco/50 flex items-center justify-center text-volt">
                        <Users size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-texto">Usuários Ativos</div>
                        <div className="text-[11px] text-muted">Operadores & Gestores</div>
                      </div>
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {metrics.global_usage.total_users}
                    </div>
                  </div>

                  {/* Total Work Orders */}
                  <div className="flex items-center justify-between p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-aco/50 flex items-center justify-center text-volt">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-texto">Ordens de Serviço</div>
                        <div className="text-[11px] text-muted">Processadas no cluster</div>
                      </div>
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {metrics.global_usage.total_work_orders}
                    </div>
                  </div>

                  {/* Storage Bytes */}
                  <div className="flex items-center justify-between p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-aco/50 flex items-center justify-center text-volt">
                        <HardDrive size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-texto">Armazenamento S3</div>
                        <div className="text-[11px] text-muted">Fotos, laudos e termos</div>
                      </div>
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {formatBytes(metrics.global_usage.total_storage_bytes)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-aco/30 text-center">
                <Link
                  to="/audit"
                  className="text-xs text-muted hover:text-texto inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck2 size={13} />
                  <span>Consultar Trilha de Auditoria</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

