# 05 — Cross-cutting: run, seed, login, auth, realtime, limits, errors, shared UI

Scope: everything a QA agent needs to run the hotel-admin app end to end, plus cross-cutting defects and the shared-component inconsistencies a UX pass must reconcile. Read-only investigation; env values were not read or echoed (key names only).

Severity scale: BLOCKER (stops an E2E run) · HIGH · MEDIUM · LOW.

---

## 1. Run the app

### Packages and scripts
| Package | Path | Scripts |
|---|---|---|
| Root (Vite shell, `root: './frontend'`) | `package.json` | `dev`/`frontend` = `vite`; `backend` = `cd Backend && npm run dev`; `install:all`; `build`; `lint`; `test:backend` |
| Frontend | `frontend/package.json` | `dev` = `vite`, `build`, `lint`, `preview` (no `test` script) |
| Backend | `Backend/package.json` | `start` = `node server.js`; `dev` = `nodemon server.js`; `test` (node:test + mongodb-memory-server), `test:unit`, `test:staff`, `test:dining`, etc. |

Node requirement: `^20.19.0 || >=22.12.0` (Vite 7; README). No `engines` field, so npm will not warn.

### Commands (Windows PowerShell)
```powershell
# one-time
cd d:\hotel-booking-order-management-system
npm run install:all

# terminal 1 — API (nodemon)
npm run backend            # == cd Backend; npm run dev

# terminal 2 — SPA
npm run frontend           # vite from repo root, root=./frontend, env read from frontend/
```
- Frontend: `http://localhost:5173` (Vite default; no port pinned in either vite config).
- API: `http://localhost:3000/api/v1`, health at `http://localhost:3000/health`, CSRF at `GET /api/v1/csrf-token`.
- `cd frontend; npm run dev` also works but uses `frontend/vite.config.js` (has `manualChunks`, lacks the prod sandbox-key guard). The two vite configs differ — LOW.

### Ports
- `Backend/server.js:352-353` default 3000. If `PORT` is unset and 3000 is busy, `findAvailablePort` silently moves to 3001+ (`server.js:355-372`, `startServer`), and the frontend (`frontend/src/core/utils/apiConfig.js:18`, fallback `http://localhost:3000`) will not follow. `Backend/.env` defines `PORT`, so an explicitly set port fails loudly with EADDRINUSE instead. QA: free the port first (`netstat -ano | findstr :3000`).
- `Backend/scripts/testStaffLogin.js:20` hardcodes `http://localhost:3000` — LOW.

### Env key names (names only)
- **Backend/.env (present):** MONGODB_URI, DB_NAME, PORT, NODE_ENV, CLIENT_URL, FRONTEND_URL, JWT_SECRET, JWT_EXPIRE, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRE, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL, SENDER_EMAIL, SUPPORT_EMAIL, USE_TEXTBELT, TEXTBELT_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, KHALTI_SECRET_KEY, KHALTI_PUBLIC_KEY, ESEWA_SECRET_KEY, ESEWA_PRODUCT_CODE, ESEWA_ENV, KHALTI_ENV, MONGODB_DOH_FALLBACK, PAYMENT_SERVER_URL, PAYMENT_CLIENT_URL, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD.
- **Backend/.env.example extras:** REDIS_URL, GITHUB_TOKEN (not in .env). `ENABLE_DEMO_SEED` / `AUTO_SEED_DEMO` are in neither (destructive demo seed is off — good).
- **Required at boot** (`Backend/utils/envValidator.js:12-31`): MONGODB_URI (mongodb:// or mongodb+srv://), JWT_SECRET (≥32 chars), JWT_REFRESH_SECRET (≥32 chars). Missing/invalid → `process.exit(1)`. NODE_ENV defaults to `development`, CLIENT_URL to `http://localhost:5173`.
- **frontend/.env:** VITE_API_BASE_URL, VITE_SOCKET_URL, VITE_GOOGLE_CLIENT_ID, VITE_STRIPE_PUBLISHABLE_KEY, VITE_KHALTI_PUBLIC_KEY. `frontend/.env.example` is missing VITE_SOCKET_URL and VITE_KHALTI_PUBLIC_KEY — LOW.
- **Root `.env`** (SENDER_EMAIL, MAIL_USERNAME, MAIL_PASSWORD, VITE_API_BASE_URL) is ignored by Vite (envDir = `frontend/`). Do not edit it expecting an effect.
- Dead config — MEDIUM: `JWT_ACCESS_EXPIRE` and `JWT_REFRESH_EXPIRE` are never read. Access-token TTL is `JWT_EXPIRE || "1h"` (`Backend/utils/tokenUtils.js:28`); refresh TTL is hardcoded `"7d"` (`tokenUtils.js:39`). If `JWT_EXPIRE` is set to a long value (it is also reused for the 30d legacy token at `tokenUtils.js:51`), access tokens outlive the 1h cookie. QA agent should check the effective value without printing it.

### Network quirk
`Backend/server.js:1-2` forces DNS to 8.8.8.8/8.8.4.4. On networks that block public DNS, `mongodb+srv://` SRV lookup fails and the server boots with "MongoDB unavailable" → roles not seeded (`server.js:~470`). MONGODB_DOH_FALLBACK exists for this. MEDIUM (environment-dependent BLOCKER).

---

## 2. Create and log in as a hotel admin with an active property

### How staff login works
- Route: `/staff/login` (`frontend/src/app/App.jsx:226`) → `staffLogin(email, password)` (`frontend/src/core/api/services/staff.service.js:4`) → `POST /api/v1/staff/login` (`Backend/routes/staffRoutes.js:100`, `authLimiter`).
- Controller `Backend/controllers/staffController.js:109-320`:
  - Login accepts email **or** username (`:118-121`).
  - Allowed roles: chief, waiter, manager, admin, owner, receptionist, superadmin (`:163-171`). Role resolved as `role.name || companyRole`.
  - Non-superadmin must have `company` (403 "No company assigned") and ≥1 `assignedProperties` (403 "No property assigned") (`:196-210`).
  - `activeProperty` in the response = `assignedProperties[0]` (`:300-310`). There is no `activeProperty` field on the User schema; it is always derived.
  - `redirectPath`: owner/hoteladmin → `/hoteladmin-dashboard`; **admin → `/dashboard`** (default branch, `:252-274`), which does not exist in `App.jsx` → NotFound. HIGH: an `admin`-role user (as created by `createHotelAdmin.js`) lands on a 404 after login even though `/hoteladmin-dashboard` allows `admin`. **manager** → `/manager-dashboard`, also not a route → 404. HIGH.
- Lockout: 6 failed passwords → account locked 30 min (`Backend/models/user.schema.js:185-186`), **in dev too**. `setupTestHotel.js` does not reset `loginAttempts/lockUntil`. QA edge-case "wrong password" tests must use a throwaway account, never the main hotel-admin account. HIGH for test execution.

### Recommended seed path (works with the real login checks)
Run from `Backend/` against a **disposable** database:
```powershell
cd d:\hotel-booking-order-management-system\Backend
node scripts/setupTestHotel.js
```
`Backend/scripts/setupTestHotel.js` (idempotent) ensures roles, uses the first Company (or creates "Test Company"), finds/creates **"Test Hotel"** (approved, active), one room 101, and:
- Hotel admin: `hoteladmin@test.com` / `Test@1234`, role **owner**, company + `assignedProperties=[Test Hotel]` (`:43-47`, `:226-236`). If the account already existed, the password is **not** changed (`ensureUser`, `:57-70`).
- Also chief, waiter, guest (`guest@test.com` / `Test@1234` with a Confirmed booking), superadmin only if none exists.
- Side effects — HIGH: re-links **every** receptionist in the DB to Test Hotel (`:205-221`), reassigns Test Hotel to `Company.findOne()` (`:131-134`). Never run against a shared/live DB. README warns developer `.env` files commonly point at a live Atlas cluster.

Then log in: `http://localhost:5173/staff/login` → `hoteladmin@test.com` / `Test@1234` → expect redirect to `/hoteladmin-dashboard`.

Populate data for the property, from inside the app: Dashboard → **"Seed sample data"** / **"Seed now"** (`frontend/src/features/staff/hotel-admin/pages/DashboardHome.jsx:73-90,152-176`) → `POST /api/v1/seed/hotel-admin-data/:hotelId` (`Backend/routes/seedRoutes.js:45`). Idempotent per collection; creates rooms, menu items, tables, staff, orders, bookings, invoices, transactions (`Backend/controllers/seedHotelAdminData.js`). `?clear=true` wipes them first (`:54-63`).

Optional extra data: `node scripts/seedMenuItems.js`, `node scripts/seedRooms.js`, `node scripts/seedReceptionData.js`, `node scripts/seedQROrdering.js` (not individually verified here).

### Alternative / broken paths
| Path | Status |
|---|---|
| `POST /api/v1/seed/test-hotel-admin` (public, dev-only, `seedRoutes.js:29`; `seedController.js:368-455`) | Works if a Company+Hotel exist. Default `hoteladmin@test.com` / `Admin@1234`, role owner. **Conflicting default password** with setupTestHotel (`Test@1234`); if the account exists it just echoes the default password, which may be wrong — MEDIUM. |
| `node scripts/linkTestHotelAccounts.js` | Requires the chief and waiter accounts to already exist with properties, else `exit(1)` (`:79-95`). Use only after setupTestHotel. |
| `node scripts/createHotelAdmin.js` | **Broken — HIGH.** Creates role `admin` with **no company** (`:85-93`) → login returns 403 "No company assigned"; even if fixed, `admin` redirects to `/dashboard` (404). Prints wrong login URL `http://localhost:5173/login` (guest login) (`:124`). Uses inline schemas; pre-hashes password and sets `Admin@123` — a third conflicting password. |
| `node scripts/checkUserActiveProperty.js` | Diagnostic only and misleading — LOW/MEDIUM. Checks only `superadmin@stayhaven.com`; populates `activeProperty`, which is not a schema field, so it always reports "NONE - THIS IS THE PROBLEM!" (`:39-49`); recommends non-existent scripts `seedHotel.js` and `assignHotelToUser.js` (`:96-101`). |
| `node scripts/testStaffLogin.js` | Hits CSRF + `/staff/login` + `/staff/me`; tries superadmin@stayhaven.com, waiter@test.com, receptionist@test.com with hardcoded passwords — none is the hotel admin; misleading "start: node server.js" hint. LOW. |

### Security note on seeding (flag for the audit) — HIGH
`POST /api/v1/seed/hotel-admin-data/:hotelId` only checks role ∈ {admin, owner, superadmin} (`seedRoutes.js:32-33`); `seedHotelAdminData.js:18-36` never checks that the hotel belongs to the caller's company/assignedProperties and has no production guard. Any owner can seed — or with `?clear=true` delete rooms/menu/tables/orders/bookings/invoices/transactions of — **any** hotel by id. The "Seed sample data" button is also shown in production UI. QA should test cross-hotel id tampering with a second owner account (expected: 403; actual per code: allowed).

---

## 3. Auth, token storage, expiry, refresh

- Storage: staff access token in **sessionStorage** `staffAccessToken`; profile in `staffUser`, `staffRole`, `staffUserId`, `activeProperty` (`frontend/src/core/context/StaffAuthContext.jsx:105-114`, `staff.service.js:15-18`). Refresh token is an httpOnly cookie `refreshToken` (7d), plus httpOnly `accessToken` cookie (1h) (`staffController.js:225-243`, SameSite=Lax in dev, None+Secure in prod).
  - QA impact — MEDIUM: sessionStorage is per tab. Opening a hotel-admin link in a new tab/window (or a new Playwright page) is logged out → redirected to `/staff/login`. Restore requires `staffUser`+`staffRole`+`staffAccessToken` (`StaffAuthContext.jsx:64-80`).
- Central client `frontend/src/core/api/client.js`:
  - Staff detection by URL substring (`:27-33`): `/api/v1/staff`, `/reception`, `/profile`, `/users/admin`, `/hotels/admin`, `/superadmin`, `/seed/`. **`/api/v1/rooms`, `/tables`, `/bookings`, `/company` are not "staff" requests** → they get the guest `accessToken` from localStorage, falling back to nothing (`:38-40`). MEDIUM: if a guest session and a staff session coexist in one browser, those calls authenticate as the guest.
  - 401 → single-flight refresh (`:96-131`) via `/api/v1/staff/refresh-token` for staff requests, else `/api/v1/auth/refresh`. On failure clears staff keys and hard-redirects to `/staff/login` (`:133-150`).
- **Hotel-admin service modules bypass this client — HIGH.** `frontend/src/features/staff/hotel-admin/services/{roomApi,tableApi,menuApi,orderApi,staffApi}.js:10-22` each create their own axios instance with only a Bearer request interceptor + CSRF interceptor. **No 401 refresh / redirect.** When the 1h access token expires, Rooms, Tables, Restaurant/menu, Orders, Staff pages fail with raw 401 errors/toasts instead of refreshing.
- Proactive refresh: `setInterval` every 55 min (`StaffAuthContext.jsx:10,46-59`), started at login **and on every page reload** — a reload at minute 50 restarts the 55-min clock, so the token expires at minute 60 before the timer fires. Combined with the point above, the hotel-admin pages break ~1h after login if the user ever reloaded. HIGH. QA: to test quickly, temporarily set `JWT_EXPIRE=2m` in a disposable env.
- Refresh rotation + reuse detection (`staffController.js:582-660`): a replayed refresh token nulls the user's stored token (logs out all sessions). Two tabs refreshing near-simultaneously can trigger this. MEDIUM.
- CSRF: `GET /api/v1/csrf-token` sets httpOnly `csrf-token` cookie (`Backend/middleware/csrf.js:33-43`); all axios instances send `X-CSRF-Token` on mutations (`frontend/src/core/utils/csrf.js:68-85`). Backend only *enforces* `csrfProtection` on guest-dashboard payments/profile, public booking payment, wallet verify — **none of the hotel-admin routes** (grep of routes). LOW/MEDIUM (bearer tokens mitigate; cookie fallback in `protect` at `Backend/middleware/authMiddleware.js:15-16` does not).

### Role guards
- `frontend/src/core/routes/ProtectedStaffRoute.jsx`: not authenticated → `/staff/login` (`:14-19`); wrong role → role-based redirect (`:22-44`). Guard is purely client-side on `staffUser.role` from sessionStorage.
- `/hoteladmin-dashboard` allows `owner, hoteladmin, admin, manager` (`App.jsx:344`). But `ProtectedStaffRoute.jsx:27-28` sends a *mismatched* `manager` to `/reception-dashboard`, and login sends manager to `/manager-dashboard` (404). Three different answers for "where does a manager go" — MEDIUM.
- Legacy routes redirect into hash sections: `/roommanagement`→`#rooms`, `/restaurantmanagement`→`#restaurant`, `/tablemanagement`→`#tables`, `/roomqrmanagement`→`#roomqr` (`App.jsx:350-353`). Sections are hash-driven (`HoteladminDashboard.jsx:25-38,45-75`); unknown hashes fall back to dashboard.
- QA edge cases: waiter/chief/receptionist hitting `/hoteladmin-dashboard` (expect redirect to own dashboard); tampering `sessionStorage.staffRole/staffUser.role` to `owner` (UI renders, backend must still 403 — verify per endpoint).

### Logout — HIGH
`HoteladminDashboard.jsx:82-88` → `StaffAuthContext.logout()` (`StaffAuthContext.jsx:117-137`) only clears client storage. It **never calls `POST /api/v1/staff/logout`** (`staffRoutes.js:110`, `staffController.js:554-580`), so the server-side refresh token and the httpOnly `accessToken`/`refreshToken` cookies survive "logout" for up to 7 days. Since `protect` accepts the `accessToken` cookie as a fallback (`authMiddleware.js:15-16`), cookie-authenticated API calls keep working after logout. A `staffLogout` service exists (`staff.service.js:~30-45`) but the dashboard doesn't use it. QA: after logout, call `GET /api/v1/staff/me` with cookies only → expect 401.

---

## 4. Theme toggle
- `frontend/src/core/context/ThemeContext.jsx:13-24`: theme in `localStorage.theme`; toggles `light-theme`/`dark-theme` and `dark` classes on `<html>`. Provider is in `main.jsx:77`.
- Hotel-admin tokens switch on `.dark .hotelAdminShell` (`styles/hotel-admin-tokens.css` dark block). Sidebar is always dark by design.
- `shared/ui/ThemeToggle.jsx`: hardcoded colors (`#34d399`/`#d1d5db`), `aria-label="Toggle theme"` but no `aria-pressed`/state, no `type="button"`, not tokenized. Rendered twice: mobile topbar (`HoteladminDashboard.jsx:~171`) and sidebar footer, where it **disappears when the rail is collapsed** (`components/Sidebar.jsx`, `{!collapsed && ...}` in footer) → no theme control at 768-1023px collapsed. LOW/MEDIUM.
- ToastContainer uses `theme="colored"` and `top: 80px` (`App.jsx:397-416`) — it doesn't follow dark mode, and the 80px offset assumes the public Navbar, which hotel admin doesn't render. LOW.
- `StaffLogin.jsx` is light-only (hardcoded `#F8F9FB`, gray classes); if `theme=dark` the rest of the app is dark but login stays light. LOW.

---

## 5. Socket / realtime
- Client `frontend/src/core/context/SocketContext.jsx:114-147`: connects to `getSocketUrl()` (VITE_SOCKET_URL || VITE_API_BASE_URL || localhost:3000) with `auth: { token: staffAccessToken, userId, role, hotelId }`, infinite reconnection. Re-creates only when identity (user/property/path) changes (`:32-75`), **not when the token rotates**.
- Server `Backend/config/socket.js:56-66` CORS = CLIENT_URL list; `io.use` verifies the token **only at handshake** (`:79-105`); invalid/expired → anonymous. `join-hotel` is fail-closed (`:116-130`).
- HIGH: after the access token expires (≥1h) any reconnect (backend restart, Wi-Fi blip) reuses the stale `auth.token` → socket is anonymous → `join-hotel` silently denied → dashboard stops receiving live orders/notifications with "connected" status. QA: log in, wait for/force expiry (short `JWT_EXPIRE`), restart backend, place a guest QR order → expect live update.
- CORS for sockets defaults to 5173/5174 only (`socket.js:57-59`) vs HTTP's 5173/5174/5175 (`server.js:161-163`) when CLIENT_URL is unset. LOW.

---

## 6. Rate limiting (`Backend/middleware/rateLimiter.js`)
- `isDev = NODE_ENV !== "production"` (`:7`). Dev limits are generous: api 10000/15min (`:74-85`), auth 1000/15min with `skipSuccessfulRequests` (`:43-56`), write ops 1000/h (`:231-242`), batch 100/h (`:174-185`, applies to seed endpoints), export 50/15min.
- Prod: api 5000/15min per IP, auth 20/15min, writeOperation 100/h, batch 20/h, export 10/15min. Store is in-memory unless REDIS_URL (not set in Backend/.env).
- No `app.set('trust proxy', …)` anywhere — behind a proxy (Railway/Vercel) every user shares the proxy IP and limits apply globally. MEDIUM (prod).
- Comment at `server.js:213` says "100 req / 15 min" — stale. LOW.
- QA: rate-limit tests are only meaningful with `NODE_ENV=production`; in dev the 6-attempt **account lockout** (§2) triggers long before any limiter. 429 body shape: `{ success:false, message }` — verify the UI toasts it (hotel-admin services surface `e.response?.data?.message`).

---

## 7. Global error handling
- Order in `server.js`: Sentry error handler → `notFound` → `errorHandler` (`server.js:~330-340`). Malformed JSON → 400 JSON (`server.js:258-272`). Request timeout 30s → 408 JSON (`server.js:217-238`).
- `Backend/middleware/errorHandler.js`: maps CastError→404, 11000→400 (names the field in dev), ValidationError→400 (joined messages), JWT errors→401 (`:36-67`). Response `{ success:false, message }`; in `development` adds `stack` and `details` (`:83-96`); prod 5xx messages are generic plus `errorId`.
- Note: NODE_ENV defaults to `development` (`envValidator.js:33-38`), so stacks leak in any env where NODE_ENV is unset. LOW for QA, MEDIUM for deploy.
- `notFound` for unknown `/api/*` routes → 404 JSON `Route not found: …`.
- Frontend: top-level `shared/components/ErrorBoundary.jsx` wraps the whole app (`App.jsx:200`); there is no per-section boundary inside `HoteladminDashboard`, so a render crash in one section blanks the whole app. MEDIUM.

---

## 8. Shared modal / design-system components — inconsistencies to reconcile

Hotel admin has its own kit `frontend/src/features/staff/hotel-admin/components/ui/` (Button, IconButton, Field inputs, Modal, Badge, StatCard, States, PageHeader, FilterTabs/Segmented, Pagination, Table) on `--ha-*` tokens (`styles/hotel-admin-tokens.css`, `components/ui/ha-ui.css`). It is mixed with legacy shared components:

| # | Inconsistency | Where | Sev |
|---|---|---|---|
| 1 | **Two dialog systems.** Form/detail dialogs use ha `Modal` (portal, `role="dialog"`, aria-modal, focus trap, Esc, focus restore, scroll lock — `components/ui/Modal.jsx:9-115`). Destructive confirms use `shared/components/ConfirmDialog.jsx` which has **no portal, no `role="dialog"`/aria-modal/labelledby, no Esc, no focus trap/restore, no scroll lock, buttons lack `type="button"`** (`ConfirmDialog.jsx:63-110`). | ConfirmDialog in Notifications, Restaurant, Room, RoomQR, Staff, Stock, Table pages; ha Modal in Billing, Orders, RoomQR, Restaurant, Room, Staff, Stock, Table | HIGH |
| 2 | Confirm UX differs by page: Orders' cancel uses ha `Modal` with a required reason (`OrderManagement.jsx:475`); every other destructive action uses ConfirmDialog. | pages above | MEDIUM |
| 3 | ConfirmDialog styling isn't on ha tokens: global vars `--bg-card`/`--bg-card-dark` (#1e293b) and `--border-primary` vs ha surface #1a1f2e/#ffffff; dark mode via `isDark` prop class, not `.dark .hotelAdminShell`; different radius/shadow/animation; Inter/Plus Jakarta fonts don't apply (it's outside the portal wrapper but inside shell DOM — inherits font only by accident). | `shared/components/ConfirmDialog.css:1-60`, `ConfirmDialog.jsx:32,65` | MEDIUM |
| 4 | z-index ladder is ad hoc: ha Modal overlay 1000 (`ha-ui.css:275-278`), ConfirmDialog 9999 (`ConfirmDialog.css:9`), Toast 9999 (`App.jsx:~411`), Sidebar 100 (`Sidebar.module.css:32`), shell sidebar 60/backdrop 55/topbar 40 (`styles/shell.css:20,51,67`). Toasts tie with ConfirmDialog; no tokens. | as listed | LOW |
| 5 | Heavy inline `style={{…}}` alongside the kit: Restaurant 36, Dashboard 30, Orders 30, Reports 30, StaffMgmt 27, RoomQR 26, Table 19, Stock 18, Notifications 15, Billing 9 occurrences. These bypass tokens/responsive classes and are where visual drift will be found. | `pages/*.jsx` | MEDIUM |
| 6 | `hotel-admin-tokens.css` is re-imported by 11 pages; `ha-ui.css` comes via the `components/ui/index.js` barrel. Harmless but redundant. | pages imports | LOW |
| 7 | Five duplicated axios instances in `hotel-admin/services/*` instead of `core/api/client.js` (no refresh, see §3); `menuApi`/`tableApi` overlap with Restaurant page containing its own table + batch + QR modals that duplicate TableManagement (`RestaurantManagement.jsx:542-629` vs `TableManagement.jsx:377-438`). | services, pages | HIGH (auth) / MEDIUM (dup UI) |
| 8 | Stock/Inventory is **mock-only**: `services/stockApi.js:1-14` in-memory seed, nothing persists across refresh. QA must not file "data lost on refresh" as a regression; the UX pass should check that the page clearly says so. | stockApi.js | MEDIUM (product gap) |
| 9 | ThemeToggle is not part of the ha kit (hardcoded colors, hidden in collapsed rail) — §4. | shared/ui/ThemeToggle.jsx | LOW |
| 10 | Sidebar profile role shows raw `staffUser.role` (e.g. lowercase "owner") (`components/Sidebar.jsx`, profileRole span). Hotel name falls back to the admin's fullname when no property. | Sidebar.jsx | LOW |
| 11 | Other shared modals (`BillPreviewModal`, `CancelOrderModal`, `ExtendStayModal`, `NoBookingsModal`, `StaffSettings`, `MessagingPanel`) are **not used by hotel-admin pages** (grep of imports); out of scope unless a page adds them. `shared/ui/GoogleConfirmModal.jsx` likewise. | shared/components | info |
| 12 | Staff login page: "Remember this device" checkbox is collected but never sent or used (`StaffLogin.jsx:14,38`); "Contact your administrator" is a `<button>` with no handler; inputs have visible `<label>`s without `htmlFor`/`id` association; password toggle has no aria-label; ~all styling inline. | `features/public/auth/staff/StaffLogin.jsx` | MEDIUM |

Recommended reconciliation target for the UX pass: one `ConfirmDialog` built on the ha `Modal` (variant danger/warning/info, loading state, optional required-reason field), used by all 8 pages including Orders cancel; z-index tokens (`--ha-z-overlay`, `--ha-z-modal`, `--ha-z-toast`); move hotel-admin services onto `core/api/client.js`; ThemeToggle with `aria-pressed` that stays reachable in the collapsed rail.

---

## 9. Test tooling
- **No Playwright, Cypress, Vitest, Jest or Testing Library** in any `package.json`; no `playwright.config.*`; `@playwright` absent from root and frontend `node_modules`.
- Backend: `node:test` + `mongodb-memory-server` (`Backend/package.json` scripts). `test:staff` covers staff management integration (`Backend/tests/staffManagement.integration.test.js`). Run: `cd Backend; npm test` (no external DB needed).
- Frontend: only `frontend/tests/walletPayments.test.mjs`, not wired to any script.
- Lint: `npm run lint` (root or `frontend/`).
- For an executing QA agent: install Playwright ad hoc in a scratch dir (e.g. `npm i -D @playwright/test@<pinned>` + `npx playwright install chromium`) or use a browser MCP. Use **one browser context and one page** per session (sessionStorage auth), log in via the UI or by setting `staffAccessToken`/`staffUser`/`staffRole` in sessionStorage after `POST /api/v1/staff/login`.

---

## 10. Blockers / gotchas for an executing QA agent (ordered)
1. **Database safety (BLOCKER until confirmed):** `Backend/.env` MONGODB_URI may point to a live Atlas cluster (README). `setupTestHotel.js` and the in-app "Seed" button mutate data (re-link all receptionists, insert orders/invoices). Point MONGODB_URI at a local/disposable DB first; get the user's OK before seeding a shared DB.
2. **Right seed script:** use `node scripts/setupTestHotel.js`. `createHotelAdmin.js` yields an account that cannot log in (no company; `admin` → `/dashboard` 404).
3. **Password ambiguity:** `hoteladmin@test.com` may already exist with `Test@1234`, `Admin@1234`, or `Admin@123` depending on which script ran first; setupTestHotel won't reset it. If login fails, ask the user or create a fresh owner via `POST /api/v1/seed/test-hotel-admin` with a custom `email`/`password` body.
4. **Account lockout** after 6 bad passwords (30 min, dev too). Use a throwaway account for negative-login tests.
5. **sessionStorage auth:** no new tabs/pages; deep links need login in the same tab.
6. **1-hour expiry** breaks hotel-admin CRUD pages (no refresh in `hotel-admin/services/*`) and realtime after reconnect. Long sessions will see spurious 401s — that's a real defect, not test flakiness.
7. **Port drift:** keep 3000 free; frontend has no discovery.
8. **Public DNS forced** (8.8.8.8) — SRV Mongo lookups may fail on restricted networks.
9. **Stock page is mock data** — expected non-persistence.
10. **No E2E tooling in repo** — the agent must bring its own (do not add it to the repo's package.json without approval).
