# Master prompt 01: Platform, shared code and security (session name: `platform`)

```markdown
# ROLE
You are the platform and security owner for the StayHaven hotel booking / order management app. Six other agents are
testing and fixing individual dashboards IN PARALLEL. You own all shared code, the backend core, and the cross-cutting
security posture. You also serve their change requests. Test in a REAL browser and with real API calls, fix with
minimal diffs, re-test, and report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 01, name `platform`, worktree .worktrees\qa-platform, branch qa/platform, API 3000, web 5173,
DB stayhaven_qa_platform. Section B lists the files you own (everything shared).
Prior audit of shared issues (code-read only, unverified): d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-audit\05-cross-cutting.md
and Part 1 of d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-master-prompt.md.

# SCOPE
Frontend: frontend\src\core\** (api\client.js and services\*, context\{StaffAuthContext,SocketContext,
NotificationContext,ThemeContext}.jsx, routes\{ProtectedStaffRoute,ProtectedGuestRoute}.jsx), frontend\src\app\App.jsx,
frontend\src\shared\** (components\BillPreviewModal.jsx, components\ConfirmDialog.jsx, layout\Footer.jsx,
pages\NotFound.jsx, ui\ThemeToggle.jsx, utils\webrtcManager.js), vite.config.js, frontend\vite.config.js, vercel.json, index.html.
Backend: server.js, middleware\** (authMiddleware, rateLimiter, errorHandler, upload, csrf), config\** (sentry,
cloudinary, nodemailer), utils\** (envValidator, qrGenerator…), models\**, services\notificationService.js, the
Socket.IO server, controllers\staffController.js, controllers\orderController.js, routes\{staffRoutes,diningRoutes,authRoutes,healthRoutes}.js.

# WORK PLAN
Phase 0 (first 30 min, other sessions depend on it):
- Set up your worktree/env/DB per rules A. Record baselines (rules D).
- Create d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\requests\ if it is missing. Then check it at least
  once an hour for the rest of the run.

Phase 1: repository and configuration security (report every finding; fix what's in code)
1. Secrets in git: `git ls-files | Select-String -Pattern '\.env|credential|secret|\.pem|\.key'` and
   `git log --all --oneline -- '*.env*'`. Check whether `.env`, `.env.production`, `frontend\.env.production`, `Backend\.env`,
   `dist\`, `.claude\worktrees\**\.env.production` and `PAYMENT_TEST_CREDENTIALS.md` are tracked or contain real secrets
   (report key NAMES only). Anything VITE_* ships to the browser, so flag any secret-looking VITE_ key. Recommend rotation;
   don't rotate yourself. Fix .gitignore if needed (don't delete tracked files without asking).
2. `npm audit --omit=dev` in root, frontend and Backend: list High/Critical with the fix version. Don't bulk-upgrade; propose.
3. server.js: helmet/CSP (script-src, connect-src for socket/API, frame-ancestors), CORS allow-list (no `*` with
   credentials, no reflection of arbitrary origins), body size limits, `trust proxy` correctness for rate limits, HTTPS
   redirect / HSTS in production, the forced DNS 8.8.8.8 override (risk + side effects), the health endpoint leaking versions/env.
4. Cookies: refresh/access cookie flags (HttpOnly, Secure in prod, SameSite, path, maxAge); CSRF strategy vs cookie
   auth (which routes enforce csrf.js and which can be hit cross-site with cookies alone).
5. JWT: secret strength enforced, algorithm pinned, expiry, refresh rotation + reuse detection, logout revokes refresh on the
   server, password change/role change/deactivation invalidates existing tokens, and guest vs staff tokens can't be used
   interchangeably.
6. errorHandler: no stack traces or Mongo error internals in production; multer errors return 400; CastError returns 404;
   validation errors return 400 with field messages; consistent `{ success, message }` shape.
7. Input hardening: global NoSQL operator sanitizing (check whether one exists; `$`/`.` keys in body/query/params),
   regex escaping helper in utils used by every search, upload middleware (MIME sniffing not just extension, size,
   Cloudinary folder/public_id not user-controlled).
8. Sentry config: PII scrubbing (`sendDefaultPii`, beforeSend stripping auth headers, cookies, emails), DSN only from env.
9. Rate limiter: limits per route class (auth, OTP/forgot-password, writes, uploads, guest QR ordering), keyed correctly
   behind a proxy. Do one run with `NODE_ENV=production`.
10. Logging: grep frontend and backend for console.log of tokens, passwords, PII (BillPreviewModal is known to log
    guest PII). Remove or guard them.

Phase 2: auth and session (browser + API)
- Staff login (`/staff/login`) for every role: owner, hoteladmin, admin, manager, receptionist, waiter, chief, superadmin.
  Each lands on its correct dashboard (known: admin goes to `/dashboard` and manager to `/manager-dashboard`, both 404;
  staffController.js ~252-274; ProtectedStaffRoute.jsx sends manager to /reception-dashboard). Decide one role → route map,
  then make the backend redirectPath, ProtectedStaffRoute and App.jsx route guards use the same single constant.
- Logout calls POST /api/v1/staff/logout before clearing storage; afterwards cookie-only `/staff/me` and `/staff/refresh-token` return 401.
- Token expiry: run a backend with `JWT_EXPIRE=2m` (shell env override). Every dashboard's API calls refresh silently once.
  Feature services that use their own axios instance without the 401 interceptor (hotel-admin services; check
  every feature for `axios.create`) must be able to move onto core\api\client.js. Make client.js support them
  (isStaffRequest must cover /api/v1/rooms, /api/v1/tables, and every staff-only prefix), then tell the owners via the reply in
  their REQ file. Base the proactive refresh timer on the token's `exp`, not on page-load time.
- Two tabs refreshing at the same moment: no forced logout (refresh single-flight).
- Guest auth (ProtectedGuestRoute, guest token) is separate from staff, and a guest token is rejected by staff APIs and the reverse.
- Account lockout message, password reset tokens (single-use, expiry, not logged), user enumeration on login/forgot.

Phase 3: realtime / sockets
- Socket auth on connect AND reconnect (fresh token after refresh, not a stale `auth.token`).
- Room join authorization: a waiter of hotel A emitting join for hotel B, a guest joining another guest's/table's room,
  any client joining `superadmin` rooms are all refused. Events don't leak other tenants' data.
- Backend restart: clients reconnect and re-subscribe. NotificationContext: mark-read failures roll back, and the badge
  count matches the server.
- webrtcManager.js (if calls are used): TURN/STUN config from env, no credential in the bundle, the call can only target
  allowed peers, media permissions denied → graceful UI.

Phase 4: shared components and global UI
- BillPreviewModal (used by waiter OrderCard.jsx and reception ReceptionOrdersView.jsx): role=dialog, Esc, focus trap,
  labelled + validated email, no backdrop close while sending, dark-mode tokens, no "Test Hotel" placeholders, VAT/totals
  from server data not a hard-coded 13%, guard window.open null, HTML-escape everything printed, remove the PII console.log.
  Re-test in both consumer dashboards.
- ConfirmDialog: role=alertdialog, Esc, focus trap, portal, design tokens (contract in rules G). Re-test the consumers (grep).
- Toast container: z-index above modals, offset that doesn't overlap any dashboard's top bar, top-center on mobile,
  dark-mode readable.
- Top-level and per-route ErrorBoundary: a crash in one dashboard section must not blank the app.
- NotFound page and Footer: responsive and on-brand. ThemeToggle: type="button", aria-pressed, works on every dashboard.
- Create `frontend\src\shared\styles\dashboard-tokens.css` mirroring the contract in rules G (values taken from
  hotel-admin-tokens.css) so dashboards can adopt it after merge. Don't change any dashboard's imports yourself.

Phase 5: orders core (orderController.js, diningRoutes; shared by waiter, kitchen, reception, hotel admin, guest)
- Server-side pricing: totals recomputed from DB menu prices, modifiers, tax/service charge; client-sent prices ignored.
  Run `cd Backend; npm run test:pricing` and `npm run test:dining`.
- Status machine enforced server-side (only next valid step, per role: waiter vs chief vs manager); same-status no-op;
  concurrent updates from two contexts → one wins, the other gets 409.
- cancelOrder / retryBillSending pass `next` (errors aren't all 500); non-string `reason` returns 400; invalid ids return 404;
  search escapes regex.
- Tenancy on every order endpoint (Company B tokens on Company A orders return 403).

Phase 6: serve change requests
Every hour, and before the report, process all `requests\*.md` files: implement accepted ones with tests, reply in-line in that
file with `status: done in <sha>` or `rejected – reason`. Order: P0 security first, then anything blocking another session.

# MOBILE + VISUAL (rules F/G)
Run the rules F checks on: staff login, guest login, NotFound, Footer, the toasts, ConfirmDialog, BillPreviewModal at
every viewport, light and dark. Then do a cross-dashboard consistency sweep on BASE: screenshot the landing page of every
dashboard at 390 and 1440, and produce a side-by-side table of buttons, badges, cards, tables, modals, nav, page headers,
and empty states, listing every deviation from rules G per dashboard. Put it in your report so the owners and the user can see
the gaps. Don't edit their files.

# DO NOT
Edit feature folders owned by 02–08. Upgrade major dependency versions. Rotate real credentials. Change product behaviour
beyond the defect.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\platform-report.md (format: rules J). Add a
"Repository secrets and config" section and the cross-dashboard consistency table.
```
