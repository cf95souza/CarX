import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, Youtube, Palette, Type, Globe, CheckCircle2, AlertCircle, Image as ImageIcon, Zap, ShoppingBag, MessageSquare, FileText, CreditCard } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import ApiWebhooksManager from '../components/features/ApiWebhooksManager';
import TemplatesMarketplace from '../components/features/TemplatesMarketplace';
import WhatsAppManager from '../components/features/WhatsAppManager';
import { MiniSiteManager } from '../components/features/MiniSiteManager';
import { FiscalSettingsManager } from '../components/features/FiscalSettingsManager';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { updateConfig, ...brand } = useBrand();
  const [activeTab, setActiveTab] = useState('GERAL'); // 'GERAL', 'WHATSAPP', 'API_WEBHOOKS', 'MARKETPLACE'
  const [formData, setFormData] = useState({
    nome_loja: brand.name || '',
    logo_url: brand.logoUrl || '',
    youtube_id: brand.youtubeId || '',
    primary_color: brand.primaryColor || '#059669',
    secondary_color: brand.secondaryColor || '#1e293b',
    monitor_bg_color: brand.monitorBgColor || '#0f172a',
    whatsapp: brand.whatsapp || '',
    instagram_url: brand.instagramUrl || '',
    youtube_social_url: brand.youtubeSocialUrl || '',
    tiktok_url: brand.tiktokUrl || '',
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const { success, error } = await updateConfig(formData);
      if (!success) throw error;

      setStatus({ type: 'success', message: 'Configurações salvas com sucesso! As mudanças foram aplicadas em tempo real.' });
    } catch (err) {
      console.error(err);
      const errorMsg = err?.message || err?.details || 'Falha ao salvar configurações no servidor.';
      setStatus({ type: 'error', message: `Erro: ${errorMsg}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 font-sans text-[#0E1116]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E1E6EC] pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Configurações & Integrações</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Identidade visual, parâmetros operacionais da loja, APIs REST, webhooks e marketplace.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('GERAL')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'GERAL' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <Palette size={15} />
            <span>Identidade e TV</span>
          </button>

          <button
            onClick={() => setActiveTab('MINISITE')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'MINISITE' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <Globe size={15} />
            <span>Mini-Site da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('FISCAL')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'FISCAL' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <FileText size={15} />
            <span>Módulo Fiscal (NFS-e)</span>
          </button>

          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'WHATSAPP' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <MessageSquare size={15} />
            <span>WhatsApp da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('API_WEBHOOKS')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'API_WEBHOOKS' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <Zap size={15} />
            <span>APIs & Webhooks</span>
          </button>

          <button
            onClick={() => setActiveTab('MARKETPLACE')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'MARKETPLACE' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold border border-[#0E1116]' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116] hover:bg-slate-50'
              }`}
          >
            <ShoppingBag size={15} />
            <span>Marketplace</span>
          </button>

          <button
            onClick={() => navigate('/assinatura')}
            className="h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] shadow-sm cursor-pointer ml-auto"
            title="Gerenciar plano e faturas da oficina"
          >
            <CreditCard size={15} />
            <span>Assinatura &amp; Licença ↗</span>
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-slide-up ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-bold">{status.message}</p>
        </div>
      )}

      {activeTab === 'MINISITE' && <MiniSiteManager />}
      {activeTab === 'FISCAL' && <FiscalSettingsManager />}
      {activeTab === 'WHATSAPP' && <WhatsAppManager />}
      {activeTab === 'API_WEBHOOKS' && <ApiWebhooksManager />}
      {activeTab === 'MARKETPLACE' && <TemplatesMarketplace />}

      {activeTab === 'GERAL' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identidade da Loja */}
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-7 space-y-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#262D35] pb-4">
              <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
                <Palette size={18} className="text-[#C8F52E]" /> Identidade da Loja
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
                Tema Dark Volt Padronizado
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">Nome Comercial da Oficina</label>
                <div className="relative">
                  <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.nome_loja}
                    onChange={(e) => setFormData({ ...formData, nome_loja: e.target.value })}
                    className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-slate-500 font-medium"
                    placeholder="Ex: Studio Auto Wrap & Detailing"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">Logomarca da Loja (Link / URL)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-slate-500 font-medium"
                    placeholder="Ex: https://meusite.com/logo.png"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2 font-normal leading-relaxed">
                  A logomarca é replicada automaticamente na TV da Loja, no Portal do Cliente e nos Certificados de Garantia.
                </p>
                {formData.logo_url && (
                  <div className="mt-3 p-4 border border-[#262D35] rounded-2xl bg-[#0E1116] flex items-center justify-center h-28 shadow-inner">
                    <img src={formData.logo_url} alt="Prévia da Logo" className="max-h-20 object-contain" />
                  </div>
                )}
              </div>

              {/* Design System Canônico */}
              <div className="p-4 bg-[#0E1116] border border-[#262D35] rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Paleta de Cores e Contraste
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  O CarX utiliza a paleta corporativa <strong className="text-white font-bold">Dark Volt</strong> (#0E1116 e acentos #C8F52E) para garantir legibilidade estrita (WCAG AAA) em tablets com luvas, televisores e smartphones.
                </p>
              </div>
            </div>
          </div>

          {/* Monitor TV Config */}
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-7 space-y-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#262D35] pb-4">
              <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
                <Youtube size={18} className="text-[#C8F52E]" /> Monitor TV do Pátio & Recepção
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-[#262D35]">
                Sala de Espera
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">ID do Vídeo ou Playlist do YouTube</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.youtube_id}
                    onChange={(e) => setFormData({ ...formData, youtube_id: e.target.value })}
                    className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-slate-500 font-medium"
                    placeholder="Ex: dQw4w9WgXcQ ou PL..."
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2 font-normal leading-relaxed">
                  O vídeo roda em loop contínuo ao lado do painel de ordens de serviço ativas na TV.
                </p>
              </div>

              <div className="bg-[#0E1116] rounded-2xl p-3 border border-[#262D35]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2">Pré-visualização do Monitor TV</h4>
                {formData.youtube_id ? (
                  <iframe
                    className="w-full aspect-video rounded-xl bg-black border border-[#262D35]"
                    src={`https://www.youtube.com/embed/${formData.youtube_id.includes('v=') ? formData.youtube_id.split('v=')[1] : formData.youtube_id}`}
                  ></iframe>
                ) : (
                  <div className="aspect-video bg-[#171C24] rounded-xl flex items-center justify-center border border-[#262D35]">
                    <Youtube className="text-slate-500" size={36} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Redes Sociais & Contato */}
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-7 space-y-6 shadow-md lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[#262D35] pb-4">
              <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
                <Globe size={18} className="text-[#C8F52E]" /> Canais de Contato & Redes Sociais (Portal do Cliente)
              </h3>
              <span className="text-xs text-slate-300 font-medium">Exibidos no portal web do cliente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">WhatsApp Oficial</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors font-medium"
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-[11px] text-slate-400 mt-1">Apenas números com DDD (ex: 55...)</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">Instagram (Link)</label>
                <input
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors font-medium"
                  placeholder="https://instagram.com/perfil"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">YouTube (Canal)</label>
                <input
                  type="url"
                  value={formData.youtube_social_url}
                  onChange={(e) => setFormData({ ...formData, youtube_social_url: e.target.value })}
                  className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors font-medium"
                  placeholder="https://youtube.com/@seu-canal"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">TikTok (Link)</label>
                <input
                  type="url"
                  value={formData.tiktok_url}
                  onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                  className="w-full bg-[#0E1116] border border-[#262D35] rounded-2xl py-3.5 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors font-medium"
                  placeholder="https://tiktok.com/@perfil"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-display font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <div className="w-4 h-4 border-2 border-[#0E1116]/20 border-t-[#0E1116] rounded-full animate-spin"></div> : <Save size={16} />}
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsPage;
