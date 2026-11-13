import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { validateMediaUpload } from '../utils/fileValidation';

function normalizeWork(w) {
  if (!w) return null;
  return {
    ...w,
    id: w.id,
    titulo: w.original_name || w.originalName || w.titulo || 'Trabalho Realizado',
    url: w.url || w.downloadUrl || '',
    storage_path: w.file_key || w.storage_path || '',
    categoria: w.category || w.categoria || 'Geral',
    created_at: w.created_at || w.createdAt || new Date().toISOString(),
  };
}

export const useWorks = () => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.storage.listFiles('portfolio');
      const list = Array.isArray(data) ? data : [];
      setWorks(list.map(normalizeWork));
    } catch (err) {
      console.error('Erro ao buscar trabalhos:', err);
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const uploadWork = async (file, titulo, categoria) => {
    const validation = validateMediaUpload(file);
    if (!validation.valid) {
      return { success: false, error: { message: validation.error } };
    }

    try {
      const uploaded = await api.storage.upload(file, {
        category: 'portfolio',
      });
      await fetchWorks();
      return { success: true, url: uploaded.url || uploaded.downloadUrl };
    } catch (error) {
      console.error('Erro no upload do trabalho:', error);
      return { success: false, error };
    }
  };

  const deleteWork = async (workId, storagePath) => {
    try {
      await api.storage.deleteFile(workId);
      await fetchWorks();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir trabalho:', error);
      return { success: false, error: error.message || 'Erro ao excluir trabalho.' };
    }
  };

  const renameWork = async (workId, newTitle) => {
    // Apenas atualização em memória se não houver coluna de título no storage
    setWorks((prev) =>
      prev.map((w) => (w.id === workId ? { ...w, titulo: newTitle } : w))
    );
    return { success: true };
  };

  return { works, loading, uploadWork, deleteWork, renameWork, fetchWorks };
};
