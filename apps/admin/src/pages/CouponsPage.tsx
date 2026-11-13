import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  CouponDto,
  CreateCouponDto,
  CouponDiscountType,
  AdminPlanDto,
} from '@carx/shared';
import {
  Ticket,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Percent,
  Clock,
  Layers,
  Building2,
  Trash2,
  Gift,
  DollarSign,
  Tag,
} from 'lucide-react';

export function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [plans, setPlans] = useState<AdminPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<CouponDiscountType>('promotional_price');
  const [formValueInput, setFormValueInput] = useState('49,90');
  const [formDurationMonths, setFormDurationMonths] = useState<number | ''>(3);
  const [formMaxUses, setFormMaxUses] = useState<number | ''>(50);
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formApplicablePlans, setFormApplicablePlans] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [couponsData, plansData] = await Promise.all([
        adminApi.listCoupons(),
        adminApi.listPlans().catch(() => []),
      ]);
      setCoupons(couponsData);
      setPlans(plansData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenCreateModal = () => {
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('promotional_price');
    setFormValueInput('49,90');
    setFormDurationMonths(3);
    setFormMaxUses(50);
    setFormValidUntil('');
    setFormApplicablePlans([]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleTogglePlan = (slug: string) => {
    setFormApplicablePlans((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
    );
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    let discountValue: number;
    if (formDiscountType === 'percentage') {
      discountValue = parseInt(formValueInput, 10) || 0;
    } else if (formDiscountType === 'free_months') {
      discountValue = 100; // 100% off
    } else {
      const clean = parseFloat(formValueInput.replace(/\./g, '').replace(',', '.'));
      discountValue = Math.round((clean || 0) * 100);
    }

    try {
      const payload: CreateCouponDto = {
        code: formCode.toUpperCase().trim(),
        description: formDescription,
        discount_type: formDiscountType,
        discount_value: discountValue,
        duration_months: formDurationMonths === '' ? null : Number(formDurationMonths),
        max_uses: formMaxUses === '' ? null : Number(formMaxUses),
        valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
        applicable_plan_slugs: formApplicablePlans,
      };

      const created = await adminApi.createCoupon(payload);
      setSuccessMsg(`Cupom "${created.code}" criado com sucesso!`);
      setModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Falha ao criar cupom');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateCoupon = async (id: string, code: string) => {
    if (!confirm(`Tem certeza que deseja revogar o cupom "${code}"?`)) return;

    try {
      await adminApi.deleteCoupon(id);
      setSuccessMsg(`Cupom "${code}" desativado com sucesso.`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao desativar cupom');
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(search.toLowerCase()) ||
      (coupon.description && coupon.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'active') return coupon.is_active;
    if (filter === 'inactive') return !coupon.is_active;
    return true;
  });

  const activeCouponsCount = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((acc, curr) => acc + (curr.current_uses || 0), 0);
  const tempPromoCount = coupons.filter((c) => c.duration_months && c.duration_months > 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Ticket className="text-volt" size={24} />
            Cupons de Desconto & Ofertas Promocionais
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Criação e governança de campanhas comerciais (3 meses por R$ XX, carência gratuita, percentual ou fixo).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Recarregar cupons"
            className="p-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-muted hover:text-texto transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 bg-volt hover:bg-volt/90 text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-volt/20"
          >
            <Plus size={16} />
            <span>Novo Cupom Promocional</span>
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
            Cupons Ativos
          </div>
          <div className="font-display text-2xl font-bold text-volt">
            {activeCouponsCount} <span className="text-xs text-muted font-normal">/ {coupons.length} total</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Disponíveis para validação no checkout</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Total de Resgates
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {totalRedemptions}
          </div>
          <p className="text-[11px] text-muted mt-2">Oficinas que ativaram cupons no cadastro</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Ofertas Temporárias
          </div>
          <div className="font-display text-2xl font-bold text-semantic-alert">
            {tempPromoCount} <span className="text-xs text-muted font-normal">cupons</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Campanhas com período fixo (ex: 3 meses)</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Planos Cobertos
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {plans.length} <span className="text-xs text-muted font-normal">planos</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Elegíveis para aplicação de desconto</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-grafite border border-aco/50 rounded-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-muted" size={15} />
          <input
            type="text"
            placeholder="Buscar por código ou descrição do cupom..."
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

      {/* Tabela de Cupons */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted text-xs flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-volt" size={24} />
            <span>Carregando cupons cadastrados...</span>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-muted text-xs">
            Nenhum cupom promocional encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                  <th className="py-3 px-4">Código / Identificador</th>
                  <th className="py-3 px-4">Regra Promocional</th>
                  <th className="py-3 px-4">Duração</th>
                  <th className="py-3 px-4">Planos Aplicáveis</th>
                  <th className="py-3 px-4 text-center">Resgates</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aco/20">
                {filteredCoupons.map((c) => {
                  const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                  const isExhausted = c.max_uses && c.current_uses >= c.max_uses;

                  let ruleLabel = '';
                  if (c.discount_type === 'free_months') {
                    ruleLabel = `${c.duration_months || 1} Mês(es) Grátis (100% OFF)`;
                  } else if (c.discount_type === 'promotional_price') {
                    ruleLabel = `Mensalidade a ${formatCurrency(c.discount_value)}/mês`;
                  } else if (c.discount_type === 'percentage') {
                    ruleLabel = `${c.discount_value}% de desconto`;
                  } else if (c.discount_type === 'fixed_amount') {
                    ruleLabel = `${formatCurrency(c.discount_value)} de abatimento`;
                  }

                  return (
                    <tr key={c.id} className="hover:bg-aco/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-volt tracking-wider bg-asfalto px-2.5 py-1 rounded border border-aco">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            title="Copiar código"
                            className="p-1 rounded text-muted hover:text-white transition-colors"
                          >
                            {copiedCode === c.code ? (
                              <Check size={14} className="text-volt" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                        {c.description && (
                          <div className="text-[11px] text-muted mt-1 max-w-xs truncate">
                            {c.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {c.discount_type === 'free_months' && (
                            <Gift size={13} className="text-volt" />
                          )}
                          {c.discount_type === 'promotional_price' && (
                            <Sparkles size={13} className="text-semantic-alert" />
                          )}
                          {c.discount_type === 'percentage' && (
                            <Percent size={13} className="text-volt" />
                          )}
                          {c.discount_type === 'fixed_amount' && (
                            <DollarSign size={13} className="text-white" />
                          )}
                          <span>{ruleLabel}</span>
                        </div>
                        <div className="text-[10px] text-muted capitalize">
                          Tipo: {c.discount_type.replace('_', ' ')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-texto">
                        {c.duration_months
                          ? `${c.duration_months} meses`
                          : 'Primeira cobrança'}
                      </td>

                      <td className="py-3.5 px-4">
                        {c.applicable_plan_slugs && c.applicable_plan_slugs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {c.applicable_plan_slugs.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-aco/60 text-texto uppercase font-mono font-semibold"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted italic">Todos os planos</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-semibold text-white">
                            {c.current_uses}{' '}
                            <span className="text-muted font-normal text-[10px]">
                              / {c.max_uses ? c.max_uses : '∞'}
                            </span>
                          </span>
                          {c.max_uses && (
                            <div className="w-16 h-1.5 bg-aco rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-volt rounded-full"
                                style={{
                                  width: `${Math.min(100, (c.current_uses / c.max_uses) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {!c.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-aco text-muted">
                            Inativo
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
                            Expirado
                          </span>
                        ) : isExhausted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
                            Esgotado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
                            Ativo
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {c.is_active && (
                          <button
                            onClick={() => handleDeactivateCoupon(c.id, c.code)}
                            className="px-2.5 py-1 rounded-btn bg-semantic-error/10 hover:bg-semantic-error/20 text-semantic-error text-[11px] font-medium transition-colors"
                          >
                            Revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Cupom */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-grafite border border-aco rounded-card max-w-xl w-full flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-aco/40 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Ticket className="text-volt" size={20} />
                  Criar Novo Cupom Promocional
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Defina o código, modelo da campanha e tempo de vigência da promoção.
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
            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-btn text-xs text-semantic-error flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-texto mb-1">
                    Código do Cupom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 3MESESPRO"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt font-mono uppercase"
                  />
                  <span className="text-[10px] text-muted">
                    Alfanumérico (sem espaços ou símbolos).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-texto mb-1">
                    Modelo de Oferta *
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                  >
                    <option value="promotional_price">Preço Promocional Fixo (ex: R$ 49/mês)</option>
                    <option value="free_months">Meses Grátis / Carência (100% OFF)</option>
                    <option value="percentage">Desconto Percentual (% OFF)</option>
                    <option value="fixed_amount">Abatimento Fixo (R$ OFF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Descrição Interna da Campanha
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha de Lançamento para Centros Automotivos de SP"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formDiscountType !== 'free_months' && (
                  <div>
                    <label className="block text-xs font-medium text-texto mb-1">
                      {formDiscountType === 'percentage'
                        ? 'Porcentagem (%) *'
                        : formDiscountType === 'promotional_price'
                        ? 'Preço Promocional (R$) *'
                        : 'Valor de Abatimento (R$) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formDiscountType === 'percentage' ? '50' : '49,90'}
                      value={formValueInput}
                      onChange={(e) => setFormValueInput(e.target.value)}
                      className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-texto mb-1">
                    Duração da Oferta (Meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    placeholder="3"
                    value={formDurationMonths}
                    onChange={(e) =>
                      setFormDurationMonths(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                  />
                  <span className="text-[10px] text-muted">Ex: 3 meses promocionais.</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-texto mb-1">
                    Limite Máximo de Resgates
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ilimitado"
                    value={formMaxUses}
                    onChange={(e) =>
                      setFormMaxUses(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                  />
                  <span className="text-[10px] text-muted">Vazio = sem teto.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Data Limite de Expiração (Opcional)
                </label>
                <input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="w-full bg-asfalto border border-aco rounded-btn px-3 py-2 text-xs text-white focus:outline-none focus:border-volt"
                />
              </div>

              {/* Planos Elegíveis */}
              <div>
                <label className="block text-xs font-medium text-texto mb-1.5">
                  Planos Elegíveis (Deixe desmarcado para aplicar a todos)
                </label>
                <div className="flex flex-wrap gap-2">
                  {plans.map((p) => {
                    const isChecked = formApplicablePlans.includes(p.slug);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleTogglePlan(p.slug)}
                        className={`px-3 py-1.5 rounded-btn text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          isChecked
                            ? 'bg-volt/10 border-volt text-volt font-semibold'
                            : 'bg-asfalto border-aco/50 text-muted hover:border-aco hover:text-texto'
                        }`}
                      >
                        {isChecked && <Check size={12} />}
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
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
                  <span>Criar Cupom Promocional</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

