# Order and KOT APIs

> Comprehensive documentation for order management and Kitchen Order Ticket (KOT) system endpoints

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Order Lifecycle](#order-lifecycle)
3. [Creating Orders](#creating-orders)
4. [Order Status Management](#order-status-management)
5. [Kitchen Queue Management](#kitchen-queue-management)
6. [Waiter Operations](#waiter-operations)
7. [Priority System](#priority-system)
8. [Bill Management](#bill-management)

---

## 🍽️ Overview

### Base URL
```
Production: https://api.stayhaven.com/api/orders
Development: http://localhost:5000/api/orders
```

### KOT System

The Kitchen Order Ticket (KOT) system is a specialized order management system for food and beverage service in hotels.

**Key Features**:
- Auto-incrementing order numbers per hotel (starts from 1001)
- Real-time order updates via WebSocket
- Priority-based kitchen queue
- Support for room service and dine-in orders
- Staff tracking (who created, who delivered)
- Customer tracking (registered users or walk-ins)

### Order Types

| Type | Description | Required Fields |
|------|-------------|----------------|
| `roomService` | Food delivered to guest room | `roomNumber` |
| `dineIn` | Guest dining in restaurant | `tableNumber` |
| `takeaway` | Order for takeaway | None (optional) |

### Order Schema

```typescript
interface Order {
  _id: string;
  orderNumber: number;              // Auto-increment per hotel (1001, 1002, ...)
  hotel: string;                    // Hotel ObjectId
  room?: string;                    // Room ObjectId (roomService only)
  roomNumber?: string;              // Room number string
  tableNumber?: string;             // Table number (dineIn only)
  
  // Staff who created order
  orderBy: string;                  // Staff User ObjectId
  orderByName: string;              // Staff full name
  
  // Customer info
  customerId?: string;              // Guest User ObjectId (if registered)
  customerName?: string;            // Customer name
  customerPhone?: string;           // Customer phone
  
  // Order items
  items: OrderItem[];
  totalPrice: number;
  
  // Order status
  orderType: 'roomService' | 'dineIn' | 'takeaway';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high';
  
  // Timing
  preparationTime?: number;         // Minutes
  deliveredAt?: Date;
  
  // Bill tracking
  billSent: boolean;
  billSentAt?: Date;
  
  // Additional
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  menuItem?: string;                // MenuItem ObjectId (optional for custom items)
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}
```

---

## 🔄 Order Lifecycle

### Status Flow Diagram

```
┌──────────┐                                              ┌──────────┐
│          │  1. Waiter creates order                     │          │
│  Waiter  │─────────────────────────────────────────────>│ Pending  │
│          │                                              │          │
└──────────┘                                              └────┬─────┘
                                                               │
                                                   2. Waiter confirms
                                                               │
                                                               ▼
┌──────────┐                                            ┌───────────┐
│          │  3. Chef views in kitchen queue            │           │
│   Chef   │<───────────────────────────────────────────│ Confirmed │
│          │                                            │           │
└────┬─────┘                                            └───────────┘
     │
     │ 4. Chef starts preparation
     │
     ▼
┌──────────┐                                            ┌───────────┐
│          │  5. Chef marks as preparing                │           │
│   Chef   │───────────────────────────────────────────>│ Preparing │
│          │                                            │           │
└────┬─────┘                                            └───────────┘
     │
     │ 6. Chef completes cooking
     │
     ▼
┌──────────┐                                            ┌───────────┐
│          │  7. Chef marks as ready                    │           │
│   Chef   │───────────────────────────────────────────>│  Ready    │
│          │         (Waiter notified)                  │           │
└──────────┘                                            └─────┬─────┘
                                                              │
┌──────────┐                                                  │
│          │  8. Waiter picks up order                       │
│  Waiter  │<─────────────────────────────────────────────────┘
│          │
└────┬─────┘
     │
     │ 9. Waiter delivers to customer
     │
     ▼
┌──────────┐                                            ┌───────────┐
│          │  10. Waiter marks as delivered             │           │
│  Waiter  │───────────────────────────────────────────>│ Delivered │
│          │                                            │           │
└──────────┘                                            └───────────┘
```

### Status Transitions

| From | To | Who Can Change | WebSocket Event |
|------|----|----|----------------|
| `pending` | `confirmed` | Waiter | `order-status-updated` to kitchen |
| `confirmed` | `preparing` | Chef | `order-status-updated` to waiters |
| `preparing` | `ready` | Chef | `order-ready` to waiters |
| `ready` | `delivered` | Waiter | `order-status-updated` to kitchen |
| Any | `cancelled` | Waiter, Manager | `order-cancelled` to all |

---

## 📝 Creating Orders

### 1. Create Order (KOT)

Create a new food/beverage order.

**Endpoint**: `POST /api/orders`

**Authentication**: Required (Staff: Waiter or above)

**Request Headers**:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  hotelId: string,              // Required: Hotel ObjectId
  roomId?: string,              // Optional: Room ObjectId (for roomService)
  roomNumber?: string,          // Required if orderType is 'roomService'
  tableNumber?: string,         // Required if orderType is 'dineIn'
  orderType: string,            // Required: 'roomService' | 'dineIn' | 'takeaway'
  
  items: OrderItem[],           // Required: Array of order items
  
  // Customer info (optional)
  customerId?: string,          // Registered user ID
  customerName?: string,        // Guest name
  customerPhone?: string,       // Guest phone
  
  priority?: string,            // Optional: 'normal' | 'high', Default: 'normal'
  notes?: string                // Optional: Special instructions
}

interface OrderItem {
  menuItem?: string;            // MenuItem ObjectId OR
  name?: string;                // Custom item name (if no menuItem)
  price?: number;               // Custom price (if no menuItem)
  quantity: number;             // Required: Min 1
  notes?: string;               // Item-specific notes (e.g., "No onions")
}
```

**Request Example - Room Service**:
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "65a12345678abcdef012345",
    "roomNumber": "101",
    "orderType": "roomService",
    "customerId": "65g98765432fedcba987654",
    "customerName": "John Doe",
    "customerPhone": "+1234567890",
    "items": [
      {
        "menuItem": "65d22222333344445555666",
        "quantity": 2,
        "notes": "Extra spicy"
      },
      {
        "menuItem": "65d22222333344445555777",
        "quantity": 1
      }
    ],
    "priority": "normal",
    "notes": "Please deliver to balcony"
  }'
```

**Request Example - Dine-in**:
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "65a12345678abcdef012345",
    "tableNumber": "T-15",
    "orderType": "dineIn",
    "customerName": "Jane Smith",
    "items": [
      {
        "menuItem": "65d22222333344445555666",
        "quantity": 1
      },
      {
        "name": "Special Burger",
        "price": 850,
        "quantity": 1,
        "notes": "Custom order, medium rare"
      }
    ]
  }'
```

**Response - Success (201 Created)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "_id": "65h12345678abcdef012345",
    "orderNumber": 1025,
    "hotel": "65a12345678abcdef012345",
    "roomNumber": "101",
    "orderType": "roomService",
    "orderBy": "65i98765432fedcba987654",
    "orderByName": "Alice Waiter",
    "customerId": "65g98765432fedcba987654",
    "customerName": "John Doe",
    "customerPhone": "+1234567890",
    "items": [
      {
        "menuItem": "65d22222333344445555666",
        "name": "Chicken Tikka Masala",
        "quantity": 2,
        "price": 650,
        "notes": "Extra spicy",
        "_id": "65j11111222233334444555"
      },
      {
        "menuItem": "65d22222333344445555777",
        "name": "Garlic Naan",
        "quantity": 1,
        "price": 120,
        "notes": "",
        "_id": "65j11111222233334444666"
      }
    ],
    "totalPrice": 1420,
    "status": "pending",
    "priority": "normal",
    "notes": "Please deliver to balcony",
    "billSent": false,
    "createdAt": "2026-02-02T12:30:00.000Z",
    "updatedAt": "2026-02-02T12:30:00.000Z"
  }
}
```

**Error Response - Validation Failed (400)**:
```json
{
  "success": false,
  "message": "Room Number is required for room service orders"
}
```

**Error Response - Menu Item Not Available (400)**:
```json
{
  "success": false,
  "message": "Chicken Tikka Masala is currently not available"
}
```

**Error Response - Invalid Item (400)**:
```json
{
  "success": false,
  "message": "Each item must have either a menuItem ID, or a name and price"
}
```

**Auto-Increment Order Number**:
- Each hotel has its own counter starting from 1001
- Order numbers are unique per hotel (not globally)
- Auto-generated via MongoDB pre-save hook

**Implementation Details**:
```javascript
// Backend: models/order.schema.js
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const counter = await Counter.findOneAndUpdate(
      { hotel: this.hotel },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = counter.seq;
  }
  next();
});
```

**Real-time Notification**:
```javascript
// Emit to all hotel staff (especially kitchen)
emitToHotel(hotelId, "new-order", {
  order: {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    roomNumber: order.roomNumber,
    status: order.status,
    priority: order.priority,
    items: order.items,
    totalPrice: order.totalPrice,
    customerName: order.customerName,
    createdAt: order.createdAt,
  },
  message: `New order #${order.orderNumber} placed by ${order.orderByName}`
});
```

---

## 🔧 Order Status Management

### 1. Update Order Status

Change order status in the workflow.

**Endpoint**: `PUT /api/orders/:orderId/status`

**Authentication**: Required (Staff)

**Authorization**:
- Waiter: Can change `pending` → `confirmed`, `ready` → `delivered`
- Chef: Can change `confirmed` → `preparing`, `preparing` → `ready`
- Manager: Can change any status

**Path Parameters**:
```typescript
{
  orderId: string  // Order MongoDB ObjectId
}
```

**Request Body**:
```typescript
{
  status: string  // 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
}
```

**Request Example**:
```bash
curl -X PUT "http://localhost:5000/api/orders/65h12345678abcdef012345/status" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

**Response - Success (200 OK)**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order": {
    "_id": "65h12345678abcdef012345",
    "orderNumber": 1025,
    "status": "preparing",
    "updatedAt": "2026-02-02T12:45:00.000Z"
  }
}
```

**Error Response - Invalid Status (400)**:
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: pending, confirmed, preparing, ready, delivered, cancelled"
}
```

**Cross-Role WebSocket Notifications**:

When **chef** updates status → notify **only waiters**:
```javascript
if (updaterRole === 'chief' || updaterRole === 'kitchen') {
  emitToWaiters(hotelId, "order-status-updated", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    message: `🍳 Kitchen: Order #${order.orderNumber} is now "${status}"`
  });
  
  if (status === "ready") {
    emitToWaiters(hotelId, "order-ready", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      message: `Order #${order.orderNumber} is ready for pickup!`,
      customerName: order.customerName,
      location: `Room ${order.roomNumber}` || `Table ${order.tableNumber}`
    });
  }
}
```

When **waiter** updates status → notify **only kitchen**:
```javascript
else if (updaterRole === 'waiter') {
  emitToKitchen(hotelId, "order-status-updated", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    message: `🍽️ Waiter: Order #${order.orderNumber} marked as "${status}"`
  });
}
```

---

## 👨‍🍳 Kitchen Queue Management

### 1. Get Kitchen Queue (Chef View)

Retrieve all orders for kitchen preparation.

**Endpoint**: `GET /api/orders/kitchen`

**Authentication**: Required (Chef or Manager)

**Query Parameters**:
```typescript
{
  hotelId: string,     // Required: Hotel ObjectId
  status?: string,     // Filter: 'confirmed' | 'preparing', Default: both
  orderType?: string   // Filter: 'roomService' | 'dineIn' | 'takeaway'
}
```

**Request Example**:
```bash
curl -X GET "http://localhost:5000/api/orders/kitchen?hotelId=65a12345678abcdef012345&status=confirmed" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response - Success (200 OK)**:
```json
{
  "success": true,
  "count": 8,
  "orders": [
    {
      "_id": "65h12345678abcdef012345",
      "orderNumber": 1025,
      "orderType": "roomService",
      "roomNumber": "101",
      "status": "confirmed",
      "priority": "high",
      "items": [
        {
          "menuItem": {
            "_id": "65d22222333344445555666",
            "name": "Chicken Tikka Masala",
            "image": "https://...",
            "preparationTime": 20
          },
          "quantity": 2,
          "notes": "Extra spicy"
        }
      ],
      "totalPrice": 1420,
      "customerName": "John Doe",
      "orderBy": {
        "_id": "65i98765432fedcba987654",
        "fullname": "Alice Waiter"
      },
      "createdAt": "2026-02-02T12:30:00.000Z",
      "waitingTime": "15 minutes",
      "estimatedPrepTime": 20
    }
  ],
  "summary": {
    "confirmed": 5,
    "preparing": 3,
    "highPriority": 2,
    "averageWaitTime": 12
  }
}
```

**Priority Algorithm**:

Orders are sorted by:
1. **Priority** (high before normal)
2. **Status** (confirmed before preparing)
3. **Creation time** (oldest first - FIFO)
4. **Order type** (roomService before dineIn)

```javascript
const orders = await Order.find({
  hotel: hotelId,
  status: { $in: ['confirmed', 'preparing'] }
})
.populate('orderBy', 'fullname')
.populate('items.menuItem', 'name image preparationTime')
.sort({
  priority: -1,           // high priority first
  status: 1,              // confirmed before preparing
  createdAt: 1,           // oldest first
  orderType: 1            // roomService before dineIn
});
```

---

## 🍽️ Waiter Operations

### 1. Get Waiter Orders

Retrieve orders assigned to or managed by waiter.

**Endpoint**: `GET /api/orders/waiter`

**Authentication**: Required (Waiter)

**Query Parameters**:
```typescript
{
  hotelId: string,        // Required
  status?: string,        // Filter by status
  orderType?: string      // Filter by type
}
```

**Request Example**:
```bash
curl -X GET "http://localhost:5000/api/orders/waiter?hotelId=65a12345678abcdef012345&status=ready" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response - Success (200 OK)**:
```json
{
  "success": true,
  "count": 3,
  "orders": [
    {
      "_id": "65h12345678abcdef012345",
      "orderNumber": 1025,
      "orderType": "roomService",
      "roomNumber": "101",
      "status": "ready",
      "items": [
        {
          "name": "Chicken Tikka Masala",
          "quantity": 2,
          "price": 650
        }
      ],
      "totalPrice": 1420,
      "customerName": "John Doe",
      "createdAt": "2026-02-02T12:30:00.000Z",
      "readyAt": "2026-02-02T12:50:00.000Z",
      "needsDelivery": true
    }
  ]
}
```

---

## ⚡ Priority System

### Set Order Priority

Mark order as high priority.

**Endpoint**: `PUT /api/orders/:orderId/priority`

**Authentication**: Required (Waiter or Manager)

**Request Body**:
```typescript
{
  priority: 'normal' | 'high'
}
```

**Request Example**:
```bash
curl -X PUT "http://localhost:5000/api/orders/65h12345678abcdef012345/priority" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"priority": "high"}'
```

**Response - Success (200 OK)**:
```json
{
  "success": true,
  "message": "Order priority updated",
  "order": {
    "_id": "65h12345678abcdef012345",
    "orderNumber": 1025,
    "priority": "high"
  }
}
```

**Use Cases for High Priority**:
- VIP guest
- Urgent request
- Delayed order (compensation)
- Special occasion (birthday, anniversary)

---

## 💰 Bill Management

### Get Order Bill

Retrieve formatted bill for an order.

**Endpoint**: `GET /api/orders/:orderId/bill`

**Authentication**: Required (Staff or Guest who created order)

**Response - Success (200 OK)**:
```json
{
  "success": true,
  "bill": {
    "orderNumber": 1025,
    "orderDate": "2026-02-02T12:30:00.000Z",
    "hotel": {
      "name": "Hotel Paradise Kathmandu",
      "address": "Thamel, Kathmandu",
      "phone": "+977-1-1234567"
    },
    "customer": {
      "name": "John Doe",
      "room": "101"
    },
    "items": [
      {
        "name": "Chicken Tikka Masala",
        "quantity": 2,
        "price": 650,
        "total": 1300
      },
      {
        "name": "Garlic Naan",
        "quantity": 1,
        "price": 120,
        "total": 120
      }
    ],
    "subtotal": 1420,
    "tax": {
      "rate": 13,
      "amount": 184.6
    },
    "serviceCharge": {
      "rate": 10,
      "amount": 142
    },
    "grandTotal": 1746.6,
    "currency": "NPR"
  }
}
```

---

## 📚 Related Documents

- [Hotel Management APIs](./hotel-management-apis.md)
- [Real-time Events](./real-time-events.md)
- [Staff Management APIs](./staff-management-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive order and KOT API documentation
