import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../utils/toast';

export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeClient = (c) => ({
    ...c,
    id: c.id,
    name: c.name,
    nome: c.name,
    phone: c.phone || '',
    telefone: c.phone || '',
    email: c.email || '',
    document: c.document || '',
    cpf: c.document || '',
    address_street: c.address_street || '',
    address_city: c.address_city || '',
    address_state: c.address_state || '',
    created_at: c.createdAt || c.created_at || (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
    createdAt: c.createdAt || c.created_at || (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
  });

  const fetchClients = useCallback(async () => {
    try {
      const data = await api.customers.list();
      const list = Array.isArray(data) ? data : data?.customers || [];
      setClients(list.map(normalizeClient));
    } catch (err) {
      console.warn('[useClients] Falha ao consultar clientes na API:', err.message);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const saveClient = async (clientData) => {
    try {
      const payload = {
        name: (clientData.name || clientData.nome || '').trim().toUpperCase(),
        phone: (clientData.phone || clientData.telefone || '').replace(/\D/g, ''),
        email: clientData.email?.trim().toLowerCase() || undefined,
        document: clientData.document || clientData.cpf || undefined,
        addressStreet: clientData.address_street || clientData.endereco || undefined,
        addressCity: clientData.address_city || clientData.cidade || undefined,
        addressState: clientData.address_state || clientData.estado || undefined,
      };

      const created = await api.customers.create(payload);
      await fetchClients();
      toast.success('Cliente cadastrado com sucesso!');
      return { success: true, data: normalizeClient(created) };
    } catch (err) {
      const msg = err.message || 'Erro ao cadastrar cliente.';
      toast.error(msg);
      return { success: false, error: { message: msg } };
    }
  };

  const updateClient = async (id, clientData) => {
    try {
      const payload = {
        name: clientData.name || clientData.nome ? (clientData.name || clientData.nome).trim().toUpperCase() : undefined,
        phone: clientData.phone || clientData.telefone ? (clientData.phone || clientData.telefone).replace(/\D/g, '') : undefined,
        email: clientData.email !== undefined ? clientData.email.trim().toLowerCase() : undefined,
        document: clientData.document !== undefined ? clientData.document : clientData.cpf,
        addressStreet: clientData.address_street !== undefined ? clientData.address_street : clientData.endereco,
        addressCity: clientData.address_city !== undefined ? clientData.address_city : clientData.cidade,
        addressState: clientData.address_state !== undefined ? clientData.address_state : clientData.estado,
      };

      const updated = await api.customers.update(id, payload);
      await fetchClients();
      toast.success('Cliente atualizado com sucesso!');
      return { success: true, data: normalizeClient(updated) };
    } catch (err) {
      const msg = err.message || 'Erro ao atualizar cliente.';
      toast.error(msg);
      return { success: false, error: { message: msg } };
    }
  };

  const deleteClient = async (id) => {
    try {
      // Inativação lógica do cliente através de update
      await api.customers.update(id, { isActive: false });
      await fetchClients();
      toast.success('Cliente removido com sucesso!');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Erro ao remover cliente.';
      toast.error(msg);
      return { success: false, error: { message: msg } };
    }
  };

  return { clients, loading, saveClient, updateClient, deleteClient, refreshClients: fetchClients };
};
