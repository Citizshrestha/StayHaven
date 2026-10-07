# Hotel Admin Audit: Restaurant/Menu + Orders + Billing (BillPreviewModal)

Read-only investigation. Paths are relative to the repo root (`Backend` and `backend` are the same folder). Line numbers are from the current working tree. Severity: **H** high (security, data integrity, or a feature that does not work), **M** medium (wrong behaviour or a production UX defect), **L** low (polish).

---

## 1. Trace map

### 1.1 Shell and routing
- Route `/hoteladmin-dashboard` is defined in `frontend/src/app/App.jsx:342`. It uses `ProtectedStaffRoute allowedRoles={['owner','hoteladmin','admin','manager']}`.
- Legacy `/restaurantmanagement` redirects to `#restaurant` (`App.jsx:351`).
- `HoteladminDashboard.jsx` switches sections on the URL hash. For `restaurant` it renders `<RestaurantManagement embedded />` (line 103) and passes **no `onNavigate`**. For `orders` it renders `<OrderManagement embedded onActiveCount=…/>`.
- The hotel id comes from `hooks/useHotelId.js`, which checks `staffUser.activeProperty`, then `assignedProperties[0]`, then `sessionStorage.activeProperty`. There is no property switcher, so a multi-property admin always works on property #1.
- API clients: `hotel-admin/services/menuApi.js` and `orderApi.js` each build their **own axios instance** with a Bearer token from `sessionStorage.staffAccessToken` plus the CSRF interceptor. Neither has the **401 refresh interceptor** that `core/api/client.js:50-108` has. An expired access token therefore shows as a raw "Not authorized, token expired" toast or ErrorState, with no silent refresh.

### 1.2 Restaurant page (`pages/RestaurantManagement.jsx`)
| UI | Frontend fn | Endpoint | Backend |
|---|---|---|---|
| Menu tab load | `getMenuItems({hotelId, available:'all'})` + `getMenuCategories()` (line 244) | `GET /api/v1/staff/menu-items`, `GET /staff/menu-categories` | `menuController.getMenuItems` (115), `getMenuCategories` (hard-coded list). Route uses `protect` only (`staffRoutes.js:117-118`) |
| Add/Edit item modal | `createMenuItem` / `updateMenuItem` (JSON, or multipart when an image is attached) | `POST /staff/menu-items`, `PUT /staff/menu-items/:itemId` | `authorize("owner","manager","admin")` + `writeOperationLimiter` + `upload.single("image")` then `createMenuItem` / `updateMenuItem`. Image goes to Cloudinary `StayHaven/menu/<hotelId>` |
| Delete item (ConfirmDialog) | `deleteMenuItem` | `DELETE /staff/menu-items/:itemId` | hard delete |
| Close Kitchen / Mark All Available (ConfirmDialog) | `bulkToggleAvailability({hotelId,isAvailable})` | `PUT /staff/menu-items/bulk-toggle` | `updateMany` scoped to hotel |
| (unused) | `reorderMenuItems` | `PUT /staff/menu-items/reorder` | exists, but **no UI** |
| Tables tab, Batch modal, QR modal | `tableApi.js` | `/api/v1/tables…` | `hotelTableController.js` (covered mainly by the Tables audit; quick notes in §2.4) |
| Kitchen tab | `onNavigate?.('orders')` | — | — |

Model: `Backend/models/menuItem.schema.js`
- `name` is required with trim. There is **no maxlength**.
- `description` has maxlength 500.
- `category` is an enum of 7 values.
- `price` is a Number with min 0.
- `preparationTime` defaults to 15, with **min 5 and max 120**.
- `orderType`, `spiceLevel`, `isVeg`, `displayOrder`, `dietary`, `allergens` are all in the schema but **not editable in the admin UI**.

### 1.3 Orders page (`pages/OrderManagement.jsx`)
| UI | Frontend fn | Endpoint | Backend |
|---|---|---|---|
| List (cards/table), KPIs, filters, sort | `getOrders({hotelId})` (line 107), polled every 30 s (line 118) | `GET /staff/orders` | `orderController.getOrders` (349): `assertHotelAccess`, default `limit=100` (max 200), `sort createdAt desc` |
| Advance status (card/row/detail footer) | `updateOrderStatus(id,next)` | `PUT /staff/orders/:id/status` | `authorize("waiter","chief","manager")` (`staffRoutes.js:176`), forward-only plus atomic `findOneAndUpdate` with status precondition |
| Cancel modal (reason chips + textarea) | `cancelOrder(id, reason)` | `POST /staff/orders/:id/cancel` | `authorize("owner","admin","manager","waiter","chief")` (188), `cancelOrder` then `updateOrderStatus` (548-550) |
| Detail modal | (uses list data, no refetch) | — | — |

Model: `order.schema.js`
- `status` enum: pending, confirmed, preparing, ready, delivered, cancelled.
- `paymentStatus` enum: pending, paid, failed, refunded.
- `billSentTo.method` enum: email, sms, whatsapp, app.
- `orderNumber` is generated per hotel by a pre-save counter.

### 1.4 Realtime
- `core/context/SocketContext.jsx` opens one socket keyed on identity, joins `hotel-<id>` and role rooms. The server checks access in `config/socket.js` with `canJoinHotel`: assigned property, same company, or `hotel.owner`. `subscribe()` returns an unsubscribe function. The provider calls `removeAllListeners()` and `disconnect()` on identity change. Cleanup is correct.
- `core/context/NotificationContext.jsx` subscribes to `new-order`, `order-status-updated`, `order-ready`, `order-cancelled`, `order-updated` and `notification`. Its effect returns a cleanup that unsubscribes everything (lines ~523-528). Cleanup is correct. These events only feed the **bell, toasts and sounds**.
- **`OrderManagement.jsx` does not subscribe to any socket event.** The list, KPIs and sidebar badge update only on the 30 s poll or a manual Refresh, so a toast "New order #123" can appear while the Orders list does not show it for up to 30 s. The header pill "Live · N active" (title: "List auto-refreshes every 30 seconds") overstates this. **M**
- `core/context/OrderContext.jsx` also polls `/staff/orders` every 30 s on `/hoteladmin-dashboard` (it is in `staffRoutes`). An admin on the Orders section therefore makes **two** order polls every 30 s, and the OrderContext copy is never used by the hotel-admin pages. **L/M** (wasted load)

### 1.5 Billing
- `pages/BillingManagement.jsx` is **100 % mock data** (`MOCK_INVOICES`, `MOCK_TRANSACTIONS`, `MOCK_BILLING_STATS`; banner comment at lines 30-45). The KPIs, invoice list, export and print run on fake rows such as "Ethan Harper" and "Rs 15,050,000 revenue". It is not production-ready. **H** (functional: an admin sees fabricated financials). The real endpoints exist: `GET /reception/billing/invoices` and `/reception/billing/summary` (`receptionRoutes.js:397-407`, which authorize owner/admin/manager).
- `shared/components/BillPreviewModal.jsx` is **not used by hotel-admin**. It is used by `waiter/pages/order/OrderCard.jsx:1060` and `reception/pages/ReceptionOrdersView.jsx:1638`, and calls `POST /staff/orders/:id/send-bill` (`authorize waiter, chief, receptionist, manager`). Owner/admin/hoteladmin cannot send bills.

---

## 2. Findings (bugs and risks)

### 2.1 Security / tenancy

1. **H: Owners bypass all hotel scoping on menu and order REST endpoints.**
   - Both `assertHotelAccess` copies (`menuController.js:73`, `orderController.js:54`) skip the company check when `role === "owner"`. They never compare `hotel.owner`, even though they select it.
   - As a result, any owner can call `GET /staff/orders?hotelId=<other hotel>` and read guest names and phones. The same owner can `POST/PUT/DELETE /staff/menu-items` for any hotel and run `bulk-toggle` to close another hotel's kitchen.
   - The socket layer does this correctly (`socket.js:46`, `hotel.owner === userId`). Mirror that check here.
   - Test: log in as owner A, send B's hotelId and B's menu item id, and expect 403.

2. **H: In `menuController`, `role === "admin"` bypasses all scoping (line 50)**, and `admin` is in the write `authorize` list. Any company-level `admin` (a `companyRole` enum value in `user.schema.js`) can edit or delete any hotel's menu across tenants.

3. **H (functional, inverse of #2): In `orderController.assertHotelAccess` (line 38), `admin` is treated as superadmin and gets 403** ("Superadmins cannot access hotel-specific operational data"). A hotel-admin user whose role resolves to `admin` gets an ErrorState on the Orders page. The menu code treats `admin` as all-powerful and the order code treats it as forbidden. Pick one meaning (hotel admin versus platform admin) and apply it in both places.

4. **H (functional): The `hoteladmin` role is admitted to the dashboard but rejected by the backend.**
   - Menu writes `authorize("owner","manager","admin")` and order cancel `authorize("owner","admin","manager","waiter","chief")` do not include `hoteladmin`.
   - The UI still shows Add/Edit/Delete, Close Kitchen and Cancel, and every one of them returns 403 with the toast "User role 'hoteladmin' is not authorized".
   - Either add `hoteladmin` to these lists or hide the controls by role.

5. **M: `GET /staff/menu-items` in `menuController.getMenuItems` (115) has no `assertHotelAccess`.** Any authenticated staff member of any company can list another hotel's full menu, including unavailable items (`available=all`). The duplicate `orderController.getMenuItems` *does* check access ("CRITICAL: Validate hotel access - was missing before!"), but that one is not routed. Wire in `assertHotelAccess` or reuse that function.

6. **M: Order search uses unescaped `$regex`** (`orderController.js:369-372`). User input becomes a regex, which allows ReDoS or errors such as `search=(` causing a 500. `sanitizeAll()` targets Mongo operators, not regex metacharacters (verify). The admin UI searches client-side, but the endpoint is exposed.

7. **M: `sendBillToCustomer` emails any address supplied in the body** (1262). There is no format validation and no check that the address belongs to the guest. It is rate-limited only by `writeOperationLimiter`. The 500 response returns `error: error.message` in production too (1398).

8. **L: Managers are not limited to `assignedProperties`.** Only receptionists are restricted. A manager of hotel X can operate hotel Y in the same company, which may be intended. Document it or restrict it.

### 2.2 Restaurant/Menu: functional bugs

9. **M: The Kitchen tab "Go to Orders" button does nothing.** `HoteladminDashboard.jsx:103` renders `<RestaurantManagement embedded />` without `onNavigate`, and `RestaurantManagement.jsx:537` calls `onNavigate?.('orders')`. Pass `onNavigate={handleNavigation}`.

10. **M: Editing a free item (price 0) cannot be saved.** `openMenuEdit` sets `price: item.price || ''` (line 333). 0 becomes `''`, and the validator reports "Valid price required". `preparationTime` has the same `||` issue. Use `?? ''`.

11. **M: Prep time validation does not match the backend.**
    - The UI uses `min="0"` with no max (line 647). The schema requires 5–120.
    - Entering 1–4 or 121+ causes a Mongoose ValidationError. In production `errorHandler` turns this into the generic "Invalid input data. Please check your entries." with no field highlighted.
    - A prep time cannot be cleared on edit: `''` is dropped by `pickMenuFields`, so the old value stays.
    - Fix: add `min=5 max=120` and inline field errors.

12. **M: Name and description lengths are not limited in the UI.** The description limit of 500 comes from the schema and produces the same generic 400. Name has no limit anywhere, so a 10 kB name is accepted. Add `maxLength` with a counter and a backend cap of about 100.

13. **M: Image errors return 500 with a generic message.**
    - `upload.js` `fileFilter` rejects with a plain `Error`, and multer's `LIMIT_FILE_SIZE` raises a `MulterError`. Neither carries a status, so `errorHandler` returns **500** and, in production, "An error occurred. Please try again later.".
    - The client checks size (5 MB) but **not type**: `accept` is only a hint, and choosing "All files" lets a GIF or PDF through.
    - Fix: validate the MIME type client-side and map Multer errors to 400.

14. **L/M: Image lifecycle problems.**
    - `URL.createObjectURL` (298) is never revoked, which leaks memory.
    - The image cannot be removed once set.
    - Selecting the same file again after closing does not fire `onChange`, because the input value is not reset.
    - The Cloudinary upload runs **before** `MenuItem.create` (206-209), so a failed create leaves an orphaned asset.
    - Replacing an image never deletes the old asset.
    - The image is not shown on menu cards (the grid shows text only).

15. **M: The guest-facing fields cannot be managed from the admin UI.** `isVeg` (drives the guest veg dot), `spiceLevel`, `dietary`, `allergens` and `displayOrder` are all missing, and the `reorder` API is never called. The list is sorted by `category,name` (140), not by `displayOrder`.

16. **L: Categories are hard-coded in three places** (schema enum, `menuController` constant, `getMenuCategories`). A hotel cannot add "Momo" or "Nepali Thali" categories. `fetchMenu` uses `Promise.all`, so if the categories call fails the whole tab shows "Failed to load menu".

17. **L: Error toasts drop the server message.** `confirmDelMenu` (309), `handleStatusChange` (206), `handleGenQR` (219) and `fetchMenu` (247) all show a generic message.

18. **L: There is no loading UI while the menu loads.** `mLoading ? null : …` leaves a blank area: no skeleton and no ErrorState with Retry. The empty state "Add your first menu item." also appears when filters match nothing, but it should read "No items match filters" with a Clear filters action. There is no pagination or virtualization for large menus.

19. **L: Double-submit and Enter key in the forms.** Footer buttons are outside the `<form>`, and the form has no submit button, so pressing Enter in an input does nothing. The disabled state does protect against double-clicks. A modal closed mid-save still runs `fetchMenu` and toasts, which is fine.

20. **L: Bulk toggle buttons give no context.** They are not disabled when the menu is empty, and they do not show how many items will change. There is no per-category toggle, although the API supports `category`.

### 2.3 Orders: functional bugs

21. **M: There is no pagination, so the KPIs are wrong for busy hotels.**
    - `getOrders({hotelId})` takes the default `limit=100`, newest first, across all history.
    - Total, Delivered, Revenue and the per-status counts (lines 124-133) are computed only from those 100 rows. "Revenue" is the delivered total of the latest 100 orders and has no date scope.
    - Active orders older than the newest 100 disappear from the board.
    - Fix: request active statuses separately, or add `status`/date filters, server pagination and server-side stats. Label revenue "Today".

22. **M: Cancel errors become a misleading 500.**
    - `cancelOrder` calls the `asyncHandler`-wrapped `updateOrderStatus(req, res)` **without `next`** (550). `utils/asyncHandler.js` calls `next(err)`, which throws `TypeError: next is not a function`. The outer handler turns that into a 500.
    - So every thrown error on the cancel path (invalid ObjectId `CastError`, which should be 404; status-tagged errors; DB errors) arrives as 500, which is a generic message in production.
    - `retryBillSending` then `sendBillToCustomer` (1462) has the same pattern.
    - Fix: pass `next`, or extract the shared logic into a plain async function.

23. **M: A non-string `reason` crashes cancel.** `cancelReason.trim()` (425, 509, 537) throws when `reason` is a number, array or object, and the result is a 500 via #22. Validate `typeof reason === 'string'` and cap it at about 300 characters. The UI also has no maxLength.

24. **M: Status can skip steps and same-status "updates" are allowed.** The forward-only check is `nextIndex < currentIndex` (493), so `pending` can go straight to `delivered` and `pending` to `pending` is accepted. A same-status request re-emits socket events, notifications and an audit row. The UI only sends the next step, but the API should enforce `nextIndex === currentIndex + 1` (or explicitly allow skips) and reject a no-op.

25. **M: The detail modal Advance button closes without feedback** (409). It calls `handleAdvance` and immediately `setSelOrder(null)`. There is no loading state, and a failure toast appears after the modal is already gone. The modal also shows a **stale snapshot**: it is not refreshed when the poll updates the order, so a status changed by the kitchen keeps showing old buttons, and the server then answers 409 "changed by someone else". Rebind with `selOrder = orders.find(o => o._id === selId)`.

26. **M: The body can stay scroll-locked after cancelling from the detail modal.**
    - `handleCancel` clears `cancelId` and `selOrder` in the same tick.
    - Each `Modal` saves `document.body.style.overflow` on open and restores it on cleanup. The detail modal saved `''` and the cancel modal saved `'hidden'`.
    - If the detail cleanup runs first (tree order), the cancel cleanup then restores `'hidden'`, and the page can no longer scroll.
    - Focus restoration also targets a node that is being unmounted.
    - Test: open an order, Cancel Order, Confirm, then try to scroll the page. Fix: use a ref-counted scroll lock in `Modal.jsx`.

27. **L/M: The cancel modal can be dismissed mid-request.** The "Back" button (482), Esc and the overlay (477) all stay enabled while the cancel is running. The reason and error are not cleared on Back, although `openCancel` does reset them. The "Other" chip sets the reason to the literal "Other", which passes validation. Require free text when "Other" is chosen.

28. **L: Fragile client search and stats.** Search matches `orderNumber` with `includes` on a string, so "1" matches 1, 10 and 100. Search is not debounced (the menu search is). `fmtTime` uses `en-US` while money uses `en-IN`, so locales are mixed. `paymentStatus` and `paymentMethod` are shown raw ("room-charge"). `TYPE_META` falls back to "Dine In" for an unknown type.

29. **L: Polling continues in background tabs.** The 30 s `setInterval` runs while the tab is hidden, with no `visibilitychange` pause. A fetch that fails after a successful one swaps the whole board for an ErrorState instead of a non-blocking banner that keeps the last data.

30. **L: Role checks rely on the client.** `canOperate` includes `'superadmin'` (78), but `getOrders` returns 403 for superadmin anyway. The UI gates on `staffUser.role`, so a stale role in session storage shows the wrong buttons. The server stays authoritative, so this is only a UX problem.

### 2.4 Tables tab inside Restaurant (brief; full coverage in the Tables audit)
31. **L:**
    - Batch modal: `count` or `startNumber` set to empty or 0 gives NaN or "Create 0 Tables" and "Will create tables 1 → 0". There is no client validation of min/max.
    - The capacity `+e.target.value` turns an empty value into 0.
    - The Add Table "Status" select duplicates the inline status select.
    - The hotel name comes from `tables[0].hotel.name`, so it is blank when there are no tables.
    - `printTableQR` (58-63) writes `hotelName` and `tableNumber` into HTML without escaping. This is self-XSS only, but escape them anyway.

### 2.5 BillPreviewModal (`shared/components/BillPreviewModal.jsx`)
32. **H: The bill totals disagree with the system's real bill.**
    - The modal hard-codes `taxRate = 0.13` (28) and adds VAT on top of `order.totalPrice`. The backend email bill does the same (`orderController.js:1280`).
    - Dine-in and takeaway orders are billed on a **DiningSession** through `computeTotals` with the hotel's `restaurantBilling` settings (service charge, VAT, discounts, payments).
    - `sendBillToCustomer` does **not** refuse session orders, unlike `confirmPayment`, which returns 409 for them. A guest can therefore receive a per-order "bill" that does not match the tab total, and that bill can also be sent for **cancelled** orders.
    - Fix: block sending for session or cancelled orders, or derive the totals from the server.

33. **H (production leak): Hard-coded placeholder identity.** The fallbacks `'Test Hotel'`, `'123 Test Street, Dhulikhel, Kathmandu'` and `'+977 1 4321000'` (141-145) print on real receipts whenever `hotel` lacks those fields.

34. **M: Debug logging of guest PII.** `console.log('🔍 Send Bill Debug:', { order, … })` (83) dumps the whole order (customer name and phone) to the console on every send.

35. **M: Not an accessible dialog.**
    - There is no `role="dialog"`, `aria-modal` or labelled title, no Esc handler, no focus trap or focus restore, and no body scroll lock.
    - The close button (128) has no `aria-label` and is an icon only.
    - The method buttons have no `type="button"` and no `aria-pressed`.
    - The email input has no label, only a placeholder.

36. **M: Weak backdrop and theming.**
    - The overlay is `backgroundColor: 'transparent'` (117), so there is no dimming and the bill floats over a busy dashboard.
    - Clicking the backdrop (118) closes the modal **even while sending**.
    - The panel is hard-coded `bg-white`, `text-gray-*` and teal/emerald/blue Tailwind classes, with no dark mode. That makes it a white slab on the dark staff dashboards and inconsistent with the `ha-*` tokens.

37. **M: Print can crash or misbehave.** `window.open` (39) returns `null` when popups are blocked, which throws a TypeError. `print()` is called before the document has loaded. The window is never closed afterwards. Print is offered for unpaid bills without a "PROFORMA / NOT PAID" marker.

38. **M: Crashes and stale state.**
    - `item.price.toFixed` (198) throws if `price` is a string or undefined (legacy rows).
    - `new Date(order.paidAt)` gives "Invalid Date" when `paidAt` is missing.
    - `email` is initialized once from `order.customerEmail` (20), so it goes stale when the same modal instance gets a different order.
    - There is no email format check.
    - `setTimeout(onClose, 1500)` (105) is not cleared on unmount.
    - `billSent` comes from the `order` prop and does not update after a successful send unless the parent refetches, so the user can click Send again within 1.5 s.
    - The success toast uses an emoji, which does not match the app's tone.

---

## 3. Per-page test checklist

### 3.1 Restaurant → Menu tab
Functional:
- [ ] Open `#restaurant`, then Menu. Items load for the active hotel. The categories dropdown has 7 options.
- [ ] Search is debounced (250 ms) and case-insensitive. The category and availability filters combine with search.
- [ ] Add an item with required fields only. A toast appears, the grid refreshes, the item sorts by category and name, and the "Available" badge shows.
- [ ] Add an item with an image (JPG, PNG, WEBP under 5 MB). The preview shows, the upload succeeds, and the image URL is saved (it should appear on the guest menu).
- [ ] Edit an item: fields prefill, the change saves, and the image is replaced.
- [ ] Delete an item: the ConfirmDialog appears, the item disappears, and historical orders still show its name and price (`/staff/orders` with `menuItem` populated as null).
- [ ] Close Kitchen: every item shows Unavailable, and the guest QR menu shows nothing orderable. Mark All Available restores them. The toast shows "N item(s) …".
- [ ] Kitchen tab → "Go to Orders" navigates to `#orders` (currently fails, #9).

Edge cases:
- [ ] Price `0` on create succeeds. **Edit an item priced 0 and save** (fails, #10).
- [ ] Price `-1`, `1e3`, `abc`, empty, or `9999999999`: client and server both reject or accept consistently.
- [ ] Prep time `1`, `4`, `121`, `0` or empty: expect field-level errors (currently a generic 400, #11). Clearing prep time on edit should clear it.
- [ ] A name of only spaces is rejected. A 1 000-character name or a 600-character description produces a clear error.
- [ ] Image of 6 MB: client toast. A GIF or PDF picked via "All files" should get a client rejection, not a 500. Re-selecting the same file after cancelling should work.
- [ ] Network offline during save: an error toast, the modal stays open, and the data is kept.
- [ ] Double-click Save: exactly one item is created.
- [ ] Esc or backdrop with a half-filled form: currently the data is lost silently (see §4).
- [ ] Role matrix (create/edit/delete/bulk): owner ✓, manager ✓, admin (?) and **hoteladmin: currently 403** (#4). Waiter/receptionist calling the API directly gets 403.
- [ ] Tenancy: as owner or admin of company A, send a `PUT/DELETE` with company B's item id and a `bulk-toggle` with B's hotelId. **Expect 403; currently succeeds** (#1, #2). Also send `GET /staff/menu-items?hotelId=<B>` (#5).
- [ ] Invalid `itemId` (`abc`) gets 404, not 500.
- [ ] 200+ items: scroll performance and layout. Cards with long names or descriptions wrap without overflow.
- [ ] Session expiry: leave the tab open past the access-token TTL, then save. Expect a silent refresh (currently a raw 401 toast, §1.1).

### 3.2 Restaurant → Tables / Batch / QR (summary)
- [ ] CRUD, duplicate table number (expect a clear 400), status inline change, QR generate, download and print (also with popups blocked).
- [ ] Batch count 0 or empty/51/NaN, start number 0, and overlapping existing numbers.
- [ ] A hotel name containing `<b>` in the print view should be escaped.

### 3.3 Orders
Functional:
- [ ] The list loads with KPI skeletons, then cards. The Cards/Table toggle works, and Refresh refetches.
- [ ] Filters: status tabs with counts, type select, sort (newest, oldest, highest total), and search by order #, customer, table or room.
- [ ] As **manager**: Confirm, then Start Prep, then Mark Ready, then Deliver. Each step shows a success toast, the badge updates, and the button disables while pending.
- [ ] As **owner/admin**: the read-only notice shows, there are no advance buttons, and Cancel works (verify for `admin`, #3).
- [ ] Cancel: a reason is required (inline error). A chip fills the textarea, and Confirm Cancel moves the order to Cancelled.
- [ ] Detail modal: the stepper highlights the current status, item lines and the total are correct, and the payment fields show.
- [ ] Sidebar Orders badge equals the Active KPI.

Realtime and concurrency:
- [ ] A guest places a QR order: the bell toast appears at once. **The list currently updates within 30 s or on Refresh only** (expected: immediately).
- [ ] The kitchen marks an order Ready in another browser: the admin list updates and an open detail modal reflects the change (currently stale, #25).
- [ ] Two managers press Confirm on the same order at the same time: one succeeds, the other gets 409 "changed by someone else" and the list refreshes.
- [ ] Cancel an order on a part-paid tab: expect 409 "Refund the customer before cancelling".
- [ ] Cancel an order already delivered by someone else: expect a clear 400 message.
- [ ] Socket reconnect: stop and restart the backend. The socket reconnects, and polling continues to work.

Edge cases:
- [ ] More than 100 orders in history: active orders older than the newest 100 still appear, and the KPIs are correct (currently fails, #21).
- [ ] An order with no items, a missing `orderNumber`, or an unknown `orderType` renders without crashing.
- [ ] Very long customer names or item names: the card layout holds.
- [ ] API: `POST /staff/orders/abc/cancel` should return 404 (currently 500, #22). `{reason: 123}` should return 400 (currently 500, #23). `PUT …/status {status:'delivered'}` from pending should be rejected or deliberately allowed (#24). Repeating the same status should be a no-op.
- [ ] `GET /staff/orders?hotelId=<other company hotel>` as owner: expect 403 (currently 200, #1).
- [ ] `GET /staff/orders?search=(` should not return 500 (#6).
- [ ] No active hotel (strip `activeProperty` and `assignedProperties`): the ErrorState "No active hotel selected" appears.
- [ ] Open detail, then Cancel Order, then Confirm. **The page must still scroll** afterwards (#26).
- [ ] Cancel modal: press Back or Esc while the request is pending (#27).
- [ ] Hide the tab for 10 minutes: polling should pause (#29).

### 3.4 Billing (hotel-admin)
- [ ] Confirm whether the page shows real data. It is currently all mock data, which **blocks a production release**: wire it to `/reception/billing/invoices` and `/summary`.
- [ ] Once wired: pagination, search, sort, CSV export of the filtered rows, print of the invoice modal, and an empty state for a new hotel.

### 3.5 BillPreviewModal (from Waiter OrderCard / Reception orders)
- [ ] The bill total equals the dining-session bill total (with service charge and VAT config). It currently differs (#32).
- [ ] A hotel without an address or phone must not show "Test Hotel" or "123 Test Street" (#33).
- [ ] Send via app to an unregistered guest: clear error. Send via email with an invalid address: client validation.
- [ ] Send twice quickly: only one send happens, and the button stays "Bill Sent".
- [ ] Popups blocked, then Print: a toast appears and nothing crashes.
- [ ] Esc closes, focus is trapped, and the screen reader announces a dialog. Dark theme is readable.
- [ ] A cancelled order or a session order: Send should be blocked.
- [ ] The console shows no order dump (#34).

---

## 4. Modal UX audit

Shared primitive: `components/ui/Modal.jsx` and `ha-ui.css:274-335`.

Already good:
- `role=dialog`, `aria-modal` and `aria-labelledby`.
- Focus trap, focus restore and Esc to close.
- Overlay click with `onMouseDown` (avoids drag-close).
- Body scroll lock, sticky header and footer, scrollable body, `prefers-reduced-motion`, z-index 1000 under ConfirmDialog (9999) and toasts.
- `Input`, `Select` and `Textarea` show a ` *` required marker, `aria-invalid`, `aria-describedby`, and an inline `role=alert` error under the field.

Gaps that apply to every hotel-admin modal:
| Issue | Where | Suggestion (existing `ha-*` style) |
|---|---|---|
| No unsaved-changes guard on Esc, backdrop or ✕ | Modal.jsx `onClose` | Add an `isDirty` prop. When it is true, show the shared `ConfirmDialog` ("Discard changes?", variant warning) before closing. Compute dirtiness with a shallow compare against the initial form. |
| Close is not blocked while a request is running | all form modals, cancel modal | Add a `busy` prop that disables Esc, overlay and ✕ while saving, and pass it to the footer buttons. |
| Body scroll-lock race with stacked modals | Modal.jsx effect | Ref-counted lock (module-level counter): set `hidden` at 0→1 and restore at 1→0 (#26). |
| Footer does not wrap | `.ha-modal__footer` | Add `flex-wrap: wrap`. Below 480px use `flex-direction: column-reverse` with full-width buttons, so the primary action sits on top. The order detail footer with 3 buttons overflows at 375px. |
| `max-height: calc(100vh - 32px)` | `.ha-modal` | Use `100dvh` so the iOS Safari toolbar does not cut off the footer. Below 480px, render as a bottom sheet (`align-items: flex-end`, top radius only, overlay padding 0). |
| Forms do not submit with Enter | Restaurant table, menu and batch forms | Give each form an `id` and set `<Button type="submit" form="menu-form">` in the footer. Remove the duplicate `onClick={handleSubmit}`. |
| Initial focus lands on the ✕ close button | Modal.jsx (first focusable is the header IconButton) | Focus the first field in `.ha-modal__body` (or an `initialFocusRef`). Fall back to ✕. |
| Raw `<input type="file">` and checkbox | Menu modal (lines 652-660), batch modal | Use a styled dropzone in `ha-card` with Choose / Replace / Remove buttons and a 120×90 preview. Associate the label with `htmlFor`, and show hint text ("JPG, PNG or WEBP · max 5 MB"). Use a `ha-switch` toggle for "Available" in place of the bare checkbox. |
| Field hints missing | price, prep time | Add helper text under the field (`ha-small`, `--ha-text-subtle`): "NPR, incl./excl. VAT", "5–120 minutes". Add `inputMode="decimal"`, `step="0.01"` and `min`/`max` that match the schema. |
| Grid `minmax(180px,1fr)` in a 560px modal | Menu and table modals | Stays 2 columns at 768+ and 1 column at 375. That works, but set the Description and Photo fields to `grid-column: 1/-1` (already done) and give inputs a consistent 40px height. |
| Errors from the server only appear as toasts | all | Map 400 messages to the field, or show an inline `ha-alert--danger` above the footer, so the toast does not vanish while the modal is open. |

Per modal:
- **Menu Add/Edit:** title fine. The "Item Photo" span is not a `<label>`, so the file input has no accessible name: give it `aria-label` or `htmlFor`. Show a character counter for the description (0/500). Add Veg/Non-veg, spice and allergen fields (#15). Provide a Remove image action. Add a disabled-state spinner icon to "Saving…".
- **Table Add/Edit and Batch:** add validation for count, start and capacity with inline errors. Show the batch preview line in `ha-card`, which is fine, but render an "Invalid range" warning in danger tone. The checkbox label needs a visible focus ring.
- **QR view (sm):** the `<img alt="QR Code">` should be more specific ("QR code for Table 5"). Show the token in `<code>` with a copy button. Download and Print are fine.
- **Order detail (lg):**
  - The stepper pills are `<span>`s with no semantics. Use `<ol aria-label="Order progress">` with `aria-current="step"`. A cancelled order should show a red "Cancelled" pill rather than an all-grey stepper.
  - The info grid is fine. Make the items list an actual table (Item / Qty / Line total), because the three-column flex misaligns with long names.
  - Show the order time, notes, priority, created by and cancellation reason (`cancellationReason`), all of which are missing.
  - The advance button needs a loading state and must not close before the request succeeds (#25).
- **Cancel order (sm):**
  - The chips are `ha-filter-chip` buttons without `aria-pressed`. Add `role="radiogroup"` semantics or `aria-pressed`.
  - "Other" should focus the textarea and require text.
  - Add a maxLength of 300 with a counter.
  - Disable Back, Esc and the overlay while cancelling.
  - Show the order # in the title ("Cancel order #123?") and add the consequence text ("The guest will be notified and the item removed from the bill").
- **ConfirmDialog (shared):**
  - There is no `role="alertdialog"`, no `aria-labelledby`/`aria-describedby`, no Esc key, no focus trap and no initial focus. Initial focus should be on Cancel for danger dialogs.
  - It uses its own CSS (`ConfirmDialog.css`) and `isDark` rather than `ha-*` tokens, so it renders outside `.hotelAdminShell`. Check its contrast in the hotel-admin dark theme.
  - Suggestion: re-implement it on top of `ha` `Modal` with `size="sm"`, keeping the API.
- **Pages using cards as buttons:** order cards and table rows use `onClick` on a `div`/`tr` with no `tabIndex`, `role="button"` or Enter/Space handler, so keyboard users cannot open order details. Add `tabIndex=0`, `role="button"`, `onKeyDown` and `aria-label="Open order #123"`.
- **BillPreviewModal:** rebuild it on the `ha` `Modal` (or the shared dialog primitive) with:
  - a dimmed overlay;
  - `role=dialog`, Esc and a focus trap;
  - a labelled email input with validation;
  - the method choice as a `Segmented` control;
  - token colours with dark support;
  - a single primary button (Send) plus a secondary Print, with no emoji-heavy copy;
  - print via a hidden iframe or `window.print()` with `@media print` (avoids popup blocking);
  - an "UNPAID / PROFORMA" watermark for unpaid bills;
  - totals from the server (#32);
  - no placeholder hotel data (#33).

Responsiveness quick matrix (expected after the fixes):
- **375:** single-column forms, bottom-sheet modals, stacked footer buttons, order cards one per row (`minmax(300px)` fits at 375 − 2×16 padding = 343 ✓). Orders table view scrolls horizontally (`minWidth 820`). Make sure the scroll container has a visible shadow or affordance.
- **768:** 2-column forms. Menu grid shows 2 columns, order cards 2 columns.
- **1024:** KPI grid 4 columns (`ha-kpi-grid`). The Orders KPI override `repeat(auto-fit,minmax(180px,1fr))` is fine. The toolbar should wrap without overlapping FilterTabs.
- **1440:** the menu grid goes to 4–5 columns. Cap the card width or use `minmax(260px, 320px)` so cards do not stretch.
- **Light and dark:** check the `--ha-text-subtle` contrast on `--ha-surface-sunken` (stepper pills, read-only notice) against WCAG AA 4.5:1. The read-only notice uses `var(--ha-info-soft, …)`, so confirm that token exists in both themes. Full WCAG validation needs manual testing with assistive technology.

---

## 5. Priority fix list (for the master prompt)
1. **H:** Tenancy holes: owner bypass (#1), menu `admin` bypass (#2), unscoped menu read (#5). Add regression tests in `Backend/tests` following the `*.integration.test.js` pattern (`npm test` in Backend runs `node --test`).
2. **H:** Role mismatches that make UI controls 403: `hoteladmin` (#4), and `admin` forbidden on orders (#3). Align `authorize()` lists, `assertHotelAccess` and the UI role gates.
3. **H:** BillingManagement mock data. BillPreviewModal VAT mismatch, sending on session or cancelled orders, placeholder hotel data and the PII console.log (#32-34).
4. **M:** Orders: live socket updates in the list, server pagination and stats, `next` propagation in cancel and retry, reason validation, strict transitions, detail modal staleness and scroll-lock race (#21-26).
5. **M:** Menu: Kitchen tab navigation, editing a price-0 item, prep time 5–120, length limits, Multer errors as 400, guest-facing fields (#9-15).
6. **M:** Modal primitive upgrades: dirty guard, busy lock, ref-counted scroll lock, footer wrap and bottom sheet, form submit buttons, a11y for ConfirmDialog, BillPreviewModal and clickable cards (§4).
7. **L:** Remaining polish items #16-20, #27-31.

Build and test commands found: frontend uses Vite (`frontend/package.json`, React 19, socket.io-client 4.8). It has no unit-test runner configured. The backend `npm test` runs `node --test` over the listed `tests/*.test.js` files, including `orderPricing.integration.test.js` and `dining.integration.test.js`, which are the closest patterns for order and menu tests.
