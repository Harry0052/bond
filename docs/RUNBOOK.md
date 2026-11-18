# Bond runbook

This is a local SQLite app. It has not been deployed to a public host, and this document does not claim a compliance certification or that the app is ready for a public launch.

## Run locally

```bash
npm install
npm run db:setup
npm run dev
```

`npm run db:setup` creates the file in `BOND_DB_PATH` (default `data/bond.db`) and applies every SQL file in `drizzle/migrations` in order. Running it again is safe.

A production-style local process:

```bash
npm run db:setup
npm run build
npm run start
```

## Environment

| Name | Required | Meaning |
| --- | --- | --- |
| `BOND_DB_PATH` | No | SQLite file path. Not a secret. |
| `BOND_SHARE_SECRET` | Before any shared server | HMAC key for share links, at least 16 characters. When unset, Bond uses a local fallback and says so on the share panel. Do not commit a real value. |

No API key is required. Email, SMS, push, contacts, calendar accounts, and payments are not configured.

## What a failure looks like

Server failures are written as one JSON line to stderr from `logFailure` in `src/lib/observability.ts`. The line has `source`, `scope`, `code`, and a short `detail`. It does not include names, tokens, or raw IP addresses.

The north-star count lives in `northStar` in `src/lib/metrics.ts`: non-sample bonds that reached two accepted people within 48 hours of creation, plus how many people have created more than one bond. It is an operator function over this server's SQLite file. It is not a public chart.

## Rollback

1. Stop the process.
2. Replace `data/bond.db` (and the `-wal` / `-shm` files, if present) with the copy you took before the change.
3. Start the previous build.
4. Do not delete `schema_migrations` rows by hand. If a migration must be undone, restore the file instead of editing the table.

There is no hosted database migration to roll back. SQLite here is one file on one machine.

## Incident notes

- A bad share link should show "This link does not match a bond" and no other group's data.
- If share links were issued with the local fallback and the server is no longer private, set `BOND_SHARE_SECRET` and treat old links as untrusted. Changing the secret invalidates existing links because the signature will not match.
- To remove one person's access without a full restore, they can use Delete my data, or the organizer can remove them. Both set the membership to removed.
