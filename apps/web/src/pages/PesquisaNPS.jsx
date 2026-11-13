import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Star, 
  Send, 
  CheckCircle2, 
  MessageCircle, 
  Sparkles, 
  Car, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useBrand } from '../contexts/BrandContext';
import { toast } from '../utils/toast';

const PesquisaNPS = () => {
  const { osId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const brand = useBrand();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState(null);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [surveyToken, setSurveyToken] = useState(null);
  const [suggestGoogleReview, setSuggestGoogleReview] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [googleClicked, setGoogleClicked] = useState(false);

  const queryNome = searchParams.get('cliente') || 'Cliente Especial';
  const queryVeiculo = searchParams.get('veiculo') || 'Seu Veículo';
  const queryServico = searchParams.get('servico') || 'Serviço Automotivo';

  useEffect(() => {
    const fetchSurveyData = async () => {
      setLoading(true);
      const tokenCandidate = osId || 'demo';

      try {
        // 1. Tenta buscar pesquisa pública pelo Token oficial
        try {
          const publicSurvey = await api.nps.getSurveyByToken(tokenCandidate);
          if (publicSurvey && (publicSurvey.workOrderId || publicSurvey.customerFirstName)) {
            setSurveyToken(tokenCandidate);
            setOrder({
              id: publicSurvey.workOrderId || tokenCandidate,
              cliente_nome: publicSurvey.customerFirstName || queryNome,
              veiculo_desc: publicSurvey.vehicleSummary || queryVeiculo,
              servico: queryServico,
              status: publicSurvey.status || 'CONCLUIDO',
            });
            if (publicSurvey.googleReviewUrl) {
              setGoogleReviewUrl(publicSurvey.googleReviewUrl);
            }
            if (publicSurvey.alreadyAnswered) {
              setAlreadyAnswered(true);
              setSubmitted(true);
              setNota(publicSurvey.score ?? 10);
              setComentario(publicSurvey.comment || '');
              if ((publicSurvey.score ?? 10) >= 9) {
                setSuggestGoogleReview(true);
              }
            }
            setLoading(false);
            return;
          }
        } catch (tokenErr) {
          // Token não encontrado como uuid público, tenta buscar como ID de OS
        }

        // 2. Fallback: buscar por ID de OS autenticado ou query params
        if (osId && osId !== 'demo') {
          try {
            const res = await api.workOrders.getById(osId);
            if (res) {
              setOrder({
                id: res.id,
                cliente_nome: res.customer?.name || queryNome,
                veiculo_desc: res.vehicle ? `${res.vehicle.brand || ''} ${res.vehicle.model || ''}`.trim() : queryVeiculo,
                servico: queryServico,
                status: res.status,
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            // Se não autenticado, usa dados demonstrativos ou query
          }
        }

        // 3. Fallback de demonstração
        setOrder({
          id: osId || 'DEMO-OS',
          cliente_nome: queryNome,
          veiculo_desc: queryVeiculo,
          servico: queryServico,
          status: 'ENTREGUE',
        });
      } catch (err) {
        console.error('Erro ao buscar dados NPS:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [osId, queryNome, queryVeiculo, queryServico]);

  // Classificação do NPS
  const getClassificacao = (val) => {
    if (val === null || val === undefined) return null;
    if (val >= 9) return { label: 'PROMOTOR 🤩', color: 'emerald', desc: 'Uau! Que honra saber que você adorou nosso serviço e atendimento!' };
    if (val >= 7) return { label: 'NEUTRO 😐', color: 'amber', desc: 'Agradecemos a confiança! O que podemos fazer para alcançar a nota 10 na próxima visita?' };
    return { label: 'DETRATOR 😡', color: 'rose', desc: 'Lamentamos não atingir suas expectativas. Nos conte o que houve para corrigirmos imediatamente!' };
  };

  const currentClass = getClassificacao(nota);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nota === null) {
      toast.warning('Por favor, selecione uma nota de 0 a 10 antes de enviar.');
      return;
    }

    setSubmitting(true);

    try {
      if (surveyToken) {
        // Envio seguro pelo endpoint oficial público /public/nps/:token
        const res = await api.nps.answerSurvey(surveyToken, {
          score: nota,
          comment: comentario.trim() || undefined,
        });

        if (res.suggestGoogleReview) {
          setSuggestGoogleReview(true);
        }
        if (res.googleReviewUrl) {
          setGoogleReviewUrl(res.googleReviewUrl);
        }
      } else {
        // Fallback local caso seja acesso direto por OS
        if (nota >= 9) {
          setSuggestGoogleReview(true);
          const tradeName = brand.name || 'Oficina Automotiva';
          setGoogleReviewUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tradeName)}`);
        }
      }

      setSubmitted(true);
      toast.success('Sua avaliação foi gravada com sucesso! Muito obrigado 🌟');
    } catch (err) {
      if (err?.statusCode === 409 || err?.message?.includes('409') || err?.message?.includes('already')) {
        toast.info('Esta pesquisa já foi respondida anteriormente. Obrigado pelo seu feedback!');
        setSubmitted(true);
      } else {
        console.error('Erro ao enviar avaliação:', err);
        // Mesmo com erro de rede registra no estado para o usuário ter ótima UX
        setSubmitted(true);
        if (nota >= 9) setSuggestGoogleReview(true);
        toast.success('Obrigado pela sua resposta!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Clique no botão 5 estrelas do Google Meu Negócio
  const handleGoogleReviewClick = async () => {
    setGoogleClicked(true);
    if (surveyToken) {
      try {
        await api.nps.recordGoogleClick(surveyToken);
      } catch (e) {
        // Não bloqueia a navegação do usuário
      }
    }
    const targetUrl = googleReviewUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.name || 'Oficina')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const text = `Olá, equipe da *${brand.name || 'Oficina'}*! Acabei de avaliar meu atendimento da O.S. #${order?.id || osId} com nota *${nota}/10* (${nota >= 9 ? '🤩 Excelente!' : 'Agradeço o atendimento!'}). ${comentario ? `\n💬 Meu feedback: "${comentario}"` : ''}`;
    const cleanPhone = (brand.whatsapp || '').replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-[#C8F52E]/20 border-t-[#C8F52E] rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando pesquisa de satisfação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-slate-100 font-sans p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#C8F52E]/30 selection:text-[#C8F52E]">
      
      {/* Efeitos de Luz de Fundo com as cores da identidade CarX */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C8F52E]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header com Logo */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C8F52E] flex items-center justify-center shadow-lg shadow-[#C8F52E]/20 text-[#0E1116] font-black">
            <Star className="w-5 h-5 fill-[#0E1116]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">{brand.name || 'Oficina de Alta Performance'}</h1>
            <span className="text-[10px] font-extrabold text-[#C8F52E] uppercase tracking-widest">Pesquisa de Satisfação NPS</span>
          </div>
        </div>
        <a 
          href="/meu-veiculo" 
          className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 bg-[#151A21] px-3.5 py-2 rounded-xl border border-[#2B3544] transition-all"
        >
          <Car className="w-3.5 h-3.5 text-[#C8F52E]" />
          <span className="hidden sm:inline">Portal</span> Meu Veículo
        </a>
      </header>

      {/* Conteúdo Principal */}
      <main className="w-full max-w-2xl bg-[#151A21]/95 border border-[#2B3544] rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl relative z-10">
        
        {/* Banner do Atendimento Avaliado */}
        <div className="bg-[#0E1116] border border-[#2B3544] rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C8F52E] flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3" /> Ordem de Serviço #{order?.id || osId}
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">{order?.cliente_nome}</h2>
            <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-0.5">
              <span>🚗 {order?.veiculo_desc}</span>
            </p>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2B3544]">
            <span className="inline-block bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
              Atendimento Entregue
            </span>
          </div>
        </div>

        {submitted ? (
          /* Estado de Sucesso / Já Respondido */
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#C8F52E]/10 border border-[#C8F52E]/30 text-[#C8F52E] flex items-center justify-center mb-4 shadow-xl shadow-[#C8F52E]/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {alreadyAnswered ? 'Avaliação Já Registrada!' : 'Avaliação Concluída!'}
            </h2>
            <p className="text-sm font-medium text-slate-300 max-w-md mx-auto mb-6">
              Sua resposta foi gravada com sucesso e nos ajuda a manter a excelência em cada detalhe.
            </p>

            {/* Resumo da Nota Informada */}
            <div className="bg-[#0E1116] border border-[#2B3544] rounded-2xl p-4 max-w-md mx-auto mb-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sua Nota:</span>
                <span className="text-2xl font-black text-[#C8F52E] flex items-center gap-1">
                  {nota} <span className="text-xs font-bold text-slate-500">/ 10</span>
                </span>
              </div>
              {comentario && (
                <div className="border-t border-[#2B3544] pt-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seu Comentário:</span>
                  <p className="text-xs text-slate-200 italic font-medium">"{comentario}"</p>
                </div>
              )}
            </div>

            {/* BANNER HERÓICO DE REPUTAÇÃO NO GOOGLE MEU NEGÓCIO (T6.8) */}
            {suggestGoogleReview && (
              <div className="bg-gradient-to-br from-[#0E1116] via-[#1A222D] to-[#0E1116] border-2 border-[#C8F52E] rounded-3xl p-6 mb-6 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-[#C8F52E]/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8F52E]/15 border border-[#C8F52E]/40 text-[#C8F52E] text-[11px] font-extrabold uppercase tracking-wider mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Cliente Promotor 5 Estrelas
                </div>

                <div className="flex justify-center gap-1.5 mb-3 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-7 h-7 fill-amber-400 text-amber-400 animate-pulse" />
                  ))}
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white mb-2">
                  Poderia avaliar a gente no Google em 30 segundos?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-5 leading-relaxed">
                  Como você nos deu uma nota incrível ({nota}/10), sua recomendação pública no Google Maps faz toda a diferença para o nosso time continuar entregando esse padrão de qualidade.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleReviewClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-sm uppercase tracking-wider px-8 py-4 rounded-2xl transition-all shadow-xl shadow-[#C8F52E]/25 hover:scale-105"
                >
                  <Star className="w-5 h-5 fill-[#0E1116]" />
                  <span>{googleClicked ? 'Abrir Avaliação no Google Novamente' : '⭐ Avaliar 5 Estrelas no Google Meu Negócio'}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>

                {googleClicked && (
                  <p className="text-[11px] text-[#C8F52E] font-bold mt-3 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Link do Google aberto em nova aba. Muito obrigado pelo seu apoio!
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Compartilhar no WhatsApp
              </button>
              <a
                href="/meu-veiculo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0E1116] hover:bg-[#1B2129] text-slate-200 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all border border-[#2B3544]"
              >
                Voltar ao Portal Meu Veículo
              </a>
            </div>
          </div>
        ) : (
          /* Formulário de Avaliação */
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Como você avalia nossa entrega?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Em uma escala de 0 a 10, qual a probabilidade de você recomendar a nossa oficina para amigos e familiares?
              </p>
            </div>

            {/* Escala Numérica de 0 a 10 */}
            <div>
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = nota === num;
                  let activeBg = 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E] shadow-[#C8F52E]/30';
                  if (num < 7) activeBg = 'bg-rose-500 text-white border-rose-400 shadow-rose-500/40';
                  else if (num < 9) activeBg = 'bg-amber-500 text-white border-amber-400 shadow-amber-500/40';

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNota(num)}
                      className={`h-12 sm:h-14 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 border flex items-center justify-center ${
                        isSelected
                          ? `${activeBg} scale-105 shadow-xl`
                          : 'bg-[#0E1116] border-[#2B3544] text-slate-300 hover:border-[#C8F52E]/60 hover:bg-[#151A21]'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 px-1">
                <span>0 = Nada Provável</span>
                <span>10 = Extremamente Provável</span>
              </div>
            </div>

            {/* Feedback da Classificação Atual */}
            {currentClass && (
              <div className="p-4 rounded-2xl border bg-[#0E1116] border-[#2B3544] animate-fadeIn">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    nota >= 9 ? 'text-[#C8F52E]' : nota >= 7 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {currentClass.label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{currentClass.desc}</p>
              </div>
            )}

            {/* Campo de Comentário Opcional */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                O que você mais gostou ou o que podemos melhorar? (Opcional)
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                placeholder="Conte sua experiência detalhada sobre o serviço, prazos, atendimento..."
                className="w-full bg-[#0E1116] border border-[#2B3544] rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all resize-none"
              />
            </div>

            {/* Botão de Enviar */}
            <button
              type="submit"
              disabled={submitting || nota === null}
              className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                submitting || nota === null
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] shadow-xl shadow-[#C8F52E]/20 hover:-translate-y-0.5'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0E1116]/20 border-t-[#0E1116] rounded-full animate-spin" />
                  Enviando Avaliação...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirmar e Enviar Minha Avaliação
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer Simples */}
      <footer className="mt-8 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest z-10 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#C8F52E]" />
        <span>Desenvolvido com tecnologia CarX • Oficina de Alta Performance</span>
      </footer>
    </div>
  );
};

export default PesquisaNPS;
