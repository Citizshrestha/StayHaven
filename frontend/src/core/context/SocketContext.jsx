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
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * SocketProvider Component
 * Wraps the app and provides socket connection to all children
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  // Refs to store callbacks that will be called when events arrive
  const eventListeners = useRef(new Map());

  // Initialize socket connection
  useEffect(() => {
    const staffUser = getCurrentStaffUser();
    const activeProperty = getActiveProperty();

    // Only connect if user is logged in
    if (!staffUser || !activeProperty) {
      return;
    }

    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      // Send auth info with connection
      auth: {
        userId: staffUser._id,
        role: staffUser.role,
        hotelId: activeProperty._id,
      },
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Timeout settings
      timeout: 20000,
    });

    // Connection established
    socketInstance.on("connect", () => {
      console.log("🔌 Socket connected:", socketInstance.id);
      console.log(`👤 Socket joining as role: ${staffUser.role} for hotel: ${activeProperty._id}`);
      setIsConnected(true);

      // Join hotel room to receive hotel-specific updates
      socketInstance.emit("join-hotel", activeProperty._id);

      // Join role-specific room
      socketInstance.emit("join-role", {
        hotelId: activeProperty._id,
        role: staffUser.role,
        userId: staffUser._id,
      });
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

    // Add listener
    socket.on(event, (data) => {
      setLastEvent({ event, data, timestamp: Date.now() });
      callback(data);
    });

    // Store callback reference for cleanup
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, []);
    }
    eventListeners.current.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      socket.off(event, callback);
      const listeners = eventListeners.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
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
