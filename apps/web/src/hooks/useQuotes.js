import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { createNotification } from './useNotifications';
import { formatOsNumber } from '../utils/statusUtils';

function normalizePaymentMethod(method) {
  const m = String(method || '').toLowerCase().trim();
  if (m === 'pix') return 'pix';
  if (m === 'dinheiro' || m === 'cash') return 'cash';
  if (m.includes('deb') || m === 'cartao_debito') return 'debit_card';
  if (m.includes('cred') || m.includes('cartao') || m === 'cartao_credito') return 'credit_card';
  if (m.includes('transf') || m === 'bank_transfer') return 'bank_transfer';
  return 'pix';
}

function normalizeQuote(q) {
  if (!q) return null;

  const totalCents = Number(q.finalCents ?? q.totalCents ?? (q.valor_total ? Math.round(Number(q.valor_total) * 100) : 0));
  const paidCents = Number(q.paidCents ?? (q.valor_pago ? Math.round(Number(q.valor_pago) * 100) : 0));
  const totalVal = totalCents / 100;
  const paidVal = paidCents / 100;

  const customerName = q.customer?.name || q.cliente_nome || 'Cliente';
  const customerPhone = q.customer?.phone || q.cliente_telefone || '';

  const rawBrand = q.vehicle?.brand && q.vehicle.brand.toLowerCase() !== 'geral' ? q.vehicle.brand.trim() : '';
  const rawModel = (q.vehicle?.model || '').trim();
  const cleanModel = rawBrand && rawModel.toLowerCase().startsWith(rawBrand.toLowerCase())
    ? rawModel
    : `${rawBrand ? rawBrand + ' ' : ''}${rawModel}`.trim();
  const vehicleDesc = q.vehicle
    ? `${cleanModel} ${q.vehicle.year ? '(' + q.vehicle.year + ')' : ''}`.trim()
    : (q.veiculo_desc ? q.veiculo_desc.replace(/^Geral\s+/i, '') : 'Veículo');
  const plate = q.vehicle?.plate || q.placa || '';

  const rawItems = q.items || q.services || q.servicos_detalhados || [];
  const normalizedItems = rawItems.map((item, idx) => ({
    id: item.id || item.serviceId || String(idx),
    nome: item.name || item.nome || `Serviço ${idx + 1}`,
    name: item.name || item.nome || `Serviço ${idx + 1}`,
    unit_price: item.unitPriceCents ? item.unitPriceCents / 100 : (item.unit_price_cents ? item.unit_price_cents / 100 : Number(item.preco_base || item.valor || 0)),
    preco_base: item.unitPriceCents ? item.unitPriceCents / 100 : (item.unit_price_cents ? item.unit_price_cents / 100 : Number(item.preco_base || item.valor || 0)),
    quantity: item.quantity || 1,
    garantia: item.warrantyMonths ? `${item.warrantyMonths} meses` : (item.garantia || '3 meses'),
  }));

  const serviceSummary = normalizedItems.map(i => i.nome).join(', ') || q.servico || 'Serviços Especializados';

  return {
    ...q,
    id: q.id,
    os_number: q.osNumber || q.os_number || (typeof q.id === 'number' ? q.id : 1),
    os_formatted: formatOsNumber(q.osNumber || q.os_number || q.id),
    numero: q.osNumber || q.os_number || q.id,
    status: q.status || 'QUOTE',
    cliente_id: q.customer?.id || q.customerId || q.cliente_id,
    cliente_nome: customerName,
    cliente_telefone: customerPhone,
    veiculo_id: q.vehicle?.id || q.vehicleId || q.veiculo_id,
    veiculo_desc: vehicleDesc,
    placa: plate,
    items: normalizedItems,
    servicos_detalhados: normalizedItems,
    servico: serviceSummary,
    valor: totalVal,
    valor_total: totalVal,
    totalCents,
    valor_pago: paidVal,
    paidCents,
    saldo_devedor: Math.max(0, totalVal - paidVal),
    desconto: Number(q.discountCents ? q.discountCents / 100 : q.desconto || 0),
    tecnico: q.technician?.name || q.tecnico || 'Nenhum',
    tecnico_id: q.technician?.id || q.technicianId || q.tecnico_id,
    observacoes: q.notes || q.observacoes || '',
    data_agendamento: q.scheduledAt || q.data_agendamento || null,
    created_at: q.createdAt || q.created_at || q.data || null,
    createdAt: q.createdAt || q.created_at || q.data || null,
    data: q.scheduledAt || q.data_agendamento || q.createdAt || q.created_at || null,
    historico_pagamentos: q.historico_pagamentos || [],
  };
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.workOrders.list({ limit: 100 });
      const rawList = Array.isArray(res) ? res : res?.workOrders || [];
      setQuotes(rawList.map(normalizeQuote));
    } catch (err) {
      console.error('Erro ao buscar orçamentos:', err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const saveQuote = async (quoteData) => {
    try {
      let created;
      const itemsPayload = (quoteData.services || quoteData.items || quoteData.servicos_detalhados || []).map((s) => ({
        serviceId: s.id || s.serviceId,
        name: s.nome || s.name,
        unitPriceCents: s.unitPriceCents || Math.round(Number(s.preco_base || s.valor || 0) * 100),
        quantity: s.quantity || 1,
      }));

      created = await api.workOrders.create({
        customerId: quoteData.customerId || quoteData.cliente_id,
        vehicleId: quoteData.vehicleId || quoteData.veiculo_id,
        notes: quoteData.notes || quoteData.observacoes,
        scheduledAt: quoteData.scheduledAt || quoteData.data_agendamento,
        discountCents: quoteData.discountCents || (quoteData.desconto ? Math.round(Number(quoteData.desconto) * 100) : 0),
        items: itemsPayload,
        services: itemsPayload,
      });

      await fetchQuotes();
      return { success: true, data: normalizeQuote(created) };
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      return { success: false, error };
    }
  };

  const approveQuote = async (appointmentData) => {
    try {
      const osId = appointmentData.id;
      // 1. Atualiza status para SCHEDULED
      await api.workOrders.updateStatus(osId, 'SCHEDULED', appointmentData.notes);

      // 2. Atualiza agendamento e técnico alocado
      const updatePayload = {};
      if (appointmentData.data_agendamento) {
        updatePayload.scheduledAt = appointmentData.data_agendamento;
      }
      if (appointmentData.tecnico_id) {
        updatePayload.technicianId = appointmentData.tecnico_id;
      }
      if (Object.keys(updatePayload).length > 0) {
        await api.workOrders.update(osId, updatePayload);
      }

      // 3. Se houver pagamento/sinal registrado
      const valorPago = Number(appointmentData.valor_pago_agora || appointmentData.valor || 0);
      if (valorPago > 0) {
        await api.payments.create(osId, {
          amountCents: Math.round(valorPago * 100),
          method: normalizePaymentMethod(appointmentData.metodo_pagamento),
          notes: 'Adiantamento na aprovação',
        });
      }

      await fetchQuotes();
      createNotification({
        titulo: 'Orçamento Aprovado 🚀',
        mensagem: `A OS #${formatOsNumber(osId)} teve o orçamento aprovado e foi agendada para execução!`,
        tipo: 'SUCESSO',
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      return { success: false, error };
    }
  };

  const registerPayment = async (osId, valorOrObj, metodoParam) => {
    try {
      const valor = typeof valorOrObj === 'object' ? Number(valorOrObj.valor || 0) : Number(valorOrObj || 0);
      const metodo = typeof valorOrObj === 'object' ? (valorOrObj.metodo || 'PIX') : (metodoParam || 'PIX');

      await api.payments.create(osId, {
        amountCents: Math.round(valor * 100),
        method: normalizePaymentMethod(metodo),
        notes: typeof valorOrObj === 'object' && valorOrObj.tipo ? `Pagamento: ${valorOrObj.tipo}` : 'Pagamento recebido',
      });
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      return { success: false, error };
    }
  };

  const deleteQuote = async (quoteId) => {
    try {
      await api.workOrders.delete(quoteId);
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      return { success: false, error };
    }
  };

  const cancelQuote = async (quoteId) => {
    try {
      await api.workOrders.updateStatus(quoteId, 'CANCELED');
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      console.error('Erro ao cancelar orçamento:', error);
      return { success: false, error };
    }
  };

  const deletePayment = async (osId, paymentIndex) => {
    try {
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const reopenQuote = async (quoteId) => {
    try {
      await api.workOrders.updateStatus(quoteId, 'QUOTE');
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      console.error('Erro ao reabrir orçamento:', error);
      return { success: false, error };
    }
  };

  const updateQuoteServices = async (quoteId, newServices, newTotal) => {
    try {
      const mapped = newServices.map((s) => ({
        serviceId: s.id,
        name: s.nome || s.name,
        unitPriceCents: Math.round(Number(s.preco_base || s.valor || 0) * 100),
        quantity: s.quantity || 1,
        warrantyMonths: s.warrantyMonths || 3,
      }));

      await api.workOrders.update(quoteId, {
        items: mapped,
        services: mapped,
      });
      await fetchQuotes();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar serviços do orçamento:', error);
      return { success: false, error };
    }
  };

  return {
    quotes,
    loading,
    fetchQuotes,
    saveQuote,
    approveQuote,
    reopenQuote,
    deleteQuote,
    cancelQuote,
    registerPayment,
    deletePayment,
    updateQuoteServices,
  };
};
