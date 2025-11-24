# 🏨 StayHaven - Project Understanding Document

> **Before Building Anything - READ THIS FIRST**  
> A beginner-friendly guide to understanding the entire system

---

## 📋 Table of Contents
1. [What Does This Project Do?](#what-does-this-project-do)
2. [Visual Architecture Diagram](#visual-architecture-diagram)
3. [User Roles & What They Can Do](#user-roles--what-they-can-do)
4. [Pages & User Interface](#pages--user-interface)
5. [Backend APIs (What Can You Do?)](#backend-apis-what-can-you-do)
6. [Database Schema (How Data is Stored)](#database-schema-how-data-is-stored)
7. [How Everything Connects](#how-everything-connects)
8. [What's Working vs What's Missing](#whats-working-vs-whats-missing)
9. [Unknowns & Questions](#unknowns--questions)

---

## 🎯 What Does This Project Do?

**StayHaven** is like Airbnb or Booking.com - a **hotel marketplace** where:

### 👤 For Guests (People booking hotels):
- Search and filter hotels by city, price, rating, amenities
- View hotel details with photos, rooms, and reviews
- Book hotel rooms (database ready, UI not built yet)
- Order food to their room after checking in (planned)
- Call for room service (planned)

### 🏨 For Hotel Owners (People listing hotels):
- Create hotel listings with photos, amenities, and pricing
- Wait for admin approval before hotel goes live
- Manage rooms in their hotel
- View booking statistics and revenue
- Update hotel information

### 👨‍💼 For Staff (Hotel employees):
- See food orders from guests
- Handle room service requests
- Update order status (preparing, ready, delivered)
- *(Staff dashboard not built yet)*

### 🔧 For Admins (Platform managers):
- Approve or reject new hotel listings
- Mark hotels as "featured" on homepage
- Manage users and suspend accounts
- View platform-wide statistics
- *(Admin dashboard not built yet)*

---

## 🏗️ Visual Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (What You See)                       │
│  Technology: React 19 + Vite + Tailwind CSS                          │
│  Running on: http://localhost:5173                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📄 PUBLIC PAGES (Anyone can visit):                                │
│    • Home Page        (/)                                            │
│    • Hotel Search     (/hotels)                                      │
│    • Hotel Details    (/hotel/:id)                                   │
│    • Login            (/login)                                       │
│    • Register         (/register)                                    │
│    • Forgot Password  (/forgot-password)                             │
│                                                                       │
│  🔒 PROTECTED PAGES (Need login - Not built yet):                   │
│    • Guest Dashboard                                                 │
│    • Owner Dashboard  (for hotel owners)                             │
│    • Staff Dashboard  (for hotel staff)                              │
│    • Admin Dashboard  (for platform admins)                          │
│                                                                       │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
                     │ HTTP Requests (using Axios)
                     │ Example: "GET /api/hotels"
                     │
┌────────────────────▼─────────────────────────────────────────────────┐
│                    BACKEND API (Brain of the System)                  │
│  Technology: Node.js + Express.js                                    │
│  Running on: http://localhost:3000                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  🔐 AUTHENTICATION SYSTEM:                                           │
│    • Email/Password login with password hashing (bcrypt)             │
│    • Google OAuth (Sign in with Google)                              │
│    • OTP verification for signup and password reset                  │
│    • JWT tokens (Access token + Refresh token)                       │
│    • Role-based permissions (Guest, Owner, Staff, Admin)             │
│                                                                       │
│  🏨 HOTEL MANAGEMENT:                                                │
│    • Create hotels (owners only)                                     │
│    • Search & filter hotels (everyone)                               │
│    • Approve/reject hotels (admin only)                              │
│    • Update hotel details (owner)                                    │
│    • Delete hotels (soft delete - owner)                             │
│                                                                       │
│  📊 STATISTICS & ANALYTICS:                                          │
│    • Total bookings per hotel                                        │
│    • Revenue tracking                                                │
│    • Average ratings                                                 │
│    • Occupancy rates                                                 │
│                                                                       │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
                     │ Mongoose (Database Communication)
                     │
┌────────────────────▼─────────────────────────────────────────────────┐
│                    DATABASE (Where Data Lives)                        │
│  Technology: MongoDB (NoSQL Database)                                │
│  Database Name: stayhaven                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📦 COLLECTIONS (Think of them as tables):                           │
│                                                                       │
│   1. users          - All user accounts (guests, owners, staff)      │
│   2. roles          - User permissions (guest, owner, staff, admin)  │
│   3. hotels         - Hotel listings with details                    │
│   4. rooms          - Individual rooms in each hotel                 │
│   5. bookings       - Room reservations made by guests               │
│   6. orders         - Food orders placed by guests                   │
│   7. menuitems      - Food menu items for each hotel                 │
│   8. notifications  - System notifications for users                 │
│   9. waitercalls    - Service requests from guests                   │
│   10. loyalty       - Loyalty program points (schema exists)         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & What They Can Do

### 1. 🎫 **Guest** (Default role for new users)

**Can Do:**
- ✅ Browse all approved hotels
- ✅ Search hotels by location, price, rating
- ✅ Filter by amenities (WiFi, Pool, Gym, etc.)
- ✅ View hotel details, photos, and reviews
- 🔄 Book hotel rooms *(Database ready, UI not built)*
- 🔄 Order food to room *(Schema exists, not implemented)*
- 🔄 Call for room service *(Schema exists, not implemented)*
- 🔄 Leave reviews after checkout *(Schema exists, not implemented)*

**Cannot Do:**
- ❌ Create hotel listings
- ❌ Approve other hotels
- ❌ Access admin features

---

### 2. 🏨 **Hotel Owner**

**Can Do:**
- ✅ Everything a Guest can do
- ✅ Create new hotel listings
- ✅ Add photos, amenities, and pricing
- ✅ View their own hotels
- ✅ See booking statistics (total bookings, revenue)
- 🔄 Edit hotel details *(API ready, UI not built)*
- 🔄 Add/manage rooms *(Schema ready, controller not built)*
- 🔄 View detailed analytics *(API exists, UI incomplete)*

**Cannot Do:**
- ❌ Approve their own hotels (needs admin approval)
- ❌ See other owners' hotels in their dashboard
- ❌ Delete other users

**Special Note:**
- When an owner creates a hotel, its status is "pending"
- Admin must approve it before guests can see it

---

### 3. 👨‍🍳 **Staff** (Hotel employees)

**Can Do:**
- 🔄 View food orders from guests *(Schema ready, no UI)*
- 🔄 Update order status (preparing, ready, delivered) *(Controller not built)*
- 🔄 See waiter call requests *(Schema ready, no implementation)*
- 🔄 Mark service requests as resolved *(Not implemented)*

**Cannot Do:**
- ❌ Create or edit hotels
- ❌ Access owner dashboards
- ❌ Approve hotels

**Status:** 
- ⚠️ Role exists in database
- ⚠️ No routes or controllers implemented yet
- ⚠️ No UI pages created

---

### 4. 🔧 **Admin** (Platform manager)

**Can Do:**
- ✅ Everything a Guest can do
- ✅ Approve hotel listings
- ✅ Reject hotel listings
- ✅ Mark hotels as "featured" (shows on homepage)
- ✅ Suspend hotels
- 🔄 View platform-wide statistics *(No UI yet)*
- 🔄 Manage users (suspend, delete) *(Routes exist, UI not built)*
- 🔄 View all bookings *(Schema ready, not implemented)*

**Cannot Do:**
- ❌ Nothing - Admin has full access

**Status:**
- ✅ Hotel approval system fully working
- ⚠️ Admin dashboard not created yet
- ⚠️ User management UI missing

---

## 📱 Pages & User Interface

### **BUILT & WORKING** ✅

#### 1. **Home Page** (`/`)
**What it looks like:**
- Beautiful hero section with background image
- Search bar for hotels (location, check-in/out dates, category)
- Featured hotels section
- Category cards (Hotels, Resorts, Villas, etc.)

**What users can do:**
- Search for hotels
- Click on featured hotels
- Browse by category
- Navigate to login/register

---

#### 2. **Login Page** (`/login`)
**Features:**
- Email and password fields
- "Remember me" checkbox
- "Forgot password?" link
- Sign in with Google button
- Link to register page

**What happens:**
- User enters credentials
- Backend checks database
- Returns JWT tokens (access + refresh)
- Redirects to homepage or dashboard

---

#### 3. **Register Page** (`/register`)
**Features:**
- Full name, username, email, password fields
- OTP verification (sent to email)
- Google OAuth option
- Terms and conditions checkbox

**Flow:**
1. User fills form
2. Clicks "Send OTP"
3. OTP sent to email (6-digit code)
4. User enters OTP
5. Account created with "guest" role
6. Redirected to login

---

#### 4. **Forgot Password** (`/forgot-password`)
**Features:**
- Email input
- OTP verification
- New password entry
- Confirm password

**Flow:**
1. Enter email
2. Receive OTP
3. Verify OTP
4. Set new password
5. Redirected to login

---

#### 5. **Hotel Listing Page** (`/hotels`)
**Features:**
- Grid of hotel cards
- Filter sidebar:
  - City dropdown
  - Star rating (1-5)
  - Price range slider ($50-$1000+)
  - Amenities checkboxes (WiFi, Pool, Gym, Parking, etc.)
  - Category filter
- Sorting options (rating, price)
- Pagination (12 hotels per page)

**Each hotel card shows:**
- Hotel photo
- Name and location (city)
- Star rating (⭐⭐⭐⭐⭐)
- User rating (4.5/5)
- Price range ($100-$300/night)
- "View Details" button

---

#### 6. **Hotel Details Page** (`/hotel/:id`)
**Features:**
- Image gallery (main image + thumbnails)
- Hotel name, location, star rating
- Amenities list with icons
- Tab navigation:
  - Overview (description, policies)
  - Rooms (room types, prices) *data shown if exists*
  - Tours (virtual tour) *placeholder*
  - Reviews (guest reviews) *placeholder*
- Booking sidebar:
  - Check-in/out date picker
  - Guest count selector
  - Price calculation
  - "Book Now" button *not functional yet*
- Contact information
- Policies (check-in/out times, cancellation, pets)

---

### **PARTIALLY BUILT** 🔄

#### 7. **Owner Dashboard** *(Mentioned in docs, not fully implemented)*
**Expected Features:**
- Statistics cards (total hotels, revenue, bookings, rating)
- List of owner's hotels
- Status badges (pending, approved, rejected)
- Quick actions (view, edit, delete, statistics)
- "Add New Hotel" button

**Status:** 
- API exists
- UI partially designed but not in App.jsx routes

---

### **NOT BUILT YET** ❌

#### Missing Pages:
- Guest Dashboard
- Staff Dashboard
- Admin Dashboard
- Create Hotel Page (for owners)
- Edit Hotel Page
- Room Management Page
- Booking Confirmation Page (UI exists but no real booking flow)
- User Profile Page
- Order History Page
- Payment Page

---

## 🔌 Backend APIs (What Can You Do?)

### **Authentication APIs** (`/api/auth`)

| Endpoint | Method | Access | What It Does |
|----------|--------|--------|--------------|
| `/check` | GET | Public | Check if email exists |
| `/login` | POST | Public | Login with email/password |
| `/register` | POST | Public | Create new account |
| `/google-login` | POST | Public | Login with Google OAuth |
| `/google-register` | POST | Public | Register with Google |
| `/sendSignupOtp` | POST | Public | Send OTP for signup verification |
| `/verifySignupOtp` | POST | Public | Verify signup OTP |
| `/sendResetPasswordOtp` | POST | Public | Send OTP for password reset |
| `/verifyResetPasswordOtp` | POST | Public | Verify reset OTP |
| `/resetPassword` | POST | Public | Reset password with OTP |
| `/refresh` | POST | Public | Refresh access token |
| `/me` | GET | Protected | Get current logged-in user |
| `/logout` | POST | Protected | Logout user |
| `/isAuth` | POST | Protected | Check if user is authenticated |
| `/change-password` | POST | Protected | Change password (when logged in) |

---

### **Hotel APIs** (`/api/hotels`)

| Endpoint | Method | Access | What It Does |
|----------|--------|--------|--------------|
| `/` | GET | Public | Get all approved hotels (with filters) |
| `/:id` | GET | Public | Get single hotel details |
| `/` | POST | Owner/Admin | Create new hotel (status: pending) |
| `/owner/my-hotels` | GET | Owner/Admin | Get hotels owned by logged-in user |
| `/:id` | PUT | Owner/Admin | Update hotel details |
| `/:id` | DELETE | Owner/Admin | Soft delete hotel (isActive = false) |
| `/:id/statistics` | GET | Owner/Admin | Get booking stats for hotel |
| `/:id/status` | PATCH | Admin only | Approve/reject/suspend hotel |
| `/:id/featured` | PATCH | Admin only | Mark hotel as featured |

**Query Parameters for GET `/api/hotels`:**
- `city` - Filter by city name
- `category` - Hotel/Resort/Villa/Apartment/Guest House/Hostel
- `starRating` - 1, 2, 3, 4, or 5 stars
- `minPrice` - Minimum price per night
- `maxPrice` - Maximum price per night
- `amenities` - Comma-separated (WiFi,Pool,Gym)
- `search` - Full-text search in name/description
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 12)
- `sort` - Sort field (default: -rating)

**Example Request:**
```
GET /api/hotels?city=Kathmandu&starRating=4&minPrice=100&maxPrice=300&amenities=WiFi,Pool&page=1&limit=12
```

---

### **User APIs** (`/api/user`)

| Endpoint | Method | Access | What It Does | Status |
|----------|--------|--------|--------------|--------|
| `/wishlist` | GET | Protected | Get user's wishlist | ⚠️ Controller not implemented |
| `/wishlist/:hotelId` | POST | Protected | Add hotel to wishlist | ⚠️ Not implemented |
| `/cart` | GET | Protected | Get cart items | ⚠️ Not implemented |
| `/cart` | POST | Protected | Add to cart | ⚠️ Not implemented |
| `/cart/:hotelId` | DELETE | Protected | Remove from cart | ⚠️ Not implemented |

**Note:** Routes exist in frontend API file but backend controllers are missing.

---

## 🗄️ Database Schema (How Data is Stored)

### **1. Users Collection**

Think of this as the **"Account Information"** table.

```javascript
{
  fullname: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  password: "hashed_with_bcrypt",  // Never stored as plain text!
  profilePicture: "https://...",
  role: ObjectId (→ links to roles collection),
  roomNumber: "305",  // If guest is checked in
  contact: "9876543210",
  isActive: true,  // false = account suspended
  isGoogleUser: false,
  googleId: null,  // Filled if signed up via Google
  resetOtp: "",  // Temporary OTP for password reset
  resetOtpExpireAt: null,  // OTP expires after 10 minutes
  wishlist: [hotelId1, hotelId2],  // Favorite hotels
  cart: [],  // Shopping cart (not used yet)
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

**Real-Life Example:**
```javascript
{
  fullname: "Sarah Johnson",
  username: "sarahj",
  email: "sarah@gmail.com",
  password: "$2a$10$eUVs...",  // Encrypted
  role: "65f1a2b3c4d5e6f7a8b9c0d1",  // Points to "guest" role
  isActive: true,
  isGoogleUser: false,
  wishlist: []
}
```

---

### **2. Roles Collection**

Think of this as **"User Permissions"**.

```javascript
{
  name: "guest",  // or "owner", "staff", "admin"
  permissions: ["view_hotels", "create_booking"],
  description: "Default role for customers",
  isSystemRole: true  // Cannot be deleted
}
```

**4 Roles in System:**
1. `guest` - Default for new users
2. `owner` - Can create hotels
3. `staff` - Can manage orders
4. `admin` - Full access

---

### **3. Hotels Collection**

Think of this as **"Property Listings"**.

```javascript
{
  name: "Grand Plaza Hotel",
  description: "Luxury 5-star hotel in the heart of the city...",
  owner: ObjectId (→ links to user who created it),
  
  location: {
    city: "Kathmandu",
    address: "Durbar Marg, Ward 2",
    coordinates: {
      latitude: 27.7172,
      longitude: 85.3240
    }
  },
  
  category: "Hotel",  // or Resort, Villa, Apartment, Guest House, Hostel
  rating: 4.5,  // Average user rating (0-5)
  reviewCount: 128,
  starRating: 5,  // Hotel's star classification (1-5)
  
  priceRange: {
    min: 150,  // Cheapest room per night
    max: 500   // Most expensive room
  },
  
  images: [
    "https://images.unsplash.com/photo-1...",
    "https://images.unsplash.com/photo-2..."
  ],
  
  amenities: ["WiFi", "Pool", "Gym", "Spa", "Parking", "Restaurant"],
  
  policies: {
    checkIn: "2:00 PM",
    checkOut: "12:00 PM",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in",
    petPolicy: "Pets allowed with $50 fee"
  },
  
  contact: {
    phone: "+977-1-4234567",
    email: "info@grandplaza.com",
    website: "https://grandplaza.com"
  },
  
  status: "approved",  // pending, approved, rejected, suspended
  isActive: true,  // Soft delete flag
  featured: true,  // Shows on homepage
  
  totalRooms: 50,
  availableRooms: 23,
  totalBookings: 1542,  // Lifetime bookings
  totalRevenue: 456000,  // In USD
  
  createdAt: "2025-01-10T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z"
}
```

**Status Flow:**
```
Owner creates hotel → status = "pending"
   ↓
Admin reviews → Approves
   ↓
status = "approved" → Now visible to guests
```

---

### **4. Rooms Collection**

Think of this as **"Individual Room Inventory"**.

```javascript
{
  hotel: ObjectId (→ links to hotel),
  roomName: "Deluxe Ocean View Suite",
  roomNumber: "305",
  type: "deluxe",  // single, double, suite, deluxe, villa
  price: 250,  // Per night
  status: "available",  // available, occupied, maintenance, cleaning
  
  description: "Spacious room with ocean view, king bed, and balcony",
  amenities: ["King Bed", "Ocean View", "Balcony", "Mini Bar", "Smart TV"],
  images: ["https://..."],
  
  capacity: {
    adults: 2,
    children: 1
  },
  
  bedType: "King",  // Single, Double, Queen, King, Twin
  qrCode: "QR_GRAND_305",  // For ordering food from room
  
  createdAt: "2025-01-10T00:00:00Z"
}
```

**Status Lifecycle:**
```
available → (guest books) → occupied
   ↓
(guest checks out) → cleaning
   ↓
(cleaning done) → available
```

---

### **5. Bookings Collection**

Think of this as **"Hotel Reservations"**.

```javascript
{
  user: ObjectId (→ guest who booked),
  hotel: ObjectId (→ which hotel),
  room: ObjectId (→ which room),
  
  checkIn: "2025-12-01T14:00:00Z",  // Dec 1, 2:00 PM
  checkOut: "2025-12-05T12:00:00Z",  // Dec 5, 12:00 PM
  
  guests: {
    adults: 2,
    children: 0
  },
  
  totalAmount: 1000,  // 4 nights × $250/night
  currency: "USD",
  
  status: "Confirmed",  // Pending, Confirmed, Checked-In, Checked-Out, Cancelled, No-Show
  paymentStatus: "paid",  // unpaid, partial, paid, refunded
  
  confirmationCode: "STAY2025ABC123",  // Unique booking code
  specialRequests: "Early check-in if possible. Extra pillows.",
  
  bookingSource: "web",  // web, mobile, admin, api
  
  createdAt: "2025-11-15T10:00:00Z"
}
```

**Booking Lifecycle:**
```
Guest selects room → Pending (awaiting payment)
   ↓
Payment processed → Confirmed
   ↓
Guest arrives → Checked-In
   ↓
Guest leaves → Checked-Out
```

**Important:** System prevents double-booking by checking overlapping dates.

---

### **6. Orders Collection**

Think of this as **"Room Service Orders"**.

```javascript
{
  hotel: ObjectId,
  room: ObjectId,
  roomNumber: "305",  // Stored for quick reference
  orderBy: ObjectId (→ guest),
  
  items: [
    {
      menuItem: ObjectId (→ links to menu item),
      name: "Chicken Burger",  // Snapshot (won't change if menu updates)
      quantity: 2,
      price: 15.99  // Price at time of order
    },
    {
      menuItem: ObjectId,
      name: "Caesar Salad",
      quantity: 1,
      price: 12.99
    }
  ],
  
  totalPrice: 44.97,  // (2 × $15.99) + (1 × $12.99)
  orderType: "roomService",  // roomService, dineIn, takeaway
  status: "preparing",  // pending, confirmed, preparing, ready, delivered, cancelled
  priority: "normal",  // normal, high
  notes: "No onions in burger. Extra dressing for salad.",
  preparationTime: 30,  // Minutes
  deliveredAt: null,
  
  createdAt: "2025-12-02T19:30:00Z"
}
```

**Order Lifecycle:**
```
Guest orders → pending
   ↓
Kitchen receives → confirmed
   ↓
Cooking → preparing
   ↓
Food ready → ready
   ↓
Delivered to room → delivered
```

---

### **7. Menu Items Collection**

Think of this as **"Restaurant Menu"**.

```javascript
{
  hotel: ObjectId (→ which hotel's menu),
  name: "Margherita Pizza",
  description: "Classic pizza with fresh mozzarella and basil",
  category: "Lunch",  // Breakfast, Lunch, Dinner, Snacks, Drinks, Dessert
  price: 18.99,
  image: "https://...",
  isAvailable: true,  // Can toggle if sold out
  orderType: "Room Service",
  preparationTime: 25,  // Minutes
  spiceLevel: "mild",  // none, mild, medium, hot, very-hot
  dietary: ["vegetarian"],  // vegetarian, vegan, gluten-free, etc.
  allergens: ["dairy", "gluten"],
  
  createdAt: "2025-01-10T00:00:00Z"
}
```

---

### **8. Notifications Collection**

Think of this as **"System Messages"**.

```javascript
{
  user: ObjectId (→ recipient),
  sender: ObjectId (→ who sent it, optional),
  type: "booking_confirmed",
  title: "Booking Confirmed! 🎉",
  message: "Your booking at Grand Plaza Hotel is confirmed. Confirmation code: STAY2025ABC123",
  priority: "high",  // low, medium, high
  actionUrl: "/bookings/65f1a2b3c4d5e6f7a8b9c0d1",  // Link to booking details
  
  payload: {  // Extra data
    bookingId: "65f1a2b3c4d5e6f7a8b9c0d1",
    hotelName: "Grand Plaza Hotel",
    checkIn: "2025-12-01"
  },
  
  isRead: false,
  readAt: null,
  
  createdAt: "2025-11-15T10:05:00Z"
}
```

**Notification Types:**
- `booking_confirmed` - Booking successful
- `booking_cancelled` - Booking cancelled
- `hotel_approved` - Hotel approved by admin
- `hotel_rejected` - Hotel rejected
- `order_status` - Order status changed
- `waiter_call` - Service request
- `payment_received` - Payment successful

---

### **9. Waiter Calls Collection**

Think of this as **"Service Requests"**.

```javascript
{
  hotel: ObjectId,
  room: ObjectId,
  roomNumber: "305",
  raisedBy: ObjectId (→ guest),
  
  requestType: "cleaning",  // cleaning, maintenance, emergency, checkout, assistance, other
  priority: "medium",  // low, medium, high, urgent
  description: "Please clean the room. Guest is out for sightseeing.",
  
  status: "acknowledged",  // open, acknowledged, inProgress, resolved, cancelled
  assignedTo: ObjectId (→ staff member),
  acknowledgedAt: "2025-12-02T10:15:00Z",
  resolvedAt: null,
  notes: "Will clean within 30 minutes",
  
  createdAt: "2025-12-02T10:10:00Z"
}
```

**Service Request Flow:**
```
Guest presses "Call for Service" → open
   ↓
Staff sees alert → acknowledged
   ↓
Staff goes to room → inProgress
   ↓
Issue fixed → resolved
```

---

## 🔗 How Everything Connects

### **Scenario 1: Guest Books a Hotel Room**

**Step-by-Step:**

1. **Guest searches for hotels**
   ```
   Frontend: User enters "Kathmandu" in search bar
      ↓
   API Call: GET /api/hotels?city=Kathmandu&starRating=4
      ↓
   Backend: Searches hotels collection
      ↓
   Database: Returns all approved hotels in Kathmandu with 4 stars
      ↓
   Frontend: Displays hotel cards in grid
   ```

2. **Guest clicks on a hotel**
   ```
   Frontend: User clicks "View Details" button
      ↓
   API Call: GET /api/hotels/65f1a2b3c4d5e6f7a8b9c0d1
      ↓
   Backend: Fetches hotel + rooms for that hotel
      ↓
   Database: Returns hotel details + available rooms
      ↓
   Frontend: Shows hotel page with image gallery, amenities, rooms
   ```

3. **Guest selects room and dates**
   ```
   Frontend: User picks room, check-in date, check-out date
      ↓
   Frontend: Calculates total price (4 nights × $250 = $1000)
      ↓
   User clicks "Book Now"
   ```

4. **System creates booking (NOT IMPLEMENTED YET)**
   ```
   API Call: POST /api/bookings
   Body: {
     roomId: "65f1a2b3...",
     checkIn: "2025-12-01",
     checkOut: "2025-12-05",
     guests: { adults: 2, children: 0 }
   }
      ↓
   Backend: Checks if room is available for those dates
      ↓
   Database: Looks for overlapping bookings in bookings collection
      ↓
   If available:
     - Create new booking (status: Pending)
     - Update room status to "occupied"
     - Decrease hotel.availableRooms by 1
     - Generate confirmation code
     - Send notification to guest
     - Send email with booking details
      ↓
   Frontend: Shows "Booking Confirmed!" page
   ```

**Database Changes:**
```javascript
// New booking created
bookings.insertOne({
  user: "65f1a2b3...",
  hotel: "65f2b3c4...",
  room: "65f3c4d5...",
  checkIn: "2025-12-01",
  checkOut: "2025-12-05",
  status: "Confirmed",
  totalAmount: 1000
})

// Room updated
rooms.updateOne(
  { _id: "65f3c4d5..." },
  { $set: { status: "occupied" } }
)

// Hotel stats updated
hotels.updateOne(
  { _id: "65f2b3c4..." },
  { 
    $inc: { totalBookings: 1, availableRooms: -1 },
    $inc: { totalRevenue: 1000 }
  }
)

// Notification created
notifications.insertOne({
  user: "65f1a2b3...",
  type: "booking_confirmed",
  title: "Booking Confirmed!",
  message: "Your booking at Grand Plaza Hotel is confirmed."
})
```

---

### **Scenario 2: Hotel Owner Creates a Listing**

**Step-by-Step:**

1. **Owner registers and logs in**
   ```
   Frontend: Owner fills registration form
      ↓
   API Call: POST /api/auth/register
   Body: {
     fullname: "John Smith",
     email: "john@hotelowner.com",
     password: "SecurePass123",
     role: "owner"  // Selected during registration
   }
      ↓
   Backend: Creates user with role = "owner"
      ↓
   Database: Inserts into users collection
   ```

2. **Owner navigates to "Create Hotel" page**
   ```
   Frontend: Owner clicks "Add New Hotel" in dashboard
      ↓
   Form appears with fields:
     - Hotel name
     - Description
     - Location (city, address, coordinates)
     - Category (Hotel/Resort/Villa)
     - Star rating (1-5)
     - Price range (min, max)
     - Images (URLs)
     - Amenities (checkboxes)
     - Contact info (phone, email, website)
     - Policies (check-in/out times, cancellation, pets)
   ```

3. **Owner submits form**
   ```
   API Call: POST /api/hotels
   Headers: { Authorization: "Bearer <access_token>" }
   Body: {
     name: "Sunset Beach Resort",
     description: "Luxury beachfront resort...",
     location: {
       city: "Pokhara",
       address: "Lakeside, Ward 6",
       coordinates: { latitude: 28.2096, longitude: 83.9856 }
     },
     category: "Resort",
     starRating: 5,
     priceRange: { min: 200, max: 800 },
     images: ["https://...", "https://..."],
     amenities: ["WiFi", "Pool", "Beach Access", "Spa"],
     contact: {
       phone: "+977-61-123456",
       email: "info@sunsetresort.com"
     }
   }
      ↓
   Backend Middleware: Checks JWT token → Verifies user is "owner"
      ↓
   Backend Controller: Validates data
      ↓
   Database: Creates hotel with status = "pending"
   ```

4. **Hotel awaits approval**
   ```
   Database entry:
   {
     name: "Sunset Beach Resort",
     owner: "65f1a2b3..." (owner's user ID),
     status: "pending",  ← Must be approved by admin
     isActive: true,
     featured: false,
     totalBookings: 0,
     totalRevenue: 0,
     createdAt: "2025-11-19T14:30:00Z"
   }
      ↓
   Notification sent to admins:
   {
     user: <admin_id>,
     type: "hotel_pending_approval",
     title: "New Hotel Listing Pending",
     message: "Sunset Beach Resort is awaiting your approval."
   }
      ↓
   Frontend: Shows success message to owner:
     "Hotel created! Pending admin approval."
   ```

5. **Admin reviews and approves**
   ```
   Admin logs in → Goes to Admin Dashboard
      ↓
   API Call: GET /api/hotels?status=pending
      ↓
   Backend: Returns all pending hotels
      ↓
   Admin clicks "Approve" button
      ↓
   API Call: PATCH /api/hotels/65f2b3c4.../status
   Body: { status: "approved" }
      ↓
   Backend: Updates hotel status
      ↓
   Database: hotels.updateOne(
     { _id: "65f2b3c4..." },
     { $set: { status: "approved" } }
   )
      ↓
   Notification sent to owner:
   {
     user: "65f1a2b3...",
     type: "hotel_approved",
     title: "Hotel Approved! 🎉",
     message: "Your hotel Sunset Beach Resort has been approved."
   }
      ↓
   Hotel now visible to guests in search results!
   ```

---

### **Scenario 3: Guest Orders Food to Room**

**Step-by-Step (Future Implementation):**

1. **Guest checks in and receives QR code**
   ```
   Guest arrives at hotel
      ↓
   Front desk: Updates booking status to "Checked-In"
      ↓
   Guest receives room key with QR code (Room 305)
   ```

2. **Guest scans QR code in room**
   ```
   QR Code data: { hotel: "65f2b3c4...", room: "65f3c4d5...", roomNumber: "305" }
      ↓
   Frontend: Opens menu page for that hotel
      ↓
   API Call: GET /api/hotels/65f2b3c4.../menu
      ↓
   Backend: Fetches menu items where hotel = "65f2b3c4..." and isAvailable = true
      ↓
   Database: Returns menu items
      ↓
   Frontend: Displays menu with categories (Breakfast, Lunch, Dinner, Drinks, etc.)
   ```

3. **Guest selects items and places order**
   ```
   Guest adds:
     - 2x Chicken Burger ($15.99 each)
     - 1x Caesar Salad ($12.99)
     - 1x Coca Cola ($3.99)
      ↓
   Total: $48.96
      ↓
   Guest clicks "Place Order"
      ↓
   API Call: POST /api/orders
   Body: {
     roomId: "65f3c4d5...",
     items: [
       { menuItemId: "65f4d5e6...", quantity: 2 },
       { menuItemId: "65f5e6f7...", quantity: 1 },
       { menuItemId: "65f6f7a8...", quantity: 1 }
     ],
     notes: "No onions in burger"
   }
      ↓
   Backend: Creates order with snapshots of item names/prices
      ↓
   Database: Inserts into orders collection
   {
     hotel: "65f2b3c4...",
     room: "65f3c4d5...",
     roomNumber: "305",
     orderBy: "65f1a2b3..." (guest's user ID),
     items: [
       { menuItem: "65f4d5e6...", name: "Chicken Burger", quantity: 2, price: 15.99 },
       { menuItem: "65f5e6f7...", name: "Caesar Salad", quantity: 1, price: 12.99 },
       { menuItem: "65f6f7a8...", name: "Coca Cola", quantity: 1, price: 3.99 }
     ],
     totalPrice: 48.96,
     status: "pending",
     createdAt: "2025-12-02T19:30:00Z"
   }
   ```

4. **Kitchen staff receives order**
   ```
   Notification sent to staff:
   {
     user: <staff_id>,
     type: "order_received",
     title: "New Order - Room 305",
     message: "2x Chicken Burger, 1x Caesar Salad, 1x Coca Cola. Total: $48.96",
     priority: "high"
   }
      ↓
   Staff dashboard: Shows order in "Pending Orders" section
      ↓
   Staff clicks "Confirm Order"
      ↓
   API Call: PATCH /api/orders/65f7a8b9.../status
   Body: { status: "confirmed" }
      ↓
   Database: Updates order status
      ↓
   Guest receives notification: "Order confirmed. Estimated time: 30 mins"
   ```

5. **Order prepared and delivered**
   ```
   Staff updates status:
   pending → confirmed → preparing → ready → delivered
      ↓
   Each status change sends notification to guest:
     - "Your order is being prepared"
     - "Your order is ready for delivery"
     - "Your order has been delivered. Enjoy your meal!"
      ↓
   Database: Sets deliveredAt timestamp
   ```

---

## ✅ What's Working vs ❌ What's Missing

### **✅ FULLY WORKING Features**

#### Authentication & User Management
- ✅ Email/password registration
- ✅ Email/password login
- ✅ Google OAuth (Sign in with Google)
- ✅ OTP verification for signup
- ✅ OTP-based password reset
- ✅ JWT access tokens (15 min expiry)
- ✅ JWT refresh tokens (7 days, stored in httpOnly cookies)
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (Guest, Owner, Staff, Admin)
- ✅ Get current user profile
- ✅ Logout functionality

#### Hotel Management
- ✅ Create hotel listings (owners)
- ✅ Auto-pending status for new hotels
- ✅ Search hotels by city, category, rating, price, amenities
- ✅ Full-text search in hotel names and descriptions
- ✅ Filter hotels with multiple criteria
- ✅ Pagination (12 hotels per page)
- ✅ Get single hotel details with all info
- ✅ Hotel approval/rejection (admin)
- ✅ Mark hotels as featured (admin)
- ✅ Soft delete hotels (owner)
- ✅ Get owner's hotels list
- ✅ Update hotel details (API ready)
- ✅ Get hotel statistics (API ready)

#### Frontend UI
- ✅ Beautiful responsive home page
- ✅ Hotel search with filters
- ✅ Hotel listing page with filter sidebar
- ✅ Hotel details page with image gallery
- ✅ Login page with Google OAuth
- ✅ Register page with OTP verification
- ✅ Forgot password with OTP
- ✅ Reset password flow
- ✅ Navbar with authentication state
- ✅ Toast notifications for success/error messages

#### Database
- ✅ All 10 schemas created and validated
- ✅ Indexes for performance optimization
- ✅ Relationships between collections
- ✅ Data validation at schema level
- ✅ Automatic role seeding on startup

---

### **🔄 PARTIALLY WORKING Features**

#### Hotel Owner Features
- 🔄 Owner dashboard (API exists, UI not integrated in routes)
- 🔄 Create hotel page (mentioned in docs, not in App.jsx)
- 🔄 Edit hotel page (API ready, UI not built)
- 🔄 Hotel statistics page (API exists, UI missing)

**Status:** Backend is ready, frontend pages exist but not connected

#### Room Management
- 🔄 Room schema exists in database
- 🔄 Rooms can be fetched from hotel details API
- ❌ No API endpoints to create/edit/delete rooms
- ❌ No UI for room management

**Status:** 30% complete (schema only)

---

### **❌ COMPLETELY MISSING Features**

#### Booking System
- ❌ No booking API endpoints (POST /api/bookings, GET /api/bookings, etc.)
- ❌ No booking controller
- ❌ No booking UI (date picker, guest selector, payment)
- ❌ No booking confirmation page (skeleton exists)
- ❌ No booking history page
- ❌ No check-in/check-out functionality
- ❌ No booking calendar view
- ❌ No double-booking prevention logic

**Impact:** Guests cannot actually book hotels!  
**Status:** 0% complete (schema exists, nothing else)

#### Payment Integration
- ❌ No payment gateway integration (Stripe, PayPal, etc.)
- ❌ No payment schema in database
- ❌ No payment success/failure handling
- ❌ No invoice generation

**Status:** 0% complete

#### Food Ordering System
- ❌ No menu item management (create, edit, delete)
- ❌ No order creation API
- ❌ No order status updates
- ❌ No kitchen/staff dashboard
- ❌ No QR code generation for rooms

**Impact:** Guests cannot order food to rooms!  
**Status:** 0% complete (schemas exist, nothing else)

#### Service Requests (Waiter Calls)
- ❌ No API to create service requests
- ❌ No staff assignment logic
- ❌ No status tracking (open → acknowledged → resolved)
- ❌ No staff notification system

**Status:** 0% complete (schema exists, nothing else)

#### Reviews & Ratings
- ❌ No review schema
- ❌ No API to submit reviews
- ❌ No rating calculation logic
- ❌ No review display on hotel pages

**Impact:** Hotels show placeholder ratings, not real ones  
**Status:** 0% complete

#### User Dashboards
- ❌ Guest dashboard (view bookings, orders, wishlist)
- ❌ Staff dashboard (manage orders, service requests)
- ❌ Admin dashboard (approve hotels, manage users, view analytics)

**Status:** 0% complete

#### Notifications
- ❌ No notification display UI
- ❌ No notification polling/WebSockets
- ❌ No real-time alerts
- ❌ Schema exists but no implementation

**Status:** 5% complete (schema only)

#### User Features
- ❌ Wishlist (add/remove favorite hotels)
- ❌ Cart functionality
- ❌ User profile page
- ❌ Edit profile
- ❌ Upload profile picture

**Status:** 0% complete (API stubs exist in frontend, no backend)

---

## ❓ Unknowns & Questions

### **Critical Unknowns (Must Clarify Before Building)**

#### 1. Payment System
**Questions:**
- Which payment gateway to use? (Stripe, PayPal, Razorpay, eSewa, Khalti)
- Support which currencies? (USD, EUR, NPR, INR?)
- Payment on booking or at checkout?
- Refund policy implementation?
- Handle partial payments (deposits)?

**Current Status:** No payment integration at all

---

#### 2. Booking Policies
**Questions:**
- Can guests modify bookings after confirmation?
- What's the cancellation policy? (24 hours? 48 hours?)
- Automatic refunds or manual approval?
- No-show penalty?
- Early check-in/late check-out pricing?

**Current Status:** Basic policies in hotel schema, no enforcement logic

---

#### 3. Room Availability Logic
**Questions:**
- How to handle room inventory?
  - Option A: Each room is unique (Room 101, Room 102)
  - Option B: Room types (3x Deluxe Suite, 5x Standard Room)
- Block rooms during maintenance?
- Overbooking allowed (like airlines)?
- Automatically mark rooms as unavailable when booked?

**Current Status:** Schema supports unique rooms, no availability checking implemented

---

#### 4. Email & Notifications
**Questions:**
- Email service provider? (Currently using Nodemailer, but which SMTP?)
- Real-time notifications via WebSockets or polling?
- SMS notifications for bookings?
- Push notifications for mobile app (future)?

**Current Status:**
- ✅ Nodemailer configured for OTP emails
- ❌ No booking confirmation emails
- ❌ No real-time notifications

---

#### 5. Image Uploads
**Questions:**
- Where to store images? (Currently using URLs)
  - Option A: Cloudinary (recommended)
  - Option B: AWS S3
  - Option C: Self-hosted storage
- Maximum image size?
- Image optimization/compression?
- Support image uploads from frontend?

**Current Status:** Hotels have image URLs only, no upload functionality

---

#### 6. Admin Dashboard Features
**Questions:**
- What stats should admins see?
  - Total revenue across all hotels?
  - Number of bookings per month?
  - Most popular hotels?
  - User growth chart?
- Can admin edit any hotel?
- Can admin delete users?
- Audit logs for admin actions?

**Current Status:** Admin can approve/reject hotels, no dashboard

---

#### 7. Staff Management
**Questions:**
- How to assign staff to hotels?
- Staff shifts/schedules?
- Staff can work at multiple hotels?
- Order assignment:
  - Automatic (round-robin)?
  - Manual assignment by manager?
  - First-come-first-serve?

**Current Status:** Staff role exists, zero implementation

---

#### 8. Pricing Strategy
**Questions:**
- Dynamic pricing based on demand?
- Weekend/holiday surcharges?
- Early bird discounts?
- Loyalty program pricing?
- Group booking discounts?

**Current Status:** Static price range only (min-max)

---

#### 9. Review System
**Questions:**
- Can guests review without completing stay?
- Anonymous reviews allowed?
- Owner can respond to reviews?
- How to handle fake/spam reviews?
- Rating categories:
  - Overall rating only?
  - Or: Cleanliness, Staff, Facilities, Location, Value?

**Current Status:** No review system exists

---

#### 10. Search & Discovery
**Questions:**
- Implement map view with pins?
- "Hotels near me" using geolocation?
- Advanced filters:
  - Distance from city center?
  - Specific amenities (e.g., "Pet-friendly + Pool")?
  - Accessible rooms?
- Sorting options:
  - Price (low to high)?
  - Rating (high to low)?
  - Distance?
  - Popularity?

**Current Status:**
- ✅ Text search working
- ✅ Basic filters (city, category, price, rating, amenities)
- ❌ No map view
- ❌ No geolocation
- ❌ No distance-based search

---

### **Nice-to-Have Unknowns (Can Decide Later)**

#### 11. Multi-language Support
- English only or support Nepali, Hindi, etc.?

#### 12. Mobile App
- Build native app or PWA?
- Same database and API?

#### 13. Loyalty Program
- Point-based rewards?
- Tier system (Bronze, Silver, Gold)?
- Schema exists but no logic

#### 14. Vouchers & Coupons
- Discount codes for bookings?
- Gift cards?

#### 15. Analytics & Reporting
- Owner analytics (occupancy rate, revenue trends)?
- Export reports as PDF/Excel?

---

## 🔍 Summary for Developers

### **What You Can Build On:**
1. ✅ Authentication system is solid
2. ✅ Hotel listing and search is working
3. ✅ Database schemas are well-designed
4. ✅ API structure follows REST conventions
5. ✅ Frontend is responsive and modern

### **What Needs to be Built:**
1. ❌ **Booking system** (CRITICAL - Core feature missing!)
2. ❌ **Payment integration** (CRITICAL)
3. ❌ **Room management** (High priority)
4. ❌ **Food ordering** (Medium priority)
5. ❌ **Dashboards for all user types** (Medium priority)
6. ❌ **Review system** (Medium priority)
7. ❌ **Notifications UI** (Low priority)
8. ❌ **Staff features** (Low priority)

### **Recommended Build Order:**
1. **Phase 1:** Complete booking system (API + UI)
2. **Phase 2:** Payment gateway integration
3. **Phase 3:** Owner dashboard (create/edit hotels, manage rooms)
4. **Phase 4:** Guest dashboard (view bookings, profile)
5. **Phase 5:** Food ordering system
6. **Phase 6:** Admin dashboard
7. **Phase 7:** Review system
8. **Phase 8:** Staff features
9. **Phase 9:** Notifications & real-time features

---

## 📊 Project Completion Status

```
┌─────────────────────────────────────────────────────────┐
│                    OVERALL PROGRESS                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░  45%           │
│                                                          │
│  Authentication & Security:     ██████████  100% ✅     │
│  Database Schemas:              ██████████  100% ✅     │
│  Hotel Listings:                ████████░░   85% 🔄     │
│  Search & Filtering:            ████████░░   80% 🔄     │
│  Frontend UI (Public):          ███████░░░   75% 🔄     │
│  Room Management:               ██░░░░░░░░   30% 🔄     │
│  Booking System:                ░░░░░░░░░░   10% ❌     │
│  Payment Integration:           ░░░░░░░░░░    0% ❌     │
│  Food Ordering:                 ░░░░░░░░░░    5% ❌     │
│  Reviews & Ratings:             ░░░░░░░░░░    0% ❌     │
│  User Dashboards:               ░░░░░░░░░░    5% ❌     │
│  Staff Features:                ░░░░░░░░░░    5% ❌     │
│  Admin Features:                ██░░░░░░░░   25% 🔄     │
│  Notifications:                 ░░░░░░░░░░    5% ❌     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Beginner Tips

### **Understanding the Tech Stack:**

**Frontend (React):**
- Think of React as LEGO blocks - components snap together to build pages
- `useState` = Variables that trigger re-render when changed
- `useEffect` = Code that runs when page loads or data changes
- `axios` = Tool to talk to backend APIs

**Backend (Node.js + Express):**
- Express = Framework that listens for HTTP requests
- Routes = URLs that do specific things (`/api/hotels`, `/api/auth/login`)
- Controllers = Functions that handle the actual work
- Middleware = Security checkpoints before reaching controllers

**Database (MongoDB):**
- Collections = Like tables in Excel
- Documents = Individual rows/entries
- ObjectId = Unique identifier (like a primary key)
- Mongoose = Makes MongoDB easier to use with schemas

**Authentication:**
- JWT = Like a movie ticket - proves you paid to enter
- Access Token = Short-lived ticket (15 mins)
- Refresh Token = Can get new access tokens without logging in again (7 days)
- bcrypt = Scrambles passwords so hackers can't read them

---

## 📞 Next Steps

**Before writing any code, clarify these:**

1. ✅ Review this document with the team
2. ❓ Answer all questions in "Unknowns" section
3. ✅ Prioritize features (must-have vs nice-to-have)
4. ✅ Choose payment gateway
5. ✅ Decide on image storage solution
6. ✅ Design database for missing features (reviews, loyalty, etc.)
7. ✅ Create wireframes for missing pages
8. ✅ Set up project management (Trello, Jira, GitHub Projects)
9. ✅ Define API contracts for new endpoints
10. ✅ Start building in phases!

---

**Document Version:** 1.0  
**Created:** November 19, 2025  
**Last Updated:** November 19, 2025  
**Status:** Ready for Review ✅

---

🎯 **Remember:** This is a marketplace platform - the core value is connecting hotel owners with guests. Focus on making booking smooth, payments secure, and user experience delightful!
