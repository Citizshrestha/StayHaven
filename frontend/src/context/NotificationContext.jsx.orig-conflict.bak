<<<<<<< HEAD
﻿/**
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

import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { useSocket } from "./SocketContext";
import { useStaffAuth } from "./StaffAuthContext";
import useNotificationSound from "../hooks/useNotificationSound";
import { NOTIFICATION_TYPES } from "./useNotifications";

const NotificationContext = createContext(null);

// Note: NOTIFICATION_TYPES and useNotifications hook are in useNotifications.js
// to satisfy React Fast Refresh requirements

// localStorage key for persisting notifications
const NOTIFICATIONS_STORAGE_KEY = 'waiter_notifications';

// Load notifications from localStorage
const loadNotificationsFromStorage = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects for createdAt
      return parsed.map(n => ({ ...n, createdAt: new Date(n.createdAt) }));
    }
  } catch (e) {
    console.warn('Failed to load notifications from storage:', e);
  }
  return [];
};

// Save notifications to localStorage
const saveNotificationsToStorage = (notifications) => {
  try {
    // Keep only recent 50 notifications in storage to avoid bloat
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save notifications to storage:', e);
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => loadNotificationsFromStorage());
  const [waiterCallCount, setWaiterCallCount] = useState(0);
  
  const { subscribe } = useSocket();
  const { staffRole, isAuthenticated, staffUser } = useStaffAuth();
  const { playWithVibration } = useNotificationSound();
  
  // Get current user ID for filtering self-notifications
  const currentUserId = staffUser?._id;

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

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
      // Prevent duplicates: check if same type + orderId exists within last 5 seconds
      const isDuplicate = prev.some(n => 
        n.type === notification.type && 
        n.orderId === notification.orderId &&
        notification.orderId && // Only check if orderId exists
        (new Date() - new Date(n.createdAt)) < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) {
        console.log('🔇 Duplicate notification ignored:', notification.type, notification.orderId);
        return prev;
      }
      
      return [newNotification, ...prev.slice(0, 99)]; // Keep max 100 notifications
    });
  }, []);

  // Mark single notification as read
  const markRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // Clear all notifications (also clears storage)
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Subscribe to socket events
  useEffect(() => {
    if (!subscribe || !isAuthenticated) return;

    console.log(`📡 [NotificationContext] Setting up subscriptions for role: ${staffRole}`);
    const unsubscribers = [];

    // New order notification (skip if current user is the creator)
    unsubscribers.push(
      subscribe('new-order', (data) => {
        console.log('📦 [NotificationContext] New order received:', data);
        
        // Skip notification if current user created this order (self-notification)
        if (data.creatorId && currentUserId && data.creatorId === currentUserId) {
          console.log('🔇 Skipping self-notification for new order:', data.order?.orderNumber);
          return;
        }
        
        console.log('🔊 [NotificationContext] Playing sound for new order');
        playWithVibration('newOrder');
        
        const location = data.order.orderType === 'roomService'
          ? `Room ${data.order.roomNumber}`
          : `Table ${data.order.tableNumber}`;
        
        addNotification({
          type: NOTIFICATION_TYPES.NEW_ORDER,
          message: `New order #${data.order.orderNumber} for ${location}`,
          orderId: data.order._id,
          orderNumber: data.order.orderNumber,
        });
      })
    );

    // Order ready notification (for waiters)
    unsubscribers.push(
      subscribe('order-ready', (data) => {
        console.log('🔔 [NotificationContext] Order ready:', data);
        playWithVibration('orderReady');
        
        addNotification({
          type: NOTIFICATION_TYPES.ORDER_READY,
          message: data.message || `Order #${data.orderNumber} is ready for pickup!`,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
        });
      })
    );

    // Order status updated (cross-role notification - only sent to the OTHER role)
    // Chiefs receive this when waiters update, waiters receive when chiefs update
    unsubscribers.push(
      subscribe('order-status-updated', (data) => {
        console.log('📝 [NotificationContext] Status updated:', data);
        
        // Skip if this is our own update (self-notification)
        if (data.updaterId && currentUserId && data.updaterId === currentUserId) {
          console.log('🔇 Skipping self-notification for order:', data.orderNumber);
          return;
        }
        
        // Use the message from backend if provided, otherwise format our own
        const message = data.message || (() => {
          const statusEmoji = {
            preparing: '🍳',
            ready: '✅',
            delivered: '🎉',
            cancelled: '❌',
            confirmed: '👍',
            pending: '⏳',
          };
          const emoji = statusEmoji[data.status] || '📝';
          const location = data.orderType === 'roomService'
            ? `Room ${data.roomNumber}`
            : `Table ${data.tableNumber}`;
          return `${emoji} Order #${data.orderNumber} (${location}) → ${data.status.toUpperCase()}`;
        })();
        
        addNotification({
          type: NOTIFICATION_TYPES.ORDER_STATUS,
          message,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          status: data.status,
        });
        
        playWithVibration('notification');
      })
    );

    // Waiter call notifications (for waiters only)
    if (staffRole === 'waiter') {
      unsubscribers.push(
        subscribe('new-waiter-call', (data) => {
          console.log('📞 [NotificationContext] Waiter call:', data);
          playWithVibration('waiterCall');
          setWaiterCallCount(prev => prev + 1);
          
          addNotification({
            type: NOTIFICATION_TYPES.WAITER_CALL,
            message: `${data.call.priority} priority request from Room ${data.call.roomNumber}`,
            callId: data.call._id,
          });
        })
      );

      unsubscribers.push(
        subscribe('waiter-call-resolved', () => {
          setWaiterCallCount(prev => Math.max(0, prev - 1));
        })
      );
    }

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [subscribe, isAuthenticated, staffRole, currentUserId, playWithVibration, addNotification]);

  const value = {
    // State
    notifications,
    unreadCount,
    waiterCallCount,
    
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
    </NotificationContext.Provider>
  );
};

// useNotifications hook is exported from useNotifications.js to satisfy React Fast Refresh

export default NotificationContext;
=======
// Re-export from canonical location to avoid duplicate module instances
export { NotificationProvider } from '../core/context/NotificationContext';
export { default } from '../core/context/NotificationContext';
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
