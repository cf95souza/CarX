import React, { useState } from 'react';
import { User, Mail, Lock, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../hooks/useData';
import { api } from '../services/api';

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { updateProfile } = useProfiles();
  
  const [nome, setNome] = useState(profile?.nome || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      // 1. Atualizar Nome no Perfil (Tabela Profiles)
      if (nome !== profile?.nome) {
        const { success, error } = await updateProfile(profile.id, { nome });
        if (!success) throw error;
      }

      // 2. Atualizar Senha
      if (password) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        await api.members.resetPassword(profile.id, password);
        
        setPassword('');
        setConfirmPassword('');
      }

      await refreshProfile();
      setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Erro ao atualizar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in max-w-md mx-auto space-y-5 pt-2 pb-10 text-[#F2F5F8]">
      <div className="text-center space-y-1.5">
        <div className="w-16 h-16 bg-[#C8F52E]/15 text-[#C8F52E] rounded-full flex items-center justify-center mx-auto mb-1 border-2 border-[#C8F52E]/30 shadow-lg">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#F2F5F8] uppercase tracking-tight font-grotesk">Meu Perfil</h2>
        <p className="text-[#9AA7B8] text-[10px] font-bold uppercase tracking-widest">{profile?.cargo || 'Colaborador'}</p>
      </div>

      {status.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-slide-up ${
          status.type === 'success' ? 'bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30' : 'bg-[#FF6B5E]/15 text-[#FF6B5E] border border-[#FF6B5E]/30'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-xs font-semibold tracking-tight">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Email - Read Only */}
        <div className="bg-[#171C24] p-5 rounded-3xl space-y-4 border border-[#2E3744]">
          <div>
            <label className="block text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider mb-1.5">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA7B8]" size={16} />
              <input 
                type="text" 
                value={user?.email || ''} 
                disabled 
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-2xl py-3 pl-10 pr-4 text-xs font-medium text-[#9AA7B8] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider mb-1.5">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA7B8]" size={16} />
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-[#F2F5F8] focus:border-[#C8F52E] outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          </div>
        </div>

        {/* Alterar Senha */}
        <div className="bg-[#171C24] p-5 rounded-3xl space-y-4 border border-[#2E3744]">
          <h3 className="text-xs font-bold text-[#F2F5F8] uppercase tracking-wider flex items-center gap-2">
            <Lock size={14} className="text-[#C8F52E]" /> Alterar Senha
          </h3>
          
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA7B8]" size={16} />
              <input 
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-2xl py-3 pl-10 pr-12 text-xs font-bold text-[#F2F5F8] focus:border-[#C8F52E] outline-none transition-all"
                placeholder="Nova senha (mín. 6 caracteres)"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA7B8] hover:text-[#F2F5F8]"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {password && (
              <div className="relative animate-in fade-in slide-in-from-top-2">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA7B8]" size={16} />
                <input 
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!!password}
                  className="w-full bg-[#0E1116] border border-[#2E3744] rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-[#F2F5F8] focus:border-[#C8F52E] outline-none transition-all"
                  placeholder="Confirme a nova senha"
                />
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit"
          disabled={saving || (!password && nome === profile?.nome)}
          className="w-full h-14 bg-[#C8F52E] text-[#0E1116] rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#C8F52E]/15 hover:bg-[#b8e520] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-[#0E1116]/20 border-t-[#0E1116] rounded-full animate-spin" />
          ) : (
            <>
              <Save size={16} />
              Salvar Alterações
            </>
          )}
        </button>
      </form>

      <p className="text-[10px] text-[#9AA7B8] text-center font-medium italic mt-2">
        As alterações de nome refletirão imediatamente nas ordens de serviço.
      </p>
    </div>
  );
};

export default ProfilePage;
