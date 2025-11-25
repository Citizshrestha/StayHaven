# 🗄️ StayHaven Database - Entity Relationship Diagram

## Complete ER Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STAYHAVEN DATABASE ER DIAGRAM                            │
│                              (MongoDB/Mongoose)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────┐
│         ROLE             │
│──────────────────────────│
│ PK  _id: ObjectId        │
│     name: String         │
│       - admin            │
│       - owner            │
│       - staff            │
│       - guest            │
└──────────────────────────┘
            │
            │ Referenced by (1:M)
            ▼
┌──────────────────────────────────────────────┐
│                   USER                        │
│───────────────────────────────────────────────│
│ PK  _id: ObjectId                            │
│     fullname: String [required]              │
│     username: String [required, unique]      │
│     email: String [required, unique]         │
│     password: String [required, hashed]      │
│     profilePicture: String                   │
│ FK  role: ObjectId → Role._id                │
│     roomNumber: String                       │
│     contact: String                          │
│     isActive: Boolean [default: true]        │
│                                              │
│     ┌─ Password Reset ─────────────┐        │
│     │ resetOtp: String             │        │
│     │ resetOtpExpireAt: Number     │        │
│     └──────────────────────────────┘        │
│                                              │
│     ┌─ Google OAuth ──────────────┐         │
│     │ isGoogleUser: Boolean        │         │
│     │ googleId: String             │         │
│     └──────────────────────────────┘         │
│                                              │
│     ┌─ E-commerce (Future) ───────┐         │
│     │ wishlist: [String]           │         │
│     │ cart: [{                     │         │
│     │   hotelId: String,           │         │
│     │   quantity: Number           │         │
│     │ }]                           │         │
│     └──────────────────────────────┘         │
│                                              │
│     createdAt: Date                          │
│     updatedAt: Date                          │
└──────────────────────────────────────────────┘
            │                    │
            │                    │
            │ Owns (1:M)         │ Places (1:M)
            │                    │
            ▼                    ▼
┌──────────────────────────────────────────────┐      ┌─────────────────────────────┐
│                  HOTEL                        │      │         BOOKING             │
│───────────────────────────────────────────────│      │─────────────────────────────│
│ PK  _id: ObjectId                            │      │ PK  _id: ObjectId           │
│     name: String [required]                  │      │ FK  user: ObjectId          │
│     description: String [required]           │      │       → User._id            │
│ FK  owner: ObjectId → User._id               │      │ FK  room: ObjectId          │
│                                              │      │       → Room._id            │
│     ┌─ Location ────────────────────┐       │      │     checkIn: Date           │
│     │ location: {                   │       │      │     checkOut: Date          │
│     │   city: String [required]     │       │      │     totalAmount: Number     │
│     │   address: String [required]  │       │      │     status: String          │
│     │   coordinates: {              │       │      │       - Pending             │
│     │     latitude: Number,         │       │      │       - Confirmed           │
│     │     longitude: Number         │       │      │       - Checked-In          │
│     │   }                           │       │      │       - Check-Out           │
│     │ }                             │       │      │       - Cancelled           │
│     └───────────────────────────────┘       │      │     createdAt: Date         │
│                                              │      │     updatedAt: Date         │
│     category: String [required]              │      └─────────────────────────────┘
│       - Hotel | Resort | Villa               │                    │
│       - Apartment | Guest House | Hostel     │                    │
│                                              │                    │ Books (M:1)
│     starRating: Number [1-5]                 │                    │
│     rating: Number [0-5, default: 0]         │                    │
│     reviewCount: Number [default: 0]         │                    ▼
│                                              │      ┌─────────────────────────────┐
│     ┌─ Pricing ─────────────────┐           │      │          ROOM               │
│     │ priceRange: {             │           │      │─────────────────────────────│
│     │   min: Number [required]  │           │      │ PK  _id: ObjectId           │
│     │   max: Number [required]  │           │      │ FK  hotel: ObjectId         │
│     │ }                         │           │      │       → Hotel._id           │
│     └───────────────────────────┘           │      │     roomName: String        │
│                                              │      │     roomNumber: String      │
│     images: [String] [min: 1 required]       │      │     type: String            │
│     amenities: [String]                      │      │       - single | double     │
│                                              │      │       - suite | deluxe      │
│     ┌─ Policies ────────────────┐           │      │       - villa               │
│     │ policies: {               │           │      │     price: Number           │
│     │   checkIn: String         │           │      │     status: String          │
│     │   checkOut: String        │           │      │       - available           │
│     │   cancellationPolicy: Str │           │      │       - occupied            │
│     │   petPolicy: String       │           │      │       - maintenance         │
│     │ }                         │           │      │       - cleaning            │
│     └───────────────────────────┘           │      │     description: String     │
│                                              │      │     amenities: [String]     │
│     ┌─ Contact ────────────────┐            │      │     images: [String]        │
│     │ contact: {               │            │      │                             │
│     │   phone: String          │            │      │     ┌─ Capacity ──────┐    │
│     │   email: String          │            │      │     │ capacity: {      │    │
│     │   website: String        │            │      │     │   adults: Number │    │
│     │ }                        │            │      │     │   children: Num  │    │
│     └──────────────────────────┘            │      │     │ }                │    │
│                                              │      │     └──────────────────┘    │
│     status: String [default: pending]        │      │     bedType: String         │
│       - pending | approved                   │      │     QR: String              │
│       - rejected | suspended                 │      │     createdAt: Date         │
│     isActive: Boolean [default: true]        │      │     updatedAt: Date         │
│     featured: Boolean [default: false]       │◄─────┤                             │
│                                              │  Has │ UNIQUE INDEX:               │
│     ┌─ Statistics ──────────────┐           │ (1:M)│ (hotel + roomNumber)        │
│     │ totalRooms: Number        │           │      └─────────────────────────────┘
│     │ availableRooms: Number    │           │
│     │ totalBookings: Number     │           │
│     │ totalRevenue: Number      │           │
│     └───────────────────────────┘           │
│                                              │
│     createdAt: Date                          │
│     updatedAt: Date                          │
│                                              │
│ INDEXES:                                     │
│   - Text: (name, description)                │
│   - Single: location.city, category          │
│   - Single: starRating, owner                │
│   - Descending: rating                       │
└──────────────────────────────────────────────┘




┌────────────────────────────────────────────────────────────────────────────────┐
│                          ORDER & MENU ENTITIES                                  │
└────────────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────┐
        │      MENUITEM               │
        │─────────────────────────────│
        │ PK  _id: ObjectId           │
        │     name: String [required] │
        │     category: String        │
        │       - Breakfast           │
        │       - Lunch | Dinner      │
        │       - Snacks | Drinks     │
        │       - Dessert             │
        │     price: Number           │
        │     image: String           │
        │     isAvailable: Boolean    │
        │     orderType: String       │
        │       - KOT | BOT           │
        │       - Dine-In | Takeaway  │
        │       - Delivery            │
        │       - Room Service        │
        │     createdAt: Date         │
        │     updatedAt: Date         │
        └─────────────────────────────┘
                    │
                    │ Referenced by (conceptual)
                    ▼
        ┌─────────────────────────────────────┐
        │           ORDER                      │
        │──────────────────────────────────────│
        │ PK  _id: ObjectId                    │
        │     roomNumber: Number [required]    │
        │                                      │
        │     ┌─ Items ───────────────────┐   │
        │     │ items: [{                 │   │
        │     │   name: String,           │   │
        │     │   quantity: Number,       │   │
        │     │   price: Number           │   │
        │     │ }]                        │   │
        │     └───────────────────────────┘   │
        │                                      │
        │     totalPrice: Number [required]    │
        │     status: String                   │
        │       - Pending                      │
        │       - Preparing                    │
        │       - Delivered                    │
        │ FK  orderBy: ObjectId → User._id     │
        │     createdAt: Date                  │
        └──────────────────────────────────────┘




┌────────────────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION & SERVICE ENTITIES                             │
└────────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │         NOTIFICATION                  │
        │───────────────────────────────────────│
        │ PK  _id: ObjectId                     │
        │ FK  recipient: ObjectId → User._id    │
        │ FK  sender: ObjectId → User._id       │
        │     type: String [required]           │
        │       - Order | WaiterCall            │
        │       - Booking | System              │
        │     title: String [required]          │
        │     message: String [required]        │
        │                                       │
        │     ┌─ Related Data ────────────┐    │
        │     │ data: {                   │    │
        │     │   orderId: ObjectId,      │    │
        │     │   roomNumber: Number      │    │
        │     │ }                         │    │
        │     └───────────────────────────┘    │
        │                                       │
        │     isRead: Boolean [default: false]  │
        │     createdAt: Date                   │
        └───────────────────────────────────────┘


        ┌──────────────────────────────────────┐
        │          WAITERCALL                   │
        │───────────────────────────────────────│
        │ PK  _id: ObjectId                     │
        │     roomNumber: Number [required]     │
        │     status: String                    │
        │       - Active                        │
        │       - Handled                       │
        │     createdAt: Date                   │
        └───────────────────────────────────────┘




┌────────────────────────────────────────────────────────────────────────────────┐
│                          RELATIONSHIP SUMMARY                                   │
└────────────────────────────────────────────────────────────────────────────────┘

RELATIONSHIP TYPE LEGEND:
  1:1   = One-to-One
  1:M   = One-to-Many
  M:M   = Many-to-Many (through junction table)
  →     = Foreign Key Reference


┌─────────────────┬──────────────────┬───────────┬─────────────────────────────┐
│  FROM ENTITY    │   TO ENTITY      │   TYPE    │   DESCRIPTION               │
├─────────────────┼──────────────────┼───────────┼─────────────────────────────┤
│ Role            │ User             │   1:M     │ One role, many users        │
│ User            │ Hotel            │   1:M     │ Owner owns many hotels      │
│ User            │ Booking          │   1:M     │ User makes many bookings    │
│ User            │ Order            │   1:M     │ User places many orders     │
│ User            │ Notification     │   1:M     │ User receives notifications │
│ Hotel           │ Room             │   1:M     │ Hotel has many rooms        │
│ Room            │ Booking          │   1:M     │ Room has many bookings      │
│ MenuItem        │ Order.items      │ Indirect  │ Referenced by name          │
│ Order           │ Notification     │ Indirect  │ Via notification.data       │
└─────────────────┴──────────────────┴───────────┴─────────────────────────────┘




┌────────────────────────────────────────────────────────────────────────────────┐
│                            CARDINALITY DIAGRAM                                  │
└────────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────┐
                        │   ROLE   │
                        └────┬─────┘
                             │
                        1    │
                             │
                        ─────┴─────
                             │
                        *    │
                        ┌────▼─────┐
               ┌────────┤   USER   ├────────┐
               │        └────┬─────┘        │
               │             │              │
           1   │             │ 1            │ 1
               │             │              │
          ─────┴─────   ─────┴─────    ─────┴─────
               │             │              │
          *    │        *    │         *    │
        ┌──────▼────┐  ┌────▼─────┐  ┌─────▼──────┐
        │   HOTEL   │  │  BOOKING │  │   ORDER    │
        └──────┬────┘  └────┬─────┘  └────────────┘
               │            │
           1   │            │ *
               │            │
          ─────┴─────  ─────┴─────
               │            │
          *    │            │ 1
        ┌──────▼────┐       │
        │   ROOM    │───────┘
        └───────────┘

* = Many (0 or more)
1 = Exactly One




┌────────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE CONSTRAINTS                                    │
└────────────────────────────────────────────────────────────────────────────────┘

UNIQUE CONSTRAINTS:
  • User.email (unique)
  • User.username (unique)
  • User.googleId (unique, sparse)
  • Room: (hotel + roomNumber) composite unique

REQUIRED FIELDS:
  • User: fullname, username, email, password
  • Hotel: name, description, owner, location.city, location.address, category,
           starRating, priceRange.min, priceRange.max, images (min 1),
           contact.phone, contact.email
  • Room: hotel, roomName, roomNumber, type, price, status
  • Booking: user, room, checkIn, checkOut, totalAmount
  • Order: roomNumber, items, totalPrice, orderBy

ENUMERATIONS:
  • Role.name: ['admin', 'staff', 'guest', 'owner']
  • Hotel.category: ['Hotel', 'Resort', 'Villa', 'Apartment', 'Guest House', 'Hostel']
  • Hotel.starRating: [1, 2, 3, 4, 5]
  • Hotel.status: ['pending', 'approved', 'rejected', 'suspended']
  • Room.type: ['single', 'double', 'suite', 'deluxe', 'villa']
  • Room.status: ['available', 'occupied', 'maintenance', 'cleaning']
  • Room.bedType: ['Single', 'Double', 'Queen', 'King', 'Twin']
  • Booking.status: ['Pending', 'Confirmed', 'Checked-In', 'Check-Out', 'Cancelled']
  • Order.status: ['Pending', 'Preparing', 'Delivered']
  • MenuItem.category: ['Breakfast', 'Dinner', 'Lunch', 'Snacks', 'Drinks', 'Dessert']
  • MenuItem.orderType: ['KOT', 'BOT', 'Dine-In', 'Takeaway', 'Delivery', 
                         'Room Service', 'Others']
  • WaiterCall.status: ['Active', 'Handled']

VALIDATION RULES:
  • Hotel.images: Array must have at least 1 element
  • Hotel.priceRange: min < max
  • User.password: Minimum 6 characters (application level)
  • Booking: checkOut > checkIn (application level)
  • Room.roomNumber: Unique within same hotel (compound index)

DEFAULT VALUES:
  • User.isActive: true
  • User.wishlist: []
  • User.cart: []
  • Hotel.status: 'pending'
  • Hotel.isActive: true
  • Hotel.featured: false
  • Hotel.rating: 0
  • Hotel.reviewCount: 0
  • Hotel.totalRooms: 0
  • Hotel.availableRooms: 0
  • Hotel.totalBookings: 0
  • Hotel.totalRevenue: 0
  • Room.status: 'available'
  • Room.capacity.adults: 2
  • Room.capacity.children: 0
  • Booking.status: 'Pending'
  • Order.status: 'Pending'
  • MenuItem.isAvailable: true
  • MenuItem.orderType: 'Others'
  • Notification.isRead: false
  • WaiterCall.status: 'Active'




┌────────────────────────────────────────────────────────────────────────────────┐
│                            INDEXES FOR PERFORMANCE                              │
└────────────────────────────────────────────────────────────────────────────────┘

USER COLLECTION:
  • { email: 1 } unique
  • { username: 1 } unique
  • { googleId: 1 } sparse unique

HOTEL COLLECTION:
  • { name: "text", description: "text" }     // Full-text search
  • { "location.city": 1 }                    // City filter
  • { category: 1 }                           // Category filter
  • { starRating: 1 }                         // Star rating filter
  • { rating: -1 }                            // Sort by rating (descending)
  • { owner: 1 }                              // Owner's hotels

ROOM COLLECTION:
  • { hotel: 1, roomNumber: 1 } unique        // Composite unique




┌────────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW & BUSINESS LOGIC                              │
└────────────────────────────────────────────────────────────────────────────────┘

HOTEL APPROVAL WORKFLOW:
  1. Owner creates Hotel → status: 'pending'
  2. Admin reviews Hotel
  3. Admin sets status: 'approved' OR 'rejected'
  4. If approved → visible on public marketplace
  5. If rejected → owner notified, can edit and resubmit

BOOKING WORKFLOW:
  1. Guest selects Room → checks availability
  2. Creates Booking → status: 'Pending'
  3. Payment processed → status: 'Confirmed'
  4. Guest checks in → status: 'Checked-In'
  5. Room.status → 'occupied'
  6. Guest checks out → status: 'Check-Out'
  7. Room.status → 'available'
  8. Hotel.totalBookings++, Hotel.totalRevenue += amount

ORDER WORKFLOW:
  1. Guest browses MenuItems → adds to order
  2. Creates Order → status: 'Pending'
  3. Staff receives notification
  4. Staff updates status → 'Preparing'
  5. Food ready → status: 'Delivered'
  6. Guest receives notification

WAITER CALL WORKFLOW:
  1. Guest presses "Call Waiter" → creates WaiterCall
  2. WaiterCall.status: 'Active'
  3. Notification sent to Staff
  4. Staff responds → WaiterCall.status: 'Handled'




┌────────────────────────────────────────────────────────────────────────────────┐
│                              NOTES & CONSIDERATIONS                             │
└────────────────────────────────────────────────────────────────────────────────┘

1. MONGODB DOCUMENT STRUCTURE:
   - All entities are stored as collections (not tables)
   - _id is auto-generated ObjectId (primary key)
   - Foreign keys store ObjectId references
   - Embedded documents used for: location, pricing, policies, contact, capacity

2. SOFT DELETE PATTERN:
   - Hotels use isActive: false (not physical deletion)
   - Preserves historical data and relationships

3. TIMESTAMPS:
   - All entities have createdAt and updatedAt (Mongoose timestamps: true)
   - Automatic date tracking for auditing

4. FUTURE ENHANCEMENTS:
   - Review entity (user reviews for hotels)
   - Payment entity (transaction records)
   - Message entity (chat between guest and owner)
   - Analytics entity (platform metrics)

5. SECURITY CONSIDERATIONS:
   - Passwords are bcrypt hashed (10 rounds)
   - resetOtp expires after 15 minutes
   - JWT tokens for authentication
   - Role-based access control via Role entity

6. SCALABILITY:
   - Indexed fields for fast queries
   - Room.roomNumber unique per hotel (not globally)
   - Pagination implemented on hotel listings
   - Text search enabled on hotel name/description




┌────────────────────────────────────────────────────────────────────────────────┐
│                           VISUAL ER DIAGRAM (CROW'S FOOT)                       │
└────────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────┐
                                 │  ROLE   │
                                 └────┬────┘
                                      │
                                   ┼──┼       (1 to Many)
                                      │
                                 ┌────▼────┐
                        ┌────────┤  USER   ├────────┐
                        │        └────┬────┘        │
                        │             │             │
                     ┼──┼          ┼──┼          ┼──┼
                        │             │             │
                   ┌────▼───┐    ┌───▼────┐   ┌────▼────┐
                   │ HOTEL  │    │BOOKING │   │  ORDER  │
                   └────┬───┘    └───┬────┘   └─────────┘
                        │            │
                     ┼──┼         ┼──┼
                        │            │
                   ┌────▼───┐        │
                   │  ROOM  │◄───────┘
                   └────────┘
                             ┼──┼


LEGEND:
  │──│   = One (exactly one)
  ┼──┼   = Many (zero or more)
  
  │──┼   = One-to-Many relationship
  ┼──┼   = Many-to-Many relationship


```

---

## 📊 **Database Statistics**

**Total Collections**: 9
- Core Entities: User, Role, Hotel, Room, Booking
- Service Entities: Order, MenuItem, Notification, WaiterCall

**Total Relationships**: 8 direct foreign key relationships

**Total Indexes**: 12+ (including unique constraints and performance indexes)

**Storage Estimate** (for 1000 hotels):
- Users: ~50-100 MB
- Hotels: ~200-300 MB (with embedded data)
- Rooms: ~100-200 MB
- Bookings: ~50-100 MB
- Orders: ~50-100 MB
- Total: ~500 MB - 1 GB

---

## 🎯 **Key Design Decisions**

1. **Embedded vs Referenced Documents**:
   - Embedded: location, pricing, policies, contact (rarely queried independently)
   - Referenced: owner, role, hotel, room (frequently queried independently)

2. **Denormalization**:
   - Hotel stores totalBookings, totalRevenue (for fast dashboard queries)
   - Trade-off: Slightly more complex update logic for better read performance

3. **Compound Unique Index**:
   - Room (hotel + roomNumber) allows same room numbers across different hotels

4. **Status Enums**:
   - Enforces data integrity at schema level
   - Prevents invalid status values

5. **Soft Delete**:
   - Preserves data for historical reporting
   - Allows potential "undelete" functionality

---

*End of ER Diagram Documentation*
