import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { offlineStorage, StoredOfflineAction } from '../services/offlineStorage';
import type { BatchSyncActionsInputDto } from '@carx/shared';

export interface UseOfflineSyncResult {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  syncNow: () => Promise<{ success: boolean; appliedCount: number }>;
  enqueueOfflineAction: (
    workOrderId: string,
    actionType: StoredOfflineAction['actionType'],
    payload?: Record<string, any>
  ) => Promise<string>;
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isSyncingRef = useRef(false);

  // Atualiza a contagem de itens pendentes
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getPendingCount();
      setPendingCount(count);
    } catch {
      // Falha silenciosa no IndexedDB
    }
  }, []);

  // Executa o envio em lote das ações offline para a API
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) {
      return { success: false, appliedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, appliedCount: 0 };
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      const pending = await offlineStorage.getPendingActions();
      if (pending.length === 0) {
        setPendingCount(0);
        return { success: true, appliedCount: 0 };
      }

      const payload: BatchSyncActionsInputDto = {
        actions: pending.map((a) => ({
          id: a.id,
          workOrderId: a.workOrderId,
          actionType: a.actionType,
          payload: a.payload || {},
          clientTimestamp: a.clientTimestamp,
        })),
      };

      const result = await api.technician.syncOfflineActions(payload);

      // IDs confirmados com sucesso no backend
      const idsToRemove: string[] = [];
      if (Array.isArray(result.results)) {
        for (const res of result.results) {
          if (res.success) {
            idsToRemove.push(res.actionId);
          }
        }
      }

      if (idsToRemove.length > 0) {
        await offlineStorage.removeActions(idsToRemove);
      }

      setLastSyncAt(new Date());
      await refreshPendingCount();

      return {
        success: true,
        appliedCount: result.processed,
      };
    } catch (err: any) {
      const msg = err.message || 'Erro ao sincronizar ações com o servidor.';
      setSyncError(msg);
      return { success: false, appliedCount: 0 };
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // Enfileira uma nova ação offline de forma transparente
  const enqueueOfflineAction = useCallback(
    async (
      workOrderId: string,
      actionType: StoredOfflineAction['actionType'],
      payload: Record<string, any> = {}
    ): Promise<string> => {
      const actionId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

      const action: StoredOfflineAction = {
        id: actionId,
        workOrderId,
        actionType,
        payload,
        clientTimestamp: new Date().toISOString(),
        createdAt: Date.now(),
      };

      await offlineStorage.enqueueAction(action);
      await refreshPendingCount();

      // Se houver conexão de rede imediata, tenta sincronizar em background
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncNow().catch(() => {});
      }

      return actionId;
    },
    [refreshPendingCount, syncNow]
  );

  // Monitora conectividade da janela do navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Ao reconectar, sincroniza automaticamente
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carrega contagem inicial
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncAt,
    syncError,
    syncNow,
    enqueueOfflineAction,
  };
}
