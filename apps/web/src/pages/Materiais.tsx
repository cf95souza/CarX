import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  TrendingUp,
  Scissors,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Edit2,
  Trash2,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  MaterialRollDto,
  MaterialRollDetailWithHistoryDto,
  CreateMaterialRollInputDto,
  RegisterRollScrapInputDto,
} from '@carx/shared';
import Pagination from '../components/ui/Pagination';
import { toast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';

export const MateriaisView: React.FC = () => {
  // Tabs: 'rolls' (Bobinas PPF/Películas) ou 'supplies' (Insumos Gerais)
  const [activeTab, setActiveTab] = useState<'rolls' | 'supplies'>('rolls');

  // Estado geral
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de Bobinas
  const [rolls, setRolls] = useState<MaterialRollDto[]>([]);
  const [isRollsBlockedByPlan, setIsRollsBlockedByPlan] = useState(false);
  const [rollFilterStatus, setRollFilterStatus] = useState<'all' | 'in_use' | 'depleted'>('in_use');

  // Estados de Insumos Gerais
  const [supplies, setSupplies] = useState<any[]>([]);
  const [suppliesCurrentPage, setSuppliesCurrentPage] = useState(1);
  const [suppliesPerPage, setSuppliesPerPage] = useState(10);

  // Modais
  const [showNewRollModal, setShowNewRollModal] = useState(false);
  const [showNewSupplyModal, setShowNewSupplyModal] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any | null>(null);
  const [repondoSupply, setRepondoSupply] = useState<any | null>(null);

  // Modal Histórico da Bobina & Margem Real
  const [selectedRollHistory, setSelectedRollHistory] = useState<MaterialRollDetailWithHistoryDto | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Registrar Retalho / Desperdício
  const [scrapTargetRoll, setScrapTargetRoll] = useState<MaterialRollDto | null>(null);
  const [scrapMeters, setScrapMeters] = useState<string>('');
  const [scrapReason, setScrapReason] = useState<string>('');
  const [scrapSubmitting, setScrapSubmitting] = useState(false);

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega bobinas
      try {
        const rollsData = await api.rolls.list();
        setRolls(rollsData || []);
        setIsRollsBlockedByPlan(false);
      } catch (err: any) {
        if (err?.message?.includes('ppf_spool_control') || err?.status === 403) {
          setIsRollsBlockedByPlan(true);
          // Se bloqueado, foca na aba de insumos caso o usuário não tenha clicado explicitamente
        } else {
          console.error('Erro ao carregar bobinas:', err);
        }
      }

      // 2. Carrega materiais gerais
      try {
        const suppliesData = await api.materials.list({ limit: 100 });
        setSupplies(suppliesData?.materials || []);
      } catch (err) {
        console.error('Erro ao carregar materiais gerais:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FILTROS DE BOBINAS ---
  const filteredRolls = useMemo(() => {
    return rolls.filter((r) => {
      const matchSearch =
        (r.brand && r.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.code && r.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.lotNumber && r.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.materialName && r.materialName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (rollFilterStatus === 'in_use') return r.status === 'in_use';
      if (rollFilterStatus === 'depleted') return r.status === 'depleted';
      return true;
    });
  }, [rolls, searchTerm, rollFilterStatus]);

  // Métricas de Bobinas
  const totalMetersInStock = useMemo(() => {
    return rolls
      .filter((r) => r.status === 'in_use')
      .reduce((acc, curr) => acc + (Number(curr.currentMeters) || 0), 0);
  }, [rolls]);

  const activeRollsCount = useMemo(() => {
    return rolls.filter((r) => r.status === 'in_use').length;
  }, [rolls]);

  const lowMetersRollsCount = useMemo(() => {
    return rolls.filter((r) => r.isLowMeters).length;
  }, [rolls]);

  // --- FILTROS DE INSUMOS GERAIS ---
  const filteredSupplies = useMemo(() => {
    return supplies.filter((s) => {
      const name = s.name || s.nome || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [supplies, searchTerm]);

  const criticalSuppliesCount = useMemo(() => {
    return supplies.filter((s) => {
      const current = Number(s.current_stock ?? s.quantidade ?? 0);
      const min = Number(s.min_stock ?? s.minimo_alerta ?? 0);
      return current <= min;
    }).length;
  }, [supplies]);

  // Abertura do Modal de Histórico
  const handleOpenHistory = async (roll: MaterialRollDto) => {
    setLoadingHistory(true);
    setSelectedRollHistory(null);
    try {
      const historyData = await api.rolls.getHistory(roll.id);
      setSelectedRollHistory(historyData);
    } catch (err: any) {
      toast.error('Erro ao consultar histórico e rastreabilidade da bobina: ' + (err?.message || 'Falha de rede'));
    } finally {
      setLoadingHistory(false);
    }
  };

  // Envio de Retalho / Desperdício
  const handleSaveScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapTargetRoll) return;

    const metersVal = parseFloat(scrapMeters.replace(',', '.'));
    if (isNaN(metersVal) || metersVal <= 0) {
      toast.error('Informe uma metragem válida maior que zero.');
      return;
    }

    if (metersVal > Number(scrapTargetRoll.currentMeters)) {
      toast.error(`A metragem informada (${metersVal}m) excede o saldo restante da bobina (${scrapTargetRoll.currentMeters}m).`);
      return;
    }

    if (!scrapReason.trim()) {
      toast.error('Descreva o motivo do descarte (ex: erro de corte, quebra de película).');
      return;
    }

    setScrapSubmitting(true);
    try {
      await api.rolls.registerScrap(scrapTargetRoll.id, {
        meters: metersVal,
        reason: scrapReason.trim(),
      });
      toast.success(`Descarte de ${metersVal}m registrado com sucesso!`);
      setScrapTargetRoll(null);
      setScrapMeters('');
      setScrapReason('');
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao registrar retalho: ' + (err?.message || 'Falha na requisição'));
    } finally {
      setScrapSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <Loader2 className="animate-spin text-[#0E1116] mb-4" size={44} />
        <p className="text-slate-500 font-semibold text-xs uppercase tracking-widest">
          Sincronizando estoque e bobinas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans text-[#0E1116]">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Estoque & Bobinas</h1>
            <span className="carx-pill !bg-[#0E1116] !text-[#CCFF00] !border-none !h-6 !text-[10px] font-black uppercase tracking-wider px-2.5">
              Automotivo Pro
            </span>
          </div>
          <p className="text-sm text-[#5B6674] mt-1">
            Controle de bobinas de PPF/películas com metragem linear, margem real por metro e estoque de insumos.
          </p>
        </div>

        {/* BOTÕES DE AÇÃO SUPERIOR */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'rolls' ? (
            <button
              onClick={() => {
                if (isRollsBlockedByPlan) {
                  toast.warning('O módulo de bobinas de PPF requer o Plano Profissional.');
                  return;
                }
                setShowNewRollModal(true);
              }}
              className="carx-btn-volt flex items-center gap-2"
            >
              <Plus size={18} /> Cadastrar Bobina
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingSupply(null);
                setShowNewSupplyModal(true);
              }}
              className="carx-btn-volt flex items-center gap-2"
            >
              <Plus size={18} /> Novo Insumo
            </button>
          )}
        </div>
      </div>

      {/* NAVEGAÇÃO DE TABS */}
      <div className="flex items-center gap-2 border-b border-[#E1E6EC] pb-2">
        <button
          onClick={() => setActiveTab('rolls')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'rolls'
              ? 'bg-[#0E1116] text-[#CCFF00] shadow-sm'
              : 'text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-100'
          }`}
        >
          <Layers size={18} />
          Bobinas (PPF & Películas)
          {activeRollsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
              {activeRollsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('supplies')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'supplies'
              ? 'bg-[#0E1116] text-[#CCFF00] shadow-sm'
              : 'text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-100'
          }`}
        >
          <Package size={18} />
          Insumos Gerais & Químicos
          {criticalSuppliesCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white">
              {criticalSuppliesCount} críticos
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: BOBINAS DE PPF E PELÍCULAS (T6.5) */}
      {/* ========================================================================= */}
      {activeTab === 'rolls' && (
        <div className="space-y-6">
          {/* BANNER DE UPGRADE (CASO PLANO NÃO TENHA ACESSO) */}
          {isRollsBlockedByPlan && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0E1116] via-[#1B1F27] to-[#0E1116] p-8 text-white shadow-xl border border-[#CCFF00]/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] text-xs font-black uppercase tracking-wider">
                    <Sparkles size={14} /> Recurso Exclusivo Plano Profissional & Premium
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                    Controle Fino de Bobinas (PPF & Películas) com Rastreabilidade e Margem Real
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Elimine o desperdício cego no envelopamento. Saiba exatamente quantos metros foram aplicados em cada
                    veículo, o custo real por metro gasto, o lucro líquido de cada OS e vincule a bobina e o lote
                    automaticamente ao Certificado de Garantia Digital do cliente.
                  </p>
                </div>
                <div className="shrink-0">
                  <a
                    href="/configuracoes"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#CCFF00] text-[#0E1116] font-bold text-sm hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#CCFF00]/20"
                  >
                    Fazer Upgrade de Plano
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* CARDS DE MÉTRICAS DAS BOBINAS */}
          {!isRollsBlockedByPlan && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="carx-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F3F5F7] rounded-2xl flex items-center justify-center text-[#0E1116] border border-[#E1E6EC]">
                  <Layers size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Bobinas Ativas</p>
                  <h4 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-1">{activeRollsCount}</h4>
                </div>
              </div>

              <div className="carx-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F3F5F7] rounded-2xl flex items-center justify-center text-[#0E1116] border border-[#E1E6EC]">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Saldo Total em Bobina</p>
                  <h4 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-1">
                    {totalMetersInStock.toFixed(1)} <span className="text-base font-normal text-slate-500">m</span>
                  </h4>
                </div>
              </div>

              <div className="carx-card p-5 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    lowMetersRollsCount > 0
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Metragem Crítica</p>
                  <h4
                    className={`font-display text-2xl lg:text-3xl font-bold mt-1 ${
                      lowMetersRollsCount > 0 ? 'text-amber-600' : 'text-[#0E1116]'
                    }`}
                  >
                    {String(lowMetersRollsCount).padStart(2, '0')}
                  </h4>
                </div>
              </div>

              <div className="carx-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Passaporte Digital</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-1">Auto-vínculo Ativo</p>
                  <p className="text-[11px] text-slate-500">Rastreio de lote por QR Code</p>
                </div>
              </div>
            </div>
          )}

          {/* BARRA DE FILTROS & PESQUISA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por marca, lote, código ou material..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116] transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">Status:</span>
              <button
                onClick={() => setRollFilterStatus('in_use')}
                className={`carx-pill !h-10 !px-3.5 text-xs font-bold transition-all ${
                  rollFilterStatus === 'in_use'
                    ? '!bg-[#0E1116] !text-[#CCFF00] !border-[#0E1116]'
                    : 'text-[#5B6674]'
                }`}
              >
                Em Uso
              </button>
              <button
                onClick={() => setRollFilterStatus('depleted')}
                className={`carx-pill !h-10 !px-3.5 text-xs font-bold transition-all ${
                  rollFilterStatus === 'depleted'
                    ? '!bg-[#0E1116] !text-[#CCFF00] !border-[#0E1116]'
                    : 'text-[#5B6674]'
                }`}
              >
                Esgotadas
              </button>
              <button
                onClick={() => setRollFilterStatus('all')}
                className={`carx-pill !h-10 !px-3.5 text-xs font-bold transition-all ${
                  rollFilterStatus === 'all'
                    ? '!bg-[#0E1116] !text-[#CCFF00] !border-[#0E1116]'
                    : 'text-[#5B6674]'
                }`}
              >
                Todas
              </button>
            </div>
          </div>

          {/* TABELA DE BOBINAS */}
          <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E1E6EC]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Bobina / Película</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Identificação</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Dimensões</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Saldo & Metragem</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Custo / Metro</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase text-right tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6EC]">
                  {filteredRolls.map((roll) => {
                    const current = Number(roll.currentMeters) || 0;
                    const initial = Number(roll.initialMeters) || 1;
                    const percent = Math.min(100, Math.max(0, Math.round((current / initial) * 100)));
                    const costPerMeter = Math.round((roll.costCents || 0) / initial);

                    const isDepleted = roll.status === 'depleted' || current === 0;
                    const isLow = roll.isLowMeters && !isDepleted;

                    return (
                      <tr key={roll.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Material & Marca */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0E1116] border border-[#E1E6EC]">
                              <Layers size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#0E1116]">{roll.materialName || 'PPF / Película'}</p>
                              <p className="text-xs text-[#5B6674] font-medium">{roll.brand || 'Marca não informada'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Código & Lote */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#F3F5F7] text-[#0E1116] border border-[#E1E6EC]">
                              {roll.code || 'S/ Código'}
                            </span>
                            {roll.lotNumber && (
                              <p className="text-[11px] text-[#5B6674] font-mono">
                                Lote: <span className="font-semibold text-slate-700">{roll.lotNumber}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Dimensões */}
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-[#0E1116]">
                            Largura: {roll.widthMeters ? `${roll.widthMeters}m` : '1.52m'}
                          </p>
                          <p className="text-[11px] text-slate-500">Inicial: {initial}m</p>
                        </td>

                        {/* Barra de Progresso de Metragem */}
                        <td className="px-6 py-4">
                          <div className="w-44 space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-[#0E1116]">
                              <span>
                                {current.toFixed(1)}m <span className="text-slate-400 font-normal">/ {initial}m</span>
                              </span>
                              <span className={isLow ? 'text-amber-600' : isDepleted ? 'text-slate-400' : 'text-emerald-700'}>
                                {percent}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDepleted
                                    ? 'bg-slate-300'
                                    : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Custo por Metro */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#0E1116]">
                            R$ {(costPerMeter / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] text-slate-400">por metro linear</p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isDepleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Esgotada
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Metragem Baixa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Em Uso
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Histórico & Margem Real */}
                            <button
                              onClick={() => handleOpenHistory(roll)}
                              className="carx-pill !h-9 !px-3 text-xs font-semibold hover:border-[#0E1116] transition-all flex items-center gap-1.5"
                              title="Histórico e Rentabilidade por Veículo"
                            >
                              <History size={15} />
                              <span className="hidden xl:inline">Histórico & Margem</span>
                            </button>

                            {/* Descarte / Retalho */}
                            {!isDepleted && (
                              <button
                                onClick={() => {
                                  setScrapTargetRoll(roll);
                                  setScrapMeters('');
                                  setScrapReason('');
                                }}
                                className="carx-pill !h-9 !px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-1.5"
                                title="Registrar Retalho / Desperdício de Corte"
                              >
                                <Scissors size={15} />
                                <span className="hidden xl:inline">Retalho</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRolls.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400">
                        <Layers size={44} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm text-[#0E1116]">Nenhuma bobina encontrada</p>
                        <p className="text-xs text-[#5B6674] mt-1">
                          {searchTerm
                            ? 'Nenhum resultado corresponde à sua pesquisa.'
                            : 'Cadastre sua primeira bobina de PPF ou película para iniciar o rastreio por metro.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: INSUMOS GERAIS & PRODUTOS QUÍMICOS */}
      {/* ========================================================================= */}
      {activeTab === 'supplies' && (
        <div className="space-y-6">
          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="carx-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F3F5F7] rounded-2xl flex items-center justify-center text-[#0E1116] border border-[#E1E6EC]">
                <Package size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Total de Itens Cadastrados</p>
                <h4 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-1">{supplies.length}</h4>
              </div>
            </div>

            <div className="carx-card p-5 flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  criticalSuppliesCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Estoque Crítico</p>
                <h4
                  className={`font-display text-2xl lg:text-3xl font-bold mt-1 ${
                    criticalSuppliesCount > 0 ? 'text-rose-600' : 'text-[#0E1116]'
                  }`}
                >
                  {String(criticalSuppliesCount).padStart(2, '0')}
                </h4>
              </div>
            </div>
          </div>

          {/* BUSCA DE INSUMOS */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do insumo químico ou material..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116] transition-all shadow-2xs"
            />
          </div>

          {/* TABELA DE INSUMOS GERAIS */}
          <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E1E6EC]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Insumo / Produto</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Unidade</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase text-center tracking-wider">
                      Estoque Atual
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase text-right tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6EC]">
                  {filteredSupplies
                    .slice((suppliesCurrentPage - 1) * suppliesPerPage, suppliesCurrentPage * suppliesPerPage)
                    .map((item) => {
                      const name = item.name || item.nome;
                      const unit = item.unit || item.unidade || 'un';
                      const current = Number(item.current_stock ?? item.quantidade ?? 0);
                      const min = Number(item.min_stock ?? item.minimo_alerta ?? 0);
                      const isCritical = current <= min;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-[#0E1116]">{name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-md">
                              {unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-black text-[#0E1116]">{current}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCritical ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                                }`}
                              />
                              {isCritical ? 'Estoque Crítico' : 'Adequado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Repor Estoque */}
                              <button
                                onClick={() => setRepondoSupply(item)}
                                className="carx-pill !h-9 !px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center gap-1"
                                title="Entrada Rápida no Estoque"
                              >
                                <ArrowUpRight size={15} />
                                Repor
                              </button>

                              {/* Editar */}
                              <button
                                onClick={() => {
                                  setEditingSupply(item);
                                  setShowNewSupplyModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-[#0E1116] hover:bg-slate-100 rounded-xl transition-all"
                                title="Editar Insumo"
                              >
                                <Edit2 size={16} />
                              </button>

                              {/* Excluir */}
                              <button
                                onClick={async () => {
                                  const confirmed = await confirmDialog(
                                    'Excluir Insumo',
                                    `Tem certeza que deseja remover "${name}" do estoque?`,
                                    'Excluir',
                                    'Cancelar'
                                  );
                                  if (confirmed) {
                                    try {
                                      await api.materials.delete(item.id);
                                      toast.success('Insumo removido com sucesso!');
                                      await loadData();
                                    } catch (err: any) {
                                      toast.error('Erro ao excluir insumo: ' + (err?.message || 'Falha no servidor'));
                                    }
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Excluir Insumo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {filteredSupplies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400">
                        <Package size={44} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm text-[#0E1116]">Nenhum insumo encontrado</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={suppliesCurrentPage}
              totalItems={filteredSupplies.length}
              itemsPerPage={suppliesPerPage}
              onPageChange={setSuppliesCurrentPage}
              onItemsPerPageChange={setSuppliesPerPage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: HISTÓRICO, RASTREABILIDADE & MARGEM REAL POR METRO (T6.5) */}
      {/* ========================================================================= */}
      {(selectedRollHistory || loadingHistory) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-[#E1E6EC] my-8 animate-scaleUp">
            {/* Header Modal */}
            <div className="p-6 border-b border-[#E1E6EC] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold text-[#0E1116]">
                    Rastreabilidade da Bobina & Margem Real
                  </h3>
                  <span className="carx-pill !bg-[#0E1116] !text-[#CCFF00] !border-none !h-6 !text-[10px] font-black uppercase px-2.5">
                    Lote #{selectedRollHistory?.lotNumber || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-[#5B6674] mt-0.5">
                  {selectedRollHistory?.materialName} • {selectedRollHistory?.brand || 'Sem marca'} • Código:{' '}
                  {selectedRollHistory?.code || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRollHistory(null)}
                className="p-2 text-slate-400 hover:text-[#0E1116] hover:bg-slate-200 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-[#0E1116] mb-3" size={36} />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Calculando margem real e resgatando OSs...
                </p>
              </div>
            ) : selectedRollHistory ? (
              <div className="p-6 space-y-6">
                {/* CARDS DE PERFORMANCE DA BOBINA */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E1E6EC]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6674]">Aproveitamento</p>
                    <p className="font-display text-2xl font-bold text-emerald-700 mt-1">
                      {selectedRollHistory.efficiencyPercent}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedRollHistory.consumedMeters.toFixed(1)}m aplicados / {selectedRollHistory.scrapMeters.toFixed(1)}m
                      retalho
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E1E6EC]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6674]">Custo Base / Metro</p>
                    <p className="font-display text-2xl font-bold text-[#0E1116] mt-1">
                      R$ {(selectedRollHistory.costPerMeterCents / 100).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Metragem inicial: {selectedRollHistory.initialMeters}m</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E1E6EC]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6674]">Receita Gerada</p>
                    <p className="font-display text-2xl font-bold text-[#0E1116] mt-1">
                      R$ {(selectedRollHistory.totalRevenueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Faturado em serviços com este rolo</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Lucro Bruto Real</p>
                    <p className="font-display text-2xl font-bold text-emerald-700 mt-1">
                      R$ {(selectedRollHistory.totalGrossProfitCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-800 mt-0.5">
                      Margem Média: {selectedRollHistory.averageMarginPercent}%
                    </p>
                  </div>
                </div>

                {/* TABELA DE APLICAÇÕES POR VEÍCULO */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E1116] flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" /> Ordens de Serviço Vinculadas & Veículos
                  </h4>

                  <div className="border border-[#E1E6EC] rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E1E6EC]">
                        <tr>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase">OS & Veículo</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase">Cliente</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase text-center">Metros Gastos</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase text-right">Custo Insumo</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase text-right">Faturado</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase text-right">Margem Real</th>
                          <th className="px-4 py-3 font-bold text-[#5B6674] uppercase text-center">Passaporte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E6EC]">
                        {selectedRollHistory.history.map((h) => (
                          <tr key={h.workOrderId} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <span className="font-bold text-[#0E1116]">OS #{h.osNumber}</span>
                              <p className="text-[11px] text-[#5B6674]">
                                {h.vehicleModel} • <span className="font-mono font-bold">{h.vehiclePlate}</span>
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800">{h.customerName}</span>
                              {h.customerPhone && <p className="text-[10px] text-slate-400">{h.customerPhone}</p>}
                            </td>

                            <td className="px-4 py-3 text-center font-bold text-[#0E1116]">
                              {h.metersUsed.toFixed(1)} m
                            </td>

                            <td className="px-4 py-3 text-right font-medium text-slate-600">
                              R$ {(h.costAllocatedCents / 100).toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-right font-bold text-[#0E1116]">
                              R$ {(h.servicePriceCents / 100).toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {h.grossMarginPercent}%
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              {h.warrantyToken ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                                  title="Garantia emitida com Passaporte Digital e rastreio de lote"
                                >
                                  <ShieldCheck size={13} />
                                  Garantido
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">Sem certificado</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {selectedRollHistory.history.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400">
                              Esta bobina ainda não teve metros baixados em nenhuma Ordem de Serviço concluída.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E6EC] flex justify-end">
              <button
                onClick={() => setSelectedRollHistory(null)}
                className="carx-pill !h-10 !px-5 text-xs font-bold"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTRO DE RETALHO / PERDA DE CORTE (T6.5) */}
      {/* ========================================================================= */}
      {scrapTargetRoll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#E1E6EC] animate-scaleUp">
            <div className="p-6 border-b border-[#E1E6EC] bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Scissors size={20} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0E1116]">Registrar Retalho / Perda</h3>
                  <p className="text-xs text-[#5B6674]">
                    Bobina {scrapTargetRoll.code || ''} (Saldo atual: {scrapTargetRoll.currentMeters}m)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScrapTargetRoll(null)}
                className="p-2 text-slate-400 hover:text-[#0E1116] rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveScrap} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Metragem Desperdiçada / Retalho (metros) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: 2.5"
                  value={scrapMeters}
                  onChange={(e) => setScrapMeters(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-base font-bold text-[#0E1116] outline-none focus:border-rose-500 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Saldo restante após o descarte:{' '}
                  <span className="font-bold text-[#0E1116]">
                    {Math.max(0, Number(scrapTargetRoll.currentMeters) - (parseFloat(scrapMeters.replace(',', '.')) || 0)).toFixed(1)}m
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Justificativa / Motivo do Descarte *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Corte desalinhado no capô; vinco térmico irrecuperável; refugo de ponta de rolo..."
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-rose-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setScrapTargetRoll(null)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={scrapSubmitting}
                  className="flex-[2] py-3 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {scrapSubmitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Scissors size={16} /> Confirmar Descarte
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CADASTRO DE NOVA BOBINA (T6.5) */}
      {/* ========================================================================= */}
      {showNewRollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-[#E1E6EC] my-8 animate-scaleUp">
            <div className="p-6 border-b border-[#E1E6EC] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-[#0E1116]">Cadastrar Nova Bobina</h3>
                <p className="text-xs text-[#5B6674] mt-0.5">PPF, Película Solar ou Vinil Envelopamento</p>
              </div>
              <button
                onClick={() => setShowNewRollModal(false)}
                className="p-2 text-slate-400 hover:text-[#0E1116] rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                const materialId = formData.get('materialId') as string;
                const brand = (formData.get('brand') as string) || '';
                const code = (formData.get('code') as string) || '';
                const lotNumber = (formData.get('lotNumber') as string) || '';
                const widthMeters = parseFloat((formData.get('widthMeters') as string) || '1.52');
                const initialMeters = parseFloat((formData.get('initialMeters') as string) || '15');
                const costCents = Math.round(parseFloat((formData.get('costReais') as string) || '0') * 100);
                const minAlertMeters = parseFloat((formData.get('minAlertMeters') as string) || '3');
                const notes = (formData.get('notes') as string) || '';

                if (!materialId) {
                  toast.error('Selecione o tipo de material correspondente.');
                  return;
                }

                try {
                  await api.rolls.create({
                    materialId,
                    brand,
                    code,
                    lotNumber,
                    widthMeters,
                    initialMeters,
                    costCents,
                    minAlertMeters,
                    notes,
                  });
                  toast.success('Bobina cadastrada com sucesso!');
                  setShowNewRollModal(false);
                  await loadData();
                } catch (err: any) {
                  toast.error('Erro ao cadastrar bobina: ' + (err?.message || 'Falha no servidor'));
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Material Base *
                </label>
                <select
                  name="materialId"
                  required
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                >
                  <option value="">Selecione o insumo base...</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.nome} ({s.unit || s.unidade || 'm'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se o tipo de PPF não existir na lista, cadastre primeiro em "Insumos Gerais".
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Marca / Fabricante *
                  </label>
                  <input
                    name="brand"
                    required
                    placeholder="Ex: STEK DynoShield, Suntek, 3M"
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Lote de Fabricação *
                  </label>
                  <input
                    name="lotNumber"
                    required
                    placeholder="Ex: XP-99402"
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-mono font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Código Interno / Rolo
                  </label>
                  <input
                    name="code"
                    placeholder="Ex: BOB-PPF-01"
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Largura da Bobina (m)
                  </label>
                  <input
                    name="widthMeters"
                    type="number"
                    step="0.01"
                    defaultValue="1.52"
                    required
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Metragem Inicial *
                  </label>
                  <input
                    name="initialMeters"
                    type="number"
                    step="0.1"
                    defaultValue="15.0"
                    required
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-bold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Custo Total (R$) *
                  </label>
                  <input
                    name="costReais"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 4500.00"
                    required
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-bold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Alerta Crítico (m)
                  </label>
                  <input
                    name="minAlertMeters"
                    type="number"
                    step="0.1"
                    defaultValue="3.0"
                    required
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-bold text-amber-600 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Observações & Procedência
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Ex: Bobina importada com garantia do distribuidor oficial..."
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewRollModal(false)}
                  className="flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3.5 carx-btn-volt flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Salvar Bobina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: NOVO / EDITAR INSUMO GERAL */}
      {/* ========================================================================= */}
      {showNewSupplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#E1E6EC] animate-scaleUp">
            <div className="p-6 border-b border-[#E1E6EC] bg-[#F8FAFC] flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#0E1116]">
                {editingSupply ? 'Editar Insumo' : 'Novo Insumo Geral'}
              </h3>
              <button
                onClick={() => {
                  setShowNewSupplyModal(false);
                  setEditingSupply(null);
                }}
                className="p-2 text-slate-400 hover:text-[#0E1116] rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const unit = formData.get('unit') as string;
                const quantity = parseFloat((formData.get('quantity') as string) || '0');
                const minStock = parseFloat((formData.get('minStock') as string) || '0');

                try {
                  if (editingSupply) {
                    await api.materials.update(editingSupply.id, {
                      name,
                      unit,
                      current_stock: quantity,
                      min_stock: minStock,
                    });
                    toast.success('Insumo atualizado!');
                  } else {
                    await api.materials.create({
                      name,
                      unit,
                      current_stock: quantity,
                      min_stock: minStock,
                      category: 'outros',
                    });
                    toast.success('Insumo criado com sucesso!');
                  }
                  setShowNewSupplyModal(false);
                  setEditingSupply(null);
                  await loadData();
                } catch (err: any) {
                  toast.error('Erro ao salvar insumo: ' + (err?.message || 'Falha no servidor'));
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Nome do Insumo *
                </label>
                <input
                  name="name"
                  defaultValue={editingSupply?.name || editingSupply?.nome || ''}
                  required
                  placeholder="Ex: Composto Polidor Menzerma, Boina de Lã 5''..."
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Unidade de Medida *
                  </label>
                  <select
                    name="unit"
                    defaultValue={editingSupply?.unit || editingSupply?.unidade || 'un'}
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-semibold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="l">Litros (L)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                    Quantidade Atual *
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    defaultValue={editingSupply?.current_stock ?? editingSupply?.quantidade ?? 0}
                    required
                    className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-bold text-[#0E1116] outline-none focus:border-[#0E1116]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5">
                  Mínimo para Alerta Crítico *
                </label>
                <input
                  name="minStock"
                  type="number"
                  step="0.01"
                  defaultValue={editingSupply?.min_stock ?? editingSupply?.minimo_alerta ?? 5}
                  required
                  className="w-full px-4 py-3 bg-white border border-[#E1E6EC] rounded-2xl text-sm font-bold text-rose-600 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSupplyModal(false);
                    setEditingSupply(null);
                  }}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 carx-btn-volt flex items-center justify-center gap-2"
                >
                  <Package size={18} /> {editingSupply ? 'Salvar Alterações' : 'Criar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REPOSIÇÃO RÁPIDA DE ESTOQUE */}
      {/* ========================================================================= */}
      {repondoSupply && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-[#E1E6EC] animate-scaleUp">
            <div className="p-6 text-center bg-emerald-50/50 border-b border-emerald-100">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                <ArrowUpRight size={26} />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0E1116]">Reposição de Estoque</h3>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                {repondoSupply.name || repondoSupply.nome}
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const qtd = parseFloat(((formData.get('qtd') as string) || '').replace(',', '.'));

                if (isNaN(qtd) || qtd <= 0) {
                  toast.error('Informe uma quantidade válida.');
                  return;
                }

                try {
                  await api.materials.createMovement({
                    materialId: repondoSupply.id,
                    type: 'entry',
                    quantity: qtd,
                    reason: 'Entrada manual de reposição',
                  });
                  toast.success(`Estoque atualizado: +${qtd} ${repondoSupply.unit || repondoSupply.unidade || 'un'}`);
                  setRepondoSupply(null);
                  await loadData();
                } catch (err: any) {
                  toast.error('Erro ao atualizar estoque: ' + (err?.message || 'Falha no servidor'));
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B6674] block mb-1.5 text-center">
                  Quantidade que Chegou ({repondoSupply.unit || repondoSupply.unidade || 'un'})
                </label>
                <input
                  name="qtd"
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0,00"
                  className="w-full text-3xl font-black text-center py-4 bg-slate-50 border border-[#E1E6EC] rounded-2xl outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRepondoSupply(null)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriaisView;

