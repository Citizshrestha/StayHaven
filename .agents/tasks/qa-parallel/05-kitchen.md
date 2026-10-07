# Master prompt 05: Kitchen dashboard (session name: `kitchen`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven KITCHEN dashboard (kitchen display for the `chief` role).
It runs on wall tablets and phones in a busy kitchen: big, glanceable, realtime, touch-first. Other agents are working on the other
dashboards at the same time. Analyze, test end to end in a real browser (Playwright) against the running app, fix in files you
own, re-test, report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 05, name `kitchen`, worktree .worktrees\qa-kitchen, branch qa/kitchen, API 3004, web 5177, DB stayhaven_qa_kitchen.

# SCOPE
Route: /kitchen-dashboard (role chief).
Frontend (you own): frontend\src\features\staff\kitchen\pages\ KitchenDashboard.jsx/.css, Sidebar.jsx, KitchenMobileHeader.jsx,
KitchenMobileNav.jsx, DashboardContent.jsx, OrderCard.jsx.
Backend: kitchen-only controllers/routes if any (confirm by grep). orderController (status transitions), diningRoutes,
staffRoutes, menu availability (menuController belongs to 02), the socket server and models → file REQs to 01 (or to 02 for menu).

# PHASE 1: ANALYZE (≤ 30 min)
Map the views → service calls → routes → controllers; list the order statuses the chief can set, the socket events consumed,
polling intervals, the sound/alert logic, and the filters (new/preparing/ready, by station/type).

# ACCOUNTS
chief A (Test Hotel), chief of Test Hotel 2 (same company), chief of Company B, a waiter, a guest QR session (table and room).

# ESSENTIAL FEATURES THAT MUST WORK
1. Login → /kitchen-dashboard; other roles are redirected; logout.
2. New orders appear in real time (< 2 s) from all sources: waiter order, guest table QR, guest room service; with a sound alert
   (after a user gesture to satisfy autoplay), a visual highlight and a counter. No duplicates after a socket reconnect.
3. Ticket content: order #, table/room, order type, items with qty, modifiers, notes/allergies highlighted, elapsed timer
   (correct across timezones; it doesn't reset on reload), priority/overdue colouring.
4. Status flow: accept/start preparing → ready (and item-level if supported); the waiter and guest see the update live;
   invalid transitions are refused by the server with a clear message; two chiefs tapping the same ticket → one wins, the other
   sees the updated state (409 handled).
5. Cancelled orders are removed/marked immediately and loudly so the kitchen stops cooking.
6. Filters/tabs and sort (oldest first by default), search by order #/table, "all day" view or history of completed today.
7. Item availability (86'd items), if the UI offers it: marking unavailable updates the guest and waiter menus (endpoint belongs to 02 → REQ if broken).
8. Long-running stability: leave the page 30 min with 50+ tickets: no memory growth spikes, timers stay accurate, the socket stays
   connected, token refresh is silent (run with JWT_EXPIRE=2m).
9. Offline/reconnect: a banner when disconnected, auto-resync of missed orders on reconnect (no lost tickets).

# SECURITY FOCUS (P0)
The chief can only see/update orders of their own hotel (IDOR on order ids, Company B tokens); the chief can't change prices,
items, payments, or cancel unless policy allows; chief tokens get 403 on menu writes, table/room CRUD, staff manage, reception and
superadmin endpoints; socket room join limited to their hotel; XSS through item notes/guest names renders as text on tickets.

# MOBILE + VISUAL (rules F/G; PRIMARY 1024×768 and 1280×800 landscape tablet, 768×1024 portrait; then 390×844, 360×740)
- Kitchen-readable: ticket header ≥ 20 px, item text ≥ 16–18 px, high contrast (≥ 7:1 for ticket text recommended), a dark mode
  that's genuinely dark, status colours per rules G with text labels, and overdue tickets in a distinct red/amber state.
- Touch: status buttons ≥ 56 px tall, full-width on the ticket, spaced to avoid mis-taps (greasy fingers), with a confirm or undo
  for "ready".
- Layout: a responsive ticket grid (1 column phone, 2 portrait tablet, 3–4 landscape), columns per status on wide screens,
  no horizontal overflow, KitchenMobileNav/Header on phones with a counter per status, and the screen kept awake if supported (Wake Lock API, optional).
- Smooth realtime insertion (no layout jump of the ticket being tapped), with reduced-motion respected.
- Align KitchenDashboard.css to the rules G contract; document the mapping.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\kitchen-report.md (format: rules J).
```
