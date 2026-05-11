# HMS Onboarding Guide

This guide is for engineers onboarding to HMS (Housing/Hotel Management System).

---

## 1) What this product is

HMS is an internal operations platform for managing:

- Rooms and room types
- Tenants and guests
- Bookings (fixed-term and rolling)
- Bills, payments, and deposits
- Financial transactions and exports
- Optional recurring jobs (monthly billing + reminder emails)

The UI language is largely Indonesian, while technical enum values are stored in English and translated in UI.

---

## 2) Repository structure

```text
src/app/
  (external)/             # unauthenticated pages (login/register/reset)
  (internal)/             # authenticated app
    (dashboard_layout)/   # main product modules
  api/                    # API routes (auth, cron, debug, exports)
  _db/                    # DB access layer
  _lib/                   # auth, utilities, zod schemas, mailer, integrations
  _components/            # reusable UI components
prisma/
  schema.prisma           # DB schema
  migrations/             # migration history
  scripts/                # one-off SQL scripts and fixes
__tests__/
  unit/                   # fast unit tests
  integration/            # DB-backed integration tests
docs/
  *.md                    # project docs/runbooks
```

---

## 3) Prerequisites

- Node.js 18+ (CI uses Node 18)
- npm
- Docker (recommended for local Postgres + optional cron stack)

---

## 4) Local setup (happy path)

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp env.example .env
```

3. Start local DB (option A - Docker compose):

```bash
docker compose -f .docker/docker-compose.yml up -d db
```

4. Generate Prisma client and apply schema:

```bash
npm run prisma-gen
npm run prisma-migrate
```

5. Start app:

```bash
npm run dev
```

6. Open app:

```text
http://localhost:3000
```

---

## 5) First-time app initialization

The app enforces initial setup using `APP_SETUP` setting.

Flow:

1. Login succeeds.
2. Internal layout checks `settings.APP_SETUP`.
3. If false/missing, user is redirected to `/first-time-setup`.
4. Wizard collects company name/logo and initial location.

Tip: if you are locked out of dashboard in local dev, verify `settings` table values.

---

## 6) Core modules to learn first

1. **Bookings**
   - fixed-term and rolling bookings
   - overlap checks
   - check-in/check-out and end-of-stay scheduling

2. **Bills + Payments**
   - auto-generated bills
   - payment allocation (auto/manual)
   - payment-to-bill mapping

3. **Deposits**
   - lifecycle status transitions
   - interaction with payment transactions
   - refund expense transactions

4. **Financials**
   - transaction listing
   - PDF/Excel export

5. **Cron jobs**
   - monthly rolling-bill generation
   - invoice reminder emails

---

## 7) Development workflows

### Run tests

```bash
npm test
npm run test:integration
```

Integration tests expect a reachable Postgres DB. Use helper script:

```bash
./scripts/intg-test-db.sh up
npm run test:integration
./scripts/intg-test-db.sh down
```

### Database migration workflow

```bash
npm run prisma-migrate
```

Then commit both:

- new migration under `prisma/migrations/*`
- updated generated Prisma client artifacts (if applicable)

### Logging and observability

- Axiom client/server wrappers are under `src/app/_lib/axiom/`.
- Server actions frequently call `after(() => serverLogger.flush())`.

---

## 8) Environment variables (core)

From root app usage and examples:

- `DATABASE_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `AWS_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AXIOM_DATASET`, `AXIOM_TOKEN`
- `NODE_ENV`

Cron stack also uses:

- `HMS_BASE_URL`
- `HMS_CRON_SECRET`
- `SMTP_*`
- `CRONICLE_*`

---

## 9) Common onboarding pitfalls

1. **No dashboard access after login**
   - likely first-time setup not completed (`APP_SETUP=false`)

2. **Integration tests fail immediately**
   - test DB is not running / `DATABASE_URL` mismatch

3. **S3 upload errors during payment proof upload**
   - missing AWS credentials / region / bucket

4. **Cron endpoint unauthorized**
   - missing/invalid `CRON_SECRET` header for cron calls

---

## 10) Suggested first-day learning path

1. Read `docs/architecture.md`.
2. Walk through booking creation path:
   - UI form -> booking action -> `_db/bookings.ts` -> bill creation.
3. Walk through payment creation path:
   - payment action -> allocation -> transaction updates.
4. Run unit tests for booking/payment/deposit behavior.
5. Read `docs/runbooks.md` before touching production-like operations.
