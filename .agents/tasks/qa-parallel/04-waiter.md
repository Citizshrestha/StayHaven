# Master prompt 04: Waiter dashboard (session name: `waiter`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven WAITER dashboard. Waiters use it on a PHONE while walking the
floor, so mobile is the primary target. Other agents are working on the other dashboards at the same time. Analyze, test every
feature end to end in a real browser (Playwright, Chromium + WebKit) against the running app, fix in files you own, re-test, report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 04, name `waiter`, worktree .worktrees\qa-waiter, branch qa/waiter, API 3003, web 5176, DB stayhaven_qa_waiter.
Context notes: d:\hotel-booking-order-management-system\.claude\agent-memory\stayhaven-senior-engineer\socket_guest_support.md

# SCOPE
Route: /waiter-dashboard (role waiter).
Frontend (you own): frontend\src\features\staff\waiter\pages\ WaiterDashboard.jsx, Sidebar.jsx, MobileHeader.jsx,
MobileBottomNav.jsx, DashboardContent.jsx, AssignedAreas.jsx, OrderFormModal.jsx, order\* (OrderCard.jsx …), RightPanel.jsx/.css,
NotificationPanel.jsx, WaiterCallsPanel.jsx, settings\*.
Backend: waiter-only controllers/routes (confirm by grep, e.g. waiter calls, assigned areas). orderController, diningRoutes,
staffRoutes, the socket server, models, BillPreviewModal (used in OrderCard.jsx ~1060) and core\* belong to 01 → file REQs.

# PHASE 1: ANALYZE (≤ 30 min)
Map each waiter view → service call → route → controller and note role guards, hotel/area scoping, and the socket events
listened/emitted (names, payloads, rooms joined).

# ACCOUNTS
waiter A (Test Hotel, assigned to some tables/areas), waiter B (Test Hotel, other areas), a waiter of Company B, chief, manager.
Seed tables, a menu with modifiers/variants and unavailable items, plus active dining sessions.

# ESSENTIAL FEATURES THAT MUST WORK
1. Login → /waiter-dashboard; other roles are redirected; logout revokes the session (01 owns the context; verify here).
2. Assigned areas/tables: waiter sees their tables with live status (free/occupied/ordering/bill requested).
3. Take an order (OrderFormModal): pick a table/room, search menu, categories, add items, quantities, modifiers, notes,
   remove items, totals; unavailable items blocked; submit once (double-tap → exactly one order); the order reaches the kitchen
   dashboard in real time.
4. Add items to an existing order / open tab; transfer table or merge (if supported).
5. Order lifecycle: see kitchen status changes live; mark served/delivered; the waiter can only do the transitions the server allows.
6. Waiter calls (WaiterCallsPanel): a guest presses "call waiter" from /guest/table/<token> in a second context, and the call appears
   within ~2 s with a sound/vibration where allowed; acknowledge/resolve; another waiter sees it as taken; no duplicates on reconnect.
7. Notifications panel: live, badge count correct, mark read.
8. Bill: request/preview the bill (BillPreviewModal), totals equal the server's, send by email, print; payment status.
9. Settings: profile, password change (old sessions invalidated), preferences persist.
10. Resilience: network drop mid-order (the draft is kept, a clear retry), socket reconnect after a backend restart, token expiry
    during a long shift (JWT_EXPIRE=2m run) with no lost work.

# SECURITY FOCUS (P0)
A waiter can't read or modify orders/tables of another hotel/company (IDOR via ids in the URL/body); price/total tampering in
the create-order body is ignored (server recomputes; run `cd Backend; npm run test:pricing`); negative/zero/huge/decimal
quantities rejected; modifiers can't be priced by the client; the waiter can't cancel/discount beyond policy; waiter role
can't hit menu-write, table-CRUD, staff-manage or reception endpoints (403); socket: a waiter can't join another hotel's room
or forge kitchen events; XSS through order notes / guest names shows as text in waiter, kitchen and receipt views.

# MOBILE + VISUAL (rules F/G; PRIMARY target 360×740, 375×667, 390×844 WebKit, 412×915; then 768×1024)
- One-hand use: MobileBottomNav with ≤ 5 items and thumb-reachable primary actions, a floating "New order" action, a
  MobileHeader with the hotel name, connection status (online/offline/reconnecting) and notifications.
- The order form is a full-screen sheet: sticky category chips (horizontal scroll), a search with a 16 px font, large +/− steppers
  (≥ 44 px), a sticky cart summary/footer with total and Submit that stays above the soft keyboard, and swipe/scroll that never
  submits accidentally.
- Order cards: status colour + label (rules G), elapsed time, table/room clearly visible, primary action button full width;
  RightPanel becomes a sheet/drawer on phones (no overflow from RightPanel.css).
- Waiter calls: a prominent banner/toast that's readable in sunlight (contrast), dismissible, and not covering Submit.
- Landscape phone and tablet: 2-column card grid, side panel docked.
- Check `prefers-reduced-motion`, dark mode, and that sound/vibration respects browser autoplay policy (show an "enable sound" tap).
- Align the waiter CSS to the rules G contract; document the mapping.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\waiter-report.md (format: rules J).
```
