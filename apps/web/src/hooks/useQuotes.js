import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { createNotification } from './useNotifications';

function normalizeQuote(q) {
  if (!q) return null;

  const totalCents = Number(q.finalCents ?? q.totalCents ?? (q.valor_total ? Math.round(Number(q.valor_total) * 100) : 0));
  const paidCents = Number(q.paidCents ?? (q.valor_pago ? Math.round(Number(q.valor_pago) * 100) : 0));
  const totalVal = totalCents / 100;
  const paidVal = paidCents / 100;

  const customerName = q.customer?.name || q.cliente_nome || 'Cliente';
  const customerPhone = q.customer?.phone || q.cliente_telefone || '';
  const vehicleDesc = q.vehicle
    ? `${q.vehicle.brand || ''} ${q.vehicle.model || ''} ${q.vehicle.year ? '(' + q.vehicle.year + ')' : ''}`.trim()
    : q.veiculo_desc || 'Veículo';
  const plate = q.vehicle?.plate || q.placa || '';

  return {
    ...q,
    id: q.id,
    os_number: q.osNumber || q.os_number || q.id,
    numero: q.osNumber || q.os_number || q.id,
    status: q.status || 'QUOTE',
    cliente_id: q.customer?.id || q.customerId || q.cliente_id,
    cliente_nome: customerName,
    cliente_telefone: customerPhone,
    veiculo_id: q.vehicle?.id || q.vehicleId || q.veiculo_id,
    veiculo_desc: vehicleDesc,
    placa: plate,
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
      if (quoteData.customerId && quoteData.vehicleId) {
        created = await api.workOrders.create({
          customerId: quoteData.customerId,
          vehicleId: quoteData.vehicleId,
          notes: quoteData.notes || quoteData.observacoes,
          scheduledAt: quoteData.scheduledAt || quoteData.data_agendamento,
          services: quoteData.services || (quoteData.servicos_detalhados || []).map((s) => ({
            serviceId: s.id,
            name: s.nome,
            unitPriceCents: Math.round(Number(s.valor || 0) * 100),
            quantity: 1,
          })),
        });
      } else {
        // Criação simplificada ou via formulário direto
        created = await api.workOrders.create({
          customerId: quoteData.cliente_id || quoteData.customerId,
          vehicleId: quoteData.veiculo_id || quoteData.vehicleId,
          notes: quoteData.observacoes || quoteData.notes,
        });
      }

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
      await api.workOrders.updateStatus(osId, 'SCHEDULED', appointmentData.notes);

      if (appointmentData.tecnico_id) {
        await api.workOrders.update(osId, { technicianId: appointmentData.tecnico_id });
      }

      if (Number(appointmentData.valor_pago_agora) > 0) {
        await api.payments.create(osId, {
          amountCents: Math.round(Number(appointmentData.valor_pago_agora) * 100),
          method: appointmentData.metodo_pagamento || 'PIX',
          notes: 'Adiantamento na aprovação',
        });
      }

      await fetchQuotes();
      createNotification({
        titulo: 'Orçamento Aprovado 🚀',
        mensagem: `A OS #${osId} teve o orçamento aprovado e foi agendada para execução!`,
        tipo: 'SUCESSO',
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      return { success: false, error };
    }
  };

  const registerPayment = async (osId, valor, metodo) => {
    try {
      await api.payments.create(osId, {
        amountCents: Math.round(Number(valor) * 100),
        method: metodo || 'PIX',
        notes: 'Pagamento recebido',
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
      await api.workOrders.update(quoteId, {
        services: newServices.map((s) => ({
          serviceId: s.id,
          name: s.nome,
          unitPriceCents: Math.round(Number(s.valor || 0) * 100),
          quantity: 1,
        })),
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
