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
  Play,
  Check,
  X,
  Plus,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<SuperadminInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estado para execução da régua de cobrança
  const [runningDunning, setRunningDunning] = useState(false);
  const [dunningFeedback, setDunningFeedback] = useState<any | null>(null);

  // Estado para modal de baixa manual
  const [payingInvoice, setPayingInvoice] = useState<SuperadminInvoiceDto | null>(null);
  const [payMethod, setPayMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Estado para modal de cancelamento
  const [cancellingInvoice, setCancellingInvoice] = useState<SuperadminInvoiceDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const handleRunDunning = async () => {
    setRunningDunning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.runDunning();
      setDunningFeedback(res);
      setSuccessMsg(
        `Régua de cobrança executada: ${res.invoicesEvaluated} fatura(s) analisada(s). ` +
        `Ações: ${res.actionsApplied.warnings} avisos (3d), ${res.actionsApplied.softRestrictions} restrições leves (7d), ` +
        `${res.actionsApplied.suspensions} suspensões em modo leitura (15d), ${res.actionsApplied.cancellations} cancelamentos (30d).`
      );
      await loadInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao rodar régua de cobrança');
    } finally {
      setRunningDunning(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!payingInvoice) return;
    setPayLoading(true);
    try {
      const res = await adminApi.payInvoice(payingInvoice.id, {
        paymentMethod: payMethod,
        notes: payNotes,
      });

      setSuccessMsg(
        res.tenantReactivated
          ? `Fatura quitada com sucesso! A oficina "${payingInvoice.tenant_name}" foi REATIVADA imediatamente e as rotas de escrita foram desbloqueadas.`
          : 'Fatura quitada com sucesso!'
      );
      setPayingInvoice(null);
      setPayNotes('');
      await loadInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao dar baixa manual na fatura');
    } finally {
      setPayLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    setCancelLoading(true);
    try {
      await adminApi.cancelInvoice(cancellingInvoice.id, cancelReason);
      setSuccessMsg(`Fatura #${cancellingInvoice.id.slice(0, 8)} cancelada com sucesso.`);
      setCancellingInvoice(null);
      setCancelReason('');
      await loadInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar fatura');
    } finally {
      setCancelLoading(false);
    }
  };

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
            Histórico financeiro das licenças, conciliação de pagamentos Pix/cartão e régua de vencimentos automática.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Rodar Régua de Cobrança */}
          <button
            onClick={handleRunDunning}
            disabled={runningDunning || loading}
            title="Executa a análise de faturas vencidas (3d, 7d, 15d, 30d)"
            className="px-3.5 py-2 bg-asfalto hover:bg-aco border border-volt/40 hover:border-volt rounded-btn text-xs font-semibold text-volt flex items-center gap-1.5 transition-all shadow-sm shadow-volt/5 disabled:opacity-50"
          >
            <Play size={13} className={runningDunning ? 'animate-spin text-volt' : 'text-volt'} />
            <span>{runningDunning ? 'Processando Régua...' : 'Executar Régua'}</span>
          </button>

          <button
            onClick={loadInvoices}
            disabled={loading}
            className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Alertas de Sucesso / Feedback */}
      {successMsg && (
        <div className="p-3.5 rounded-card bg-volt/10 border border-volt/30 text-volt text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-volt flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-volt/70 hover:text-volt">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadInvoices} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

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
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando faturas...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
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

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === 'pending' || inv.status === 'failed' ? (
                          <>
                            <button
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPayMethod(inv.payment_method as any || 'pix');
                              }}
                              className="px-2.5 py-1 bg-volt/10 hover:bg-volt/20 text-volt border border-volt/30 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Dar baixa manual com reativação imediata da oficina"
                            >
                              <Check size={12} /> Baixa Manual
                            </button>
                            <button
                              onClick={() => setCancellingInvoice(inv)}
                              className="px-2 py-1 bg-aco/30 hover:bg-semantic-error/20 text-muted hover:text-semantic-error border border-aco hover:border-semantic-error/30 rounded text-[11px] font-medium transition-colors"
                              title="Cancelar fatura pendente"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted/60">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Baixa Manual */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-asfalto/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-grafite border border-aco rounded-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-aco/50">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-volt" /> Baixa Manual de Fatura
              </h3>
              <button
                onClick={() => setPayingInvoice(null)}
                className="text-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded bg-asfalto border border-aco/40 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Oficina:</span>
                <span className="text-white font-semibold">{payingInvoice.tenant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Valor da Fatura:</span>
                <span className="text-volt font-bold">{formatCurrency(payingInvoice.amount_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Vencimento Original:</span>
                <span className="text-texto">{formatDate(payingInvoice.due_date)}</span>
              </div>
            </div>

            <div className="p-3 rounded bg-volt/5 border border-volt/20 text-xs text-muted leading-relaxed">
              <p className="text-volt font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle size={13} /> Reativação Automática da Oficina
              </p>
              Ao confirmar a baixa, se esta oficina estiver suspensa ou em modo somente leitura e não houver outras faturas críticas vencidas, o status será restaurado para <strong className="text-white">active</strong> e as rotas de gravação serão liberadas imediatamente.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Meio de Pagamento Conciliado</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full p-2 bg-asfalto border border-aco rounded-input text-white focus:outline-none focus:border-volt"
                >
                  <option value="pix">PIX (Comprovante / Transferência Instantânea)</option>
                  <option value="credit_card">Cartão de Crédito (Gateway / Maquininha Externa)</option>
                  <option value="boleto">Boleto Bancário Liquidado</option>
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Observações Internas (Opcional)</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Conciliado via extrato Itaú / Comprovante enviado via WhatsApp"
                  rows={2}
                  className="w-full p-2 bg-asfalto border border-aco rounded-input text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-aco/40">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                disabled={payLoading}
                className="px-3 py-1.5 bg-aco/30 hover:bg-aco text-texto rounded text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                disabled={payLoading}
                className="px-4 py-1.5 bg-volt hover:bg-volt-light text-asfalto font-bold rounded text-xs flex items-center gap-1.5 shadow-sm shadow-volt/20 disabled:opacity-50"
              >
                {payLoading ? 'Processando...' : 'Confirmar Baixa e Reativação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Fatura */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-asfalto/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-grafite border border-aco rounded-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-aco/50">
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-semantic-error" /> Cancelar Fatura
              </h3>
              <button
                onClick={() => setCancellingInvoice(null)}
                className="text-muted hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Deseja realmente cancelar a fatura <strong className="text-white">#{cancellingInvoice.id.slice(0, 8)}</strong> no valor de <strong className="text-white">{formatCurrency(cancellingInvoice.amount_cents)}</strong> de <strong className="text-white">{cancellingInvoice.tenant_name}</strong>?
            </p>

            <div>
              <label className="block text-muted text-xs font-medium mb-1">Motivo do Cancelamento</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Emissão indevida / Renegociação de plano"
                className="w-full p-2 bg-asfalto border border-aco rounded-input text-xs text-white placeholder:text-muted/60 focus:outline-none focus:border-volt"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-aco/40">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                disabled={cancelLoading}
                className="px-3 py-1.5 bg-aco/30 hover:bg-aco text-texto rounded text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-3.5 py-1.5 bg-semantic-error hover:bg-semantic-error/80 text-white font-bold rounded text-xs disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
