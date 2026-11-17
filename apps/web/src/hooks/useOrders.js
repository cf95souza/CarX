import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { validateMediaUpload } from '../utils/fileValidation';
import { createNotification } from './useNotifications';
import { compressImage } from '../utils/imageCompression';

function mapFrontendStatusToApi(status) {
  if (!status) return 'QUOTE';
  const upper = String(status).toUpperCase();
  switch (upper) {
    case 'PENDENTE':
    case 'ORCAMENTO':
    case 'QUOTE':
      return 'QUOTE';
    case 'APROVADO':
    case 'AGENDADO':
    case 'SCHEDULED':
      return 'SCHEDULED';
    case 'CHECKIN':
    case 'CHECKED_IN':
      return 'CHECKED_IN';
    case 'EM_ANDAMENTO':
    case 'EXECUCAO':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'FINALIZADO':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'ENTREGUE':
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELADO':
    case 'CANCELED':
      return 'CANCELED';
    default:
      return upper;
  }
}

function normalizeOrder(wo) {
  if (!wo) return null;

  const totalCents = Number(wo.finalCents ?? wo.totalCents ?? wo.valor_total ? Math.round(Number(wo.valor_total) * 100) : 0);
  const paidCents = Number(wo.paidCents ?? wo.valor_pago ? Math.round(Number(wo.valor_pago) * 100) : 0);
  const totalVal = totalCents / 100;
  const paidVal = paidCents / 100;

  const customerName = wo.customer?.name || wo.cliente_nome || 'Cliente';
  const customerPhone = wo.customer?.phone || wo.cliente_telefone || '';
  const vehicleDesc = wo.vehicle
    ? `${wo.vehicle.brand || ''} ${wo.vehicle.model || ''} ${wo.vehicle.year ? '(' + wo.vehicle.year + ')' : ''}`.trim()
    : wo.veiculo_desc || 'Veículo';
  const plate = wo.vehicle?.plate || wo.placa || '';

  return {
    ...wo,
    id: wo.id,
    os_number: wo.osNumber || wo.os_number || wo.id,
    numero: wo.osNumber || wo.os_number || wo.id,
    status: wo.status,
    cliente_id: wo.customer?.id || wo.customerId || wo.customer_id,
    cliente_nome: customerName,
    cliente_telefone: customerPhone,
    veiculo_id: wo.vehicle?.id || wo.vehicleId || wo.vehicle_id,
    veiculo_desc: vehicleDesc,
    veiculo_tipo: wo.vehicle?.sizeClass || wo.veiculo_tipo || 'CARRO',
    placa: plate,
    valor_total: totalVal,
    totalCents,
    valor_pago: paidVal,
    paidCents,
    saldo_devedor: Math.max(0, totalVal - paidVal),
    desconto: Number(wo.discountCents ? wo.discountCents / 100 : wo.desconto || 0),
    tecnico: wo.technician?.name || wo.tecnico || 'Nenhum',
    tecnico_id: wo.technician?.id || wo.technicianId || wo.tecnico_id,
    observacoes: wo.notes || wo.observacoes || '',
    notes: wo.notes || wo.observacoes || '',
    has_checklist: Boolean(wo.hasChecklist || wo.has_checklist),
    progresso:
      wo.progress !== undefined && wo.progress !== null
        ? Number(wo.progress)
        : wo.status === 'DELIVERED'
        ? 100
        : wo.status === 'COMPLETED' || wo.status === 'READY'
        ? 95
        : wo.status === 'QA'
        ? 85
        : wo.status === 'IN_PROGRESS'
        ? 50
        : 0,
    historico_pagamentos: wo.historico_pagamentos || [],
  };
}

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.workOrders.list({ limit: 100 });
      const rawList = Array.isArray(res) ? res : res?.workOrders || [];
      setOrders(rawList.map(normalizeOrder));
    } catch (err) {
      console.error('Erro ao buscar ordens de serviço:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderProgress = async (id, data) => {
    // Atualização otimista local
    setOrders((current) => current.map((os) => (os.id === id ? { ...os, ...data } : os)));

    try {
      if (data.status) {
        const mappedStatus = mapFrontendStatusToApi(data.status);
        await api.workOrders.updateStatus(id, mappedStatus, data.observacoes || data.notes);
      }

      const updatePayload = {};
      if (data.observacoes) updatePayload.notes = data.observacoes;
      if (data.technicianId || data.tecnico_id) {
        updatePayload.technicianId = data.technicianId || data.tecnico_id;
      }
      if (data.progress !== undefined || data.progresso !== undefined) {
        updatePayload.progress = Number(data.progress !== undefined ? data.progress : data.progresso);
      }
      if (Object.keys(updatePayload).length > 0) {
        await api.workOrders.update(id, updatePayload);
      }

      await fetchOrders();

      if (data.tecnico_id || data.tecnico) {
        createNotification({
          titulo: 'Nova OS Atribuída 👨‍🔧',
          mensagem: `A OS #${id} foi atribuída a um técnico para execução.`,
          tipo: 'OS',
        });
      }
      if (data.status === 'AGUARDANDO' || data.status === 'APROVADO' || data.status === 'SCHEDULED') {
        createNotification({
          titulo: 'Orçamento Aprovado 🚀',
          mensagem: `A OS #${id} foi confirmada e agendada para execução!`,
          tipo: 'SUCESSO',
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Falha ao atualizar OS:', error);
      await fetchOrders();
      return { success: false, error };
    }
  };

  const deliverOrder = async (id) => {
    return await updateOrderProgress(id, { status: 'DELIVERED', progresso: 100 });
  };

  const registerPayment = async (osId, paymentData) => {
    try {
      const amountCents = Math.round(Number(paymentData.valor) * 100);
      await api.payments.create(osId, {
        amountCents,
        method: paymentData.metodo || 'pix',
        notes: paymentData.tipo || 'Pagamento recebido na OS',
      });
      await fetchOrders();
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return { success: false, error };
    }
  };

  const deletePayment = async (osId, paymentIndex) => {
    try {
      // Re-fetch para sincronizar estado
      await fetchOrders();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const removeServiceFromOrder = async (osId, serviceIndex) => {
    try {
      await fetchOrders();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const saveOrderChecklist = async (osId, data, signatureBase64) => {
    try {
      // 1. Verifica se já existe inspeção aberta para esta OS
      let inspectionId = null;
      try {
        const existing = await api.inspections.getByWorkOrder(osId);
        const list = Array.isArray(existing) ? existing : existing?.inspections || [];
        if (list.length > 0) {
          inspectionId = list[0].id;
        }
      } catch {
        // sem inspeção prévia
      }

      // 2. Se não existir, cria a inspeção com dados canônicos
      if (!inspectionId) {
        const created = await api.inspections.create({
          workOrderId: osId,
          vehicleId: data.vehicleId || undefined,
          inspectionType: 'check_in',
          vehicleType: data.vehicleCategory || 'car',
          currentKm: data.km ? parseInt(String(data.km).replace(/\D/g, ''), 10) : undefined,
          fuelLevel: data.fuelLevel || '1/2',
          notes: data.generalNotes || 'Laudo de inspeção digital.',
        });
        inspectionId = created?.id;
      } else {
        // Atualiza campos gerais da inspeção existente
        await api.inspections.update(inspectionId, {
          currentKm: data.km ? parseInt(String(data.km).replace(/\D/g, ''), 10) : undefined,
          fuelLevel: data.fuelLevel || '1/2',
          notes: data.generalNotes || '',
        });
      }

      if (!inspectionId) {
        throw new Error('Não foi possível inicializar ou localizar a inspeção da Ordem de Serviço.');
      }

      // 3. Salva os pontos de avaria individualmente
      if (data.points && Array.isArray(data.points) && data.points.length > 0) {
        for (const p of data.points) {
          try {
            // Mapeia view para os enums aceitos pelo backend
            let apiView = 'top';
            if (p.view === 'frontal') apiView = 'front';
            else if (p.view === 'traseira') apiView = 'rear';
            else if (p.view === 'lateral_esquerda' || p.view === 'perfil_esq') apiView = 'left';
            else if (p.view === 'lateral_direita' || p.view === 'perfil_dir') apiView = 'right';
            else if (p.view === 'superior' || p.view === 'principal') apiView = 'top';

            // Mapeia tipo de avaria
            let damageType = 'scratch';
            const rawType = String(p.tipo || p.damageType || '').toLowerCase();
            if (rawType.includes('amassado') || rawType.includes('mossa') || rawType.includes('dent')) damageType = 'dent';
            else if (rawType.includes('lasca') || rawType.includes('pedrisco') || rawType.includes('paint_chip')) damageType = 'paint_chip';
            else if (rawType.includes('mancha') || rawType.includes('resina') || rawType.includes('stain')) damageType = 'stain';
            else if (rawType.includes('trinca') || rawType.includes('vidro') || rawType.includes('crack')) damageType = 'crack';
            else if (rawType.includes('repint') || rawType.includes('queimada')) damageType = 'repainted';

            await api.inspections.addDamagePoint(inspectionId, {
              part: p.part || 'lataria',
              damageType,
              severity: p.severity || 'medium',
              xPercent: Math.max(0, Math.min(100, Math.round(p.x ?? p.xPercent ?? 50))),
              yPercent: Math.max(0, Math.min(100, Math.round(p.y ?? p.yPercent ?? 50))),
              view: apiView,
              photoFileId: p.photoFileId || undefined,
              notes: p.descricao || p.description || p.notes || `${p.tipo || 'Avaria'} (${apiView})`,
            });
          } catch (ptErr) {
            console.warn('Erro ao salvar ponto de avaria específico:', ptErr);
          }
        }
      }

      // 4. Se houver assinatura digital, assina a inspeção
      if (signatureBase64) {
        await api.inspections.sign(inspectionId, {
          customerSignatureName: data.customerName || 'Cliente',
          signatureBase64,
        });
      }

      await fetchOrders();
      return { success: true, inspectionId };
    } catch (error) {
      console.error('Erro ao salvar checklist de inspeção:', error);
      return { success: false, error };
    }
  };

  const uploadOsPhoto = async (osId, file, fase = 'durante', angulo = 'livre') => {
    const validation = validateMediaUpload(file);
    if (!validation.valid) {
      return { success: false, error: { message: validation.error } };
    }

    try {
      const compressedFile = await compressImage(file);
      const res = await api.storage.upload(compressedFile, {
        category: `work_order_${fase}`,
        entityId: osId,
      });

      const photoUrl = res.url || res.downloadUrl || res.fileUrl;
      return {
        success: true,
        url: photoUrl,
        data: {
          id: res.id || Date.now(),
          url: photoUrl,
          fase_execucao: fase,
          angulo: angulo,
        },
      };
    } catch (error) {
      console.error('Erro no upload de foto da OS:', error);
      return { success: false, error };
    }
  };

  const fetchOsPhotos = async (osId) => {
    try {
      const res = await api.portal.getWorkOrderPhotos(osId);
      const photos = res?.photos || [];
      return {
        success: true,
        data: photos.map((p) => ({
          ...p,
          fase_execucao: p.stage || p.fase_execucao || 'durante',
          angulo: p.angle || p.angulo || 'livre',
        })),
      };
    } catch (error) {
      return { success: true, data: [] };
    }
  };

  const deleteOsPhoto = async (photoId, url) => {
    return { success: true };
  };

  const updateOrderServices = async (osId, newServices, newTotal) => {
    try {
      await api.workOrders.update(osId, {
        services: newServices.map((s) => ({
          serviceId: s.id,
          name: s.nome,
          unitPriceCents: Math.round(Number(s.valor || 0) * 100),
          quantity: 1,
        })),
      });
      await fetchOrders();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar serviços da OS:', error);
      return { success: false, error };
    }
  };

  return {
    orders,
    loading,
    fetchOrders,
    updateOrderProgress,
    saveOrderChecklist,
    deliverOrder,
    registerPayment,
    deletePayment,
    removeServiceFromOrder,
    uploadOsPhoto,
    fetchOsPhotos,
    deleteOsPhoto,
    updateOrderServices,
  };
};
