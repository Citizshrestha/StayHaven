# Master prompt 02: Hotel admin dashboard (session name: `hoteladmin`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven HOTEL ADMIN dashboard. Other agents are working on the
other dashboards at the same time. Test every hotel-admin page end to end in a real browser (Playwright) against the
running app, fix what you find in files you own, re-test, and report.

# READ FIRST (mandatory, in this order)
1. d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
   Your row: session 02, name `hoteladmin`, worktree .worktrees\qa-hoteladmin, branch qa/hoteladmin, API 3001, web 5174,
   DB stayhaven_qa_hoteladmin.
2. d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-master-prompt.md. This is your DETAILED checklist:
   Part 1 (known bugs with file:line) and Part 2 sections 4–10 (edge-case matrix, per-page checklists 5.1–5.13, security
   matrix, validation parity, modal/form UX list, fix order). Treat every [K] item as "confirm in the browser, then fix".
3. The audits in d:\hotel-booking-order-management-system\.agents\tasks\hotel-admin-audit\01..05-*.md.

# OVERRIDES TO THE OLD MASTER PROMPT (parallel mode)
- Ignore its sections 0–3 and 11–12 (setup/cleanup/report). Use rules A, K and J from 00-common-rules.md instead.
- Ownership: you edit only frontend\src\features\staff\hotel-admin\** and the backend files listed for 02 in rules B
  (roomController, hotelTableController, menuController, seedHotelAdminData, staffManagementController, roomRoutes,
  tableRoutes, seedRoutes). Items in the old prompt that touch files you DON'T own become REQs:
  - StaffAuthContext logout, client.js interceptors/isStaffRequest, the proactive refresh timer, SocketContext re-auth,
    NotificationContext, ConfirmDialog, BillPreviewModal, App.jsx routes, ProtectedStaffRoute, staffController login
    redirects, orderController (cancel `next`, regex search, status machine), middleware\upload.js multer errors,
    utils\csv.js (if it's shared) and models\room.schema.js changes → file REQs to 01 (platform).
  - receptionController company-wide aggregates (Dashboard, Reports, Loyalty, Billing endpoints) → file REQs to 03 (reception),
    with the exact property-scoping you need. Keep the frontend calls you own correct either way.
- You still own the switch of the hotel-admin services (roomApi, tableApi, menuApi, orderApi, staffApi) from their own axios
  instances onto core\api\client.js. Do it once 01 confirms client.js covers your prefixes (or do it now if it already does).
- The `HOTEL_ADMIN_ROLES = ['owner','hoteladmin','admin','manager']` decision: apply it in the backend files you own and in
  hotel-admin UI gates. Request the same constant for the route guard and shared authorize() lists from 01.
- The Stock backend is still not to be built without user approval (it stays in Remaining).

# ESSENTIAL FEATURES THAT MUST WORK (smoke list; run it first, then the detailed checklists)
Login as owner/hoteladmin/admin/manager → lands on /hoteladmin-dashboard · every sidebar section loads with real data
for the ACTIVE property · Add/Edit/Delete room with defaults · menu item CRUD with image upload · table create + batch
create · table QR and room QR show a real, scannable image; download/print works; regenerate invalidates the old token ·
orders list updates live when a guest orders by QR · staff invite/edit/deactivate · billing shows real invoices · reports
numbers match the DB · notifications mark-read · logout.

# SECURITY FOCUS (P0)
assertHotelAccess owner/null-company bypass (rooms, tables, menu); GET /api/v1/tables and /rooms with no access check;
the seed endpoint with `?clear=true` on any hotel (assert access + block when NODE_ENV=production + hide the button in prod builds);
room mass-assignment (rating/hotel/company); print HTML escaping (Table QR, Room QR, Billing); CSV formula injection in
hotel-admin exports; uniqueToken/qrCode* stripped from non-QR list responses. Add tenancy + validation regression tests in
Backend\tests\hotelAdmin*.integration.test.js.

# MOBILE + VISUAL (rules F/G, on top of the old section 8)
- Phone (360/375/390/412): the sidebar becomes a drawer (or bottom nav) with a focus trap, Esc and backdrop close; the topbar shows
  the section title, theme toggle and notifications; KPI cards stack 1–2 per row with no truncated numbers; Rooms, Menu, Tables,
  Orders, Staff, Billing and Loyalty tables become cards at < 640 px with actions in a ≥ 44 px overflow menu; filters collapse
  into a "Filters" sheet; search stays visible; pagination is touch friendly.
- Every hotel-admin modal (room, menu, table, batch, QR view, order detail, cancel, stock add/adjust, staff invite/edit,
  invoice) is a bottom sheet at ≤ 480 px with a sticky footer and keyboard-safe submit; the image dropzone works with the
  mobile camera/file picker.
- QR print/download from a phone: downloading the PNG works on mobile Chromium/WebKit; print output is A4 and also fine on mobile.
- Tablet 768/1024: a collapsed rail with tooltips, two-column forms, no horizontal scroll on Orders.
- The hotel-admin tokens are the REFERENCE design system for all dashboards. Polish them so they set the bar
  (spacing, hierarchy, status colours, states) and document the final token set in your report.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\hoteladmin-report.md (format: rules J, plus
the old prompt's per-page table rows: Login/Shell, Dashboard, Rooms, Restaurant-Menu, Restaurant-Tables/Kitchen, Table QR,
Room QR, Orders, Stock, Staff, Billing, Loyalty, Reports, Notifications).
```
