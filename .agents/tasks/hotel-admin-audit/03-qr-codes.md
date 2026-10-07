# 03 — Table QR Codes + Room QR Codes (Hotel Admin) — Read-only Audit

Scope: `#tables` (TableManagement.jsx) and `#roomqr` (RoomQRManagement.jsx) in the hotel-admin dashboard, plus the duplicated tables tab inside RestaurantManagement.jsx.
Nothing was modified. No secret values were read out. The only `.env` check was whether `FRONTEND_URL` is set, where it points (localhost or not), and its format.

## 1. Trace map

| Layer | Table QR Codes | Room QR Codes |
|---|---|---|
| Route | `/hoteladmin-dashboard#tables` (App.jsx:342, `ProtectedStaffRoute allowedRoles=['owner','hoteladmin','admin','manager']`); legacy `/tablemanagement` redirects (App.jsx:352) | `/hoteladmin-dashboard#roomqr`; legacy `/roomqrmanagement` (App.jsx:353) |
| Shell | HoteladminDashboard.jsx:105 → `<TableManagement embedded />` (sidebar "Table QR Codes", Sidebar.jsx:125) | HoteladminDashboard.jsx:107 → `<RoomQRManagement embedded />` |
| Page | frontend/src/features/staff/hotel-admin/pages/TableManagement.jsx | frontend/src/features/staff/hotel-admin/pages/RoomQRManagement.jsx |
| Modals | Add/Edit Table (`Modal`), Batch Create (`Modal`), QR view (`Modal size=sm`), Delete (`shared/components/ConfirmDialog`) | QR enlarge (`Modal size=sm`), Batch-generate confirm (`ConfirmDialog`) |
| Service | services/tableApi.js (its own axios instance, Bearer `staffAccessToken` + CSRF, not core/api/client.js) | services/roomApi.js (same pattern) |
| Endpoints | `GET/POST /tables`, `POST /tables/batch`, `GET/PUT/DELETE /tables/:id`, `PATCH /tables/:id/status`, `POST /tables/:id/generate-qr`, `GET /tables/:id/qr-download` (unused by UI) | `GET /rooms`, `POST /rooms/:id/generate-qr`, `POST /rooms/batch-generate-qr`, `PATCH /rooms/:id/toggle-qr`; `qr-download` and `qr-codes/:hotelId` are unused by UI |
| Backend | routes/tableRoutes.js → controllers/hotelTableController.js → models/hotelTable.schema.js | routes/roomRoutes.js → controllers/roomController.js → models/room.schema.js |
| QR payload | utils/qrGenerator.js `generateTableQRCode`: `${FRONTEND_URL}/guest/table/${uniqueToken}` (token `TBL-` + 16 hex) | `generateRoomQRCode`: `${FRONTEND_URL}/guest/room/${uniqueToken}` (`RM-` + 16 hex) |
| Guest consumer | App.jsx:358 `/guest/table/:token` → guestController `getTableByToken` (requires `isActive && isQrActive`, approved active hotel) | App.jsx:359 `/guest/room/:token` → `getRoomByToken` (requires `isQrActive`) |
| Middleware | `sanitizeAll()` (strips HTML tags), `isAuthenticated` (= `protect`: any valid access JWT, any role), `writeOperationLimiter` (prod 30/min), `batchLimiter` (prod 20/h) | same |

There are no socket listeners on either page, so there is nothing to clean up. The flip side is that data never live-updates (see the stale-state findings). Neither page paginates. Search and filters run client-side over the full list.

## 2. Findings (ordered by severity)

### Critical

**C1. Table QR thumbnail, view modal, Download and Print all use the URL (`qrCodeData`) instead of the image (`qrCodeImage`).**
`qrCodeData` holds the guest URL (`http(s)://…/guest/table/TBL-…`), and `qrCodeImage` holds the base64 PNG (qrGenerator.js, hotelTable.schema.js).
- TableManagement.jsx:336 `<img src={table.qrCodeData}>` shows a broken image.
- :460 QR view modal shows a broken image.
- :346 and :446 `downloadQRCode(table.qrCodeData, …png)` either navigates to the guest page (cross-origin, where the `download` attribute is ignored) or saves the guest HTML page as `.png`.
- :349 and :449 Print opens a page with a broken `<img>`.
- The same bug is in RestaurantManagement.jsx:451, 463, 464, 610, 611, 620.

Fix: use `qrCodeImage` for `src`, download and print. Keep `qrCodeData` only for "has QR" and "copy link". RoomQRManagement already does this correctly.

**C2. `GET /api/tables` has no hotel-access check, so any authenticated user can read any hotel's tables, tokens and QR codes.**
`getTables` (hotelTableController.js:158-200) builds `{ hotel: hotelId }` straight from the query string and never calls `assertHotelAccess`. Every other table handler does call it.
- Any principal that passes `protect` can call `GET /api/tables?hotelId=<any>`. That includes other companies' staff, and guest-role accounts if their access JWT uses the same secret (`protect` does not check role).
- The response includes `uniqueToken`, `qrCodeData` and `qrCodeImage` for every table. Those values are all a caller needs to place dine-in orders on that hotel's tables through the guest endpoints.

Fix: call `await assertHotelAccess(req, hotelId)` plus a role allow-list (`canManageTables` or a staff list) before the query.

**C3. `assertHotelAccess` lets the `owner` role skip the company check (cross-tenant tampering).**
hotelTableController.js:42 and roomController.js:41 use `if (role !== "owner" && userCompany && hotel.company !== userCompany)`.
- A user whose role is `owner` passes for every hotel id on the platform.
- This lets an owner of company A run GET/PUT/DELETE `/tables/:id`, generate-qr, and status changes on company B's tables, and generate, toggle or batch QR codes on company B's rooms. All it takes is changing the id.
- Managers and other non-receptionist roles are only company-scoped, not property-scoped. In a multi-property company, a manager of hotel A can change hotel B's tables and rooms.

Fix: for owners, check `hotel.company == user.company || hotel.owner == user._id`. For every non-admin role, check `assignedProperties` membership, not only for receptionists.

### High

**H1. "Regenerate" does not regenerate, so the old QR is never invalidated.**
- Tables: TableManagement.jsx:214 calls `generateTableQR(id)`, and the service defaults to `regenerate = false` (tableApi.js). The backend therefore re-renders the same `uniqueToken` (hotelTableController.js:352).
- The success toast says "QR code generated", but the printed QR stays valid. The backend's "old QR is now invalid" path is unreachable from the UI.
- Rooms: RoomQRManagement.jsx:159 "Regen" has the same problem. Batch never passes `regenerate: true` either.

Fix: the row "Regenerate" action should call `generateTableQR(id, true)` / `generateRoomQR(id, true)` behind a danger `ConfirmDialog`: "Printed QR for Table X will stop working." Patch the returned image and token into state.

**H2. No way to deactivate a table QR from the UI.**
- The model has `isQrActive`, guest endpoints enforce it, and `PUT /tables/:id` accepts it.
- TableManagement has no Activate/Deactivate control (rooms do), and no badge for inactive state.
- Combined with H1, a leaked or stolen table QR cannot be revoked from the admin UI.

**H3. Create ignores the Status field.**
- `createTable` destructures `hotelId, tableNumber, tableName, capacity, location, description, minSpend` and drops `status` (hotelTableController.js:80-140).
- The "Add New Table" Status select (TableManagement.jsx:396) has no effect, and new tables are always `available`.

Fix: accept and validate `status` against the enum, or remove the select from create mode.

**H4. Capacity and Min Spend validation is missing or inconsistent.**
Frontend (TableManagement.jsx:391-392): `type=number min=1 max=50` with `onChange: +e.target.value`. The form is submitted through the footer button's `onClick` (:384), so HTML min/max are never enforced.
- "02" stays on screen as "02". State holds `2`, but React does not rewrite the DOM value, so the input never normalizes.
- An empty field becomes `0`. Server create then turns `0` into `4` silently (:135 `capacity || 4`). Server update ignores `0` silently (:280 `if (capacity)`), and the user gets "Table updated" with nothing changed.
- `-3` passes the client. On create the schema `min: 1` rejects it with an opaque 400 ("Invalid input data…" in prod).
- `2.5`, `999999` and `1e3` are all accepted. The schema has no `max` and no integer check.
- Min Spend: negative values are accepted everywhere (schema has no `min`), and decimals with no precision limit are allowed. Spinner arrows step by 1 NPR. The table row shows `Min Rs. 1500` with no thousands separator (:318). On edit, `minSpend: t.minSpend || 0` is fine.
- Batch "Default Capacity" says max 20 while single create says max 50.

Fix:
- Client: parse with `parseInt`/`Number`, show an inline error on blur and on submit, normalize leading zeros on blur, disable submit while invalid.
- Server: validate integer 1–50 for capacity and 0–1,000,000 for minSpend (with at most 2 decimals) in both create and update. Return field-specific 400s.
- Schema: add `max` and `validate: Number.isInteger`.

**H5. Duplicate table numbers are only partly rejected.**
- Client: no duplicate check at all, even though `tables` is already loaded.
- Server: `findOne({hotel, tableNumber})` runs before create and update, using the raw value (:119, :265), plus a unique `{hotel, tableNumber}` index.
- `" 5"` vs `"5"`: the pre-check misses it because it searches untrimmed, then the schema `trim` makes the insert collide. The user sees the generic 11000 message "This value already exists…" (errorHandler.js:45), not "Table 5 already exists".
- `"A1"` vs `"a1"` vs `"A-1"` are treated as different tables. Case-insensitive uniqueness is probably wanted.
- The double-submit race is safe because of the index, but the message is generic.
- The error appears only as a toast. It is not placed inline under "Table Number".

Fix: trim and upper-case server-side before the check, add a client pre-check against loaded tables, and map 400 duplicate errors to `formErrors.tableNumber`.

**H6. Batch create reports false success and has an off-by-one limit.**
- TableManagement.jsx:229 shows `${res.data.createdCount || batch.count} tables created`. When every number already exists, `createdCount` is `0`, so the toast falsely claims "5 tables created". `res.data.errors` (the per-table skip list) is never shown.
- Server `endNumber - startNumber > 50` (:416) allows 51 tables, while the client says max 50.
- `count`, `startNumber` and `capacity` are not type-checked server-side. Strings concatenate: `"1" + 5 - 1` gives `14`.
- `startNumber` 0 or a cleared field (`+'' = 0`) creates table "0". There is no prefix field even though the backend supports `prefix`.
- The "Generate QR codes automatically" checkbox is ignored by the server, which always generates a QR. The preview text "through N" also ignores existing numbers.

Fix:
- Show "Created X, skipped Y (already exist: …)" from the response.
- Validate `1 ≤ count ≤ 50` and `startNumber ≥ 1` as integers on both sides.
- Either honour `generateQR` or remove the checkbox.
- Optionally add a Prefix input.

**H7. Room print and print-all always show a blank hotel name.**
- `getRooms` does `Room.find(query)` with no `populate('hotel')` (roomController.js).
- `data[0]?.hotel?.name` (RoomQRManagement.jsx:105, :120) is therefore never set. The modal header, single print and "All Room QR Codes — " title are all blank.

Fix: populate `hotel` with `name`, or read the name from auth context.

**H8. Room "Generate All" toast overstates the count.**
- `batchGenerateRoomQR` pushes every room into `results`, including rooms that already had a QR (roomController.js:205-240). `successCount` therefore equals the total room count.
- The toast says "N QR codes generated" (RoomQRManagement.jsx:185), and per-room `errors` are ignored.

Fix: count only rooms that were actually generated, and surface `errorCount`.

**H9. Deleting a table does not check for open orders or dining sessions.**
- `deleteTable` (:319) calls `findByIdAndDelete` directly.
- `order.schema.js:45` and `diningSession.schema.js:76` reference `HotelTable`, so orders and sessions are left dangling.
- Also, managers see the Delete button but `canDeleteTables` excludes `manager`, so they get a 403 toast. Hide the button by role, or include manager.

### Medium

- **M1. The row status select changes status instantly with no confirmation.** It does a non-silent full refetch (TableManagement.jsx:203), which flashes skeletons, wipes the table and resets scroll. The same happens after Generate QR (:215) and Batch (:230). The `catch` blocks swallow server messages (:205, :217; RoomQR :206).
  - Fix: optimistic patch like RoomQRManagement's `patchRoom`, revert on error, show `err.response?.data?.message`.
- **M2. `updateTableStatus` has no role check.** Any authenticated user in the company (waiter, housekeeping, a guest account in the same company) can change any table's status. The other handlers use `canManageTables`.
- **M3. `updateTable` cannot clear Table Name.** It uses `if (tableName)` (:279), so an empty value is ignored and the toast still says success. Status is enum-validated only by mongoose (opaque error). `isActive` and `isQrActive` are accepted as any truthy type.
- **M4. Description has no limit.** No `maxLength` client-side, no counter, no server or schema max. The sanitizer strips HTML tags.
  - Suggest 300 chars, a live counter `n/300`, and a server/schema `maxlength`. Do the same for Table Name (60) and Table Number (20, pattern `^[A-Za-z0-9-]+$`).
- **M5. Table list sorts lexically.** `.sort({ tableNumber: 1 })` on a String gives `1, 10, 11, 2…`. The same applies to rooms (`roomNumber` is a String).
  - Fix: use a collation `{ locale: 'en', numericOrder: true }`, or sort client-side with `localeCompare(…, { numeric: true })`.
- **M6. No pagination, and full base64 images ship in list responses.** Every table and room in the list response includes `qrCodeImage` (about 5–15 KB of base64 at 400 px each). 200 tables is several MB per refresh. The image could be fetched lazily, or `.select('-qrCodeImage')` could be applied with images served from `qr-download`.
- **M7. QR payload depends on `FRONTEND_URL`.**
  - The generator falls back silently to `http://localhost:5173`, and `Backend/.env` currently points at localhost (dev). If prod does not set it, every printed QR points at localhost.
  - If `FRONTEND_URL` is ever a comma-separated CORS list, the QR URL breaks.
  - URLs are baked in at generation time. After a domain change there is no bulk table regenerate, and room batch never regenerates.
  - Fix: fail fast or warn on startup in prod, and offer a "Regenerate all (new domain)" action.
- **M8. Print windows inject unescaped strings via `document.write`.** `tableNumber`, `hotelName` and the image src go into the HTML unescaped (TableManagement.jsx:56; RoomQR :48, :60). The server strips tags, so risk is low, but escape `&<>"'` anyway. The print window also closes on `onafterprint` even when the user cancels.
- **M9. Room card renders a literal "0" for floor 0.** `{room.floor && (…)}` (RoomQRManagement.jsx:318) prints `0` as text when floor is 0 (ground floor), and price is hidden there too. Use `room.floor != null`.
- **M10. No-hotel case shows a misleading empty state.** When `hotelId` is null, `fetchTables`/`fetchRooms` just stop loading, so the user sees "No tables yet" / "No rooms found" instead of "No property selected".
- **M11. Role mismatches between route and backend.**
  - The frontend route allows `hoteladmin`, but `canManageTables` and the room QR gates do not include `hoteladmin`, so those users get 403 on every write.
  - Room `assertHotelAccess` throws 403 for `admin`, which makes the `'admin'` entry in the room QR allow-lists dead code.
  - `generateRoomQR` uses `req.user.role?.name` without the `companyRole` fallback that `toggleRoomQR` uses.
- **M12. Room search is limited and the type list can be stale.** Search matches only `roomNumber`, not type or name. The type options are built only from loaded rooms, which is fine but stale after changes elsewhere.

### Low

- The Add/Edit form has no submit button inside `<form>`, so Enter in a field does not submit (multi-field implicit submission needs one). Use `<Button type="submit" form="table-form">` in the footer.
- `formErrors` is cleared only when Table Number changes, and only one error is shown at a time.
- Stats count `withQR` via `qrCodeData` (fine), but there is no "No QR" or "QR inactive" card for tables. "Total Capacity" includes maintenance tables, and "Available" ignores `isActive=false`.
- `RoomQRManagement` computes `stats.inactive` but never uses it. Rooms have no "Inactive" filter chip.
- The Batch Generate ConfirmDialog closes immediately with no `loading` prop. That is fine, but the header button is the only progress indicator.
- Download filenames use the raw `tableNumber` (characters like `/` and `\` are not sanitized).
- `getTableQRDownload`, `getRoomQRDownload` and `getAllRoomQRCodes` are unused. Room "Print All" prints only the currently loaded rooms, including inactive QRs, with no "inactive" marker.
- The RestaurantManagement tables tab duplicates the full Table QR feature (same bugs C1/H3/H4/H6). Keep one implementation.

## 3. Field-by-field validation matrix (Add/Edit Table)

| Field | Frontend | Backend create | Backend update | Schema | Gap |
|---|---|---|---|---|---|
| Table Number | required (trim check), no length/pattern | required, duplicate pre-check (untrimmed) | duplicate pre-check | String, trim, unique (hotel+number) | no client dup check, case/space variants, no max length |
| Table Name | none | default `Table N` | ignored if empty | trim | cannot clear; no max |
| Capacity | HTML min 1 max 50 (not enforced), `+value` | `|| 4` | ignored if falsy | Number min 1 | no int/max; 0 silently becomes 4 or ignored; "02" not normalized |
| Min Spend | HTML min 0 (not enforced) | `|| 0` | any | Number | negatives, no max, no formatting |
| Location | select of 6 | default indoor | any (enum on save) | enum | OK |
| Status | select of 4 | ignored (H3) | enum on save | enum | create ignores |
| Description | none | as-is | as-is | trim | no limit or counter |

## 4. Per-page test checklist

### 4a. Table QR Codes (`/hoteladmin-dashboard#tables`)

**Load and header**
1. First load shows 4 stat skeletons, then the cards. The table area renders nothing while loading. Expect a table skeleton instead of a blank area.
2. If the API returns 500 or goes offline, an error toast appears and the empty state reads "No tables yet". Expect an error state with a Retry button instead.
3. With no property selected (clear `activeProperty`, no assigned properties), the page should show a "No property selected" message, not "No tables yet".
4. Refresh: the button is disabled while loading. Tables changed elsewhere (a waiter sets a table occupied) appear only after Refresh.
5. Stat cards: Total, With QR, Available and Total Capacity match the rows. They recompute after create, delete, status change and batch.

**Search and filters**
6. Search by number, name and location is debounced (250 ms) and case-insensitive. Test whitespace-only input, special characters (`#`, `*`), and a query with no match (shows "No matching tables" with no CTA).
7. The location and status selects combine with search and with the QR chip. The chip counts (All, Has QR, No QR) show totals regardless of other filters. Verify this is intended.
8. Sort order with tables 1, 2, 10, A1: currently `1, 10, 2, A1` (M5).

**Add Table modal**
9. Opens with focus on Table Number. Defaults: capacity 4, min spend 0, Indoor, Available.
10. Submit an empty Table Number: inline error appears and focus moves to the field.
11. Table Number values: `" 5 "`, a duplicate `5`, `5` when ` 5` exists, `a1` when `A1` exists, a 200-character value, `<b>x</b>` (should be stripped), and emoji.
12. Capacity: `02` (should normalize to 2), empty, 0, -1, 2.5, 51, 999999, `e`, and paste "10abc". Each should produce an inline error; nothing should be silently coerced to 4.
13. Min Spend: -100, 0, 1500.5, 1e9, empty. Expect formatted `Rs. 1,500` in the row and an inline error for out-of-range values.
14. Status: choose Reserved on create, then verify the row shows Reserved (fails today, H3).
15. Description: paste 5,000 characters. Expect a counter and a hard cap.
16. Double-click Create Table: only one request goes out (button disabled + "Saving…"). Pressing Enter inside a field should submit (fails today).
17. Press Esc or click the backdrop with unsaved input: expect a discard-changes confirmation (none today). Esc while saving should not close.
18. A server 400 or 429 (rate limit: 30 writes/min in prod) should show the server message, with inline placement for duplicates.
19. After success: the modal closes, the row appears with its QR thumbnail rendering as an image (fails today, C1), and the stats update.

**Edit Table**
20. Prefilled values match. Change the number to an existing one and expect an inline duplicate error.
21. Clear Table Name and expect it to clear (fails today, M3). Set capacity to 0 and expect a validation error (today it is silently ignored).
22. Edit while another tab deleted the table: expect a 404 toast and a list refresh.

**Batch Create**
23. Count 5 from 1 creates 1–5 with QR codes. Re-run the same batch: expect "0 created, 5 skipped" (today it says "5 tables created", H6).
24. Count 0, -1, 51, 100; start 0, -5, empty. Each should get client and server errors. Check 51 on the server (off-by-one).
25. Uncheck "Generate QR" and check whether the tables still get a QR (they do today).
26. Preview "Will create tables X through Y" updates live. At 375 px the 2-column grid should not clip.

**Row actions**
27. Click the thumbnail: the QR modal shows a scannable image. Scan it with a phone; it should open `<FRONTEND_URL>/guest/table/TBL-…` and the menu should load.
28. Download saves a valid PNG named `table-<n>-qr.png` (fails today, C1). Print opens a print preview with the hotel name, table number and a visible QR. With popups blocked, a toast appears.
29. Regenerate shows a danger confirmation. Afterwards the old printed QR shows "Table not found or QR code is inactive" and the new one works (fails today, H1). Spam-click Regenerate: the button is disabled per row.
30. Status select per row: change to Maintenance and confirm guest ordering is blocked (409). The select is disabled during the request. On failure the value reverts and the server message is shown.
31. Delete: the confirmation shows the table number; the button shows "Processing…" and Cancel is disabled. Deleting a table with an active order or dining session should be blocked (H9). Logged in as manager, Delete should be hidden or allowed consistently.
32. Inactive QR: there is no UI control today (H2). The proposed toggle should block the guest scan.

**Security (API-level, run with curl or Postman)**
33. Owner of company A: `PUT /api/tables/<B's tableId>` and `POST /api/tables/<B's id>/generate-qr`. Expect 403 (passes today, C3).
34. Any logged-in user, including a guest JWT: `GET /api/tables?hotelId=<other hotel>`. Expect 403 (returns data today, C2).
35. Waiter or housekeeping: `PATCH /api/tables/:id/status`. Should the server allow this? Decide intended behavior (M2).
36. Manager of hotel A in a multi-property company editing hotel B's table: expect 403.
37. Invalid ObjectId `/api/tables/abc`: expect 404 "Resource not found" (CastError), not 500.

### 4b. Room QR Codes (`/hoteladmin-dashboard#roomqr`)

1. Load: stat skeletons, then the coverage bar. The bar shows `0%` with 0 rooms hidden. The percentage stays correct after generate.
2. No rooms: "Add rooms in Room Management first". There is no CTA link to `#rooms`; add one.
3. Search by room number with spaces or partial input. The type filter lists only existing types. Chips: All Rooms, With QR, No QR.
4. Generate QR on a room without one: the card updates in place with no skeleton flash, the badge turns Active, the stats and coverage update.
5. Generate All (N): the confirmation dialog appears, the header button shows "Generating…", and only rooms without QR are processed. The toast count should equal N (shows the total room count today, H8). It is disabled when N = 0.
6. Deactivate: the badge turns Inactive and scanning the room QR shows "QR code is inactive". Activate restores it. Double-click is guarded by the disabled state.
7. Regen: the old printed QR should stop working (it keeps working today, H1). Confirmation required.
8. Download gives a valid PNG `room-<n>-qr.png`. Print and Print All should show the hotel name (blank today, H7). Print All with 100 rooms paginates 3 per row without splitting cards. Popup blocked shows a toast.
9. Floor 0 room: no stray "0" on the card (M9). Price formats as `Rs. 1,234`.
10. Login as `admin` role: every room call returns 403 "Superadmins cannot access…". The page should show a clear message.
11. Cross-tenant: an owner of company A calling `PATCH /api/rooms/<B's id>/toggle-qr` should get 403 (passes today, C3).
12. Scan from a phone in production: the URL host must be the production domain, not localhost (M7).

## 5. Modal UX audit

Shared `Modal` (components/ui/Modal.jsx):
- Strengths: it portals into `.hotelAdminShell`, sets `role="dialog"`, `aria-modal` and `aria-labelledby`, traps Tab, restores focus, closes on Esc, locks body scroll, closes on overlay mousedown, and respects reduced motion.
- `max-height: calc(100vh - 32px)` with the body scrolling (ha-ui.css:294, :315). `100vh` breaks on mobile Safari when the URL bar shows, so use `100dvh`.
- No `closeOnEsc` or `onBeforeClose` hook, so Esc and backdrop close forms with unsaved data and close while a request is in flight.
- Initial focus lands on the first focusable element in DOM order, which is the header close (X) button, not the first field. Add an `initialFocusRef` prop.
- The overlay is z-index 1000 and ConfirmDialog is 9999, which is fine when stacked. Check that toasts (react-toastify defaults to 9999) render above the modal; they do.

`ConfirmDialog` (shared/components/ConfirmDialog.jsx):
- Not portaled. No `role="dialog"` or `alertdialog`, no `aria-labelledby`, no Esc key, no focus trap, no initial focus, no body scroll lock.
- It uses its own CSS and theme (`isDark`), not the `ha-` tokens, so the buttons, radius and font differ visibly from the ha Modal.
- Recommend a hotel-admin `ConfirmModal` built on `Modal size="sm"` with a danger variant, `role="alertdialog"`, and focus on Cancel.

### Add / Edit Table modal

| Area | Current | Improvement (existing ha- design style) |
|---|---|---|
| Layout | `grid repeat(auto-fit,minmax(180px,1fr))` gives 2 columns at 560 px. Odd pairing: Capacity / Min Spend, then Location / Status. | Explicit 2-column grid: Table Number / Table Name; Capacity / Min Spend; Location / Status; Description full width. 1 column below 480 px. |
| Required indicator | `*` on Table Number and Capacity only, aria-hidden. Capacity is not actually required server-side. | Keep `*` (use `--ha-danger` colour) and add a top note "* required". Mark only truly required fields. |
| Number inputs | Spinner arrows, no units, "02" persists. | `inputMode="numeric"`, normalize on blur, show helper "1–50 guests". Min Spend: leading "Rs." adornment, `inputMode="decimal"`, display `toLocaleString('en-IN')` on blur, helper "0 = no minimum". |
| Errors | Single inline error (Table Number). Others appear only as toasts. | Inline `ha-field__error` for every field. Map server 400s to fields. Scroll and focus to the first invalid field. |
| Description | No counter. `rows=2`, but CSS min-height 88 px overrides it. | `maxLength=300` plus a right-aligned `ha-small` counter "120/300" that turns `--ha-warning` above 90%. |
| Status | Plain select. Ignored on create. | Use a segmented control or `FilterTabs`-style chips with status dots (success/warning/info/danger tones), or hide Status on create. |
| Submit | Footer button outside `<form>`, so Enter does not submit. "Saving…" text with no spinner. | `type="submit" form="table-form"`, a spinner icon (Loader2), disabled while invalid or unchanged in edit mode. |
| Close guard | Esc, backdrop and Cancel discard silently and are allowed during save. | Dirty check, then "Discard changes?" ConfirmModal. Block close while `actionLoading.submit`. |
| Title | "Add New Table" / "Edit Table". | "Edit Table 5" for context. Add a subtitle line "A QR code is generated automatically." |
| a11y | Labels tied with `htmlFor`. `aria-describedby` only set on error. | Add helper-text ids to `aria-describedby`. Set `aria-required` on the select too. |

### Batch Create modal
- Fixed `1fr 1fr` grid (TableManagement.jsx:418) at 375 px gives cramped fields of about 150 px. Use `repeat(auto-fit,minmax(160px,1fr))`.
- No inline validation. The button label "Create NaN Tables" or "Create 0 Tables" is possible. Validate and disable the button.
- The checkbox is a raw `<input>` with no ha styling and no focus ring token. Use a styled switch. Its label colour `--ha-text-muted` is fine in both themes.
- Add an optional Prefix field (backend supports it). Show a conflict warning when the range overlaps existing numbers ("3 of these already exist and will be skipped").
- After submit, show the result summary in the modal (created/skipped list) instead of closing blindly.

### QR view modals (table and room)
- Table version shows a broken image today (C1).
- Add a "Copy link" button using `qrCodeData`, plus an Active/Inactive badge and last-generated time.
- The image is a fixed 220 px. At 375 px the `sm` modal is about 343 px wide, which fits. Keep `max-width:100%` on the img.
- The image needs meaningful `alt` text ("QR code for Table 5"). Today it is `alt="QR Code"`, and the table thumbnail has `alt=""` with the button carrying the label, which is OK.
- Dark mode: the QR has a white quiet zone on a dark surface. That is fine for scanning; wrap it in a white rounded card with padding so the edge looks intentional.

### Delete / Batch-generate confirm
- Accessibility gaps as listed above. Delete should mention the consequence: "Its printed QR will stop working; existing orders keep their history."
- The room batch confirm uses `variant="info"` with no loading state. Keep it open with `loading` until the request completes.

### Page-level responsiveness
- 375 px: the table has `minWidth 820`, so it scrolls horizontally. The Actions column (5 icon buttons plus a select) is the widest. Consider a card list under 640 px like the Room QR grid, or a sticky first column.
- 375 px: the header actions (Refresh, Batch Create, Add Table) wrap. Check that PageHeader wraps without overflow. The toolbar SearchInput has max 320 px plus two selects; make sure they stack.
- 768 and 1024 px: the KPI grid is overridden inline to `auto-fit,minmax(180px,1fr)`, which ignores the 2/4-column breakpoints in ha-ui.css. Acceptable, but inconsistent with other pages.
- 1440 px: the room grid `minmax(240px,1fr)` gives 5–6 columns. Fine.
- Row action icons: verify a 36–40 px hit area (WCAG 2.5.8 target size) and visible `:focus-visible` rings in both themes.
- Contrast: check `--ha-text-subtle` on `--ha-surface` for "#5 · Min Rs." and the hints in light and dark themes (likely around 4.5:1 or lower in dark mode; verify with a contrast tool). The warning badge text `--ha-warning` on `--ha-warning-bg` in light mode is a common failure point, so verify it too.

## 6. Recommended fix order
1. C1 (qrCodeImage) in TableManagement and RestaurantManagement.
2. C2 and C3: access control on `getTables` and both `assertHotelAccess` helpers.
3. H1 (real regenerate with confirmation) and H2 (table QR toggle).
4. H3–H6: validation, duplicates, batch reporting and server limits.
5. H7–H9, then the medium and low items and the modal UX upgrades (shared Modal close guard and initial focus, ha-styled ConfirmModal).
