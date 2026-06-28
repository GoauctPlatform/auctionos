/**
 * useNotifications — Real-time notification hook via WebSocket + REST fallback
 *
 * Connects to the backend WebSocket at wss://<host>/ws/<user_id>?token=<jwt>
 * and maintains unread count + notification list state.
 *
 * Usage:
 *   const { notifications, unreadCount, markRead, markAllRead, refetch } = useNotifications(user);
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../services/httpClient';
import api from '../services/api';

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  property_id?: string;
  auction_id?: number;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(user: { id?: number } | null | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get('/notifications/');
      const data: NotificationItem[] = res.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // Silently fail — notification panel is non-critical
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const connectWebSocket = useCallback(() => {
    if (!user?.id) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Build WS URL: ws:// in dev, wss:// in prod
    const wsBase = API_BASE_URL
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');
    const wsUrl = `${wsBase}/ws/${user.id}?token=${encodeURIComponent(token)}`;

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug('[WS] Notification stream connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unread === 'number') {
            setUnreadCount(data.unread);
            // If count went up, refresh the list to get new entries
            setNotifications((prev) => {
              const prevUnread = prev.filter((n) => !n.is_read).length;
              if (data.unread > prevUnread) {
                // Trigger full refresh asynchronously
                fetchNotifications();
              }
              return prev;
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        console.debug('[WS] Notification stream error — will retry in 30s');
      };

      ws.onclose = (ev) => {
        console.debug(`[WS] Notification stream closed (code=${ev.code})`);
        wsRef.current = null;
        // Reconnect after 30s unless connection was intentionally closed (code 4001/4003)
        if (ev.code !== 4001 && ev.code !== 4003 && user?.id) {
          reconnectTimerRef.current = setTimeout(() => connectWebSocket(), 30_000);
        }
      };
    } catch {
      // WebSocket not available (test env, etc.) — fall back to polling
      reconnectTimerRef.current = setTimeout(() => fetchNotifications(), 30_000);
    }
  }, [user?.id, fetchNotifications]);

  // Initial load + WebSocket connection
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
