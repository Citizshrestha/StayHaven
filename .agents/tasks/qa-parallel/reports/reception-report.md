# Session 03 — Reception dashboard QA report

## 1. Environment
- Worktree `.worktrees\qa-reception`, branch `qa/reception` from `main@67759ec`. Commits: `55ebe84` (backend scoping/security), `8b25ff6` (frontend XSS + mobile), `630d3eb` (room rating). Not pushed, not merged.
- API 3002 (`NODE_ENV=development`), web 5175 (`VITE_API_BASE_URL=http://localhost:3002`), DB `stayhaven_qa_reception` on a local `mongodb-memory-server` replica set (127.0.0.1:27103, harness `mongo.cjs`). `backend\.env` created from `.env.example` with random JWT secrets, no third-party keys. All three servers stopped at the end.
- Seed: `backend\scripts\_qa_tmp_reception.js` (deleted). Company A (Test Hotel, Test Hotel 2), Company B; owner/admin/manager/2 receptionists (Test Hotel), receptionist (Test Hotel 2), waiter, housekeeper, Company B owner + receptionist; bookings in every status, overlapping dates, a bank-transfer booking with pending txn; XSS payloads in guest name, room type, special request, task notes, activity log and guest request; a CSV-formula guest name; Devanagari and very long names.
- Browsers: Playwright 1.49.1 driving installed Chrome (`channel: 'chrome'`); the bundled headless shell could not be downloaded (TLS proxy). WebKit not available → iPhone/WebKit runs BLOCKED.

| Check | Baseline | Final |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings (reception folder: 3 warnings, unchanged) |
| `npm run build` (needs `VITE_API_BASE_URL`) | pass | pass |
| `npm run test:frontend` | 14/14 | 14/14 |
| `backend npm test` | 133 tests, 131 pass, 2 fail (`bookingIntegrity` "companyless staff…", pre-existing: Company model not registered in that test) | 134 tests, 132 pass, same 2 fail. New `tests/receptionScope.integration.test.js` passes (already covered by the `tests/*.test.js` glob, no package.json change needed) |
| Backend eslint on touched controllers | — | 2 pre-existing unused-var errors (`batchController.js:560 reason`, `exportController.js:480 rooms`), none new |

## Phase 1 — map (view → service → route → controller), with findings before fixes
All calls go through `core/api/services/reception.service.js` → `/api/v1/reception/*` (`receptionRoutes.js`: `protect` → `receptionLimiter` → `enforcePropertyScope` → per-route `authorize`). Bookings creation/walk-in/express checkout/room change use `/api/v1/bookings/*` (session 08), orders use `/api/v1/staff/orders` (01).

| View | Endpoints | Controller | Baseline scoping / validation |
|---|---|---|---|
| Dashboard | dashboard/summary, room-status, occupancy-weekly, revenue-split, arrivals/today, departures/today, guest-requests, activity, housekeeping | receptionController | `getCtx` filtered on **company** (all hotels of the company) whenever the user had one → receptionist of Test Hotel saw Test Hotel 2. Day boundaries server-local, not hotel TZ. Activity rendered with `dangerouslySetInnerHTML`. Fake trends (`previous = current − 6`, pending/available "N vs yesterday"). |
| Bookings | reservations (paginated, cap 100) | receptionController.getReservations | company-wide; unescaped `$regex` (500 on `*`/`(`) |
| Check-in/out | bookings/:id/check-in (+`preventDoubleCheckIn`), check-out, batch/check-in, communications | receptionController, batchController | check-in allowed for cancelled/future bookings and rooms in cleaning; check-out allowed for Pending/No-Show; `?hotelId=` from Company B owner accepted (owners bypass `enforcePropertyScope`) → cross-tenant check-in observed. Bulk check-in modal posted to non-existent `/batch/checkin`. |
| Rooms | rooms, rooms/:id/status, batch/room-status | receptionController, batchController | `findByIdAndUpdate` with no ownership → Company B could change Company A rooms; any status string accepted; occupied room could be set available |
| Guests | guests, guests/:id, :id/status, :id/blacklist | receptionController | IDOR read/write across companies; unescaped regex; no rate-limit beyond `receptionLimiter` |
| Housekeeping | housekeeping, housekeeping/:id | receptionController | IDOR write; any status; clean did not free the room |
| Billing / bank transfer | billing/invoices, billing/summary, payments/*, payments/bank-transfers/* | receptionController, paymentController, bankTransferController + services/bankTransferService | company-wide aggregates; `capturePayment`/refund/dispute by bare id (Company B could capture on Company A booking); `limit` uncapped on invoices; print HTML unescaped |
| Orders | /api/v1/staff/orders (01) | orderController | REQs filed by 02 (regex 500, owner bypass) |
| Reports | reports/overview | receptionController | 403 for receptionists although in their sidebar; fabricated `previous`; Guest counts unscoped by hotel |
| Staff | staff, staff/:id/notify-manager | receptionController | notify-manager accepted any user id (cross-company) |
| Settings | /api/v1/profile, staff (01/07) | — | not changed |
| Exports / maintenance / shifts / offline queue | exports/*, maintenance/*, shifts/*, operations/* | exportController, maintenanceController, receptionController | company-wide or `?companyId=` honoured; CSV not formula-safe; `getShiftById` 500 on bad id |

## 2. Feature PASS/FAIL (observed via API or browser, final run)
| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| Dashboard | KPIs = DB for active hotel (8 rooms, 3 available, 2 occupied, 25 %), quick actions, activity text | 3 | 0 | 0 | Revenue shown `Rs. 65,540`; pending/available KPIs no longer show invented trends |
| Bookings list | list/search (regex-safe)/filter, phone cards | 3 | 0 | 0 | create/edit/cancel/no-show go through `/api/v1/bookings` (08) — not retested |
| Check-in/out | concurrent check-in (2 contexts → 200/409), cancelled/future/not-ready rejected, check-out → room cleaning, double check-out 409, check-out of Pending/No-Show rejected | 6 | 0 | 0 | Bill settlement at check-out: see Remaining |
| Rooms | live board, invalid status 400, occupied→available 409, 2-col phone grid | 4 | 0 | 0 | |
| Guests | search by name/email/phone regex-safe, IDOR blocked, CSV formula-safe | 3 | 0 | 0 | PII masking not implemented (Remaining) |
| Housekeeping | clean → room available (bookable), invalid status 400, assignee must be hotel staff | 3 | 0 | 0 | |
| Billing | invoices scoped, Rs. format, print escapes payloads, partial capture recomputed server-side | 4 | 0 | 0 | BillPreviewModal (shared) code-read only: body React-escaped, title REQ-reception-4 |
| Bank transfer | approve twice concurrently → one approves, one no-op; captured once; Company B cannot approve | 3 | 0 | 0 | proof upload/serving not present in this flow (reference-only) → BLOCKED |
| Orders | view loads, 0 HTTP errors | 1 | 0 | 0 | |
| Reports | receptionist 200, `previous` = yesterday's booked occupancy (38 %) | 2 | 0 | 0 | export via exports/* scoped |
| Staff / Settings | list without secrets, notify-manager cross-tenant blocked | 2 | 0 | 0 | |
| Realtime | — | 0 | 0 | 1 | socket new-order/request events not exercised (no second actor creating orders in harness) |
| Rate limit (`NODE_ENV=production`) | — | 0 | 0 | 1 | not run |

API probes: `api-probe.mjs` 53/53 pass (baseline 20/52), `api-probe2.mjs` 11/11, UI `flows.mjs` 9/9 (harness in `.qa-harness\reception`).

## 3. Mobile matrix (light; final run `shots\after2\`, flows dark `shots\flows-*.png`)
All 12 views reached at every viewport; overflow / nav-covers-content / HTTP-error / XSS-dialog / input-font checks:

| View | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| dashboard, bookings, checkinout, rooms, housekeeping, guests, orders, restaurantBills, billing, reports, staff, settings | PASS | PASS | PASS | PASS | PASS |

Baseline (`shots\before\`): 5 views unreachable on ≤768 (bottom nav had 8 tabs, no Rooms/Billing/Reports/Staff), dashboard and bookings overflowed (454 px / 629 px content at 390), inputs 14 px everywhere, Reports 403. Some final screenshots timed out under machine load (harness issue, checks still ran). 375/412/844×390 and WebKit not run in the final sweep (BLOCKED: time/WebKit download). Remaining small tap targets on phones: 4–12 per view (mostly inline text links/badges), down from 15–37.

## 4. Security matrix (selected; full list in `results\api-probe-after-fix3.json`)
| Actor | Call | Expected | Before | After |
|---|---|---|---|---|
| Test Hotel receptionist | GET reservations/guests/rooms/departures | Test Hotel only | included Test Hotel 2 | Test Hotel only |
| Company B owner | GET reservations?hotelId=TestHotel | 403 | 200 | 403 |
| Company B owner | POST bookings/:A/check-in?hotelId=A | 403/404 | 200 (checked in) | 403 |
| Manager (Test Hotel) | ?hotelId=Test Hotel 2 | 403 | 200 | 403 |
| Company B receptionist | GET/PATCH A guest, PATCH A room, PATCH A housekeeping, capture on A booking, notify about A staff, approve A bank transfer, GET A booking payments | 404 | 200 (all) | 404 |
| Test Hotel 2 receptionist | GET Test Hotel guest / PATCH room | 404 | 200 | 404 |
| Receptionist | guests?search=( , reservations?search=* | 200 | 500 | 200 |
| Receptionist | guests?search=.* | 0 rows | all rows | 0 rows |
| Receptionist | GET guests/zzz, shifts/not-an-id | 404 JSON | 500 + cast message | 404 |
| Receptionist | PATCH reception write without CSRF cookie/header | 403 | 200 | 403 |
| Waiter | reception reads/writes | 403 | 403 | 403 |
| none / tampered JWT | any | 401 | 401 | 401 |
| Receptionist | staff list | no password/token fields | ok | ok |
| Receptionist | billing/summary | 403 | 403 | 403 |

## 5. Bugs fixed
| # | Sev | file:line (base) | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | receptionController.js:22-27 (`getCtx`) + every `company ? {company}` filter | aggregates on company, not active hotel | new `controllers/receptionScope.js` (`attachReceptionScope`): owner/admin = company hotels, others = assignments ∩ company hotels; all filters on `hotel` | api-probe, receptionScope test | 55ebe84 |
| 2 | P0 | propertyScope.js BYPASS + controllers | owners/managers bypass, foreign `?hotelId` trusted | scope rejects hotels outside the allowed set (403) | api-probe | 55ebe84 |
| 3 | P0 | receptionController updateRoomStatus/updateGuestStatus/flagGuestBlacklist/updateHousekeepingTask/capturePayment/refund/dispute/getBookingPayments/getGuestById/getShiftById/acknowledgeShift/notifyManager | `findById` without ownership | `findScoped`/scoped queries → 404 | api-probe | 55ebe84 |
| 4 | P0 | batch/export/maintenance/payment/bankTransfer controllers `getCtx` (`req.query.companyId`) | client-chosen company | same scope helper; `assertHotelAccess` = `inScope` | probes | 55ebe84 |
| 5 | P0 | DashboardContent.jsx:1164, ReportsView.jsx:407 | stored XSS via activity descriptions | `components/SafeActivityText.jsx` (keeps only `<strong>`) | flows (payload shown as text, no dialog) | 8b25ff6 |
| 6 | P0 | BillingView.jsx buildInvoiceHTML | guest name/room type written raw into same-origin print window | escape all values | flows (0 `<img>` in print window) | 8b25ff6 |
| 7 | P1 | exportController.js convertToCSV | CSV formula injection | prefix `'` on `= + - @ \t \r` | probe2 | 55ebe84 |
| 8 | P1 | receptionController search (`$regex: search`) ×8, maintenanceController | unescaped regex → 500 / ReDoS | `searchRegex` (escaped, 100-char cap) | api-probe | 55ebe84 |
| 9 | P1 | performCheckIn / preventDoubleCheckIn order | cancelled/future/cleaning-room bookings checked in; middleware flipped room to occupied first | `validateCheckIn` before `preventDoubleCheckIn` | api-probe, test | 55ebe84 |
| 10 | P1 | performCheckOut | Pending/No-Show could be checked out | only `Checked-In` | api-probe | 55ebe84 |
| 11 | P1 | updateRoomStatus | any status, occupied → available | enum + 409 when a guest is checked in | api-probe | 55ebe84 |
| 12 | P1 | updateHousekeepingTask | clean didn't free the room; any status/assignee | enum, assignee must be hotel staff, cleaning → available when no guest in-house | probe2 | 55ebe84 |
| 13 | P1 | todayRange / month starts | server-local day boundaries | hotel timezone (company `settings.timezone`, default Asia/Kathmandu) | unit assertion in test | 55ebe84 |
| 14 | P1 | receptionRoutes `/reports/overview` | receptionist 403 on own sidebar view | allow receptionist (operational counts only) | browser (no 403) | 55ebe84 |
| 15 | P1 | receptionRoutes | cookie-auth writes without CSRF | `csrfProtection` on the reception router | api-probe | 55ebe84 |
| 16 | P2 | getReportsOverview `previous`, summary pending/available trend, RoomsView rating/bed defaults | fabricated values | real yesterday occupancy / null / hidden | api-probe, screenshots | 55ebe84, 8b25ff6, 630d3eb |
| 17 | P2 | BulkCheckInModal.jsx:93, ActionModals.jsx:1548 | wrong URLs (`/batch/checkin`, `/api/bookings`) | `/batch/check-in`, `/api/v1/bookings/hotel/:id` | code + route table | 8b25ff6 |
| 18 | P2 | getInvoices/getShiftHistory/getActivityLog limits; maintenance `updateOverdueTasks(null)` | uncapped limits; null hotel updated every hotel | clamped; scoped | code + probe | 55ebe84 |
| 19 | P2 | sendGuestCommunication html | unescaped body in email HTML; no length limits | escaped, 200/5000 caps | code read (SMTP not configured → send BLOCKED) | 55ebe84 |
| 20 | P3 | MobileBottomNav.jsx, ReceptionDashboard.css, view CSS | 8 tabs at 9 px, overflow, 14 px inputs, FAB over nav | 4 tabs + More sheet, ReceptionMobile.css layer | browse after2, flows | 8b25ff6 |

## 6. UX/visual changes
| View | Before | After | Screenshots |
|---|---|---|---|
| Bottom nav | 8 tabs, 9 px labels, 5 views unreachable | Home/Bookings/Check-In/Rooms/More, 12 px, active bar + `aria-current`, More = 3-col sheet (Esc/backdrop close, focus return) | before/dashboard-390, flows-more-sheet-390-dark |
| Dashboard | columns 454 px wide at 390, `65540` without currency | fits, `Rs. 65,540`, quick actions scroll in-row | before/ vs after2/dashboard-390x844 |
| Bookings / Check-in | cards overflowed (minmax 320/340 px), UUID ids wrapped 3 lines | `minmax(min(…,100%))`, ids truncate with title | after2/bookings-360, flows-checkin-390-dark |
| Rooms | badge clipped, ₹, fake Queen/4.0 | badge wraps, Rs., filters 2-up, untracked fields hidden | after1 vs after2/rooms-360x740 |
| Billing / bank transfer | 14 px inputs, small buttons, "Rs " | 44 px buttons, 16 px inputs, `Rs. 1,234.50`, sheet modal with sticky actions on phones | after2/billing-* |

Token mapping (ReceptionDashboard.css `:root`, for 01 to consolidate): `--sh-s1..s8` = `--ha-s1..s8`; `--sh-radius-sm/md/lg` 8/12/16 = `--ha-radius-*`; type scale `--sh-fs-12…30`; `--sh-btn-h` 36 / `--sh-btn-h-touch` 44; status `--sh-status-pending #d97706` (≈ `--ha-warning`), `-confirmed #2563eb` (`--ha-info`), `-active #4f46e5`, `-ready #059669` (`--ha-success`), `-done #0f766e`, `-cancelled #dc2626` (`--ha-danger`); focus ring `--sh-focus-ring`. Existing `--bg-*`/`--text-*`/`--accent-*` kept (renaming them would rewrite every view).

## 7. REQs (`requests\reception.md`)
REQ-reception-1 (P1, guest.schema guestId collides across companies), -2 (P2, company email regex rejects 4-letter TLDs), -3 (P2, shared messaging FAB over bottom navs; local workaround in place), -4 (P3, BillPreviewModal print title). Note to 08: StaffLogin inputs 14 px / autocomplete. All open. Read `requests\hoteladmin.md`: no REQ targets reception files; per its role decision, `hoteladmin` was added to the reception reads the hotel-admin console uses (reports/overview, billing/summary, billing/invoices, guests, revenue-split), scoped to its assigned hotels.

## 8. Decisions
- Owner/admin = every hotel of their company; managers stay assignment-scoped (prompt: "manager (Test Hotel only)").
- Foreign or malformed `hotelId` → 403; foreign resource ids → 404 (no existence oracle).
- Receptionists may read `reports/overview` (no revenue in it) because the view is in their sidebar; billing summary/exports stay manager+.
- Housekeeping "clean" frees a room only from `cleaning` and only if nobody is checked in.
- New mobile CSS lives in `ReceptionMobile.css` with `.reception-dashboard` prefixes to avoid rewriting each view stylesheet.

## 9. Remaining
- P1 Check-out does not settle the bill (room nights + orders + VAT − deposit) or create an invoice; `performCheckOut` only flips statuses. Express checkout lives in `/api/v1/bookings/check-out/express` (08). Needs a product decision on which flow is canonical.
- P1 Booking create/edit/cancel/no-show and walk-in availability races are on `/api/v1/bookings/*` (08) — not retested here.
- P2 Guest PII (phone/email) shown unmasked in lists; ID-document capture not present in the check-in UI.
- P2 Realtime socket events and production rate limits (429 UI) not exercised; WebKit/iPhone and 375/412/844×390 viewports not run in the final sweep.
- P2 `BankTransferReview` has no proof image/PDF viewer (transactions carry only a reference), so "view proof"/upload-safety checks are BLOCKED.
- P3 Remaining sub-44 px inline links on phones; occupancy trend is "% change of %" (`+52%`), consider percentage points.
- `.gitignore` ignores `backend/scripts/` (any new script there is untracked).

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/reception.md`. Nothing was re-run.

### A. Counted FAILs

| Check | Reason | Status |
|---|---|---|
| Section 2 feature table: every area shows Fail = 0 | No feature check failed in the final run | none to list |
| `api-probe.mjs` 53/53 pass, `api-probe2.mjs` 11/11, UI `flows.mjs` 9/9 | No failure in the final run. The baseline was 20/52 on `api-probe.mjs`; those baseline failures are the "Before" column of section 4 and bugs 1-15 in section 5 (all fixed in 55ebe84 / 8b25ff6 / 630d3eb) | fixed |
| `backend npm test` 132/134 (2 fail) | `bookingIntegrity.integration.test.js`, "companyless staff cannot read another booking" (Company model not registered in that test) plus its parent test; same 2 as baseline 131/133 | pre-existing in baseline 67759ec; not a reception file. Platform report records the later fix (`import "../models/company.schema.js"` in `bookingController.js:5`, commit 1b696df) |
| Backend eslint on touched controllers: 2 errors | `backend/controllers/batchController.js:560` unused `reason`; `backend/controllers/exportController.js:480` unused `rooms` | pre-existing in baseline 67759ec; none new |

### B. BLOCKED / not run (Blocked column plus statements elsewhere in the report)

| Area | Check | Reason (type) |
|---|---|---|
| Realtime (Blocked 1) | Socket new-order / request events | Environment/harness limit: no second actor creating orders in the harness |
| Rate limit, `NODE_ENV=production` (Blocked 1) | 429 behaviour and UI | reason not recorded by the session beyond "not run" (the API ran with `NODE_ENV=development`) - needs re-run. Other sessions found production mode refuses to start without HTTPS `CLIENT_URL` origins (kitchen, public reports); that is not stated here, so it is not assumed |
| Bank transfer | Proof upload / "view proof" / upload safety | Not present in this flow: transactions carry only a reference, `BankTransferReview` has no proof viewer. Note: the Bank transfer row shows Blocked = 0 but its notes say BLOCKED, so the table count is under-reported by 1 |
| Communications (bug 19) | Sending guest e-mail (`sendGuestCommunication`) | Environment limit: SMTP not configured; verified by code read only |
| Mobile, iPhone/WebKit | WebKit runs | Environment limit: WebKit not available (bundled browser download blocked by the TLS proxy) |
| Mobile, final sweep | 375, 412 and 844x390 viewports | Time and WebKit download (stated as BLOCKED in section 3) |
| Mobile screenshots | Some final screenshots timed out | Harness timeout under machine load; the checks themselves still ran |
| Billing | `BillPreviewModal` (shared) | Code read only (body React-escaped; title is REQ-reception-4, done in 5c05776) |
| Bookings list | Create / edit / cancel / no-show | Not retested here: these go through `/api/v1/bookings/*`, owned by session 08 |

### C. Known defects named in the report but not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| Check-out does not settle the bill or create an invoice | `performCheckOut` only flips statuses (P1). Express checkout lives in `/api/v1/bookings/check-out/express` (08). Product decision on the canonical flow needed | open (section 9) |
| Booking create/edit/cancel/no-show and walk-in availability races | `/api/v1/bookings/*` (08), not retested | open |
| Guest PII (phone/email) unmasked in lists; no ID-document capture in the check-in UI | Not implemented | open |
| Sub-44 px targets on phones: 4-12 per view (baseline 15-37) | Mostly inline text links and badges | open (P3) |
| Messaging FAB over bottom navs | `frontend/src/shared/components/MessagingPanel.css:8-11`, REQ-reception-3; local workaround in `ReceptionMobile.css` | done in 4977655 |
| `guestId` unique collision across companies | `backend/models/guest.schema.js:7, :71-75`, REQ-reception-1; seeding Company B threw E11000 | done in 078f6d7 |
| Company e-mail regex rejects 4+ letter TLDs | `backend/models/company.schema.js:55`, REQ-reception-2; "Please enter a valid email" for `company1@qa.test` | done in 078f6d7 |
| StaffLogin inputs 14 px, missing `autocomplete` | `StaffLogin.jsx:336-346, 376-386`, note for 08 | fixed by 08 (0f23262, per the public report) |
