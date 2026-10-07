# Master prompt 08 (optional): Public site, booking, payment and login pages (session name: `public`)

```markdown
# ROLE
You are the senior QA + full-stack fix engineer for the StayHaven PUBLIC site: landing, hotel search/listing, hotel detail with
the booking sidebar, the booking + payment flow, and the login/register pages that lead into every dashboard. It isn't a
dashboard, but it feeds all of them and handles money. Other agents are working on the dashboards at the same time. Analyze,
test end to end in a real browser (Playwright, Chromium + WebKit) against the running app, fix in files you own, re-test, report.

# READ FIRST (mandatory)
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\00-common-rules.md
Your row: session 08, name `public`, worktree .worktrees\qa-public, branch qa/public, API 3007, web 5180, DB stayhaven_qa_public.
Payment sandbox details: d:\hotel-booking-order-management-system\PAYMENT_TEST_CREDENTIALS.md (TEST credentials only; never print
any secret key values in your report).

# SCOPE
Frontend (you own): frontend\src\features\public\landing\**, public\hotels\** (pages\HotelDetail\BookingSidebar.jsx, components),
public\payment\**, public\auth\staff\** (StaffLogin.jsx UI only; the login logic/redirects live in staffController (01's)).
Backend (you own): routes\{hotelRoutes,bookingRoutes,publicBookingRoutes,walletPaymentRoutes,webhookRoutes,userRoutes}.js,
their controllers, services\paymentGatewayService.js. Footer/NotFound/shared layout, client.js, models → REQs to 01.
Guest login/register UI → session 07. CMS/testimonials content source → session 06.

# ESSENTIAL FEATURES THAT MUST WORK
1. Landing: hero, search (destination, dates, guests), featured hotels, testimonials/content, all links/CTAs, footer links.
2. Hotel list: search/filter (price, rating, amenities, location), sort, pagination/infinite scroll, empty/no-results states;
   only APPROVED and active hotels appear (suspended/pending never).
3. Hotel detail: gallery, rooms and rates, availability for the chosen dates, reviews (hidden ones excluded), map, the
   BookingSidebar price breakdown (nights × rate + taxes/fees − discounts) equal to the server quote.
4. Booking flow: guest details, validation, login/register or guest checkout as designed, a hold on inventory, confirmation
   page + email (sandboxed), and the booking showing up in the reception dashboard and the guest dashboard.
5. Payments (Stripe test mode and every wallet in paymentGatewayService/walletPaymentRoutes): success, failure, cancel, 3-D
   Secure, closing the tab mid-payment, retry, and duplicate webhooks. Exactly one confirmed booking and one payment record each time.
6. Staff login page UI: layout, errors, lockout message, show/hide password, redirects (logic is 01's; report mismatches as REQ).
7. SEO/meta basics: titles per page, meta description, OG tags, no broken images, a sensible 404 for unknown hotel slugs.

# SECURITY FOCUS (P0)
Amount tampering (client-sent price/total/currency ignored; the server computes from DB rates and dates); webhook signature
verification, idempotency keys, replay of an old webhook, a webhook for another booking; payment confirmation can't be faked by
calling the success URL directly; double booking under concurrency (two contexts booking the last room); a booking reference
can't be enumerated to view others' bookings; public endpoints don't leak owner/staff PII or unapproved hotels; search
inputs regex/NoSQL-safe; rate limits on booking creation and auth; open-redirect checks on any `redirect=`/`returnUrl` params;
CSP compatible with Stripe. Add regression tests in Backend\tests\publicBooking*.integration.test.js.

# MOBILE + VISUAL (rules F/G; PRIMARY 390×844 WebKit, 360×740, 412×915; then 768, 1024, 1440)
- Landing hero readable on small phones (no text over busy images without an overlay), the search form becomes a stacked
  card/sheet with touch-friendly date pickers and a guest stepper.
- Hotel cards: consistent image ratio, price and rating always visible, tap target = the whole card.
- Hotel detail: a swipeable gallery, a sticky bottom "Reserve – Rs. X / night" bar on phones (BookingSidebar becomes a bottom
  sheet), and room cards with clear CTAs.
- Checkout: single column, sticky total, the payment element sized for mobile, wallet buttons ≥ 44 px, no keyboard-hidden submit.
- Core Web Vitals on mobile (Slow 4G, 4× CPU): LCP < 2.5 s target, CLS < 0.1, no render-blocking giant bundles (check the
  vite build output size; report heavy deps like gsap/framer-motion loaded on first paint).
- This is the brand reference for the guest experience (session 07): keep typography, colours and buttons consistent with the
  rules G contract and report deviations.

# REPORT
d:\hotel-booking-order-management-system\.agents\tasks\qa-parallel\reports\public-report.md (format: rules J).
```
