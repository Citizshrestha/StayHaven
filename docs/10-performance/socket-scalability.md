# Socket.IO Scalability

> Strategies for scaling WebSocket connections in StayHaven

---

## 📋 Table of Contents

1. [Socket.IO Architecture](#socketio-architecture)
2. [Redis Adapter](#redis-adapter)
3. [Connection Management](#connection-management)
4. [Room Optimization](#room-optimization)
5. [Load Balancing](#load-balancing)
6. [Performance Monitoring](#performance-monitoring)

---

## 🏛️ Socket.IO Architecture

### Current Setup

```
Client (Browser)
       ↓
    Socket.IO
       ↓
Express Server
       ↓
   MongoDB
```

### Scaled Setup

```
Clients
   ↓  ↓  ↓
Load Balancer (Sticky Sessions)
   ↓  ↓  ↓
[Server 1] [Server 2] [Server 3]
     \      |      /
      \     |     /
    Redis Pub/Sub
         ↓
      MongoDB
```

---

## 🔴 Redis Adapter

### Installation

```bash
npm install @socket.io/redis-adapter redis
```

### Configuration

```javascript
// config/socket.js
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export const setupSocket = async (server) => {
  // Create Socket.IO server
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    },
    // Performance settings
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling']
  });

  // Setup Redis adapter for horizontal scaling
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([
    pubClient.connect(),
    subClient.connect()
  ]);

  io.adapter(createAdapter(pubClient, subClient));

  return io;
};
```

### How Redis Adapter Works

```
Server 1:
  User A emits "new_order" → Redis Pub/Sub
                                    ↓
Server 2:                    Broadcasts to all servers
  User B receives "new_order" ← Redis Pub/Sub
```

---

## 🔌 Connection Management

### Authentication Middleware

```javascript
// config/socket.js
import { verifyAccessToken } from '../utils/tokenUtils.js';

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyAccessToken(token);
    socket.userId = decoded.userId;
    socket.role = decoded.role;
    
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

### Connection Tracking

```javascript
// Track active connections
const activeConnections = new Map();

io.on('connection', (socket) => {
  const userId = socket.userId;
  
  // Store connection
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(socket.id);

  console.log(`User ${userId} connected (${activeConnections.get(userId).size} sessions)`);

  socket.on('disconnect', () => {
    // Remove connection
    const sessions = activeConnections.get(userId);
    sessions?.delete(socket.id);
    
    if (sessions?.size === 0) {
      activeConnections.delete(userId);
    }

    console.log(`User ${userId} disconnected`);
  });
});

// Get connection stats
export const getConnectionStats = () => {
  return {
    totalUsers: activeConnections.size,
    totalSockets: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size
  };
};
```

### Disconnect Idle Connections

```javascript
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

io.on('connection', (socket) => {
  let idleTimer;

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      socket.emit('idle_timeout');
      socket.disconnect(true);
    }, IDLE_TIMEOUT);
  };

  // Reset on any activity
  socket.onAny(() => resetIdleTimer());
  
  resetIdleTimer();

  socket.on('disconnect', () => {
    clearTimeout(idleTimer);
  });
});
```

---

## 💬 Room Optimization

### Efficient Room Management

```javascript
// Join user to their personal room and role room
io.on('connection', (socket) => {
  // Personal room for user-specific notifications
  socket.join(`user:${socket.userId}`);
  
  // Role-based room
  socket.join(`role:${socket.role}`);
  
  // Hotel-specific room (for hotel staff)
  if (socket.hotelId) {
    socket.join(`hotel:${socket.hotelId}`);
  }
});

// Emit to specific rooms
export const notifyUser = (userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const notifyHotel = (hotelId, event, data) => {
  io.to(`hotel:${hotelId}`).emit(event, data);
};

export const notifyRole = (role, event, data) => {
  io.to(`role:${role}`).emit(event, data);
};
```

### Room Cleanup

```javascript
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Rooms are automatically cleaned up
    // But you can manually leave if needed
    socket.rooms.forEach(room => {
      socket.leave(room);
    });
  });
});
```

---

## ⚖️ Load Balancing

### Nginx Configuration

```nginx
upstream socket_nodes {
    # Enable sticky sessions (required for Socket.IO)
    ip_hash;
    
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name api.stayhaven.com;

    location /socket.io/ {
        proxy_pass http://socket_nodes;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### Alternative: Session Affinity

```javascript
// Use Redis for session storage
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

---

## 📊 Performance Monitoring

### Connection Metrics

```javascript
// Monitor Socket.IO performance
setInterval(() => {
  const stats = {
    timestamp: new Date(),
    connections: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
    memory: process.memoryUsage()
  };

  console.log('Socket.IO Stats:', stats);
  
  // Send to monitoring service
  // metrics.gauge('socket.connections', stats.connections);
}, 60000); // Every minute
```

### Event Performance

```javascript
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    const start = Date.now();
    
    socket.once(`${event}:complete`, () => {
      const duration = Date.now() - start;
      
      if (duration > 100) {
        console.warn(`Slow socket event: ${event} took ${duration}ms`);
      }
    });
  });
});
```

---

## ⚡ Optimization Tips

### 1. Use Binary Protocol

```javascript
// Client
socket.emit('image', arrayBuffer);

// Server
socket.on('image', (buffer) => {
  // Process binary data
});
```

### 2. Batch Events

```javascript
// ❌ Slow: Multiple emits
orders.forEach(order => {
  socket.emit('new_order', order);
});

// ✅ Fast: Single emit with array
socket.emit('new_orders', orders);
```

### 3. Use Acknowledgements Wisely

```javascript
// Only use acknowledgements when needed
socket.emit('important_event', data, (ack) => {
  console.log('Event acknowledged:', ack);
});

// Don't use for fire-and-forget events
socket.emit('notification', data); // No callback
```

### 4. Compress Messages

```javascript
const io = new Server(server, {
  perMessageDeflate: {
    threshold: 1024 // Compress messages > 1KB
  }
});
```

---

## 📝 Summary

Socket.IO scalability:
- **Redis adapter**: Multi-server support
- **Connection management**: Track and cleanup
- **Rooms**: Efficient targeting
- **Load balancing**: Sticky sessions
- **Monitoring**: Track performance

**Goal**: Support 1,000+ concurrent connections.