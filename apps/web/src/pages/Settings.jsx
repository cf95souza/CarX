import React, { useState, useEffect } from 'react';
import { Settings, Save, Youtube, Palette, Type, Globe, CheckCircle2, AlertCircle, Image as ImageIcon, Zap, ShoppingBag, MessageSquare, FileText } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import ApiWebhooksManager from '../components/features/ApiWebhooksManager';
import TemplatesMarketplace from '../components/features/TemplatesMarketplace';
import WhatsAppManager from '../components/features/WhatsAppManager';
import { MiniSiteManager } from '../components/features/MiniSiteManager';
import { FiscalSettingsManager } from '../components/features/FiscalSettingsManager';

const SettingsPage = () => {
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
    <div className={`mx-auto space-y-6 pb-20 font-sans text-[#0E1116] ${activeTab === 'GERAL' ? 'max-w-4xl' : 'max-w-6xl'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E1E6EC] pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Configurações & Integrações</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Identidade visual, parâmetros operacionais da loja, APIs REST, webhooks e marketplace.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('GERAL')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'GERAL' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <Palette size={15} />
            <span>Identidade e TV</span>
          </button>

          <button
            onClick={() => setActiveTab('MINISITE')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'MINISITE' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <Globe size={15} />
            <span>Mini-Site da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('FISCAL')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'FISCAL' ? 'bg-[#0E1116] text-[#C8F52E] shadow-sm font-bold' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <FileText size={15} />
            <span>Módulo Fiscal (NFS-e)</span>
          </button>

          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'WHATSAPP' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <MessageSquare size={15} />
            <span>WhatsApp da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('API_WEBHOOKS')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'API_WEBHOOKS' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <Zap size={15} />
            <span>APIs & Webhooks</span>
          </button>

          <button
            onClick={() => setActiveTab('MARKETPLACE')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'MARKETPLACE' ? 'bg-[#0E1116] text-white shadow-sm' : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
            }`}
          >
            <ShoppingBag size={15} />
            <span>Marketplace</span>
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-slide-up ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
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
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identidade da Loja */}
        <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2E3744] pb-4">
            <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
              <Palette size={18} className="text-[#C8F52E]" /> Identidade da Loja
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
              Tema Dark Volt Padronizado
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">Nome Comercial da Oficina</label>
              <div className="relative">
                <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
                <input 
                  type="text" 
                  value={formData.nome_loja}
                  onChange={(e) => setFormData({...formData, nome_loja: e.target.value})}
                  className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors"
                  placeholder="Ex: Studio Auto Wrap & Detailing"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">Logomarca da Loja (Link / URL)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
                <input 
                  type="url" 
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                  className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-[#5B6674]"
                  placeholder="Ex: https://meusite.com/logo.png"
                />
              </div>
              <p className="text-xs text-[#9AA7B8] mt-2">
                A logomarca é replicada automaticamente na TV da Loja, no Portal do Cliente e nos Certificados de Garantia.
              </p>
              {formData.logo_url && (
                <div className="mt-3 p-4 border border-[#2E3744] rounded-xl bg-[#0E1116] flex items-center justify-center h-24">
                  <img src={formData.logo_url} alt="Prévia da Logo" className="max-h-16 object-contain" />
                </div>
              )}
            </div>

            {/* Design System Canônico */}
            <div className="p-4 bg-[#0E1116] border border-[#2E3744] rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block">
                Paleta de Cores e Contraste
              </span>
              <p className="text-xs text-[#9AA7B8] leading-relaxed">
                O CarX utiliza a paleta corporativa <strong className="text-white">Dark Volt</strong> (#0E1116 e acentos #C8F52E) para garantir legibilidade estrita (WCAG AAA) em tablets com luvas, televisores e smartphones.
              </p>
            </div>
          </div>
        </div>

        {/* Monitor TV Config */}
        <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2E3744] pb-4">
            <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
              <Youtube size={18} className="text-[#C8F52E]" /> Monitor TV do Pátio & Recepção
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-[#9AA7B8] border border-[#2E3744]">
              Sala de Espera
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">ID do Vídeo ou Playlist do YouTube</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
                <input 
                  type="text" 
                  value={formData.youtube_id}
                  onChange={(e) => setFormData({...formData, youtube_id: e.target.value})}
                  className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-[#5B6674]"
                  placeholder="Ex: dQw4w9WgXcQ ou PL..."
                />
              </div>
              <p className="text-xs text-[#9AA7B8] mt-2">
                O vídeo roda em loop contínuo ao lado do painel de ordens de serviço ativas na TV.
              </p>
            </div>

            <div className="bg-[#0E1116] rounded-xl p-3 border border-[#2E3744]">
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">Pré-visualização do Monitor TV</h4>
               {formData.youtube_id ? (
                 <iframe 
                  className="w-full aspect-video rounded-lg bg-black border border-[#2E3744]"
                  src={`https://www.youtube.com/embed/${formData.youtube_id.includes('v=') ? formData.youtube_id.split('v=')[1] : formData.youtube_id}`}
                 ></iframe>
               ) : (
                 <div className="aspect-video bg-[#171C24] rounded-lg flex items-center justify-center border border-[#2E3744]">
                    <Youtube className="text-[#5B6674]" size={32} />
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Redes Sociais & Contato */}
        <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-6 space-y-6 shadow-md md:col-span-2">
          <div className="flex items-center justify-between border-b border-[#2E3744] pb-4">
            <h3 className="font-display font-bold text-white flex items-center gap-2.5 text-base">
              <Globe size={18} className="text-[#C8F52E]" /> Canais de Contato & Redes Sociais (Portal do Cliente)
            </h3>
            <span className="text-xs text-[#9AA7B8]">Exibidos no portal web do cliente</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">WhatsApp Oficial</label>
              <input 
                type="text" 
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors"
                placeholder="Ex: 5511999999999"
              />
              <p className="text-[11px] text-[#5B6674] mt-1">Apenas números com DDD (ex: 55...)</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">Instagram (Link)</label>
              <input 
                type="url" 
                value={formData.instagram_url}
                onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors"
                placeholder="https://instagram.com/perfil"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">YouTube (Canal)</label>
              <input 
                type="url" 
                value={formData.youtube_social_url}
                onChange={(e) => setFormData({...formData, youtube_social_url: e.target.value})}
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors"
                placeholder="https://youtube.com/@seu-canal"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9AA7B8] mb-2">TikTok (Link)</label>
              <input 
                type="url" 
                value={formData.tiktok_url}
                onChange={(e) => setFormData({...formData, tiktok_url: e.target.value})}
                className="w-full bg-[#0E1116] border border-[#2E3744] rounded-xl py-3 px-4 text-sm text-white focus:border-[#C8F52E] focus:outline-none transition-colors"
                placeholder="https://tiktok.com/@perfil"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
           <button 
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
