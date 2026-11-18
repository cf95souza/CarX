import { formatDateBR, formatTimeBR } from '../utils/dateUtils';
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FilePlus, 
  Car, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Zap,
  X,
  DollarSign,
  Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, useCatalog, useProfiles } from '../hooks/useData';
import Pagination from '../components/ui/Pagination';
import NovoOrcamentoModal from '../components/features/NovoOrcamentoModal';
import { sendWhatsApp, getBudgetMsg, getAppointmentConfirmationMsg } from '../utils/whatsappUtils';
import { getStatusStyle, getStatusLabel, formatOsNumber, formatCurrency } from '../utils/statusUtils';
import { confirmDialog } from '../utils/confirm';
import { toast } from '../utils/toast';
import PagamentoModal from '../components/features/PagamentoModal';
import EditOrderServicesModal from '../components/features/EditOrderServicesModal';
import { useAuth } from '../contexts/AuthContext';
import MultiSelectDropdown from '../components/ui/MultiSelectDropdown';

const Vendas = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showNovoModal, setShowNovoModal] = useState(false);

  const { profiles = [] } = useProfiles();
  const [bays, setBays] = useState([]);
  const [scheduleBayId, setScheduleBayId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleTechId, setScheduleTechId] = useState('');
  const [scheduleDeposit, setScheduleDeposit] = useState('');
  const [scheduleDepositMethod, setScheduleDepositMethod] = useState('pix');
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.appointments.getBays()
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setBays(res);
        }
      })
      .catch((err) => {
        console.warn('[Vendas] Erro ao listar boxes da oficina:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const openQuoteDetails = (quote) => {
    setSelectedQuote(quote);
    if (quote) {
      if (quote.data_agendamento) {
        try {
          const d = new Date(quote.data_agendamento);
          setScheduleDate(d.toISOString().split('T')[0]);
          setScheduleTime(d.toTimeString().slice(0, 5));
        } catch {
          setScheduleDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setScheduleDate(new Date().toISOString().split('T')[0]);
      }
      setScheduleTechId(quote.tecnico_id || '');
      setScheduleBayId(quote.bay_id || quote.box_id || (bays[0]?.id || ''));
      setScheduleDeposit('');
      setScheduleDepositMethod('pix');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [activeMenuQuote, setActiveMenuQuote] = useState(null);
  const [showPagamento, setShowPagamento] = useState(false);
  const [activePaymentOS, setActivePaymentOS] = useState(null);
  const [showEditServices, setShowEditServices] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['TODOS']);

  const statusOptions = ['TODOS', 'ORÇAMENTO', 'AGUARDANDO', 'EM EXECUÇÃO', 'CONCLUÍDO', 'ENTREGUE', 'CANCELADO'];

  const toggleSelection = (item) => {
    setCurrentPage(1);
    if (item === 'TODOS') {
      setSelectedStatuses(['TODOS']);
      return;
    }

    let next = selectedStatuses.filter(i => i !== 'TODOS');
    if (next.includes(item)) {
      next = next.filter(i => i !== item);
       if (next.length === 0) next = ['TODOS'];
    } else {
      next = [...next, item];
    }
    setSelectedStatuses(next);
  };
  const { isAdmin, isGestor } = useAuth();
  const isManagement = isAdmin || isGestor;
  const { quotes, loading, fetchQuotes, saveQuote, approveQuote, reopenQuote, deleteQuote, cancelQuote, registerPayment, deletePayment, updateQuoteServices } = useQuotes();

  // Deriva o OS ativo da lista geral para garantir reatividade após updates (Fase 41/42)
  const currentActiveQuote = activeMenuQuote ? (quotes || []).find(q => q.id === activeMenuQuote.id) : null;
  const currentActivePaymentQuote = activePaymentOS ? (quotes || []).find(q => q.id === activePaymentOS.id) : null;
  const currentSelectedQuote = selectedQuote ? (quotes || []).find(q => q.id === selectedQuote.id) : null;

  // Cálculos Reais de Vendas
  const aguardandoFaturamento = (quotes || [])
    .filter(q => q && q.status === 'ORCAMENTO')
    .reduce((acc, q) => acc + (Number(q.valor || q.valor_total) || 0), 0);

  const convertidosFaturamento = (quotes || [])
    .filter(q => q && q.status !== 'ORCAMENTO' && q.status !== 'CANCELADO')
    .reduce((acc, q) => acc + (Number(q.valor || q.valor_total) || 0), 0);

  const aprovados = (quotes || []).filter(q => q && q.status !== 'ORCAMENTO' && q.status !== 'CANCELADO');
  const ticketMedio = aprovados.length > 0 ? convertidosFaturamento / aprovados.length : 0;

  const handleApprove = (quote) => {
    openQuoteDetails(quote);
  };

  const handleConfirmApproval = async () => {
    if (!currentSelectedQuote) return;
    if (!scheduleDate) {
      toast.warning('Por favor, informe a data de início para o agendamento.');
      return;
    }

    setIsApproving(true);
    try {
      const scheduledAt = `${scheduleDate}T${scheduleTime || '09:00'}:00.000Z`;
      const selectedProf = (profiles || []).find((p) => p.id === scheduleTechId);

      const appointmentData = {
        id: currentSelectedQuote.id,
        data_agendamento: scheduledAt,
        box_id: scheduleBayId || null,
        bayId: scheduleBayId || null,
        tecnico_id: scheduleTechId || null,
        tecnico: selectedProf?.nome || null,
        valor_total: currentSelectedQuote.valor_total || currentSelectedQuote.valor,
        valor_pago_agora: scheduleDeposit ? Number(scheduleDeposit) : 0,
        metodo_pagamento: scheduleDepositMethod,
      };

      const result = await approveQuote(appointmentData);
      if (result.success) {
        toast.success('Orçamento aprovado e agendado com sucesso!');
        
        const confirmZap = await confirmDialog(
          'Agendamento Confirmado',
          'Orçamento aprovado com sucesso! Deseja enviar o comprovante de agendamento por WhatsApp?',
          'Sim, enviar',
          'Agora não'
        );

        if (confirmZap) {
          const dateObj = new Date(scheduledAt);
          const dataStr = formatDateBR(dateObj);
          const horaStr = formatTimeBR(dateObj);
          const cleanPhone = (currentSelectedQuote.cliente_telefone || '').replace(/\D/g, '');
          
          if (cleanPhone) {
            sendWhatsApp(
              cleanPhone, 
              getAppointmentConfirmationMsg(
                currentSelectedQuote.cliente_nome, 
                currentSelectedQuote.veiculo_desc,
                appointmentData.valor_total,
                appointmentData.valor_pago_agora,
                dataStr, 
                horaStr
              )
            );
          }
        }

        setSelectedQuote(null);
      } else {
        toast.error('Não foi possível aprovar a proposta.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aprovar proposta.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = async (quote) => {
    const confirm = await confirmDialog(
      'Cancelar Proposta',
      `Deseja realmente CANCELAR a proposta #${quote.id} de ${quote.cliente_nome}? Ela sairá dos indicadores de faturamento.`,
      'Confirmar Cancelamento',
      'Desistir'
    );

    if (confirm) {
      const res = await cancelQuote(quote.id);
      if (res.success) {
        toast.success('Proposta cancelada com sucesso.');
        setActiveMenuQuote(null);
      } else {
        toast.error('Erro ao cancelar: ' + res.error?.message);
      }
    }
  };

  const handleReopen = async (quote) => {
    const confirm = await confirmDialog(
      'Reabrir Orçamento',
      `Deseja reabrir a OS #${quote.id}? O agendamento atual será cancelado e ela voltará ao status de ORCAMENTO.`,
      'Reabrir Agora',
      'Manter como está'
    );

    if (confirm) {
      const res = await reopenQuote(quote.id);
      if (res.success) {
        toast.success('OS reaberta como orçamento!');
        setActiveMenuQuote(null);
      } else {
        toast.error('Erro ao reabrir: ' + res.error?.message);
      }
    }
  };

  const handleDelete = async (quote) => {
    // Regra de segurança: Não permitir excluir se estiver aguardando execução (agendado)
    if (quote.status === 'AGUARDANDO') {
      toast.warning('Ação Negada: Esta ordem está AGUARDADA na agenda. Cancele o agendamento (Reabrir) antes de excluí-la permanentemente.');
      return;
    }

    const confirm = await confirmDialog(
      'Excluir Permanente',
      `Tem certeza que deseja apagar o registro #${quote.id}? Esta ação não pode ser desfeita.`,
      'Excluir Agora',
      'Cancelar'
    );

    if (confirm) {
      const result = await deleteQuote(quote.id);
      if (result.success) {
        toast.success('Registro removido com sucesso.');
        setActiveMenuQuote(null);
      } else {
        toast.error('Erro ao excluir: ' + result.error.message);
      }
    }
  };

  const filteredQuotes = (quotes || []).filter(q => {
    if (!q) return false;

    const matchesSearch = 
      (q.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.veiculo_desc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase());

    const qStatus = String(q.status || 'ORÇAMENTO').trim().toUpperCase();
    const matchesStatus = selectedStatuses.includes('TODOS') || selectedStatuses.some(s => s === qStatus);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 font-sans text-[#0E1116]">
      {/* Header Profissional Canônico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Vendas e Orçamentos</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Gestão de propostas comerciais, cobrança de sinais Pix e taxa de conversão.</p>
        </div>
        <button 
          onClick={() => setShowNovoModal(true)}
          className="carx-btn-volt"
        >
          <FilePlus size={18} /> 
          Novo Orçamento
        </button>
      </div>

      {/* KPIs de Conversão Dinâmicos (Cards Brancos Rebrand) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div 
          onClick={() => toggleSelection('ORÇAMENTO')}
          className={`carx-card p-6 flex items-center justify-between cursor-pointer transition-all ${selectedStatuses.includes('ORÇAMENTO') ? 'border-[#0E1116] shadow-sm' : ''}`}
        >
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Aguardando Aprovação</span>
            {loading ? (
                <div className="h-8 w-24 bg-[#F3F5F7] animate-pulse rounded-lg mt-2"></div>
            ) : (
                <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{formatCurrency(aguardandoFaturamento)}</div>
            )}
            <p className="text-xs text-[#5B6674] font-medium mt-1">
                {(quotes || []).filter(q => q.status === 'ORCAMENTO').length} orçamentos ativos
            </p>
          </div>
          <div className="w-12 h-12 bg-[#FFE2A8] rounded-2xl flex items-center justify-center text-[#0E1116]">
            <Clock size={22} />
          </div>
        </div>

        <div 
          onClick={() => {
            setSelectedStatuses(['AGUARDANDO', 'EM EXECUÇÃO', 'CONCLUÍDO', 'ENTREGUE']);
          }}
          className={`carx-card p-6 flex items-center justify-between cursor-pointer transition-all ${!selectedStatuses.includes('ORÇAMENTO') && !selectedStatuses.includes('CANCELADO') && !selectedStatuses.includes('TODOS') ? 'border-[#0E1116] shadow-sm' : ''}`}
        >
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Total Convertido</span>
             {loading ? (
                <div className="h-8 w-24 bg-[#F3F5F7] animate-pulse rounded-lg mt-2"></div>
            ) : (
                <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{formatCurrency(convertidosFaturamento)}</div>
            )}
            <p className="text-xs text-[#5B6674] font-medium mt-1">
                Taxa de sucesso: {quotes.length > 0 ? Math.round((aprovados.length / quotes.length) * 100) : 0}%
            </p>
          </div>
          <div className="w-12 h-12 bg-[#C8F52E] rounded-2xl flex items-center justify-center text-[#0E1116]">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="carx-card p-6 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Ticket Médio</span>
             {loading ? (
                <div className="h-8 w-24 bg-[#F3F5F7] animate-pulse rounded-lg mt-2"></div>
            ) : (
                <div className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{formatCurrency(ticketMedio)}</div>
            )}
            <p className="text-xs text-[#5B6674] font-medium mt-1">Média por venda aprovada</p>
          </div>
          <div className="w-12 h-12 bg-[#0E1116] rounded-2xl flex items-center justify-center text-[#C8F52E]">
            <ArrowUpRight size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" />
          <input 
            type="text" 
            placeholder="Buscar por cliente, veículo ou código..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E1E6EC] rounded-xl outline-none focus:border-[#0E1116] transition-all text-sm font-medium text-[#0E1116] placeholder:text-[#5B6674]"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <MultiSelectDropdown 
          label="Filtrar por Status"
          options={statusOptions}
          selected={selectedStatuses}
          onToggle={toggleSelection}
          icon={Filter}
        />
      </div>

      {/* Tabela de Orçamentos (Design System Rebrand) */}
      <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F3F5F7] text-[#5B6674] uppercase tracking-wider border-b border-[#E1E6EC] font-semibold">
              <tr>
                <th className="py-3.5 px-4">Cód / Data</th>
                <th className="py-3.5 px-4">Cliente / Veículo</th>
                <th className="py-3.5 px-4">Serviço Proposto</th>
                <th className="py-3.5 px-4">Valor Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-semibold text-[#5B6674]">Carregando propostas...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((q) => (
                <tr 
                  key={q.id} 
                  onClick={() => openQuoteDetails(q)}
                  className="hover:bg-[#F3F5F7] cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0E1116]">
                    {formatOsNumber(q.os_number || q.osNumber || q.id)}
                    <span className="block text-[10px] text-[#5B6674] font-normal">
                      {q.data && !isNaN(new Date(q.data).getTime()) 
                        ? formatDateBR(q.data) 
                        : '--'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0E1116]">{q.cliente_nome}</div>
                    <span className="text-[11px] text-[#5B6674] font-mono tracking-wider">
                      {q.veiculo_desc}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-[#0E1116] font-medium line-clamp-1">{q.servico || 'Detalhamento Premium'}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-bold text-[#0E1116]">
                      {formatCurrency(q.valor)}
                    </div>
                    {q.saldo_devedor > 0 ? (
                      <span className="text-[10px] text-[#E5484D] block">
                        Falta {formatCurrency(q.saldo_devedor)}
                      </span>
                    ) : (
                      q.valor_pago > 0 && <span className="text-[10px] text-emerald-600 font-bold block">Quitado</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${getStatusStyle(q.status)}`}>
                        {getStatusLabel(q.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 relative">
                      <button 
                        onClick={() => openQuoteDetails(q)}
                        className="p-1.5 text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-200/60 rounded-lg transition-colors" 
                        title="Ver Detalhes"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                      <button 
                        onClick={() => { setActivePaymentOS(q); setShowPagamento(true); }}
                        className={`p-1.5 rounded-lg transition-colors border ${
                          q.saldo_devedor > 0 
                            ? 'text-amber-600 hover:bg-amber-50 border-amber-200' 
                            : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                        }`} 
                        title="Receber Pagamento"
                      >
                        <DollarSign size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          const cleanPhone = (q.cliente_telefone || '').replace(/\D/g, '');
                          if (cleanPhone) {
                            sendWhatsApp(cleanPhone, getBudgetMsg(q.cliente_nome, q.veiculo_desc, q.valor, q.servicos_detalhados, q.servico));
                          } else {
                            toast.warning('Cliente sem telefone cadastrado.');
                          }
                        }}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                        title="Enviar por WhatsApp"
                      >
                        <Zap size={16} fill="currentColor" />
                      </button>
                      <div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuQuote(q);
                          }}
                          className="p-1.5 rounded-lg transition-colors text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-200/60"
                          title="Mais opções"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredQuotes.length === 0 && (
                 <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                    <FilePlus size={40} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold uppercase tracking-wider text-xs">Nenhum orçamento encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredQuotes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Detalhes do Orçamento Modernizado */}
      {currentSelectedQuote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] rounded-[2rem] w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh] text-[#F2F5F8]">
            {/* Header Fixo */}
            <div className="p-6 md:p-8 border-b border-[#2E3744] flex items-center justify-between shrink-0 bg-[#0E1116]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#C8F52E]/15 text-[#C8F52E] rounded-2xl flex items-center justify-center border border-[#C8F52E]/30 shadow-inner">
                  <ArrowUpRight size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#F2F5F8] uppercase tracking-tight">Detalhes da Proposta</h3>
                  <p className="text-xs text-[#9AA7B8] font-mono font-bold uppercase tracking-wider mt-0.5">
                    {formatOsNumber(currentSelectedQuote.os_number || currentSelectedQuote.id)} • <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusStyle(currentSelectedQuote.status)}`}>{getStatusLabel(currentSelectedQuote.status)}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedQuote(null)}
                className="p-3 bg-[#232A35] hover:bg-[#2E3744] text-[#9AA7B8] hover:text-[#F2F5F8] rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar text-left">
              {/* Cliente e Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0E1116] p-5 rounded-2xl border border-[#2E3744]">
                <div>
                  <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block mb-1">Cliente</label>
                  <p className="font-extrabold text-[#F2F5F8] text-base">{currentSelectedQuote.cliente_nome}</p>
                  {currentSelectedQuote.cliente_telefone && (
                    <p className="text-xs text-[#9AA7B8] font-mono mt-0.5">{currentSelectedQuote.cliente_telefone}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block mb-1">Veículo</label>
                  <p className="font-extrabold text-[#F2F5F8] text-base">{currentSelectedQuote.veiculo_desc}</p>
                  {currentSelectedQuote.placa && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-[#232A35] border border-[#2E3744] text-[#C8F52E] font-mono font-bold text-xs rounded-md">
                      {currentSelectedQuote.placa}
                    </span>
                  )}
                </div>

                {currentSelectedQuote.data_agendamento && (
                  <div className="md:col-span-2 bg-[#232A35]/50 p-3.5 rounded-xl border border-[#2E3744]">
                    <label className="text-[10px] font-black text-[#5CC8FF] uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                      <Clock size={12} /> Data do Agendamento
                    </label>
                    <p className="font-bold text-[#F2F5F8] text-sm">
                      {new Date(currentSelectedQuote.data_agendamento).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  </div>
                )}
                {(() => {
                  let obs = currentSelectedQuote.observacoes;
                  const isDepositPaid = Boolean(currentSelectedQuote.deposit_paid_at || currentSelectedQuote.depositPaidAt);
                  if (!isDepositPaid && obs) {
                    obs = obs.replace(/\.?\s*Sinal(?:\s*Pix)?(?:\s*exigido)?:\s*R\$\s*\d+([.,]\d+)?\.?/gi, '').trim();
                  }
                  if (!obs) return null;
                  return (
                    <div className="md:col-span-2 bg-[#232A35]/30 p-3.5 rounded-xl border border-[#2E3744]">
                      <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block mb-1">Observações Internas</label>
                      <p className="text-xs text-[#9AA7B8] italic">{obs}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Lista Detalhada de Serviços */}
              <div className="bg-[#0E1116] p-5 rounded-2xl border border-[#2E3744] space-y-3">
                <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block">Serviços Selecionados</label>
                <div className="divide-y divide-[#2E3744]">
                  {(currentSelectedQuote.items && currentSelectedQuote.items.length > 0
                    ? currentSelectedQuote.items
                    : (currentSelectedQuote.servicos_detalhados || [])
                  ).map((serv, i) => (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#F2F5F8]">{serv.nome || serv.name}</p>
                        <p className="text-[11px] text-[#9AA7B8]">Garantia: {serv.garantia || '3 meses'}</p>
                      </div>
                      <p className="text-sm font-black text-[#C8F52E] font-mono">
                        {formatCurrency(serv.preco_base || serv.unit_price || 0)}
                      </p>
                    </div>
                  ))}
                  {(!currentSelectedQuote.items || currentSelectedQuote.items.length === 0) &&
                   (!currentSelectedQuote.servicos_detalhados || currentSelectedQuote.servicos_detalhados.length === 0) && (
                    <p className="text-xs text-[#9AA7B8] py-2">{currentSelectedQuote.servico || 'Serviços Especializados'}</p>
                  )}
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="p-5 bg-[#0E1116] border border-[#2E3744] rounded-2xl space-y-3 text-left">
                <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block">Resumo Financeiro</label>
                <div className="flex items-center justify-between py-1 text-xs text-[#9AA7B8]">
                  <span>Subtotal:</span>
                  <span className="font-mono text-[#F2F5F8]">{formatCurrency(currentSelectedQuote.valor_total || currentSelectedQuote.valor)}</span>
                </div>
                {Number(currentSelectedQuote.desconto) > 0 && (
                  <div className="flex items-center justify-between py-1 text-xs text-rose-400">
                    <span>Desconto aplicado:</span>
                    <span className="font-mono">- {formatCurrency(currentSelectedQuote.desconto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-t border-[#2E3744] text-sm">
                  <span className="font-bold text-[#F2F5F8]">Total da Proposta:</span>
                  <span className="text-xl font-black text-[#C8F52E] font-mono tracking-tight">
                    {formatCurrency(currentSelectedQuote.valor || currentSelectedQuote.valor_total)}
                  </span>
                </div>
                {Number(currentSelectedQuote.saldo_devedor) > 0 && (
                  <div className="flex items-center justify-between py-1 text-xs text-amber-400 border-t border-[#2E3744]/40">
                    <span>Saldo a Quitar:</span>
                    <span className="font-mono font-bold">{formatCurrency(currentSelectedQuote.saldo_devedor)}</span>
                  </div>
                )}
              </div>

              {/* Seção de Agendamento e Despacho Integrada no Próprio Modal (Sem Telas Sobrepostas) */}
              {['QUOTE', 'ORCAMENTO', 'ORÇAMENTO'].includes(String(currentSelectedQuote.status).toUpperCase()) && (
                <div className="bg-[#0E1116] p-5 rounded-2xl border border-[#2E3744] space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#C8F52E]" />
                    <label className="text-xs font-black text-[#F2F5F8] uppercase tracking-wider font-display">
                      Agendamento & Despacho para Execução
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase block mb-1">Data de Início *</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full h-11 px-3 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase block mb-1">Horário Previsto *</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full h-11 px-3 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase block mb-1">
                        Box de Atendimento *
                      </label>
                      <select
                        value={scheduleBayId}
                        onChange={(e) => setScheduleBayId(e.target.value)}
                        className="w-full h-11 px-3 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none"
                      >
                        {bays.length === 0 && <option value="">Box 1 · Principal (Padrão)</option>}
                        {bays.map((bay) => (
                          <option key={bay.id} value={bay.id}>
                            {bay.name} {bay.description ? `· ${bay.description}` : ''}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Aloca o veículo diretamente no box de trabalho da oficina.
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase block mb-1">
                        Técnico Responsável <span className="text-slate-500 font-normal">(Opcional)</span>
                      </label>
                      <select
                        value={scheduleTechId}
                        onChange={(e) => setScheduleTechId(e.target.value)}
                        className="w-full h-11 px-3 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none"
                      >
                        <option value="">Fila Geral do Pátio (Sem operador pré-alocado)</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome || p.email} ({p.role || 'Técnico'})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Se não alocar agora, o serviço fica na fila geral e o operador poderá puxar no box.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase block mb-1">Sinal / Adiantamento (R$)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={scheduleDeposit}
                          onChange={(e) => setScheduleDeposit(e.target.value)}
                          className="flex-1 h-11 px-3 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none font-mono"
                        />
                        <select
                          value={scheduleDepositMethod}
                          onChange={(e) => setScheduleDepositMethod(e.target.value)}
                          className="h-11 px-2.5 bg-[#171C24] border border-[#2E3744] rounded-xl text-xs text-[#F2F5F8] focus:border-[#C8F52E] outline-none font-bold"
                        >
                          <option value="pix">PIX</option>
                          <option value="credit_card">Crédito</option>
                          <option value="debit_card">Débito</option>
                          <option value="cash">Dinheiro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Fixo */}
            <div className="p-6 md:p-8 border-t border-[#2E3744] shrink-0 bg-[#0E1116]">
               <div className="flex gap-4">
                 {['QUOTE', 'ORCAMENTO', 'ORÇAMENTO'].includes(String(currentSelectedQuote.status).toUpperCase()) ? (
                   <button 
                     onClick={handleConfirmApproval}
                     disabled={isApproving}
                     className="flex-1 py-4 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] rounded-xl text-xs font-display font-black uppercase tracking-wider shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                   >
                     <CheckCircle2 size={16} />
                     {isApproving ? 'Aprovando e Agendando...' : 'Confirmar Aprovação & Agendar'}
                   </button>
                 ) : ['CANCELADO', 'CANCELED', 'SCHEDULED', 'AGENDADO', 'APPROVED', 'APROVADO'].includes(String(currentSelectedQuote.status).toUpperCase()) ? (
                   <div className="flex-1 flex gap-2">
                     <button 
                       onClick={() => navigate('/ordens')}
                       className="flex-1 py-4 bg-[#232A35] hover:bg-[#2E3744] text-[#F2F5F8] rounded-xl text-xs font-black uppercase tracking-wider transition-all font-bold"
                     >
                       Ver OS
                     </button>
                     <button 
                       onClick={() => handleReopen(currentSelectedQuote)}
                       className="flex-1 py-4 bg-[#232A35] hover:bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all font-bold"
                       title="Reabrir agendamento e voltar para status de Orçamento para renegociação"
                     >
                       Reabrir Proposta
                     </button>
                   </div>
                 ) : (
                   <button 
                     onClick={() => navigate('/ordens')}
                     className="flex-1 py-4 bg-[#232A35] hover:bg-[#2E3744] text-[#F2F5F8] rounded-xl text-xs font-black uppercase tracking-wider transition-all font-bold"
                   >
                     Ver Ordem de Serviço
                   </button>
                 )}
                <button 
                   onClick={() => {
                     const cleanPhone = (currentSelectedQuote.cliente_telefone || '').replace(/\D/g, '');
                     sendWhatsApp(
                       cleanPhone || '11999999999',
                       getBudgetMsg(
                         currentSelectedQuote.cliente_nome,
                         currentSelectedQuote.veiculo_desc,
                         currentSelectedQuote.valor || currentSelectedQuote.valor_total,
                         currentSelectedQuote.items || currentSelectedQuote.servicos_detalhados,
                         currentSelectedQuote.servico,
                         currentSelectedQuote.tracking_token || currentSelectedQuote.trackingToken
                       )
                     );
                   }}
                  className="flex-1 py-4 bg-[#232A35] hover:bg-[#2E3744] text-[#C8F52E] border border-[#C8F52E]/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 font-bold"
                >
                  <Zap size={14} fill="currentColor" /> Enviar WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Independente de Ações — Padrão Canônico Dark Card Rebrand */}
      {currentActiveQuote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setActiveMenuQuote(null)}>
          <div className="bg-[#171C24] border border-[#2E3744] rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-scaleUp text-[#F2F5F8]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2E3744]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8F52E]" />
                <h3 className="font-display font-black text-[#F2F5F8] uppercase text-xs tracking-widest">
                  Ações • {formatOsNumber(currentActiveQuote.os_number || currentActiveQuote.id)}
                </h3>
              </div>
              <button 
                onClick={() => setActiveMenuQuote(null)} 
                className="p-2 bg-[#232A35] hover:bg-[#2E3744] text-[#9AA7B8] hover:text-[#F2F5F8] rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {['QUOTE', 'ORCAMENTO', 'ORÇAMENTO'].includes(String(currentActiveQuote.status).toUpperCase()) ? (
                  <>
                    <button 
                      onClick={() => { handleApprove(currentActiveQuote); setActiveMenuQuote(null); }} 
                      className="w-full py-3.5 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-display font-black uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                      <CheckCircle2 size={16} /> Aprovar e Agendar
                    </button>
                    <button 
                      onClick={() => handleCancel(currentActiveQuote)} 
                      className="w-full py-3.5 bg-[#232A35] hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <AlertCircle size={16} /> Cancelar Proposta
                    </button>
                  </>
                ) : ['CANCELADO', 'CANCELED'].includes(String(currentActiveQuote.status).toUpperCase()) ? (
                  <button 
                    onClick={() => handleReopen(currentActiveQuote)} 
                    className="w-full py-3.5 bg-[#232A35] hover:bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={16} /> Reabrir Proposta
                  </button>
                ) : (
                <>
                  <button 
                    onClick={() => navigate('/ordens')} 
                    className="w-full py-3.5 bg-[#232A35] hover:bg-[#5CC8FF]/10 text-[#5CC8FF] border border-[#5CC8FF]/20 font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all mb-1"
                  >
                    <ArrowUpRight size={16} /> Ir para Ordem de Serviço
                  </button>
                  <button 
                    onClick={() => { handleReopen(currentActiveQuote); setActiveMenuQuote(null); }} 
                    className="w-full py-2.5 text-amber-400 hover:bg-amber-500/10 rounded-xl font-bold text-[10px] tracking-wider flex items-center justify-center gap-1.5 transition-all uppercase"
                  >
                    <Zap size={12} /> Reabrir e Cancelar OS Atual
                  </button>
                </>
              )}

              {isManagement && currentActiveQuote.status !== 'ENTREGUE' && currentActiveQuote.status !== 'CANCELADO' && (
                <button 
                  onClick={() => { 
                    setSelectedQuote(currentActiveQuote);
                    setShowEditServices(true);
                    setActiveMenuQuote(null);
                  }} 
                  className="w-full py-3.5 bg-[#232A35] hover:border-[#C8F52E]/40 border border-[#2E3744] text-[#F2F5F8] hover:text-[#C8F52E] font-bold uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Edit2 size={15} /> Editar Serviços e Valores
                </button>
              )}
              
              <div className="pt-3 mt-3 border-t border-[#2E3744]">
                <button 
                  onClick={() => handleDelete(currentActiveQuote)} 
                  className="w-full py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <AlertCircle size={14} /> Excluir Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {showNovoModal && (
         <NovoOrcamentoModal
           isOpen={showNovoModal}
           onClose={() => setShowNovoModal(false)}
           onCreated={() => {
             fetchQuotes();
             toast.success('Orçamento registrado com sucesso!');
           }}
         />
       )}
        {showPagamento && currentActivePaymentQuote && (
          <PagamentoModal 
             os={currentActivePaymentQuote}
             onClose={() => setShowPagamento(false)}
             onSave={registerPayment}
             onDelete={deletePayment}
          />
        )}
        {showEditServices && currentSelectedQuote && (
          <EditOrderServicesModal 
             order={currentSelectedQuote}
             onClose={() => setShowEditServices(false)}
             onSave={async (id, services, total) => {
               const res = await updateQuoteServices(id, services, total);
               return res;
             }}
          />
        )}
    </div>
  );
};

export default Vendas;
