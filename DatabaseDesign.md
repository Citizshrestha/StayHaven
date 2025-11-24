📊 **STAYHAVEN - Comprehensive Project Analysis & Database Design**

---

🎯 **Project Overview**

StayHaven is a production-ready, two-sided MERN marketplace that connects hotel owners, guests, staff, and administrators while centralizing room bookings and in-hotel service orders. The backend is purpose-built to keep data consistency across listings, bookings, and service workflows, ensuring every interaction is auditable and analytics-ready.

- **Project Type:** Hotel Booking & Order Management System
- **Architecture:** Full-stack MERN (React + Node.js/Express + MongoDB)
- **Scope of This Document:** Database-first design notes for client presentation

---

🏗️ **System Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  - Vite Build Tool                                              │
│  - React 19.1.1 + React Router 7.9.4                            │
│  - Tailwind CSS 4.1.16                                          │
│  - Axios HTTP Client                                            │
│  - Google OAuth Integration                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP/HTTPS (REST API)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
│  - Express 5.1.0                                                │
│  - JWT Authentication (Access + Refresh Tokens)                 │
│  - Role-Based Access Control (RBAC)                             │
│  - Google OAuth 2.0                                             │
│  - Nodemailer (Email Service)                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                        Mongoose ODM
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DATABASE (MongoDB)                            │
│  Collections:                                                   │
│  - users, roles, hotels, rooms, bookings                        │
│  - orders, menuItems, notifications, waiterCalls                │
└─────────────────────────────────────────────────────────────────┘
```

---

👥 **User Roles & Permissions (Context for DB Design)**

1. **Guest (Default)**
   - Read-only access to hotels plus ability to create bookings, orders, and waiter calls.
   - Surfaces `/`, `/hotels`, `/hotel/:id`, `/dashboard`.
2. **Hotel Owner**
   - Guest capabilities plus CRUD on owned hotels/rooms, visibility into bookings and revenue.
   - Access to `/owner/dashboard`, `/owner/hotels/create`, owner-only APIs.
3. **Staff**
   - Operates on orders and waiter calls for assigned hotels. Schema-ready, UI pending.
4. **Admin**
   - Superuser for approvals, feature toggles, user management, and platform-wide analytics.

These roles drive reference integrity through the `roles` and `users` collections and inform RBAC indexes.

---

🗄️ **Detailed Database Design**

- **Database Name:** `stayhaven`
- **Type:** MongoDB (document, replica-set ready)
- **ODM:** Mongoose 8.19.1 with schema validation
- **Primary Collections:** `roles`, `users`, `hotels`, `rooms`, `bookings`, `payments`, `menuitems`, `orders`, `notifications`, `waitercalls`

Design principles:
- Reference primary entities (`users`, `hotels`, `rooms`, `bookings`) for flexibility.
- Embed lightweight, immutable snapshots (`order.items`, `booking.guests`).
- Maintain denormalized fields (e.g., `booking.hotel`) to speed up dashboards.
- Enforce soft deletes via `isActive` flags and status fields.

---

📋 **Database Schema – Detailed Breakdown**

1. **`roles` Collection**  
   ```javascript
   {
     name: String,               // enum: ['admin','staff','guest','owner'], unique
     permissions: [String],      // e.g., ['hotel:create','booking:approve']
     description: String
   }
   ```
   - **Indexes:** `{ name: 1 }` unique.
   - **Usage:** Seeded on startup, referenced by `users.role`.

2. **`users` Collection**  
   ```javascript
   {
     fullName: String,           // required, min 3 chars
     username: String,           // required, lowercase, unique
     email: String,              // required, email regex, unique
     password: String,           // bcrypt hashed when not Google user
     role: ObjectId,             // ref roles, default guest
     profilePicture: String,     // URL w/ default avatar
     contact: {
       phone: String,
       countryCode: String
     },
     roomNumber: String,
     isActive: Boolean,          // default true
     isGoogleUser: Boolean,      // default false
     googleId: String,
     resetOtp: String,
     resetOtpExpireAt: Date,
     wishlist: [ObjectId],
     cart: [{ hotelId: ObjectId, quantity: { type: Number, min: 1 } }]
   }
   ```
   - **Indexes:** `{ email: 1 }` unique, `{ username: 1 }` unique, `{ googleId: 1 }` sparse unique, TTL on `resetOtpExpireAt`.
   - **Relations:** 1:M to hotels (ownership), bookings, orders, notifications.

3. **`hotels` Collection`**  
   ```javascript
   {
     owner: ObjectId,            // ref users, required
     name: String,
     description: String,
     category: { type: String, enum: [...] },
     location: {
       city: String,
       address: String,
       coordinates: { type: { type: String, default: 'Point' }, coordinates: [Number] }
     },
     starRating: { type: Number, min: 1, max: 5 },
     rating: { type: Number, default: 0, min: 0, max: 5 },
     reviewCount: { type: Number, default: 0 },
     priceRange: {
       min: Number,
       max: Number
     },
     images: { type: [String], validate: v => v.length >= 1 },
     amenities: [String],
     policies: {
       checkIn: { type: String, default: '2:00 PM' },
       checkOut: { type: String, default: '12:00 PM' },
       cancellationPolicy: String,
       petPolicy: String
     },
     contact: {
       phone: String,
       email: String,
       website: String
     },
     status: { type: String, enum: ['pending','approved','rejected','suspended'], default: 'pending' },
     isActive: { type: Boolean, default: true },
     featured: { type: Boolean, default: false },
     totalRooms: { type: Number, default: 0 },
     availableRooms: { type: Number, default: 0 },
     totalBookings: { type: Number, default: 0 },
     totalRevenue: { type: Number, default: 0 }
   }
   ```
   - **Indexes:** text index `{ name: 'text', description: 'text' }`, `{ 'location.city': 1 }`, `{ category: 1 }`, `{ starRating: -1 }`, `{ owner: 1 }`, geospatial `{ location.coordinates: '2dsphere' }`.
   - **Business Rules:** auto-pending, admin-only approvals, soft delete via `isActive`.

4. **`rooms` Collection**  
   ```javascript
   {
     hotel: ObjectId,
     roomName: String,
     roomNumber: String,
     type: { type: String, enum: ['single','double','suite','deluxe','villa'] },
     price: { type: Number, min: 1 },
     status: { type: String, enum: ['available','occupied','maintenance','cleaning'], default: 'available' },
     description: String,
     amenities: [String],
     images: [String],
     capacity: { adults: { type: Number, default: 2, max: 6 }, children: { type: Number, default: 0, max: 4 } },
     bedType: { type: String, enum: ['Single','Double','Queen','King','Twin'] },
     qrCode: String
   }
   ```
   - **Indexes:** `{ hotel: 1, roomNumber: 1 }` unique, `{ hotel: 1, status: 1 }`.
   - **Rules:** cannot book non-`available`; booking confirmation updates `status`.

5. **`bookings` Collection**  
   ```javascript
   {
     user: ObjectId,
     hotel: ObjectId,            // denormalized for faster lookups
     room: ObjectId,
     checkIn: Date,
     checkOut: Date,
     guests: { adults: Number, children: Number },
     totalAmount: Number,
     currency: { type: String, default: 'USD' },
     status: { type: String, enum: ['pending','confirmed','checkedIn','checkedOut','cancelled','noShow'], default: 'pending' },
     paymentStatus: { type: String, enum: ['unpaid','authorized','captured','refunded'], default: 'unpaid' },
     specialRequests: String,
     source: String
   }
   ```
   - **Indexes:** `{ user: 1, status: 1 }`, `{ room: 1, checkIn: 1, checkOut: 1 }` (overlap prevention), TTL for archived docs optional.
   - **Lifecycle:** Pending → Confirmed → CheckedIn → CheckedOut / Cancelled / NoShow.

6. **`payments` Collection**  
   Tracks provider data per booking for future integrations.
   - **Fields:** `booking`, `provider`, `providerPaymentId`, `amount`, `currency`, `status`, `method`, `receiptUrl`, `meta`.
   - **Indexes:** `{ booking: 1 }` unique, `{ providerPaymentId: 1 }` unique.

7. **`menuitems` Collection**  
   - Fields: `hotel`, `name`, `category`, `price`, `image`, `isAvailable`, `orderType` (KOT/BOT/Dine-in/Room Service/Takeaway).
   - **Indexes:** `{ hotel: 1, category: 1 }`, text index on `name` for quick search.

8. **`orders` Collection**  
   ```javascript
   {
     hotel: ObjectId,
     room: ObjectId,
     orderedBy: ObjectId,
     items: [{
       menuItem: ObjectId,
       name: String,        // snapshot for historical pricing
       quantity: { type: Number, min: 1 },
       price: Number
     }],
     totalPrice: Number,
     orderType: { type: String, enum: ['roomService','dineIn','takeAway'] },
     status: { type: String, enum: ['pending','preparing','ready','delivered','cancelled'], default: 'pending' },
     priority: { type: String, enum: ['normal','high'], default: 'normal' }
   }
   ```
   - **Indexes:** `{ room: 1, status: 1 }`, TTL on soft-deleted docs optional.

9. **`notifications` Collection**  
   - Fields: `user`, `type`, `title`, `message`, `payload`, `read`, `sentAt`.
   - **Indexes:** `{ user: 1, read: 1 }`.

10. **`waitercalls` Collection**  
    - Fields: `hotel`, `room`, `raisedBy`, `type` (cleaning/emergency/etc.), `status` (open/acknowledged/resolved/cancelled), `notes`.
    - **Indexes:** `{ hotel: 1, status: 1 }`, TTL on resolved >30d.

---

🔗 **Database Relationships Diagram**
```
┌─────────────┐
│    Role     │
│  - admin    │
│  - owner    │◄─────────┐
│  - staff    │          │ (1:M)
│  - guest    │          │
└─────────────┘          │
                         │
                    ┌────▼─────┐
             ┌──────┤   User   ├──────┐
             │(M:1) │          │(1:M) │
             │      └──────────┘      │
             │                        │
        ┌────▼─────┐            ┌─────▼──────┐
        │  Hotel   │            │   Booking  │
        │          │◄───────┐   │            │
        └────┬─────┘  (1:M) │   └─────┬──────┘
             │              │         │(M:1)
        (1:M)│         ┌────▼─────┐   │
             │         │   Room   │◄──┘
             │         │          │
             └────────►└──────────┘
                 (M:1)

┌──────────────┐      ┌────────────┐
│   MenuItem   │      │   Order    │
│              │      │ (orderBy)  │◄─── User (M:1)
└──────────────┘      └────────────┘

┌──────────────┐      ┌────────────────┐
│ Notification │◄─────┤  WaiterCall    │
│ (recipient)  │      │                │
└──────────────┘      └────────────────┘
     ▲
     │ (M:1)
     └─── User
```

---

🔐 **Authentication & Security Hooks (DB Impact)**
- Password hashing via pre-save middleware using bcrypt (cost 10+).
- OTP fields in `users` carry TTL indexes to auto-expire sensitive tokens.
- JWT metadata not stored, but refresh-token invalidation can leverage a `sessions` collection if required.
- RBAC enforced via `role` references; admins can soft-delete (`isActive = false`) instead of removing documents, preserving audit trails.

---

🌐 **API Touchpoints (DB-centric)**
- Authentication routes manipulate `users`, OTP fields, and login telemetry.
- Hotel routes fan out to `hotels`, `rooms`, and derived stats.
- Booking/order endpoints transact against `bookings`, `orders`, `payments`, updating `hotels.totalRevenue` and `rooms.status` within the same service layer for consistency.

---

📊 **Database Indexes & Performance**
- **Hotels:** text search (`name`, `description`), city/category/star filters, 2dsphere for nearby search, featured/status for admin dashboards.
- **Rooms:** compound unique (hotel, roomNumber) ensures no duplicates; status index accelerates availability queries.
- **Users:** unique email/username + sparse Google ID; TTL on OTP expiry prevents stale reset tokens.
- **Bookings:** compound (room, checkIn, checkOut) rejects overlaps; (user, status) speeds up dashboards; optional TTL for archived bookings.
- **Orders & Notifications:** status/read indexes keep panels snappy; consider partial indexes on `read:false` to optimize unread counts.
- **Caching:** Introduce Redis for featured hotels, menu snapshots, OTP throttling to reduce DB load.

---

📈 **Scalability & Reliability Considerations**
- Promote MongoDB Atlas with replica sets + auto backups; enable sharding by `hotel` when listings multiply.
- Move OTP + rate-limit counters to Redis to avoid losing state on server restart.
- Use change streams or scheduled jobs to keep `hotel.totalRevenue` synced without heavy aggregations.
- Containerize services; add CI/CD gating for schema migrations (e.g., using Mongoose migration scripts).
- Add queue (BullMQ/RabbitMQ) for email notifications, receipt generation, analytics to keep API latency low.

---

🏆 **Conclusion**
StayHaven's database design balances flexible document modeling with production safeguards such as schema validation, referential consistency via ObjectId references, well-placed indexes, and future-proofed collections (payments, notifications). This foundation empowers rapid delivery of booking, ordering, and analytics features while remaining readable for the dev team and transparent for client presentations.
