# User Roles and Permissions

> Comprehensive documentation of all user roles, their responsibilities, and granular permissions in the StayHaven platform

---

## 📋 Table of Contents

1. [Role Hierarchy Overview](#role-hierarchy-overview)
2. [Role Definitions](#role-definitions)
3. [Permission Matrix](#permission-matrix)
4. [Detailed Role Specifications](#detailed-role-specifications)
5. [Permission Implementation](#permission-implementation)
6. [Role Assignment Rules](#role-assignment-rules)
7. [Security Considerations](#security-considerations)

---

## 🏗️ Role Hierarchy Overview

### Hierarchical Structure

```
┌─────────────────────────────────────────┐
│        Platform Administrator           │  (Highest Authority)
│         - System-wide control           │
│         - Approve/reject hotels         │
│         - Manage all users              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Hotel Owner                   │  (Business Level)
│         - Own multiple properties       │
│         - Create company profile        │
│         - Invite/manage staff           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Hotel Manager                  │  (Operational Level)
│         - Oversee hotel operations      │
│         - Manage assigned properties    │
│         - View analytics                │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼──────────┐
│  Receptionist  │  │   Chief (Chef)    │  (Service Level)
│  - Check-ins   │  │   - Kitchen ops   │
│  - Bookings    │  │   - Order prep    │
└────────────────┘  └───────────────────┘
        │                    │
┌───────▼────────┐  ┌────────▼──────────┐
│     Waiter     │  │  Housekeeping     │  (Staff Level)
│  - Take orders │  │   - Room cleaning │
│  - Serve food  │  │   - Maintenance   │
└────────────────┘  └───────────────────┘
        │
┌───────▼────────────────────────────────┐
│              Guest                      │  (Customer Level)
│         - Book hotels                   │
│         - Order services                │
│         - Leave reviews                 │
└─────────────────────────────────────────┘
```

### Authority Levels

| Level | Roles | Scope | Data Access |
|-------|-------|-------|-------------|
| **1 - Platform** | Admin | All hotels | Full system access |
| **2 - Business** | Owner | Multiple properties | Own company data |
| **3 - Management** | Manager | Assigned properties | Assigned property data |
| **4 - Service** | Receptionist, Chief | Single property | Property operational data |
| **5 - Staff** | Waiter, Housekeeping | Single property | Task-specific data |
| **6 - Customer** | Guest | Own account | Personal bookings/orders |

---

## 👥 Role Definitions

### 1. Platform Administrator (admin)

**Purpose**: Oversee and manage the entire StayHaven platform, ensure quality control, and handle system-wide operations.

#### Responsibilities

- **Hotel Management**:
  - Review and approve new hotel listings
  - Reject low-quality or fraudulent listings
  - Feature high-quality hotels on homepage
  - Monitor hotel performance metrics
  - Handle hotel-related disputes

- **User Management**:
  - View all users across platform
  - Deactivate problematic accounts
  - Resolve user disputes
  - Monitor user activity patterns
  - Handle escalated support tickets

- **Platform Operations**:
  - Monitor system health and performance
  - View platform-wide analytics
  - Manage system configurations
  - Handle data export requests
  - Ensure compliance with policies

- **Content Moderation**:
  - Review user-generated content
  - Remove inappropriate reviews
  - Monitor for spam or abuse
  - Enforce community guidelines

#### Key Characteristics

- **Count**: 2-5 admins per platform
- **Authentication**: Email + password (2FA recommended)
- **Multi-tenancy**: Can access all companies/hotels
- **Dashboard**: Super admin dashboard
- **Notifications**: Critical system alerts

#### Typical Workflow

1. Log in to super admin dashboard
2. Review pending hotel approvals
3. Check platform metrics (new users, bookings, revenue)
4. Monitor flagged content or disputes
5. Respond to escalated support tickets
6. Generate platform-wide reports

---

### 2. Hotel Owner (owner)

**Purpose**: Business owner who lists properties, manages staff, and oversees business operations across one or multiple hotels.

#### Responsibilities

- **Business Setup**:
  - Create company profile (legal name, branding, contact)
  - List hotel properties with details
  - Upload property images and amenities
  - Set pricing ranges and policies
  - Configure check-in/check-out times

- **Staff Management**:
  - Invite managers and staff via email
  - Assign roles (manager, receptionist, chef, waiter)
  - Assign staff to specific properties
  - Set staff permissions
  - Manage staff accounts (activate/deactivate)

- **Property Management**:
  - Manage multiple hotel properties
  - Create and manage room inventory
  - Set room types, pricing, and availability
  - Update hotel information
  - Upload new photos

- **Menu Management**:
  - Create restaurant menu items
  - Set item categories and pricing
  - Mark items as available/unavailable
  - Update menu regularly

- **Analytics and Reporting**:
  - View booking statistics
  - Track revenue across properties
  - Monitor occupancy rates
  - Analyze order volumes
  - Generate financial reports

- **Customer Relations**:
  - Respond to guest reviews
  - Handle booking modifications
  - Manage cancellations
  - View guest feedback

#### Key Characteristics

- **Count**: 1 primary owner per company
- **Company**: Must create company before listing hotels
- **Properties**: Can own multiple hotels
- **Revenue Share**: Receives 90% of platform booking commission
- **Dashboard**: Owner dashboard with multi-property view
- **Notifications**: Bookings, cancellations, staff requests

#### Typical Workflow

1. Log in to owner dashboard
2. Check today's bookings across all properties
3. Review revenue reports
4. Monitor staff performance
5. Respond to guest reviews
6. Update menu or room availability
7. Invite new staff if needed

---

### 3. Hotel Manager (manager)

**Purpose**: Oversee day-to-day hotel operations, manage staff, and ensure smooth service delivery at assigned properties.

#### Responsibilities

- **Operational Management**:
  - Monitor daily operations
  - Oversee check-ins and check-outs
  - Handle guest complaints
  - Ensure service quality standards
  - Coordinate between departments

- **Staff Supervision**:
  - Assign daily tasks to staff
  - Monitor staff performance
  - Handle staff scheduling
  - Approve/reject time-off requests
  - Provide feedback and training

- **Booking Management**:
  - Review incoming bookings
  - Handle special requests
  - Manage room assignments
  - Process early check-ins/late checkouts
  - Handle booking modifications

- **Order Oversight**:
  - Monitor kitchen and waiter operations
  - Track order fulfillment times
  - Identify bottlenecks
  - Set order priorities (mark as high priority)
  - Handle order issues

- **Inventory Management**:
  - Monitor room availability
  - Update room status (maintenance, cleaning)
  - Coordinate with housekeeping
  - Manage menu item availability

- **Reporting**:
  - Generate daily reports for owner
  - Track key performance indicators
  - Monitor guest satisfaction scores
  - Report incidents or issues

#### Key Characteristics

- **Count**: 1-3 managers per property
- **Assignment**: Assigned to specific properties by owner
- **Authority**: Can manage staff at assigned properties only
- **Limitations**: Cannot delete owner, cannot create hotels
- **Dashboard**: Manager dashboard with property-specific view
- **Notifications**: All operational alerts, staff issues

#### Typical Workflow

1. Log in and select active property
2. Review today's arrivals and departures
3. Check pending orders and their status
4. Monitor staff activity
5. Handle any guest complaints or issues
6. Review room status (occupied, cleaning, available)
7. Generate end-of-day report

---

### 4. Receptionist (receptionist)

**Purpose**: Front desk operations, handle guest check-ins/check-outs, manage bookings, and serve as first point of contact for guests.

#### Responsibilities

- **Check-In Process**:
  - Greet arriving guests
  - Verify booking details
  - Collect guest information
  - Assign rooms
  - Provide room keys (physical/digital)
  - Explain hotel amenities and policies
  - Update booking status to "Checked-In"

- **Check-Out Process**:
  - Process guest check-outs
  - Collect feedback
  - Handle final payments (offline)
  - Update room status to "Cleaning"
  - Generate invoices

- **Booking Management**:
  - Create walk-in bookings
  - Modify existing bookings
  - Handle cancellations
  - Process refund requests
  - Manage booking calendar

- **Guest Services**:
  - Answer guest inquiries
  - Handle room change requests
  - Coordinate with housekeeping for urgent cleaning
  - Forward complaints to manager
  - Provide local area information

- **Service Requests**:
  - Receive waiter calls
  - Coordinate service requests
  - Assign tasks to appropriate staff
  - Track request resolution

- **Room Management**:
  - View room availability in real-time
  - Update room status
  - Report maintenance issues
  - Track housekeeping progress

#### Key Characteristics

- **Count**: 2-5 receptionists per property (shift coverage)
- **Work Hours**: Typically 8-hour shifts (day/evening/night)
- **Dashboard**: Reception dashboard
- **Tools**: Booking system, room assignment, guest profiles
- **Notifications**: Guest arrivals, waiter calls, maintenance requests

#### Typical Workflow

1. Log in at start of shift
2. Review today's arrivals and departures
3. Check room availability status
4. Process guest check-ins as they arrive
5. Handle guest inquiries and requests
6. Coordinate with housekeeping for room readiness
7. Process check-outs and update room status
8. Hand over pending tasks to next shift

---

### 5. Chief / Chef (chief)

**Purpose**: Manage kitchen operations, prepare food orders, and ensure timely delivery of quality meals.

#### Responsibilities

- **Order Management**:
  - View incoming orders in real-time
  - Prioritize orders based on timing and priority flag
  - Acknowledge orders (pending → confirmed)
  - Update order status as work progresses
  - Mark orders as ready when complete

- **Kitchen Operations**:
  - Manage kitchen workflow
  - Coordinate with kitchen staff
  - Ensure food quality standards
  - Monitor preparation times
  - Handle special dietary requests

- **Inventory Awareness**:
  - Track ingredient availability
  - Inform manager when items running low
  - Mark menu items as unavailable when out of stock
  - Suggest menu adjustments

- **Quality Control**:
  - Inspect dishes before service
  - Ensure presentation standards
  - Handle customer complaints about food
  - Maintain hygiene standards

- **Communication**:
  - Coordinate with waiters via system
  - Alert manager about delays
  - Provide preparation time estimates
  - Notify when orders are ready for pickup

#### Key Characteristics

- **Count**: 1-2 head chefs per property
- **Work Hours**: Service hours (breakfast, lunch, dinner)
- **Dashboard**: Kitchen dashboard with order queue
- **Real-time**: Receives orders instantly via Socket.io
- **Notifications**: New orders, high-priority orders, ingredient requests

#### Typical Workflow

1. Log in to kitchen dashboard at shift start
2. View pending orders in queue
3. Click "Preparing" when starting an order
4. Cook/prepare the dishes
5. Quality check before service
6. Click "Ready" when order is complete
7. Waiter receives notification to pick up
8. Move to next order in queue

---

### 6. Waiter (waiter)

**Purpose**: Take guest orders, coordinate with kitchen, serve food/beverages, and ensure excellent dining experience.

#### Responsibilities

- **Order Taking**:
  - Approach guests at tables/rooms
  - Take food and beverage orders
  - Enter orders into system with notes
  - Specify order type (room service, dine-in, takeaway)
  - Provide table/room number
  - Send orders to kitchen/bar (KOT/BOT)

- **Order Tracking**:
  - Monitor order status in real-time
  - Receive notifications when orders are ready
  - Pick up completed orders from kitchen
  - Deliver to guest
  - Mark order as "Delivered"

- **Table Management**:
  - Manage assigned tables/rooms
  - Track which tables need attention
  - Clear tables after service
  - Reset for next guests

- **Guest Service**:
  - Respond to waiter calls
  - Handle special requests
  - Refill beverages
  - Provide menu recommendations
  - Collect guest feedback

- **Payment Processing**:
  - Present bills to guests
  - Process payments (offline, current version)
  - Handle tips
  - Generate receipts

- **Communication**:
  - Coordinate with kitchen about orders
  - Inform guests of wait times
  - Alert manager about issues
  - Update order status promptly

#### Key Characteristics

- **Count**: 5-10 waiters per property (based on size)
- **Work Hours**: Shift-based (morning, afternoon, evening)
- **Dashboard**: Waiter dashboard with assigned tables
- **Mobile-Friendly**: Uses responsive web interface
- **Notifications**: Orders ready, waiter calls, urgent requests

#### Typical Workflow

1. Log in to waiter dashboard
2. View assigned tables/rooms
3. Take orders from guests via app
4. Submit orders to kitchen
5. Monitor order status in real-time
6. Receive notification when order is ready
7. Pick up from kitchen
8. Deliver to guest
9. Mark as delivered
10. Respond to any waiter calls

---

### 7. Guest (guest)

**Purpose**: End customer who books hotels, orders services, and consumes hotel amenities.

#### Responsibilities

- **Hotel Booking**:
  - Search for hotels by location
  - Filter by price, rating, amenities
  - View hotel details and photos
  - Select check-in/check-out dates
  - Choose room type
  - Enter guest information
  - Complete booking

- **Order Placement**:
  - Browse menu items
  - Add items to order
  - Specify special instructions
  - Place room service orders
  - Track order status with ETA

- **Service Requests**:
  - Call waiter via one-tap button
  - Request housekeeping
  - Report maintenance issues
  - Request amenities

- **Account Management**:
  - Update profile information
  - Change password
  - Upload profile picture
  - Manage preferences

- **Reviews and Feedback**:
  - Rate hotels after checkout
  - Write reviews
  - Provide feedback on service
  - Report issues

- **Wishlist and Planning**:
  - Add hotels to wishlist
  - Save favorite properties
  - View booking history
  - Manage upcoming reservations

#### Key Characteristics

- **Count**: Unlimited guests on platform
- **Registration**: Required for booking
- **Login**: Email/password or Google OAuth
- **Dashboard**: Guest dashboard with bookings and orders
- **Notifications**: Booking confirmations, order updates

#### Typical Workflow

1. Search for hotels in destination
2. Filter and compare options
3. Select hotel and view details
4. Book room with dates and guest count
5. Receive confirmation email
6. Check in at hotel
7. Order room service via app
8. Track order delivery
9. Use waiter call for assistance
10. Check out and leave review

---

## 📊 Permission Matrix

### Complete Permission Table

| Permission | Admin | Owner | Manager | Receptionist | Chief | Waiter | Guest |
|------------|-------|-------|---------|--------------|-------|--------|-------|
| **Hotel Management** |
| Create hotel | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit hotel | ✅ | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ | ❌ |
| Delete hotel | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all hotels | ✅ | ⚠️ Own only | ⚠️ Assigned | ❌ | ❌ | ❌ | ✅ Public |
| Approve hotels | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature hotels | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Room Management** |
| Create room | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit room | ❌ | ✅ | ✅ | ⚠️ Status only | ❌ | ❌ | ❌ |
| Delete room | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View rooms | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Available |
| Update room status | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Booking Management** |
| Create booking | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| View bookings | ✅ All | ✅ Own hotels | ✅ Assigned | ✅ Assigned | ❌ | ❌ | ✅ Own |
| Edit booking | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ Before checkin |
| Cancel booking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Own |
| Check-in guest | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Check-out guest | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Order Management** |
| Create order | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| View orders | ✅ All | ✅ Own hotels | ✅ Assigned | ⚠️ Limited | ✅ Assigned | ✅ Assigned | ✅ Own |
| Update order status | ❌ | ❌ | ✅ | ❌ | ✅ To Ready | ✅ To Delivered | ❌ |
| Cancel order | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ Pending only |
| Set order priority | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Menu Management** |
| Create menu item | ❌ | ✅ | ✅ | ❌ | ⚠️ Suggest | ❌ | ❌ |
| Edit menu item | ❌ | ✅ | ✅ | ❌ | ⚠️ Availability | ❌ | ❌ |
| Delete menu item | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Toggle availability | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Staff Management** |
| Invite staff | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ❌ | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ | ❌ |
| Deactivate staff | ❌ | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ | ❌ |
| View staff | ✅ All | ✅ Own company | ✅ Assigned | ⚠️ Limited | ❌ | ❌ | ❌ |
| Assign to property | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| View all users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate user | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit user role | ✅ | ⚠️ Own staff | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Company Management** |
| Create company | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit company | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View company | ✅ All | ✅ Own | ⚠️ Basic info | ❌ | ❌ | ❌ | ❌ |
| **Analytics & Reports** |
| Platform analytics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Business analytics | ❌ | ✅ | ✅ Assigned | ⚠️ Limited | ❌ | ❌ | ❌ |
| Revenue reports | ❌ | ✅ | ✅ Assigned | ❌ | ❌ | ❌ | ❌ |
| Operational reports | ❌ | ✅ | ✅ | ✅ Basic | ✅ Kitchen | ✅ Service | ❌ |
| **Service Requests** |
| View waiter calls | ✅ All | ✅ Own hotels | ✅ Assigned | ✅ | ❌ | ✅ | ✅ Own |
| Respond to calls | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Assign to staff | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System Functions** |
| Platform settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Backup/restore | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend**:

- ✅ = Full permission
- ⚠️ = Limited/conditional permission
- ❌ = No permission

---

## 🔐 Detailed Role Specifications

### Admin Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'admin'),
  company: null,  // No company association
  companyRole: null,
  permissions: ['*']  // All permissions
}
```

**API Access**:

- All endpoints with no restrictions
- Special admin routes: `/api/admin/*`
- Can impersonate other users (for support)

**Dashboard Features**:

- Hotel approval queue
- User management panel
- Platform-wide analytics
- System health monitor
- Featured hotels management

**Security**:

- Mandatory 2FA (recommended)
- Session timeout: 30 minutes
- Audit log for all actions
- IP whitelist (recommended)

---

### Owner Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'owner'),
  company: ObjectId(ref: 'Company'),  // Required
  companyRole: 'owner',
  permissions: [
    'manage_hotels',
    'manage_rooms',
    'manage_staff',
    'view_analytics',
    'manage_menu',
    'manage_bookings'
  ]
}
```

**Company Requirement**:

- Must create company before listing hotels
- Company fields: name, legalName, type, contact, address, logo
- One primary owner per company

**Property Management**:

- Can create unlimited hotels under company
- Each hotel requires admin approval
- Full control over approved hotels

**Staff Management**:

- Invite staff with email
- Assign roles: manager, receptionist, chief, waiter
- Assign staff to specific properties
- Cannot modify admin accounts

**Financial Access**:

- View revenue across all properties
- Access booking history
- View commission structure
- Generate financial reports

---

### Manager Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'staff'),
  company: ObjectId(ref: 'Company'),
  companyRole: 'manager',
  assignedProperties: [ObjectId(ref: 'Hotel')],  // Specific hotels
  permissions: [
    'view_bookings',
    'manage_bookings',
    'view_orders',
    'manage_orders',
    'view_staff',
    'assign_tasks',
    'view_analytics'
  ]
}
```

**Property Context**:

- Selects active property on login
- Can switch between assigned properties
- All actions apply to active property only

**Limitations**:

- Cannot create hotels
- Cannot invite owners
- Cannot access unassigned properties
- Cannot view financial data across all properties

**Special Permissions**:

- Set order priority (high/normal)
- Override room assignments
- Modify booking dates
- Resolve guest complaints

---

### Receptionist Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'staff'),
  company: ObjectId(ref: 'Company'),
  companyRole: 'receptionist',
  assignedProperties: [ObjectId(ref: 'Hotel')],  // Usually one
  permissions: [
    'view_bookings',
    'create_booking',
    'checkin_guest',
    'checkout_guest',
    'update_room_status',
    'view_guest_profile'
  ]
}
```

**Booking Access**:

- View today's arrivals and departures
- Create walk-in bookings
- Modify booking details
- Cancel bookings (with reason)

**Room Management**:

- View real-time room availability
- Update room status (occupied, cleaning, available, maintenance)
- Assign rooms to guests
- Generate room keys

**Guest Interaction**:

- Check-in: verify ID, collect info, assign room
- Check-out: process payment, collect feedback
- Handle complaints, forward to manager

**Limitations**:

- Cannot view kitchen orders (unless also waiter)
- Cannot edit menu items
- Cannot invite staff
- Cannot access analytics

---

### Chief (Chef) Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'staff'),
  company: ObjectId(ref: 'Company'),
  companyRole: 'chief',
  assignedProperties: [ObjectId(ref: 'Hotel')],
  permissions: [
    'view_orders',
    'update_order_status',
    'toggle_menu_availability'
  ]
}
```

**Order Access**:

- View orders for assigned property only
- Filter by status (pending, preparing, ready)
- See order details: items, notes, room/table number
- Update status: pending → confirmed → preparing → ready

**Kitchen Operations**:

- Real-time order queue
- Priority indicators (normal/high)
- Preparation time estimates
- Item-level notes and special requests

**Menu Control**:

- Mark items as unavailable (out of stock)
- Cannot change prices or create items
- Can suggest new items to manager

**Real-Time Communication**:

- Receives orders instantly via Socket.io
- Waiter notified when order ready
- Can message manager about issues

**Limitations**:

- Cannot view bookings
- Cannot access guest information
- Cannot see financial data
- Cannot modify menu prices

---

### Waiter Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'staff'),
  company: ObjectId(ref: 'Company'),
  companyRole: 'waiter',
  assignedProperties: [ObjectId(ref: 'Hotel')],
  permissions: [
    'create_order',
    'view_orders',
    'update_order_status_delivered',
    'view_waiter_calls',
    'respond_waiter_calls'
  ]
}
```

**Order Management**:

- Create orders: select items, add notes, specify room/table
- View own orders and assigned table orders
- Update status: ready → delivered
- Cannot cancel orders (must ask manager)

**Table Assignment**:

- Assigned specific tables or rooms
- See which tables need attention
- Track order status per table

**Guest Interaction**:

- Take orders directly from guests
- Provide menu recommendations
- Respond to waiter calls
- Handle special requests

**Real-Time Features**:

- Instant notification when order ready
- Waiter call alerts with room/table number
- Order status updates

**Limitations**:

- Cannot update kitchen status (preparing/ready)
- Cannot set order priority
- Cannot view other waiters' orders (privacy)
- Cannot access bookings or guest data

---

### Guest Role Specification

**Database Schema**:

```javascript
{
  role: ObjectId(ref: 'Role', name: 'guest'),
  company: null,  // No company
  companyRole: null,
  permissions: [
    'search_hotels',
    'create_booking',
    'view_own_bookings',
    'create_order',
    'view_own_orders',
    'create_waiter_call',
    'update_profile'
  ]
}
```

**Public Access**:

- Search and filter hotels (no login required)
- View hotel details (no login required)
- View menu items (no login required)

**Authenticated Actions**:

- Create bookings (login required)
- View booking history
- Place orders (must be checked in)
- Call waiter
- Leave reviews (after checkout)

**Data Visibility**:

- Own bookings only
- Own orders only
- Own profile information
- Public hotel information

**Restrictions**:

- Cannot view other guests' data
- Cannot access staff functions
- Cannot edit hotel information
- Cannot view hotel analytics

---

## 🔧 Permission Implementation

### Backend Implementation

#### 1. Role-Based Middleware

```javascript
// middleware/authMiddleware.js

export const protect = async (req, res, next) => {
  // Verify JWT token
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  
  // Fetch user with role
  req.user = await User.findById(decoded.id)
    .select('-password')
    .populate('role');
  
  next();
};
```

#### 2. Permission Checking

```javascript
// middleware/checkPermission.js

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const userRole = req.user.role?.name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// Usage:
router.post('/hotels', protect, requireRole('owner', 'admin'), createHotel);
```

#### 3. Data Scoping

```javascript
// Scope data to user's company/properties

export const scopeToCompany = async (req, res, next) => {
  if (req.user.role.name === 'admin') {
    // Admin sees all
    req.companyFilter = {};
  } else if (req.user.company) {
    // Scope to user's company
    req.companyFilter = { company: req.user.company };
  }
  next();
};

// Usage in controller:
export const getHotels = async (req, res) => {
  const hotels = await Hotel.find(req.companyFilter);
  res.json({ success: true, hotels });
};
```

### Frontend Implementation

#### 1. Role-Based Navigation

```jsx
// components/Navbar.jsx

const Navbar = () => {
  const { user } = useAuth();
  
  return (
    <nav>
      {user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
      {user.role === 'owner' && <Link to="/owner/dashboard">Dashboard</Link>}
      {user.role === 'waiter' && <Link to="/waiter-dashboard">Orders</Link>}
      {user.role === 'guest' && <Link to="/bookings">My Bookings</Link>}
    </nav>
  );
};
```

#### 2. Protected Routes

```jsx
// routes/ProtectedStaffRoute.jsx

const ProtectedStaffRoute = ({ children, allowedRoles }) => {
  const { staffUser, isAuthenticated } = useStaffAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/staff/login" />;
  }
  
  if (!allowedRoles.includes(staffUser.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Usage:
<Route 
  path="/kitchen-dashboard" 
  element={
    <ProtectedStaffRoute allowedRoles={['chief']}>
      <KitchenDashboard />
    </ProtectedStaffRoute>
  } 
/>
```

#### 3. Conditional Rendering

```jsx
// components/OrderCard.jsx

const OrderCard = ({ order }) => {
  const { staffUser } = useStaffAuth();
  
  return (
    <div>
      <h3>Order #{order.orderNumber}</h3>
      
      {/* Kitchen staff can mark as ready */}
      {staffUser.role === 'chief' && order.status === 'preparing' && (
        <button onClick={() => markAsReady(order._id)}>
          Mark as Ready
        </button>
      )}
      
      {/* Waiters can mark as delivered */}
      {staffUser.role === 'waiter' && order.status === 'ready' && (
        <button onClick={() => markAsDelivered(order._id)}>
          Mark as Delivered
        </button>
      )}
      
      {/* Managers can cancel */}
      {staffUser.role === 'manager' && (
        <button onClick={() => cancelOrder(order._id)}>
          Cancel Order
        </button>
      )}
    </div>
  );
};
```

---

## 📋 Role Assignment Rules

### 1. Initial Role Assignment

**New User Registration**:

- Default role: `guest`
- Cannot self-assign other roles
- Must be invited by owner/manager for staff roles

**Staff Invitation Flow**:

1. Owner/manager sends invite with role
2. Email sent with unique invite token
3. Staff clicks link and completes onboarding
4. Account created with assigned role
5. Cannot change own role after assignment

### 2. Role Changes

**Who Can Change Roles**:

- **Admin**: Can change any role
- **Owner**: Can change staff roles within own company
- **Manager**: Cannot change roles
- **Self**: Cannot change own role

**Restrictions**:

- Cannot promote to owner (must create new company)
- Cannot demote owner (must transfer ownership first)
- Role changes require audit log entry
- User notified of role change

### 3. Multi-Role Scenarios

**Staff with Multiple Roles**:

- Not supported in current version
- Staff member can only have one `companyRole`
- If needed, create separate accounts (not recommended)

**Future Enhancement**:

- Support multiple roles per user
- Dynamic role switching
- Context-based permissions

---

## 🔒 Security Considerations

### 1. Principle of Least Privilege

Each role has **minimum permissions** needed to perform their duties:

- Guests: Only personal data access
- Staff: Only operational data, no financial access
- Managers: Assigned properties only
- Owners: Own company only
- Admins: Full access with audit trail

### 2. Data Isolation

**Multi-Tenancy Enforcement**:

- Company-level data separation
- Property-level access control
- User cannot access other companies' data
- Backend validation on every request

**Implementation**:

```javascript
// Always filter by company
const hotels = await Hotel.find({ company: req.user.company });

// Verify ownership before edit
const hotel = await Hotel.findOne({ _id: hotelId, company: req.user.company });
if (!hotel) throw new Error('Not authorized');
```

### 3. Audit Logging

**Track Critical Actions**:

- Role assignments/changes
- Staff invitations
- Booking cancellations
- Order cancellations
- Data exports
- Permission changes

**Log Format**:

```javascript
{
  action: 'role_change',
  performedBy: userId,
  targetUser: affectedUserId,
  oldRole: 'waiter',
  newRole: 'manager',
  timestamp: Date.now(),
  ipAddress: req.ip
}
```

### 4. Session Management

**Token-Based Authentication**:

- Access token: 1-hour expiry
- Refresh token: 7-day expiry
- Separate tokens for staff vs guests
- Automatic refresh before expiry

**Session Invalidation**:

- On role change
- On account deactivation
- On password change
- On manual logout

### 5. Permission Escalation Prevention

**Checks**:

- Backend validates every action
- Frontend checks are UI convenience only
- Cannot skip permission checks
- Direct API calls are validated

**Example Attack Prevention**:

```javascript
// Attacker tries to approve own hotel by calling admin endpoint
// Even if they modify frontend code:

router.post('/admin/approve-hotel/:id', protect, async (req, res) => {
  // Backend checks role
  if (req.user.role.name !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  // Proceed only if admin
});
```

---

## 🔗 Related Documents

- [Functional Requirements](./functional-requirements.md) - What each role can do
- [Business Rules](./business-rules.md) - Rules governing role actions
- [Authentication Architecture](../02-architecture/authentication-architecture.md) - How authentication works
- [Security Overview](../05-security/security-overview.md) - Security implementation

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete - Comprehensive role and permission documentation
**Reviewed By**: System Architect
**Next Review**: Q2 2026 (when adding new roles)

---

## 📝 Appendix

### Role Creation Checklist

When adding a new role:

- [ ] Update Role schema with new role name
- [ ] Define permissions array
- [ ] Create database seed for role
- [ ] Update permission middleware
- [ ] Add to frontend role checks
- [ ] Create dashboard for role
- [ ] Update this documentation
- [ ] Test all permissions
- [ ] Add to audit logging

### Permission Naming Convention

Format: `{action}_{resource}`

Examples:

- `view_bookings`
- `create_order`
- `update_room_status`
- `delete_menu_item`
- `approve_hotel`

### Testing Role Permissions

```javascript
// Test suite for role permissions
describe('Role Permissions', () => {
  it('should allow owner to create hotel', async () => {
    const token = await loginAs('owner');
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${token}`)
      .send(hotelData);
    expect(res.status).toBe(201);
  });
  
  it('should deny guest from creating hotel', async () => {
    const token = await loginAs('guest');
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${token}`)
      .send(hotelData);
    expect(res.status).toBe(403);
  });
});
```
