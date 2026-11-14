import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Wrench,
  Car,
  Clock,
  CheckCircle2,
  Tv,
  Calendar,
  X,
  RefreshCw,
  Search,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Phone
} from 'lucide-react';
import type { WorkOrderStatusType } from '@carx/shared';

export interface DashboardWorkOrder {
  id: string;
  osNumber: number;
  status: WorkOrderStatusType | string;
  progress: number;
  totalCents: number;
  finalCents: number;
  paidCents: number;
  estimatedMinutes?: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    color?: string;
    sizeClass?: string;
  };
  technician?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

function formatBRL(centsOrReais: number, isCents = false): string {
  const val = isCents ? (centsOrReais || 0) / 100 : centsOrReais || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<'kanban' | 'lista'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<DashboardWorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // 1. Consulta ordens de serviço
  const {
    data: ordersData,
    isLoading: loadingOrders,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-work-orders'],
    queryFn: async () => {
      const res = await api.workOrders.list({ limit: 100 });
      return res;
    },
    refetchInterval: 15000,
  });

  // 2. Consulta alertas reais de estoque baixo
  const { data: lowStockData } = useQuery({
    queryKey: ['dashboard-low-stock-alerts'],
    queryFn: () => api.materials.getLowStockAlerts().catch(() => []),
    staleTime: 1000 * 60,
  });

  // 3. Consulta métricas reais de NPS
  const { data: npsMetrics } = useQuery({
    queryKey: ['dashboard-nps-metrics'],
    queryFn: () => api.nps.getMetrics().catch(() => null),
    staleTime: 1000 * 60,
  });

  const allOrders: DashboardWorkOrder[] = useMemo(() => {
    return ordersData?.workOrders || [];
  }, [ordersData]);

  const lowStockItems: any[] = useMemo(() => {
    if (!lowStockData) return [];
    if (Array.isArray(lowStockData)) return lowStockData;
    return lowStockData.alerts || lowStockData.materials || lowStockData.items || [];
  }, [lowStockData]);

  const pendingQuotesCount = useMemo(
    () => allOrders.filter((o) => o.status === 'QUOTE').length,
    [allOrders]
  );

  const patioOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.status !== 'DELIVERED' &&
        o.status !== 'CANCELED' &&
        o.status !== 'QUOTE'
    );
  }, [allOrders]);

  // Cálculos de métricas do Dashboard
  const stats = useMemo(() => {
    const waiting = patioOrders.filter(
      (o) => o.status === 'CHECKED_IN' || o.status === 'SCHEDULED' || o.status === 'APPROVED'
    ).length;
    const inProgress = patioOrders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'QA').length;
    const ready = patioOrders.filter((o) => o.status === 'READY').length;
    const delivered = allOrders.filter((o) => o.status === 'DELIVERED').length;

    const totalCents = allOrders
      .filter((o) => o.status === 'DELIVERED' || o.status === 'READY')
      .reduce((acc, curr) => acc + (curr.finalCents || curr.totalCents || 0), 0);

    return {
      faturamentoReais: totalCents / 100,
      waiting,
      inProgress,
      ready,
      delivered,
    };
  }, [patioOrders, allOrders]);

  // Colunas do Pátio Agora
  const colAguardando = useMemo(
    () => patioOrders.filter((o) => o.status === 'CHECKED_IN' || o.status === 'SCHEDULED' || o.status === 'APPROVED'),
    [patioOrders]
  );
  const colExecucao = useMemo(
    () => patioOrders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'QA'),
    [patioOrders]
  );
  const colProntas = useMemo(
    () => patioOrders.filter((o) => o.status === 'READY'),
    [patioOrders]
  );

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return allOrders;
    const term = searchTerm.toLowerCase().trim();
    return allOrders.filter((o) => {
      const plate = o.vehicle?.plate?.toLowerCase() || '';
      const model = o.vehicle?.model?.toLowerCase() || '';
      const customer = o.customer?.name?.toLowerCase() || '';
      const osNum = String(o.osNumber);
      return plate.includes(term) || model.includes(term) || customer.includes(term) || osNum.includes(term);
    });
  }, [allOrders, searchTerm]);

  // Data formatada para o topo
  const formattedToday = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(d);
  }, []);

  return (
    <div className="space-y-6 pb-12 font-sans text-[#0E1116]">
      {/* 1. Topo Integrado Canônico do Rebrand */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[#0E1116]">
            {greeting}, {profile?.nome ? profile.nome.split(' ')[0] : 'Gestor'}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-[#5B6674] capitalize">
            <span>{formattedToday}</span>
            <span>·</span>
            <div className="inline-flex items-center gap-1.5 font-semibold text-[#0E1116] lowercase">
              <span className="w-2 h-2 rounded-full bg-[#C8F52E] animate-ping" />
              pátio ao vivo
            </div>
          </div>
        </div>

        {/* Ações do Topo */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => refetch()}
            className="carx-pill hover:bg-white"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => navigate('/tv')}
            className="carx-pill"
          >
            <Tv size={16} className="text-[#0E1116]" />
            <span>Monitor TV</span>
          </button>

          <button
            onClick={() => navigate('/agenda')}
            className="carx-pill"
          >
            <Calendar size={16} />
            <span>Agenda</span>
          </button>

          <button
            onClick={() => navigate('/ordens/nova')}
            className="carx-btn-dark"
          >
            <Wrench size={16} className="text-[#C8F52E]" />
            <span>+ Nova OS</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de 4 Cards de Métricas Brancos (Fiel ao Rebrand) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento */}
        <div className="carx-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5B6674]">Faturamento convertido</span>
            <span className="w-8 h-8 rounded-xl bg-[#F3F5F7] flex items-center justify-center text-[#0E1116]">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] tracking-tight">
              {formatBRL(stats.faturamentoReais)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#5B6674]">este mês</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C8F52E] text-[#0E1116]">
                {allOrders.length} OS no período
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Aguardando início */}
        <div className="carx-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5B6674]">Aguardando início</span>
            <span className="w-8 h-8 rounded-xl bg-[#F3F5F7] flex items-center justify-center text-[#5B6674]">
              <Car size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116]">
              {stats.waiting}
            </div>
            <p className="text-xs text-[#5B6674] mt-1">veículos na fila do pátio</p>
          </div>
        </div>

        {/* Card 3: Em execução / Concluídas */}
        <div className="carx-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5B6674]">Em execução</span>
            <span className="w-8 h-8 rounded-xl bg-[#C8F52E]/30 flex items-center justify-center text-[#0E1116]">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116]">
              {stats.inProgress}
            </div>
            <p className="text-xs text-[#5B6674] mt-1">boxes ativos com cronômetro</p>
          </div>
        </div>

        {/* Card 4: Entregues */}
        <div className="carx-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5B6674]">Entregues</span>
            <span className="w-8 h-8 rounded-xl bg-[#0E1116] flex items-center justify-center text-[#C8F52E]">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116]">
              {stats.delivered}
            </div>
            <p className="text-xs text-[#5B6674] mt-1">clientes atendidos este ano</p>
          </div>
        </div>
      </div>

      {/* 3. Área Principal: Pátio Agora (Esquerda) e Atenção Hoje (Direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Coluna Esquerda: Pátio Agora */}
        <div className="bg-[#ECEFF3] rounded-3xl p-6 flex flex-col gap-5">
          {/* Topo do Pátio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-[#0E1116]">Pátio agora</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-bold text-[#0E1116] border border-[#E1E6EC]">
                  {patioOrders.length} no pátio
                </span>
              </div>
              <p className="text-xs text-[#5B6674] mt-0.5">Fluxo de trabalho e produção em tempo real</p>
            </div>

            {/* Alternar Visualização */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E1E6EC]">
              <button
                onClick={() => setActiveView('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'kanban'
                    ? 'bg-[#0E1116] text-white shadow-sm'
                    : 'text-[#5B6674] hover:text-[#0E1116]'
                }`}
              >
                Colunas (Kanban)
              </button>
              <button
                onClick={() => setActiveView('lista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'lista'
                    ? 'bg-[#0E1116] text-white shadow-sm'
                    : 'text-[#5B6674] hover:text-[#0E1116]'
                }`}
              >
                Lista ({allOrders.length})
              </button>
            </div>
          </div>

          {/* Modo Kanban de 3 Subcolunas */}
          {activeView === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Subcoluna 1: AGUARDANDO */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold tracking-wider uppercase text-[#5B6674]">
                    Aguardando ({colAguardando.length})
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colAguardando.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => setSelectedOrder(os)}
                      className="bg-white border border-[#E1E6EC] rounded-2xl p-4 shadow-sm hover:border-[#0E1116] transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#F3F5F7] text-[#0E1116] border border-[#E1E6EC]">
                          {os.vehicle?.plate || 'SEM PLACA'}
                        </span>
                        <span className="text-xs font-bold text-[#5B6674]">OS #{os.osNumber}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0E1116] truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo não cadastrado'}
                      </h4>
                      <p className="text-xs text-[#5B6674] truncate mt-0.5">
                        {os.customer?.name || 'Cliente'}
                      </p>
                      <div className="mt-3 pt-2.5 border-t border-[#E1E6EC] flex items-center justify-between text-xs">
                        <span className="text-[#5B6674] font-medium">Previsão: 2h</span>
                        <span className="font-bold text-[#0E1116] font-mono">
                          {formatBRL(os.finalCents || os.totalCents, true)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colAguardando.length === 0 && (
                    <div className="bg-white/60 border border-dashed border-[#E1E6EC] rounded-2xl p-6 text-center text-xs text-[#5B6674]">
                      Nenhum carro aguardando
                    </div>
                  )}
                </div>
              </div>

              {/* Subcoluna 2: EM EXECUÇÃO (Com destaque Verde Volt) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold tracking-wider uppercase text-[#0E1116] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C8F52E]" />
                    Em execução ({colExecucao.length})
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colExecucao.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => setSelectedOrder(os)}
                      className="bg-white border-2 border-[#C8F52E] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#C8F52E] text-[#0E1116]">
                          {os.vehicle?.plate || 'SEM PLACA'}
                        </span>
                        <span className="text-xs font-bold text-[#0E1116]">OS #{os.osNumber}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0E1116] truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo não cadastrado'}
                      </h4>
                      <p className="text-xs text-[#5B6674] truncate mt-0.5">
                        Técnico: {os.technician?.name || 'Equipe Box'}
                      </p>
                      
                      {/* Barra de progresso */}
                      <div className="w-full bg-[#F3F5F7] h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="bg-[#C8F52E] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(os.progress || 60, 20)}%` }}
                        />
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E1E6EC] flex items-center justify-between text-xs">
                        <span className="text-[#0E1116] font-semibold flex items-center gap-1">
                          <Clock size={13} className="text-[#0E1116]" /> Em andamento
                        </span>
                        <span className="font-bold text-[#0E1116] font-mono">
                          {formatBRL(os.finalCents || os.totalCents, true)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colExecucao.length === 0 && (
                    <div className="bg-white/60 border border-dashed border-[#E1E6EC] rounded-2xl p-6 text-center text-xs text-[#5B6674]">
                      Nenhum carro em execução agora
                    </div>
                  )}
                </div>
              </div>

              {/* Subcoluna 3: PRONTAS */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold tracking-wider uppercase text-[#5B6674]">
                    Prontas ({colProntas.length})
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colProntas.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => setSelectedOrder(os)}
                      className="bg-white border border-[#E1E6EC] rounded-2xl p-4 shadow-sm hover:border-[#0E1116] transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#F3F5F7] text-[#0E1116] border border-[#E1E6EC]">
                          {os.vehicle?.plate || 'SEM PLACA'}
                        </span>
                        <span className="text-xs font-bold text-[#0E1116]">OS #{os.osNumber}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0E1116] truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                      </h4>
                      <p className="text-xs text-[#5B6674] truncate mt-0.5">
                        {os.customer?.name}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-[#E1E6EC] flex items-center justify-between text-xs">
                        <span className="text-[#0E1116] font-bold flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-[#C8F52E]" /> Pronto
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (os.customer?.phone) {
                              const phone = os.customer.phone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${phone}?text=Ol%C3%A1%20${encodeURIComponent(os.customer?.name || '')},%20seu%20ve%C3%ADculo%20${encodeURIComponent(os.vehicle?.model || '')}%20est%C3%A1%20pronto%20para%20retirada!`, '_blank');
                            }
                          }}
                          className="text-[11px] font-bold text-[#0E1116] underline hover:text-black flex items-center gap-1"
                        >
                          <MessageSquare size={12} /> Avisar
                        </button>
                      </div>
                    </div>
                  ))}

                  {colProntas.length === 0 && (
                    <div className="bg-white/60 border border-dashed border-[#E1E6EC] rounded-2xl p-6 text-center text-xs text-[#5B6674]">
                      Nenhum carro pronto aguardando retirada
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Modo Lista de Ordens */
            <div className="bg-white border border-[#E1E6EC] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#E1E6EC] flex items-center gap-2">
                <Search size={16} className="text-[#5B6674]" />
                <input
                  type="text"
                  placeholder="Filtrar por placa, cliente ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-transparent outline-none text-[#0E1116] placeholder:text-[#5B6674]"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3F5F7] text-[#5B6674] uppercase tracking-wider border-b border-[#E1E6EC] font-semibold">
                    <tr>
                      <th className="py-3 px-4">OS #</th>
                      <th className="py-3 px-4">Veículo</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Valor Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E6EC]">
                    {filteredOrders.map((os) => (
                      <tr
                        key={os.id}
                        onClick={() => setSelectedOrder(os)}
                        className="hover:bg-[#F3F5F7] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#0E1116]">
                          #{os.osNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#0E1116]">
                            {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                          </span>
                          <span className="text-[11px] text-[#5B6674] font-mono block">
                            {os.vehicle?.plate}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#0E1116] font-medium">
                          {os.customer?.name || 'Cliente'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F3F5F7] text-[#0E1116] border border-[#E1E6EC]">
                            {os.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0E1116]">
                          {formatBRL(os.finalCents || os.totalCents, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Atenção Hoje (Cards Brancos de Destaque) */}
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-lg font-bold text-[#0E1116]">Atenção hoje</h3>

          {/* Card 1: Orçamentos Pendentes */}
          <div className="carx-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Orçamentos</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FFE2A8] text-[#0E1116] text-[11px] font-bold">
                {pendingQuotesCount} {pendingQuotesCount === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#0E1116]">
                {pendingQuotesCount > 0 ? 'Propostas aguardando aprovação' : 'Nenhum orçamento pendente'}
              </h4>
              <p className="text-xs text-[#5B6674] mt-0.5">
                {pendingQuotesCount > 0
                  ? `${pendingQuotesCount} orçamento(s) aguardam confirmação do cliente.`
                  : 'Todos os orçamentos recentes foram convertidos ou finalizados.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/vendas')}
              className="carx-btn-dark !h-10 !text-xs !px-4 mt-1"
            >
              Ver orçamentos <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 2: Alerta de Bobina / Estoque Crítico */}
          <div className="carx-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Estoque Crítico</span>
              {lowStockItems.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#E5484D] text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> {lowStockItems.length} alerta{lowStockItems.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#E1E6EC] text-[#5B6674] text-[11px] font-bold">
                  Normal
                </span>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#0E1116]">
                {lowStockItems.length > 0
                  ? lowStockItems[0]?.name || lowStockItems[0]?.materialName || 'Insumo em nível crítico'
                  : 'Estoque em dia'}
              </h4>
              <p className="text-xs text-[#5B6674] mt-0.5">
                {lowStockItems.length > 0
                  ? `${lowStockItems.length} insumo(s) abaixo do mínimo de segurança configurado.`
                  : 'Nenhum produto abaixo do estoque mínimo neste momento.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/estoque')}
              className="carx-btn-white !h-10 !text-xs !px-4 mt-1"
            >
              {lowStockItems.length > 0 ? 'Repor no estoque' : 'Ver estoque'}
            </button>
          </div>

          {/* Card 3: Satisfação & Retenção NPS */}
          <div className="carx-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Satisfação do Cliente</span>
              <span className="px-2 py-0.5 rounded-full bg-[#C8F52E] text-[#0E1116] text-[11px] font-bold">
                {npsMetrics && npsMetrics.totalAnswered > 0 ? `NPS ${npsMetrics.npsScore}` : 'Sem dados'}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#0E1116]">
                {npsMetrics && npsMetrics.totalAnswered > 0
                  ? npsMetrics.npsScore >= 75
                    ? 'Zona de Excelência'
                    : npsMetrics.npsScore >= 50
                      ? 'Zona de Qualidade'
                      : 'Atenção à Experiência'
                  : 'Aguardando primeiras avaliações'}
              </h4>
              <p className="text-xs text-[#5B6674] mt-0.5">
                {npsMetrics && npsMetrics.totalAnswered > 0
                  ? `${npsMetrics.totalAnswered} avaliação(ões) recebida(s), com ${npsMetrics.promotersCount} promotor(es).`
                  : 'Dispare pesquisas NPS após a entrega das ordens de serviço.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/relatorios')}
              className="carx-btn-white !h-10 !text-xs !px-4 mt-1"
            >
              Disparar avaliações
            </button>
          </div>
        </div>
      </div>

      {/* Modal Clean de Detalhes da Ordem */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="carx-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-[#E1E6EC] flex items-center justify-between bg-[#F3F5F7]">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0E1116]">
                  Ordem de Serviço #{selectedOrder.osNumber}
                </h3>
                <span className="text-xs font-mono font-bold text-[#5B6674]">
                  Placa: {selectedOrder.vehicle?.plate || 'Não informada'}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl hover:bg-white text-[#5B6674] hover:text-[#0E1116] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo Modal */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-[#F3F5F7] p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#5B6674] block">Veículo</span>
                  <span className="font-bold text-sm text-[#0E1116]">
                    {selectedOrder.vehicle ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}` : 'Veículo'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5B6674] block">Cliente</span>
                  <span className="font-bold text-sm text-[#0E1116]">{selectedOrder.customer?.name}</span>
                </div>
              </div>

              <div className="border border-[#E1E6EC] rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-[#5B6674]">
                  <span>Status Atual</span>
                  <span className="font-bold text-[#0E1116]">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between text-xs text-[#5B6674]">
                  <span>Técnico Responsável</span>
                  <span className="font-semibold text-[#0E1116]">{selectedOrder.technician?.name || 'Não alocado'}</span>
                </div>
                <div className="pt-2 border-t border-[#E1E6EC] flex justify-between items-center">
                  <span className="text-sm font-bold text-[#0E1116]">Valor Final</span>
                  <span className="font-display text-xl font-bold text-[#0E1116]">
                    {formatBRL(selectedOrder.finalCents || selectedOrder.totalCents, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé Modal */}
            <div className="p-4 border-t border-[#E1E6EC] bg-[#F3F5F7] flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="carx-btn-white !h-10 !text-xs !px-4"
              >
                Fechar
              </button>
              <button
                onClick={() => navigate('/ordens')}
                className="carx-btn-dark !h-10 !text-xs !px-4"
              >
                Ver na Gestão de OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
