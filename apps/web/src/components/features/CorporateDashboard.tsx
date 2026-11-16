import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  Plus,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronRight,
  MapPin,
  Package,
  Wrench,
  Percent,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../../services/api';
import type {
  CorporateDashboardOverviewDto,
  UnitDto,
  CreateUnitInputDto,
  UnitTransferDto,
  CreateUnitTransferInputDto,
} from '@carx/shared';

type CorporateTab = 'OVERVIEW' | 'UNITS' | 'TRANSFERS';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function CorporateDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CorporateTab>('OVERVIEW');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Filtros de período para o overview
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form State: Nova Unidade
  const [unitForm, setUnitForm] = useState<CreateUnitInputDto>({
    name: '',
    slug: '',
    cnpj: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressNumber: '',
    addressCity: '',
    addressState: 'SP',
  });
  const [unitFormError, setUnitFormError] = useState<string | null>(null);

  // Form State: Nova Transferência
  const [transferForm, setTransferForm] = useState<CreateUnitTransferInputDto>({
    fromUnitId: '',
    toUnitId: '',
    transferType: 'roll',
    rollId: '',
    materialId: '',
    quantity: 1,
    notes: '',
  });
  const [transferFormError, setTransferFormError] = useState<string | null>(null);

  // 1. Query: Visão Corporativa Consolidada
  const {
    data: overview,
    isLoading: isLoadingOverview,
    refetch: refetchOverview,
  } = useQuery<CorporateDashboardOverviewDto>({
    queryKey: ['corporate', 'overview', startDate, endDate],
    queryFn: () => api.corporate.getOverview({ startDate, endDate }),
  });

  // 2. Query: Lista de Unidades
  const {
    data: units = [],
    isLoading: isLoadingUnits,
    refetch: refetchUnits,
  } = useQuery<UnitDto[]>({
    queryKey: ['corporate', 'units'],
    queryFn: () => api.corporate.listUnits(),
  });

  // 3. Query: Histórico de Transferências
  const {
    data: transfers = [],
    isLoading: isLoadingTransfers,
    refetch: refetchTransfers,
  } = useQuery<UnitTransferDto[]>({
    queryKey: ['corporate', 'transfers'],
    queryFn: () => api.corporate.listTransfers(),
  });

  // Mutation: Criar Unidade
  const createUnitMutation = useMutation({
    mutationFn: (data: CreateUnitInputDto) => api.corporate.createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate'] });
      setIsNewUnitModalOpen(false);
      setUnitForm({
        name: '',
        slug: '',
        cnpj: '',
        phone: '',
        email: '',
        addressStreet: '',
        addressNumber: '',
        addressCity: '',
        addressState: 'SP',
      });
      setUnitFormError(null);
    },
    onError: (err: any) => {
      setUnitFormError(err.message || 'Erro ao cadastrar filial.');
    },
  });

  // Mutation: Criar Transferência
  const createTransferMutation = useMutation({
    mutationFn: (data: CreateUnitTransferInputDto) =>
      api.corporate.transferInventory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate'] });
      setIsTransferModalOpen(false);
      setTransferForm({
        fromUnitId: '',
        toUnitId: '',
        transferType: 'roll',
        rollId: '',
        materialId: '',
        quantity: 1,
        notes: '',
      });
      setTransferFormError(null);
    },
    onError: (err: any) => {
      setTransferFormError(err.message || 'Erro ao realizar transferência.');
    },
  });

  const handleCreateUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name || !unitForm.slug) {
      setUnitFormError('Nome e identificador (slug) da filial são obrigatórios.');
      return;
    }
    createUnitMutation.mutate(unitForm);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromUnitId || !transferForm.toUnitId) {
      setTransferFormError('Selecione as unidades de origem e de destino.');
      return;
    }
    if (transferForm.fromUnitId === transferForm.toUnitId) {
      setTransferFormError('A unidade de origem não pode ser igual à de destino.');
      return;
    }
    if (transferForm.transferType === 'roll' && !transferForm.rollId) {
      setTransferFormError('Informe o identificador ou código da bobina.');
      return;
    }
    if (transferForm.transferType === 'material' && !transferForm.materialId) {
      setTransferFormError('Informe o identificador do material de estoque.');
      return;
    }
    createTransferMutation.mutate(transferForm);
  };

  return (
    <div className="w-full space-y-6">
      {/* HEADER EXECUTIVO & SELETOR DE UNIDADE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-white rounded-md">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Painel Corporativo Multiunidade
                <Badge variant="volt" className="border-emerald-500/30 text-emerald-700 bg-emerald-50 text-xs">
                  Rede Ativa
                </Badge>
              </h1>
              <p className="text-sm text-slate-500">
                Cockpit executivo consolidado, ranking entre lojas e logística inter-filiais
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES DO TOPO: SELETOR DE UNIDADE E AÇÕES */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 sm:flex-initial min-w-[200px]">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-medium text-slate-700 focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">🌐 Todas as Unidades (Rede Consolidada)</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  📍 {u.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition-all shadow-sm flex-1 sm:flex-initial shrink-0 active:scale-[0.98] cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">Transferir Insumos</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewUnitModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex-1 sm:flex-initial shrink-0 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Nova Filial</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="flex items-center border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Visão Consolidada & Ranking</span>
        </button>

        <button
          onClick={() => setActiveTab('UNITS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
            activeTab === 'UNITS'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Gestão de Filiais ({units.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
            activeTab === 'TRANSFERS'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 shrink-0" />
          <span>Logística Inter-Lojas ({transfers.length})</span>
        </button>
      </div>

      {/* ABA 1: VISÃO CONSOLIDADA & RANKING */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* 4 CARDS KPIS CONSOLIDADOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Faturamento Consolidado
                </span>
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {overview ? formatCurrency(overview.totalRevenueCents) : 'R$ 0,00'}
                </span>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Soma de todas as filiais ativas
                </p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total de OSs Realizadas
                </span>
                <span className="p-2 bg-blue-50 text-blue-700 rounded-md">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {overview ? overview.totalWorkOrders : 0}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Volume agregado da rede
                </p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ticket Médio da Rede
                </span>
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-md">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {overview ? formatCurrency(overview.averageTicketCents) : 'R$ 0,00'}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Média por ordem de serviço
                </p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ocupação Média dos Boxes
                </span>
                <span className="p-2 bg-amber-50 text-amber-700 rounded-md">
                  <Wrench className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {overview ? `${overview.averageBayOccupancyRatePercent}%` : '0%'}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Taxa de utilização dos boxes físicos
                </p>
              </div>
            </Card>
          </div>

          {/* RANKING DE PERFORMANCE ENTRE LOJAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Ranking de Produtividade & Faturamento por Filial
                  </h3>
                  <p className="text-xs text-slate-500">
                    Classificação ordenada pela receita e volume de serviços executados
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchOverview()}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="space-y-4">
                {overview?.unitsRanking && overview.unitsRanking.length > 0 ? (
                  overview.unitsRanking.map((item) => (
                    <div
                      key={item.unitId}
                      className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : item.rank === 3
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          #{item.rank}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {item.unitName}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {item.workOrdersCount} OSs executadas • Ticket Médio:{' '}
                            {formatCurrency(item.averageTicketCents)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Faturamento</span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.revenueCents)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Ocupação Boxes</span>
                          <span className="text-sm font-semibold text-emerald-700">
                            {item.bayOccupancyRatePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400">
                    Nenhuma métrica registrada para o período selecionado.
                  </div>
                )}
              </div>
            </Card>

            {/* RESUMO DE ESTOQUE / INVENTÁRIO POR LOJA */}
            <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-lg">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-indigo-600" />
                Bobinas e Insumos por Unidade
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Visão do saldo de PPF, insulfilm e insumos alocados
              </p>

              <div className="space-y-3">
                {overview?.inventorySummary && overview.inventorySummary.length > 0 ? (
                  overview.inventorySummary.map((inv) => (
                    <div
                      key={inv.unitId}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          {inv.unitName}
                        </span>
                        <Badge variant="neutral" className="text-xs bg-white text-slate-700">
                          {inv.rollsCount} bobina(s) ativa(s)
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Metragem total: {inv.rollsTotalMeters.toFixed(1)}m</span>
                        <span>{inv.materialsCount} insumos</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-slate-400">
                    Nenhum inventário computado.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE FILIAIS */}
      {activeTab === 'UNITS' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Unidades e Filiais Cadastradas
              </h3>
              <p className="text-xs text-slate-500">
                Lojas físicas que operam dentro da sua conta corporativa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewUnitModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Filial</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome da Filial</th>
                  <th className="py-3 px-4">Identificador (Slug)</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4 text-center">Boxes Ativos</th>
                  <th className="py-3 px-4 text-center">Bobinas</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {u.slug}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.addressCity ? `${u.addressCity}/${u.addressState || 'BR'}` : 'Não informado'}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {u.activeBaysCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {u.totalRollsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="neutral"
                        className={
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }
                      >
                        {u.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 3: LOGÍSTICA INTER-LOJAS / HISTÓRICO DE TRANSFERÊNCIAS */}
      {activeTab === 'TRANSFERS' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Histórico de Transferências entre Unidades
              </h3>
              <p className="text-xs text-slate-500">
                Rastreabilidade de bobinas de PPF, insulfilm e insumos movimentados entre lojas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 active:scale-[0.98] cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Nova Transferência</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Destino</th>
                  <th className="py-3 px-4">Tipo & Item</th>
                  <th className="py-3 px-4 text-center">Quantidade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transfers.length > 0 ? (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {t.fromUnitName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">
                        {t.toUnitName}
                      </td>
                      <td className="py-3 px-4">
                        {t.transferType === 'roll' ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Bobina: {t.rollCode || 'Sem código'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.rollBrand || 'Película PPF'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {t.materialName || 'Insumo'}
                            </span>
                            <span className="text-xs text-slate-500">Material de Estoque</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {t.quantity} {t.transferType === 'roll' ? 'rolo' : 'un'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="neutral"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                        >
                          Concluída
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {t.transferredByName || 'Gestor'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                      Nenhuma transferência registrada até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: CADASTRAR NOVA FILIAL */}
      {isNewUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Cadastrar Nova Filial
              </h3>
              <button
                onClick={() => setIsNewUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {unitFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unitFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUnitSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Filial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alpha Moema"
                    value={unitForm.name}
                    onChange={(e) =>
                      setUnitForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Identificador (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: alpha-moema"
                    value={unitForm.slug}
                    onChange={(e) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ da Filial
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={unitForm.cnpj || ''}
                    onChange={(e) =>
                      setUnitForm((prev) => ({ ...prev, cnpj: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone/WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98888-7777"
                    value={unitForm.phone || ''}
                    onChange={(e) =>
                      setUnitForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={unitForm.addressCity || ''}
                    onChange={(e) =>
                      setUnitForm((prev) => ({ ...prev, addressCity: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={unitForm.addressState || 'SP'}
                    onChange={(e) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        addressState: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 uppercase focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewUnitModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUnitMutation.isPending}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  {createUnitMutation.isPending ? 'Cadastrando...' : 'Criar Filial'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERÊNCIA DE INSUMOS & BOBINAS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Transferir Insumo ou Bobina entre Lojas
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {transferFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferFormError}</span>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Origem *
                  </label>
                  <select
                    required
                    value={transferForm.fromUnitId}
                    onChange={(e) =>
                      setTransferForm((prev) => ({ ...prev, fromUnitId: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione a origem...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Destino *
                  </label>
                  <select
                    required
                    value={transferForm.toUnitId}
                    onChange={(e) =>
                      setTransferForm((prev) => ({ ...prev, toUnitId: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione o destino...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Item *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTransferForm((prev) => ({ ...prev, transferType: 'roll' }))
                    }
                    className={`p-2.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      transferForm.transferType === 'roll'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Bobina de Película / PPF
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTransferForm((prev) => ({ ...prev, transferType: 'material' }))
                    }
                    className={`p-2.5 rounded-md border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      transferForm.transferType === 'material'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    Insumo / Estoque Geral
                  </button>
                </div>
              </div>

              {transferForm.transferType === 'roll' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID ou Código da Bobina *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cole o ID da bobina ou código"
                    value={transferForm.rollId || ''}
                    onChange={(e) =>
                      setTransferForm((prev) => ({ ...prev, rollId: e.target.value }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID do Material *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ID do material no estoque"
                      value={transferForm.materialId || ''}
                      onChange={(e) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          materialId: e.target.value,
                        }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={transferForm.quantity}
                      onChange={(e) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          quantity: Number(e.target.value),
                        }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Observações da Transferência
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Suprir demanda de instalação de PPF para o fim de semana..."
                  value={transferForm.notes || ''}
                  onChange={(e) =>
                    setTransferForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTransferModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTransferMutation.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {createTransferMutation.isPending
                    ? 'Transferindo...'
                    : 'Confirmar Transferência'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
