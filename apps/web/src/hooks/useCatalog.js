import { useState, useEffect, useCallback } from 'react';
import { toast } from '../utils/toast';
import { api } from '../services/api';

export const useCatalog = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeService = (s) => ({
    ...s,
    id: s.id,
    name: s.name,
    nome: s.name,
    category: s.category,
    categoria: s.category,
    price_cents: s.price_cents || 0,
    preco_base: s.price_cents ? s.price_cents / 100 : (Number(s.preco_base) || 0),
    estimated_minutes: s.estimated_minutes || 60,
    tempo_estimado: s.estimated_minutes || 60,
    warranty_months: s.warranty_months || 0,
    garantia: s.warranty_months || 0,
  });

  const fetchCatalog = useCallback(async () => {
    try {
      const data = await api.catalog.getServices();
      const list = Array.isArray(data) ? data : data?.services || [];
      setServices(list.map(normalizeService));
    } catch (err) {
      console.warn('[useCatalog] Falha ao listar serviços da API:', err.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const saveService = async (serviceData) => {
    try {
      const payload = {
        name: serviceData.name || serviceData.nome,
        category: serviceData.category || serviceData.categoria || 'Geral',
        price_cents: serviceData.price_cents || Math.round((Number(serviceData.preco_base) || 0) * 100),
        estimated_minutes: Number(serviceData.estimated_minutes || serviceData.tempo_estimado) || 60,
        warranty_months: Number(serviceData.warranty_months || serviceData.garantia) || 0,
        description: serviceData.description || serviceData.descricao || '',
      };
      const created = await api.catalog.createService(payload);
      await fetchCatalog();
      toast.success('Serviço cadastrado com sucesso!');
      return { success: true, data: normalizeService(created) };
    } catch (err) {
      toast.error('Erro ao salvar serviço: ' + err.message);
      return { success: false, error: err };
    }
  };

  const updateService = async (id, serviceData) => {
    try {
      const payload = {
        name: serviceData.name || serviceData.nome,
        category: serviceData.category || serviceData.categoria,
        price_cents: serviceData.price_cents || (serviceData.preco_base !== undefined ? Math.round(Number(serviceData.preco_base) * 100) : undefined),
        estimated_minutes: serviceData.estimated_minutes !== undefined ? Number(serviceData.estimated_minutes) : (serviceData.tempo_estimado !== undefined ? Number(serviceData.tempo_estimado) : undefined),
        warranty_months: serviceData.warranty_months !== undefined ? Number(serviceData.warranty_months) : (serviceData.garantia !== undefined ? Number(serviceData.garantia) : undefined),
        description: serviceData.description || serviceData.descricao,
      };
      await api.catalog.updateService(id, payload);
      await fetchCatalog();
      toast.success('Serviço atualizado com sucesso!');
      return { success: true };
    } catch (err) {
      toast.error('Erro ao atualizar serviço: ' + err.message);
      return { success: false, error: err };
    }
  };

  const deleteService = async (id) => {
    try {
      await api.catalog.deleteService(id);
      await fetchCatalog();
      toast.success('Serviço removido com sucesso!');
      return { success: true };
    } catch (err) {
      toast.error('Erro ao excluir serviço: ' + err.message);
      return { success: false, error: err };
    }
  };

  return { services, loading, saveService, updateService, deleteService, refreshCatalog: fetchCatalog };
};
