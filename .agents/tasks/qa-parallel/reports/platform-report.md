# Session 01 (platform) report

Branch `qa/platform` in `.worktrees/qa-platform`, based on `67759ec`. There are 10 commits, all unpushed and unmerged. The harness is in `.qa-harness/platform/` (specs, probes, screenshots in `shots/`, JSON results).

## 1. Environment

| Item | Value |
|---|---|
| API / web | 3000 (confirmed in log) / 5173 (`vite preview` of the production build; the dev server took 2+ min per page load under 4 parallel sessions, so the browser runs used the built bundle) |
| DB | `mongodb-memory-server` on 127.0.0.1:27101, DB `stayhaven_qa_platform` (local, throwaway). Fixtures: Company A and Company B, 2 hotels each, owner/hoteladmin/admin/manager/receptionist/waiter/chief, waiter2 on hotel 2, superadmin, guest, 3 lockout accounts |
| Browser | `@playwright/test` 1.49.1 library with system Chrome (`channel: 'chrome'`). The bundled chromium crashes (exit 0xC0000135) and the test runner hangs in this sandbox, so `browser-run.mjs` drives the library directly |
| Env | `backend/.env` generated with random 48-char JWT secrets. No third-party keys |

| Check | Baseline (67759ec) | Final (b97ed58) |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings |
| `npm run build` (needs `VITE_API_BASE_URL` + `ALLOW_LOCAL_API_IN_PROD_BUILD=true` locally) | pass | pass |
| `npm run test:frontend` | 14/14 | 17/17 |
| `backend npm test` | 131/133 | 135/137 |

The same 2 backend failures appear in baseline and final: `bookingIntegrity.integration.test.js` "companyless staff cannot read another booking" returns 500 where 403 is expected. That code is in the booking routes owned by session 08. New test files: `platformAuth.integration.test.js`, `orderAccess.integration.test.js`, `uploadErrors.test.js` (backend, picked up by the `tests/*.test.js` glob, so no package.json change) and `frontend/tests/staffRoleRoutes.test.mjs`.

## 2. Feature PASS/FAIL

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| Auth/session API (`auth-probe.mjs`) | 53 | 53 | 0 | 0 | Baseline was 32/52 |
| Orders core API (`orders-probe.mjs`) | 24 | 24 | 0 | 0 | Covers tenancy, transitions, race (→409), pricing, input |
| Production mode (`prod-probe.mjs`, NODE_ENV=production) | 11 | 11 | 0 | 0 | CSP, HSTS, CORS 403, no stack traces, 429 with message |
| Sockets (`socket-probe.mjs`) | 7 | 7 | 0 | 0 | Cross-tenant join, guest/anon join and spoofed relay all refused |
| Browser login → dashboard, 8 roles × 1440/390 | 32 | 31 | 1 | 0 | The superadmin 390 screenshot timed out. The 1440 run landed correctly |
| Browser session (role tamper, logout revoke, silent refresh, two-tab race, lockout UI) | 11 | 11 | 0 | 0 | |
| BillPreviewModal (360/390/1440 light+dark) | 90 | 88 | 2 | 1 | The 2 fails are 1440 "scroll restored" (see 9). The 844×390 run is BLOCKED because the harness click timed out |
| ConfirmDialog (390/1440) | 9 | 9 | 0 | 0 | alertdialog, focus on Cancel, portal, bottom sheet, Esc |
| Runtime page errors | – | – | – | – | `loadStripe(undefined)` throws on every staff page because there is no Stripe key locally. BLOCKED (env); the guard belongs to sessions 07 and 08 |

## 3. Mobile matrix (rules F)

Pages tested: staff login, guest login, `/login` and NotFound (with the Footer), at 360/375/390/412/768/844×390/1024/1280/1440, light and dark. **No horizontal overflow on any of the 72 page × viewport × theme combinations.** Screenshots are in `shots/<page>-<theme>-{375,1440}.png` and the data is in `mobile-matrix.json`.

| Page | Overflow | Remaining sub-44px targets / input font < 16px | Owner |
|---|---|---|---|
| staff-login | none | inputs 14px; password eye 20×20; "Forgot password?" 42px tall | 08 |
| guest-login | none | inputs 14px; eye 20×20 | 07 |
| auth-login | none | inputs 14px; inline text links | 08 |
| NotFound + Footer | none | fixed: contact rows 44px, social 44px, burger/close 44px | 01 (done, 0c3f6e8) |
| BillPreviewModal | none | full-width bottom sheet ≤ 100dvh−32, sticky actions, 16px input | 01 (done) |
| ConfirmDialog | none | bottom sheet ≤ 480px, 44px buttons | 01 (done) |
| Toasts | – | top-center on phones, z-index 10050 above modals | 01 (b97ed58: built, **not re-verified in the browser**) |

## 4. Security matrix (key rows)

| Actor | Call | Expected | Actual (final) |
|---|---|---|---|
| guest token | GET /api/v1/staff/me, orders, menu-items, notifications, … | 401/403 | 403 (baseline: 200/400) |
| no token / tampered / alg=none | GET /staff/me | 401 | 401 |
| waiter A1 | create/read orders of hotel A2 (same company) | 403/404 | 403/404 (baseline: 201/200) |
| owner B | GET/PUT orders of Company A | 403/404 | 403/404 |
| waiter | pending→delivered | 403 | 403 (baseline: 200) |
| chief + manager at once | →ready | one 200, one 409 | 200, 409 |
| receptionist | PUT order status | 403 | 403 |
| tampered sessionStorage role=owner | GET /staff/pending-invites | 403 | 403 |
| cookie-only POST, no CSRF header | /staff/notifications | 403 | 403 (baseline: 500/200) |
| expired access token | POST /staff/logout, then refresh | refresh 401 | 401 (baseline: refresh 200) |
| two tabs | concurrent refresh | both 200, session survives | 200,200 then 200 |
| anon | 200 KB body | 413 | 413 (baseline: 400) |
| anon | `search=(((`, `limit=abc&page=-1` | 200 | 200 (baseline: 500) |
| evil Origin (prod) | any | 403, no ACAO | 403 (baseline: 500) |
| anon | GET /health | no env/version/memory | status, db only |
| 6 wrong passwords | login | 423; same message for unknown user | 423, "Invalid credentials" for both |
| socket, waiter A | join-hotel B, join-role as superadmin | no B events | none |
| socket, guest/anon | join-hotel | no events | none |

## 5. Bugs fixed

| # | Sev | file | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | routes/staffRoutes.js, middleware/authMiddleware.js | Staff routers only called `protect`, so any guest JWT passed | `requireStaffRole` on the whole router after the public routes | auth-probe, platformAuth test | 2e4e442 |
| 2 | P0 | controllers/orderController.js `assertHotelAccess` + 7 per-order filters | Only receptionists were hotel-scoped; owner/null-company bypassed the check; admin was treated as superadmin | `getAccessibleHotelIds`: owner/admin = company hotels, everyone else = assigned hotels | orders-probe, orderAccess test | 4bbfa80 |
| 3 | P0 | middleware/authMiddleware.js | Cookie-only writes had no CSRF check | Double-submit check when the token came from the cookie | auth-probe | 2e4e442 |
| 4 | P0 | services/notificationService.js, staffController invite email | User text was interpolated into email HTML | Every interpolated value is escaped | orderAccess test | 4bbfa80 |
| 5 | P1 | staffController login/redirect, ProtectedStaffRoute, App.jsx | hoteladmin was refused at login; admin and manager were sent to 404 routes; three different role maps | One `STAFF_HOME_ROUTES` map (backend + frontend mirror) with a parity test | browser 8 roles, staffRoleRoutes test | 2e4e442 |
| 6 | P1 | staffController `staffLogout`, StaffAuthContext | Logout needed a valid access token; the context never called the server | Logout identifies the user from an expired-but-signed token or the refresh cookie; context posts logout | browser + probe | 2e4e442 |
| 7 | P1 | staffController `refreshAccessToken` | Read-then-write rotation; a parallel tab forced a logout | Atomic compare-and-swap, 30 s grace via hashed previous token, replay after grace revokes | platformAuth test, browser two-tab | 2e4e442 |
| 8 | P1 | orderController `updateOrderStatus` | Any forward jump allowed | Per-role table (kitchen ≤ready, waiter ready→delivered, supervisors any), same-status no-op | orders-probe | 4bbfa80 |
| 9 | P1 | orderController cancel/retry | `next` not passed, so errors became unhandled rejections and shut the server down | Pass `next`; a non-string reason returns 400 | orderAccess test | 4bbfa80 |
| 10 | P1 | SocketContext.jsx | The socket held a stale `auth.token`, and live updates died at token expiry | `auth` as a function plus refresh-and-reconnect on server disconnect | code + socket-probe (expiry path not browser-tested: BLOCKED, needs `JWT_EXPIRE=2m` run) | 5c05776 |
| 11 | P1 | BillPreviewModal.jsx, sendBillToCustomer | Hard-coded 13% VAT, "Test Hotel" placeholders, PII console.log, unescaped print, no dialog semantics | Rates from the tab snapshot or hotel billing; portal dialog with focus trap; validated email; escaped print; popup-blocked toast | browser 88/90 | 5c05776, 078f6d7, 4977655 |
| 12 | P1 | models/guest.schema.js | Per-company guestId sequence plus a global unique index caused E11000 | Global sequence that skips taken ids | orderAccess test | 078f6d7 |
| 13 | P2 | server.js | CORS rejection returned 500; oversized body returned 400 | 403 / 413 | probes | 2e4e442 |
| 14 | P2 | routes/healthRoutes.js | Public /health leaked env, version, uptime and memory | Status + db only; the rest goes to the log | probe | 2e4e442 |
| 15 | P2 | middleware/rateLimiter.js | Write limiter keyed by IP, so a whole hotel Wi-Fi shared 100 writes/h | Keyed per user, 600/h | code | 2e4e442 |
| 16 | P2 | getOrders | Unescaped `$regex`, NaN paging | `utils/searchQuery.js` | probe | 4bbfa80 |
| 17 | P2 | upload.js, errorHandler.js | Multer errors returned 500; only the MIME type was checked | 413/400; magic-byte check before Cloudinary | uploadErrors test | 50a0072 |
| 18 | P2 | config/sentry.js | Authorization, cookies and user email could be sent | `sendDefaultPii:false`, headers/cookies/user scrubbed | code only | 50a0072 |
| 19 | P2 | StaffAuthContext | Refresh timer was based on page load (55 min) | Scheduled from the token `exp` | code + browser silent refresh | 2e4e442 |
| 20 | P2 | client.js | Superadmin CMS writes went out with the guest token | Content admin/writes use the staff scope | authClient test | 2e4e442 |
| 21 | P2 | NotificationContext.jsx | Double call badge/beep, duplicate status cards, sound prompt over the bottom nav | Dedupe by id; initial call count from the server; prompt above `--bottom-nav-height` | code only | 4977655 |
| 22 | P2 | company.schema.js | Email regex rejected 4+ letter TLDs | Permissive regex | orderAccess test | 078f6d7 |
| 23 | P3 | ConfirmDialog, ErrorBoundary, ThemeToggle, Footer, Navbar, ItemCarousel, TableBills.css, MessagingPanel.css | a11y / tap targets | alertdialog + portal; per-route boundary that resets on navigation; aria-pressed; 44px targets | browser | 5c05776, 0c3f6e8, 4977655 |
| 24 | P3 | webrtcManager.js, callSounds.js, App.jsx | Peer ids and ICE state logged in production | Dev-only logs | code | 50a0072 |

## 6. UX/visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| BillPreviewModal | Transparent backdrop, light-only, 13% hard-coded, centered card on phones | Dim backdrop, dark tokens, bottom sheet ≤480px with sticky actions, real rates | `shots/bill-{light,dark}-{360x740,390x844,1440x900}.png` |
| ConfirmDialog | Centered card, no focus management | Bottom sheet on phones, stacked 44px actions, focus on Cancel | `shots/confirm-{390,1440}.png` |
| Toasts | 80px top offset on phones covered the header; z 9999 tied with modals | Top-center on phones, z 10050 | `shots/landing-*-390.png` show the before state; the after state is not re-shot |
| Footer/Navbar | 32–40px targets | 44px | `shots/not-found-*-375.png` |

`frontend/src/shared/styles/dashboard-tokens.css` (`--db-*`, opt-in via `.dashboardShell`) now mirrors the rules G contract using the hotel-admin values. No dashboard imports it yet.

## 7. REQs

All REQs in `requests/hoteladmin.md`, `requests/reception.md` and `requests/waiter.md` have inline replies. Summary:
- **Done:** hoteladmin-1…7 and 9; reception-1…4; waiter-1, 3, 4, 8, 10, 11, 12, 16 and 19; waiter-9, 13 and 18 partly (the rest is noted inline).
- **Rejected (not my files, forwarded):** waiter-2, 5 and 6-menu → 02; waiter-9-emit and 14 → 07; waiter-15 → 08/07.
- **Rejected (new product behaviour, needs the user):** waiter-17 (refresh sessions per device), waiter-7 (new UI).
- **Not processed:** `hoteladmin-to-reception.md` is between 02 and 03. No requests from kitchen, superadmin, guest or public had arrived when this pass ran.

## 8. Decisions

- Manager now lands on `/hoteladmin-dashboard`. Login, ProtectedStaffRoute and App.jsx disagreed; that route already admits managers, and reception remains reachable for managers.
- Hotel scope: owner/admin = the whole company; manager, hoteladmin and floor staff = assigned hotels. This matches the existing socket rule in `socketSecurity.js`.
- Kitchen may skip `confirmed`. That matches the kitchen UI, which goes new→preparing→ready.
- Staff refresh grace is 30 s instead of a token family list. It is the minimal fix for the two-tab case without adding a schema-level session store.
- Bill totals mirror `diningBilling.computeTotals` for the single order with the tab's rates; tab-level discounts and payments stay in TableBillsPanel.
- The staff and guest login endpoints still accept each other's credentials. That is the shared User identity, and superadmin signs in via `/login`; data access is gated per router instead.

## 9. Remaining issues

| Sev | Issue | Where | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P1 | The hoteladmin dashboard shows "User role 'hoteladmin' is not authorized" | `routes/receptionRoutes.js` authorize lists | Owned by 03 (REQ-hoteladmin-R1) | Add hoteladmin to those authorize lists |
| P1 | `loadStripe(undefined)` throws on every page when no key is set | `guest/.../BillingView.jsx:39`, `public/.../BookingPaymentModal.jsx:14` | Owned by 07 and 08 | Only call `loadStripe` when the key is set |
| P1 | Socket reconnect after token expiry is not browser-verified | SocketContext.jsx | Needs a `JWT_EXPIRE=2m` run; harness time ran out | Re-run waiter `token-expiry.mjs` against `qa/platform` |
| P2 | Body scroll stays `hidden` after closing BillPreviewModal at 1440 | waiter/kitchen/reception dashboards set `body.overflow=hidden` themselves | The value is restored to the dashboard's own `hidden`; the check compared against `''` | Not a bug in the modal, but dashboard-level body locks should move to a container |
| P2 | Toast z-index/offset fix not re-verified in the browser | App.jsx, index.css (b97ed58) | Out of time | Re-shoot `landing-*-390` |
| P2 | Staff/guest/auth login inputs are 14px (iOS zoom); eye buttons are 20×20 | StaffLogin.jsx, GuestDashboardLogin.jsx, AuthPage.jsx | Owned by 08 and 07 | 16px inputs, 44px icon buttons |
| P2 | One refresh token per user, so a second device signs out the first | staffController | Product decision | Per-device token hashes, or a "signed in elsewhere" message |
| P2 | Duplicate `new-waiter-call` emits | guestController.js | Owned by 07 | Emit once |
| P2 | StaffSettings avatar has no initials fallback | shared/components/StaffSettings.jsx | Time | Reuse the sidebar initials avatar |
| P3 | Reception Live Room Status bars and stat-card row clip at 390 | reception DashboardContent | Owned by 03 | Wrap or horizontally scroll with an affordance |

## Repository secrets and config

- **Tracked:** only `backend/.env.example`, `frontend/.env.example` and `PAYMENT_TEST_CREDENTIALS.md` (sandbox docs). `backend/sum.tmp.mjs` and `sum.tmp.txt` are tracked scratch files; I suggest deleting them.
- **History:** `frontend/.env.production` and `.env.production` were committed in 87cc9f9, 217c3a3 and 096c533 and removed in e919b60. They held only `VITE_API_BASE_URL`, with no secrets.
- **Ignored local files (key names only):** root `.env` has MAIL_USERNAME, MAIL_PASSWORD, SENDER_EMAIL and VITE_API_BASE_URL. **`MAIL_PASSWORD` in a root `.env` read by Vite tooling is risky; move it to `backend/.env`.** `Backend/.env` holds JWT_*, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, KHALTI/ESEWA secrets, CLOUDINARY_API_SECRET, GOOGLE_CLIENT_SECRET, SMTP_PASS, SUPERADMIN_PASSWORD and TEXTBELT_API_KEY. Recommend rotating anything that has ever been shared, especially because `.claude/worktrees/*` copies `.env.production`. `frontend/.env` VITE_* keys are all public by nature (publishable/Google client id/Khalti public).
- `config/productionBuild.mjs` already refuses VITE_*SECRET/PASSWORD keys and test Stripe keys in production builds.
- **`npm audit --omit=dev`:** 0 vulnerabilities in root, frontend and backend.
- **Config:** CSP and HSTS are on in production; CORS is an allow-list with no reflection; `trust proxy` comes from `TRUST_PROXY_HOPS` (default 0); DNS override is only applied when `DNS_SERVERS` or `MONGODB_DOH_FALLBACK=true` is set; JWT is pinned to HS256 and typed (access/refresh); password change revokes via `passwordChangedAt`.
- **Body size:** the JSON limit is the express default of 100 kb, and 413 is now returned.

## Cross-dashboard consistency (landing screenshots at 390/1440, `shots/landing-*`)

| Element | Hotel admin (reference) | Waiter | Kitchen | Reception | Superadmin |
|---|---|---|---|---|---|
| Primary colour | emerald `--ha-primary` | emerald (match) | **purple** chips | **indigo/purple** gradients | not captured at 390 |
| Phone nav | drawer (burger) | bottom nav, 6 items | bottom nav, 4 | bottom nav, **10 items (cramped, "Check-In" wraps)** | – |
| Cards | 12px radius, border | 16–24px radius | dashed empty state | 12px radius | – |
| Status badges | `--ha-*` status | green pill with text (ok) | – | trend pills, red/green | – |
| Empty state | icon + CTA ("Seed sample data") | – | text only, **no CTA** | zeros with **"0% vs yesterday" trend (fabricated, REQ-hoteladmin-R3)** | – |
| Messaging FAB | – | over the last card's action row (now lifts with `--bottom-nav-height`) | ok | **two FABs stacked** | – |
| Money | `Rs. 0` | `Rs 160.00` | – | **`₹0`** (should be Rs.) | – |

Owners: map these to `--db-*` after merge. Reception has the most deviations: currency, nav density, a duplicate FAB and fake trends.

## Cleanup

`backend/scripts/_qa_tmp_platform.js` is deleted. The API (3000), web (5173), mongo (27101) and my harness node/chrome processes are stopped, and the ports are confirmed free. The worktree, branch and commits are left for review. Suggested merge order is unchanged: 01 first.

## Between waves

Wave 1 (platform, hoteladmin, reception, waiter) has finished. Wave 2 (kitchen, superadmin, guest, public) branches from `qa/platform` at **`b97ed58`**. This pass made no new commits; the only change was the request replies below.

**Processes:** nothing is listening on 3000–3003 or 5173–5176, and no node or mongod process started from `.worktrees\qa-*` is still running. Nothing was stopped because nothing was left.

**Requests:** one file still had open entries: `requests/hoteladmin-to-reception.md` (R1–R3, from 02 to 03). Session 03 had already fixed all three on `qa/reception` in 55ebe84 (with 8b25ff6 and 630d3eb) but never marked them. I checked the code with `git show qa/reception:…`, ran `tests/receptionScope.integration.test.js` on qa/reception (1/1 pass), and marked each one `status: done in 55ebe84 on qa/reception`. No change was needed on qa/platform, because the target files belong to 03. No request files from wave-2 sessions exist yet.

**Verification on qa/platform @ b97ed58** (backend log: `.qa-harness/platform/between-waves-backend.log`):

| Check | Baseline (67759ec) | Now |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings |
| `npm run build` (`VITE_API_BASE_URL=http://localhost:3000`, `ALLOW_LOCAL_API_IN_PROD_BUILD=true`) | pass | pass (chunk-size warning only) |
| `npm run test:frontend` | 14/14 | 17/17 |
| `backend npm test` | 131/133 | 135/137. The same 2 failures as baseline: `bookingIntegrity` "companyless staff cannot read another booking" returns 500 instead of 403, plus its parent test. These are booking routes, owned by 08 |

qa/platform is green, with no new failures compared with baseline.

### What wave 2 inherits from qa/platform

- **Staff API gate:** `requireStaffRole` covers all of `/api/v1/staff/*`, so a guest token gets 403. Cookie-only writes need `X-CSRF-Token` (fetch it from `GET /api/v1/csrf-token`). `requireStaffRole` is exported from `middleware/authMiddleware.js` for reuse on feature routers.
- **Role → dashboard map:** `backend/utils/staffRoleRoutes.js` has a frontend mirror in `frontend/src/core/routes/staffRoleRoutes.js`, and `frontend/tests/staffRoleRoutes.test.mjs` keeps the two in sync. Use `DASHBOARD_ROLES` for route guards; don't hard-code role lists.
- **Orders core** (`orderController.js`):
  - Hotel scope: `getAccessibleHotelIds` gives owner/admin the company's hotels and every other role its assigned hotels.
  - Status changes follow a per-role table. Chief/kitchen: pending → confirmed / preparing / ready, and may skip `confirmed`. Waiter: ready → delivered only. Supervisors: any forward step. Setting the same status returns 200 with `unchanged:true`. A concurrent update gets 409. A forbidden change gets 403 with `allowedStatuses`.
  - Search is escaped and paging is safe (`utils/searchQuery.js`: `searchRegex`, `parsePaging`). Kitchen (05) should build its status buttons from this table.
- **Sessions:**
  - Refresh is single-flight, with a 30 s rotation grace for parallel tabs.
  - Logout revokes on the server.
  - The proactive refresh timer is scheduled from the token's `exp`.
  - SocketContext reads a fresh token on every (re)connect and refreshes once after `io server disconnect`.
- **Shared UI:**
  - `ConfirmDialog`: alertdialog, portal, focus on Cancel, bottom sheet on phones.
  - `BillPreviewModal`: real rates, escaped print, no PII logs.
  - Per-route `ErrorBoundary`, plus `ThemeToggle` with `aria-pressed`.
  - Toasts are top-center on phones at z-index 10050.
  - Set `--bottom-nav-height` on your dashboard shell; the messaging FAB and the sound-unlock prompt lift above it.
  - `frontend/src/shared/styles/dashboard-tokens.css` (`--db-*`, opt-in via `.dashboardShell`) carries the rules G contract.
- **Backend hardening:** multer errors return 400/413 and uploads are checked by magic bytes. `escapeHtml` is applied in `notificationService` emails. The write limiter is keyed per user. `/health` returns status and db only. Sentry scrubs PII. CORS rejections return 403 and oversized bodies return 413.
- **Models:** `guestId` uses a global sequence (no E11000 for a second company), and the company email regex accepts 4+ letter TLDs such as `@qa.test`. Model changes still go through 01.

### What wave 2 does NOT inherit

The fixes on `qa/hoteladmin`, `qa/reception` and `qa/waiter` are not merged into qa/platform, so wave-2 worktrees don't have them. That covers:
- room/table/menu tenancy, including the `GET /tables` QR-token leak (REQ-waiter-2)
- reception hotel scoping and the reception CSRF check
- `hoteladmin` access to the reception report routes (R1)
- waiter-call and table-assignment scoping

Wave-2 probes that touch those endpoints will see baseline behaviour. Record such results as "fixed on qa/<branch>", not as new bugs.

### Open items forwarded to wave-2 owners

| Owner | Item |
|---|---|
| 05 kitchen | Set `--bottom-nav-height` on the kitchen shell (the sound prompt used to cover the bottom nav). Use the server status table above. The empty state has no CTA. Purple chips should be mapped to the status tokens |
| 06 superadmin | CMS/content writes now use the staff token scope (`client.js`). Superadmin signs in via `/login`. The superadmin 390 landing screenshot was never captured |
| 07 guest | Guard `loadStripe` when `VITE_STRIPE_PUBLISHABLE_KEY` is empty (`BillingView.jsx:39`). `new-waiter-call` is emitted twice (`guestController.js`, REQ-waiter-9). `callWaiter` has no 30 s de-dupe (REQ-waiter-14). Guest login inputs are 14px and the eye button is 20×20 |
| 08 public | Guard `loadStripe` (`BookingPaymentModal.jsx:14`). StaffLogin and AuthPage inputs should be 16px with `autocomplete="username"`/`"current-password"`, and the eye button 44px (REQ-waiter-15, reception note). The baseline `bookingIntegrity` 500 (companyless staff) is in the booking routes |
| User decision | Per-device refresh sessions (REQ-waiter-17). Whether the order card's printed bill should be the whole tab (REQ-waiter-18 remainder). A table-assignment UI (REQ-waiter-7) |

### Environment notes for wave 2

- The bundled Playwright chromium crashes in this sandbox (0xC0000135). Drive system Chrome with `channel: 'chrome'` through the library; the test runner hangs here.
- Under parallel load, `vite` dev took more than 2 minutes per page. `vite preview` of a build is faster: build with `VITE_API_BASE_URL=http://localhost:<API>` and `ALLOW_LOCAL_API_IN_PROD_BUILD=true`.
- Run the backend suite as a background job that writes to a log. A foreground run was cut off after the first test file. The full run takes about 4–5 minutes.
- There is no local mongod. Use `mongodb-memory-server` on port `27100 + <session #>`.

## Final pass (after wave 2)

`qa/platform` was fast-forwarded to `main` @ `5339d4e` (all wave-1 and wave-2 merges, incl. qa/guest), then two commits were added. Nothing pushed or merged.

| Commit | Scope |
|---|---|
| `7388420` | backend: REQ-kitchen-1/3/4, superadmin-1/2/3/4/6, guest-1, public-1/6/7/9, regression tests |
| `4e446ea` | frontend: REQ-public-3/4/5/10, kitchen-2/3/4/8, guest-2/3/5, superadmin-5 |

Both commits are green: the backend commit was tested by the full backend suite, and the frontend commit by lint, build and the frontend tests. Neither suite touches the other side's files. Logs are in `.qa-harness/platform/final/`.

### Final verification (tree = `4e446ea`)

| Check | Baseline 67759ec | Wave-2 merge 4333eec | Final 4e446ea |
|---|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 13 warnings | **0 errors, 13 warnings** (exit 0) |
| `npm run build` (`VITE_API_BASE_URL=http://localhost:3000`, `ALLOW_LOCAL_API_IN_PROD_BUILD=true`) | pass, entry 1,697 kB + chunk-size warning | pass | **pass**, entry `index-*.js` 261 kB (85 kB gzip), no chunk-size warning |
| `npm run test:frontend` | 14/14 | – | **26 pass / 0 fail / 0 skipped** |
| `backend npm test` | 131/133 | 162/162 | **175 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo** (exit 0) |

New backend tests: `tests/routePolicy.test.js` (6 tests, no DB) and `tests/finalPass.integration.test.js` (1 suite with 6 subtests). Both are picked up by the `tests/*.test.js` glob and by the new `npm run test:platform`.

### The 2 `bookingIntegrity` failures from the baseline

The cause was as described: `getBookingById` runs `populate({ path: 'company' })`, and no imported module had registered the `Company` model, so the handler returned 500 "Schema hasn't been registered for model \"Company\"" instead of 403. The minimal fix (`import "../models/company.schema.js"` in `backend/controllers/bookingController.js:5`) was already committed by session 08 in `1b696df`, which is on main through the qa/public merge. No further change was needed on qa/platform. Both "companyless staff cannot read another booking" and its parent "booking isolation, extensions and inventory holds" pass at 4333eec and at 4e446ea.

### Still failing, skipped or blocked

Nothing fails in the final runs: 0 test failures, 0 skipped, 0 lint errors, 0 build errors. Everything below is either not verified or flagged as non-blocking:

| What | Exact error / reason | Where | Classification |
|---|---|---|---|
| 13 lint warnings (not failures) | `react-hooks/exhaustive-deps`, missing dependency | reception `BulkCheckInModal.jsx:33`, `GuestCommunicationModal.jsx:54`, `CheckInOutView.jsx:189`; superadmin `UserActionModals.jsx:29`, `Finance.jsx:85,133`, `HotelManagement.jsx:219,812`, `ReviewModeration.jsx:30`, `SuperadminDashboard.jsx:34`, `SystemConfiguration.jsx:63`; shared `CancelOrderModal.jsx:52`, `ExtendStayModal.jsx:40` | pre-existing (baseline had 16) |
| Browser re-test of this pass's frontend changes | Not run. Lazy routes, OrderContext dual fetch, guest deep link and 401 redirect, footer/navbar/toast tap targets, AboutPage scoping and the new logo were verified by build, lint and unit tests only | `4e446ea`; REQ-public-3/5, kitchen-2/8, guest-2/3/5 | BLOCKED (time); open verification item |
| Lighthouse mobile after code splitting | Not run | REQ-public-3 | BLOCKED (time) |
| Timed SMTP failure | No reachable/unreachable SMTP set up locally. Only the transport options are asserted | REQ-public-6, `config/nodemailer.js` | environmental (no SMTP) |
| Live production 429 for payments and `/auth/check` | Production mode needs HTTPS CLIENT_URL origins locally. Per-user keying is proven by a unit test against the real limiter in dev limits | REQ-public-9, REQ-guest-1 | environmental |
| Flaky under parallel load (seen once, not in the final run) | In an overlapping run (two mongodb-memory-server suites at once), `walletPayments.integration.test.js:10` failed with "Instance failed to start within 60000ms", and 7 tests in `paymentGateway.test.js:428-560` failed with "STRIPE is not configured for production (test or unrecognized secret key)". `paymentGateway.test.js` alone: 30/30. Full suite alone: 175/175 | `tests/helpers/ephemeralWalletDatabase.js` (60 s launch timeout) | environmental (CPU contention); run the backend suite on its own |
| Card payments / Stripe flows in the browser | No Stripe keys locally | public/guest payment pages | environmental (no Stripe) |
| WebKit/iPhone runs | Bundled Playwright browsers crash in this sandbox (0xC0000135) | rules F 390×844 WebKit | environmental |

### Requests processed in this pass

| REQ | Sev | Result |
|---|---|---|
| kitchen-1 | P0 | done 7388420. Chief gets 403 on order edit, confirm-payment, send-bill and retry-bill |
| superadmin-1 | P0 | done 7388420. Hotel status/approve/reject/featured are superadmin-only |
| superadmin-2 | P1 | partly done 7388420. Reason stored, audit entries, email escaped; the response no longer includes the owner's password hash (`populate('owner')` returned the whole User). Suspend/reactivate not done (product decision) |
| guest-6 | P2 | already fixed on main by 02 (0ca9e0c); regression test added |
| public-7 | P1 | done 7388420. The reception invoice no longer adds 13% on top of the quoted total |
| public-9 | P1 | done 7388420. Payment limiter keyed per user, 10/h |
| public-1, public-6 | P1/P2 | done 7388420 |
| public-3, public-10 | P1 | done 4e446ea. Code splitting; logo 1,059 KB → 47 KB |
| public-4 | P2 | partly done. No og:url/canonical without a known production domain |
| public-5, kitchen-8 | P2/P3 | done 4e446ea |
| public-2, guest-4 | P1/P2 | already fixed on main by 07/08 |
| public-8 | P2 | rejected. No change needed; prod strips stack traces |
| kitchen-2/3/4 | P1/P2 | done 7388420 + 4e446ea |
| kitchen-5 | P2 | rejected. Product decision (should the chief be able to cancel?) |
| kitchen-6, kitchen-7 | P2 | rejected. Redesign / cross-feature refactor |
| guest-1 | P2 | partly done. Rate-limited; a signup-token gate would change the signup flow |
| guest-2, guest-3, guest-5 | P2/P3 | done 4e446ea |
| superadmin-3/4/5/6 | P2/P3 | done |

No request file has `status: open` left. Two files owned by finished sessions were edited in this pass because their owners were no longer running: `controllers/paymentController.js` (03, REQ-public-7) and `landing/pages/AboutPage.css` (08, REQ-guest-3). `routes/hotelRoutes.js` and `controllers/hotelController.js` (08) were edited for the superadmin REQs.

### Remaining (needs the user)

- Hotel suspend/reactivate (REQ-superadmin-2a): decide what happens to a suspended hotel's bookings and visibility, then accept `suspended` in `updateHotelStatus`.
- Should the chief be able to cancel orders? (REQ-kitchen-5): `staffRoutes.js` `/orders/:orderId/cancel`.
- `/auth/check` enumeration (REQ-guest-1): replace it with a signup-token flow, or return the "already registered" answer only after OTP verification.
- Waiter `NotificationPanel`/`OrderDetailsModal` reused by the kitchen with light-only colours (REQ-kitchen-7): move them to `shared/` with tokens.
- A shared `--bottom-nav-height` on `:root` (REQ-kitchen-6).
- `HotelController` still logs the owner's email address on every status notification (`hotelController.js` "Hotel status notification sent to …"). Low (P3): drop the address from the log.
- Earlier user decisions are still open: per-device refresh sessions (REQ-waiter-17), whole-tab bill printing (REQ-waiter-18), table-assignment UI (REQ-waiter-7).

### Processes

Nothing was listening on 3000–3007, 5173–5180 or 27101–27108 (`netstat -ano`) at the end of this pass. No dev servers were started and nothing was stopped. The test suites' mongodb-memory-server instances use random ports and exit with each suite.

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and the `requests/*.md` entries. Nothing was re-run. The report already has a "Still failing, skipped or blocked" table for the final pass (after wave 2); this section covers the counts in the wave-1 sections 1-3 and 9 and points to that table for the final pass.

### A. Counted FAILs in the wave-1 tables

| Counted in | Check | Reason (observed) | Where | Status |
|---|---|---|---|---|
| Section 1: `backend npm test` 135/137 (baseline 131/133) | `bookingIntegrity.integration.test.js` "companyless staff cannot read another booking" | Returns 500 where 403 is expected: `getBookingById` runs `populate({ path: 'company' })` and no imported module had registered the `Company` model ("Schema hasn't been registered for model \"Company\"") | booking routes (owned by 08); fix `import "../models/company.schema.js"` at `backend/controllers/bookingController.js:5` | pre-existing in baseline 67759ec. Fixed by 08 in 1b696df; both this test and its parent "booking isolation, extensions and inventory holds" pass at 4333eec and 4e446ea (final-pass section) |
| Section 1: same 135/137 | The parent test of the above (the second failure) | Same cause. Named in the "Between waves" section as "plus its parent test" | same | same |
| Section 2: Browser login to dashboard, 8 roles x 1440/390: 31/32 | Superadmin at 390 | The screenshot timed out (harness timeout). The report states the 1440 run landed correctly. Whether the 390 login itself reached the dashboard was not recorded - needs re-run | `.qa-harness/platform/browser-run.mjs` | not re-run; the superadmin 390 landing screenshot was never captured (forwarded to 06 in "Open items") |
| Section 2: BillPreviewModal 88/90 (2 fail) | "Scroll restored" at 1440 (two checks) | `body.overflow` stays `hidden` after closing the modal. Waiter, kitchen and reception dashboards set `body.overflow=hidden` themselves, so the value was restored to the dashboard's own `hidden`; the check compared against `''`. The report classifies this as not a bug in the modal. Which two themes/runs failed (light, dark) is reason not recorded by the session | section 9 row "Body scroll stays hidden" | open P2: dashboard-level body locks should move to a container |

### B. BLOCKED / not verified in the wave-1 tables

| Counted in | Check | Reason (type) |
|---|---|---|
| Section 2: BillPreviewModal Blocked 1 | 844x390 run | Harness: the click timed out |
| Section 2: Runtime page errors row | `loadStripe(undefined)` throws "Expected publishable key to be of type string" on every staff page | Environment limit: no Stripe key locally. The guard belongs to 07 (`guest/.../BillingView.jsx:39`) and 08 (`public/.../BookingPaymentModal.jsx:14`). Fixed later in 9200176 and 0f23262 (see REQ-guest-4, REQ-public-2) |
| Section 3: Toasts (top-center on phones, z-index 10050) | Browser check of b97ed58 | Built but not re-verified in the browser; the "after" state was not re-shot (out of time) |
| Section 5 bug 10 (SocketContext reconnect after token expiry) | Browser check of the expiry path | BLOCKED: needs a `JWT_EXPIRE=2m` run; harness time ran out. `socket-probe.mjs` 7/7 covers the join/relay checks only |
| Section 5 bugs 18, 21, 15, 24 | Sentry scrubbing, NotificationContext dedupe and sound prompt, per-user write limiter, dev-only WebRTC logs | "code only" or "code + ..." in the Verified-by column; not exercised in a browser or against a running API |
| Section 1: browsers | Bundled Playwright chromium and test runner | Environment limit: chromium exits 0xC0000135 and the test runner hangs in this sandbox; the library with system Chrome was used. WebKit/iPhone was therefore not run |
| Section 1: server | `vite` dev server | Environment limit: more than 2 min per page load under 4 parallel sessions; `vite preview` of a production build was used |
| Not processed | `requests/hoteladmin-to-reception.md` (R1-R3) | Between 02 and 03; marked done in 55ebe84 on qa/reception after checking the code and the `receptionScope` test (1/1) |
| Not processed | Requests from kitchen, superadmin, guest, public | None had arrived when the wave-1 pass ran; processed in the final pass (see the REQ table in "Requests processed in this pass") |

### C. Known defects from section 9 and the mobile table, not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| Hoteladmin dashboard shows "User role 'hoteladmin' is not authorized" | `routes/receptionRoutes.js` authorize lists (REQ-hoteladmin-R1) | done in 55ebe84 on qa/reception |
| Staff/guest/auth login inputs 14 px; eye buttons 20x20; "Forgot password?" 42 px | `StaffLogin.jsx`, `GuestDashboardLogin.jsx`, `AuthPage.jsx` (08/07) | StaffLogin fixed in 0f23262, GuestDashboardLogin in 9200176. `AuthPage.jsx` is not reported fixed anywhere in the reports read; the public report still lists it as open |
| One refresh token per user | `staffController` (REQ-waiter-17) | open, user decision |
| Duplicate `new-waiter-call` emits | `guestController.js` | fixed in 1c839b5 (guest report) |
| StaffSettings avatar has no initials fallback | `shared/components/StaffSettings.jsx` | open (time) |
| Reception Live Room Status bars and stat-card row clip at 390 | reception `DashboardContent` (03) | not recorded as fixed in the reports read |
| Cross-dashboard consistency gaps (kitchen purple chips, reception indigo gradients and 10-item bottom nav, `₹0`, fabricated trends, two stacked FABs, superadmin 390 not captured) | Landing screenshots at 390/1440 | Reception FAB/fabricated trends fixed on qa/reception (REQ-reception-3, REQ-hoteladmin-R3); the rest are not recorded as fixed here |
| Repository: `backend/sum.tmp.mjs`, `sum.tmp.txt` tracked scratch files; `MAIL_PASSWORD` in a root `.env` | Suggested deletion / moving to `backend/.env` | open (suggestion only) |

### D. Final pass (after wave 2)

The report's own table "Still failing, skipped or blocked" in the final-pass section lists each item with its exact error and classification. In short: 0 test failures, 0 skipped, 0 lint errors, 0 build errors at 4e446ea (backend 175/175, frontend 26/26). Not verified: browser re-test of the 4e446ea frontend changes (BLOCKED, time), Lighthouse after code splitting (BLOCKED, time), timed SMTP failure (no SMTP), live production 429s (production mode needs HTTPS `CLIENT_URL` origins), Stripe flows in the browser (no Stripe keys), WebKit/iPhone (chromium exit 0xC0000135). One observed flake: under two overlapping mongodb-memory-server suites, `walletPayments.integration.test.js:10` failed with "Instance failed to start within 60000ms" and 7 tests in `paymentGateway.test.js:428-560` failed with "STRIPE is not configured for production (test or unrecognized secret key)"; neither reproduced when the suite ran alone (30/30 and 175/175).
