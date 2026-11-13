import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function normalizeVehicle(v) {
  if (!v) return null;
  return {
    ...v,
    id: v.id,
    cliente_id: v.customerId || v.customer_id || v.cliente_id,
    customerId: v.customerId || v.customer_id || v.cliente_id,
    placa: v.plate || v.placa,
    plate: v.plate || v.placa,
    marca: v.brand || v.marca,
    brand: v.brand || v.marca,
    modelo: v.model || v.modelo,
    model: v.model || v.modelo,
    ano: v.year || v.ano,
    year: v.year || v.ano,
    cor: v.color || v.cor,
    color: v.color || v.cor,
    porte: v.sizeClass || v.size_class || v.porte || 'sedan',
    sizeClass: v.sizeClass || v.size_class || v.porte || 'sedan',
  };
}

export const useVehicles = (clienteId) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    if (!clienteId) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.vehicles.list(clienteId);
      const list = Array.isArray(res) ? res : res?.vehicles || [];
      setVehicles(list.map(normalizeVehicle));
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const saveVehicle = async (vehicleData) => {
    try {
      const payload = {
        customerId: clienteId || vehicleData.customerId || vehicleData.cliente_id,
        plate: vehicleData.plate || vehicleData.placa,
        brand: vehicleData.brand || vehicleData.marca,
        model: vehicleData.model || vehicleData.modelo,
        year: vehicleData.year ? Number(vehicleData.year) : vehicleData.ano ? Number(vehicleData.ano) : undefined,
        color: vehicleData.color || vehicleData.cor,
        sizeClass: vehicleData.sizeClass || vehicleData.size_class || vehicleData.porte || 'sedan',
      };
      const created = await api.vehicles.create(payload);
      await fetchVehicles();
      return { success: true, data: normalizeVehicle(created) };
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      return { success: false, error };
    }
  };

  const updateVehicle = async (id, vehicleData) => {
    try {
      const payload = {};
      if (vehicleData.plate || vehicleData.placa) payload.plate = vehicleData.plate || vehicleData.placa;
      if (vehicleData.brand || vehicleData.marca) payload.brand = vehicleData.brand || vehicleData.marca;
      if (vehicleData.model || vehicleData.modelo) payload.model = vehicleData.model || vehicleData.modelo;
      if (vehicleData.year !== undefined || vehicleData.ano !== undefined) {
        payload.year = Number(vehicleData.year ?? vehicleData.ano);
      }
      if (vehicleData.color || vehicleData.cor) payload.color = vehicleData.color || vehicleData.cor;
      if (vehicleData.sizeClass || vehicleData.size_class || vehicleData.porte) {
        payload.sizeClass = vehicleData.sizeClass || vehicleData.size_class || vehicleData.porte;
      }

      const updated = await api.vehicles.update(id, payload);
      await fetchVehicles();
      return { success: true, data: normalizeVehicle(updated) };
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      return { success: false, error };
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await api.vehicles.delete(id);
      await fetchVehicles();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      return { success: false, error };
    }
  };

  return { vehicles, loading, saveVehicle, updateVehicle, deleteVehicle, reload: fetchVehicles };
};
