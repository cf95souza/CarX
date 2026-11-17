import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Search,
  RefreshCw,
  Car,
  User,
  Clock,
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  X,
  Award,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateBR } from '../utils/dateUtils';

type FilterTab = 'ALL' | 'QA' | 'READY' | 'DELIVERED';

export const OperadorHistorico: React.FC = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');
  const [selectedHistoryOs, setSelectedHistoryOs] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUserId = user?.id || profile?.id;

  // 1. Busca reativa da lista de Ordens de Serviço
  const {
    data: allOrders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['technician-history', currentUserId],
    queryFn: async () => {
      try {
        const res = await api.workOrders.list({ limit: 100 });
        const list = Array.isArray(res) ? res : res?.workOrders || [];
        return list;
      } catch (err) {
        console.error('[OperadorHistorico] Erro ao buscar histórico de ordens:', err);
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([30]);
    }
    await queryClient.invalidateQueries({ queryKey: ['technician-history'] });
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 2. Filtra estritamente os serviços finalizados pelo técnico
  const finishedOrders = useMemo(() => {
    return allOrders.filter((os: any) => {
      if (!os) return false;
      const st = String(os.status || '').toUpperCase();
      const isFinished = [
        'QA',
        'READY',
        'DELIVERED',
        'COMPLETED',
        'CONCLUIDO',
        'CONCLUÍDO',
        'PRONTO',
        'ENTREGUE',
      ].includes(st);

      if (!isFinished) return false;

      // Se for técnico, exibe ordens atribuídas a ele ou ordens sem técnico explícito (equipe geral)
      const techId =
        os.technicianId ||
        os.technician_id ||
        os.technician?.id ||
        os.tecnico_id;

      const isMyTech = !currentUserId || !techId || techId === currentUserId;
      return isMyTech;
    });
  }, [allOrders, currentUserId]);

  // 3. Aplica busca por texto e aba de status
  const filteredList = useMemo(() => {
    let result = finishedOrders;

    if (selectedFilter !== 'ALL') {
      result = result.filter((os) => {
        const st = String(os.status || '').toUpperCase();
        if (selectedFilter === 'QA') return st === 'QA';
        if (selectedFilter === 'READY') return st === 'READY' || st === 'PRONTO';
        if (selectedFilter === 'DELIVERED') return st === 'DELIVERED' || st === 'COMPLETED' || st.includes('CONCLU');
        return true;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((os) => {
        const plate = (os.vehicle?.plate || os.placa || '').toLowerCase();
        const vehicle = (
          os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : os.veiculo_desc || ''
        ).toLowerCase();
        const client = (os.customer?.name || os.cliente_nome || '').toLowerCase();
        const osNum = String(os.osNumber || os.os_number || os.id).toLowerCase();
        const service = (
          os.items?.map((i: any) => i.name).join(' ') ||
          os.service_summary ||
          os.servico ||
          ''
        ).toLowerCase();

        return (
          plate.includes(term) ||
          vehicle.includes(term) ||
          client.includes(term) ||
          osNum.includes(term) ||
          service.includes(term)
        );
      });
    }

    return result;
  }, [finishedOrders, selectedFilter, searchTerm]);

  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'QA') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Vistoria QA
        </span>
      );
    }
    if (s === 'READY' || s === 'PRONTO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-950/80 text-teal-300 border border-teal-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          Pronto p/ Entrega
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30">
        <ShieldCheck size={11} />
        Entregue · Garantia
      </span>
    );
  };

  return (
    <div className="fade-in space-y-4 pb-20">
      {/* Cabeçalho do Histórico */}
      <div className="flex items-center justify-between pt-1 px-1">
        <div>
          <h3 className="text-xs font-bold text-[#9AA7B8] uppercase tracking-[0.2em] font-['Space_Grotesk']">
            Seus Serviços Concluídos
          </h3>
          <p className="text-[11px] text-[#5B6674] mt-0.5">
            Total de <strong>{finishedOrders.length}</strong> veículos finalizados por você
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isRefetching || isRefreshing}
          className="p-2 rounded-2xl bg-[#171C24] border border-[#2E3744] text-[#C8F52E] hover:brightness-110 active:scale-95 transition-all shadow-sm"
          title="Atualizar Histórico"
        >
          <RefreshCw
            size={16}
            className={isLoading || isRefetching || isRefreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por placa, carro, cliente ou OS..."
          className="w-full h-11 pl-10 pr-4 bg-[#171C24] border border-[#2E3744] rounded-2xl text-xs font-medium text-[#F2F5F8] placeholder-[#5B6674] focus:outline-none focus:border-[#C8F52E] transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6674] hover:text-[#F2F5F8]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs Rápidas de Filtro */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        {[
          { id: 'ALL' as FilterTab, label: 'Todos', count: finishedOrders.length },
          {
            id: 'QA' as FilterTab,
            label: 'Em QA',
            count: finishedOrders.filter((o) => String(o.status).toUpperCase() === 'QA').length,
          },
          {
            id: 'READY' as FilterTab,
            label: 'Prontos',
            count: finishedOrders.filter((o) => ['READY', 'PRONTO'].includes(String(o.status).toUpperCase())).length,
          },
          {
            id: 'DELIVERED' as FilterTab,
            label: 'Entregues',
            count: finishedOrders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(String(o.status).toUpperCase())).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
              selectedFilter === tab.id
                ? 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E] shadow-sm font-["Space_Grotesk"]'
                : 'bg-[#171C24] text-[#9AA7B8] border-[#2E3744] hover:text-white'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Lista de Ordens Concluídas */}
      {isLoading && finishedOrders.length === 0 ? (
        <div className="py-16 text-center bg-[#171C24] rounded-3xl border border-[#2E3744] p-6 space-y-3">
          <RefreshCw size={24} className="text-[#C8F52E] animate-spin mx-auto" />
          <p className="text-xs text-[#9AA7B8]">Carregando histórico do servidor...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-[#171C24] rounded-3xl border border-[#2E3744] p-6 space-y-2">
          <div className="w-12 h-12 bg-[#232A35] rounded-2xl border border-[#2E3744] text-[#C8F52E] flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-[#F2F5F8] uppercase tracking-wide font-['Space_Grotesk']">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum serviço concluído nesta categoria'}
          </h4>
          <p className="text-xs text-[#9AA7B8] max-w-xs mx-auto">
            {searchTerm
              ? 'Tente buscar com outra placa, número de OS ou nome de cliente.'
              : 'Assim que você finalizar o trabalho em um veículo no box, ele aparecerá arquivado aqui.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((os: any) => {
            const plate = os.vehicle?.plate || os.placa || 'SEM PLACA';
            const vehicleDesc = os.vehicle
              ? `${os.vehicle.brand || ''} ${os.vehicle.model || ''}`.trim()
              : os.veiculo_desc || os.veiculo || 'Veículo';
            const customerName = os.customer?.name || os.cliente_nome || os.cliente || 'Cliente';
            const servicesSummary =
              os.items?.map((i: any) => i.name).join(', ') ||
              os.service_summary ||
              os.servico ||
              'Serviço Automotivo Executado';
            const osNum = os.osNumber || os.os_number || os.id;
            const completedDate = os.completedAt || os.completed_at || os.deliveredAt || os.updatedAt || os.updated_at;

            return (
              <div
                key={os.id}
                onClick={() => setSelectedHistoryOs(os)}
                className="bg-[#171C24] hover:bg-[#1C232E] active:scale-[0.99] rounded-3xl p-4 md:p-5 border border-[#2E3744] flex items-center gap-3.5 transition-all cursor-pointer shadow-sm group"
              >
                {/* Ícone de Sucesso */}
                <div className="w-11 h-11 bg-[#C8F52E]/15 text-[#C8F52E] rounded-2xl flex items-center justify-center border border-[#C8F52E]/30 shrink-0">
                  <CheckCircle2 size={22} strokeWidth={2.5} />
                </div>

                {/* Conteúdo Central */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#F2F5F8] uppercase truncate font-['Space_Grotesk']">
                      {vehicleDesc}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-[#9AA7B8] bg-[#0E1116] px-2 py-0.5 rounded-lg border border-[#2E3744] shrink-0">
                      OS #{osNum}
                    </span>
                  </div>

                  {/* Placa & Cliente */}
                  <div className="flex items-center gap-2 text-xs text-[#9AA7B8]">
                    <span className="font-mono font-bold text-[#F2F5F8] bg-[#262D35] px-1.5 py-0.5 rounded text-[11px]">
                      {plate}
                    </span>
                    <span className="truncate">· {customerName}</span>
                  </div>

                  {/* Resumo do Serviço */}
                  <p className="text-[11px] text-[#9AA7B8] line-clamp-1 font-medium">
                    {servicesSummary}
                  </p>

                  {/* Rodapé do Card com Status e Data */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    {renderStatusBadge(os.status)}
                    <span className="text-[10px] text-[#5B6674] flex items-center gap-1 shrink-0">
                      <Clock size={11} />
                      {formatDateBR(completedDate)}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="text-[#5B6674] group-hover:text-[#C8F52E] transition-colors shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes da OS Concluída */}
      {selectedHistoryOs && (
        <div className="fixed inset-0 bg-[#0E1116]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-[#171C24] rounded-3xl border border-[#2E3744] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] text-[#F2F5F8]">
            {/* Header */}
            <div className="p-5 border-b border-[#2E3744] flex items-center justify-between bg-[#0E1116]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#C8F52E]/20 text-[#C8F52E] flex items-center justify-center border border-[#C8F52E]/30">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white font-['Space_Grotesk']">
                    OS #{selectedHistoryOs.osNumber || selectedHistoryOs.os_number || selectedHistoryOs.id} · Concluída
                  </h3>
                  <p className="text-xs text-[#9AA7B8]">
                    {selectedHistoryOs.vehicle?.brand} {selectedHistoryOs.vehicle?.model} (
                    {selectedHistoryOs.vehicle?.plate || selectedHistoryOs.placa})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryOs(null)}
                className="text-[#9AA7B8] hover:text-white p-2 rounded-xl hover:bg-[#262D35]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#9AA7B8]">
              {/* Status */}
              <div className="p-3 bg-[#0E1116] rounded-2xl border border-[#2E3744] flex items-center justify-between">
                <span className="text-[#9AA7B8] font-medium">Status Atual do Veículo:</span>
                {renderStatusBadge(selectedHistoryOs.status)}
              </div>

              {/* Informações do Cliente & Veículo */}
              <div className="bg-[#0E1116] p-4 rounded-2xl border border-[#2E3744] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Car size={16} className="text-[#C8F52E]" />
                  <span>
                    {selectedHistoryOs.vehicle?.brand} {selectedHistoryOs.vehicle?.model}
                  </span>
                  <span className="font-mono text-xs text-[#9AA7B8] bg-[#171C24] px-2 py-0.5 rounded border border-[#2E3744]">
                    {selectedHistoryOs.vehicle?.plate || selectedHistoryOs.placa}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#9AA7B8] pt-1 border-t border-[#2E3744]">
                  <User size={14} />
                  <span>
                    {selectedHistoryOs.customer?.name || selectedHistoryOs.cliente_nome || 'Cliente'} (
                    {selectedHistoryOs.customer?.phone || selectedHistoryOs.cliente_telefone || 'Sem contato'})
                  </span>
                </div>
              </div>

              {/* Serviços Executados */}
              <div className="bg-[#0E1116] p-4 rounded-2xl border border-[#2E3744] space-y-2.5">
                <h5 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5 font-['Space_Grotesk']">
                  <Sparkles size={14} className="text-[#C8F52E]" /> Serviços Executados
                </h5>
                <div className="space-y-1.5">
                  {selectedHistoryOs.items && selectedHistoryOs.items.length > 0 ? (
                    selectedHistoryOs.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-[#2E3744]/60 last:border-0"
                      >
                        <span className="text-white font-medium">{item.name}</span>
                        {item.warrantyMonths ? (
                          <span className="text-[10px] text-[#C8F52E] font-bold">
                            {item.warrantyMonths}m garantia
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#9AA7B8]">
                      {selectedHistoryOs.service_summary || selectedHistoryOs.servico || 'Serviço Concluído'}
                    </p>
                  )}
                </div>
              </div>

              {/* Observações e Finalização */}
              {selectedHistoryOs.notes && (
                <div className="bg-[#0E1116] p-4 rounded-2xl border border-[#2E3744] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8]">
                    Observações de Execução / Retirada:
                  </span>
                  <p className="text-xs text-white leading-relaxed">{selectedHistoryOs.notes}</p>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 bg-[#0E1116] border-t border-[#2E3744] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryOs(null)}
                className="px-5 py-2.5 bg-[#262D35] hover:bg-[#323B47] text-white font-bold rounded-xl text-xs transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperadorHistorico;
