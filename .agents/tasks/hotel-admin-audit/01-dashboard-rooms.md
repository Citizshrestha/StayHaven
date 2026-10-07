# Hotel Admin Audit — Dashboard + Rooms

Scope: `/hoteladmin-dashboard` shell, `#dashboard` (DashboardHome), `#rooms` (RoomManagement), room endpoints, dashboard data endpoints, seed endpoint, and room availability. Read-only investigation. Line numbers are from the current working tree.

## 0. Feature map (page → API → backend)

| Page / action | Frontend | Service fn | Endpoint | Backend |
|---|---|---|---|---|
| Route guard | `frontend/src/app/App.jsx:342-346` | — | — | `ProtectedStaffRoute` allowedRoles `owner, hoteladmin, admin, manager` |
| Shell + hash nav | `pages/HoteladminDashboard.jsx` | — | — | — |
| Dashboard KPIs | `pages/DashboardHome.jsx:50-66` | `getReportsOverview`, `getBillingSummary` (`core/api/services/reception.service.js:80,96`) | `GET /api/v1/reception/reports/overview`, `GET /api/v1/reception/billing/summary` | `receptionRoutes.js:403-411, 708-711` (`authorize("manager","admin","owner")`, `enforcePropertyScope`) → `receptionController.js:1315, 1423` |
| Seed sample data | `DashboardHome.jsx:72-90` | `seedHotelAdminData` (`seed.service.js`) | `POST /api/v1/seed/hotel-admin-data/:hotelId[?clear=true]` | `seedRoutes.js:45` (`authorize('admin','owner','superadmin')`) → `seedHotelAdminData.js` |
| Rooms list | `RoomManagement.jsx:84-101` | `getRooms({hotelId})` (`hotel-admin/services/roomApi.js`) | `GET /api/v1/rooms?hotelId=` | `roomController.getRooms` |
| Create / Edit / Delete room | `RoomManagement.jsx:208-245` | `createRoom`, `updateRoom`, `deleteRoom` | `POST /rooms`, `PUT /rooms/:id`, `DELETE /rooms/:id` | `roomController.createRoom/updateRoom/deleteRoom` |
| View room | `RoomManagement.jsx` (`openEdit(room, true)`) | none (uses list row) | — | — |
| Availability | not used by any hotel-admin UI | `getRoomAvailability` (roomApi.js:64) | `GET /rooms/:id/availability?month=` (PUBLIC) | `roomController.js:561` |
| Room images / amenities / capacity | NOT exposed in UI (amenities kept in state only) | — | `images`, `amenities`, `capacity` accepted by create/update | no upload route exists for rooms |
| Bookings | no bookings list in hotel-admin; dashboard shows counts only | — | — | — |

Role model reminder: backend reads `req.user.role.name || req.user.companyRole`. Role enum includes `hoteladmin`, but almost no room/reception/seed gate lists it.

---

## 1. Findings (severity ordered)

### CRITICAL

**C1. Room type enum mismatch — "Add Room" fails with the default form.**
`RoomManagement.jsx:51` defaults `type: 'Standard'`; options at `:431-435` are `Standard, Deluxe, Suite, single, double`. Backend enum (`Backend/models/room.schema.js` `type.enum`) is `single, double, suite, deluxe, villa, Standard Twin, Standard Queen, Deluxe King, Executive Suite, Ocean View, Presidential Suite, Garden View`. `Standard`, `Deluxe`, `Suite` are rejected → Mongoose `ValidationError` → 400 (prod message: "Invalid input data. Please check your entries."). Only Single/Double save. Editing a seeded room of type `deluxe`/`suite`/`villa` renders a controlled `<select>` whose value matches no option, so the browser displays "Standard" while state keeps the real value (View mode shows the wrong type).
Fix: share one source of truth for room types (export enum from backend or a constant), use label/value pairs, and include all backend values.

**C2. Cross-tenant IDOR on every room endpoint (owner role / null company).**
`roomController.js:40` — `if (role !== "owner" && userCompany && hotel.company !== userCompany)`. Consequences:
- Any user with role `owner` from company A can list/create/update/delete rooms and generate/toggle QR of any hotel in company B by supplying `hotelId` or a room `:id`.
- Any authenticated user with no `company` (e.g. a guest/user token — routes only require `isAuthenticated`) skips the company check entirely; `getRooms`, `getRoomById`, `getRoomQRDownload` have no role gate, so a guest can enumerate rooms of any hotel including `uniqueToken`, `qrCodeData`, `qrCodeImage` (room QR tokens let anyone order to that room).
- `manager` is never restricted to `assignedProperties` (only `receptionist` is, `:35`), so a manager can touch every hotel in the company.
Fix: require `hotel.company === user.company` for every role; require `assignedProperties` membership for manager/hoteladmin; add `authorize(...)` staff roles on the router; strip `uniqueToken/qrCode*` from list responses for non-QR views.

**C3. Seed endpoint has no hotel ownership check and can wipe data.**
`seedHotelAdminData.js:23,53` loads any `hotelId` and, with `?clear=true`, `deleteMany` rooms, menu items, tables, orders, bookings, invoices, payment transactions. Only `authorize('admin','owner','superadmin')` is applied (`seedRoutes.js:33`); no company/property check, no `NODE_ENV` block. An owner of hotel A can destroy hotel B's bookings and invoices. The "Seed sample data" button is permanently visible in the production dashboard header (`DashboardHome.jsx:150-155`).
Fix: assert hotel access, block in production (or behind a feature flag), hide the button outside dev / when data exists.

### HIGH

**H1. Role gates inconsistent with the frontend route guard → whole pages 403 for allowed roles.**
- `admin` role: `assertHotelAccess` throws 403 "Superadmins cannot access hotel-specific operational data" (`roomController.js:22`) → Rooms page always errors for `admin`, though the route allows it.
- `hoteladmin` role: not in `['owner','admin','manager']` for create/update/delete (`roomController.js` createRoom/updateRoom/deleteRoom role checks) → 403 on every mutation; not in reception `authorize(...)` → Dashboard 403; not in seed authorize → seed 403.
- `manager`: seed button shown but 403.
Fix: define one `HOTEL_ADMIN_ROLES` list used by the route guard, backend `authorize`, and UI capability checks; hide actions the role cannot perform.

**H2. Dashboard data is company-wide, not property-scoped.**
`receptionController.js:1318, 1427` — `filter = company ? { company } : hotel ? { hotel } : {}`. Since staff always have a company, occupancy, rooms-by-type, check-ins/outs, revenue, invoice count, guests and activity aggregate across ALL properties in the company, ignoring the `hotelId` the client sends. `enforcePropertyScope` bypasses owner/admin/manager anyway. The Dashboard total rooms can differ from the Rooms page for the same property. Also `Guest.countDocuments` filters by company only.
Fix: filter by `hotel` (validated against user access) and fall back to company only for explicit "all properties" views.

**H3. Rooms API client has no 401 refresh.**
`hotel-admin/services/roomApi.js` creates its own axios instance with only a bearer + CSRF interceptor; it does not use `core/api/client.js` refresh logic. After the access token expires, Rooms shows "Not authorized, token expired" with Retry that can never succeed, while Dashboard (axiosClient) silently refreshes. Fix: use `axiosClient` (and add `/api/v1/rooms` to its `isStaffRequest` list so the staff token is chosen).

**H4. Rooms page re-fetches (with full skeleton) on every shell re-render.**
`HoteladminDashboard.jsx:101` passes an inline `onCount={(n) => setRoomCount(n)}`; `RoomManagement.jsx:101` lists `onCount` in `fetchRooms` deps, and the effect runs on every new `fetchRooms`. Any parent render (notification `unreadCount` change, opening the mobile drawer, collapsing the rail, room count change) triggers a non-silent reload → table flashes to skeleton, sort/page preserved but scroll jumps; at least two fetches on first mount. Same pattern for `OrderManagement onActiveCount` (`:109`). Fix: pass `setRoomCount` directly or wrap in `useCallback`; keep `onCount` in a ref.

**H5. Inconsistent hotel id between pages.**
Rooms uses `useHotelId()` (activeProperty → assignedProperties[0] → sessionStorage). Dashboard services use `reception.service.js:5-20` `getActiveHotelId()` which only reads `sessionStorage.activeProperty`. A user without `activeProperty` sees Rooms for property X and a Dashboard for "first assigned"/company scope. Combine with H2.

**H6. Backend accepts invalid room data (no server-side validation).**
`createRoom`/`updateRoom` pass body fields straight to Mongoose; schema has no `min` on `price`, `floor`, `maxGuests`, `capacity`, no max length on `roomName`/`description`, no format on `roomNumber`. Via API: negative price, `maxGuests: 0`, decimals, 1 MB description are all saved. Frontend checks are only: number/name required, price ≥ 0, maxGuests ≥ 1 (`RoomManagement.jsx:185-203`); floor unvalidated.
Field matrix:

| Field | Frontend | Backend | Gap |
|---|---|---|---|
| roomNumber | required, client dup check (case-insensitive) | required, dup check case-sensitive + unique index `{hotel, roomNumber}` | `A1`/`a1` allowed server-side; no length/charset limit |
| roomName | required | required, trim | no max length |
| type | select (wrong values, C1) | enum | see C1 |
| price | required, ≥0 | required Number | negative/0/huge/decimal allowed server-side; 0 allowed client-side |
| floor | `min=1` attr only | Number default 1 | 0, negative, decimal, empty (→ null) accepted |
| maxGuests | ≥1 | Number default 2 | no max, decimals, 0 via API |
| bedType | select | enum | ok |
| status | select (4 values) | enum incl. `reserved` | `reserved` missing from UI |
| description | none | trim | no length limit |
| amenities/images/capacity | not editable | accepted raw | arbitrary arrays/URLs via API |
| rating, lastCleaned | not in UI | in `allowedFields` (`roomController.js:489-492`) | admin can set guest-facing `rating` via API (mass-assignment) |

**H7. Manual status edits break booking integrity.**
`updateRoom` lets the admin set `occupied`/`available` with no booking check and no `reservationVersion` bump. Setting a checked-in room to `available` makes it bookable; setting `occupied` without a booking inflates occupancy. Fix: restrict admin status to `available/maintenance/cleaning`, derive `occupied/reserved` from bookings, or warn + check active bookings.

### MEDIUM

- **M1. Fake "Cleanliness" column.** Room schema has no `cleanliness` field; `RoomManagement.jsx:373-374` and CSV `:255` always render "Clean". Use `HousekeepingTask` / `lastCleaned` or remove the column.
- **M2. CSV formula injection.** `utils/csv.js` quotes commas/quotes but does not neutralize cells starting with `= + - @ \t \r`. A room name `=HYPERLINK(...)` executes in Excel. Prefix such cells with `'`.
- **M3. Dashboard partial-failure handling.** `DashboardHome.jsx:52` uses `Promise.all`; if billing fails the whole page becomes an ErrorState and the seed button disappears. Use `Promise.allSettled` and per-card errors.
- **M4. Wrong KPI drill-downs.** "Check-ins Today" navigates to `orders` (`:197`), "Current Guests" to `loyalty` (`:215`). No bookings/front-desk section exists in hotel-admin; either link to reception or make non-clickable.
- **M5. Inaccurate check-in/out metrics.** `receptionController.js:1427+` counts "completed" by `status: Checked-In` + `updatedAt` today (any later update of an older booking counts), while "today" counts `checkIn` date today → `pending = today - completed` can go negative and render "-2 pending". `occupancy.previous = occupancy - 6` and `trend: "up"` are hard-coded (not rendered here but returned).
- **M6. Status filter/KPIs ignore `cleaning` and `reserved`.** Filter tabs (All/Available/Occupied/Maintenance) and stats skip them; such rooms are only reachable via "All" and the KPI tiles don't sum to Total.
- **M7. Delete ConfirmDialog is not accessible and off-system.** `shared/components/ConfirmDialog.jsx`: no `role="alertdialog"`, no `aria-modal`/`aria-labelledby`, no Esc, no focus trap/initial focus/restore, rendered inline (not a portal) outside `.hotelAdminShell` tokens, uses `useTheme().isDark` + `--bg-card` instead of `--ha-*`. Visually different radius (16px), shadow, buttons from the ha Modal.
- **M8. Sidebar badges are stale.** `roomCount` starts at 0 until Dashboard or Rooms loads; `activeOrders` is never set by Dashboard (`onStats` only sends `totalRooms`, `DashboardHome.jsx:59`), so the Orders badge stays 0 until the Orders page is visited.
- **M9. Availability endpoint (unused by UI but in scope).** Public (`roomRoutes.js:25`), no hotel check, uses server-local `new Date(y, m-1, 1)` + `toISOString()` (`roomController.js:620`) → off-by-one dates when server TZ ≠ UTC (e.g. Nepal +05:45); `month=2026-13` passes regex and rolls into next year; `maintenance` status applies to every future date.
- **M10. Delete has no guard for orphans.** Only active bookings block deletion; rooms with open orders/dining sessions/QR in use are deleted outright, orphaning references. Consider soft-delete (`isActive:false`) or checking open orders.
- **M11. Seeded data quality.** Seeded prices 120–500 shown as "Rs." (USD-like values); seeding staff uses `companyRole: 'chef'` which is not in the user enum (`seedHotelAdminData.js:197,204`) → that insert fails/partially seeds.

### LOW

- **L1.** Enter key doesn't submit: footer buttons are outside `<form>` (`RoomManagement.jsx:426`) and no submit button inside → no implicit submission. Use `form="room-form"` + `type="submit"` on the footer button.
- **L2.** Modal Esc/backdrop/X close without unsaved-changes guard and while `saving` (`:410`); close during save then reopening shows stale `saving` state briefly.
- **L3.** Modal initial focus lands on the header close button, not the first field; after validation failure focus is not moved to the first invalid field; each field error is `role="alert"`, so several errors are announced at once.
- **L4.** Search/filter change doesn't reset page to 1 (`useTableControls` only clamps when out of range).
- **L5.** Silent refetch failure after a mutation replaces the populated table with ErrorState (`:322`) while KPI tiles still show old data.
- **L6.** `Textarea`/`Select` don't emit `aria-required`; `Input` drops native `required` (only `aria-required`) — fine, but inconsistent.
- **L7.** Recent-activity divider logic `i < 7` (`DashboardHome.jsx:290`) leaves a bottom border on the last row when fewer than 8 items.
- **L8.** `.ha-modal` uses `max-height: calc(100vh - 32px)`; on iOS Safari the toolbar hides the footer. Use `100dvh`.
- **L9.** Body scroll lock targets `document.body`, but the real scroller is `.ha-shell__content`; background can still scroll on touch devices.
- **L10.** Sidebar hotel name falls back to the admin's full name when `activeProperty` isn't populated (`Sidebar.jsx`), which reads as a hotel name.
- **L11.** `getRooms` returns all rooms unpaginated with full documents (QR base64 images included) — payload grows quickly (each `qrCodeImage` can be several KB). Use `.select()` for the list.
- **L12.** No optimistic concurrency: two admins editing the same room → last write wins silently.

### Not present (flag as gaps, not bugs)
- No room image upload/gallery, amenities editor, or capacity (adults/children) editor in hotel-admin, though backend accepts them and guest-facing pages likely display them.
- No room-type/rate-plan management (types are a hard-coded enum), no seasonal pricing, no availability calendar view for admins, no bookings list for hotel admin.
- No socket listeners in Dashboard/Rooms (no cleanup issue; but also no live refresh — room status changes by reception don't appear until reload).

---

## 2. Per-page test checklist

Test accounts: one per role `owner`, `admin`, `hoteladmin`, `manager` (+ a `receptionist` and a guest user for negative tests); two companies (A, B), company A with two hotels (A1, A2).

### 2.1 Shell / routing (`/hoteladmin-dashboard`)
- [ ] Unauthenticated → redirect `/staff/login`. Receptionist/waiter/chief → redirected to their dashboards.
- [ ] Each allowed role (owner/admin/hoteladmin/manager) loads Dashboard and Rooms without 403 (currently fails for admin/hoteladmin — H1).
- [ ] Deep link `#rooms`, `#dashboard`, invalid `#foo` (→ dashboard), browser back/forward between sections.
- [ ] Legacy `/roommanagement` redirects to `#rooms`.
- [ ] Sidebar badges: Rooms badge correct on first load without visiting Rooms; Orders badge correct from Dashboard (M8).
- [ ] Mobile 375: hamburger opens drawer, backdrop click closes, navigation closes drawer, Esc closes drawer (currently no Esc handler), focus moves into drawer.
- [ ] Tablet 768–1023: rail collapse/expand, tooltips on collapsed items.
- [ ] Theme toggle: switch light/dark on each page; modals portal inherit theme.
- [ ] Logout clears session and back button doesn't reopen dashboard.
- [ ] Token expiry: expire access token, then use Dashboard and Rooms — both should refresh transparently (Rooms fails today — H3).
- [ ] Notification arrives while on Rooms with modal open → table must not flash/reload (H4).

### 2.2 Dashboard (`#dashboard`)
- [ ] Loading skeleton shown, then KPIs.
- [ ] Values match DB for the SELECTED property only (create data in A1 and A2; A1 dashboard must not include A2 — H2).
- [ ] Occupancy % = occupied/total of that property; 0 rooms → 0% and "no data" helper card.
- [ ] Rooms by Type bars: types with 0 occupied, 100% occupied, many types (wrapping/long names).
- [ ] Check-ins/outs: booking checked-in yesterday but updated today must not count as today's check-in; pending never negative (M5).
- [ ] Revenue = paid invoices for this property; currency label consistent with Rooms (NPR/Rs.).
- [ ] Recent activity: 0, 3, 8+, HTML in description (stripped), very long description wraps.
- [ ] Billing endpoint fails (simulate 500) → rest of dashboard still renders (M3).
- [ ] Overview fails → ErrorState → Retry works.
- [ ] KPI tiles keyboard-activatable (Tab + Enter/Space) and navigate to the correct section (M4).
- [ ] Seed: hidden in production; owner of hotel A cannot seed/clear hotel B via API (C3); double-click Seed only fires once; after seeding Rooms badge updates.
- [ ] Manager/hoteladmin: seed button hidden or works (H1).
- [ ] "Sales Trend — Coming soon" card renders correctly in both themes.

### 2.3 Rooms (`#rooms`)
List / toolbar
- [ ] Empty property → "No rooms yet" + Add Room CTA.
- [ ] Search by number, name, type; case-insensitive; whitespace-only query; special chars (`(`, `*`) don't break; no matches → "No matching rooms" without CTA.
- [ ] Filter tabs counts correct; rooms in `cleaning`/`reserved` appear somewhere sensible (M6).
- [ ] Sort each column asc/desc; numeric room numbers sort naturally (101 < 1001); price sort numeric.
- [ ] Pagination: 0, 10, 11, 25, 100+ rooms; page resets when filter/search changes (L4); delete last item on last page moves back a page.
- [ ] KPI tiles sum consistent with total.
- [ ] Cleanliness column reflects real housekeeping state (M1).
- [ ] Export: exports filtered set; Excel opens Unicode names (Devanagari) correctly; name `=1+1` is not executed (M2); empty → info toast.
- [ ] Rooms fetch error → ErrorState → Retry.

Create
- [ ] Create with default form values succeeds (fails today — C1). Create one room of each type option.
- [ ] Required: empty number, empty name, empty price → inline errors; focus moves to first error.
- [ ] Duplicate room number (same case, different case, trailing spaces) → inline error; concurrent duplicate create from two tabs → second gets a clear 400 message.
- [ ] Price: 0, negative, `1e5`, decimals `99.99`, very large `99999999`, letters → appropriate errors; backend rejects negative via direct API call (H6).
- [ ] Floor: 0, negative, decimal, empty; maxGuests: 0, 1, 50, decimal.
- [ ] Description 5,000+ chars; HTML/script in name/description is stored sanitized and rendered as text.
- [ ] Double-click Create → only one room created; Enter key in a field submits (L1).
- [ ] Success: toast, modal closes, list refreshes silently, sidebar badge increments.
- [ ] Network error/500 → toast with message, modal stays open with data intact.

Edit / View
- [ ] View shows correct type for seeded types (`deluxe`, `suite`, `villa`, `Deluxe King`) — C1.
- [ ] Edit changes each field; change room number to an existing one → error.
- [ ] Change status to `occupied`/`available` for a room with a checked-in booking → blocked or warned (H7).
- [ ] Edit a room deleted in another tab → 404 handled with toast and list refresh.
- [ ] Esc / backdrop / X with unsaved changes → confirm discard (L2).

Delete
- [ ] Delete room with Pending/Confirmed/Checked-In booking → 400 message shown in toast.
- [ ] Delete free room → removed, badge decrements.
- [ ] Double-click confirm → one request; Esc/Cancel closes; focus returns to trash button (M7).

Security (API-level, use curl/Postman)
- [ ] Owner of company B: `GET /api/v1/rooms?hotelId=<A1>`, `PUT/DELETE /api/v1/rooms/<A1 room id>` → must be 403 (C2).
- [ ] Guest/user token: `GET /api/v1/rooms?hotelId=<any>`, `GET /rooms/:id/qr-download` → must be 403 (C2).
- [ ] Manager assigned only A1 → A2 rooms 403.
- [ ] Hoteladmin: create/update/delete allowed for assigned property (H1).
- [ ] `PUT /rooms/:id` with `{ rating: 5, hotel: "<other>", company: "<other>" }` → rating ignored for non-superadmin, hotel/company unchanged.
- [ ] Invalid ObjectId (`/rooms/abc`) → 404, no stack trace in prod.
- [ ] Rate limits: 101st write/hour returns 429 and UI shows the message.
- [ ] CSRF: mutation without `X-CSRF-Token` rejected.

---

## 3. Modal UX audit

### 3.1 Room Create/Edit/View modal (`components/ui/Modal.jsx` + `RoomManagement.jsx:408-455`)

| Check | Status | Suggestion (existing ha design tokens) |
|---|---|---|
| Spacing | Good: 24px body, 16px grid gap, 20/24 header | Group fields into sections ("Identity", "Pricing & capacity", "Status", "Description") with `ha-h3` subheads and 24px section gap |
| Labels / required | `*` on Number, Name, Type, Price; consistent | Add helper text under Price ("per night, NPR") and Room Number ("must be unique") using `ha-small` + `--ha-text-subtle` |
| Error placement | Inline under field, icon + text | Add a top summary banner for server errors instead of only a toast; focus first invalid field |
| Submit loading / disabled | "Saving…" + disabled | Add spinner icon (`Loader2`) consistent with ConfirmDialog; disable Close X/Esc/backdrop while saving |
| Double-submit | Prevented by disabled button only | Add `if (saving) return` guard in `handleSubmit` |
| Enter to submit | Broken (L1) | `<form id="room-form">` + footer `<Button type="submit" form="room-form">` |
| Esc / backdrop | Close immediately, no dirty check | Track `isDirty` (compare to initial snapshot); show ha-styled "Discard changes?" confirm |
| Focus trap | Present; restores focus | Initial focus → first enabled input (`data-autofocus`), not the X button |
| ARIA | `role=dialog`, `aria-modal`, `aria-labelledby` | Add `aria-describedby` for subtitle; view mode title "Room 101 — details" |
| Keyboard | Tab cycles; selects native | OK |
| View mode | Disabled inputs (low contrast, looks broken in dark mode) | Render a read-only definition list (`ha-body-strong` label / value) with an "Edit" button in footer |
| Small screens | Grid collapses to 1 col at 375 | `max-height: calc(100dvh - 32px)`; on <640px make modal full-screen sheet (radius top only, sticky footer, `padding-bottom: env(safe-area-inset-bottom)`) |
| z-index | Overlay 1000 > sidebar 60/topbar 40/backdrop 55; toasts above | Define tokens `--ha-z-modal`, `--ha-z-toast` in `hotel-admin-tokens.css` |
| Contrast | Tokens defined for light/dark (`.dark .hotelAdminShell`) | Verify disabled input text and `--ha-text-subtle` (#94a3b8 on #1a1f2e) meet 4.5:1 for helper text |
| Missing fields | amenities/images/capacity absent | Add amenities chip multi-select, capacity adults/children steppers, image uploader (drag-drop, preview grid, 5 MB limit, reorder, remove) matching RestaurantManagement's file input pattern but styled |
| Type select | Wrong values (C1) | Driven by shared constant with human labels |

### 3.2 Delete ConfirmDialog (`shared/components/ConfirmDialog.jsx`)
- Missing: `role="alertdialog"`, `aria-modal`, `aria-labelledby/-describedby`, Esc close, focus trap, initial focus on Cancel, focus restore, portal. Click-outside closes even mid-delete? (blocked by `loading` — good).
- Visual mismatch with ha Modal (16px radius, different shadow/buttons, `--bg-card` vs `--ha-surface`, z-index 9999).
- Suggest: rebuild as `ha` `Modal size="sm"` with danger icon tile (`--ha-danger-bg`), body text including room number and name, warning if room has history, footer `Button variant="secondary"` + `Button variant="danger"` with spinner. Consider type-to-confirm for rooms with past bookings.

### 3.3 Mobile drawer (shell)
- No Esc handler, no focus trap, focus not moved into drawer, page behind still tabbable. Add `inert` on main when open, Esc to close, return focus to hamburger.

### 3.4 Dashboard visuals
- Seed helper card and header button both shown at once (duplicate CTAs) — keep one.
- KPI icon gradients are hard-coded hex (`#6366f1` etc.) rather than tokens; fine in light mode, check dark contrast.
- Rooms-by-type bars have no text alternative beyond numbers (OK) — add `role="progressbar"` with `aria-valuenow`.
- Responsive check at 375/768/1024/1440: KPI grid 1→2→4 columns; body 1→2 columns at 1024; activity time `nowrap` may overflow at 375 with long relative times — allow wrap under description on <480px.

---

## 4. Suggested fix order
1. C1 type enum, C2 room access checks, C3 seed scoping/prod block.
2. H1 unified role list, H2 hotel-scoped dashboard, H3 shared axios client, H4 stable callbacks, H5 single hotel-id resolver.
3. H6 server validation (express-validator or schema `min`/`maxlength`), H7 status rules.
4. Medium items, then modal UX polish (shared ha ConfirmDialog, dirty-guard, full-screen mobile sheet, image/amenity editors).
