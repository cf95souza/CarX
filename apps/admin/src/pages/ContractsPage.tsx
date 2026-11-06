import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { ContractDto } from '@carx/shared';
import {
  FileSignature,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';

export function ContractsPage() {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listContracts();
      setContracts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch =
      !search ||
      (c.tenant_name && c.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.plan_name && c.plan_name.toLowerCase().includes(search.toLowerCase())) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            <CheckCircle2 size={10} /> Ativo
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <Clock size={10} /> Período Trial
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
            <ShieldAlert size={10} /> Suspenso
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/10 text-muted border border-muted/20">
            Cancelado
          </span>
        );
      default:
        return <span className="text-muted text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Contratos e Licenças SaaS
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Gestão contratual de assinaturas ativas, ciclos de faturamento e vigência de licenças corporativas.
          </p>
        </div>

        <button
          onClick={loadContracts}
          disabled={loading}
          className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-grafite border border-aco/50 rounded-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por oficina, plano ou id..."
            className="w-full pl-9 pr-3.5 py-2 bg-asfalto/80 border border-aco rounded-input text-xs text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-muted font-medium flex items-center gap-1 mr-1">
            <Filter size={13} /> Status:
          </span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Ativos' },
            { id: 'trial', label: 'Trials' },
            { id: 'suspended', label: 'Suspensos' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === tab.id
                  ? 'bg-volt text-asfalto font-semibold'
                  : 'bg-aco/40 text-muted hover:text-texto hover:bg-aco/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadContracts} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

      {/* Tabela de Contratos */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Oficina / Contrato</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4 text-center">Ciclo</th>
                <th className="py-3 px-4 text-right">Preço Negociado</th>
                <th className="py-3 px-4 text-center">Vigência</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando contratos...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <FileSignature size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-aco/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">
                        {contract.tenant_name || 'Oficina Cliente'}
                      </div>
                      <div className="font-mono text-[10px] text-muted truncate max-w-xs">
                        ID: {contract.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-texto">
                        {contract.plan_name || 'Plano Personalizado'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="uppercase text-[11px] font-semibold text-muted bg-aco/50 px-2 py-0.5 rounded">
                        {contract.billing_cycle === 'annual' ? 'Anual' : 'Mensal'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-display font-semibold text-white">
                        {formatCurrency(contract.negotiated_price_cents)}
                      </div>
                      {contract.discount_cents > 0 && (
                        <div className="text-[10px] text-semantic-alert">
                          Desc. {formatCurrency(contract.discount_cents)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                      <div>Início: {formatDate(contract.starts_at)}</div>
                      {contract.expires_at && <div>Fim: {formatDate(contract.expires_at)}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(contract.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

