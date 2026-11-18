# Bond status

PRODUCT: Bond
STAGE: 0
STATUS: PASS
USER-FACING WORKING FLOWS: None yet. This stage is the plan. The repository had only a placeholder README on `main`.
UI/UX: No screens built. Mobile flow and failure paths are written below.
DATA + SECURITY: No tables yet. The security boundary is decided below and is not implemented.
TESTS: not run — no application code in this stage.
REAL INTEGRATIONS: none configured | SANDBOX: local share-link signing fallback, to be labeled in the UI when the link exists | DISABLED: email, SMS, push, contacts sync, calendar-account sync, payments, escrow
FILES CHANGED: STATUS.md
OPEN BUGS/RISKS: See technical risks. Nothing is shipping.
NEXT STAGE PROPOSAL: Stage 1 — strict TypeScript app, SQLite migrations, design tokens, shell, and one real screen that saves a display name.
AWAITING APPROVAL: NO — the owner pre-approved every stage and asked to build straight through on `main`.

The brief's working codename was PACT. The product name is Bond. Code, UI, package name, and docs say Bond.

## Repository at inspection

- Remote: `Harry0052/bond`, branch `main`, one placeholder commit (`# bond`).
- No application, tests, migrations, or CI.
- Sibling apps `ripple`, `tether`, and `halo` are Next.js, TypeScript strict, Tailwind 4, SQLite via `better-sqlite3` and Drizzle, Vitest, Playwright, and GitHub Actions. Bond follows that shape. PostgreSQL is not wired up. A hosted database is not required to run locally.

## Confirmed assumptions

- A bond is a shared record of who agreed to do what by when. It is not a contract, not escrow, and not debt collection.
- The first real action is creating a bond. A display name and timezone are collected on that form, not as a separate signup wall. Stage 1 only proves the session can be saved, because create does not exist yet.
- People join by a link they were given. Bond does not read contacts and does not send email or SMS.
- Each person has an IANA timezone stored on their session. Due times are stored in UTC and rendered in that timezone. Guests without a session see the browser zone after hydration, with UTC visible first.
- Invitations are one link per bond. The raw token is an HMAC. Only a SHA-256 hash is the lookup key. A local signing fallback is allowed when `BOND_SHARE_SECRET` is unset, and the share panel says so.
- Demo rows are labeled Sample. Their buttons that would change data stay off.
- No compliance certification and no production-readiness claim.

## Product scope through Stage 6

In scope: home, create, bond detail, guest preview, join, explicit acceptance, completion, event log, material edits that clear acceptance, removal that revokes access, in-app opt-in reminders, ICS download, templates, export, and deletion.

Out of scope: legal enforceability, payments, escrow, SMS or email blasting, push, OAuth, contacts import, writing into Google or Apple calendars.

## Mobile flow

1. Home — active bonds and the next commitments, or an empty state whose action is "Make a bond".
2. Create — title, purpose, people, commitments, due times, optional question. One column. Primary button at the end of the form.
3. Bond — oversized agreement card, who has accepted, what is still open, copyable link.
4. Guest link — read-only card, then a deliberate join step. A bad link explains that they are not invited.
5. Commitment — accept, mark done, or (organizer) propose a real change.
6. Activity — opt-in reminders and the event list.
7. Me — name, timezone, templates, export, delete, and the list of disabled integrations.

Happy path: organizer creates a bond, copies the link, two people accept their own commitments, everyone sees what is still open after a refresh.

Failure and permission paths:

- Short or empty fields stay on the form with the message next to the field. Nothing is saved.
- The network fails: the form says the server was not reached and does not pretend the bond exists.
- A second submit uses one idempotency key so two bonds are not created.
- A person without the link, or a member who was removed, gets the not-found screen for `/bonds/:id` and does not see private activity.
- A sample bond can be read and cannot be changed.
- Changing the commitment title, due time, or assignee bumps the revision and the previous acceptance no longer counts.

## Component map

- Shell: header, primary nav (Home, Create, Activity, Me), footer, skip link, mobile bar.
- UI: button, field, badge, card, dialog, toast, skeleton, avatar, progress, empty state.
- Product: agreement card, create form, join form, share panel, commitment actions, reminder toggle, template list, export and delete.

## Domain model (built from Stage 2 onward, not all on day one)

Stage 1: `users`, `sessions`, `security_events`, `rate_buckets`.

Stage 2: `bonds`, `members`, `commitments`, `bond_events`.

Stage 3: `acceptances`, `vote_questions`, `decisions`.

Stage 4: completion columns on `commitments` (no silent reassignment; material edits increment `revision`).

Stage 5: `templates`, `reminders`, `users.reminder_opt_in`.

Ownership: every read and write of a bond by id checks an accepted membership. The public preview is a separate whitelist and is only available with a valid share token. Removed members fail that check.

## Integrations

| Need | Decision |
| --- | --- |
| Database | Local SQLite file. No hosted database credentials. |
| Session | Random token, SHA-256 hash in SQLite, `bond_session` httpOnly cookie. |
| Share links | HMAC. Optional `BOND_SHARE_SECRET`. Unset means the documented local fallback, labeled in the UI. |
| Email, SMS, push, contacts | Not configured. Disabled. Copy the link instead. |
| Calendar | ICS file download only. No calendar account is connected. |
| Payments | Disabled. |

## Technical risks

1. Share links signed with the local fallback can be forged by anyone who can read the database and the source constant. The UI must say when that fallback is in use. A real secret is required before any shared server.
2. SQLite on one file is the local and CI store. It is not a multi-server production database. The runbook must not pretend otherwise.
3. Timezone formatting depends on ICU. Tests should assert calendar numbers for two zones, not a single abbreviation string that can change.
4. Guest preview can leak private activity if a later query reuses the member DTO. The preview function has an explicit field list and a regression test.
5. Acceptance races can duplicate rows without a unique `(commitment_id, member_id, revision)` constraint. The service treats the constraint as the source of truth.

## Stage 1 checklist

- Scaffold Next.js, strict TypeScript, ESLint, Vitest, Playwright, GitHub Actions, `.env.example`, and `npm run db:setup`.
- Tokens for ink `#1E2340`, peach `#FFD9C7`, and cobalt `#4F63F8`. Shell, focus, 404, error, loading, mobile nav.
- Home screen that saves a display name in SQLite and shows a labeled sample card that is not the visitor's bond.
- No control that claims to create, join, or notify.
- Run lint, typecheck, unit tests, build, and a 390px and 1440px look at Home.
