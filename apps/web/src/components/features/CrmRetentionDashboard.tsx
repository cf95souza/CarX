import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Clock,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  Percent,
  Plus,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Calendar,
  Filter,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  CrmRetentionOverviewDto,
  WarrantyRevisionItemDto,
  InactiveCustomerItemDto,
  CrmRetentionRuleDto,
  RetentionContactItemDto,
} from '@carx/shared';

export const CrmRetentionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'warranties' | 'inactive' | 'rules' | 'history'>(
    'warranties'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<CrmRetentionOverviewDto | null>(null);
  const [revisions, setRevisions] = useState<WarrantyRevisionItemDto[]>([]);
  const [inactiveCustomers, setInactiveCustomers] = useState<InactiveCustomerItemDto[]>([]);
  const [rules, setRules] = useState<CrmRetentionRuleDto[]>([]);
  const [contacts, setContacts] = useState<RetentionContactItemDto[]>([]);

  // Filtro de inatividade
  const [inactivityFilter, setInactivityFilter] = useState<'all' | '90_days' | '180_days' | '365_days_plus'>('all');

  // Estado do Modal de Envio / WhatsApp
  const [contactModalOpen, setContactModalOpen] = useState<boolean>(false);
  const [targetCustomer, setTargetCustomer] = useState<{
    id: string;
    name: string;
    phone: string | null;
    plate?: string | null;
    model?: string | null;
    warrantyId?: string | null;
    serviceName?: string | null;
  } | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [couponDaysValid, setCouponDaysValid] = useState<number>(30);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [sendingContact, setSendingContact] = useState<boolean>(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const [lastGeneratedCoupon, setLastGeneratedCoupon] = useState<string | null>(null);

  // Estado do Modal de Conversão
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [conversionRevenue, setConversionRevenue] = useState<string>('350.00');
  const [conversionNotes, setConversionNotes] = useState<string>('Retornou e agendou revisão com cupom');
  const [converting, setConverting] = useState<boolean>(false);

  // Estado do Modal de Nova Regra
  const [ruleModalOpen, setRuleModalOpen] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleCategory, setNewRuleCategory] = useState<string>('ppf');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'warranty_revision' | 'service_interval' | 'customer_inactivity'>('service_interval');
  const [newRuleDays, setNewRuleDays] = useState<number>(180);
  const [newRuleDiscount, setNewRuleDiscount] = useState<number>(10);
  const [newRuleTemplate, setNewRuleTemplate] = useState<string>(
    'Olá, {cliente}! Já fazem {dias} dias desde o último cuidado com seu {veiculo}. Use o cupom {cupom_codigo} para ganhar {cupom_beneficio} na sua próxima visita!'
  );
  const [savingRule, setSavingRule] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ov, revs, inacts, rls, cnts] = await Promise.all([
        api.crm.getOverview().catch(() => null),
        api.crm.getWarrantyRevisions().catch(() => []),
        api.crm.getInactiveCustomers().catch(() => []),
        api.crm.getRules().catch(() => []),
        api.crm.getContacts().catch(() => []),
      ]);

      setOverview(ov);
      setRevisions(revs || []);
      setInactiveCustomers(inacts || []);
      setRules(rls || []);
      setContacts(cnts || []);
    } catch (err) {
      console.error('Erro ao carregar dados de CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openTriggerModal = (item: {
    id: string;
    name: string;
    phone: string | null;
    plate?: string | null;
    model?: string | null;
    warrantyId?: string | null;
    serviceName?: string | null;
    suggestedDiscount?: number;
  }) => {
    setTargetCustomer(item);
    setDiscountPercent(item.suggestedDiscount || 15);
    setLastGeneratedUrl(null);
    setLastGeneratedCoupon(null);
    setCustomMessage('');
    setContactModalOpen(true);
  };

  const handleSendContact = async () => {
    if (!targetCustomer) return;
    try {
      setSendingContact(true);
      const result = await api.crm.triggerContact({
        customerId: targetCustomer.id,
        channel: 'whatsapp',
        vehicleId: undefined,
        warrantyId: targetCustomer.warrantyId || undefined,
        discountPercent,
        couponDaysValid,
        customMessage: customMessage.trim() || undefined,
      });

      setLastGeneratedUrl(result.whatsappUrl);
      setLastGeneratedCoupon(result.couponCode);

      // Abrir o WhatsApp em nova aba
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      await loadData();
    } catch (err: any) {
      alert(`Falha ao disparar contato: ${err.message || 'Erro inesperado'}`);
    } finally {
      setSendingContact(false);
    }
  };

  const handleConvertContact = async () => {
    if (!selectedContactId) return;
    try {
      setConverting(true);
      const revenueCents = Math.round(parseFloat(conversionRevenue.replace(',', '.')) * 100) || 0;
      await api.crm.convertContact(selectedContactId, {
        conversionRevenueCents: revenueCents,
        notes: conversionNotes,
      });
      setConvertModalOpen(false);
      setSelectedContactId(null);
      await loadData();
    } catch (err: any) {
      alert(`Falha ao converter contato: ${err.message || 'Erro'}`);
    } finally {
      setConverting(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      setSavingRule(true);
      await api.crm.createRule({
        name: newRuleName,
        serviceCategory: newRuleCategory,
        triggerType: newRuleTrigger,
        intervalDays: Number(newRuleDays),
        channel: 'whatsapp',
        discountType: 'percentage',
        discountValue: Number(newRuleDiscount),
        messageTemplate: newRuleTemplate,
      });
      setRuleModalOpen(false);
      setNewRuleName('');
      await loadData();
    } catch (err: any) {
      alert(`Falha ao criar regra: ${err.message || 'Erro'}`);
    } finally {
      setSavingRule(false);
    }
  };

  const filteredInactive = inactiveCustomers.filter((c) => {
    if (inactivityFilter === 'all') return true;
    return c.inactivityTier === inactivityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                CRM de Retenção & Pós-Venda
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                  Retenção Ativa
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Fidelização inteligente, revisões periódicas de PPF e vitrificação, cupons dinâmicos e prevenção de churn.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setRuleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Nova Régua
          </button>
        </div>
      </div>

      {/* 4 Cards de Métricas Estratégicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Recompra */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Recompra</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {overview?.repurchaseRatePercent ?? 0}%
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">Recorrência Anual</span> de clientes na oficina
          </p>
        </div>

        {/* Revisões de Garantia Pendentes */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Revisões Preventivas</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {overview?.pendingWarrantyRevisionsCount ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            PPF e Vitrificação vencendo em 30d
          </p>
        </div>

        {/* Radar Anti-Churn / Inativos */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Radar Anti-Churn</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-400">
            {(overview?.inactiveCustomersCount ?? 0) + (overview?.dormantCustomersCount ?? 0)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            Clientes sem visita há mais de 180 dias
          </p>
        </div>

        {/* Receita Recuperada via Retenção */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-sky-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Receita por Retenção</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-sky-400">
            {((overview?.convertedRevenueCents ?? 0) / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-sky-400 font-semibold">{overview?.convertedContactsCount ?? 0} retornos</span> convertidos ({overview?.conversionRatePercent ?? 0}%)
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('warranties')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'warranties'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Revisões de Garantia ({revisions.length})
        </button>

        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'inactive'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Radar de Clientes Inativos ({inactiveCustomers.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Réguas de Automação ({rules.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Histórico de Disparos ({contacts.length})
        </button>
      </div>

      {/* ABA 1: Revisões de Garantia Periódica */}
      {activeTab === 'warranties' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Revisões Preventivas de Garantia</h2>
              <p className="text-xs text-slate-400">
                Garantias ativas de PPF (6m) e Vitrificação Cerâmica (12m) que necessitam de inspeção técnica preventiva.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {revisions.length} veículo(s) no radar
            </span>
          </div>

          {revisions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm">Nenhuma revisão preventiva com vencimento próximo identificada.</p>
              <p className="text-xs text-slate-600 mt-1">
                À medida que as aplicações completarem 6 ou 12 meses, os veículos aparecerão automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Veículo</th>
                    <th className="px-5 py-3.5">Serviço de Garantia</th>
                    <th className="px-5 py-3.5">Data Prevista</th>
                    <th className="px-5 py-3.5">Status da Revisão</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {revisions.map((rev) => (
                    <tr key={rev.warrantyId} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4 font-medium text-white">
                        <div>{rev.customerName}</div>
                        <div className="text-xs text-slate-500">{rev.customerPhone || 'Sem telefone'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-200">{rev.vehicleModel}</div>
                        <div className="text-xs font-mono text-emerald-400">{rev.vehiclePlate}</div>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-300">
                        {rev.serviceName}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(rev.revisionDueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        {rev.isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Atrasada ({Math.abs(rev.daysRemainingOrOverdue)}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Vence em {rev.daysRemainingOrOverdue}d
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            openTriggerModal({
                              id: rev.customerId,
                              name: rev.customerName,
                              phone: rev.customerPhone,
                              plate: rev.vehiclePlate,
                              model: rev.vehicleModel,
                              warrantyId: rev.warrantyId,
                              serviceName: rev.serviceName,
                              suggestedDiscount: 10,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Chamar no WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: Radar de Clientes Inativos (Anti-Churn) */}
      {activeTab === 'inactive' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Radar de Clientes Inativos</h2>
              <p className="text-xs text-slate-400">
                Identifique clientes em risco de abandono e dispare incentivos com cupons dinâmicos.
              </p>
            </div>

            {/* Filtros de Inatividade */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Faixa:
              </span>
              <select
                value={inactivityFilter}
                onChange={(e) => setInactivityFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas as Faixas</option>
                <option value="90_days">Atenção (90 - 180 dias)</option>
                <option value="180_days">Risco Churn (180 - 365 dias)</option>
                <option value="365_days_plus">Inativo Crítico (&gt; 365 dias)</option>
              </select>
            </div>
          </div>

          {filteredInactive.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm">Nenhum cliente inativo localizado para a faixa selecionada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Último Veículo</th>
                    <th className="px-5 py-3.5">Último Serviço</th>
                    <th className="px-5 py-3.5">Dias sem Visita</th>
                    <th className="px-5 py-3.5">LTV Acumulado</th>
                    <th className="px-5 py-3.5">Cupom Sugerido</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInactive.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4 font-medium text-white">
                        <div>{c.customerName}</div>
                        <div className="text-xs text-slate-500">{c.customerPhone || 'Sem telefone'}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-slate-200">{c.lastVehicleModel || 'N/A'}</div>
                        <div className="font-mono text-emerald-400">{c.lastVehiclePlate || ''}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300">
                        {c.lastServiceName || 'Serviço Automotivo'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.inactivityTier === '365_days_plus'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : c.inactivityTier === '180_days'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {c.daysInactive} dias
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-emerald-400">
                        {(c.lifetimeValueCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                          {c.suggestedDiscountPercent}% OFF
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            openTriggerModal({
                              id: c.customerId,
                              name: c.customerName,
                              phone: c.customerPhone,
                              plate: c.lastVehiclePlate,
                              model: c.lastVehicleModel,
                              serviceName: c.lastServiceName,
                              suggestedDiscount: c.suggestedDiscountPercent,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reativar Cliente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: Réguas de Automação */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Réguas de Retenção Ativas no SaaS</h2>
            <button
              onClick={() => setRuleModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Régua
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 uppercase tracking-wider">
                      {rule.serviceCategory}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {rule.intervalDays} dias
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5">{rule.name}</h3>
                  <p className="text-xs text-slate-400 italic line-clamp-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4">
                    "{rule.messageTemplate}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Desconto sugerido:{' '}
                    <strong className="text-emerald-400">
                      {rule.discountValue}% OFF
                    </strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Ativa
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: Histórico de Disparos e Conversões */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Histórico de Disparos de Retenção</h2>
              <p className="text-xs text-slate-400">
                Acompanhe o engajamento, cupons resgatados e marque retornos convertidos em novas ordens de serviço.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {contacts.length} disparo(s)
            </span>
          </div>

          {contacts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm">Nenhum contato de retenção registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Veículo</th>
                    <th className="px-5 py-3.5">Cupom Emitido</th>
                    <th className="px-5 py-3.5">Data do Envio</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Receita Gerada</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contacts.map((cnt) => (
                    <tr key={cnt.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4 font-medium text-white">
                        <div>{cnt.customerName}</div>
                        <div className="text-xs text-slate-500">{cnt.customerPhone}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-slate-200">{cnt.vehicleModel || 'N/A'}</div>
                        <div className="font-mono text-emerald-400">{cnt.vehiclePlate || ''}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className="px-2 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono font-semibold">
                          {cnt.couponCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(cnt.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        {cnt.status === 'converted' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" /> Convertido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Send className="w-3 h-3" /> Enviado
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-emerald-400">
                        {cnt.status === 'converted'
                          ? (cnt.conversionRevenueCents / 100).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {cnt.status !== 'converted' ? (
                          <button
                            onClick={() => {
                              setSelectedContactId(cnt.id);
                              setConvertModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Marcar Venda
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Concluído</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Disparo WhatsApp com Cupom Dinâmico */}
      {contactModalOpen && targetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              Disparar Mensagem de Retenção
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cliente: <strong className="text-white">{targetCustomer.name}</strong> • Veículo:{' '}
              <strong className="text-emerald-400">{targetCustomer.model} ({targetCustomer.plate})</strong>
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Desconto do Cupom (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Validade (Dias)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={couponDaysValid}
                    onChange={(e) => setCouponDaysValid(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mensagem Adicional / Ajuste Personalizado (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Deixe em branco para usar o template inteligente automático com as tags do cliente..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {lastGeneratedCoupon && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="text-xs text-slate-400">Cupom Dinâmico Criado no CarX:</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                    {lastGeneratedCoupon}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSendContact}
                disabled={sendingContact}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sendingContact ? 'Gerando...' : 'Gerar e Abrir WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Converter Contato em Venda */}
      {convertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Registrar Conversão de Retorno
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Informe o valor faturado com o retorno do cliente para contabilizar o ROI da retenção.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Receita Gerada (R$)
                </label>
                <input
                  type="text"
                  value={conversionRevenue}
                  onChange={(e) => setConversionRevenue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações do Retorno
                </label>
                <input
                  type="text"
                  value={conversionNotes}
                  onChange={(e) => setConversionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvertContact}
                disabled={converting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {converting ? 'Gravando...' : 'Confirmar Conversão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Criar Nova Régua */}
      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateRule}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Criar Nova Régua de Retenção
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome da Régua
              </label>
              <input
                type="text"
                required
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Ex: Revisão Semestral de Insulfilm & Película"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ppf">PPF</option>
                  <option value="vitrificacao">Vitrificação</option>
                  <option value="higienizacao">Higienização</option>
                  <option value="insulfilm">Insulfilm</option>
                  <option value="polimento">Polimento</option>
                  <option value="geral">Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Intervalo (Dias)
                </label>
                <input
                  type="number"
                  min="30"
                  max="730"
                  value={newRuleDays}
                  onChange={(e) => setNewRuleDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={newRuleDiscount}
                  onChange={(e) => setNewRuleDiscount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Template da Mensagem (tags: {'{cliente}'}, {'{veiculo}'}, {'{servico}'}, {'{cupom_codigo}'}, {'{cupom_beneficio}'})
              </label>
              <textarea
                rows={3}
                required
                value={newRuleTemplate}
                onChange={(e) => setNewRuleTemplate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingRule}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {savingRule ? 'Salvando...' : 'Salvar Régua'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

