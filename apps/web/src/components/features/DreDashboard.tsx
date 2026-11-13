import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Clock,
  Plus,
  Trash2,
  CreditCard,
  Users,
  Wallet,
  Building2,
  Receipt,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../../services/api';
import type {
  AdvancedDreReportDto,
  CashFlowProjectionDto,
  FinancialBillDto,
  FinancialCategoryDto,
  CommissionEntryDto,
  BatchPayCommissionsInputDto,
} from '@carx/shared';

interface DreDashboardProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

type DreSubTab = 'DRE_EBITDA' | 'CASH_FLOW' | 'BILLS' | 'COMMISSIONS_BATCH';

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
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<DreSubTab>('DRE_EBITDA');

  // Filtros de Período do DRE
  const [startDate, setStartDate] = useState(initialStartDate || getStartOfMonth());
  const [endDate, setEndDate] = useState(initialEndDate || getEndOfMonth());

  // Filtros de Fluxo de Caixa
  const [cashFlowHorizon, setCashFlowHorizon] = useState<number>(30);

  // Filtros de Contas a Pagar / Receber
  const [billTypeFilter, setBillTypeFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [billStatusFilter, setBillStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Estado do Modal de Nova Conta
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [newBillType, setNewBillType] = useState<'payable' | 'receivable'>('payable');
  const [newBillDesc, setNewBillDesc] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillDueDate, setNewBillDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBillSupplier, setNewBillSupplier] = useState('');
  const [newBillCategoryId, setNewBillCategoryId] = useState('');

  // Estado de Fechamento de Comissões em Lote
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [batchPayMethod, setBatchPayMethod] = useState<string>('pix');
  const [batchPaySuccessMsg, setBatchPaySuccessMsg] = useState<string | null>(null);

  // --- QUERIES ---

  // 1. DRE Gerencial Avançado
  const {
    data: dre,
    isLoading: isLoadingDre,
    isFetching: isFetchingDre,
    refetch: refetchDre,
  } = useQuery<AdvancedDreReportDto>({
    queryKey: ['dre-advanced-report', startDate, endDate],
    queryFn: () =>
      api.reports.getAdvancedDre({
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      }),
  });

  // 2. Projeção de Fluxo de Caixa
  const {
    data: cashFlow,
    isLoading: isLoadingCashFlow,
    refetch: refetchCashFlow,
  } = useQuery<CashFlowProjectionDto>({
    queryKey: ['cash-flow-projection', cashFlowHorizon],
    queryFn: () => api.financial.getCashFlowProjection(cashFlowHorizon),
    enabled: activeSubTab === 'CASH_FLOW',
  });

  // 3. Contas a Pagar e Receber
  const {
    data: billsData,
    isLoading: isLoadingBills,
    refetch: refetchBills,
  } = useQuery({
    queryKey: ['financial-bills', billTypeFilter, billStatusFilter],
    queryFn: () =>
      api.financial.listBills({
        type: billTypeFilter === 'all' ? undefined : billTypeFilter,
        status: billStatusFilter === 'all' ? undefined : billStatusFilter,
        limit: 100,
      }),
    enabled: activeSubTab === 'BILLS',
  });

  // 4. Categorias Financeiras (Plano de Contas)
  const { data: categories = [] } = useQuery<FinancialCategoryDto[]>({
    queryKey: ['financial-categories'],
    queryFn: () => api.financial.listCategories(),
  });

  // 5. Lista de Membros/Técnicos
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['tenant-members'],
    queryFn: () => api.members.list(),
  });

  // 6. Lançamentos de Comissões Pendentes
  const {
    data: pendingEntries = [],
    isLoading: isLoadingEntries,
    refetch: refetchEntries,
  } = useQuery<CommissionEntryDto[]>({
    queryKey: ['commissions-pending-entries', selectedTechId],
    queryFn: () =>
      api.commissions.listEntries({
        technicianId: selectedTechId || undefined,
        status: 'pending',
      }),
    enabled: activeSubTab === 'COMMISSIONS_BATCH',
  });

  // --- MUTAÇÕES ---

  // Criar Conta
  const createBillMutation = useMutation({
    mutationFn: (payload: any) => api.financial.createBill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dre-advanced-report'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
      setIsNewBillModalOpen(false);
      setNewBillDesc('');
      setNewBillAmount('');
      setNewBillSupplier('');
    },
  });

  // Quitar Conta
  const payBillMutation = useMutation({
    mutationFn: (billId: string) => api.financial.payBill(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dre-advanced-report'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
    },
  });

  // Excluir Conta
  const deleteBillMutation = useMutation({
    mutationFn: (billId: string) => api.financial.deleteBill(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dre-advanced-report'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
    },
  });

  // Fechamento em Lote de Comissões
  const batchPayMutation = useMutation({
    mutationFn: (payload: BatchPayCommissionsInputDto) =>
      api.commissions.batchPay(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['commissions-pending-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dre-advanced-report'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-projection'] });
      setSelectedEntryIds([]);
      setBatchPaySuccessMsg(
        `Lote liquidado com sucesso! ${res.paidCount} comissões quitadas (${formatCurrency(res.totalPaidCents)}) e despesa registrada no Contas a Pagar.`
      );
      setTimeout(() => setBatchPaySuccessMsg(null), 6000);
    },
  });

  // Presets Rápidos de Período
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

  // Handler de Criação de Conta
  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newBillAmount.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0 || !newBillDesc.trim()) return;

    createBillMutation.mutate({
      type: newBillType,
      categoryId: newBillCategoryId || undefined,
      description: newBillDesc.trim(),
      amountCents: Math.round(amountVal * 100),
      dueDate: newBillDueDate,
      supplierCustomerName: newBillSupplier.trim() || undefined,
    });
  };

  // Handler de Seleção de Todos os Lançamentos
  const handleToggleSelectAllEntries = () => {
    if (selectedEntryIds.length === pendingEntries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(pendingEntries.map((e) => e.id));
    }
  };

  const handleToggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedCommissionsTotalCents = pendingEntries
    .filter((e) => selectedEntryIds.includes(e.id))
    .reduce((acc, curr) => acc + curr.commissionCents, 0);

  // Variáveis do DRE
  const grossRevenue = dre?.grossRevenueCents ?? 0;
  const discounts = dre?.deductions?.discountsCents ?? 0;
  const issTaxes = dre?.deductions?.issTaxesCents ?? 0;
  const totalDeductions = dre?.deductions?.totalDeductionsCents ?? 0;
  const netRevenue = dre?.netRevenueCents ?? 0;

  const matCosts = dre?.variableCosts?.materialStockCostsCents ?? 0;
  const spoolCosts = dre?.variableCosts?.spoolRollCostsCents ?? 0;
  const commCosts = dre?.variableCosts?.technicianCommissionsCents ?? 0;
  const totalVariableCosts = dre?.variableCosts?.totalVariableCostsCents ?? 0;

  const contribMargin = dre?.contributionMarginCents ?? 0;
  const contribMarginPct = dre?.contributionMarginPercent ?? 0;

  const rentCosts = dre?.fixedExpenses?.rentCents ?? 0;
  const utilCosts = dre?.fixedExpenses?.utilitiesCents ?? 0;
  const salariesCosts = dre?.fixedExpenses?.salariesCents ?? 0;
  const softwareCosts = dre?.fixedExpenses?.softwareCents ?? 0;
  const otherFixed = dre?.fixedExpenses?.otherFixedCents ?? 0;
  const totalFixedExpenses = dre?.fixedExpenses?.totalFixedExpensesCents ?? 0;

  const marketingCosts = dre?.operatingExpenses?.marketingCents ?? 0;
  const toolsCosts = dre?.operatingExpenses?.toolsMaintenanceCents ?? 0;
  const otherOperating = dre?.operatingExpenses?.otherOperatingCents ?? 0;
  const totalOperatingExpenses = dre?.operatingExpenses?.totalOperatingExpensesCents ?? 0;

  const ebitda = dre?.ebitdaCents ?? 0;
  const ebitdaMargin = dre?.ebitdaMarginPercent ?? 0;
  const netIncome = dre?.netIncomeCents ?? 0;
  const workOrdersCount = dre?.workOrdersCount ?? 0;
  const ticketMedioCents = dre?.ticketMedioCents ?? 0;
  const pendingReceivables = dre?.pendingReceivablesCents ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. NAVEGAÇÃO DE SUB-ABAS FINANCEIRAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-grafite border border-aco/60 p-2 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('DRE_EBITDA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'DRE_EBITDA'
                ? 'bg-volt text-asfalto shadow-md shadow-volt/20'
                : 'text-cinza-muted hover:text-white hover:bg-asfalto'
            }`}
          >
            <PieChart size={15} />
            DRE Gerencial & EBITDA
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CASH_FLOW')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'CASH_FLOW'
                ? 'bg-volt text-asfalto shadow-md shadow-volt/20'
                : 'text-cinza-muted hover:text-white hover:bg-asfalto'
            }`}
          >
            <TrendingUp size={15} />
            Projeção de Fluxo de Caixa
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('BILLS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'BILLS'
                ? 'bg-volt text-asfalto shadow-md shadow-volt/20'
                : 'text-cinza-muted hover:text-white hover:bg-asfalto'
            }`}
          >
            <Receipt size={15} />
            Contas a Pagar & Receber
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('COMMISSIONS_BATCH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'COMMISSIONS_BATCH'
                ? 'bg-volt text-asfalto shadow-md shadow-volt/20'
                : 'text-cinza-muted hover:text-white hover:bg-asfalto'
            }`}
          >
            <Users size={15} />
            Fechamento de Comissões
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'BILLS' && (
            <Button
              variant="volt"
              size="sm"
              onClick={() => setIsNewBillModalOpen(true)}
              className="gap-1.5"
            >
              <Plus size={14} />
              Nova Conta
            </Button>
          )}
        </div>
      </div>

      {/* 2. SUB-ABA 1: DRE GERENCIAL & EBITDA REAL */}
      {activeSubTab === 'DRE_EBITDA' && (
        <div className="space-y-6">
          {/* Seletor de Período do DRE */}
          <Card variant="default" className="p-4 sm:p-5 bg-grafite border-aco/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
                  <PieChart size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Demonstrativo do Resultado do Exercício
                  </h3>
                  <p className="text-xs text-cinza-muted">
                    Cálculo automatizado no PostgreSQL contemplando Bobinas PPF (T6.5), Impostos NFS-e (T6.10) e Despesas Fixas
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() => refetchDre()}
                  disabled={isFetchingDre}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} className={isFetchingDre ? 'animate-spin' : ''} />
                  Atualizar
                </Button>
              </div>
            </div>
          </Card>

          {/* Cards Executivos de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita Líquida */}
            <Card variant="default" className="p-5 bg-grafite border-aco/50 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Receita Líquida (ROL)
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
                  Bruta: <span className="font-mono text-white">{formatCurrency(grossRevenue)}</span> | Deduções: <span className="font-mono text-rose-400">-{formatCurrency(totalDeductions)}</span>
                </p>
              </div>
            </Card>

            {/* Margem de Contribuição */}
            <Card variant="default" className="p-5 bg-grafite border-volt/40 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-volt">
                  Margem Contribuição
                </span>
                <div className="w-8 h-8 rounded-xl bg-volt/10 text-volt flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-volt font-mono">
                    {formatCurrency(contribMargin)}
                  </p>
                  <Badge variant={contribMarginPct >= 35 ? 'volt' : 'alert'}>
                    {contribMarginPct}%
                  </Badge>
                </div>
                <p className="text-[11px] text-cinza-muted mt-1">
                  CSP Total: <span className="font-mono text-rose-400">-{formatCurrency(totalVariableCosts)}</span>
                </p>
              </div>
            </Card>

            {/* Total Despesas Fixas e Operacionais */}
            <Card variant="default" className="p-5 bg-grafite border-aco/50 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Despesas Fixas & Op.
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-rose-400 font-mono">
                  {formatCurrency(totalFixedExpenses + totalOperatingExpenses)}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">
                  Fixas: <span className="font-mono text-cinza-claro">{formatCurrency(totalFixedExpenses)}</span> | Operacionais: <span className="font-mono text-cinza-claro">{formatCurrency(totalOperatingExpenses)}</span>
                </p>
              </div>
            </Card>

            {/* EBITDA Real */}
            <Card
              variant="default"
              className={`p-5 bg-grafite relative overflow-hidden border ${
                ebitda >= 0 ? 'border-volt/50 shadow-lg shadow-volt/5' : 'border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  EBITDA Real
                </span>
                <Badge variant={ebitda >= 0 ? 'volt' : 'error'}>
                  {ebitdaMargin}% Margem
                </Badge>
              </div>
              <div className="mt-3">
                <p
                  className={`text-2xl font-black font-mono ${
                    ebitda >= 0 ? 'text-volt' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(ebitda)}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">
                  Resultado operacional antes de juros/impostos sobre lucro
                </p>
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
                    Saldo em Aberto de Ordens de Serviço Ativas
                  </p>
                  <p className="text-xs text-cinza-muted mt-0.5">
                    Há ordens de serviço ativas com saldo a receber de{' '}
                    <strong className="text-white font-mono">{formatCurrency(pendingReceivables)}</strong>.
                  </p>
                </div>
              </div>
              <Badge variant="alert">Controle de Inadimplência</Badge>
            </div>
          )}

          {/* CASCATA COMPLETA DO DRE GERENCIAL */}
          <Card variant="default" className="p-6 bg-grafite border-aco/60">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-volt" />
              Estrutura Analítica do DRE Gerencial
            </h3>

            <div className="divide-y divide-aco/50">
              {/* 1. Receita Bruta */}
              <div className="py-3.5 flex items-center justify-between text-sm">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  (+) RECEITA OPERACIONAL BRUTA
                </span>
                <span className="font-mono font-bold text-white text-base">
                  {formatCurrency(grossRevenue)}
                </span>
              </div>

              {/* 2. Deduções */}
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Descontos Comerciais Concedidos</span>
                <span className="font-mono text-rose-400">-{formatCurrency(discounts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Impostos Fiscais NFS-e ISS (T6.10)</span>
                <span className="font-mono text-rose-400">-{formatCurrency(issTaxes)}</span>
              </div>

              {/* 3. Receita Líquida */}
              <div className="py-3.5 flex items-center justify-between text-sm bg-asfalto/70 px-4 rounded-xl border border-aco/40 my-1">
                <span className="font-black text-emerald-400 uppercase tracking-tight flex items-center gap-2">
                  (=) RECEITA OPERACIONAL LÍQUIDA (ROL)
                </span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  {formatCurrency(netRevenue)}
                </span>
              </div>

              {/* 4. Custos Variáveis / CSP */}
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Insumos de Estoque Consumidos</span>
                <span className="font-mono text-rose-400">-{formatCurrency(matCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Bobinas de PPF & Películas Cortadas (T6.5)</span>
                <span className="font-mono text-rose-400">-{formatCurrency(spoolCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Comissões da Equipe Técnica Apuradas</span>
                <span className="font-mono text-rose-400">-{formatCurrency(commCosts)}</span>
              </div>

              {/* 5. Margem de Contribuição */}
              <div className="py-4 flex items-center justify-between text-base bg-volt/10 px-4 rounded-xl border border-volt/30 my-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-volt uppercase tracking-tight">
                    (=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL
                  </span>
                  <Badge variant="volt">{contribMarginPct}% da ROL</Badge>
                </div>
                <span className="font-mono font-black text-volt text-lg">
                  {formatCurrency(contribMargin)}
                </span>
              </div>

              {/* 6. Despesas Fixas */}
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Aluguel e Ponto Comercial</span>
                <span className="font-mono text-rose-400">-{formatCurrency(rentCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Energia, Água, Internet & Telefonia</span>
                <span className="font-mono text-rose-400">-{formatCurrency(utilCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Folha Administrativa & Pró-Labore</span>
                <span className="font-mono text-rose-400">-{formatCurrency(salariesCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Softwares, Sistema CarX & Assinaturas</span>
                <span className="font-mono text-rose-400">-{formatCurrency(softwareCosts)}</span>
              </div>
              {otherFixed > 0 && (
                <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                  <span>(-) Outras Despesas Fixas</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(otherFixed)}</span>
                </div>
              )}

              {/* 7. Despesas Operacionais */}
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Marketing, Anúncios & Tráfego Pago</span>
                <span className="font-mono text-rose-400">-{formatCurrency(marketingCosts)}</span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                <span>(-) Manutenção de Ferramentas, EPIs & Máquinas</span>
                <span className="font-mono text-rose-400">-{formatCurrency(toolsCosts)}</span>
              </div>
              {otherOperating > 0 && (
                <div className="py-3 flex items-center justify-between text-sm pl-6 text-cinza-muted">
                  <span>(-) Outras Despesas Operacionais</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(otherOperating)}</span>
                </div>
              )}

              {/* 8. EBITDA REAL */}
              <div className="py-4 flex items-center justify-between text-base bg-asfalto px-4 rounded-xl border border-volt/40 my-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white uppercase tracking-tight">
                    (=) EBITDA REAL DA OFICINA
                  </span>
                  <Badge variant={ebitda >= 0 ? 'volt' : 'error'}>
                    {ebitdaMargin}% da ROL
                  </Badge>
                </div>
                <span
                  className={`font-mono font-black text-xl ${
                    ebitda >= 0 ? 'text-volt' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(ebitda)}
                </span>
              </div>

              {/* 9. Lucro Líquido Real */}
              <div className="py-3 flex items-center justify-between text-sm font-bold text-white pl-4">
                <span>(=) LUCRO LÍQUIDO FINAL DO PERÍODO</span>
                <span
                  className={`font-mono text-base ${
                    netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SUB-ABA 2: PROJEÇÃO DE FLUXO DE CAIXA */}
      {activeSubTab === 'CASH_FLOW' && (
        <div className="space-y-6">
          {/* Seletor de Horizonte */}
          <Card variant="default" className="p-4 sm:p-5 bg-grafite border-aco/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Projeção de Fluxo de Caixa Futuro
                  </h3>
                  <p className="text-xs text-cinza-muted">
                    Previsão dia a dia com contas a pagar/receber e saldo consolidado
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-asfalto border border-aco/50 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setCashFlowHorizon(30)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      cashFlowHorizon === 30 ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                    }`}
                  >
                    30 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowHorizon(60)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      cashFlowHorizon === 60 ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                    }`}
                  >
                    60 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowHorizon(90)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      cashFlowHorizon === 90 ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                    }`}
                  >
                    90 Dias
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchCashFlow()}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} />
                  Atualizar
                </Button>
              </div>
            </div>
          </Card>

          {/* Cards de Resumo da Projeção */}
          {cashFlow && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Saldo Inicial Atual */}
              <Card variant="default" className="p-5 bg-grafite border-aco/50">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Saldo Inicial Atual
                </span>
                <p className="text-2xl font-black text-white font-mono mt-2">
                  {formatCurrency(cashFlow.currentBalanceCents)}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">
                  Disponível em caixa consolidado hoje
                </p>
              </Card>

              {/* Total Entradas Previstas */}
              <Card variant="default" className="p-5 bg-grafite border-aco/50">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Entradas Previstas ({cashFlowHorizon}d)
                </span>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-2">
                  {formatCurrency(
                    cashFlowHorizon === 30
                      ? cashFlow.summary30Days.totalIncomingCents
                      : cashFlowHorizon === 60
                      ? cashFlow.summary60Days.totalIncomingCents
                      : cashFlow.summary90Days.totalIncomingCents
                  )}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">Recebíveis agendados</p>
              </Card>

              {/* Total Saídas Previstas */}
              <Card variant="default" className="p-5 bg-grafite border-aco/50">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Saídas Previstas ({cashFlowHorizon}d)
                </span>
                <p className="text-2xl font-black text-rose-400 font-mono mt-2">
                  {formatCurrency(
                    cashFlowHorizon === 30
                      ? cashFlow.summary30Days.totalOutgoingCents
                      : cashFlowHorizon === 60
                      ? cashFlow.summary60Days.totalOutgoingCents
                      : cashFlow.summary90Days.totalOutgoingCents
                  )}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">Despesas e contas a pagar</p>
              </Card>

              {/* Saldo Projetado Acumulado */}
              <Card variant="default" className="p-5 bg-grafite border-volt/40">
                <span className="text-xs font-black uppercase tracking-wider text-volt">
                  Saldo Projetado Final
                </span>
                <p className="text-2xl font-black text-volt font-mono mt-2">
                  {formatCurrency(
                    cashFlowHorizon === 30
                      ? cashFlow.summary30Days.finalBalanceCents
                      : cashFlowHorizon === 60
                      ? cashFlow.summary60Days.finalBalanceCents
                      : cashFlow.summary90Days.finalBalanceCents
                  )}
                </p>
                <p className="text-[11px] text-cinza-muted mt-1">Previsão no final do período</p>
              </Card>
            </div>
          )}

          {/* Timeline Diária de Saldos */}
          <Card variant="default" className="p-6 bg-grafite border-aco/60">
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-volt" />
              Linha do Tempo Diária de Caixa
            </h4>

            {isLoadingCashFlow ? (
              <div className="py-12 text-center text-cinza-muted text-sm">
                Carregando projeção de caixa...
              </div>
            ) : cashFlow?.dailyTimeline?.length === 0 ? (
              <div className="py-12 text-center text-cinza-muted text-sm">
                Nenhuma movimentação futura agendada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-aco/60 text-cinza-muted font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Data</th>
                      <th className="py-3 px-3 text-right">Entradas Previstas</th>
                      <th className="py-3 px-3 text-right">Saídas Previstas</th>
                      <th className="py-3 px-3 text-right">Resultado do Dia</th>
                      <th className="py-3 px-3 text-right">Saldo Acumulado</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aco/30 font-mono">
                    {cashFlow?.dailyTimeline.map((day) => {
                      const netDay = day.incomingCents - day.outgoingCents;
                      const isNegative = day.projectedBalanceCents < 0;

                      return (
                        <tr
                          key={day.date}
                          className={`hover:bg-asfalto/40 transition-colors ${
                            isNegative ? 'bg-rose-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-sans font-bold text-white">
                            {new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            {day.incomingCents > 0 ? `+${formatCurrency(day.incomingCents)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-400">
                            {day.outgoingCents > 0 ? `-${formatCurrency(day.outgoingCents)}` : '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              netDay > 0
                                ? 'text-emerald-400'
                                : netDay < 0
                                ? 'text-rose-400'
                                : 'text-cinza-muted'
                            }`}
                          >
                            {netDay !== 0 ? formatCurrency(netDay) : '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-black ${
                              isNegative ? 'text-rose-400' : 'text-volt'
                            }`}
                          >
                            {formatCurrency(day.projectedBalanceCents)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {isNegative ? (
                              <Badge variant="error">Alerta Negativo</Badge>
                            ) : (
                              <Badge variant="volt">Saudável</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 4. SUB-ABA 3: CONTAS A PAGAR & RECEBER */}
      {activeSubTab === 'BILLS' && (
        <div className="space-y-6">
          {/* Sumário Rápido de Contas */}
          {billsData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="default" className="p-4 bg-grafite border-rose-500/30">
                <span className="text-[11px] font-bold text-cinza-muted uppercase">
                  A Pagar Pendente
                </span>
                <p className="text-xl font-black text-rose-400 font-mono mt-1">
                  {formatCurrency(billsData.summary.totalPendingPayableCents)}
                </p>
              </Card>

              <Card variant="default" className="p-4 bg-grafite border-emerald-500/30">
                <span className="text-[11px] font-bold text-cinza-muted uppercase">
                  A Receber Pendente
                </span>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">
                  {formatCurrency(billsData.summary.totalPendingReceivableCents)}
                </p>
              </Card>

              <Card variant="default" className="p-4 bg-grafite border-volt/30">
                <span className="text-[11px] font-bold text-cinza-muted uppercase">
                  Total Quitado
                </span>
                <p className="text-xl font-black text-volt font-mono mt-1">
                  {formatCurrency(billsData.summary.totalPaidCents)}
                </p>
              </Card>

              <Card variant="default" className="p-4 bg-grafite border-alerta/30">
                <span className="text-[11px] font-bold text-cinza-muted uppercase">
                  Vencidas em Aberto
                </span>
                <p className="text-xl font-black text-alerta font-mono mt-1">
                  {formatCurrency(billsData.summary.totalOverdueCents)}
                </p>
              </Card>
            </div>
          )}

          {/* Filtros de Contas */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-asfalto border border-aco/50 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-cinza-muted font-bold">Tipo:</span>
              <button
                type="button"
                onClick={() => setBillTypeFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billTypeFilter === 'all' ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setBillTypeFilter('payable')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billTypeFilter === 'payable' ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                }`}
              >
                A Pagar (Despesas)
              </button>
              <button
                type="button"
                onClick={() => setBillTypeFilter('receivable')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billTypeFilter === 'receivable' ? 'bg-volt text-asfalto' : 'text-cinza-muted hover:text-white'
                }`}
              >
                A Receber (Receitas)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-cinza-muted font-bold">Status:</span>
              <button
                type="button"
                onClick={() => setBillStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billStatusFilter === 'all' ? 'bg-white/20 text-white' : 'text-cinza-muted hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setBillStatusFilter('pending')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billStatusFilter === 'pending' ? 'bg-alerta text-asfalto' : 'text-cinza-muted hover:text-white'
                }`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setBillStatusFilter('paid')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  billStatusFilter === 'paid' ? 'bg-emerald-500 text-white' : 'text-cinza-muted hover:text-white'
                }`}
              >
                Pagas
              </button>
            </div>
          </div>

          {/* Lista de Contas */}
          <Card variant="default" className="p-6 bg-grafite border-aco/60">
            {isLoadingBills ? (
              <div className="py-12 text-center text-cinza-muted text-sm">Carregando contas...</div>
            ) : !billsData?.bills || billsData.bills.length === 0 ? (
              <div className="py-12 text-center text-cinza-muted text-sm">
                Nenhuma conta financeira cadastrada com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-aco/60 text-cinza-muted font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Descrição</th>
                      <th className="py-3 px-3">Fornecedor / Cliente</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-3">Vencimento</th>
                      <th className="py-3 px-3 text-right">Valor</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aco/30">
                    {billsData.bills.map((bill: FinancialBillDto) => (
                      <tr key={bill.id} className="hover:bg-asfalto/40 transition-colors">
                        <td className="py-3 px-3 font-sans">
                          {bill.type === 'payable' ? (
                            <Badge variant="error">Pagar</Badge>
                          ) : (
                            <Badge variant="volt">Receber</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{bill.description}</td>
                        <td className="py-3 px-3 text-cinza-claro">{bill.supplierCustomerName || '—'}</td>
                        <td className="py-3 px-3 text-cinza-muted">
                          {bill.categoryName || 'Geral'}
                        </td>
                        <td className="py-3 px-3 font-mono text-cinza-claro">
                          {new Date(bill.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatCurrency(bill.amountCents)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {bill.status === 'paid' ? (
                            <Badge variant="volt">Quitada</Badge>
                          ) : bill.status === 'overdue' ? (
                            <Badge variant="error">Vencida</Badge>
                          ) : (
                            <Badge variant="alert">Pendente</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {bill.status !== 'paid' && (
                              <Button
                                variant="volt"
                                size="sm"
                                onClick={() => payBillMutation.mutate(bill.id)}
                                disabled={payBillMutation.isPending}
                                className="text-[11px] py-1 px-2 h-auto"
                              >
                                Quitar
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Excluir esta conta financeira?')) {
                                  deleteBillMutation.mutate(bill.id);
                                }
                              }}
                              className="p-1.5 text-cinza-muted hover:text-rose-400 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 5. SUB-ABA 4: FECHAMENTO DE COMISSÕES EM LOTE */}
      {activeSubTab === 'COMMISSIONS_BATCH' && (
        <div className="space-y-6">
          <Card variant="default" className="p-5 bg-grafite border-aco/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Fechamento & Liquidação de Comissões por Técnico
                  </h3>
                  <p className="text-xs text-cinza-muted">
                    Apuração com dedução de bobinas/insumos e quitação em lote com geração de despesa
                  </p>
                </div>
              </div>

              {/* Seletor do Técnico */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-cinza-muted font-bold">Colaborador:</span>
                <select
                  value={selectedTechId}
                  onChange={(e) => {
                    setSelectedTechId(e.target.value);
                    setSelectedEntryIds([]);
                  }}
                  className="bg-asfalto border border-aco/60 text-xs text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="">Selecione um técnico...</option>
                  {members.map((m: any) => (
                    <option key={m.id || m.userId} value={m.userId || m.id}>
                      {m.name || m.userName} ({m.role || 'Técnico'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {batchPaySuccessMsg && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={18} />
              {batchPaySuccessMsg}
            </div>
          )}

          {/* Barra de Ação em Lote */}
          {pendingEntries.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-asfalto border border-aco/60 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    selectedEntryIds.length === pendingEntries.length && pendingEntries.length > 0
                  }
                  onChange={handleToggleSelectAllEntries}
                  className="w-4 h-4 rounded cursor-pointer accent-volt"
                />
                <span className="text-xs text-white font-bold">
                  Selecionados:{' '}
                  <strong className="text-volt font-mono">{selectedEntryIds.length}</strong> de{' '}
                  {pendingEntries.length} serviços
                </span>
                {selectedEntryIds.length > 0 && (
                  <Badge variant="volt">
                    Total a Pagar: {formatCurrency(selectedCommissionsTotalCents)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={batchPayMethod}
                  onChange={(e) => setBatchPayMethod(e.target.value)}
                  className="bg-grafite border border-aco/60 text-xs text-white rounded-xl px-3 py-1.5 outline-none"
                >
                  <option value="pix">Pagamento via PIX</option>
                  <option value="transfer">Transferência Bancária</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>

                <Button
                  variant="volt"
                  size="sm"
                  disabled={selectedEntryIds.length === 0 || batchPayMutation.isPending}
                  onClick={() => {
                    if (!selectedTechId) return;
                    if (
                      window.confirm(
                        `Confirmar fechamento em lote de ${selectedEntryIds.length} comissões no valor total de ${formatCurrency(
                          selectedCommissionsTotalCents
                        )}?`
                      )
                    ) {
                      batchPayMutation.mutate({
                        technicianId: selectedTechId,
                        entryIds: selectedEntryIds,
                        paymentMethod: batchPayMethod,
                      });
                    }
                  }}
                  className="gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Liquidar Lote ({formatCurrency(selectedCommissionsTotalCents)})
                </Button>
              </div>
            </div>
          )}

          {/* Tabela de Lançamentos Pendentes */}
          <Card variant="default" className="p-6 bg-grafite border-aco/60">
            {isLoadingEntries ? (
              <div className="py-12 text-center text-cinza-muted text-sm">Carregando comissões...</div>
            ) : !selectedTechId ? (
              <div className="py-12 text-center text-cinza-muted text-sm">
                Selecione um técnico acima para visualizar as comissões pendentes de liquidação.
              </div>
            ) : pendingEntries.length === 0 ? (
              <div className="py-12 text-center text-cinza-muted text-sm">
                Não há comissões pendentes para este colaborador no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-aco/60 text-cinza-muted font-bold uppercase tracking-wider">
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3">Data OS</th>
                      <th className="py-3 px-3">Ordem de Serviço</th>
                      <th className="py-3 px-3 text-right">Valor Bruto</th>
                      <th className="py-3 px-3 text-right">Dedução Insumos/Bobinas</th>
                      <th className="py-3 px-3 text-right">Comissão Líquida</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aco/30 font-mono">
                    {pendingEntries.map((entry) => {
                      const isSelected = selectedEntryIds.includes(entry.id);

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-asfalto/40 transition-colors ${
                            isSelected ? 'bg-volt/5' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectEntry(entry.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-volt"
                            />
                          </td>
                          <td className="py-3 px-3 font-sans text-cinza-claro">
                            {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-3 font-bold text-white font-sans">
                            {entry.osNumber ? `OS #${entry.osNumber}` : entry.workOrderId.slice(0, 8)}
                          </td>
                          <td className="py-3 px-3 text-right text-cinza-claro">
                            {formatCurrency(entry.grossAmountCents)}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-400">
                            {entry.deductionsCents > 0 ? `-${formatCurrency(entry.deductionsCents)}` : 'R$ 0,00'}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-volt text-sm">
                            {formatCurrency(entry.commissionCents)}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            <Badge variant="alert">Pendente</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: NOVA CONTA A PAGAR / RECEBER */}
      {isNewBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-asfalto/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-grafite border border-aco rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-aco/50">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Nova Conta Financeira
              </h3>
              <button
                type="button"
                onClick={() => setIsNewBillModalOpen(false)}
                className="text-cinza-muted hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4">
              {/* Tipo de Conta */}
              <div>
                <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBillType('payable')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      newBillType === 'payable'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                        : 'bg-asfalto text-cinza-muted border-aco/50'
                    }`}
                  >
                    Conta a Pagar (Despesa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBillType('receivable')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      newBillType === 'receivable'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : 'bg-asfalto text-cinza-muted border-aco/50'
                    }`}
                  >
                    Conta a Receber (Receita)
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                  Descrição / Histórico
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel do Galpão, Conta de Energia, Venda Direta"
                  value={newBillDesc}
                  onChange={(e) => setNewBillDesc(e.target.value)}
                  className="w-full bg-asfalto border border-aco/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-volt"
                />
              </div>

              {/* Fornecedor / Favorecido */}
              <div>
                <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                  Fornecedor ou Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ex: Imobiliária Alpha, Enel, Cliente Particular"
                  value={newBillSupplier}
                  onChange={(e) => setNewBillSupplier(e.target.value)}
                  className="w-full bg-asfalto border border-aco/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-volt"
                />
              </div>

              {/* Categoria / Plano de Contas */}
              <div>
                <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                  Categoria Contábil
                </label>
                <select
                  value={newBillCategoryId}
                  onChange={(e) => setNewBillCategoryId(e.target.value)}
                  className="w-full bg-asfalto border border-aco/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-volt cursor-pointer"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.groupType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor e Data de Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={newBillAmount}
                    onChange={(e) => setNewBillAmount(e.target.value)}
                    className="w-full bg-asfalto border border-aco/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-volt font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-cinza-muted uppercase block mb-1.5">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={newBillDueDate}
                    onChange={(e) => setNewBillDueDate(e.target.value)}
                    className="w-full bg-asfalto border border-aco/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-volt font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-aco/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewBillModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="volt"
                  size="sm"
                  disabled={createBillMutation.isPending}
                >
                  Salvar Conta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreDashboard;
