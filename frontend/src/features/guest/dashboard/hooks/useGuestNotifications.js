import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../../../../core/context/SocketContext';
import { getGuestNotifications, markGuestNotificationsRead } from '../guestDashboardApi';

/**
 * The guest's saved notifications (order milestones, bills, payments,
 * request updates) for the portal bell.
 * - Loads once, then prepends anything the server pushes on the personal
 *   `notification` socket event (createNotificationInternal emits it).
 * - Read state is optimistic and reconciled with the server.
 */
export default function useGuestNotifications() {
  const { subscribe } = useSocket();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await getGuestNotifications();
      if (res?.success) {
        setItems(res.data || []);
        setUnread(res.unreadCount || 0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Notifications could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!subscribe) return undefined;
    const unsub = subscribe('notification', (n) => {
      if (!n?._id) return;
      setItems((prev) => (prev.some((x) => String(x._id) === String(n._id)) ? prev : [{ ...n, isRead: false }, ...prev].slice(0, 50)));
      setUnread((c) => c + 1);
    });
    return () => unsub?.();
  }, [subscribe]);

  const markRead = useCallback(async (id) => {
    let changed = false;
    setItems((prev) => prev.map((n) => {
      if (String(n._id) !== String(id) || n.isRead) return n;
      changed = true;
      return { ...n, isRead: true };
    }));
    if (changed) setUnread((c) => Math.max(0, c - 1));
    try { await markGuestNotificationsRead([id]); } catch { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try { await markGuestNotificationsRead(); } catch { refresh(); }
  }, [refresh]);

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}
