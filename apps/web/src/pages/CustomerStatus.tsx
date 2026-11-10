import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Car,
  Activity,
  CheckCircle2,
  ShieldCheck,
  LayoutGrid,
  MessageCircle,
  Instagram,
  Youtube,
  Music2,
  Clock,
  FileText,
  QrCode,
  Sparkles,
  Download,
  AlertTriangle,
  ChevronRight,
  Shield,
  Award,
} from 'lucide-react';

import { api } from '../services/api';
import { useBrand } from '../contexts/BrandContext';
import { Badge } from '@carx/ui';
import { Card } from '@carx/ui';
import { Button } from '@carx/ui';

export const CustomerStatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { name, logoUrl, whatsapp, instagramUrl, youtubeSocialUrl, tiktokUrl } = useBrand();

  const token = id || '';

  // 1. Busca os dados de tracking público da Ordem de Serviço via API Fastify
  const {
    data: trackingData,
    isLoading: loadingTracking,
    error: trackingError,
  } = useQuery({
    queryKey: ['public-tracking', token],
    queryFn: () => api.workOrders.getPublicTracking(token),
    enabled: Boolean(token),
    refetchInterval: 10000, // Atualização em tempo real a cada 10s
    retry: 1,
  });

  // 2. Se falhar ou se for um token de garantia, tenta carregar o Passaporte Digital
  const {
    data: passportData,
    isLoading: loadingPassport,
  } = useQuery({
    queryKey: ['public-passport', token],
    queryFn: () => api.qa.verifyPassport(token),
    enabled: Boolean(token) && (!trackingData || Boolean(trackingError)),
    retry: false,
  });

  const isLoading = loadingTracking || loadingPassport;
  const isFound = Boolean(trackingData || passportData);

  const statusInfo = useMemo(() => {
    const s = String(trackingData?.status || '').toUpperCase();
    if (['DELIVERED', 'CONCLUIDO', 'CONCLUÍDO', 'ENTREGUE'].includes(s)) {
      return { label: 'Veículo Entregue', color: 'volt' as const, bg: 'bg-volt/15 text-volt border-volt/30' };
    }
    if (['READY', 'PRONTO'].includes(s)) {
      return { label: 'Pronto p/ Retirada', color: 'volt' as const, bg: 'bg-volt text-asfalto font-black' };
    }
    if (['QA', 'INSPECAO'].includes(s)) {
      return { label: 'Em Inspeção de Qualidade (QA)', color: 'info' as const, bg: 'bg-info/15 text-info border-info/30' };
    }
    if (['IN_PROGRESS', 'EM EXECUÇÃO'].includes(s)) {
      return { label: 'Em Execução na Oficina', color: 'volt' as const, bg: 'bg-volt/20 text-volt border-volt/40 animate-pulse' };
    }
    if (['CHECKED_IN', 'CHECK-IN'].includes(s)) {
      return { label: 'Veículo no Pátio (Check-in Realizado)', color: 'neutral' as const, bg: 'bg-aco text-texto' };
    }
    if (['SCHEDULED', 'AGENDADO'].includes(s)) {
      return { label: 'Agendamento Confirmado', color: 'info' as const, bg: 'bg-info/10 text-info' };
    }
    return { label: trackingData?.status || 'Aguardando Início', color: 'neutral' as const, bg: 'bg-aco text-muted' };
  }, [trackingData?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-asfalto flex flex-col items-center justify-center p-6 gap-6">
        <div className="w-16 h-16 border-4 border-aco border-t-volt rounded-full animate-spin shadow-xl" />
        <div className="text-center">
          <p className="text-texto font-extrabold uppercase tracking-widest text-xs">
            Buscando dados do seu veículo...
          </p>
          <p className="text-muted text-[10px] uppercase font-bold mt-1 animate-pulse">
            Sincronizando com a oficina
          </p>
        </div>
      </div>
    );
  }

  if (!isFound) {
    return (
      <div className="min-h-screen bg-asfalto text-texto flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-grafite border border-aco rounded-2xl flex items-center justify-center mb-6 text-muted">
          <LayoutGrid className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-texto uppercase tracking-tight mb-2">
          Acompanhamento Não Encontrado
        </h2>
        <p className="text-muted text-xs font-medium max-w-sm mx-auto leading-relaxed">
          Verifique se o link ou QR Code recebido no WhatsApp está correto, ou entre em contato com
          a recepção da oficina.
        </p>
        <div className="mt-6 px-3 py-1.5 bg-grafite border border-aco rounded-md text-[10px] font-mono text-muted uppercase">
          Token: {token || 'Nenhum'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-asfalto text-texto font-sans p-4 md:p-8 selection:bg-volt/20 selection:text-volt">
      {/* 1. Header com Branding da Oficina */}
      <header className="max-w-2xl mx-auto mb-8 flex flex-col items-center text-center pt-4">
        <div className="w-16 h-16 bg-grafite border border-aco rounded-2xl flex items-center justify-center shadow-lg p-2.5 mb-3">
          {logoUrl ? (
            <img src={logoUrl} alt={name || 'CarX'} className="w-full h-full object-contain" />
          ) : (
            <Car className="w-8 h-8 text-volt" />
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-texto">
          {name || 'Oficina Especializada'}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-volt animate-ping" />
          <p className="text-[10px] font-black uppercase tracking-widest text-volt">
            Acompanhamento em Tempo Real
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Caso seja Certificado de Garantia / Passaporte */}
        {passportData && (
          <div className="bg-grafite rounded-2xl border border-volt/40 p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-volt/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-asfalto border border-aco text-volt rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="volt" dot className="text-[9px] uppercase font-bold">
                    {passportData.status === 'active' ? 'Garantia Ativa' : passportData.status}
                  </Badge>
                  <h3 className="text-base font-extrabold uppercase mt-1">
                    Passaporte do Veículo & Garantia
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-aco text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted uppercase block">Veículo</span>
                <span className="font-extrabold text-texto uppercase">
                  {passportData.vehicleBrand} {passportData.vehicleModel}
                </span>
                <span className="font-mono text-muted block text-[10px]">{passportData.vehiclePlateMasked}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted uppercase block">Serviço Certificado</span>
                <span className="font-extrabold text-texto">{passportData.serviceName}</span>
                {passportData.materialLotNumber && (
                  <span className="text-muted block text-[10px]">Lote: {passportData.materialLotNumber}</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-asfalto rounded-xl border border-aco flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted uppercase block">Validade</span>
                <span className="font-extrabold text-volt">
                  {passportData.remainingDays} dias restantes ({passportData.warrantyMonths} meses)
                </span>
              </div>
              <ShieldCheck className="w-6 h-6 text-volt" />
            </div>
          </div>
        )}

        {/* Caso seja Ordem de Serviço em Execução */}
        {trackingData && (
          <Card className="bg-grafite border-aco p-6 space-y-6 shadow-2xl">
            {/* Header da OS */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-asfalto border border-aco rounded text-texto font-mono font-black text-xs uppercase">
                    {trackingData.plate || 'SEM PLACA'}
                  </div>
                  <span className="text-[10px] font-bold text-muted uppercase">
                    OS #{String(trackingData.osNumber).padStart(4, '0')}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-texto uppercase mt-1.5">
                  {trackingData.brand} {trackingData.model}
                </h2>
              </div>

              {/* Status Badge */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${statusInfo.bg}`}>
                {statusInfo.label}
              </div>
            </div>

            {/* Barra de Progresso Geral */}
            <div className="bg-asfalto rounded-xl p-4 border border-aco space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-wider text-muted text-[10px]">
                  Progresso do Atendimento
                </span>
                <span className="font-black text-volt text-sm">{trackingData.progress}%</span>
              </div>

              <div className="h-3 w-full bg-grafite rounded-full overflow-hidden border border-aco p-0.5">
                <div
                  className="h-full rounded-full bg-volt transition-all duration-700 ease-out"
                  style={{ width: `${trackingData.progress}%` }}
                />
              </div>
            </div>

            {/* Serviços Contratados */}
            {trackingData.items && trackingData.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">
                  Serviços em Execução
                </h4>
                <div className="divide-y divide-aco/60 bg-asfalto rounded-xl border border-aco overflow-hidden">
                  {trackingData.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-texto uppercase">{item.name}</span>
                      {item.category && (
                        <span className="text-[9px] font-bold text-muted uppercase px-2 py-0.5 rounded bg-grafite">
                          {item.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linha do Tempo dos Eventos */}
            {trackingData.timeline && trackingData.timeline.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">
                  Histórico do Veículo
                </h4>
                <div className="space-y-2 border-l-2 border-aco pl-4 ml-2">
                  {trackingData.timeline.map((event: any, idx: number) => (
                    <div key={idx} className="relative pb-2 last:pb-0">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-volt" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-texto uppercase">
                          {event.status}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(event.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {event.notes && (
                        <p className="text-[11px] text-muted mt-0.5 italic">{event.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 3. Ações de Contato e Suporte */}
        <div className="space-y-3 pt-2">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Olá! Gostaria de falar sobre o acompanhamento da OS #${
                  trackingData?.osNumber || ''
                } do meu veículo.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#22bf5b] text-asfalto py-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
            >
              <MessageCircle className="w-5 h-5 fill-asfalto text-asfalto" /> Falar com a Recepção no WhatsApp
            </a>
          )}

          {/* Redes Sociais */}
          <div className="flex justify-center gap-3 pt-2">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-grafite border border-aco rounded-xl flex items-center justify-center text-muted hover:text-texto hover:border-volt transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {youtubeSocialUrl && (
              <a
                href={youtubeSocialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-grafite border border-aco rounded-xl flex items-center justify-center text-muted hover:text-texto hover:border-volt transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            )}
            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-grafite border border-aco rounded-xl flex items-center justify-center text-muted hover:text-texto hover:border-volt transition-all"
                aria-label="TikTok"
              >
                <Music2 className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Footer Seguro */}
        <footer className="text-center pt-8 text-[10px] uppercase font-bold text-muted flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-volt" />
          <span>Acompanhamento Criptografado & Protegido por CarX</span>
        </footer>
      </div>
    </div>
  );
};

export default CustomerStatus;
