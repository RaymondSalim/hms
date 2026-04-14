# HMS

HMS is a Next.js + Prisma based management platform for room/property operations:

- bookings (fixed-term + rolling)
- residents (tenants + guests)
- billing, payments, deposits
- financial reporting and exports
- scheduled jobs for monthly billing and invoice reminders

## Documentation

Start here:

- [Documentation Hub](docs/README.md)
- [Onboarding Guide](docs/onboarding.md)
- [Architecture Guide](docs/architecture.md)
- [Runbooks](docs/runbooks.md)
- [Cron Jobs](docs/cron-jobs.md)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy env:

```bash
cp env.example .env
```

3. Start DB (docker):

```bash
docker compose -f .docker/docker-compose.yml up -d db
```

4. Generate prisma client and migrate:

```bash
npm run prisma-gen
npm run prisma-migrate
```

5. Start app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
npm run test:integration
```

For integration DB helper:

```bash
./scripts/intg-test-db.sh up
npm run test:integration
./scripts/intg-test-db.sh down
```
