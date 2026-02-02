# Functional Requirements

> Detailed functional requirements for the StayHaven platform

---

## 📋 Overview

This document outlines all functional requirements organized by module. Each requirement includes:

- **ID**: Unique identifier
- **Priority**: Must/Should/Nice
- **Description**: What the system must do
- **Acceptance Criteria**: How to verify it works

---

## 🏨 FR-01: Hotel Listing & Search

### FR-01.1: Create Hotel Listing (MUST)

**Priority**: 🔴 MUST
**User Story**: As a hotel owner, I want to list my property so guests can find and book it

**Requirements**:

- Owner can create hotel with name, description, location, category, star rating
- Must upload at least 1 image (max 10 images)
- Can add amenities (WiFi, Pool, Parking, etc.)
- Can set price range (min-max)
- Can define policies (check-in time, check-out time, cancellation policy)
- Status defaults to "pending" (awaits admin approval)

**Acceptance Criteria**:

- ✅ Form validates all required fields
- ✅ Images upload to Cloudinary successfully
- ✅ Hotel appears in owner's property list
- ✅ Admin sees hotel in approval queue

---

### FR-01.2: Search Hotels (MUST)

**Priority**: 🔴 MUST
**User Story**: As a guest, I want to search for hotels by location and filters

**Requirements**:

- Search by city name
- Filter by: price range, star rating, amenities, category
- Sort by: rating, price (low-high, high-low), name
- Display results with images, name, location, price range, rating
- Pagination (12 hotels per page)

**Acceptance Criteria**:

- ✅ Search returns relevant results within 2 seconds
- ✅ Filters work individually and in combination
- ✅ Results update without full page reload
- ✅ Empty state shown when no results

---

### FR-01.3: View Hotel Details (MUST)

**Priority**: 🔴 MUST
**User Story**: As a guest, I want to see detailed hotel information before booking

**Requirements**:

- Display all hotel information (description, amenities, policies, location)
- Show image gallery with lightbox view
- Display available rooms with prices
- Show average rating and review count
- Display contact information
- Show map with hotel location (if coordinates provided)

**Acceptance Criteria**:

- ✅ All information loads correctly
- ✅ Images are responsive and optimized
- ✅ Can navigate between images
- ✅ Room availability reflects real-time status

---

## 🔐 FR-02: Authentication & User Management

### FR-02.1: User Registration (MUST)

**Priority**: 🔴 MUST
**User Story**: As a guest, I want to create an account to book hotels

**Requirements**:

- Register with: fullname, username, email, password
- OTP verification required via email
- Password must meet security requirements (min 8 chars)
- Username must be unique
- Email must be valid and unique
- Default role: "guest"

**Acceptance Criteria**:

- ✅ OTP sent to email within 30 seconds
- ✅ OTP valid for 10 minutes
- ✅ Account created only after OTP verification
- ✅ Password hashed using bcrypt (10 rounds)
- ✅ Duplicate email/username shows clear error

---

### FR-02.2: User Login (MUST)

**Priority**: 🔴 MUST
**User Story**: As a user, I want to log in to access my account

**Requirements**:

- Login with email and password
- Generate access token (1-hour expiry)
- Generate refresh token (7-day expiry, httpOnly cookie)
- Return user profile info (id, username, email, role, profile picture)
- Failed login shows generic error (don't reveal if email exists)

**Acceptance Criteria**:

- ✅ Correct credentials return tokens and user data
- ✅ Incorrect credentials show error
- ✅ Tokens stored correctly (access in localStorage, refresh in cookie)
- ✅ Brute force protection (optional: rate limiting)

---

### FR-02.3: Google OAuth Login (MUST)

**Priority**: 🔴 MUST
**User Story**: As a user, I want to log in with Google for convenience

**Requirements**:

- "Sign in with Google" button on login page
- Verify Google credential with Google OAuth 2.0
- If user exists: log them in
- If user doesn't exist: show registration confirmation
- After confirmation: create account with Google info (name, email, picture)
- Mark as isGoogleUser = true
- No password required for Google users

**Acceptance Criteria**:

- ✅ Google popup opens and authenticates
- ✅ Profile picture synced from Google
- ✅ Existing users can log in instantly
- ✅ New users complete registration with one click

---

## 📅 FR-03: Booking Management

### FR-03.1: Create Booking (MUST)

**Priority**: 🔴 MUST
**User Story**: As a guest, I want to book a hotel room

**Requirements**:

- Select check-in and check-out dates
- Select number of adults and children
- Choose room type
- Enter special requests (optional)
- Calculate total amount based on dates and room price
- Generate unique confirmation code
- Send confirmation email

**Acceptance Criteria**:

- ✅ Cannot book past dates
- ✅ Check-out must be after check-in
- ✅ Room availability validated
- ✅ Total calculated correctly
- ✅ Booking appears in user's booking history
- ✅ Confirmation email received within 1 minute

---

## 🍽️ FR-04: Order Management

### FR-04.1: Create Order (MUST)

**Priority**: 🔴 MUST
**User Story**: As a guest/waiter, I want to place an order for food/beverages

**Requirements**:

- Select menu items with quantities
- Add notes per item (e.g., "No onions")
- Select order type (room service/dine-in/takeaway)
- If room service: must provide room number
- If dine-in: must provide table number
- Auto-increment order number (starts at 1001 per hotel)
- Calculate total price
- Send KOT/BOT to kitchen/bar via Socket.io

**Acceptance Criteria**:

- ✅ Order number unique per hotel
- ✅ Kitchen dashboard shows order instantly
- ✅ Order includes all item details and notes
- ✅ Total calculated correctly
- ✅ Cannot order unavailable menu items

---

### FR-04.2: Update Order Status (MUST)

**Priority**: 🔴 MUST
**User Story**: As a kitchen staff/waiter, I want to update order status

**Requirements**:

- Kitchen can update: pending → preparing → ready
- Waiter can update: ready → delivered
- Any staff can update: any → cancelled
- Status change broadcasts to relevant users via Socket.io
- Timestamp each status change

**Acceptance Criteria**:

- ✅ Status updates in real-time on all dashboards
- ✅ Cannot skip status steps (must go in order)
- ✅ Notifications sent to relevant roles
- ✅ Status history tracked

---

## 👥 FR-05: Staff Management

### FR-05.1: Invite Staff (MUST)

**Priority**: 🔴 MUST
**User Story**: As an owner/manager, I want to invite staff members

**Requirements**:

- Enter staff email, role, assigned property
- Generate unique invite token (valid 7 days)
- Send invitation email with onboarding link
- Staff completes profile (password, contact info)
- Account activated after onboarding

**Acceptance Criteria**:

- ✅ Invitation email sent within 1 minute
- ✅ Invite link valid for 7 days only
- ✅ Expired links show error
- ✅ Staff can complete onboarding successfully
- ✅ Staff appears in owner's team list

---

## 🔗 Related Documents

- [Non-Functional Requirements](./non-functional-requirements.md)
- [Use Case Diagrams](./use-case-diagrams.md)
- [Business Rules](./business-rules.md)

---

## 📅 Document Info

**Created**: February 2, 2026
**Status**: 🟡 In Progress - Complete as needed
