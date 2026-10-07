/* eslint-disable react-refresh/only-export-components */
/**
 * Socket Context
 * 
 * This file creates a React Context for Socket.io connection.
 * Context allows us to share the socket connection across all components
 * without passing it as props through every level.
 * 
 * WHAT IS SOCKET.IO?
 * - WebSocket library that enables real-time, bidirectional communication
 * - Unlike HTTP (request → response), WebSocket keeps connection open
 * - Server can push updates to client instantly without client asking
 * 
 * REAL-WORLD USE CASE:
 * - Kitchen marks order as "ready"
 * - Server instantly notifies all waiter dashboards
 * - Waiter sees the update without refreshing page
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { getActiveProperty, getCurrentStaffUser } from "../api/services/staffAccount.service";
import { getSocketUrl } from "../utils/apiConfig";
import { refreshSession } from "../api/client";
import { useStaffAuth } from "./StaffAuthContext";

/**
 * Who the socket should connect as, read from storage. Changes whenever a
 * staff member / guest logs in or out, or the active property changes.
 */
const computeIdentityKey = () => {
  const staffUser = getCurrentStaffUser();
  if (staffUser?._id) return `staff:${staffUser._id}:${getActiveProperty()?._id || ""}`;
  const guestUserId = localStorage.getItem("userId");
  if (localStorage.getItem("accessToken") && guestUserId && localStorage.getItem("role") === "guest") {
    return `guest:${guestUserId}`;
  }
  const qr = localStorage.getItem("guestSessionId");
  if (qr) return `qr:${qr}`;
  return "none";
};

// Create the context
const SocketContext = createContext(null);

// Backend server URL
const SOCKET_URL = getSocketUrl();

/**
 * SocketProvider Component
 * Wraps the app and provides socket connection to all children.
 * Connects for both staff users (with activeProperty) and guest users
 * (with guest accessToken and userId in localStorage).
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  // Refs to store callbacks that will be called when events arrive
  const eventListeners = useRef(new Map());

  // The connection is keyed on identity. Previously it was created once on app
  // mount ([] deps): a waiter/cook who opened the app on the login page and then
  // signed in had NO socket until a full page reload — so no live orders, no
  // status updates, no sounds. Re-evaluate on login/logout, route changes and
  // cross-tab storage changes, and reconnect when the identity changes.
  const { staffUser: authStaffUser, activeProperty: authActiveProperty } = useStaffAuth();
  const { pathname } = useLocation();
  const [identityKey, setIdentityKey] = useState(computeIdentityKey);

  useEffect(() => {
    setIdentityKey(computeIdentityKey());
  }, [authStaffUser?._id, authActiveProperty?._id, pathname]);

  useEffect(() => {
    const onStorage = () => setIdentityKey(computeIdentityKey());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Initialize socket connection for staff, registered guests, or anonymous QR guests
  useEffect(() => {
    const staffUser = getCurrentStaffUser();
    const activeProperty = getActiveProperty();

    // Registered guest detection
    const guestToken = localStorage.getItem("accessToken");
    const guestUserId = localStorage.getItem("userId");
    const guestRole = localStorage.getItem("role");

    // Anonymous QR guest detection — set by GuestTableView / GuestRoomView on mount
    const qrGuestSessionId = localStorage.getItem("guestSessionId");

    // Platform-level staff (superadmin) have no activeProperty, so hotel scope
    // must stay optional here or they never get a socket — and never receive
    // the "notification" events the backend pushes to their personal room.
    const isStaffUser = !!staffUser;
    const isGuestUser = !!(guestToken && guestUserId && guestRole === "guest");
    const isQrGuest = !!qrGuestSessionId && !isStaffUser && !isGuestUser;

    // Only connect when we have a meaningful identity
    if (!isStaffUser && !isGuestUser && !isQrGuest) {
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    // Access token used by the server to verify the handshake identity and
    // authorize hotel-room joins. QR guests have no token and connect anonymously.
    // sessionStorage is the primary store (see StaffAuthContext) — read it
    // first, falling back to localStorage only for any pre-existing session
    // written there before that fallback was removed.
    const staffAccessToken = sessionStorage.getItem("staffAccessToken");

    // Build auth payload — QR guests connect without credentials
    const authPayload = isStaffUser
      ? {
          token: staffAccessToken || undefined,
          userId: staffUser._id,
          role: staffUser.role,
          hotelId: activeProperty?._id || null,
        }
      : isGuestUser
      ? {
          token: guestToken || undefined,
          userId: guestUserId,
          role: "guest",
          hotelId: localStorage.getItem("activeHotelId") || null,
        }
      : {
          role: "qr-guest",
        };

    // auth as a function: socket.io calls it on every (re)connect, so a token
    // rotated by the HTTP client is picked up instead of the stale one
    // captured when the socket was created.
    const currentAuth = (cb) => cb({
      ...authPayload,
      ...(isStaffUser ? { token: sessionStorage.getItem("staffAccessToken") || undefined } : {}),
      ...(isGuestUser ? { token: localStorage.getItem("accessToken") || undefined } : {}),
    });

    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      auth: currentAuth,
      reconnection: true,
      // Staff dashboards stay open all day: never give up reconnecting (the
      // old limit of 5 attempts meant a short outage or backend restart left
      // the dashboard deaf to orders until someone reloaded the page).
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    // Connection established
    socketInstance.on("connect", () => {
      setIsConnected(true);

      if (isStaffUser) {
        if (activeProperty?._id) {
          socketInstance.emit("join-hotel", activeProperty._id);
        }
        // Without a hotelId the server joins only the personal room
        // (user-<id>), which is all a platform-level admin needs.
        socketInstance.emit("join-role", {
          hotelId: activeProperty?._id || undefined,
          role: staffUser.role,
          userId: staffUser._id,
          fullname: staffUser.fullname || staffUser.name || "Unknown",
        });
      } else if (isGuestUser) {
        socketInstance.emit("join-role", {
          hotelId: authPayload.hotelId,
          role: "guest",
          userId: guestUserId,
          fullname: localStorage.getItem("username") || "Guest",
        });
      } else if (isQrGuest) {
        // Join the deterministic session room so order-status-update events arrive
        socketInstance.emit("join-guest-session", qrGuestSessionId);
      }
    });

    // The server ends a socket when its access token expires ("io server
    // disconnect") and rejects handshakes with an expired token; socket.io does
    // not retry either case by itself. Refresh the session, then reconnect.
    let disposed = false;
    let authRetries = 0;
    const reconnectWithFreshToken = async () => {
      if (disposed || authRetries >= 3) return;
      authRetries += 1;
      if (isStaffUser || isGuestUser) {
        try {
          await refreshSession(isStaffUser ? "staff" : "guest");
        } catch {
          // Refresh failed (signed out elsewhere); the HTTP client handles logout.
          return;
        }
      }
      if (!disposed) setTimeout(() => !disposed && socketInstance.connect(), 500 * authRetries);
    };

    socketInstance.on("connect", () => { authRetries = 0; });

    // Connection lost
    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      if (reason === "io server disconnect") reconnectWithFreshToken();
    });

    // Connection error
    socketInstance.on("connect_error", (error) => {
      setIsConnected(false);
      if (error?.message === "Not authorized") reconnectWithFreshToken();
    });

    // Store socket instance
    setSocket(socketInstance);

    // Cleanup on identity change (logout, user switch) or unmount
    return () => {
      disposed = true;
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [identityKey]);

  /**
   * Subscribe to a socket event
   * @param {string} event - Event name
   * @param {function} callback - Function to call when event arrives
   */
  const subscribe = useCallback((event, callback) => {
    if (!socket) return () => { };

    // Wrap callback so we can properly unsubscribe later
    const handler = (data) => {
      setLastEvent({ event, data, timestamp: Date.now() });
      callback(data);
    };

    // Add listener with the wrapper
    socket.on(event, handler);

    // Store handler reference for cleanup
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, []);
    }
    eventListeners.current.get(event).push(handler);

    // Return unsubscribe function using the same wrapper reference
    return () => {
      socket.off(event, handler);
      const listeners = eventListeners.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, [socket]);

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  const value = {
    socket,
    isConnected,
    lastEvent,
    subscribe,
    emit,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to use socket context
 * Usage: const { socket, isConnected, subscribe, emit } = useSocket();
 */
export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
};

export default SocketContext;
