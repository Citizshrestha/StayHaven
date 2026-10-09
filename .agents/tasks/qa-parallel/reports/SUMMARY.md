# QA parallel run: summary

Sources: the 8 `*-report.md` files, `wave1-aborted-findings.md`, `wave1-aborted-requests-waiter.md` and every `requests/*.md`. Git state checked on `main` @ `67598b9` and `qa/platform` @ `4e446ea`. Nothing was re-run for this summary except git commands and `git show`/`git grep` reads, which the "Status now" column cites where they were used. No code was changed.

Session ids: 01 platform, 02 hoteladmin, 03 reception, 04 waiter, 05 kitchen, 06 superadmin, 07 guest, 08 public.

## 1. Per-dashboard PASS / FAIL / BLOCKED

Counts are the sums of each report's section 2 feature table (final run). "Blocked" includes rows the report marks BLOCKED without a number (counted as 1 each). Backend/frontend suite numbers are listed separately.

| Dashboard | Checks | Pass | Fail | Blocked | Other suites in the report | Backend suite (final on branch) |
|---|---|---|---|---|---|---|
| 01 platform (wave 1) | 237 | 234 | 3 | 2 | BillPreviewModal row is 88 + 2 + 1 of 90 (report's own numbers) | 135/137 wave 1; **175/175 at 4e446ea**, frontend 26/26 |
| 02 hoteladmin | 50 | 40 | 4 | 6 | Security matrix 145/150 (5 not passing). Mobile matrix: all BLOCKED | 132/134 |
| 03 reception | 34 | 34 | 0 | 3 | api-probe 53/53, api-probe2 11/11, flows 9/9; mobile 60/60 cells (5 viewports x 12 views). Bank-transfer row under-reports 1 blocked (counted here) | 132/134 |
| 04 waiter | 244 | 224 | 18 | 2 | Security 152: 140/12 (inside the totals); mobile 9 viewport rows PASS | 132/134; pricing 9/9 |
| 05 kitchen | 205 | 200 | 5 | 6 | Mobile matrix 18/18 (in totals); soak 10/10 | 135/137 |
| 06 superadmin | 798 | 792 | 6 | 8 | api-probe 583/588, mobile 161/162 (in totals) | 136/138 |
| 07 guest | 276 | 272 | 4 | 5 | Mobile audit 16 views x 8 viewports, light+dark: PASS | 136/138 |
| 08 public | 206 | 203 | 2 | 5 | Core Web Vitals FAIL (3 pages, not in the table); prod-mode security 2 BLOCKED | 158/158 |

Every backend failure listed above is the same pre-existing pair in `bookingIntegrity.integration.test.js` (group d). It was fixed in `1b696df`; main/qa/platform now run 175/175.

## 2. Failures ledger

One row per failed, skipped or blocked check or REQ-derived defect. Status codes: **fixed in <sha>**, **still open**, **won't-fix** (with rationale), **needs re-run**.

### (a) Real defects still open

| Dashboard | Area/Test | What failed | Reason | Status now |
|---|---|---|---|---|
| platform | BillPreviewModal "scroll restored" 1440 (check 1 of 2) | `body.overflow` stays `hidden` after close | Waiter/kitchen/reception dashboards set `body.overflow=hidden` themselves; check compared to `''` | still open (P2): move dashboard body locks to a container |
| platform | BillPreviewModal "scroll restored" 1440 (check 2 of 2) | same | same; which theme failed was not recorded | still open (P2) |
| platform | Login inputs, AuthPage | 14 px inputs, 20 px eye button | `AuthPage.jsx` / `AuthPage.module.css` (07/08) | still open: `git log 67759ec..qa/platform` shows no commit touching AuthPage; module CSS still has 14 px rules |
| platform | Multi-device sessions | Second device login signs out the first | One refresh token per user, REQ-waiter-17 | won't-fix for this run: per-device sessions are new product behaviour, needs a user decision |
| platform | StaffSettings avatar | Empty ring, no initials fallback | REQ-waiter-13 remainder | still open (P2, time) |
| platform | Reception Live Room Status / stat-card row at 390 | Bars and row clip | reception `DashboardContent` (03) | still open: no report records a fix |
| platform | Repo hygiene | `backend/sum.tmp.mjs`, `sum.tmp.txt` tracked; `MAIL_PASSWORD` in root `.env` | Suggested deletion / move to `backend/.env` | still open (both files still in `git ls-tree qa/platform`) |
| platform | Hotel status notification log | Owner email logged on every status notification | `hotelController.js` | still open (P3) |
| hoteladmin | Billing real-data wiring (Blocked) | Page shows preview/mock in dev, "not available" in prod | Waited for REQ-hoteladmin-R2 (done 55ebe84) | still open (High): wire to `/reception/billing/invoices` + `/summary` |
| hoteladmin | Stock | In-memory mock (`services/stockApi.js`), only "renders" checked | No InventoryItem model; not approved | still open (High, needs approval) |
| hoteladmin | Orders realtime, detail-modal staleness, 100-row cap | Not tested / not changed | Time | needs re-run (kitchen's 100-cap fix REQ-kitchen-3 is in OrderContext, 4e446ea; hoteladmin page not re-checked) |
| reception | Check-out billing | `performCheckOut` flips statuses only; no bill settlement or invoice | P1, canonical flow vs `/bookings/check-out/express` undecided | still open: product decision |
| reception | Bookings create/edit/cancel/no-show, walk-in races | Not retested | `/api/v1/bookings/*` owned by 08 | needs re-run |
| reception | Guest PII | Phone/email unmasked in lists; no ID-document capture at check-in | Not implemented | still open (P2) |
| reception | Bank transfer proof upload/view (Blocked, under-reported) | No proof viewer; transactions carry a reference only | Feature absent | still open (P2 product gap) |
| reception | Phone tap targets | 4-12 sub-44 px targets per view (baseline 15-37) | Inline links/badges | still open (P3) |
| reception | Occupancy trend | Shown as "% change of %" (`+52%`) | Design | still open (P3): use percentage points |
| waiter | `PATCH /tables/:id/status` to `maintenance` as waiter (security fail) | 200, expected 403 | REQ-waiter-5, rejected for 01 and forwarded to 02 | still open: cross-tenant part fixed in 0ca9e0c, but `TABLE_STATUS_ROLES` on qa/platform still includes `waiter` with no per-status rule (checked with `git show`) |
| waiter | Settings: change password back to original | 400, message not read | Possible reuse rule, not confirmed | needs re-run |
| waiter | Assigned Areas | Lists only areas with orders; no free/occupied/bill state | New product behaviour | still open (P2) |
| waiter | Transfer/merge (Blocked 1) | `POST /staff/dining/sessions/:id/transfer` has no waiter UI | Product gap | still open (P2) |
| waiter | Table assignment UI | No screen calls `/staff/table-assignments` | REQ-waiter-7, rejected (02, new feature) | won't-fix for this run: needs the user's OK |
| waiter | Bill print scope | Card prints one order, not the whole tab | REQ-waiter-18 remainder | won't-fix for this run: product decision |
| waiter | Money/time format | `Rs 1,234` vs `Rs. 1,234`; browser timezone, not hotel | Many strings | still open (P2) |
| waiter | Order images | One stock photo for every item without an image | Data | still open (P3) |
| kitchen | Chief cancel `POST /orders/:id/cancel` | 200 for chief | REQ-kitchen-5 | won't-fix: policy question; chief keeps cancel (out-of-stock rejection) until the user decides |
| kitchen | Shared sound prompt bottom-left | Covered desktop Log Out | REQ-kitchen-6 (kitchen pads sidebar 80 px) | won't-fix: withdrawn by 05; shared `:root --bottom-nav-height` is a follow-up |
| kitchen | Waiter-owned NotificationPanel/OrderDetailsModal in kitchen | Light-only hard-coded colours | REQ-kitchen-7 | won't-fix for this run: cross-feature refactor |
| kitchen | Item-level status, 86'd items | Not offered; no backend support | New product behaviour | still open (P3), ask the user |
| kitchen | Clock offset | Measured once at load | Accepted limitation | still open (P3) |
| superadmin | api-probe 5th failing line | Not recorded | Report says REQ-superadmin-1/2 | needs re-run (REQ-1 done 7388420; REQ-2 partly done) |
| superadmin | Hotel suspend/reactivate (Blocked, 4 checks, unnamed) | `updateHotelStatus` accepts approved/rejected only | REQ-superadmin-2a | still open: needs user decision on suspended hotels' bookings/visibility (reason + audit + escaping done 7388420) |
| superadmin | Review hide → public page / rating (Blocked, 2 checks) | Not wired; `Review` only used by moderation and testimonials | Product decision across 08 + models | still open (P1) |
| superadmin | "View All Bookings" button | No handler; 42 px (21 px at 768/844x390) | Needs a bookings page | still open (P2) |
| superadmin | Top-bar search | Does nothing | New feature | still open (P2) |
| superadmin | Commission Rules | CRUD-only; calculations use global rate | Rule precedence undecided | still open (P2) |
| superadmin | System Config / Content forms | No unsaved-changes warning, no sticky Save | Time | still open (P2) |
| superadmin | Finance page | No page gutters (`padding: 0`) | Found after servers stopped | still open (P3) |
| guest | api-probe: `GET /auth/check?email=` enumeration | Returns exists true/false | REQ-guest-1 | still open: partly fixed in 7388420 (`accountCheckLimiter`); signup-token gate is a product decision |
| guest | Invoice tax for food orders | Back-computed at fixed 13% (`/1.13`), untested with service charge | `getUserInvoices` | still open (P2) |
| guest | Invoice PDF (Blocked) | No guest invoice PDF endpoint | Feature absent | still open |
| guest | Small targets | Dark-mode switch 48x28; nav badge 10 px (decorative) | Passes WCAG 2.5.8 AA, not 44 px rule | still open (P3) |
| guest | Guest-supplied strings in reception/waiter/kitchen | Not tested whether rendered as text | Sinks owned by 03/04/05 | needs re-run (payloads are in the guest QA DB) |
| guest | Browser flows Chrome 390: guest A "no add button" | 31/32 | Menu-load timing flake, root cause not investigated | needs re-run |
| public | Core Web Vitals 390x844 Slow 4G (landing) | LCP 8.9 s, FCP 7.4 s, CLS 0.46, TBT 4.8 s | 1.66 MB entry, stripe.js, 1 MB logo, AVIF heroes; overloaded machine | needs re-run: REQ-public-2/3/10 fixed (9200176, 4e446ea), Lighthouse not run; hero CLS cause not changed → still open |
| public | Core Web Vitals (hotels) | LCP 12.2 s, FCP 7.9 s, TBT 4.7 s | same | needs re-run |
| public | Core Web Vitals (hotel detail) | LCP 8.7 s, FCP 5.5 s, TBT 5.0 s | same | needs re-run |
| public | Cancel a paid booking | Status changes only; no refund, `paymentStatus` stays `paid` | Refund behaviour undecided | still open (P1, product decision) |
| public | `GET /bookings/available/rooms/:hotelId` | Requires login, separate public endpoint added | Kept for callers | still open (P2) |
| public | Static head og:url / canonical | Not added | Production domain unknown (REQ-public-4 partly) | still open (P2) |
| public | Logo fetched twice | Double fetch | Not investigated (size fixed 4e446ea) | still open |
| public | Booking visible in guest dashboard (Blocked 1) | `GET /guest/portal/bookings` 200, content not asserted | Owned by 07 | needs re-run |

### (b) Fixed during the run

| Dashboard | Area/Test | What failed | Reason | Status now |
|---|---|---|---|---|
| hoteladmin | Login/Shell + security: `POST /staff/login` as hoteladmin | 403 "Staff account required" | `allowedRoles`, REQ-hoteladmin-1 | fixed in 2e4e442 |
| hoteladmin | Login/Shell + security: admin `redirectPath` | `/dashboard` (404) | Redirect switch, REQ-hoteladmin-1/2 | fixed in 2e4e442 |
| hoteladmin | Security: manager `redirectPath` | `/manager-dashboard` (404); guard sent manager to reception | REQ-hoteladmin-1/2 | fixed in 2e4e442 |
| hoteladmin | Orders + security: admin `GET /staff/orders` | 403 | admin treated as superadmin, REQ-hoteladmin-4 | fixed in 4bbfa80 |
| hoteladmin | Orders + security: `search=(` | 500 | Unescaped `$regex`, REQ-hoteladmin-5 | fixed in 4bbfa80 |
| hoteladmin | hoteladmin on menu writes/cancel/invites | 403 at route guard | REQ-hoteladmin-3 | fixed in 105bf33 |
| hoteladmin | Logout revocation | Cookies valid after logout | REQ-hoteladmin-6 | fixed in 2e4e442 (browser-verified) |
| hoteladmin | Multer errors | 500 | REQ-hoteladmin-7 | fixed in 50a0072 |
| hoteladmin | Reception report routes for hoteladmin | "not authorized" | REQ-hoteladmin-R1 | fixed in 55ebe84 |
| hoteladmin | Company-wide aggregates | Both hotels' numbers | REQ-hoteladmin-R2 | fixed in 55ebe84 |
| hoteladmin | Fabricated report values | previous = current-6 etc. | REQ-hoteladmin-R3 | fixed in 55ebe84 (+8b25ff6, 630d3eb) |
| hoteladmin | Toasts cover header actions | Top-right toasts | Suggested to 01 | fixed in b97ed58; not re-verified in a browser |
| hoteladmin | BillPreviewModal hard-coded VAT, PII log | REQ-hoteladmin-9 | Shared component | fixed in 5c05776 + 4977655 |
| reception | Baseline api-probe 20/52 (32 failing probes) | Cross-tenant reads/writes, regex 500, CSRF, check-in rules | Bugs 1-15 in report | fixed in 55ebe84 / 8b25ff6 / 630d3eb (final 53/53) |
| reception | `guestId` E11000 for second company | Seed failed | REQ-reception-1 | fixed in 078f6d7 |
| reception | Company email regex rejects 4+ letter TLDs | "Please enter a valid email" | REQ-reception-2 | fixed in 078f6d7 |
| reception | Messaging FAB over bottom nav | FAB covers "More" | REQ-reception-3 | fixed in 4977655 (local workaround still in `ReceptionMobile.css`) |
| reception | BillPreviewModal print title unescaped | Raw HTML | REQ-reception-4 | fixed in 5c05776 |
| reception | StaffLogin 14 px, no autocomplete | Note for 08 | iOS zoom | fixed in 0f23262 |
| waiter | Lifecycle: waiter `pending -> delivered` | 200 | REQ-waiter-3 | fixed in 4bbfa80 |
| waiter | Lifecycle: waiter `pending -> preparing` | 200 | REQ-waiter-3 | fixed in 4bbfa80 |
| waiter | Lifecycle: waiter `preparing -> delivered` | 200 | REQ-waiter-3 (also counted in security) | fixed in 4bbfa80 |
| waiter | Notifications: same event twice | Socket + saved notification not merged | REQ-waiter-10 | fixed in 4977655 |
| waiter | Bill: preview 226.00 vs server 248.60 | Hard-coded 13%, no service charge | REQ-waiter-18 | fixed in 4bbfa80 + 078f6d7 + 4977655 (per-order bill) |
| waiter | Bill: e-mail HTML not escaped | Raw interpolation | REQ-waiter-19 | fixed in 4bbfa80 |
| waiter | Security: waiter A reads hotel 2 orders | 200 | REQ-waiter-1 | fixed in 4bbfa80 |
| waiter | Security: waiter A creates order in hotel 2 | 201 | REQ-waiter-1 | fixed in 4bbfa80 |
| waiter | Security: waiter A changes hotel 2 order status | 200 | REQ-waiter-1 | fixed in 4bbfa80 |
| waiter | Security: guest `GET /staff/orders` | 200, 36 orders with PII | REQ-waiter-1 | fixed in 4bbfa80 + 2e4e442 |
| waiter | Security: guest `GET /staff/me` | 200 | REQ-waiter-1 | fixed in 2e4e442 |
| waiter | Security: guest `GET /staff/menu-items` | 200 | REQ-waiter-6 | fixed in 2e4e442 (guest); tenant check in menuController 0ca9e0c (hoteladmin bug 11) |
| waiter | Security: guest `GET /tables` | 200 | REQ-waiter-2 (rejected for 01, forwarded) | fixed in 0ca9e0c |
| waiter | Security: waiter A `GET /tables?hotelId=<B>` | 200 with QR `uniqueToken` | REQ-waiter-2 | fixed in 0ca9e0c |
| waiter | Security: `search=(((` | 500 regex message | REQ-waiter-4 | fixed in 4bbfa80 |
| waiter | Security: two chiefs set `confirmed` | 200 + 200 in one run | REQ-waiter-3 same-status | fixed in 4bbfa80 (no-op / 409) |
| waiter | Calls: guest QR creates two calls 0.6 s apart | No de-dupe | REQ-waiter-14 (rejected for 01, forwarded) | fixed in 1c839b5 |
| waiter | Calls: `new-waiter-call` emitted twice | Double emit + per-event count | REQ-waiter-9 | fixed in 4977655 (frontend) + 1c839b5 (emit) |
| waiter | Sound prompt covers bottom nav | Fixed bottom-left | REQ-waiter-8 | fixed in 4977655 (waiter `:has()` workaround still in `WaiterShell.css`) |
| waiter | Live updates stop at token expiry | Socket kept stale token | REQ-waiter-16 | fixed in 5c05776 (`useSocketTokenKeepAlive.js` still present) |
| waiter | Carousel controls < 44 px | 28 px arrows, 8 px dots | REQ-waiter-11 | fixed in 4977655 |
| waiter | Bills chips 40 px, search 15 px | iOS zoom | REQ-waiter-12 | fixed in 4977655 |
| waiter | Messaging panel targets | 32/41 px | REQ-waiter-13 | fixed in 4977655 (avatar part open, group a) |
| waiter | StaffLogin 14 px inputs | iOS zoom | REQ-waiter-15 (forwarded) | fixed in 0f23262 |
| waiter | Old access token works after logout | Stateless JWT (INFO) | By design | refresh revoked on logout in 2e4e442 |
| kitchen | api-probe: chief `PUT /staff/orders/:id` | 200 | REQ-kitchen-1 | fixed in 7388420 |
| kitchen | api-probe: chief `confirm-payment` | 409 (reached logic) | REQ-kitchen-1 | fixed in 7388420 |
| kitchen | api-probe: chief `send-bill` | 502 (tried to send) | REQ-kitchen-1 (`retry-bill` same fix) | fixed in 7388420 |
| kitchen | Cancel reason / order notes on tickets (Blocked) | Fields dropped by OrderContext | REQ-kitchen-2 | fixed in 4e446ea; banner not re-checked in browser |
| kitchen | Old active tickets after 100 orders | Dropped silently | REQ-kitchen-3 | fixed in 7388420 + 4e446ea (test covers 10 h old ticket) |
| kitchen | Time-in-status | No `startedPreparingAt`/`readyAt` | REQ-kitchen-4 | fixed in 7388420 + 4e446ea |
| kitchen | Shared sub-44 px targets (msg buttons 42 px, toast close 14x16) | Mobile matrix sharedSmallTaps | REQ-kitchen-8 | fixed in 4e446ea; not re-measured |
| superadmin | api-probe: admin A `PATCH /hotels/:id/approve` | 200 | REQ-superadmin-1 | fixed in 7388420 |
| superadmin | api-probe: admin A `PATCH /hotels/:id/featured` | 200 | REQ-superadmin-1 | fixed in 7388420 |
| superadmin | api-probe: admin B `approve` | 200 | REQ-superadmin-1 | fixed in 7388420 |
| superadmin | api-probe: admin B `featured` | 200 | REQ-superadmin-1 | fixed in 7388420 |
| superadmin | Rejection reason / audit / escaped mail | Not stored, no audit, raw HTML | REQ-superadmin-2b-d, -3 | fixed in 7388420 |
| superadmin | Audit rows with string resourceId dropped | ObjectId type | REQ-superadmin-4 | fixed in 7388420 (workaround aef974b) |
| superadmin | Admin API calls fall back to guest token | Manual header | REQ-superadmin-5 | fixed in 4e446ea; pages not re-opened in browser |
| superadmin | Focused test script | Missing | REQ-superadmin-6 | fixed in 7388420 |
| superadmin | Baseline api-probe 519/587 | 68 failing probes (bugs 1-15) | Report section 5 | fixed in aef974b (final 583/588) |
| guest | api-probe: guest `GET /tables?hotelId=A` | 200 | REQ-guest-6 | fixed in 0ca9e0c; regression test 7388420 |
| guest | api-probe: guest `GET /rooms?hotelId=A` | 200 | REQ-guest-6 | fixed in 0ca9e0c |
| guest | Resilience: token expiry → `/login` | Should go to `/guest/login` | REQ-guest-5 | fixed in 4e446ea; not browser re-run; `state.from` lost on hard redirect |
| guest | Deep link lost after login | No `state.from` | REQ-guest-2 | fixed in 4e446ea (build-verified only) |
| guest | AboutPage global `section`/`h2` rules leak | Billing card padding | REQ-guest-3 | fixed in 4e446ea |
| guest | `loadStripe(undefined)` in BookingPaymentModal | Page error | REQ-guest-4 | fixed in 0f23262 |
| guest | Baseline api-probe 135/151 | 13 failing probes | Bugs 1-8 | fixed in 1c839b5 |
| public | Booking flow 1440 page-wide audit | Navbar 14 px search input (+ footer targets) | REQ-public-5 | fixed in 4e446ea; not re-measured with `audit()` |
| public | Empty optional fields rejected | `guestEmail: ""` → 400 | REQ-public-1 | fixed in 7388420 |
| public | `loadStripe` in BillingView, 1.1 MB on every page | Page error + weight | REQ-public-2 | fixed in 9200176 (+ lazy chunk 4e446ea) |
| public | No route code splitting | 1,697 kB entry | REQ-public-3 | fixed in 4e446ea (entry 261 kB) |
| public | Static head tags | og/twitter/theme-color missing | REQ-public-4 | partly fixed in 4e446ea (og:url/canonical open, group a) |
| public | SMTP no timeouts | 136 s stall | REQ-public-6 | fixed in 7388420 (timed run not done) |
| public | Reception invoice +13% on taxed total | Balance never owed | REQ-public-7 | fixed in 7388420 |
| public | `paymentLimiter` 5/h per IP | Shared Wi-Fi budget | REQ-public-9 | fixed in 7388420 (unit test; live 429 not run) |
| public | Logo 1,059 KB | Weight | REQ-public-10 | fixed in 4e446ea (48 KB) |
| public | Baseline probe-hotels / probe-booking failures | Leaks, 500s, PDF 500, E11000 text | Bugs 1-13 | fixed in 1b696df / b097705 |
| platform | Baseline auth-probe 32/52 | Guest JWT on staff API, CSRF, logout, refresh race | Bugs 1-7, 13-20 | fixed in 2e4e442 / 4bbfa80 / 50a0072 (final 53/53) |
| platform | Runtime page errors `loadStripe(undefined)` | Throws on every staff page | No key + unguarded call (07/08 files) | fixed in 9200176 and 0f23262 |
| platform | Hoteladmin dashboard "role not authorized" | Reception authorize lists | REQ-hoteladmin-R1 | fixed in 55ebe84 |
| platform | Duplicate `new-waiter-call` emits | guestController | REQ-waiter-9 | fixed in 1c839b5 |
| platform | `requests/hoteladmin-to-reception.md` not processed in wave 1 | R1-R3 unmarked | Between 02 and 03 | marked done in 55ebe84 between waves |

### (c) Environmental / not executable / not run

| Dashboard | Area/Test | What failed | Reason | Status now |
|---|---|---|---|---|
| platform | Browser login 8 roles: superadmin at 390 | Screenshot timed out (31/32) | Harness timeout; whether login reached the dashboard not recorded | needs re-run (superadmin's own matrix covered 390, 06 report) |
| platform | BillPreviewModal 844x390 (Blocked 1) | Click timed out | Harness timeout | needs re-run |
| platform | Toast top-center / z-index 10050 | Not re-shot | Time | needs re-run (b97ed58) |
| platform | Socket reconnect after token expiry (browser) | Not run | Needs `JWT_EXPIRE=2m` run; time | needs re-run; indirectly covered by kitchen `longrun.mjs` 10/10 with `JWT_EXPIRE=2m` on qa/kitchen, which contains 5c05776 |
| platform | Sentry scrubbing (bug 18) | Code only | Not exercised | needs re-run |
| platform | NotificationContext dedupe / prompt (bug 21) | Code only | Not exercised in browser | needs re-run |
| platform | Per-user write limiter (bug 15) | Code only | Not exercised | needs re-run |
| platform | Dev-only WebRTC logs (bug 24) | Code only | Not exercised | needs re-run |
| platform | Bundled chromium / test runner | Exit 0xC0000135, runner hangs | Sandbox | environment; system Chrome via library used |
| platform | WebKit / iPhone | Not run | Bundled browsers crash | environment |
| platform | Final pass: browser re-test of 4e446ea | Not run | Time | needs re-run (lazy routes, OrderContext, guest deep link/401, targets, AboutPage, logo) |
| platform | Final pass: Lighthouse after code splitting | Not run | Time | needs re-run |
| platform | Final pass: timed SMTP failure | Only transport options asserted | No SMTP | environment |
| platform | Final pass: live production 429 (payments, `/auth/check`) | Not run | Prod mode needs HTTPS `CLIENT_URL`; unit test covers limiter | environment |
| platform | Final pass flake: `walletPayments.integration.test.js:10` | "Instance failed to start within 60000ms" | Two mongodb-memory-server suites in parallel | environment (CPU); suite alone 175/175 |
| platform | Final pass flake: `paymentGateway.test.js:428-560` (7 tests) | "STRIPE is not configured for production…" | Same overlapping run | environment; file alone 30/30 |
| platform | Final pass: Stripe flows in browser | Not run | No Stripe keys | environment |
| hoteladmin | Drawer a11y (focus trap/Esc/inert) | Not run in browser | Out of memory, Chrome hung | needs re-run |
| hoteladmin | Dashboard (Blocked 1, unnamed) | Not recorded | Same environment | needs re-run |
| hoteladmin | Restaurant-Menu browser checks | Not run | Out of memory | needs re-run (API checks pass) |
| hoteladmin | Kitchen "Go to Orders" browser check | Not run | Out of memory | needs re-run (build only) |
| hoteladmin | Table QR PNG decode + print popup | Not run | Out of memory | needs re-run (`node specs/ui.mjs qr`) |
| hoteladmin | Room QR Print All | Not run | Out of memory | needs re-run |
| hoteladmin | Mobile matrix, whole suite (8 viewports x 12 sections) | Never completed | Chrome hung under memory pressure | needs re-run (`node specs/ui.mjs mobile`) |
| hoteladmin | QR browser suite | Not completed | Same | needs re-run |
| hoteladmin | WebKit / iPhone | Not run | Playwright download failed (TLS) | environment |
| hoteladmin | Rate limits in production mode | Not run | Time, machine load | needs re-run |
| hoteladmin | Socket room isolation | Not run | Time, machine load | needs re-run (covered for orders by 01 socket-probe 7/7) |
| hoteladmin | CSRF-less mutations | Not run | Time, machine load | needs re-run (01 auth-probe covers cookie-only CSRF) |
| hoteladmin | Token-expiry refresh | Not run | Time, machine load | needs re-run |
| reception | Realtime (Blocked 1) | Socket new-order/request events | No second actor in harness | needs re-run |
| reception | Rate limit `NODE_ENV=production` (Blocked 1) | Not run | Not recorded beyond "not run" | needs re-run |
| reception | Guest communication e-mail (bug 19) | Send not executed | SMTP not configured | environment |
| reception | WebKit / iPhone | Not run | WebKit download blocked by TLS proxy | environment |
| reception | 375, 412, 844x390 viewports (final sweep) | Not run | Time / WebKit download | needs re-run |
| reception | Some final screenshots | Timed out | Harness timeout under load; checks still ran | none needed |
| reception | BillPreviewModal | Code read only | Shared component | covered by 01 browser run 88/90 |
| waiter | E-mail delivery of bill (Blocked 1) | Not executed | No SMTP | environment |
| waiter | Sound / vibration | Not executable headless | Headless Chrome | environment |
| waiter | WebKit / iPhone 390x844 | Not run | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on install | environment |
| waiter | Slow 4G / 4x CPU, Lighthouse | Not run | Time | needs re-run |
| waiter | UTC timezone run | Not run | All runs Asia/Kathmandu | needs re-run |
| waiter | `prefers-reduced-motion` visual | Not tested | CSS only | needs re-run |
| waiter | Order modifiers/variants | N/A | `MenuItem` has none | none |
| waiter | Page error "Expected publishable key…" x2 per load | Stripe without key | Environment | fixed in 9200176 / 0f23262 |
| kitchen | api-probe "no stack trace" | `stack` present | API ran in development mode | won't-fix (REQ-public-8 rejected): prod strips stacks, 01 prod-probe 11/11 |
| kitchen | ux-spec "dashboard not reachable after logout" | 25/26 | Harness re-injects session each navigation | none: harness artifact; anonymous checks 2/2 pass |
| kitchen | Sound audible | Not heard | Headless Chrome | environment |
| kitchen | Wake Lock | Not observed | Code only | needs re-run on hardware |
| kitchen | 30-minute soak / 50+ tickets | Not run (7 min done, 10/10) | Time | needs re-run (`MINUTES=30`) |
| kitchen | Production-mode probes | Not run | Prod refuses localhost `CLIENT_URL` | environment (cross-ref 01 prod-probe) |
| kitchen | Page errors `loadStripe(undefined)` | Excluded from checks | No Stripe key | fixed in 9200176 / 0f23262 |
| kitchen | Safari/iOS, real touch hardware, tablets | Not run | No WebKit / hardware | environment |
| superadmin | Mobile matrix 1440 light (1 cell) | Screenshot timeout (161/162) | Harness timeout; page not recorded | needs re-run |
| superadmin | Email notifications (Blocked 1) | Not sent | No SMTP | environment (escaping done 7388420) |
| superadmin | CMS image upload validation (Blocked 1) | Not run | No Cloudinary | environment (magic bytes 50a0072) |
| superadmin | WebKit 390x844 | Not run | WebKit not installed | environment |
| guest | Card payment (Blocked) | Not run | No Stripe key | environment |
| guest | WebRTC calls (Blocked) | Not run | Not configured | environment |
| guest | OTP / Google login (Blocked) | Not run | No Google client, no SMTP | environment |
| guest | Avatar upload (Blocked) | Not run | No Cloudinary | environment |
| guest | Soft keyboard | Not automated | Time spent on WebKit setup | needs re-run |
| guest | Slow 4G throttling | Not run | Same | needs re-run |
| guest | 200% zoom | Not run | Same | needs re-run |
| guest | Reduced motion | Not run | Same | needs re-run |
| guest | QR menu skeleton timing | Not measured | Same | needs re-run |
| guest | Lighthouse | Not run | Same | needs re-run |
| guest | mongod died mid-run | Restarted and reseeded | Unknown external cause | none recorded as affected |
| public | probe-hotels "no stack in 404 body" | `stack` present | Development mode | won't-fix (REQ-public-8 rejected) |
| public | Stripe card: PaymentIntent, 3-D Secure, tab-close → webhook | Not run | No Stripe key | environment (21 integration tests with scripted client) |
| public | Khalti / eSewa round trips | Not run | No keys | environment |
| public | Stripe webhook signature / replay | Not run | No `STRIPE_WEBHOOK_SECRET` (route answers 503) | environment |
| public | Confirmation e-mail | Not sent | No SMTP | environment |
| public | Prod 429 on booking/auth/payment | Not run | Prod needs HTTPS `CLIENT_URL` | environment |
| public | CSP vs Stripe domains | Not checked | Same | environment |
| public | WebKit 390x844 | Chrome emulation only | WebKit not installed | environment |
| public | 18-page sweep at 360/375/412/768/844x390/1024 | Only 6 pages at those sizes | Time, shared machine | needs re-run |
| public | 375x667, dark mode, UTC | Not run | Time | needs re-run |
| public | Screen reader (VoiceOver/TalkBack) | Not run | Manual | needs re-run |
| public | BookingConfirmed status-aware wording (bug 18) | Code only | Only "unavailable" state seen | needs re-run |
| public | PaymentCallback page meta (bug 21) | Reverted | Source-level tests allow fixed imports | won't-fix: test constraint |

### (d) Pre-existing baseline failures (present at 67759ec)

| Dashboard | Area/Test | What failed | Reason | Status now |
|---|---|---|---|---|
| platform | `bookingIntegrity` "companyless staff cannot read another booking" | 500, expected 403 | `Company` model not registered before `populate` | fixed in 1b696df (passes at 4333eec and 4e446ea) |
| platform | `bookingIntegrity` parent "booking isolation, extensions and inventory holds" | fails with the subtest | same | fixed in 1b696df |
| hoteladmin | `bookingIntegrity` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| hoteladmin | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| reception | `bookingIntegrity` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| reception | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| waiter | `bookingIntegrity.integration.test.js:32` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| waiter | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| kitchen | `bookingIntegrity` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| kitchen | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| superadmin | `bookingIntegrity` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| superadmin | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| guest | `bookingIntegrity` companyless staff | 500 vs 403 | same | fixed in 1b696df |
| guest | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| public | `bookingIntegrity` companyless staff (baseline 135/137) | 500 vs 403 | same, plus guest sent through staff check | fixed in 1b696df (final 158/158) |
| public | `bookingIntegrity` parent test | same | same | fixed in 1b696df |
| reception | Backend eslint `batchController.js:560` | unused `reason` | Pre-existing | still open (P3) |
| reception | Backend eslint `exportController.js:480` | unused `rooms` | Pre-existing | still open (P3) |
| public | Backend lint `getOrCreateGuestRole` unused | `publicBookingController.js` | Pre-existing | still open (P3) |
| all | Frontend lint warnings | 16 at baseline, 13 at 4e446ea (`react-hooks/exhaustive-deps`) | Pre-existing, not errors | still open (warnings only) |
| hoteladmin | `npm run build` without `VITE_API_BASE_URL` | Fails | Production build guard, by design | won't-fix: intended |
| waiter | `npm run build` without `VITE_API_BASE_URL` | "must explicitly identify the deployed API" | Same guard | won't-fix: intended |
| waiter (aborted run, a9c7843) | `npm run build` | `SavedHotels.jsx` untracked | Aborted-run REQ-waiter-1 | superseded: base 67759ec builds in every session |
| waiter (aborted run, a9c7843) | Backend test scripts | None at a9c7843 | Aborted-run REQ-waiter-2 | superseded: 67759ec has `npm test` (131/133 baseline) |
| waiter (aborted run, a9c7843) | Lint | 512 problems (485 errors) | a9c7843 baseline | superseded: 67759ec 0 errors |
| hoteladmin (aborted run) | Menu/staff-manage endpoints only in uncommitted work | Frontend called missing endpoints | a9c7843 | superseded by 67759ec |
| reception (aborted run) | Code-read findings: activity XSS, `?companyId=` reads, company-wide aggregates, unscoped `findById`, regex, fabricated values | Not verified then | a9c7843 | re-found and fixed in 55ebe84 / 8b25ff6 / 630d3eb |

## 3. Bugs fixed (branch and commit)

Numbers are the bug numbers in each report's section 5. All commits are reachable from `main` except `7388420` and `4e446ea` (qa/platform only).

### qa/platform (wave 1, 67759ec..b97ed58)

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1 | P0 | `requireStaffRole` on staff routers (guest JWT rejected) | 2e4e442 |
| 2 | P0 | Order hotel scope `getAccessibleHotelIds` + per-order filters | 4bbfa80 |
| 3 | P0 | CSRF double-submit on cookie-only writes | 2e4e442 |
| 4 | P0 | Escaped user text in e-mail HTML | 4bbfa80 |
| 5 | P1 | One role→dashboard map; hoteladmin login | 2e4e442 |
| 6 | P1 | Server logout revocation | 2e4e442 |
| 7 | P1 | Atomic refresh rotation with 30 s grace | 2e4e442 |
| 8 | P1 | Per-role status transitions | 4bbfa80 |
| 9 | P1 | cancel/retry pass `next` (no crash) | 4bbfa80 |
| 10 | P1 | Socket token refresh and reconnect | 5c05776 |
| 11 | P1 | BillPreviewModal real rates, dialog, escaped print | 5c05776, 078f6d7, 4977655 |
| 12 | P1 | Global guestId sequence | 078f6d7 |
| 13 | P2 | CORS 403, body 413 | 2e4e442 |
| 14 | P2 | /health minimal | 2e4e442 |
| 15 | P2 | Write limiter per user | 2e4e442 |
| 16 | P2 | Escaped search, safe paging | 4bbfa80 |
| 17 | P2 | Multer 400/413, magic bytes | 50a0072 |
| 18 | P2 | Sentry PII scrubbing | 50a0072 |
| 19 | P2 | Refresh timer from token `exp` | 2e4e442 |
| 20 | P2 | CMS writes use staff scope | 2e4e442 |
| 21 | P2 | NotificationContext dedupe, prompt above nav | 4977655 |
| 22 | P2 | Company email regex | 078f6d7 |
| 23 | P3 | ConfirmDialog/ErrorBoundary/ThemeToggle/Footer/Navbar a11y and targets | 5c05776, 0c3f6e8, 4977655 |
| 24 | P3 | Dev-only WebRTC logs | 50a0072 |
| – | P1 | hoteladmin on menu/cancel/invite guards (REQ-hoteladmin-3) | 105bf33 |
| – | P2 | Toast stacking and phone position | b97ed58 |
| – | – | `dashboard-tokens.css` (`--db-*`) | 63b2908 |

### qa/platform (final pass, on top of main 5339d4e)

| REQ | Fix | Commit |
|---|---|---|
| kitchen-1 | Chief removed from order edit, confirm-payment, send-bill, retry-bill | 7388420 |
| kitchen-2/3/4 | OrderContext fields, active-status fetch, `startedPreparingAt`/`readyAt` | 7388420, 4e446ea |
| kitchen-8 | Shared 44 px msg/toast targets | 4e446ea |
| superadmin-1 | Hotel approve/reject/status/featured superadmin-only | 7388420 |
| superadmin-2 (partial), -3, -4, -6 | statusReason, audit, escaped mail, owner projection, Mixed resourceId, `test:superadmin` | 7388420 |
| superadmin-5 | Admin calls staff-scoped | 4e446ea |
| guest-1 (partial) | `accountCheckLimiter` | 7388420 |
| guest-2, -3, -5 | Deep link, AboutPage scoping, guest 401 redirect | 4e446ea |
| public-1, -6, -7, -9 | Falsy optional validation, SMTP timeouts, reception invoice tax, payment limiter per user | 7388420 |
| public-3, -4 (partial), -5, -10 | Code splitting, head tags, Navbar/Footer targets, 48 KB logo | 4e446ea |

### qa/hoteladmin

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1 | P0 | `hotelAdminAccess.assertHotelAccess` tenancy | 0ca9e0c |
| 2 | P0 | GET /tables access check, QR secrets stripped | 0ca9e0c |
| 3 | P0 | Seed routes blocked in prod and tenant-checked | 0ca9e0c, be65639 |
| 4 | P0 | Room whitelist/validation | 0ca9e0c |
| 5 | P0 | Escaped QR/billing print | 649ec9b, be65639 |
| 6 | P0 | CSV formula neutralization | 649ec9b |
| 7 | P1 | Room types = schema enum | 649ec9b |
| 8 | P1 | QR image source | 649ec9b |
| 9 | P1 | QR regenerate/toggle | 0ca9e0c, 649ec9b |
| 10 | P1 | Table validation and batch reporting | 0ca9e0c |
| 11 | P1 | Menu tenancy and validation | 0ca9e0c |
| 12 | P1 | Price 0 on edit | 649ec9b |
| 13 | P1 | Kitchen "Go to Orders", stable setters | 649ec9b |
| 14 | P2 | Double-submit guards | be65639 |
| 15 | P2 | Inline errors, ErrorState, filters | 649ec9b |
| 16 | P2 | Modal ref-counted scroll lock | 649ec9b |
| 17 | P3 | ConfirmModal alertdialog | 649ec9b |
| 18 | P3 | Sidebar/drawer a11y | 649ec9b |
| 19 | P3 | RoomQR stray `0`, Inactive filter | 649ec9b |

### qa/reception

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1 | P0 | `receptionScope.js` hotel scoping | 55ebe84 |
| 2 | P0 | Foreign `hotelId` → 403 | 55ebe84 |
| 3 | P0 | Scoped `findById` writes → 404 | 55ebe84 |
| 4 | P0 | No client-chosen company in batch/export/maintenance/payment | 55ebe84 |
| 5 | P0 | Activity XSS (`SafeActivityText`) | 8b25ff6 |
| 6 | P0 | Escaped invoice print | 8b25ff6 |
| 7 | P1 | CSV formula injection | 55ebe84 |
| 8 | P1 | Escaped search x8 | 55ebe84 |
| 9 | P1 | Check-in validation order | 55ebe84 |
| 10 | P1 | Check-out only from Checked-In | 55ebe84 |
| 11 | P1 | Room status enum, 409 when occupied | 55ebe84 |
| 12 | P1 | Housekeeping enum, frees room | 55ebe84 |
| 13 | P1 | Hotel timezone day boundaries | 55ebe84 |
| 14 | P1 | Receptionist can read reports/overview | 55ebe84 |
| 15 | P1 | CSRF on reception router | 55ebe84 |
| 16 | P2 | Fabricated values removed | 55ebe84, 8b25ff6, 630d3eb |
| 17 | P2 | Bulk check-in / bookings URLs | 8b25ff6 |
| 18 | P2 | Clamped limits, scoped overdue update | 55ebe84 |
| 19 | P2 | Escaped guest communication | 55ebe84 |
| 20 | P3 | 4-tab + More bottom nav, mobile CSS | 8b25ff6 |

### qa/waiter

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1 | P0 | Waiter calls scoped (`waiterScope.js`) | 4008b74 |
| 2 | P0 | Table assignments scoped and validated | 4008b74 |
| 3 | P1 | Atomic acknowledge/resolve | 4008b74 |
| 4 | P2 | Priority rank sort | 4008b74 |
| 5 | P1 | WaiterCallsPanel dedupe, "Taken by" | 139c8b7 |
| 6 | P1 | Calls badge re-sync | c1bdfbe |
| 7 | P1 | Socket token keep-alive hook | 139c8b7 |
| 8 | P1 | Order form sold-out, stepper, retry | 10a9681 |
| 9 | P1 | Status styles for confirmed/cancelled | f0d4fd6 |
| 10 | P2 | dine-in label | f0d4fd6 |
| 11 | P2 | Drawer backdrop | c1bdfbe |
| 12 | P2 | Preparing tab shows confirmed | c1bdfbe |
| 13 | P2 | NotificationPanel all items, location | c1bdfbe |
| 14 | P2 | Own assignment card | 2bea1b5 |
| 15 | P1 | Sound prompt lifted (workaround) | c1bdfbe |
| – | – | Landscape full-screen order form | 6556bcb |

### qa/kitchen

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1-11 | P1 | Cancelled banner, confirmed in New, oldest-first, `order-updated` subscription, offline resync, stale-tap toast, two-step Ready, no double alert, live server-synced timer, overdue thresholds, 16 px notes/allergy badge | 6b3290b |
| 12 | P2 | Mobile header 44 px, drawer dialog | 6b3290b |
| 13 | P2 | 64 px bottom nav, `--bottom-nav-height` | 6b3290b, 00e8612 |
| 14-18 | P2 | Theme toggle, Sidebar logout in `finally`, search/empty/error/skeleton, PII log removed, wake lock | 6b3290b |
| 19-20 | P3 | No food photos, CSS cleanup + reduced motion | 6b3290b |
| 21 | P3 | Sidebar padding clear of sound prompt | 00e8612 |

### qa/superadmin

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1-6 | P0 | `ensureSuperadmin`, booking projections, superadmin-only routers, settings whitelist, payout idempotency/CAS, session revoke on role change | aef974b |
| 7-10 | P1 | Paisa finance with configured rate, refund transitions, rejection reason, no OTP echo | aef974b |
| 11-15 | P2 | Safe search/paging/ids, CMS URL rules, audit `null` id, admin audit entries, body validation | aef974b |
| 16-17 | P1 | ReasonModal, payout/refund guards and confirms | 323be61 |
| 18-19 | P2 | Real commission rate, server error messages | 323be61 |
| 20-22 | P3 | Drawer a11y, DeleteConfirmModal, Finance cards | 323be61 |
| 23 | P3 | 44/16 px touch rules | 323be61, 6d36770 |

### qa/guest

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1-3 | P0 | Room QR needs Checked-In stay, portal room service needs Checked-In, profile allow-list/validation | 1c839b5 |
| 4 | P1 | Call/bill de-dupe, single emit | 1c839b5 |
| 5 | P1 | `loadStripe` guard in BillingView | 9200176 |
| 6-8 | P2 | Bank transfer validation/409, phone validation, menu fields trimmed | 1c839b5 |
| 9 | P2 | `revert-layer` section padding workaround | 9200176 |
| 10-12 | P3 | Guest login a11y, 16/44 px portal, QR state hints | 9200176 |

### qa/public

| # | Sev | Fix | Commit |
|---|---|---|---|
| 1 | P0 | Public hotel API allow-list (no owner PII, bank, QR tokens) | 1b696df |
| 2 | P0 | Hotel's own bank details endpoint and modal | 1b696df, 0f23262 |
| 3-9 | P1 | Confirmation PDF, card invoice total, non-blocking mail, 48 h bank hold, clean duplicate-reference error, no double booking after late payment, own stale card holds released | b097705 |
| 10-11 | P1 | Empty optional fields omitted, lazy Stripe from `/payments/config` | 0f23262 |
| 12 | P1 | `getBookingById` authorization/projection, Company model registered | 1b696df |
| 13 | P2 | Hotel list search/paging/counts | 1b696df |
| 14-15 | P1 | Real hotel detail content, availability endpoint | 1b696df, 0f23262 |
| 16-18 | P1 | Phone filters sheet, real contact form, real BookingConfirmed | 0f23262 |
| 19-20 | P2 | StaffLogin mobile/a11y, page meta and h1 | 0f23262 |
| 21 | – | PaymentCallback meta reverted | 6dc11fc |
| 22 | P2 | Payment sheet default method, title, button | 937776a |
| – | – | Regression tests | 38b461c |

## 4. Remaining real defects by severity

No P0 is open.

| Sev | Defect | Dashboard | Blocker |
|---|---|---|---|
| P1 | Check-out does not settle the bill or create an invoice | reception | Product decision (canonical check-out flow) |
| P1 | Paid booking cancellation issues no refund; `paymentStatus` stays `paid` | public | Product decision |
| P1 | Review moderation does not reach the public hotel page or rating | superadmin | Product decision |
| P1 | Hotel suspend/reactivate not implemented (REQ-superadmin-2a) | superadmin | User decision |
| P1 | Mobile LCP/FCP far over target; landing CLS 0.46 (hero layer unchanged) | public | Needs re-measure after 4e446ea; hero fix not done |
| High | Billing page shows mock/"not available" | hoteladmin | Wiring to reception billing APIs |
| High | Stock is an in-memory mock | hoteladmin | Needs approval for a model + API |
| P2 | Waiter can set a table to `maintenance` (REQ-waiter-5) | waiter | Not fixed by 02 |
| P2 | `/auth/check` enumeration (rate-limited only) | guest | Signup-token decision |
| P2 | Guest invoice food tax fixed 13% | guest | Use hotel billing rates |
| P2 | AuthPage 14 px inputs, 20 px eye button | public/guest | Unowned in this run |
| P2 | One refresh token per user (REQ-waiter-17) | platform | User decision |
| P2 | Dashboard-level `body.overflow=hidden` locks | platform | Move locks to container |
| P2 | StaffSettings avatar initials | platform | Time |
| P2 | Assigned Areas lacks per-table state; no transfer/merge UI; no assignment UI (REQ-waiter-7) | waiter | Product |
| P2 | Two money formatters; browser timezone | waiter | Shared formatter |
| P2 | Guest PII unmasked; no ID capture; no bank-transfer proof viewer | reception | Not implemented |
| P2 | "View All Bookings" and top-bar search dead; commission rules unused; no unsaved-changes guard | superadmin | Product/time |
| P2 | Kitchen uses waiter-owned light-only components (REQ-kitchen-7) | kitchen | Refactor |
| P2 | Chief can cancel (REQ-kitchen-5) | kitchen | Policy decision |
| P2 | `getAvailableRooms` login-only; og:url/canonical missing | public | Kept / domain unknown |
| P2 | Hoteladmin orders realtime, detail staleness | hoteladmin | Not tested |
| P3 | Sub-44 px inline links (4-12 per view); "% of %" trend; Live Room Status clip at 390 | reception | – |
| P3 | Finance page gutters | superadmin | – |
| P3 | Dark-mode switch 48x28 | guest | – |
| P3 | 86'd items / per-item status; clock offset once | kitchen | Product / accepted |
| P3 | Owner email in hotel status log; tracked `sum.tmp.*`; `MAIL_PASSWORD` in root `.env` | platform | – |
| P3 | Fixed stock photo on orders | waiter | Data |
| P3 | Logo double fetch | public | Not investigated |
| P3 | Lint: 2 reception unused vars, `getOrCreateGuestRole` unused; 13 frontend warnings | all | Pre-existing |

## 5. REQs: open vs rejected

No request has `status: open`. The aborted-run file `wave1-aborted-requests-waiter.md` still says `open` for its two REQs; both are superseded by base 67759ec.

| Status | REQs |
|---|---|
| Done | hoteladmin-1, -2, -3, -4, -5, -6, -7, -9, R1, R2, R3; reception-1..4; waiter-1, -3, -4, -8, -10, -11, -12, -16, -19; kitchen-1, -2, -3, -4, -8; superadmin-1, -3, -4, -5, -6; guest-2, -3, -4, -5, -6; public-1, -2, -3, -5, -6, -7, -9, -10 |
| Partly done | waiter-6 (guest part 2e4e442; tenant check landed via 0ca9e0c, file not updated); waiter-9 (both halves done 4977655 + 1c839b5; file says partly); waiter-13 (avatar open); waiter-18 (whole-tab print open); guest-1 (rate limit only); public-4 (og:url, canonical); superadmin-2 (suspend/reactivate) |
| Acknowledged (info) | hoteladmin-8 |
| Rejected, forwarded and later fixed | waiter-2 (0ca9e0c), waiter-14 (1c839b5), waiter-15 (0f23262 StaffLogin; Stripe 9200176/0f23262) |
| Rejected, forwarded, still open | waiter-5 (maintenance by waiter) |
| Rejected, needs the user | waiter-7 (assignment UI), waiter-17 (per-device sessions), kitchen-5 (chief cancel) |
| Rejected, refactor / redesign | kitchen-6 (shared prompt position), kitchen-7 (shared components) |
| Rejected, no change needed | public-8 (dev stack traces) |

## 6. Mobile matrix gaps

| Dashboard | Covered | Not covered |
|---|---|---|
| platform | 4 pages x 9 viewports x 2 themes (72 combos, no overflow); BillPreview 360/390/1440; ConfirmDialog 390/1440 | BillPreview 844x390 (harness timeout); toast fix not re-shot; superadmin 390 landing; WebKit |
| hoteladmin | 1440 light/dark screenshots only | **Entire mobile matrix** (360-1440, 844x390, drawer, bottom sheet, keyboard, dark): never completed; WebKit |
| reception | 12 views at 360/390/768/1024/1440 PASS | 375, 412, 844x390; WebKit; 4-12 sub-44 px targets per view remain |
| waiter | 360/375/390/412/768/1024/1440/844x390 + dark 390/1440 PASS; keyboard 390x480 | WebKit; slow 4G/CPU; Lighthouse; UTC; reduced-motion visual |
| kitchen | 9 viewports x light/dark PASS; keyboard, orientation | WebKit/iOS; real tablets; 30-min soak; shared targets fix (4e446ea) not re-measured |
| superadmin | 7 pages x 9 viewports x 2 themes (161/162) | 1440 light cell (timeout); WebKit; "View All Bookings" 42/21 px |
| guest | 16 views x 8 viewports x 2 themes PASS; WebKit iPhone 390 flows 32/32 | Soft keyboard, slow 4G, 200% zoom, reduced motion, Lighthouse; dark switch 48x28 |
| public | 18 pages at 390/1440; 6 pages at 360/412/768/844x390/1024 | 12 pages at the other viewports; 375x667; dark; UTC; WebKit; Navbar/Footer fix not re-measured; CWV FAIL |
| final pass (4e446ea) | Build/lint/unit tests | No browser run of lazy routes, OrderContext, guest deep link, targets, AboutPage |

Only 07 ran real WebKit. Every other dashboard's iPhone result is Chrome emulation or not run.

## 7. Cross-dashboard UI consistency gaps

Taken from the platform cross-dashboard table and each report's rules G section. Code facts from `git grep` on qa/platform are marked.

| Element | Gap |
|---|---|
| Token sets | Six local token sets: `--ha-*` (hoteladmin), `--sh-*` (reception), `--sa-*` (superadmin), `--kd-*` (kitchen), `--g-*` (guest), waiter-local CSS. Shared `dashboard-tokens.css` (`--db-*`) is imported only by kitchen (`git grep`) |
| Money | hoteladmin `Rs. 0`; waiter `Rs 1,234` (form) and `Rs. 1,234` (details); guest `Rs 1,234.00`; superadmin `Rs. 1,234.50`; reception and public `Rs.` (reception `₹` fixed in 8b25ff6) |
| Primary colour | Emerald (hoteladmin/waiter), teal `#00BFA6` (superadmin) and teal gradient (public); reception indigo/purple gradients not recorded as changed |
| Status colours | "Preparing/active" is indigo (hoteladmin, waiter, reception `--sh-status-active`) but purple in kitchen ("cooking"); superadmin "scheduled" is purple with no contract equivalent |
| Phone navigation | Drawer: hoteladmin, superadmin. Bottom nav: waiter 5 tabs, kitchen 4 tabs (64 px), reception 4 + More sheet, guest bottom nav |
| `--bottom-nav-height` | Set only by kitchen (`html.kd-has-bottom-nav`). Waiter keeps the `:has()` sound-prompt workaround in `WaiterShell.css`, reception keeps a local `.msg-fab` override in `ReceptionMobile.css`, waiter keeps `useSocketTokenKeepAlive.js` (all `git grep`) |
| Confirm dialogs | Three implementations: shared `ConfirmDialog`, hoteladmin `ConfirmModal`, superadmin `DeleteConfirmModal`/`ReasonModal` |
| Card radius | hoteladmin 12 px, waiter 16-24 px before its fix (now 12), reception 12, superadmin 12, guest 8/12/16 |
| Empty states | hoteladmin icon + CTA; kitchen now has CTAs (6b3290b); others not compared |
| Toasts | Top-center on phones since b97ed58; not re-verified in a browser |
| Time/day | Reception uses hotel timezone; kitchen "Done" uses device local day; waiter shows browser timezone |
| Public site | Landing and navbar keep their own type scale; hero uses 13 px text from `sm` up; no theme switch |
| Login pages | StaffLogin and GuestDashboardLogin are 16/44 px; AuthPage still 14 px / 20 px |

## 8. Branches and merge order

### State

The premise "merge qa/platform first, then the rest" no longer matches the repository. All seven non-platform branches are already merged into `main` (`git merge-base --is-ancestor <branch> main` is true for each). `main` @ `67598b9` contains, in first-parent order: d27aa81 (qa/platform 63b2908), 99480f0, d0fb269, 41a5a70, fdc396b (qa/hoteladmin be65639), 907f10d (qa/reception 630d3eb), c9b7d0c (qa/waiter 2bea1b5), 15071b3 (qa/platform b97ed58), 6edfa63 (qa/superadmin 6d36770), ee4d821 (qa/kitchen 00e8612), 4333eec (qa/public 937776a), 5339d4e (qa/guest 9200176), 67598b9 (report docs).

`qa/platform` was fast-forwarded to 5339d4e and then got 2 commits (`7388420`, `4e446ea`) that are **not in main**. It is 1 commit behind main (67598b9, docs only). `git merge-tree --write-tree main qa/platform` reports no conflicts.

**Recommendation:** merge `qa/platform` (4e446ea) into `main`. Nothing else is left to merge. Wave 1 branches were cut from 67759ec and wave 2 branches from qa/platform @ b97ed58 (verified: b97ed58 is an ancestor of all four).

| Branch | Tip | Cut from | Commits since 67759ec | In main | `git diff --stat 67759ec..<branch>` | Own changes |
|---|---|---|---|---|---|---|
| qa/platform | 4e446ea | 67759ec | 50 (includes all merges) | no (2 ahead) | 219 files, +13215 / -7975 | wave 1 67759ec..b97ed58: 44 files, +1751/-703; final 5339d4e..4e446ea: 29 files, +519/-136 |
| qa/hoteladmin | be65639 | 67759ec | 3 | yes | 32 files, +2231 / -1460 | same |
| qa/reception | 630d3eb | 67759ec | 3 | yes | 23 files, +1293 / -523 | same |
| qa/waiter | 2bea1b5 | 67759ec | 7 | yes | 19 files, +1280 / -648 | same |
| qa/kitchen | 00e8612 | qa/platform b97ed58 | 12 | yes | 53 files, +2876 / -1950 | b97ed58..: 9 files, +1125/-1247 |
| qa/superadmin | 6d36770 | qa/platform b97ed58 | 13 | yes | 75 files, +3739 / -1531 | b97ed58..: 31 files, +1988/-828 |
| qa/guest | 9200176 | qa/platform b97ed58 | 12 | yes | 58 files, +2147 / -855 | b97ed58..: 14 files, +396/-152 |
| qa/public | 937776a | qa/platform b97ed58 | 16 | yes | 74 files, +4385 / -2983 | b97ed58..: 30 files, +2634/-2280 |

### Files touched by more than one branch

Literal `67759ec..<branch>` diffs share 44 files across kitchen, superadmin, guest and public. All 44 come from qa/platform wave 1 (`67759ec..b97ed58`) and are inherited, not separate edits: `backend/config/sentry.js`, `controllers/orderController.js`, `controllers/staffController.js`, `middleware/{authMiddleware,errorHandler,rateLimiter,upload}.js`, `models/{company,guest,user}.schema.js`, `routes/{healthRoutes,staffRoutes}.js`, `server.js`, `services/notificationService.js`, `tests/{orderAccess.integration,platformAuth.integration,uploadErrors}.test.js`, `utils/{searchQuery,staffRoleRoutes}.js`, `frontend/src/app/App.jsx`, `core/api/client.js`, `core/context/{NotificationContext,SocketContext,StaffAuthContext}.jsx`, `core/routes/{ProtectedStaffRoute.jsx,staffRoleRoutes.js}`, `index.css`, `shared/components/{BillPreviewModal.jsx,ConfirmDialog.css,ConfirmDialog.jsx,ErrorBoundary.jsx,ItemCarousel.jsx,MessagingPanel.css}`, `shared/components/dining/{diningFormat.js,TableBills.css}`, `shared/hooks/useModalA11y.js`, `shared/layout/{Footer,Navbar}.jsx`, `shared/styles/dashboard-tokens.css`, `shared/ui/ThemeToggle.jsx`, `shared/utils/{callSounds,webrtcManager}.js`, `frontend/tests/{authClient,staffRoleRoutes}.test.mjs`.

Comparing each branch's own commits (wave 1 vs 67759ec, wave 2 vs b97ed58, platform final vs 5339d4e), three files are edited by two branches:

| File | Branches | Note |
|---|---|---|
| `backend/controllers/hotelController.js` | qa/public (1b696df), qa/platform final (7388420) | 7388420 was written on top of the merged qa/public; no conflict in merge-tree |
| `backend/routes/hotelRoutes.js` | qa/public, qa/platform final (7388420, REQ-superadmin-1) | same |
| `backend/controllers/paymentController.js` | qa/reception (55ebe84), qa/platform final (7388420, REQ-public-7) | same |

Wave 1 branches (hoteladmin, reception, waiter) share no files with each other or with qa/platform wave 1.

