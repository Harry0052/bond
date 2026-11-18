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

This file grows as stages land. You can create a bond, share it, accept a part, mark it done, and change it. A material change clears the earlier acceptance. Reminders, calendar files, and templates come next.

## What is real, sandboxed, or disabled

| Capability | State |
| --- | --- |
| Save a name and timezone for this browser | Real. Session row in SQLite. |
| Create a bond, list it, open it again | Real. Rows in SQLite. Due times are stored in UTC and shown in your timezone. |
| Share link, guest preview, join, and accept | Real. The preview omits private history. Acceptance is an explicit step. A second accept does not create a second row. |
| Sample bond | Real seed rows, labeled Sample. Changes are turned off. |
| Share-link signing without `BOND_SHARE_SECRET` | Sandbox. The share panel says the local development key is in use. |
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
