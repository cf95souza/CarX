import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import { AdminCreateTenantDto, AutomotiveSegment } from '@carx/shared';
import {
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Shield,
  Sun,
  Sparkles,
  Wrench,
  Mail,
  Layers,
  FileCheck2,
} from 'lucide-react';

export function TenantWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<AdminCreateTenantDto>({
    trade_name: '',
    legal_name: '',
    cnpj: '',
    slug: '',
    email: '',
    phone: '',
    segment: 'mecanica',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    plan_slug: 'pro',
    is_trial: true,
    trial_days: 14,
  });

  const handleInputChange = (field: keyof AdminCreateTenantDto, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'trade_name' && (!prev.slug || prev.slug === generateSlug(prev.trade_name))) {
        updated.slug = generateSlug(value as string);
      }
      return updated;
    });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const validateStep = (step: number) => {
    setError(null);
    if (step === 1) {
      if (!formData.trade_name.trim()) return 'Nome Fantasia é obrigatório.';
      if (!formData.slug.trim()) return 'Slug do subdomínio é obrigatório.';
      if (!formData.email.trim()) return 'E-mail corporativo da oficina é obrigatório.';
    }
    if (step === 2) {
      if (!formData.segment) return 'Selecione o segmento automotivo da oficina.';
    }
    if (step === 3) {
      if (!formData.owner_name.trim()) return 'Nome do proprietário é obrigatório.';
      if (!formData.owner_email.trim()) return 'E-mail do proprietário é obrigatório.';
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await adminApi.createTenant(formData);
      navigate('/tenants');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao provisionar oficina');
    } finally {
      setLoading(false);
    }
  };

  const segments = [
    {
      id: 'ppf' as AutomotiveSegment,
      name: 'PPF (Paint Protection Film)',
      icon: Shield,
      highlight: 'Proteção de Pintura',
      desc: 'Películas autorregenerativas, kits para soleiras/conchas e checklist de micragem e repintura.',
      services: ['PPF Frontal Completo', 'PPF Full Body', 'Kit Maçanetas/Soleiras', 'Revitalização Hidrofóbica'],
    },
    {
      id: 'insulfilm' as AutomotiveSegment,
      name: 'Insulfilm e Controle Solar',
      icon: Sun,
      highlight: 'Películas Térmicas',
      desc: 'Nano cerâmica térmica, antivandalismo PS8/PS12 e checklist de integridade de desembaçador.',
      services: ['Nano Cerâmica Completa', 'Antivandalismo PS8/PS12', 'Para-brisa 70%', 'Remoção Técnica'],
    },
    {
      id: 'detailing' as AutomotiveSegment,
      name: 'Estética & Detalhamento',
      icon: Sparkles,
      highlight: 'Detailing & Vitrificação',
      desc: 'Polimento técnico, coating cerâmico 9H, oxi-sanitização interna e tratamento de couro.',
      services: ['Polimento Técnico', 'Vitrificação Cerâmica 9H', 'Higienização e Ozônio', 'Tratamento de Couro'],
    },
    {
      id: 'mecanica' as AutomotiveSegment,
      name: 'Oficina Mecânica Geral',
      icon: Wrench,
      highlight: 'Manutenção & Centro Auto',
      desc: 'Revisão preventiva, freios, diagnóstico computadorizado via scanner e geometria 3D.',
      services: ['Revisão Preventiva Geral', 'Freios e Sangria', 'Scanner Diagnóstico OBD-II', 'Correia Dentada'],
    },
  ];

  const plans = [
    {
      slug: 'start',
      name: 'Start',
      price: 'R$ 69,90/mês',
      desc: 'Ideal para oficinas compactas e estéticas em fase inicial.',
    },
    {
      slug: 'pro',
      name: 'Pro',
      price: 'R$ 149,90/mês',
      popular: true,
      desc: 'Para centros automotivos com equipe ativa e alto volume de OS.',
    },
    {
      slug: 'prime',
      name: 'Prime',
      price: 'R$ 299,90/mês',
      desc: 'Multi-filiais, relatórios avançados de DRE e alta volumetria.',
    },
    {
      slug: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 599,90/mês',
      desc: 'Redes de concessionárias e franquias com SLA corporativo.',
    },
  ];

  const selectedSegmentObj = segments.find((s) => s.id === formData.segment) || segments[3];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-aco/40 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Assistente de Criação de Oficina
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Provisione uma nova empresa, injete o catálogo de serviços do segmento e envie o convite ao dono.
          </p>
        </div>
        <Link to="/tenants" className="text-xs text-muted hover:text-texto">
          Cancelar
        </Link>
      </div>

      {/* Stepper Bar (5 etapas) */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { num: 1, label: 'Oficina', icon: Building2 },
          { num: 2, label: 'Segmento', icon: Sparkles },
          { num: 3, label: 'Proprietário', icon: User },
          { num: 4, label: 'Plano', icon: CreditCard },
          { num: 5, label: 'Confirmação', icon: CheckCircle2 },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              className={`p-2.5 rounded-btn border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? 'bg-grafite border-volt text-volt font-semibold'
                  : isDone
                  ? 'bg-aco/30 border-aco text-texto font-medium'
                  : 'bg-asfalto/50 border-aco/30 text-muted/60'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px]">
                <Icon size={13} className={isActive ? 'text-volt' : isDone ? 'text-semantic-success' : 'text-muted/60'} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-btn bg-semantic-error/10 border border-semantic-error/30 flex items-center gap-2 text-semantic-error text-xs">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-grafite border border-aco/50 rounded-card p-6 md:p-8 shadow-xl">
        {/* Etapa 1: Dados da Oficina */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <Building2 size={16} className="text-volt" /> 1. Dados da Oficina
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.trade_name}
                  onChange={(e) => handleInputChange('trade_name', e.target.value)}
                  placeholder="Ex: Auto Mecânica Elite"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Razão Social
                </label>
                <input
                  type="text"
                  value={formData.legal_name || ''}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  placeholder="Ex: Elite Serviços Automotivos LTDA"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Slug / Subdomínio *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', generateSlug(e.target.value))}
                    placeholder="auto-mecanica-elite"
                    className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-volt font-mono placeholder:text-muted/50 focus:outline-none focus:border-volt"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px] pointer-events-none">
                    .carx.com.br
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  E-mail da Oficina *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@automecanicaelite.com.br"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Segmento Automotivo */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-volt" /> 2. Segmento de Atuação da Oficina
            </h3>
            <p className="text-xs text-muted">
              Ao selecionar o segmento, o sistema injeta automaticamente o catálogo de serviços base e o
              modelo de checklist de entrada específico, deixando a loja pronta para emitir a primeira OS.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {segments.map((seg) => {
                const Icon = seg.icon;
                const isSelected = formData.segment === seg.id;
                return (
                  <div
                    key={seg.id}
                    onClick={() => handleInputChange('segment', seg.id)}
                    className={`p-4 rounded-card border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-asfalto border-volt shadow-sm shadow-volt/20'
                        : 'bg-asfalto/50 border-aco/40 hover:border-aco'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-volt text-asfalto' : 'bg-aco text-muted'
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-aco/50 text-volt">
                          {seg.highlight}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-white">{seg.name}</h4>
                      <p className="text-[11px] text-muted mt-1.5">{seg.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-aco/30">
                      <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                        Serviços Injetados:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {seg.services.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-aco/40 text-texto"
                          >
                            {s}
                          </span>
                        ))}
                        <span className="text-[10px] text-volt font-medium self-center">+ outros</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Etapa 3: Proprietário Inicial */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <User size={16} className="text-volt" /> 3. Administrador da Loja (Proprietário)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Nome Completo do Proprietário *
                </label>
                <input
                  type="text"
                  required
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  E-mail de Login do Dono *
                </label>
                <input
                  type="email"
                  required
                  value={formData.owner_email}
                  onChange={(e) => handleInputChange('owner_email', e.target.value)}
                  placeholder="carlos@automecanicaelite.com.br"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Senha Provisória (Opcional - padrão: Senha@CarX2026!)
                </label>
                <input
                  type="password"
                  value={formData.owner_password || ''}
                  onChange={(e) => handleInputChange('owner_password', e.target.value)}
                  placeholder="Defina uma senha ou deixe em branco para padrão seguro"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                />
              </div>
            </div>
          </div>
        )}

        {/* Etapa 4: Plano & Trial */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <CreditCard size={16} className="text-volt" /> 4. Escolha do Plano SaaS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => {
                const isSelected = formData.plan_slug === plan.slug;
                return (
                  <div
                    key={plan.slug}
                    onClick={() => handleInputChange('plan_slug', plan.slug)}
                    className={`p-4 rounded-card border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-asfalto border-volt shadow-sm shadow-volt/20'
                        : 'bg-asfalto/50 border-aco/40 hover:border-aco'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute top-3 right-3 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-volt text-asfalto">
                        Popular
                      </span>
                    )}
                    <h4 className="font-display font-bold text-sm text-white">{plan.name}</h4>
                    <div className="text-volt font-bold text-sm mt-0.5">{plan.price}</div>
                    <p className="text-[11px] text-muted mt-2">{plan.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-aco/30 flex items-center justify-between p-3 rounded-btn bg-asfalto/60 border border-aco/30">
              <div>
                <span className="text-xs font-semibold text-texto block">Conceder Período Trial Gratuito?</span>
                <span className="text-[11px] text-muted">A oficina inicia com 14 dias sem cobrança imediata</span>
              </div>
              <input
                type="checkbox"
                checked={formData.is_trial}
                onChange={(e) => handleInputChange('is_trial', e.target.checked)}
                className="w-4 h-4 accent-volt rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Etapa 5: Confirmação e Provisionamento */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-volt" /> 5. Confirmar Provisionamento
            </h3>

            <div className="p-4 rounded-card bg-asfalto/70 border border-aco/40 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-aco/30">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Oficina</span>
                  <span className="font-semibold text-white">{formData.trade_name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Subdomínio</span>
                  <span className="font-mono text-volt">{formData.slug}.carx.com.br</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-aco/30">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Segmento Automotivo</span>
                  <span className="font-semibold text-volt">{selectedSegmentObj.name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Itens Automáticos</span>
                  <span className="text-texto">5 Serviços + 1 Checklist Base</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-aco/30">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Proprietário</span>
                  <span className="font-semibold text-white">{formData.owner_name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">E-mail de Acesso</span>
                  <span className="text-texto">{formData.owner_email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Plano</span>
                  <span className="font-semibold text-volt uppercase">{formData.plan_slug}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Modalidade</span>
                  <span className="text-texto">{formData.is_trial ? 'Trial (14 dias)' : 'Faturamento Imediato'}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-btn bg-volt/10 border border-volt/20 text-[11px] text-muted space-y-2">
              <div className="flex items-center gap-2 text-volt font-semibold text-xs">
                <Mail size={14} /> Convite Oficial de Boas-Vindas por E-mail
              </div>
              <p>
                Ao clicar em confirmar, o sistema criará a oficina com subdomínio isolado, injetará o catálogo
                de serviços do segmento e enviará automaticamente o e-mail com as credenciais para{' '}
                <strong className="text-white">{formData.owner_email}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-aco/40">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="px-4 py-2 bg-aco/50 hover:bg-aco text-texto rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20"
            >
              <span>Próximo Passo</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-2 transition-all shadow-md shadow-volt/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Provisionar Oficina e Enviar Convite</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
