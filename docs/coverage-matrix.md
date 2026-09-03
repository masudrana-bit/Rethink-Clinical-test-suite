# Coverage Matrix — Rethink Clinical

> Produced in the **Inception** phase (Mob Elaboration). Every automated test must
> trace back to a row here. Review and prune with the team before Construction.
>
> Formal test-case write-ups (objective, steps, expected result) for every covered
> case: [`test-cases.md`](./test-cases.md) · PDF: [`test-cases.pdf`](./test-cases.pdf).

## Legend

- **Priority:** P0 (smoke, must pass on every PR) · P1 · P2
- **Type:** `@api` (contract) · `@ui` (end-to-end) · `@network` (XHR assertion)
- **Status:** ☐ not started · ◐ in progress · ☑ done · ✖ blocked by a defect
- Defects and data anomalies are logged in [`defects.md`](./defects.md).

## Tag taxonomy

| Tag | Meaning |
|-----|---------|
| `@smoke` | Login + clients list + open one client. Every PR. |
| `@api` | Endpoint contract checks. |
| `@ui` | Browser end-to-end flows. |
| `@network` | Asserts the right XHRs fire on a page. |
| `@negative` | Expected error paths. |
| `@bug` | Asserts correct behaviour the app does not yet have. Excluded from `npm test`; run with `-p bugs`. Passes when the defect is fixed. |
| `@write` | Mutates the dedicated `TEST_CLIENT_ID` client. Excluded from `npm test`; `npm run test:write`. |
| `@visual` | Screenshot-diff vs committed baselines. Excluded from `npm test`; `npm run test:visual`. |
| `@a11y` | axe-core WCAG 2.A/2.AA. In `npm test`; critical impact only (D12). `npm run test:a11y`. |
| `@auth` `@clients` `@programs` `@analyze-data` `@behavior-support` | Feature areas. |

## Decisions taken at elaboration

These constrain every row below. Change a decision, revisit the rows it touches.

| # | Decision | Consequence |
|---|----------|-------------|
| D1 | Auth token is harvested from a one-time `/temp-dev-login` browser session, not from a credentialed API login. | No test account needed. `TEST_USERNAME` / `TEST_PASSWORD` / `AUTH_APPLICATION_KEY` become optional overrides. |
| D2 | Client IDs are stable; program, target and mastery data are volatile. | Assert envelope shape and internal consistency. **No fixed counts** — `totalCount = 24` and `in scope = 38` are forbidden assertions. |
| D3 | The behaviorplans 500 is a known defect, not a contract. | **Revised at Unit 4.** Split in two: a normal scenario asserting the UI degrades gracefully (correct either way, so it never goes red when the backend is fixed), plus a `@bug` scenario asserting the endpoint should return 200. Never assert 500 as if it were the contract. |
| D4 | Phase 1 is read-only. | Write actions (`add-target`, `mastery-review-confirm` / `-dismiss`, `saved-report-save`, `record-data`) are out of scope; they become their own unit after sign-off. |
| D5 | CI target is undecided. | Suite must be CI-agnostic. A preflight check fails fast with a clear message if `dev2.internal` is unreachable. No CI config authored this phase. |
| D13 | *Added at Unit 14.* CI is GitHub Actions against clinical.dev2. | PR: typecheck + coverage ratchet + `@smoke`. Nightly: default suite (`not @write and not @bug and not @visual and not @wip`). Artifacts: reports + inventory. `@visual` stays off the gate (host fonts). Empty `BASE_URL` / `API_BASE_URL` repo vars fall through to `support/config.ts` defaults. Self-hosted runner via `CLINICAL_RUNNER` if `*.internal.*` is unreachable from `ubuntu-latest`. |
| D6 | Crawl data is synthetic but stays gitignored. | `output/` is never read at runtime. No client names, client numbers or IDs hardcoded in features or fixtures. |
| D7 | Credential fields are scrubbed from API responses before they are traced. | `support/scrub.ts` nulls `apiKey`, `password`, `passwordQuestion` and `passwordAnswer` en route to the browser. Guarded by `npm run verify:scrub`. |
| D8 | *Added at Unit 4.* No scenario may depend on run order, or on a resource another scenario consumed. | A scenario needing a single-use resource acquires its own. AUTH-2 signs in for itself rather than sharing the run-level refresh token. |
| D9 | *Added at Unit 3.* UI-versus-API comparisons re-read the API on every poll. | dev2 is written to by other suites mid-run, so a snapshot taken once goes stale. Assert that the two agree *now*, not that the UI matches a value we captured earlier. |
| D10 | *Added at Unit 7.* "Targets in scope" is a report-filtered metric, not `sum(targets.totalCount)`. | Cross-layer equality is a false oracle. AZ-2 asserts the internal identity `mastered + remaining == in scope` and that in-scope does not exceed the live target total. |
| D11 | *Added at Unit 12.* Visual baselines compare chrome and layout, not live data. | Volatile regions (names, counts, charts, identity) are masked. `@visual` is not a data oracle and does not replace D9. |
| D12 | *Added at Unit 13.* axe-core gates on **critical** impact only. | Serious/moderate (today: color-contrast, one definition-list) are attached, not a fail. See AN-6. |
| D14 | *Added after Unit 14.* Remaining inventory gaps are signed off with named compensating controls. | Live floor is `docs/coverage-floor.json` (94.7% after SES-1). See [`compensating-controls.md`](./compensating-controls.md). Do not delete gap rows to inflate %. |
| D15 | *Added at Unit 15a.* `reports/metrics.json` carries both coverage claims. | `coverage.percent` is the D14 ratchet formula `(covered + bug + 0.5×partial) / in-scope`. `coverage.specPercent` is §3 `covered ÷ total inventory items`, with `partial` as its own slice. Headline pass rate excludes `@bug` only (Unit 11 is done: `@write` counts when present in the run). Open defects are every Gherkin `@bug` scenario that this run did not prove green. |
| D16 | *Added at Unit 15b (2026-09-03).* Where `history.json` lives across CI runs. | Working copy: `reports/history.json` (gitignored, append-only, never hand-edited). Shape `{ cap: 200, runs: [...] }`; after each append, drop the oldest runs until `runs.length ≤ cap`. **CI restore:** before `npm run dashboard:metrics`, download the previous workflow artifact named **`metrics-history`** (retention **90 days**) into `reports/history.json`; after generate, re-upload that file (`if: always()`, so red runs still append). Missing artifact (first run, expiry, fork PR) → start `runs: []` and log it — do not fail the job. **Durable copy (15d):** publish `history.json` next to `dashboard.html` on GitHub Pages; prefer that file when artifact restore misses so history outlives 90 days. Local: the on-disk file is the store. |
| D17 | *Added at Unit 15d (2026-09-03).* Dashboard publication and coverage gate. | Publish the nightly/manual dashboard to GitHub Pages at `https://masudrana-bit.github.io/Rethink-Clinical-test-suite/`; PRs produce artifacts but do not replace the executive view. Post-steps use `if: always()` so red runs still generate metrics, history, dashboard, and Allure. Pages contains `index.html`, `metrics.json`, `history.json`, and `/allure/`. The coverage ratchet reads `reports/metrics.json → coverage.percent`; it never recomputes coverage from inventory. Dashboard rendering is non-blocking, while a missing/invalid coverage metric fails the separate ratchet gate. |

## Grounding facts (verified 2026-08-27 against the crawl and live dev2)

- The app exposes a stable `data-testid` layer, 20–43 per page. **Use `getByTestId`.**
  Never guess with role or text selectors. (These are invisible to ripgrep because
  the crawled HTML is minified onto one line; extract with a script if you need the list.)
- Auth session lives in `localStorage["bh_clinical_auth_session"]`.
- `localStorage` also holds `clinical.rbt.session.demo-session-*` state, and Analyze Data
  saves reports "on this device". **Every scenario needs a fresh browser context**;
  reusing a full `storageState` leaks data-collection state between tests.
- `Targets mastered` is `0` for all 24 clients, so `mastered + remaining == in scope`
  is currently unfalsifiable. See AZ-2 for the replacement assertion.
- `/observations/v1/client/:id/behaviorplans` returns 500 for all 24 clients.
- `auth/login` and `auth/refresh-token` require an `x-application-key` header.
  Fetch it from `/runtime-config.json`; never commit it.
- An unauthenticated API call returns **401**.
- `staff-role` leaks `apiKey` and `password` fields — see the Unit 1 note.
- The five per-program endpoints return **three different shapes**. Only `targets` and
  `objectives` use the paged envelope. See the PRG-3 note.
- **Refresh tokens are single-use, and the app spends them on its own.** Any scenario that
  exercises refresh must sign in for itself (`acquireAuth(browser, true)`), because earlier
  page loads in the run will have rotated the shared one. This surfaced the moment Unit 4
  was added: `analyze-data` sorts before `auth`, so fifteen extra page loads happened first
  and AUTH-2 began failing with 401. Scenario order should never decide a result.
- The Analyze Data chart is **Highcharts SVG**, not a canvas, despite the
  `clinical-chart-canvas` testid. Read labels with `textContent`; Playwright's `innerText`
  returns undefined for SVG `<text>`.
- Summary tiles show `--` until the report resolves. `AnalyzeDataPage.expectLoaded` waits
  for a digit rather than letting each assertion race the load.

### Shared environment — dev2 is written to while we run

dev2 is not ours alone. Another automated suite creates programs on the same clients as we
test, roughly hourly. On client `892745` we observed `ZZZ-E2E-<epoch>` programs (ids 255–259,
domain `E2EDomain`) created at 00:27, 03:05, 07:02, 07:56 and 08:10 UTC on 2026-08-27, plus a
`ZZZ-AUDIT-DELETE-ME` program under domain `AuditDomain`. The domain list for that client also
carries junk values: `Test`, `AuditDomain`, `E2EDomain` and a misspelled `identificaion`.

This caused a genuine intermittent failure: PRG-8 read the programs API, then a new program was
created, then the rail rendered with one more entry than the snapshot expected. The test was
right to complain — the expectation was simply stale by a few seconds.

Consequences, applied throughout:

- **Never hold the UI to a snapshot taken earlier in the run.** Rail comparisons re-read the
  programs API on every poll and pass as soon as UI and API agree (`expectRailToMatch`).
- **Never assert exact counts** of clients, programs or targets — only relationships.
- dev2 can return PostgreSQL `53300` when Analyze Data exhausts the shared connection pool.
  Live read helpers retry that exact transient at most twice with backoff. Other 5xx responses
  still fail immediately.
- The Analyze Data client tab can stay on `/programs/:id` for several seconds before the route
  changes. `ClientWorkspace.openTab` waits on the destination URL (up to 30s), not a click.
  Opening a program waits on `/programs/:id` before asserting details panels.
- Two runs passing is not proof of stability here; a run can pass because nothing was written
  during its two-minute window.

**Decided: we do not pin away from client `892745`.** Exercising the client that other teams
churn is the stronger signal, and the re-read-on-poll approach handles concurrent writes. The
cost is that Analyze Data aggregates over the junk programs too, so its assertions must be
relationships rather than expected values.

## Units of work (AIDLC bolts)

Construction proceeds one unit per bolt, in this order. Unit 0 gates everything else.

### Unit 0 — Foundations  `@preflight`

Not user-facing tests; the harness the rest depends on. No unit below starts until this is green.

| ID | Item | Priority | Status |
|----|------|----------|--------|
| FND-1 | `BeforeAll` drives `/temp-dev-login` once and lifts the session from `localStorage` (D1) — `support/auth.ts` | P0 | ☑ |
| FND-2 | Preflight reachability check on both origins, failing with an actionable message (D5) — `support/preflight.ts` | P0 | ☑ |
| FND-3 | Runtime data resolver: pick a client **by capability** (has ≥1 program with ≥1 target), never by ID (D2) — `support/testData.ts` | P0 | ☑ |
| FND-4 | Page Objects on real testids: `AppShell`, `ClientsPage`, `ClientWorkspace`, `AnalyzeDataPage`, `BehaviorSupportPage` | P0 | ☑ |
| FND-5 | Fresh browser context per scenario, seeded with the auth key only; asserts no demo-session bleed | P0 | ☑ |
| FND-6 | Repo gaps closed: `scripts/report.js` added, `@wip` gating keeps undefined-step features out of the default run | P0 | ☑ |
| FND-7 | Credential fields scrubbed from responses before tracing (D7), verified against a written trace by `npm run verify:scrub` | P0 | ☑ |

Verified by `features/preflight/foundations.feature` — 5 scenarios, green twice
consecutively, plus a negative check that an unreachable API host aborts the run in
seconds with a named host and a VPN hint rather than cascading timeouts.

Two findings worth carrying forward. The app does **not** create `clinical.rbt.*`
localStorage entries on its own, so FND-5's isolation assertion is meaningful rather
than vacuous. And an unauthenticated API call returns **401**, which pre-confirms the
expected status for NEG-1.

### Unit 1 — Authentication  `@auth`

Built in `features/auth/authentication.feature`. From this unit onward features are
filed by **feature area, not test type** — the tags already carry the type, and a unit
spanning `@api` and `@ui` should live in one file.

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| AUTH-1 | The issued session is well formed: both tokens present, expiry in the future, refresh outliving access | @api @smoke | P0 | ☑ |
| AUTH-2 | A refresh token exchanges for a complete new session, with a different access token the API accepts | @api | P1 | ☑ |
| AUTH-3 | The preview sign-in lands an unauthenticated visitor on `/clients` | @ui @smoke | P0 | ☑ |
| AUTH-4 | `staff-role` names a role, a user and a numeric staff member id | @api | P1 | ☑ |
| AUTH-5 | A protected client record deep link is closed to an unauthenticated visitor, with no client name rendered | @ui @negative | P1 | ☑ |

AUTH-5 deliberately differs from the superficially similar foundations scenario: that
one guards the harness's context isolation, this one asserts the product refuses a
deep link to a client record and leaks no name while doing so. It passes.

**Contract correction.** Both `auth/login` and `auth/refresh-token` require an
`x-application-key` header and return 401 without it — the crawl captured this, and
the drafted `ClinicalApi.login()` had it wrong twice over (it sent `userName` rather
than `username`, and put the key in the body). The key is published by the app's own
`/runtime-config.json`, so `support/runtimeConfig.ts` fetches it at runtime and
nothing is stored in the repo.

**Security finding — open against the app.** `GET /accounts/v1/members/me/staff-role`
returns the current user's `apiKey` (36 chars) and `password` (44 chars) to the
browser alongside their profile. To be raised with the app team verbally; no separate
defect note written. A candidate regression test — "staff-role returns no credential
fields" — is **not built**, because asserting it today would fail by design.

Mitigated on our side by D7. The first implementation used `route.fetch()`, which
passed the browser-level assertion while the written trace still held the real
values; the fix routes the upstream request through an APIRequestContext outside the
traced browser context. `npm run verify:scrub` captures a real trace and greps the
zip, so the control cannot silently break again. The dev API key was exposed in
terminal output during that investigation and should be rotated.

### Unit 2 — Clients list  `@clients`

Built in `features/clients/clients.feature`.

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| CLI-1 | Clients endpoint returns a coherent paged envelope; paging arithmetic is self-consistent (D2: no fixed count) | @api @smoke | P0 | ☑ |
| CLI-2 | Every client item has a numeric id, both names, a client number and a boolean active flag | @api | P1 | ☑ |
| CLI-3 | The page lists **exactly** the client ids the API returned — set equality, not a count | @ui @smoke | P0 | ☑ |
| CLI-4 | Opening a client lands on their workspace and the switcher names them | @ui | P0 | ☑ |
| CLI-5 | Name search narrows to matching rows; every remaining row contains the term | @ui | P1 | ☑ |
| CLI-5b | An unmatched name search empties the list | @ui | P1 | ☑ |
| CLI-6 | Client-number search narrows to exactly the one client | @ui | P1 | ☑ |
| CLI-7 | The client switcher navigates to the chosen client's record | @ui | P1 | ☑ |
| CLI-8 | The clients page fires runtime-config, staff-role and clients calls, and nothing fails | @network | P2 | ☑ |
| CLI-9 | Every row's status agrees with the API `isActive` flag for that client | @ui | P2 | ☑ |
| CLI-10 | Clearing client search restores the complete API-backed client list | @ui | P2 | ☑ |

CLI-3 compares id sets rather than counts, so it fails on a wrong client as well as
a missing one — which a count comparison would not catch.

**Behaviour confirmed while building.** Name search is a case-insensitive substring
match, filtered client-side with no request fired. An unmatched search empties the
table but shows no "no results" message, only bare column headers — a minor UX gap,
not a defect. The client switcher is a PrimeNG `p-select` whose overlay is appended
to `body`, so its options are addressed at page level; selecting one navigates to
`/clients/:id`.

> **Open question still standing.** The page is headed "View and select active
> clients" yet lists clients whose status renders as Inactive. CLI-9 passes, so the
> status column is honest and the API agrees with it — the inconsistency is between
> the heading and the unfiltered list. Confirm whether the copy or the filter is
> wrong; no test asserts either way today.

### Unit 3 — Client programs  `@programs`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| PRG-1 | Programs endpoint returns a valid envelope; every program has id, title and active flag | @api | P1 | ☑ |
| PRG-2 | `program-library` returns the template catalog envelope | @api | P2 | ☑ |
| PRG-3a | `targets` and `objectives` return 200 with a paged envelope | @api | P1 | ☑ |
| PRG-3b | `mastery-criteria` returns `{programId, phases[]}` naming the requested program | @api | P1 | ☑ |
| PRG-3c | `target-groups` returns a bare array, not an envelope | @api | P1 | ☑ |
| PRG-3d | `data-collection` returns `{programId, method, prompts[]}` naming the requested program | @api | P1 | ☑ |
| PRG-4 | `automastery-evaluations?status=flagged` returns only items with status `flagged` | @api | P1 | ☑ |
| PRG-5 | Rail's Current tab lists exactly the client's **active** programs | @ui | P1 | ☑ |
| PRG-6 | Selecting a program shows its targets, goals and settings panels | @ui | P1 | ☑ |
| PRG-7 | Current / Inactive tabs partition the program set — disjoint and complete | @ui | P2 | ☑ |
| PRG-8 | Domain filter narrows the rail to exactly that domain; clearing it restores the full set | @ui | P2 | ☑ |
| PRG-9 | Client top tabs navigate between Skills Programs, Analyze Data and Behavior Support | @ui | P1 | ☑ |

**PRG-3 was wrong as planned.** It assumed all five per-program endpoints share the paged
envelope. Only `targets` and `objectives` do. `mastery-criteria` and `data-collection` return
program-scoped documents, and `target-groups` returns a bare JSON array. Asserting a generic
envelope across all five would have failed on three of them — or, worse, passed vacuously
against `body.items ?? []`. It is split into PRG-3a–d, each asserting the real shape.

> **PRG-9 is a slow tab transition, not a dead tab.** A 5s `toBeVisible` on
> `analyze-data-page` failed while the URL was still `/programs/:id`. A later live click
> reached Analyze Data after the delayed route change. The suite now waits on that URL.
> The app may still log `Cannot read properties of undefined (reading 'enabled')` during
> the transition; see AN-5 in `defects.md`.

**PRG-5 was also wrong as planned.** The rail does not list "the programs the API returned":
for the crawled client the API returns 8 programs and the Current tab shows 1. The tabs split on
the `active` boolean — Current holds `active: true`, Inactive the rest — which PRG-7 verifies is
an exact partition.

**The rail comparisons re-read the API on every poll.** See "Shared environment" below.

### Unit 4 — Analyze Data  `@analyze-data`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| AZ-1 | The three summary tiles render with non-negative numbers | @ui | P1 | ☑ |
| AZ-2 | **Revised (D10).** `mastered + remaining == in scope`; in-scope is not larger than the live target total | @ui @api | P1 | ☑ |
| AZ-3 | Chart renders a value axis, and its categories are exactly the client's distinct program domains; the summary's "across N skill areas" matches that count | @ui @api | P2 | ☑ |
| AZ-4 | Review rows equal the flagged automastery evaluations across all programs, and every row sits under a heading naming its own program | @ui @api | P2 | ☑ |
| AZ-5 | Each of the five date-range chips becomes the sole `aria-pressed` selection | @ui | P2 | ☑ |
| AZ-6 | Loading the report fires a `targets` XHR for every program, plus automastery evaluation calls | @network | P2 | ☑ |
| AZ-6b | Every per-program request the report makes succeeds | @network | P2 | ✖ **DEF-4** |
| AZ-7 | Grouping select changes the chart grouping | @ui @api | P2 | ✖ **DEF-1** |
| AZ-7b | Grouping select offers Domain, Category and Area | @ui | P2 | ☑ |
| AZ-8 | Mode tabs switch the view — the chosen panel shows and the other two are absent | @ui | P2 | ☑ |
| AZ-9 | *Added.* Custom Graph's "N available in this scope" equals the client's program count | @ui @api | P2 | ☑ |
| AZ-10 | Bulk Graph's "N available in this scope" equals the client's program count | @ui @api | P2 | ☑ |
| AZ-11 | Print calls `window.print` | @ui | P2 | ☑ |
| AZ-12 | In-scope tile stays `--` while targets XHRs are held | @ui | P2 | ☑ |
| AZ-13 | Empty programs envelope zeros the tiles and shows `mastered-report-empty` | @ui | P2 | ☑ |
| AZ-14 | Report scope select is present (option values not contracted — AN-3) | @ui | P2 | ◐ |

> AZ-2 rationale (D10): equating the in-scope tile to `sum(targets.totalCount)` is a false
> oracle — the tile is window/status-filtered. The identity `mastered + remaining == in
> scope` is an internal-consistency check from the same report. The API is used only as an
> upper bound so a tile that inflates above every program's targets still fails.
> We now know *why* mastered is often 0 — every mastered target has an empty
> `statusHistory`, so the report has no mastery date to place in any window. See AN-1
> in `defects.md`.

> **AZ-7 is a real defect (DEF-1).** Choosing `Category` updates the select's label but
> leaves the chart grouped by Domain — Highcharts' own description still reads
> "X axis displaying Domain". The scenario asserts the *correct* behaviour and is tagged
> `@bug`, so it is excluded from `npm test` and will pass once fixed. AZ-7b keeps the
> control itself under test meanwhile.

> AZ-3 note: the chart plots the junk domains other suites create (`E2EDomain`,
> `AuditDomain`, `Test`, `identificaion`) alongside real ones. The assertion compares
> against whatever the API reports rather than a curated list, so it stays true.

### Unit 5 — Behavior Support  `@behavior-support`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| BS-1 | Plan rail offers Current and Inactive tabs, each with a count, and the novel behaviors panel reports a count | @ui | P1 | ☑ |
| BS-2 | `behaviorplans` returns the client's plans | @api | P1 | ✖ **DEF-2** |
| BS-3 | *Added.* The page never shows "no behavior plans yet" and "data is unavailable" together | @ui | P1 | ✖ **DEF-5** |

> **BS-1 was re-scoped.** The plan asserted `behavior-support-unavailable` is shown, which
> pins today's defect as the contract: it would go red the day the backend is fixed. Under
> the revised D3 the honest split is a normal scenario for what is true either way (the
> rail and panel render with counts), plus `@bug` scenarios for the endpoint (BS-2) and for
> the contradictory messaging (BS-3).

> The "error masked as empty state" behaviour the original note asked us to flag separately
> is now BS-3 and DEF-5 — an executable assertion rather than a note, since the invariant
> "only one of those two messages can be true" holds whichever way the endpoint behaves.

> Timing note: the unavailable notice appears only after the app's retry fails.
> `BehaviorSupportPage.goto` waits until the app stops re-requesting; without that, BS-3
> passed vacuously against a half-drawn page.

### Unit 6 — Negative & error cases  `@negative`

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| NEG-1 | API call without a token is rejected with 401 | @api | P1 | ☑ |
| NEG-2 | API call with a malformed token is rejected with 401 | @api | P2 | ☑ |
| NEG-3 | Unknown client ID in the URL falls back to the clients list | @ui | P2 | ☑ |
| NEG-4 | Unknown route falls back to the clients list | @ui | P2 | ☑ |
| NEG-5 | *Added.* Programs for a client ID that does not exist return 200 with no items | @api | P2 | ☑ |
| NEG-6 | Invalid credentials reach the login endpoint and are rejected with 401 | @api @endpoint-coverage | P2 | ☑ |
| NEG-7 | Target POST against a derived unknown client is safely rejected with 4xx | @api @endpoint-coverage | P2 | ☑ |
| NEG-8 | Target DELETE against a derived unknown client is safely rejected with 4xx | @api @endpoint-coverage | P2 | ☑ |
| NEG-9 | Clients list shows `clients-list-loading` while the list XHR is held | @ui @negative | P2 | ☑ |
| NEG-10 | Clients list shows `clients-list-error` (no rows) on a 503, then recovers on retry | @ui @negative | P1 | ☑ |
| NEG-11 | Empty programs envelope renders `program-rail-empty` and no rail items | @ui @negative | P2 | ☑ |
| NEG-12 | Automastery evaluation POST against a derived unknown client is safely rejected with 4xx | @api @endpoint-coverage | P2 | ☑ |
| NEG-13 | Session POST against a derived unknown client is safely rejected with 4xx | @api @endpoint-coverage | P2 | ☑ |

> **NEG-4 was re-scoped.** The plan expected a not-found state. There isn't one: the app
> redirects any unknown route to `/clients`. That is graceful — no crash, no blank shell,
> which was the point of the row — so the scenario asserts the real behaviour. Whether a
> 404 view *should* exist is a product question, not a test failure.

> NEG-5 note: `/clients/<missing id>/programs` answers **200 with an empty envelope**, not
> 404, so the API cannot distinguish "no such client" from "client with no programs". The
> scenario records the behaviour; see AN-4 in `defects.md` for the open question.

> The missing client ID is derived as one past the highest real id rather than hardcoded,
> so it cannot collide as the data changes (D2/D6).

`npm run test:endpoints` combines the regular API profile, NEG-6–8 and NEG-12–13, and the
existing `behaviorplans` `@bug` scenario. This reaches every endpoint in the
health-report catalog without credentials, a dedicated write client, or mutation.

### Unit 7 — Harden existing tests

Oracle, contract headers, selector ownership, and a named regression for each
default-run family. Write flows stay in the matrix section below (workflow Unit 11).

| Check | Result |
|-------|--------|
| D10 AZ-2 oracle | In-scope is no longer required to equal `sum(targets.totalCount)` |
| `x-api-version=1` | Asserted on every default-run 200 API contract except `@bug` BS-2 |
| Session tokens | Non-empty strings longer than 20 characters, not merely truthy |
| PRG-6 settings panel | `program-details-settings` lives on `ClientWorkspace` |
| Traceability orphans | Every `.feature` scenario maps to a matrix ID in `test-cases.md` |

| ID | Turns red when |
|----|----------------|
| FND-1…7 | Auth harvest, preflight, fixture, or scrubbing regress |
| AUTH-1…5 | Token pair, refresh, preview sign-in, staff-role identity, or signed-out gate regress |
| CLI-1…10 | Envelope, list↔API, search, switcher, or status mapping regress |
| PRG-1…9 | Program contracts, rail partition, details panels, or client tabs regress |
| AZ-1…10 | Tile identity, chart domains, chips, modes, or series counts regress |
| BS-1 | Plan rail or novel-behaviors panel missing |
| NEG-1…13 | 401, login reject, unknown-id fallback, or safe 4xx writes regress |
| A11Y-1…5 | A main page introduces a critical-impact axe violation |

### Unit 8 — Surface inventory

The coverage denominator lives in [`surface-inventory.json`](./surface-inventory.json).
Each run rewrites [`surface-inventory.md`](./surface-inventory.md) and
`reports/coverage-percent.json`.

| | |
|--|--|
| **Command** | `npm run coverage:inventory` |
| **Formula** | `(covered + @bug + 0.5×partial) / in-scope` |
| **Exclusions** | Unvisited primary-nav areas (Staff … Billing) — signed-off gap with a human exploratory compensating control |

Open gaps remaining after Unit 11: `/sessions/new` (never landed; DEF-6), mastery
confirm/dismiss (no create API), Behavior Support true-empty (blocked by DEF-2).

### Unit 9 — Read-path states

Fault-injected against live testids: `clients-list-loading`, `clients-list-error`,
`clients-list-retry`, `program-rail-empty`. Analyze Data empty/loading stays Unit 10.

### Unit 7b — Write flows  `@write` (workflow Unit 11)

Requires `TEST_CLIENT_ID` (dedicated client). `npm test` excludes `@write`. Run
`npm run test:write`. Created targets are named `ZZZ-SUITE-*` and DELETE'd in After
(`If-Match: *`).

W0 recon (2026-08-27, re-checked 2026-09-02): `POST .../targets` with `{ description }`
→ **201**. `DELETE` without If-Match → **428**; with `If-Match: *` → **204**. UI
`program-details-add-target` / `record-data` do not open a form or `/sessions/new`
(**DEF-6**). `POST .../automastery-evaluations` → **405** (no create API). Session
collection POST → **404**. Mastery confirm/dismiss are not clicked for pre-existing rows.

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| WR-1 | POST a uniquely named target; GET lists it | @api @write | P1 | ☑ |
| WR-2 | Clicking add-target without a form does not create a target | @ui @write | P1 | ☑ |
| WR-2b | Add-target opens a create form | @ui @write @bug | P1 | ✖ **DEF-6** |
| WR-3 | Clicking record-data does not create a session | @ui @write | P1 | ☑ |
| WR-3b | Record-data opens a collection form or session wizard | @ui @write | P1 | ☑ (SES-1 in default) |
| WR-4 | Confirm mastery on a suite-created evaluation | @ui @write | P1 | ☐ `@wip` — POST evaluations is 405 |
| WR-5 | Dismiss a suite-created evaluation | @ui @write | P1 | ☐ `@wip` — same |
| WR-6 | Save a named report; it lists in the same browser context | @ui @write | P2 | ☑ |

### Unit 12 — Visual regression  `@visual`

Viewport **1280×720**, `deviceScaleFactor: 1`, UTC / `en-US` / reduced motion. Magenta
masks cover shared-caseload text and signed-in identity (D11). Diffs over 2% of
pixels fail and write `reports/visual/{name}-diff.png` (gitignored).

`npm test` excludes `@visual`. Run `npm run test:visual`. Rewrite baselines with
`UPDATE_VISUAL=1`.

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| VIS-1 | Clients list chrome matches baseline | @ui @visual | P2 | ☑ |
| VIS-2 | Client workspace chrome matches baseline | @ui @visual | P2 | ☑ |
| VIS-3 | Analyze Data mastered report chrome matches baseline | @ui @visual | P2 | ☑ |
| VIS-4 | Analyze Data custom graph chrome matches baseline | @ui @visual | P2 | ☑ |
| VIS-5 | Analyze Data bulk graph chrome matches baseline | @ui @visual | P2 | ☑ |

### Unit 13 — Accessibility  `@a11y`

axe-core WCAG 2.A / 2.AA (`@axe-core/playwright`). **Critical** impact fails the
scenario (D12). Included in `npm test`. `npm run test:a11y` runs this family alone.

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| A11Y-1 | Sign-in page has no critical axe violations | @ui @a11y @signed-out | P1 | ☑ |
| A11Y-2 | Clients list has no critical axe violations | @ui @a11y | P1 | ☑ |
| A11Y-3 | Client workspace has no critical axe violations | @ui @a11y | P1 | ☑ |
| A11Y-4 | Analyze Data has no critical axe violations | @ui @a11y | P1 | ☑ |
| A11Y-5 | Behavior Support has no critical axe violations | @ui @a11y | P1 | ☑ |

### Sustain — New session wizard  `@sessions`

Exploratory 2026-09-02: record-data now lands on `/sessions/new`. Default tests must not
complete the wizard (that writes a session).

| ID | Scenario | Type | Priority | Status |
|----|----------|------|----------|--------|
| SES-1 | Record-data opens the new-session wizard without posting | @ui @sessions | P1 | ☑ |
| SES-2 | Wizard advances to Programs without posting a session | @ui @sessions | P2 | ☑ |

### Unit 14 — Operations / CI

GitHub Actions. Gate excludes `@write`, `@bug`, `@visual`, `@wip`. Coverage ratchet
compares live inventory % to [`coverage-floor.json`](./coverage-floor.json).

| ID | Item | Priority | Status |
|----|------|----------|--------|
| OPS-1 | PR workflow: typecheck, `coverage:ratchet`, `test:smoke`, `verify:scrub` | P0 | ☑ |
| OPS-2 | Nightly workflow: `npm test` (default profile) + ratchet + report artifacts | P0 | ☑ |
| OPS-3 | Coverage floor 94.7%; build fails if live % is lower | P0 | ☑ |

Signed-off gaps and the per-release human pass: [`compensating-controls.md`](./compensating-controls.md) (D14).

### Unit 15 — Metrics dashboard (15a–15d)

Cucumber JSON at `reports/cucumber-report.json`. Parser: `npm run dashboard:metrics` → `reports/metrics.json` + append `reports/history.json`.

| ID | Item | Priority | Status |
|----|------|----------|--------|
| DASH-1 | JSON formatter + `metrics.json` implementing §3 / D15 | P1 | ☑ 15a |
| DASH-2 | `history.json`, flake, trends | P1 | ☑ 15b |
| DASH-3 | `dashboard.html` | P1 | ☑ 15c — reviewed by product, one wording/layout revision applied |
| DASH-4 | CI post-step + GitHub Pages publish (D16/D17) | P1 | ☑ 15d — green/red pipeline proof complete |

**15a formulas (D15):** headline pass rate = passed ÷ executed, excluding `@bug` (`@write` included when present). Open defects = Gherkin `@bug` catalog not proven green this run. `coverage.percent` = D14 ratchet; `coverage.specPercent` = covered ÷ total inventory items.

**15b (D16):** flake rate = (scenario names that both passed and failed in the last 10 history runs) ÷ executed this run. Trend = pass rate + both coverage % for the last 30 runs. Cap 200.

**15d proof (2026-09-03):** [green run 33733844597](https://github.com/masudrana-bit/Rethink-Clinical-test-suite/actions/runs/33733844597) published the stable Pages URL and passed the ratchet (`94.7%` from `metrics.json`, floor `94.7%`). [Deliberately red run 33734013611](https://github.com/masudrana-bit/Rethink-Clinical-test-suite/actions/runs/33734013611) raised only the temporary floor to `100%`; its ratchet failed on the same `metrics.json`, while the Pages job still published and history advanced from one to two entries. The temporary floor, feature-branch trigger, fixture, and deployment allowance were removed afterward.
