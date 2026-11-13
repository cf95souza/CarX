import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const BrandContext = createContext();

export const BrandProvider = ({ children }) => {
  const [brand, setBrand] = useState({
    name: import.meta.env.VITE_APP_NAME || 'CarX Oficina',
    primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#E63946',
    secondaryColor: import.meta.env.VITE_SECONDARY_COLOR || '#1D3557',
    accentColor: import.meta.env.VITE_ACCENT_COLOR || '#457B9D',
    logoUrl: import.meta.env.VITE_LOGO_URL || '',
    youtubeId: import.meta.env.VITE_YOUTUBE_ID || '',
    monitorBgColor: '#0f172a',
    whatsapp: '',
    instagramUrl: '',
    youtubeSocialUrl: '',
    tiktokUrl: '',
  });

  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fetchConfig = async () => {
      try {
        const data = await api.branding.get();
        if (data) {
          setBrand((prev) => ({
            ...prev,
            name: data.trade_name || data.name || prev.name,
            primaryColor: data.primary_color || data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondary_color || data.secondaryColor || prev.secondaryColor,
            accentColor: data.accent_color || data.accentColor || prev.accentColor,
            logoUrl: data.logo_url || data.logoUrl || prev.logoUrl,
            youtubeId: data.youtube_id || prev.youtubeId,
            monitorBgColor: data.monitor_bg_color || '#0f172a',
            whatsapp: data.whatsapp || '',
            instagramUrl: data.instagram_url || '',
            youtubeSocialUrl: data.youtube_social_url || '',
            tiktokUrl: data.tiktok_url || '',
          }));
        }
      } catch (err) {
        console.error('Falha ao carregar branding da oficina:', err);
      }
    };

    fetchConfig();
  }, []);

  const updateConfig = async (newData) => {
    try {
      const payload = {
        tradeName: newData.nome_loja || newData.name || brand.name,
        primaryColor: newData.primary_color || newData.primaryColor || brand.primaryColor,
        secondaryColor: newData.secondary_color || newData.secondaryColor || brand.secondaryColor,
        accentColor: newData.accent_color || newData.accentColor || brand.accentColor,
        logoUrl: newData.logo_url || newData.logoUrl || brand.logoUrl,
      };

      await api.branding.update(payload);

      setBrand((prev) => ({
        ...prev,
        name: payload.tradeName,
        primaryColor: payload.primaryColor,
        secondaryColor: payload.secondaryColor,
        accentColor: payload.accentColor,
        logoUrl: payload.logoUrl,
        whatsapp: newData.whatsapp ?? prev.whatsapp,
      }));

      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar branding:', err);
      return { success: false, error: err };
    }
  };

  return (
    <BrandContext.Provider value={{ ...brand, updateConfig }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand deve ser usado dentro de um BrandProvider');
  }
  return context;
};
