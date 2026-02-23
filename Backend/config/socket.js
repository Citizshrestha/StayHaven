/**
 * Socket.io Configuration
 * 
 * This file sets up WebSocket communication for real-time updates.
 * WebSockets allow instant bidirectional communication between server and clients.
 * 
 * USE CASES:
 * 1. When kitchen marks an order as "ready", waiter dashboard instantly updates
 * 2. When a guest presses "Call Waiter", waiter gets instant notification
 * 3. New orders appear instantly without page refresh
 */

import { Server } from "socket.io";

let io = null;


export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    // Ping timeout - how long to wait before considering connection dead
    pingTimeout: 60000,
    // How often to ping clients to check connection
    pingInterval: 25000,
  });

  // Handle new connections
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // When a staff member joins, add them to their hotel's room
    // This allows us to send updates only to staff of a specific hotel
    socket.on("join-hotel", (hotelId) => {
      if (hotelId) {
        socket.join(`hotel-${hotelId}`);
        console.log(`👤 Socket ${socket.id} joined hotel room: hotel-${hotelId}`);
      }
    });

    // When a staff member joins, also add them to their role-specific room
    socket.on("join-role", ({ hotelId, role, userId }) => {
      if (hotelId && role) {
        // Join role-specific room (e.g., "hotel-123-waiters")
        socket.join(`hotel-${hotelId}-${role}s`);
        // Also join personal room for direct messages
        if (userId) {
          socket.join(`user-${userId}`);
        }
        console.log(`👤 Socket ${socket.id} joined as ${role} in hotel-${hotelId}`);
      }
    });

    // Handle waiter acknowledging a call
    socket.on("acknowledge-call", (data) => {
      const { callId, hotelId, waiterId, waiterName } = data;
      // Broadcast to all staff in the hotel that this call was acknowledged
      io.to(`hotel-${hotelId}`).emit("call-acknowledged", {
        callId,
        waiterId,
        waiterName,
        acknowledgedAt: new Date(),
      });
    });

    // ── Messaging events ──
    // Typing indicator
    socket.on("typing", ({ hotelId, channel, userId, fullname }) => {
      const room = channel === "direct"
        ? null
        : `hotel-${hotelId}-${channel}s`;
      if (room) {
        socket.to(room).emit("user-typing", { userId, fullname, channel });
      }
    });

    socket.on("stop-typing", ({ hotelId, channel, userId }) => {
      const room = channel === "direct"
        ? null
        : `hotel-${hotelId}-${channel}s`;
      if (room) {
        socket.to(room).emit("user-stop-typing", { userId, channel });
      }
    });

    // Call management
    socket.on("answer-call", ({ callId, hotelId }) => {
      io.to(`hotel-${hotelId}`).emit("call-answered", { callId });
    });

    socket.on("decline-call", ({ callId, hotelId }) => {
      io.to(`hotel-${hotelId}`).emit("call-declined", { callId });
    });

    socket.on("end-call", ({ callId, hotelId, duration }) => {
      io.to(`hotel-${hotelId}`).emit("call-ended", { callId, duration });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.io initialized");
  return io;
};

/**
 * Get the Socket.io instance
 * @returns {Server|null} - Socket.io server instance
 */
export const getIO = () => {
  if (!io) {
    console.warn("⚠️ Socket.io not initialized yet!");
  }
  return io;
};

/**
 * Emit event to all clients in a specific hotel
 * @param {string} hotelId - The hotel ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToHotel = (hotelId, event, data) => {
  if (io) {
    io.to(`hotel-${hotelId}`).emit(event, data);
  }
};

/**
 * Emit event to all waiters in a specific hotel
 * @param {string} hotelId - The hotel ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToWaiters = (hotelId, event, data) => {
  if (io) {
    io.to(`hotel-${hotelId}-waiters`).emit(event, data);
  }
};

/**
 * Emit event to kitchen staff in a specific hotel
 * (Includes both 'chief' and 'kitchen' roles)
 * @param {string} hotelId - The hotel ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToKitchen = (hotelId, event, data) => {
  if (io) {
    // Emit to both 'chiefs' and 'kitchens' rooms (different role names, same function)
    io.to(`hotel-${hotelId}-chiefs`).emit(event, data);
    io.to(`hotel-${hotelId}-kitchens`).emit(event, data);
  }
};

/**
 * Emit event to a specific user
 * @param {string} userId - The user ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};

export default { initSocket, getIO, emitToHotel, emitToWaiters, emitToKitchen, emitToUser };
