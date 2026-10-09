# Session 08 (public) report

Branch `qa/public` in `.worktrees/qa-public`, created from `qa/platform` @ `b97ed58` (wave-2 override). Six commits, unpushed and unmerged. Harness, probes, specs, JSON results and 89 screenshots are in `.qa-harness/public/` (`shots/`). Requests for files I don't own: `requests/public.md` (10 REQs).

## 1. Environment

| Item | Value |
|---|---|
| API / web | 3007 (confirmed in log) / 5180 (`vite preview` of the production build; built with `VITE_API_BASE_URL=http://localhost:3007`) |
| DB | `mongodb-memory-server` **replica set** (transactions are required by booking creation) on 127.0.0.1:27108, DB `stayhaven_qa_public`. Fixtures: Company A (hotels: approved Kathmandu 4★ with 3 rooms incl. one in maintenance and a configured bank account; pending; suspended; inactive; approved Pokhara 5★ with one room; approved hotel whose name/address contain HTML), Company B hotel, owner/receptionist, 3 guests |
| Browser | system Chrome through the Playwright library (`channel: 'chrome'`), mobile profiles = viewport + touch + iPhone user agent. **WebKit: BLOCKED** (not installed; the bundled browsers don't run in this sandbox). So "WebKit 390x844" is Chrome emulation |
| Env | `backend/.env` generated locally (random JWT secrets). **No Stripe, Khalti, eSewa, SMTP or Cloudinary keys** exist locally; `PAYMENT_TEST_CREDENTIALS.md` only contains instructions, no usable keys |
| Machine | 4 other sessions were running (about 600 MB free RAM at the end). This caused flaky `localhost` resolution and slow runs; numbers in section 3 (performance) are inflated by that |

| Check | Baseline (b97ed58) | Final |
|---|---|---|
| `npm run lint` | 0 errors, 16 warnings | 0 errors, 16 warnings |
| `npm run build` | pass (entry 1,686 kB) | pass (entry 1,698 kB, gzip 414 kB) |
| `npm run test:frontend` | 17/17 | 21/21 (`publicBookingQuote.test.mjs` added) |
| `backend npm test` | 135/137 (`bookingIntegrity` 500 vs 403) | 158/158 (run before the last two UI-only commits) |

New tests: `backend/tests/publicBooking.integration.test.js` (21 tests on an in-memory replica set, Stripe replaced through the existing `__setStripeClientForTests` seam) and `frontend/tests/publicBookingQuote.test.mjs` (client quote == server `bookingQuote` for 12 prices × 30 stay lengths). `npm test` picks up both with the existing globs; no package.json change.

## 2. Feature PASS/FAIL

"Pass" = observed through the API or in the browser at the end of the run. Counts are per script result line.

| Area | Checks | Pass | Fail | Blocked | Notes |
|---|---|---|---|---|---|
| Public hotel API probe (`probe-hotels.mjs`) | 32 | 31 | 1 | 0 | Before the fixes: leaks (owner email, bank account number, room QR tokens, internal fields), `destination=(((` → 500, `total`/`totalPages` wrong, `limit=abc` → `totalPages: null`. The one remaining "fail" is the `stack` field in the 404 body, which only exists with `NODE_ENV=development` (REQ-public-8) |
| Booking/payment API probe (`probe-booking.mjs`) | 61 | 61 | 0 | 0 | Amount tampering, validation matrix (18 cases, all 4xx), 3-way race (one 200, two 409), IDOR, forged confirmations. Before the fixes: confirmation PDF 500, E11000 text in the error |
| Backend integration tests | 21 | 21 | 0 | 0 | card confirm exactly once under 4 concurrent finalizers, late/foreign/partial/wrong-currency payments, privacy, pagination, availability, reviews |
| Booking flow, browser 390 / 360 / 1440 | 23 / 23 / 23 | 23 / 23 / 22 | 0 / 0 / 1 | 0 | The 1440 fail is the navbar's own 14px search input found by the page-wide audit (REQ-public-5). Flow: sheet, dates, server-equal total, login redirect and return, guest stepper, guest form validation, payment sheet, hotel's real bank details, submit → "not confirmed" + reference, held room shows as unavailable |
| Browser UI checks (`run-xss.mjs`) | 15 | 15 | 0 | 0 | HTML in hotel name/address inert, 404 state, mobile filter sheet, empty state + clear filters, card link, contact form (real POST), staff login error/show-hide/landscape |
| Pages × viewports (`run-pages.mjs`) | 18 pages @390 and @1440; 6 pages @360, 412, 768, 844×390, 1024 | no horizontal overflow on any | – | – | see section 3 |
| Stripe (card) | – | – | – | **BLOCKED (env)** | No key, so no PaymentIntent was created against Stripe and no 3-D Secure/tab-close run in a browser. Server logic (amount, currency, partial capture, ownership, replay, concurrent finalizers, cancelled booking, room taken) is covered by the integration tests with a scripted Stripe client. The modal shows card as "Currently unavailable" when the server reports no key |
| Khalti / eSewa | – | – | – | **BLOCKED (env)** | No keys. Existing `walletPayments` tests (mock gateway) still pass. Return URLs with `status=Completed` / unsigned eSewa data redirect with 303 and confirm nothing (probe) |
| Stripe webhook signature, replay of an old event | – | – | – | **BLOCKED (env)** | Without `STRIPE_WEBHOOK_SECRET` the route answers 503 (forged and missing signature, probe). With a secret, `constructEvent` applies its 300 s tolerance; read in code only |
| Confirmation email | – | – | – | **BLOCKED (env)** | No SMTP |
| Booking visible in reception | 3 | 3 | 0 | 0 | `GET /bookings/hotel/:id` as the hotel's receptionist lists the new web booking |
| Booking visible in guest dashboard | 1 | 0 | 0 | **1** | `GET /guest/portal/bookings` returns 200; I did not assert the content (owner 07) |
| Staff login page UI | 4 | 4 | 0 | 0 | The login/redirect logic is 01's; no mismatch found in this run |

## 3. Mobile matrix (rules F)

Pages: landing, hotels, hotel detail, hotel 404, bad id, destinations, about, offers, memberships, contact, feedback, guest login, register/login, staff login, saved, NotFound, booking-confirmed (no state), payment-callback. Light theme only; timezone Asia/Kathmandu only.

| View | 360 | 375 | 390 | 412 | 768 | 844×390 | 1024 | 1440 | Screenshots |
|---|---|---|---|---|---|---|---|---|---|
| All 18 pages: no horizontal overflow | not run | not run | PASS | not run | not run | not run | not run | PASS | `shots/<page>-light-{390,1440}.png` |
| landing, hotels, hotel detail, contact, staff login, login: no overflow | PASS | – | PASS | PASS | PASS | PASS | PASS | PASS | `shots/*-light-{360,412,768,844x390,1024}.png` |
| Booking flow (sheet, guest form, payment) | PASS | – | PASS | – | – | – | – | PASS | `flow-*-{360,390,1440}.png` |
| Staff login reachable in landscape (button scrolls into view) | – | – | – | – | – | PASS | – | – | `staff-login-844x390.png` |

375×667, dark mode and UTC were not run (time, and the shared machine). The public site has no theme switch that I found.

Per-rule results (390×844):
- Tap targets: the payment sheet, guest form, filters, stepper, gallery dots, pagination, Reserve bar, staff login (eye button 44×44, labels, checkbox row) are all ≥ 44 px. The remaining small targets on every public page come from the shared Navbar/Footer (14–28 px search/newsletter inputs, 20 px footer links): REQ-public-5. The login/register page (`AuthPage`) and guest login still have 14 px inputs and 20 px eye buttons (owner 07).
- Input font ≥ 16 px: fixed on the hero search (was 15 px), hotel list, guest form, payment sheet, bank form, contact form, staff login. Not fixed: navbar search, `AuthPage`, `GuestDashboardLogin` (not mine).
- Soft keyboard: with the last bank-form field focused the submit button stays visible, 48 px high (`flow-*`), in the 828 px tall bottom sheet of the 844 px viewport.
- Modals ≤ 480 px: payment, guest form, filters and booking panel are bottom sheets with `max-height: calc(100dvh - 16px)`, inner scroll, sticky footer, Esc/backdrop close, focus trap, focus return and body scroll lock that is restored on close (asserted).
- Hotel detail: sticky bottom "Reserve · Rs. X / night" bar, booking panel as bottom sheet, swipeable full-width gallery (arrows hidden on phones, 44 px dots, a swipe no longer opens the lightbox), room cards with a real CTA.

**Core Web Vitals (390×844, Slow 4G, 4× CPU, production build): FAIL**, measured while the machine was overloaded, so treat as an upper bound:

| Page | LCP | FCP | CLS | TBT (approx.) |
|---|---|---|---|---|
| landing | 8.9 s (first run 37 s) | 7.4 s | **0.46** (first run 0.07; shift at ~4.7 s between the hero background layer and the next section) | 4.8 s |
| hotels | 12.2 s | 7.9 s | 0.00 | 4.7 s |
| hotel detail | 8.7 s | 5.5 s | 0.006 | 5.0 s |

Why (unthrottled landing, `run-weight.mjs`): 8.7 MB over 37 requests. Entry JS 1.66 MB (414 kB gzip) in one chunk, `animation` (gsap + framer-motion) 241 kB on first paint, **`/logo.png` 1,059 kB fetched twice**, **`stripe.js` 1.1 MB loaded on every page** (guest `BillingView` calls `loadStripe(undefined)` at import), three 2070 px AVIF hero/destination images (270–640 kB each), 14 `<img>` of which 2 are lazy. REQ-public-2, 3, 10. I did not change HomePage's images or hero structure.

## 4. Security matrix (key rows)

| Actor | Call | Expected | Actual |
|---|---|---|---|
| anon | `GET /hotels`, `GET /hotels/:id` | no owner email, no bank account number, no company/owner ids, no room QR tokens, no revenue | before: all present (`uniqueToken`, `qrCodeData`, `qrCodeImage`, `ownera@…`, `QA1234567890`); after: none (probe + test) |
| anon | pending / suspended / inactive hotel by id or list | 404 / absent | 404 / absent (before and after) |
| anon | `destination=(((`, `city=(a+)+$`, `city[$ne]=x`, `amenities[]=…`, `sort=$where`, `limit=100000`, `starRating=abc` | 200, bounded | before: `destination=(((` → 500; after: all 200, `limit` capped at 50 |
| guest | `create-with-payment` with `totalAmount:1, price:1, currency:'USD', paidAmount, paymentStatus:'paid', status:'Confirmed'` | ignored | stored total 11,200 (3 nights × 5,000 + 12%), `Pending`/`unpaid`, NPR |
| guest | no token / no CSRF header | 401 / 403 | 401 / 403 |
| guest | past dates, inverted dates, 400 nights, adults 0/99/"2", NoSQL objects in hotelId/roomId/dates, bad email/phone, unknown method, missing bank details, suspended/pending/inactive hotel, maintenance room, room of another hotel (18 cases) | 4xx | 4xx, none 500 |
| 3 guests | same room, same dates, concurrently | one wins | 1 × 200, 2 × 409 "Room availability changed" (probe); 4 concurrent callers in the integration test: exactly 1 booking |
| guest 2 | `GET /public/bookings/:id` and `/confirmation-pdf` of guest 1 | 404 | 404 |
| guest 2 | `GET /webhooks/payment/:id/status`, `/bookings/:id`, `cancel`, `modify`, `refund` of guest 1 | 404 / 403 | 404 / 403 / 403 / 403 / 403 |
| anon | `GET /public/bookings/:id` | 401 | 401 |
| guest 2 | `GET /bookings/hotel/:id` | 403 | 403 |
| guest 1 | `verify-card-payment` with an invented intent id; with `{ "$ne": null }` | not confirmed | 404 / 400 |
| test | succeeded intent but 100,000 of 224,000 received; succeeded in USD; confirmed by another guest | not confirmed | `payment_not_completed`, `currency_mismatch`, 403 `ownership_mismatch`; nothing written |
| test | 4 concurrent finalizers (client verify + webhook paths) for one paid intent | one booking, one payment | 1 Confirmed, 1 captured `PaymentTransaction`, 1 invoice (total 2,240, tax 240, balance 0); the other 3 return `alreadyProcessed` |
| test | payment settles after the hold lapsed and another guest holds the room | not confirmed, refund flagged | 409 `room_unavailable_after_payment`, booking stays unpaid, no transaction row |
| test | payment settles after the booking was cancelled | not reopened | `booking_not_claimable`, stays Cancelled |
| anon | Khalti return URL with `status=Completed&amount=1`; eSewa return with unsigned base64 | confirm nothing | 303 redirect, nothing confirmed |
| anon | Stripe webhook forged / unsigned | rejected | 503 "not configured" (no secret locally) |
| anon | `GET /payments/config` | no secrets | only enabled/mode/publishable key flags |
| browser | HTML/script in hotel name, description and address | inert text, no dialog | rendered as text on list, search and detail; 0 dialogs |
| browser | pending booking `returnUrl`, staff login `redirectPath` | same-site only | `redirectPath` is now accepted only when it starts with a single `/`; no `redirect=`/`returnUrl=` query parameter exists on the public routes; `pendingBooking.returnUrl` goes to react-router `navigate` (AuthPage, 07), which treats it as an in-app path |
| prod mode | rate limits on booking creation / auth / payment | 429 | **BLOCKED**: production mode refuses to start without HTTPS `CLIENT_URL`; read in code: bookingLimiter 10/h per user, paymentLimiter 5/h **per IP** (REQ-public-9) |
| prod mode | CSP compatible with Stripe | – | **BLOCKED** (same reason); the platform report checked CSP/HSTS in production, I did not re-check Stripe domains |

## 5. Bugs fixed

| # | Sev | file | Root cause | Fix | Verified by | Commit |
|---|---|---|---|---|---|---|
| 1 | P0 | `controllers/hotelController.js` `getAllHotels`/`getHotelById` | Public responses populated the owner (name, email, contact) and returned every hotel and room field: company/owner ids, bank transfer account number, restaurant billing, revenue counters and **each room's QR token/URL/image** (a room QR token gives in-room guest access) | Fixed field allow-list for hotels and rooms; maintenance rooms are not listed; `bankTransferEnabled` boolean only | probe, integration test | 1b696df |
| 2 | P0 | `BookingPaymentModal.jsx` | Bank transfer showed a hard-coded account ("StayHaven Hotels Pvt. Ltd.", Nabil Bank, 0123456789012345) for every hotel, so guests would send money to a placeholder | New `GET /hotels/:id/bank-transfer-details` (signed-in guests, `no-store`, only if the hotel enabled it); the modal shows the hotel's own account and disables the option when none is configured | browser (`QA1234567890` shown, old text absent), integration test | 1b696df, 0f23262 |
| 3 | P1 | `publicBookingController.js` `generateBookingConfirmationPDF` | `import jsPDF from "jspdf"` + `jspdf-autotable` v5 no longer patches jsPDF: every confirmation download was a 500. Content was also wrong: "Your booking has been confirmed" for unpaid bookings, "Amount Paid" = full total, hotel phone/email always N/A, QR pointing at a `/booking/:id` route that doesn't exist, hotel image URL handed to jsPDF (which treats a string as a local file path) | Named import + `applyPlugin`; status-aware wording, stored quote and real paid amount, `contact.phone/email`, QR carries the booking reference, only inline `data:` images | integration test (valid `%PDF`), probe | b097705 |
| 4 | P1 | `webhookController.js` `finalizeStripeBookingPayment` | The invoice added another 13% on top of `totalAmount`, which already includes the 12% fee: every card-paid booking showed a balance that was never owed | Charges built from `priceBreakdown` (as the wallet and bank paths already do) | integration test (total 2,240, tax 240, balance 0) | b097705 |
| 5 | P1 | `webhookController.js` | The confirmation email was awaited inside the request: with an unreachable SMTP host the guest's payment confirmation waited **136 s** (measured) | Email is sent fire-and-forget, values HTML-escaped | measured before/after (1.5 s) | b097705 |
| 6 | P1 | `publicBookingController.js` | Bank-transfer bookings held the room **forever** (no `paymentHoldExpiresAt`), so a single account could keep rooms off the market with unverifiable references | 48 h hold for bank transfers (1 h for cards unchanged); the hold is what the UI now states | integration test | b097705 |
| 7 | P1 | `publicBookingController.js` | A reused bank-transfer reference returned `400 "Payment failed: E11000 duplicate key … index …"`; any gateway SDK error text (it can contain partial key text) was echoed to the browser | 409 with a clean message; 503 when a gateway isn't configured; 502 generic for other failures; details only in the log | integration test (no "E11000"/"index" in the message) | b097705 |
| 8 | P1 | `webhookController.js` | A card payment that settled after the 1-hour hold lapsed could confirm a second booking on a room another guest now held (double booking, two guests paid) | Conflict check inside the finalize transaction; returns `room_unavailable_after_payment` (409, user message, logged for refund) | integration test | b097705 |
| 9 | P1 | `publicBookingController.js` | A guest who backed out of the card step ("Change payment method") or retried was blocked by their own 1-hour hold ("Room is already booked"); abandoned intents stayed payable | The guest's own unpaid **card** holds for that room/overlap are released and their intents cancelled (best effort); bank transfers and wallet checkouts are never touched; card intents are now `cardOnly` so no redirect-based method can leave the page | integration test (others stay blocked, bank hold untouched) | b097705 |
| 10 | P1 | `BookingPaymentModal.jsx`, `BookingSidebar.jsx` | The sidebar sent `guestEmail: ""` when the optional email was blank and the API's validator rejects empty strings: **"Validation failed" for every booking where the guest left the email empty** | Empty optional fields are omitted (server validator: REQ-public-1) | browser flow (previously `400 Validation failed`) | 0f23262 |
| 11 | P1 | `BookingPaymentModal.jsx:14` | `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)` at import: threw when no key was set. The modal now reads the publishable key from `/payments/config`, loads Stripe lazily, and disables card when unavailable | browser | 0f23262 |
| 12 | P1 | `bookingController.js` `getBookingById` | By code reading, the booking's own guest was sent through the staff hotel check (403), and the lookup populated the whole `User` document (password and token hashes) for staff and guests; I did not capture the old behaviour before changing it. It was also the baseline `bookingIntegrity` failure (500: `Company` model not registered) | Authorize on the raw booking first (booking's guest, or staff of that hotel), populate only `fullname email contact`, register the `Company` model. Reception create/check-in/room-change/list responses use the same user projection | `bookingIntegrity` (2 previously failing now pass), probe | 1b696df |
| 13 | P2 | `hotelController.getAllHotels` | `destination` regex unescaped (500, ReDoS shape), `sort` and `amenities` unvalidated, `starRating=abc`/`minPrice=x` cast errors, page/limit unbounded, `total`/`totalPages` computed from the current page, date search paginated before the availability filter and counted expired payment holds as booked | `searchRegex`/`parsePaging`, sort allow-list, numeric guards, real `countDocuments`, date filter before paging using the shared reservation filter | probe, integration test | 1b696df |
| 14 | P1 | `HotelDetail/*` | Fake content: "Free cancellation until Apr 4, 2026" for everyone, hard-coded 60/25/10/3/2% rating bars, "Highly rated for cleanliness…" copy, a hotel photo labelled as the map, photo captions "Pool/Room/Dining/Exterior/Spa" by index, "Taxes included" and "No booking fees" next to a line adding 12% taxes & fees, a default 3-night/`2 Adults, 1 Child` quote, dead Share buttons, reviews never loaded (API didn't return any) | Cancellation text from the same 48 h/24 h tiers the server applies; real approved reviews and star distribution (new `GET /hotels/:id/reviews`: approved only, reviewer = first name + initial); real policy facts; address + "Open in Google Maps"; no invented captions; working share; "+12% taxes & fees" and a summary only once dates are valid | integration test, browser | 1b696df, 0f23262 |
| 15 | P1 | `HotelDetail/*` | Dates were never checked against availability: a guest could pick a held room and fail at payment | New `GET /hotels/:id/availability` (booleans only); rooms show "Not available for your dates", the Book button is disabled, selection moves to a free room | browser, integration test | 1b696df, 0f23262 |
| 16 | P1 | `FilteredHotels.jsx` | On phones **there were no filters at all** (the sidebar was `hidden lg:block`); city defaulted to "Kathmandu" so every other city was hidden; the heart button did nothing; the card was not a link | Filters bottom sheet, default city empty, whole-card link, working save button, skeleton / empty state with "Clear filters" / error with Retry, 44 px pagination, 16 px sort select | browser (`run-xss.mjs`) | 0f23262 |
| 17 | P1 | `Contactus.jsx`/`.css` | The page was a grocery-store template ("GreenCart", vegetable emojis, "Trade Policies from Self Agency", a Chitwan address) and "Send" waited 2 s, `console.log`ged the form (PII) and reported success without sending anything | Real StayHaven content (same defaults as the footer), phone field, POST to the public feedback API with rate limit, real errors | browser | 0f23262 |
| 18 | P1 | `BookingConfirmed.jsx` | Placeholder data ("The Grand Coastal Hotel", Rs 450, "Booking Confirmed! 🎉") when router state was missing, and the same "confirmed" headline for an unverified bank transfer | Loads the booking from the API (`?booking=` or state); wording and amount follow the real status | pages matrix (`/booking-confirmed` without state renders the safe "unavailable" message); the status-aware wording is code only | 0f23262 |
| 19 | P2 | `StaffLogin.jsx` | Fixed full-screen layout with `overflow:hidden` clipped the form on short phones; 14 px inputs; 20 px eye button; labels without `htmlFor`; no `autocomplete`; errors only as a toast; a dead "Contact your administrator" button and a fake `stayhaven.com` link | Scrollable on phones, 16 px inputs, 44 px labelled eye button, `autocomplete`, inline `role=alert` with the server's own message (including the lockout text), `redirectPath` accepted only if same-site | browser incl. 844×390 | 0f23262 |
| 20 | P2 | `HomePage.jsx` and 7 pages | No `h1` on landing/detail, every page had the same title, hero inputs 15 px | `usePageMeta` (title, description, OG/Twitter, restored on unmount) on landing, hotels, detail, contact, staff login, about, destinations, offers, memberships, feedback, saved, booking confirmed; real `h1`; 16 px hero inputs | pages matrix | 0f23262 |
| 21 | P2 | `PaymentCallback.jsx` | (none) I added page meta there and reverted it: its source-level tests only allow a fixed import list | reverted | `npm run test:frontend` 21/21 | 6dc11fc |
| 22 | P2 | `BookingPaymentModal.jsx` | Default method was eSewa even when unavailable; title truncated ("Complete paym…"); two-line pay button | Starts on the first usable method, shorter title, one-line button | screenshot `flow-payment-390.png` | 937776a |

## 6. UX/visual changes

| View | Before | After | Screenshots |
|---|---|---|---|
| Hotel detail (phone) | Card in a short modal, "Book Now" only inside the header block, centred 3D-carousel gallery with blurred side tiles, fixed cancellation date | Sticky "Reserve · Rs. X / night" bar, booking panel as a bottom sheet (Esc/backdrop, scroll lock), full-width swipe gallery, room cards with Select & reserve, real reviews, availability badges | `flow-detail-bar-390.png`, `flow-sheet-dates-390.png`, `flow-soldout-390.png` |
| Booking sidebar | select with 4 fixed party strings, 40 px date fields, 3 fake nights shown before choosing dates | Adults/children steppers (capacity-aware, 44 px), 16 px date inputs, summary only for valid dates, total equals the server quote (property test) | `flow-sheet-dates-*.png` |
| Guest form | modal with unlabelled inputs | bottom-sheet, labels, `autocomplete`/`inputMode`, errors | `flow-guestform-390.png` |
| Payment | centred modal, 4 options always clickable, fixed fake bank, `NPR` | Sheet with sticky footer, disabled/"Currently unavailable" options, hotel's own bank details, reference + "not confirmed" state after a transfer, `Rs.` money format | `flow-payment-390.png`, `flow-submitted-390.png` |
| Hotels list | no filters on phones | Filters sheet, active-filter chips, whole-card links, skeletons, empty state | `filters-sheet-390.png`, `hotels-light-390.png` |
| Staff login | clipped on short screens, toast-only errors | scrollable, inline error | `staff-login-light-390.png`, `staff-login-844x390.png` |
| Contact | grocery template | StayHaven page | `contact-light-390.png` |

Brand reference (rules G): kept the teal gradient/primary buttons, 8/12/16 radii and 44 px touch buttons; money now uses `Rs. 1,234`; status wording (pending/confirmed) follows the amber/green meaning. Deviations I did not touch: the landing and navbar still use their own type scale and the hero uses 13 px text from `sm` up.

## 7. REQs filed to 01 (`requests/public.md`, all `open`; session 01 does not run in wave 2)

| REQ | Sev | Target | Summary |
|---|---|---|---|
| 1 | P1 | `middleware/validation.js` | `.optional()` rejects empty strings (UI works around it) |
| 2 | P1 | guest `BillingView.jsx:39` (07) | `loadStripe(undefined)` throws on every page and downloads 1.1 MB `stripe.js` |
| 3 | P1 | `app/App.jsx` | no route-level code splitting (1.7 MB entry, gsap/framer-motion on first paint) |
| 4 | P2 | `frontend/index.html` | static og:image/url, twitter, canonical, theme-color |
| 5 | P2 | `Navbar.jsx`, `Footer.jsx` | 14 px search input, 28 px newsletter field, 20 px link targets on every page |
| 6 | P2 | `config/nodemailer.js` | no SMTP timeouts (2-minute stall) |
| 7 | P1 | `paymentController.confirmPayment` (03) | invoice adds 13% on an already-taxed total |
| 8 | P2 | `middleware/errorHandler.js` | stack in dev responses |
| 9 | P1 | `middleware/rateLimiter.js` | `paymentLimiter` is 5/hour **per IP**; key per user |
| 10 | P1 | `frontend/public/logo.png` | 1 MB logo, fetched twice |

BLOCKED because of them: live 429 on payment/booking endpoints (REQ-9, production boot), Lighthouse-grade LCP (REQ-2, 3, 10), `og:image` previews (REQ-4).

## 8. Decisions

- **Bank-transfer details need a signed-in guest** (`/hotels/:id/bank-transfer-details`): they were being shipped in every public hotel payload; the checkout already requires login, so nothing is lost.
- **48 h bank hold, 1 h card hold**: the UI already promised "verified within 24 hours"; 48 h leaves staff a business day. A lapsed hold can still be approved if the room is still free (existing `bankTransferService` conflict check).
- **Card checkouts are card-only** (`cardOnly: true`): the page confirms in place (3-D Secure opens in Stripe's overlay), so redirect-based methods can't be offered.
- **Own stale card holds are released on retry, bank/wallet holds never**: only card intents carry no money in flight until Stripe confirms.
- **Email is not awaited** in the Stripe finalizer so a slow SMTP server can't delay payment confirmation.
- **Server stays the source of truth for price**: the client preview mirrors `bookingQuote` and a test fails if they drift; the payment screen switches to the server's amount for card.
- **Public availability returns booleans only** (no booking data) and hides maintenance rooms.
- **Cancellation wording** is derived from the real refund tiers in `cancelBooking` instead of the hotel's free-text `cancellationPolicy` (which says 24 h and contradicts the code).
- **Contact form reuses the feedback inbox** (`POST /feedback`, owner 07) instead of a new backend module; it needed a phone field because that endpoint requires one.
- **Currency**: public checkout now shows `Rs.` like the dashboards; Stripe/wallet still charge NPR.

## 9. Remaining issues

| Sev | Issue | Where | Why not fixed | Suggested fix |
|---|---|---|---|---|
| P1 | Mobile LCP/FCP far above target; landing CLS up to 0.46 (hero layer vs next section at ~4.7 s) | `HomePage.jsx`, `App.jsx`, `logo.png`, `stripe.js` | Needs route splitting (01) and CMS image work; I didn't restructure the landing hero | REQ-2, 3, 10; give the hero a fixed `min-height` in `svh`, `srcset`/`w=800` for mobile Unsplash images, lazy-load below-fold images, lazy-load gsap |
| P1 | Cancelling a paid booking only changes its status; no refund is issued and `paymentStatus` stays `paid` (the refund amount in the response is informational) | `bookingController.cancelBooking`/`requestRefund` | New refund behaviour is a product decision | Decide: automatic Stripe/wallet refund, or a refund queue for reception |
| P1 | Real Stripe 3-D Secure, tab-close-then-webhook, Khalti/eSewa round trips and signed-webhook replay were not run against the providers | – | No sandbox keys in this environment | Re-run with `sk_test`/`pk_test`, Khalti and eSewa sandbox keys and a Stripe CLI webhook; the integration tests cover the server logic |
| P2 | Booking confirmation email and the "booking in the guest dashboard" content not verified | – | No SMTP; guest dashboard is 07's | Verify after merge |
| P2 | WebKit, 375×667, dark mode, UTC not run; accessibility only checked for names/roles/focus, not with a screen reader | – | Time / sandbox | Run `run-pages.mjs` with `VPS=375 THEMES=dark`; manual VoiceOver/TalkBack pass |
| P2 | `AuthPage` and `GuestDashboardLogin`: 14 px inputs, 20 px eye buttons | owner 07 | Not my files | 16 px inputs, 44 px icon buttons |
| P2 | Landing/Destination/About/Offers/Membership content and images are hard-coded or CMS-driven; I only added meta tags and the hero input size | landing pages | Large templates, no defects found beyond targets | content pass with 06 (CMS) |
| P2 | `getAvailableRooms` (`GET /bookings/available/rooms/:hotelId`) needs a login, so it can't serve the public page; the new public availability endpoint is separate | `bookingRoutes.js` | Kept to avoid changing its callers | Point reception callers at one shared service later |
| P3 | `getOrCreateGuestRole` unused in `publicBookingController.js` (backend lint) | file | Pre-existing | delete |

## Repository secrets and config

Checked only key names. I generated `backend/.env` locally with random JWT secrets and the local replica set URI (gitignored). Nothing secret was read from the real `.env` files, committed or printed. `PAYMENT_TEST_CREDENTIALS.md` contains test accounts (eSewa test IDs, Khalti test phone numbers) but no API keys. No dependency was added.

## Cleanup

`backend/scripts/_qa_tmp_public.js` deleted. API (3007), web (5180) and the in-memory replica set (27108) are stopped and the ports confirmed free; no process from `.worktrees\qa-public` is left. Worktree, branch and 6 commits remain for review (`1b696df`, `b097705`, `38b461c`, `0f23262`, `6dc11fc`, `937776a`). Suggested merge position unchanged: after 07 guest, before 06.

## Failures and blocked checks (detail)

Added by the report audit. Everything below comes from this report's own tables and `requests/public.md`. Nothing was re-run. "Current status" is the status line now in the requests file.

### A. Counted FAILs

| Counted in | Check | Reason (observed) | Where | REQ | Current status |
|---|---|---|---|---|---|
| `probe-hotels.mjs` 31/32 (1 fail) | "No stack in the 404 body" | The `stack` field exists in the error body because the API ran with `NODE_ENV=development`. Production stripping was verified in wave 1 (`prod-probe`) | `backend/middleware/errorHandler.js` | REQ-public-8 | rejected: no code change needed |
| Booking flow browser, 1440: 22/23 (1 fail) | Page-wide tap-target / input-size audit | The navbar's own 14 px search input | `frontend/src/shared/layout/Navbar.jsx` (also Footer: newsletter field 204x28, link buttons 163x20, contact links 22 px high at 390) | REQ-public-5 | done in 4e446ea; not re-measured with `audit()` |
| `backend npm test` baseline 135/137 | `bookingIntegrity` "companyless staff cannot read another booking" | 500 instead of 403: `Company` model not registered, and `getBookingById` sent the booking's own guest through the staff hotel check | `backend/controllers/bookingController.js` `getBookingById` | none (bug 12) | fixed in 1b696df; final 158/158 |

Final backend run is 158/158, run before the last two UI-only commits (6dc11fc, 937776a). The frontend suite was 21/21 at the end.

### B. BLOCKED / not run

| Counted in | Check | Reason (type) |
|---|---|---|
| Stripe (card) | PaymentIntent against Stripe, 3-D Secure, tab-close then webhook | Environment limit: no Stripe key. Server logic is covered by the 21 integration tests with a scripted Stripe client (`__setStripeClientForTests`) |
| Khalti / eSewa | Provider round trips | Environment limit: no keys. Existing `walletPayments` tests (mock gateway) pass; return URLs with `status=Completed` or unsigned eSewa data redirect with 303 and confirm nothing |
| Stripe webhook signature and replay of an old event | Signed-event verification | Environment limit: no `STRIPE_WEBHOOK_SECRET`; the route answers 503 for forged and missing signatures. The 300 s tolerance of `constructEvent` was read in code only |
| Confirmation email | Delivery | Environment limit: no SMTP |
| Booking visible in guest dashboard (Blocked 1) | Content of `GET /guest/portal/bookings` | Returns 200; the content was not asserted (owned by 07) |
| Security matrix, prod mode | 429 on booking creation, auth and payment | Environment limit: production mode refuses to start without an HTTPS `CLIENT_URL`; read in code only (`bookingLimiter` 10/h per user, `paymentLimiter` 5/h per IP, REQ-public-9). REQ-9 done in 7388420 (per-user key, 10/h); live 429 still not run |
| Security matrix, prod mode | CSP compatible with Stripe domains | Same environment limit; platform report checked CSP/HSTS in production, Stripe domains not re-checked |
| Browsers | WebKit 390x844 | Environment limit: WebKit not installed and the bundled browsers do not run in this sandbox; "WebKit 390x844" was Chrome emulation |
| Core Web Vitals (390x844, Slow 4G, 4x CPU, production build) | Marked FAIL, not counted in the section 2 table | landing LCP 8.9 s (first run 37 s), FCP 7.4 s, CLS 0.46 (shift at about 4.7 s between the hero background layer and the next section), TBT 4.8 s; hotels LCP 12.2 s, FCP 7.9 s, CLS 0.00, TBT 4.7 s; hotel detail LCP 8.7 s, FCP 5.5 s, CLS 0.006, TBT 5.0 s. Measured while the machine was overloaded (4 other sessions, about 600 MB free RAM), so these are upper bounds. Causes: 1.66 MB entry chunk, `stripe.js` 1.1 MB on every page, `/logo.png` 1,059 kB fetched twice, three 2070 px AVIF images. REQ-public-2, -3, -10: all done (9200176, 4e446ea); Lighthouse after the change was not run (platform report: BLOCKED, time). The landing CLS cause (hero layer) was not changed |
| Mobile matrix (section 3) | 18 pages at 360, 375, 412, 768, 844x390, 1024 | "not run": the full 18-page overflow sweep was run at 390 and 1440 only; 6 pages (landing, hotels, hotel detail, contact, staff login, login) were run at 360, 412, 768, 844x390 and 1024. Reason: time and the shared machine |
| Mobile matrix | 375x667, dark mode, UTC | Not run (time, shared machine). The public site has no theme switch that the report found |
| Accessibility | Screen reader (VoiceOver / TalkBack) | Not run; only names, roles and focus were checked |

### C. Code-only or reverted items inside "Pass"

| Item | Reason |
|---|---|
| Bug 18 `BookingConfirmed.jsx` status-aware wording | Code only; only the "unavailable" state without router state was confirmed in the pages matrix |
| Bug 21 `PaymentCallback.jsx` page meta | Reverted: its source-level tests allow only a fixed import list (6dc11fc); no meta on that page |
| Bug 12 old `getBookingById` behaviour | Found by code reading; the old behaviour was not captured before the change |

### D. Defects named in the report, not counted as FAIL

| Item | Reason / where | Status |
|---|---|---|
| Cancelling a paid booking only changes status; no refund issued, `paymentStatus` stays `paid` | `bookingController.cancelBooking` / `requestRefund` | open (P1, product decision) |
| Optional fields rejected empty strings: `"guestEmail": ""` returned 400 "Validation failed" | `backend/middleware/validation.js:67-85`, REQ-public-1 (UI works around it) | done in 7388420 |
| `loadStripe(undefined)` throws on every page, 1.1 MB `stripe.js` | `BillingView.jsx:39`, REQ-public-2 | done by 07 in 9200176; BillingView now a lazy chunk (4e446ea) |
| No SMTP timeouts: first `sendMail` blocks about 136 s with an unreachable host | `backend/config/nodemailer.js:5-15`, REQ-public-6 | done in 7388420; the timed run against an unreachable host was not done |
| Reception-side invoice adds 13% on an already-taxed total | `paymentController.js:217-225`, REQ-public-7 | done in 7388420 |
| `paymentLimiter` 5/h per IP | `rateLimiter.js:167-172`, REQ-public-9 | done in 7388420 |
| Static head lacks og:image/url, twitter, canonical, theme-color | `frontend/index.html`, REQ-public-4 | partly done in 4e446ea: og:url and canonical not added (production domain unknown) |
| Logo 1,059 KB fetched twice | `frontend/public/logo.png`, REQ-public-10 | resized to 48,015 bytes in 4e446ea; the double fetch was not investigated |
| `AuthPage` and `GuestDashboardLogin`: 14 px inputs, 20 px eye buttons | owner 07 | GuestDashboardLogin fixed in 9200176; `AuthPage` not recorded as fixed in any report read |
| `getAvailableRooms` needs a login so it cannot serve the public page | `bookingRoutes.js` | open (P2, kept to avoid changing callers) |
| `getOrCreateGuestRole` unused (backend lint) | `publicBookingController.js` | pre-existing in baseline 67759ec, open (P3) |
| Backend lint | 0 errors / 16 warnings at the end (13 at the platform final pass) | not failures |
