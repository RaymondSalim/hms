# HMS Runbooks

Operational runbooks for development, staging, and production-like support.

> Audience: engineers, on-call responders, and maintainers.

---

## 0) Quick command index

### App

```bash
npm install
npm run dev
npm run build
npm run start
```

### Prisma

```bash
npm run prisma-gen
npm run prisma-migrate
npx prisma migrate deploy
npx prisma db push
npx prisma validate
```

### Tests

```bash
npm test
npm run test:integration
./scripts/intg-test-db.sh up
./scripts/intg-test-db.sh down
```

### Docker

```bash
docker compose -f .docker/docker-compose.yml up -d
docker compose -f .docker/docker-compose.yml down
docker compose -f .docker/docker-compose.test-db.yml up -d
docker compose -f .docker/docker-compose.test-db.yml down -v
```

---

## 1) Service startup runbook (local)

### Goal

Start HMS app and database locally for development.

### Steps

1. Ensure `.env` exists (copy from `env.example`).
2. Start DB:

```bash
docker compose -f .docker/docker-compose.yml up -d db
```

3. Run migrations and generate client:

```bash
npm run prisma-gen
npm run prisma-migrate
```

4. Start app:

```bash
npm run dev
```

5. Validate:

- open `http://localhost:3000`
- confirm login or first-time setup page is reachable

### Rollback / stop

```bash
docker compose -f .docker/docker-compose.yml down
```

---

## 2) Integration test DB runbook

### Goal

Run integration tests against isolated Postgres.

### Steps

```bash
./scripts/intg-test-db.sh up
npm run test:integration
./scripts/intg-test-db.sh down
```

### Failure modes

- DB container not healthy: inspect docker logs for `test-db` service.
- Prisma migration failure: ensure `DATABASE_URL` points to test DB port `55432`.

---

## 3) Database schema change runbook

### Goal

Safely introduce schema and code changes.

### Steps

1. Update Prisma schema.
2. Create migration:

```bash
npm run prisma-migrate
```

3. Run tests:

```bash
npm test
npm run test:integration
```

4. Verify migration SQL under `prisma/migrations/*`.
5. Commit schema + migration + related code changes.

### Production notes

- CI includes Prisma validation/db push workflow on `main`.
- For risky financial changes, prepare one-off verification SQL and rollback SQL (pattern already used in `prisma/scripts/`).

---

## 4) Payment allocation incident runbook

### Symptoms

- A booking shows inconsistent paid totals.
- Transaction totals do not match expected bill allocation.
- Deposit status appears incorrect after payment edit.

### Investigation checklist

1. Identify affected `booking_id` and `payment_id`.
2. Inspect payment allocations (`payment_bills`) for the booking.
3. Inspect `bill_items` and check deposit-related item markers (`related_id.deposit_id`).
4. Inspect `transactions` filtered by `related_id.payment_id`.
5. Compare amounts:
   - payment total
   - allocated amount sum
   - regular income + deposit income transaction totals

### Remediation

- Re-run payment update flow using application path if possible (preferred).
- If manual correction required, do DB transaction with before/after snapshots.
- Add/adjust unit tests for reproduced edge case before closing incident.

---

## 5) Deposit status incident runbook

### Symptoms

- Deposit stuck in wrong status (`UNPAID` vs `HELD`, etc.).
- Refund recorded but no expense transaction.
- Double-counted income suspicion.

### Investigation

1. Find deposit row by booking.
2. Inspect related bill item (`related_id.deposit_id`).
3. Check payment allocations touching deposit bill item.
4. Check transaction rows in category `Deposit` for this booking/payment.

### Expected behaviors

- `APPLIED`: no new income transaction.
- `REFUNDED` / `PARTIALLY_REFUNDED`: creates expense transaction.
- paid deposit generally implies `HELD`.

### Remediation

- Use deposit status update action path (not ad-hoc SQL) where possible.
- Backfill missing transactions only with documented SQL scripts and peer review.

---

## 6) Rolling monthly billing runbook

### Goal

Ensure recurring bills are generated for active rolling bookings.

### Trigger

- Scheduled monthly (1st day) via cron endpoint.

### Manual invocation

```bash
curl -X POST "http://localhost:3000/api/cron/monthly-billing" \
  -H "x-cron-secret: <CRON_SECRET>"
```

### Debug simulation endpoint

```bash
curl "http://localhost:3000/api/debug/cron/monthly-billing?target_date=2024-09-01" \
  -H "Authorization: Bearer <auth_token>"
```

### Verification

- check response summary (`processed`, `created` counts)
- inspect newly created bills for sample booking IDs

---

## 7) Invoice reminder runbook

### Goal

Send reminders for unpaid bills approaching due date.

### Manual invocation

```bash
curl "http://localhost:3000/api/tasks/email/invoice-reminder" \
  -H "x-cron-secret: <CRON_SECRET>"
```

### Debug simulation

```bash
curl "http://localhost:3000/api/debug/tasks/email/invoice-reminder?start_date=2024-09-28" \
  -H "Authorization: Bearer <auth_token>"
```

### Verification

- validate reminder count from endpoint response
- inspect `emaillogs` entries
- check setting `MONTHLY_INVOICE_EMAIL_REMINDER_ENABLED`

---

## 8) Cronicle stack runbook

### Goal

Run scheduled jobs using the included cron container.

### Setup

1. Copy and edit cron env:

```bash
cp cron/env.example cron/.env
```

2. Start cron stack:

```bash
docker compose -f cron/docker-compose.yml --env-file cron/.env up -d
```

3. Open Cronicle UI at `http://localhost:3012`.

### Stop

```bash
docker compose -f cron/docker-compose.yml --env-file cron/.env down
```

### Common issues

- wrong `HMS_BASE_URL` (cron cannot reach app)
- missing `HMS_CRON_SECRET`
- SMTP auth failures

---

## 9) S3 upload failure runbook (payment proof)

### Symptoms

- Payment submission fails when proof file attached.
- Error logs indicate PutObject failure.

### Checklist

- `AWS_REGION` configured
- `S3_BUCKET` configured
- IAM credentials present and valid
- bucket policy allows put/delete

### Safe fallback

- retry payment creation without proof upload for business continuity
- attach proof later after credentials fixed

---

## 10) CI failure runbook

### Common failing jobs

1. `Run Tests` workflow
   - unit test failures
   - integration test DB/migration issues

2. `Prisma DB Push` workflow on `main`
   - invalid `DATABASE_URL` secret
   - schema validation errors

### Response procedure

1. Identify first failing step.
2. Reproduce locally with same command.
3. Fix or revert offending commit.
4. Re-run CI.

---

## 11) Incident severity and communication template

### Severity quick guide

- **SEV-1**: production down or financial corruption risk
- **SEV-2**: major feature degraded (payments/billing broken)
- **SEV-3**: localized bug with workaround

### Incident note template

```text
Title: [SEV-X] <short description>
Start time:
Detected by:
Affected module(s):
Customer impact:
Current status:
Mitigation:
Next update ETA:
Owner:
```

---

## 12) Post-incident checklist

- Root cause documented
- Data corrections audited
- Tests added for regression
- Runbook updated
- Action items tracked with owners/dates
