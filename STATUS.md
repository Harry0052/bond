# Bond status

PRODUCT: Bond
STAGE: 5
STATUS: PASS
USER-FACING WORKING FLOWS: Activity shows history for bonds you still belong to. Reminders stay empty until the checkbox is on, then an overdue commitment appears, and turning them off deletes them. A bond page downloads a real `.ics` file. Me lists templates and the integrations that are off. The reminder checkbox can be toggled from the keyboard.
UI/UX: Activity at 390px (`docs/screenshots/activity-390.png`) and Me at 1440px (`docs/screenshots/me-1440.png`). Mobile nav now has Home, Create, Activity, and Me. Copy states that email, SMS, and calendar accounts are off.
DATA + SECURITY: `users.reminder_opt_in`, `reminders`, `templates`. Reminder rows are removed when opt-in is false. Calendar download checks accepted membership. The file does not include private notes.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (13 files, 24 tests). `npx playwright test e2e/repeat.spec.ts` pass.
REAL INTEGRATIONS: ICS file, in-app reminders, templates | SANDBOX: local share-link key | DISABLED: email, SMS, push, contacts, calendar-account sync, payments
FILES CHANGED: reminder and template services, Activity, Me, calendar routes
OPEN BUGS/RISKS: Export and deletion are not built yet. Local signing key remains a sandbox. No pilot has been run.
NEXT STAGE PROPOSAL: Stage 6 — export and delete, a permission audit, the runbook, and the pilot plan. No production-readiness claim.
AWAITING APPROVAL: NO — continuing on `main`.

## Stage 4 record

PRODUCT: Bond
STAGE: 4
STATUS: PASS
USER-FACING WORKING FLOWS: The person who accepted a commitment can mark it done. The time and their name are stored, and the bond becomes Completed when nothing is left open. The organizer can change the title, due time, or person. That raises the revision, reopens the commitment, and the earlier acceptance no longer counts. Removing someone hides the bond and its private activity from them.
UI/UX: Progress flow at 390px (`docs/screenshots/progress-390.png`). Change sits in a disclosure so it is not an extra tap on the happy path. Remove is a labeled button.
DATA + SECURITY: Completion stores actor and timestamp. Revisions do not delete the old acceptance row; the current revision is what counts. Removal sets invitation status to removed, and list/detail queries require accepted. Sample bonds stay frozen.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (11 files, 22 tests). `npx playwright test e2e/progress.spec.ts` pass. The full browser suite was not re-run as one command after this stage; earlier create, foundation, and join tests were green and this stage did not change those screens' contracts.
REAL INTEGRATIONS: completion, revision, removal in SQLite | SANDBOX: local share-link key | DISABLED: email, SMS, push, contacts, calendar file, payments
FILES CHANGED: progress service, complete and revise forms, removal, tests
OPEN BUGS/RISKS: No calendar file or reminder yet. Local signing key remains a sandbox.
NEXT STAGE PROPOSAL: Stage 5 — ICS download, opt-in in-app reminders, a reusable template, and a pass over keyboard use on a phone-width layout.
AWAITING APPROVAL: NO — continuing on `main`.

## Stage 3 record

PRODUCT: Bond
STAGE: 3
STATUS: PASS
USER-FACING WORKING FLOWS: A second person opens the share link, picks the name the organizer wrote, ticks each commitment on that name, and accepts. The acceptance is still there after refresh. The organizer sees the new name. An outsider who opens the private address gets the not-found page. Declining does not grant access. The sample bond cannot be joined. Two acceptance calls leave one row. A vote can be cast once and is not changed silently.
UI/UX: Joined bond at 390px (`docs/screenshots/joined-390.png`). The preview now has a real accept and decline form. Sample joining stays off, with that sentence on the page.
DATA + SECURITY: `acceptances` is unique on commitment, member, and revision. `decisions` is unique on question and member. Join claims a slot only while it is still invited. Preview and the join sheet do not include account ids or the event log.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (10 files, 19 tests). `npm run test:e2e` pass for create, foundation, and join. The full four-test run passed except a strict-mode locator in join, which was fixed and re-run alone: pass.
REAL INTEGRATIONS: join and accept in SQLite | SANDBOX: local share-link key, labeled | DISABLED: email, SMS, push, contacts, calendar accounts, payments. Completion and material edits are not built yet.
FILES CHANGED: acceptance and vote tables, join service, preview form, accept and vote controls
OPEN BUGS/RISKS: Local signing key remains a sandbox. A member can still be removed only by a later stage.
NEXT STAGE PROPOSAL: Stage 4 — mark commitments done, keep the event log, and require a new acceptance when the title, due time, or assignee changes.
AWAITING APPROVAL: NO — continuing on `main`.

## Stage 2 record

PRODUCT: Bond
STAGE: 2
STATUS: PASS
USER-FACING WORKING FLOWS: An organizer can create a bond with people and commitments, see it on Home, and open the same card after a refresh. Due times are stored in UTC and shown in the organizer's timezone. A guest with the link can read a preview that omits history. A person who is not a member gets the not-found page for the private address. A short title is rejected. If the network drops, the form says nothing was saved.
UI/UX: Create at 390px (`docs/screenshots/create-390.png`), bond detail at 1440px (`bond-detail-1440.png`), guest preview at 390px (`guest-preview-390.png`). Home shots were refreshed. Empty, validation, preview, and not-invited states are real. Joining is described as not available yet, with no fake accept button.
DATA + SECURITY: `bonds`, `members`, `commitments`, `bond_events`. Share token is HMAC-signed; only the SHA-256 hash is stored. Private detail requires an accepted membership. Preview is a field whitelist and does not read the event log. Idempotency key stops a double submit from creating two bonds. Sample bond is `demo = 1`.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (9 files, 15 tests). `npm run build` pass during Playwright startup. `npm run test:e2e` pass (3 tests).
REAL INTEGRATIONS: SQLite bonds and the share preview | SANDBOX: local share-link key when `BOND_SHARE_SECRET` is unset, labeled on the share panel | DISABLED: email, SMS, push, contacts sync, calendar accounts, payments, escrow. Accepting a commitment is not built yet.
FILES CHANGED: bond schema and services, create form, detail page, guest preview, Home list, tests, screenshots
OPEN BUGS/RISKS: The local signing key is still a sandbox. Guest preview shows the browser timezone, which is UTC in this container. Acceptance is intentionally absent.
NEXT STAGE PROPOSAL: Stage 3 — join from the link and explicitly accept commitments. Unrelated users stay blocked.
AWAITING APPROVAL: NO — continuing on `main`.

## Stage 1 record

PRODUCT: Bond
STAGE: 1
STATUS: PASS
USER-FACING WORKING FLOWS: A visitor can save a display name and timezone in this browser. Refresh keeps the name. A short name is rejected and nothing is stored. Home shows a labeled sample card that cannot be joined.
UI/UX: Home inspected at 390px and 1440px (`docs/screenshots/home-390.png`, `home-390-top.png`, `home-1440.png`). Skip link is the first tab stop. Focus ring is visible. 404 and error screens exist. Mobile nav is Home only, because Create, Activity, and Me are not built yet. The fixed mobile bar covers the bottom of a full-page capture; the viewport shots are the ones to trust. No dead create or join control.
DATA + SECURITY: `users`, `sessions`, `security_events`, `rate_buckets` in SQLite. Session cookie `bond_session` is httpOnly and stores only a SHA-256 hash. Profile writes check the same origin and a rate limit. Demo and deleted profiles cannot be renamed.
TESTS: `npm run lint` pass. `npm run typecheck` pass. `npm test` pass (7 files, 10 tests). `npm run build` pass. `npm run test:e2e` pass (2 tests).
REAL INTEGRATIONS: name and timezone session | SANDBOX: none in this stage | DISABLED: email, SMS, push, contacts sync, calendar accounts, payments, escrow
FILES CHANGED: app scaffold, design system, Home, profile API, migrations, CI, README
OPEN BUGS/RISKS: Share-link signing is not built yet. The local fallback risk from Stage 0 still applies later. SQLite remains a single-file store.
NEXT STAGE PROPOSAL: Stage 2 — persist bonds and commitments, list them on Home, open a detail page, and show a guest preview that does not include private activity.
AWAITING APPROVAL: NO — stages were pre-approved. Continuing on `main`.

## Stage 0 record

PRODUCT: Bond
STAGE: 0
STATUS: PASS
USER-FACING WORKING FLOWS: None. Planning only.
UI/UX: Flow written in the first Stage 0 commit. No screens then.
DATA + SECURITY: Boundary decided: membership checks on id routes, whitelist preview by share token, unique acceptance rows, material edits clear acceptance.
TESTS: not run
REAL INTEGRATIONS: none | SANDBOX: local share-link fallback planned | DISABLED: email, SMS, push, contacts, calendar accounts, payments
FILES CHANGED: STATUS.md
OPEN BUGS/RISKS: Five risks recorded in the Stage 0 commit (fallback signing key, SQLite scope, ICU timezone strings, preview leaks, acceptance races).
NEXT STAGE PROPOSAL: Stage 1 foundations. Done above.
AWAITING APPROVAL: NO

## Decisions that still hold

- Product name is Bond. The brief codename was PACT.
- Stack matches Ripple, Tether, and Halo: Next.js, strict TypeScript, Tailwind, SQLite, Drizzle, Vitest, Playwright, GitHub Actions.
- A bond is not a contract and does not move money.
- Due times are stored in UTC and shown in the member's IANA timezone.
- No compliance claim and no production-readiness claim.
