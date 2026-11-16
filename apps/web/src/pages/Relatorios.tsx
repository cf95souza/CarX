import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { NpsDashboard } from '../components/features/NpsDashboard';
import { DreDashboard } from '../components/features/DreDashboard';

type TabKey = 'GERENCIAL' | 'NPS' | 'GARANTIAS' | 'DRE';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const Relatorios: React.FC = () => {
  // Conforme o Item 21, a aba padrão ao abrir a tela é a Visão Gerencial
  const [activeTab, setActiveTab] = useState<TabKey>('GERENCIAL');
  const [periodOption, setPeriodOption] = useState<string>('Este mês');
  const [serviceFilter, setServiceFilter] = useState<string>('Todos os serviços');
  const [hideValues, setHideValues] = useState<boolean>(false);

  // Busca ordens de serviço para alimentar a visão gerencial
  const { data: workOrdersResponse } = useQuery({
    queryKey: ['reports-work-orders'],
    queryFn: () => api.workOrders.list({ limit: 500 }),
    staleTime: 1000 * 60,
  });

  // Busca garantias e revisões programadas reais
  const { data: warrantyRevisions = [], isLoading: loadingWarranties } = useQuery({
    queryKey: ['reports-warranty-revisions'],
    queryFn: () => api.crm.getWarrantyRevisions().catch(() => []),
    staleTime: 1000 * 60,
  });

  const rawOrders: any[] = Array.isArray(workOrdersResponse)
    ? workOrdersResponse
    : workOrdersResponse?.workOrders || [];

  const gerencialStats = useMemo(() => {
    const validOrders = rawOrders.filter((wo: any) => wo.status !== 'CANCELED');
    const totalCents = validOrders.reduce(
      (acc: number, wo: any) => acc + (wo.final_cents || wo.finalCents || wo.total_cents || wo.totalCents || 0),
      0
    );
    const count = validOrders.length;
    const deliveredCount = validOrders.filter((wo: any) => wo.status === 'DELIVERED').length;
    const inProgressCount = validOrders.filter((wo: any) =>
      ['IN_PROGRESS', 'QA', 'CHECKED_IN'].includes(wo.status)
    ).length;
    const ticketMedioCents = count > 0 ? Math.round(totalCents / count) : 0;

    return {
      totalCents,
      count,
      deliveredCount,
      inProgressCount,
      ticketMedioCents,
    };
  }, [rawOrders]);

  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { label: string; cents: number; count: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      monthsMap[key] = { label: label.charAt(0).toUpperCase() + label.slice(1), cents: 0, count: 0 };
    }

    rawOrders.forEach((wo: any) => {
      if (wo.status === 'CANCELED') return;
      const date = wo.createdAt || wo.created_at || wo.data;
      if (!date) return;
      const d = new Date(date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap[key]) {
        monthsMap[key].cents += wo.final_cents || wo.finalCents || wo.total_cents || wo.totalCents || 0;
        monthsMap[key].count += 1;
      }
    });

    const entries = Object.values(monthsMap);
    const maxCents = Math.max(...entries.map((e) => e.cents), 100000);
    return { entries, maxCents };
  }, [rawOrders]);

  const serviceDistribution = useMemo(() => {
    const servicesMap: Record<string, { name: string; cents: number; count: number }> = {};
    rawOrders.forEach((wo: any) => {
      if (wo.status === 'CANCELED') return;
      const items = wo.items || [];
      if (items.length > 0) {
        items.forEach((it: any) => {
          const name = it.name || it.nome || 'Serviço Automotivo';
          const price = it.totalCents || it.total_cents || (it.unitPriceCents || 0) * (it.quantity || 1) || 0;
          if (!servicesMap[name]) {
            servicesMap[name] = { name, cents: 0, count: 0 };
          }
          servicesMap[name].cents += price;
          servicesMap[name].count += it.quantity || 1;
        });
      } else {
        const name = wo.servico || 'Serviço Especializado';
        const price = wo.final_cents || wo.finalCents || wo.total_cents || 0;
        if (!servicesMap[name]) {
          servicesMap[name] = { name, cents: 0, count: 0 };
        }
        servicesMap[name].cents += price;
        servicesMap[name].count += 1;
      }
    });

    const list = Object.values(servicesMap).sort((a, b) => b.cents - a.cents).slice(0, 5);
    const totalServiceCents = list.reduce((acc, curr) => acc + curr.cents, 0) || 1;
    return list.map((item) => ({
      ...item,
      percentage: Math.min(100, Math.round((item.cents / totalServiceCents) * 100)),
    }));
  }, [rawOrders]);

  const funnelStats = useMemo(() => {
    const quotesCount = rawOrders.length;
    const approvedCount = rawOrders.filter((wo: any) =>
      ['APPROVED', 'SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'QA', 'READY', 'DELIVERED'].includes(wo.status)
    ).length;
    const deliveredCount = rawOrders.filter((wo: any) => wo.status === 'DELIVERED').length;
    const conversionRate = quotesCount > 0 ? Math.round((approvedCount / quotesCount) * 100) : 0;
    const completionRate = approvedCount > 0 ? Math.round((deliveredCount / approvedCount) * 100) : 0;
    return { quotesCount, approvedCount, deliveredCount, conversionRate, completionRate };
  }, [rawOrders]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '844px',
        background: '#F3F5F7',
        fontFamily: 'Inter, sans-serif',
        color: '#0E1116',
        padding: '28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. CABEÇALHO COM CONTROLES */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '30px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Relatórios
          </div>
          <div style={{ fontSize: '14px', color: '#5B6674' }}>
            Inteligência do negócio · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* CONTROLES DO TOPO (DROPDOWNS + OCULTAR VALORES + IMPRIMIR) */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Dropdown: Período */}
          <div
            style={{
              height: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              border: '1px solid #E1E6EC',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5B6674',
              cursor: 'pointer',
            }}
          >
            <select
              value={periodOption}
              onChange={(e) => setPeriodOption(e.target.value)}
              style={{
                border: 0,
                background: 'transparent',
                outline: 'none',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <option value="Este mês">Este mês</option>
              <option value="Mês anterior">Mês anterior</option>
              <option value="Últimos 90 dias">Últimos 90 dias</option>
              <option value="Este ano">Este ano</option>
            </select>
          </div>

          {/* Dropdown: Serviços */}
          <div
            style={{
              height: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              border: '1px solid #E1E6EC',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5B6674',
              cursor: 'pointer',
            }}
          >
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{
                border: 0,
                background: 'transparent',
                outline: 'none',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <option value="Todos os serviços">Todos os serviços</option>
              <option value="PPF (Proteção)">PPF (Proteção)</option>
              <option value="Películas Solares">Películas Solares</option>
              <option value="Vitrificação">Vitrificação</option>
              <option value="Mecânica Geral">Mecânica Geral</option>
            </select>
          </div>

          {/* Botão Ocultar valores */}
          <button
            type="button"
            onClick={() => setHideValues(!hideValues)}
            style={{
              height: '44px',
              padding: '0 18px',
              borderRadius: '12px',
              border: '1px solid #E1E6EC',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5B6674',
              cursor: 'pointer',
            }}
          >
            {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          </button>

          {/* Botão Imprimir */}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              height: '44px',
              padding: '0 18px',
              borderRadius: '12px',
              border: '1px solid #0E1116',
              background: '#0E1116',
              color: '#C8F52E',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('GERENCIAL')}
          style={{
            height: '44px',
            padding: '0 18px',
            borderRadius: '12px',
            border: activeTab === 'GERENCIAL' ? '1px solid #0E1116' : '1px solid #E1E6EC',
            background: activeTab === 'GERENCIAL' ? '#0E1116' : '#fff',
            color: activeTab === 'GERENCIAL' ? '#fff' : '#5B6674',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: activeTab === 'GERENCIAL' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          Visão gerencial
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NPS')}
          style={{
            height: '44px',
            padding: '0 18px',
            borderRadius: '12px',
            border: activeTab === 'NPS' ? '1px solid #0E1116' : '1px solid #E1E6EC',
            background: activeTab === 'NPS' ? '#0E1116' : '#fff',
            color: activeTab === 'NPS' ? '#fff' : '#5B6674',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: activeTab === 'NPS' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          NPS e retenção
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GARANTIAS')}
          style={{
            height: '44px',
            padding: '0 18px',
            borderRadius: '12px',
            border: activeTab === 'GARANTIAS' ? '1px solid #0E1116' : '1px solid #E1E6EC',
            background: activeTab === 'GARANTIAS' ? '#0E1116' : '#fff',
            color: activeTab === 'GARANTIAS' ? '#fff' : '#5B6674',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'GARANTIAS' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          <span>Garantias e revisões</span>
          {warrantyRevisions.length > 0 && (
            <em
              style={{
                fontStyle: 'normal',
                background: '#FFB020',
                color: '#0E1116',
                borderRadius: '99px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {warrantyRevisions.length} vencendo
            </em>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DRE')}
          style={{
            height: '44px',
            padding: '0 18px',
            borderRadius: '12px',
            border: activeTab === 'DRE' ? '1px solid #0E1116' : '1px solid #E1E6EC',
            background: activeTab === 'DRE' ? '#0E1116' : '#fff',
            color: activeTab === 'DRE' ? '#fff' : '#5B6674',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: activeTab === 'DRE' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          DRE e fluxo de caixa
        </button>
      </div>

      {/* 3. CONTEÚDO DA ABA ATIVA */}
      {activeTab === 'NPS' && <NpsDashboard />}

      {activeTab === 'GERENCIAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* 1. CARDS DE KPI PRINCIPAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>Faturamento Total</span>
              <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
                {hideValues ? '••••••' : formatCurrency(gerencialStats.totalCents)}
              </b>
              <span style={{ fontSize: '13px', color: '#5B6674' }}>{gerencialStats.count} ordens registradas</span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>Ticket Médio</span>
              <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
                {hideValues ? '••••••' : formatCurrency(gerencialStats.ticketMedioCents)}
              </b>
              <span style={{ fontSize: '13px', color: '#5B6674' }}>Por veículo atendido</span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>Entregues / Concluídas</span>
              <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
                {gerencialStats.deliveredCount}
              </b>
              <span style={{ fontSize: '13px', color: '#5B6674' }}>Ciclo completo entregue</span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>No Pátio / Em Execução</span>
              <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
                {gerencialStats.inProgressCount}
              </b>
              <span style={{ fontSize: '13px', color: '#5B6674' }}>Em execução ou QA</span>
            </div>
          </div>

          {/* 2. GRID DE GRÁFICOS: EVOLUÇÃO MENSAL E VOLUME DE SERVIÇOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Gráfico 1: Evolução do Faturamento (Últimos 6 Meses) */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700 }}>
                    Evolução do Faturamento
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5B6674' }}>
                    Receita mensal consolidada nos últimos 6 meses
                  </p>
                </div>
                <span
                  style={{
                    background: '#C8F52E',
                    color: '#0E1116',
                    padding: '4px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Oficial
                </span>
              </div>

              {/* Área das Barras Verticais */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '12px',
                  height: '200px',
                  paddingTop: '20px',
                  borderBottom: '1px solid #E1E6EC',
                }}
              >
                {monthlyData.entries.map((item, idx) => {
                  const barHeightPercent = Math.max(8, Math.round((item.cents / monthlyData.maxCents) * 100));
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#5B6674',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.cents > 0 ? (hideValues ? '••' : `R$${Math.round(item.cents / 100000)}k`) : 'R$0'}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '44px',
                          height: `${barHeightPercent}%`,
                          background: item.cents > 0 ? '#0E1116' : '#F3F5F7',
                          borderRadius: '8px 8px 4px 4px',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                        title={`${item.label}: ${formatCurrency(item.cents)} (${item.count} OS)`}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0E1116' }}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5B6674' }}>
                <span>Média mensal estimada: <strong>{formatCurrency(Math.round(gerencialStats.totalCents / 6))}</strong></span>
                <span>Total de OS: <strong>{gerencialStats.count}</strong></span>
              </div>
            </div>

            {/* Gráfico 2: Volume e Faturamento por Serviço */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700 }}>
                    Serviços Mais Realizados
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5B6674' }}>
                    Distribuição por faturamento e volume de veículos
                  </p>
                </div>
                <span
                  style={{
                    background: '#F3F5F7',
                    border: '1px solid #E1E6EC',
                    color: '#0E1116',
                    padding: '4px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  Top 5
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                {serviceDistribution.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5B6674', textAlign: 'center', margin: '30px 0' }}>
                    Nenhum serviço registrado para análise comparativa.
                  </p>
                ) : (
                  serviceDistribution.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600, color: '#0E1116' }}>{item.name}</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ color: '#5B6674', fontSize: '12px' }}>{item.count} un</span>
                          <strong style={{ fontFamily: 'monospace', color: '#0E1116' }}>
                            {hideValues ? '••••••' : formatCurrency(item.cents)}
                          </strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#F3F5F7', borderRadius: '99px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${item.percentage}%`,
                            background: idx === 0 ? '#C8F52E' : idx === 1 ? '#0E1116' : '#5B6674',
                            borderRadius: '99px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5B6674', borderTop: '1px solid #E1E6EC', paddingTop: '12px' }}>
                <span>Maior representatividade: <strong>{serviceDistribution[0]?.name || '--'}</strong></span>
                <span>Mix de serviços ativos: <strong>{serviceDistribution.length}</strong></span>
              </div>
            </div>
          </div>

          {/* 3. FUNIL DE CONVERSÃO E CICLO DAS ORDENS */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E1E6EC',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700 }}>
                  Funil de Conversão & Ciclo Operacional
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5B6674' }}>
                  Acompanhamento de eficiência de vendas desde o orçamento até a entrega do carro
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ background: '#C8F52E', color: '#0E1116', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
                  {funnelStats.conversionRate}% Conversão
                </span>
                <span style={{ background: '#0E1116', color: '#fff', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
                  {funnelStats.completionRate}% Conclusão
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E1E6EC', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#5B6674', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  1. Orçamentos Emitidos
                </span>
                <b style={{ display: 'block', fontSize: '28px', color: '#0E1116', fontFamily: "'Space Grotesk', sans-serif", margin: '6px 0 2px' }}>
                  {funnelStats.quotesCount}
                </b>
                <span style={{ fontSize: '12px', color: '#5B6674' }}>100% da demanda gerada</span>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E1E6EC', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#5B6674', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  2. Aprovados / Agendados
                </span>
                <b style={{ display: 'block', fontSize: '28px', color: '#0E1116', fontFamily: "'Space Grotesk', sans-serif", margin: '6px 0 2px' }}>
                  {funnelStats.approvedCount}
                </b>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                  {funnelStats.conversionRate}% taxa de fechamento
                </span>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E1E6EC', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#5B6674', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  3. Entregues com Sucesso
                </span>
                <b style={{ display: 'block', fontSize: '28px', color: '#0E1116', fontFamily: "'Space Grotesk', sans-serif", margin: '6px 0 2px' }}>
                  {funnelStats.deliveredCount}
                </b>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                  {funnelStats.completionRate}% ciclo completo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'GARANTIAS' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}>
            Garantias e Retornos Programados
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#5B6674' }}>
            Acompanhe veículos com revisão de 6 meses ou garantia preventiva vencendo nos próximos dias.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {loadingWarranties ? (
              <div style={{ padding: '16px', fontSize: '14px', color: '#5B6674' }}>
                Carregando garantias e revisões...
              </div>
            ) : warrantyRevisions.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '14px',
                  fontSize: '14px',
                  color: '#5B6674',
                  textAlign: 'center',
                }}
              >
                Nenhuma garantia ou revisão programada vencendo nos próximos dias.
              </div>
            ) : (
              warrantyRevisions.map((item) => (
                <div
                  key={item.warrantyId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '14px',
                  }}
                >
                  <div>
                    <b style={{ color: '#0E1116', fontSize: '15px' }}>
                      {item.vehicleModel} (Placa {item.vehiclePlate})
                    </b>
                    <div style={{ fontSize: '13px', color: '#5B6674' }}>
                      {item.serviceName} · Cliente: {item.customerName}
                    </div>
                  </div>
                  <span
                    style={{
                      background: item.isOverdue ? '#FEE2E2' : '#FEF08A',
                      color: item.isOverdue ? '#B91C1C' : '#854D0E',
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    {item.isOverdue
                      ? `Venceu há ${Math.abs(item.daysRemainingOrOverdue)} dia(s)`
                      : item.daysRemainingOrOverdue === 0
                        ? 'Vence hoje'
                        : `Vence em ${item.daysRemainingOrOverdue} dia(s)`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'DRE' && <DreDashboard />}
    </div>
  );
};

export default Relatorios;
