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
import { io } from "socket.io-client";
import { getActiveProperty, getCurrentStaffUser } from "../../api/staff";

// Create the context
const SocketContext = createContext(null);

// Backend server URL
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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

  // Initialize socket connection for staff OR guest users
  useEffect(() => {
    const staffUser = getCurrentStaffUser();
    const activeProperty = getActiveProperty();

    // Guest user detection: non-staff users with guest accessToken
    const guestToken = localStorage.getItem("accessToken");
    const guestUserId = localStorage.getItem("userId");
    const guestRole = localStorage.getItem("role");
    const isStaffUser = !!(staffUser && activeProperty);
    const isGuestUser = !!(guestToken && guestUserId && guestRole === "guest");

    // Only connect if a valid user session exists
    if (!isStaffUser && !isGuestUser) {
      return;
    }

    // Build auth payload based on user type
    const authPayload = isStaffUser
      ? {
          userId: staffUser._id,
          role: staffUser.role,
          hotelId: activeProperty._id,
        }
      : {
          userId: guestUserId,
          role: "guest",
          hotelId: localStorage.getItem("activeHotelId") || null,
        };

    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      auth: authPayload,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Connection established
    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setIsConnected(true);

      // Join hotel room to receive hotel-specific updates
      if (activeProperty?._id) {
        console.log(`Joining as staff role: ${staffUser.role} for hotel: ${activeProperty._id}`);
        socketInstance.emit("join-hotel", activeProperty._id);

        // Join role-specific room
        socketInstance.emit("join-role", {
          hotelId: activeProperty._id,
          role: staffUser.role,
          userId: staffUser._id,
          fullname: staffUser.fullname || staffUser.name || "Unknown",
        });
      } else if (isGuestUser) {
        console.log(`Joining as guest user: ${guestUserId}`);
        // Join personal room for direct order status updates
        socketInstance.emit("join-role", {
          hotelId: authPayload.hotelId,
          role: "guest",
          userId: guestUserId,
          fullname: localStorage.getItem("username") || "Guest",
        });
      }
    });

    // Connection lost
    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
    });

    // Connection error
    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
    });

    // Store socket instance
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log("🔌 Cleaning up socket connection");
      socketInstance.disconnect();
    };
  }, []);

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
    } else {
      console.warn("⚠️ Socket not connected, cannot emit:", event);
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
