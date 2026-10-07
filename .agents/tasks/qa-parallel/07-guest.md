# Master prompt 07: Guest dashboard + guest QR access (session name: `guest`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven GUEST experience: the logged-in guest dashboard and the
no-login QR flows (scan a table or room QR to order, call a waiter, chat). Almost every guest is on a PHONE, so mobile is the
primary target and the UI must feel like a polished consumer app. Other agents are working on the other dashboards at the same
time. Analyze, test end to end in a real browser (Playwright, WebKit iPhone + Chromium Android) against the running app, fix in
files you own, re-test, report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 07, name `guest`, worktree .worktrees\qa-guest, branch qa/guest, API 3006, web 5179, DB stayhaven_qa_guest.
Context notes: d:\hotel-booking-order-management-system\.claude\agent-memory\stayhaven-senior-engineer\socket_guest_support.md

# SCOPE
Routes: /guest-dashboard/* (ProtectedGuestRoute), guest login (frontend\src\features\public\auth\guest\GuestDashboardLogin.jsx),
/guest/table/:token, /guest/room/:token.
Frontend (you own): frontend\src\features\guest\dashboard\** (layout\GuestDashboardLayout.jsx; pages\ DashboardView, BookingsView,
BillingView, ChatView, RequestsView, RoomServiceView, ProfileView, SettingsView), frontend\src\features\guest\qr-access\**
(GuestTableView.jsx, GuestRoomView.jsx, guestSession.js, GuestQR.css), frontend\src\features\public\auth\guest\**.
Backend (you own): routes\{guestRoutes,guestDashboardRoutes,feedbackRoutes,profileRoutes}.js, controllers\guestDashboardController.js,
controllers\messagingController.js and guest-only services. ProtectedGuestRoute, client.js, SocketContext, orderController/diningRoutes
(guest ordering), the socket server, models and webrtcManager → REQs to 01. Booking creation/payment pages → session 08.

# PHASE 1: ANALYZE (≤ 45 min)
Map every guest view and QR flow → service → route → controller → model. Document how the guest is authenticated in each
flow (guest JWT, QR session token in guestSession.js, booking reference + last name?), what the QR token grants, how long it
lives, and which socket rooms a guest joins.
Helper scripts exist (Backend\scripts\createTestGuest.js, createTestGuestBooking.js, debugGuestBooking.js). Read each before
running it, and only run it against YOUR DB.

# ACCOUNTS / DATA
guest@test.com (Confirmed booking, from setupTestHotel.js); guest B with a Checked-In booking at Test Hotel; guest C at the
Company B hotel; a guest with no bookings; active, inactive and regenerated table/room QR tokens; menu with unavailable items.

# ESSENTIAL FEATURES THAT MUST WORK
1. Guest login/logout/session expiry (password and any OTP/Google option present); a wrong login shows a message, no user
   enumeration; ProtectedGuestRoute redirects correctly and keeps the deep link.
2. Dashboard: current/upcoming stay summary, quick actions, correct dates in the hotel's timezone.
3. Bookings: list upcoming/past/cancelled, details, cancel within policy (refund rules shown), download/print confirmation.
4. Billing: folio with room charges + orders + taxes, equal to the reception/server totals; payment status; invoice download.
5. Room service: menu by category, search, item detail, cart, modifiers, notes, place an order once (double-tap safe), live
   status tracking until delivered, order history; it reaches the kitchen and waiter dashboards in real time.
6. Requests (housekeeping, towels, maintenance…): create, see status updates live, cancel.
7. Chat with reception (ChatView/messagingController): send/receive in real time, unread badges, history, attachments if
   supported, reconnect without duplicates; calls via webrtcManager if present (permission prompts, denial handled).
8. Profile and settings: edit details (validation), change password (other sessions invalidated), notification preferences, delete
   account/data request if offered.
9. Table QR (/guest/table/<token>): menu loads fast on a phone, order without login, call waiter, request bill; an inactive or
   regenerated (old) token shows a clear "QR inactive" screen; a Maintenance table blocks ordering; the session survives a
   reload; another device scanning the same table shares/doesn't share the cart as designed.
10. Room QR (/guest/room/<token>): room service + requests tied to that room; only valid while a booking is checked in (verify
    the intended rule); a checked-out room can't order.

# SECURITY FOCUS (P0)
IDOR: guest A can't read/modify guest B's bookings, bills, orders, requests, chat threads or profile (swap ids in URLs/bodies
and socket emits); QR token: unguessable, scoped to one table/room/hotel, no enumeration, revoked tokens rejected server-side,
rate limit on QR ordering and call-waiter spam; price tampering in guest orders ignored (server recomputes); guests can't
set order status/payment status; stored XSS through chat messages, requests, notes and profile names renders as text here AND
in the reception/waiter/kitchen views (note those sinks for their owners); PII never in URLs or logs; guest tokens rejected by
staff APIs; uploads (avatar/attachments) type/size checked. Add regression tests in Backend\tests\guest*.integration.test.js.

# MOBILE + VISUAL (rules F/G; PRIMARY 390×844 WebKit, 375×667, 360×740, 412×915; then 768×1024 and 1440×900)
- App-like shell: bottom tab bar on phones (Home, Bookings, Room service, Requests/Chat, Profile) with safe-area insets, a
  compact header, and GuestDashboardLayout that becomes a centred max-width layout on desktop (no stretched lines).
- Menu (QR + room service): sticky category chips, image cards with consistent aspect ratio and lazy loading, veg/non-veg and
  unavailable states, a large add/stepper (≥ 44 px), and a sticky cart bar with item count and total; the cart/checkout is a bottom
  sheet; the order tracker uses a clear step indicator.
- Chat: messages above the soft keyboard, the input sticky with safe-area, auto-scroll only when at the bottom, timestamps, and
  sent/failed states with retry.
- Forms (login, profile, requests): 16 px inputs, correct autocomplete/inputMode, inline errors, visible password toggle.
- First load on Slow 4G with 4× CPU: the QR menu shows a skeleton in < 2 s and is usable in < 4 s; images are compressed.
- Brand-consistent with the public site (session 08) and the rules G contract (status colours, money format `Rs. 1,234`, states).
  Polished empty states ("No upcoming stays", "Your cart is empty") with a CTA.
- Dark mode, reduced motion, landscape phone, and Devanagari text wrapping in menu/requests.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\guest-report.md (format: rules J).
```
