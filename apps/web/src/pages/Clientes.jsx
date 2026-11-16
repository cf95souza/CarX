import { formatDateBR } from '../utils/dateUtils';
import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, UserPlus, Car, Loader2, ArrowRight, FilePlus, X, Clock, CheckCircle2, History, Edit2, Wrench, Save, Trash2, Sparkles } from 'lucide-react';
import { useClients, useQuotes, useVehicles } from '../hooks/useData';
import NovoOrcamentoModal from '../components/features/NovoOrcamentoModal';
import Pagination from '../components/ui/Pagination';
import DetalhesServicoModal from '../components/features/DetalhesServicoModal';
import { toast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import { api } from '../services/api';

const ClientesView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { clients, loading, saveClient, updateClient, deleteClient } = useClients();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const { quotes, saveQuote } = useQuotes();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClientProfile, setSelectedClientProfile] = useState(null);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);

  // Hook de veículos (condicional ao cliente selecionado)
  const { vehicles, updateVehicle } = useVehicles(selectedClientProfile?.id);

  const handleDeleteClient = async (c) => {
    const clientQuotes = (quotes || []).filter(q => q.cliente_id === c.id || q.cliente_telefone === c.telefone);
    
    if (clientQuotes.length > 0) {
      toast.error('Não é possível excluir um cliente que possui serviços registrados.');
      return;
    }

    // Se estiver no perfil aberto, podemos ser mais específicos sobre veículos
    const hasVehicles = selectedClientProfile?.id === c.id ? (vehicles?.length > 0) : true; // Assume true na lista para segurança do aviso

    const confirm = await confirmDialog(
      'Excluir Cliente',
      `Tem certeza que deseja excluir ${c.nome}?${hasVehicles ? '\n\nATENÇÃO: Caso existam veículos vinculados a este cliente, eles também serão removidos.' : ''}`,
      'Excluir Permanentemente',
      'Cancelar'
    );

    if (confirm) {
      const res = await deleteClient(c.id);
      if (res.success) {
        toast.success('Cliente removido com sucesso.');
        if (selectedClientProfile?.id === c.id) setSelectedClientProfile(null);
      } else {
        toast.error('Erro ao excluir cliente. Verifique se existem dependências no banco.');
      }
    }
  };

  // Filtragem básica local
  const filteredClients = clients.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-slate-500 font-bold animate-pulse">Carregando Clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans text-[#0E1116]">
      {/* Header da View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Clientes</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Base de proprietários, veículos cadastrados e histórico de atendimento.</p>
        </div>
        <button 
          onClick={() => { setEditingClient(null); setShowAddModal(true); }}
          className="carx-btn-volt"
        >
          <UserPlus size={18} /> Novo Cliente
        </button>
      </div>

      {/* Banner Portal do Cliente (Meu Veículo) */}
      <div className="p-5 rounded-3xl bg-white border border-[#E1E6EC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0E1116] text-[#C8F52E] flex items-center justify-center font-bold text-xl flex-shrink-0">
            🚗
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0E1116]">Portal do Cliente (&ldquo;Meu Veículo&rdquo;)</h4>
            <p className="text-xs text-[#5B6674] mt-0.5">Área logada por WhatsApp/Placa com laudos de inspeção VCR e Certificados de Garantia digitais.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              const url = `${window.location.origin}/meu-veiculo`;
              navigator.clipboard.writeText(url);
              toast.success('Link do portal copiado! Envie pelo WhatsApp para o cliente 📋');
            }}
            className="carx-pill !h-10 text-xs font-semibold"
          >
            📋 Copiar Link do Portal
          </button>
          <a
            href="/meu-veiculo"
            target="_blank"
            rel="noopener noreferrer"
            className="carx-btn-volt !h-10 !px-4 text-xs font-bold"
          >
            <span>Acessar Portal</span>
          </a>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou placa..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E1E6EC] rounded-xl outline-none focus:border-[#0E1116] transition-all text-sm font-medium text-[#0E1116] placeholder:text-[#5B6674]"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <button className="carx-pill !h-12 !px-5 text-sm font-semibold">
          <Filter size={18} /> Filtros
        </button>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#F3F5F7] border-b border-[#E1E6EC]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Serviços</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider">Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5B6674] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E6EC]">
              {filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c) => (
                <tr key={c.id} onClick={() => setSelectedClientProfile(c)} className="hover:bg-[#F3F5F7] transition-all group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F3F5F7] flex items-center justify-center text-[#0E1116] font-bold text-sm border border-[#E1E6EC] group-hover:bg-[#C8F52E] transition-all">
                        {c.nome?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[#0E1116] leading-tight">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-[#5B6674]">{c.telefone || 'Sem telefone'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-[#0E1116] bg-[#F3F5F7] border border-[#E1E6EC] px-2.5 py-1 rounded-lg">
                          {(quotes || []).filter(q => q.cliente_id === c.id || q.cliente_telefone === c.telefone).length}
                       </span>
                       <span className="text-xs text-[#5B6674]">serviços</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#5B6674]">
                      {formatDateBR(c.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(c);
                          setShowAddModal(true);
                        }}
                        className="p-2 text-[#5B6674] hover:text-[#0E1116] hover:bg-white rounded-xl transition-all"
                        title="Editar Cadastro"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      {(quotes || []).filter(q => q.cliente_id === c.id || q.cliente_telefone === c.telefone).length === 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(c);
                          }}
                          className="p-2 text-[#5B6674] hover:text-[#E5484D] hover:bg-[#FEE2E2] rounded-xl transition-all"
                          title="Excluir Cliente"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={48} />
                      <p className="font-bold">Nenhum cliente encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredClients.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Simplicado para Novo Cliente / Edição */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-6 border-b border-[#2E3744] flex items-center justify-between bg-[#0E1116]">
              <div>
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <p className="text-[10px] text-[#9AA7B8] font-medium mt-0.5">Preencha os dados de contato do proprietário</p>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingClient(null); }} 
                className="w-8 h-8 rounded-lg bg-[#171C24] text-slate-400 hover:text-white flex items-center justify-center border border-[#2E3744] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              
              let res;
              if (editingClient) {
                 res = await updateClient(editingClient.id, data);
              } else {
                 res = await saveClient(data);
              }

              if (res.success) {
                  toast.success(editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!');
                  setShowAddModal(false);
                  setEditingClient(null);
                  if (selectedClientProfile && editingClient?.id === selectedClientProfile.id) {
                     setSelectedClientProfile({...selectedClientProfile, ...data});
                  }
              } else {
                  if (res.error?.message?.includes('telefones') || res.error?.message?.includes('cadastrado')) {
                    toast.warning(res.error.message);
                  } else {
                    toast.error('Erro ao salvar. Verifique o banco!');
                  }
              }
            }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">Nome Completo *</label>
                <input 
                  name="nome" 
                  defaultValue={editingClient?.nome || ''} 
                  required 
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full h-11 px-3.5 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white placeholder:text-slate-600" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">WhatsApp / Telefone *</label>
                <input 
                  name="telefone" 
                  defaultValue={editingClient?.telefone || ''} 
                  required 
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-3.5 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white placeholder:text-slate-600 font-mono" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">E-mail (Opcional)</label>
                <input 
                  name="email" 
                  type="email" 
                  defaultValue={editingClient?.email || ''} 
                  placeholder="cliente@email.com"
                  className="w-full h-11 px-3.5 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white placeholder:text-slate-600" 
                />
              </div>
              <button 
                type="submit" 
                className="w-full h-12 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} /> {editingClient ? 'Atualizar Dados' : 'Salvar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mobile-First Modernizado de Detalhes do Cliente */}
      {selectedClientProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-2xl bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] rounded-[2rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp">
            
            {/* Header Perfil */}
            <div className="p-5 sm:p-6 bg-[#0E1116] flex items-center justify-between border-b border-[#2E3744] shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-[#232A35] text-[#C8F52E] border border-[#C8F52E]/30 rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-md">
                  {selectedClientProfile.nome?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">{selectedClientProfile.nome}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#9AA7B8] font-mono">{selectedClientProfile.telefone || 'Sem telefone'}</span>
                    {selectedClientProfile.email && (
                      <span className="text-[11px] text-slate-500 hidden sm:inline">• {selectedClientProfile.email}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {(quotes || []).filter(q => q.cliente_id === selectedClientProfile.id || q.cliente_telefone === selectedClientProfile.telefone).length === 0 && (
                  <button 
                    onClick={() => handleDeleteClient(selectedClientProfile)}
                    className="w-9 h-9 rounded-xl bg-[#232A35] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center border border-[#2E3744] transition-colors"
                    title="Excluir Cliente"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                   onClick={() => { setEditingClient(selectedClientProfile); setShowAddModal(true); }}
                   className="w-9 h-9 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-[#C8F52E] flex items-center justify-center border border-[#2E3744] transition-colors"
                   title="Editar Informações"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setSelectedClientProfile(null)} 
                  className="w-9 h-9 rounded-xl bg-[#232A35] hover:bg-[#2e3745] text-slate-400 hover:text-white flex items-center justify-center border border-[#2E3744] transition-colors"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conteúdo Rolável */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              {/* Seção de Veículos */}
              <div>
                 <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-display font-bold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
                      <Car size={14} className="text-[#C8F52E]" /> Veículos Registrados
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {vehicles?.length || 0} veículo(s)
                    </span>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {vehicles && vehicles.length > 0 ? (
                      vehicles.map(v => (
                        <div key={v.id} className="bg-[#0E1116] p-3.5 rounded-2xl border border-[#2E3744] flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#171C24] flex items-center justify-center text-[#C8F52E] border border-[#2E3744]">
                               <Car size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">
                                {v.marca} {v.modelo}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] font-mono font-bold text-[#C8F52E] uppercase tracking-wider">{v.placa}</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-[#232A35] text-slate-300 rounded uppercase font-semibold">
                                  {v.porte || 'Hatch'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => { setEditingVehicle(v); setShowEditVehicleModal(true); }}
                            className="p-2 text-slate-500 hover:text-[#C8F52E] hover:bg-[#232A35] rounded-lg transition-all"
                            title="Editar Veículo"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-4 px-4 bg-[#0E1116] rounded-2xl border border-dashed border-[#2E3744] text-center text-xs text-slate-500">
                        Nenhum veículo vinculado diretamente ao cliente.
                      </div>
                    )}
                 </div>
              </div>

              {/* Seção de Histórico de Atendimentos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-display font-bold text-[#9AA7B8] uppercase tracking-wider flex items-center gap-2">
                    <History size={14} className="text-[#C8F52E]" /> Histórico de Atendimentos
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-[#C8F52E] bg-[#C8F52E]/10 px-2 py-0.5 rounded-full border border-[#C8F52E]/20">
                    {(quotes || []).filter(q => q.cliente_id === selectedClientProfile.id || q.cliente_telefone === selectedClientProfile.telefone).length} Serviços
                  </span>
                </div>

                <div className="space-y-2.5">
                  {quotes?.filter(q => q.cliente_id == selectedClientProfile.id || q.cliente_telefone === selectedClientProfile.telefone).length === 0 ? (
                    <div className="p-8 text-center bg-[#0E1116] rounded-2xl border border-dashed border-[#2E3744]">
                      <History className="mx-auto text-slate-600 mb-2" size={28} />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nenhum atendimento registrado</p>
                    </div>
                  ) : (
                    quotes?.filter(q => q.cliente_id == selectedClientProfile.id || q.cliente_telefone === selectedClientProfile.telefone)
                      .sort((a,b) => new Date(b.created_at || b.data || 0) - new Date(a.created_at || a.data || 0))
                      .map(quote => {
                        const statusRaw = String(quote.status || 'QUOTE').toUpperCase();
                        let badgeStyle = 'bg-[#232A35] text-slate-300 border-slate-700';
                        let label = 'Orçamento';
                        if (['APPROVED', 'APROVADO'].includes(statusRaw)) {
                          badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                          label = 'Aprovado';
                        } else if (['SCHEDULED', 'AGENDADO'].includes(statusRaw)) {
                          badgeStyle = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
                          label = 'Agendado';
                        } else if (['IN_PROGRESS', 'EXECUCAO', 'EM_ANDAMENTO'].includes(statusRaw)) {
                          badgeStyle = 'bg-[#C8F52E]/10 text-[#C8F52E] border-[#C8F52E]/30';
                          label = 'Em Execução';
                        } else if (['COMPLETED', 'DELIVERED', 'CONCLUIDO', 'ENTREGUE'].includes(statusRaw)) {
                          badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                          label = 'Concluído';
                        }
                        const osNumberFormatted = quote.os_number || quote.osNumber || (typeof quote.id === 'string' && quote.id.length > 8 ? quote.id.slice(0, 8).toUpperCase() : quote.id);

                        return (
                          <div 
                            key={quote.id} 
                            onClick={() => setSelectedServiceDetails(quote)}
                            className="bg-[#0E1116] p-4 rounded-2xl border border-[#2E3744] hover:border-[#C8F52E]/50 transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#171C24] text-[#C8F52E] rounded-md border border-[#2E3744]">
                                #{osNumberFormatted}
                              </span>
                              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${badgeStyle}`}>
                                {label}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-white mb-0.5">{quote.veiculo_desc}</p>
                            <p className="text-[11px] text-[#9AA7B8] line-clamp-1">{quote.servico || 'Serviço Automotivo'}</p>
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2E3744]">
                              <span className="text-xs font-mono font-bold text-white">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.valor || 0)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock size={10} /> {quote.data_agendamento ? formatDateBR(quote.data_agendamento) : formatDateBR(quote.created_at || quote.data)}
                                </span>
                                <ArrowRight size={12} className="text-[#C8F52E] group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Ações (Gatilho para Novo Orçamento) */}
            <div className="p-4 sm:p-5 bg-[#0E1116] border-t border-[#2E3744] shrink-0">
              <button 
                onClick={() => setShowNovoModal(true)}
                className="w-full h-12 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <FilePlus size={16} /> Cadastrar Novo Orçamento
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Novo Orçamento (Herdando Dados do Cliente Selecionado) */}
      {showNovoModal && (
         <NovoOrcamentoModal 
           onClose={() => setShowNovoModal(false)}
           onSave={saveQuote}
           initialClient={selectedClientProfile}
         />
      )}

      {/* Modal Detalhes do Serviço */}
      {selectedServiceDetails && (
        <DetalhesServicoModal 
          os={selectedServiceDetails}
          onClose={() => setSelectedServiceDetails(null)}
        />
      )}

      {/* Modal Edição de Veículo */}
      {showEditVehicleModal && editingVehicle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-[#2E3744] flex items-center justify-between bg-[#0E1116]">
              <div>
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">Editar Veículo</h3>
                <p className="text-[10px] text-[#9AA7B8] font-medium mt-0.5">Atualize a placa e especificações do carro</p>
              </div>
              <button 
                onClick={() => { setShowEditVehicleModal(false); setEditingVehicle(null); }} 
                className="w-8 h-8 rounded-lg bg-[#171C24] text-slate-400 hover:text-white flex items-center justify-center border border-[#2E3744] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                marca: formData.get('marca').toUpperCase(),
                modelo: formData.get('modelo').toUpperCase(),
                placa: formData.get('placa').toUpperCase().replace(/\s/g, ''),
                ano: formData.get('ano'),
                porte: formData.get('porte') || 'Hatch',
              };

              const res = await updateVehicle(editingVehicle.id, data);
              if (res.success) {
                toast.success('Veículo atualizado!');
                setShowEditVehicleModal(false);
                setEditingVehicle(null);
              } else {
                if (res.error?.message?.includes('placa')) {
                  toast.warning('Esta placa já está cadastrada em outro veículo!');
                } else {
                  toast.error('Erro ao atualizar veículo.');
                }
              }
            }} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider">Placa *</label>
                  <span className="text-[9px] font-bold text-[#C8F52E] uppercase flex items-center gap-1">
                    <Sparkles size={11} /> Auto-consulta CarX
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    id="vehicle-input-placa"
                    name="placa"
                    defaultValue={editingVehicle.placa || ''}
                    required
                    placeholder="ABC1D23"
                    className="flex-1 h-11 px-3 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-bold text-white font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById('vehicle-input-placa');
                      const raw = input?.value || '';
                      const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                      if (clean.length < 7) {
                        toast.warning('Informe uma placa com 7 caracteres.');
                        return;
                      }
                      try {
                        const res = await api.vehicles.lookupPlate(clean);
                        toast.success(`Veículo localizado: ${res.brand} ${res.model}`);
                        const form = input.closest('form');
                        if (form) {
                          if (form.marca) form.marca.value = res.brand;
                          if (form.modelo) form.modelo.value = res.model;
                          if (form.ano && res.year) form.ano.value = res.year;
                          if (form.porte && res.sizeClass) {
                            const sc = res.sizeClass.toLowerCase();
                            const mapPorte = {
                              hatch: 'Hatch',
                              sedan: 'Sedan',
                              suv: 'SUV',
                              pickup: 'Pickup',
                              van: 'Van',
                              moto: 'Moto',
                              esportivo: 'Esportivo',
                            };
                            form.porte.value = mapPorte[sc] || 'Hatch';
                          }
                        }
                      } catch {
                        toast.error('Não foi possível consultar a placa.');
                      }
                    }}
                    className="h-11 px-3.5 bg-[#232A35] text-[#C8F52E] rounded-xl text-xs font-bold hover:bg-[#2e3745] border border-[#2E3744] transition-all flex items-center gap-1"
                    title="Consultar dados do veículo pela placa"
                  >
                    Buscar
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">Marca *</label>
                <input name="marca" defaultValue={editingVehicle.marca || ''} required className="w-full h-11 px-3 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">Modelo *</label>
                <input name="modelo" defaultValue={editingVehicle.modelo || ''} required className="w-full h-11 px-3 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">Ano</label>
                <input name="ano" defaultValue={editingVehicle.ano || ''} className="w-full h-11 px-3 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">Porte do Veículo</label>
                <select name="porte" defaultValue={editingVehicle.porte || 'Hatch'} className="w-full h-11 px-3 bg-[#0E1116] border border-[#2E3744] rounded-xl outline-none focus:border-[#C8F52E] transition-all text-xs font-semibold text-white">
                  {['Hatch', 'Sedan', 'SUV', 'Pickup', 'Esportivo', 'Moto'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full h-11 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg mt-3 flex items-center justify-center gap-2 transition-all"
              >
                <Save size={16} /> Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
};

export default ClientesView;
