# StayHaven parallel QA + fix: common rules (every session reads this first)

Each dashboard prompt (01–08) runs in its own agent session at the same time. This file holds the rules every session
shares: isolation, file ownership, safety, the mobile standard, the UI consistency contract, the security baseline, and
the report format. Where a dashboard prompt and this file conflict, the dashboard prompt wins for its own scope.

Main repo: `d:\hotel-booking-order-management-system` (Windows, PowerShell). Frontend: `frontend\` (React 19, Vite 7,
Tailwind 4). Backend: `Backend\` (Express, Mongoose, ESM, Socket.IO). Node `^22.12.0 || >=24`.

## Session index

| # | Prompt file | Scope | Route(s) | Worktree / branch | API port | Web port | DB name |
|---|---|---|---|---|---|---|---|
| 01 | 01-platform-security.md | Shared core, backend middleware, auth, sockets, secrets | all (cross-cutting) | `.worktrees/qa-platform` / `qa/platform` | 3000 | 5173 | `stayhaven_qa_platform` |
| 02 | 02-hotel-admin.md | Hotel admin dashboard | `/hoteladmin-dashboard` | `.worktrees/qa-hoteladmin` / `qa/hoteladmin` | 3001 | 5174 | `stayhaven_qa_hoteladmin` |
| 03 | 03-reception.md | Reception dashboard | `/reception-dashboard` | `.worktrees/qa-reception` / `qa/reception` | 3002 | 5175 | `stayhaven_qa_reception` |
| 04 | 04-waiter.md | Waiter dashboard | `/waiter-dashboard` | `.worktrees/qa-waiter` / `qa/waiter` | 3003 | 5176 | `stayhaven_qa_waiter` |
| 05 | 05-kitchen.md | Kitchen (chief) dashboard | `/kitchen-dashboard` | `.worktrees/qa-kitchen` / `qa/kitchen` | 3004 | 5177 | `stayhaven_qa_kitchen` |
| 06 | 06-superadmin.md | Super admin dashboard | `/superadmindashboard` | `.worktrees/qa-superadmin` / `qa/superadmin` | 3005 | 5178 | `stayhaven_qa_superadmin` |
| 07 | 07-guest.md | Guest dashboard + guest QR access | `/guest-dashboard/*`, `/guest/table/:token`, `/guest/room/:token` | `.worktrees/qa-guest` / `qa/guest` | 3006 | 5179 | `stayhaven_qa_guest` |
| 08 | 08-public-site.md | Public site, booking, payment, auth pages (optional) | `/`, hotels, booking, payment, login/register | `.worktrees/qa-public` / `qa/public` | 3007 | 5180 | `stayhaven_qa_public` |

Start 01 first (or at the same time). It owns the shared code every other session depends on.

## A. Isolation (so parallel sessions never collide)

1. Record the base branch once: `git -C d:\hotel-booking-order-management-system rev-parse --abbrev-ref HEAD` = BASE.
2. Create your worktree from BASE (skip if it already exists):
   `git -C d:\hotel-booking-order-management-system worktree add .worktrees/<name> -b <branch> <BASE>`
   All your edits, installs, and commands happen inside `d:\hotel-booking-order-management-system\.worktrees\<name>`.
   Use absolute paths. Do not edit files in the main checkout.
3. Install: `npm run install:all` inside your worktree.
4. Env: `.env` files are not in git, so your worktree has none. Do NOT copy the real `Backend\.env`, which may point
   at a live Atlas cluster. Create `Backend\.env` in your worktree from `Backend\.env.example` with:
   `MONGODB_URI=mongodb://127.0.0.1:27017/<your DB name>`, random 48-char `JWT_SECRET` and `JWT_REFRESH_SECRET`,
   `PORT=<your API port>`, `FRONTEND_URL` and `CLIENT_URL` = `http://localhost:<your web port>`, `NODE_ENV=development`.
   Leave third-party keys (Stripe, Cloudinary, SMTP, Sentry, Google OAuth) empty or sandbox-only. Record features
   that can't run without them as BLOCKED, not FAIL.
5. MongoDB: use the local `mongod` on 127.0.0.1:27017 with your own DB name. If no local mongod exists, start one with
   a harness script using `mongodb-memory-server` from `Backend\node_modules` on port `27100 + <session #>` and point
   your URI at it.
6. Ports: start the backend with your `PORT`. Confirm the bound port in the log; the server may silently move to the
   next port when one is busy, which would collide with another session. Start the frontend from the worktree root:
   `$env:VITE_API_BASE_URL='http://localhost:<API>'; $env:VITE_SOCKET_URL='http://localhost:<API>'; npx vite --port <WEB> --strictPort`
   (check `frontend\.env.example` / `frontend\src\core\api\client.js` for whether the base URL must include `/api/v1`).
   Run both as background processes and poll `http://localhost:<API>/health` until it returns 200.
7. Browser harness: `d:\hotel-booking-order-management-system\.qa-harness\<name>\` (gitignored, inside the workspace so
   writes don't need extra approval): `npm init -y; npm i -D @playwright/test@1.49.1; npx playwright install chromium webkit`.
   There is no local mongod on this machine: start `mongodb-memory-server` from a script in this harness folder (rule 5).
   Read `reports\wave1-aborted-findings.md` for code-read findings from the first, aborted run.
   Specs, screenshots, and traces go there. Never add Playwright to the repo's package.json files.
8. Seed accounts in YOUR DB only: `cd Backend; node scripts/setupTestHotel.js` (creates "Test Hotel", owner
   `hoteladmin@test.com`, chief, waiter, and `guest@test.com`, password `Test@1234`). Extra principals go in ONE throwaway
   script `Backend\scripts\_qa_tmp_<name>.js` (delete it at the end), using the real models so passwords hash through
   the schema pre-save hook. Always create a second company "Company B" with its own hotel, owner and staff for
   cross-tenant tests. Use password `QaTest@1234` for created users. Print only emails and ids.
9. Lockout: 6 wrong passwords lock an account for 30 minutes. Use throwaway accounts for wrong-password tests.

## B. File ownership (the main conflict rule)

Each session edits ONLY the files it owns. Session 01 owns everything shared.

| Owner | Files |
|---|---|
| 01 Platform | `frontend\src\core\**`, `frontend\src\shared\**`, `frontend\src\app\**`, root and `frontend\` config files, all `package.json`/lockfiles, `Backend\server.js`, `Backend\middleware\**`, `Backend\config\**`, `Backend\utils\**`, `Backend\models\**`, `Backend\services\notificationService.js`, socket server code, `controllers\staffController.js` (login/refresh/logout), `controllers\orderController.js`, `routes\staffRoutes.js`, `routes\diningRoutes.js`, `routes\authRoutes.js`, `routes\healthRoutes.js` |
| 02 Hotel admin | `frontend\src\features\staff\hotel-admin\**`; `controllers\{roomController,hotelTableController,menuController,seedHotelAdminData,staffManagementController}.js`; `routes\{roomRoutes,tableRoutes,seedRoutes}.js` |
| 03 Reception | `frontend\src\features\staff\reception\**`; `controllers\receptionController.js` and other reception-only controllers; `routes\receptionRoutes.js`; reception-only scripts |
| 04 Waiter | `frontend\src\features\staff\waiter\**`; waiter-only controllers (e.g. waiter calls/assigned areas) |
| 05 Kitchen | `frontend\src\features\staff\kitchen\**`; kitchen-only controllers |
| 06 Super admin | `frontend\src\features\staff\superadmin\**`; `routes\{superadminRoutes,finance.routes,reviewModeration.routes,systemConfig.routes,companyRoutes,testimonials.routes}.js`, `routes\content\**`, their controllers/services, `models\{payout,commission}.model.js` |
| 07 Guest | `frontend\src\features\guest\**`, `frontend\src\features\public\auth\guest\**`; `routes\{guestRoutes,guestDashboardRoutes,feedbackRoutes,profileRoutes}.js`; `controllers\{guestDashboardController,messagingController}.js` and their guest-only services |
| 08 Public | `frontend\src\features\public\{landing,hotels,payment}\**`, `frontend\src\features\public\auth\staff\**`; `routes\{hotelRoutes,bookingRoutes,publicBookingRoutes,walletPaymentRoutes,webhookRoutes,userRoutes}.js`, their controllers, `services\paymentGatewayService.js` |

- A file not listed above: grep who imports it. If more than one dashboard uses it, it belongs to 01.
- Need a change in a file you don't own? Don't edit it. Append a request to YOUR file
  `d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\requests\<name>.md` (main repo, absolute path):
  `## REQ-<name>-<n> | Sev | target file:line | problem | proposed change | how to verify | status: open`.
  Session 01 reads every requests file at least once an hour, implements accepted ones on `qa/platform`, and sets
  `status: done in <commit sha>` or `status: rejected – <reason>`. Never edit another session's requests file.
- Waiting on a request? Keep going. Mark dependent checks BLOCKED (REQ id) and re-test after rebasing onto `qa/platform`
  if the user tells you it has merged.
- Model changes (Mongoose schemas) always go through 01, because every dashboard reads them.

## C. Safety (non-negotiable)

- Never print secret values. Refer to env keys by name. Never read the real `.env` files except to list key names.
- Never point anything at a non-local database. No seed, `?clear=true`, or delete against a shared or live DB.
- Git: commit only to your own branch inside your worktree, in small commits (`fix(<scope>): …`). Never push, never
  merge into BASE, never rebase someone else's branch, never change git config, never skip hooks. The user merges.
- Payments: sandbox/test keys only, using the test cards/wallets documented in `PAYMENT_TEST_CREDENTIALS.md`. Never trigger
  a real charge, payout, refund, email, or SMS to a real address. Use `@qa.test` emails only.
- Dependencies: don't add any unless a fix truly needs one. If you do, pin an exact version, and it's 01's decision
  (request it).
- Don't rewrite pages or swap design systems. Minimal, focused diffs. If a fix needs new product behaviour (a new
  backend module, a new feature), don't build it. List it under Remaining and ask the user.
- PASS means observed in the browser or an API call. Code reading alone is never PASS.

## D. Baseline and verification commands (run inside your worktree)

Before changing anything, record the baseline output of:
`npm run lint`, `npm run build`, `npm run test:frontend`, `cd Backend; npm test`.
After every fix batch: build must pass, lint must have no NEW errors, backend tests must have no NEW failures, and
the affected Playwright specs must be re-run. Add backend regression tests for every security and validation fix in
`Backend\tests\<area>.integration.test.js` (node:test + mongodb-memory-server, following
`staffManagement.integration.test.js`). New test files go into the Backend `test` script; if that's `Backend\package.json`,
request it from 01 and list the command in your report.

## E. Browser harness standard

- Auth lives in sessionStorage per tab: one Playwright context per logged-in user. Concurrency = two contexts.
- On every page capture console errors/warnings, failed requests (>=400), unhandled rejections, and `page.on('dialog')`
  (an XSS trap: any dialog = FAIL).
- Theme: test light AND dark (toggle in the UI; persisted in `localStorage.theme`).
- Failure simulation with `page.route()`: 500, 401 `{"success":false,"message":"Not authorized, token expired"}`, 403, 429,
  abort, 3–5 s delay. Real offline with `context.setOffline(true)`.
- API tests: Playwright `request` with Bearer tokens from the login endpoint. Fetch `GET /api/v1/csrf-token` and send
  `X-CSRF-Token` on mutations.
- Timezones: run once with `timezoneId: 'Asia/Kathmandu'` (+05:45) and once with `UTC`.
- Every bug: page, steps, expected, actual, screenshot path, root cause `file:line`.

## F. Mobile responsiveness standard (applies to every page in every dashboard)

Viewports (Playwright `devices` with `isMobile` + `hasTouch` where applicable):
360×740 (small Android), 375×667 (iPhone SE), 390×844 (iPhone 14, WebKit), 412×915 (Pixel 7), 768×1024 (iPad portrait),
1024×768 (tablet landscape), 1280×800, 1440×900. Also landscape phone 844×390 for every mobile view.

Automated checks per page per viewport (write them as reusable harness helpers):
1. No horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`. Report the offending elements
   (walk the DOM for `getBoundingClientRect().right > innerWidth`).
2. Tap targets ≥ 44×44 CSS px for buttons, links, icon buttons, checkboxes, tabs, and nav items, or ≥ 8 px apart.
3. Form inputs have font-size ≥ 16 px (prevents iOS zoom on focus). Correct `type`/`inputMode`/`autocomplete`
   (`tel`, `email`, `numeric`, `decimal`, `one-time-code`, `current-password`).
4. Nothing hidden behind fixed headers or bottom navs: the last list item and every primary action can be scrolled into
   view and clicked. Content has bottom padding = bottom-nav height + `env(safe-area-inset-bottom)`.
5. Modals on ≤ 480 px: full-width or bottom sheet, `max-height: calc(100dvh - 32px)` (with a 100vh fallback), sticky
   footer, inner scroll only, background scroll locked and restored on close, close button reachable.
6. Soft keyboard: focus the last input in every form at 390×844 and confirm the submit button is still reachable
   (`visualViewport` resize). No layout jump that hides the focused field.
7. Tables at < 640 px become stacked cards or have a sticky first column with visible horizontal scroll affordance.
   No clipped columns, no 6-px text.
8. Typography: body ≥ 14 px (16 px for reading text), line-length sane, long names/emails/Devanagari wrap or truncate with
   a `title`, no overlapping text. Check 200% browser zoom on 1280 wide (WCAG reflow).
9. Images: correct aspect ratio, `object-fit`, no layout shift (CLS), lazy-loaded below the fold, no 2 MB images on mobile.
10. Touch: no hover-only actions or tooltips holding essential info; swipe/scroll areas don't trap the page scroll;
    drawers/sidebars close on backdrop tap and Esc, trap focus, and return focus.
11. Orientation change mid-flow (portrait to landscape with a modal open) keeps state and layout.
12. Performance on mobile: Slow 4G + 4× CPU throttle (CDP). First meaningful content < 4 s, a skeleton visible while loading,
    no spinner-forever. Optional: Lighthouse mobile (`npx lighthouse@12.3.0` from the harness), record Perf/A11y/Best-Practices.
13. `prefers-reduced-motion: reduce` disables large animations (framer-motion / gsap). Dark mode on mobile has no
    white flashes or unreadable text.

Visual quality bar for mobile (fix, don't just report): consistent 16 px page gutters, 8-pt spacing rhythm, clear visual
hierarchy (one primary action per screen), sticky primary actions on long forms, readable status badges, thumb-reachable
primary nav (bottom nav on phones for operational dashboards), empty/loading/error states that fit the screen, and
skeletons that match the final layout. Take before/after screenshots at 375 and 1440, light and dark, for every view you change.

## G. UI/UX consistency contract (shared across ALL dashboards)

Reference implementation: `frontend\src\features\staff\hotel-admin\styles\hotel-admin-tokens.css` (`--ha-*` tokens) and
`hotel-admin\components\ui\*`. Do not import across features. Align your dashboard's own CSS variables and components to
these shared rules, then document what you mapped in your report so 01 can later consolidate into `shared\`:
- Spacing 4/8-pt scale; radii 8 (inputs, buttons), 12 (cards), 16 (modals/sheets); one shadow scale.
- Type scale 12 / 14 / 16 / 20 / 24 / 30; one font family; tabular numbers for money and counts.
- Buttons: primary / secondary / ghost / danger; heights 36 desktop and 44 touch; a loading state with a spinner and
  disabled; a visible `:focus-visible` ring.
- Status colours mean the same thing everywhere: pending = amber, confirmed = blue, preparing = indigo/purple,
  ready = green, served/delivered/completed = neutral or teal, cancelled/failed = red, paid = green, unpaid = amber.
  Always pair colour with text or an icon (never colour alone).
- Money: `Rs. 1,234` (or `Rs. 1,234.50`), the same formatter everywhere. Dates: one format per context; show the hotel's timezone.
- States: every list has a skeleton, empty state (with CTA), no-results state (with "Clear filters"), and error state (with
  Retry). Errors show the server's message.
- Feedback: toasts top-right on desktop, top-center on mobile, above modals (z-index), readable in dark mode.
- Destructive actions use a confirm dialog with `role="alertdialog"`, focus on Cancel, and the consequence spelled out.
- Accessibility: labels on every input, `aria-current` on nav, keyboard operable cards/rows, contrast ≥ 4.5:1 for text.
  Full WCAG validation needs manual assistive-technology testing; report what was checked automatically.

## H. Security baseline (run against every endpoint your dashboard calls)

For each endpoint found in your feature's services (grep `axios`, `apiClient`, `fetch(`):
- AuthN: no token = 401; expired token = silent refresh once, then retry; tampered JWT = 401.
- AuthZ/role: every other role gets 403 (staff roles, guest, superadmin where not intended). Tampering with sessionStorage
  role/user in the browser must not unlock any API.
- Tenancy/IDOR: Company B principals on Company A ids (and the reverse) get 403/404 for read AND write. A manager/staff
  member assigned to hotel 1 can't touch hotel 2 of the same company.
- Mass assignment: extra fields (`role`, `company`, `hotel`, `owner`, `price`, `total`, `status`, `isVerified`, `rating`,
  `_id`, `__v`) in bodies are ignored or rejected.
- Input: NoSQL operators (`{"$gt":""}`, `{"$ne":null}`) in body/query, regex metacharacters in search, invalid ObjectIds
  (404 JSON, no stack trace in production mode), oversized bodies, wrong types, negative/huge numbers.
- XSS: stored payloads in every free-text field render as text everywhere they appear (your dashboard AND others'; note
  cross-dashboard sinks for the owning session), including print windows, PDF/receipt HTML, emails and CSV (formula
  injection `= + - @`).
- Business logic: server recomputes prices/totals (never trusts the client), status transitions are enforced server-side,
  double submit/race conditions (two contexts at once) don't double-charge, double-book, or double-apply.
- Rate limits (one run with `NODE_ENV=production`): auth and write endpoints return 429, and the UI shows the message.
- Data exposure: responses don't leak password hashes, tokens, other tenants' data, internal ids not needed, or full PII
  in lists; no PII in `console.log` (frontend or backend).
- Sockets: a client can't join another hotel's/guest's room; events carry only the data that role may see.

Edge-case matrix for forms/lists: reuse section 4 of
`d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-master-prompt.md` (text, numbers, duplicates, submit,
network, lists, dates, uploads, concurrency). It applies to every dashboard, not only hotel admin.

## I. Fix protocol and priority

For each defect: reproduce in the browser/API, then make the minimal fix in a file you own (or file a REQ), then
build + lint + tests, then re-run the spec. Order:
- P0 security and data integrity (authz/tenancy, injection, XSS, payment/money bugs, PII leaks, destructive endpoints).
- P1 broken essential features (anything a role needs to do its daily job), realtime, and auth/session bugs.
- P2 validation parity (frontend = backend limits and messages), error/empty states, stale data.
- P3 mobile responsiveness and visual consistency (section F/G), then Low items.

## J. Report (write to `d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\<name>-report.md`, then paste a summary in chat)

1. Environment: worktree, branch, ports, DB (local confirmed), baseline vs final lint/build/test results.
2. Feature PASS/FAIL table: Area | Checks | Pass | Fail | Blocked | Notes.
3. Mobile matrix: View × viewport (360/375/390/412/768/1024/1440) with PASS/FAIL and screenshot paths.
4. Security matrix: Actor | Call | Expected | Actual.
5. Bugs fixed: # | Sev | file:line | Root cause | Fix | Verified by | Commit sha.
6. UX/visual changes: view | before | after | screenshots.
7. REQs filed to 01 and their status.
8. Decisions taken, with one-line rationale.
9. Remaining issues by severity: issue, file:line, why not fixed, suggested fix.
Factual, no filler.

## K. Cleanup and handoff

Delete `Backend\scripts\_qa_tmp_<name>.js` and other temp files from your worktree. Stop your background servers. Leave
the worktree, branch and commits in place for the user to review and merge. Suggested merge order:
01 platform → 02 hotel admin → 03 reception → 04 waiter → 05 kitchen → 07 guest → 08 public → 06 super admin,
rebasing each onto the previous.
