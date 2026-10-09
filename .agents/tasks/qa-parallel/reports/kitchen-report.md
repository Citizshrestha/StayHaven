# Session 05 (kitchen) report

Branch `qa/kitchen` in `.worktrees/qa-kitchen`, created from `qa/platform` @ `b97ed58` (wave 2 override). Commits (unpushed, unmerged): `6b3290b`, `00e8612` (tip). The report and `requests/kitchen.md` live in the main checkout, not on the branch. Harness: `.qa-harness/kitchen/` (specs, probes, `shots/`, JSON results).

## 1. Environment

| Item | Value |
|---|---|
| API / web | 3004 / 5177. Web is `vite preview` of the production build (`VITE_API_BASE_URL=http://localhost:3004`, `ALLOW_LOCAL_API_IN_PROD_BUILD=true`) |
| DB | `mongodb-memory-server` replica set on 127.0.0.1:27105, DB `stayhaven_qa_kitchen` (local, throwaway). Seeded by `backend/scripts/_qa_tmp_kitchen.js` (deleted at the end). Fixtures: Company A (Test Hotel, Test Hotel 2) and Company B (1 hotel); chief A1, chief A1b (same hotel), chief A2 (hotel 2), chief B, waiters A1/A2/B, manager, receptionist, hoteladmin, owners, guest; 4 tables and 2 rooms per hotel; 6 menu items per hotel including an `<img onerror>` item name |
| Browser | `@playwright/test` 1.49.1 library driving system Chrome (`channel: 'chrome'`). WebKit was not available, so Safari/iOS rendering is untested |
| Env | `backend/.env` generated with random 48-char JWT secrets. No third-party keys. Run with `JWT_EXPIRE=2m` for the soak test only |

| Check | Baseline (b97ed58) | Final (qa/kitchen tip) |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings (none introduced by kitchen files) | 0 errors, 13 warnings |
| `npm run build` | pass | pass (chunk-size warning only) |
| `npm run test:frontend` | 17/17 | 19/19 (+2 in `frontend/tests/kitchenClock.test.mjs`) |
| `backend npm test` | 135/137 (platform report, same commit; the 2 failures are `bookingIntegrity` "companyless staff", booking routes owned by 08) | 135/137, the same 2 failures (run on the tip, log `.qa-harness/kitchen/backend-final.txt`) |

No backend file was changed by this session (the kitchen owns no backend code), so no new backend regression test was needed. The server-side checks are covered by `.qa-harness/kitchen/api-probe.mjs` and `socket-probe.mjs`.

## 2. Feature PASS/FAIL

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| API security/tenancy/transitions (`api-probe.mjs`) | 89 | 85 | 4 | 0 | The 4 fails: 3 are REQ-kitchen-1 (chief can edit items, hit confirm-payment, hit send-bill). 1 is the "no stack trace" check, which is a dev-mode false positive (see Blocked) |
| Sockets (`socket-probe.mjs`) | 17 | 17 | 0 | 0 | waiter order and 2 guest QR orders (table, room) reach the chief once, in < 2 s; other hotel, other company, hostile `join-hotel`/`join-role`, no-token and guest-token sockets get nothing; cancel and edit events arrive |
| Functional browser (`fn-spec.mjs`, 1280×800; final run `fn-spec-final.txt`) | 43 | 43 | 0 | 0 | Login to dashboard, realtime from waiter + guest table QR + guest room QR with no duplicates, ticket content, start/ready flow, two-step ready, cancel alert + dismiss + persistence, oldest-first, search (including regex characters), clear filters, XSS (no dialog, no injected nodes), stale second chief (server message toast + resync), offline banner + resync of an order created while offline, elapsed timer survives reload, font sizes, contrast, 56px buttons |
| UX / phone / theme (`ux-spec.mjs`, `anon-check.mjs`) | 26 | 25 | 1 | 0 | Drawer (Esc, backdrop, focus return), bottom-nav tabs with `aria-current`, last ticket above the nav, shared sound prompt clears the nav, keyboard-sized viewport, orientation change, dark toggle persists, reduced motion, Kathmandu vs UTC timers, 500 error state with Retry, slow-load skeleton, waiter redirected, logout, anonymous redirect. The 1 fail is a harness artifact: the "dashboard not reachable after logout" check re-injects the saved session on every navigation, so it cannot pass. The anonymous-context checks (2/2) cover the same requirement. |
| Mobile matrix (`mobile-matrix.mjs`) | 18 | 18 | 0 | 0 | 9 viewports × light/dark, see section 3 |
| Soak (`longrun.mjs`, `JWT_EXPIRE=2m`) | 10 | 10 | 0 | 0 | 7 minutes, 78 tickets, 3 expiry cycles. 7 silent refresh calls, 0 responses with status 401, live order inserted at minutes 1, 3, 5, 7 (1.1 to 4 s including the harness login + create call), heap 6.6 → 10.6 MB (tickets 3 → 78), DOM nodes stable (2.3k → 2.6k), socket still connected, no logout |
| Unit (`kitchenClock.test.mjs`) | 2 | 2 | 0 | 0 | `formatElapsed`, `overdueLevel` thresholds |

**Blocked / not verified (honest list)**
- Sound is not audible in headless Chrome. The shared unlock prompt appears and sits clear of the nav; the actual chime was not heard. Unlock state was not asserted.
- Wake Lock: code path added (`navigator.wakeLock`, re-acquired on `visibilitychange`); not observed in a browser run.
- 30 minutes of soak was not run; 7 minutes with 2-minute tokens was (about 3 expiry cycles).
- Item-level status and 86'd items (essential features 4 and 7): the kitchen UI does not offer either, and the backend has no per-item status. Not built (new product behaviour). Kitchen read-only menu access works (`GET /staff/menu-items` 200).
- Production-mode probes: `NODE_ENV=production` refuses to start with a `localhost` CLIENT_URL (env validator needs HTTPS origins). Stack-trace, CSP and rate-limit behaviour is covered by session 01's `prod-probe.mjs` (11/11) on the same backend code, which this session did not change. Cross-reference only, not re-run.
- `loadStripe(undefined)` throws "Expected publishable key to be of type string" on every staff page without a Stripe key (BillingView.jsx / BookingPaymentModal.jsx, owned by 07 and 08, already in the platform report). Excluded from the "no page errors" checks.
- Safari/iOS (no WebKit), real touch hardware, real tablets, real greasy-finger testing.

## 3. Mobile matrix (rules F)

Automated per viewport and theme (`mobile-matrix.json`, `shots/m-<view>-<theme>.png`): no horizontal overflow, every kitchen-owned tap target ≥ 44 px, inputs ≥ 16 px, no text under 12 px, grid column count, bottom-nav clearance.

| View | 360 | 375 | 390 | 412 | 768 | 844×390 | 1024 | 1280 | 1440 |
|---|---|---|---|---|---|---|---|---|---|
| Tickets, light | PASS (1 col) | PASS (1) | PASS (1) | PASS (1) | PASS (2) | PASS (2) | PASS (2) | PASS (3-col board) | PASS (3-col board) |
| Tickets, dark | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Additional phone checks (all PASS in `ux-spec.mjs`): drawer is `role="dialog"`, closes on Esc and backdrop and returns focus; search stays visible in a keyboard-height viewport (390×460); orientation change keeps the search text and does not overflow; last ticket ends above the bottom nav; the messaging FAB is hidden below 1024 px because the nav has a Messages tab.

Remaining sub-44 px targets on the page are shared components outside this session's files: `.msg-header-btn` 42×42, `.msg-tab` 42 px tall (MessagingPanel, rendered but hidden until opened) and the toast close button 14×16 → REQ-kitchen-8.

## 4. Security matrix (key rows)

| Actor | Call | Expected | Actual |
|---|---|---|---|
| anon / tampered JWT / `alg=none` | `GET /staff/orders` | 401 | 401 / 401 / 401 |
| guest token | `GET /staff/orders`, `PUT …/status` | 401/403 | 403 / 403 |
| chief A1 | orders of own hotel | 200 | 200 |
| chief A1 | orders of hotel A2 (same company) / hotel B | 403 | 403 / 403 |
| chief B, chief A2 | orders of hotel A1 | 403 | 403 / 403 |
| chief A1 | `GET` / `PUT status` on an A2 or B order id | 403/404 | 404 / 404 |
| chief B | `PUT status`, `POST cancel` on an A1 order | 403/404 | 404 / 404; A1 order verified unchanged |
| chief A1 | `create-order` in hotel A2 / B | 403 | 403 / 403 |
| chief A1 | `status={"$ne":null}`, bogus status, missing status | 400 | 400 ×3 |
| chief A1 | `orders?search=(((&limit=abc&page=-1`, `status[$ne]=…` | 200 | 200 / 200 |
| chief A1 | `orders?hotelId[$ne]=…` | 400/403/404 | 400 |
| chief A1 | status update with extra `totalPrice`, `hotel`, `items`, `paymentStatus`, `role` | ignored | ignored (price, hotel, payment unchanged) |
| chief A1 | pending→preparing→ready | 200 | 200 |
| chief A1 | same status again | 200 no-op | 200 `unchanged` |
| chief A1 | ready→preparing, preparing→pending | 400 | 400 / 400 |
| chief A1 | preparing→delivered | 403 | 403 |
| chief A1 | delivered→preparing (terminal) | 400, clear message | 400 "Order is already delivered and cannot be changed" |
| receptionist | `PUT status` | 403 | 403 |
| waiter | ready→delivered | 200 | 200 |
| chief A1 + chief A1b | same ticket → preparing at once | one wins | 200 + 409 |
| chief A1 + chief A1b | preparing vs ready at once | consistent final | 409 + 200, final `ready` |
| chief A1 | cancel without reason / object reason | 400 | 400 / 400 |
| chief A1 | menu create/update/delete, invite, register, pending-invites, property staff, staff status, table-assignments, tables POST, rooms POST, seed, superadmin hotels/users/finance, dining void/discount/payments/refunds | 403 | 403 for all (reception dashboard/reports paths answer 404 on these URLs) |
| chief A1 | `DELETE /orders/:id`, `GET /staff/dining/sessions` | 403 | 403 / 403 |
| **chief A1** | **`PUT /orders/:id` (change items/quantity)** | 403 | **200 (FAIL, REQ-kitchen-1)** |
| **chief A1** | **`POST …/confirm-payment`** | 403 | **409 (reaches the payment logic; FAIL, REQ-kitchen-1)** |
| **chief A1** | **`POST …/send-bill`** | 403 | **502 (tries to send; FAIL, REQ-kitchen-1)** |
| chief A1 | `POST …/cancel` with a reason | per policy | 200 (route allows chief; REQ-kitchen-5 asks for a product decision) |
| chief A1 | responses contain no password/token/refresh fields | clean | clean |
| waiter | create order with HTML in name, notes, item note | stored safe | tags stripped server-side; item name is a menu item named `<img onerror…>` and renders as text on the ticket |
| socket, chief A1 | joins hotel A2 / B rooms, `join-role` as B | no events | no events (only own-hotel events arrive) |
| socket, no token / guest token | `join-hotel` A1 | no events | no events |
| browser, chief | XSS payloads on tickets | text only | 0 dialogs, 0 injected nodes |
| browser, waiter | open `/kitchen-dashboard` | redirect | lands on `/waiter-dashboard` |
| browser, anon | open `/kitchen-dashboard` | redirect to login | redirected |
| browser, chief | logout | session cleared | `/staff/login`, `staffAccessToken` cleared; logout now signs out locally even if the server call fails |

Note: "tampering with sessionStorage role" is covered by session 01 (platform report, tampered role → 403 on privileged calls). The kitchen adds a client-side role redirect, but the server is the authority.

## 5. Bugs fixed

| # | Sev | File | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P1 | `OrderCard.jsx` (old lines 354-359) | A **cancelled** order still showed the "Mark as Ready" button and the status label "cancelled", so the cook could keep working a dead ticket | Cancelled tickets get a red "CANCELLED — STOP COOKING" banner, struck-through items, no status buttons, and a Dismiss button. Alerts stay at the top of All until dismissed (remembered in `sessionStorage`); a Cancelled tab lists the rest | `fn-spec` cancel ×5 | 6b3290b |
| 2 | P1 | `DashboardContent.jsx` filters | `confirmed` orders matched no tab except All, and showed "Mark as Ready" (skipping cooking) | `confirmed` lives in New with an "Accepted" badge and a "Start cooking" button | code + board counts | 6b3290b |
| 3 | P1 | `DashboardContent.jsx` sort | Newest first, so the oldest ticket sank to the bottom | Oldest first everywhere except Done (newest first) | `fn-spec` sort ×2 | 6b3290b |
| 4 | P1 | `KitchenDashboard.jsx` | Not subscribed to `order-updated`: a waiter editing items or notes left the kitchen showing stale items until the 30 s poll. Also one fetch per socket event during a rush | Subscribes to `order-updated` and `order-cancelled`; bursts coalesce into one fetch (250 ms) | `socket-probe` + `fn-spec` | 6b3290b |
| 5 | P1 | `KitchenDashboard.jsx` | No offline indicator and no resync after a gap | Banner when offline or socket down; refetch on socket reconnect, `online` and tab-visible | `fn-spec` offline ×4 | 6b3290b |
| 6 | P1 | `OrderCard.jsx` `confirmUpdate` | A tap on a stale ticket raised an unhandled error; the user saw nothing | Server message toast (`toastId` per order), then resync of the board | `fn-spec` race ×4 | 6b3290b |
| 7 | P1 | `OrderCard.jsx` | "Ready" was a modal with hard-coded white styling (unreadable in dark mode) and it cannot be undone (server refuses backward moves) | Inline two-step confirm: first tap arms ("Tap again to confirm #N is ready", 4 s), second tap commits. Start cooking is one tap | `fn-spec` status ×6 | 6b3290b |
| 8 | P1 | `KitchenDashboard.jsx` | Played the new-order sound and a browser notification itself, on top of `NotificationContext` (double alert) | Removed the duplicates; sounds and bell entries come from the shared context only | code + socket events once | 6b3290b |
| 9 | P1 | `OrderCard.jsx` | Elapsed time was "7m ago" refreshed every minute, based on the device clock | Live mm:ss timer from the server `createdAt`, corrected with the server clock offset (`/health` timestamp), shared 1 s ticker, `tabular-nums`. Reload does not reset it | `fn-spec` timer, `ux-spec` tz, unit test | 6b3290b |
| 10 | P1 | `OrderCard.jsx` | Overdue colouring only for new > 5 min and preparing > 20 min, as a 1 px border | Per-status thresholds (new/accepted 5/10 min, cooking 15/25, ready 5/10) with amber/red state, badge text ("Running late", "Overdue") and a thick outline | screenshots | 6b3290b |
| 11 | P1 | `OrderCard.jsx` | Per-item notes were 12 px; order notes and allergy cues were not shown | Item notes 16 px bold on an amber block, an "Allergy / dietary" badge when notes mention allergy, nut, gluten, dairy and so on | `fn-spec` ticket | 6b3290b |
| 12 | P2 | `KitchenMobileHeader.jsx` | Hamburger and refresh were 32×32, the drawer ignored the view change (menu items just closed it), the drawer had no dialog semantics | 44 px controls, forwards view change, `role="dialog"`, Esc, focus return; per-status counters (New / Cooking / Ready) in the header; theme toggle added | `ux-spec` phone ×4 | 6b3290b |
| 13 | P2 | `KitchenMobileNav.jsx` | Tabs ~46 px, 10 px labels, no `aria-current`; the messaging FAB covered the Settings tab | 64 px nav, 12 px labels, `aria-current`, `aria-label` with unread count; FAB hidden below 1024 px (nav has Messages); `--bottom-nav-height` published on `<html>` so the shared sound prompt and FAB clear the nav | mobile matrix, `ux-spec` | 6b3290b, 00e8612 |
| 14 | P2 | `KitchenDashboard.jsx` | No dark/light toggle in the kitchen UI at all (only via Settings) | 44 px `aria-pressed` toggle in the top bar and phone header | `ux-spec` theme ×3 | 6b3290b |
| 15 | P2 | `Sidebar.jsx` | Logout aborted when the server call failed (stuck signed-in on a shared tablet); `console.log` on every count change; `<h1>` duplicated; 11 px badge; items < 48 px | Logs out locally in `finally`; log removed; `<p>`; 12 px; 48 px min-height; `aria-current` | `ux-spec` auth ×2 | 6b3290b |
| 16 | P2 | `DashboardContent.jsx` | No search, no "Clear filters", no error state, no skeleton; "Done" showed up to 50 completed orders of any day | Search by order #, table, room, guest or item (literal match); empty / no-results (Clear filters) / error (Retry) / skeleton; Done = delivered today (local day) | `fn-spec` search ×4, `ux-spec` fail ×3 | 6b3290b |
| 17 | P2 | `KitchenDashboard.jsx` | Debug `console.log` of notification objects (guest names) | Removed | code | 6b3290b |
| 18 | P2 | `KitchenDashboard.jsx` | No wake lock: wall tablets dim and sleep | `navigator.wakeLock` where supported, re-acquired when the tab is visible | code only (not observed) | 6b3290b |
| 19 | P3 | `OrderCard.jsx` | Large food images (200–280 px) pushed the action out of view | Removed from kitchen tickets (cooks need text, not photos); photos remain on the waiter and guest side | screenshots | 6b3290b |
| 20 | P3 | `KitchenDashboard.css` | Blanket legacy rules (`* { transition }`, `span`/`p` colours) fought the new components and ignored reduced motion | Removed the global transition, added `prefers-reduced-motion` support; kd-* rules use higher specificity under `.kitchen-dashboard.dark` | `ux-spec` motion | 6b3290b |
| 21 | P3 | `KitchenDashboard.css` | The shared sound-unlock prompt (fixed bottom-left) intercepted clicks on Log Out in the desktop sidebar | Sidebar bottom padding 80 px | `ux-spec` auth (failed before, passes after) | 00e8612 |

## 6. UX / visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| Ticket | 24 px radius card, 14 px item line, 12 px notes, relative "7m ago", image on the right, purple "Accept" modal, cancelled tickets with a Ready button | Left status bar, #number 24 px, table/room 20 px, qty 24 px + item 20 px, notes 16 px bold, live mm:ss timer, overdue outline, full-width 56 px action; contrast 14.5:1 for ticket text (light) | `shots/before-1024-light.png` → `shots/m-1024-light.png` |
| Wide screens | One long list, newest first | Kanban board (New / Cooking / Ready) from 1280 px, sticky column headers; 2 columns at 700–1799 px; 1 column on phones | `shots/before-1280-light.png` → `shots/m-1280-light.png`, `shots/fn-realtime.png` |
| Cancelled | Greyed card with a Ready button | Red alert strip with STOP COOKING, Dismiss | `shots/fn-cancel-alert.png` |
| Phone header and nav | 32 px icons, no counters, FAB over Settings | 44 px icons, status counters, 64 px nav, FAB hidden | `shots/before-390-dark.png` → `shots/m-390-dark.png` |
| Dark mode | Blue/amber status inversion (purple used for "x items") | Status colours follow the contract: pending amber, accepted blue, cooking purple, ready green, served teal, cancelled red; dark background `#0F172A` | `shots/m-768-dark.png`, `shots/m-390-dark.png` |
| States | Plain "No orders" text | Skeleton, "Kitchen is clear" with Refresh, "No tickets match" with Clear filters, error with Retry | `shots/fn-skeleton.png`, `shots/fn-error-state.png` |

**Rules G mapping.** The kitchen opts into `shared/styles/dashboard-tokens.css` (`dashboardShell` class). Mapping documented at the top of the kd-* block in `KitchenDashboard.css`: `--kd-bg`=`--db-bg`, `--kd-card`=`--db-surface`, `--kd-text`=`--db-text`, `--kd-border`=`--db-border`, status chips/badges = `--db-status-*`. Radii 12 (cards) / 8 (controls) / pill (chips); type 12/14/16/20/24; tabular numbers on timers and counts. Kitchen-only additions: `--kd-late`, `--kd-warn`, `--kd-note-*` (overdue and note colours). Dark background still resolves to the legacy `#0F172A` because the old `.kitchen-dashboard.dark` rule wins; same darkness, one place to change later.

## 7. REQs filed to 01 (`requests/kitchen.md`)

| REQ | Sev | Summary | Status |
|---|---|---|---|
| kitchen-1 | P0 | Remove `chief` from `PUT /orders/:id`, `confirm-payment`, `send-bill`, `retry-bill` | open |
| kitchen-2 | P1 | `OrderContext` drops `notes`, `cancelledAt`, `cancellationReason`; the kitchen already renders them, so the cancel reason and order-level notes stay hidden until mapped (the dependent check is BLOCKED) | open |
| kitchen-3 | P1 | Orders fetch is "newest 100 of every status": old active tickets vanish after 100 orders | open |
| kitchen-4 | P2 | No `startedPreparingAt` / `readyAt` on orders (kitchen uses `updatedAt`) | open |
| kitchen-5 | P2 | Chief can cancel; product decision needed | open |
| kitchen-6 | P2 | Shared sound prompt overlaps bottom-left controls (kitchen padded the sidebar); consider moving it | open (low) |
| kitchen-7 | P2 | Kitchen imports waiter-owned `NotificationPanel` and `OrderDetailsModal` with hard-coded colours | open |
| kitchen-8 | P3 | Shared 42 px tap targets in MessagingPanel and the toast close button | open |

Session 01 is not running in wave 2: these are for the final pass.

## 8. Decisions

- Kanban only from 1280 px: below that, three columns are too narrow for 20 px item text; the single grid is sorted oldest first and the colour/badge carry the status.
- "Ready" uses an inline two-step confirm instead of a modal: faster for the kitchen and the server cannot undo a ready move, so an undo toast would be a lie.
- Start cooking is one tap (no confirm): it is the high-frequency action and low risk.
- Cancelled tickets are shown as an alert for 30 minutes unless dismissed; the Cancelled tab keeps the rest. Chosen so a cook cannot miss a cancel, without cluttering All forever.
- Done = delivered on the device's local day, because the hotel timezone is not exposed to the frontend.
- Removed food photos from tickets: not needed to cook and they cost a screen height per ticket. Easy to bring back if the user wants them.
- Sound handling stays in `NotificationContext` (no kitchen-only chime) to avoid double alerts.
- Thresholds (5/10, 15/25 minutes) are defaults in `kitchenClock.js` `OVERDUE_MINUTES`; no per-hotel setting exists.

## 9. Remaining issues

| Sev | Issue | Where | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P0 | Chief can edit order lines/quantities and call payment and bill endpoints | `backend/routes/staffRoutes.js:199-231` | Owned by 01 | REQ-kitchen-1 |
| P1 | Cancel reason / order notes not visible on tickets | `core/context/OrderContext.jsx:84-116` | Owned by 01 | REQ-kitchen-2 |
| P1 | Old active tickets can drop off after 100 orders | `OrderContext.jsx:63`, `orderController.js` `getOrders` | Owned by 01 | REQ-kitchen-3 |
| P2 | Time-in-status uses `updatedAt` | `models/order.schema.js` | Model change, 01 | REQ-kitchen-4 |
| P2 | Wake lock, audible sound, Safari/iOS and real-tablet behaviour unverified | n/a | No hardware / WebKit in the sandbox | Test on a wall tablet before rollout |
| P2 | 30-minute soak with 50+ tickets not run (7 minutes done) | n/a | Time | Re-run `longrun.mjs` with `MINUTES=30` |
| P2 | Sound prompt, Messaging panel and toast sizes are shared | see REQ-kitchen-6 and 8 | Owned by 01/07 | as filed |
| P3 | Kitchen cannot mark items unavailable (86'd) or per-item progress | n/a | New product behaviour | Ask the user whether the kitchen needs it; the endpoint (`menuController`) belongs to 02 |
| P3 | Client clock offset is measured once at load | `kitchenClock.js` | Good enough for a day-long session | Re-sync on reconnect |
| P3 | `loadStripe(undefined)` page error with no Stripe key | `BillingView.jsx:39`, `BookingPaymentModal.jsx:14` | Owned by 07 and 08 | Guard on missing key |

## Cleanup

`backend/scripts/_qa_tmp_kitchen.js` is deleted from the worktree. Background servers (supervisor, API 3004, web 5177, mongo 27105) were stopped at the end. The worktree, branch and commits stay for review. Suggested merge position unchanged: after 04 waiter.

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/kitchen.md`. Nothing was re-run. "Current status" is the status line now in the requests file.

### A. Counted FAILs

| Counted in | Check | Reason (observed) | Where | REQ | Current status |
|---|---|---|---|---|---|
| `api-probe.mjs` 85/89 (4 fail) | Chief `PUT /staff/orders/:id` with `{items:[{menuItem, quantity:40}]}`, expected 403 | 200: the chief can edit order lines and quantities | `backend/routes/staffRoutes.js:199-203` | REQ-kitchen-1 | done in 7388420 (chief removed from the authorize lists; tests/routePolicy.test.js) |
| same | Chief `POST /staff/orders/:id/confirm-payment`, expected 403 | 409: reaches the payment logic | `staffRoutes.js:208-231` | REQ-kitchen-1 | done in 7388420 |
| same | Chief `POST /staff/orders/:id/send-bill`, expected 403 | 502: tries to send the bill | `staffRoutes.js:208-231` | REQ-kitchen-1 | done in 7388420. `retry-bill` is in the same REQ but is not one of the 3 counted probes |
| same | "No stack trace in error responses" | The report calls it a dev-mode false positive: the API ran with `NODE_ENV=development`, which includes `stack`. The exact failing response was not recorded. Production stripping was verified by session 01's `prod-probe.mjs` (11/11) | `backend/middleware/errorHandler.js` | see REQ-public-8 | rejected as no change needed (development detail is intended) |
| `ux-spec.mjs` + `anon-check.mjs` 25/26 (1 fail) | "Dashboard not reachable after logout" | Harness artifact: the check re-injects the saved session on every navigation, so it cannot pass. The anonymous-context checks (2/2) cover the same requirement | `.qa-harness/kitchen/ux-spec.mjs` | none | not a product defect |
| `backend npm test` 135/137 (2 fail) | `bookingIntegrity` "companyless staff cannot read another booking" plus its parent test | Same 2 as baseline b97ed58: `Company` model not registered, 500 instead of 403 (booking routes, owned by 08). Run on the tip, log `.qa-harness/kitchen/backend-final.txt` | `backend/controllers/bookingController.js` | none | pre-existing in baseline 67759ec; fixed by 08 in 1b696df (platform report) |

### B. BLOCKED / not verified (the report's "Blocked / not verified" list plus dependent checks)

| Check | Reason (type) |
|---|---|
| Sound is audible | Environment limit: headless Chrome has no audio. The shared unlock prompt appears and clears the nav; unlock state was not asserted |
| Wake Lock | Code path added (`navigator.wakeLock`, re-acquired on `visibilitychange`); not observed in a browser run (bug 18, "code only") |
| 30-minute soak | Not run (time). 7 minutes with `JWT_EXPIRE=2m` (about 3 expiry cycles, 78 tickets) was run and passed 10/10 |
| Item-level status and 86'd items | Not built: the kitchen UI has no such feature and the backend has no per-item status (new product behaviour) |
| Production-mode probes (stack traces, CSP, rate limits) | Environment limit: `NODE_ENV=production` refuses to start with a `localhost` CLIENT_URL (the env validator needs HTTPS origins). Cross-reference only to session 01's `prod-probe.mjs` 11/11; not re-run |
| Order-level notes / cancel reason / cancel time banner on tickets | BLOCKED by REQ-kitchen-2: `OrderContext` dropped `notes`, `cancelledAt`, `cancellationReason` (`frontend/src/core/context/OrderContext.jsx:84-116`). Done in 4e446ea; browser re-check of the banner not run |
| Old active tickets after 100 orders | REQ-kitchen-3 (`OrderContext.jsx:63`, `orderController.js getOrders` limit 100): done in 7388420 + 4e446ea; a test covers a 10 h old preparing ticket |
| "Preparing for N m" time-in-status | REQ-kitchen-4: no `startedPreparingAt` / `readyAt` fields; kitchen falls back to `updatedAt`. Done in 7388420 + 4e446ea |
| Page errors | `loadStripe(undefined)` "Expected publishable key to be of type string" on every staff page (no Stripe key; `BillingView.jsx:39`, `BookingPaymentModal.jsx:14`), excluded from the "no page errors" checks. Fixed by 07 (9200176) and 08 (0f23262) |
| Safari/iOS, real touch hardware, real tablets | Environment limit: WebKit not available; no hardware |
| 30-minute / 50+ ticket soak, client clock offset measured once at load | Not run / accepted limitation (section 9) |

### C. Known defects named in the report, not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| Chief can cancel any order | `staffRoutes.js:191-197`, REQ-kitchen-5; policy question, not a defect | rejected: product decision, chief keeps cancel until the user decides |
| Shared sound prompt overlaps bottom-left controls | REQ-kitchen-6 (kitchen padded its sidebar by 80 px) | rejected: withdrawn by 05; a shared `--bottom-nav-height` on `:root` is a follow-up |
| Kitchen imports waiter-owned `NotificationPanel` and `OrderDetailsModal` with light-only colours | REQ-kitchen-7 | rejected for this run: cross-feature refactor |
| Shared sub-44 px targets: `.msg-header-btn` 42x42, `.msg-tab` 42 px, toast close 14x16 | `MessagingPanel.jsx/.css`, react-toastify, REQ-kitchen-8 | done in 4e446ea; not re-measured in the browser |
| Lint: 13 warnings, none from kitchen files | Baseline had 16 | not failures |
