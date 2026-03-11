# Business Rules

> Core business logic and constraints that govern the StayHaven platform

---

## 📋 Overview

Business rules define the policies, constraints, and logic that must be enforced throughout the system. These rules are derived from business requirements and domain knowledge.

---

## 🏨 BR-01: Hotel Listing Rules

### BR-01.1: Hotel Creation

- **Rule**: Only users with "owner" role can create hotel listings
- **Constraint**: User must have a valid Company profile before listing hotels
- **Validation**: Hotel name must be unique per owner
- **Default**: New hotels have status "pending" (require admin approval)
- **Image**: Minimum 1 image required, maximum 10 images allowed
- **Location**: City and full address are mandatory

**Business Rationale**: Prevents spam listings and ensures only legitimate businesses can list properties

---

### BR-01.2: Hotel Approval Workflow

- **Rule**: All new hotels require admin approval before going live
- **States**: pending → approved/rejected
- **Visibility**: Pending hotels visible only to owner and admins
- **Approval**: Only platform admins can approve/reject
- **Communication**: Owner notified via email upon approval/rejection
- **Resubmission**: Rejected hotels can be edited and resubmitted

**Business Rationale**: Quality control and prevention of fraudulent listings

---

### BR-01.3: Featured Hotels

- **Rule**: Only admins can feature hotels on homepage
- **Limit**: Maximum 10 featured hotels at a time
- **Criteria**: Hotels must be approved and have rating ≥ 4.0
- **Display**: Featured hotels appear at top of search results
- **Duration**: No time limit, manually managed by admin

**Business Rationale**: Promote high-quality properties and reward excellent service

---

## 👤 BR-02: User Account Rules

### BR-02.1: Registration Requirements

- **Email**: Must be valid and unique across all users
- **Username**: Must be unique, alphanumeric, 3-30 characters
- **Password**: Minimum 8 characters (enforced at validation layer)
- **Verification**: OTP verification required before account activation
- **OTP**: Valid for 10 minutes, 6-digit numeric code
- **Default Role**: New users assigned "guest" role
- **Profile Picture**: Optional, defaults to null

**Business Rationale**: Ensure unique identities and prevent spam accounts

---

### BR-02.2: Google OAuth Users

- **Rule**: Users signing up via Google skip password requirement
- **Flag**: `isGoogleUser = true` in database
- **Profile Picture**: Automatically synced from Google profile
- **Email Verification**: Not required (Google pre-verified)
- **Password Reset**: Google users cannot reset password (use Google auth)

**Business Rationale**: Simplify onboarding while maintaining security

---

### BR-02.3: Account Status

- **States**: invited → pending → active → deactivated
- **Invited**: Staff invited by owner, awaiting onboarding
- **Pending**: Registered but not verified
- **Active**: Verified and can use all features
- **Deactivated**: Account suspended, cannot login

**Business Rationale**: Manage user lifecycle and access control

---

## 🛏️ BR-03: Room Management Rules

### BR-03.1: Room Inventory

- **Rule**: Room numbers must be unique within a hotel
- **Validation**: Cannot have duplicate room numbers per property
- **Status**: available, occupied, maintenance, cleaning
- **Capacity**: Must specify adults and children capacity
- **Pricing**: Room price must be within hotel's price range (min-max)

**Business Rationale**: Prevent booking conflicts and maintain accurate inventory

---

### BR-03.2: Room Availability

- **Rule**: Only "available" rooms can be booked
- **Occupied**: Automatically set when guest checks in
- **Maintenance**: Blocks room from being booked
- **Cleaning**: Short-term status, usually 2-4 hours
- **Transition**: occupied → cleaning → available (after checkout)

**Business Rationale**: Accurate availability prevents overbooking

---

## 📅 BR-04: Booking Rules

### BR-04.1: Booking Validation

- **Check-in Date**: Cannot be in the past
- **Check-out Date**: Must be after check-in date
- **Minimum Stay**: At least 1 night
- **Maximum Stay**: No limit (configurable per hotel)
- **Guest Count**: Adults ≥ 1, Children ≥ 0
- **Room Capacity**: Total guests ≤ room capacity

**Business Rationale**: Logical booking constraints and occupancy limits

---

### BR-04.2: Booking Status Lifecycle

- **Flow**: Pending → Confirmed → Checked-In → Checked-Out
- **Cancellation**: Can cancel at any time before check-in
- **No-Show**: Automatically marked if guest doesn't check-in within 24 hours
- **Confirmation Code**: Auto-generated, unique 8-character alphanumeric
- **Payment**: Tracked separately (unpaid, partial, paid, refunded)

**Business Rationale**: Track booking lifecycle and financial status

---

### BR-04.3: Cancellation Policy

- **Rule**: Cancellation policy defined per hotel
- **Default**: "Free cancellation up to 24 hours before check-in"
- **Enforcement**: Manual (no auto-refund in current version)
- **Record**: Cancellation reason and timestamp stored
- **Email**: Cancellation confirmation sent to guest

**Business Rationale**: Flexible policies per property, transparent communication

---

## 🍽️ BR-05: Order Management Rules

### BR-05.1: Order Number Assignment

- **Rule**: Auto-incrementing order numbers per hotel
- **Starting**: First order is #1001
- **Scope**: Unique per hotel (not global)
- **Reset**: Never resets (continues indefinitely)
- **Counter**: Stored in separate Counter collection

**Business Rationale**: Human-readable order tracking, hotel-specific numbering

---

### BR-05.2: Order Types

- **Room Service**: Must include room number
- **Dine-In**: Must include table number
- **Takeaway**: No room/table required
- **Validation**: Room/table validation based on type
- **Assignment**: Only waiters assigned to that area can take orders

**Business Rationale**: Proper order routing and staff accountability

---

### BR-05.3: Order Status Workflow

- **Flow**: pending → confirmed → preparing → ready → delivered
- **Kitchen**: Can update pending → confirmed → preparing → ready
- **Waiter**: Can update ready → delivered
- **Cancellation**: Any status → cancelled (requires reason)
- **No Skipping**: Must follow sequence (cannot skip preparing)
- **Real-time**: All status changes broadcast via Socket.io

**Business Rationale**: Clear workflow, accountability, real-time visibility

---

### BR-05.4: Order Priority

- **Levels**: normal (default), high
- **High Priority**: VIP guests, urgent requests, delayed orders
- **Display**: High priority orders highlighted in kitchen dashboard
- **Processing**: Kitchen should prioritize high-priority orders
- **Assignment**: Only managers can set high priority

**Business Rationale**: Manage urgent requests and VIP service

---

## 📋 BR-06: Menu Item Rules

### BR-06.1: Menu Availability

- **Rule**: Only available menu items can be ordered
- **Toggle**: Staff can mark items as unavailable (out of stock)
- **Display**: Unavailable items shown but grayed out
- **Validation**: Backend validates availability before order creation
- **Categories**: Breakfast, Lunch, Dinner, Snacks, Drinks, Dessert, Appetizers

**Business Rationale**: Prevent orders for unavailable items, reduce cancellations

---

### BR-06.2: Pricing Rules

- **Rule**: Price must be ≥ 0 (free items allowed)
- **Currency**: Stored in base currency (USD/NPR per hotel)
- **Tax**: Not included in item price (calculated separately if needed)
- **Updates**: Price changes affect future orders only (not past orders)

**Business Rationale**: Flexible pricing, historical accuracy

---

## 👥 BR-07: Staff Management Rules

### BR-07.1: Staff Invitation

- **Rule**: Only owners and managers can invite staff
- **Process**: Invite email → Staff completes onboarding → Account activated
- **Token**: Invite token valid for 7 days
- **Roles**: owner, admin, manager, chief, waiter, receptionist
- **Properties**: Staff can be assigned to specific properties

**Business Rationale**: Controlled onboarding, secure access management

---

### BR-07.2: Role Hierarchy

- **Owner**: Full control, can manage all staff and properties
- **Manager**: Manages assigned properties, cannot delete owner
- **Staff**: Limited to assigned tasks (chef, waiter, receptionist)
- **Permissions**: Stored in `permissions` array per user
- **Property Access**: Staff can only access assigned properties

**Business Rationale**: Clear authority levels, data isolation

---

### BR-07.3: Multi-Property Assignment

- **Rule**: Staff can work at multiple properties (if assigned)
- **Active Property**: Staff selects active property on login
- **Context**: All actions apply to active property only
- **Switching**: Staff can switch between assigned properties
- **Restriction**: Cannot access unassigned properties

**Business Rationale**: Flexibility for hotel chains, security

---

## 🔔 BR-08: Waiter Call Rules

### BR-08.1: Service Request Types

- **Types**: cleaning, maintenance, roomService, emergency, checkout, assistance, other
- **Priority**: low, medium (default), high, urgent
- **Emergency**: Automatically set to urgent priority
- **Assignment**: Can be assigned to specific staff member
- **Status**: open → acknowledged → inProgress → resolved/cancelled

**Business Rationale**: Categorize and prioritize guest requests

---

### BR-08.2: Response Time Targets

- **Urgent**: Respond within 5 minutes
- **High**: Respond within 10 minutes
- **Medium**: Respond within 15 minutes
- **Low**: Respond within 30 minutes
- **Tracking**: acknowledgedAt and resolvedAt timestamps stored
- **Metrics**: Used for staff performance evaluation

**Business Rationale**: Service level commitments, accountability

---

## 🔐 BR-09: Authentication Rules

### BR-09.1: Session Management

- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 7 days
- **Storage**: Access in localStorage, refresh in httpOnly cookie
- **Renewal**: Automatic refresh 5 minutes before expiry
- **Logout**: Both tokens invalidated

**Business Rationale**: Balance security and user convenience

---

### BR-09.2: Password Policy

- **Minimum**: 8 characters
- **Hashing**: bcrypt with 10 salt rounds
- **Reset**: OTP-based password reset (10-minute validity)
- **History**: No password history (can reuse old passwords)
- **Complexity**: No special character requirement (current version)

**Business Rationale**: Basic security, user-friendly

---

### BR-09.3: OTP Rules

- **Length**: 6 digits (numeric)
- **Validity**: 10 minutes from generation
- **Delivery**: Email only (no SMS in current version)
- **Uses**: Signup verification, password reset
- **Attempts**: No limit on OTP requests (rate limiting recommended)
- **Format**: Stored as plain text (hashed in production recommended)

**Business Rationale**: Email-based verification, cost-effective

---

## 💰 BR-10: Pricing and Commission Rules

### BR-10.1: Booking Commission

- **Platform Fee**: 10% of booking value
- **Applies To**: Only platform-sourced bookings
- **Direct Bookings**: 0% commission
- **Calculation**: Based on total booking amount
- **Payment**: Handled offline (no payment gateway in current version)

**Business Rationale**: Competitive commission rate, encourage direct bookings

---

### BR-10.2: Subscription Tiers

- **Basic**: $99/month (single property, up to 10 rooms)
- **Professional**: $199/month (single property, up to 50 rooms)
- **Enterprise**: $499/month (multiple properties, unlimited rooms)
- **Trial**: 30 days free (optional)
- **Billing**: Monthly (no annual plans currently)

**Business Rationale**: Tiered pricing based on scale and features

---

## 🏢 BR-11: Company and Multi-Tenancy Rules

### BR-11.1: Company Creation

- **Rule**: One company per owner (primary ownership)
- **Required**: Owner must create company before listing hotels
- **Information**: Legal name, type, contact, address, branding
- **Properties**: Company can own multiple hotels
- **Data Isolation**: Each company's data is isolated

**Business Rationale**: Organizational structure, brand management

---

### BR-11.2: Data Isolation

- **Rule**: Users can only access data for their company/properties
- **Hotel Data**: Filtered by company ID
- **Bookings**: Scoped to company properties
- **Orders**: Scoped to hotel (and thus company)
- **Staff**: Can only see their company's properties
- **Exception**: Platform admins see all data

**Business Rationale**: Security, privacy, compliance

---

## 🔔 BR-12: Notification Rules

### BR-12.1: Real-Time Notifications

- **Delivery**: Socket.io for in-app notifications
- **Types**: New order, status change, waiter call, booking confirmation
- **Targeting**: Role-based (kitchen, waiters, reception)
- **Persistence**: Stored in Notification collection
- **Read Status**: Tracked per user

**Business Rationale**: Instant communication, operational efficiency

---

### BR-12.2: Email Notifications

- **Events**: Registration, booking confirmation, cancellation, staff invitation, password reset
- **Provider**: Nodemailer
- **Timing**: Sent within 1 minute of event
- **Retry**: No automatic retry (manual resend if needed)
- **Template**: Plain text (HTML templates recommended for production)

**Business Rationale**: Reliable communication, record keeping

---

## ⚖️ BR-13: Data Retention and Cleanup

### BR-13.1: Soft Delete

- **Rule**: No hard deletes for critical data
- **Approach**: Mark as deleted/inactive with timestamp
- **Applies To**: Users, hotels, bookings, orders
- **Exceptions**: Menu items, notifications can be hard deleted
- **Recovery**: Admins can reactivate soft-deleted records

**Business Rationale**: Data recovery, audit trail, compliance

---

### BR-13.2: Historical Data

- **Orders**: Kept indefinitely for analytics
- **Bookings**: Kept for 5 years (recommended)
- **Notifications**: Purged after 30 days (recommended)
- **Logs**: Kept based on retention policy (not implemented yet)

**Business Rationale**: Analytics, compliance, performance

---

## 🔒 BR-14: Security Rules

### BR-14.1: Role-Based Access Control (RBAC)

- **Rule**: All actions validated against user role
- **Implementation**: Middleware checks on protected routes
- **Roles**: admin, owner, manager, chief, waiter, receptionist, guest
- **Permissions**: Granular permissions per role (stored in permissions array)
- **Enforcement**: Backend only (frontend checks are UI convenience)

**Business Rationale**: Principle of least privilege, security

---

### BR-14.2: API Rate Limiting

- **Rule**: Not implemented yet (high priority recommendation)
- **Suggested**: 100 requests per 15 minutes per IP
- **Stricter**: 5 login attempts per hour per IP
- **OTP**: 3 OTP requests per hour per email

**Business Rationale**: Prevent abuse, DoS protection

---

## 📊 BR-15: Reporting and Analytics Rules

### BR-15.1: Dashboard Metrics

- **Owner Dashboard**: Total bookings, revenue, occupancy rate, staff performance
- **Manager Dashboard**: Today's bookings, room status, pending orders
- **Real-time**: Order counts, active waiter calls
- **Historical**: Last 30 days by default

**Business Rationale**: Data-driven decisions, operational visibility

---

### BR-15.2: Data Aggregation

- **Calculation**: On-demand (no pre-aggregation currently)
- **Performance**: Indexed queries for fast aggregation
- **Caching**: Not implemented (recommended for scale)
- **Export**: Not available (future enhancement)

**Business Rationale**: Real-time accuracy, simplicity

---

## 🔗 Related Documents

- [Functional Requirements](./functional-requirements.md) - What the system must do
- [User Roles and Permissions](./user-roles-and-permissions.md) - Detailed role capabilities
- [Non-Functional Requirements](./non-functional-requirements.md) - Performance and quality requirements

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
