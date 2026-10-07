# Master prompt 03: Reception dashboard (session name: `reception`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven RECEPTION dashboard (front desk). Other agents are working on
the other dashboards at the same time. First analyze the reception code and its backend, then test every feature end to end
in a real browser (Playwright) against the running app, fix what you find in files you own, re-test, and report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 03, name `reception`, worktree .worktrees\qa-reception, branch qa/reception, API 3002, web 5175,
DB stayhaven_qa_reception.

# SCOPE
Route: /reception-dashboard (App.jsx allows receptionist, manager, admin, owner).
Frontend (you own): frontend\src\features\staff\reception\pages\ ReceptionDashboard.jsx(+.css), Sidebar.jsx,
MobileBottomNav.jsx, DashboardContent.jsx, BookingsView, CheckInOutView, RoomsView, GuestsView, HousekeepingView,
BillingView, BankTransferReview.jsx, ReceptionOrdersView.jsx, ReportsView, StaffView, ReceptionSettings, ActionModals.jsx
(and their .css), plus any reception services/hooks in the feature folder.
Backend (you own): routes\receptionRoutes.js, controllers\receptionController.js and any controller/service used only by
reception (confirm by grep). Shared: orderController, staffController, models, middleware, BillPreviewModal, core\* → REQs to 01.
Note: hotel admin (session 02) also consumes reception endpoints (reports/overview, billing/summary, billing/invoices,
guests). Your changes to them must stay backwards compatible, and you'll receive REQs from 02 for property scoping.
Read d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\requests\hoteladmin.md for REQs targeting your files.

# PHASE 1: ANALYZE (≤ 45 min, write findings into your report before fixing)
Map every reception view → component → service call → route → controller → model, and list for each: the role guard,
property scoping (does it use the ACTIVE hotel or the whole company? the earlier audit says getCtx aggregates company-wide,
receptionController.js ~22-27, 929, 1318, 1427), validation, and pagination caps.

# ACCOUNTS
receptionist (Test Hotel only), manager (Test Hotel only), admin and owner of Company A; a receptionist of Test Hotel 2 (same
company); a receptionist + owner of Company B. Seed bookings in every status (Pending, Confirmed, Checked-In, Checked-Out,
Cancelled, No-show), plus overlapping dates, a multi-room booking and a bank-transfer booking with an uploaded proof.
`Backend\scripts\seedNepaliGuests.js` exists for guest data: run it only against YOUR DB and read it first (it may relink receptionists).

# ESSENTIAL FEATURES THAT MUST WORK
1. Dashboard: today's arrivals/departures/in-house/occupancy/revenue for the active hotel; numbers equal the DB; quick actions work.
2. Bookings: list/search/filter/sort/paginate; create a walk-in booking (dates, room type, guests, rate, deposit); edit;
   cancel with a reason; no-show. Availability is respected: no double booking of the same room for overlapping dates, including
   two receptionists booking the last room at the same moment from two contexts (exactly one succeeds).
3. Check-in / check-out: check-in assigns a room (only clean + available), captures guest ID details, sets the room to
   occupied; check-out settles the bill (room nights + restaurant/room-service orders + taxes − deposit), frees the room,
   and moves it to cleaning. Early/late check-out, same-day stay, check-out before check-in rejected, timezone (Asia/Kathmandu) day boundaries.
4. Rooms: live status board; status changes respect bookings (can't mark a checked-in room available).
5. Guests: search by name/phone/email (regex-safe), profile, stay history, PII masking where appropriate, export CSV (formula-safe).
6. Housekeeping: dirty → cleaning → clean flow, assignment, and the room becoming bookable afterwards.
7. Billing: invoices list/detail, payments (cash/card/wallet), partial payments, refunds, totals recomputed server-side,
   invoice print/email (BillPreviewModal is shared: test it, REQ fixes to 01), VAT/service charge correct, no fabricated data.
8. Bank transfer review: view the proof image/PDF, approve/reject with a reason; double-approve impossible (two contexts);
   the booking/payment status updates; the upload is served safely (no HTML/SVG executing from the proof URL).
9. Orders view: restaurant/room-service orders for the hotel, statuses, bill to room.
10. Reports: date range, occupancy/ADR/RevPAR/revenue numbers that equal the DB, export. No fabricated trend values.
11. Staff view and Settings: what reception may see/change only.
12. Realtime: a new online booking, a guest request or a room-service order appears without reload (socket), and the badges update.

# SECURITY FOCUS (P0)
IDOR on booking/invoice/guest/payment ids across hotels and companies; property scoping of every aggregate; price/total tampering
on create booking/check-out/payment (server recomputes); refunds and payment approval restricted to the right roles; mass
assignment on booking/guest updates (`status`, `totalAmount`, `paidAmount`, `hotel`); stored XSS through guest names,
special requests and notes (rendered here, in the guest dashboard and on printed invoices); CSV injection; PII in logs; rate
limit on guest search; file-type/size checks on bank-transfer proofs. Add regression tests in Backend\tests\reception*.integration.test.js.

# MOBILE + VISUAL (rules F/G)
Front-desk staff use tablets and phones: test 768×1024 and 1024×768 as primary, plus 390×844 and 360×740.
- MobileBottomNav: ≤ 5 primary destinations, active state, safe-area padding, doesn't cover content or modal footers.
- The bookings list and guest list become cards on phones; the booking calendar/timeline (if any) scrolls horizontally with a
  sticky date header; check-in/out forms are single-column with sticky Confirm; date pickers are usable on touch; ID photo
  capture via the mobile camera works where supported.
- The room status board is a readable grid on a phone (2 columns), with colour + label per status (rules G status colours).
- Invoices: readable on a phone, print layout A4/thermal-safe.
- Align ReceptionDashboard.css and the view CSS files to the rules G contract (spacing, radius, type scale, buttons, badges,
  states), mapping your local variables to the hotel-admin token values. List the mapping in your report.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\reception-report.md (format: rules J).
```
