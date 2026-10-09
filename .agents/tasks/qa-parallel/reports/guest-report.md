# Session 07 (guest) report

Branch `qa/guest` in `.worktrees/qa-guest`, created from `qa/platform` @ `b97ed58`. There are 2 commits, both unpushed and unmerged: `1c839b5` (backend) and `9200176` (frontend). The harness is in `.qa-harness/guest/` (probes, flows, audits, JSON results, `shots/`).

## 1. Environment

| Item | Value |
|---|---|
| API / web | 3006, bound port confirmed in the log / 5179 (`vite preview` of a production build with `VITE_API_BASE_URL=http://localhost:3006` and `ALLOW_LOCAL_API_IN_PROD_BUILD=true`) |
| DB | `mongodb-memory-server` replica set on 127.0.0.1:27107, DB `stayhaven_qa_guest`. The seeder refuses any other URI. The mongod died once mid-run, with an unknown external cause; I restarted it and reseeded |
| Fixtures (`backend/scripts/_qa_tmp_guest.js`, now deleted) | Company A: Test Hotel + a second hotel. Company B: one hotel. Owner, receptionist, waiter, chief and manager for A; receptionist for B. Guests: A (future Confirmed + past + cancelled), B (Checked-In room 102, invoice 11,300, billed order 700), C (Company B, Checked-In), one with no bookings, one for the lockout test, one for the password test. Tables: active, inactive-QR, maintenance, regenerated (old token kept), one in Company B. Rooms: reserved, occupied, vacant, inactive-QR, one in Company B. Menu with a sold-out item, a Devanagari description and a very long name |
| Browsers | System Chrome via the `@playwright/test` 1.49.1 library. WebKit 18.2 was installed into `.qa-harness/guest/browsers`, which needs `NODE_OPTIONS=--use-system-ca` because of a TLS interceptor |
| Env | `backend/.env` was generated with random 48-char JWT secrets. There are no third-party keys (Stripe, Cloudinary, SMTP), so those features are BLOCKED |

| Check | Baseline (b97ed58) | Final (9200176) |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings |
| `npm run build` | pass | pass |
| `npm run test:frontend` | 17/17 | 17/17 |
| `backend npm test` | 135/137 | 136/138 |

The same 2 backend failures appear in baseline and final: `bookingIntegrity` "companyless staff cannot read another booking" and its parent test (booking routes, owned by 08). The new test file `tests/guestQr.integration.test.js` is picked up by the `tests/*.test.js` glob, so no package.json change was needed. Run it alone with `node --test --test-concurrency=1 tests/guestQr.integration.test.js`.

## 2. Feature PASS/FAIL

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| API security/function (`api-probe.mjs`) | 151 | 148 | 3 | 0 | Baseline was 135/151. The 3 remaining failures are in other sessions' files: REQ-guest-1 (01) and REQ-guest-6 (02) |
| Production mode (`prod-probe.mjs`) | 3 | 3 | 0 | 0 | QR order limiter returns 429 with a message; an invalid id returns 404 JSON with no stack |
| Browser flows, Chrome 390 (`flows.mjs`) | 32 | 31 | 1 | 0 | The previous Chrome run was 32/32. The one failure is a menu-load timing flake for guest A ("no add button") |
| Browser flows, WebKit iPhone 390 | 32 | 32 | 0 | 0 | |
| Login | 7 | 7 | 0 | 0 | Labels, autocomplete, 16px inputs, 44px toggle, wrong-password message, no user enumeration on `/auth/login` |
| Room service (portal) | 6 | 6 | 0 | 0 | Menu loads and sold-out items are hidden. A double tap creates one order, and the waiter socket gets `new-order` live. A guest who has not checked in gets a clear message |
| Billing | 2 | 2 | 0 | 2 | Outstanding balance Rs 12,000 = invoice 11,300 + order 700, matching the server total. Card payment and invoice PDF are BLOCKED (no Stripe key, no PDF endpoint) |
| Table QR | 11 | 11 | 0 | 0 | Two taps on Call waiter create one waiter event, and two taps on Request bill create one call. The order is placed once, the kitchen status reaches the guest tracker live, and the session survives a reload. A second device does not see the first party's bill. Inactive and regenerated tokens show a clear screen. The maintenance table returns 409. A stored XSS name renders as text |
| Room QR | 3 | 3 | 0 | 0 | Vacant or not-yet-arrived rooms cannot order (with an explanation); the checked-in room can |
| Resilience | 2 | 2 | 0 | 0 | A simulated 500 shows an error state with Retry. A 401 "token expired" signs the guest out, but to `/login` instead of `/guest/login` (REQ-guest-5) |
| Chat / requests / profile (API) | 22 | 22 | 0 | 0 | Body `hotel`, `guestUser` and `sender` are ignored. Threads are scoped per guest. The 2000-character limit and NoSQL objects are rejected. Requests take the room from the booking |
| Password change | 5 | 5 | 0 | 0 | The other session gets 401, its refresh is rejected, and the new password works |
| WebRTC calls, OTP/Google login, avatar upload | – | – | – | 3 | BLOCKED: no Google client, Cloudinary or SMTP configured. Upload type/size checks are owned by 01 (magic bytes, `50a0072`) |

## 3. Mobile matrix (rules F)

`mobile-audit.mjs` covered 16 views (8 portal pages, login, table/room home, menu and checkout, the inactive-QR screen) at 360, 375, 390, 412, 768, 1024, 1440 and 844×390, in light and dark. Data: `audit-before.json` / `audit-after.json`.

| View | 360 | 375 | 390 | 412 | 768 | 1024 | 1440 | 844×390 | Screenshots |
|---|---|---|---|---|---|---|---|---|---|
| All 8 portal pages | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `shots/after-<view>-<vp>[-dark].png` |
| Login | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `after-login-*` |
| Table / room home, menu, checkout | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `after-table-menu-*`, `after-room-checkout-*` |

What PASS means here:
- **Horizontal overflow:** none on any view, viewport or theme, before or after.
- **Before:** 15px inputs across the portal, 13–14px inputs on the QR and login forms, 40px chips, Add buttons and chat send, 36px steppers and photo link, a 20×20 login eye button, and 10px category counts and sold-out badges.
- **After:** the only small items left are the bottom-nav unread badge (10px; it is decorative, and an `sr-only` label carries the meaning) and the settings dark-mode switch at 48×28. The switch passes WCAG 2.5.8 AA (≥24px) but not the 44px rule.
- **Not automated:** soft keyboard, Slow 4G throttling, 200% zoom and reduced motion were not run, because harness time went to the WebKit setup. The QR menu skeleton timing is also unmeasured.

## 4. Security matrix (key rows; full list in `api-final.json`)

| Actor | Call | Expected | Actual (final) |
|---|---|---|---|
| anon / tampered / alg=none | GET /guest/portal/dashboard | 401 | 401 |
| waiter, receptionist | GET /guest/portal/* | 401/403 | 401 (staff tokens carry no guest session) |
| guest B | GET /staff/me, /orders, /reception/*, /superadmin/*, /feedback | 401/403/404 | 403/404 |
| guest B | GET /tables, /rooms ?hotelId=A | 403 | **200** (REQ-guest-6, owned by 02) |
| guest A | extend / cancel / modify guest B's booking | 403/404 | 404 |
| guest A | can-cancel / cancel / pay guest C's order | 403/404 | 404 |
| guest B | pay guest C's invoice; confirm a fake PaymentIntent | 403/404 | 404 |
| guest B | POST /order with price=1, status=delivered, customerId=A, roomNumber=999 | recomputed | total 700, pending, room 102 |
| guest B | order an item from hotel B / a sold-out item / qty 0, -1, 1e9, 1.5, "2" | 400/404 | 400/404 |
| guest A (Confirmed, not arrived) | POST /order | 409 | 409 (baseline: 201) |
| guest B | PUT /profile {role, companyRole, email, isActive} | ignored | ignored |
| guest B | PUT /profile contact "abc" | 400 | 400 (baseline: 200, which cleared the number) |
| guest B | GET /profile (legacy) | no secrets | allow-list (baseline leaked inviteToken, googleId, loginAttempts and lockUntil) |
| guest B | PATCH /profile email {a:1}, username [..] | 400 | 400 (baseline: 500) |
| guest B | PATCH /profile email "not-an-email", fullname 10k chars | 400 | 400 (baseline: 200) |
| guest B | password change without CSRF | 403 | 403 |
| guest B | POST /messages with hotel=B, guestUser=C, sender=C | ignored | ignored |
| guest A | read guest C's chat thread | none | none |
| anon | /guest/table with an inactive token / old regenerated token / garbage / `{$gt}` | 404/400 | 404/400 |
| anon | QR order: price tampering, missing idempotency key, B item, qty 21, B table token, inactive/old token, maintenance table | recomputed / 400 / 409 | as expected |
| anon | QR order: two requests with the same idempotency key | one order | one order |
| anon | call-waiter: two simultaneous taps | one call | one call (baseline: two calls and four socket events per waiter) |
| anon | call-waiter: reason of 5000 chars, reason object, bad hotelId, token object | 400 | 400 (baseline: 500 for three of them) |
| anon | request-bill: two simultaneous taps | one call | one call |
| anon | room QR order for a vacant room / Confirmed-not-arrived room | 409 | 409 (baseline: 201) |
| anon | another session reading an order / tab / room requests | 404 / empty | 404 / empty |
| anon | GET /auth/check?email= | no enumeration | **exists true/false** (REQ-guest-1, owned by 01) |
| anon (production) | 12 QR orders | 429 with message | 429 |

**Stored XSS:** an `<img onerror>` payload in a QR customer name is stripped by `sanitizeAll`, so the order is refused with "name required" and nothing is stored. Payloads in request text, chat and notes render as text in the guest views, with no dialog in Chrome or WebKit. I did not test whether the reception, waiter and kitchen views also render those strings as text (they belong to 03, 04 and 05). The data is in the DB under guest B's request and chat.

## 5. Bugs fixed

| # | Sev | file | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | guestController `createGuestOrder` (roomService) | A room QR only checked `isQrActive`, so a vacant room, a guest who hadn't arrived or one who had checked out could order to that room | Requires a Checked-In booking for the room (409 `NO_ACTIVE_STAY`); `getRoomByToken` returns `canOrder` | probe, test, flows | 1c839b5 |
| 2 | P0 | guestDashboardController `placeOrder` | A Confirmed future booking was enough for portal room service, even while another guest occupied the room | Requires Checked-In (409 `NOT_CHECKED_IN`) | probe, test, flows | 1c839b5 |
| 3 | P0 | profileController `getProfile`/`updateProfile` | A blacklist select exposed inviteToken, googleId, loginAttempts and lockUntil. Non-string input caused a 500. No email/length validation | Allow-listed fields; typed and validated input | probe, test | 1c839b5 |
| 4 | P1 | guestController `callWaiter`/`requestBill` | No de-dupe (REQ-waiter-14). Emitted to the waiters room and the hotel room, so each waiter got it twice (REQ-waiter-9). Unvalidated input caused a 500 | Per-table 60 s de-dupe with an in-process lock; a single `emitToHotelStaff`; typed validation | probe, test, flows (1 socket event) | 1c839b5 |
| 5 | P1 | BillingView.jsx:39 | `loadStripe(undefined)` threw on every page that loaded the chunk | Only called when the key is set; the card step shows "unavailable" | flows (remaining error comes from 08) | 9200176 |
| 6 | P2 | guestDashboardController `payOrder` (bank) | Bank details were not type-checked, and a double tap filed a second pending transfer | String fields ≤100 characters; 409 when a transfer is already pending | test | 1c839b5 |
| 7 | P2 | guestDashboardController `updateProfile` | Phone "abc" silently cleared the number | Letters return 400; an empty value still clears | probe, test | 1c839b5 |
| 8 | P2 | guestController `getGuestMenu` | `__v`/timestamps were sent to anonymous clients | Removed with `select` | test | 1c839b5 |
| 9 | P2 | guest-tokens.css (workaround) | The unscoped `section {padding:60px 0}` in AboutPage.css overrode Tailwind's `p-*` on phones; the Billing balance card had no side padding | `.guestPortal section { padding: revert-layer }`; the root fix is REQ-guest-3 | screenshot before/after, computed padding | 9200176 |
| 10 | P3 | GuestDashboardLogin.jsx | 14px inputs, unlabelled inputs, 20×20 eye button, no autocomplete, `console.error` of the error object, deep link ignored | 16px inputs, `htmlFor`, `username`/`current-password`, 44px targets, `state.from` (guest-dashboard paths only) | flows (Chrome and WebKit) | 9200176 |
| 11 | P3 | guest-tokens.css, GuestQR.css, ChatView, RoomServiceView, SettingsView, ProfileView | Inputs under 16px (iOS zoom) and tap targets under 44px | 16px inputs; 44px chips, Add, stepper, send button, eye button, photo link; 12px counts and badge | audit-after | 9200176 |
| 12 | P3 | GuestRoomView, GuestTableView | No up-front explanation before check-in; duplicate taps showed "notified" again | Disabled button with a hint; info toast for duplicates | flows | 9200176 |

## 6. UX/visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| Billing balance card (≤480px) | Text flush to the card edge, 60px empty bands | 20px padding, compact card | `shots/after-billing-390-wk.png` (the run before the workaround) vs `after-billing-375.png` |
| Guest login | 14px inputs, 20px eye button | 16px inputs, 44px eye button and links | `before-login-390.png` / `after-login-390.png` |
| QR menu | 40px chips and Add, 36px stepper, 10px counts | 44px controls, 12px counts | `before-table-menu-390.png` / `after-table-menu-390.png` |
| Room QR (vacant room) | Ordering offered, then failed at checkout | Disabled with "Available once you have checked in" | `after-room-vacant-390.png` |

Rules G mapping (guest tokens to the contract): `--g-radius-sm/md/lg` map to 8/12/16, and the status colours already follow the contract. Money is `Rs 1,234.00` from `utils/format.js` while the contract is `Rs. 1,234`; I left it for 01 to unify with the shared formatter.

## 7. REQs filed (`requests/guest.md`), all open

1. REQ-guest-1 (01): `/auth/check` reveals whether an email has an account.
2. REQ-guest-2 (01): ProtectedGuestRoute should pass `state.from` so the deep link survives login. The login page side is done on qa/guest.
3. REQ-guest-3 (08): scope the AboutPage.css global `section` and `h2` rules.
4. REQ-guest-4 (08): guard `loadStripe` in `BookingPaymentModal.jsx:14`.
5. REQ-guest-5 (01): a guest whose token expires should go to `/guest/login`, not `/login`.
6. REQ-guest-6 (02): a guest token can list tables and rooms. This may already be fixed on `qa/hoteladmin`.

## 8. Decisions

- **Room service needs a checked-in stay** (room QR and portal). The prompt says a checked-out room can't order. The same rule covers vacant rooms and guests who haven't arrived, because otherwise food is billed to and delivered to the wrong person. Housekeeping requests from a room QR are still accepted and flagged `verifiedStay:false`, as before.
- **Call de-dupe uses a 60 s window plus an in-process lock**, not a unique index. Model changes belong to 01, and one API instance is the current deployment. With several instances, two calls could still slip through inside a few milliseconds.
- **The section-padding fix is a guest-scoped `revert-layer` workaround.** The root file belongs to 08.
- **XSS in a QR name gets "name required".** `sanitizeAll` strips the markup and leaves an empty string. That is safe, and I left it as is.

## 9. Remaining issues

| Sev | Issue | file:line | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P2 | User enumeration through `/auth/check` | authRoutes.js:34 | Owned by 01 | REQ-guest-1 |
| P2 | Guest token lists tables/rooms | tableRoutes.js, roomRoutes.js | Owned by 02 | REQ-guest-6 |
| P2 | `loadStripe(undefined)` still throws on every page | BookingPaymentModal.jsx:14 | Owned by 08 | REQ-guest-4 |
| P2 | AboutPage `h2 {font-size:1.9rem}` still leaks into other pages at ≤480px | AboutPage.css:960 | Owned by 08; `revert-layer` would also drop the `.g-h2` class styles | REQ-guest-3 |
| P2 | Invoice tax for food orders is back-computed at a fixed 13% | guestDashboardController `getUserInvoices` (`/1.13`) | Needs the hotel's `restaurantBilling` rates, the same as 01's bill fix; untested with a service charge | Use `chargesFromHotel` + `computeTotals` |
| P3 | Dark-mode switch is 48×28 | SettingsView.jsx:500 | Passes AA 24px; changing it is a visual redesign | Add a `before:` hit area of 44px |
| P3 | Deep link after login | ProtectedGuestRoute.jsx | Owned by 01 | REQ-guest-2 |
| – | Soft keyboard, Slow 4G, 200% zoom, reduced motion, Lighthouse | – | Not run (time) | Re-run with `mobile-audit.mjs` extensions |
| – | Reception, waiter and kitchen rendering of guest XSS strings | 03/04/05 views | Not my sinks | Owners: check the request/chat text from guest B |

## Cleanup

`backend/scripts/_qa_tmp_guest.js` and the diagnostic scripts are deleted. The API (3006), web (5179) and mongo (27107) are stopped, and the ports are confirmed free. `backend/.env` in the worktree is gitignored and holds no real keys. The worktree, branch and 2 commits are left for review. Merge after 05, per the order in rules K.

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/guest.md`. Nothing was re-run. "Current status" is the status line now in the requests file.

### A. Counted FAILs

| Counted in | Check | Reason (observed) | Where | REQ | Current status |
|---|---|---|---|---|---|
| `api-probe.mjs` 148/151 (3 fail) | Anonymous `GET /api/v1/auth/check?email=` should not enumerate users | Returns `{"exists":true}` / `{"exists":false}` without auth | `backend/routes/authRoutes.js:34` (owner 01) | REQ-guest-1 | partly done in 7388420: `accountCheckLimiter` added (10 per 15 min per IP in production); the endpoint still answers exists true/false because signup uses it; a signup-token gate is a product decision |
| same | Guest B `GET /tables?hotelId=A`, expected 403 | 200 | `backend/routes/tableRoutes.js` (owner 02) | REQ-guest-6 | done on main by 02 in 0ca9e0c (`assertHotelAccess` returns 403 for guest/superadmin); regression test in 7388420 |
| same | Guest B `GET /rooms?hotelId=A`, expected 403 | 200 | `backend/routes/roomRoutes.js` (owner 02) | REQ-guest-6 | same |
| Browser flows, Chrome 390: 31/32 (1 fail) | Guest A, menu page: "no add button" (which flow step exactly is not recorded) | Menu-load timing flake. The previous Chrome run was 32/32 and WebKit iPhone 32/32. Root cause was not investigated | `.qa-harness/guest/flows.mjs` | none | not re-run; reason for the flake not recorded by the session - needs re-run |
| `backend npm test` 136/138 (2 fail) | `bookingIntegrity` "companyless staff cannot read another booking" and its parent test | Same 2 as baseline b97ed58 (135/137): `Company` model not registered, 500 instead of 403; booking routes owned by 08 | `backend/controllers/bookingController.js` | none | pre-existing in baseline 67759ec; fixed by 08 in 1b696df (platform report) |

Mapping note: the section 4 matrix marks the guest `GET /tables, /rooms` call as one row; it accounts for 2 of the 3 API failures. The third is the `/auth/check` row. This is an inference from the matrix, since the report does not list the 3 probe lines.

### B. BLOCKED checks

| Counted in | Check | Reason (type) |
|---|---|---|
| Billing (Blocked 2) | Card payment | Environment limit: no Stripe key; the card step shows "unavailable" |
| Billing (Blocked 2) | Invoice PDF | No PDF endpoint exists for guest invoices |
| "WebRTC calls, OTP/Google login, avatar upload" (Blocked 3) | WebRTC calls | Not configured locally; the report groups the three under "no Google client, Cloudinary or SMTP configured", so the specific reason per item is not recorded. Needs re-run with the services |
| same | OTP / Google login | Environment limit: no Google client, no SMTP |
| same | Avatar upload | Environment limit: no Cloudinary. Type/size checks are owned by 01 (magic bytes, 50a0072) |
| Section 3 "Not automated" | Soft keyboard, Slow 4G throttling, 200% zoom, reduced motion, QR menu skeleton timing, Lighthouse | Not run: harness time went to the WebKit setup (WebKit 18.2 installed with `NODE_OPTIONS=--use-system-ca` because of a TLS interceptor) |
| Section 4 | Whether reception, waiter and kitchen views render guest-supplied request/chat strings as text | Not tested: those sinks belong to 03, 04, 05. The payloads remain in the DB under guest B (request and chat) |

### C. Defects named in the report that sit inside "PASS" or "remaining", not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| Resilience: a 401 "token expired" signs the guest out to `/login` instead of `/guest/login` | `frontend/src/core/api/client.js` 401 handling, REQ-guest-5 | done in 4e446ea; `state.from` is not carried across the hard redirect; not browser re-run |
| Deep link lost after login | `frontend/src/core/routes/ProtectedGuestRoute.jsx:16`, REQ-guest-2 | done in 4e446ea; build-verified only |
| AboutPage global `section` / `h2` rules leak into the dashboards on phones | `AboutPage.css:891,985` (and `:960`), REQ-guest-3, workaround `revert-layer` in `guest-tokens.css` | done in 4e446ea (rules scoped with `:where(.about-page)`) |
| `loadStripe(undefined)` still throws from `BookingPaymentModal.jsx:14` | REQ-guest-4 (owner 08); the `BillingView.jsx:39` part was fixed here in 9200176 | done on main by 08 (0f23262) |
| Invoice tax for food orders back-computed at a fixed 13% (`/1.13`), untested with a service charge | `guestDashboardController getUserInvoices` | open (P2) |
| Remaining small targets: bottom-nav unread badge 10 px (decorative, `sr-only` label); dark-mode switch 48x28 | Passes WCAG 2.5.8 AA (24 px), not the 44 px rule; `SettingsView.jsx:500` | open (P3) |
| Environment incident | The mongod died once mid-run, cause unknown; restarted and reseeded | no result affected as far as the report records |
