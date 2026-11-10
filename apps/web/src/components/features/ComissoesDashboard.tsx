import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge, Button, Input } from '@carx/ui';
import { api } from '../../services/api';
import type { CommissionEntryDto } from '@carx/shared';

interface ComissoesDashboardProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const ComissoesDashboard: React.FC<ComissoesDashboardProps> = ({
  initialStartDate,
  initialEndDate,
}) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'paid'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');

  const {
    data: entries = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CommissionEntryDto[]>({
    queryKey: ['commissions-entries', statusFilter, startDate, endDate],
    queryFn: () =>
      api.commissions.listEntries({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      }),
  });

  const payMutation = useMutation({
    mutationFn: (entryId: string) => api.commissions.payEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dre-report'] });
    },
  });

  const totalCents = entries.reduce((acc, curr) => acc + curr.commissionCents, 0);
  const pendingCents = entries
    .filter((e) => e.status === 'pending')
    .reduce((acc, curr) => acc + curr.commissionCents, 0);
  const paidCents = entries
    .filter((e) => e.status === 'paid')
    .reduce((acc, curr) => acc + curr.commissionCents, 0);

  const filteredEntries = entries.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.technicianName?.toLowerCase().includes(term) ||
      String(e.osNumber || '').toLowerCase().includes(term) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Comissões */}
      <Card variant="default" className="p-4 sm:p-6 bg-grafite border-aco/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Extrato & Liquidação de Comissões
                </h2>
                <Badge variant="volt">Auditado por OS</Badge>
              </div>
              <p className="text-xs text-cinza-muted mt-0.5">
                Cálculo automático de comissões por colaborador baseado em regras pré-estabelecidas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="default" className="p-5 bg-grafite border-aco/50">
          <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
            Total em Comissões
          </span>
          <p className="text-2xl font-black text-white font-mono mt-2">
            {formatCurrency(totalCents)}
          </p>
          <p className="text-[11px] text-cinza-muted mt-1">
            {entries.length} lançamentos apurados
          </p>
        </Card>

        <Card variant="default" className="p-5 bg-grafite border-alerta/40">
          <span className="text-xs font-black uppercase tracking-wider text-alerta">
            Comissões Pendentes
          </span>
          <p className="text-2xl font-black text-alerta font-mono mt-2">
            {formatCurrency(pendingCents)}
          </p>
          <p className="text-[11px] text-cinza-muted mt-1">
            Aguardando liquidação financeira
          </p>
        </Card>

        <Card variant="default" className="p-5 bg-grafite border-emerald-500/40">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Comissões Liquidadas (Pagas)
          </span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-2">
            {formatCurrency(paidCents)}
          </p>
          <p className="text-[11px] text-cinza-muted mt-1">
            Comprovantes e baixas emitidas
          </p>
        </Card>
      </div>

      {/* Filtros e Tabela de Lançamentos */}
      <Card variant="default" className="p-6 bg-grafite border-aco/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center bg-asfalto border border-aco/50 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-volt text-asfalto shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Todos ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-alerta text-asfalto shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Pendentes ({entries.filter((e) => e.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-emerald-500 text-white shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Pagas ({entries.filter((e) => e.status === 'paid').length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por técnico, OS ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Tabela de Extrato */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/60 text-cinza-muted uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Técnico</th>
                <th className="py-3 px-3">OS</th>
                <th className="py-3 px-3 text-right">Valor Bruto</th>
                <th className="py-3 px-3 text-right">Dedução Insumos</th>
                <th className="py-3 px-3 text-right">Comissão</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/40">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-asfalto/50 transition-colors">
                  <td className="py-3.5 px-3">
                    <p className="font-bold text-white">{entry.technicianName || 'Técnico'}</p>
                    <span className="text-[10px] text-cinza-muted font-mono">
                      {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-mono font-bold text-volt">
                      OS #{entry.osNumber ?? 'S/N'}
                    </p>
                    {entry.notes && (
                      <p className="text-[11px] text-cinza-muted truncate max-w-xs">
                        {entry.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-cinza-claro">
                    {formatCurrency(entry.grossAmountCents)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                    -{formatCurrency(entry.deductionsCents)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                    {formatCurrency(entry.commissionCents)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <Badge
                      variant={entry.status === 'paid' ? 'volt' : 'alert'}
                    >
                      {entry.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {entry.status === 'pending' ? (
                      <Button
                        variant="volt"
                        size="sm"
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate(entry.id)}
                        className="text-[11px] py-1 px-2.5 h-auto"
                      >
                        Liquidar
                      </Button>
                    ) : (
                      <span className="text-[11px] text-cinza-muted flex items-center justify-end gap-1 font-mono">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('pt-BR') : 'Pago'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-cinza-muted">
                    Nenhum lançamento de comissão encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ComissoesDashboard;
