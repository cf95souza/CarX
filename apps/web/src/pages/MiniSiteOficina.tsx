import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  ShieldCheck,
  Award,
  CheckCircle2,
  Send,
  Sparkles,
  Car,
  Calendar,
  ExternalLink,
  ChevronRight,
  Flame,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/api';
import type { PublicMiniSiteResponseDto, CreateMiniSiteLeadInputDto } from '@carx/shared';
import { toast } from '../utils/toast';

export const MiniSiteOficina: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Permite obter o slug tanto pela URL /loja/:slug quanto por subdomínio ou query ?loja=:slug
  const activeSlug = slug || searchParams.get('loja') || searchParams.get('slug') || 'demo';

  const [selectedService, setSelectedService] = useState<string>('');
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    vehicleModel: '',
    message: '',
  });
  const [submittedLead, setSubmittedLead] = useState<{ id: string; whatsappUrl: string } | null>(null);
  const [activePortfolioTab, setActivePortfolioTab] = useState<string>('todos');
  const [viewingBeforeMap, setViewingBeforeMap] = useState<Record<string, boolean>>({});

  // Consulta de dados públicos do mini-site
  const { data: siteData, isLoading, error } = useQuery<PublicMiniSiteResponseDto>({
    queryKey: ['public-minisite', activeSlug],
    queryFn: () => api.minisite.getPublicData(activeSlug),
    enabled: !!activeSlug && activeSlug !== 'demo',
    retry: 1,
  });

  // Mutação para envio de lead/orçamento
  const leadMutation = useMutation({
    mutationFn: (data: CreateMiniSiteLeadInputDto) => api.minisite.createLead(activeSlug, data),
    onSuccess: (res) => {
      setSubmittedLead({ id: res.id, whatsappUrl: res.whatsappUrl });
      toast.success('Solicitação de orçamento enviada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao enviar solicitação. Tente novamente ou use nosso WhatsApp.');
    },
  });

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.warning('Por favor, informe seu nome e WhatsApp.');
      return;
    }

    leadMutation.mutate({
      name: leadForm.name.trim(),
      phone: leadForm.phone.trim(),
      vehicleModel: leadForm.vehicleModel.trim() || undefined,
      serviceInterest: selectedService || undefined,
      message: leadForm.message.trim() || undefined,
    });
  };

  const handleToggleBeforeAfter = (itemId: string) => {
    setViewingBeforeMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Fallback para visualização de demonstração ou enquanto carrega
  const tenant = siteData?.tenant || {
    id: 'demo-tenant',
    name: 'CarX Detail Studio',
    slug: activeSlug,
    logoUrl: null,
    coverUrl: null,
    primaryColor: '#C8F52E',
    secondaryColor: '#0E1116',
    whatsappPhone: '11999998888',
    phone: '11999998888',
    instagram: 'carxdetail',
    facebook: null,
    headline: 'Centro Especializado em Estética e Proteção Automotiva de Alta Performance',
    about: 'Referência em tratamento automotivo, estética de precisão e aplicação de películas regenerativas (PPF). Atendimento exclusivo com técnicos certificados e ambiente climatizado.',
    address: 'Av. das Américas, 4500 - Barra da Tijuca, Rio de Janeiro - RJ',
    businessHours: {
      segunda_sexta: '08:00 às 18:30',
      sabado: '08:00 às 13:00',
      domingo: 'Fechado',
    },
    features: [
      'Garantia Certificada com QR Code',
      'Películas Originais com Lote Auditado',
      'Profissionais Treinados em Detailing',
      'Sala VIP Climatizada com Wi-Fi & Café',
    ],
    googleReviewUrl: 'https://maps.google.com',
  };

  const services = siteData?.services || [
    {
      id: '1',
      name: 'PPF Frontal Completo (Paint Protection Film)',
      description: 'Proteção extrema anti-impacto de pedras e arranhões com tecnologia auto-regenerativa.',
      category: 'PPF',
      estimatedMinutes: 360,
      startingPriceCents: 650000,
    },
    {
      id: '2',
      name: 'Polimento Técnico & Vitrificação Cerâmica 9H',
      description: 'Correção cirúrgica de verniz, eliminação de hologramas e proteção cerâmica hidrofóbica.',
      category: 'Vitrificação',
      estimatedMinutes: 240,
      startingPriceCents: 240000,
    },
    {
      id: '3',
      name: 'Insulfilm Alta Performance Térmica (Cerâmica)',
      description: 'Redução térmica de até 95% do calor infravermelho e bloqueio total dos raios UV.',
      category: 'Insulfilm',
      estimatedMinutes: 120,
      startingPriceCents: 98000,
    },
    {
      id: '4',
      name: 'Higienização Interna Detalhada & Oxi-Sanitização',
      description: 'Limpeza minuciosa de couro, alcantara e carpetes com eliminação total de odores e bactérias.',
      category: 'Higienização',
      estimatedMinutes: 180,
      startingPriceCents: 65000,
    },
  ];

  const portfolio = siteData?.portfolio || [
    {
      id: 'p1',
      tenantId: tenant.id,
      title: 'PPF Frontal & Vitrificação Cerâmica - Porsche 911 GT3',
      category: 'PPF',
      beforeImageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
      description: 'Aplicação integral de película regenerativa no pacote frontal com acabamento invisível.',
      isFeatured: true,
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'p2',
      tenantId: tenant.id,
      title: 'Polimento de Correção & Vitrificação 5 Anos - BMW M3 Competition',
      category: 'Vitrificação',
      beforeImageUrl: null,
      afterImageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
      description: 'Recuperação de brilho profundo e blindagem cerâmica 9H com garantia oficial.',
      isFeatured: true,
      displayOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'p3',
      tenantId: tenant.id,
      title: 'Proteção Térmica Nano Cerâmica - Audi RS6 Avant',
      category: 'Insulfilm',
      beforeImageUrl: null,
      afterImageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
      description: 'Aplicação de película de cerâmica escura com transparência ótica cristalina por dentro.',
      isFeatured: false,
      displayOrder: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const reputation = siteData?.reputation || {
    npsScore: 94,
    totalReviews: 68,
    averageStars: 4.9,
    testimonials: [
      {
        customerName: 'Fernando A.',
        vehicleModel: 'Porsche Macan GTS',
        score: 10,
        comment: 'Serviço surreal! O PPF ficou imperceptível e o acabamento dos cantos foi milimétrico. Vale cada centavo.',
        date: 'Ontem',
      },
      {
        customerName: 'Marcelo C.',
        vehicleModel: 'BMW 330i M Sport',
        score: 10,
        comment: 'Minha terceira vez trazendo carro aqui. A equipe é super atenciosa e a vitrificação deixou o carro com brilho espelhado incrível.',
        date: 'Há 3 dias',
      },
    ],
  };

  const categories = ['todos', ...Array.from(new Set(portfolio.map((p) => p.category)))];
  const filteredPortfolio =
    activePortfolioTab === 'todos'
      ? portfolio
      : portfolio.filter((p) => p.category.toLowerCase() === activePortfolioTab.toLowerCase());

  const cleanWhatsapp = (tenant.whatsappPhone || tenant.phone || '').replace(/\D/g, '');
  const directWhatsappUrl = cleanWhatsapp
    ? `https://wa.me/55${cleanWhatsapp.replace(/^55/, '')}?text=${encodeURIComponent(`Olá, equipe da *${tenant.name}*! Vi seu mini-site e gostaria de tirar algumas dúvidas sobre orçamentos.`)}`
    : '#';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-14 h-14 border-4 border-[#C8F52E]/20 border-t-[#C8F52E] rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando oficina oficial...</p>
      </div>
    );
  }

  if (error && activeSlug !== 'demo') {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mb-4">
          <Car className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black mb-2">Oficina Não Encontrada</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          O endereço ou identificador da oficina informado não foi localizado ou o site está temporariamente desativado.
        </p>
        <a
          href="/portal"
          className="bg-[#C8F52E] text-[#0E1116] font-black text-xs uppercase px-6 py-3 rounded-xl tracking-wider"
        >
          Acessar Portal do Cliente
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-slate-100 font-sans selection:bg-[#C8F52E]/30 selection:text-[#C8F52E] relative overflow-x-hidden">
      
      {/* 1. TOPBAR DE ATENDIMENTO */}
      <div className="bg-[#151A21] border-b border-[#2B3544] py-2 px-4 text-xs font-medium text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-[#C8F52E]" />
              <span className="truncate max-w-xs sm:max-w-md">{tenant.address}</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C8F52E]" />
              <span>Seg–Sex: {tenant.businessHours?.segunda_sexta || '08:00 - 18:00'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <a
              href={`/agendar?loja=${tenant.slug}`}
              className="text-[#C8F52E] font-bold hover:underline flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" /> Auto-Agendamento
            </a>
            <span className="text-slate-600">|</span>
            <a href="/portal" className="text-slate-300 hover:text-white flex items-center gap-1">
              <Car className="w-3 h-3 text-[#C8F52E]" /> Portal Meu Veículo
            </a>
          </div>
        </div>
      </div>

      {/* 2. NAVBAR PRINCIPAL */}
      <header className="sticky top-0 z-30 bg-[#0E1116]/90 backdrop-blur-xl border-b border-[#2B3544]/60 py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-auto rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#C8F52E] flex items-center justify-center font-black text-[#0E1116] text-base shadow-lg shadow-[#C8F52E]/20">
                CX
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                {tenant.name}
                <span title="Oficina Certificada CarX" className="inline-flex text-[#C8F52E]">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Estética & Proteção Automotiva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#orcamento"
              className="hidden sm:inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 border border-slate-700 hover:border-slate-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all"
            >
              Simular Orçamento
            </a>
            <a
              href={directWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-[#C8F52E]/20 hover:scale-105"
            >
              <MessageCircle className="w-4 h-4 fill-[#0E1116]" />
              <span className="hidden xs:inline">WhatsApp Oficial</span>
              <span className="xs:hidden">Whats</span>
            </a>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION DE ALTO IMPACTO */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 md:px-10 overflow-hidden border-b border-[#2B3544]">
        {/* Luzes dinâmicas de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[#C8F52E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151A21] border border-[#2B3544] text-[#C8F52E] text-xs font-black uppercase tracking-wider mb-6 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Padrão de Concessionária & Proteção de Pintura</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            {tenant.headline}
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            {tenant.about}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
            <a
              href="#orcamento"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-sm uppercase tracking-wider px-8 py-4 rounded-2xl transition-all shadow-xl shadow-[#C8F52E]/25 hover:-translate-y-0.5"
            >
              <span>Solicitar Orçamento Grátis</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#portfolio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#151A21] hover:bg-[#1E2530] text-slate-200 font-bold text-sm uppercase tracking-wider px-7 py-4 rounded-2xl border border-[#2B3544] transition-all"
            >
              <ImageIcon className="w-4 h-4 text-[#C8F52E]" />
              <span>Ver Portfólio de Trabalhos</span>
            </a>
          </div>

          {/* Destaques em Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            {tenant.features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-[#151A21]/90 border border-[#2B3544] rounded-2xl p-3.5 flex items-start gap-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C8F52E] shrink-0 mt-0.5" />
                <span className="text-xs font-bold text-slate-200 leading-snug">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BANNER DE REPUTAÇÃO E PROVA SOCIAL (NPS & GOOGLE REVIEWS) */}
      <section className="py-8 bg-[#151A21] border-b border-[#2B3544] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6 justify-center md:justify-start">
            <div className="flex items-center gap-3 bg-[#0E1116] px-4 py-3 rounded-2xl border border-[#2B3544]">
              <div className="text-3xl font-black text-[#C8F52E] font-display leading-none">
                {reputation.npsScore}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white uppercase tracking-wider">Score NPS</div>
                <div className="text-[10px] text-slate-400 font-bold">Zona de Excelência</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#0E1116] px-4 py-3 rounded-2xl border border-[#2B3544]">
              <div className="flex text-amber-400 gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white">{reputation.averageStars} / 5.0</div>
                <div className="text-[10px] text-slate-400 font-bold">{reputation.totalReviews} avaliações reais</div>
              </div>
            </div>
          </div>

          {tenant.googleReviewUrl && (
            <a
              href={tenant.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-[#0E1116] hover:bg-[#1A222D] px-4 py-2.5 rounded-xl border border-[#2B3544] transition-all"
            >
              <span>Ver ficha oficial no Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C8F52E]" />
            </a>
          )}
        </div>
      </section>

      {/* 5. CATÁLOGO DE SERVIÇOS EM DESTAQUE */}
      <section id="servicos" className="py-16 px-4 sm:px-6 md:px-10 border-b border-[#2B3544]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#C8F52E]">
              O que fazemos de melhor
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 mb-3">
              Serviços Especializados de Alta Performance
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Cada etapa é executada com ferramental importado, técnicas de detalhamento avançado e laudo de entrega auditado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="bg-[#151A21] border border-[#2B3544] hover:border-[#C8F52E]/60 rounded-3xl p-6 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#0E1116] border border-[#2B3544] text-[#C8F52E]">
                      {srv.category}
                    </span>
                    {srv.estimatedMinutes && (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        ~{Math.round(srv.estimatedMinutes / 60)} h
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg sm:text-xl font-black text-white mb-2 group-hover:text-[#C8F52E] transition-colors">
                    {srv.name}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {srv.description || 'Execução técnica de precisão com garantia estendida e materiais de primeira linha.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#2B3544]/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Investimento</span>
                    <span className="text-base font-black text-white">
                      A partir de R$ {(srv.startingPriceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <a
                    href="#orcamento"
                    onClick={() => setSelectedService(srv.name)}
                    className="inline-flex items-center gap-1.5 bg-[#0E1116] group-hover:bg-[#C8F52E] group-hover:text-[#0E1116] text-[#C8F52E] text-xs font-black uppercase px-4 py-2.5 rounded-xl border border-[#2B3544] transition-all"
                  >
                    <span>Quero Este</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PORTFÓLIO DE TRABALHOS (FOTOS ANTES & DEPOIS) */}
      <section id="portfolio" className="py-16 px-4 sm:px-6 md:px-10 border-b border-[#2B3544] bg-[#0E1116]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#C8F52E]">
                Galeria Real
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
                Portfólio de Trabalhos Recentes
              </h3>
            </div>

            {/* Filtro de Categorias */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActivePortfolioTab(cat)}
                  className={`text-xs font-black uppercase px-3.5 py-2 rounded-xl transition-all border ${
                    activePortfolioTab.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E]'
                      : 'bg-[#151A21] text-slate-300 border-[#2B3544] hover:border-slate-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredPortfolio.map((item) => {
              const isViewingBefore = viewingBeforeMap[item.id] || false;
              const currentImg = isViewingBefore && item.beforeImageUrl ? item.beforeImageUrl : item.afterImageUrl;

              return (
                <div
                  key={item.id}
                  className="bg-[#151A21] border border-[#2B3544] rounded-3xl overflow-hidden flex flex-col group shadow-lg"
                >
                  {/* Container da Imagem com Toggle Antes/Depois */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={currentImg}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Badge de Categoria */}
                    <div className="absolute top-3 left-3 bg-[#0E1116]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#2B3544] text-[10px] font-black text-[#C8F52E] uppercase">
                      {item.category}
                    </div>

                    {/* Se tiver imagem antes, botão de alternância Antes/Depois */}
                    {item.beforeImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleToggleBeforeAfter(item.id)}
                        className="absolute bottom-3 right-3 bg-[#0E1116]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2B3544] text-[11px] font-black text-white hover:text-[#C8F52E] transition-all flex items-center gap-1.5 shadow-lg"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{isViewingBefore ? 'Ver Depois ➔' : 'Ver Antes ↺'}</span>
                      </button>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-black text-white mb-2 leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description || 'Trabalho de detalhamento e acabamento realizado com padrão técnico CarX.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2B3544] flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>✓ Entrega Concluída</span>
                      <a
                        href="#orcamento"
                        onClick={() => setSelectedService(item.category)}
                        className="text-[#C8F52E] hover:underline"
                      >
                        Orçar semelhante ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. DEPOIMENTOS DE PROMOTORES REAIS */}
      <section className="py-16 px-4 sm:px-6 md:px-10 border-b border-[#2B3544] bg-[#151A21]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#C8F52E]">
              O que dizem os clientes
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 mb-2">
              Avaliações Reais de Promotores
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Coletadas através de pesquisas oficiais NPS após a entrega das ordens de serviço.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reputation.testimonials.map((testim, idx) => (
              <div
                key={idx}
                className="bg-[#0E1116] border border-[#2B3544] rounded-3xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex text-amber-400 gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{testim.date}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 italic font-medium leading-relaxed mb-4">
                    "{testim.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[#2B3544]">
                  <div className="w-8 h-8 rounded-full bg-[#151A21] text-[#C8F52E] font-black text-xs flex items-center justify-center border border-[#2B3544]">
                    {testim.customerName.charAt(0)}
                  </div>
                  <div>
                    <b className="text-xs font-black text-white block">{testim.customerName}</b>
                    {testim.vehicleModel && (
                      <span className="text-[10px] font-bold text-slate-400">🚗 {testim.vehicleModel}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FORMULÁRIO DE CAPTAÇÃO DE ORÇAMENTO / LEAD */}
      <section id="orcamento" className="py-20 px-4 sm:px-6 md:px-10 border-b border-[#2B3544]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#151A21] border border-[#2B3544] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8F52E]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center max-w-xl mx-auto mb-8 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#C8F52E] flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Sem Compromisso
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Solicite uma Proposta Sob Medida
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Preencha seus dados para que nossa equipe técnica calcule os tempos e valores ideais para o seu veículo.
              </p>
            </div>

            {submittedLead ? (
              <div className="text-center py-8 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-[#C8F52E]/10 border border-[#C8F52E]/30 text-[#C8F52E] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white mb-2">Solicitação Recebida com Sucesso!</h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6">
                  Nosso consultor técnico já recebeu sua mensagem e entrará em contato em breve. Se preferir agilidade imediata, clique no botão abaixo:
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <a
                    href={submittedLead.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir Conversa no WhatsApp Agora
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedLead(null);
                      setLeadForm({ name: '', phone: '', vehicleModel: '', message: '' });
                    }}
                    className="text-xs text-slate-400 hover:text-white font-bold underline"
                  >
                    Fazer outra solicitação
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                      placeholder="Ex: Carlos Oliveira"
                      className="w-full bg-[#0E1116] border border-[#2B3544] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C8F52E] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      WhatsApp para Contato *
                    </label>
                    <input
                      type="tel"
                      required
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#0E1116] border border-[#2B3544] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C8F52E] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Modelo e Ano do Veículo
                    </label>
                    <input
                      type="text"
                      value={leadForm.vehicleModel}
                      onChange={(e) => setLeadForm({ ...leadForm, vehicleModel: e.target.value })}
                      placeholder="Ex: BMW 320i M Sport 2023"
                      className="w-full bg-[#0E1116] border border-[#2B3544] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C8F52E] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Serviço de Maior Interesse
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full bg-[#0E1116] border border-[#2B3544] rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-all"
                    >
                      <option value="">Selecione um serviço (Opcional)</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Detalhes ou Dúvidas Adicionais
                  </label>
                  <textarea
                    rows={3}
                    value={leadForm.message}
                    onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                    placeholder="Conte para nós se o carro possui repelência prévia, avarias que deseja corrigir ou prazo desejado..."
                    className="w-full bg-[#0E1116] border border-[#2B3544] rounded-xl p-4 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C8F52E] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={leadMutation.isPending}
                  className="w-full py-4 rounded-xl bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-[#C8F52E]/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {leadMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0E1116]/20 border-t-[#0E1116] rounded-full animate-spin" />
                      Enviando Solicitação...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Receber Orçamento Detalhado
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 9. RODAPÉ INSTITUCIONAL */}
      <footer className="bg-[#090C10] border-t border-[#1B2129] py-12 px-4 sm:px-6 md:px-10 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-display font-extrabold text-white text-base">
                {tenant.name}
              </span>
              <span className="text-[10px] bg-[#151A21] text-[#C8F52E] px-2 py-0.5 rounded font-black">
                OFICIAL
              </span>
            </div>
            <p className="max-w-sm text-slate-400 leading-relaxed mb-4">
              Atendimento com hora marcada para garantir dedicação exclusiva a cada veículo.
            </p>
            <div className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <b className="text-white block uppercase tracking-wider mb-2 font-black text-xs">Atendimento</b>
              <p className="text-slate-400 mb-1">Segunda a Sexta: {tenant.businessHours?.segunda_sexta}</p>
              <p className="text-slate-400 mb-1">Sábado: {tenant.businessHours?.sabado}</p>
              <p className="text-slate-400">Domingo: {tenant.businessHours?.domingo}</p>
            </div>

            <div>
              <b className="text-white block uppercase tracking-wider mb-2 font-black text-xs">Localização</b>
              <p className="text-slate-400 mb-2 leading-relaxed">{tenant.address}</p>
              {tenant.googleReviewUrl && (
                <a
                  href={tenant.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C8F52E] hover:underline font-bold flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" /> Como Chegar no Maps
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8F52E]" />
          <span>Plataforma e Mini-Site Oficial desenvolvidos com Tecnologia CarX</span>
        </div>
      </footer>
    </div>
  );
};

export default MiniSiteOficina;

