# Use Case Descriptions

> Detailed textual descriptions of all major use cases in the StayHaven platform, including preconditions, main flows, alternative flows, and postconditions

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Guest Use Cases](#guest-use-cases)
3. [Hotel Owner Use Cases](#hotel-owner-use-cases)
4. [Hotel Manager Use Cases](#hotel-manager-use-cases)
5. [Receptionist Use Cases](#receptionist-use-cases)
6. [Chef Use Cases](#chef-use-cases)
7. [Waiter Use Cases](#waiter-use-cases)
8. [Platform Administrator Use Cases](#platform-administrator-use-cases)
9. [Integration Use Cases](#integration-use-cases)

---

## 📖 Introduction

### Document Purpose

This document provides detailed descriptions of all use cases in the StayHaven platform. Each use case includes:

- **Actors**: Who interacts with the system
- **Preconditions**: What must be true before the use case starts
- **Basic Flow**: Step-by-step main scenario
- **Alternative Flows**: Exception handling and variations
- **Postconditions**: System state after completion
- **Business Rules**: Constraints and validations
- **Technical Notes**: Implementation details

### Use Case Template

```
USE CASE: <Name>
ID: UC-<Number>
Actor: <Primary Actor>
Type: <Primary/Secondary/Extension>
Priority: <High/Medium/Low>

Description: Brief overview

Preconditions:
- Condition 1
- Condition 2

Basic Flow:
1. Step 1
2. Step 2
...

Alternative Flows:
A1. Alternative scenario 1
A2. Alternative scenario 2

Postconditions:
- Result 1
- Result 2

Business Rules:
- Rule 1
- Rule 2

Technical Notes:
- Note 1
- Note 2
```

---

## 👥 Guest Use Cases

### UC-G01: Search and Filter Hotels

**ID**: UC-G01  
**Actor**: Guest (Unauthenticated/Authenticated)  
**Type**: Primary  
**Priority**: High  

**Description**: Guest searches for hotels based on location and filters results by various criteria.

**Preconditions**:

- User has internet access
- Platform is accessible

**Basic Flow**:

1. Guest navigates to homepage
2. Guest enters destination in search box
3. Guest selects check-in and check-out dates (optional)
4. Guest clicks "Search" button
5. System displays list of hotels in that location
6. Guest applies filters:
   - Price range (min-max)
   - Star rating (1-5 stars)
   - Amenities (pool, WiFi, parking, gym, etc.)
   - Room type (single, double, suite)
   - Guest rating (4+ stars, 3+ stars)
7. System dynamically updates results based on filters
8. Guest views filtered hotel list with:
   - Hotel name and image
   - Star rating
   - Starting price
   - Guest reviews count
   - Distance from city center
   - Key amenities icons
9. Guest can sort by:
   - Price (low to high, high to low)
   - Rating (highest first)
   - Distance
   - Popularity

**Alternative Flows**:

**A1. No Hotels Found**:

- 5a. System finds no hotels matching criteria
- 5b. System displays "No hotels found" message
- 5c. System suggests:
  - Broadening search criteria
  - Nearby cities
  - Changing dates
- 5d. Use case ends

**A2. Location Autocomplete**:

- 2a. As guest types, system suggests locations
- 2b. Guest selects from dropdown
- 2c. Continue to step 3

**A3. Map View**:

- 9a. Guest clicks "Map View" toggle
- 9b. System displays hotels on interactive map
- 9c. Guest can zoom and pan
- 9d. Clicking marker shows hotel card
- 9e. Continue use case

**Postconditions**:

- Guest sees relevant hotel options
- Filters are applied and visible
- Search state is preserved for session

**Business Rules**:

- BR-G01.1: Minimum 1 character required for search
- BR-G01.2: Date range cannot exceed 30 days
- BR-G01.3: Check-in date must be today or future
- BR-G01.4: Check-out must be after check-in
- BR-G01.5: Only approved hotels are shown
- BR-G01.6: Hotel price shown is starting price (cheapest available room)

**Technical Notes**:

- Search uses text index on Hotel.location fields
- Filters use MongoDB aggregation pipeline
- Results are paginated (20 per page)
- Images loaded lazy for performance
- Caching: Search results cached for 5 minutes

**API Endpoint**: `GET /api/hotels/search`

**Database Query**:

```javascript
Hotel.find({
  'location.city': new RegExp(destination, 'i'),
  status: 'approved',
  'priceRange.min': { $lte: maxPrice },
  'priceRange.max': { $gte: minPrice },
  starRating: { $gte: minRating }
})
.populate('owner', 'username email')
.select('name images location priceRange starRating amenities reviews')
```

---

### UC-G02: View Hotel Details

**ID**: UC-G02  
**Actor**: Guest  
**Type**: Primary  
**Priority**: High  

**Description**: Guest views comprehensive information about a specific hotel before booking.

**Preconditions**:

- Hotel exists and is approved
- Guest is on search results or homepage

**Basic Flow**:

1. Guest clicks on hotel card from search results
2. System navigates to hotel detail page
3. System loads and displays:
   - **Header Section**:
     - Hotel name and star rating
     - Location with map marker
     - Photo gallery (main image + thumbnails)
     - Average guest rating and review count
   - **Description Section**:
     - Full hotel description
     - Property type (resort, hotel, hostel)
     - Check-in/check-out times
   - **Amenities Section**:
     - All available amenities with icons
     - Categorized: Room, Property, Services
   - **Room Types Section**:
     - Available room types
     - Room details (size, bed type, capacity)
     - Room price
     - Amenities specific to room
     - "Book Now" button per room
   - **Policies Section**:
     - Cancellation policy
     - Payment methods accepted
     - House rules
     - Child policy
     - Pet policy
   - **Reviews Section**:
     - Overall rating breakdown
     - Recent guest reviews
     - Filter reviews by rating
     - Pagination for reviews
   - **Location Section**:
     - Full address
     - Interactive map
     - Nearby attractions
     - Distance from landmarks
   - **Restaurant Menu** (if available):
     - Menu categories
     - Items with prices
     - Photos of dishes
4. Guest can interact with:
   - Photo gallery (full-screen view, navigation)
   - Map (zoom, directions)
   - Add to wishlist button
   - Share hotel button
   - "Book Now" button

**Alternative Flows**:

**A1. Hotel Not Found**:

- 2a. Hotel ID is invalid or hotel deleted
- 2b. System redirects to 404 page
- 2c. System suggests returning to search
- 2d. Use case ends

**A2. Hotel Pending Approval**:

- 2a. Hotel status is 'pending'
- 2b. System shows "Hotel under review" if user is owner
- 2c. System shows 404 if user is guest
- 2d. Use case ends

**A3. No Rooms Available**:

- 3a. Hotel has no active rooms
- 3b. System displays hotel info
- 3c. "Book Now" button disabled
- 3d. Message: "No rooms available currently"

**A4. Add to Wishlist**:

- 4a. Guest clicks "Add to Wishlist" (heart icon)
- 4b. If not authenticated:
  - System prompts login/register
  - After login, continue
- 4c. System adds hotel to user's wishlist
- 4d. Icon changes to filled heart
- 4e. Toast notification: "Added to wishlist"

**Postconditions**:

- Guest has comprehensive hotel information
- Guest can proceed to booking
- View count incremented for hotel
- User session tracks viewed hotels

**Business Rules**:

- BR-G02.1: Only approved hotels visible to guests
- BR-G02.2: Prices shown are per night
- BR-G02.3: Availability reflects current bookings
- BR-G02.4: Reviews only from checked-out guests
- BR-G02.5: Map shows accurate location
- BR-G02.6: Images optimized for web (max 1MB)

**Technical Notes**:

- Page uses SSR (Server-Side Rendering) for SEO
- Images served via Cloudinary CDN
- Lazy loading for reviews and menu
- Schema markup for search engines
- Analytics: Track view duration and interactions

**API Endpoints**:

- `GET /api/hotels/:id` - Hotel details
- `GET /api/hotels/:id/rooms` - Available rooms
- `GET /api/hotels/:id/reviews` - Guest reviews
- `GET /api/hotels/:id/menu` - Restaurant menu

**Real-Time Features**:

- Live room availability updates
- Real-time booking notifications (for testing)

---

### UC-G03: Book Hotel Room

**ID**: UC-G03  
**Actor**: Guest (Authenticated)  
**Type**: Primary  
**Priority**: High  

**Description**: Authenticated guest makes a room reservation at a hotel.

**Preconditions**:

- Guest is authenticated
- Hotel exists and is approved
- Room type is available for selected dates
- Guest has viewed hotel details

**Basic Flow**:

1. Guest is on hotel detail page
2. Guest selects room type
3. Guest clicks "Book Now" button
4. System shows booking form with:
   - Pre-filled dates (from search) or date picker
   - Number of guests (adults, children)
   - Number of rooms
   - Special requests text area
5. Guest fills/modifies booking details:
   - Check-in date (date picker)
   - Check-out date (date picker)
   - Number of adults (dropdown: 1-10)
   - Number of children (dropdown: 0-5)
   - Number of rooms (dropdown: 1-5)
   - Special requests (optional text)
6. System calculates and displays:
   - Number of nights
   - Price per night
   - Total price (nights × rooms × price)
   - Taxes and fees breakdown
   - Grand total
7. Guest enters contact information:
   - Full name (primary guest)
   - Phone number
   - Email (pre-filled if available)
   - Additional guest names (if multiple rooms)
8. Guest reviews booking summary
9. Guest agrees to cancellation policy (checkbox)
10. Guest clicks "Confirm Booking" button
11. System validates:
    - All required fields filled
    - Dates are valid (check-in < check-out)
    - Room availability for dates
    - Guest count within room capacity
12. System creates booking:
    - Generates unique booking number
    - Status: "confirmed" (offline payment)
    - Saves to database
13. System sends confirmation email:
    - Booking number
    - Hotel details
    - Check-in/check-out dates
    - Total amount
    - Contact information
    - Cancellation policy
14. System displays success page:
    - Booking confirmation number
    - Summary of booking
    - "View Booking" button
    - "Download Confirmation" button

**Alternative Flows**:

**A1. Room No Longer Available**:

- 11a. Room is booked by another guest before confirmation
- 11b. System shows error: "Room no longer available"
- 11c. System suggests:
  - Different dates
  - Different room type
  - Similar hotels
- 11d. Use case ends or guest selects alternative

**A2. Invalid Date Range**:

- 11a. Check-out date before check-in
- 11b. System shows error: "Invalid date range"
- 11c. Guest corrects dates
- 11d. Return to step 11

**A3. Exceeds Room Capacity**:

- 11a. Guest count exceeds room's maximum occupancy
- 11b. System shows error: "Too many guests for this room"
- 11c. System suggests:
  - Booking multiple rooms
  - Selecting larger room type
- 11d. Guest adjusts booking
- 11e. Return to step 11

**A4. Guest Not Authenticated**:

- 3a. Guest clicks "Book Now" without login
- 3b. System shows login/register modal
- 3c. Guest logs in or registers
- 3d. System redirects back to booking form
- 3e. Continue to step 4

**A5. Booking During Blackout Period**:

- 11a. Selected dates fall in hotel's blackout period
- 11b. System shows error: "Hotel not accepting bookings for these dates"
- 11c. System shows alternative dates
- 11d. Guest selects new dates
- 11e. Return to step 11

**A6. Modify Booking Before Submission**:

- 8a. Guest clicks "Edit" on any section
- 8b. System allows modification
- 8c. Guest updates details
- 8d. System recalculates total
- 8e. Return to step 8

**Postconditions**:

- Booking record created in database
- Room availability updated
- Confirmation email sent
- Guest can view booking in "My Bookings"
- Hotel owner/staff notified of new booking
- Booking appears in reception dashboard

**Business Rules**:

- BR-G03.1: Minimum stay: 1 night
- BR-G03.2: Maximum stay: 30 nights
- BR-G03.3: Maximum advance booking: 365 days
- BR-G03.4: Children under 5 free (don't count toward capacity)
- BR-G03.5: Check-in time: After 2 PM (default)
- BR-G03.6: Check-out time: Before 11 AM (default)
- BR-G03.7: Booking number format: BK-YYYYMMDD-XXXX
- BR-G03.8: Payment: Offline (current version)
- BR-G03.9: Confirmation email sent within 2 minutes

**Technical Notes**:

- Booking uses transaction for atomicity
- Room availability checked with lock
- Email sent asynchronously (queue recommended)
- Booking number generated server-side
- Date validation: Check-in >= today, Check-out > Check-in
- Real-time notification to hotel via Socket.io

**API Endpoint**: `POST /api/bookings`

**Request Payload**:

```javascript
{
  hotelId: ObjectId,
  roomId: ObjectId,
  checkIn: Date,
  checkOut: Date,
  guests: {
    adults: Number,
    children: Number
  },
  numberOfRooms: Number,
  guestInfo: {
    name: String,
    phone: String,
    email: String,
    additionalGuests: [String]
  },
  specialRequests: String,
  totalPrice: Number,
  agreedToPolicy: Boolean
}
```

**Database Operations**:

1. Check room availability
2. Create Booking document
3. Update Room availability array
4. Create Notification document
5. Trigger email service

**Socket.io Event**: `newBooking` emitted to `hotel-<hotelId>` room

---

### UC-G04: Place Room Service Order

**ID**: UC-G04  
**Actor**: Guest (Checked-in)  
**Type**: Primary  
**Priority**: High  

**Description**: Guest orders food and beverages from hotel restaurant to their room.

**Preconditions**:

- Guest is authenticated
- Guest has active booking with check-in status "checked-in"
- Hotel has menu items available
- Guest is within hotel premises

**Basic Flow**:

1. Guest navigates to "Order Food" from dashboard or hotel detail page
2. System verifies guest has active booking
3. System loads hotel's menu:
   - Categories (Breakfast, Lunch, Dinner, Beverages, Snacks)
   - Items with photos, descriptions, prices
   - Dietary tags (vegetarian, vegan, gluten-free)
   - Spiciness level
   - Availability status
4. Guest browses menu
5. Guest selects item
6. System shows item detail modal:
   - Full description
   - Ingredients
   - Nutritional information (if available)
   - Customization options (spice level, extras)
   - Quantity selector
7. Guest sets quantity and customizations
8. Guest clicks "Add to Cart"
9. Item added to cart with notification
10. Guest continues browsing or proceeds to checkout
11. Guest clicks "View Cart" or "Checkout"
12. System shows cart summary:
    - Items list with quantities
    - Individual prices
    - Customizations
    - Subtotal
    - Taxes
    - Delivery charge (if applicable)
    - Grand total
13. Guest can:
    - Modify quantities
    - Remove items
    - Add special instructions
14. Guest enters delivery details:
    - Room number (pre-filled from booking)
    - Delivery time (ASAP or scheduled)
    - Special instructions (allergies, preferences)
15. Guest reviews order
16. Guest clicks "Place Order"
17. System validates:
    - Cart not empty
    - All items still available
    - Room number valid
    - Guest is checked-in
18. System creates order:
    - Generates order number (ORD-001, ORD-002, etc.)
    - Status: "pending"
    - Type: "roomService"
    - Timestamp
19. System generates KOT (Kitchen Order Token):
    - Order number
    - Items list
    - Room number
    - Special instructions
    - Timestamp
20. System sends KOT to kitchen dashboard via WebSocket
21. System displays success screen:
    - Order number
    - Estimated delivery time (20-30 minutes)
    - "Track Order" button
22. Guest receives real-time updates:
    - Order confirmed by kitchen
    - Order being prepared
    - Order ready
    - Order on the way
    - Order delivered

**Alternative Flows**:

**A1. Guest Not Checked-In**:

- 2a. System finds no active "checked-in" booking
- 2b. System shows message: "Please check-in first to order"
- 2c. System provides "View Bookings" link
- 2d. Use case ends

**A2. Menu Item Unavailable**:

- 5a. Guest tries to add unavailable item
- 5b. System shows "Item currently unavailable"
- 5c. System suggests similar items
- 5d. Guest selects alternative or continues browsing

**A3. Item Unavailable During Checkout**:

- 17a. Item becomes unavailable after adding to cart
- 17b. System shows error: "Some items are no longer available"
- 17c. System highlights unavailable items
- 17d. Guest removes unavailable items
- 17e. Return to step 16

**A4. Empty Cart**:

- 16a. Guest proceeds with empty cart
- 16b. System shows error: "Cart is empty"
- 16c. System suggests browsing menu
- 16d. Return to step 4

**A5. Modify Order Before Placement**:

- 15a. Guest clicks "Edit" on any item
- 15b. System reopens cart
- 15c. Guest makes changes
- 15d. System recalculates total
- 15e. Return to step 13

**A6. Cancel Order Before Placement**:

- Any step before 16: Guest can close or navigate away
- Cart is saved for session
- Guest can return to complete order

**A7. Scheduled Delivery**:

- 14a. Guest selects "Schedule for later"
- 14b. System shows time picker (future times only)
- 14c. Guest selects desired time
- 14d. System validates time is within service hours
- 14e. Continue to step 15

**Postconditions**:

- Order created in database
- KOT sent to kitchen
- Guest can track order status
- Chef sees order in queue
- Waiter will be notified when ready
- Order status tracked in real-time

**Business Rules**:

- BR-G04.1: Minimum order: No minimum
- BR-G04.2: Maximum order: 20 items
- BR-G04.3: Delivery time: 20-45 minutes (depends on order complexity)
- BR-G04.4: Service hours: 6 AM - 11 PM (configurable per hotel)
- BR-G04.5: Delivery charge: Free for hotel guests
- BR-G04.6: Order number format: ORD-XXX (auto-increment per hotel)
- BR-G04.7: Only checked-in guests can order
- BR-G04.8: Payment: Billed to room (current version)
- BR-G04.9: Order can be modified until chef confirms

**Technical Notes**:

- Real-time communication via Socket.io
- KOT sent to room: `hotel-<hotelId>-kitchen`
- Order status broadcast to: `order-<orderId>`
- Auto-increment order number per hotel
- Images lazy loaded
- Cart stored in localStorage (backup)
- ETA calculated based on historical data

**API Endpoints**:

- `GET /api/hotels/:hotelId/menu` - Fetch menu
- `POST /api/orders` - Create order
- `GET /api/orders/:orderId` - Track order
- `PATCH /api/orders/:orderId/status` - Update status (staff only)

**Request Payload**:

```javascript
{
  hotelId: ObjectId,
  roomId: ObjectId,
  roomNumber: String,
  orderType: "roomService",
  items: [
    {
      menuItem: ObjectId,
      name: String,
      price: Number,
      quantity: Number,
      customizations: {
        spiceLevel: String,
        extras: [String]
      },
      notes: String
    }
  ],
  notes: String,
  scheduledFor: Date, // optional
  customerId: ObjectId,
  customerName: String,
  customerPhone: String
}
```

**Socket.io Events**:

- `newOrder` → `hotel-<hotelId>-kitchen` (Chef receives)
- `orderStatus` → `order-<orderId>` (Guest receives updates)
- `orderConfirmed` → `hotel-<hotelId>-waiters` (Waiter notified when ready)

**Database Schema**:

```javascript
Order {
  orderNumber: String, // Auto-increment: ORD-001
  hotel: ObjectId,
  room: ObjectId,
  roomNumber: String,
  orderType: "roomService",
  items: [{
    menuItem: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    customizations: Mixed
  }],
  totalPrice: Number,
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered",
  priority: "normal" | "high",
  notes: String,
  customer: ObjectId,
  customerName: String,
  createdAt: Date,
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: ObjectId
  }]
}
```

---

### UC-G05: Call Waiter

**ID**: UC-G05  
**Actor**: Guest (Checked-in)  
**Type**: Primary  
**Priority**: Medium  

**Description**: Guest requests waiter assistance to their room or table using one-tap button.

**Preconditions**:

- Guest is authenticated
- Guest is checked-in at hotel
- Hotel has waiter service enabled

**Basic Flow**:

1. Guest is in hotel dashboard or order tracking page
2. Guest sees "Call Waiter" button (bell icon)
3. Guest clicks "Call Waiter" button
4. System shows confirmation modal:
   - "Call waiter to Room XXX?"
   - Request type dropdown (optional):
     - General assistance
     - Housekeeping request
     - Food service
     - Check-out assistance
     - Other
   - Additional notes text area
5. Guest selects request type (optional)
6. Guest adds notes (optional)
7. Guest clicks "Confirm" button
8. System validates:
   - Guest is checked-in
   - Room number exists
   - Waiter service available
9. System creates waiter call:
   - Room number
   - Request type
   - Notes
   - Timestamp
   - Status: "pending"
10. System broadcasts call via WebSocket to:
    - All waiters in hotel
    - Reception desk
    - Manager dashboard
11. System shows confirmation to guest:
    - "Waiter called"
    - Estimated response time: "2-5 minutes"
    - Call status: "Pending"
12. System displays active call card:
    - Room number
    - Request type
    - Time elapsed
    - Status
    - "Cancel" button
13. Waiter receives notification:
    - Push notification (if mobile)
    - Sound alert
    - Visual badge on dashboard
14. Waiter acknowledges call:
    - Clicks "Accept" button
    - Status changes to "accepted"
    - ETA shown to guest
15. Guest receives update:
    - "Waiter is on the way"
    - Waiter name (if available)
    - Estimated arrival: "2-3 minutes"
16. Waiter arrives at room
17. Waiter resolves request
18. Waiter marks call as "resolved"
19. Guest receives notification:
    - "Request completed"
    - "How was the service?" (optional feedback)
20. Call removed from active calls

**Alternative Flows**:

**A1. No Waiters Available**:

- 10a. System finds no active waiters
- 10b. System shows message: "No waiters available currently"
- 10c. System suggests:
  - Calling reception desk
  - Trying again later
- 10d. Call marked as "unattended"
- 10e. Use case ends

**A2. Cancel Call Before Acceptance**:

- 12a. Guest clicks "Cancel" button
- 12b. System shows confirmation: "Cancel waiter call?"
- 12c. Guest confirms
- 12d. System deletes call
- 12e. System notifies waiters (call cancelled)
- 12f. Use case ends

**A3. Multiple Waiters Respond**:

- 14a. Multiple waiters try to accept
- 14b. System assigns to first responder
- 14c. Other waiters see "Already assigned"
- 14d. Continue to step 15

**A4. Waiter Delayed**:

- 15a. Waiter doesn't arrive within 10 minutes
- 15b. System escalates to manager
- 15c. Manager receives notification
- 15d. Manager can reassign or handle
- 15e. Guest receives update

**A5. Guest Not in Room**:

- 16a. Waiter arrives, guest not in room
- 16b. Waiter marks "Guest unavailable"
- 16c. System notifies guest
- 16d. Call marked as "unresolved"
- 16e. Guest can call again

**A6. Emergency Request**:

- 4a. Guest selects "Emergency" option
- 4b. System marks call as high priority
- 4c. Call appears at top of waiter queue
- 4d. Multiple staff notified (waiters + manager)
- 4e. Faster response expected
- 4f. Continue to step 9

**Postconditions**:

- Waiter call created and tracked
- Real-time notifications sent
- Call status tracked
- Guest assisted by waiter
- Call record saved for analytics

**Business Rules**:

- BR-G05.1: Only checked-in guests can call waiter
- BR-G05.2: Maximum 1 active call per guest
- BR-G05.3: Call expires after 30 minutes if unresolved
- BR-G05.4: Expected response time: 2-5 minutes
- BR-G05.5: Emergency calls prioritized
- BR-G05.6: Call history maintained for 7 days
- BR-G05.7: Waiter can reject call with reason

**Technical Notes**:

- Real-time via Socket.io
- Broadcast to rooms:
  - `hotel-<hotelId>-waiters`
  - `hotel-<hotelId>-reception`
  - `hotel-<hotelId>-manager`
- WebSocket events:
  - `waiterCall` - New call
  - `callAccepted` - Waiter responds
  - `callResolved` - Completed
  - `callCancelled` - Guest cancels
- Auto-escalate after 5 minutes if no response
- Analytics: Track response times

**API Endpoints**:

- `POST /api/waiter-calls` - Create call
- `PATCH /api/waiter-calls/:id/accept` - Waiter accepts
- `PATCH /api/waiter-calls/:id/resolve` - Mark resolved
- `DELETE /api/waiter-calls/:id` - Cancel call

**Request Payload**:

```javascript
{
  hotelId: ObjectId,
  roomId: ObjectId,
  roomNumber: String,
  requestType: String,
  notes: String,
  priority: "normal" | "high",
  customerId: ObjectId,
  customerName: String
}
```

**Socket.io Flow**:

```
Guest clicks → Server creates call → Broadcast to waiters
Waiter accepts → Notify guest → Update status
Waiter resolves → Notify guest → Close call
```

---

## 🏨 Hotel Owner Use Cases

### UC-O01: Create Hotel Listing

**ID**: UC-O01  
**Actor**: Hotel Owner  
**Type**: Primary  
**Priority**: High  

**Description**: Hotel owner lists a new property on the platform.

**Preconditions**:

- Owner is authenticated
- Owner has created company profile
- Owner has necessary hotel information and images

**Basic Flow**:

1. Owner logs into owner dashboard
2. Owner clicks "Add New Hotel" button
3. System navigates to hotel creation form
4. System displays multi-step form:

   **Step 1: Basic Information**
   - Hotel name (text input, required)
   - Description (rich text editor, required)
   - Category dropdown (Resort, Hotel, Hostel, Boutique, Motel)
   - Star rating (1-5 stars selector, required)

5. Owner fills basic information
6. Owner clicks "Next" button
7. System validates Step 1 fields
8. System shows **Step 2: Location**
   - Country (dropdown, required)
   - State/Province (dropdown, required)
   - City (text input, required)
   - Address line 1 (text input, required)
   - Address line 2 (text input, optional)
   - Postal code (text input, required)
   - Landmark (text input, optional)
   - Latitude (number, optional - auto-filled if map used)
   - Longitude (number, optional - auto-filled if map used)
   - Interactive map to place marker

9. Owner fills location details
10. Owner clicks "Next" button
11. System validates Step 2 fields
12. System shows **Step 3: Contact & Policies**
    - Front desk phone (required)
    - Email (required)
    - Website (optional)
    - Check-in time (time picker, default 2:00 PM)
    - Check-out time (time picker, default 11:00 AM)
    - Cancellation policy (dropdown: Flexible, Moderate, Strict)
    - Pet policy (toggle + details)
    - Child policy (toggle + details)

13. Owner fills contact and policy details
14. Owner clicks "Next" button
15. System validates Step 3 fields
16. System shows **Step 4: Amenities**
    - Checkboxes for amenities:
      - WiFi
      - Pool
      - Gym/Fitness Center
      - Restaurant
      - Bar/Lounge
      - Room Service
      - Spa
      - Parking
      - Airport Shuttle
      - Business Center
      - Conference Rooms
      - Laundry Service
      - 24/7 Front Desk
      - Air Conditioning
      - Heating
      - Pet Friendly
      - Accessible
    - Custom amenities (add more)

17. Owner selects amenities
18. Owner clicks "Next" button
19. System shows **Step 5: Images**
    - Drag-and-drop image upload
    - Or click to browse
    - Minimum 3 images required
    - Maximum 20 images
    - Image requirements displayed:
      - Format: JPG, PNG
      - Max size: 5MB per image
      - Recommended: 1920x1080
    - Image preview grid
    - Set primary image (first is default)
    - Reorder images (drag-and-drop)

20. Owner uploads images:
    - Select multiple files
    - System uploads to Cloudinary
    - System shows upload progress
    - System displays thumbnails
21. Owner sets primary image
22. Owner reorders images (optional)
23. Owner clicks "Next" button
24. System validates all uploaded images
25. System shows **Step 6: Price Range**
    - Minimum price (number input, required)
    - Maximum price (number input, required)
    - Currency (dropdown, default based on location)
    - Price note: "This is indicative. Actual prices set per room."

26. Owner enters price range
27. Owner clicks "Review" button
28. System shows **Step 7: Review & Submit**
    - Complete summary of all entered data
    - Sections: Basic Info, Location, Contact, Amenities, Images, Pricing
    - "Edit" button for each section
    - Terms and Conditions checkbox
    - Submit button

29. Owner reviews all information
30. Owner checks terms and conditions
31. Owner clicks "Submit Hotel" button
32. System validates all required fields
33. System creates hotel record:
    - Links to owner's company
    - Sets status: "pending" (awaiting admin approval)
    - Generates unique hotel ID
    - Saves all entered data
34. System sends notification email to owner:
    - Confirmation of submission
    - Expected approval timeline (24-48 hours)
    - What happens next
35. System sends notification to admins:
    - New hotel submission
    - Link to review hotel
36. System displays success page:
    - "Hotel submitted successfully!"
    - Status: Pending Approval
    - What's next information
    - "View My Hotels" button
    - "Add Rooms" button (disabled until approved)
37. System redirects to owner dashboard after 5 seconds

**Alternative Flows**:

**A1. No Company Profile**:

- 2a. Owner hasn't created company
- 2b. System shows message: "Please create company profile first"
- 2c. System provides "Create Company" button
- 2d. Owner creates company
- 2e. Return to step 2

**A2. Validation Errors**:

- Any step: System finds validation errors
- System highlights error fields
- System displays error messages
- Owner corrects errors
- Owner resubmits step

**A3. Image Upload Failure**:

- 20a. Image upload fails (network issue, file too large, etc.)
- 20b. System shows error message
- 20c. System allows retry
- 20d. Owner reuploads or removes failed image
- 20e. Continue to step 21

**A4. Duplicate Hotel Name**:

- 32a. Owner already has hotel with same name
- 32b. System shows error: "You already have a hotel with this name"
- 32c. System suggests modifying name
- 32d. Owner goes back to Step 1
- 32e. Owner changes name
- 32f. Return to step 31

**A5. Save as Draft**:

- Any step before submission: Owner clicks "Save as Draft"
- System saves progress
- System shows "Draft saved" confirmation
- Owner can return later to complete
- Form data pre-filled from draft

**A6. Cancel Creation**:

- Any step: Owner clicks "Cancel"
- System shows confirmation: "Discard changes?"
- Owner confirms
- System discards unsaved data
- System returns to dashboard
- Use case ends

**A7. Edit Section During Review**:

- 29a. Owner clicks "Edit" on any section
- 29b. System navigates to that step
- 29c. Owner makes changes
- 29d. System saves changes
- 29e. System returns to review
- 29f. Continue to step 30

**Postconditions**:

- Hotel record created in database
- Hotel status: "pending"
- Owner notified of submission
- Admin notified for review
- Hotel appears in owner's property list
- Images stored in Cloudinary
- Hotel not yet visible to guests

**Business Rules**:

- BR-O01.1: Owner must have company before creating hotel
- BR-O01.2: Hotel name unique per owner
- BR-O01.3: Minimum 3 images required
- BR-O01.4: Maximum 20 images allowed
- BR-O01.5: Image max size: 5MB
- BR-O01.6: Supported formats: JPG, PNG, WebP
- BR-O01.7: Default status: "pending"
- BR-O01.8: Admin approval required
- BR-O01.9: Check-out time must be after check-in
- BR-O01.10: Price range: Min < Max

**Technical Notes**:

- Form uses React Hook Form for validation
- Multi-step form with progress indicator
- Client-side validation before server submission
- Image upload to Cloudinary:
  - Direct browser upload
  - Transformation: `w_1920,h_1080,c_limit`
  - Folder structure: `stayhaven/hotels/<hotelId>/`
- Location geocoding via Google Maps API
- Form state persisted in localStorage (draft)
- Transaction used for database operations

**API Endpoints**:

- `POST /api/hotels` - Create hotel
- `POST /api/hotels/upload-images` - Upload images
- `POST /api/companies` - Create company (prerequisite)

**Request Payload**:

```javascript
{
  name: String,
  description: String,
  category: String,
  starRating: Number,
  location: {
    country: String,
    state: String,
    city: String,
    address: String,
    postalCode: String,
    coordinates: [Number, Number]
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  policies: {
    checkIn: String,
    checkOut: String,
    cancellation: String,
    pets: Boolean,
    children: Boolean
  },
  amenities: [String],
  images: [String], // Cloudinary URLs
  priceRange: {
    min: Number,
    max: Number,
    currency: String
  },
  company: ObjectId
}
```

**Database Operations**:

1. Validate company ownership
2. Check for duplicate name
3. Upload images to Cloudinary
4. Create Hotel document
5. Link to Company
6. Create Notification for admin
7. Send confirmation email

---

### UC-O02: Invite Staff Member

**ID**: UC-O02  
**Actor**: Hotel Owner  
**Type**: Primary  
**Priority**: High  

**Description**: Hotel owner invites staff members to join their hotel operations.

**Preconditions**:

- Owner is authenticated
- Owner has at least one hotel
- Owner has staff member's email

**Basic Flow**:

1. Owner navigates to "Staff Management" section
2. Owner clicks "Invite Staff" button
3. System shows invitation form modal:
   - Email address (required)
   - Role dropdown (required):
     - Manager
     - Receptionist
     - Chef (Chief)
     - Waiter
     - Housekeeping
   - Assign to property (dropdown, required if multiple properties)
   - First name (optional)
   - Last name (optional)
   - Welcome message (optional textarea)
4. Owner enters email address
5. Owner selects role from dropdown
6. If owner has multiple hotels:
   - Owner selects which property to assign
7. Owner adds first/last name (optional)
8. Owner adds welcome message (optional)
9. Owner clicks "Send Invitation" button
10. System validates:
    - Email format valid
    - Email not already associated with account in same company
    - Role selected
    - Property selected (if multiple)
11. System generates unique invitation token:
    - Random 32-character token
    - Expires in 7 days
12. System creates pending staff invitation record:
    - Email
    - Role
    - Assigned property
    - Token
    - Invited by (owner ID)
    - Expiry date
    - Status: "pending"
13. System sends invitation email:
    - Subject: "You're invited to join [Hotel Name]"
    - Body:
      - Welcome message from owner
      - Hotel name and role
      - "Accept Invitation" button with token link
      - Link expiry information
      - Platform overview
14. System displays success message:
    - "Invitation sent to [email]"
    - Shows pending invitation in staff list
15. Owner returns to staff management page
16. Invited user appears in "Pending Invitations" section:
    - Email
    - Role
    - Sent date
    - Status
    - "Resend" button
    - "Cancel" button

**Alternative Flows**:

**A1. Email Already Exists (Same Company)**:

- 10a. Email already associated with staff in same company
- 10b. System shows error: "User already exists in your staff"
- 10c. System suggests:
  - Checking existing staff list
  - Using different email
- 10d. Owner corrects email or cancels
- 10e. Return to step 4

**A2. Email Already Exists (Different Company)**:

- 10a. Email associated with staff in different company
- 10b. System allows invitation (user can work for multiple companies)
- 10c. Continue to step 11

**A3. Email Already Invited (Pending)**:

- 10a. Owner previously invited this email (still pending)
- 10b. System shows warning: "Invitation already sent"
- 10c. System offers:
  - View existing invitation
  - Resend invitation
  - Cancel old and send new
- 10d. Owner selects option
- 10e. If resend: Go to step 13
- 10f. If cancel and resend: Delete old, go to step 11
- 10g. If view: Show invitation details, use case ends

**A4. Email Sending Failure**:

- 13a. Email service fails (network, service down)
- 13b. System logs error
- 13c. System marks invitation as "email_failed"
- 13d. System shows error to owner: "Failed to send email"
- 13e. System provides "Retry" button
- 13f. Owner clicks retry
- 13g. System attempts resend
- 13h. If successful, continue to step 14
- 13i. If failed again, suggest contacting support

**A5. Cancel Invitation**:

- 16a. Owner clicks "Cancel" on pending invitation
- 16b. System shows confirmation: "Cancel invitation to [email]?"
- 16c. Owner confirms
- 16d. System deletes invitation record
- 16e. Invitation link becomes invalid
- 16f. Invitation removed from pending list

**A6. Resend Invitation**:

- 16a. Owner clicks "Resend" on pending invitation
- 16b. System generates new token (extends expiry)
- 16c. System sends new invitation email
- 16d. System updates "last sent" timestamp
- 16e. System shows "Invitation resent" message

**A7. Bulk Invite**:

- 3a. Owner clicks "Bulk Invite" button
- 3b. System shows CSV upload interface
- 3c. Owner uploads CSV with columns: email, role, firstName, lastName
- 3d. System validates all entries
- 3e. System shows preview of invitations
- 3f. Owner confirms
- 3g. System sends invitations to all
- 3h. System shows summary: X successful, Y failed

**Postconditions**:

- Invitation record created
- Email sent to invitee
- Invitation appears in pending list
- Token active for 7 days
- Owner can track invitation status

**Business Rules**:

- BR-O02.1: Only owner and managers can invite staff
- BR-O02.2: Cannot invite to owner role (must create company)
- BR-O02.3: Invitation token expires in 7 days
- BR-O02.4: Same email can be invited to multiple properties
- BR-O02.5: Maximum 50 pending invitations per owner
- BR-O02.6: Invitation can be resent unlimited times
- BR-O02.7: Staff member must accept within 7 days
- BR-O02.8: After acceptance, cannot change role without staff consent

**Technical Notes**:

- Token: Crypto.randomBytes(32).toString('hex')
- Email via Nodemailer
- Link format: `${FRONTEND_URL}/staff/accept-invite?token=${token}`
- Invitation expires after 7 days
- Cron job to clean expired invitations (daily)
- Email template: HTML with company branding

**API Endpoints**:

- `POST /api/staff/invite` - Send invitation
- `POST /api/staff/invite/resend` - Resend invitation
- `DELETE /api/staff/invite/:id` - Cancel invitation
- `GET /api/staff/pending` - List pending invitations

**Request Payload**:

```javascript
{
  email: String,
  role: "manager" | "receptionist" | "chief" | "waiter" | "housekeeping",
  assignedProperty: ObjectId,
  firstName: String,
  lastName: String,
  welcomeMessage: String
}
```

**Email Template Variables**:

```javascript
{
  hotelName: String,
  roleName: String,
  inviterName: String,
  welcomeMessage: String,
  acceptLink: String,
  expiryDate: Date
}
```

**Database Schema**:

```javascript
StaffInvitation {
  email: String,
  role: String,
  companyRole: String,
  assignedProperty: ObjectId,
  company: ObjectId,
  invitedBy: ObjectId,
  token: String,
  firstName: String,
  lastName: String,
  welcomeMessage: String,
  status: "pending" | "accepted" | "expired" | "cancelled",
  expiresAt: Date,
  sentAt: Date,
  acceptedAt: Date,
  createdAt: Date
}
```

---

*[Continue with remaining use cases for Manager, Receptionist, Chef, Waiter, and Administrator in similar comprehensive detail...]*

---

## 🔗 Related Documents

- [Functional Requirements](./functional-requirements.md)
- [Use Case Diagrams](./use-case-diagrams.md)
- [User Roles and Permissions](./user-roles-and-permissions.md)
- [Business Rules](./business-rules.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ In Progress - Detailed use case descriptions (8 of 40+ completed)  
**Reviewed By**: System Analyst  
**Next Review**: Q2 2026  

---

## 📝 Notes

This document contains comprehensive use case descriptions for the StayHaven platform. Each use case includes:

- Detailed step-by-step flows
- Extensive alternative scenarios
- Business rules and validations
- Technical implementation notes
- API specifications
- Database schemas

The document is structured by user role for easy navigation. Additional use cases will be added as features are implemented.

**Coverage**:

- ✅ Guest Use Cases: 5 detailed (Search, View Details, Book, Order, Call Waiter)
- ✅ Owner Use Cases: 2 detailed (Create Hotel, Invite Staff)
- 🔄 Manager Use Cases: To be added
- 🔄 Receptionist Use Cases: To be added
- 🔄 Chef Use Cases: To be added
- 🔄 Waiter Use Cases: To be added
- 🔄 Admin Use Cases: To be added
