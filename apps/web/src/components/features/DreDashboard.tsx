import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Printer,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  FileText,
  Clock,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../../services/api';
import type { DreReportDto } from '@carx/shared';

interface DreDashboardProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function getEndOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export const DreDashboard: React.FC<DreDashboardProps> = ({
  initialStartDate,
  initialEndDate,
}) => {
  const [startDate, setStartDate] = useState(initialStartDate || getStartOfMonth());
  const [endDate, setEndDate] = useState(initialEndDate || getEndOfMonth());

  const {
    data: dre,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<DreReportDto>({
    queryKey: ['dre-report', startDate, endDate],
    queryFn: () =>
      api.reports.getDre({
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      }),
  });

  const setPreset = (preset: 'current_month' | 'last_month' | 'last_90' | 'current_year') => {
    const now = new Date();
    if (preset === 'current_month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else if (preset === 'last_month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10));
    } else if (preset === 'last_90') {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'current_year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    }
  };

  const grossRevenue = dre?.grossRevenueCents ?? 0;
  const discounts = dre?.discountsCents ?? 0;
  const netRevenue = dre?.netRevenueCents ?? 0;
  const materialsCost = dre?.materialCostsCents ?? 0;
  const commissionsCost = dre?.commissionCostsCents ?? 0;
  const totalVariableCosts = materialsCost + commissionsCost;
  const contributionMargin = dre?.contributionMarginCents ?? 0;
  const marginPercent = dre?.contributionMarginPercent ?? 0;
  const pendingReceivables = dre?.pendingReceivablesCents ?? 0;
  const workOrdersCount = dre?.workOrdersCount ?? 0;
  const ticketMedioCents = workOrdersCount > 0 ? Math.round(netRevenue / workOrdersCount) : 0;

  return (
    <div className="space-y-6">
      {/* Controles de Período e Ações */}
      <Card variant="default" className="p-4 sm:p-6 bg-grafite border-aco/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
              <PieChart size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  DRE Gerencial do Servidor
                </h2>
                <Badge variant="volt">SQL Consolidado</Badge>
              </div>
              <p className="text-xs text-cinza-muted mt-0.5">
                Demonstrativo de Resultado calculado 100% no PostgreSQL com dados auditados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets Rápidos */}
            <div className="flex items-center bg-asfalto border border-aco/50 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setPreset('current_month')}
                className="px-2.5 py-1 text-[11px] font-bold text-cinza-muted hover:text-white rounded-lg transition-colors hover:bg-aco/40"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => setPreset('last_month')}
                className="px-2.5 py-1 text-[11px] font-bold text-cinza-muted hover:text-white rounded-lg transition-colors hover:bg-aco/40"
              >
                Mês Anterior
              </button>
              <button
                type="button"
                onClick={() => setPreset('last_90')}
                className="px-2.5 py-1 text-[11px] font-bold text-cinza-muted hover:text-white rounded-lg transition-colors hover:bg-aco/40"
              >
                90 Dias
              </button>
              <button
                type="button"
                onClick={() => setPreset('current_year')}
                className="px-2.5 py-1 text-[11px] font-bold text-cinza-muted hover:text-white rounded-lg transition-colors hover:bg-aco/40"
              >
                Ano
              </button>
            </div>

            {/* Inputs de Data */}
            <div className="flex items-center gap-2 bg-asfalto border border-aco/50 rounded-xl px-3 py-1.5">
              <Calendar size={14} className="text-volt" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-white outline-none font-mono"
              />
              <span className="text-cinza-muted text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-white outline-none font-mono"
              />
            </div>

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

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
              Receita Bruta
            </span>
            <div className="w-8 h-8 rounded-xl bg-volt/10 text-volt flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white font-mono">
              {formatCurrency(grossRevenue)}
            </p>
            <p className="text-[11px] text-cinza-muted mt-1">
              Descontos: <span className="text-alerta font-mono">{formatCurrency(discounts)}</span>
            </p>
          </div>
        </Card>

        {/* Receita Líquida */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
              Receita Líquida
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(netRevenue)}
            </p>
            <p className="text-[11px] text-cinza-muted mt-1">
              Volume: <strong className="text-white">{workOrdersCount} OS</strong> (Ticket: {formatCurrency(ticketMedioCents)})
            </p>
          </div>
        </Card>

        {/* Custos Variáveis (CMV + Comissões) */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
              Custos Variáveis
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-400 font-mono">
              {formatCurrency(totalVariableCosts)}
            </p>
            <p className="text-[11px] text-cinza-muted mt-1">
              Insumos: <span className="font-mono text-cinza-claro">{formatCurrency(materialsCost)}</span> | Comissões: <span className="font-mono text-cinza-claro">{formatCurrency(commissionsCost)}</span>
            </p>
          </div>
        </Card>

        {/* Margem de Contribuição */}
        <Card
          variant="default"
          className="p-5 bg-grafite border-volt/40 relative overflow-hidden shadow-lg shadow-volt/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-volt">
              Margem de Contribuição
            </span>
            <div className="w-8 h-8 rounded-xl bg-volt/20 text-volt flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-volt font-mono">
                {formatCurrency(contributionMargin)}
              </p>
              <Badge variant={marginPercent >= 40 ? 'volt' : marginPercent >= 20 ? 'alert' : 'error'}>
                {marginPercent}%
              </Badge>
            </div>
            <div className="w-full bg-asfalto h-2 rounded-full mt-2.5 overflow-hidden border border-aco">
              <div
                className="h-full bg-volt rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Alerta de Inadimplência / Pendências */}
      {pendingReceivables > 0 && (
        <div className="flex items-center justify-between p-4 bg-alerta/10 border border-alerta/30 rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-alerta flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-alerta uppercase tracking-wider">
                Atenção: Saldo em Aberto a Receber no Período
              </p>
              <p className="text-xs text-cinza-muted mt-0.5">
                Existem ordens de serviço ativas com saldo pendente de quitação totalizando{' '}
                <strong className="text-white font-mono">{formatCurrency(pendingReceivables)}</strong>.
              </p>
            </div>
          </div>
          <Badge variant="alert">Inadimplência Monitorada</Badge>
        </div>
      )}

      {/* Tabela Analítica de DRE */}
      <Card variant="default" className="p-6 bg-grafite border-aco/60">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={16} className="text-volt" />
          Demonstrativo Analítico de Resultado do Exercício
        </h3>

        <div className="divide-y divide-aco/50">
          {/* 1. Receita Bruta */}
          <div className="py-3 flex items-center justify-between text-sm">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                1
              </span>
              (+) Receita Bruta de Serviços
            </span>
            <span className="font-mono font-bold text-white">{formatCurrency(grossRevenue)}</span>
          </div>

          {/* 2. Deduções e Descontos */}
          <div className="py-3 flex items-center justify-between text-sm">
            <span className="text-cinza-muted flex items-center gap-2 pl-4">
              <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 font-mono text-[10px] flex items-center justify-center">
                2
              </span>
              (-) Deduções e Descontos Comerciais
            </span>
            <span className="font-mono text-rose-400">-{formatCurrency(discounts)}</span>
          </div>

          {/* 3. Receita Operacional Líquida */}
          <div className="py-3.5 flex items-center justify-between text-sm bg-asfalto/60 px-4 rounded-xl border border-aco/40 my-1">
            <span className="font-black text-emerald-400 uppercase tracking-tight flex items-center gap-2">
              (=) Receita Operacional Líquida (ROL)
            </span>
            <span className="font-mono font-black text-emerald-400 text-base">
              {formatCurrency(netRevenue)}
            </span>
          </div>

          {/* 4. Custos dos Insumos (CMV) */}
          <div className="py-3 flex items-center justify-between text-sm">
            <span className="text-cinza-muted flex items-center gap-2 pl-4">
              <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 font-mono text-[10px] flex items-center justify-center">
                3
              </span>
              (-) Custos de Películas, PPF e Insumos Consumidos (CMV)
            </span>
            <span className="font-mono text-rose-400">-{formatCurrency(materialsCost)}</span>
          </div>

          {/* 5. Comissões da Equipe */}
          <div className="py-3 flex items-center justify-between text-sm">
            <span className="text-cinza-muted flex items-center gap-2 pl-4">
              <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 font-mono text-[10px] flex items-center justify-center">
                4
              </span>
              (-) Comissões da Equipe Técnica
            </span>
            <span className="font-mono text-rose-400">-{formatCurrency(commissionsCost)}</span>
          </div>

          {/* 6. Margem de Contribuição Final */}
          <div className="py-4 flex items-center justify-between text-base bg-volt/10 px-4 rounded-xl border border-volt/30 my-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-volt uppercase tracking-tight">
                (=) Margem de Contribuição Operacional
              </span>
              <Badge variant="volt">
                {marginPercent}% da ROL
              </Badge>
            </div>
            <span className="font-mono font-black text-volt text-lg">
              {formatCurrency(contributionMargin)}
            </span>
          </div>

          {/* 7. Pendências a Receber */}
          <div className="py-3 flex items-center justify-between text-xs text-cinza-muted">
            <span className="flex items-center gap-2">
              <Clock size={14} className="text-alerta" />
              Saldo a Receber / Em Aberto no Período
            </span>
            <span className="font-mono font-bold text-alerta">
              {formatCurrency(pendingReceivables)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DreDashboard;
