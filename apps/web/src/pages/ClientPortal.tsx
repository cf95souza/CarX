import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  LogOut,
  Phone,
  Search,
  Sparkles,
  Calendar,
  ArrowRight,
  Eye,
  X,
  Check,
  RefreshCw,
  Wrench,
  ScrollText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  FileText,
  Smartphone,
  Hash,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  api,
  getStoredPortalToken,
  getStoredPortalCustomer,
  setStoredPortalToken,
  setStoredPortalCustomer,
  clearStoredPortalAuth,
  setStoredTenantSlug,
} from '../services/api';
import type {
  PortalCustomerDto,
  PortalVehicleDto,
  PortalWorkOrderListItemDto,
  PortalWorkOrderDetailDto,
  PortalWorkOrderTimelineEventDto,
  PortalPhotoDto,
  PortalWarrantyDto,
} from '@carx/shared';
import { useBrand } from '../contexts/BrandContext';
import { toast } from '../utils/toast';
import { Badge } from '@carx/ui';
import CertificadoGarantia from '../components/features/CertificadoGarantia';
import ReciboOS from '../components/features/ReciboOS';
import CalendarSyncModal from '../components/ui/CalendarSyncModal';

export const ClientPortal: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const brand = useBrand();
  const queryClient = useQueryClient();

  if (slug && typeof window !== 'undefined') {
    setStoredTenantSlug(slug);
  }

  useEffect(() => {
    if (slug) {
      setStoredTenantSlug(slug);
      api.branding.get(slug).catch(() => {});
    }
  }, [slug]);

  // ============================================================================
  // ESTADO DE AUTENTICAÇÃO DO PORTAL (ISOLADO DA EQUIPE DA LOJA)
  // ============================================================================
  const [token, setToken] = useState<string | null>(() => getStoredPortalToken());
  const [customer, setCustomer] = useState<PortalCustomerDto | null>(() => getStoredPortalCustomer());

  // Form states do Login OTP
  const [step, setStep] = useState<'identifier' | 'code'>('identifier');
  const [identifierInput, setIdentifierInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [devOtpSuggestion, setDevOtpSuggestion] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  // Filtros e Seleções
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [expandedOsId, setExpandedOsId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Modais de Documentos e Calendário
  const [activeOsForCert, setActiveOsForCert] = useState<any | null>(null);
  const [activeOsForRecibo, setActiveOsForRecibo] = useState<any | null>(null);
  const [activeOsForSync, setActiveOsForSync] = useState<any | null>(null);

  // Escuta expiração do token do portal
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setCustomer(null);
      setStep('identifier');
      toast.warning('Sua sessão no portal expirou. Solicite um novo código de acesso.');
    };
    window.addEventListener('carx:portal-auth-expired', handleExpired);
    return () => window.removeEventListener('carx:portal-auth-expired', handleExpired);
  }, []);

  // Temporizador de reenvio do OTP
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const interval = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendSeconds]);

  // Formatação de máscara do telefone
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.includes('@')) {
      setIdentifierInput(raw);
      return;
    }
    let digits = raw.replace(/\D/g, '');
    if (digits.length > 11) digits = digits.slice(0, 11);
    if (digits.length > 6) {
      setIdentifierInput(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
    } else if (digits.length > 2) {
      setIdentifierInput(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setIdentifierInput(digits);
    }
  };

  // ============================================================================
  // MUTAÇÕES DE LOGIN OTP
  // ============================================================================
  const requestOtpMutation = useMutation({
    mutationFn: (identifier: string) => api.portal.requestOtp({ identifier }),
    onSuccess: (data) => {
      toast.success('Código de 6 dígitos gerado com sucesso!');
      setStep('code');
      setResendSeconds(60);
      if (data.devOtpCode) {
        setDevOtpSuggestion(data.devOtpCode);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao solicitar código de acesso.');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (variables: { identifier: string; code: string }) =>
      api.portal.verifyOtp(variables),
    onSuccess: (auth) => {
      setToken(auth.token);
      setCustomer(auth.customer);
      toast.success(`Bem-vindo, ${auth.customer.name}! 🚗`);
      queryClient.invalidateQueries({ queryKey: ['portal'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Código de confirmação incorreto ou expirado.');
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = identifierInput.trim();
    if (!clean) {
      toast.warning('Informe seu WhatsApp ou e-mail cadastrado na oficina.');
      return;
    }
    requestOtpMutation.mutate(clean);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeInput.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      toast.warning('O código de confirmação deve ter exatamente 6 dígitos numéricos.');
      return;
    }
    verifyOtpMutation.mutate({ identifier: identifierInput.trim(), code: cleanCode });
  };

  const handleLogout = () => {
    api.portal.logout();
    setToken(null);
    setCustomer(null);
    setStep('identifier');
    setIdentifierInput('');
    setCodeInput('');
    setDevOtpSuggestion(null);
    queryClient.removeQueries({ queryKey: ['portal'] });
    toast.info('Sessão encerrada com segurança.');
  };

  // ============================================================================
  // CONSULTAS AUTENTICADAS DO PORTAL
  // ============================================================================
  const { data: vehiclesData, isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ['portal', 'vehicles'],
    queryFn: () => api.portal.getVehicles(),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: workOrdersData, isLoading: loadingOrders, isFetching: fetchingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['portal', 'work-orders'],
    queryFn: () => api.portal.getWorkOrders(),
    enabled: !!token,
    staleTime: 30_000,
  });

  const { data: warrantiesData, isLoading: loadingWarranties } = useQuery({
    queryKey: ['portal', 'warranties'],
    queryFn: () => api.portal.getWarranties(),
    enabled: !!token,
    staleTime: 60_000,
  });

  const vehicles = vehiclesData?.vehicles || [];
  const workOrders = workOrdersData?.workOrders || [];
  const warranties = warrantiesData?.warranties || [];

  // Filtragem por veículo selecionado
  const filteredOrders = selectedVehicleId === 'ALL'
    ? workOrders
    : workOrders.filter((wo) => {
        const v = vehicles.find((item) => item.id === selectedVehicleId);
        return v ? wo.vehiclePlate.toUpperCase() === v.plate.toUpperCase() : true;
      });

  const handleRefreshAll = () => {
    refetchVehicles();
    refetchOrders();
    toast.info('Atualizando histórico e status...');
  };

  // Helper para abrir conversa no WhatsApp da loja
  const handleOpenWhatsAppSupport = (osNumber?: number) => {
    if (!brand.whatsapp) {
      toast.info('Canal de WhatsApp da loja não cadastrado.');
      return;
    }
    const cleanPhone = brand.whatsapp.replace(/\D/g, '');
    const text = osNumber
      ? `Olá! Estou acessando o Portal Meu Veículo e gostaria de informações sobre a OS #${osNumber}.`
      : `Olá! Estou acessando o Portal Meu Veículo da oficina e gostaria de tirar uma dúvida.`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Formatação de valores e status
  const formatBrl = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'delivered' || s === 'concluido' || s === 'entregue') {
      return (
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Concluído / Entregue
        </span>
      );
    }
    if (s === 'in_progress' || s === 'in_execution' || s === 'em_andamento' || s === 'em_execucao') {
      return (
        <span className="bg-[#C8F52E]/20 text-[#C8F52E] border border-[#C8F52E]/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
          <Wrench className="w-3 h-3" /> Em Execução no Box
        </span>
      );
    }
    if (s === 'inspection' || s === 'quality_check' || s === 'inspecao') {
      return (
        <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Inspeção Final & QA
        </span>
      );
    }
    return (
      <span className="bg-[#232A35] text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
        <Clock className="w-3 h-3" /> Agendado / Orçamento
      </span>
    );
  };

  // ============================================================================
  // TELA DE ENTRADA: LOGIN OTP (SEM SENHA E ANTI-ENUMERAÇÃO)
  // ============================================================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0E1116] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
        {/* Glow de ambientação Dark Volt */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#C8F52E]/10 via-emerald-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-[#171C24]/90 backdrop-blur-xl border border-[#232A35] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-400">
          {/* Header da Loja */}
          <div className="text-center mb-6">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="h-12 w-auto object-contain mx-auto mb-3" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#232A35] to-[#171C24] border border-[#C8F52E]/40 flex items-center justify-center shadow-lg shadow-black/50 text-[#C8F52E] font-black text-2xl mx-auto mb-3">
                {brand.name ? brand.name.charAt(0) : '🚗'}
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8F52E]/10 border border-[#C8F52E]/30 text-[#C8F52E] text-[10px] font-black uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3 h-3" /> Portal Seguro do Cliente
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Meu Veículo
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acesse o laudo fotográfico, linha do tempo em tempo real e seus certificados digitais de garantia.
            </p>
          </div>

          {step === 'identifier' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Seu Celular (WhatsApp) ou E-mail Cadastrado
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999 ou seu@email.com"
                    value={identifierInput}
                    onChange={handleIdentifierChange}
                    className="w-full bg-[#0E1116] border border-[#232A35] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] font-medium transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block leading-relaxed">
                  Enviaremos um código numérico de 6 dígitos para autenticação sem necessidade de senha.
                </span>
              </div>

              {requestOtpMutation.error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {(requestOtpMutation.error as any)?.message ||
                      'Não foi possível solicitar o código de acesso no momento.'}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={requestOtpMutation.isPending}
                className="w-full py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs uppercase tracking-widest shadow-lg shadow-[#C8F52E]/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {requestOtpMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-[#0E1116] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Receber Código de Acesso 📲</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-300">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Código de Confirmação (6 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('identifier');
                      setCodeInput('');
                      setDevOtpSuggestion(null);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Trocar número
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-[#0E1116] border border-[#232A35] rounded-xl pl-10 pr-4 py-3 text-lg text-center tracking-[0.3em] font-mono font-bold text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all"
                    autoFocus
                  />
                </div>

                {devOtpSuggestion && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#232A35]/60 border border-[#C8F52E]/30 flex items-center justify-between text-xs">
                    <span className="text-slate-300 text-[11px]">
                      Ambiente de Testes: <strong className="text-[#C8F52E] font-mono font-bold">{devOtpSuggestion}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCodeInput(devOtpSuggestion)}
                      className="px-2 py-1 rounded bg-[#C8F52E] text-[#0E1116] font-black text-[10px] hover:bg-[#b5e022]"
                    >
                      Preencher
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={verifyOtpMutation.isPending || codeInput.length !== 6}
                className="w-full py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs uppercase tracking-widest shadow-lg shadow-[#C8F52E]/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {verifyOtpMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-[#0E1116] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Validar e Entrar 🚀</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={resendSeconds > 0 || requestOtpMutation.isPending}
                  onClick={() => requestOtpMutation.mutate(identifierInput.trim())}
                  className="text-xs text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {resendSeconds > 0 ? (
                    <span>Reenviar código em <strong>{resendSeconds}s</strong></span>
                  ) : (
                    <span>Não recebeu? Clique para reenviar</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-[#232A35] text-center text-[11px] text-slate-500">
            <span className="flex items-center justify-center gap-1 mb-1 font-semibold text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8F52E]" /> Acesso Seguro & Isolado por RLS
            </span>
            Em caso de dúvidas, fale com nossa recepção pelo WhatsApp oficial.
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PAINEL AUTENTICADO "MEU VEÍCULO"
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#0E1116] text-slate-100 flex flex-col font-sans selection:bg-[#C8F52E] selection:text-[#0E1116]">
      {/* Header Oficial do Portal Dark Volt */}
      <header className="sticky top-0 z-40 bg-[#171C24]/90 backdrop-blur-md border-b border-[#232A35] py-4 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#232A35] to-[#171C24] border border-[#C8F52E]/30 flex items-center justify-center shadow-lg text-[#C8F52E] font-black text-xl">
              {brand.name ? brand.name.charAt(0) : '🚗'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">Meu Veículo</h1>
              <span className="text-[10px] font-extrabold bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Área VIP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Olá, <strong className="text-slate-200">{customer?.name || 'Cliente'}</strong>! Bem-vindo ao seu portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {brand.whatsapp && (
            <button
              onClick={() => handleOpenWhatsAppSupport()}
              className="px-3 py-2 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
              title="Falar no WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">WhatsApp Oficina</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            title="Sair do Portal"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#232A35]/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all flex items-center gap-1 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* SEÇÃO 1: MINHA FROTA REGISTRADA (SELETOR DE VEÍCULOS) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Car className="w-4 h-4 text-[#C8F52E]" /> Minha Frota ({vehicles.length})
            </h2>
            <a
              href={slug ? `/${slug}/agendar` : '/agendar'}
              className="text-xs font-bold text-[#C8F52E] hover:underline flex items-center gap-1"
            >
              <span>+ Agendar Novo Veículo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {loadingVehicles ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-pulse">
              <div className="h-20 bg-[#171C24] rounded-2xl border border-[#232A35]" />
              <div className="h-20 bg-[#171C24] rounded-2xl border border-[#232A35]" />
              <div className="h-20 bg-[#171C24] rounded-2xl border border-[#232A35]" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#171C24]/60 border border-dashed border-[#232A35] text-center">
              <Car className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Nenhum veículo cadastrado no momento</p>
              <p className="text-xs text-slate-500 mt-0.5">Seus veículos aparecerão aqui assim que a primeira ordem de serviço for aberta na oficina.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedVehicleId('ALL')}
                className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedVehicleId === 'ALL'
                    ? 'bg-[#171C24] border-[#C8F52E] ring-2 ring-[#C8F52E]/20 shadow-lg shadow-black/40'
                    : 'bg-[#171C24]/50 border-[#232A35] hover:border-slate-700 hover:bg-[#171C24]/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0E1116] border border-[#232A35] flex items-center justify-center font-black text-[#C8F52E] text-lg">
                    📋
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Todos os Veículos</h3>
                    <p className="text-[11px] text-slate-400">Histórico unificado da frota</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-[#0E1116] border border-[#232A35] text-slate-300 text-xs font-bold flex items-center justify-center">
                  {workOrders.length}
                </span>
              </button>

              {vehicles.map((v) => {
                const isSelected = selectedVehicleId === v.id;
                const vehicleOsCount = workOrders.filter(
                  (wo) => wo.vehiclePlate.toUpperCase() === v.plate.toUpperCase()
                ).length;

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#171C24] border-[#C8F52E] ring-2 ring-[#C8F52E]/20 shadow-lg shadow-black/40'
                        : 'bg-[#171C24]/50 border-[#232A35] hover:border-slate-700 hover:bg-[#171C24]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0E1116] border border-[#232A35] flex items-center justify-center font-black text-[#C8F52E] text-base flex-shrink-0">
                        🚗
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">
                          {v.brand} {v.model}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono font-bold uppercase tracking-wide mt-0.5">
                          Placa: <span className="text-[#C8F52E]">{v.plate}</span> {v.modelYear ? `(${v.modelYear})` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-[#0E1116] border border-[#232A35] text-[#C8F52E] text-xs font-bold flex items-center justify-center flex-shrink-0 ml-2">
                      {vehicleOsCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* SEÇÃO 2: HISTÓRICO DE SERVIÇOS & TIMELINE */}
        <section>
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#232A35]">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Timeline de Serviços & Revisões
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe o andamento no box em tempo real, fotos das etapas e certificados.
              </p>
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={fetchingOrders}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#171C24] hover:bg-[#232A35] text-slate-300 transition-all flex items-center gap-1.5 text-xs border border-[#232A35]"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingOrders ? 'animate-spin text-[#C8F52E]' : ''}`} />
              <span className="hidden sm:inline font-bold">Atualizar</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="space-y-4">
              <div className="h-32 bg-[#171C24] rounded-2xl border border-[#232A35] animate-pulse" />
              <div className="h-32 bg-[#171C24] rounded-2xl border border-[#232A35] animate-pulse" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-[#171C24]/40 border border-dashed border-[#232A35] rounded-3xl p-12 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 bg-[#0E1116] rounded-2xl border border-[#232A35] flex items-center justify-center mx-auto mb-4 text-slate-500">
                <Search className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nenhum serviço registrado</h3>
              <p className="text-xs text-slate-400 mb-6">
                Não localizamos ordens de serviço ativas ou passadas para o filtro selecionado.
              </p>
              <a
                href={slug ? `/${slug}/agendar` : '/agendar'}
                className="px-6 py-3 rounded-xl bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#C8F52E]/20 inline-flex items-center gap-2 transition-all"
              >
                <span>📅 Agendar Primeiro Serviço Online</span>
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  order={wo}
                  isExpanded={expandedOsId === wo.id}
                  onToggleExpand={() => setExpandedOsId((prev) => (prev === wo.id ? null : wo.id))}
                  onOpenCert={(order) => setActiveOsForCert(order)}
                  onOpenRecibo={(order) => setActiveOsForRecibo(order)}
                  onOpenSync={(order) => setActiveOsForSync(order)}
                  onOpenLightbox={(url) => setLightboxImage(url)}
                  getStatusBadge={getStatusBadge}
                  formatBrl={formatBrl}
                  shopWhatsApp={brand.whatsapp}
                />
              ))}
            </div>
          )}
        </section>

        {/* SEÇÃO 3: CERTIFICADOS DIGITAIS DE GARANTIA */}
        {warranties.length > 0 && (
          <section className="pt-6 border-t border-[#232A35]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#C8F52E]" /> Certificados de Garantia Ativos ({warranties.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Garantias digitais oficiais auditadas pela oficina com validade nacional e QR Code.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warranties.map((w) => (
                <div
                  key={w.id}
                  className="p-5 rounded-2xl bg-[#171C24] border border-[#232A35] hover:border-[#C8F52E]/40 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#C8F52E] uppercase bg-[#C8F52E]/10 border border-[#C8F52E]/30 px-2 py-0.5 rounded-full">
                        OS #{w.osNumber || w.workOrderId.slice(0, 6)}
                      </span>
                      <h4 className="text-sm font-black text-white mt-1.5">{w.serviceName}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {w.vehicleModel} — Placa: <strong className="text-slate-200">{w.vehiclePlate}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#C8F52E] block">
                        {w.daysRemaining > 0 ? `${w.daysRemaining} dias restantes` : 'Expirada'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {w.warrantyMonths} meses vigência
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#232A35] text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Válido até: <strong className="text-slate-300">{new Date(w.expiresAt).toLocaleDateString('pt-BR')}</strong>
                    </span>
                    <a
                      href={`/status/${w.verificationToken || w.workOrderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#232A35] hover:bg-[#2e3745] text-[#C8F52E] font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <span>Passaporte Digital 🛡️</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer Industrial Dark Volt */}
      <footer className="border-t border-[#232A35] py-6 px-4 text-center text-xs text-slate-500 mt-12 bg-[#171C24]/50">
        <p>© {new Date().getFullYear()} {brand.name || 'CarX'}. Portal "Meu Veículo" — Segurança, Transparência & Garantia Digital.</p>
      </footer>

      {/* LIGHTBOX DE FOTOS ANTES / DURANTE / DEPOIS */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#171C24] text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg border border-[#232A35]"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Evidência em Zoom"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-[#232A35]"
          />
        </div>
      )}

      {/* MODAL CERTIFICADO DE GARANTIA */}
      {activeOsForCert && (
        <CertificadoGarantia
          os={activeOsForCert}
          onClose={() => setActiveOsForCert(null)}
        />
      )}

      {/* MODAL RECIBO DE SERVIÇO */}
      {activeOsForRecibo && (
        <ReciboOS
          os={activeOsForRecibo}
          onClose={() => setActiveOsForRecibo(null)}
        />
      )}

      {/* MODAL SINCRONIZAÇÃO DE CALENDÁRIO */}
      {activeOsForSync && (
        <CalendarSyncModal
          isOpen={!!activeOsForSync}
          onClose={() => setActiveOsForSync(null)}
          order={activeOsForSync}
          shopName={brand.name}
          isManagerView={false}
        />
      )}
    </div>
  );
};

// ==============================================================================
// COMPONENTE DO CARD DA OS COM DETALHES, TIMELINE E FOTOS REAIS DA API
// ==============================================================================
interface WorkOrderCardProps {
  order: PortalWorkOrderListItemDto;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenCert: (order: any) => void;
  onOpenRecibo: (order: any) => void;
  onOpenSync: (order: any) => void;
  onOpenLightbox: (url: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatBrl: (cents: number) => string;
  shopWhatsApp?: string | null;
}

const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  order,
  isExpanded,
  onToggleExpand,
  onOpenCert,
  onOpenRecibo,
  onOpenSync,
  onOpenLightbox,
  getStatusBadge,
  formatBrl,
  shopWhatsApp,
}) => {
  // Queries sob demanda ao expandir a OS
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['portal', 'work-order-detail', order.id],
    queryFn: () => api.portal.getWorkOrderDetail(order.id),
    enabled: isExpanded,
    staleTime: 60_000,
  });

  const { data: timelineData, isLoading: loadingTimeline } = useQuery({
    queryKey: ['portal', 'work-order-timeline', order.id],
    queryFn: () => api.portal.getWorkOrderTimeline(order.id),
    enabled: isExpanded,
    staleTime: 60_000,
  });

  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ['portal', 'work-order-photos', order.id],
    queryFn: () => api.portal.getWorkOrderPhotos(order.id),
    enabled: isExpanded,
    staleTime: 60_000,
  });

  const isCompleted =
    order.status === 'completed' ||
    order.status === 'delivered' ||
    order.status === 'concluido' ||
    order.status === 'entregue';

  const photos = photosData?.photos || [];
  const events = timelineData?.events || [];
  const detail = detailData;

  // Objeto normalizado para compatibilidade com os modais de Certificado e Recibo legados
  const legacyCompatibleOs = {
    id: order.osNumber || order.id,
    cliente_nome: '',
    veiculo_desc: `${order.vehicleBrand} ${order.vehicleModel}`,
    placa: order.vehiclePlate,
    servico: detail?.items?.map((i) => i.serviceName).join(', ') || 'Serviço Automotivo Especializado',
    valor_total: order.finalCents / 100,
    data_show: order.createdAt,
    observacoes: detail?.notes || '',
  };

  return (
    <div className="bg-[#171C24] border border-[#232A35] hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl transition-all">
      {/* Topo do card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#232A35]">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold uppercase text-[#C8F52E] bg-[#0E1116] px-3 py-1 rounded-xl border border-[#232A35]">
            OS #{order.osNumber}
          </span>
          <span className="text-sm font-bold text-white flex items-center gap-1.5">
            <Car className="w-4 h-4 text-[#C8F52E]" />
            {order.vehicleBrand} {order.vehicleModel}
            <span className="text-slate-400 font-mono text-xs">[{order.vehiclePlate}]</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
          </span>
          {getStatusBadge(order.status)}
        </div>
      </div>

      {/* Barra de Progresso Real */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-semibold">Progresso da Execução no Box</span>
          <span className="font-mono font-bold text-[#C8F52E]">{order.progress || 0}%</span>
        </div>
        <div className="w-full h-2.5 bg-[#0E1116] rounded-full overflow-hidden border border-[#232A35]">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#C8F52E] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, order.progress || 0))}%` }}
          />
        </div>
      </div>

      {/* Resumo Financeiro & Botão de Expansão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#232A35]">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Total:{' '}
            <strong className="text-white font-extrabold text-sm">{formatBrl(order.finalCents)}</strong>
          </span>
          {order.isFullyPaid ? (
            <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> Quitado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <Clock className="w-3 h-3" /> Pagamento na Entrega
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenSync(legacyCompatibleOs)}
            className="px-3 py-1.5 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-[#C8F52E] font-bold text-xs border border-[#C8F52E]/30 flex items-center gap-1.5 transition-all"
            title="Sincronizar com Apple/Google Calendar"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda 🗓️</span>
          </button>

          {isCompleted && (
            <>
              <button
                type="button"
                onClick={() => onOpenRecibo(legacyCompatibleOs)}
                className="px-3 py-1.5 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-sky-400 font-bold text-xs border border-sky-500/30 flex items-center gap-1.5 transition-all"
                title="Visualizar Recibo"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Recibo</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCert(legacyCompatibleOs)}
                className="px-3.5 py-1.5 rounded-xl bg-[#C8F52E] hover:bg-[#b5e022] text-[#0E1116] font-black text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificado</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleExpand}
            className="px-3 py-1.5 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <span>{isExpanded ? 'Recolher' : 'Timeline & Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* DETALHES EXPANDIDOS (TIMELINE, ITENS CONTRATADOS & EVIDÊNCIAS FOTOGRÁFICAS) */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-[#232A35] space-y-6 animate-in fade-in duration-300">
          
          {/* ITENS E SERVIÇOS CONTRATADOS */}
          {detail?.items && detail.items.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#C8F52E]" /> Serviços & Aplicações
              </h4>
              <div className="space-y-2">
                {detail.items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-[#0E1116] border border-[#232A35] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{it.serviceName}</p>
                      {it.warrantyMonths > 0 && (
                        <span className="text-[10px] text-[#C8F52E] font-medium">
                          Garantia de {it.warrantyMonths} meses inclusa
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-200">
                      {formatBrl(it.finalPriceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EVIDÊNCIAS FOTOGRÁFICAS REAIS (ANTES / DURANTE / DEPOIS) */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#C8F52E]" /> Evidências Fotográficas do Box ({photos.length})
            </h4>

            {loadingPhotos ? (
              <div className="flex gap-2.5">
                <div className="w-24 h-20 bg-[#0E1116] rounded-xl border border-[#232A35] animate-pulse" />
                <div className="w-24 h-20 bg-[#0E1116] rounded-xl border border-[#232A35] animate-pulse" />
              </div>
            ) : photos.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0E1116] border border-[#232A35] text-center text-xs text-slate-500">
                Nenhuma foto registrada pelo operador ainda.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {photos.map((p) => {
                  const phaseLabel =
                    p.phase === 'before' ? 'Antes' : p.phase === 'during' ? 'Durante' : 'Depois';
                  const phaseColor =
                    p.phase === 'before'
                      ? 'text-amber-400'
                      : p.phase === 'during'
                      ? 'text-sky-400'
                      : 'text-emerald-400';

                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenLightbox(p.url)}
                      className="relative group/thumb w-28 h-24 rounded-2xl overflow-hidden border border-[#232A35] hover:border-[#C8F52E] flex-shrink-0 cursor-pointer bg-black transition-all"
                    >
                      <img
                        src={p.url}
                        alt={`Foto ${phaseLabel}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                      <span className={`absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#232A35] ${phaseColor}`}>
                        {phaseLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TIMELINE DE AUDITORIA E EVENTOS */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C8F52E]" /> Linha do Tempo da Execução
            </h4>

            {loadingTimeline ? (
              <div className="space-y-2">
                <div className="h-8 bg-[#0E1116] rounded-xl border border-[#232A35] animate-pulse" />
                <div className="h-8 bg-[#0E1116] rounded-xl border border-[#232A35] animate-pulse" />
              </div>
            ) : events.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0E1116] border border-[#232A35] text-center text-xs text-slate-500">
                Aguardando primeiros eventos de execução.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#232A35]">
                {events.map((ev) => (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-[#C8F52E] border-2 border-[#171C24]" />
                    <div className="bg-[#0E1116] border border-[#232A35] rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{ev.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ev.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-slate-400 text-[11px] leading-relaxed">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default ClientPortal;
