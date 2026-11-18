# Bond

Bond turns a group chat plan into a shared record of who will do what by when. It is not a contract, and it does not message anyone.

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

## Architecture

- Next.js App Router and React, TypeScript strict, Tailwind CSS.
- SQLite through `better-sqlite3` and Drizzle, matching Ripple, Tether, and Halo. PostgreSQL is not wired up.
- Server routes under `src/app/api` call services in `src/lib`. Pages read those services directly.
- Sessions are random tokens stored only as a SHA-256 hash. The cookie is `bond_session`, `httpOnly`, `SameSite=Lax`, and `Secure` only on HTTPS.

This file grows as stages land. Stage 1 saves a display name and shows a labeled sample card. Creating a bond is not available yet.

## What is real, sandboxed, or disabled

| Capability | State |
| --- | --- |
| Save a name and timezone for this browser | Real. Session row in SQLite. |
| Sample agreement card on Home | A picture on the page. It is not your bond and cannot be joined. |
| Email, SMS, push, contacts sync, calendar accounts, payments | Disabled. Nothing is simulated. |

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs the same list on pushes to `main`.

This repository does not claim a compliance certification or that the app is ready for a public launch.
