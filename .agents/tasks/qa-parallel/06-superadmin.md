# Master prompt 06: Super admin dashboard (session name: `superadmin`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven SUPER ADMIN dashboard (platform owner: hotels, users, finance,
reviews, content, system config). It's the highest-privilege surface in the app, so security comes first. Other agents are working
on the other dashboards at the same time. Analyze, test end to end in a real browser (Playwright) against the running app, fix in
files you own, re-test, report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 06, name `superadmin`, worktree .worktrees\qa-superadmin, branch qa/superadmin, API 3005, web 5178,
DB stayhaven_qa_superadmin.

# SCOPE
Route: /superadmindashboard (role superadmin).
Frontend (you own): frontend\src\features\staff\superadmin\pages\ SuperAdminLayout, SuperadminDashboard, HotelManagement,
UserManagement, Finance, ReviewModeration, ContentManagement, SystemConfiguration (.jsx + .css); frontend\src\core\api\services\finance.service.js
is in core (01's) → REQ if it needs changes.
Backend (you own): routes\{superadminRoutes,finance.routes,reviewModeration.routes,systemConfig.routes,companyRoutes,testimonials.routes}.js,
routes\content\**, their controllers/services, models\payout.model.js and models\commission.model.js (other models → REQ to 01).

# ACCOUNTS
No seed script creates a superadmin (grep found none in Backend\scripts). Create one in YOUR DB with your throwaway
script, plus: 2 companies with approved, pending and rejected hotels, owners and staff, guests with bookings and payments (for
commissions/payouts), reviews (some abusive/XSS), and content entries. Find out how the superadmin logs in (staff login or a
separate route) and test that path.

# PHASE 1: ANALYZE (≤ 45 min)
Map each page → service → route → controller → model; list the role guard on EVERY superadmin route (mounted router-level
or per-route?), audit logging, and every money calculation (commission %, payout amounts, rounding, currency).

# ESSENTIAL FEATURES THAT MUST WORK
1. Dashboard: platform KPIs (hotels, users, bookings, GMV, commission) equal DB aggregates; date-range filters; charts render
   with 0/1/many data points.
2. Hotel management: list/search/filter, view details, approve/reject (with reason)/suspend/reactivate; the effect is visible on the
   public site and blocks staff logins/bookings for suspended hotels; pagination; email notifications are sandboxed.
3. User management: list/search guests and staff, view, ban/unban, reset password, change role. Escalation guards: can't
   demote/delete the last superadmin or yourself; role changes invalidate existing sessions.
4. Finance: commissions per booking/hotel, payout creation/approval/marking paid, statements/exports. Amounts are exact
   (integer paisa or Decimal, no float drift), idempotent (double-click creates one payout), a payout can't exceed the balance,
   and concurrent approval in two contexts pays once.
5. Review moderation: approve/hide/delete, flag reasons; hidden reviews disappear from the public hotel page; the rating average recalculates.
6. Content management (landing/testimonials/CMS): create/edit/publish; rendered content on the public site is sanitized (stored XSS
   here is site-wide); image uploads validated.
7. System configuration: every setting saves, validates types/ranges, and takes effect; dangerous toggles (maintenance mode,
   commission rate, payment gateways) have confirmation and an audit trail.
8. Layout/shell: navigation, deep links/reload per page, logout.

# SECURITY FOCUS (P0)
Every superadmin endpoint returns 403 for ALL other roles (owner, hoteladmin, admin, manager, receptionist, waiter, chief,
guest) and 401 without a token; tampering with sessionStorage role to "superadmin" unlocks nothing; mass assignment on user
update (`role`, `isVerified`, `company`, `password`) is restricted; IDOR doesn't apply, but input validation does (ObjectIds,
NoSQL operators, regex search); finance endpoints are protected against replay/double submit; CMS/review/hotel text is sanitized
on output in every consumer (public pages, emails); exports are CSV-injection safe; responses never include password hashes
or tokens; actions are audit-logged (who/what/when); a rate limit applies to the superadmin login. Add regression tests in
Backend\tests\superadmin*.integration.test.js.

# MOBILE + VISUAL (rules F/G; desktop-first, but it must be fully usable at 390×844 and 768×1024)
- SuperAdminLayout: the sidebar becomes a drawer on phones with a focus trap/Esc/backdrop, the topbar has the page title, and nothing overflows.
- Data-heavy tables (hotels, users, finance, reviews) become cards on phones with key fields first and actions in a ≥ 44 px
  overflow menu; filters live in a sheet; charts resize (no fixed widths) and show a readable legend on phones.
- Finance numbers: right-aligned tabular numerals on desktop, label/value pairs on mobile, never truncated.
- Forms in System Configuration and Content: single-column on phones, sticky Save, unsaved-changes warning.
- Align the superadmin CSS (HotelManagement.css, Finance.css, …) to the rules G contract; document the mapping.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\superadmin-report.md (format: rules J).
```
