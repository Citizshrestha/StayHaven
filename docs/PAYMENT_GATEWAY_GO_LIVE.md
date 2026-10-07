# StayHaven — Payment Gateway Go-Live Guide

Covers eSewa, Khalti, and Stripe: what's already wired, what to configure for
a real go-live, and the pitfalls that most commonly break these integrations
in production. Written after end-to-end sandbox testing of all three
gateways (2026-08-07) — see the "What was actually verified" section for
what was clicked through live vs. verified from code.

---

## 1. Architecture summary

All three gateways follow the same shape:

1. Guest picks a room + dates on the public site → `POST
   /api/v1/public/bookings/create-with-payment` creates a `Booking`
   (`status: "Pending"`, `paymentStatus: "unpaid"`) inside a Mongo
   transaction, then calls the gateway-specific "initiate" function.
2. **eSewa / Khalti**: the response tells the frontend to redirect the guest
   to the gateway's own hosted payment page. After paying, the gateway
   redirects back to a **server** URL first (`success_url`/`return_url`),
   which independently re-verifies the payment against the gateway's own
   API/signature before ever marking the booking paid, then redirects the
   browser on to `CLIENT_URL/payment-callback`.
3. **Stripe**: the response includes a `clientSecret` for a real
   `PaymentIntent`; the frontend mounts Stripe's own `PaymentElement` (an
   iframe Stripe controls — card details never touch our server, so this
   flow is out of PCI-DSS scope for us). After the card is confirmed
   client-side, the frontend calls `POST
   /api/v1/public/bookings/verify-card-payment`, which re-verifies the
   PaymentIntent status directly with Stripe before marking the booking
   paid. The Stripe webhook (`/api/v1/reception/payments/webhook`) is a
   backup path that does the same re-verification if the client-side call
   never lands (tab closed mid-flow, etc.).

The common thread, and the thing to preserve if this code changes: **nothing
ever trusts a client-supplied "it succeeded" flag or an unverified webhook
payload.** Every path re-checks amount/status against the gateway's own API
(`verifyStripePayment`, eSewa's HMAC signature + `checkEsewaTransactionStatus`,
Khalti's `verifyKhaltiPayment` lookup) before writing `paymentStatus: "paid"`,
and every finalize path is idempotent (`if (booking.paymentStatus === 'paid'
&& booking.status === 'Confirmed') return already-processed`) so a retried
webhook or a duplicate callback can't double-charge or double-process.

---

## 2. eSewa

### Getting real credentials
1. Register a merchant account at **https://merchant.esewa.com.np**.
2. After approval you get a **Product Code (`SCD`)** and **Secret Key** —
   these replace the sandbox defaults.
3. Sandbox/UAT testing needs no registration: eSewa's publicly-documented
   UAT secret key `8gBm/:&EnhH.1/q` + product code `EPAYTEST` work against
   `rc-epay.esewa.com.np` out of the box (this is what `Backend/.env.example`
   defaults to when `ESEWA_SECRET_KEY`/`ESEWA_PRODUCT_CODE` are unset).

### Env vars
```
ESEWA_SECRET_KEY=<merchant secret key>
ESEWA_PRODUCT_CODE=<merchant product code>
```

### Base URL switching
`paymentGatewayService.js`'s `CONFIG.esewa.baseUrl()` switches automatically
on `NODE_ENV`: `rc-epay.esewa.com.np` (test) vs `epay.esewa.com.np`
(production) — nothing to configure manually beyond setting `NODE_ENV=production`.

### What was verified (this session, 2026-08-07)
- Booking creation → correct HMAC-SHA256 signed form payload → real redirect
  to eSewa's actual RC (sandbox) payment page, with the **correct amount**
  (NPR 11,760 for a 2-selected-room test booking — see the room-selection
  bug fix below).
- Cancel-before-paying path leaves the booking cleanly `Pending`/`unpaid`,
  no false "paid" state.
- **Could not complete a full successful payment**: eSewa's sandbox login
  form is behind bot-detection (a `captcha_server_code` request fires on
  the login page). Per this project's standing rule against bypassing
  CAPTCHAs, the final "log in to eSewa test account and approve payment"
  step needs a **human** to click through once before shipping — the
  server-side verification code (`handleEsewaCallback`,
  `verifyEsewaCallback`, `checkEsewaTransactionStatus`) was verified by
  reading, not by a completed live transaction.

---

## 3. Khalti

### Getting real credentials
1. Register/KYC at **https://admin.khalti.com** for live keys, or
   **https://test-admin.khalti.com** for a real *test* key (different from
   the live portal — test keys don't need KYC approval).
2. Copy the **Secret Key** into `KHALTI_SECRET_KEY`.

### Env vars
```
KHALTI_SECRET_KEY=<test_secret_key_... or live_secret_key_...>
KHALTI_PUBLIC_KEY=<matching public key>
```

### Base URL switching
`CONFIG.khalti.baseUrl()` switches on the **key's own prefix**, not
`NODE_ENV`: a key starting `live_` → `khalti.com/api/v2`, anything else →
`a.khalti.com/api/v2` (test). This means it's the key you paste in that
decides live vs. test, not an env flag — double-check which key is in
`.env` before going live.

### ⚠️ Current state in this environment
`Backend/.env`'s `KHALTI_SECRET_KEY` is still the literal placeholder
string (`test_secret_key_<...>`), which `paymentGatewayService.js` already
detects (`secretKey.includes("test_secret_key_<") || secretKey.length <
20`) and safely falls back to **mock mode** in development — payments
"succeed" via a fake redirect straight to the verify endpoint, never
touching Khalti's real API. This is correct, safe behavior for a key-less
dev environment (the production-safety gate — mock mode is refused outside
`NODE_ENV !== 'production'` — was already audited and confirmed intact
in `PROJECT_AUDIT.md`), but it means **no real Khalti API call has been
exercised in this environment**. Before go-live: paste a real key from
test-admin.khalti.com and re-run one sandbox payment for real to confirm
the actual API integration (not just the mock path).

### What was verified (this session, 2026-08-07)
- Booking creation → mock-mode redirect → mock verify endpoint → booking
  correctly flips to `Confirmed`/`paid`, visible in guest Bookings/Billing.
- Confirmed the mock-mode gate itself only fires when the key is a
  detected placeholder, and only in non-production — i.e. this code path
  cannot accidentally activate in production.
- Did **not** verify a real Khalti API round-trip (no real test key present
  — see above).

---

## 4. Stripe (card payments)

### Getting real credentials
Dashboard → **https://dashboard.stripe.com/test/apikeys** for test keys,
switch to live mode for production keys. Also create a webhook endpoint
(Dashboard → Developers → Webhooks) pointing at
`<your-server>/api/v1/reception/payments/webhook`, subscribed to at least
`payment_intent.succeeded`, and copy its **signing secret**.

### Env vars
```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```
Frontend also needs `VITE_STRIPE_PUBLISHABLE_KEY` set to the same
publishable key (`frontend/.env`).

### Current state in this environment
`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` are real Stripe **test-mode**
keys (confirmed by prefix/length only, values never printed). Real
PaymentIntents are being created against Stripe's actual test API — this is
not mock mode. `STRIPE_WEBHOOK_SECRET` is still a placeholder, which is
fine for testing since the primary confirmation path
(`verify-card-payment`, called directly by the frontend after
`stripe.confirmPayment`) re-verifies with Stripe's API independently of the
webhook; the webhook is only the backup path for abandoned tabs. Set a real
webhook secret before go-live so that backup path also works.

### What was verified (this session, 2026-08-07)
- Booking creation → real Stripe test-mode PaymentIntent created with the
  **correct amount** (NPR 7,840) → Stripe Elements `PaymentElement`
  mounted correctly in an iframe, confirmed via real network requests
  (no card data ever sent to our server — matches the PCI-DSS-scoped
  design from the Critical #1 audit fix).
- **Could not complete the final "type test card 4242 4242 4242 4242 and
  submit" step**: this specific browser-automation session had a
  rendering/compositing issue (`Browser pane is not displayed, so the page
  is not compositing frames`) that made coordinate-based clicks into
  Stripe's cross-origin iframe resolve unreliably. This is a tooling
  limitation of the automated test session, not an app defect — Stripe's
  `PaymentElement` deliberately can't be filled via JS (that's the whole
  point of it being PCI-scope-isolated). Before go-live, do one manual
  click-through with card `4242 4242 4242 4242`, any future expiry, any
  CVC, and confirm the booking flips to `Confirmed`/`paid` and appears in
  guest Billing.

---

## 5. `CLIENT_URL` / return-URL configuration

`CONFIG.clientUrl()` (`paymentGatewayService.js`) reads `CLIENT_URL` and is
used for:
- eSewa's `failure_url` and the post-verification redirect target.
- Khalti's `website_url` field.
- The final `<CLIENT_URL>/payment-callback?...` redirect after either
  gateway's server-side verification completes.

`SERVER_URL` (defaults to `http://localhost:3000`) is the **separate** var
used for the gateway-facing `success_url`/`return_url`s (`/api/v1/webhooks/
esewa/verify`, `/api/v1/webhooks/khalti/verify`) — these must be reachable
*by the gateway*, not by the guest's browser, which is the next pitfall.

---

## 6. Go-live checklist

For bank transfers, configure the *real receiving account for each hotel* before
offering the option. An authenticated hotel owner/admin can update their hotel
through `PUT /api/v1/hotels/:id` with:

```json
{
  "bankTransferAccount": {
    "enabled": true,
    "accountName": "<verified account holder>",
    "bankName": "<actual bank>",
    "accountNumber": "<actual receiving account number>",
    "branch": "<optional branch>"
  }
}
```

The guest billing page displays that account only when enabled; otherwise bank
transfer is unavailable, and the server also refuses submissions. A submitted
bank slip is **not proof of payment**. Reception must match its reference and
amount to the bank statement, then approve it in the pending-bank-transfer
review panel. Never approve from a screenshot or guest-entered reference alone.

- [ ] Configure and independently verify each hotel's receiving account.
- [ ] Have reception reconcile one small real bank transfer against the bank
      statement before relying on the manual workflow.

- [ ] `NODE_ENV=production` set on the real server (flips eSewa's base URL,
      disables Khalti/Stripe mock fallbacks, tightens `envValidator.js`
      production-only checks).
- [ ] Real `ESEWA_SECRET_KEY` / `ESEWA_PRODUCT_CODE` from
      merchant.esewa.com.np in place (not the UAT defaults).
- [ ] Real `KHALTI_SECRET_KEY` starting `live_` from admin.khalti.com.
- [ ] Real `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (`sk_live_`/
      `pk_live_`) and a live-mode webhook + `STRIPE_WEBHOOK_SECRET`.
- [ ] `CLIENT_URL` set to the real production frontend origin (HTTPS, no
      `localhost`) — `envValidator.js` already warns if `localhost` is
      detected while `NODE_ENV=production`.
- [ ] `SERVER_URL` set to the real, publicly-reachable backend origin
      (HTTPS) — this is what eSewa/Khalti redirect back to server-side.
- [ ] `JWT_SECRET`/`JWT_REFRESH_SECRET`/`JWT_ACCESS_SECRET` are strong,
      distinct, non-default values (`envValidator.js` fails startup
      otherwise in production).
- [ ] Run one small real transaction through **each** gateway with a real
      card/wallet before opening to real guests — confirm: redirect →
      real payment page → completes → booking flips to `Confirmed`/`paid`
      → shows in guest Billing → invoice/PaymentTransaction record created.
- [ ] Confirm a **cancelled/failed** payment on each gateway does *not*
      mark the booking paid (all three finalize paths already guard this
      by construction, but verify live once).
- [ ] `SENTRY_DSN` set so payment-path exceptions are actually captured in
      production (`envValidator.js` warns if missing).

## 7. Common pitfalls

- **Redirect URL mismatch**: eSewa/Khalti merchant dashboards often
  require the exact `success_url`/`return_url` to be pre-registered. If
  `SERVER_URL` doesn't match what's registered on the gateway's side,
  the redirect back after payment silently fails or 404s on the
  gateway's end — double check the registered URLs match `SERVER_URL`
  exactly (including `https://`, no trailing slash mismatches).
- **Webhook unreachable from localhost**: Stripe's webhook (and any
  gateway's server-to-server callback) cannot reach `localhost` — during
  local dev/staging testing, use `ngrok http 3000` (or similar) and point
  the gateway's webhook config at the tunnel URL, otherwise the backup
  finalize path silently never fires and you'll only ever see the
  client-driven confirmation path working.
- **Test/live key mixups**: Khalti's base URL is derived from the key
  prefix itself (`live_` vs everything else) — pasting a live key into a
  staging `.env` will silently start hitting Khalti's real production API.
  eSewa/Stripe key mixups are usually caught by the gateway rejecting the
  mismatched base URL/key combo outright, but Khalti's silent live-URL
  switch is easy to miss; audit `KHALTI_SECRET_KEY`'s prefix specifically
  before any non-production deploy.
- **Amount mismatches**: this app already re-verifies amount server-side
  against each gateway's own API before marking paid — do not remove that
  re-verification if this code is ever refactored (a client- or
  webhook-payload-supplied amount must never be trusted directly).
- **Room/booking gets "stuck" and blocks re-testing**: found and fixed
  during this session's testing (see below) — was not a payment-specific
  bug, but showed up repeatedly *while* testing payments, so noting it
  here too.

---

## 8. Bug found & fixed during this testing pass

**Rooms could get permanently stuck "reserved", blocking all future
bookings.** `room.status` (`available` / `occupied` / `reserved` / ...) is
front-desk state — what reception sees *right now* — but both the public
booking flow and reception's advance-booking flow were gating **and
claiming** on that same flag for bookings dated months in the future. Once
any booking (even an abandoned, never-paid one) touched a room, it flipped
to `reserved` and nothing ever reverted it except an explicit cancel — so
the room became unbookable for *any* date, including dates far beyond the
original booking, until a human manually cancelled it. Reproduced live
during Stripe testing (a room I'd abandoned mid-payment earlier blocked a
completely unrelated future date range). Fixed in
`Backend/controllers/publicBookingController.js` and
`Backend/controllers/bookingController.js`: the atomic `available →
reserved/occupied` claim (and its pre-check) now only applies to
same-day bookings; future-dated bookings rely solely on the existing
date-range overlap check (`checkRoomAvailability`), matching how the
walk-in check-in flow (which is always same-day) already worked correctly.
