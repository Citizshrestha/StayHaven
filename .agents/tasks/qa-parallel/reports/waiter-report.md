# Waiter dashboard QA + fix report (session 04, `waiter`)

Base commit `67759ec`. Branch `qa/waiter`, worktree `.worktrees\qa-waiter`, 7 commits on top of base. Nothing pushed or merged.
Harness, specs, logs and screenshots: `d:\hotel-booking-order-management-system\.qa-harness\waiter\` (gitignored). Screenshot paths below are relative to `.qa-harness\waiter\shots\`.

## 1. Environment

| Item | Value |
|---|---|
| API / web / DB | `http://localhost:3003` / `http://localhost:5176` / `stayhaven_qa_waiter` on an in-memory MongoDB replica set at `127.0.0.1:27104` (`mongodb-memory-server`, local only, confirmed by the seed scripts refusing any non-local URI) |
| Seed | Company A "Test Hotel" (owner, manager, chief, waiter A, waiter B, receptionist; tables T1-T4, room 101/102, 6 menu items incl. one sold out and one with an `<img onerror>` name; assignments A: T1,T2,room 101, B: T3,T4,room 102), Company A "Hotel 2" (same company, other hotel), Company B hotel with its own staff, one guest account. Throwaway seed scripts `backend\scripts\_qa_tmp_waiter*.js` were deleted at the end. |
| Browsers | Google Chrome (installed, Chromium engine) through Playwright 1.49.1 `channel: 'chrome'`, mobile emulation (`isMobile`, `hasTouch`, DPR 2). **WebKit is BLOCKED**: `npx playwright install webkit` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (TLS inspection on this machine) and no WebKit build exists on disk. iPhone-specific behaviour (390x844 WebKit, safe-area, 100vh) was checked only through the Chromium emulation and CSS reading. |
| Blocked by environment | Stripe/Cloudinary/SMTP keys are empty by design. Two `Expected publishable key to be of type string` page errors appear on every page load (Stripe `loadStripe`, outside the waiter folder). Sending a bill by e-mail cannot be executed (no SMTP), so it is covered by code reading only. |

| Check | Baseline (`67759ec`) | Final |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings (waiter folder: 0 problems) |
| `npm run build` | passes only with `VITE_API_BASE_URL=<origin>` and `ALLOW_LOCAL_API_IN_PROD_BUILD=true` (plain `npm run build` throws "VITE_API_BASE_URL must explicitly identify the deployed API", by design) | passes with the same variables |
| `npm run test:frontend` | 14/14 | 14/14 |
| `cd backend; npm test` | 133 tests, 131 pass, 2 fail (`bookingIntegrity.integration.test.js:32` "companyless staff cannot read another booking": `Schema hasn't been registered for model "Company"`, 500 instead of 403; not a waiter file) | 134 tests, 132 pass, 2 fail (same two) |
| `npm run test:pricing` | not run separately | 9/9 pass |

Final backend run: `npm test` 134 tests, 132 pass, 2 fail (the same two `bookingIntegrity` failures as the baseline, i.e. no new failure; +1 test is `waiter.integration.test.js`). `npm run test:pricing` 9/9.

## 2. Feature PASS/FAIL

"Pass" is observed in the browser or over HTTP. Fail counts list defects that still exist in files owned by other sessions (see section 7). Fixed defects are counted as pass after the fix.

| Area | Checks (~ scripted assertions) | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| 1 Login, role guard, logout | 10 | 9 | 0 | 0 | 1 INFO: the old access token still works after logout until it expires (stateless JWT). Chief, receptionist, manager are redirected to their own dashboards; anonymous goes to `/staff/login`; tampering `sessionStorage` role gives no API access (403). Refresh token is rejected after logout and after rotation. |
| 2 Assigned areas | 4 | 4 | 0 | 0 | Bug fixed: `GET /staff/table-assignments/my` always answered 400. The "My Assignment" card now shows T1, T2, room 101. The page still lists areas derived from orders only (no free/occupied state for tables without orders): product gap, see Remaining. |
| 3 Take an order | 18 | 18 | 0 | 0 | Table/room/takeaway, search, category chips, qty 1-50, notes, remove, totals, sold-out blocked, double tap gives exactly one order, note and names stored as text, reaches the kitchen dashboard live. **Modifiers/variants do not exist in the data model** (`MenuItem` has none), so that part of the prompt is N/A. |
| 4 Add to existing order / transfer / merge | 2 | 1 | 0 | 1 | A second order on an occupied table joins the open tab (verified). Transfer/merge is `POST /staff/dining/sessions/:id/transfer` with no waiter UI; not exercised. |
| 5 Order lifecycle | 14 | 11 | 3 | 0 | Serve from Ready works and the preparing card has no serve action. 3 fail: the server lets a waiter jump `pending -> delivered`, `pending -> preparing`, `preparing -> delivered` (REQ-waiter-3). |
| 6 Waiter calls | 11 | 11 | 0 | 0 | Guest presses "call waiter" on `/guest/table/<token>`: visible to waiter B in about 0.7-1.4 s, listed once, badge counts once, A acknowledges, B sees "Taken by ...", B cannot resolve it, A resolves, both lists clear, call missed while offline appears once after reconnect. Needed fixes in the panel, in `WaiterDashboard` and in the controller (section 5). Sound/vibration: played by `NotificationContext`, not executable headless (see REQ-waiter-8/9). |
| 7 Notifications | 5 | 4 | 1 | 0 | Panel showed 5 of 20 items and the header badge said 20: fixed. Location said "Location TBD": fixed. Still fail: the same event appears twice (REQ-waiter-10). |
| 8 Bill | 5 | 3 | 2 | 1 | Preview opens, no overflow, print window content is built from React-escaped DOM. **P1: preview/e-mail total differs from the server bill when the hotel has a service charge** (226.00 vs 248.60, REQ-waiter-18). E-mail HTML is not escaped (REQ-waiter-19). E-mail delivery BLOCKED (no SMTP). |
| 9 Settings | 5 | 5 | 0 | 0 | Drawer and modal open, no overflow, light/dark and auto-refresh persist, password change returns 200 and invalidates the old access and refresh tokens, login works with the new password. Changing it back to the original password answered 400 (reason not shown; not investigated). |
| 10 Resilience | 10 | 10 | 0 | 0 | Offline submit keeps the draft and shows Retry; retry after reconnect gives one order; a lost response then retry gives one order (idempotency key); header shows offline/reconnecting; backend restart: header goes to Live again and new orders arrive live; expired access token (`JWT_EXPIRE=20s`): silent refresh, no logout, no lost draft, one order. One **P1 found and worked around**: live updates died at token expiry (REQ-waiter-16). |
| Security (HTTP, 152 checks) | 152 | 140 | 12 | 0 | All 12 are in files owned by 01/02, filed as REQ-waiter-1..6. Detail in section 4. |
| Sockets | 8 | 8 | 0 | 0 | Join of another hotel's rooms, forged events, `acknowledge-call` injection and another user's id are all ineffective. |

## 3. Mobile matrix (Chromium emulation; WebKit BLOCKED)

Views: Orders, Tables, Bills, Calls, Alerts, Order form. "PASS" = no horizontal overflow (`scrollWidth <= innerWidth`) and no input below 16 px in the waiter-owned views and no tap target below 44 px in waiter-owned code. The remaining sub-44 px items are the shared order carousel controls (REQ-waiter-11), the Bills chips and search box (REQ-waiter-12) and the hidden messenger panel (REQ-waiter-13).

| Viewport | Result | Screenshots |
|---|---|---|
| 360x740 | PASS (overflow none) | `f360-dashboard-360.png`, `f360-calls-360.png`, `f360-orderform-360.png` |
| 375x667 | PASS | `f375-dashboard-375.png`, `f375-alerts-375.png`, `f375-orderform-375.png` |
| 390x844 | PASS | `f390-dashboard-390.png`, `f390-tables-390.png`, `f390-bills-390.png`, `f390-calls-390.png`, `f390-alerts-390.png`, `f390-orderform-390.png`, `after-ofm-cart-390.png` |
| 412x915 | PASS | `f412-dashboard-412.png`, `f412-orderform-412.png` |
| 768x1024 | PASS (bottom nav, header, single column) | `f768-dashboard-768.png`, `f768-orderform-768.png` |
| 1024x768 | PASS (sidebar and right panel docked) | `f1024-dashboard-1024.png` |
| 1440x900 | PASS | `f1440-dashboard-1440.png`, `f1440-orderform-1440.png` |
| 844x390 landscape | PASS, order form is full-screen (x=0, width 844, footer 105 px) | `f844x390-dashboard-844x390.png`, `orderform-landscape-844x390.png` |
| Dark mode | PASS at 390 and 1440 (no unreadable text) | `f390d-dashboard-390-dark.png`, `f1440d-dashboard-1440-dark.png` |

Other mobile checks: soft keyboard (viewport 390x480, last input focused): Submit stays at y=420..468, focused field visible (`keyboard-open-390x480.png`). Rotating with the form open keeps the draft. Esc closes the form and restores body scroll. Body scroll is locked while the sheet is open. `prefers-reduced-motion` CSS added, not visually tested. Slow 4G / 4x CPU and Lighthouse were **not run**. Timezone: all tests ran with `Asia/Kathmandu`; a UTC run was not done. Order times are formatted in the browser's timezone, not the hotel's (Remaining).

## 4. Security matrix (HTTP against the running API; script `api-security.mjs`, `multihotel.mjs`, `socket-sec.mjs`, `auth-session.mjs`)

| Actor | Call | Expected | Actual |
|---|---|---|---|
| anonymous, tampered JWT, `alg: none` JWT | orders list, create order, waiter calls | 401 | 401 (all) |
| waiter A | create order with `price`/`total` in the body | server price | 200/201, item price 200, total 200 (client values ignored) |
| waiter A | quantity 0, -1, 1.5, 51, 1e9, "2", null, "abc", NaN, Infinity | 400 | 400 (all) |
| waiter A | sold-out item; item of hotel B; custom open-price line; `{"$gt":""}` as menuItem / hotelId; 51 lines; notes 501 chars; item note 201 chars; invalid orderType / tableId / unknown table | 400/403/404 | as expected (all) |
| waiter A | extra fields `status`, `paymentStatus`, `orderBy`, `hotel`, `_id`, `isGuestOrder` | ignored | ignored |
| waiter A | 5 parallel submits with the same idempotency key | 1 order | 1 order (201 + 4x200) |
| waiter A (Company A) | read/create/update/delete/pay/bill orders of Company B | 403/404 | 403/404 (all) |
| waiter A (hotel 1) | read, create, change status of orders of hotel 2 of the same company | 403 | **200/201 (FAIL, REQ-waiter-1)** |
| guest token | `GET /staff/orders?hotelId=` of any hotel, `/staff/menu-items`, `/tables`, `/staff/me` | 401/403 | **200 with 36 orders incl. customer names, phones (FAIL, REQ-waiter-1/2/6)** |
| waiter A | `GET /tables?hotelId=<Company B>` | 403 | **200 incl. QR `uniqueToken` (FAIL, REQ-waiter-2)** |
| waiter A | `POST/PUT/DELETE /staff/menu-items`, bulk-toggle, table create/update/delete/QR, staff register/invite/manage, table assignment create/list/delete, reception endpoints, dining discount/void/refund/settings, superadmin, seed | 403 | 403 (all) |
| waiter A | `PATCH /tables/:id/status` to `maintenance` | 403 | 200 (REQ-waiter-5) |
| receptionist | `PUT /staff/orders/:id/status` | 403 | 403 |
| waiter A | status jumps `pending -> delivered`, `pending -> preparing`, `preparing -> delivered` | 400/403 | **200 (FAIL, REQ-waiter-3)** |
| waiter A | invalid status, status as object, bad order id, backward move, cancel of delivered, cancel without reason | 400/404 | 400/404 (all) |
| chief x2 | two parallel `confirmed` | one 200 | 200 + 409 in one run, 200 + 200 in another (same-status update accepted, REQ-waiter-3) |
| waiter A | `GET /staff/orders?search=(((` | 200/400 | **500 with regex engine message (REQ-waiter-4)** |
| waiter A / B / chief / guest | waiter calls list, history, create, acknowledge, resolve across hotels; guest role; mass assignment; bad priority/type; description 501 chars | 403/400 | 403/400 after the fix (before: 200 cross-tenant read and write) |
| waiter B | acknowledge a call taken by A: 409; resolve it: 403; A resolves: 200; resolve again: 409 | as listed | as listed |
| manager A | table assignments: other hotel list/assign/delete, staff of another hotel, NoSQL waiter id, 500 tables, bad shift, bulk with one bad entry | 403/404/400 and old data kept | as expected after the fix (before: `activeProperty` was undefined, so the hotel came from the request) |
| waiter A | socket join of hotel B rooms, `join-hotel`/`join-role` for B, forged `new-order`, `order-status-updated`, `new-waiter-call`, `notification`, `acknowledge-call` into A/B rooms, other user id in `join-role` | nothing received | nothing received |
| waiter, logout and password change | refresh after logout / rotation; old access + refresh after password change | 401 | 401 (old access token still valid after a plain logout: INFO) |
| XSS | `<script>` in customer name, `<img onerror>` as menu item, `<b>` in notes | text, no dialog | names and notes are stripped of tags server-side, menu item name renders as text in order form, waiter cards, kitchen; 0 dialogs in every run. E-mail HTML is not escaped (REQ-waiter-19). |

## 5. Bugs fixed

| # | Sev | File:line (base) | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | `backend/controllers/waitercall.controller.js` (all handlers) | `hotelId` taken from query/body without checking the user works there: any staff, and any guest token, could list, create, acknowledge and resolve calls of any hotel | new `services/waiterScope.js` (`resolveHotelId`): assigned hotel, or company hotel for owner/manager; staff roles only | `api-security.mjs`, `waiter.integration.test.js` | 4008b74 |
| 2 | P0 | `backend/controllers/tableAssignment.controller.js` | used `req.user.activeProperty`, which does not exist on the User document: `/my` always 400, lookup/assign/list/delete/bulk used the client's hotel id; waiter id, tables, shift unvalidated; bulk deleted everything before validating | scoped by `resolveHotelId`, waiter must belong to the hotel, input validated, bulk validates first, name taken from the user record | tests + UI "My Assignment" card | 4008b74 |
| 3 | P1 | `waitercall.controller.js` acknowledge/resolve | read-then-save race: two waiters could both acknowledge; anybody could resolve another waiter's call; resolved calls could be resolved again | atomic `findOneAndUpdate`, 409 on conflict, resolve limited to the assignee or a supervisor | race test (one 200, one 409) | 4008b74 |
| 4 | P2 | `waitercall.controller.js` list | sorting the priority strings puts "medium" above "high" | rank sort | unit test | 4008b74 |
| 5 | P1 | `WaiterCallsPanel.jsx` | duplicate call rows (event arrives twice), second beep, no refetch after reconnect, `alert()` on error, no "taken by" | id de-duplication, silent refetch on reconnect, toast, "Taken by X", Resolve disabled for other waiters, 44 px buttons, contrast | `calls-flow.mjs` | 139c8b7 |
| 6 | P1 | `WaiterDashboard.jsx` | Calls badge was +1 per event (so 2 per call) and ignored calls that were already open | re-sync the count from the server after each call event | `calls-flow.mjs` | c1bdfbe |
| 7 | P1 | `useSocketTokenKeepAlive.js` (new) | socket `auth` captured the login token; server disconnects at expiry and socket.io does not retry: no live orders or calls after 1 h | function-valued `socket.auth` with refresh, reconnect after `io server disconnect` | `token-expiry.mjs` (`JWT_EXPIRE=20s`) | 139c8b7 |
| 8 | P1 | `OrderFormModal.jsx` | sold-out items could be added (rejected only at submit), no cap on quantity, fast double tap raced the `submitting` state, lost draft message unclear, free-text table field while tables load, inputs 13-14 px | disabled "Sold out", 1-50 stepper, `submittingRef`, Retry with the same idempotency key, locked field while loading | `order-flow.mjs`, `resilience.mjs` | 10a9681 |
| 9 | P1 | `OrderCard.jsx:205-240` | `confirmed` and `cancelled` had no status style; cancelled orders said "Being prepared"; statuses did not follow the colour contract | amber/blue/indigo/green/teal/red with text labels, cancelled/confirmed notes | `lifecycle.mjs`, `b390-dashboard-390.png` | f0d4fd6 |
| 10 | P2 | `OrderDetailsModal.jsx:87` | `dineIn` orders were labelled "Takeaway" (`"dinein"` does not contain `"table"`) | match `dine` | screenshot `lifecycle-details-390.png` | f0d4fd6 |
| 11 | P2 | `WaiterDashboard.jsx` drawer | `bg-black bg-opacity-50`: Tailwind 4 has no `bg-opacity-*`, so the menu backdrop was solid black | `bg-black/50` | screenshot `settings-open-390.png` | c1bdfbe |
| 12 | P2 | `DashboardContent.jsx` | "Preparing" tab hid `confirmed` orders; empty state had no guidance | tab shows confirmed + preparing, empty states with a "Show all orders" action | screenshots | c1bdfbe |
| 13 | P2 | `NotificationPanel.jsx` | only 5 items passed in (badge said 20), title clipped to "Order #70 co...", "Location TBD" for saved notifications | all items, wrapped text on phones, location from `payload` | `f390-alerts-390.png` | c1bdfbe |
| 14 | P2 | `AssignedAreas.jsx` | the waiter's own assignment was hidden when no orders existed | card moved above the list | `final-tables-390.png` | 2bea1b5 |
| 15 | P1 | `WaiterShell.css` (workaround) | the "Sound alerts are paused" button (core) covers the phone bottom nav | lifted above the nav under `.waiter-shell` only | `mobile-audit.mjs` (`soundPromptCoversNav: clear`) | c1bdfbe |

Encoding note: an intermediate edit of `OrderFormModal.jsx` through Windows PowerShell corrupted the emoji in the file; it was repaired and every changed file was compared against `HEAD` for lost or BOM characters (`charcheck.mjs`), none remain.

Regression tests added: `backend/tests/waiter.integration.test.js` (1 test, about 60 assertions: scoping, guest role, race, priority order, assignment validation, bulk atomicity). It is picked up by `npm test` (`tests/*.test.js`), no `package.json` change needed. Run alone: `cd backend; node --test --test-concurrency=1 tests/waiter.integration.test.js`.

## 6. UX / visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| Phone shell | no header; hamburger inside the page title; six bottom tabs (Dashboard, Tables, Bills, Calls, Messages, Alerts) with 10 px labels; fixed button at `bottom: 80px` | sticky header (menu, hotel name, Live / Reconnecting / Offline, alerts bell with count), five tabs (Orders, Tables, Bills, Calls, Alerts) with 12 px labels, `aria-current`, safe-area padding, floating "New order" above the nav; messenger stays on its floating button | `before-dashboard-375.png` / `f375-dashboard-375.png` |
| Orders | title + subtitle + full-width refresh button + filters take about 270 px; images 200 px; colours per status not on the contract | one row (title + icon refresh), chips 44 px, images 140 px, status chips with the contract colours | `before-dashboard-390.png` / `f390-dashboard-390.png` |
| Order form | padded card with 92vh scroll, 13-14 px fields, 28 px steppers, total inside the scroll, sold-out items look available | full-screen sheet on phones (and landscape phones), sticky search + category chips, 16 px fields, 44 px steppers, sticky footer with item count, total and Submit/Retry, "Sold out" badge, inline offline message | `before-orderform-390.png` / `after-ofm-cart-390.png` |
| Calls | 100vh container, alert() on errors, no owner shown | full-width 44 px actions, "Taken by ...", reconnect text | `f390-calls-390.png` |
| Alerts | 3-column card squeezed, text cut | 2-column card with the actions on their own row | `before-alerts-390.png` / `f390-alerts-390.png` |
| Menu drawer | solid black backdrop | 50% backdrop, floating buttons hidden while open | `settings-drawer-390.png` |

Shared UI contract mapping (rules G) applied inside the waiter folder: radius 8 (inputs, buttons), 12 (cards), 16 (sheet/modal); buttons 44 px on touch with a visible `:focus-visible` ring (`WaiterShell.css`, `OrderFormModal.css`); type 12/14/16/20/24; tabular numbers for totals and badges; status colours amber/blue/indigo/green/teal/red with text; feedback through toasts; errors show the server message; money is still `Rs 1,234` in the order form and `Rs. 1,234` in the details modal (two formatters remain, Remaining). Hotel-admin tokens were not imported (cross-feature import rule).

## 7. REQs filed to 01

All 19 are in `.agents\tasks\qa-parallel\requests\waiter.md`, status open at the time of writing.

| REQ | Sev | Target | Summary |
|---|---|---|---|
| 1 | P0 | `orderController.js assertHotelAccess` + status filters | guests and other-hotel staff of the same company can read/create/change orders |
| 2 | P0 | `hotelTableController.js getTables` | cross-tenant list of tables with QR tokens, also for guests |
| 3 | P1 | `orderController.js updateOrderStatus` | waiter can skip kitchen states; same-status update accepted |
| 4 | P2 | `orderController.js getOrders` | unescaped regex search gives 500 |
| 5 | P2 | `hotelTableController.js updateTableStatus` | waiter can set `maintenance` |
| 6 | P2 | `menuController.js getMenuItems` | menu readable across tenants and by guests |
| 7 | P2 | hotel-admin (02) | no UI for table assignments |
| 8 | P1 | `NotificationContext.jsx` | sound-unlock prompt covers the phone nav (workaround in place) |
| 9 | P1 | `NotificationContext.jsx`, `guestController.js` | call event emitted twice, count and beep doubled (workaround in place) |
| 10 | P2 | `NotificationContext.jsx` | duplicate notifications |
| 11 | P2 | `ItemCarousel.jsx` | controls below 44 px |
| 12 | P2 | `TableBillsPanel.jsx` | chips 40 px, search 15 px |
| 13 | P2 | `StaffSettings.jsx`, `MessagingPanel.jsx` | small targets, empty avatar |
| 14 | P2 | `guestController.js callWaiter` | one tap can create two calls |
| 15 | P3 | `StaffLogin.jsx` | 14 px login inputs; Stripe page error |
| 16 | P1 | `SocketContext.jsx` | live updates stop at token expiry (workaround in place) |
| 17 | P2 | `staffController.js` | single refresh token per user |
| 18 | P1 | `BillPreviewModal.jsx`, `sendBillToCustomer` | printed/e-mailed bill differs from the server bill |
| 19 | P2 | `notificationService.js` | bill e-mail HTML not escaped |

## 8. Decisions

- Fixed waiter calls and table assignments in the backend because they are waiter-only controllers; added `services/waiterScope.js` as a new file so nothing shared was edited.
- Guest/other-tenant holes in `orderController.js`, `hotelTableController.js`, `menuController.js` were only reported (REQ), not patched, because they belong to 01/02.
- Workarounds inside the waiter folder for three core defects (sound prompt, call count, socket token) were kept small and documented so they can be deleted when REQ-8, 9 and 16 land.
- Resolve on a call taken by another waiter is now refused (403); supervisors can still close it. Chosen because the prompt asks that another waiter "sees it as taken". If the hotel wants any waiter to be able to take over, remove the check in `resolveWaiterCall`.
- Messages tab removed from the phone bottom nav to meet the five-item limit; messaging stays on the floating messenger button and in the drawer.
- Right panel stays hidden below 1024 px: its three blocks (new order, assigned areas, last notifications) already exist as the floating button, the Tables tab and the Alerts tab. CSS overflow and tap sizes in `RightPanel.css` were fixed.
- A 20 s token lifetime was used for the expiry test instead of 2 m, same code path, shorter run. `.env` was restored to 1 h.
- No dependency was added. Playwright stays in the gitignored harness.

## 9. Remaining issues

| Sev | Issue | Where | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P0 | REQ-1, REQ-2 (guest and cross-hotel access) | `orderController.js`, `hotelTableController.js` | not my files | see REQ |
| P1 | REQ-3 waiter can skip kitchen states | `orderController.js` | not my file | role transition table |
| P1 | REQ-18 bill totals differ from the server | `BillPreviewModal.jsx`, `orderController.js` | shared/01 | use the session totals |
| P1 | REQ-8, 9, 16 (sound prompt, call events, socket token) | core | workarounds in place, root cause in core | see REQ |
| P2 | "Assigned Areas" lists only areas that have orders; no free / occupied / bill-requested state per assigned table | `AssignedAreas.jsx` | needs new product behaviour (table status feed per waiter) | list the waiter's assigned tables from `/tables` + assignment with live status |
| P2 | Transfer / merge table has no waiter UI | waiter folder | new feature | add a "Move table" action calling `/staff/dining/sessions/:id/transfer` |
| P2 | Two money formatters (`Rs 1,234` vs `Rs. 1,234`), times use the browser timezone | `OrderFormModal.jsx`, `OrderDetailsModal.jsx`, `OrderCard.jsx` | would touch many strings | shared formatter + hotel timezone (01) |
| P2 | Change password back to the previous password answered 400 (reason not read) | `staffController.js changePassword` | not investigated | check for a reuse rule and show the message |
| P3 | WebKit, slow-4G/CPU throttle, Lighthouse, UTC run, reduced-motion visual check, sound/vibration autoplay prompt behaviour not executed | environment / time | WebKit download blocked; others skipped | run on a machine with WebKit |
| P3 | Order images are one fixed stock photo for every item without an image | `OrderFormModal.jsx`, `ItemCarousel.jsx` | data problem (menu has no images) | upload menu images or show an initial letter tile |

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/waiter.md` (and, for later fixes, the guest and platform reports). Nothing was re-run. "Current status" is the status line now in the requests file.

### A. Counted FAILs (section 2: Order lifecycle 3, Notifications 1, Bill 2, Security 12 = 18)

| # | Counted in | Check | Reason (observed) | Where | REQ | Current status |
|---|---|---|---|---|---|---|
| 1 | Order lifecycle | Waiter `pending -> delivered` | Server returned 200; waiter may skip kitchen states | `backend/controllers/orderController.js:406-520` (`updateOrderStatus`) | REQ-waiter-3 | done in 4bbfa80 |
| 2 | Order lifecycle | Waiter `pending -> preparing` | 200 | same | REQ-waiter-3 | done in 4bbfa80 |
| 3 | Order lifecycle | Waiter `preparing -> delivered` | 200 | same | REQ-waiter-3 | done in 4bbfa80 |
| 4 | Notifications | Same order event shown twice in Alerts ("Order #70 confirmed"), unread badge counts both | Socket event plus the saved server notification are not merged | `frontend/src/core/context/NotificationContext.jsx` (`addNotification`, initial load) | REQ-waiter-10 | done in 4977655 |
| 5 | Bill | Print Bill preview/e-mail total differs from the server bill when the hotel has a service charge: preview "GRAND TOTAL 226.00" vs server `serviceCharge 20, tax 28.6, total 248.6` (takeaway order #29, Rs 200, `serviceChargeRate = 10`) | Client and `sendBillToCustomer` compute `subtotal * 0.13` with `serviceCharge = 0`; also ignore discounts, other orders on the table, part payments; e-mail prints a fixed "VAT (13%)" | `frontend/src/shared/components/BillPreviewModal.jsx:27-31`, `orderController.js:1279-1283` | REQ-waiter-18 | done in 4bbfa80 + 078f6d7 + 4977655 for the per-order bill; whole-tab printing is an open product decision |
| 6 | Bill | Bill e-mail HTML not escaped | `hotelName`, `hotelAddress`, `location`, `customerName`, `item.name` interpolated raw (e.g. menu item named `<img src=x onerror=...>`) | `backend/services/notificationService.js:290-370` (`generateBillEmailHTML`) | REQ-waiter-19 | done in 4bbfa80 |
| 7-18 | Security (HTTP, 152 checks, 140 pass, 12 fail) | See section B | See section B | See section B | REQ-waiter-1..6 | see section B |

### B. Security: the 12 counted failures

The report states the count (12 of 152) and that all 12 are in files owned by 01/02, filed as REQ-waiter-1..6. It does not list the 12 assertions. The rows of the section 4 matrix that are marked FAIL, or show a result other than expected, are below with their observed result. They add up to 14 individual calls, not 12 (the matrix groups several calls per row), so the exact assertion-to-count mapping is reason not recorded by the session - needs re-run of `api-security.mjs` / `multihotel.mjs`.

| Call (actor) | Expected | Actual | Where | REQ | Current status |
|---|---|---|---|---|---|
| Waiter A (hotel 1) reads orders of hotel 2, same company | 403 | 200 | `orderController.js:30-60` (`assertHotelAccess`) | REQ-waiter-1 | done in 4bbfa80 |
| Waiter A creates an order in hotel 2 (`POST /staff/create-order`) | 403 | 201 | same | REQ-waiter-1 | done in 4bbfa80 |
| Waiter A changes status of a hotel 2 order | 403 | 200 | `orderController.js:436-445` (`updateOrderStatus` hotelFilter) | REQ-waiter-1 | done in 4bbfa80 |
| Guest token `GET /staff/orders?hotelId=` | 401/403 | 200, 36 orders with customer names and phones | `assertHotelAccess` (company check only ran when `userCompany` set) | REQ-waiter-1 | done in 4bbfa80 + 2e4e442 (guest tokens 403 on all `/api/v1/staff/*`) |
| Guest token `GET /staff/me` | 401/403 | 200 | staff routers only called `protect` | REQ-waiter-1 | done in 2e4e442 |
| Guest token `GET /staff/menu-items` | 401/403 | 200 | `menuController.js getMenuItems` | REQ-waiter-6 | guest part done in 2e4e442; tenant check owned by 02 (forwarded) |
| Guest token `GET /tables` | 401/403 | 200 | `hotelTableController.js getTables` | REQ-waiter-2 | rejected for 01, owned by 02; fixed on main by 02 in 0ca9e0c (guest/superadmin 403 in getTables/getRooms) per the guest requests file |
| Waiter A `GET /tables?hotelId=<Company B>` | 403 | 200 including QR `uniqueToken` | `hotelTableController.js getTables` | REQ-waiter-2 | same as above |
| Waiter A `PATCH /tables/:id/status` to `maintenance` | 403 | 200 | `hotelTableController.js updateTableStatus` | REQ-waiter-5 | rejected for 01, owned by 02; fix status not recorded in the requests file |
| Waiter A status jumps `pending -> delivered`, `pending -> preparing`, `preparing -> delivered` | 400/403 | 200 (x3) | `orderController.js:406-520` | REQ-waiter-3 | done in 4bbfa80. These 3 are also counted in the Order lifecycle row, so they may be double-counted in the 12 - not recorded |
| Waiter A `GET /staff/orders?search=(((` | 200/400 | 500 "Regular expression is invalid: missing closing parenthesis" | `orderController.js:348-375` | REQ-waiter-4 | done in 4bbfa80 |
| Two chiefs set `confirmed` at once | one 200 | 200 + 409 in one run, 200 + 200 in another (same-status update accepted, event and audit log fire twice) | `orderController.js:406-520` | REQ-waiter-3 | done in 4bbfa80 (same status = 200 no-op `unchanged:true`; concurrent = 409) |

### C. INFO / questionable results inside "Pass" counts

| Item | Reason | Status |
|---|---|---|
| Login: old access token still works after logout until it expires | Stateless JWT (INFO, counted as pass) | by design; platform later made logout revoke the refresh token (2e4e442) |
| Settings: changing the password back to the original answered 400 | reason not recorded by the session (the 400 message was not read; a reuse rule is suspected, not confirmed) - needs re-run | open, `staffController.js changePassword` |
| Calls: guest QR creating two calls 0.6 s apart in two runs | `guestController.js callWaiter` had no de-dupe, REQ-waiter-14 | fixed by session 07 in 1c839b5 (60 s per-table de-dupe, single emit) per the guest report |
| Calls: `new-waiter-call` emitted twice (badge +2, beep twice) | `guestController.js:594-595,667-668` plus `NotificationContext.jsx:462-480`, REQ-waiter-9 | frontend part done in 4977655; emit fixed in 1c839b5 |
| Page error `Expected publishable key to be of type string` (x2 on every page load) | Stripe `loadStripe` with no key; outside the waiter folder; environment (no Stripe key) | fixed by 07 (9200176) and 08 (0f23262) |

### D. BLOCKED / not run

| Area | Check | Reason (type) |
|---|---|---|
| Add to existing order / transfer / merge (Blocked 1) | Transfer / merge via `POST /staff/dining/sessions/:id/transfer` | No waiter UI for it; not exercised (product gap) |
| Bill (Blocked 1) | E-mail delivery of the bill | Environment limit: no SMTP; code reading only |
| Waiter calls | Sound and vibration | Played by `NotificationContext`; not executable headless |
| Browsers | WebKit / iPhone 390x844 (safe-area, 100vh) | Environment limit: `npx playwright install webkit` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (TLS inspection); only Chromium emulation and CSS reading |
| Performance | Slow 4G / 4x CPU throttle, Lighthouse | Not run (no reason recorded beyond time) |
| Timezone | UTC run | Not run; all tests ran with `Asia/Kathmandu` |
| Motion | `prefers-reduced-motion` visual check | CSS added, not visually tested |
| Modifiers / variants | Order form modifiers | N/A: `MenuItem` has none in the data model |
| Assigned Areas | Free/occupied/bill-requested state per assigned table | New product behaviour, not built (page lists areas derived from orders only) |

### E. Baseline failures still in the "Final" column

| Check | Reason | Status |
|---|---|---|
| `cd backend; npm test` 132/134 (2 fail) | `bookingIntegrity.integration.test.js:32` "companyless staff cannot read another booking": `Schema hasn't been registered for model "Company"`, 500 instead of 403; plus its parent test | pre-existing in baseline 67759ec; not a waiter file. Platform report records the later fix (1b696df, `bookingController.js:5`) |
| Mobile: remaining sub-44 px targets | Shared order carousel controls (REQ-waiter-11, done 4977655), Bills chips and search 15 px (REQ-waiter-12, done 4977655), hidden messenger panel (REQ-waiter-13, partly done; StaffSettings initials avatar not done) | see REQs |
