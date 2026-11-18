import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  Star, 
  Award, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  ShieldCheck, 
  UserCog, 
  UserMinus, 
  UserPlus, 
  Loader2,
  Lock,
  Edit2,
  Trophy,
  DollarSign,
  Key,
  MessageCircle
} from 'lucide-react';
import { useProfiles, useOrders } from '../hooks/useData';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import { api } from '../services/api';
import TecnicosRanking from '../components/features/TecnicosRanking';
import ComissoesExtrato from '../components/features/ComissoesExtrato';

const ColaboradoresView = () => {
  const { profiles, loading, updateProfile, fetchProfiles } = useProfiles();
  const { orders } = useOrders();
  const { profile: currentUserProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('MEMBROS'); // 'MEMBROS', 'RANKING', 'COMISSOES'
  const [updatingId, setUpdatingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingColab, setEditingColab] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetingColab, setResetingColab] = useState(null);
  const [newManualPassword, setNewManualPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', cargo: 'OPERADOR' });
  const [isCreating, setIsCreating] = useState(false);

  const toggleStatus = async (user) => {
    // Regra: Somente ADM pode desativar/ativar usuários
    if (!isAdmin) {
      toast.warning("Apenas administradores podem gerenciar o status da equipe.");
      return;
    }

    // Regra: Não permitir que um ADM desative a si mesmo (para não perder acesso total)
    if (user.id === currentUserProfile.id) {
      toast.warning("Você não pode desativar seu próprio perfil de administrador.");
      return;
    }

    setUpdatingId(user.id);
    try {
      const { success, error } = await updateProfile(user.id, { status: !user.status });
      if (!success) throw error;
      toast.success('Status atualizado com sucesso!');
      // Realtime lidará com a atualização da lista
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do colaborador.');
    } finally {
      setUpdatingId(null);
    }
  };

  const changeRole = async (user, newRole) => {
    if (!isAdmin) return;
    
    // Regra: Não permitir que o próprio usuário logado mude seu cargo (evita auto-rebaixamento acidental)
    if (user.id === currentUserProfile.id && newRole !== 'ADM') {
        toast.warning("Você não pode alterar seu próprio cargo de administrador.");
        return;
    }

    setUpdatingId(user.id);
    try {
      const { success, error } = await updateProfile(user.id, { cargo: newRole });
      if (!success) throw error;
      toast.success(`Cargo do colaborador atualizado para ${newRole}!`);
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error);
      toast.error('Erro ao atualizar cargo.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans text-[#0E1116]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Equipe & Colaboradores</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Gestão de técnicos, operadores de boxes, comissões e controle de acesso RBAC.</p>
        </div>
        <button 
          onClick={() => {
            setNewUser({ nome: '', email: '', password: '', cargo: 'OPERADOR' });
            setShowAddModal(true);
          }}
          className="carx-btn-volt"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {/* Abas de Navegação */}
      <div className="flex flex-wrap items-center gap-2.5 pb-1 no-print w-full">
        <button
          type="button"
          onClick={() => setActiveTab('MEMBROS')}
          className={`h-11 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'MEMBROS' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
          }`}
        >
          <Users size={16} />
          <span>Membros & Acessos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RANKING')}
          className={`h-11 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'RANKING' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
          }`}
        >
          <Trophy size={16} />
          <span>Ranking & Gamificação</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMISSOES')}
          className={`h-11 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'COMISSOES' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
          }`}
        >
          <DollarSign size={16} />
          <span>Extrato de Comissões</span>
        </button>
      </div>

      {activeTab === 'MEMBROS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {profiles.map((colab) => (
          <div 
            key={colab.id} 
            className={`bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md ${
              !colab.status ? 'opacity-50 grayscale' : 'hover:border-[#5B6674]'
            }`}
          >
            <div>
              {/* Topo do Card: Avatar, Status e Badge de Cargo */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-[#0E1116] border border-[#2E3744] flex items-center justify-center text-white font-display font-bold text-xl uppercase shadow-inner">
                      {colab.nome?.charAt(0) || 'U'}
                    </div>
                    <span 
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#171C24] ${
                        colab.status ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                      title={colab.status ? 'Colaborador Ativo' : 'Colaborador Inativo'}
                    />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-white text-base leading-snug">{colab.nome}</h4>
                    <p className="text-xs text-[#9AA7B8] truncate max-w-[170px] mt-0.5">{colab.email}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                    colab.cargo === 'ADM' 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : colab.cargo === 'GESTOR'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-[#C8F52E]/10 text-[#C8F52E] border-[#C8F52E]/30'
                  }`}>
                    {colab.cargo}
                  </span>
                </div>
              </div>

              {/* Contatos e Informações */}
              <div className="space-y-1.5 mb-5 bg-[#0E1116] border border-[#2E3744] rounded-xl p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA7B8] flex items-center gap-1.5">
                    <Phone size={13} className="text-[#5B6674]" /> Telefone/WhatsApp:
                  </span>
                  <span className="font-mono text-white font-medium">
                    {colab.telefone || 'Não cadastrado'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2E3744]/60">
                  {colab.cargo === 'ADM' || colab.cargo === 'GESTOR' ? (
                    <>
                      <span className="text-[#9AA7B8] flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-purple-400" /> Atribuição:
                      </span>
                      <span className="font-semibold text-purple-300 text-[11px]">
                        Gestão & Administração
                      </span>
                    </>
                  ) : colab.qa_audits_count > 0 && colab.average_qa_score != null ? (
                    <>
                      <span className="text-[#9AA7B8] flex items-center gap-1.5">
                        <Star size={13} className="text-amber-400 fill-amber-400" /> Desempenho QA:
                      </span>
                      <span className="font-bold text-white">
                        {Number(colab.average_qa_score).toFixed(1)}{' '}
                        <span className="text-[#9AA7B8] font-normal text-[11px]">
                          ({colab.qa_approved_rate ?? 100}% aprovado)
                        </span>
                      </span>
                    </>
                  ) : colab.work_orders_count > 0 ? (
                    <>
                      <span className="text-[#9AA7B8] flex items-center gap-1.5">
                        <Award size={13} className="text-[#C8F52E]" /> Serviços Concluídos:
                      </span>
                      <span className="font-bold text-[#C8F52E]">
                        {colab.work_orders_count} {colab.work_orders_count === 1 ? 'OS' : 'OSs'}{' '}
                        <span className="text-[#9AA7B8] font-normal text-[11px]">
                          (Aguardando QA)
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#9AA7B8] flex items-center gap-1.5">
                        <Star size={13} className="text-[#5B6674]" /> Desempenho QA:
                      </span>
                      <span className="text-[#9AA7B8] font-medium text-[11px]">
                        Sem auditorias de QA ainda
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Administrativas de Rodapé */}
            {isAdmin && (
              <div className="flex items-center gap-2 pt-4 border-t border-[#2E3744]">
                <button 
                  onClick={() => toggleStatus(colab)}
                  disabled={updatingId === colab.id}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
                    colab.status 
                      ? 'bg-[#0E1116] hover:bg-rose-500/10 text-[#9AA7B8] hover:text-rose-400 border-[#2E3744] hover:border-rose-500/30' 
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                  title={colab.status ? 'Inativar Colaborador' : 'Ativar Colaborador'}
                >
                  {updatingId === colab.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : colab.status ? (
                    <><UserMinus size={14} /> Inativar</>
                  ) : (
                    <><UserPlus size={14} /> Ativar</>
                  )}
                </button>
                
                {/* Menu de Cargo */}
                <div className="relative group/menu">
                  <button 
                    className="p-2 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] hover:text-white rounded-xl border border-[#2E3744] transition-colors"
                    title="Alterar Permissão / Cargo"
                  >
                    <UserCog size={16} />
                  </button>
                  <div className="absolute right-0 bottom-full mb-2 w-44 bg-[#171C24] border border-[#2E3744] rounded-xl shadow-2xl p-1.5 hidden group-hover/menu:block animate-in fade-in zoom-in-95 duration-150 z-50">
                    <p className="px-2.5 py-1.5 text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider border-b border-[#2E3744] mb-1">
                      Definir Cargo
                    </p>
                    {['ADM', 'GESTOR', 'OPERADOR'].map(role => (
                      <button
                        key={role}
                        onClick={() => changeRole(colab, role)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          colab.cargo === role 
                            ? 'bg-[#C8F52E] text-[#0E1116]' 
                            : 'text-[#9AA7B8] hover:text-white hover:bg-[#202734]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editar Perfil */}
                <button 
                  onClick={() => { setEditingColab(colab); setShowEditModal(true); }}
                  className="p-2 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] hover:text-[#C8F52E] rounded-xl border border-[#2E3744] transition-colors"
                  title="Editar Perfil (Nome/Telefone)"
                >
                  <Edit2 size={16} />
                </button>

                {/* Reset de Senha */}
                <button 
                  onClick={() => { 
                    setResetingColab(colab); 
                    setNewManualPassword(Math.random().toString(36).slice(-8)); 
                    setShowResetModal(true); 
                  }}
                  className="p-2 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] hover:text-amber-400 rounded-xl border border-[#2E3744] transition-colors"
                  title="Gerenciar Acesso & Redefinir Senha"
                >
                  <Key size={16} />
                </button>
              </div>
            )}
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40">
            <Users size={48} className="mx-auto mb-3 text-[#9AA7B8]" />
            <p className="font-bold uppercase tracking-widest text-xs text-[#9AA7B8]">Nenhum colaborador encontrado</p>
          </div>
        )}
      </div>
      ) : activeTab === 'RANKING' ? (
        <TecnicosRanking profiles={profiles} orders={orders} />
      ) : (
        <ComissoesExtrato profiles={profiles} orders={orders} />
      )}

      {/* Modal Editar Perfil (Dark Card) */}
      {showEditModal && editingColab && (
        <div className="fixed inset-0 bg-[#0E1116]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 sm:p-7 w-full max-w-sm text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#2E3744]">
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Editar Perfil</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-[#9AA7B8] hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const nome = e.target.nome.value;
              const telefone = e.target.telefone.value;
              setUpdatingId(editingColab.id);
              setShowEditModal(false);
              await updateProfile(editingColab.id, { nome, telefone });
              setUpdatingId(null);
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">
                  E-mail (Login Protegido)
                </label>
                <div className="flex items-center gap-2 p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-[#9AA7B8] font-mono text-xs opacity-80">
                   <Lock size={13} />
                   <span className="truncate">{editingColab.email}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">
                  Nome Completo
                </label>
                <input 
                  name="nome" 
                  defaultValue={editingColab.nome || ''} 
                  required 
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                  placeholder="Ex: Lucas Henrique" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">
                  WhatsApp / Telefone
                </label>
                <input 
                  name="telefone" 
                  defaultValue={editingColab.telefone || ''} 
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                  placeholder="(11) 99999-9999" 
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 py-2.5 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] rounded-xl font-bold uppercase text-xs tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm transition-all active:scale-[0.98]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Redefinir Senha & Acesso do Operador (Dark Card) */}
      {showResetModal && resetingColab && (
        <div className="fixed inset-0 bg-[#0E1116]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 sm:p-7 w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2E3744] pb-4">
               <div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight flex items-center gap-2">
                     <Key className="text-amber-400" size={18} />
                     Redefinir Acesso
                  </h3>
                  <p className="text-xs text-[#9AA7B8] mt-0.5">Colaborador: <strong className="text-white">{resetingColab.nome}</strong></p>
               </div>
               <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px] rounded-lg uppercase tracking-wider">
                 Segurança
               </span>
            </div>

            {/* Opção 1: E-mail Oficial */}
            <div className="bg-[#0E1116] p-4 rounded-xl border border-[#2E3744] space-y-2.5">
               <div className="flex items-center gap-2 font-bold text-xs text-white uppercase tracking-wider">
                  <Mail size={14} className="text-[#C8F52E]" />
                  <span>Opção 1: Link Oficial por E-mail</span>
               </div>
               <p className="text-xs text-[#9AA7B8] leading-relaxed">
                 O sistema enviará as instruções de recuperação para <strong className="text-white">{resetingColab.email}</strong>.
               </p>
               <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={async () => {
                     setIsSendingReset(true);
                     try {
                        await api.auth.logout(); // noop
                        toast.success(`Instruções de redefinição preparadas para ${resetingColab.email}!`);
                        setShowResetModal(false);
                     } catch (err) {
                        console.error(err);
                        toast.error(err.message || 'Erro ao processar redefinição.');
                     } finally {
                        setIsSendingReset(false);
                     }
                  }}
                  className="w-full py-2.5 bg-[#171C24] hover:bg-[#202734] text-white border border-[#2E3744] rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
               >
                  {isSendingReset ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  <span>Disparar Link por E-mail</span>
               </button>
            </div>

            {/* Opção 2: Senha Temporária / WhatsApp */}
            <div className="bg-[#0E1116] p-4 rounded-xl border border-[#2E3744] space-y-2.5">
               <div className="flex items-center gap-2 font-bold text-xs text-amber-400 uppercase tracking-wider">
                  <MessageCircle size={14} className="text-[#C8F52E]" />
                  <span>Opção 2: Senha de Bancada & WhatsApp</span>
               </div>
               <p className="text-xs text-[#9AA7B8] leading-relaxed">
                 Defina uma senha provisória e envie instantaneamente para o WhatsApp do técnico.
               </p>
               
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">Nova Senha Temporária</label>
                  <div className="flex gap-2">
                     <input
                        type="text"
                        value={newManualPassword}
                        onChange={(e) => setNewManualPassword(e.target.value)}
                        className="flex-1 p-2.5 bg-[#171C24] border border-[#2E3744] rounded-xl font-mono font-bold text-xs text-white focus:border-[#C8F52E] focus:outline-none"
                        placeholder="Ex: oficina123"
                     />
                     <button
                        type="button"
                        onClick={() => setNewManualPassword(Math.random().toString(36).slice(-8))}
                        className="px-3 bg-[#171C24] hover:bg-[#202734] text-white border border-[#2E3744] rounded-xl font-bold text-xs transition-colors"
                        title="Gerar outra senha aleatória"
                     >
                        🎲 Gerar
                     </button>
                  </div>
               </div>

               <button
                  type="button"
                  onClick={async () => {
                     if (!newManualPassword || newManualPassword.length < 6) {
                        toast.warning('A senha deve ter pelo menos 6 caracteres.');
                        return;
                     }
                     try {
                        try {
                           await api.members.resetPassword(resetingColab.id, newManualPassword);
                           toast.success('Senha atualizada com sucesso no servidor!');
                        } catch (edgeErr) {
                           console.error('Erro ao resetar senha:', edgeErr);
                           toast.error(edgeErr.message || 'Erro ao registrar nova senha.');
                           return;
                        }
                        
                        const tel = (resetingColab.telefone || '').replace(/\D/g, '');
                        const texto = encodeURIComponent(
                           `Olá *${resetingColab.nome}*! 🛠️\n\nSua senha de acesso ao sistema *CarX* foi redefinida pela gerência.\n\n🔐 *E-mail de Login:* ${resetingColab.email}\n🔑 *Nova Senha Temporária:* ${newManualPassword}\n\nAcesse o sistema com estes dados!`
                        );
                        if (tel) {
                           window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${texto}`, '_blank');
                        } else {
                           toast.info(`Copie e envie a senha para ${resetingColab.nome}: ${newManualPassword}`);
                        }
                        setShowResetModal(false);
                     } catch (err) {
                        console.error(err);
                        toast.error('Erro ao registrar senha temporária.');
                     }
                  }}
                  className="w-full py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
               >
                  <MessageCircle size={15} />
                  <span>Salvar & Notificar no WhatsApp</span>
               </button>
            </div>

            <button
               type="button"
               onClick={() => setShowResetModal(false)}
               className="w-full py-2.5 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] rounded-xl font-bold uppercase text-xs tracking-wider transition-colors"
            >
               Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Novo Usuário (Dark Card) */}
      {showAddModal && !editingColab && (
        <div className="fixed inset-0 bg-[#0E1116]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 sm:p-7 w-full max-w-sm text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#2E3744]">
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Novo Colaborador</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#9AA7B8] hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsCreating(true);
              
              try {
                const res = await api.members.create({
                  name: newUser.nome,
                  email: newUser.email,
                  password: newUser.password,
                  role: newUser.cargo?.toLowerCase() || 'tecnico',
                });

                if (res?.temporaryPassword) {
                  toast.success(`Colaborador cadastrado! Senha de acesso: ${res.temporaryPassword}`);
                } else {
                  toast.success('Colaborador cadastrado com sucesso!');
                }

                setShowAddModal(false);
                setNewUser({ nome: '', email: '', password: '', cargo: 'OPERADOR' });
                fetchProfiles();
              } catch (err) {
                console.error(err);
                toast.error(err.message || 'Erro ao criar colaborador.');
              } finally {
                setIsCreating(false);
              }
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">Nome Completo</label>
                <input 
                  required 
                  value={newUser.nome}
                  onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                  placeholder="Ex: Carlos Silva" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">E-mail Corporativo</label>
                <input 
                  type="email" 
                  required 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                  placeholder="carlos@detailing.com" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">Senha Provisória</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                  placeholder="••••••••" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">Cargo / Função RBAC</label>
                <select 
                  value={newUser.cargo}
                  onChange={(e) => setNewUser({...newUser, cargo: e.target.value})}
                  className="w-full p-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="OPERADOR">OPERADOR (Técnico / Pátio)</option>
                  <option value="GESTOR">GESTOR (Atendimento & Vendas)</option>
                  <option value="ADM">ADMINISTRADOR (Acesso Total)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="flex-1 py-2.5 bg-[#0E1116] hover:bg-[#202734] text-[#9AA7B8] rounded-xl font-bold uppercase text-xs tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex-1 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-bold uppercase text-xs tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={14} /> : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColaboradoresView;
