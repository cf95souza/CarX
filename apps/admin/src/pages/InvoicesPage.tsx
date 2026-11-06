import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { SuperadminInvoiceDto } from '@carx/shared';
import {
  Receipt,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  QrCode,
  FileText,
} from 'lucide-react';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<SuperadminInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listInvoices();
      setInvoices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesFilter = filter === 'all' || inv.status === filter;
    const matchesSearch =
      !search ||
      (inv.tenant_name && inv.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
      inv.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            <CheckCircle2 size={10} /> Pago
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <Clock size={10} /> Pendente
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
            <AlertCircle size={10} /> Vencido / Falho
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/10 text-muted border border-muted/20">
            Cancelado
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-info/10 text-semantic-info border border-semantic-info/20">
            Estornado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix':
        return <QrCode size={13} className="text-volt" />;
      case 'credit_card':
        return <CreditCard size={13} className="text-semantic-info" />;
      case 'boleto':
        return <FileText size={13} className="text-muted" />;
      default:
        return <DollarSign size={13} className="text-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Faturas e Cobranças SaaS
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Histórico financeiro das licenças, conciliação de pagamentos Pix, cartão e régua de vencimentos.
          </p>
        </div>

        <button
          onClick={loadInvoices}
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
            placeholder="Buscar por oficina ou ID da fatura..."
            className="w-full pl-9 pr-3.5 py-2 bg-asfalto/80 border border-aco rounded-input text-xs text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-muted font-medium flex items-center gap-1 mr-1">
            <Filter size={13} /> Status:
          </span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'paid', label: 'Pagas' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'failed', label: 'Vencidas' },
            { id: 'cancelled', label: 'Canceladas' },
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
          <button onClick={loadInvoices} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

      {/* Tabela de Faturas */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Fatura / Oficina</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Método</th>
                <th className="py-3 px-4 text-center">Vencimento</th>
                <th className="py-3 px-4 text-center">Data Pagamento</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando faturas...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Receipt size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-aco/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">
                        {inv.tenant_name || 'Oficina Cliente'}
                      </div>
                      <div className="font-mono text-[10px] text-muted">
                        Fatura #{inv.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-display font-semibold text-white text-sm">
                        {formatCurrency(inv.amount_cents)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-aco/40 text-[11px] font-medium text-texto">
                        {getPaymentMethodIcon(inv.payment_method)}
                        <span className="uppercase text-[10px]">{inv.payment_method}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                      {formatDate(inv.due_date)}
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                      {inv.paid_at ? (
                        <span className="text-volt font-medium">{formatDate(inv.paid_at)}</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
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

