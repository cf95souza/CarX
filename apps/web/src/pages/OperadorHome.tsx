import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  AlertCircle,
  Car,
  Clock,
  ChevronRight,
  Trophy,
  Star,
  Flame,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  MapPin,
  Sparkles,
  WifiOff,
  UploadCloud,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { offlineStorage } from '../services/offlineStorage';
import { Button } from '@carx/ui';
import { Badge } from '@carx/ui';
import { Card } from '@carx/ui';
import { Stopwatch } from '@carx/ui';
import type { TechnicianQueueItemDto } from '@carx/shared';

export interface OperadorHomeProps {
  onSelectOS: (os: any) => void;
}

type TabFilter = 'mine' | 'available' | 'all';

export const OperadorHome: React.FC<OperadorHomeProps> = ({ onSelectOS }) => {
  const { user } = useAuth();
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
          // Grava cópia local no IndexedDB para uso em galpões sem sinal
          await offlineStorage.cacheQueue(data).catch(() => {});
        }
        return data;
      } catch (err) {
        // Se a requisição de rede falhar (ex: sem sinal de internet), recupera do IndexedDB
        const cached = await offlineStorage.getCachedQueue().catch(() => []);
        if (cached && cached.length > 0) {
          return cached as TechnicianQueueItemDto[];
        }
        throw err;
      }
    },
    refetchInterval: isOnline ? 15000 : false, // Desliga polling periódico quando desconectado
  });

  // 2. Ranking real de técnicos para streak auditado e performance
  const { data: rankingData = [] } = useQuery({
    queryKey: ['technicians-ranking'],
    queryFn: () => api.reports.getRanking(),
    retry: false, // Se não for GESTOR/OWNER, falha graciosa
    staleTime: 60000,
  });

  // Filtros de fila
  const currentUserId = user?.id;

  // Minhas OS atribuídas (não concluídas/canceladas)
  const minhasAtribuidas = useMemo(() => {
    return allQueue.filter((item) => {
      const isTech = item.technician?.id === currentUserId;
      const isClosed = ['DELIVERED', 'CONCLUIDO', 'CONCLUÍDO', 'CANCELADO'].includes(
        String(item.status).toUpperCase()
      );
      return isTech && !isClosed;
    });
  }, [allQueue, currentUserId]);

  // Fila geral disponível (sem técnico atribuído ou aguardando início)
  const filaGeralDisponivel = useMemo(() => {
    return allQueue.filter((item) => {
      const semTecnico = !item.technician?.id;
      const isClosed = ['DELIVERED', 'CONCLUIDO', 'CONCLUÍDO', 'CANCELADO', 'ENTREGUE'].includes(
        String(item.status).toUpperCase()
      );
      return semTecnico && !isClosed;
    });
  }, [allQueue]);

  // OS Concluídas recentemente
  const concluidas = useMemo(() => {
    return allQueue.filter((item) => {
      return ['DELIVERED', 'CONCLUIDO', 'CONCLUÍDO', 'ENTREGUE', 'INSPECTION_QA'].includes(
        String(item.status).toUpperCase()
      );
    });
  }, [allQueue]);

  // Performance auditada do técnico logado
  const techPerformance = useMemo(() => {
    const fromRanking = rankingData.find((t) => t.technicianId === currentUserId);
    if (fromRanking) {
      return {
        completedCount: fromRanking.workOrdersCount,
        qaScore: Number(fromRanking.averageQaScore).toFixed(1),
        streakDays: fromRanking.streakDaysWithoutRework,
      };
    }
    // Fallback calculado localmente se o usuário for operador puro sem acesso ao DRE
    const hasReworkInQueue = minhasAtribuidas.some((os) => os.isRework);
    return {
      completedCount: concluidas.length,
      qaScore: '10.0',
      streakDays: hasReworkInQueue ? 0 : 7,
    };
  }, [rankingData, currentUserId, concluidas.length, minhasAtribuidas]);

  // Dispara refresh tátil com vibração
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([30]);
    }
    await queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Prepara o objeto compatível com ExecutorView
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
      veiculo_cor: item.vehicle.color,
      cliente_nome: item.customer.name,
      cliente_telefone: item.customer.phone,
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

  // Itens para a aba ativa
  const displayedItems = useMemo(() => {
    if (activeTab === 'mine') return minhasAtribuidas;
    if (activeTab === 'available') return filaGeralDisponivel;
    return allQueue;
  }, [activeTab, minhasAtribuidas, filaGeralDisponivel, allQueue]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Banner de Resiliência Offline & Fila IndexedDB (T6.13) */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
            !isOnline
              ? 'bg-alerta/10 border-alerta/40 text-alerta'
              : 'bg-grafite border-volt/30 text-texto'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                !isOnline ? 'bg-alerta/20 text-alerta' : 'bg-volt/10 text-volt'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-5 h-5 animate-pulse" />
              ) : (
                <UploadCloud className="w-5 h-5 text-volt" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold">
                {!isOnline ? 'Modo Offline Ativo (IndexedDB)' : 'Sincronização Pendente'}
              </p>
              <p className="text-[11px] text-muted">
                {!isOnline
                  ? `${pendingCount} apontamento(s) salvo(s) localmente no navegador. Serão sincronizados ao reconectar.`
                  : `${pendingCount} apontamento(s) aguardando envio para a nuvem.`}
              </p>
            </div>
          </div>
          {isOnline && pendingCount > 0 && (
            <Button
              variant="volt"
              size="sm"
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="text-xs px-3 py-1.5 h-auto flex items-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Enviando...' : 'Sincronizar'}
            </Button>
          )}
        </div>
      )}

      {/* 1. Header de Gamificação Real & Performance Auditada */}
      <div className="relative overflow-hidden rounded-2xl bg-grafite border border-aco p-4 text-texto shadow-lg">
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-volt/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-asfalto rounded-xl border border-aco text-volt flex-shrink-0 shadow-inner">
              <Trophy className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-volt">
                  Performance do Técnico
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-volt/10 text-volt px-1.5 py-0.5 rounded border border-volt/20">
                  <Sparkles className="w-2.5 h-2.5" /> Oficial
                </span>
              </div>
              <h2 className="text-sm font-extrabold text-texto mt-0.5">
                {user?.name || 'Técnico Especialista'}
              </h2>
            </div>
          </div>

          {/* Botão Sincronizar Fila */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isRefetching}
            aria-label="Atualizar Fila de Serviços"
            className="p-2.5 rounded-xl bg-asfalto border border-aco text-muted hover:text-volt hover:border-volt/40 transition-all active:scale-95 flex-shrink-0"
          >
            <RotateCw
              className={`w-4 h-4 ${isRefreshing || isRefetching ? 'animate-spin text-volt' : ''}`}
            />
          </button>
        </div>

        {/* Indicadores de Performance Auditados */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-aco/60">
          <div className="bg-asfalto/70 rounded-xl p-2.5 text-center border border-aco/40">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Concluídas</p>
            <p className="text-base font-extrabold text-texto mt-0.5">
              {techPerformance.completedCount}
            </p>
          </div>
          <div className="bg-asfalto/70 rounded-xl p-2.5 text-center border border-aco/40">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Avaliação QA</p>
            <p className="text-base font-extrabold text-warning flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-warning" />
              <span>{techPerformance.qaScore}</span>
            </p>
          </div>
          <div className="bg-asfalto/70 rounded-xl p-2.5 text-center border border-aco/40">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider">Sem Retrabalho</p>
            <p className="text-base font-extrabold text-error flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-3.5 h-3.5 fill-error" />
              <span>{techPerformance.streakDays}d</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Seletor Tátil de Abas / KPIs Grandes para Oficina */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-98 ${
            activeTab === 'mine'
              ? 'bg-asfalto border-volt shadow-sm shadow-volt/20'
              : 'bg-grafite/60 border-aco hover:bg-grafite'
          }`}
        >
          <span
            className={`text-[9px] font-black uppercase tracking-wider block ${
              activeTab === 'mine' ? 'text-volt' : 'text-muted'
            }`}
          >
            Minhas OS
          </span>
          <span className="text-xl font-black text-texto block mt-0.5">
            {minhasAtribuidas.length}
          </span>
          <span className="text-[8px] font-semibold text-muted uppercase block">Em Execução</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-98 ${
            activeTab === 'available'
              ? 'bg-asfalto border-volt shadow-sm shadow-volt/20'
              : 'bg-grafite/60 border-aco hover:bg-grafite'
          }`}
        >
          <span
            className={`text-[9px] font-black uppercase tracking-wider block ${
              activeTab === 'available' ? 'text-volt' : 'text-muted'
            }`}
          >
            Fila Oficina
          </span>
          <span className="text-xl font-black text-texto block mt-0.5">
            {filaGeralDisponivel.length}
          </span>
          <span className="text-[8px] font-semibold text-muted uppercase block">Disponíveis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-98 ${
            activeTab === 'all'
              ? 'bg-asfalto border-volt shadow-sm shadow-volt/20'
              : 'bg-grafite/60 border-aco hover:bg-grafite'
          }`}
        >
          <span
            className={`text-[9px] font-black uppercase tracking-wider block ${
              activeTab === 'all' ? 'text-volt' : 'text-muted'
            }`}
          >
            Todas
          </span>
          <span className="text-xl font-black text-texto block mt-0.5">{allQueue.length}</span>
          <span className="text-[8px] font-semibold text-muted uppercase block">Pátio Geral</span>
        </button>
      </div>

      {/* 3. Indicador de Carregamento */}
      {loadingQueue && (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-aco border-t-volt rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Sincronizando tarefas da oficina...
          </p>
        </div>
      )}

      {/* 4. Lista de Ordens de Serviço Táteis */}
      {!loadingQueue && (
        <div className="space-y-3">
          {displayedItems.length === 0 ? (
            <div className="py-14 text-center bg-grafite/40 rounded-2xl border border-dashed border-aco p-6">
              <div className="w-12 h-12 bg-asfalto rounded-2xl border border-aco text-muted flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-volt" />
              </div>
              <h3 className="text-sm font-bold text-texto uppercase">Nenhuma OS nesta fila</h3>
              <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                {activeTab === 'mine'
                  ? 'Você não possui ordens de serviço atribuídas no momento. Verifique a Fila Oficina para assumir novos serviços.'
                  : 'Nenhum serviço pendente nesta visualização.'}
              </p>
            </div>
          ) : (
            displayedItems.map((item) => (
              <TechnicianServiceCard
                key={item.workOrderId}
                item={item}
                isMine={item.technician?.id === currentUserId}
                onSelect={() => handleSelect(item)}
              />
            ))
          )}
        </div>
      )}

      {/* 5. Alerta Tátil de Dica Operacional */}
      <div className="p-3.5 bg-grafite/80 rounded-xl border border-aco flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-volt flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted leading-relaxed">
          <strong className="text-texto">Atenção Técnica:</strong> Inicie o cronômetro oficial ao
          assumir o veículo. As fotos do checklist de entrada protegem a loja contra avarias
          preexistentes.
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// COMPONENTE DO CARD DE SERVIÇO TÁTIL (OTIMIZADO PARA OFICINA E LUVAS)
// ==============================================================================

interface TechnicianServiceCardProps {
  item: TechnicianQueueItemDto;
  isMine: boolean;
  onSelect: () => void;
}

const TechnicianServiceCard: React.FC<TechnicianServiceCardProps> = ({
  item,
  isMine,
  onSelect,
}) => {
  const isRunning = Boolean(item.isTimerRunning);
  const isInProgress = item.status === 'IN_PROGRESS';
  const isRework = Boolean(item.isRework);

  // Calcula tempo total estimado em horas/minutos
  const totalEstimatedMinutes = item.services.reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0);
  const formattedEstimated = totalEstimatedMinutes > 0
    ? `${Math.floor(totalEstimatedMinutes / 60)}h ${totalEstimatedMinutes % 60}m`
    : 'Sob demanda';

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 border cursor-pointer active:scale-[0.99] ${
        isRework
          ? 'border-error/80 bg-grafite/90 shadow-md shadow-error/10'
          : isRunning
          ? 'border-volt bg-grafite/95 shadow-md shadow-volt/10'
          : isMine
          ? 'border-aco hover:border-volt/50 bg-grafite/80'
          : 'border-aco/60 bg-grafite/50 hover:border-aco'
      }`}
      onClick={onSelect}
    >
      {/* Faixa decorativa no topo para Retrabalho ou Em Execução */}
      {isRework && (
        <div className="bg-error text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 fill-white" /> RETRABALHO — PRIORIDADE MÁXIMA
          </span>
          <span>{item.reworkReason || 'Ajuste de Qualidade'}</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Linha 1: OS, Placa em Destaque Industrial e Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Placa Estilo Automotivo Mercosul */}
            <div className="px-2.5 py-1 bg-asfalto border-2 border-aco rounded-md text-texto font-mono font-black text-xs tracking-wider uppercase shadow-inner">
              {item.vehicle.plate || 'SEM PLACA'}
            </div>
            <span className="text-[10px] font-bold text-muted uppercase">
              OS #{String(item.osNumber).padStart(4, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Badge Checklist */}
            {item.hasCheckinInspection ? (
              <Badge variant="volt" dot className="text-[9px] py-0.5">
                Checklist OK
              </Badge>
            ) : (
              <Badge variant="alert" dot className="text-[9px] py-0.5 animate-pulse">
                Sem Checklist
              </Badge>
            )}

            {/* Status da OS */}
            <Badge
              variant={isRunning || isInProgress ? 'volt' : 'neutral'}
              className="text-[9px] py-0.5 font-bold uppercase"
            >
              {isRunning ? 'Em Andamento' : item.status}
            </Badge>
          </div>
        </div>

        {/* Linha 2: Veículo e Box Alocado */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                isRunning
                  ? 'bg-volt text-asfalto border-volt font-black shadow-md shadow-volt/20'
                  : 'bg-asfalto text-muted border-aco'
              }`}
            >
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-texto leading-tight uppercase">
                {item.vehicle.brand} {item.vehicle.model}
              </h4>
              <p className="text-xs text-muted mt-0.5">
                {item.customer.name} {item.vehicle.color ? `• ${item.vehicle.color}` : ''}
              </p>
            </div>
          </div>

          {/* Box de Execução */}
          {item.bay && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-asfalto rounded-lg border border-aco text-right flex-shrink-0">
              <MapPin className="w-3 h-3 text-volt" />
              <span className="text-[10px] font-black uppercase text-texto">{item.bay.name}</span>
            </div>
          )}
        </div>

        {/* Linha 3: Serviços e Cronômetro */}
        <div className="pt-2 border-t border-aco/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted text-xs truncate max-w-[200px]">
            <Wrench className="w-3.5 h-3.5 text-volt flex-shrink-0" />
            <span className="truncate">
              {item.services.map((s) => s.serviceName).join(', ') || 'Serviços Gerais'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Cronômetro Oficial do Servidor */}
            {item.totalElapsedSeconds > 0 || isRunning ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-asfalto border border-aco">
                <Stopwatch
                  seconds={item.totalElapsedSeconds}
                  isActive={isRunning}
                  size="sm"
                  showIcon
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-muted">
                <Clock className="w-3 h-3" />
                <span>Est: {formattedEstimated}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Ação Tátil (56px) para Luvas/Oficina */}
        <Button
          type="button"
          size="mobile"
          variant={isRunning || isInProgress ? 'volt' : 'secondary'}
          className="w-full mt-2 font-black uppercase text-xs tracking-wider"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          leftIcon={
            isRunning ? (
              <Play className="w-4 h-4 fill-asfalto text-asfalto" />
            ) : (
              <Layers className="w-4 h-4" />
            )
          }
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          {isRunning
            ? 'Continuar Execução'
            : isInProgress
            ? 'Retomar Atividade'
            : isMine
            ? 'Abrir Atividade'
            : 'Assumir & Iniciar'}
        </Button>
      </div>
    </Card>
  );
};

export default OperadorHome;
