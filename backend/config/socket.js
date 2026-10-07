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
import { authenticateSocket, authorizeSocketPacket, canJoinHotel } from "./socketSecurity.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger('Socket');
let io = null;

/**
 * Determine whether a socket's verified identity may join a hotel's room.
 * Fail-closed: without a verified identity, no hotel access is granted.
 * Cross-company access is denied; intra-company access is allowed.
 * @param {import('socket.io').Socket} socket
 * @param {string} hotelId
 * @returns {Promise<boolean>}
 */
// Track online users: Map<userId, { socketId, hotelId, role, fullname }>
const onlineUsers = new Map();


export const initSocket = (httpServer) => {
  const corsOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    // Ping timeout - how long to wait before considering connection dead
    pingTimeout: 60000,
    // How often to ping clients to check connection
    pingInterval: 25000,
    // Enable transport upgrade from HTTP to WebSocket
    transports: ['websocket', 'polling'],
    // Allow upgrades
    allowUpgrades: true,
  });

  // Authenticate the handshake. A valid access token attaches a *verified*
  // identity (socket.authUser) used to gate hotel-room joins. Anonymous QR
  // guests connect without a token and simply get no hotel privileges.
  io.use(async (socket, next) => {
    try {
      await authenticateSocket(socket);
      next();
    } catch {
      next(new Error("Not authorized"));
    }
  });

  // Handle new connections
  io.on("connection", (socket) => {
    logger.debug(`Client connected: ${socket.id}`);

    socket.use(async (packet, next) => {
      try {
        if (!(await authorizeSocketPacket(socket, packet))) return next(new Error("Not authorized"));
        next();
      } catch {
        next(new Error("Invalid socket request"));
      }
    });
    if (socket.authUser) {
      socket.join(`user-${socket.authUser.userId}`);
      socket.userId = socket.authUser.userId;
      const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(1, socket.authUser.expiresAt - Date.now()));
      expiryTimer.unref?.();
      socket.once("disconnect", () => clearTimeout(expiryTimer));
    }

    // When a staff member joins, add them to their hotel's room
    // This allows us to send updates only to staff of a specific hotel
    socket.on("join-hotel", async (hotelId) => {
      if (!hotelId) return;
      // Fail-closed: only verified staff of this hotel/company may join the
      // hotel room, which receives live orders containing guest PII.
      if (!(await canJoinHotel(socket, hotelId))) {
        logger.warn(`⛔ Denied join-hotel for hotel-${hotelId}`, {
          socketId: socket.id,
          role: socket.authUser?.role || "anonymous",
        });
        return;
      }
      socket.join(`hotel-${hotelId}`);
      socket.hotelId = hotelId;
      logger.debug(`Socket ${socket.id} joined hotel room: hotel-${hotelId}`);
    });

    // Anonymous QR guests join a session-specific room so status updates
    // can be pushed to them without a user account. The sessionId itself is
    // the only credential here, so it must be shaped like the unguessable
    // value the frontend actually generates (GUEST-<uuid-or-32-hex-chars>) —
    // this rejects short/guessable/malformed values outright. Genuine brute
    // force is still infeasible (128 bits of entropy), but this closes off
    // cheap probing and keeps the room namespace to well-formed values only.
    const GUEST_SESSION_ID_PATTERN = /^GUEST-(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    let guestSessionJoinAttempts = 0;
    socket.on("join-guest-session", (sessionId) => {
      guestSessionJoinAttempts += 1;
      if (guestSessionJoinAttempts > 5) {
        logger.warn(`⛔ Too many join-guest-session attempts, disconnecting`, { socketId: socket.id });
        socket.disconnect(true);
        return;
      }

      if (typeof sessionId !== "string" || !GUEST_SESSION_ID_PATTERN.test(sessionId)) {
        logger.warn(`⛔ Rejected malformed join-guest-session request`, { socketId: socket.id });
        return;
      }

      const room = `guest-session-${sessionId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined guest session room: ${room}`);
    });

    // When a user joins, add them to role/hotel rooms (when provided)
    // and always join their personal room for direct notifications.
    socket.on("join-role", async ({ hotelId, role, userId, fullname }) => {
      if (!role || !userId) {
        logger.warn(`❌ join-role failed: missing role or userId`, { role, userId });
        return;
      }

      // Always join personal room for direct events (e.g. guest order status)
      socket.join(`user-${userId}`);
      socket.userId = userId;
      socket.userRole = role;
      socket.fullname = fullname;

      logger.info(`✅ User joined personal room: user-${userId}`, { role, fullname });

      if (hotelId) {
        // Fail-closed: only verified staff of this hotel/company may join the
        // hotel's role rooms (kitchen/waiter/etc. receive live order events).
        if (!(await canJoinHotel(socket, hotelId))) {
          logger.warn(`⛔ Denied join-role room for hotel-${hotelId}`, {
            socketId: socket.id,
            role: socket.authUser?.role || "anonymous",
          });
          return;
        }

        // Use the *verified* role for room routing so a client cannot claim a
        // higher-privileged role than their token grants.
        const effectiveRole = socket.authUser?.role || role;

        // Join role-specific room (e.g., "hotel-123-waiters")
        const roleRoom = `hotel-${hotelId}-${effectiveRole}s`;
        socket.join(roleRoom);
        socket.hotelId = hotelId;

        logger.info(`✅ User joined role room: ${roleRoom}`, {
          userId,
          role,
          fullname,
          hotelId
        });

        // Add to online users only when hotel context exists
        onlineUsers.set(userId, {
          socketId: socket.id,
          hotelId,
          role,
          fullname: fullname || 'Unknown',
        });

        // Notify all users in the hotel that this user is online
        io.to(`hotel-${hotelId}`).emit("user-online", {
          userId,
          fullname: fullname || 'Unknown',
          role,
        });

        // Send list of currently online users to the newly connected user
        const onlineUsersInHotel = Array.from(onlineUsers.entries())
          .filter(([_, userData]) => userData.hotelId === hotelId)
          .map(([userId, userData]) => ({
            userId,
            fullname: userData.fullname,
            role: userData.role,
          }));

        socket.emit("online-users", onlineUsersInHotel);

        logger.info(`📊 Socket ${socket.id} joined as ${role} in hotel-${hotelId}`, {
          userId,
          onlineCount: onlineUsersInHotel.length,
          rooms: Array.from(socket.rooms)
        });
      } else {
        logger.info(`📍 Socket ${socket.id} joined personal room user-${userId} as ${role} (no hotel context)`);
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
    // Helper: resolve channel name → actual socket room(s)
    const getChannelRooms = (hotelId, channel) => {
      switch (channel) {
        case 'waiter':        return [`hotel-${hotelId}-waiters`, `hotel-${hotelId}-chiefs`, `hotel-${hotelId}-receptionists`];
        case 'chef':          return [`hotel-${hotelId}-chiefs`, `hotel-${hotelId}-waiters`, `hotel-${hotelId}-receptionists`];
        case 'receptionist':  return [`hotel-${hotelId}-receptionists`, `hotel-${hotelId}-managers`];
        case 'all':           return [`hotel-${hotelId}`];
        default:              return [`hotel-${hotelId}-${channel}s`];
      }
    };

    // Typing indicator
    socket.on("typing", ({ hotelId, channel, userId, fullname, recipientId }) => {
      if (channel === "direct" && recipientId) {
        // For DMs, emit to the recipient's personal room
        socket.to(`user-${recipientId}`).emit("user-typing", { userId, fullname, channel });
      } else if (channel !== "direct") {
        // For channels, emit to the correct role room(s)
        const rooms = getChannelRooms(hotelId, channel);
        rooms.forEach(room => socket.to(room).emit("user-typing", { userId, fullname, channel }));
      }
    });

    socket.on("stop-typing", ({ hotelId, channel, userId, recipientId }) => {
      if (channel === "direct" && recipientId) {
        socket.to(`user-${recipientId}`).emit("user-stop-typing", { userId, channel });
      } else if (channel !== "direct") {
        const rooms = getChannelRooms(hotelId, channel);
        rooms.forEach(room => socket.to(room).emit("user-stop-typing", { userId, channel }));
      }
    });

    // Call management – relay status so both parties stay in sync
    socket.on("answer-call", ({ callId, hotelId }) => {
      io.to(`hotel-${hotelId}`).emit("call-status-update", { _id: callId, callStatus: "answered" });
      io.to(`hotel-${hotelId}`).emit("call-answered", { callId });
    });

    socket.on("decline-call", ({ callId, hotelId }) => {
      io.to(`hotel-${hotelId}`).emit("call-status-update", { _id: callId, callStatus: "declined" });
      io.to(`hotel-${hotelId}`).emit("call-declined", { callId });
    });

    socket.on("end-call", ({ callId, hotelId, duration }) => {
      io.to(`hotel-${hotelId}`).emit("call-status-update", { _id: callId, callStatus: "ended" });
      io.to(`hotel-${hotelId}`).emit("call-ended", { callId, duration });
    });

    // ── WebRTC signaling relay ───────────────────────────────────────
    // These events relay SDP offers/answers and ICE candidates between
    // two peers to establish a direct audio connection.

    socket.on("webrtc-offer", ({ callId, offer, targetUserId, hotelId }) => {
      const fromUserId = socket.userId || null;
      io.to(`user-${targetUserId}`).emit("webrtc-offer", {
        callId,
        offer,
        fromUserId,
      });
    });

    socket.on("webrtc-answer", ({ callId, answer, targetUserId, hotelId }) => {
      const fromUserId = socket.userId || null;
      io.to(`user-${targetUserId}`).emit("webrtc-answer", {
        callId,
        answer,
        fromUserId,
      });
    });

    socket.on("webrtc-ice-candidate", ({ callId, candidate, targetUserId, hotelId }) => {
      io.to(`user-${targetUserId}`).emit("webrtc-ice-candidate", {
        callId,
        candidate,
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      logger.debug(`Client disconnected: ${socket.id}`, { reason });

      // Remove from online users and notify others
      if (socket.userId && socket.hotelId) {
        onlineUsers.delete(socket.userId);

        // Notify all users in the hotel that this user is offline
        io.to(`hotel-${socket.hotelId}`).emit("user-offline", {
          userId: socket.userId,
        });

        logger.debug(`User ${socket.userId} went offline`, { hotelId: socket.hotelId });
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`Socket error for ${socket.id}`, { error });
    });
  });

  logger.info("Socket.io initialized");
  return io;
};

/**
 * Get the Socket.io instance
 * @returns {Server|null} - Socket.io server instance
 */
export const getIO = () => {
  if (!io) {
    logger.warn("Socket.io not initialized yet!");
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
    const room = `hotel-${hotelId}`;
    logger.info(`📤 Emitting "${event}" to room: ${room}`, {
      hotelId,
      dataKeys: Object.keys(data || {})
    });
    io.to(room).emit(event, data);
  } else {
    logger.warn(`⚠️ Cannot emit "${event}" - Socket.io not initialized`);
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
    const room = `hotel-${hotelId}-waiters`;
    logger.info(`📤 Emitting "${event}" to waiters room: ${room}`, {
      hotelId,
      dataKeys: Object.keys(data || {})
    });
    io.to(room).emit(event, data);
  } else {
    logger.warn(`⚠️ Cannot emit "${event}" to waiters - Socket.io not initialized`);
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
    const chiefsRoom = `hotel-${hotelId}-chiefs`;
    const kitchensRoom = `hotel-${hotelId}-kitchens`;
    logger.info(`📤 Emitting "${event}" to kitchen rooms: ${chiefsRoom}, ${kitchensRoom}`, {
      hotelId,
      dataKeys: Object.keys(data || {})
    });
    // Emit to both 'chiefs' and 'kitchens' rooms (different role names, same function)
    io.to(chiefsRoom).emit(event, data);
    io.to(kitchensRoom).emit(event, data);
  } else {
    logger.warn(`⚠️ Cannot emit "${event}" to kitchen - Socket.io not initialized`);
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

/**
 * Emit event to an anonymous QR guest's session room.
 * The room name is deterministic: guest-session-{sessionId}
 * @param {string} sessionId - The guestSessionId stored on the order
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToGuestSession = (sessionId, event, data) => {
  if (io && sessionId) {
    io.to(`guest-session-${sessionId}`).emit(event, data);
  }
};

/**
 * Emit an event to every staff socket of a hotel EXACTLY ONCE.
 *
 * Staff sockets sit in several overlapping rooms (hotel-<id> plus their role
 * room), so emitting to each room separately made waiters/chefs receive the
 * same event 2–3 times (and hear the alert sound 2–3 times). Passing all rooms
 * to a single .to() call makes Socket.IO deliver once per socket.
 */
export const emitToHotelStaff = (hotelId, event, data) => {
  if (!io || !hotelId) {
    logger.warn(`⚠️ Cannot emit "${event}" to hotel staff - Socket.io not initialized`);
    return;
  }
  const h = hotelId.toString();
  io.to([
    `hotel-${h}`,
    `hotel-${h}-waiters`,
    `hotel-${h}-chiefs`,
    `hotel-${h}-kitchens`,
    `hotel-${h}-receptionists`,
    `hotel-${h}-managers`,
  ]).emit(event, data);
};

export default { initSocket, getIO, emitToHotel, emitToHotelStaff, emitToWaiters, emitToKitchen, emitToUser, emitToGuestSession };
