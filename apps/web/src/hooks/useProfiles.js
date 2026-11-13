import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function normalizeProfile(p) {
  if (!p) return null;
  return {
    ...p,
    id: p.id,
    nome: p.name || p.nome || 'Colaborador',
    name: p.name || p.nome || 'Colaborador',
    email: p.email || '',
    cargo: p.role || p.cargo || 'tecnico',
    role: p.role || p.cargo || 'tecnico',
    status: p.is_active !== false ? 'ativo' : 'inativo',
    is_active: p.is_active !== false,
    avatar_url: p.avatar_url || null,
    created_at: p.created_at || new Date().toISOString(),
  };
}

export const useProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.members.list();
      const list = Array.isArray(data) ? data : [];
      setProfiles(list.map(normalizeProfile));
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const updateProfile = async (id, updates) => {
    try {
      await api.members.update(id, updates);
      await fetchProfiles();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error);
      return { success: false, error };
    }
  };

  return { profiles, loading, updateProfile, fetchProfiles };
};
