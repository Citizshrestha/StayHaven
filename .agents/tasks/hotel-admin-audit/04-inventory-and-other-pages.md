# Hotel Admin Audit — 04: Stock/Inventory + Other Pages (Staff, Billing, Loyalty, Reports, Notifications, Shell/Theme/Logout)

Read-only investigation. No source files modified. Paths relative to repo root `d:\hotel-booking-order-management-system`.
FE root: `frontend/src/features/staff/hotel-admin/`. BE root: `Backend/`.

---

## 0. Enumerated hotel-admin routes & sidebar items

Single React route; sections are hash-routed inside one shell.

| Item | How reached | Component | Owned by |
|---|---|---|---|
| `/hoteladmin-dashboard` | `App.jsx:342`, `ProtectedStaffRoute allowedRoles=['owner','hoteladmin','admin','manager']` | `pages/HoteladminDashboard.jsx` (shell) | this report (shell) |
| `/roommanagement` → `#rooms` | `App.jsx:350` redirect | — | other branch |
| `/restaurantmanagement` → `#restaurant` | `App.jsx:351` | — | other branch |
| `/tablemanagement` → `#tables` | `App.jsx:352` | — | other branch |
| `/roomqrmanagement` → `#roomqr` | `App.jsx:353` | — | other branch |

Sidebar (`components/Sidebar.jsx`) sections, in order — hash id → page:

- **Main**: Dashboard `#dashboard` → `DashboardHome` (other branch); Rooms `#rooms` → `RoomManagement` (other branch, badge = roomCount)
- **Operations**: Restaurant `#restaurant`; Table QR Codes `#tables`; Room QR Codes `#roomqr`; Orders `#orders` (badge = activeOrders) — other branches; **Stock / Inventory `#stock` → `StockManagement`** (this report)
- **People**: **Staff Management `#staff` → `StaffManagement`** (this report)
- **Finance**: **Billing & Payments `#billing` → `BillingManagement`**; **Loyalty Points `#loyalty` → `LoyaltyManagement`** (this report)
- **Insights**: **Reports & Analytics `#reports` → `ReportsAnalytics`** (this report)
- (divider) **Notifications `#notifications` → `NotificationsManagement`** (badge = unreadCount) (this report)
- **Footer**: profile card (name + role), **Theme toggle** (hidden when rail collapsed), **Logout**
- **Mobile topbar** (<768px): hamburger, section title, second ThemeToggle
- **Tablet** (768–1023px): collapse/expand rail button

Not present (confirmed absent): settings/property profile, reviews, finance (beyond Billing mock), shift reports. No `#settings` section exists; unknown hashes fall back to Dashboard.

---

## 1. Shell (HoteladminDashboard + Sidebar + Theme + Logout)

Trace: `App.jsx:342` → `ProtectedStaffRoute` (FE role check only on `staffUser.role` string) → `HoteladminDashboard.jsx` (state `activeSection` from `window.location.hash`, `hashchange` listener with cleanup) → `Sidebar.jsx` → section page (unmounted/re-mounted on every switch → refetch every visit).

### Findings
| # | Sev | File:line | Finding |
|---|---|---|---|
| S1 | **High (security)** | `HoteladminDashboard.jsx:84` → `StaffAuthContext.jsx:117` | Logout only clears sessionStorage/localStorage. It never calls `POST /api/v1/staff/logout` (`staffAccount.service.js:38` `staffLogout`), unlike waiter/kitchen sidebars. Server refresh token + httpOnly `refreshToken` cookie stay valid (7 days) → `/staff/refresh-token` can still mint access tokens after "logout". No toast/confirmation either. |
| S2 | High (functional) | `Backend/routes/receptionRoutes.js:319,405,710` vs `App.jsx:344` | FE admits role `hoteladmin`, but all reception endpoints used by Reports/Loyalty (`/reception/guests`, `/billing/summary`, `/reports/overview`, `/dashboard/revenue-split`) `authorize("receptionist","manager","admin","owner")` — no `hoteladmin`. A real `hoteladmin` user gets 403 on Reports & Loyalty (Staff endpoints do include it). Seed accounts are `admin`/`owner`, so this is hidden in testing. |
| S3 | Medium | `Sidebar.jsx:62` | `NavItem` is declared inside the render body → new component type each render → every nav button unmounts/remounts on any parent re-render (badge updates, hash change). Keyboard focus on a nav item is lost when counts update. |
| S4 | Medium (a11y) | `shell.css:77-87`, `HoteladminDashboard.jsx` | Mobile drawer: no Esc-to-close, no focus trap, focus not moved into drawer on open or back to hamburger on close; off-canvas sidebar (translateX(-100%)) stays in the tab order when closed (no `inert`/`visibility:hidden`). Backdrop is click-only. |
| S5 | Medium | `Sidebar.jsx:155` | Theme toggle hidden when `collapsed`; at 768–1023px the topbar is also hidden (`shell.css:77`), so a collapsed rail has **no theme control at all**. |
| S6 | Low | `Sidebar.jsx` badges / `HoteladminDashboard.jsx:91` | Room/order badges only populate after visiting Dashboard or Rooms/Orders. Deep-link to `#stock` shows no badges; badges go stale while on other sections (no polling/socket). |
| S7 | Low (a11y) | `shared/ui/ThemeToggle.jsx` | No `type="button"`, static `aria-label="Toggle theme"` with no state (`aria-pressed` / "Switch to dark mode"); decorative SVGs not `aria-hidden`; Tailwind classes inside hotel-admin token system. |
| S8 | Low | `HoteladminDashboard.jsx:46` | Unknown hash (e.g. `#settings`) renders Dashboard but leaves the bogus hash in URL; nav highlight correct, URL wrong. |
| S9 | Low | `Sidebar.jsx:162` | Logout button: no `aria-label` when collapsed (only `title`); label is visually hidden in rail, so accessible name relies on hidden text — verify `.navLabel` uses `display:none` (would remove name). |
| S10 | Info | `HoteladminDashboard.jsx:114` | `BillingManagement` rendered without `embedded` prop (inconsistent with others; harmless today). |

### Test checklist — Shell
- [ ] Login as `owner`, `admin`, `manager`, `hoteladmin` → each lands on `/hoteladmin-dashboard`; `receptionist`/`waiter`/`chief` are redirected to their own dashboards.
- [ ] Every sidebar item switches content, updates `aria-current="page"`, updates URL hash, and topbar title (mobile).
- [ ] Browser Back/Forward between sections; reload on each `#hash` restores the section; `#garbage` → Dashboard.
- [ ] Legacy URLs `/roommanagement`, `/restaurantmanagement`, `/tablemanagement`, `/roomqrmanagement` redirect to correct hash.
- [ ] Logout → lands on `/staff/login`; **then** call `POST /api/v1/staff/refresh-token` with the cookie — must fail (currently succeeds → S1). Back button after logout must not show dashboard.
- [ ] As `hoteladmin` role: open Reports and Loyalty — must load (currently 403 → S2).
- [ ] Theme toggle in sidebar and mobile topbar; persists on reload; every page/modal/ConfirmDialog readable in both themes.
- [ ] 768–1023px: collapse rail → icons have tooltips; theme still reachable (S5).
- [ ] <768px: hamburger opens drawer, backdrop click closes, nav click closes, Esc closes, Tab doesn't escape drawer, closed drawer not tabbable (S4).
- [ ] Badges: deep-link `#stock` → are Rooms/Orders badges correct? Create an order elsewhere → Orders badge updates?
- [ ] Keyboard: Tab through sidebar, focus ring visible on dark rail; focus kept on item after badge update (S3).

---

## 2. Stock / Inventory (`#stock`)

Trace: `StockManagement.jsx` → `services/stockApi.js` (**in-memory mock, no HTTP**) → no backend. `grep inventory|stock` in `Backend/{routes,controllers,models}` = **0 matches**. No model, route, controller, auth or property scoping exists.

Components: PageHeader (Export, Add Item), SearchInput (debounced 250ms), category Select, status FilterTabs, KPI cards, alert banner, sortable/paginated Table (10/page, client-side via `useTableControls`), Add/Edit Modal (lg), Adjust Modal (sm), ConfirmDialog (delete).

### Findings
| # | Sev | File:line | Finding |
|---|---|---|---|
| I1 | **Critical (prod-readiness)** | `stockApi.js:28-75`, `StockManagement.jsx:103` | Entire feature is mock. All CRUD "succeeds" with toasts but nothing persists across refresh. Banner (`isMock`) discloses this, but "Item added" toasts still imply success. Needs `InventoryItem` model (hotel+company scoped), routes under `/api/v1/staff/inventory` with `protect` + `authorize('owner','admin','manager','hoteladmin')` + property-scope + `writeOperationLimiter`, and an atomic `$inc` adjust endpoint. |
| I2 | High | `stockApi.js:28` | `store` is a module-level singleton: edits leak across users in the same tab (logout → login as another property's admin shows prior session's edits) and are identical for every property. |
| I3 | High | `StockManagement.jsx:214-224, 433` | Adjust "Apply": no in-flight state / disable → double-click applies the adjustment twice (Add 10 → +20). No `saving` flag, Cancel not disabled. |
| I4 | Medium | `StockManagement.jsx:163-170` | Validation gaps: `criticalLevel > lowStockLevel` allowed (status logic `getStockStatus` then never shows "low"); negative low/critical levels allowed (only HTML `min`); no max length on name/supplier/notes; duplicate names allowed; whitespace-only supplier kept; no upper bound on quantity/cost (1e21 renders as exponent). |
| I5 | Medium | `StockManagement.jsx:410-416` | Number inputs use `+e.target.value`: clearing the field forces `0` (can't empty and retype naturally; "0" sticks → "05"), and `e`/`-` input yields `0` silently. Store as string, parse on submit. |
| I6 | Medium | `StockManagement.jsx` adjust (`adjPreview`), `stockApi.js:61` | "Remove" more than on hand silently clamps to 0 — no warning/error. "Set" accepts decimals for `pcs`/`boxes` units. |
| I7 | Medium | `StockManagement.jsx:186,201,221` | All catch blocks show generic toasts and discard `e.response.data.message`; once wired to a backend, 400/403/409 reasons are lost. |
| I8 | Low | `StockManagement.jsx:158` | `openEdit` copies the full item (incl. `_id`) into form and sends it back in update payload — strip before PUT when real API lands (mass-assignment risk). |
| I9 | Low | `StockManagement.jsx:297` | Alert banner joins every critical/out item name — unbounded length; wraps badly at 375px with many items. Show first 3 + "and N more" + link that sets status filter. |
| I10 | Low | `StockManagement.jsx:304` | Loading skeleton renders 4 cards but 5 KPI cards appear → layout jump. |
| I11 | Low | `StockManagement.jsx` | Search/filter change does not reset to page 1 (only clamps if out of range) → user on page 2 can see a partial page; export uses `filtered` (correct) but no visual note that export = filtered set. |
| I12 | Low | `StockManagement.jsx` table | Progress-bar % uses `lowStockLevel*3` as "full" — arbitrary, undocumented; with `lowStockLevel=0` bar always 100%. |
| I13 | Low | `useTableControls` call | `accessors` object literal re-created each render → sort memo recomputes every render (perf only). |
| I14 | Info | — | No movement history/audit log for adjustments (who/when/why), no reason field — expected for production inventory. |

### Test checklist — Stock
Functional
- [ ] Initial load: skeletons → 8 seeded items; KPI counts match statuses (ok/low/critical/out) and Total Value = Σ qty×cost.
- [ ] Add item with all fields → appears, sorted by name; toast; modal closes. Refresh page → **item disappears** (I1 — record as blocker).
- [ ] Edit item → values prefilled; Update persists in list; Cancel discards.
- [ ] Delete → ConfirmDialog → item removed; pagination clamps when last item on page deleted.
- [ ] Adjust Add / Remove / Set → preview text correct; list updates.
- [ ] Search by name and supplier (case-insensitive), category filter, status tabs with counts; combinations; "No matching items" vs "No items yet" empty states.
- [ ] Sort by Item/Category/Quantity/Total Value asc/desc; pagination at 11+ items.
- [ ] Export CSV with filters → only filtered rows; names containing commas/quotes/newlines escaped; Excel opens UTF-8 (BOM).
Edge cases
- [ ] Name empty / spaces only → inline error; name 500 chars → should be rejected (I4).
- [ ] Quantity −1, cost −1 → inline error. Low level −5, critical > low → should be rejected (I4).
- [ ] Clear quantity field and type "5" → should be `5`, not `05`/`0` (I5).
- [ ] Quantity `1e21`, `0.0001`, `99999999999` → display sanity.
- [ ] Adjust: double-click Apply quickly → must apply once (I3). Remove 999 from 8 → should warn (I6). Set `2.5` pcs.
- [ ] Press Enter inside Add form → submits once; Enter inside Adjust qty → (currently nothing; should apply).
- [ ] Esc while saving; Esc with unsaved edits (no guard today).
- [ ] Log out, log in as different property admin → stock list must be that property's (I2 fails today).
- [ ] After backend exists: cross-property id tampering on PUT/DELETE/PATCH adjust → 404; waiter/receptionist → 403; concurrent adjust from two tabs → no lost update (atomic `$inc`).

---

## 3. Staff Management (`#staff`)

Trace: `StaffManagement.jsx` → `services/staffApi.js` (own axios instance, Bearer from `sessionStorage.staffAccessToken`, CSRF interceptor) → `Backend/routes/staffRoutes.js:230-285` → `controllers/staffManagementController.js` (list/edit/status/remove) and `controllers/staffController.js` (`inviteStaff` ~666, `resendInvite` ~998).

| FE call | Endpoint | Auth | Scoping |
|---|---|---|---|
| `getStaffList(propertyId)` | `GET /staff/manage/:propertyId` | protect + authorize(manager, hoteladmin, admin, owner) | `propertyForActor`: hotel must belong to `req.user.company`; manager/hoteladmin must be assigned. Good. |
| `inviteStaff` | `POST /staff/invite` (sensitiveOpLimiter) | same + controller checks `req.user.role.name` | property in company; manager/hoteladmin assigned; manager role only by owner/admin. Good. |
| `resendStaffInvite(id)` | `POST /staff/resend-invite/:staffId` | same | company + (manager/hoteladmin) shared assigned property. Good. |
| `updateStaffStatus` | `PATCH /staff/manage/:pid/:sid/status` | same | `managedStaff` requires staff assigned to property, not removed, `allowedTarget` (no self, no peer manager for managers). Good. |
| `editStaff` | `PATCH /staff/manage/:pid/:sid` | same | same + role whitelist; role change nulls refreshToken. Good. |
| `removeStaff` | `DELETE /staff/manage/:pid/:sid` | same | soft-remove (`staffRemovedAt`), clears tokens. Good. |

Cross-property tampering is properly blocked here; covered by `Backend/tests/staffManagement.integration.test.js` (`npm run test:staff`).

### Field validation FE vs BE
| Field | FE | BE | Gap |
|---|---|---|---|
| Invite fullname | non-empty | 2–120 chars | 1-char or >120 name → BE 400 with generic "All fields are required" (misleading). |
| Invite email | regex | same regex + lowercase + uniqueness (global) | Existing email in **another company** → "A user with this email already exists" → cross-tenant email enumeration (Low). |
| Invite role | chips (manager only for owner/admin) | same rule | OK. |
| Edit fullname | ≥2 (button disabled, no message) | 2–120 | No inline error; no max. |
| Edit contact | none | string ≤40 | >40 chars → generic 400 "Valid name, permitted role and contact are required". |
| Edit role | Select | whitelist | OK. |

### Findings
| # | Sev | File:line | Finding |
|---|---|---|---|
| T1 | Medium | `StaffManagement.jsx:114, 346` | Load failure only toasts; page then shows "No staff yet — Invite your first staff member" empty state. No ErrorState/Retry; misleading. |
| T2 | Medium | `StaffManagement.jsx:278-282` | Destructive hierarchy inverted: "Deactivate" uses `danger` variant while "Remove" (more destructive) is `secondary`. Remove also not disabled while that row's other action is in flight. |
| T3 | Medium | `StaffManagement.jsx:151` | Invite name has no 2–120 length check (see table); BE message is generic. Edit modal disables Save with no explanation. |
| T4 | Low | `StaffManagement.jsx:422` | Closing Invite (Cancel/Esc/backdrop) keeps previous values & errors; reopening shows stale data. No unsaved-changes guard. |
| T5 | Low | `StaffManagement.jsx:493` | Edit modal Role select has only `aria-label`, no visible label — inconsistent with other labelled fields. "Email changes require…" hint not tied via `aria-describedby`. |
| T6 | Low | `StaffManagement.jsx:255` | CSV status: invited members exported as "Inactive" while UI shows "Invited". |
| T7 | Low | `StaffManagement.jsx:366` | Card email has `overflow:hidden; textOverflow:ellipsis` but no `whiteSpace:nowrap` → long emails are clipped/wrapped without ellipsis. |
| T8 | Low | `StaffManagement.jsx` | While loading with existing data (refresh), list shows no indicator; Refresh button has no loading/disabled state → spam-click fires parallel requests. |
| T9 | Low | `StaffManagement.jsx` | No pagination for staff list (cards grid unbounded); fine for small hotels, slow for 200+. |
| T10 | Low | `StaffManagement.jsx` | Resend: rate-limited by `sensitiveOpLimiter`; 429 message surfaces, but Resend button gives no cooldown hint. |
| T11 | Info | `staffManagementController.js:85` | List requires `companyRole` in editable set; legacy users with only `role` ref (no `companyRole`) are invisible. |
| T12 | Info | — | Deactivation is immediate for HTTP (protect checks `isActive`) but live socket connections of the deactivated user are not disconnected. |

### Test checklist — Staff
- [ ] List loads for owner/admin/manager/hoteladmin; manager sees peer managers as "Protected role".
- [ ] Filters: search name/email, department, role, status tabs (counts match), Cards/Table toggle preserves filters.
- [ ] Invite valid → toast; row appears as Invited; email arrives with link; with SMTP misconfigured → warning toast (`emailDelivered=false`).
- [ ] Invite edge: empty name, 1-char name, 121-char name, invalid email, uppercase email, existing email same company, existing email other company, expired invite re-invite, manager role as manager (hidden) / as owner (allowed), double-click Send (button disabled).
- [ ] Resend on invited row; rapid resend → 429 handled.
- [ ] Edit: change name/contact/role; contact 41 chars → clear error; role change forces target to re-login (refresh token nulled).
- [ ] Deactivate → ConfirmDialog → target's next API call returns 403; Activate on invited → 409 message shown.
- [ ] Remove → row disappears; history kept; removed user can't log in.
- [ ] Tampering: call PATCH/DELETE with another company's propertyId or staffId → 404; manager targeting a property not assigned → 403; self-edit → 403.
- [ ] Network failure on load → should show error + retry (T1).
- [ ] Export CSV: invited status (T6), names with commas.
- [ ] 375px: card action row (Badge + Edit + Deactivate + Remove) wraps cleanly.

---

## 4. Billing & Payments (`#billing`)

Trace: `BillingManagement.jsx` → **hard-coded constants only** (`MOCK_INVOICES` line 51, transactions, methods, stats). No API calls. Real endpoints exist but unused: `reception.service.js getInvoices` → `GET /api/v1/reception/billing/invoices`, `getBillingSummary` → `/billing/summary`.

| # | Sev | File:line | Finding |
|---|---|---|---|
| B1 | **High (prod-readiness)** | `BillingManagement.jsx:45-75` | All figures are fake 2024 data, identical for every property; banner discloses it, but KPI "Total Revenue (YTD) Rs. 1,50,50,000" looks authoritative. Wire to `getInvoices`/`getBillingSummary` or hide section. |
| B2 | High (latent XSS) | `BillingManagement.jsx:135-150` | Print builds HTML via `w.document.write` with unescaped `invoice.guest`, `invoice.method`, etc. Harmless with constants; becomes stored-XSS in a same-origin popup once wired to real guest names. Escape or render via DOM text nodes. |
| B3 | Low | `BillingManagement.jsx` | Search resets? Search only on Invoices tab; switching tabs keeps search state; Transactions/Methods have no sort/pagination/export. |
| B4 | Low | invoice modal | 2-column detail grid is cramped at 375px; no invoice line items. |

Checklist: tab switching; search by id/guest/method; sort amount/date; pagination (8/page); Export CSV; View modal (Esc/backdrop/close button, focus return to eye icon); Print with popup blocker on (error toast) and off; dark mode badge contrast; after wiring: property scoping (`/billing/summary` uses company-wide filter, see R1).

---

## 5. Loyalty Points (`#loyalty`)

Trace: `LoyaltyManagement.jsx` → `reception.service.getGuestsList({limit:200})` → `GET /api/v1/reception/guests` (`receptionRoutes.js:318`, protect + `enforcePropertyScope` + authorize receptionist/manager/admin/owner) → `receptionController.getGuestsList` (~922).

| # | Sev | File:line | Finding |
|---|---|---|---|
| L1 | High | `LoyaltyManagement.jsx:62` vs `Backend/utils/pagination.js:10` | Requests 200 but backend caps at 100 and the page ignores `pagination`. Properties with >100 guests silently lose data; KPIs (Total Members, Points, Spending, Gold+) computed on the truncated list. Use `res.stats.total` and server pagination. |
| L2 | High | `receptionController.js:22-27, 929` | `getCtx` filter = `company ? {company} : {hotel}` → guest list is **company-wide**, not the active property. Multi-property owners see all hotels' guests in one property's dashboard; `hotelId` param ignored. |
| L3 | Medium | (S2) | `hoteladmin` role → 403. |
| L4 | Low | `LoyaltyManagement.jsx:145` | "Total Points Issued" is actually the sum of current balances (redeemed points excluded). Rename "Points Outstanding". |
| L5 | Low | `LoyaltyManagement.jsx:172` | Filter/search with no results shows "Guests appear here once they have bookings" — wrong message for a filtered empty state. |
| L6 | Low | — | Error shows both toast and EmptyState (double feedback). Read-only page: no adjust-points action (confirm intended). |
| L7 | Info (security, adjacent) | `receptionController.js:997` | `getGuestById` uses `Guest.findById` with no company/hotel filter → any receptionist+ can read another tenant's guest by id. Not called from hotel-admin but same router. |

Checklist: load/skeleton; tier tabs counts; search name/email/guestId; sort columns; pagination 12/page; >100 guests (L1); multi-property owner switches property → list changes? (L2); Refresh disabled while refreshing; error → Retry.

---

## 6. Reports & Analytics (`#reports`)

Trace: `ReportsAnalytics.jsx:50` `Promise.all([getReportsOverview, getBillingSummary, getRevenueSplit])` → `/reception/reports/overview` (manager/admin/owner), `/reception/billing/summary` (manager/admin/owner), `/reception/dashboard/revenue-split` (receptionist+) → `receptionController.js` ~1423, ~1314, ~318.

| # | Sev | File:line | Finding |
|---|---|---|---|
| R1 | High | `receptionController.js` getReportsOverview/getBillingSummary/getRevenueSplit | All use company-wide filter (`getCtx`) — occupancy, revenue, housekeeping are aggregated across every property in the company, not the active hotel. `getRevenueSplit` explicitly sums orders for all company hotels. |
| R2 | Medium | `receptionController.js:1471, 1480` | Fabricated/hard-coded values: `occupancy.previous = occupancy - 6`, `trend: "up"`, `noShow: 0`, `lateCheckout: 0` → "No-show"/"Late" badges can never appear. |
| R3 | Medium | `ReportsAnalytics.jsx:50` | `Promise.all` — any single 403/500 blanks the whole page (e.g. S2). Use `allSettled` and per-card errors. |
| R4 | Medium | getReportsOverview | Check-ins "completed" = bookings with status Checked-In and `updatedAt` today → any edit to an in-house booking counts as a check-in today. Revenue split uses booking `createdAt` this month (booking date, not stay/paid date); "Services" = takeaway orders only (mislabelled). |
| R5 | Low | `ReportsAnalytics.jsx` KPI | Occupancy trend `occupied/(occupied+available)` excludes maintenance/reserved while % uses totalRooms → numbers disagree. |
| R6 | Low | — | No date-range picker, no export, no charts over time; Refresh button gives no visual spinner. `stripHtml` regex is fine for display (React escapes). |

Checklist: load/skeleton; empty hotel (0 rooms → 0%, no NaN); Refresh; one endpoint failing (block via devtools) → page should degrade (R3); compare numbers with DB for a single property in a multi-property company (R1); dark mode bar contrast; 375px card grid.

---

## 7. Notifications (`#notifications`)

Trace: `NotificationsManagement.jsx` → `useNotifications()` → `core/context/NotificationContext.jsx` (initial `GET /api/v1/staff/notifications?limit=50`, socket subscriptions with proper unsubscribe cleanup, localStorage cache per user) → `notificationController.js`.

| # | Sev | File:line | Finding |
|---|---|---|---|
| N1 | Medium | `NotificationContext.jsx:267`, `NotificationsManagement.jsx:159-164` | "Clear All" only clears client state/localStorage; dialog says "permanently removed", but server notifications return on next reload/login. Add a server delete endpoint or reword. |
| N2 | Medium | `NotificationContext.jsx:260` | `markAllRead` / `markRead` API errors swallowed (`.catch(()=>{})`) → optimistic UI shows read, server keeps unread, badge returns after reload with no feedback. |
| N3 | Low | `NotificationsManagement.jsx` TABS | No tab for `ORDER_READY` ('order_ready') — "ready" notifications only appear in All/Unread. Server types like `guest_request`, `bill_received`, `system` have no tab/icon. |
| N4 | Low | — | Only latest 50 loaded; no "load more"/pagination. `timeAgo` returns "NaNd ago" for invalid dates. Notification cards not clickable to navigate (`actionUrl` ignored). |
| N5 | Low (a11y) | cards | Unread card `role="button"` without accessible description of action; unread dot `aria-label` on a non-interactive span (not announced reliably). |
| N6 | Info | `notificationController.js:88` | `createNotification` (receptionist+) accepts arbitrary `userId` with no company check → cross-tenant notification spam possible. Not called from hotel-admin. |

Checklist: initial load skeleton; mark single read (click + Enter/Space); Mark all read (disabled when 0); Clear → confirm → reload page (N1); filter tabs + empty states; live socket order event arrives while on page; sidebar badge count matches; offline → mark read → reload (N2); 200+ notifications.

---

## 8. Cross-cutting: Modal & ConfirmDialog UX audit

Two dialog implementations are mixed on these pages:
- `components/ui/Modal.jsx` (hotel-admin): portal, `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore, Esc, backdrop mousedown close, scroll lock, z-index 1000, `max-height: calc(100vh - 32px)`, scrollable body.
- `shared/components/ConfirmDialog.jsx` (global): **no portal, no `role="dialog"`/`aria-modal`/`aria-labelledby`, no Esc, no focus trap, no initial focus, no focus restore**, z-index 9999, uses global tokens (`--bg-card`, `isDark` from `useTheme`) instead of `--ha-*` → different radius (16 vs `--ha-radius-lg`), blur, colors, button styles from the hotel-admin modals.

| Check | Stock Add/Edit | Stock Adjust | Staff Invite | Staff Edit | Billing Invoice | ConfirmDialog (delete/deactivate/remove/clear) |
|---|---|---|---|---|---|---|
| Label + required indicator | Only Name has `*`; other fields implicitly required (qty, unit) — inconsistent | Label OK, no required | Name/Email `*`; Role uses manual `Role *` span (not `aria-hidden` like others, not a `<legend>`) | Name `*`; Role no visible label | n/a | n/a |
| Error placement | Inline under field (good) | None (Apply just disabled) | Inline (good) | None (Save disabled silently) | n/a | n/a |
| Disabled/loading submit | Yes ("Saving…") | **No** (I3) | Yes ("Sending…") | Yes | n/a | Yes (spinner) |
| Double-submit protection | Yes | **No** | Yes | Yes | n/a | Yes |
| Esc / backdrop close | Yes / Yes — **closes even while saving**, no unsaved guard | Yes | Yes, no guard, state retained | Yes | Yes | **No Esc**; backdrop yes (blocked while loading) |
| Focus trap / initial focus | Trap yes; initial focus lands on header **X** button, not first field | same | same | same | same | **None** |
| Focus restore | Yes | Yes | Yes | Yes | Yes | **No** |
| ARIA | Good | Type chips lack `aria-pressed` / radiogroup | Role chips have `aria-pressed` (good) | Role select aria-label only | Good | **Missing role/aria-modal/labelledby** |
| Small screens | lg modal grid → 1 column at 375 OK; `100vh` jumps on iOS Safari | OK | 2-col chip grid OK | OK | 2-col detail grid cramped | `padding:20px` OK |
| z-index | 1000 (above sidebar 60/100) | | | | | 9999 — fine, but stacking with a ha-modal would invert focus |
| Dark mode | `--ha-*` tokens OK | Filter-chip active state OK | OK | OK | Badge tones OK | Separate token set; verify `--bg-card-dark` contrast vs ha surfaces |

### Concrete improvement suggestions (in existing design style)
1. **Replace `ConfirmDialog` usage in hotel-admin with a `ConfirmModal` built on `ui/Modal`** (size `sm`, danger/info icon in `--ha-danger-bg` circle, footer `Button variant="secondary"` + `variant="danger"` with "Deleting…" label). Gives Esc, focus trap, aria, consistent tokens in one change.
2. **Modal `busy` prop**: when `busy` true, ignore Esc/backdrop/X and show spinner; pass `saving`/`actionLoading`. Add optional `isDirty` → "Discard changes?" inline confirm in footer before close.
3. **Initial focus**: focus first `input/select/textarea` in body (fallback to header X); add `initialFocusRef` prop.
4. Use `max-height: calc(100dvh - 32px)` with `100vh` fallback; at ≤480px make `.ha-modal` full-width bottom sheet (radius top only, footer sticky, buttons `block`).
5. **Consistent required markers**: mark all mandatory fields (`Quantity`, `Unit`, `Category`) with `required`; add a "* Required" hint in modal footer-left; render Staff Invite "Role" as `<fieldset><legend class="ha-field__label">`.
6. **Show errors instead of silently disabling**: Staff Edit name (`"Name must be 2–120 characters"`), Stock Adjust qty (`"Enter 0 or more"`, `"Exceeds on-hand (8 kg); will set to 0"`).
7. Stock Adjust: wrap in `<form>` so Enter applies; type chips as `role="radiogroup"` / `aria-checked`; add optional "Reason" textarea for audit.
8. Staff actions: Remove → `variant="danger"` ghost/outline, Deactivate → `secondary`; on cards collapse secondary actions into a "More" menu at <480px.
9. Stock table at <768px: switch to card list (name, qty bar, status badge, 3 icon buttons) like Staff cards view; keep `minWidth` table ≥768.
10. Error states: Staff and Loyalty should use `ErrorState` with Retry (as Stock/Reports do) instead of toast + empty state.

### Responsiveness checks (375 / 768 / 1024 / 1440)
- 375: topbar visible; PageHeader actions wrap (Stock: Export + Add; Staff: Refresh + Export + Invite — 3 buttons overflow?); toolbars (search + select + segmented) wrap; KPI grid 1 col; tables scroll horizontally (880/720/680px min widths); modals fit; ConfirmDialog fits.
- 768: icon rail (72px) — tooltips via `title`; theme toggle missing when collapsed (S5); KPI 2 cols.
- 1024: full sidebar 260px; KPI 4 cols but Stock has 5 cards (auto-fit minmax(180px) override) → check wrap.
- 1440: Notifications page constrained to 860px centered (intentional); others full width — check table readability.

---

## 9. Top findings summary (severity-ordered)
1. **Critical** — Stock/Inventory is 100% client-side mock with no backend model/route/auth; edits lost on refresh and shared across users in a tab (I1, I2).
2. **High** — Logout does not revoke server session/refresh cookie (S1).
3. **High** — `hoteladmin` role admitted by FE but rejected (403) by all reception endpoints → Reports & Loyalty broken for that role (S2).
4. **High** — Reports, Billing summary, Revenue split, and Loyalty guest list are company-wide, not scoped to the active property (R1, L2); Loyalty silently truncated at 100 (L1).
5. **High** — Billing page is fully hard-coded mock data; print uses unescaped `document.write` (latent XSS) (B1, B2).
6. **High** — Stock Adjust has no double-submit protection (I3).
7. **Medium** — Shared `ConfirmDialog` lacks dialog semantics, Esc, focus trap and uses a different design token set; Modal closes during save and has no unsaved-changes guard.
8. **Medium** — Staff page load errors masquerade as "No staff yet"; validation mismatches (name 2–120, contact ≤40) produce generic BE messages; destructive button hierarchy inverted.
9. **Medium** — Notifications "Clear" is client-only despite "permanently removed" copy; mark-read failures swallowed.
10. **Medium** — Reports show hard-coded/fabricated metrics (previous occupancy, no-show, late checkout) and fail entirely if one of three requests fails.

Verified by reading code only; no app run, no API calls, no tests executed. Staff-management backend scoping is covered by `Backend/tests/staffManagement.integration.test.js` (`cd Backend && npm run test:staff`) — not run here.
