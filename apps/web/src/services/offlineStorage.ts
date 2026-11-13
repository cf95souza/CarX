/**
 * Gerenciador de Armazenamento Local Estruturado (IndexedDB) para Operação Offline-First do Técnico (T6.13)
 */

const DB_NAME = 'carx_offline_db';
const DB_VERSION = 1;

export interface StoredOfflineAction {
  id: string; // UUID da ação gerado no cliente
  workOrderId: string;
  actionType:
    | 'START_TIMER'
    | 'PAUSE_TIMER'
    | 'RESUME_TIMER'
    | 'STOP_TIMER'
    | 'UPDATE_PROGRESS'
    | 'CHECKLIST_ITEM'
    | 'ADD_NOTE';
  payload: Record<string, any>;
  clientTimestamp: string;
  createdAt: number;
}

export interface StoredLocalTimer {
  workOrderId: string;
  status: 'running' | 'paused' | 'stopped';
  startedAt: string;
  accumulatedSeconds: number;
  lastTickTimestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Fila de Ações Offline
      if (!db.objectStoreNames.contains('offline_actions')) {
        const actionStore = db.createObjectStore('offline_actions', { keyPath: 'id' });
        actionStore.createIndex('workOrderId', 'workOrderId', { unique: false });
        actionStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. Cache da Fila do Técnico
      if (!db.objectStoreNames.contains('cached_queue')) {
        db.createObjectStore('cached_queue', { keyPath: 'id' });
      }

      // 3. Estado Local dos Cronômetros
      if (!db.objectStoreNames.contains('local_timers')) {
        db.createObjectStore('local_timers', { keyPath: 'workOrderId' });
      }

      // 4. Cache de Fotos Offline
      if (!db.objectStoreNames.contains('offline_photos')) {
        db.createObjectStore('offline_photos', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineStorage = {
  // ============================================================================
  // 1. FILA DE AÇÕES OFFLINE
  // ============================================================================

  async enqueueAction(action: StoredOfflineAction): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_actions', 'readwrite');
      const store = tx.objectStore('offline_actions');
      const req = store.put(action);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getPendingActions(): Promise<StoredOfflineAction[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_actions', 'readonly');
      const store = tx.objectStore('offline_actions');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result as StoredOfflineAction[]).sort(
          (a, b) => a.createdAt - b.createdAt
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getPendingCount(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_actions', 'readonly');
      const store = tx.objectStore('offline_actions');
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async removeActions(actionIds: string[]): Promise<void> {
    if (actionIds.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_actions', 'readwrite');
      const store = tx.objectStore('offline_actions');
      actionIds.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearAllActions(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_actions', 'readwrite');
      const store = tx.objectStore('offline_actions');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // ============================================================================
  // 2. CRONÔMETRO LOCAL RESILIENTE
  // ============================================================================

  async saveLocalTimer(timer: StoredLocalTimer): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_timers', 'readwrite');
      const store = tx.objectStore('local_timers');
      const req = store.put(timer);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getLocalTimer(workOrderId: string): Promise<StoredLocalTimer | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_timers', 'readonly');
      const store = tx.objectStore('local_timers');
      const req = store.get(workOrderId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async clearLocalTimer(workOrderId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('local_timers', 'readwrite');
      const store = tx.objectStore('local_timers');
      const req = store.delete(workOrderId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // ============================================================================
  // 3. CACHE DA FILA DE TRABALHO DO OPERADOR
  // ============================================================================

  async cacheQueue(items: any[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_queue', 'readwrite');
      const store = tx.objectStore('cached_queue');
      store.clear();
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getCachedQueue(): Promise<any[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_queue', 'readonly');
      const store = tx.objectStore('cached_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
};

