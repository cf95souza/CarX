import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  AdminPlanDto,
  CreatePlanDto,
  UpdatePlanDto,
  PlanLimits,
  ALL_PLAN_FEATURES,
  FeatureMetadata,
  PlanFeatures,
} from '@carx/shared';
import {
  Layers,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Users,
  Building2,
  FileText,
  HardDrive,
  MessageSquareCode,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

export function PlansPage() {
  const [plans, setPlans] = useState<AdminPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriceReais, setFormPriceReais] = useState('0,00');
  const [formInterval, setFormInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formLimits, setFormLimits] = useState<PlanLimits>({
    max_units: 1,
    max_users: 3,
    max_work_orders_per_month: 100,
    max_storage_mb: 1024,
    max_whatsapp_messages_per_month: 200,
  });
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listPlans();
      setPlans(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar planos comerciais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedPlanId(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormPriceReais('99,90');
    setFormInterval('monthly');
    setFormIsActive(true);
    setFormLimits({
      max_units: 1,
      max_users: 3,
      max_work_orders_per_month: 100,
      max_storage_mb: 1024,
      max_whatsapp_messages_per_month: 200,
    });
    setFormFeatures([
      PlanFeatures.WORK_ORDERS,
      PlanFeatures.CUSTOMERS,
      PlanFeatures.VEHICLES,
      PlanFeatures.QUOTES,
      PlanFeatures.BASIC_REPORTS,
    ]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan: AdminPlanDto) => {
    setIsEditing(true);
    setSelectedPlanId(plan.id);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormDescription(plan.description || '');
    setFormPriceReais((plan.price_cents / 100).toFixed(2).replace('.', ','));
    setFormInterval(plan.interval === 'yearly' ? 'yearly' : 'monthly');
    setFormIsActive(plan.is_active);

    const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
    setFormLimits({
      max_units: limits?.max_units ?? 1,
      max_users: limits?.max_users ?? 3,
      max_work_orders_per_month: limits?.max_work_orders_per_month ?? 100,
      max_storage_mb: limits?.max_storage_mb ?? 1024,
      max_whatsapp_messages_per_month: limits?.max_whatsapp_messages_per_month ?? 200,
    });

    const features = Array.isArray(plan.features)
      ? plan.features
      : typeof plan.features === 'string'
      ? JSON.parse(plan.features)
      : [];
    setFormFeatures(features);
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleFeature = (featureKey: string) => {
    setFormFeatures((prev) => {
      if (prev.includes(featureKey)) {
        return prev.filter((k) => k !== featureKey);
      } else {
        return [...prev, featureKey];
      }
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const cleanPrice = parseFloat(formPriceReais.replace(/\./g, '').replace(',', '.'));
    const priceCents = Math.round((cleanPrice || 0) * 100);

    try {
      if (isEditing && selectedPlanId) {
        const payload: UpdatePlanDto = {
          name: formName,
          description: formDescription,
          price_cents: priceCents,
          interval: formInterval,
          limits: formLimits,
          features: formFeatures,
          is_active: formIsActive,
        };
        await adminApi.updatePlan(selectedPlanId, payload);
        setSuccessMsg(`Plano "${formName}" atualizado com sucesso!`);
      } else {
        const payload: CreatePlanDto = {
          name: formName,
          slug: formSlug,
          description: formDescription,
          price_cents: priceCents,
          interval: formInterval,
          limits: formLimits,
          features: formFeatures,
          is_active: formIsActive,
        };
        await adminApi.createPlan(payload);
        setSuccessMsg(`Novo plano "${formName}" criado com sucesso!`);
      }

      setModalOpen(false);
      await loadPlans();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleActive = async (plan: AdminPlanDto) => {
    try {
      await adminApi.updatePlan(plan.id, { is_active: !plan.is_active });
      await loadPlans();
      setSuccessMsg(`Status do plano "${plan.name}" alterado para ${!plan.is_active ? 'Ativo' : 'Inativo'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao alternar status do plano');
    }
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      plan.slug.toLowerCase().includes(search.toLowerCase()) ||
      (plan.description && plan.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'active') return plan.is_active;
    if (filter === 'inactive') return !plan.is_active;
    return true;
  });

  const totalTenantsCount = plans.reduce((acc, curr) => acc + (curr.tenants_count || 0), 0);
  const activePlansCount = plans.filter((p) => p.is_active).length;
  const plansWithWaCount = plans.filter((p) => {
    const feats = Array.isArray(p.features) ? p.features : [];
    return feats.includes(PlanFeatures.WHATSAPP_GATEWAY) || feats.includes(PlanFeatures.WHATSAPP_AUTO);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="text-volt" size={24} />
            Gestão Global de Planos & Feature Gating
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Configuração de preços, cotas e matriz de funcionalidades com propagação em tempo real para os clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            title="Recarregar planos"
            className="p-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-muted hover:text-texto transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 bg-volt hover:bg-volt/90 text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-volt/20"
          >
            <Plus size={16} />
            <span>Novo Plano Comercial</span>
          </button>
        </div>
      </div>

      {/* Feedbacks */}
      {successMsg && (
        <div className="p-3 bg-volt/10 border border-volt/30 rounded-card text-xs text-volt flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-card text-xs text-semantic-error flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Planos Ativos
          </div>
          <div className="font-display text-2xl font-bold text-volt">
            {activePlansCount} <span className="text-xs text-muted font-normal">/ {plans.length} total</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Disponíveis para contratação e upgrades</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Oficinas Assinantes
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {totalTenantsCount}
          </div>
          <p className="text-[11px] text-muted mt-2">Clientes ativos distribuídos nos planos</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Com WhatsApp Gateway
          </div>
          <div className="font-display text-2xl font-bold text-volt">
            {plansWithWaCount} <span className="text-xs text-muted font-normal">planos</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Liberam pareamento e Portal Meu Veículo</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Matriz de Recursos
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {ALL_PLAN_FEATURES.length} <span className="text-xs text-muted font-normal">features</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Controladas via guards dinâmicos</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-grafite border border-aco/50 rounded-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-muted" size={15} />
          <input
            type="text"
            placeholder="Buscar por nome, slug ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-asfalto border border-aco rounded-btn pl-9 pr-3 py-1.5 text-xs text-texto placeholder-muted focus:outline-none focus:border-volt transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-volt text-asfalto font-semibold'
                  : 'bg-aco/40 text-muted hover:text-texto'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted text-xs flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-volt" size={24} />
          <span>Carregando catálogo de planos e permissões...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-grafite border border-aco/50 rounded-card p-12 text-center text-muted text-xs">
          Nenhum plano encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
            const features: string[] = Array.isArray(plan.features)
              ? plan.features
              : typeof plan.features === 'string'
              ? JSON.parse(plan.features)
              : [];

            return (
              <div
                key={plan.id}
                className={`bg-grafite border rounded-card flex flex-col justify-between transition-all ${
                  plan.is_active ? 'border-aco/60 hover:border-volt/40' : 'border-aco/30 opacity-70'
                }`}
              >
                {/* Card Top */}
                <div className="p-5 border-b border-aco/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-volt uppercase tracking-wider font-semibold">
                      {plan.slug}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.is_active
                          ? 'bg-volt/10 text-volt border border-volt/20'
                          : 'bg-aco text-muted border border-aco/50'
                      }`}
                    >
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-muted mt-1 min-h-[32px] line-clamp-2">
                    {plan.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-extrabold text-white">
                      {formatCurrency(plan.price_cents)}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      / {plan.interval === 'yearly' ? 'ano' : 'mês'}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-muted flex items-center gap-1">
                    <Building2 size={13} className="text-volt" />
                    <span>
                      <strong className="text-white">{plan.tenants_count || 0}</strong> oficinas assinando
                    </span>
                  </div>
                </div>

                {/* Quotas Breakdown */}
                <div className="p-5 space-y-2.5 bg-asfalto/30 border-b border-aco/20 text-xs">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted">
                    Limites e Cotas
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted">
                      <Users size={13} className="text-texto" />
                      <span>Até <strong>{limits?.max_users ?? 3}</strong> usuários</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <Building2 size={13} className="text-texto" />
                      <span>Até <strong>{limits?.max_units ?? 1}</strong> filial(is)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <FileText size={13} className="text-texto" />
                      <span><strong>{limits?.max_work_orders_per_month ?? 100}</strong> OS/mês</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <HardDrive size={13} className="text-texto" />
                      <span><strong>{Math.round((limits?.max_storage_mb ?? 1024) / 1024)} GB</strong> MinIO</span>
                    </div>
                  </div>
                </div>

                {/* Features Matrix Summary */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted">
                        Recursos Habilitados
                      </span>
                      <span className="text-[10px] font-semibold text-volt">
                        {features.length} de {ALL_PLAN_FEATURES.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                      {ALL_PLAN_FEATURES.map((feat) => {
                        const isEnabled = features.includes(feat.key);
                        return (
                          <span
                            key={feat.key}
                            title={feat.description}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isEnabled
                                ? 'bg-volt/10 text-volt border border-volt/20'
                                : 'bg-aco/30 text-muted/50 border border-aco/20 line-through'
                            }`}
                          >
                            {isEnabled ? <Check size={10} /> : <X size={10} />}
                            {feat.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-aco/30 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleQuickToggleActive(plan)}
                      className={`px-3 py-1.5 rounded-btn text-xs font-medium border transition-colors ${
                        plan.is_active
                          ? 'border-semantic-error/30 text-semantic-error hover:bg-semantic-error/10'
                          : 'border-volt/30 text-volt hover:bg-volt/10'
                      }`}
                    >
                      {plan.is_active ? 'Desativar' : 'Ativar'}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(plan)}
                      className="px-3.5 py-1.5 bg-aco/60 hover:bg-aco text-white font-medium rounded-btn text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 size={13} />
                      <span>Editar Plano & Recursos</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Plano */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-grafite border border-aco rounded-card max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-aco/40 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="text-volt" size={20} />
                  {isEditing ? `Editar Plano: ${formName}` : 'Criar Novo Plano Comercial'}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Configure limites e a matriz de funcionalidades liberadas para as oficinas clientes.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-texto hover:bg-aco/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-btn text-xs text-semantic-error flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Informações Gerais */}
              <div className="space-y-4">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-volt flex items-center gap-1.5">
                  <Info size={14} /> Dados Comerciais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Nome do Plano *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Profissional"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Identificador Único (Slug) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      placeholder="Ex: profissional"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-texto mb-1">
                    Descrição Comercial
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descrição para exibição na proposta e painel do cliente..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 69,90"
                      value={formPriceReais}
                      onChange={(e) => setFormPriceReais(e.target.value)}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Intervalo de Cobrança
                    </label>
                    <select
                      value={formInterval}
                      onChange={(e) => setFormInterval(e.target.value as any)}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Disponibilidade
                    </label>
                    <select
                      value={formIsActive ? 'true' : 'false'}
                      onChange={(e) => setFormIsActive(e.target.value === 'true')}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    >
                      <option value="true">Plano Ativo (Aberto)</option>
                      <option value="false">Plano Inativo (Oculto)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Limites e Cotas */}
              <div className="space-y-4 pt-4 border-t border-aco/30">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-volt flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Quotas e Limites Operacionais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Máx. Usuários / Colaboradores
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={formLimits.max_users}
                      onChange={(e) =>
                        setFormLimits({ ...formLimits, max_users: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                    <span className="text-[10px] text-muted">Bloqueia cadastros adicionais na API.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Máx. Filiais / Unidades
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formLimits.max_units}
                      onChange={(e) =>
                        setFormLimits({ ...formLimits, max_units: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                    <span className="text-[10px] text-muted">Controle de multi-lojas.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Máx. Ordens de Serviço / Mês
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={999999}
                      value={formLimits.max_work_orders_per_month}
                      onChange={(e) =>
                        setFormLimits({
                          ...formLimits,
                          max_work_orders_per_month: parseInt(e.target.value, 10) || 100,
                        })
                      }
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                    <span className="text-[10px] text-muted">Franquia mensal de OS.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Armazenamento MinIO (MB)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1024000}
                      step={1}
                      value={formLimits.max_storage_mb}
                      onChange={(e) =>
                        setFormLimits({
                          ...formLimits,
                          max_storage_mb: parseInt(e.target.value, 10) || 1024,
                        })
                      }
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                    <span className="text-[10px] text-muted">
                      Ex: 1024 (1 GB), 2048 (2 GB), 10240 (10 GB).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      Mensagens WhatsApp / Mês
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={formLimits.max_whatsapp_messages_per_month}
                      onChange={(e) =>
                        setFormLimits({
                          ...formLimits,
                          max_whatsapp_messages_per_month: parseInt(e.target.value, 10) || 200,
                        })
                      }
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                    <span className="text-[10px] text-muted">Teto de avisos transacionais.</span>
                  </div>
                </div>
              </div>

              {/* Matriz de Funcionalidades (Feature Flags / Entitlements) */}
              <div className="space-y-4 pt-4 border-t border-aco/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-volt flex items-center gap-1.5">
                      <Sparkles size={14} /> Matriz de Funcionalidades (Feature Flags)
                    </h4>
                    <p className="text-[11px] text-muted">
                      Selecione quais capacidades do software este plano desbloqueia para as oficinas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormFeatures(ALL_PLAN_FEATURES.map((f) => f.key))}
                      className="text-[11px] text-volt hover:underline"
                    >
                      Marcar Todas
                    </button>
                    <span className="text-muted text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => setFormFeatures([])}
                      className="text-[11px] text-muted hover:underline"
                    >
                      Desmarcar Todas
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-semantic-alert/10 border border-semantic-alert/30 rounded-card text-xs text-semantic-alert flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Propagação Imediata:</strong> Desmarcar qualquer funcionalidade bloqueará em tempo real o acesso dos colaboradores da oficina às rotas correspondentes (HTTP 403 FEATURE_DISABLED).
                  </span>
                </div>

                {/* Categorias de Recursos */}
                {(['operacional', 'financeiro', 'comunicacao', 'avancado'] as const).map(
                  (categoryKey) => {
                    const categoryTitle =
                      categoryKey === 'operacional'
                        ? '⚙️ Operacional & Centro Automotivo'
                        : categoryKey === 'financeiro'
                        ? '💰 Financeiro, Fiscal & Estoque'
                        : categoryKey === 'comunicacao'
                        ? '💬 Comunicação, WhatsApp & Portal do Cliente'
                        : '🚀 Diferenciais, Escala & White-Label';

                    const categoryFeatures = ALL_PLAN_FEATURES.filter(
                      (f) => f.category === categoryKey
                    );

                    return (
                      <div key={categoryKey} className="space-y-2">
                        <div className="text-[11px] font-semibold text-white uppercase tracking-wider border-b border-aco/20 pb-1">
                          {categoryTitle}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {categoryFeatures.map((feat) => {
                            const isChecked = formFeatures.includes(feat.key);
                            return (
                              <label
                                key={feat.key}
                                onClick={() => handleToggleFeature(feat.key)}
                                className={`flex items-start gap-3 p-3 rounded-card border cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-volt/5 border-volt/40 text-white'
                                    : 'bg-asfalto/50 border-aco/30 text-muted hover:border-aco'
                                }`}
                              >
                                <div className="mt-0.5">
                                  {isChecked ? (
                                    <div className="w-4 h-4 rounded bg-volt text-asfalto flex items-center justify-center font-bold">
                                      <Check size={12} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded border border-aco" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold leading-tight flex items-center justify-between">
                                    <span className={isChecked ? 'text-white' : 'text-texto'}>
                                      {feat.label}
                                    </span>
                                    <span className="font-mono text-[9px] text-muted">
                                      {feat.key}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted mt-1 leading-normal">
                                    {feat.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-aco/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-btn text-xs font-medium bg-aco/40 hover:bg-aco text-texto transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-btn text-xs font-bold bg-volt hover:bg-volt/90 text-asfalto flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-volt/20"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isEditing ? 'Salvar Alterações do Plano' : 'Criar Plano Comercial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

