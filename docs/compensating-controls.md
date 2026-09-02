# Compensating controls — signed-off gaps

**Decision D14 (2026-09-02).** Construction units 1–14 are closed. Every in-scope
inventory item is covered, `@bug`, `partial`, `wip`, `gap`, or `excluded`. The
rows below are **signed off**: they stay in the denominator (except the excluded
nav), they do not block the CI gate, and a named human or product control covers
what automation cannot.

Re-open a row as a **new unit** when the product unblocks it (for example DEF-2
fixed, a session-write API appears, or `POST .../automastery-evaluations` is
allowed).

| Inventory id | Risk | Why automation stops | Compensating control |
|--------------|------|----------------------|----------------------|
| `A-confirm-mastery` | P1 | `POST .../automastery-evaluations` is **405**. Must not click pre-existing flagged rows. WR-4 `@wip`. | Product: expose a create/confirm API or a dedicated write client with suite-owned evals. Then un-`@wip` WR-4. Until then, clinicians confirm mastery by hand in UAT. |
| `A-dismiss-mastery` | P1 | Same blocker as confirm. WR-5 `@wip`. | Same as confirm. Un-`@wip` WR-5 when a suite-owned row exists. |
| `A-record-data` / `A-add-target` | P1 | Add-target is still DEF-6 (no-op). Record-data now opens `/sessions/new` (SES-1). | `@bug` WR-2b until add-target UI opens. SES-1 covers landing on the wizard; do not complete it in CI. |
| `R-sessions-new` | P2 | Participants + Programs covered (SES-1/2). Confirm would write a session. | Do not click Confirm in default tests. Optional `@write` when `TEST_CLIENT_ID` is set. |
| `S-bs-true-empty` | P2 | `behaviorplans` 500s for every client (DEF-2). A genuine empty list is unreachable. | `@bug` BS-2 / BS-3. After DEF-2, add an empty-caseload scenario and drop this gap. |
| `A-scope-select` | P2 | Control is present (AZ-14). Option values are not contracted (AN-3). | Product answer: whether Domain/Category/Area belong on the scope select. Then replace AZ-14’s visibility-only check. |
| `R-nav-unvisited` | P3 | Staff, Supervision, Settings, Training, Reporting, Template, Schedule, Notifications, Billing — never crawled. **Excluded** from coverage %. | Thin human exploratory pass on those nav areas **each release**. Not a CI gate. |
| `@visual` | P2 | Host fonts/DPI; baselines are Windows. Off the GitHub gate (D13). | `npm run test:visual` on the baseline machine before a release that changes chrome. `UPDATE_VISUAL=1` only for intentional layout change. |
| `@write` | P1 | Needs dedicated `TEST_CLIENT_ID`. Off the default gate. | Set `TEST_CLIENT_ID` and run `npm run test:write` on a schedule the team owns. Never against the shared caseload. |
| AN-6 (axe serious) | P2 | Critical-only gate (D12). Serious `color-contrast` (and Analyze Data `definition-list`) still fire. | Attached as `axe-scan.json` on A11Y-1…5. Product contrast pass; do not silence the critical gate. |

## Per-release human pass (30–45 minutes)

1. Walk the excluded primary nav (table row `R-nav-unvisited`).
2. On one client: Add Data Collection / record-data (DEF-6 still?).
3. On Analyze Data: grouping (DEF-1) and pending mastery confirm/dismiss if any rows exist — **do not** use this as a substitute for WR-4/WR-5 on shared data in CI.
4. Optionally `npm run test:visual` on Windows.

## Exploratory pass log

### 2026-09-02

- **Excluded nav:** Staff, Supervision, Settings, Training, Reporting, Template, Schedule, Notifications, Billing are **non-interactive `<span>` labels** in `app-shell-nav`. Clicking them does not change the URL. Clients is the only real link. No crash.
- **Record-data:** from a program on client `892745`, `program-details-record-data` navigates to `/sessions/new` (`new-session-page`, participants + Next). No session POST from landing. Wizard was **not** completed.
- **Add-target:** still no dialog (DEF-6 remains for create-target UI).

## What stays automated

Default `npm test` + PR smoke + nightly default suite + coverage ratchet (`docs/coverage-floor.json`).
`@bug` remains red-until-fixed (`npx cucumber-js -p bugs`).
