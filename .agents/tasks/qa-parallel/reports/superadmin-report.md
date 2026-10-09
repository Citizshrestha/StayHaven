# Session 06 (superadmin) report

Branch `qa/superadmin` in `.worktrees/qa-superadmin`, created from `qa/platform` @ `b97ed58` (wave-2 override). 3 commits, unpushed and unmerged:
`aef974b` backend, `323be61` frontend, `6d36770` config CSS. The harness is `.qa-harness/superadmin/` (probes, `browser-run.mjs`, screenshots in `shots/`, JSON results).

## 1. Environment

| Item | Value |
|---|---|
| API / web | 3005 (confirmed in the log) / 5178 (`vite preview` of a build with `VITE_API_BASE_URL=http://localhost:3005`) |
| DB | `mongodb-memory-server` replica set on 127.0.0.1:27106, DB `stayhaven_qa_superadmin` (local, throwaway). A single-node `MongoMemoryServer` timed out, so I used the replica-set helper the waiter session used |
| Fixtures | Throwaway seed (now deleted): 2 superadmins; Company A (owner, admin, hoteladmin, manager, receptionist, waiter, chief; hotels approved / pending / rejected); Company B (owner, admin; approved and suspended hotels); guests; 5 paid, checked-out bookings with paisa amounts (Rs. 3,390.50, 1,130.25 …); payment transactions (one failed); a refund; reviews (approved/featured, pending with `<img onerror>`/`<script>`/`<svg onload>` payloads, flagged) |
| Login path | Superadmin signs in through `/staff/login` → `POST /api/v1/staff/login` → `redirectPath: /superadmindashboard`. `/api/v1/auth/login` also accepts it (shared User identity, see the platform report) |
| Browser | System Chrome via the Playwright 1.49.1 library (the bundled chromium and the test runner don't work in this sandbox). WebKit was not run: BLOCKED (env) |
| Env | `backend/.env` from `.env.example`, random 48-char JWT secrets, no third-party keys |

| Check | Baseline (qa/platform b97ed58) | Final (6d36770) |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings |
| `npm run build` | pass | pass |
| `npm run test:frontend` | 17/17 | 17/17 |
| `backend npm test` | 135/137 | 136/138 |

The same 2 backend failures appear before and after (`bookingIntegrity` "companyless staff cannot read another booking" returns 500, in 08's booking routes). The +1 is the new `tests/superadmin.integration.test.js`, which passes. The glob picks it up; a focused script is REQ-superadmin-6.

`package-lock.json` (root) shows as modified in the worktree after `npm run install:all`. I did not commit it.

## 2. Feature PASS/FAIL

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| API probe (`api-probe.mjs`): authN, authZ for 11 roles × 42 endpoints, input, exposure, mass assignment, escalation, finance, reviews, content, audit | 588 | 583 | 5 | 0 | Baseline was 519/587. All 5 remaining fails are REQ-superadmin-1/2 (hotel approve/feature routes, owned by 08) |
| Production mode (`prod-probe.mjs`) | 6 | 6 | 0 | 0 | No stack traces; superadmin login brute force → 423 after 6 tries |
| Regression test (`superadmin.integration.test.js`) | 1 suite | 1 | 0 | 0 | |
| Browser flows (`browser-run.mjs flows`) | 39 | 39 | 0 | 0 | Drawer, review reject dialog + XSS, payout confirm flow, server-message errors, 403 render, role tamper |
| Browser mobile matrix (7 pages × 9 viewports × light/dark) | 162 | 161 | 1 | 0 | The 1 fail is a harness screenshot timeout at 1440 light. The 1440 dark run and the 1440 light overflow checks passed |
| Dashboard KPIs = DB aggregates | 2 | 2 | 0 | 0 | Revenue and commission equal Finance gross/commission (exact paisa, configured rate) |
| Hotel suspend/reactivate, rejection reason, effect on the public site | – | – | – | 4 | BLOCKED (REQ-superadmin-2/3): the controller only accepts approved/rejected |
| Review hide → public hotel page and rating recompute | – | – | – | 2 | Not wired: the `Review` model is only read by moderation and `/testimonials`. Hidden/rejected reviews drop out of testimonials (PASS). See Remaining |
| Email notifications | – | – | – | 1 | BLOCKED (no SMTP keys) |
| Image upload validation (CMS) | – | – | – | 1 | BLOCKED (no Cloudinary keys). URL fields are validated (PASS) |

## 3. Mobile matrix

"PASS" here means no horizontal overflow, ≥ 44 px targets (bar the items noted), and 16 px inputs. Data: `mobile-matrix.{before,after,final}.json`. Screenshots: `shots/final-<page>-<light|dark>-<375|1440>.png`.

| View | 360 | 375 | 390 | 412 | 844×390 | 768 | 1024 | 1280 | 1440 |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard | PASS* | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | PASS | PASS |
| Users | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Hotels | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Finance | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Reviews | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Content | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| System config | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

\* The "View All Bookings" text button is 42 px tall (21 px at 768/844×390), and it has no handler (see Remaining). The tab buttons measure 43.99 px (a rounding artefact).

Before the fixes, 30–41 px targets were found on the dashboard period chips, the user/hotel row icons (32 px), the view toggles (40 px), pagination (41 px) and the upload tabs. 14 px inputs were found on the users/hotels search and filters, the finance date select, the reviews filter and every System Configuration field. None remain.

There was never any horizontal overflow, including at 200% (1280 at 640 effective is covered by the 768/412 rows).

## 4. Security matrix (key rows; full list in `api-probe.final.json`)

| Actor | Call | Expected | Before | After |
|---|---|---|---|---|
| anon / tampered JWT | every superadmin endpoint (42) | 401 | 401 | 401 |
| owner, hoteladmin, manager, receptionist, waiter, chief, guest | every superadmin endpoint | 401/403 | 401/403 | 401/403 |
| **company admin (A and B)** | `GET/PATCH /users/admin/*`, `POST …/reset-password`, `GET /hotels/admin/*` | 403 | **200** (any tenant's users; could set `role: superadmin`) | 403 |
| company admin | `/superadmin/finance|reviews|system/*` | 403 | 403 (router `authorize("superadmin","admin")`; "admin" rejected by code path) | 403 (now `authorize("superadmin")`) |
| company admin | `PATCH /hotels/:id/approve`, `/featured` | 403 | 200 | **200, REQ-superadmin-1** |
| tampered sessionStorage role → superadmin (admin A) | `/usermanagement` | no data | – | 403, no users rendered |
| superadmin | `GET /superadmin/bookings` | no secrets | **password hashes, refresh/invite tokens, reset OTPs of guests** | projected fields only |
| superadmin | `POST /users/admin/:id/reset-password` | OTP not returned | OTP in `debug` (dev) | not returned |
| superadmin | `PATCH /users/admin/:id {password, company, isDeleted}` | ignored | ignored | ignored |
| superadmin | `PATCH … {role:'emperor'}` / `{companyRole}` without company / duplicate email | 400/409 | 200 / 200 / 500 | 400 / 400 / 409 |
| superadmin | change role or suspend a user | old tokens die | old access token still 200 | 401 (sessions revoked) |
| superadmin | demote/deactivate the last superadmin; edit/delete self; delete another superadmin | refused | partly | 400 / 400 / 403 |
| superadmin | `PUT /system/settings {maintenanceMode, khaltiConfig, updatedBy, _id}` | ignored | **applied** (arbitrary `$set`) | whitelist; maintenance only via its own endpoint |
| superadmin | `globalCommissionRate: 500 / "abc"`, `maintenance {enabled:"yes"}` | 400 | 200 / 500 / 200 | 400 |
| superadmin | `search=(((`, invalid ObjectIds, `page=abc` on 16 endpoints | 200/400 | 500 + stack | 200/400 |
| superadmin ×2 | double-submit create payout | 1 payout | 2 | 1 (+409) |
| superadmin | overlapping payout period | 409 | 200 | 409 |
| sa + sa2 concurrently | mark payout completed | once | twice | 200 + 409 |
| superadmin | refund requested → processed (skip approval), junk status | 400 | 200 / 500 | 400 |
| superadmin | CMS `ctaLink: //evil`, `/\evil`, `javascript:`, nested footer `href: javascript:` | 400 | 201 (`//evil`) | 400 |
| superadmin | CMS `createdBy` in body | server-owned | client value | server value |
| superadmin | CSV export | no formula cells | ok (numeric only) | `csvCell` guard added |
| anon | `/testimonials?limit=100000` | capped, no emails | ok | capped at 50 |
| browser | stored XSS in review title/comment | text | text (React) | text; no dialogs |

## 5. Bugs fixed

| # | Sev | file:line | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | controllers/adminController.js (all handlers) | Mounted behind `authorize('admin')`; "admin" is a company role, so any company admin managed every tenant's users and hotels and could promote anyone to superadmin | `ensureSuperadmin` in each handler | api-probe, integration test | aef974b |
| 2 | P0 | routes/superadminRoutes.js:83 | `populate(['user',…])` returned full User docs (password hash, tokens, OTP) | Explicit projections | api-probe exposure, test | aef974b |
| 3 | P0 | routes/{finance,reviewModeration,systemConfig}.routes.js | `authorize("superadmin","admin")` | `authorize("superadmin")` | api-probe | aef974b |
| 4 | P0 | systemConfig.controller.js `updatePlatformSettings` | `$set: {...req.body}` (gateway config, maintenance, `updatedBy`) | Field whitelist with type/range validation | api-probe, test | aef974b |
| 5 | P0 | finance.controller.js `createPayout`/`updatePayoutStatus` | No idempotency, no overlap check, read-then-save status | Unique index (hotel, period), overlap 409, compare-and-set status, 409 on a lost race | api-probe race, test | aef974b |
| 6 | P0 | adminController.js `updateUser`/`updateUserStatus`/`deleteUser` | Role change/suspend kept old sessions alive | `passwordChangedAt = now` + refresh token cleared | api-probe, test | aef974b |
| 7 | P1 | finance/superadmin controllers | 15% hard-coded everywhere; configured rate ignored; floats rounded to rupees (Rs. 10,170.50 → 10,171) | `services/platformFinance.js`: integer paisa, configured rate, 13% VAT on commission, one split for dashboard/finance/payouts/report | api-probe exact paisa, test | aef974b |
| 8 | P1 | finance.controller.js `updateRefundStatus` | Any status, any jump | Transition table + compare-and-set | api-probe, test | aef974b |
| 9 | P1 | reviewModeration.controller.js `moderateReview` | Rejection reason discarded; rejected/flagged reviews stayed featured | Reason saved as a flag; `isFeatured=false` | api-probe | aef974b |
| 10 | P1 | adminController.js `resetUserPassword` | OTP echoed in the response | Removed | api-probe, test | aef974b |
| 11 | P2 | adminController, finance, reviews, system, superadmin controllers | `new RegExp(search)`, raw ObjectIds/`parseInt` → 500 with stack | `searchRegex`/`parsePaging`, ObjectId checks, sort whitelists (sorting by `password` was an oracle) | api-probe input (33 cases) | aef974b |
| 12 | P2 | content/contentControllerFactory.js `normalizeUrl` | `//host` and `/\host` accepted; nested `href/url/image/avatar` unchecked; `createdBy` from body | Stricter URL rule, nested fields, protected fields dropped | api-probe, test | aef974b |
| 13 | P2 | systemConfig/reviewModeration `logAudit(... "singleton")` | `resourceId` is an ObjectId, so these audit rows failed validation and were silently dropped | Pass `null` (REQ-superadmin-4 for the model) | api-probe audit | aef974b |
| 14 | P2 | adminController | No audit for user/hotel admin actions | `update_user`, `suspend_user`, `activate_user`, `delete_user`, `reset_user_password`, `create_hotel` | api-probe audit | aef974b |
| 15 | P2 | reviewModeration `updateAutoFlagRules`, `toggleMaintenanceMode`, others | Unvalidated bodies (500s, wrong types stored) | Type/range validation | api-probe | aef974b |
| 16 | P1 | ReviewModeration.jsx:157 | `window.prompt` for the reason; flagged reviews had no actions; approved couldn't be hidden | `ReasonModal` (dialog, bottom sheet, focus, Esc); approve/reject on flagged; Hide on approved; in-flight guard | browser flows | 323be61 |
| 17 | P1 | Finance.jsx payout/refund actions | Double-click sent two transitions; irreversible steps had no confirmation | Row `busyId` guard; alertdialog confirm for mark-paid, refund reject, refund process; 409 → reload | browser flows (dblclick → 1 request) | 323be61 |
| 18 | P2 | SuperadminDashboard.jsx:120 | "Commission Rates" bars were hard-coded (15/12/10/8%) | Shows the real configured rate | browser | 323be61 |
| 19 | P2 | all superadmin pages' catch blocks | Toasts dropped the server message | `utils/apiError.js` | browser (mocked 500 message shown) | 323be61 |
| 20 | P3 | SuperAdminLayout.jsx/.css | Drawer: no backdrop/Esc/focus trap/scroll lock; unlabeled 24 px menu button; no `aria-current`; header wrapped at ≤ 480 | All added; sticky header, ellipsis title, 44 px buttons | browser drawer checks | 323be61 |
| 21 | P3 | DeleteConfirmModal.jsx | `role=dialog`, no focus/Esc, centered card on phones | alertdialog, focus Cancel, Esc, bottom sheet, sticky actions | browser | 323be61 |
| 22 | P3 | Finance.jsx/.css | Wide tables scrolled sideways on phones; `NRS 1234` format | Label/value cards < 640 px, right-aligned tabular numerals, `Rs. 1,234.50` | browser, `shots/f2-payouts-390.png` | 323be61 |
| 23 | P3 | Users/Hotels/Dashboard/Reviews/Config/Finance CSS | < 44 px targets, 14 px inputs, 4 stacked KPI cards on phones | 44/16 px touch rules, 2-col compact KPIs, reduced motion | mobile matrix | 323be61, 6d36770 |

## 6. UX/visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| Shell (phones/tablets) | Drawer with no backdrop; 24 px unlabeled menu icon; header wrapped | Dimmed backdrop, close button, 44 px controls, sticky one-line header | `f2-drawer-open-390.png`, `final-*-375.png` |
| Review moderation | Native `prompt()` | Reason sheet (bottom sheet on phones) with validation | `f2-reject-dialog-{390,1440}.png` |
| Finance | Sideways-scrolling tables, `NRS` | Cards with labels, `Rs.` with paisa, confirm sheet for paying out | `f2-payouts-390.png`, `f2-payout-confirm-390.png`, `final-finance-*-{375,1440}.png` |
| Users / Hotels | 4 full-width KPI cards before the list | 2-column compact KPIs | `final-users-*-375.png`, `final-hotels-*-375.png` |

The "before" matrix run (`mobile-matrix.before.json`) already included the shell fix, so there are no true before-screenshots of the old drawer.

Rules G mapping (for 01 to consolidate): `--sa-primary` #00BFA6 ↔ `--ha-primary`; card radius 12 (cards), 8 (inputs/buttons), 16 (sheets, ReasonModal); status: pending/requested/under_review = amber, processing = blue, completed/approved/processed/paid = green, failed/rejected/chargeback = red, scheduled = purple (no G equivalent; suggest blue), inactive = neutral; money `Rs.` via `superadmin/utils/format.js` (same output as hotel-admin's `rs()` plus paisa).

## 7. REQs (`requests/superadmin.md`)

| ID | Sev | Target (owner) | Status |
|---|---|---|---|
| REQ-superadmin-1 | P0 | hotelRoutes.js approve/reject/status/featured → superadmin only (08) | open |
| REQ-superadmin-2 | P1 | hotelController `updateHotelStatus`: suspend/reactivate, stored reason, audit, escaped email HTML (08) | open |
| REQ-superadmin-3 | P2 | hotel.schema `statusReason` (01) | open |
| REQ-superadmin-4 | P2 | auditLog.model `resourceId` → Mixed (01) | open (workaround in aef974b) |
| REQ-superadmin-5 | P2 | user.service.js admin calls fall back to a guest token (01) | open |
| REQ-superadmin-6 | P3 | `test:superadmin` script (01) | open |

## 8. Decisions

- I treated `adminController.js` as superadmin-owned. Its routes live in 08's files, but every handler serves only the superadmin UI. The guard is inside the handlers, so 08's route files needed no edits.
- Commission = the System Configuration global rate, and VAT = 13% of commission (the existing formula, now in one place). The Commission Rules list is not applied to calculations; wiring it in is product work.
- A payout can't overlap another non-failed payout for the same hotel. Failed payouts are retried via failed → pending, not re-created.
- The refund flow is requested/under_review → approved/rejected → processed → chargeback. The old UI already followed it; the server now enforces it.
- Platform settings: only currency, timezone, locale, date format and commission rate are editable. Maintenance mode goes through its own audited endpoint.
- A stored out-of-range commission rate (from before validation) falls back to the schema default (10%) instead of zeroing or multiplying payouts.

## 9. Remaining issues

| Sev | Issue | Where | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P0 | Company admins can approve/reject/feature any hotel | routes/hotelRoutes.js:40-48 | 08's file | REQ-superadmin-1 |
| P1 | No suspend/reactivate; rejection reason not stored; unescaped owner email | hotelController.js:433 | 08/01 | REQ-superadmin-2/3 |
| P1 | Review moderation doesn't reach public hotel pages or the hotel rating (the `Review` model is only used by moderation and testimonials) | public hotel detail / hotel.rating | New wiring across 08 and the models; product decision | Read approved `Review`s on the hotel page and recompute `hotel.rating` on moderate |
| P2 | Commission Rules engine (hotel/seasonal/promo rules) is CRUD-only; calculations use the global rate | finance.controller.js | Product decision (rule precedence) | Resolve per booking: promo > room_type > hotel > global, by priority |
| P2 | "View All Bookings" button and the top-bar search do nothing | SuperadminDashboard.jsx:328, SuperAdminLayout.jsx search | Needs a bookings page / global search (new feature) | Build a bookings list on `GET /superadmin/bookings`, or hide both |
| P2 | Unsaved-changes warning and sticky Save on System Configuration/Content forms | SystemConfiguration.jsx, ContentManagement.jsx | Not done in the time available | `beforeunload` + router blocker when dirty; sticky footer ≤ 640 px |
| P3 | Finance page has no page gutters (panels touch the sidebar and the phone edge) | Finance.css `.finance-page { padding: 0 }` | Found in the final screenshots after the servers were stopped | `padding: 1rem` (1.5rem ≥ 768) |
| P3 | `loadStripe(undefined)` page error on every page | guest/public BillingView, BookingPaymentModal | 07/08 | Guard on the key |
| P3 | WebKit (390×844 iPhone) not run | harness | Env (WebKit not installed) | Re-run `browser-run.mjs` with `webkit` |

## Cleanup

`backend/scripts/_qa_tmp_superadmin.js` is deleted. API (3005), web (5178) and mongo (27106) are stopped, and the ports are confirmed free. The worktree, branch and commits are left for review. The suggested merge order is unchanged: superadmin last, rebased onto 08. REQ-superadmin-1 needs 08's change to close the remaining P0.

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/superadmin.md`. Nothing was re-run. "Current status" is the status line now in the requests file.

### A. Counted FAILs

| Counted in | Check | Reason (observed) | Where | REQ | Current status |
|---|---|---|---|---|---|
| `api-probe.mjs` 583/588 (5 fail) | Company admin A `PATCH /api/v1/hotels/:id/approve`, expected 403 | 200 (observed: adminB approved Company A's pending hotel). `authorize('admin')` on a company-level role | `backend/routes/hotelRoutes.js:40-48` (owner 08) | REQ-superadmin-1 | done in 7388420 (all four routes `authorize('superadmin')`, tests/routePolicy.test.js) |
| same | Company admin A `PATCH /hotels/:id/featured`, expected 403 (these four are the probes named in REQ-superadmin-1 "How to verify"; the section 4 security-matrix row "company admin PATCH approve, featured" is the same failure, not an extra one) | 200 | same | REQ-superadmin-1 | done in 7388420 |
| same | Company admin B `PATCH /hotels/:id/approve` | 200 | same | REQ-superadmin-1 | done in 7388420 |
| same | Company admin B `PATCH /hotels/:id/featured` | 200 | same | REQ-superadmin-1 | done in 7388420 |
| same | The 5th failing probe line | reason not recorded by the session - needs re-run. The report says all 5 are REQ-superadmin-1/2 (hotel approve/feature routes); REQ-1 also covers `/status` and `/reject` on the same routes, and REQ-2 covers `updateHotelStatus` (`hotelController.js:433`: only approved/rejected accepted, rejection reason not stored, no audit, unescaped e-mail HTML) | `hotelRoutes.js:40-48`, `hotelController.js:433` | REQ-superadmin-1 / -2 | REQ-1 done; REQ-2 partly done in 7388420 (reason stored as `statusReason`, audit entries, escaped e-mail). Suspend / reactivate NOT done (product decision) |
| Browser mobile matrix 161/162 (1 fail) | One page x viewport x theme cell at 1440 light | Harness screenshot timeout. The 1440 dark run and the 1440 light overflow checks passed. Which of the 7 pages timed out is reason not recorded by the session - needs re-run | `mobile-matrix.final.json` | none | not re-run |
| `backend npm test` 136/138 (2 fail) | `bookingIntegrity` "companyless staff cannot read another booking" returns 500 (plus its parent test) | `Company` model not registered in that test; same 2 as baseline 135/137 on qa/platform b97ed58, in 08's booking routes | `backend/controllers/bookingController.js` | none | pre-existing in baseline 67759ec; fixed by 08 in 1b696df (platform report) |

### B. BLOCKED checks (section 2 "Blocked" column)

| Counted in | Check | Reason (type) | Current status |
|---|---|---|---|
| Hotel suspend/reactivate, rejection reason, effect on the public site (Blocked 4) | The 4 individual checks are not named in the report | `updateHotelStatus` only accepts approved/rejected (REQ-superadmin-2/3). Hotel schema had no `statusReason` field | REQ-3 done in 7388420 (`statusReason`, `statusChangedAt`). Suspend/reactivate still not implemented: needs a user decision on what happens to a suspended hotel's bookings and visibility |
| Review hide -> public hotel page and rating recompute (Blocked 2) | Hide a review and see the public page and hotel rating change | Not wired: the `Review` model is only read by moderation and `/testimonials`. Hidden/rejected reviews do drop out of testimonials (PASS) | open (P1, product decision across 08 and the models) |
| Email notifications (Blocked 1) | Hotel status e-mail | Environment limit: no SMTP keys | not verified; e-mail HTML is escaped in 7388420 |
| Image upload validation, CMS (Blocked 1) | Upload type/size checks | Environment limit: no Cloudinary keys. URL fields are validated (PASS) | not verified; magic-byte check was added by 01 (50a0072) |
| Section 1 Browser | WebKit (390x844 iPhone) | Environment limit: WebKit not installed; the bundled chromium and the test runner do not work in this sandbox (system Chrome via the Playwright library was used) | open (P3) |

### C. Items marked PASS* or listed as remaining defects, not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| "View All Bookings" button 42 px tall (21 px at 768 and 844x390) and no handler | `SuperadminDashboard.jsx:328` | open (P2): needs a bookings page or hide it |
| Top-bar search does nothing | `SuperAdminLayout.jsx` | open (P2) |
| Tab buttons measure 43.99 px | Rounding artefact, counted as PASS | none |
| Commission Rules engine is CRUD-only; calculations use the global rate | `finance.controller.js` | open (P2, product decision) |
| No unsaved-changes warning or sticky Save on System Configuration / Content forms | `SystemConfiguration.jsx`, `ContentManagement.jsx` | open (P2, time) |
| Finance page has no page gutters | `Finance.css` `.finance-page { padding: 0 }`, found after the servers were stopped | open (P3) |
| `loadStripe(undefined)` page error | `BillingView.jsx`, `BookingPaymentModal.jsx` | fixed by 07 (9200176) and 08 (0f23262) |
| `package-lock.json` (root) modified after `npm run install:all` | Not committed | none |
| Admin API calls could fall back to a guest token | `user.service.js`, REQ-superadmin-5 | done in 4e446ea; superadmin pages not re-opened in a browser after it |
| Audit rows for platform settings silently dropped | `auditLog.model.js` `resourceId` ObjectId, REQ-superadmin-4 (workaround of passing `null` in aef974b) | done in 7388420 |
