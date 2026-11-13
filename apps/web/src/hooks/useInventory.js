import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function normalizeMaterial(m) {
  if (!m) return null;
  const currentStock = Number(m.currentStock ?? m.quantidade ?? m.stock ?? 0);
  const minStock = Number(m.minStock ?? m.minimo_alerta ?? 0);

  return {
    ...m,
    id: m.id,
    nome: m.name || m.nome,
    name: m.name || m.nome,
    unidade: m.unit || m.unidade || 'un',
    unit: m.unit || m.unidade || 'un',
    quantidade: currentStock,
    currentStock: currentStock,
    minimo_alerta: minStock,
    minStock: minStock,
    categoria: m.category || m.categoria || 'Geral',
    category: m.category || m.categoria || 'Geral',
    sku: m.sku || null,
    costCents: m.costCents || m.custo || 0,
    isRoll: Boolean(m.isRoll ?? m.is_roll),
    is_roll: Boolean(m.isRoll ?? m.is_roll),
    isCritico: currentStock <= minStock && minStock > 0,
  };
}

export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.materials.list({ limit: 100 });
      const rawList = Array.isArray(res) ? res : res?.materials || [];
      const list = rawList.map(normalizeMaterial);
      setInventory(list);
    } catch (err) {
      console.error('Erro ao buscar estoque de materiais:', err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const saveItem = async (itemData) => {
    try {
      const payload = {
        name: itemData.name || itemData.nome,
        sku: itemData.sku || null,
        category: itemData.category || itemData.categoria || 'Geral',
        unit: itemData.unit || itemData.unidade || 'un',
        costCents: itemData.costCents ? Number(itemData.costCents) : itemData.custo ? Math.round(Number(itemData.custo) * 100) : 0,
        initialStock: Number(itemData.initialStock ?? itemData.quantidade ?? 0),
        minStock: Number(itemData.minStock ?? itemData.minimo_alerta ?? 0),
        isRoll: Boolean(itemData.isRoll ?? itemData.is_roll),
        notes: itemData.notes || itemData.observacoes || null,
      };

      const created = await api.materials.create(payload);
      await fetchInventory();
      return { success: true, data: normalizeMaterial(created) };
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      return { success: false, error };
    }
  };

  const updateItem = async (id, itemData) => {
    try {
      const payload = {};
      if (itemData.name || itemData.nome) payload.name = itemData.name || itemData.nome;
      if (itemData.sku !== undefined) payload.sku = itemData.sku;
      if (itemData.category || itemData.categoria) payload.category = itemData.category || itemData.categoria;
      if (itemData.unit || itemData.unidade) payload.unit = itemData.unit || itemData.unidade;
      if (itemData.costCents !== undefined) payload.costCents = Number(itemData.costCents);
      if (itemData.minStock !== undefined || itemData.minimo_alerta !== undefined) {
        payload.minStock = Number(itemData.minStock ?? itemData.minimo_alerta);
      }
      if (itemData.isRoll !== undefined || itemData.is_roll !== undefined) {
        payload.isRoll = Boolean(itemData.isRoll ?? itemData.is_roll);
      }
      if (itemData.notes !== undefined) payload.notes = itemData.notes;

      // Se a quantidade foi alterada diretamente no formulário de edição/reposição, criar movimentação de ajuste/reposição
      if (itemData.quantidade !== undefined) {
        const targetQty = Number(itemData.quantidade);
        const currentItem = inventory.find((i) => i.id === id);
        if (currentItem && currentItem.quantidade !== targetQty) {
          const diff = targetQty - currentItem.quantidade;
          await api.materials.createMovement({
            materialId: id,
            movementType: diff > 0 ? 'entry' : 'adjustment',
            quantity: Math.abs(diff),
            reason: diff > 0 ? 'Reposição manual de estoque' : 'Ajuste manual de estoque',
          });
        }
      }

      const updated = await api.materials.update(id, payload);
      await fetchInventory();
      return { success: true, data: normalizeMaterial(updated) };
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
      return { success: false, error };
    }
  };

  const deleteItem = async (id) => {
    try {
      await api.materials.delete(id);
      await fetchInventory();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      return { success: false, error };
    }
  };

  return {
    inventory,
    materials: inventory,
    loading,
    fetchInventory,
    saveItem,
    updateItem,
    deleteItem,
  };
};
