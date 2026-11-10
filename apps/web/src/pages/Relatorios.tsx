import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Trophy,
  Star,
  CreditCard,
  Printer,
  Calendar,
  Wrench,
  DollarSign,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../services/api';
import { DreDashboard } from '../components/features/DreDashboard';
import { TecnicosRanking } from '../components/features/TecnicosRanking';
import { NpsDashboard } from '../components/features/NpsDashboard';
import { ComissoesDashboard } from '../components/features/ComissoesDashboard';

type TabKey = 'GERENCIAL' | 'DRE' | 'RANKING' | 'NPS' | 'COMISSOES';

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

export const Relatorios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('GERENCIAL');
  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getEndOfMonth());
  const [hideValues, setHideValues] = useState(false);

  // Busca ordens de serviço para a visão gerencial rápida
  const {
    data: workOrdersResponse,
    isLoading: loadingOrders,
  } = useQuery({
    queryKey: ['reports-work-orders'],
    queryFn: () => api.workOrders.list({ limit: 500 }),
  });

  const rawOrders: any[] = Array.isArray(workOrdersResponse)
    ? workOrdersResponse
    : workOrdersResponse?.workOrders || [];

  // Filtra as ordens de serviço dentro do período selecionado
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((wo: any) => {
      const dateStr = wo.created_at || wo.createdAt;
      if (!dateStr) return true;
      if (startDate && dateStr < `${startDate}T00:00:00.000Z`) return false;
      if (endDate && dateStr > `${endDate}T23:59:59.999Z`) return false;
      return true;
    });
  }, [rawOrders, startDate, endDate]);

  // Métricas da aba Gerencial
  const gerencialStats = useMemo(() => {
    const validOrders = filteredOrders.filter((wo: any) => wo.status !== 'CANCELED');
    const totalCents = validOrders.reduce((acc: number, wo: any) => acc + (wo.final_cents || wo.total_cents || 0), 0);
    const count = validOrders.length;
    const deliveredCount = validOrders.filter((wo: any) => wo.status === 'DELIVERED').length;
    const inProgressCount = validOrders.filter((wo: any) =>
      ['IN_PROGRESS', 'QA', 'CHECKED_IN'].includes(wo.status)
    ).length;
    const ticketMedioCents = count > 0 ? Math.round(totalCents / count) : 0;

    // Agrupamento por serviço
    const serviceMap: Record<string, { count: number; totalCents: number }> = {};
    validOrders.forEach((wo: any) => {
      const name = wo.service_name || wo.primary_service || 'Serviços Gerais';
      if (!serviceMap[name]) serviceMap[name] = { count: 0, totalCents: 0 };
      serviceMap[name].count += 1;
      serviceMap[name].totalCents += wo.final_cents || wo.total_cents || 0;
    });

    const topServices = Object.entries(serviceMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 5);

    return {
      totalCents,
      count,
      deliveredCount,
      inProgressCount,
      ticketMedioCents,
      topServices,
    };
  }, [filteredOrders]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 fade-in">
      {/* Topo / Header da Página (Oculto em Impressão) */}
      <Card variant="default" className="p-6 bg-grafite border-aco/60 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
              <BarChart3 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                  Relatórios Estratégicos
                </h1>
                <Badge variant="volt">Dark Volt</Badge>
              </div>
              <p className="text-xs text-cinza-muted mt-1">
                Inteligência de negócio, DRE gerencial, ranking auditado e pós-venda em tempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Período Compartilhado */}
            <div className="flex items-center gap-2 bg-asfalto border border-aco/50 rounded-xl px-3 py-2">
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

            {/* Alternar Ocultação de Valores */}
            <button
              type="button"
              onClick={() => setHideValues(!hideValues)}
              className="flex items-center gap-1.5 px-3 py-2 bg-asfalto border border-aco/50 text-xs font-bold text-cinza-muted hover:text-white rounded-xl transition-colors"
              title="Ocultar valores em apresentações ou telas públicas"
            >
              {hideValues ? <EyeOff size={14} className="text-volt" /> : <Eye size={14} />}
              <span>{hideValues ? 'Valores Ocultos' : 'Ocultar'}</span>
            </button>

            {/* Botão de Impressão */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer size={16} />
              Imprimir
            </Button>
          </div>
        </div>
      </Card>

      {/* Navegação por Abas (Oculto em Impressão) */}
      <div className="flex flex-wrap items-center gap-2 no-print border-b border-aco/40 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('GERENCIAL')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'GERENCIAL'
              ? 'bg-volt text-asfalto shadow-lg shadow-volt/10'
              : 'bg-grafite text-cinza-muted hover:text-white border border-aco/50'
          }`}
        >
          <BarChart3 size={15} />
          Visão Gerencial
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DRE')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'DRE'
              ? 'bg-volt text-asfalto shadow-lg shadow-volt/10'
              : 'bg-grafite text-cinza-muted hover:text-white border border-aco/50'
          }`}
        >
          <PieChart size={15} />
          DRE no Servidor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RANKING')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'RANKING'
              ? 'bg-volt text-asfalto shadow-lg shadow-volt/10'
              : 'bg-grafite text-cinza-muted hover:text-white border border-aco/50'
          }`}
        >
          <Trophy size={15} />
          Ranking de Técnicos (Streak)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NPS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'NPS'
              ? 'bg-volt text-asfalto shadow-lg shadow-volt/10'
              : 'bg-grafite text-cinza-muted hover:text-white border border-aco/50'
          }`}
        >
          <Star size={15} />
          NPS & Retenção Ativa
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMISSOES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'COMISSOES'
              ? 'bg-volt text-asfalto shadow-lg shadow-volt/10'
              : 'bg-grafite text-cinza-muted hover:text-white border border-aco/50'
          }`}
        >
          <CreditCard size={15} />
          Comissões & Extrato
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {activeTab === 'GERENCIAL' && (
        <div className="space-y-6">
          {/* KPIs Executivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="default" className="p-5 bg-grafite border-aco/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Faturamento do Período
                </span>
                <div className="w-8 h-8 rounded-xl bg-volt/10 text-volt flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-white font-mono mt-2">
                {hideValues ? '••••••' : formatCurrency(gerencialStats.totalCents)}
              </p>
              <p className="text-[11px] text-cinza-muted mt-1">
                Volume de {gerencialStats.count} ordens de serviço
              </p>
            </Card>

            <Card variant="default" className="p-5 bg-grafite border-aco/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Ticket Médio
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-2">
                {hideValues ? '••••••' : formatCurrency(gerencialStats.ticketMedioCents)}
              </p>
              <p className="text-[11px] text-cinza-muted mt-1">
                Por veículo atendido
              </p>
            </Card>

            <Card variant="default" className="p-5 bg-grafite border-aco/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Veículos Entregues
                </span>
                <div className="w-8 h-8 rounded-xl bg-volt/20 text-volt flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-volt font-mono mt-2">
                {gerencialStats.deliveredCount}
              </p>
              <p className="text-[11px] text-cinza-muted mt-1">
                Ciclo operacional completo
              </p>
            </Card>

            <Card variant="default" className="p-5 bg-grafite border-aco/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cinza-muted">
                  Em Andamento no Pátio
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Wrench size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-400 font-mono mt-2">
                {gerencialStats.inProgressCount}
              </p>
              <p className="text-[11px] text-cinza-muted mt-1">
                Check-in, execução ou QA
              </p>
            </Card>
          </div>

          {/* Top Serviços Mais Rentáveis */}
          <Card variant="default" className="p-6 bg-grafite border-aco/60">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wrench size={16} className="text-volt" />
              Serviços Mais Representativos no Faturamento
            </h3>

            <div className="space-y-4">
              {gerencialStats.topServices.map((service, idx) => {
                const percent =
                  gerencialStats.totalCents > 0
                    ? Math.round((service.totalCents / gerencialStats.totalCents) * 100)
                    : 0;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{service.name} ({service.count} OS)</span>
                      <span className="font-mono text-volt">
                        {hideValues ? '••••••' : formatCurrency(service.totalCents)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-asfalto h-2 rounded-full overflow-hidden border border-aco">
                      <div
                        className="bg-volt h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {gerencialStats.topServices.length === 0 && (
                <p className="text-xs text-cinza-muted text-center py-6">
                  Nenhum serviço registrado no período selecionado.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'DRE' && (
        <DreDashboard initialStartDate={startDate} initialEndDate={endDate} />
      )}

      {activeTab === 'RANKING' && (
        <TecnicosRanking initialStartDate={startDate} initialEndDate={endDate} />
      )}

      {activeTab === 'NPS' && <NpsDashboard />}

      {activeTab === 'COMISSOES' && (
        <ComissoesDashboard initialStartDate={startDate} initialEndDate={endDate} />
      )}
    </div>
  );
};

export default Relatorios;
