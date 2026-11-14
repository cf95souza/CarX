import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { NpsMetricsDto, GoogleReputationOverviewDto } from '@carx/shared';
import { toast } from '../../utils/toast';

export const NpsDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [sentClients, setSentClients] = useState<string[]>([]);
  const [reviewUrlInput, setReviewUrlInput] = useState<string>('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  // Consulta de métricas gerais de NPS do backend
  const { data: metrics } = useQuery<NpsMetricsDto>({
    queryKey: ['nps-metrics'],
    queryFn: () => api.nps.getMetrics(),
    staleTime: 1000 * 30,
  });

  // Consulta de pesquisas NPS reais (para envios pendentes e detratores reais)
  const { data: surveysData } = useQuery({
    queryKey: ['nps-surveys-list'],
    queryFn: () => api.nps.listSurveys({ limit: 50 }).catch(() => []),
    staleTime: 1000 * 30,
  });

  const surveysList: any[] = Array.isArray(surveysData)
    ? surveysData
    : (surveysData as any)?.surveys || [];

  // Consulta da visão consolidada de reputação Google Meu Negócio
  const { data: reputation, isLoading: isLoadingReputation } = useQuery<GoogleReputationOverviewDto>({
    queryKey: ['nps-reputation-overview'],
    queryFn: async () => {
      const data = await api.nps.getReputationOverview();
      if (!reviewUrlInput && data.googleReviewUrl) {
        setReviewUrlInput(data.googleReviewUrl);
      }
      return data;
    },
    staleTime: 1000 * 30,
  });

  // Mutação para atualizar a URL do Google Meu Negócio
  const updateUrlMutation = useMutation({
    mutationFn: (url: string) => api.nps.updateGoogleReviewUrl(url),
    onSuccess: (data) => {
      toast.success('Link do Google Meu Negócio atualizado com sucesso!');
      setIsEditingUrl(false);
      setReviewUrlInput(data.googleReviewUrl);
      queryClient.invalidateQueries({ queryKey: ['nps-reputation-overview'] });
    },
    onError: () => {
      toast.error('Erro ao salvar o link do Google Meu Negócio. Tente novamente.');
    },
  });

  const handleSaveReviewUrl = () => {
    if (!reviewUrlInput.trim()) {
      toast.warning('Informe uma URL válida do Google Meu Negócio.');
      return;
    }
    updateUrlMutation.mutate(reviewUrlInput.trim());
  };

  // Disparo de convite Google para promotor individual (respeitando se a loja tem gateway ou link wa.me manual)
  const handleSendGoogleInvite = async (surveyId: string, manualUrl?: string) => {
    setSendingInviteId(surveyId);
    try {
      const res = await api.nps.sendGoogleInvite(surveyId);
      if (res.mode === 'automatic') {
        toast.success('Convite de avaliação 5 estrelas enviado com sucesso pelo WhatsApp oficial da loja!');
      } else if (res.whatsappUrl || manualUrl) {
        const urlToOpen = res.whatsappUrl || manualUrl;
        toast.info('Abrindo WhatsApp Web para envio manual em 1 clique (Plano sem gateway).');
        if (urlToOpen) window.open(urlToOpen, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['nps-reputation-overview'] });
    } catch (err: any) {
      // Fallback para manual wa.me se a API relatar ausência de gateway
      if (manualUrl) {
        toast.info('Abrindo WhatsApp Web com link do promotor...');
        window.open(manualUrl, '_blank');
      } else {
        toast.error('Não foi possível disparar o convite no momento.');
      }
    } finally {
      setSendingInviteId(null);
    }
  };

  const hasReviews = Boolean(metrics && metrics.totalAnswered > 0);
  const score = hasReviews ? metrics!.npsScore : 0;
  const promotersPercent = hasReviews ? metrics!.promotersPercent : 0;
  const passivesPercent = hasReviews ? metrics!.passivesPercent : 0;
  const detractorsPercent = hasReviews ? metrics!.detractorsPercent : 0;
  const totalReviews = metrics?.totalAnswered ?? 0;

  const pendingClients = surveysList
    .filter((s: any) => s && !s.answeredAt && s.status !== 'ANSWERED')
    .map((s: any) => ({
      id: String(s.id),
      name: s.customerName || s.customer?.name || 'Cliente',
      vehicle: s.vehicleModel || s.vehicle?.model || 'Veículo',
      osId: String(s.osNumber || s.workOrderNumber || s.workOrderId || '-'),
      phone: String(s.customerPhone || s.customer?.phone || '').replace(/\D/g, ''),
      token: s.token || s.id,
    }));

  const latestDetractor = surveysList.find(
    (s: any) => s && typeof s.score === 'number' && s.score <= 6
  );

  const handleSendSingle = (client: (typeof pendingClients)[0]) => {
    if (!client.phone) {
      toast.warning('Cliente sem telefone cadastrado para envio via WhatsApp.');
      return;
    }
    const cleanPhone = client.phone.startsWith('55') ? client.phone : `55${client.phone}`;
    const msg = `Olá, *${client.name}*! Agradecemos a confiança em trazer seu *${client.vehicle}* na nossa oficina! Poderia avaliar nosso atendimento com uma nota rápida de 0 a 10? Acesse: ${window.location.origin}/nps/${client.token}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSentClients((prev) => [...prev, client.id]);
  };

  const handleSendBatch = () => {
    if (pendingClients.length === 0) {
      toast.info('Nenhum cliente pendente de avaliação no momento.');
      return;
    }
    toast.info(`Preparando envio para ${pendingClients.length} cliente(s) pendente(s)...`);
    pendingClients.forEach((client) => handleSendSingle(client));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 1. GRID DE 4 CARDS DE MÉTRICAS NPS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
          gap: '16px',
        }}
      >
        {/* CARD 1: NPS DO MÊS (PRETO) */}
        <div
          style={{
            background: '#0E1116',
            border: '1px solid #0E1116',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '14px', color: '#9AA7B8', fontWeight: 500 }}>NPS do mês</span>
          <b
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#C8F52E',
              fontSize: '56px',
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            {score}
          </b>
          <span style={{ fontSize: '14px', color: '#9AA7B8', fontWeight: 500 }}>
            {totalReviews === 0
              ? 'Sem avaliações recebidas ainda'
              : `${totalReviews} avaliação(ões) · ${
                  score >= 75
                    ? 'zona de excelência'
                    : score >= 50
                      ? 'zona de qualidade'
                      : 'em acompanhamento'
                }`}
          </span>
        </div>

        {/* CARD 2: PROMOTORES (9-10) */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>
            Promotores (9–10)
          </span>
          <b
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '36px',
              color: '#0E1116',
              fontWeight: 700,
            }}
          >
            {promotersPercent}%
          </b>
          <i
            style={{
              display: 'block',
              height: '8px',
              borderRadius: '99px',
              background: '#C8F52E',
              width: `${promotersPercent}%`,
              fontStyle: 'normal',
            }}
          />
        </div>

        {/* CARD 3: NEUTROS (7-8) */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>
            Neutros (7–8)
          </span>
          <b
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '36px',
              color: '#0E1116',
              fontWeight: 700,
            }}
          >
            {passivesPercent}%
          </b>
          <i
            style={{
              display: 'block',
              height: '8px',
              borderRadius: '99px',
              background: '#FFB020',
              width: `${passivesPercent}%`,
              fontStyle: 'normal',
            }}
          />
        </div>

        {/* CARD 4: DETRATORES (0-6) */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>
            Detratores (0–6)
          </span>
          <b
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '36px',
              color: '#0E1116',
              fontWeight: 700,
            }}
          >
            {detractorsPercent}%
          </b>
          <i
            style={{
              display: 'block',
              height: '8px',
              borderRadius: '99px',
              background: '#E5484D',
              width: `${detractorsPercent > 0 ? Math.max(8, detractorsPercent * 3) : 0}%`,
              fontStyle: 'normal',
            }}
          />
        </div>
      </div>

      {/* 2. GRID PRINCIPAL (AVALIAR HOJE + COLUNA LATERAL DE CONTROLE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* BLOCO ESQUERDA: AVALIAR HOJE (CONTAINER CINZA #ECEFF3) */}
        <div
          style={{
            background: '#ECEFF3',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0E1116',
                }}
              >
                Avaliar hoje · Clientes Recentes
              </div>
              <div style={{ fontSize: '14px', color: '#5B6674' }}>
                Serviços entregues nas últimas 24 horas
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendBatch}
              style={{
                height: '48px',
                padding: '0 22px',
                border: 0,
                borderRadius: '14px',
                background: '#C8F52E',
                color: '#0E1116',
                font: '700 15px Inter, sans-serif',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Enviar pelo WhatsApp
            </button>
          </div>

          {/* GRID COM 2 COLUNAS DE CLIENTES */}
          {pendingClients.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {pendingClients.map((c) => {
                const isSent = sentClients.includes(c.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#fff',
                      border: '1px solid #E1E6EC',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#5B6674',
                    }}
                  >
                    <div>
                      <b style={{ color: '#0E1116', fontSize: '15px', fontWeight: 600, display: 'block' }}>
                        {c.name}
                      </b>
                      {c.vehicle} · OS {c.osId}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendSingle(c)}
                      style={{
                        marginLeft: 'auto',
                        height: '40px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        border: '1px solid #0E1116',
                        background: isSent ? '#0E1116' : '#fff',
                        color: isSent ? '#C8F52E' : '#0E1116',
                        font: '600 14px Inter, sans-serif',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSent ? 'Enviado ✓' : 'Enviar'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '14px',
                padding: '20px',
                fontSize: '14px',
                color: '#5B6674',
                textAlign: 'center',
              }}
            >
              Nenhum cliente pendente de avaliação no momento. Assim que ordens de serviço forem concluídas, os clientes elegíveis aparecerão aqui.
            </div>
          )}

          {/* TABELA DE PROMOTORES & REPUTAÇÃO GOOGLE (T6.8) */}
          <div
            style={{
              marginTop: '10px',
              background: '#fff',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid #E1E6EC',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0E1116',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ⭐ Promotores para Avaliação no Google (Nota 9 e 10)
                </h4>
                <p style={{ fontSize: '12px', color: '#5B6674', margin: '2px 0 0' }}>
                  Clientes satisfeitos prontos para alavancar a nota da oficina no Google Maps
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  background: '#F1F4F9',
                  padding: '4px 10px',
                  borderRadius: '99px',
                  color: '#0E1116',
                }}
              >
                {reputation?.promotersCount ?? 0} promotores registrados
              </span>
            </div>

            {reputation?.topPromoters && reputation.topPromoters.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reputation.topPromoters.map((promoter) => (
                  <div
                    key={promoter.surveyId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: '#0E1116',
                            color: '#C8F52E',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '6px',
                          }}
                        >
                          Nota {promoter.score}
                        </span>
                        <b style={{ fontSize: '14px', color: '#0E1116' }}>{promoter.customerName}</b>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {promoter.vehicleModel || (promoter.osNumber ? `OS #${promoter.osNumber}` : 'Veículo do cliente')}
                      </span>
                    </div>

                    {/* Status de conversão no Google */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {promoter.googleReviewClicked ? (
                        <span
                          style={{
                            background: '#DCFCE7',
                            color: '#15803D',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          ✓ Clicou no Google
                        </span>
                      ) : promoter.googleReviewSentAt ? (
                        <span
                          style={{
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                          }}
                        >
                          Convite enviado ({promoter.googleReviewSentVia === 'automatic' ? 'Auto' : 'Manual'})
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Aguardando convite</span>
                      )}

                      <button
                        type="button"
                        disabled={sendingInviteId === promoter.surveyId}
                        onClick={() => handleSendGoogleInvite(promoter.surveyId, promoter.manualWhatsAppUrl)}
                        style={{
                          height: '34px',
                          padding: '0 12px',
                          borderRadius: '10px',
                          border: '1px solid #0E1116',
                          background: promoter.googleReviewClicked ? '#F1F5F9' : '#0E1116',
                          color: promoter.googleReviewClicked ? '#64748B' : '#C8F52E',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: promoter.googleReviewClicked ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sendingInviteId === promoter.surveyId
                          ? 'Enviando...'
                          : promoter.googleReviewClicked
                          ? 'Avaliado'
                          : promoter.googleReviewSentAt
                          ? 'Reenviar Link'
                          : 'Pedir 5⭐ no Whats'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                Nenhuma resposta de promotor (nota 9 ou 10) registrada ainda neste ciclo.
                Assim que clientes avaliarem com notas altas, eles aparecerão aqui para conversão de reputação no Google.
              </div>
            )}
          </div>
        </div>

        {/* BLOCO DIREITA: 3 CARDS LATERAIS COM O MOTOR DE REPUTAÇÃO GOOGLE (T6.8) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* CARD 1: ENVIO AUTOMÁTICO */}
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
            <span style={{ fontSize: '14px', color: '#5B6674', fontWeight: 500 }}>
              Envio automático de NPS
            </span>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                fontWeight: 600,
                color: '#0E1116',
              }}
            >
              24 h após a entrega
              <span
                onClick={() => setAutoSendEnabled(!autoSendEnabled)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '99px',
                  background: autoSendEnabled ? '#C8F52E' : '#E1E6EC',
                  display: 'block',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <i
                  style={{
                    position: 'absolute',
                    right: autoSendEnabled ? '3px' : '23px',
                    top: '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#0E1116',
                    display: 'block',
                    transition: 'right 0.2s',
                  }}
                />
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#5B6674', margin: 0, lineHeight: 1.4 }}>
              Dispara automaticamente pelo WhatsApp oficial para lojas no Plano Pro, ou gera link direto em 1 clique.
            </p>
          </div>

          {/* CARD 2: ATENÇÃO: DETRATOR */}
          {latestDetractor ? (
            <div
              style={{
                background: '#fff',
                border: '1px solid #E5484D',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ color: '#E5484D', fontWeight: 600, fontSize: '14px' }}>
                Atenção: detrator
              </span>
              <div style={{ fontSize: '15px', lineHeight: 1.4, color: '#0E1116' }}>
                <b style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700 }}>
                  Nota {latestDetractor.score} · {latestDetractor.customerName || 'Cliente'}
                </b>
                <br />
                <span style={{ color: '#5B6674' }}>
                  {latestDetractor.comment
                    ? `“${latestDetractor.comment}”`
                    : 'Entrar em contato para entender a insatisfação.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const rawPhone = String(latestDetractor.customerPhone || '').replace(/\D/g, '');
                  if (rawPhone) {
                    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                  } else {
                    toast.info('Contato registrado para acompanhamento.');
                  }
                }}
                style={{
                  height: '44px',
                  border: 0,
                  borderRadius: '12px',
                  background: '#0E1116',
                  color: '#fff',
                  font: '600 14px Inter, sans-serif',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Registrar contato
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ color: '#0E1116', fontWeight: 600, fontSize: '14px' }}>
                Sem detratores registrados
              </span>
              <p style={{ fontSize: '13px', color: '#5B6674', margin: 0, lineHeight: 1.45 }}>
                Nenhuma avaliação com nota baixa (0 a 6) foi registrada até o momento.
              </p>
            </div>
          )}

          {/* CARD 3: MOTOR DE REPUTAÇÃO NO GOOGLE MEU NEGÓCIO (T6.8) */}
          <div
            style={{
              background: '#0E1116',
              border: '1px solid #1B2129',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⭐</span>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#C8F52E',
                  }}
                >
                  Reputação no Google
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#1B2129',
                  color: '#9AA7B8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                Google Maps
              </span>
            </div>

            {/* Métrica de Conversão */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: '#151A21',
                borderRadius: '14px',
                padding: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#9AA7B8', display: 'block' }}>Cliques no Google</span>
                <b
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '22px',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {reputation?.googleReviewsClicked ?? 0}
                </b>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#9AA7B8', display: 'block' }}>Taxa de Conversão</span>
                <b
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '22px',
                    color: '#C8F52E',
                    fontWeight: 700,
                  }}
                >
                  {reputation?.conversionRatePercent ?? 0}%
                </b>
              </div>
            </div>

            {/* Link oficial configurado */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#9AA7B8', fontWeight: 600 }}>Link de Avaliação Google</span>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(!isEditingUrl)}
                  style={{
                    background: 'none',
                    border: 0,
                    color: '#C8F52E',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isEditingUrl ? 'Cancelar' : 'Alterar Link'}
                </button>
              </div>

              {isEditingUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="url"
                    value={reviewUrlInput}
                    onChange={(e) => setReviewUrlInput(e.target.value)}
                    placeholder="https://g.page/r/.../review"
                    style={{
                      width: '100%',
                      background: '#151A21',
                      border: '1px solid #2B3544',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    disabled={updateUrlMutation.isPending}
                    onClick={handleSaveReviewUrl}
                    style={{
                      height: '36px',
                      borderRadius: '10px',
                      border: 0,
                      background: '#C8F52E',
                      color: '#0E1116',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {updateUrlMutation.isPending ? 'Salvando...' : 'Salvar Novo Link'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#C2CBD6',
                    background: '#151A21',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    wordBreak: 'break-all',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reputation?.googleReviewUrl || reputation?.suggestedGoogleSearchUrl || 'Gerando link amigável...'}
                  </span>
                  {(reputation?.googleReviewUrl || reputation?.suggestedGoogleSearchUrl) && (
                    <a
                      href={reputation.googleReviewUrl || reputation.suggestedGoogleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#C8F52E',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Testar ↗
                    </a>
                  )}
                </div>
              )}

              {!reputation?.googleReviewUrl && !isEditingUrl && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#EAB308',
                    marginTop: '6px',
                    lineHeight: 1.3,
                  }}
                >
                  ⚠️ Usando busca automática no Maps. Para direcionar direto às 5 estrelas, cole o link curto oficial da sua ficha Google.
                </span>
              )}
            </div>

            {/* Explicação da Regra WhatsApp por Plano */}
            <div
              style={{
                fontSize: '11px',
                color: '#6B7A8C',
                lineHeight: 1.4,
                borderTop: '1px solid #1B2129',
                paddingTop: '8px',
              }}
            >
              🔒 <b>Regra do Sistema:</b> Lojas com Plano Pro usam disparo automatizado com número próprio. Lojas sem o gateway disparam em 1 clique via WhatsApp Web gratuito.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
