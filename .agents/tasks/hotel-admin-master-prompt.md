# Hotel Admin: QA + Fix Master Prompt

Sources: five audit reports in `.agents/tasks/hotel-admin-audit/` (01 dashboard/rooms, 02 restaurant/orders/billing, 03 QR codes, 04 stock and other pages, 05 cross-cutting). All five were present and complete. Findings come from reading the code only. Nothing was run.

## Part 1: Inventory and top risks

### Hotel-admin pages (single route `/hoteladmin-dashboard`, hash sections)

| Section | Hash | Component (`frontend/src/features/staff/hotel-admin/pages/`) | Data source | State |
|---|---|---|---|---|
| Shell, sidebar, theme, logout | — | `HoteladminDashboard.jsx`, `components/Sidebar.jsx` | — | Logout doesn't revoke the session. Drawer has no a11y. |
| Dashboard | `#dashboard` | `DashboardHome.jsx` | `/api/v1/reception/reports/overview`, `/billing/summary`, `/api/v1/seed/hotel-admin-data/:hotelId` | Real, but company-wide instead of per-property |
| Rooms | `#rooms` | `RoomManagement.jsx` | `/api/v1/rooms` | Real. Add Room fails with the default type. |
| Restaurant (Menu / Tables / Kitchen tabs) | `#restaurant` | `RestaurantManagement.jsx` | `/api/v1/staff/menu-items*`, `/api/v1/tables*` | Real. Duplicates Table QR with the same bugs. |
| Table QR Codes | `#tables` | `TableManagement.jsx` | `/api/v1/tables*` | Real. QR image, download and print are broken. |
| Room QR Codes | `#roomqr` | `RoomQRManagement.jsx` | `/api/v1/rooms*` | Real. Regenerate doesn't invalidate the old QR. |
| Orders | `#orders` | `OrderManagement.jsx` | `/api/v1/staff/orders*` | Real. Polls every 30 s with no socket. Capped at 100 rows. |
| Stock / Inventory | `#stock` | `StockManagement.jsx` | `services/stockApi.js` (in-memory mock) | Mock. There's no backend. |
| Staff Management | `#staff` | `StaffManagement.jsx` | `/api/v1/staff/manage/*`, `/staff/invite` | Real and well scoped |
| Billing & Payments | `#billing` | `BillingManagement.jsx` | Hard-coded `MOCK_*` constants | Mock. Real endpoints exist but aren't used. |
| Loyalty Points | `#loyalty` | `LoyaltyManagement.jsx` | `/api/v1/reception/guests` | Real. Truncated at 100 rows, company-wide. |
| Reports & Analytics | `#reports` | `ReportsAnalytics.jsx` | `/reception/reports/overview`, `/billing/summary`, `/dashboard/revenue-split` | Real. Company-wide, some values fabricated. |
| Notifications | `#notifications` | `NotificationsManagement.jsx` | `NotificationContext` + `/api/v1/staff/notifications` | Real. Clear is client-only. |
| Staff login | `/staff/login` | `features/public/auth/staff/StaffLogin.jsx` | `POST /api/v1/staff/login` | Manager and admin users get redirected to 404 routes |

### Top bugs and risks

| # | Sev | Location (file:line) | Issue |
|---|---|---|---|
| 1 | Critical | `Backend/controllers/roomController.js:40`, `hotelTableController.js:42`, `menuController.js:73`, `orderController.js:54` | `assertHotelAccess` skips the company check when the role is `owner`, so any owner can read and write any hotel's rooms, tables, menu, orders and QR codes. A null `company` also skips it. |
| 2 | Critical | `Backend/controllers/hotelTableController.js:158-200` | `GET /api/v1/tables` has no access check. Any token can read any hotel's table tokens and QR codes, which is enough to place orders. |
| 3 | Critical | `Backend/controllers/seedHotelAdminData.js:23,53`, `routes/seedRoutes.js:33` | Seed with `?clear=true` wipes rooms, orders, bookings and invoices of any hotel. There's no ownership check and no production block. The button shows in production (`DashboardHome.jsx:150-155`). |
| 4 | Critical | `RoomManagement.jsx:51,431-435` vs `Backend/models/room.schema.js` | Room type values `Standard/Deluxe/Suite` aren't in the backend enum. Add Room with the defaults returns 400, and view/edit shows the wrong type. |
| 5 | Critical | `TableManagement.jsx:336,346,349,446,449,460`; `RestaurantManagement.jsx:451,463,464,610,611,620` | These use `qrCodeData` (a URL) as the image source. Thumbnail, view, download and print are broken. |
| 6 | Critical | `services/stockApi.js:28-75` | Stock is an in-memory mock: nothing persists, and it's shared across users in the same tab. |
| 7 | High | `menuController.js:50`; `orderController.js:38`; `roomController.js:22` | `admin` means "all-powerful" for menu but "forbidden superadmin" for orders and rooms. The `admin` role gets 403 on Rooms, Orders and Room QR. |
| 8 | High | `staffRoutes.js` menu/cancel `authorize(...)`, `receptionRoutes.js:319,405,710`, `seedRoutes.js:33`, `canManageTables` | `hoteladmin` is allowed by the route guard (`App.jsx:344`) but rejected by the backend. Mutations, Dashboard, Reports and Loyalty all return 403. |
| 9 | High | `Backend/controllers/staffController.js:252-274` | Login sends `admin` to `/dashboard` and `manager` to `/manager-dashboard`. Neither route exists, so both land on a 404. |
| 10 | High | `HoteladminDashboard.jsx:84` → `core/context/StaffAuthContext.jsx:117-137` | Logout never calls `POST /api/v1/staff/logout`, so the refresh and access cookies stay valid. |
| 11 | High | `hotel-admin/services/{roomApi,tableApi,menuApi,orderApi,staffApi}.js:10-22`; `StaffAuthContext.jsx:46-59` | These services use separate axios instances with no 401 refresh. A reload restarts the 55-minute timer, so pages break about 1 hour after login. |
| 12 | High | `Backend/controllers/receptionController.js:22-27,1318,1427,929` | Dashboard, Reports and Loyalty aggregate across the whole company and ignore the active hotel. |
| 13 | High | `BillingManagement.jsx:45-75,135-150` | Billing shows fabricated data. Print uses `document.write` without escaping, which becomes XSS once real data is wired in. |
| 14 | High | `TableManagement.jsx:214`, `RoomQRManagement.jsx:159` | "Regenerate" sends `regenerate=false`, so a leaked QR can't be revoked. Tables also have no QR deactivate control. |
| 15 | High | `TableManagement.jsx:391-392`, `hotelTableController.js:80-140,135,280,416` | Table capacity, min spend and batch validation are missing or coerced silently. Create ignores the Status field. Batch reports false success and has an off-by-one limit. |
| 16 | High | `roomController` create/update, `allowedFields :489-492` | No server-side validation (negative price, 0 guests, unlimited text). `rating` is mass-assignable. Manual `occupied`/`available` breaks booking integrity. |
| 17 | High | `StockManagement.jsx:214-224,433` | Adjust has no in-flight guard, so a double-click applies the change twice. |
| 18 | High | `shared/components/BillPreviewModal.jsx:28,83,141-145` | VAT is hard-coded at 13% and ignores the session totals. "Test Hotel" placeholders print on real receipts. The guest-PII `console.log` runs on every send. |
| 19 | Medium | `orderController.js:550,1462` | `cancelOrder` and `retryBillSending` call an asyncHandler without `next`, so every error becomes a 500. A non-string `reason` crashes (`:425,509,537`). |
| 20 | Medium | `OrderManagement.jsx:107-133,409`; `components/ui/Modal.jsx` | No socket refresh. KPIs come from the latest 100 orders only. The detail modal is stale and closes before the request finishes. Stacked modals can leave the body scroll-locked. |
| 21 | Medium | `RestaurantManagement.jsx:333,647`, `HoteladminDashboard.jsx:103`, `Backend/middleware/upload.js` | An item priced 0 can't be edited and saved. The UI allows prep times outside the schema's 5–120. The Kitchen "Go to Orders" button is dead. Multer errors return 500. |
| 22 | Medium | `HoteladminDashboard.jsx:101,109` + `RoomManagement.jsx:101` | An inline `onCount` callback makes Rooms re-fetch with a skeleton flash on every parent render. |
| 23 | Medium | `shared/components/ConfirmDialog.jsx:63-110` | No dialog role, no Esc, no focus trap, no portal, and off-system tokens. It's used by every destructive action. |
| 24 | Medium | `utils/csv.js` | CSV formula injection: cells starting with `= + - @` aren't neutralized. |
| 25 | Medium | `orderController.js:369-372` | Unescaped `$regex` search: `search=(` returns 500 and opens a ReDoS risk. |

---

## Part 2: The master prompt

````markdown
# ROLE
You are a senior QA + full-stack fix engineer. Test EVERY hotel-admin page of the StayHaven hotel-booking/order-management app end to end in a REAL browser (Playwright, Chromium) against the RUNNING app. Do not just read code. Then fix what you find with minimal, focused changes that keep the existing hotel-admin design system. Re-test after each fix. Finish with the report in section 12.

Repo root: d:\hotel-booking-order-management-system  (Windows, PowerShell)
Frontend: d:\hotel-booking-order-management-system\frontend   (React 19 + Vite 7, Node ^20.19 or >=22.12)
Backend:  d:\hotel-booking-order-management-system\Backend    (Express + Mongoose, ESM)
Hotel-admin feature root: d:\hotel-booking-order-management-system\frontend\src\features\staff\hotel-admin\
  pages\        HoteladminDashboard.jsx (shell), DashboardHome, RoomManagement, RestaurantManagement, TableManagement,
                RoomQRManagement, OrderManagement, StockManagement, StaffManagement, BillingManagement,
                LoyaltyManagement, ReportsAnalytics, NotificationsManagement
  components\Sidebar.jsx, components\ui\ (Modal, Button, IconButton, Field inputs, Badge, StatCard, States,
                PageHeader, FilterTabs/Segmented, Pagination, Table, ha-ui.css)
  styles\hotel-admin-tokens.css (--ha-* tokens; dark mode via `.dark .hotelAdminShell`), styles\shell.css
  services\ roomApi, tableApi, menuApi, orderApi, staffApi (own axios instances), stockApi (in-memory mock)
  hooks\useHotelId.js
Shared pieces used here: frontend\src\shared\components\ConfirmDialog.jsx(+.css), shared\ui\ThemeToggle.jsx,
  frontend\src\core\api\client.js (central axios with 401 refresh), core\context\{StaffAuthContext,SocketContext,
  NotificationContext,ThemeContext}.jsx, core\routes\ProtectedStaffRoute.jsx, app\App.jsx (route at ~:342).
Backend: routes\{roomRoutes,tableRoutes,staffRoutes,receptionRoutes,seedRoutes}.js; controllers\{roomController,
  hotelTableController,menuController,orderController,receptionController,staffController,
  staffManagementController,seedHotelAdminData,notificationController}.js; middleware\{authMiddleware,
  rateLimiter,errorHandler,upload,csrf}.js; models\{room,hotelTable,menuItem,order,user}.schema.js;
  utils\qrGenerator.js. Mounts: /api/v1/staff, /api/v1/tables, /api/v1/rooms, /api/v1/reception, /api/v1/seed.

# 0. GROUND RULES (non-negotiable)
- DATABASE SAFETY FIRST. Backend\.env MONGODB_URI may point to a LIVE Atlas cluster. Never print env values (key
  names only). Before you seed or mutate anything, confirm MONGODB_URI targets a local/disposable DB (e.g.
  mongodb://127.0.0.1:27017/stayhaven_qa). If you can't confirm it, STOP and ask the user. The seed scripts
  re-link every receptionist and can delete bookings and invoices.
- Never commit, push, or change git config unless the user asks. Work on the current branch's working tree.
- Do not add Playwright (or any dependency) to the repo's package.json files. Install it in a scratch dir:
  d:\qa-harness  ->  npm init -y; npm i -D @playwright/test@1.49.1; npx playwright install chromium
  Delete any temporary scripts you place inside the repo before you finish.
- Fix with minimal diffs. Reuse the existing ha kit (components\ui\*, --ha-* tokens). Don't introduce new UI
  libraries, don't restyle pages wholesale, and don't touch unrelated features (waiter/reception/guest), except
  shared code you must change. If you do change shared code, re-test the consumers named here.
- If the only possible fix changes product behaviour beyond fixing the defect (e.g. building a whole new
  backend), don't do it. Record it under "Remaining issues" and ask the user.
- Use pinned versions for anything you install.

# 1. RUN THE APP
1. Prerequisites: Node >= 20.19, MongoDB local (or mongodb-memory-server-backed DB you start yourself).
2. Install: cd d:\hotel-booking-order-management-system; npm run install:all
3. Backend env: Backend\.env must have MONGODB_URI (mongodb:// or mongodb+srv://), JWT_SECRET (>=32 chars),
   JWT_REFRESH_SECRET (>=32 chars). If not, Backend\utils\envValidator.js exits. Point MONGODB_URI at the
   disposable DB. Ensure FRONTEND_URL / CLIENT_URL = http://localhost:5173 for local runs. Note: Backend/server.js
   forces DNS 8.8.8.8, so mongodb+srv may fail on restricted networks; prefer a local mongodb:// URI.
4. Free port 3000 first (netstat -ano | findstr :3000). If 3000 is busy the backend silently moves to 3001 and the
   frontend won't follow.
5. Terminal A: npm run backend      -> API http://localhost:3000/api/v1, health http://localhost:3000/health
   Terminal B: npm run frontend     -> SPA http://localhost:5173 (env read from frontend\.env: VITE_API_BASE_URL,
   VITE_SOCKET_URL must point at http://localhost:3000)
   Run both as background processes and poll /health until it returns 200.
6. Build/lint/test commands (use these for verification, from repo root unless noted):
   npm run build            (root: vite build --mode production)
   npm run lint             (root: eslint .)
   cd Backend; npm test     (node:test + mongodb-memory-server; no external DB needed)
   cd Backend; npm run test:staff | test:dining | test:pricing   (targeted suites)
   Record the BASELINE results of all three BEFORE changing anything. Pre-existing failures are not yours, but list them.

# 2. SEED + ACCOUNTS
1. cd Backend; node scripts/setupTestHotel.js   (idempotent). This creates "Test Hotel" (approved, room 101),
   owner-role hotel admin hoteladmin@test.com / Test@1234 with company + assignedProperties, plus chief, waiter,
   and guest@test.com / Test@1234 (with a Confirmed booking). If hoteladmin@test.com already existed, its password is
   NOT reset: try Test@1234, then Admin@1234, then Admin@123. Never exceed 5 wrong attempts: 6 failures lock the
   account for 30 min (user.schema.js:185), in dev too.
   DO NOT use scripts/createHotelAdmin.js (no company, so login returns 403; admin redirects to a 404).
2. Log in via http://localhost:5173/staff/login. Expect a redirect to /hoteladmin-dashboard.
3. Populate data: Dashboard > "Seed sample data" (POST /api/v1/seed/hotel-admin-data/:hotelId). This creates
   rooms, menu, tables, staff, orders, bookings and invoices. (Known: a seeded staff `companyRole:'chef'` may fail. Note it.)
4. Create the extra principals needed for role/tenancy tests with ONE throwaway script
   Backend\scripts\_qa_tmp_principals.js (delete at the end). Import the real models and use bcrypt via the
   schema pre-save. Create:
   - Company A (existing) second hotel "Test Hotel 2" (approved, active) with 2 rooms, 2 tables, 2 menu items.
   - Users in Company A: role/companyRole `admin` (assigned Test Hotel), `hoteladmin` (assigned Test Hotel),
     `manager` (assigned Test Hotel ONLY), `receptionist`, `waiter`, plus a throwaway `owner` used only for
     wrong-password / lockout tests.
   - Company B + "Other Hotel" + its own `owner` (ownerB@qa.test) with rooms/tables/menu/orders.
   Use password QaTest@1234 for all of them. Print only emails and ids.
5. Expiry testing: start a second backend run with JWT_EXPIRE=2m (environment override in the shell, not a .env
   edit) when testing token expiry, then restore.
6. Rate-limit testing is only meaningful with NODE_ENV=production (dev limits are 1000+/h). Do one dedicated run
   with NODE_ENV=production and disposable DB, then restore development.

# 3. BROWSER HARNESS RULES
- Auth lives in sessionStorage (staffAccessToken, staffUser, staffRole, activeProperty), so each tab has its own
  session. Use ONE browser context + ONE page per logged-in user. For "two tabs editing concurrently", use two
  separate contexts and log both in.
- Capture for every page: console errors/warnings, failed requests (>=400), unhandled rejections, and a screenshot
  at 375x812, 768x1024, 1024x768, 1440x900, in BOTH light and dark theme (toggle via the sidebar/topbar
  ThemeToggle; theme persists in localStorage.theme).
- Failure simulation with page.route(): force 500, 401 (`{"success":false,"message":"Not authorized, token
  expired"}`), 403, 429, abort (offline), and a 3–5 s delay (slow network) on each page's endpoints.
  Use context.setOffline(true) for real offline.
- API-level security tests: use Playwright `request` (APIRequestContext) or curl with Bearer tokens from
  POST /api/v1/staff/login. Fetch GET /api/v1/csrf-token first and send X-CSRF-Token on mutations.
- Realtime tests: a second context as guest scanning /guest/table/<TBL-token> or /guest/room/<RM-token> and
  ordering; a waiter/chief context advancing order status.
- Every bug: record page, steps, expected, actual, screenshot path, root cause file:line.

# 4. GLOBAL EDGE-CASE MATRIX (apply to EVERY form, search box and filter on every page)
Text fields: empty, whitespace-only, 1 char, max+1 chars, 5,000 chars; Nepali/Devanagari "कोठा नं. १०१ – डिलक्स"
and emoji "🍛"; special chars `' " < > & / \ % _ * ( [ $ { }`; XSS payloads `<script>alert(1)</script>`,
`<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`, `javascript:alert(1)`; CSV formula `=HYPERLINK("x")`,
`+1+1`, `@SUM(1)`. Expected: stored sanitized or rejected, always rendered as text (no alert dialog, so attach a
page.on('dialog') trap), CSV cells neutralized.
Numbers: 0, -1, 0.5, 99.999, 1e3, 1e21, 99999999999, leading zeros "007", letters "10abc", empty, paste of
non-numeric. Expected: inline errors that match backend limits, no silent coercion, "007" normalized on blur.
Duplicates: same value, different case, leading/trailing spaces, created concurrently from two contexts.
Submit: rapid double-click (expect exactly one request; count via page.on('request')), Enter key submits,
Esc/backdrop/X while saving (must not close), Esc with unsaved changes (must confirm discard).
Network: 500, 401 expiry (must silently refresh once and retry), 403, 429 (show the server message), offline,
slow 5 s (loading state visible, buttons disabled, no duplicate submits). Modal data must survive an error.
Lists: empty state vs "no results" state (different copy and CTA), search with no match, combined filters,
search + filter + sort + pagination together, pagination boundaries (0, 1, page size, page size+1, last item
deleted on last page), filter change resets to page 1, natural sort of "1, 2, 10, A1".
Dates/time: browser TZ Asia/Kathmandu (+05:45) via context timezoneId, plus UTC; "today" boundaries at 23:59/00:01;
check-out before check-in, same-day check-in/out, month=2026-13 on availability.
Uploads: 0-byte, 4.9 MB, 5.1 MB, .gif, .pdf renamed .jpg, same file selected twice, remove image.
Concurrency: two contexts edit the same record (expect a 409/clear message, or document last-write-wins),
delete in tab A then edit in tab B (expect a 404 toast + list refresh).

# 5. PER-PAGE CHECKLISTS (confirm each known defect in the browser BEFORE fixing it; [K] = known from code audit)

## 5.1 Login + Shell (/staff/login, /hoteladmin-dashboard)
- Unauth visit to /hoteladmin-dashboard redirects to /staff/login. waiter/chief/receptionist get redirected to their own dashboards.
- Login by email AND by username. Wrong password shows a message (throwaway account only). Lockout message after 6 attempts.
- owner, hoteladmin, admin, manager each land on /hoteladmin-dashboard [K admin goes to /dashboard 404, manager to
  /manager-dashboard 404: staffController.js:252-274; ProtectedStaffRoute.jsx:27-28 sends manager to /reception-dashboard].
- Every sidebar item switches the section, sets aria-current, updates the hash and the mobile title. Back/Forward and reload
  on each #hash restore the section. #garbage falls back to Dashboard (fix the URL too). Legacy /roommanagement,
  /restaurantmanagement, /tablemanagement, /roomqrmanagement redirect to the right hash.
- Badges: Rooms/Orders badges correct on deep link to #stock without visiting Rooms/Orders [K M8/S6].
- Tamper sessionStorage staffRole/staffUser.role to "owner" as a waiter: UI may render, but every API must still return 403.
- Logout, then call GET /api/v1/staff/me and POST /api/v1/staff/refresh-token with cookies only. Both must return 401 [K S1].
  Back button after logout must not show data.
- <768px: hamburger opens the drawer, focus moves in, Tab is trapped, Esc and the backdrop close it, focus returns to the hamburger,
  a closed drawer isn't tabbable [K S4]. 768–1023: collapsed rail tooltips; theme toggle must stay reachable [K S5].
- Sidebar nav focus is kept when badge counts update [K Sidebar.jsx:62 NavItem declared in render].
- Toasts: readable in dark mode; offset (App.jsx top:80px) doesn't overlap the hotel-admin topbar.
- A render crash in one section must not blank the whole app (add a per-section ErrorBoundary if confirmed).

## 5.2 Dashboard (#dashboard)
- Skeleton, then KPIs. Values equal the DB for the ACTIVE property only. Put data in Test Hotel 2 and confirm Test Hotel
  doesn't include it [K receptionController.js:1318,1427 company-wide].
- 0 rooms gives 0% (no NaN) plus a helper card. Rooms-by-type bars with 0%/100%/many types/long names.
- Check-ins/outs: a booking checked in yesterday but edited today must not count. "pending" never negative [K M5].
- Billing endpoint 500: the rest of the dashboard still renders (Promise.allSettled) [K DashboardHome.jsx:52].
- KPI tiles keyboard-activatable and navigate to sensible sections [K :197 goes to orders, :215 to loyalty].
- Seed: hidden in production builds; double-click fires once; badge updates after; owner B calling
  POST /api/v1/seed/hotel-admin-data/<TestHotelId>?clear=true must get 403 [K C3]. hoteladmin/manager either can seed or don't see the button.
- Recent activity: 0/3/8+ items, HTML in description rendered as text, long text wraps at 375px.

## 5.3 Rooms (#rooms)
- Add Room with the DEFAULT form succeeds [K C1: 'Standard' not in enum]. Create one room for EVERY type option. View/Edit of
  seeded types deluxe/suite/villa/"Deluxe King" shows the correct type.
- Required fields, duplicate number (case/space variants, concurrent two-context create), price 0/-1/decimal/huge,
  floor 0/-1/decimal/empty, maxGuests 0/1/50/decimal, description 5,000 chars, XSS in name/description.
- The backend must reject what the frontend rejects (send via API: negative price, maxGuests 0, 1 MB description,
  {rating:5, hotel:"<other>", company:"<other>"}). Rating, hotel and company must be ignored.
- Status: setting occupied/available on a room with a Checked-In booking is blocked or warned [K H7]. `cleaning`
  and `reserved` rooms appear in filters/KPIs and tiles sum to Total [K M6].
- Cleanliness column reflects real data or is removed [K M1 always "Clean"].
- Search (number/name/type, special chars), filter tabs, sort (natural room numbers, numeric price), pagination
  incl. reset on filter change [K L4]. Export CSV: filtered set, Devanagari opens in Excel (UTF-8 BOM), `=1+1`
  neutralized [K utils/csv.js].
- Delete room with Pending/Confirmed/Checked-In booking shows the 400 message. Delete a free room decrements the badge. Delete of a room
  with open orders/dining sessions is blocked.
- No table flash/refetch when a notification arrives or the drawer opens [K HoteladminDashboard.jsx:101 inline onCount].
- Token expiry (JWT_EXPIRE=2m) on Rooms: silent refresh, no "token expired" toast [K roomApi.js own axios].
- API: owner B GET /api/v1/rooms?hotelId=<TestHotel>, PUT/DELETE a Test Hotel room id, PATCH /rooms/:id/toggle-qr
  all return 403 [K roomController.js:40]. A guest token on GET /api/v1/rooms?hotelId= and /rooms/:id/qr-download returns 403. A manager
  assigned only to Test Hotel on Test Hotel 2 rooms returns 403. hoteladmin can create/update/delete; admin can load the page [K :22].
  /rooms/abc returns 404 with no stack trace.

## 5.4 Restaurant > Menu / Tables / Kitchen (#restaurant)
- Menu: load (needs a skeleton and an ErrorState with Retry, not a blank area) [K]. The category dropdown has 7 options. Search debounced
  250 ms combined with category/availability. Filtered empty state says "No items match" + Clear filters [K].
- Create with only the required fields; create with image jpg/png/webp < 5 MB (shows on the guest menu); 5.1 MB is rejected
  client-side; gif/pdf via "All files" is rejected client-side AND the server returns 400, not 500 [K upload.js multer errors].
  Re-select the same file; remove the image; the object URL is revoked.
- Price 0 create works; EDIT an item priced 0 and save works [K RestaurantManagement.jsx:333 `||`].
- Prep time 1/4/121/0/empty shows inline errors matching the schema 5–120 [K :647]. Clearing it on edit works.
- Name > 100 chars and description > 500 chars show inline counter/errors (add a backend cap of 100 on name) [K].
- Delete (history orders still render name/price), Close Kitchen / Mark All Available (guest QR menu reflects it;
  toast shows N; disabled on an empty menu).
- Kitchen tab "Go to Orders" navigates to #orders [K HoteladminDashboard.jsx:103 missing onNavigate].
- Error toasts show the server message [K :206,219,247,309].
- Tables tab: same checks as 5.5 (it duplicates TableManagement; fix both or make it reuse TableManagement).
- API: hoteladmin can CRUD and bulk-toggle [K 403]. Owner B / company-A admin PUT/DELETE a Test Hotel item and bulk-toggle
  Test Hotel return 403 [K menuController.js:50,73]. GET /api/v1/staff/menu-items?hotelId=<TestHotel> as owner B returns 403 [K :115].
  An invalid itemId returns 404.

## 5.5 Table QR Codes (#tables)
- Thumbnail, view modal, Download (valid PNG table-<n>-qr.png) and Print all show a REAL QR image [K C1 qrCodeData vs
  qrCodeImage]. Scan or decode the PNG (e.g. jsQR in the harness): the URL is <FRONTEND_URL>/guest/table/TBL-… and opening it
  in a guest context loads the menu. The host is NOT localhost in a production build [K qrGenerator fallback].
- Regenerate asks for danger confirmation. Afterwards the OLD token shows "Table not found or QR code is inactive" and the new one
  works [K H1 regenerate=false]. Add an Activate/Deactivate QR control; a deactivated table blocks guest ordering [K H2].
- Add: defaults (cap 4, min 0, Indoor, Available), focus on Table Number, Status=Reserved persists [K H3].
  Table number " 5 ", "5" duplicate, "a1" vs "A1", 200 chars, <b>x</b>, emoji: inline duplicate error (not a toast).
  Capacity "02" normalizes, empty/0/-1/2.5/51/999999: inline errors, never silently becomes 4 or ignored [K H4].
  Min spend -100/1500.5/1e9 shows "Rs. 1,500" formatting.
  Description 5,000 chars capped with a counter. Edit: clear Table Name actually clears [K M3]; capacity 0 is rejected.
- Batch: count 5 from 1 creates 1–5. Re-running reports "0 created, 5 skipped" [K H6 false success]. Count 0/-1/51/100 and start
  0/-5/empty are rejected client and server side (the server currently allows 51). The "Generate QR" checkbox is honoured or removed.
- Row status select: no full-page skeleton flash, reverts on error with the server message [K M1]. A Maintenance table blocks
  guest ordering (409).
- Delete a table with an open order/dining session is blocked [K H9]. Manager: the Delete button is hidden or works consistently.
- Sort 1, 2, 10, A1 is natural [K M5]. 200 tables: payload/scroll OK (list should exclude qrCodeImage) [K M6].
- No property selected shows a "No property selected" state, not "No tables yet" [K M10]. API 500 shows an ErrorState with Retry.
- API: any token GET /api/v1/tables?hotelId=<OtherHotel> returns 403 [K C2]. Owner B PUT/generate-qr on Test Hotel tables returns 403 [K C3].
  Waiter PATCH /tables/:id/status: decide and enforce [K M2]. /tables/abc returns 404.

## 5.6 Room QR Codes (#roomqr)
- Coverage bar and stats correct; 0 rooms shows a CTA link to #rooms. Search by number/type; chips; an Inactive filter.
- Generate on one room updates in place. "Generate All (N)" processes only rooms without a QR and the toast says N [K H8]. Disabled at 0.
- Deactivate makes a guest scan of /guest/room/<token> show "inactive"; Activate restores it. Regen invalidates the old token [K H1].
- Download a valid PNG. Print and Print All show the HOTEL NAME [K H7 no populate]. Print All with 100 rooms paginates
  cleanly. With popups blocked, a toast appears instead of a crash.
- Floor 0 shows no stray "0" [K RoomQRManagement.jsx:318]. Price "Rs. 1,234".
- Print HTML escapes names (room number "<b>1</b>") [K M8].
- The admin role can use the page [K]. Owner B toggle/generate on a Test Hotel room returns 403.

## 5.7 Orders (#orders)
- Cards/Table toggle, Refresh, status tabs with counts, type filter, sort, search (order # exact/prefix, customer,
  table, room). Searching "1" shouldn't match 10/100 loosely unless intended.
- Manager: Confirm, Start Prep, Mark Ready, Deliver, each with a loading state. Owner/admin: read-only notice, Cancel works
  [K admin 403 orderController.js:38]. hoteladmin Cancel works [K 403].
- REALTIME: a guest places a QR order in context 2. The Orders LIST updates within ~2 s with no manual refresh (subscribe to
  new-order/order-status-updated/order-cancelled via SocketContext subscribe) [K only a 30 s poll]. A kitchen advance in
  context 3 updates an open detail modal [K :409 stale snapshot]. Restart the backend: the socket reconnects (also after
  token expiry, re-auth on reconnect) [K SocketContext stale auth.token].
- Concurrency: two managers confirm the same order. One succeeds, the other gets a 409 message and a refresh.
- Cancel: a reason is required; the "Other" chip requires free text; 300-char cap with a counter; Back/Esc/overlay are disabled while
  pending. Cancel from inside the detail modal, then the page MUST still scroll [K scroll-lock race in Modal.jsx].
  Cancel on a part-paid tab returns 409 "Refund…". Cancel an already-delivered order shows a clear 400.
- Detail modal Advance waits for the response before closing; it shows a stepper (ol / aria-current) and the cancellation reason.
- More than 100 orders in history: active orders older than the newest 100 still show; KPIs are correct; revenue is labelled with its
  period [K :124-133].
- Hidden tab for 10 min: polling pauses (visibilitychange). A later failed poll keeps the last data with a banner.
- API: POST /staff/orders/abc/cancel returns 404 (not 500) and {reason:123} returns 400 (not 500) [K orderController.js:550,425].
  PUT status pending to delivered is rejected and a same-status request is a no-op [K :493]. GET /staff/orders?search=( returns no 500 [K :369].
  Owner B GET /staff/orders?hotelId=<TestHotel> returns 403 [K :54].
- Order card/row openable by keyboard (tabIndex, role=button, Enter/Space). Unknown orderType / no items / missing
  orderNumber render without crashing.

## 5.8 Stock / Inventory (#stock), MOCK
- Confirm the mock banner is visible and honest. Non-persistence after a refresh is EXPECTED: list it as a Remaining BLOCKER
  (needs an InventoryItem model + /api/v1/staff/inventory with property scoping). Do NOT build the backend without
  user approval.
- Still fix the client defects: Adjust double-click applies twice [K StockManagement.jsx:214-224]; criticalLevel > lowStockLevel
  and negative levels accepted [K :163-170]; number inputs `+e.target.value` produce "05"/0 [K :410-416]; Remove more
  than on hand silently clamps [K]; decimals for pcs/boxes; Enter in Adjust doesn't apply; skeleton 4 vs 5 cards;
  alert banner unbounded at 375px; filter change doesn't reset the page. Logout then login as another property: the module-level store
  leaks [K stockApi.js:28]. Reset it on logout.

## 5.9 Staff Management (#staff)
- Loads for owner/admin/manager/hoteladmin; a manager sees peer managers as protected. Filters, Cards/Table, export (invited
  exported as "Invited", not "Inactive") [K T6].
- Invite: empty / 1-char / 121-char name shows a clear inline error (backend 2–120) [K T3]; invalid/uppercase email; existing email
  same company; existing email in Company B (message must not leak cross-tenant existence); manager role is hidden for a manager;
  double-click Send. SMTP misconfigured shows a warning toast.
- Resend: rapid clicks hit 429 and the message is shown. Edit: contact 41 chars shows a clear inline error [K ≤40]. Role change forces re-login.
- Deactivate: the target's next API call returns 403. Remove: the user can't log in. The button hierarchy is fixed (Remove = danger) [K T2].
- Load failure shows an ErrorState with Retry, not "No staff yet" [K T1]. Refresh is disabled while loading.
- API tampering with Company B propertyId/staffId returns 404/403; self-edit returns 403 (backed by cd Backend; npm run test:staff).

## 5.10 Billing & Payments (#billing), MOCK UI on real endpoints
- Fix: wire to GET /api/v1/reception/billing/invoices and /billing/summary (reception.service.js getInvoices,
  getBillingSummary), scoped to the active hotel. Remove the MOCK_* constants and the banner [K BillingManagement.jsx:45-75].
- Print escapes every interpolated value or uses DOM text nodes [K :135-150]. A guest name "<img src=x onerror=alert(1)>" must
  not execute in the print window. Popup blocked shows a toast.
- Tabs, search, sort, pagination (8/page), CSV export of the filtered rows, invoice modal (Esc, focus return),
  empty state for a new hotel, 375px detail grid.

## 5.11 Loyalty (#loyalty)
- More than 100 guests: all are reachable (server pagination) and KPIs use server totals [K LoyaltyManagement.jsx:62 vs pagination cap 100].
- The list is scoped to the active hotel [K receptionController getCtx]. hoteladmin gets no 403 [K].
- Rename "Total Points Issued" to "Points Outstanding" (it's a sum of balances). The filtered-empty message is correct. No double
  toast + empty state on error.

## 5.12 Reports & Analytics (#reports)
- Numbers equal the DB for the active hotel only (multi-property company) [K R1]. One endpoint 500 gives a degraded card, not a
  blank page [K ReportsAnalytics.jsx:50 Promise.all]. Remove or label fabricated values (previous = occupancy-6,
  trend "up", noShow 0, lateCheckout 0) [K receptionController.js:1471,1480]. Occupancy % and trend use the same
  denominator. 0 rooms gives no NaN. Refresh shows a spinner.

## 5.13 Notifications (#notifications)
- Live socket event arrives while on the page and the sidebar badge matches. Mark one read (click + Enter/Space), Mark all read
  (disabled at 0). Offline, then mark read, then reload: the UI must not lie (surface errors, roll back) [K NotificationContext.jsx:260].
- Clear All: either implement a server delete or reword "permanently removed" [K :267]. Tabs include order_ready and
  other server types. Invalid dates don't render "NaNd ago". Load more past 50.

# 6. SECURITY / API MATRIX (run every row; expected values are what the fixed system must return)
| Actor | Call | Expected |
| Owner B | GET/PUT/DELETE /api/v1/rooms*, /api/v1/tables*, /api/v1/staff/menu-items*, /staff/orders*, seed on Test Hotel ids | 403 |
| Any token incl. guest | GET /api/v1/tables?hotelId=X, GET /api/v1/rooms?hotelId=X, /rooms/:id/qr-download | 403 unless staff of X |
| Manager (Test Hotel only) | any Test Hotel 2 resource | 403 |
| hoteladmin / admin (Test Hotel) | all hotel-admin page calls for Test Hotel | 200 (no 403s) |
| Waiter / receptionist | menu writes, table/room CRUD, staff manage, seed | 403 |
| Superadmin | hotel operational endpoints | 403 (intended) |
| Any | PUT /rooms/:id {rating, hotel, company}; PUT stock/menu with _id/hotel | fields ignored |
| Any | invalid ObjectIds | 404 JSON, no stack (NODE_ENV=production) |
| Any | regex metachars in search | no 500 |
| After logout | cookie-only /staff/me, /staff/refresh-token | 401 |
| Prod mode | 101st write in 1 h, 21st auth in 15 min, 21st batch in 1 h | 429 surfaced as a toast with the server message |
| Two tabs | near-simultaneous refresh | no forced logout of all sessions (document if it happens) |
Mutations without X-CSRF-Token: record current behaviour (CSRF isn't enforced on hotel-admin routes; bearer auth
mitigates). Report it, don't change it.

# 7. VALIDATION PARITY (frontend must equal backend; implement both sides and keep messages field-specific)
- Room: roomNumber required, trim, ≤20, case-insensitive unique per hotel; roomName required ≤100; type = backend
  enum (single source of truth, label/value pairs); price ≥0 ≤10,000,000, 2 decimals; floor integer ≥0; maxGuests
  integer 1–20; description ≤1000; status admin-editable only available/maintenance/cleaning (occupied/reserved
  derived from bookings); rating/lastCleaned not admin-assignable.
- Menu item: name required ≤100; description ≤500; price ≥0 2 decimals; preparationTime integer 5–120 (clearable);
  image jpg/png/webp ≤5 MB (multer errors mapped to 400).
- Table: tableNumber required, trim, upper-cased, ≤20, ^[A-Za-z0-9-]+$, unique per hotel (inline error); tableName
  ≤60 (clearable); capacity integer 1–50 on create AND update; minSpend 0–1,000,000 ≤2 decimals; status enum on
  create; description ≤300; batch count integer 1–50, startNumber integer ≥1.
- Order cancel reason: string, trimmed, 3–300 chars; status transitions strictly next step, no no-op.
- Staff: fullname 2–120; contact ≤40; email format; show the backend message inline.
- Stock (client only): quantity/cost ≥0, critical ≤ low, integers for pcs/boxes, name ≤100.
Add backend regression tests for the tenancy and validation fixes in Backend\tests\*.integration.test.js, following
staffManagement.integration.test.js / orderPricing.integration.test.js (node:test + mongodb-memory-server), and add the
new files to the Backend "test" script.

# 8. MODAL / FORM / TABLE UX AUDIT AND IMPROVEMENTS (keep the ha design system)
Audit every modal: Room create/edit/view, Menu add/edit, Table add/edit, Batch create, QR view (table + room),
Order detail, Cancel order, Stock add/edit, Stock adjust, Staff invite, Staff edit, Invoice view, every ConfirmDialog,
the mobile drawer, plus BillPreviewModal (shared, used by waiter OrderCard.jsx:1060 and reception
ReceptionOrdersView.jsx:1638; re-test both after changes). For each, check: spacing/alignment, label + required
marker, inline error placement, loading/disabled submit, double-submit, Enter submits, Esc/backdrop/X behaviour,
focus trap + initial focus + restore, ARIA, contrast in light/dark (WCAG AA 4.5:1 for text; note that full WCAG
validation needs manual assistive-technology testing), 375/768/1024/1440 layout, z-index stacking with toasts.
Implement these (minimal, in components\ui\ and the pages):
1. components\ui\Modal.jsx: `busy` prop (blocks Esc/backdrop/X while saving), `isDirty` prop ("Discard changes?"
   confirm), initial focus on the first field (initialFocusRef fallback to X), ref-counted body scroll lock,
   max-height calc(100dvh - 32px) with a 100vh fallback, ≤480px bottom-sheet (top radius, sticky footer,
   env(safe-area-inset-bottom)), footer flex-wrap / column-reverse full-width buttons on mobile.
2. New components\ui\ConfirmModal.jsx built on Modal size="sm": role="alertdialog", aria-labelledby/-describedby,
   danger/warning/info icon tile on --ha-*-bg tokens, focus on Cancel, loading spinner label, optional required
   reason field. Replace ConfirmDialog usages in ALL hotel-admin pages (Notifications, Restaurant, Room, RoomQR, Staff,
   Stock, Table) and use it for Orders cancel. Leave shared ConfirmDialog in place for other features.
3. Forms: `<form id="x-form">` + footer `<Button type="submit" form="x-form">` everywhere (Rooms, Menu, Table, Batch,
   Stock add/adjust, Staff). `if (saving) return` guard. Map server 400s to fields, plus an inline ha danger alert above
   the footer. Helper text (units "NPR", ranges "5–120 min", "1–50 guests"). Counters on limited text fields.
   inputMode numeric/decimal, normalize on blur, keep number inputs as strings until submit.
4. Room modal: group into sections (Identity / Pricing & capacity / Status / Description). View mode is a read-only
   definition list with an Edit button (not disabled inputs). Type select from the shared enum.
5. Menu modal: styled dropzone (Choose/Replace/Remove, 120×90 preview, "JPG, PNG or WEBP · max 5 MB"), labelled
   file input, ha switch for Available. Add isVeg (guest veg dot) only if it's a small change; otherwise list it as remaining.
6. Order detail: stepper as <ol aria-label="Order progress"> with aria-current="step", red Cancelled state, items
   as a table (Item/Qty/Line total), show notes and cancellation reason. Cancel modal: title "Cancel order #123?",
   chips with aria-pressed, consequence text.
7. QR view: real image, alt "QR code for Table 5", Copy link button, Active/Inactive badge, white quiet-zone card in dark.
8. BillPreviewModal: dimmed overlay, role=dialog + Esc + focus trap, labelled + validated email, no backdrop
   close while sending, dark-mode tokens, no "Test Hotel" placeholders, remove the PII console.log, guard
   window.open null, block send for cancelled/session orders (or use server totals), UNPAID watermark.
9. Mobile drawer: Esc, focus trap, `inert` on main when open, focus restore. Theme toggle reachable in the collapsed rail;
   ThemeToggle gets type="button" and aria-pressed.
10. Tables at <640px: card list or sticky first column; action icons ≥36px hit area with visible :focus-visible.
11. Clickable cards/rows: tabIndex=0, role="button", Enter/Space, aria-label.
12. z-index tokens in styles\hotel-admin-tokens.css: --ha-z-overlay, --ha-z-modal, --ha-z-toast; toasts above modals.
Take before/after screenshots of every modal you change (light + dark, 375 + 1440).

# 9. FIX ORDER (each fix: reproduce in the browser, then minimal change, then build + lint + backend tests, then re-test in the browser)
P0 security/data: owner/null-company bypass in all four assertHotelAccess helpers (owner must match hotel.company
   OR hotel.owner; manager/hoteladmin/admin must be in assignedProperties); access check + staff role gate on
   GET /tables and GET /rooms (strip uniqueToken/qrCode* for non-QR views); menu getMenuItems scope; seed: assert
   hotel access + block when NODE_ENV==='production' + hide the button when import.meta.env.PROD; logout calls
   POST /api/v1/staff/logout before clearing storage; escape print HTML (Billing, Table, RoomQR); CSV formula
   neutralization (prefix ' ); escape regex in order search.
P1 broken features: one HOTEL_ADMIN_ROLES = ['owner','hoteladmin','admin','manager'] used by the route guard, backend
   authorize() lists (rooms, tables, menu, orders cancel, reception reports/billing/guests/overview, seed) and UI
   gates. Treat `admin` as a company-scoped hotel admin (superadmin stays excluded) and note this decision in the
   report. Fix login redirectPath for admin/manager to /hoteladmin-dashboard and align ProtectedStaffRoute. Room type
   enum. qrCodeImage in Table/Restaurant. Real regenerate + table QR toggle. Hotel-admin services moved onto
   core\api\client.js (add /api/v1/rooms and /api/v1/tables to isStaffRequest in both interceptors). Proactive refresh
   timer based on token exp, not reload time. Socket re-auth on reconnect. Kitchen onNavigate. Price-0 edit. Cancel
   `next` propagation. Billing wired to real endpoints. Property-scoped reception aggregates (filter by validated
   hotel). Loyalty pagination. Orders live updates + stale detail modal + scroll-lock race. Room populate hotel name.
   Batch result reporting. Stock adjust double-submit.
P2 validation parity (section 7), stable onCount callbacks (useCallback/setState passthrough), Promise.allSettled on
   Dashboard/Reports, ErrorStates with Retry (Staff, Loyalty, Menu, Tables), natural sort, page reset on filter change.
P3 UX (section 8) and the remaining Low items.
After EVERY batch: npm run build (must pass), npm run lint (no NEW errors vs baseline), cd Backend; npm test
(no new failures), then re-run the affected Playwright specs. Keep each change scoped to the defect.

# 10. WHAT NOT TO DO
- Don't run seed scripts or ?clear=true against a non-disposable DB. Don't print secrets.
- Don't build the Stock backend, a property switcher, image galleries or rate plans without approval. List them.
- Don't rewrite pages. Don't swap the design system. Don't change the waiter/reception/guest UIs except to re-test shared changes.
- Don't mark a check PASS from code reading alone. PASS means it was observed in the browser/API run.

# 11. CLEANUP
Delete Backend\scripts\_qa_tmp_principals.js and any other temp files in the repo. Keep d:\qa-harness (specs +
screenshots) outside the repo. Stop the background dev servers. Restore NODE_ENV/JWT_EXPIRE overrides.

# 12. FINAL REPORT (write to d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-qa-report.md and paste it in chat)
1. Environment: DB target (local/disposable confirmed), commands run, baseline vs final build/lint/test results.
2. Per-page PASS/FAIL table: Page | Checks run | Pass | Fail | Blocked | Notes (Login/Shell, Dashboard, Rooms,
   Restaurant-Menu, Restaurant-Tables/Kitchen, Table QR, Room QR, Orders, Stock, Staff, Billing, Loyalty, Reports,
   Notifications, BillPreviewModal consumers) plus the security matrix rows.
3. Bugs fixed: # | Severity | Page | file:line (after fix) | Root cause | Fix | Verified by (spec/test name).
4. UX improvements made: modal/form/table | before | after | screenshot paths.
5. Decisions taken (e.g. meaning of the `admin` role, seed production block) with one-line rationale.
6. Remaining issues by severity (Critical/High/Medium/Low): issue, file:line, why not fixed, suggested fix. Must
   include the Stock backend if it isn't approved.
Keep it factual. No filler.
````
