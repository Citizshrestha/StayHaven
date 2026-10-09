# Session 02 (hoteladmin) report — wave 1

## 1. Environment
- Worktree `.worktrees/qa-hoteladmin`, branch `qa/hoteladmin` from `main@67759ec`. Commits: `0ca9e0c` (backend tenancy/validation), `649ec9b` (frontend QR/print/CSV/forms/mobile), `be65639` (submit guards, billing print escape, seed hidden in prod). Not pushed or merged.
- API 3001 (bound port confirmed in log), web 5174. DB `mongodb://127.0.0.1:27102/stayhaven_qa_hoteladmin` (mongodb-memory-server from the harness, local only). `backend/.env` created from the example with local URI + random secrets; no third-party keys.
- Seeds: `setupTestHotel.js` is not in this base commit, so the throwaway `_qa_tmp_hoteladmin.js` (deleted) created Company A (Test Hotel, Test Hotel 2), Company B (Other Hotel), and owner/admin/hoteladmin/manager/receptionist/waiter/chief/superadmin/guest principals.
- Harness: `.qa-harness/hoteladmin` (`specs/api-security.mjs`, `specs/ui.mjs`, `specs/helpers.mjs`, shots in `shots/`, matrix in `security-matrix.json`).

| Check | Baseline | Final |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings (no new) |
| `npm run build` | fails without `VITE_API_BASE_URL` (prod guard); passes with a non-local HTTPS value | passes (same env) |
| `npm run test:frontend` | 14/14 | 17/17 (+3 `hotelAdminUtils.test.mjs`) |
| `cd backend; npm test` | 131/133 (2 fail in `bookingIntegrity.integration.test.js`: "Schema hasn't been registered for model Company", 500≠403; pre-existing, not 02's files) | 132/134 (+1 `hotelAdminAccess.integration.test.js`, same 2 pre-existing failures) |

New backend test runs with `npm test` (glob `tests/*.test.js`); targeted: `node --test --test-concurrency=1 tests/hotelAdminAccess.integration.test.js`.

Blocker during the run: the machine was out of memory (≈0.4–1 GB free, 20+ node processes from parallel sessions). Playwright's bundled Chromium download failed (TLS) so system Chrome was used; WebKit was unavailable. Later browser runs hung at launch/navigation, so the QR/mobile browser suites did not complete. Those checks are marked BLOCKED below; their behaviour was verified at API level where possible.

## 2. Feature PASS/FAIL (browser = Chrome 1440 on the Vite dev server unless noted)

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| Login/Shell | 5 | 3 | 2 | 0 | Owner UI login → /hoteladmin-dashboard; all 12 sections render with no page errors / failed requests; `#garbage` → `#dashboard` with URL fixed. FAIL: hoteladmin can't log in; admin/manager redirect to 404s (REQ-1/2). Drawer a11y fixed in code, browser check BLOCKED |
| Dashboard | 2 | 1 | 0 | 1 | Renders. Seed button hidden in prod builds + API returns 403 in production and 403 for other tenants (API PASS). Company-wide aggregates → REQ-R2 |
| Rooms | 9 | 9 | 0 | 0 | Add Room with default type (browser); two clicks in one tick send one POST (browser, after fix); XSS name renders as text, no dialog (browser); API: validation, duplicates (trim/case), mass-assignment ignored, status occupied/reserved rejected, no manual status change with a checked-in guest, delete blocked with checked-in booking, `/rooms/abc` 404 without stack |
| Restaurant-Menu | 6 | 5 | 0 | 1 | API: price 0 create + edit, name >100 / prep 4 / prep 121 → 400, `_id`/`hotel` mass-assign ignored, tenancy 403. Browser menu checks BLOCKED (machine) |
| Restaurant-Tables/Kitchen | 2 | 1 | 0 | 1 | Tables tab now reuses TableManagement (same fixes). Kitchen "Go to Orders" wired (`onNavigate`), browser check BLOCKED |
| Table QR | 10 | 9 | 0 | 1 | Real QR images render (screenshot `shots/1440-light-tables.png`). API: regenerate=true issues a new token, old token rejected by `/guest/table/:token`, new works, deactivate blocks guest; create defaults/status persisted; capacity 0/51/2.5, minSpend -100, description 301, bad status → 400; " z9 " → `Z9`, "02" → 2; duplicate inline; batch 0/51/start 0/-5/range 51 → 400; rerun batch reports 0 created / 5 skipped. PNG decode + print popup BLOCKED |
| Room QR | 4 | 3 | 0 | 1 | API: tenancy 403, roles, batch only processes rooms without a QR and reports skipped. Print All browser check BLOCKED |
| Orders | 3 | 1 | 2 | 0 | Renders. FAIL (01 files): admin 403 on GET /staff/orders (REQ-4); `search=(` → 500 (REQ-5). Realtime not tested |
| Stock | 1 | 1 | 0 | 0 | Renders (mock). Backend not built (not approved) |
| Staff | 2 | 2 | 0 | 0 | Renders; GET /staff/manage/A 200 for owner/admin/manager, receptionist 403 |
| Billing | 2 | 1 | 0 | 1 | Renders. Print values now HTML-escaped. Real-data wiring Remaining (needs REQ-R2 scoping) |
| Loyalty | 1 | 1 | 0 | 0 | Renders. Scoping → REQ-R2 |
| Reports | 2 | 2 | 0 | 0 | Renders; overview/billing summary 200 for owner/admin/manager |
| Notifications | 1 | 1 | 0 | 0 | Renders |

## 3. Mobile matrix
BLOCKED. The `specs/ui.mjs mobile` suite (360/375/390/412/768/1024/1440/844×390 × 12 sections: overflow walk, tap targets, 16px inputs, drawer focus/Esc/inert, bottom-sheet modal, keyboard-safe submit, dark mode) is written but could not run: Chrome hung at launch/navigation under memory pressure. Fixes made in code (unverified in browser): stacked card tables below 640px (Rooms, Tables), bottom-sheet modals ≤480px with sticky full-width footer and safe-area padding, `100dvh` with `100vh` fallback, 16px inputs on phones/touch, 44px touch controls (`pointer: coarse`), scrollable filter chips, drawer focus trap + Esc + `inert` + focus restore, theme toggle kept in the collapsed rail. Screenshots exist for 1440 light/dark × 12 sections in `.qa-harness/hoteladmin/shots/`. Re-run: `node specs/ui.mjs mobile` (and `qr`) once memory allows.

## 4. Security matrix (API, 145/150 PASS; full rows in `.qa-harness/hoteladmin/security-matrix.json`)

| Actor | Call | Expected | Actual |
|---|---|---|---|
| Anonymous / tampered JWT | GET /rooms, /tables | 401 | 401 |
| Owner B | GET/PUT/DELETE rooms, toggle/generate QR, qr-codes, POST room in A | 403 | 403 |
| Owner B | GET/PUT/DELETE tables, generate-qr, qr-download | 403 | 403 |
| Owner B | GET/PUT/DELETE menu, bulk-toggle on A | 403 | 403 |
| Owner B | POST /seed/hotel-admin-data/A?clear=true, DELETE /seed/rooms/A | 403 | 403 |
| Manager B / Owner A | cross-company rooms/tables | 403 | 403 |
| Manager (Test Hotel only) | rooms/tables/menu of Test Hotel 2 | 403 | 403 |
| Owner A | Test Hotel 2 (same company) | 200 | 200 |
| Guest / superadmin | GET /tables, /rooms, qr-download | 401/403 | 403 |
| Waiter / receptionist | list rooms/tables | 200, QR fields stripped | 200, stripped |
| Waiter | POST room, PUT table, generate QR, POST menu, seed | 403 | 403 |
| Waiter / chief | PATCH table status | 200 / 403 | 200 / 403 |
| owner, admin, manager | full rooms/tables/menu CRUD, staff manage, reception overview/billing | 200/201 | 200/201 (manager table delete 403 by design) |
| Owner A | PUT room {rating, hotel, company, uniqueToken} | ignored | ignored |
| Owner A | invalid ObjectIds (rooms/tables/menu/hotelId) | 404, no stack | 404 |
| hoteladmin | POST /staff/login | 200 | **403** (REQ-1) |
| admin / manager | login redirectPath | /hoteladmin-dashboard | **/dashboard, /manager-dashboard** (REQ-1) |
| admin | GET /staff/orders | 200 | **403** (REQ-4) |
| Owner A | GET /staff/orders?search=( | 200 | **500** (REQ-5) |
Not run: rate limits in production mode, socket room isolation, CSRF-less mutations, token-expiry refresh (blocked by time and machine load).

## 5. Bugs fixed

| # | Sev | file:line (after fix) | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | backend/controllers/hotelAdminAccess.js:30-60 (used by room/table/menu controllers, seedRoutes) | `assertHotelAccess` skipped the company check for `owner` and for a null company; manager/hoteladmin not property-scoped | One helper: owner = same company or hotel.owner; other roles = same company AND assigned property; superadmin/guest 403; optional role list | security matrix; hotelAdminAccess.integration.test.js | 0ca9e0c |
| 2 | P0 | hotelTableController.js getTables/getTableById | GET /tables had no access check (QR tokens readable by any token) | Access check + QR secrets stripped for non-admin roles; same for rooms | matrix (Owner B 403, waiter list stripped) | 0ca9e0c |
| 3 | P0 | backend/routes/seedRoutes.js:40-75 | `?clear=true` on any hotel, no prod block; all-rooms/featured seed open to owners | `blockInProduction` + `requireHotelAdminOf`; platform-wide seeds superadmin-only; button hidden in prod builds | matrix (Owner B 403) | 0ca9e0c, be65639 |
| 4 | P0 | roomController.js validateRoomInput / create / update | Mass assignment (`rating`, `lastCleaned`), no validation, manual occupied/available | Whitelist + validation (price 0–10M 2dp, floor 0–200, guests 1–20, lengths, enum type), case-insensitive duplicates, booking-driven statuses locked, checked-in guard, open room-service orders block delete | matrix + integration test | 0ca9e0c |
| 5 | P0 | utils/html.js, utils/qr.js, BillingManagement.jsx print | `document.write` with unescaped names/URLs (Table QR, Room QR, Billing) | `escapeHtml` + `safeImageSrc`; one `printQrSheet` (A4, grid) | unit test | 649ec9b, be65639 |
| 6 | P0 | hotel-admin/utils/csv.js `neutralizeCell` | CSV formula injection | Prefix `'` for text starting `= + - @ \t \r`; numbers untouched | unit test | 649ec9b |
| 7 | P1 | RoomManagement.jsx ROOM_TYPES | UI default `Standard` not in schema enum → Add Room 400 | Types = schema enum with labels | browser (Add Room default) | 649ec9b |
| 8 | P1 | TableManagement.jsx, RestaurantManagement.jsx | QR image source was `qrCodeData` (URL) | Use `qrCodeImage`; data-URL → Blob download | screenshot | 649ec9b |
| 9 | P1 | roomController/hotelTableController generate-qr, RoomQR/Table pages | Regenerate sent `false`; no table QR toggle | Confirmed regenerate sends `true`, server requires `=== true`; Activate/Deactivate table QR | matrix (old token rejected) | 0ca9e0c, 649ec9b |
| 10 | P1 | hotelTableController validateTableInput / batch | Capacity/minSpend coerced, status ignored on create, batch false success, off-by-one 51 | Validation parity, status persisted, upper-cased numbers, created/skipped reporting, 50 max | matrix + integration test | 0ca9e0c |
| 11 | P1 | menuController validateMenuPayload, getMenuItems | Unscoped reads; no name cap; prep time not clearable | Tenancy on read/write; name ≤100, price ≤1M 2dp, prep 5–120 or cleared | matrix + integration test | 0ca9e0c |
| 12 | P1 | RestaurantManagement.jsx edit form | `price || ''` blanked price 0 on edit | `??` | API (price 0 edit 200) | 649ec9b |
| 13 | P1 | HoteladminDashboard.jsx | Kitchen "Go to Orders" had no `onNavigate`; inline `onCount` caused refetch flashes | Pass `handleNavigation`; stable setters | code + build | 649ec9b |
| 14 | P2 | Room/Table/Menu forms | Double submit (two POSTs in one tick) | Ref-based in-flight guard + `busy` modal | browser (1 POST) | be65639 |
| 15 | P2 | Room/Table/Menu/RoomQR pages | Errors as toasts only, no ErrorState, filtered-empty = empty | Inline field errors from server `errors`, form alert, ErrorState+Retry, "No results" + Clear filters, page reset on filter change, natural sort | browser (sections) | 649ec9b |
| 16 | P2 | components/ui/Modal.jsx | Body scroll lock race with stacked modals; Esc/backdrop closed mid-save | Ref-counted lock, `busy`, initial focus on first field | browser (scroll restored) | 649ec9b |
| 17 | P3 | components/ui/ConfirmModal.jsx | Shared ConfirmDialog has no dialog role/Esc/focus trap | Hotel-admin ConfirmModal (`alertdialog`, focus on Cancel) used by all 7 pages | code + build | 649ec9b |
| 18 | P3 | Sidebar.jsx, HoteladminDashboard.jsx | NavItem declared in render (focus loss), no drawer focus trap/Esc/inert, theme toggle hidden in rail | Moved NavItem out; trap/Esc/inert/restore; toggle always shown | code + build (browser BLOCKED) | 649ec9b |
| 19 | P3 | RoomQRManagement.jsx | `room.floor && …` printed stray `0`; no Inactive filter; hotel name missing in print | Explicit null checks, Inactive chip, name from active property | code + build | 649ec9b |

## 6. UX/visual changes (screenshots: 1440 light/dark per section in `shots/`; 375 BLOCKED)
- Rooms modal grouped (Identity / Pricing & capacity / Status / Description); view mode is a read-only definition list with Edit; "Cleanliness" column removed (not tracked).
- Table/Room QR: white quiet-zone card, Active/Inactive badge, alt text, Copy link, confirm on regenerate.
- Menu: dropzone with Choose/Replace/Remove, type/size checks (jpg/png/webp ≤5 MB), 4:3 lazy images, skeleton cards.
- Final reference token set (`styles/hotel-admin-tokens.css`): spacing `--ha-s1..s10` (4/8 pt); radii 8/12/16; one shadow scale; type `--ha-fs-xs..2xl` = 12/14/16/20/24/30; `--ha-control-h` 36 → 44 on `pointer: coarse`; layers `--ha-z-sticky 40 / drawer 60 / overlay 1000 / modal 1010 / toast 10000`; `--ha-primary-strong` for filled buttons with white text; status text colours `--ha-{success,warning,danger,info,neutral,accent}-text` (≥4.5:1 on tints) with vivid dots. Status mapping (`statusTone.js`): pending/unpaid amber, confirmed/occupied/reserved blue, preparing indigo, ready/paid/available green, delivered/served/completed neutral, cancelled/failed red. Button `loading` (spinner + disabled + aria-busy). Field `hint` and `counter`.

## 7. REQs filed
`requests/hoteladmin.md` (to 01): REQ-1 hoteladmin login + admin/manager redirect; REQ-2 route guard/ProtectedStaffRoute roles; REQ-3 add `hoteladmin` to staffRoutes authorize lists; REQ-4 orderController tenancy + admin 403; REQ-5 order search regex escape; REQ-6 logout revokes session; REQ-7 multer errors → 400; REQ-8 info; REQ-9 BillPreviewModal. `requests/hoteladmin-to-reception.md` (to 03): R1 hoteladmin on reception report routes; R2 property-scoped aggregates; R3 fabricated report values. All `status: open`.

## 8. Decisions
- `admin` = company-scoped hotel admin (same rules as hoteladmin); superadmin excluded from hotel operational data.
- Table delete: owner/hoteladmin/admin only (manager can't; Delete button hidden for manager).
- Table status quick-change allowed for waiter/receptionist (front-of-house seating); chief 403.
- QR tokens/images returned only to hotel-admin roles; other staff get lists without them.
- Room `occupied`/`reserved` are booking-driven: rejected on create/update, shown read-only.
- Seeding disabled when `NODE_ENV=production` and hidden in prod builds.
- Services already used `core/api/client.js` (`createApiClient`, staff scope, 401 refresh) in this base; no switch needed.

## 9. Remaining (by severity)
- High: REQ-1/2/3/4/5 (01) and R1/R2 (03) — hoteladmin role lockout, admin orders 403, order search 500, company-wide aggregates.
- High: Billing still shows preview/mock in dev and a "not available" state in prod (`BillingManagement.jsx`). Wire to `/reception/billing/invoices` + `/summary` once R2 scopes them.
- High: Stock is an in-memory mock (`services/stockApi.js`); needs an InventoryItem model + property-scoped API (not approved).
- Medium: Orders realtime (socket subscribe), detail-modal staleness, 100-row cap: not changed this wave.
- Medium: logout session revocation (REQ-6), multer 400s (REQ-7).
- Medium: mobile, QR download/print and drawer checks need a browser re-run (`node specs/ui.mjs qr`, `node specs/ui.mjs mobile`) on a machine with free memory; WebKit not tested.
- Low: toasts at top-right (App.jsx offset) can cover page header actions; the harness had to dismiss them before clicking. Suggest top-center on phones (01).

## Failures and blocked checks (detail)

Added by the report audit. Every item below is taken from this report's own tables and from `requests/hoteladmin.md` and `requests/hoteladmin-to-reception.md`. Nothing was re-run. "Current REQ status" is the status line in the matching requests file now; it is not something this session observed.

### A. Counted FAILs (section 2 feature table: Login/Shell 2, Orders 2; section 4: security matrix 145/150 = 5 not passing)

| # | Counted in | Check | Reason (observed) | Where | REQ | Current REQ status |
|---|---|---|---|---|---|---|
| 1 | Login/Shell fail, security matrix | `POST /staff/login` as `hoteladmin` (hadmin@qa.test), expected 200 | 403 "Access denied. Staff account required." | `backend/controllers/staffController.js:162-173` (`allowedRoles`) | REQ-hoteladmin-1 | done in 2e4e442 |
| 2 | Login/Shell fail, security matrix | `admin` login `redirectPath`, expected `/hoteladmin-dashboard` | `/dashboard` (route does not exist, 404) | `staffController.js:252-274` (redirect switch) | REQ-hoteladmin-1, -2 | done in 2e4e442 |
| 3 | Login/Shell fail, security matrix | `manager` login `redirectPath`, expected `/hoteladmin-dashboard` | `/manager-dashboard` (route does not exist, 404); `ProtectedStaffRoute` also sent manager to `/reception-dashboard` | `staffController.js:252-274`, `frontend/src/core/routes/ProtectedStaffRoute.jsx:27-28` | REQ-hoteladmin-1, -2 | done in 2e4e442 |
| 4 | Orders fail, security matrix | `admin` `GET /staff/orders`, expected 200 | 403 (admin treated as superadmin) | `backend/controllers/orderController.js:34-60` (`assertHotelAccess`) | REQ-hoteladmin-4 | done in 4bbfa80 |
| 5 | Orders fail, security matrix | Owner A `GET /staff/orders?search=(`, expected 200 | 500 (unescaped `$regex`) | `orderController.js:368-374` | REQ-hoteladmin-5 | done in 4bbfa80 |

Mapping note: the feature table counts 2 Login/Shell fails (hoteladmin login; admin/manager redirects together) and the security matrix lists 5 rows marked bold. Rows 1-5 above are those 5 rows, with the admin and manager redirects counted separately. The session did not record assertion-level ids, so the exact split between the two tables is an inference from the bold rows. The row-by-row source is `.qa-harness/hoteladmin/security-matrix.json`, which was not read for this audit.

### B. Baseline failures that remain in the "Final" test column

| Check | Reason | Status |
|---|---|---|
| `cd backend; npm test` 132/134 (2 fail) | `bookingIntegrity.integration.test.js`, "companyless staff cannot read another booking": `Schema hasn't been registered for model "Company"`, 500 instead of 403. Same 2 in baseline 131/133 | pre-existing in baseline 67759ec; not in 02's files. Platform report records the later fix (`import "../models/company.schema.js"` in `bookingController.js:5`, commit 1b696df, tests pass at 4333eec) |
| `npm run build` baseline "fails without `VITE_API_BASE_URL`" | Production guard in the build config, by design | not a defect; passes with a non-local HTTPS `VITE_API_BASE_URL` |

### C. BLOCKED checks (section 2 "Blocked" column and section 3)

Common reason: environment limit. The machine was out of memory (about 0.4-1 GB free, 20+ node processes from parallel sessions), Chrome hung at launch/navigation, Playwright's bundled Chromium download failed on TLS (system Chrome used), and WebKit was unavailable. Behaviour was verified at API level where the report says so.

| Area | Blocked check | Reason | Evidence of partial coverage |
|---|---|---|---|
| Login/Shell | Drawer a11y (focus trap / Esc / inert) in a browser | Out of memory; Chrome hung | Fixed in code, build only (bug 18) |
| Dashboard (1 blocked) | The blocked check is not named in the report's Dashboard row | reason not recorded by the session - needs re-run (environment limit applies) | Seed button hidden in prod builds is stated as API-level PASS (403 in production and for other tenants) |
| Restaurant-Menu | Browser menu checks | Out of memory; Chrome hung | API checks pass (price 0, name >100, prep 4/121, mass-assign, tenancy) |
| Restaurant-Tables/Kitchen | Kitchen "Go to Orders" browser check | Out of memory; Chrome hung | Wired via `onNavigate`; build only (bug 13) |
| Table QR | PNG decode and print popup | Out of memory; Chrome hung | API checks pass (regenerate, deactivate, validation) |
| Room QR | Print All browser check | Out of memory; Chrome hung | API: tenancy 403, roles, batch skipped reporting |
| Billing | Real-data wiring (`/reception/billing/invoices` + `/summary`) | Needed company-wide aggregates scoped first (REQ-hoteladmin-R2) | R2 now done in 55ebe84 on qa/reception; the Billing page still shows preview/mock in dev and "not available" in prod |
| Section 3 Mobile matrix (all of it) | Suite `specs/ui.mjs mobile`: 360/375/390/412/768/1024/1440/844x390 x 12 sections (overflow, tap targets, 16px inputs, drawer, bottom sheet, keyboard-safe submit, dark mode) | Written but never completed: Chrome hung at launch/navigation under memory pressure | Fixes are in code and unverified in a browser; only 1440 light/dark screenshots exist |
| Section 3 QR browser suite | `node specs/ui.mjs qr` | Same | Re-run command is in section 9 |
| Browsers | WebKit / iPhone | WebKit unavailable (Playwright download failed on TLS) | none |

### D. Not run / not tested (listed in the report but not counted anywhere)

| Item | Reason |
|---|---|
| Rate limits in production mode | Not run: time and machine load |
| Socket room isolation | Not run: time and machine load |
| CSRF-less mutations | Not run: time and machine load |
| Token-expiry refresh | Not run: time and machine load |
| Orders realtime (socket subscribe), detail-modal staleness, 100-row cap | Not tested / not changed this wave (section 9) |
| Stock page backend | The page is an in-memory mock (`services/stockApi.js`); no InventoryItem model, not approved. Only "renders" was checked |

### E. Other open defects named in the report that are not counted as FAIL

| Item | Reason | Where |
|---|---|---|
| Dashboard/Reports/Loyalty aggregates company-wide | Two hotels of one company see each other's numbers | `receptionController.js:22-27, :1318, :1427, :929`, REQ-hoteladmin-R2, done in 55ebe84 on qa/reception |
| `hoteladmin` on reception report routes | `authorize` lists excluded the role | `receptionRoutes.js:319,405,710`, REQ-hoteladmin-R1, done in 55ebe84 on qa/reception |
| Reports return fabricated values | previous occupancy = current-6, trend "up", noShow 0, lateCheckout 0 | `receptionController.js:1471,1480`, REQ-hoteladmin-R3, done in 55ebe84 |
| Multer errors returned 500 | File too large / wrong MIME | `backend/middleware/upload.js`, REQ-hoteladmin-7, done in 50a0072 |
| Toasts at top-right can cover header actions | Harness had to dismiss them before clicking | `App.jsx` offset; suggested for 01. Platform report: toasts moved to top-center on phones in b97ed58, not re-verified in a browser |
