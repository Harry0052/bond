# Bond

Bond turns a group chat plan into a shared record of who will do what by when. People accept their own part. It is not a contract, it does not hold money, and it does not message anyone.

The working codename in the original brief was PACT. The product name is Bond.

## Quickstart

Node.js 22 or newer. No API key.

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run db:setup` creates `data/bond.db` and applies the SQL in `drizzle/migrations`. The database path is `BOND_DB_PATH` (see `.env.example`).

A production-style local process:

```bash
npm run db:setup
npm run build
npm run start
```

## Architecture

- Next.js App Router and React, TypeScript strict, Tailwind CSS.
- SQLite through `better-sqlite3` and Drizzle. This matches the owner's sibling apps, Ripple, Tether, and Halo, so Bond runs locally without a hosted database. PostgreSQL is not wired up.
- Server routes under `src/app/api` call services in `src/lib`. Pages read those services directly.
- Sessions are random tokens stored only as a SHA-256 hash. The cookie is `bond_session`, `httpOnly`, `SameSite=Lax`, and `Secure` only on HTTPS.
- Share links are HMAC-signed. Only the hash is stored. A bad signature is rejected before any bond is read.
- Due times are stored in UTC and shown in each member's IANA timezone.
- Cache Components are off so one person's bonds are not placed in a shared cache.

```text
src/app            routes and pages
src/components     shell, bonds, and design-system pieces
src/lib/db         schema, migrations, seed
src/lib/auth       sessions and display names
src/lib/bonds      create, join, accept, progress
src/lib/reminders  opt-in in-app reminders
src/lib/templates  reusable bonds
src/lib/calendar   .ics download
src/lib/account    export and deletion
```

## What is real, sandboxed, or disabled

| Capability | State |
| --- | --- |
| Save a name and timezone for this browser | Real. Session row in SQLite. |
| Create a bond, list it, open it after refresh | Real. |
| Share link and guest preview | Real. The preview omits private history and account ids. |
| Join and accept, or decline | Real. Acceptance is explicit. A second accept does not add a row. |
| Mark done, with who and when | Real. |
| Change the task, time, or person | Real. The earlier acceptance no longer counts. |
| Remove a person | Real. They lose the private bond and its activity. |
| Sample bond | Real seed rows, labeled Sample. Changes and joining are off. |
| In-app reminders | Real, and off until you opt in. Times use your timezone. |
| Calendar file (`.ics`) | Real download. No calendar account is connected. |
| Templates | Real. Using one creates a new bond. |
| Download JSON, delete data | Real for the current session. |
| Share-link signing without `BOND_SHARE_SECRET` | Sandbox. The share panel says the local development key is in use. |
| Email, SMS, push, contacts sync, calendar accounts, payments, escrow | Disabled. Nothing is simulated. |
| Hosted Postgres | Not in this repo. Not verified in CI. |

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs the same list on pushes to `main`. Playwright deletes and recreates `data/bond-e2e.db` for that run.

Screenshots of the main screens are in `docs/screenshots`. Deployment and rollback notes are in `docs/RUNBOOK.md`. The unrun pilot plan is in `docs/PILOT.md`.

This repository does not claim a compliance certification or that the app is ready for a public launch.
