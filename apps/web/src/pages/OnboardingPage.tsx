import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Shield,
  Sun,
  Sparkles,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building2,
  Phone,
  Mail,
  User,
  KeyRound,
  AlertCircle,
  HelpCircle,
  Check,
  Zap,
} from 'lucide-react';
import { 
  api, 
  setStoredToken, 
  setStoredRefreshToken, 
  setStoredTenantId, 
  setStoredTenantSlug 
} from '../services/api';

type SegmentKey = 'ppf' | 'insulfilm' | 'detailing' | 'mecanica';

interface SegmentOption {
  key: SegmentKey;
  name: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  seedServices: string[];
  checklistPreview: string;
}

const SEGMENTS: SegmentOption[] = [
  {
    key: 'ppf',
    name: 'PPF (Paint Protection)',
    badge: 'Alta Margem',
    icon: <Shield className="w-6 h-6 text-[#C8F52E]" />,
    description: 'Películas de proteção de pintura contra pedriscos e riscos.',
    seedServices: [
      'Aplicação de PPF Frontal Completo',
      'Aplicação de PPF Full Body (Lataria)',
      'Kit Soleiras e Conchas de Maçaneta',
      'Remoção Técnica de Película Antiga',
      'Selagem Hidrofóbica de Manutenção',
    ],
    checklistPreview: 'Medição de micragem do verniz e mapeamento de micro-danos.',
  },
  {
    key: 'insulfilm',
    name: 'Películas & Insulfilm',
    badge: 'Volume & Giro',
    icon: <Sun className="w-6 h-6 text-amber-400" />,
    description: 'Controle solar, nanocerâmica e películas antivandalismo PS8/PS12.',
    seedServices: [
      'Aplicação Nanocerâmica Térmica (G20/G35)',
      'Película Antivandalismo de Segurança',
      'Película Parabrisa Térmica 70% UV/IR',
      'Substituição de Película Bolhada/Roxa',
      'Garantia Certificada com Selo QR',
    ],
    checklistPreview: 'Inspeção dos filetes do desembaçador e integridade das guarnições.',
  },
  {
    key: 'detailing',
    name: 'Estética & Detailing',
    badge: 'Mais Procurado',
    icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    description: 'Polimento técnico, vitrificação cerâmica 9H e higienização profunda.',
    seedServices: [
      'Polimento Técnico Comercial / 3 Etapas',
      'Vitrificação de Pintura Cerâmica 9H',
      'Higienização Interna com Oxi-sanitização',
      'Hidratação e Vitrificação de Couro',
      'Cristalização de Vidros e Espelhos',
    ],
    checklistPreview: 'Mapeamento de repinturas, marcas de boina e espessura do verniz.',
  },
  {
    key: 'mecanica',
    name: 'Mecânica & Auto Center',
    badge: 'Essencial',
    icon: <Wrench className="w-6 h-6 text-emerald-400" />,
    description: 'Manutenção preventiva, freios, injeção, suspensão e motor.',
    seedServices: [
      'Revisão Preventiva por Quilometragem',
      'Substituição de Pastilhas e Discos de Freio',
      'Diagnóstico Eletrônico via Scanner OBD-II',
      'Troca de Óleo de Motor e Filtros Completos',
      'Alinhamento e Balanceamento 3D',
    ],
    checklistPreview: 'Nível de fluidos, vazamentos, estado de correias e pneus.',
  },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estados do Stepper
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dados do Formulário
  const [tradeName, setTradeName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');

  const [segment, setSegment] = useState<SegmentKey>(() => {
    const s = searchParams.get('segmento') as SegmentKey;
    return s && ['ppf', 'insulfilm', 'detailing', 'mecanica'].includes(s) ? s : 'detailing';
  });

  const [planSlug, setPlanSlug] = useState<'essencial' | 'profissional' | 'premium'>(() => {
    const p = searchParams.get('plano') as any;
    return ['essencial', 'profissional', 'premium'].includes(p) ? p : 'profissional';
  });

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Honeypot anti-bot
  const [honeypot, setHoneypot] = useState('');

  // Auto-gerar slug a partir do nome fantasia
  const handleTradeNameChange = (val: string) => {
    setTradeName(val);
    const autoSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) {
      setErrorMsg('Informe o nome da sua oficina ou centro automotivo.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMsg(null);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!ownerName.trim()) {
      setErrorMsg('Informe seu nome completo.');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setErrorMsg('Informe um e-mail válido para acesso.');
      return;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Você deve aceitar os termos de uso e política de privacidade.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.onboarding.selfRegister({
        trade_name: tradeName.trim(),
        slug: slug.trim() || undefined,
        phone: phone.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        segment,
        plan_slug: planSlug,
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim(),
        owner_password: ownerPassword,
        website: honeypot,
      });

      if (response && response.tokens) {
        // Armazenar a sessão para autenticação imediata
        setStoredToken(response.tokens.accessToken);
        setStoredRefreshToken(response.tokens.refreshToken);
        setStoredTenantId(response.tenant.id);
        setStoredTenantSlug(response.tenant.slug);

        // Hidratar cache inicial do usuário e membership
        const initialUser = {
          id: response.user?.id || '',
          email: ownerEmail.trim().toLowerCase(),
          name: ownerName.trim(),
        };
        const initialMembership = {
          tenant_id: response.tenant.id,
          tenant_slug: response.tenant.slug,
          tenant_name: response.tenant.trade_name,
          role: 'owner',
          is_active: true,
        };
        localStorage.setItem('carx_user_cached', JSON.stringify(initialUser));
        localStorage.setItem('carx_memberships_cached', JSON.stringify([initialMembership]));

        // Redirecionamento completo para o App com sessão ativa
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar o cadastro da oficina. Tente novamente.');
      setSubmitting(false);
    }
  };

  const selectedSegmentObj = SEGMENTS.find((s) => s.key === segment) || SEGMENTS[2];

  return (
    <div className="min-h-screen bg-[#0E1116] text-white flex flex-col justify-between selection:bg-[#C8F52E]/20 selection:text-[#C8F52E]">
      {/* Header Minimalista */}
      <header className="border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <Link to="/landing" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#C8F52E] flex items-center justify-center font-black text-black text-xl shadow-lg shadow-[#C8F52E]/10">
            CX
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">CarX</span>
          <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/20">
            SaaS
          </span>
        </Link>
        <div className="text-xs text-slate-400">
          Já possui conta?{' '}
          <Link to="/login" className="text-[#C8F52E] font-bold hover:underline">
            Entrar
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal do Onboarding */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col justify-center">
        {/* Barra de Progresso do Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
            <span className={step >= 1 ? 'text-[#C8F52E]' : 'text-slate-500'}>
              1. Sua Oficina
            </span>
            <span className={step >= 2 ? 'text-[#C8F52E]' : 'text-slate-500'}>
              2. Nicho & Catálogo
            </span>
            <span className={step >= 3 ? 'text-[#C8F52E]' : 'text-slate-500'}>
              3. Acesso & Início Grátis
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C8F52E] transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASSO 1: DADOS DA OFICINA */}
        {/* ============================================================== */}
        {step === 1 && (
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-md shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                Vamos configurar sua oficina
              </h1>
              <p className="text-sm text-slate-400">
                Seu ambiente dedicado será criado instantaneamente com subdomínio próprio.
              </p>
            </div>

            <form onSubmit={handleNextStep1} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Nome da Oficina ou Auto Center <span className="text-[#C8F52E]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Studio Auto Detailing, Mecânica Turbo..."
                    value={tradeName}
                    onChange={(e) => handleTradeNameChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Seu Subdomínio de Acesso
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="suaoficina"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-l-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                  <span className="px-4 py-3 bg-white/5 border border-l-0 border-white/10 rounded-r-xl text-slate-400 text-sm font-semibold select-none">
                    .carx.com.br
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Link direto para seus clientes consultarem ordens e para sua equipe acessar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="(11) 99999-8888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    CNPJ ou CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C8F52E] text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-[#b5e024] transition-colors shadow-lg shadow-[#C8F52E]/10"
                >
                  Continuar para o Nicho
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASSO 2: SELEÇÃO DE NICHO AUTOMOTIVO */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-md shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                Qual é a especialidade principal da sua loja?
              </h1>
              <p className="text-sm text-slate-400">
                O CarX injeta automaticamente o catálogo de serviços e checklists adequados ao seu segmento.
              </p>
            </div>

            {/* Grid dos 4 Nichos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {SEGMENTS.map((s) => {
                const isSelected = segment === s.key;
                return (
                  <div
                    key={s.key}
                    onClick={() => setSegment(s.key)}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#C8F52E]/10 border-[#C8F52E] ring-1 ring-[#C8F52E]'
                        : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          {s.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white">
                          {s.badge}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-white mb-1">
                        {s.name}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold">
                      <span className={isSelected ? 'text-[#C8F52E]' : 'text-slate-400'}>
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preview do Catálogo Pré-carregado */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-8">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#C8F52E] uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                Catálogo que será pré-carregado para sua oficina:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                {selectedSegmentObj.seedServices.map((srv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{srv}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">Checklist Veicular Integrado:</span> {selectedSegmentObj.checklistPreview}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                className="px-8 py-3.5 rounded-xl bg-[#C8F52E] text-black font-extrabold text-sm flex items-center gap-2 hover:bg-[#b5e024] transition-colors shadow-lg shadow-[#C8F52E]/10"
              >
                Confirmar Especialidade
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASSO 3: CONTA DO PROPRIETÁRIO & PLANO DE TRIAL */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-md shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                Seus dados de acesso de gestor
              </h1>
              <p className="text-sm text-slate-400">
                Inicie seu teste gratuito de 14 dias. Não pedimos cartão de crédito.
              </p>
            </div>

            {/* Honeypot invisível para bots */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Seu Nome Completo <span className="text-[#C8F52E]">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Seu E-mail de Gestor <span className="text-[#C8F52E]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="dono@oficina.com.br"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Crie sua Senha Forte <span className="text-[#C8F52E]">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="No mínimo 6 caracteres"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:border-[#C8F52E] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Seletor do Plano para Trial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Plano Escolhido para o Período de Teste
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'essencial', name: 'Essencial', price: 'R$ 69,90/mês' },
                    { key: 'profissional', name: 'Profissional', price: 'R$ 149,90/mês', badge: 'Recomendado' },
                    { key: 'premium', name: 'Premium', price: 'R$ 299,90/mês' },
                  ].map((p) => {
                    const isPlanSel = planSlug === p.key;
                    return (
                      <div
                        key={p.key}
                        onClick={() => setPlanSlug(p.key as any)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isPlanSel
                            ? 'bg-[#C8F52E]/10 border-[#C8F52E] ring-1 ring-[#C8F52E]'
                            : 'bg-black/30 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{p.name}</span>
                          {p.badge && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#C8F52E]/20 text-[#C8F52E]">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{p.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card de Garantia de 14 Dias Grátis */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">
                    Período de Testes de 14 Dias 100% Gratuito
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Acesso irrestrito a todas as funções. Nenhum dado de cartão de crédito é exigido agora.
                  </p>
                </div>
              </div>

              {/* Termos de Uso e LGPD */}
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-[#C8F52E] focus:ring-[#C8F52E]"
                />
                <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                  Declaro que li e concordo com os{' '}
                  <Link to="/termos" target="_blank" className="text-[#C8F52E] hover:underline font-semibold">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/privacidade" target="_blank" className="text-[#C8F52E] hover:underline font-semibold">
                    Política de Privacidade (LGPD)
                  </Link>{' '}
                  do CarX.
                </label>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-4 rounded-xl bg-[#C8F52E] text-black font-black text-sm flex items-center gap-2 hover:bg-[#b5e024] disabled:opacity-50 transition-colors shadow-xl shadow-[#C8F52E]/10"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Provisionando Oficina...
                    </>
                  ) : (
                    <>
                      Criar Minha Oficina Grátis
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Rodapé Simples */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-slate-500">
        © 2026 CarX SaaS Automotivo • Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default OnboardingPage;

