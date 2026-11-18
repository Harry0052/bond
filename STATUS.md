# Bond status

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
