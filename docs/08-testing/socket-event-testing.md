# Socket Event Testing

> Testing real-time Socket.IO events in StayHaven for orders, notifications, and waiter calls

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Testing Setup](#testing-setup)
3. [Testing Socket Events](#testing-socket-events)
4. [Order System Tests](#order-system-tests)
5. [Waiter Call Tests](#waiter-call-tests)
6. [Notification Tests](#notification-tests)

---

## 🎯 Overview

### Socket.IO in StayHaven

Real-time features:
- 📦 **Order Management**: KOT/BOT updates
- 🔔 **Notifications**: Real-time alerts
- 🙋 **Waiter Calls**: Guest service requests
- 📊 **Live Updates**: Booking status changes

### Testing Goals

```javascript
const TESTING_GOALS = {
  connectivity: 'Ensure clients can connect/disconnect',
  eventEmission: 'Verify events are emitted correctly',
  eventReception: 'Confirm events are received',
  dataIntegrity: 'Validate event payload structure',
  roomLogic: 'Test room-based broadcasting'
};
```

---

## 🛠️ Testing Setup

### Install Dependencies

```bash
npm install --save-dev socket.io-client
```

### Test Helper

**File**: `tests/helpers/socketClient.js`

```javascript
import { io } from 'socket.io-client';

export const createSocketClient = (token) => {
  const socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket']
  });
  
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
};

export const closeSocket = (socket) => {
  return new Promise((resolve) => {
    socket.on('disconnect', resolve);
    socket.close();
  });
};
```

---

## 🧪 Testing Socket Events

### Basic Connection Test

```javascript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createSocketClient, closeSocket } from '../helpers/socketClient';
import { generateTokens } from '../../utils/tokenUtils';

describe('Socket.IO Connection Tests', () => {
  let socket;
  let token;
  
  beforeAll(async () => {
    const { accessToken } = generateTokens('user123');
    token = accessToken;
  });
  
  afterAll(async () => {
    if (socket?.connected) {
      await closeSocket(socket);
    }
  });
  
  test('should connect with valid token', async () => {
    socket = await createSocketClient(token);
    
    expect(socket.connected).toBe(true);
    expect(socket.id).toBeDefined();
  });
  
  test('should disconnect gracefully', async () => {
    socket = await createSocketClient(token);
    
    await closeSocket(socket);
    
    expect(socket.connected).toBe(false);
  });
  
  test('should reject connection without token', async () => {
    await expect(createSocketClient(null)).rejects.toThrow();
  });
});
```

---

## 🍽️ Order System Tests

### Order Creation Event

```javascript
describe('Order Socket Events', () => {
  let waiterSocket, kitchenSocket;
  let waiterToken, kitchenToken;
  let hotelId = 'hotel123';
  
  beforeAll(async () => {
    // Generate tokens for different users
    waiterToken = generateTokens('waiter123').accessToken;
    kitchenToken = generateTokens('kitchen123').accessToken;
    
    // Connect both sockets
    waiterSocket = await createSocketClient(waiterToken);
    kitchenSocket = await createSocketClient(kitchenToken);
    
    // Join hotel room
    waiterSocket.emit('join:hotel', hotelId);
    kitchenSocket.emit('join:hotel', hotelId);
  });
  
  afterAll(async () => {
    await closeSocket(waiterSocket);
    await closeSocket(kitchenSocket);
  });
  
  test('should broadcast new order to kitchen', (done) => {
    const orderData = {
      orderId: 'order123',
      tableNumber: 5,
      items: [
        { name: 'Burger', quantity: 2 },
        { name: 'Fries', quantity: 1 }
      ],
      hotelId
    };
    
    // Kitchen listens for new orders
    kitchenSocket.on('order:new', (data) => {
      expect(data.orderId).toBe('order123');
      expect(data.items).toHaveLength(2);
      expect(data.tableNumber).toBe(5);
      done();
    });
    
    // Waiter creates order
    waiterSocket.emit('order:create', orderData);
  });
  
  test('should update order status', (done) => {
    const updateData = {
      orderId: 'order123',
      status: 'preparing',
      hotelId
    };
    
    // Waiter listens for status updates
    waiterSocket.on('order:statusUpdated', (data) => {
      expect(data.orderId).toBe('order123');
      expect(data.status).toBe('preparing');
      done();
    });
    
    // Kitchen updates status
    kitchenSocket.emit('order:updateStatus', updateData);
  });
  
  test('should notify when order is ready', (done) => {
    const orderData = {
      orderId: 'order123',
      status: 'ready',
      tableNumber: 5,
      hotelId
    };
    
    waiterSocket.on('order:ready', (data) => {
      expect(data.orderId).toBe('order123');
      expect(data.status).toBe('ready');
      expect(data.tableNumber).toBe(5);
      done();
    });
    
    kitchenSocket.emit('order:markReady', orderData);
  });
});
```

---

## 🙋 Waiter Call Tests

```javascript
describe('Waiter Call Socket Events', () => {
  let guestSocket, waiterSocket;
  let hotelId = 'hotel123';
  
  beforeAll(async () => {
    const guestToken = generateTokens('guest123').accessToken;
    const waiterToken = generateTokens('waiter123').accessToken;
    
    guestSocket = await createSocketClient(guestToken);
    waiterSocket = await createSocketClient(waiterToken);
    
    guestSocket.emit('join:hotel', hotelId);
    waiterSocket.emit('join:hotel', hotelId);
  });
  
  afterAll(async () => {
    await closeSocket(guestSocket);
    await closeSocket(waiterSocket);
  });
  
  test('should send waiter call from guest', (done) => {
    const callData = {
      roomNumber: 205,
      requestType: 'service',
      message: 'Need extra towels',
      hotelId
    };
    
    waiterSocket.on('waiterCall:new', (data) => {
      expect(data.roomNumber).toBe(205);
      expect(data.requestType).toBe('service');
      expect(data.message).toBe('Need extra towels');
      done();
    });
    
    guestSocket.emit('waiterCall:request', callData);
  });
  
  test('should acknowledge waiter call', (done) => {
    const acknowledgeData = {
      callId: 'call123',
      waiterId: 'waiter123',
      hotelId
    };
    
    guestSocket.on('waiterCall:acknowledged', (data) => {
      expect(data.callId).toBe('call123');
      expect(data.waiterId).toBe('waiter123');
      expect(data.status).toBe('acknowledged');
      done();
    });
    
    waiterSocket.emit('waiterCall:acknowledge', acknowledgeData);
  });
  
  test('should complete waiter call', (done) => {
    const completeData = {
      callId: 'call123',
      hotelId
    };
    
    guestSocket.on('waiterCall:completed', (data) => {
      expect(data.callId).toBe('call123');
      expect(data.status).toBe('completed');
      done();
    });
    
    waiterSocket.emit('waiterCall:complete', completeData);
  });
});
```

---

## 🔔 Notification Tests

```javascript
describe('Notification Socket Events', () => {
  let userSocket;
  let userId = 'user123';
  
  beforeAll(async () => {
    const token = generateTokens(userId).accessToken;
    userSocket = await createSocketClient(token);
    userSocket.emit('join:user', userId);
  });
  
  afterAll(async () => {
    await closeSocket(userSocket);
  });
  
  test('should receive booking confirmation notification', (done) => {
    const notificationData = {
      userId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: 'Your booking at Grand Hotel is confirmed',
      data: {
        bookingId: 'booking123',
        hotelName: 'Grand Hotel'
      }
    };
    
    userSocket.on('notification:new', (data) => {
      expect(data.type).toBe('booking_confirmed');
      expect(data.title).toBe('Booking Confirmed');
      expect(data.data.bookingId).toBe('booking123');
      done();
    });
    
    // Simulate server sending notification
    // In real test, this would be triggered by API call
    userSocket.emit('test:sendNotification', notificationData);
  });
  
  test('should receive multiple notifications', (done) => {
    const notifications = [];
    let count = 0;
    
    userSocket.on('notification:new', (data) => {
      notifications.push(data);
      count++;
      
      if (count === 3) {
        expect(notifications).toHaveLength(3);
        expect(notifications[0].type).toBe('order_ready');
        expect(notifications[1].type).toBe('payment_received');
        expect(notifications[2].type).toBe('review_request');
        done();
      }
    });
    
    // Send multiple notifications
    userSocket.emit('test:sendNotification', {
      userId,
      type: 'order_ready',
      message: 'Your order is ready'
    });
    
    userSocket.emit('test:sendNotification', {
      userId,
      type: 'payment_received',
      message: 'Payment confirmed'
    });
    
    userSocket.emit('test:sendNotification', {
      userId,
      type: 'review_request',
      message: 'Please review your stay'
    });
  });
});
```

---

## 🏠 Room-Based Testing

```javascript
describe('Socket Room Logic', () => {
  let socket1, socket2, socket3;
  let hotelId = 'hotel123';
  
  beforeAll(async () => {
    const token1 = generateTokens('user1').accessToken;
    const token2 = generateTokens('user2').accessToken;
    const token3 = generateTokens('user3').accessToken;
    
    socket1 = await createSocketClient(token1);
    socket2 = await createSocketClient(token2);
    socket3 = await createSocketClient(token3);
    
    // socket1 and socket2 join same hotel
    socket1.emit('join:hotel', hotelId);
    socket2.emit('join:hotel', hotelId);
    // socket3 doesn't join
  });
  
  afterAll(async () => {
    await closeSocket(socket1);
    await closeSocket(socket2);
    await closeSocket(socket3);
  });
  
  test('should broadcast to room members only', (done) => {
    let receivedCount = 0;
    
    // socket1 and socket2 should receive
    socket1.on('test:broadcast', () => {
      receivedCount++;
      checkComplete();
    });
    
    socket2.on('test:broadcast', () => {
      receivedCount++;
      checkComplete();
    });
    
    // socket3 should NOT receive
    socket3.on('test:broadcast', () => {
      done(new Error('socket3 should not receive broadcast'));
    });
    
    function checkComplete() {
      if (receivedCount === 2) {
        setTimeout(() => done(), 100); // Wait to ensure socket3 doesn't receive
      }
    }
    
    // Broadcast to hotel room
    socket1.emit('test:broadcastToHotel', { hotelId, message: 'test' });
  });
});
```

---

## ✅ Best Practices

1. **Use Timeouts**: Async events need time limits
2. **Clean Up**: Always close sockets after tests
3. **Test Isolation**: Each test should be independent
4. **Room Management**: Test room join/leave logic
5. **Error Handling**: Test connection failures
6. **Authentication**: Test token validation
7. **Data Validation**: Verify event payload structure
8. **Multiple Clients**: Test broadcasting behavior

---

## 📌 Summary

Socket.IO testing in StayHaven:
- **Connection Tests**: Auth, join/leave rooms
- **Order Events**: Create, update, notify
- **Waiter Calls**: Request, acknowledge, complete
- **Notifications**: Real-time user alerts
- **Room Logic**: Broadcast to specific groups

**Goal**: Ensure real-time features work reliably.