/**
 * NotificationContext
 * 
 * Centralized notification management using Context API + Socket.io
 * 
 * Why this approach?
 * 1. Socket.io handles real-time communication (already set up)
 * 2. Context API provides global state without Redux overhead
 * 3. Single subscription point for all socket events
 * 4. Notifications persist across view/route changes
 * 
 * Usage:
 * const { notifications, unreadCount, markRead, clearAll } = useNotifications();
 */

import { createContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { useSocket } from "./SocketContext";
import { useStaffAuth } from "./StaffAuthContext";
import useNotificationSound from "../hooks/useNotificationSound";
import { NOTIFICATION_TYPES } from "./useNotifications";
import { getNotifications, markNotificationsRead } from "../api/services/messaging.service";
import axiosClient from "../api/client";

const getActiveWaiterCalls = (hotelId) =>
  axiosClient.get("/api/v1/staff/waiter-calls", { params: { hotelId } }).then((r) => r.data);
import { getCurrentStaffUser } from "../api/services/staffAccount.service";

const formatOrderLocation = ({ orderType, roomNumber, tableNumber }) => {
  if (orderType === "roomService") {
    return roomNumber ? `Room ${roomNumber}` : "Room Service";
  }
  if (orderType === "dineIn") {
    return tableNumber ? `Table ${tableNumber}` : "Dine-in";
  }
  if (orderType === "takeaway") {
    return "Takeaway";
  }
  if (tableNumber) return `Table ${tableNumber}`;
  if (roomNumber) return `Room ${roomNumber}`;
  return "Order";
};

const NotificationContext = createContext(null);

// A new order can reach us up to three ways (socket "new-order", the persisted
// notification's socket echo, and legacy multi-room emits). Remember which
// orders we've already alerted for so staff hear and see it exactly once.
const ORDER_ALERT_TTL_MS = 10 * 60 * 1000;
const isServerId = (id) => /^[0-9a-f]{24}$/i.test(String(id || ""));

// Reception has its own clickable order toasts in ReceptionDashboard.
const ROLES_WITH_OWN_ORDER_TOAST = new Set(["receptionist"]);

const STATUS_EMOJI = {
  preparing: '🍳', ready: '✅', delivered: '🎉', cancelled: '❌', confirmed: '👍', pending: '⏳',
};

// Backend notification types → the types the bell / panels understand.
const normalizeServerType = (type, status) => {
  if (type === 'order_status' || type === 'order_delivered') {
    return status === 'ready' ? NOTIFICATION_TYPES.ORDER_READY : NOTIFICATION_TYPES.ORDER_STATUS;
  }
  return type || NOTIFICATION_TYPES.ORDER_STATUS;
};

const desktopAlertsAllowed = (role) => {
  if (role !== "receptionist") return true;
  try {
    const s = JSON.parse(localStorage.getItem("receptionSettings") || "null");
    return s?.desktopNotifications !== false;
  } catch {
    return true;
  }
};

const showDesktopNotification = ({ title, body, tag }) => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !document.hidden) return;
    const n = new Notification(title, { body, tag, icon: "/logo.png", renotify: false });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    // Some browsers (e.g. Android Chrome) only allow notifications via a service worker.
  }
};

/** Small fixed prompt shown while the browser is blocking alert sounds. */
const SoundUnlockPrompt = ({ onEnable }) => (
  <button
    type="button"
    onClick={onEnable}
    data-sound-unlock=""
    style={{
      // Dashboards with a phone bottom nav set --bottom-nav-height so the
      // prompt sits above it instead of covering the tabs.
      position: "fixed", left: 16, zIndex: 9999, maxWidth: "calc(100vw - 32px)", minHeight: 44,
      bottom: "calc(var(--bottom-nav-height, 0px) + 16px + env(safe-area-inset-bottom, 0px))",
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,.12)",
      background: "#1e293b", color: "#f8fafc", font: "600 13px/1.2 system-ui, sans-serif",
      boxShadow: "0 8px 24px rgba(15,23,42,.35)", cursor: "pointer",
    }}
  >
    <span aria-hidden="true" style={{ fontSize: 16 }}>🔔</span>
    Sound alerts are paused — click to enable
  </button>
);

// Note: NOTIFICATION_TYPES and useNotifications hook are in useNotifications.js
// to satisfy React Fast Refresh requirements

// localStorage key for persisting notifications, scoped per user so a shared
// browser never shows one staff member's notifications to another.
const storageKeyFor = (userId) => `notifications_${userId || 'anon'}`;

// Load notifications from localStorage
const loadNotificationsFromStorage = (userId) => {
  try {
    const stored = localStorage.getItem(storageKeyFor(userId));
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects for createdAt
      return parsed.map(n => ({ ...n, createdAt: new Date(n.createdAt) }));
    }
  } catch {
    // Corrupted/unavailable storage — fall back to an empty list
  }
  return [];
};

// Save notifications to localStorage
const saveNotificationsToStorage = (userId, notifications) => {
  try {
    // Keep only recent 50 notifications in storage to avoid bloat
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(notifications.slice(0, 50)));
  } catch {
    // Storage quota exceeded or unavailable — non-fatal, skip persistence
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() =>
    loadNotificationsFromStorage(getCurrentStaffUser()?._id)
  );
  const [waiterCallCount, setWaiterCallCount] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  
  const { subscribe } = useSocket();
  const { staffRole, isAuthenticated, staffUser } = useStaffAuth();
  const { playWithVibration, audioState, enableSound } = useNotificationSound();
  const alertedOrdersRef = useRef(new Map()); // orderId -> timestamp
  const alertedStatusRef = useRef(new Map()); // `${orderId}:${status}` -> timestamp
  const openCallIdsRef = useRef(new Set()); // open waiter-call ids (badge = size)

  // Waiters: start the call badge from the calls already open on the server,
  // not from 0 on every page load.
  const activeHotelId = staffUser?.activeProperty?._id;
  useEffect(() => {
    if (!isAuthenticated || staffRole !== 'waiter' || !activeHotelId) return undefined;
    let cancelled = false;
    getActiveWaiterCalls(activeHotelId)
      .then((res) => {
        if (cancelled || !Array.isArray(res?.calls)) return;
        openCallIdsRef.current = new Set(res.calls.map((c) => String(c._id)));
        setWaiterCallCount(openCallIdsRef.current.size);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, staffRole, activeHotelId]);

  // Get current user ID for filtering self-notifications
  const currentUserId = staffUser?._id;

  // Ask for desktop-notification permission on the first interaction (browsers
  // require a user gesture), so order alerts still reach staff on another tab.
  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined" || !("Notification" in window)) return undefined;
    if (Notification.permission !== "default") return undefined;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
      document.removeEventListener("pointerdown", ask, true);
    };
    document.addEventListener("pointerdown", ask, true);
    return () => document.removeEventListener("pointerdown", ask, true);
  }, [isAuthenticated]);

  // Fetch initial notifications from backend on mount
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      if (!isAuthenticated) {
        setIsLoadingInitial(false);
        return;
      }

      try {
        const response = await getNotifications({ limit: 50, unreadOnly: false });
        
        if (response.success && response.data) {
          // Transform backend notifications to match our format
          const transformedNotifications = response.data.map(n => ({
            id: n._id,
            type: normalizeServerType(n.type, n.payload?.status),
            message: n.message || n.title,
            title: n.title,
            orderId: n.payload?.orderId,
            orderNumber: n.payload?.orderNumber,
            // Needed by the waiter/kitchen panel's Ready / Preparing / Delivered tabs
            status: n.payload?.status,
            callId: n.payload?.callId,
            actionUrl: n.actionUrl,
            isRead: n.isRead,
            createdAt: new Date(n.createdAt),
            priority: n.priority,
          }));

          // The server can hold two records for one status step (e.g. an
          // order_status and an order_delivered row); show one card.
          const seenSteps = new Set();
          setNotifications(transformedNotifications.filter((n) => {
            if (!n.orderId || !n.status) return true;
            const key = `${n.orderId}:${n.status}`;
            if (seenSteps.has(key)) return false;
            seenSteps.add(key);
            return true;
          }));
        }
      } catch {
        // Backend unreachable — keep localStorage notifications as fallback
      } finally {
        setIsLoadingInitial(false);
      }
    };

    fetchInitialNotifications();
  }, [isAuthenticated]);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    if (!isLoadingInitial) {
      saveNotificationsToStorage(currentUserId, notifications);
    }
  }, [notifications, isLoadingInitial, currentUserId]);

  // Computed unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Add a new notification (with duplicate prevention)
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: `${notification.type}-${notification.orderId || notification.callId || Date.now()}-${Date.now()}`,
      createdAt: new Date(),
      isRead: false,
      ...notification,
    };

    setNotifications(prev => {
      // Prevent duplicates. An order status step (orderId + status) or a
      // waiter call (callId) is one card no matter how many channels deliver
      // it (socket event, persisted echo, reload). Other entries for the same
      // order (e.g. "order updated") are only merged within 5 seconds.
      const isDuplicate = prev.some(n =>
        (notification.id && n.id === notification.id) ||
        (notification.callId && n.type === notification.type && String(n.callId) === String(notification.callId)) ||
        (notification.orderId && String(n.orderId) === String(notification.orderId) && (
          (notification.status && n.status === notification.status) ||
          (n.type === notification.type && !notification.status && !n.status && (new Date() - new Date(n.createdAt)) < 5000)
        ))
      );

      if (isDuplicate) {
        return prev;
      }

      const newState = [newNotification, ...prev.slice(0, 99)]; // Keep max 100 notifications
      return newState;
    });
  }, []);

  // Mark single notification as read
  const markRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    // Persist so the badge does not come back on reload. Socket-only
    // notifications have client-generated ids the server won't recognise.
    if (/^[0-9a-f]{24}$/i.test(String(notificationId))) {
      markNotificationsRead([notificationId]).catch(() => { });
    }
  }, []);

  // Mark all notifications as read
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    // Empty payload marks every notification for this user server-side.
    markNotificationsRead().catch(() => { });
  }, []);

  // Clear all notifications (also clears storage)
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(storageKeyFor(currentUserId));
  }, [currentUserId]);

  // Remove a specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Subscribe to socket events
  useEffect(() => {
    if (!subscribe || !isAuthenticated) {
      return;
    }

    const unsubscribers = [];

    /**
     * Single entry point for "a new order arrived", whichever channel delivered
     * it. Plays the order sound, adds one bell entry, shows one toast and (if
     * the tab is in the background) one desktop notification — once per order.
     */
    const alertNewOrder = ({ orderId, orderNumber, location, serverId, message }) => {
      const now = Date.now();
      const seen = alertedOrdersRef.current;
      for (const [id, at] of seen) if (now - at > ORDER_ALERT_TTL_MS) seen.delete(id);

      if (orderId && seen.has(orderId)) {
        // Already alerted. If this is the persisted copy, adopt its server id so
        // "mark as read" is saved and the badge doesn't return after a reload.
        if (serverId && isServerId(serverId)) {
          setNotifications((prev) => prev.map((n) =>
            n.type === NOTIFICATION_TYPES.NEW_ORDER && String(n.orderId) === orderId && !isServerId(n.id)
              ? { ...n, id: serverId }
              : n
          ));
        }
        return;
      }
      if (orderId) seen.set(orderId, now);

      const text = message || `New order #${orderNumber} for ${location}`;
      playWithVibration('newOrder');
      addNotification({
        ...(serverId ? { id: serverId } : {}),
        type: NOTIFICATION_TYPES.NEW_ORDER,
        message: text,
        orderId,
        orderNumber,
        priority: 'high',
      });

      if (!ROLES_WITH_OWN_ORDER_TOAST.has(staffRole)) {
        toast.info(`🔔 New order #${orderNumber} · ${location}`, {
          toastId: `new-order-${orderId || orderNumber}`,
          autoClose: 8000,
        });
      }

      if (desktopAlertsAllowed(staffRole)) {
        showDesktopNotification({
          title: `New order #${orderNumber}`,
          body: `${location} — tap to view`,
          tag: `new-order-${orderId || orderNumber}`,
        });
      }
    };

    // New order via real-time socket (skip orders this user placed themselves)
    unsubscribers.push(
      subscribe('new-order', (data) => {
        if (data?.creatorId && currentUserId && data.creatorId === currentUserId) return;
        const order = data?.order;
        if (!order) return;

        alertNewOrder({
          orderId: order._id ? String(order._id) : null,
          orderNumber: order.orderNumber,
          location: formatOrderLocation({
            orderType: order.orderType,
            roomNumber: order.roomNumber,
            tableNumber: order.tableNumber,
          }),
        });
      })
    );

    /**
     * Single entry point for "an order's status changed". A change can reach
     * us several ways — "order-status-updated", "order-ready" (waiters),
     * "order-cancelled", and the persisted notification's echo — so we key on
     * orderId + status and alert exactly once: sound, bell entry, toast and a
     * desktop notification when the tab is in the background.
     */
    const alertOrderStatus = ({ orderId, orderNumber, status, orderType, roomNumber, tableNumber, message, serverId }) => {
      if (!status || (!orderId && !orderNumber)) return;
      const key = `${orderId || orderNumber}:${status}`;
      const now = Date.now();
      const seen = alertedStatusRef.current;
      for (const [k, at] of seen) if (now - at > ORDER_ALERT_TTL_MS) seen.delete(k);

      if (seen.has(key)) {
        if (serverId && isServerId(serverId)) {
          setNotifications((prev) => prev.map((n) =>
            String(n.orderId) === String(orderId) && n.status === status && !isServerId(n.id)
              ? { ...n, id: serverId }
              : n
          ));
        }
        return;
      }
      seen.set(key, now);

      const location = formatOrderLocation({ orderType, roomNumber, tableNumber });
      const text = message || `${STATUS_EMOJI[status] || '📝'} Order #${orderNumber} (${location}) → ${String(status).toUpperCase()}`;
      const isReady = status === 'ready';
      const isCancelled = status === 'cancelled';

      playWithVibration(isReady ? 'orderReady' : isCancelled ? 'orderCancelled' : 'statusUpdate');

      addNotification({
        ...(serverId ? { id: serverId } : {}),
        type: isReady ? NOTIFICATION_TYPES.ORDER_READY : NOTIFICATION_TYPES.ORDER_STATUS,
        message: text,
        orderId: orderId ? String(orderId) : undefined,
        orderNumber,
        status,
        priority: isReady || isCancelled ? 'high' : 'medium',
      });

      if (!ROLES_WITH_OWN_ORDER_TOAST.has(staffRole)) {
        const toastFn = isReady ? toast.success : isCancelled ? toast.error : toast.info;
        toastFn(text, { toastId: `status-${key}`, autoClose: isReady || isCancelled ? 8000 : 5000 });
      }

      if (desktopAlertsAllowed(staffRole)) {
        showDesktopNotification({
          title: isReady ? `Order #${orderNumber} is ready` : isCancelled ? `Order #${orderNumber} cancelled` : `Order #${orderNumber} → ${status}`,
          body: `${location}`,
          tag: `status-${key}`,
        });
      }
    };

    const isSelf = (data) => data?.updaterId && currentUserId && String(data.updaterId) === String(currentUserId);

    // Pickup alert for waiters (backend sends it only to the waiters room)
    unsubscribers.push(
      subscribe('order-ready', (data) => {
        if (isSelf(data)) return;
        alertOrderStatus({ ...data, status: 'ready' });
      })
    );

    // Any status change, broadcast to every staff member of the hotel
    unsubscribers.push(
      subscribe('order-status-updated', (data) => {
        if (isSelf(data)) return;
        alertOrderStatus(data);
      })
    );

    // Guest-initiated cancellation (older backends only sent this event)
    unsubscribers.push(
      subscribe('order-cancelled', (data) => {
        if (isSelf(data)) return;
        alertOrderStatus({ ...data, status: 'cancelled' });
      })
    );

    // Order details updated (price, items, customer info, etc.)
    unsubscribers.push(
      subscribe('order-updated', (data) => {
        // Skip if this is our own update (self-notification)
        if (data.updaterId && currentUserId && data.updaterId === currentUserId) {
          return;
        }
        
        // Use the message from backend
        const message = data.message || `Order #${data.orderNumber} was updated`;
        
        addNotification({
          type: NOTIFICATION_TYPES.ORDER_STATUS, // Reuse ORDER_STATUS type
          message,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
        });
        
        playWithVibration('notification');
      })
    );

    // Waiter call notifications (for waiters only)
    if (staffRole === 'waiter') {
      // A call can arrive on two rooms (hotel + waiters): count and beep once per call id.
      unsubscribers.push(
        subscribe('new-waiter-call', (data) => {
          const callId = data?.call?._id ? String(data.call._id) : null;
          if (callId && openCallIdsRef.current.has(callId)) return;
          if (callId) openCallIdsRef.current.add(callId);
          playWithVibration('waiterCall');
          setWaiterCallCount(openCallIdsRef.current.size || ((prev) => prev + 1));

          addNotification({
            type: NOTIFICATION_TYPES.WAITER_CALL,
            message: `${data.call.priority} priority request from ${data.call.roomNumber ? `Room ${data.call.roomNumber}` : data.call.tableNumber ? `Table ${data.call.tableNumber}` : 'a guest'}`,
            callId: data.call._id,
          });
        })
      );

      unsubscribers.push(
        subscribe('waiter-call-resolved', (data) => {
          const callId = data?.callId ? String(data.callId) : null;
          if (callId && openCallIdsRef.current.delete(callId)) {
            setWaiterCallCount(openCallIdsRef.current.size);
          } else if (!callId) {
            setWaiterCallCount(prev => Math.max(0, prev - 1));
          }
        })
      );
    }

    // ── Real-time in-app notifications from backend (messages, alerts, etc.) ──
    // The backend emits "notification" directly to user-<id> personal room
    // whenever a channel message or DM is sent.
    unsubscribers.push(
      subscribe('notification', (data) => {
        // Persisted "new order" alert: route through the same path so it's
        // deduped against the socket event (and still alerts if this staff
        // member's socket never joined the hotel room).
        if (data?.type === NOTIFICATION_TYPES.NEW_ORDER) {
          const p = data.payload || {};
          alertNewOrder({
            orderId: p.orderId ? String(p.orderId) : null,
            orderNumber: p.orderNumber,
            location: formatOrderLocation({ orderType: p.orderType, roomNumber: p.roomNumber, tableNumber: p.tableNumber }),
            serverId: data._id,
            message: data.title,
          });
          return;
        }

        // Persisted order-status notification: merge with the live event so
        // it alerts once (and still alerts if the live event never arrived).
        if ((data?.type === 'order_status' || data?.type === 'order_delivered') && data.payload?.status) {
          const p = data.payload;
          alertOrderStatus({
            orderId: p.orderId,
            orderNumber: p.orderNumber,
            status: p.status,
            orderType: p.orderType,
            roomNumber: p.roomNumber,
            tableNumber: p.tableNumber,
            message: data.message,
            serverId: data._id,
          });
          return;
        }

        playWithVibration('notification');
        addNotification({
          id: data._id || `notif-${Date.now()}`,
          type: data.type || NOTIFICATION_TYPES.MESSAGE,
          title: data.title,
          message: data.message,
          priority: data.priority || 'medium',
          actionUrl: data.actionUrl,
          isRead: false,
          createdAt: new Date(data.createdAt || Date.now()),
          payload: data.payload,
        });
      })
    );

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [subscribe, isAuthenticated, staffRole, currentUserId, playWithVibration, addNotification]);

  // Seed the dedupe map from the initial fetch so a reload doesn't re-alert
  // for orders that are already in the bell.
  useEffect(() => {
    if (isLoadingInitial) return;
    const now = Date.now();
    notifications.forEach((n) => {
      if (!n.orderId) return;
      if (n.type === NOTIFICATION_TYPES.NEW_ORDER && !alertedOrdersRef.current.has(String(n.orderId))) {
        alertedOrdersRef.current.set(String(n.orderId), now);
      }
      if (n.status) {
        const key = `${n.orderId}:${n.status}`;
        if (!alertedStatusRef.current.has(key)) alertedStatusRef.current.set(key, now);
      }
    });
  }, [isLoadingInitial, notifications]);

  const value = {
    // State
    notifications,
    unreadCount,
    waiterCallCount,
    isLoadingInitial,
    
    // Actions
    addNotification,
    markRead,
    markAllRead,
    clearAll,
    removeNotification,
    setWaiterCallCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {isAuthenticated && audioState === "suspended" && <SoundUnlockPrompt onEnable={enableSound} />}
    </NotificationContext.Provider>
  );
};

// useNotifications hook is exported from useNotifications.js to satisfy React Fast Refresh

export default NotificationContext;
