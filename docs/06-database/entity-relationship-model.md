# Entity Relationship Model

> Entity relationships, cardinality, and data flow diagrams for StayHaven database

---

## 📋 Table of Contents

1. [ER Diagram Overview](#er-diagram-overview)
2. [Core Relationships](#core-relationships)
3. [Cardinality Definitions](#cardinality-definitions)
4. [Relationship Details](#relationship-details)
5. [Data Flow Diagrams](#data-flow-diagrams)

---

## 🗺️ ER Diagram Overview

### High-Level Entity Relationships

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        StayHaven ER Diagram                                  │
└──────────────────────────────────────────────────────────────────────────────┘

                            ┌─────────┐
                            │  Role   │
                            └────┬────┘
                                 │ 1:N
                                 │
                            ┌────▼────┐
         ┌──────────────────┤  User   ├──────────────────┐
         │                  └────┬────┘                  │
         │ 1:N                   │ 1:1                   │ 1:N
         │                       │                       │
    ┌────▼────┐            ┌────▼────┐            ┌─────▼──────┐
    │Booking  │            │ Loyalty │            │Notification│
    └────┬────┘            └─────────┘            └────────────┘
         │ N:1
         │
    ┌────▼────┐
    │  Hotel  │◄──────────┐
    └────┬────┘           │ 1:N
         │ 1:1            │
         │           ┌────┴────┐
    ┌────▼────┐      │Company  │
    │  Room   │      └────┬────┘
    └────┬────┘           │ N:1
         │ N:1            │
         │           ┌────▼────┐
    ┌────▼────┐      │  User   │
    │Booking  │      │ (Owner) │
    └─────────┘      └─────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Dining & Service                          │
└──────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  Hotel  │
    └────┬────┘
         │ 1:N
         ├────────────────┬────────────────┬─────────────┐
         │                │                │             │
    ┌────▼────┐      ┌────▼────┐    ┌─────▼──────┐ ┌───▼──────┐
    │MenuItem │      │  Order  │    │WaiterCall  │ │  Table   │
    └─────────┘      └────┬────┘    └────────────┘ │Assignment│
                          │ N:N                     └──────────┘
                          │
                     ┌────▼────┐
                     │MenuItem │
                     └─────────┘
```

---

## 🔗 Core Relationships

### 1. User-Centric Relationships

```javascript
// User has one Role
User.role → Role (N:1)

// User belongs to one Company (if staff)
User.company → Company (N:1)

// User works at one Hotel (if staff)
User.hotel → Hotel (N:1)

// User has one Loyalty profile
User → Loyalty (1:1)

// User has many Bookings
User → Booking (1:N)

// User has many Orders
User → Order (1:N)

// User has many Notifications
User → Notification (1:N)

// User creates many WaiterCalls
User → WaiterCall (1:N)
```

### 2. Company-Hotel Hierarchy

```javascript
// Company has one Owner (User)
Company.owner → User (N:1)

// Company has many Hotels
Company → Hotel (1:N)

// Hotel belongs to one Company
Hotel.company → Company (N:1)
```

### 3. Hotel-Resource Relationships

```javascript
// Hotel has many Rooms
Hotel → Room (1:N)

// Hotel has many MenuItems
Hotel → MenuItem (1:N)

// Hotel has many Orders
Hotel → Order (1:N)

// Hotel has many Bookings
Hotel → Booking (1:N)

// Hotel has many WaiterCalls
Hotel → WaiterCall (1:N)

// Hotel has many TableAssignments
Hotel → TableAssignment (1:N)
```

### 4. Booking Flow

```javascript
// Booking belongs to User
Booking.user → User (N:1)

// Booking belongs to Hotel
Booking.hotel → Hotel (N:1)

// Booking belongs to Room
Booking.room → Room (N:1)
```

### 5. Order Flow

```javascript
// Order belongs to User
Order.user → User (N:1)

// Order belongs to Hotel
Order.hotel → Hotel (N:1)

// Order has many MenuItems (embedded)
Order.items[].menuItem → MenuItem (N:N)
```

---

## 📊 Cardinality Definitions

### One-to-One (1:1)

```javascript
// User ↔ Loyalty
// Each user has exactly one loyalty profile
// Each loyalty profile belongs to exactly one user

User ────── Loyalty
 1          1

// Implementation
const loyaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true // Enforces 1:1
  }
});
```

### One-to-Many (1:N)

```javascript
// Hotel → Room
// One hotel has many rooms
// Each room belongs to one hotel

Hotel ────── Room
  1          N

// Implementation
const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  }
});
```

### Many-to-Many (N:N)

```javascript
// Order ↔ MenuItem
// One order contains many menu items
// One menu item can be in many orders

Order ────── MenuItem
  N          N

// Implementation (Embedded Array)
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number,
    price: Number
  }]
});
```

---

## 📋 Relationship Details

### User → Role (N:1)

```javascript
// Many users have one role
// Required for RBAC authorization

const userSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    index: true
  }
});

// Query: Get all guests
const guests = await User.find().populate({
  path: 'role',
  match: { name: 'guest' }
});
```

### Company → Hotel (1:N)

```javascript
// One company owns multiple hotels
// Multi-tenant data isolation

const hotelSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  }
});

// Query: Get all hotels in a company
const hotels = await Hotel.find({ company: companyId });
```

### Hotel → Room (1:N)

```javascript
// One hotel has multiple rooms
// Cascade delete: When hotel deleted, delete rooms

const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  }
});

// Query: Get available rooms in hotel
const availableRooms = await Room.find({
  hotel: hotelId,
  status: 'available'
});
```

### Booking → User, Hotel, Room (N:1 each)

```javascript
// Booking references three entities
// Triple relationship for reservation

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  }
});

// Query: Get booking with full details
const booking = await Booking.findById(bookingId)
  .populate('user', 'fullname email')
  .populate('hotel', 'name address')
  .populate('room', 'roomNumber roomType pricePerNight');
```

### Order → MenuItem (N:N via Embedding)

```javascript
// Order embeds menu item references
// Snapshot pricing at order time

const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true // Price at order time
    }
  }]
});

// Query: Get order with menu item details
const order = await Order.findById(orderId)
  .populate('items.menuItem', 'name description images');
```

---

## 🌊 Data Flow Diagrams

### Booking Flow

```
User (Guest)
  │
  │ 1. Browse Hotels
  ▼
Hotel List
  │
  │ 2. View Hotel Details
  ▼
Hotel Details
  │
  │ 3. Check Room Availability
  ▼
Room List (Available)
  │
  │ 4. Select Room & Dates
  ▼
Booking Form
  │
  │ 5. Submit Booking
  ▼
Create Booking Record
  │
  ├─ Booking.user = User._id
  ├─ Booking.hotel = Hotel._id
  ├─ Booking.room = Room._id
  ├─ Booking.checkInDate = Date
  ├─ Booking.checkOutDate = Date
  └─ Booking.bookingStatus = 'pending'
  │
  │ 6. Update Room Status
  ▼
Room.status = 'occupied' (on check-in)
  │
  │ 7. Send Notification
  ▼
Notification (User)
Notification (Hotel Receptionist)
```

### Order Flow

```
User (Guest)
  │
  │ 1. View Menu
  ▼
MenuItem List (Hotel-specific)
  │
  │ 2. Add Items to Cart
  ▼
Cart (Frontend State)
  │
  │ 3. Place Order
  ▼
Create Order Record
  │
  ├─ Order.user = User._id
  ├─ Order.hotel = Hotel._id
  ├─ Order.items[] = [{menuItem, quantity, price}]
  ├─ Order.orderStatus = 'pending'
  └─ Order.orderNumber = auto-increment
  │
  │ 4. Real-time Notification (Socket.IO)
  ▼
Notification (Waiter/Chief)
  │
  │ 5. Update Order Status
  ▼
Order.orderStatus:
  'pending' → 'confirmed' → 'preparing' → 'ready' → 'delivered'
  │
  │ 6. Update WaiterCall (if exists)
  ▼
WaiterCall.status = 'completed'
```

### Staff Invitation Flow

```
Owner/Manager
  │
  │ 1. Invite Staff
  ▼
Send Invitation Email
  │
  │ 2. Create User Record
  ▼
User Record (Pending)
  │
  ├─ User.email = invitee@example.com
  ├─ User.role = Staff Role
  ├─ User.company = Company._id
  ├─ User.hotel = Hotel._id
  ├─ User.invitedAt = Date.now()
  └─ User.accountStatus = 'inactive'
  │
  │ 3. Staff Accepts & Sets Password
  ▼
User.accountStatus = 'active'
User.onboardedAt = Date.now()
  │
  │ 4. Send Welcome Notification
  ▼
Notification (Staff)
```

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Schema Relationships](./schema-relationships.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive ER model documentation
