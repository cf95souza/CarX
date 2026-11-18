import { useState, useEffect, useCallback } from 'react';
import { toast } from '../utils/toast';
import { api } from '../services/api';

export const useCatalog = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeService = (s) => {
    const rawWarranty = s.warranty_months !== undefined ? s.warranty_months : s.warrantyMonths;
    const warrantyMonths = Number(rawWarranty) || 0;
    const priceCents = s.price_cents !== undefined ? s.price_cents : (s.priceCents || 0);
    const estMin = s.estimated_minutes !== undefined ? s.estimated_minutes : (s.estimatedMinutes || 60);
    const consumption = s.material_consumption_estimate || s.materialConsumptionEstimate || {};
    const comissaoPercent = consumption.comissao_percent !== undefined ? Number(consumption.comissao_percent) : 10;

    let textoGarantia = 'Sem garantia';
    if (warrantyMonths > 0) {
      if (warrantyMonths === 24) textoGarantia = '2 anos';
      else if (warrantyMonths === 60) textoGarantia = '5 anos';
      else textoGarantia = `${warrantyMonths} meses`;
    }

    return {
      ...s,
      id: s.id,
      name: s.name,
      nome: s.name,
      category: s.category || 'Geral',
      categoria: s.category || 'Geral',
      segment: s.segment || 'AMBOS',
      tipo_veiculo: s.segment || 'AMBOS',
      description: s.description || '',
      descricao: s.description || '',
      price_cents: priceCents,
      priceCents: priceCents,
      preco_base: priceCents ? priceCents / 100 : (Number(s.preco_base) || 0),
      estimated_minutes: estMin,
      estimatedMinutes: estMin,
      tempo_estimado: estMin,
      warranty_months: warrantyMonths,
      warrantyMonths: warrantyMonths,
      garantia: textoGarantia,
      material_consumption_estimate: { ...consumption, comissao_percent: comissaoPercent },
      materialConsumptionEstimate: { ...consumption, comissao_percent: comissaoPercent },
      comissao_percent: comissaoPercent,
    };
  };

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
      const precoBase = Number(serviceData.preco_base) || 0;
      const priceCents = serviceData.price_cents !== undefined ? serviceData.price_cents : Math.round(precoBase * 100);
      const estMin = Number(serviceData.estimated_minutes ?? serviceData.tempo_estimado) || 60;
      const garStr = String(serviceData.garantia || serviceData.warranty_months || '12');
      const garNum = garStr.toLowerCase().includes('sem') ? 0 : (parseInt(garStr.replace(/\D/g, ''), 10) || 0);
      const comissao = Number(serviceData.comissao_percent) || 0;

      const payload = {
        name: (serviceData.name || serviceData.nome || '').trim(),
        description: serviceData.description || serviceData.descricao || '',
        category: serviceData.category || serviceData.categoria || 'Geral',
        segment: serviceData.segment || serviceData.tipo_veiculo || 'AMBOS',
        priceCents: priceCents,
        price_cents: priceCents,
        estimatedMinutes: estMin,
        estimated_minutes: estMin,
        warrantyMonths: garNum,
        warranty_months: garNum,
        materialConsumptionEstimate: {
          ...(serviceData.materialConsumptionEstimate || serviceData.material_consumption_estimate || {}),
          comissao_percent: comissao,
        },
        material_consumption_estimate: {
          ...(serviceData.materialConsumptionEstimate || serviceData.material_consumption_estimate || {}),
          comissao_percent: comissao,
        },
      };
      const created = await api.catalog.createService(payload);
      await fetchCatalog();
      toast.success('Serviço cadastrado com sucesso!');
      return { success: true, data: normalizeService(created) };
    } catch (err) {
      toast.error('Erro ao salvar serviço: ' + (err.message || 'Falha na requisição'));
      return { success: false, error: err };
    }
  };

  const updateService = async (id, serviceData) => {
    try {
      const precoBase = serviceData.preco_base !== undefined ? Number(serviceData.preco_base) : undefined;
      const priceCents = serviceData.price_cents !== undefined
        ? Number(serviceData.price_cents)
        : (precoBase !== undefined ? Math.round(precoBase * 100) : undefined);
      const estMin = (serviceData.estimated_minutes !== undefined || serviceData.tempo_estimado !== undefined)
        ? (Number(serviceData.estimated_minutes ?? serviceData.tempo_estimado) || 60)
        : undefined;

      let garNum = undefined;
      if (serviceData.warranty_months !== undefined || serviceData.garantia !== undefined) {
        const garStr = String(serviceData.garantia ?? serviceData.warranty_months ?? '');
        garNum = garStr.toLowerCase().includes('sem') ? 0 : (parseInt(garStr.replace(/\D/g, ''), 10) || 0);
      }

      const comissao = serviceData.comissao_percent !== undefined ? Number(serviceData.comissao_percent) : undefined;

      const payload = {
        name: (serviceData.name || serviceData.nome || '').trim() || undefined,
        description: serviceData.description !== undefined ? serviceData.description : serviceData.descricao,
        category: serviceData.category || serviceData.categoria,
        segment: serviceData.segment || serviceData.tipo_veiculo,
        priceCents: priceCents,
        price_cents: priceCents,
        estimatedMinutes: estMin,
        estimated_minutes: estMin,
        warrantyMonths: garNum,
        warranty_months: garNum,
        materialConsumptionEstimate: comissao !== undefined ? { comissao_percent: comissao } : undefined,
        material_consumption_estimate: comissao !== undefined ? { comissao_percent: comissao } : undefined,
      };
      await api.catalog.updateService(id, payload);
      await fetchCatalog();
      toast.success('Serviço atualizado com sucesso!');
      return { success: true };
    } catch (err) {
      toast.error('Erro ao atualizar serviço: ' + (err.message || 'Falha na requisição'));
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
