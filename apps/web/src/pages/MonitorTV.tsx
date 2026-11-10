import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Clock,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Wrench,
  Sparkles,
  Flame,
  Radio,
  Tv,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../services/api';

function formatTimeBR(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getYouTubeEmbedUrl(idOrUrl: string): string {
  if (!idOrUrl) return '';
  let id = idOrUrl;
  if (idOrUrl.includes('youtube.com/watch?v=')) {
    id = idOrUrl.split('watch?v=')[1]?.split('&')[0] || '';
  } else if (idOrUrl.includes('youtu.be/')) {
    id = idOrUrl.split('youtu.be/')[1]?.split('?')[0] || '';
  }

  const isPlaylist = id.startsWith('PL') || id.length > 20;
  if (isPlaylist) {
    return `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1&mute=1&controls=0&loop=1&modestbranding=1&rel=0`;
  }
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0`;
}

export const MonitorTV: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);
  const [customVideoEnabled, setCustomVideoEnabled] = useState<boolean>(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Relógio ao vivo atualizado a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca dados de branding da oficina
  const { data: branding } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: () => api.branding.get().catch(() => null),
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // Busca ordens de serviço ativas para a TV
  const {
    data: workOrdersResponse,
    isLoading: loadingOrders,
  } = useQuery({
    queryKey: ['tv-work-orders'],
    queryFn: () => api.workOrders.list({ limit: 100 }),
    refetchInterval: 30000, // Polling de contingência a cada 30 segundos
  });

  // Conexão Server-Sent Events (SSE) para atualização em tempo real sem reload
  useEffect(() => {
    const sseUrl = api.realtime.getEventsUrl();
    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (
            parsed.type === 'work_order.updated' ||
            parsed.type === 'work_order.ready' ||
            parsed.type === 'work_order.created'
          ) {
            // Invalidação imediata do cache para re-render suave dos cards
            queryClient.invalidateQueries({ queryKey: ['tv-work-orders'] });
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ['tv-work-orders'] });
        }
      };

      es.onerror = () => {
        setIsSseConnected(false);
      };

      return () => {
        es.close();
      };
    } catch {
      setIsSseConnected(false);
    }
  }, [queryClient]);

  const rawOrders: any[] = Array.isArray(workOrdersResponse)
    ? workOrdersResponse
    : workOrdersResponse?.workOrders || [];

  // Filtra as ordens em produção: CHECKED_IN, IN_PROGRESS, QA, READY
  // Ordena com prioridade: Retrabalhos primeiro, depois Em Execução, depois QA, depois Prontos
  const producao = useMemo(() => {
    return rawOrders
      .filter((os) => ['CHECKED_IN', 'IN_PROGRESS', 'QA', 'READY'].includes(os.status))
      .sort((a, b) => {
        if (a.is_rework && !b.is_rework) return -1;
        if (!a.is_rework && b.is_rework) return 1;

        const priorityMap: Record<string, number> = {
          IN_PROGRESS: 1,
          QA: 2,
          CHECKED_IN: 3,
          READY: 4,
        };
        const pA = priorityMap[a.status] || 99;
        const pB = priorityMap[b.status] || 99;
        return pA - pB;
      });
  }, [rawOrders]);

  const shopName = branding?.trade_name || branding?.name || 'CarX Oficina Premium';
  const logoUrl = branding?.logo_url || branding?.logoUrl || null;
  const youtubeId = branding?.youtube_id || branding?.youtubeId || null;
  const showVideo = !!youtubeId && customVideoEnabled;

  const displayOrders = producao.slice(0, showVideo ? 3 : 4);

  // Controle de Tela Cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Status mapping visual
  const getStatusBadge = (status: string, isRework: boolean) => {
    if (isRework) {
      return (
        <Badge variant="error" className="animate-pulse font-black gap-1 uppercase">
          <Flame size={12} className="text-white fill-white" />
          Retrabalho Prioritário
        </Badge>
      );
    }
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <Badge variant="volt" className="gap-1 font-black uppercase">
            <Activity size={12} className="animate-spin" />
            Em Execução
          </Badge>
        );
      case 'QA':
        return (
          <Badge variant="alert" className="gap-1 font-black uppercase">
            <ShieldCheck size={12} />
            Inspeção QA
          </Badge>
        );
      case 'READY':
        return (
          <Badge variant="volt" className="gap-1 font-black uppercase shadow-lg shadow-volt/20">
            <Sparkles size={12} className="animate-pulse text-asfalto fill-asfalto" />
            Pronto p/ Retirada
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="gap-1 font-black uppercase">
            <Clock size={12} />
            Check-in / Fila
          </Badge>
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-asfalto text-white overflow-hidden flex flex-col font-sans p-4 lg:p-6 select-none">
      {/* Top Bar / Branding Oficial da Loja */}
      <header className="flex items-center justify-between bg-grafite/90 backdrop-blur-xl p-4 lg:p-5 rounded-3xl border border-aco/60 shadow-2xl mb-4 lg:mb-6">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-asfalto rounded-2xl flex items-center justify-center border border-aco overflow-hidden shadow-inner flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={shopName} className="w-full h-full object-contain p-1" />
            ) : (
              <Car size={32} className="text-volt" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase text-white truncate max-w-md lg:max-w-xl">
                {shopName}
              </h1>
              <Badge variant="volt" className="hidden sm:inline-flex">
                TV Operacional
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSseConnected ? 'bg-volt animate-pulse' : 'bg-alerta'
                  }`}
                />
                <span className="font-bold uppercase tracking-wider text-[11px] text-cinza-muted">
                  {isSseConnected ? 'SSE Ao Vivo' : 'Sincronizando'}
                </span>
              </div>
              <span className="text-aco">•</span>
              <span className="text-[11px] text-cinza-muted font-mono font-bold">
                Pátio: <strong className="text-white">{producao.length} Veículos Ativos</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Relógio e Ações Rápidas */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end bg-asfalto/80 px-5 py-2.5 rounded-2xl border border-aco/50">
            <p className="text-3xl lg:text-4xl font-black font-mono tracking-tight tabular-nums text-volt leading-none">
              {formatTimeBR(currentTime)}
            </p>
            <p className="text-[10px] font-bold text-cinza-muted uppercase tracking-wider mt-1 capitalize">
              {formatDateBR(currentTime)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {youtubeId && (
              <button
                type="button"
                onClick={() => setCustomVideoEnabled(!customVideoEnabled)}
                className={`p-2.5 rounded-xl border transition-all ${
                  customVideoEnabled
                    ? 'bg-volt/20 text-volt border-volt/40'
                    : 'bg-asfalto text-cinza-muted border-aco hover:text-white'
                }`}
                title={customVideoEnabled ? 'Ocultar Vídeo' : 'Exibir Vídeo'}
              >
                <Tv size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-asfalto hover:bg-aco/50 text-white border border-aco transition-colors"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Área Principal de Exibição */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
        {/* Vídeo Institucional do YouTube (Caso Ativo) */}
        {showVideo && (
          <div className="w-full lg:w-1/2 h-full bg-black rounded-3xl overflow-hidden border border-aco/60 shadow-2xl relative flex flex-col">
            <iframe
              className="w-full h-full aspect-video flex-1"
              src={getYouTubeEmbedUrl(youtubeId)}
              title="Apresentação da Oficina"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Fila Operacional em Cards Industriais */}
        <div
          className={`flex-1 overflow-hidden min-h-0 ${
            showVideo
              ? 'grid grid-cols-1 grid-rows-3 gap-3 w-full lg:w-1/2'
              : 'grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 w-full'
          }`}
        >
          {displayOrders.length > 0 ? (
            displayOrders.map((item) => {
              const progress = item.progress_percent ?? item.progresso ?? 0;
              const plate = item.plate || item.placa || 'PLACA-OFF';
              const vehicleDesc = item.model
                ? `${item.brand || ''} ${item.model}`
                : item.veiculo_desc || item.veiculo || 'Veículo em Atendimento';
              const customerName = item.customer_name || item.cliente_nome || 'Cliente da Loja';
              const techName = item.technician_name || item.tecnico_nome || 'Equipe Geral';
              const bayName = item.bay_name || item.box_nome || 'Box Pátio';

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-3xl bg-grafite border border-aco/70 shadow-2xl flex flex-col justify-between p-5 lg:p-6 transition-all duration-500 hover:border-volt/40"
                >
                  {/* Linha Superior: OS, Placa e Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black bg-asfalto text-volt border border-volt/30 px-2.5 py-1 rounded-lg">
                        OS #{item.os_number || item.id?.slice(0, 5) || '001'}
                      </span>
                      {getStatusBadge(item.status, item.is_rework)}
                    </div>

                    {/* Placa Mercosul de Alto Contraste */}
                    <div className="bg-asfalto border-2 border-white/20 rounded-xl px-3 py-1 text-center shadow-md">
                      <span className="block text-[8px] font-bold text-cinza-muted uppercase tracking-widest leading-none">
                        BRASIL
                      </span>
                      <span className="font-mono text-base lg:text-lg font-black text-white tracking-widest leading-none">
                        {plate.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Centro: Veículo, Cliente e Detalhes */}
                  <div className="my-2">
                    <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight truncate">
                      {vehicleDesc}
                    </h2>
                    <p className="text-xs text-cinza-muted font-bold uppercase tracking-wider truncate mt-0.5">
                      {customerName}
                    </p>
                  </div>

                  {/* Informações de Equipe & Box */}
                  <div className="flex items-center justify-between text-xs text-cinza-muted border-t border-aco/40 pt-2.5 mt-auto">
                    <div className="flex items-center gap-1.5 truncate">
                      <User size={13} className="text-volt flex-shrink-0" />
                      <span className="truncate">{techName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-cinza-claro">
                      <Wrench size={12} className="text-volt flex-shrink-0" />
                      <span>{bayName}</span>
                    </div>
                  </div>

                  {/* Barra de Progresso com Shimmer */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5">
                      <span className="text-[10px] text-cinza-muted uppercase tracking-wider font-sans">
                        Progresso de Execução
                      </span>
                      <span className="text-volt font-black text-sm">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-asfalto rounded-full overflow-hidden border border-aco/50 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                          item.status === 'READY'
                            ? 'bg-volt shadow-lg shadow-volt/30'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      >
                        {item.status === 'IN_PROGRESS' && progress > 0 && progress < 100 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full h-full flex flex-col items-center justify-center bg-grafite/50 rounded-3xl border border-aco/40 border-dashed p-12 text-center">
              <div className="w-20 h-20 bg-asfalto rounded-full flex items-center justify-center mb-4 border border-aco">
                <CheckCircle2 size={36} className="text-volt" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Pátio Operacional Livre
              </h3>
              <p className="text-xs text-cinza-muted uppercase tracking-wider mt-1 max-w-sm">
                Nenhum veículo em execução ou aguardando no momento. Os novos serviços aparecerão aqui automaticamente via tempo real.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer Industrial da TV */}
      <footer className="h-8 flex items-center justify-between px-3 border-t border-aco/40 pt-3 flex-shrink-0 mt-3 text-[10px] font-mono text-cinza-muted uppercase tracking-wider">
        <div className="flex items-center gap-4">
          <span className="font-bold text-white">{shopName} • CarX</span>
          <span>•</span>
          <span className="text-volt font-bold flex items-center gap-1">
            <Radio size={11} className={isSseConnected ? 'animate-pulse text-volt' : 'text-alerta'} />
            {isSseConnected ? 'Conexão Ativa' : 'Reconectando'}
          </span>
        </div>
        <p className="text-cinza-muted">Painel Oficial do Galpão</p>
      </footer>

      {/* Animação CSS Shimmer */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-shimmer {
              animation: shimmer 2s infinite linear;
            }
          `,
        }}
      />
    </div>
  );
};

export default MonitorTV;
