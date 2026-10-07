import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../../../../core/context/SocketContext';
import { getChatUnreadCount } from '../guestDashboardApi';

const CHAT_PATH = '/guest-dashboard/chat';
const GUEST_CHANNELS = ['reception', 'room-service'];

/**
 * Unread staff→guest chat messages, for the nav badge.
 * - Refetches on route change (so leaving Chat after reading clears it).
 * - Refetches (debounced) when a staff message arrives on a guest channel.
 * - Reports 0 while the guest is on the Chat page — they're reading it.
 * Failures are silent: a badge is never worth an error toast.
 */
export default function useChatUnread() {
  const { pathname } = useLocation();
  const { subscribe } = useSocket();
  const [count, setCount] = useState(0);
  const timerRef = useRef(null);
  const onChat = pathname.startsWith(CHAT_PATH);

  const refresh = useCallback(async () => {
    try {
      const res = await getChatUnreadCount();
      setCount(res?.data?.total || 0);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => { refresh(); }, [pathname, refresh]);

  useEffect(() => {
    if (!subscribe) return undefined;
    const myId = localStorage.getItem('userId');
    const unsub = subscribe('new-message', (msg) => {
      if (!GUEST_CHANNELS.includes(msg?.channel)) return;
      const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
      if (senderId && myId && String(senderId) === String(myId)) return; // own echo
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(refresh, 400);
    });
    return () => {
      clearTimeout(timerRef.current);
      unsub?.();
    };
  }, [subscribe, refresh]);

  return onChat ? 0 : count;
}
