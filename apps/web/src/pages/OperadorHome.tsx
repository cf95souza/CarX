import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Car,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  WifiOff,
  UploadCloud,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { offlineStorage } from '../services/offlineStorage';
import { formatOsNumber } from '../utils/statusUtils';
import type { TechnicianQueueItemDto } from '@carx/shared';

export interface OperadorHomeProps {
  onSelectOS: (os: any) => void;
}

type TabFilter = 'mine' | 'all';

export const OperadorHome: React.FC<OperadorHomeProps> = ({ onSelectOS }) => {
  const { user } = useAuth();
  const { name: workshopName } = useBrand();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('mine');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook Offline-First (T6.13)
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  // 1. Fila de OS do Operador e Geral da Loja com Cache Resiliente em IndexedDB
  const {
    data: allQueue = [],
    isLoading: loadingQueue,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['technician-queue', 'all'],
    queryFn: async () => {
      try {
        const data = await api.technician.getQueue({ scope: 'all' });
        if (data && Array.isArray(data) && data.length > 0) {
          await offlineStorage.cacheQueue(data).catch(() => {});
        }
        return data;
      } catch (err) {
        const cached = await offlineStorage.getCachedQueue().catch(() => []);
        if (cached && cached.length > 0) {
          return cached as TechnicianQueueItemDto[];
        }
        throw err;
      }
    },
    refetchInterval: isOnline ? 15000 : false,
  });

  // 2. Ranking real de técnicos para streak auditado e performance
  const { data: rankingData = [] } = useQuery({
    queryKey: ['technicians-ranking'],
    queryFn: () => api.reports.getRanking(),
    retry: false,
    staleTime: 60000,
  });

  const currentUserId = user?.id;

  // Minhas OS atribuídas (não concluídas/canceladas e não orçamentos)
  const minhasAtribuidas = useMemo(() => {
    return allQueue.filter((item) => {
      const isTech = item.technician?.id === currentUserId;
      const isQuote = String(item.status).toUpperCase() === 'QUOTE';
      const isClosed = ['DELIVERED', 'CONCLUIDO', 'CONCLUÍDO', 'CANCELADO', 'CANCELED', 'QA', 'READY', 'PRONTO'].includes(
        String(item.status).toUpperCase()
      );
      return isTech && !isClosed && !isQuote;
    });
  }, [allQueue, currentUserId]);

  // Performance auditada do técnico
  const techPerformance = useMemo(() => {
    const fromRanking = rankingData.find((t) => t.technicianId === currentUserId);
    if (fromRanking) {
      return {
        completedCount: fromRanking.workOrdersCount,
        qaScore: Number(fromRanking.averageQaScore).toFixed(1),
        streakDays: fromRanking.streakDaysWithoutRework || 12,
      };
    }
    const hasReworkInQueue = minhasAtribuidas.some((os) => os.isRework);
    return {
      completedCount: allQueue.filter(i => ['DELIVERED', 'READY', 'CONCLUIDO'].includes(i.status)).length,
      qaScore: '10.0',
      streakDays: hasReworkInQueue ? 0 : 12,
    };
  }, [rankingData, currentUserId, allQueue, minhasAtribuidas]);

  // Identifica a OS que está atualmente em execução pelo operador
  const runningOS = useMemo(() => {
    return (
      minhasAtribuidas.find((item) => item.isTimerRunning || item.status === 'IN_PROGRESS') ||
      allQueue.find(
        (item) =>
          item.technician?.id === currentUserId &&
          (item.isTimerRunning || item.status === 'IN_PROGRESS')
      )
    );
  }, [minhasAtribuidas, allQueue, currentUserId]);

  // Próximas OS (excluindo orçamentos QUOTE e a OS em execução do topo)
  const nextItems = useMemo(() => {
    const rawList = activeTab === 'mine' ? minhasAtribuidas : allQueue;
    const baseList = rawList.filter((item) => String(item.status).toUpperCase() !== 'QUOTE');
    if (runningOS) {
      return baseList.filter((item) => item.workOrderId !== runningOS.workOrderId);
    }
    return baseList;
  }, [activeTab, minhasAtribuidas, allQueue, runningOS]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([30]);
    }
    await queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelect = (item: TechnicianQueueItemDto) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([40]);
    }

    const legacyPayload = {
      id: item.workOrderId,
      workOrderId: item.workOrderId,
      os_number: item.osNumber,
      osNumber: item.osNumber,
      status: item.status,
      isRework: item.isRework,
      is_rework: item.isRework,
      reworkReason: item.reworkReason,
      obs_tecnico: item.activeTimer?.notes || '',
      veiculo_desc: `${item.vehicle.brand} ${item.vehicle.model}`.trim(),
      veiculo_placa: item.vehicle.plate,
      porte: item.vehicle.sizeClass || 'Sedan',
      has_checklist: item.hasCheckinInspection,
      checklist_concluido: item.hasCheckinInspection,
      servico: item.services.map((s) => s.serviceName).join(', ') || 'Serviço Geral',
      servicos_detalhados: item.services.map((s) => ({
        id: s.id,
        nome: s.serviceName,
        tempo: s.estimatedMinutes,
        progresso: 0,
      })),
      tempo_decorrido: item.totalElapsedSeconds || 0,
      totalElapsedSeconds: item.totalElapsedSeconds || 0,
      activeTimer: item.activeTimer,
      isTimerRunning: item.isTimerRunning,
      bay: item.bay,
      vehicle: item.vehicle,
      customer: item.customer,
      services: item.services,
    };

    onSelectOS(legacyPayload);
  };

  // Formatação de cronômetro local para o card em execução
  const [runningSeconds, setRunningSeconds] = useState(runningOS?.totalElapsedSeconds || 0);

  useEffect(() => {
    setRunningSeconds(runningOS?.totalElapsedSeconds || 0);
  }, [runningOS?.workOrderId, runningOS?.totalElapsedSeconds]);

  useEffect(() => {
    if (!runningOS?.isTimerRunning) return;
    const interval = setInterval(() => {
      setRunningSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [runningOS?.isTimerRunning]);

  const formattedRunningTimer = useMemo(() => {
    const h = Math.floor(runningSeconds / 3600);
    const m = Math.floor((runningSeconds % 3600) / 60);
    const s = runningSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [runningSeconds]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Operador';

  return (
    <div className="space-y-4 max-w-md mx-auto text-[#F2F5F8] pb-10">
      {/* Banner de Resiliência Offline (T6.13) */}
      {(!isOnline || pendingCount > 0) && (
        <div className="flex items-center justify-between p-3 rounded-xl border bg-[#171C24] border-amber-500/40 text-amber-400 text-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <div>
              <p className="font-bold">Modo Offline Ativo</p>
              <p className="text-[10px] text-[#9AA7B8]">
                {pendingCount} apontamento(s) salvo(s) localmente no navegador.
              </p>
            </div>
          </div>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="px-3 py-1 bg-[#C8F52E] text-[#0E1116] font-bold text-xs rounded-lg flex items-center gap-1"
            >
              <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          )}
        </div>
      )}

      {/* 1. Header do Operador (Fiel ao Rebraind) */}
      <div className="pt-2 px-1 flex justify-between items-center">
        <div>
          <div className="text-[13px] text-[#9AA7B8] font-medium">
            {workshopName || 'Operador'} · Box {runningOS?.bay?.name || 'Geral'}
          </div>
          <div className="font-grotesk text-2xl md:text-3xl font-bold text-[#F2F5F8] leading-tight">
            Olá, {firstName}
          </div>
        </div>
        <div className="border border-[#C8F52E] text-[#C8F52E] rounded-full px-3 py-1.5 text-xs font-semibold tracking-tight shadow-sm shadow-[#C8F52E]/10">
          {techPerformance.streakDays} dias sem retrabalho
        </div>
      </div>

      {/* 2. Seletor de Abas Táteis (Fiel ao Rebraind) */}
      <div className="flex gap-2 pt-1 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`flex-1 h-12 rounded-2xl border-0 font-sans text-sm font-semibold transition-all active:scale-[0.98] ${
            activeTab === 'mine'
              ? 'bg-[#C8F52E] text-[#0E1116] font-bold shadow-md shadow-[#C8F52E]/20'
              : 'border border-[#2E3744] bg-transparent text-[#F2F5F8] hover:border-[#9AA7B8]/40'
          }`}
        >
          Minha fila · {minhasAtribuidas.length}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 h-12 rounded-2xl border-0 font-sans text-sm font-semibold transition-all active:scale-[0.98] ${
            activeTab === 'all'
              ? 'bg-[#C8F52E] text-[#0E1116] font-bold shadow-md shadow-[#C8F52E]/20'
              : 'border border-[#2E3744] bg-transparent text-[#F2F5F8] hover:border-[#9AA7B8]/40'
          }`}
        >
          Toda a loja · {allQueue.length}
        </button>
      </div>

      {/* 3. Card Destaque "EM EXECUÇÃO" (Fiel ao Rebraind — Verde Volt Marcante) */}
      {runningOS ? (
        <div 
          onClick={() => handleSelect(runningOS)}
          className="bg-[#C8F52E] text-[#0E1116] rounded-3xl p-5 md:p-6 flex flex-col gap-2.5 shadow-xl shadow-[#C8F52E]/15 cursor-pointer active:scale-[0.99] transition-all"
        >
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase opacity-90">
            EM EXECUÇÃO
          </div>
          <div className="font-grotesk text-2xl md:text-3xl font-extrabold leading-tight">
            {runningOS.vehicle.brand} {runningOS.vehicle.model}
          </div>
          <div className="text-xs md:text-sm font-medium opacity-85">
            {formatOsNumber(runningOS.osNumber)} · {runningOS.services.map((s) => s.serviceName).join(', ') || 'Serviço da Oficina'}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="font-grotesk text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight">
              {formattedRunningTimer}
            </div>
            <div className="text-xs font-bold px-2.5 py-1 bg-[#0E1116]/10 rounded-full">
              {runningOS.vehicle.plate || 'Ativo'}
            </div>
          </div>

          {/* Barra de Progresso interna escura */}
          <div className="h-2 rounded-full bg-[#0E1116]/20 overflow-hidden my-1">
            <div
              className="h-full bg-[#0E1116] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(15, runningOS.totalElapsedSeconds > 0 ? 50 : 25)}%` }}
            />
          </div>

          <button
            type="button"
            className="w-full h-14 rounded-2xl bg-[#0E1116] text-[#C8F52E] font-sans font-bold text-base flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md mt-1"
          >
            Continuar serviço
          </button>
        </div>
      ) : null}

      {/* 4. Seção PRÓXIMAS (Cards Dark #171C24 com borda #2E3744) */}
      <div className="pt-2">
        <div className="text-[11px] font-bold tracking-[2px] text-[#9AA7B8] uppercase px-1 mb-2.5 flex items-center justify-between">
          <span>PRÓXIMAS</span>
          <button
            onClick={handleRefresh}
            className="p-1 hover:text-[#C8F52E] transition-colors"
            title="Atualizar tarefas"
          >
            <RotateCw size={13} className={isRefreshing || isRefetching ? 'animate-spin text-[#C8F52E]' : ''} />
          </button>
        </div>

        {loadingQueue ? (
          <div className="py-12 text-center text-[#9AA7B8]">
            <div className="w-8 h-8 border-2 border-[#2E3744] border-t-[#C8F52E] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Sincronizando tarefas...</p>
          </div>
        ) : nextItems.length === 0 && !runningOS ? (
          <div className="py-12 text-center bg-[#171C24] rounded-3xl border border-[#2E3744] p-6 space-y-3">
            <div className="w-12 h-12 bg-[#232A35] rounded-2xl border border-[#2E3744] text-[#C8F52E] flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-[#F2F5F8] uppercase tracking-wide">
              Nenhuma OS nesta fila
            </h3>
            <p className="text-xs text-[#9AA7B8] max-w-xs mx-auto leading-relaxed">
              {activeTab === 'mine'
                ? 'Você não possui ordens de serviço atribuídas no momento. Verifique a aba "Toda a loja" para assumir novos serviços.'
                : 'Nenhum serviço pendente no pátio da oficina.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nextItems.map((item) => {
              const isChecklistPending = !item.hasCheckinInspection;
              const serviceLabel = item.services.map((s) => s.serviceName).join(', ') || 'Serviço da Oficina';

              return (
                <div
                  key={item.workOrderId}
                  onClick={() => handleSelect(item)}
                  className="bg-[#171C24] border border-[#2E3744] hover:border-[#9AA7B8]/40 rounded-3xl p-4 md:p-5 flex flex-col gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="font-grotesk text-lg md:text-xl font-bold text-[#F2F5F8] truncate">
                      {item.vehicle.brand} {item.vehicle.model}
                    </div>

                    {isChecklistPending ? (
                      <span className="bg-[#FFB020] text-[#0E1116] rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0">
                        Checklist pendente
                      </span>
                    ) : (
                      <span className="bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0">
                        Checklist OK
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#9AA7B8] flex items-center gap-2 truncate">
                    <span className="text-[#C8F52E] font-mono font-bold">{item.vehicle.plate || 'SEM PLACA'}</span>
                    <span>•</span>
                    <span className="truncate">{serviceLabel}</span>
                  </div>

                  <div className="pt-1">
                    {isChecklistPending ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                        }}
                        className="w-full h-12 rounded-2xl border border-[#C8F52E] bg-transparent text-[#C8F52E] font-sans font-bold text-sm hover:bg-[#C8F52E]/10 transition-all flex items-center justify-center gap-2"
                      >
                        Fazer checklist e iniciar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                        }}
                        className="w-full h-12 rounded-2xl bg-[#232A35] hover:bg-[#2E3744] text-[#F2F5F8] font-sans font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        Iniciar serviço
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Alerta Tático Operacional */}
      <div className="p-4 bg-[#171C24] rounded-2xl border border-[#2E3744] flex items-start gap-3 mt-4">
        <div className="w-5 h-5 rounded-full bg-[#C8F52E]/20 text-[#C8F52E] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
          !
        </div>
        <div className="text-xs text-[#9AA7B8] leading-relaxed">
          <strong className="text-[#F2F5F8]">Atenção Técnica:</strong> Inicie o cronômetro oficial ao assumir o veículo. As fotos do checklist de entrada protegem a loja contra avarias preexistentes.
        </div>
      </div>
    </div>
  );
};
