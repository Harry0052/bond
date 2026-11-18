# Bond status

PRODUCT: Bond
STAGE: 6
STATUS: PASS
USER-FACING WORKING FLOWS: The whole path works on this server: save a name, create a bond, copy a link, join and accept, mark a commitment done, change it so the old acceptance no longer counts, turn on in-app reminders, download an `.ics` file, save and reuse a template, download JSON, and delete the session. Outsiders and removed people do not see the private bond.
UI/UX: Screenshots in `docs/screenshots` cover Home at 390 and 1440, Create at 390, bond detail at 1440, guest preview at 390, a joined bond at 390, progress at 390, Activity at 390, and Me at 1440. Keyboard: skip link, and the reminder checkbox takes Space. The reminder control and the primary actions are at least 48px tall.
DATA + SECURITY: Membership is required for a bond id, a calendar download, completion, revision, and removal. The guest preview is a whitelist and does not include account ids, share secrets, or the event log. Acceptance is unique per commitment, member, and revision. Export omits share tokens. Delete removes the session, templates, reminders, and access; the shared bond stays for the other people. Rate limits cover profile, create, join, accept, complete, revise, remove, export, and delete. A title is stored as text, including characters that look like markup. `northStar` in `src/lib/metrics.ts` counts bonds with two accepts inside 48 hours. It is not a public chart. Failures log a short JSON line without names or tokens.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (14 files, 25 tests). `npm run build` pass. `npm run test:e2e` pass (6 tests).
REAL INTEGRATIONS: SQLite bonds, sessions, join, acceptance, progress, reminders, templates, ICS, export, delete | SANDBOX: share links use the local development key when `BOND_SHARE_SECRET` is unset, and the share panel says so | DISABLED: email, SMS, push, contacts sync, calendar-account sync, payments, escrow, hosted Postgres
FILES CHANGED: account export and deletion, operator metric, runbook, pilot plan, README
OPEN BUGS/RISKS: No pilot has been run, so there is no evidence for ship, iterate, or stop. SQLite is one file on one machine. The local share-link key must be replaced before anyone else uses a server. This is not a compliance certification and not a claim that Bond is ready for a public launch.
NEXT STAGE PROPOSAL: Run the pilot in `docs/PILOT.md` before adding anything else. Do not turn on email or SMS until a real provider exists and the UI stops saying those deliveries are off.
AWAITING APPROVAL: NO — this is the last stage in the brief.

## Stage 5 record

PRODUCT: Bond
STAGE: 5
STATUS: PASS
USER-FACING WORKING FLOWS: Opt-in reminders, `.ics` download, templates, Activity, and Me.
TESTS: lint, typecheck, 13 files / 24 tests, and `e2e/repeat.spec.ts` passed before this stage.
AWAITING APPROVAL: NO

## Earlier stages

Stages 0 through 4 are in the git history on `main`. Stage 0 planned the product. Stage 1 saved a name. Stage 2 created and listed bonds. Stage 3 added join and accept. Stage 4 added completion, revisions that clear acceptance, and removal.

## Decision

The pilot has not been run. Decision: not ready to ship to the public. The local app does the core job and is honest about what it cannot do.
