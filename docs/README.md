# HMS Documentation Hub

Welcome to the HMS documentation hub. Use these docs for onboarding, architecture understanding, and day-to-day operations.

## Documents

1. **[Onboarding Guide](./onboarding.md)**
   - Quick project orientation
   - Local development setup
   - Common workflows
   - Key concepts and glossary

2. **[Architecture Guide](./architecture.md)**
   - System context and module boundaries
   - Request flow and data flow
   - Core domain model (bookings, bills, payments, deposits, add-ons)
   - Important design decisions and edge cases

3. **[Runbooks](./runbooks.md)**
   - Service startup/shutdown
   - Database operations
   - Cron operation/debugging
   - Incident response playbooks
   - Deployment/CI troubleshooting

4. **[Cron Jobs Documentation](./cron-jobs.md)**
   - Monthly billing and reminder jobs
   - Debug endpoints and operational notes

## Intended audience

- **New engineers**: start from `onboarding.md`, then `architecture.md`.
- **On-call/operations**: keep `runbooks.md` and `cron-jobs.md` handy.
- **Feature development**: use `architecture.md` + code references from onboarding.

## Current stack at a glance

- Next.js (App Router), React, TypeScript
- Prisma + PostgreSQL
- NextAuth (credentials)
- AWS S3/SES integration points
- Jest unit + integration test suites
- Optional Cronicle container for scheduled jobs
