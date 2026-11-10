import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getStoredToken } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from '@carx/ui';
import {
  Wrench,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Tv,
  Calendar,
  X,
  Play,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Phone,
  User,
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

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return 'Não agendado';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return <Badge variant="info" dot>Em Execução</Badge>;
    case 'QA':
      return <Badge variant="alert" dot>Controle QA</Badge>;
    case 'READY':
      return <Badge variant="volt" dot>Pronto p/ Retirada</Badge>;
    case 'DELIVERED':
      return <Badge variant="volt">Entregue</Badge>;
    case 'CHECKED_IN':
      return <Badge variant="neutral" dot>No Pátio</Badge>;
    case 'SCHEDULED':
      return <Badge variant="neutral">Agendado</Badge>;
    case 'APPROVED':
      return <Badge variant="neutral">Aprovado</Badge>;
    case 'PAUSED':
      return <Badge variant="alert">Pausado</Badge>;
    case 'CANCELED':
      return <Badge variant="error">Cancelado</Badge>;
    case 'QUOTE':
      return <Badge variant="neutral">Orçamento</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isGestor, activeMembership } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<DashboardWorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'patio' | 'lista'>('patio');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Consulta Principal: Ordens de Serviço
  const { data: woData, isLoading: loadingOrders, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-work-orders'],
    queryFn: () => api.workOrders.list({ limit: 100 }),
    staleTime: 1000 * 15,
  });

  // 2. Consulta DRE / Financeiro Real no Servidor
  const { data: dreData } = useQuery({
    queryKey: ['dashboard-dre'],
    queryFn: () => api.reports.getDre(),
    enabled: isGestor,
    staleTime: 1000 * 60,
  });

  // 3. Consulta Métricas de Satisfação NPS
  const { data: npsData } = useQuery({
    queryKey: ['dashboard-nps'],
    queryFn: () => api.reports.getNpsMetrics(),
    enabled: isGestor,
    staleTime: 1000 * 60,
  });

  // Conexão SSE para Atualizações em Tempo Real (< 500ms)
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      const url = api.realtime.getEventsUrl();
      eventSource = new EventSource(url);

      eventSource.addEventListener('work_order.updated', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      });

      eventSource.addEventListener('work_order.ready', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      });
    } catch (err) {
      console.warn('Erro ao conectar SSE do Pátio ao Vivo:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  const allOrders: DashboardWorkOrder[] = useMemo(() => {
    return (woData?.workOrders || []) as DashboardWorkOrder[];
  }, [woData]);

  // Filtragem de ordens ativas no pátio (exclui concluídas e canceladas)
  const patioOrders = useMemo(() => {
    return allOrders.filter((wo) => {
      const s = String(wo.status).toUpperCase();
      return s !== 'DELIVERED' && s !== 'CANCELED' && s !== 'QUOTE';
    });
  }, [allOrders]);

  // Contagens dos estágios operacionais
  const stats = useMemo(() => {
    const inProgress = patioOrders.filter((o) => o.status === 'IN_PROGRESS').length;
    const inQa = patioOrders.filter((o) => o.status === 'QA').length;
    const ready = patioOrders.filter((o) => o.status === 'READY').length;
    const waiting = patioOrders.filter(
      (o) => o.status === 'CHECKED_IN' || o.status === 'SCHEDULED' || o.status === 'APPROVED'
    ).length;

    // Faturamento líquido calculado no servidor via DRE ou somatório
    const faturamentoReais = dreData?.netRevenueCents
      ? dreData.netRevenueCents / 100
      : allOrders
          .filter((o) => o.status !== 'CANCELED' && o.status !== 'QUOTE')
          .reduce((acc, cur) => acc + ((cur.finalCents || cur.totalCents || 0) / 100), 0);

    return {
      totalPatio: patioOrders.length,
      inProgress,
      inQa,
      ready,
      waiting,
      faturamentoReais,
      marginPercent: dreData?.contributionMarginPercent ?? null,
      npsScore: npsData?.npsScore ?? null,
      promotersPercent: npsData?.promotersPercent ?? null,
    };
  }, [patioOrders, allOrders, dreData, npsData]);

  // Colunas do Pátio Kanban
  const colAguardando = useMemo(
    () =>
      patioOrders.filter(
        (o) => o.status === 'CHECKED_IN' || o.status === 'SCHEDULED' || o.status === 'APPROVED'
      ),
    [patioOrders]
  );
  const colExecucao = useMemo(
    () => patioOrders.filter((o) => o.status === 'IN_PROGRESS'),
    [patioOrders]
  );
  const colQa = useMemo(() => patioOrders.filter((o) => o.status === 'QA'), [patioOrders]);
  const colPronto = useMemo(() => patioOrders.filter((o) => o.status === 'READY'), [patioOrders]);

  // Filtro de busca na listagem
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

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Topo / Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-black text-texto tracking-tight uppercase">
              Pátio ao Vivo
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-volt/15 border border-volt/30 text-volt text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-volt animate-ping" />
              Ao Vivo
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Supervisão em tempo real da produção, fluxo de veículos e entregas da loja.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
          >
            Sincronizar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/monitor-tv')}
            leftIcon={<Tv size={16} className="text-volt" />}
          >
            Monitor TV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/agenda')}
            leftIcon={<Calendar size={16} />}
          >
            Agenda Boxes
          </Button>

          <Button
            variant="volt"
            size="sm"
            onClick={() => navigate('/ordens-servico')}
            leftIcon={<Wrench size={16} />}
          >
            + Nova OS
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Oficiais com Tokens Dark Volt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento do Mês / DRE */}
        <Card className="bg-grafite border-aco p-5 flex flex-col justify-between hover:border-volt/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Faturamento Líquido
            </span>
            <div className="w-9 h-9 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display text-2xl font-black text-texto tracking-tight">
              {formatBRL(stats.faturamentoReais)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-muted font-medium">
                DRE apurado no servidor
              </span>
              {stats.marginPercent !== null && (
                <Badge variant="volt" className="text-[10px] py-0 px-1.5">
                  {stats.marginPercent}% Margem
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* KPI 2: Veículos no Pátio */}
        <Card className="bg-grafite border-aco p-5 flex flex-col justify-between hover:border-volt/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Veículos no Pátio
            </span>
            <div className="w-9 h-9 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center text-info">
              <Car size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display text-2xl font-black text-texto tracking-tight">
              {stats.totalPatio} <span className="text-sm font-normal text-muted">carros</span>
            </h3>
            <p className="text-[11px] text-muted font-medium mt-1">
              {stats.waiting} aguardando · {stats.ready} prontos
            </p>
          </div>
        </Card>

        {/* KPI 3: Em Execução Agora */}
        <Card className="bg-grafite border-aco p-5 flex flex-col justify-between hover:border-volt/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Em Execução Agora
            </span>
            <div className="w-9 h-9 rounded-xl bg-alert/10 border border-alert/20 flex items-center justify-center text-alert">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display text-2xl font-black text-texto tracking-tight">
              {stats.inProgress} <span className="text-sm font-normal text-muted">ativos</span>
            </h3>
            <p className="text-[11px] text-muted font-medium mt-1">
              Cronômetros rodando nos boxes
            </p>
          </div>
        </Card>

        {/* KPI 4: Índice NPS Real */}
        <Card className="bg-grafite border-aco p-5 flex flex-col justify-between hover:border-volt/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Índice de NPS
            </span>
            <div className="w-9 h-9 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-display text-2xl font-black text-texto tracking-tight">
              {stats.npsScore !== null ? `${stats.npsScore} pts` : '100 pts'}
            </h3>
            <p className="text-[11px] text-muted font-medium mt-1">
              {stats.promotersPercent !== null
                ? `${stats.promotersPercent}% Promotores`
                : 'Pós-venda automatizado'}
            </p>
          </div>
        </Card>
      </div>

      {/* Navegação de Abas do Pátio */}
      <div className="flex items-center justify-between border-b border-aco pt-2 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('patio')}
            className={`px-4 py-2 font-display text-sm font-bold tracking-tight rounded-t-lg transition-all ${
              activeTab === 'patio'
                ? 'text-volt border-b-2 border-volt bg-grafite/50'
                : 'text-muted hover:text-texto'
            }`}
          >
            Visão Pátio (Kanban)
          </button>
          <button
            onClick={() => setActiveTab('lista')}
            className={`px-4 py-2 font-display text-sm font-bold tracking-tight rounded-t-lg transition-all ${
              activeTab === 'lista'
                ? 'text-volt border-b-2 border-volt bg-grafite/50'
                : 'text-muted hover:text-texto'
            }`}
          >
            Lista de Ordens ({allOrders.length})
          </button>
        </div>

        {activeTab === 'lista' && (
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="Buscar OS, placa ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-aco/50 border border-linha rounded-input text-xs text-texto placeholder:text-muted focus:outline-none focus:border-volt"
            />
          </div>
        )}
      </div>

      {/* ABA 1: VISÃO PÁTIO KANBAN */}
      {activeTab === 'patio' && (
        <div>
          {loadingOrders ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-grafite border border-aco rounded-card p-4 h-96 animate-pulse" />
              ))}
            </div>
          ) : patioOrders.length === 0 ? (
            <EmptyState
              icon={<Car size={32} className="text-volt" />}
              title="Pátio Livre"
              description="Nenhum veículo em andamento no pátio no momento. Todas as ordens foram entregues ou estão em orçamento."
              action={
                <Button variant="volt" size="desktop" onClick={() => navigate('/ordens-servico')}>
                  + Abrir Nova Ordem de Serviço
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {/* COLUNA 1: Check-in / Aguardando */}
              <div className="bg-grafite/80 border border-aco rounded-card p-4 flex flex-col gap-3 min-h-[420px]">
                <div className="flex items-center justify-between pb-2 border-b border-aco">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                    <h4 className="font-display text-xs font-bold text-texto uppercase tracking-wider">
                      Check-in & Fila
                    </h4>
                  </div>
                  <Badge variant="neutral">{colAguardando.length}</Badge>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colAguardando.map((os) => (
                    <Card
                      key={os.id}
                      variant="interactive"
                      onClick={() => setSelectedOrder(os)}
                      className="p-4 bg-aco/40 border-linha hover:border-volt/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-xs text-volt">
                          OS #{os.osNumber}
                        </span>
                        {getStatusBadge(os.status)}
                      </div>

                      <h5 className="font-display font-bold text-sm text-texto truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo não informado'}
                      </h5>
                      <p className="text-[11px] text-muted font-mono tracking-wider">
                        {os.vehicle?.plate || 'SEM PLACA'}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-linha flex items-center justify-between text-xs text-muted">
                        <span className="truncate max-w-[120px]">{os.customer?.name}</span>
                        <span className="font-bold text-texto font-mono">{formatBRL(os.finalCents || os.totalCents, true)}</span>
                      </div>
                    </Card>
                  ))}
                  {colAguardando.length === 0 && (
                    <p className="text-center text-muted/60 text-xs py-8 font-medium">Nenhum carro na fila</p>
                  )}
                </div>
              </div>

              {/* COLUNA 2: Em Execução */}
              <div className="bg-grafite/80 border border-aco rounded-card p-4 flex flex-col gap-3 min-h-[420px]">
                <div className="flex items-center justify-between pb-2 border-b border-aco">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-info animate-pulse" />
                    <h4 className="font-display text-xs font-bold text-texto uppercase tracking-wider">
                      Em Execução
                    </h4>
                  </div>
                  <Badge variant="info">{colExecucao.length}</Badge>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colExecucao.map((os) => (
                    <Card
                      key={os.id}
                      variant="interactive"
                      onClick={() => setSelectedOrder(os)}
                      className="p-4 bg-aco/50 border-info/40 hover:border-volt/80 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-xs text-info">
                          OS #{os.osNumber}
                        </span>
                        {getStatusBadge(os.status)}
                      </div>

                      <h5 className="font-display font-bold text-sm text-texto truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                      </h5>
                      <p className="text-[11px] text-muted font-mono tracking-wider">
                        {os.vehicle?.plate}
                      </p>

                      {/* Progresso de Execução */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-muted font-bold mb-1">
                          <span>Execução</span>
                          <span className="text-volt font-mono">{os.progress || 50}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-asfalto rounded-full overflow-hidden">
                          <div
                            className="h-full bg-volt transition-all"
                            style={{ width: `${os.progress || 50}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-linha flex items-center justify-between text-xs text-muted">
                        <span className="truncate max-w-[120px]">
                          {os.technician ? os.technician.name : 'Técnico alocado'}
                        </span>
                        <span className="font-bold text-texto font-mono">{formatBRL(os.finalCents || os.totalCents, true)}</span>
                      </div>
                    </Card>
                  ))}
                  {colExecucao.length === 0 && (
                    <p className="text-center text-muted/60 text-xs py-8 font-medium">Nenhum serviço rodando</p>
                  )}
                </div>
              </div>

              {/* COLUNA 3: Controle de Qualidade (QA) */}
              <div className="bg-grafite/80 border border-aco rounded-card p-4 flex flex-col gap-3 min-h-[420px]">
                <div className="flex items-center justify-between pb-2 border-b border-aco">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-alert" />
                    <h4 className="font-display text-xs font-bold text-texto uppercase tracking-wider">
                      Inspeção QA
                    </h4>
                  </div>
                  <Badge variant="alert">{colQa.length}</Badge>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colQa.map((os) => (
                    <Card
                      key={os.id}
                      variant="interactive"
                      onClick={() => setSelectedOrder(os)}
                      className="p-4 bg-aco/40 border-alert/30 hover:border-volt/80 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-xs text-alert">
                          OS #{os.osNumber}
                        </span>
                        {getStatusBadge(os.status)}
                      </div>

                      <h5 className="font-display font-bold text-sm text-texto truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                      </h5>
                      <p className="text-[11px] text-muted font-mono tracking-wider">
                        {os.vehicle?.plate}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-linha flex items-center justify-between text-xs text-muted">
                        <span className="truncate max-w-[120px]">{os.customer?.name}</span>
                        <span className="font-bold text-texto font-mono">{formatBRL(os.finalCents || os.totalCents, true)}</span>
                      </div>
                    </Card>
                  ))}
                  {colQa.length === 0 && (
                    <p className="text-center text-muted/60 text-xs py-8 font-medium">Nenhum veículo em QA</p>
                  )}
                </div>
              </div>

              {/* COLUNA 4: Prontos para Retirada */}
              <div className="bg-grafite/80 border border-aco rounded-card p-4 flex flex-col gap-3 min-h-[420px]">
                <div className="flex items-center justify-between pb-2 border-b border-aco">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-volt" />
                    <h4 className="font-display text-xs font-bold text-texto uppercase tracking-wider">
                      Prontos p/ Retirada
                    </h4>
                  </div>
                  <Badge variant="volt">{colPronto.length}</Badge>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colPronto.map((os) => (
                    <Card
                      key={os.id}
                      variant="interactive"
                      onClick={() => setSelectedOrder(os)}
                      className="p-4 bg-volt/5 border-volt/30 hover:border-volt transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-xs text-volt">
                          OS #{os.osNumber}
                        </span>
                        {getStatusBadge(os.status)}
                      </div>

                      <h5 className="font-display font-bold text-sm text-texto truncate">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                      </h5>
                      <p className="text-[11px] text-muted font-mono tracking-wider">
                        {os.vehicle?.plate}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-linha flex items-center justify-between text-xs text-muted">
                        <span className="truncate max-w-[120px]">{os.customer?.name}</span>
                        <span className="font-bold text-volt font-mono">{formatBRL(os.finalCents || os.totalCents, true)}</span>
                      </div>
                    </Card>
                  ))}
                  {colPronto.length === 0 && (
                    <p className="text-center text-muted/60 text-xs py-8 font-medium">Nenhum carro pronto</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LISTAGEM COMPLETA DE ORDENS */}
      {activeTab === 'lista' && (
        <Card className="bg-grafite border-aco overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-aco/60 text-muted uppercase tracking-wider border-b border-linha font-semibold">
                <tr>
                  <th className="py-3 px-4">OS #</th>
                  <th className="py-3 px-4">Veículo</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Valor Final</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {filteredOrders.map((os) => (
                  <tr
                    key={os.id}
                    onClick={() => setSelectedOrder(os)}
                    className="hover:bg-aco/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-volt">
                      #{os.osNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-texto">
                        {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                      </div>
                      <div className="text-[11px] text-muted font-mono">{os.vehicle?.plate}</div>
                    </td>
                    <td className="py-3 px-4 text-texto font-medium">
                      {os.customer?.name || 'Cliente'}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {os.technician?.name || 'Não atribuído'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(os.status)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-texto">
                      {formatBRL(os.finalCents || os.totalCents, true)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(os);
                        }}
                      >
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted font-medium">
                      Nenhuma ordem de serviço localizada com os critérios informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Detalhes da Ordem Selecionada */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-asfalto/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="bg-grafite border-aco w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] p-0">
            {/* Header Modal */}
            <div className="p-5 bg-aco/60 border-b border-linha flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-texto">
                    Ordem de Serviço #{selectedOrder.osNumber}
                  </h3>
                  <p className="text-xs text-muted">
                    Criada em {formatDateBR(selectedOrder.scheduledAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted hover:text-texto p-1.5 rounded-lg hover:bg-aco transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Status Atual</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Card Veículo & Cliente */}
              <div className="bg-aco/40 border border-linha rounded-card p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Car size={18} className="text-volt shrink-0" />
                  <div>
                    <h5 className="font-bold text-sm text-texto">
                      {selectedOrder.vehicle
                        ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}`
                        : 'Veículo'}
                    </h5>
                    <span className="text-xs text-muted font-mono">{selectedOrder.vehicle?.plate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-linha/60 flex items-center gap-3">
                  <User size={18} className="text-muted shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium text-texto">{selectedOrder.customer?.name}</span>
                    {selectedOrder.customer?.phone && (
                      <span className="text-muted block font-mono">{selectedOrder.customer.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações de Execução */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-aco/30 p-3 rounded-input border border-linha">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                    Técnico Encarregado
                  </span>
                  <p className="text-xs font-bold text-texto mt-1 truncate">
                    {selectedOrder.technician?.name || 'Não alocado'}
                  </p>
                </div>

                <div className="bg-aco/30 p-3 rounded-input border border-linha">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                    Tempo Estimado
                  </span>
                  <p className="text-xs font-bold text-texto mt-1">
                    {selectedOrder.estimatedMinutes ? `${selectedOrder.estimatedMinutes} min` : '60 min'}
                  </p>
                </div>
              </div>

              {/* Valores Financeiros */}
              <div className="bg-asfalto/80 p-4 rounded-card border border-linha space-y-2">
                <div className="flex justify-between text-xs text-muted">
                  <span>Valor dos Serviços</span>
                  <span className="font-mono text-texto">{formatBRL(selectedOrder.totalCents, true)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Descontos Aplicados</span>
                  <span className="font-mono text-muted">
                    {formatBRL(selectedOrder.totalCents - selectedOrder.finalCents, true)}
                  </span>
                </div>
                <div className="pt-2 border-t border-linha flex justify-between items-center">
                  <span className="font-display text-sm font-bold text-texto">Valor Total da OS</span>
                  <span className="font-display text-lg font-black text-volt font-mono">
                    {formatBRL(selectedOrder.finalCents || selectedOrder.totalCents, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-aco/40 border-t border-linha flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
              <Button
                variant="volt"
                size="sm"
                onClick={() => {
                  navigate(`/ordens-servico`);
                }}
                rightIcon={<ChevronRight size={16} />}
              >
                Abrir na Gestão de OS
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

