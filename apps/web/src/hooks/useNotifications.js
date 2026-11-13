import { useState, useEffect, useCallback } from 'react';
import { api, getStoredToken } from '../services/api';

const NOTIFICATIONS_STORAGE_KEY = 'carx_local_notifications';

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(list) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // quota exceeded or disabled
  }
}

// Helper para tocar som suave de alerta (Web Audio API - 0 latência e 0 dependências)
export const playNotificationChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Ignora restrições de autoplay de áudio no navegador se ainda não houve interação na aba
  }
};

// Helper para disparar notificação nativa no navegador / PWA (Android, iOS, Desktop)
export const triggerNativePushNotification = (notification) => {
  playNotificationChime();

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const options = {
        body: notification.mensagem || notification.message || 'Nova atualização no sistema',
        icon: '/pwa-192x192.png',
        badge: '/mask-icon.svg',
        vibrate: [200, 100, 200],
        tag: `notif-${notification.id || Date.now()}`,
        requireInteraction: notification.tipo === 'ALERTA',
        data: notification,
      };

      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(notification.titulo || notification.title || 'CarX Oficina', options);
          })
          .catch(() => {
            new Notification(notification.titulo || notification.title || 'CarX Oficina', options);
          });
      } else {
        new Notification(notification.titulo || notification.title || 'CarX Oficina', options);
      }
    } catch (err) {
      console.error('Erro ao disparar push nativo:', err);
    }
  }
};

export const getPushPermissionStatus = () => {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

// Solicitação interativa de permissão de notificações nativas
export const requestPushPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationChime();
      triggerNativePushNotification({
        titulo: 'Notificações PWA Ativadas! 🔔',
        mensagem: 'Você receberá alertas de novas OS, estoque crítico e aprovações em tempo real no seu dispositivo.',
        tipo: 'SUCESSO',
      });
      return true;
    }
  }
  return false;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState(getStoredNotifications);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState(() => getPushPermissionStatus());

  const fetchNotifications = useCallback(() => {
    setNotifications(getStoredNotifications());
  }, []);

  const markAsRead = (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, lida: true } : n));
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, lida: true }));
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const clearNotification = (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const enablePush = async () => {
    const granted = await requestPushPermission();
    setPushPermission(getPushPermissionStatus());
    return granted;
  };

  // Conexão Realtime SSE com o servidor Fastify CarX
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    let eventSource = null;
    try {
      const url = api.realtime.getEventsUrl();
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const newNotif = {
            id: String(Date.now()),
            titulo: payload.title || payload.tipo || 'Atualização em Tempo Real',
            mensagem: payload.message || payload.mensagem || JSON.stringify(payload.data || ''),
            tipo: payload.tipo || 'INFO',
            created_at: new Date().toISOString(),
            lida: false,
          };

          setNotifications((prev) => {
            const next = [newNotif, ...prev];
            saveStoredNotifications(next);
            return next;
          });

          triggerNativePushNotification(newNotif);
        } catch (e) {
          // ignore keep-alive
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (e) {
      // SSE not available
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    fetchNotifications,
    pushPermission,
    enablePush,
  };
};

export const createNotification = async (data) => {
  const item = {
    id: String(Date.now()),
    titulo: data.titulo || data.title || 'Notificação',
    mensagem: data.mensagem || data.message || '',
    tipo: data.tipo || 'INFO',
    item_id: data.item_id || null,
    created_at: new Date().toISOString(),
    lida: false,
  };

  const current = getStoredNotifications();
  const next = [item, ...current];
  saveStoredNotifications(next);

  triggerNativePushNotification(item);
  window.dispatchEvent(new CustomEvent('carx:new-notification', { detail: item }));
  return { success: true };
};
