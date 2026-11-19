import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  ArrowUpRight,
  ChevronRight,
  Receipt,
  Building2,
  Users,
  Zap,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { toast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import ModalPagamentoPixSaaS from '../components/features/ModalPagamentoPixSaaS';

export const AssinaturaSaaS: React.FC = () => {
  const { profile } = useAuth();
  const { name: lojaName } = useBrand();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  // Modal PIX
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusData, invoicesData, plansData] = await Promise.all([
        api.billing.getStatus().catch(() => null),
        api.billing.getInvoices().catch(() => []),
        api.billing.listPlans().catch(() => []),
      ]);

      if (statusData) setBillingStatus(statusData);
      if (invoicesData) setInvoices(invoicesData);
      if (plansData) {
        setAvailablePlans(plansData);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados de faturamento:', err);
      toast.error('Falha ao carregar status de assinatura da oficina.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchBillingData();
    setRefreshing(false);
    toast.success('Status da assinatura atualizado com sucesso!');
  };

  const handleOpenPixModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPixModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchBillingData();
  };

  const handleChangePlan = async (targetPlan: any) => {
    const isUpgrade = (targetPlan.price_cents || targetPlan.priceCents) > (currentPlan?.priceCents || currentPlan?.price_cents || 0);
    const actionLabel = isUpgrade ? 'Upgrade' : 'Migração';

    const confirmed = await confirmDialog(
      `Confirmar ${actionLabel} de Plano`,
      `Deseja migrar a oficina para o plano "${targetPlan.name}" por ${formatBRL(targetPlan.price_cents || targetPlan.priceCents)}/mês?\n\nOs novos limites e recursos serão aplicados imediatamente.`,
      `Sim, migrar para ${targetPlan.name}`,
      'Cancelar'
    );

    if (!confirmed) return;

    setChangingPlan(targetPlan.slug);
    try {
      await api.billing.changePlan(targetPlan.slug);
      toast.success(`Plano alterado para ${targetPlan.name} com sucesso!`);
      await fetchBillingData();
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao alterar plano contratado.');
    } finally {
      setChangingPlan(null);
    }
  };

  const formatBRL = (cents: number) => {
    return ((cents || 0) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading && !billingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#C8F52E]/20 border-t-[#C8F52E] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Carregando dados da sua licença CarX...
        </p>
      </div>
    );
  }

  const currentPlan = billingStatus?.plan;
  const contract = billingStatus?.contract;
  const isBlocked = billingStatus?.is_blocked;
  const isGracePeriod = billingStatus?.is_grace_period;
  const remainingGrace = billingStatus?.remaining_grace_days ?? 5;
  const daysOverdue = billingStatus?.days_overdue ?? 0;
  const activeInvoices = billingStatus?.active_invoices || [];
  const primaryPendingInvoice = activeInvoices.length > 0 ? activeInvoices[0] : null;

  return (
    <div className="w-full space-y-6 pb-20 font-sans text-[#0E1116]">
      {/* 1. Header do Gestor */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E1E6EC] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">
              Assinatura &amp; Licença SaaS
            </h1>
            <span className="text-[10px] font-display font-black uppercase px-2.5 py-0.5 rounded-full bg-[#0E1116] text-[#C8F52E] border border-[#C8F52E]/30 tracking-wider">
              {contract?.status === 'trialing' ? 'Período de Teste' : isBlocked ? 'Bloqueio Ativo' : 'Licença Regular'}
            </span>
          </div>
          <p className="text-sm text-[#5B6674] mt-0.5">
            Acompanhe seu plano ativo, carência de faturas, quitação via PIX instantâneo e gestão de quotas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-10 px-4 rounded-xl bg-white border border-[#E1E6EC] hover:bg-slate-50 text-[#0E1116] text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0E1116]' : ''}`} />
            <span>Atualizar Status</span>
          </button>
        </div>
      </div>

      {/* 2. Banners Informativos de Carência ou Bloqueio */}
      {isBlocked ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-950 font-display">
                Assinatura em Modo Somente Leitura (Bloqueio Gradual)
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                O prazo de tolerância de 5 dias expirou ({daysOverdue} dias de atraso). Novos agendamentos e abertura de OS foram temporariamente suspensos. Seus veículos, clientes e relatórios continuam seguros. Efetue o pagamento via PIX para <strong>desbloqueio imediato</strong>.
              </p>
            </div>
          </div>
          {primaryPendingInvoice && (
            <button
              type="button"
              onClick={() => handleOpenPixModal(primaryPendingInvoice)}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Desbloquear via PIX</span>
            </button>
          )}
        </div>
      ) : isGracePeriod ? (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-950 font-display">
                Fatura Vencida — Período de Tolerância Ativo
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Você possui uma mensalidade em aberto há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}. Restam <strong>{remainingGrace} {remainingGrace === 1 ? 'dia' : 'dias'}</strong> de tolerância sem interrupção de nenhum serviço ou agendamento.
              </p>
            </div>
          </div>
          {primaryPendingInvoice && (
            <button
              type="button"
              onClick={() => handleOpenPixModal(primaryPendingInvoice)}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-[#0E1116] font-display font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Pagar Mensalidade com PIX</span>
            </button>
          )}
        </div>
      ) : null}

      {/* 3. Cards Superiores: Plano Ativo & Fatura Aberta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card do Plano Atual */}
        <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-7 text-white shadow-md lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262D35] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center text-[#C8F52E]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Plano Ativo da Oficina
                  </span>
                  <h2 className="text-2xl font-display font-black text-white tracking-tight">
                    Plano {currentPlan?.name || 'Essencial'}
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30">
                {contract?.status === 'trialing' ? 'Trial Gratuito' : 'Contrato Ativo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-[#0E1116] border border-[#262D35]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Valor da Assinatura
                </span>
                <span className="font-display font-black text-2xl text-white">
                  {formatBRL(currentPlan?.priceCents || currentPlan?.price_cents || 0)}
                  <span className="text-xs font-normal text-slate-400">/mês</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1116] border border-[#262D35]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Validade da Licença
                </span>
                <span className="font-display font-bold text-sm text-slate-200 block">
                  {contract?.expires_at
                    ? new Date(contract.expires_at).toLocaleDateString('pt-BR')
                    : 'Renovação Mensal'}
                </span>
                <span className="text-[11px] text-[#C8F52E] font-medium mt-1 block">
                  {contract?.days_remaining ?? 30} dias restantes
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1116] border border-[#262D35]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Forma de Cobrança
                </span>
                <span className="font-display font-bold text-sm text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#C8F52E]" /> PIX Automático
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Liquidação EMV Bacen
                </span>
              </div>
            </div>

            {/* Quotas do Plano */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
                Uso Atual vs. Limites Contratados:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#262D35]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Colaboradores</span>
                  <span className="text-white font-extrabold text-sm">
                    {currentPlan?.usage?.users || 1} / {currentPlan?.limits?.max_users || 3}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#262D35]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Unidades</span>
                  <span className="text-white font-extrabold text-sm">
                    {currentPlan?.usage?.units || 1} / {currentPlan?.limits?.max_units || 1}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#262D35]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">OS / Mês</span>
                  <span className="text-white font-extrabold text-sm">
                    {currentPlan?.limits?.workOrdersMonthly ? `${currentPlan.limits.workOrdersMonthly} OS` : 'Ilimitado'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1116] border border-[#262D35]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Armazenamento</span>
                  <span className="text-white font-extrabold text-sm">
                    {currentPlan?.limits?.max_storage_mb ? `${Math.round(currentPlan.limits.max_storage_mb / 1024)} GB` : '1 GB'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Fatura Pendente / Quitação */}
        <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262D35] pb-4 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C8F52E]" /> Próxima Fatura
              </span>
              {primaryPendingInvoice ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Em Aberto
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Em Dia
                </span>
              )}
            </div>

            {primaryPendingInvoice ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Valor a Pagar
                  </span>
                  <span className="font-display font-black text-3xl text-white">
                    {formatBRL(primaryPendingInvoice.amount_cents)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0E1116] border border-[#262D35] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vencimento:</span>
                    <span className="font-bold text-white">
                      {new Date(primaryPendingInvoice.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-amber-400 capitalize">
                      {daysOverdue > 0 ? `Vencida há ${daysOverdue} dia(s)` : 'Aguardando Pagamento'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pague com PIX dinâmico com conciliação automática em menos de 10 segundos.
                </p>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white">Tudo em dia!</h4>
                <p className="text-xs text-slate-300">
                  Não existem mensalidades pendentes no momento. A sua próxima fatura será gerada automaticamente ao final do ciclo contratado.
                </p>
              </div>
            )}
          </div>

          {primaryPendingInvoice && (
            <button
              type="button"
              onClick={() => handleOpenPixModal(primaryPendingInvoice)}
              className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Pagar Fatura com PIX</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Grade de Comparativo de Planos para Upgrade / Downgrade */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0E1116] tracking-tight">
            Planos Comerciais CarX
          </h2>
          <p className="text-xs text-[#5B6674] mt-0.5">
            Faça upgrade ou ajuste sua assinatura de acordo com o crescimento da sua oficina.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
          {availablePlans
            .filter((p) => p.is_active !== false && p.slug !== 'premium')
            .map((p) => {
            const isCurrent = currentPlan?.slug === p.slug;
            const isPopular = p.slug === 'profissional';
            const priceFormatted = formatBRL(p.price_cents || p.priceCents);

            return (
              <div
                key={p.id}
                className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'bg-[#171C24] text-white border-2 border-[#C8F52E] shadow-xl'
                    : isPopular
                    ? 'bg-white text-[#0E1116] border-2 border-[#0E1116] shadow-md'
                    : 'bg-white text-[#0E1116] border border-[#E1E6EC] shadow-sm'
                }`}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0E1116] text-[#C8F52E] font-display font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C8F52E]" />
                    <span>Mais Escolhido</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tight">
                      {p.name}
                    </h3>
                    {isCurrent && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#C8F52E] text-[#0E1116]">
                        Plano Atual
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mb-5 ${isCurrent ? 'text-slate-300' : 'text-[#5B6674]'}`}>
                    {p.description || (p.slug === 'essencial' ? 'Ideal para profissionais autônomos e estúdios individuais.' : 'Para centros automotivos com equipe e alto volume de produção.')}
                  </p>

                  <div className="mb-6">
                    <span className="font-display font-black text-4xl">
                      {priceFormatted}
                    </span>
                    <span className={`text-xs ml-1 font-semibold ${isCurrent ? 'text-slate-400' : 'text-[#5B6674]'}`}>/mês</span>
                  </div>

                  {/* Lista de Recursos Estruturada por Plano */}
                  <div className="space-y-3 mb-8 text-xs">
                    {p.slug === 'essencial' ? (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>1 Usuário</strong> (Dono / Operador individual)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>Ordens de serviço ilimitadas</strong></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Orçamentos com proposta online e Pix de sinal</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Vistoria e Checklist VCR Touch com fotos</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>WhatsApp manual direto via wa.me (sem custo)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Armazenamento MinIO: <strong>2 GB de fotos</strong></span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Até <strong>5 colaboradores simultâneos</strong></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>App do Operador móvel</strong> no box com cronômetro</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>Ordens de serviço ilimitadas</strong></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>Link de Agendamento Online</strong> da loja (Vitrine)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Cálculo de <strong>Comissões de técnicos</strong> por serviço</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Controle de bobinas de PPF/películas e insumos</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span><strong>Certificado de Garantia Digital</strong> e Passaporte QR</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>CRM de Pós-Venda, Revisões e Pesquisa NPS</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Monitor TV da Loja (Pátio em tempo real)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Disparo de WhatsApp Automático</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C8F52E]' : 'text-emerald-600'}`} />
                          <span>Armazenamento MinIO: <strong>10 GB de fotos</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-2xl bg-[#0E1116] border border-[#262D35] text-slate-400 font-bold text-xs uppercase tracking-wider cursor-not-allowed"
                    >
                      Seu Plano Atual
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleChangePlan(p)}
                      disabled={changingPlan === p.slug}
                      className={`w-full py-3.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isPopular
                          ? 'bg-[#0E1116] hover:bg-black text-[#C8F52E] shadow-md'
                          : 'bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] shadow-sm'
                      }`}
                    >
                      {changingPlan === p.slug ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      <span>Migrar para o {p.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Histórico Completo de Faturas */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0E1116] tracking-tight">
            Histórico Financeiro da Assinatura
          </h2>
          <p className="text-xs text-[#5B6674] mt-0.5">
            Registro de faturas emitidas, comprovantes e quitações via PIX.
          </p>
        </div>

        <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma fatura registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E1E6EC] bg-slate-50/70 text-[#5B6674] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">Identificador</th>
                    <th className="py-3.5 px-6">Valor</th>
                    <th className="py-3.5 px-6">Vencimento</th>
                    <th className="py-3.5 px-6">Data Quitação</th>
                    <th className="py-3.5 px-6">Forma</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6EC]">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const isPending = inv.status === 'pending';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6 font-mono font-bold text-[#0E1116]">
                          #{inv.id.slice(0, 8)}
                        </td>
                        <td className="py-4 px-6 font-bold text-[#0E1116]">
                          {formatBRL(inv.amount_cents)}
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {new Date(inv.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-4 px-6 uppercase text-[11px] font-bold text-slate-600">
                          {inv.payment_method || 'PIX'}
                        </td>
                        <td className="py-4 px-6">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                              <Check className="w-3 h-3" /> Pago
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                              {inv.status}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleOpenPixModal(inv)}
                              className="px-3 py-1.5 rounded-xl bg-[#0E1116] hover:bg-black text-[#C8F52E] font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Pagar PIX</span>
                            </button>
                          )}
                          {isPaid && (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                              <Receipt className="w-3 h-3" /> Recibo OK
                            </span>
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
      </div>

      {/* Modal Pagamento PIX SaaS */}
      {selectedInvoice && (
        <ModalPagamentoPixSaaS
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          invoice={selectedInvoice}
          billingStatus={billingStatus}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default AssinaturaSaaS;
