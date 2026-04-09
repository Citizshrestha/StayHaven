---
name: SocketContext guest user support
description: SocketContext must connect both staff AND guest users for real-time order updates
type: project
---

SocketContext.jsx was originally staff-only: it checked `getCurrentStaffUser()` and `getActiveProperty()`, both of which return null for guest users. This meant guest real-time features (order tracking, payment confirmations) never worked.

**Why:** Guest users store `accessToken`, `userId`, `username`, `role='guest'` in localStorage — not `staffUser` or `activeProperty`.

**How to apply:** 
- Socket connection must check for both staff sessions AND guest sessions (`accessToken` + `userId` + `role === 'guest'`)
- Guest users join via `join-role` with their userId so `emitToUser(userId, 'order-status-update', ...)` reaches them
- Backend `orderController.js:updateOrderStatus` must call `emitToUser(order.customerId, 'order-status-update', ...)` for guest order status changes
- Event name: backend emits `order-status-update` (not `order-status-updated`) to guests
- Frontend components must use `{ subscribe, isConnected } = useSocket()` pattern, not raw `socket.on/.off`
