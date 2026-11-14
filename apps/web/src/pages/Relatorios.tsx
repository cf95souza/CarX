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
  // Conforme o protótipo oficial de referência, a aba ativa é NPS e Retenção
  const [activeTab, setActiveTab] = useState<TabKey>('NPS');
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
      (acc: number, wo: any) => acc + (wo.final_cents || wo.total_cents || 0),
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
            <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>Faturamento</span>
            <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
              {hideValues ? '••••••' : formatCurrency(gerencialStats.totalCents)}
            </b>
            <span style={{ fontSize: '13px', color: '#5B6674' }}>{gerencialStats.count} ordens no período</span>
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
            <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>Entregues</span>
            <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
              {gerencialStats.deliveredCount}
            </b>
            <span style={{ fontSize: '13px', color: '#5B6674' }}>Ciclo completo</span>
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
            <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>No Pátio</span>
            <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', color: '#0E1116' }}>
              {gerencialStats.inProgressCount}
            </b>
            <span style={{ fontSize: '13px', color: '#5B6674' }}>Em execução ou QA</span>
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
