import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function mapRoleToCargo(role) {
  const normalized = String(role || 'tecnico').toLowerCase().trim();
  if (normalized === 'owner' || normalized === 'adm' || normalized === 'admin') {
    return 'ADM';
  }
  if (normalized === 'gestor' || normalized === 'manager') {
    return 'GESTOR';
  }
  return 'OPERADOR';
}

function normalizeProfile(p) {
  if (!p) return null;
  const isActive =
    typeof p.status === 'boolean'
      ? p.status
      : p.is_active !== false && p.status !== 'inativo';
  return {
    ...p,
    id: p.id,
    nome: p.name || p.nome || 'Colaborador',
    name: p.name || p.nome || 'Colaborador',
    email: p.email || '',
    cargo: mapRoleToCargo(p.role || p.cargo),
    role: p.role || p.cargo || 'tecnico',
    status: isActive,
    is_active: isActive,
    avatar_url: p.avatar_url || null,
    created_at: p.created_at || new Date().toISOString(),
    work_orders_count: Number(p.work_orders_count || 0),
    average_qa_score: p.average_qa_score != null ? Number(p.average_qa_score) : null,
    qa_audits_count: Number(p.qa_audits_count || 0),
    qa_approved_rate: p.qa_approved_rate != null ? Number(p.qa_approved_rate) : null,
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
