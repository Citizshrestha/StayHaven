# 🏨 StayHaven - Hotel Booking & Order Management System

[![Node.js](https://img.shields.io/badge/Node.js-v20.19+-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6+-green.svg)](https://www.mongodb.com/)

> A hotel management platform covering room booking, in-room dining, staff workflows and
> platform administration, with real-time order and notification flow over Socket.IO.
> Payments are wired for the Nepal market (Khalti, eSewa, bank transfer) alongside Stripe.

## ✨ Key Features

- **Booking** - Room reservations, multi-property support, public guest booking with payment
- **Restaurant System** - QR-code in-room ordering, kitchen dashboard, table management
- **Staff Tools** - Role-based dashboards for reception, waiters, kitchen and managers
- **Operations** - Housekeeping tasks, maintenance schedules, shift handovers, waiter calls
- **Hotel Admin** - Rooms, menus, staff, tables, invoices, feedback
- **Super Admin** - Cross-hotel finance (commissions, payouts, refunds), review moderation,
  system configuration, maintenance mode, audit logs
- **Payments** - Stripe, Khalti, eSewa and bank transfer, with gateway webhooks
- **Real-time** - Socket.IO notifications and live order tracking
- **Mobile-first Design** - Responsive interface optimized for all devices

## 🛠️ Tech Stack

**Frontend:** React 19 • Vite 7 • Tailwind CSS 4 • React Router 7 • Socket.IO Client • Framer Motion • GSAP

**Backend:** Node.js • Express 5 • MongoDB • Mongoose 8 • Socket.IO • JWT (access/refresh)

**Services:** Cloudinary • Google OAuth • Brevo SMTP • Stripe / Khalti / eSewa • Redis (optional) • Sentry (optional)

## 📁 Repository Layout

Three npm packages. The repo root is a Vite shell whose `root` is set to `./frontend`,
plus convenience scripts that drive the other two.

```
StayHaven/
├── package.json           # Root: Vite shell + orchestration scripts
├── vite.config.js         # root: './frontend' — also guards against sandbox
│                          # payment keys leaking into production builds
│
├── Backend/               # Express API server
│   ├── config/            # DB, socket, mailer, Sentry configuration
│   ├── controllers/       # Business logic & API handlers
│   ├── middleware/        # Auth, validation, rate limiting
│   ├── models/            # Mongoose schemas (~41)
│   ├── routes/            # API endpoint definitions (~23 groups)
│   ├── services/          # Payment gateways, notifications, integrations
│   ├── scripts/           # Seeding & maintenance scripts
│   ├── tests/             # node:test suites + manual testing docs
│   ├── utils/             # Helper functions
│   └── server.js          # Application entry point
│
├── frontend/              # React SPA (~254 components)
│   ├── src/
│   │   ├── app/           # App root (App.jsx with routes)
│   │   ├── core/          # api/ (client + services), context/, hooks/, utils/, routes/, socket/, audio/, services/
│   │   ├── shared/        # Shared components/, layout/, ui/, pages/, utils/
│   │   ├── features/      # guest / public / staff feature modules
│   │   └── main.jsx       # Entry point
│   ├── tests/
│   └── .env.example       # Vite env template (see note below)
│
└── docs/                  # Documentation files
```

## 🚀 Quick Start

### Prerequisites
- Node.js `^20.19.0 || >=22.12.0` — required by Vite 7. The backend alone runs on
  Node 18, but the frontend build will not. No package declares `engines`, so npm
  will not warn you about a too-old runtime.
- MongoDB >= 6 (local, or a MongoDB Atlas cluster)
- npm >= 9

### 1. Install dependencies

```bash
npm run install:all     # installs root, frontend, and Backend
```

### 2. Configure environment

Both packages ship documented templates. Copy them rather than writing `.env`
files from scratch — the templates carry security notes and the full variable
set, and they stay in sync with the code:

```bash
cp Backend/.env.example Backend/.env
cp frontend/.env.example frontend/.env
```

Then fill in real values. The minimum to boot locally:

| Variable | Package | Notes |
|---|---|---|
| `MONGODB_URI` | Backend | Local or Atlas connection string |
| `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Backend | Three *different* random secrets, 64+ chars |
| `PORT` | Backend | Defaults to 3000 — see the port note below |
| `CLIENT_URL` | Backend | `http://localhost:5173` for local dev |
| `VITE_API_BASE_URL` | frontend | `http://localhost:3000` — no trailing slash, no `/api` suffix |

Cloudinary, SMTP, OAuth, SMS and payment-gateway credentials are optional for a
first boot; the features that depend on them will be inactive until configured.

> ⚠️ **Vite env files live in `frontend/`, not the repo root.** `vite.config.js`
> sets `root: './frontend'`, and Vite's `envDir` defaults to `root`. A `VITE_*`
> variable placed in the repo-root `.env` is silently ignored.

> ⚠️ **`VITE_*` variables are inlined into the browser bundle and are public.**
> Server-side payment secrets belong in `Backend/.env` only, and must never be
> named `VITE_*`. Use Stripe's publishable key (`pk_...`) on the frontend, never
> the secret key.

### 3. Start the servers

```bash
npm run backend     # Terminal 1 — Express API (nodemon)
npm run frontend    # Terminal 2 — Vite dev server
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1

> **Port note:** if `PORT` is unset, the backend starts at 3000 but will
> auto-select the next free port when 3000 is taken. The frontend has no way to
> discover that, so set `PORT` explicitly and keep `VITE_API_BASE_URL` matched to
> it.

## 🗄️ Database Seeding

### Manual seed scripts

```bash
cd Backend

node scripts/seedMenuItems.js          # menu items (food & drinks)
node scripts/createTestGuestBooking.js # test guest with a booking
node scripts/seedNepaliGuests.js       # Nepali guest sample data (optional)
node scripts/debugGuestBooking.js      # troubleshoot guest booking data
```

Re-seed when starting fresh after a database reset, when testing features that
need sample data, or when seed-file contents change.

⚠️ **Before re-seeding:** back up anything you care about (seeding may overwrite
records), make sure MongoDB is reachable, and confirm `MONGODB_URI` points at the
database you intend to write to.

### Automatic demo seeding (opt-in, destructive)

The server can also seed demo hotels, bookings, guests, payouts, refunds,
transactions and reviews on **every boot**, gated behind `ENABLE_DEMO_SEED=true`
in `Backend/.env`.

Leave it unset unless `MONGODB_URI` points at a disposable database. It is
deliberately opt-in rather than inferred from `NODE_ENV`, because `NODE_ENV` is
commonly unset in local shells while developer `.env` files here point at a live
Atlas cluster. `AUTO_SEED_DEMO=false` is an absolute kill switch that overrides
`ENABLE_DEMO_SEED`, and production refuses to seed regardless.

💡 If images 404, check that seed-file image URLs are reachable and Cloudinary
credentials are set. Patch scripts exist for individual items (e.g.
`patchMasalaTeaImage.js`).

## 🔗 API Endpoints

Application routes are mounted under `/api/v1` (see `Backend/server.js` for the
authoritative list). Two exceptions: health checks live at `/health`, outside the
versioned prefix, and `/api/content` exists as an unversioned alias of
`/api/v1/content`.

| Prefix | Purpose |
|---|---|
| `/auth` | Register, login, Google OAuth |
| `/user`, `/users`, `/profile` | Account and profile management |
| `/hotels`, `/company` | Hotel and company management |
| `/rooms`, `/tables` | Room and table QR management (authenticated) |
| `/bookings` | Booking management (authenticated/staff) |
| `/public/bookings` | Guest booking + payment (no auth) |
| `/guest` | Guest QR scanning (public) |
| `/guest/portal` | Guest dashboard (authenticated) |
| `/staff`, `/reception` | Staff and reception dashboard APIs |
| `/payments` | Wallet / gateway payment flows |
| `/webhooks` | Payment gateway webhooks (public) |
| `/feedback`, `/testimonials` | Feedback submission, public testimonials |
| `/content` | CMS content (hero banners, destinations, footer, about) |
| `/superadmin` | Platform management (superadmin only) |
| `/superadmin/finance` | Commissions, payouts, refunds |
| `/superadmin/reviews` | Review moderation |
| `/superadmin/system` | System configuration, maintenance mode |
| `/seed` | Seed test data (admin only) |

Requests to `/api/*` pass through a rate limiter, backed by Redis when
`REDIS_URL` is set and in-memory otherwise. The in-memory store resets on
restart and is not shared across instances, so set `REDIS_URL` for any
multi-instance deployment.

## 🏃‍♂️ Development

### Code Standards
- ESLint for both packages (`npm run lint` at root or in `frontend/`)
- Conventional commits
- Component-driven development

### Testing

Backend tests run on the built-in `node:test` runner, using
`mongodb-memory-server` for integration suites — no external database needed:

```bash
cd Backend
npm test               # full suite (serialized)
npm run test:unit      # demo-seed safety + payment gateway
npm run test:gateway   # payment gateway
npm run test:safety    # demo-seed safety guards
npm run test:wallet    # wallet payments integration
npm run test:banktransfer  # bank transfer integration
```

From the repo root, `npm run test:backend` runs the full backend suite.

Coverage is concentrated on payments and seed safety. `frontend/tests/` holds
`walletPayments.test.mjs` but the frontend package has no `test` script wired up,
so it is not part of any automated run. Broader coverage — API route tests and
frontend component tests — remains a known gap.

## 🚀 Deployment

### Frontend (Vercel)

Build from the repo root; `vercel.json` carries the configuration.

```bash
npm run build     # vite build --mode production
vercel --prod
```

The production build **fails fast** if it would ship sandbox payment
credentials. Vite loads `.env` before overlaying `.env.production`, so a
`pk_test_` key left in `frontend/.env` would otherwise leak into a production
bundle and break real payments at confirmation time. Define the full set of
payment keys in `.env.production`, not just the ones that differ. Override
deliberately with `ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD=true`.

### Backend (Railway/Heroku)

```bash
railway login
railway init
railway deploy
```

Set the full `Backend/.env` variable set in the platform's environment config.
For production: use live payment keys, point `PAYMENT_SERVER_URL` and
`PAYMENT_CLIENT_URL` at public HTTPS origins (wallet callbacks require it), and
set `REDIS_URL`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

No `LICENSE` file is currently committed. `Backend/package.json` declares `ISC`,
while the root and frontend packages declare nothing — licensing is unresolved,
so treat the code as all-rights-reserved until the owners settle it.

---

<div align="center">
  <p>Made with ❤️ by the StayHaven Team</p>
</div>
