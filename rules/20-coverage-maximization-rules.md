# Coverage Maximization Rules — Rethink Clinical (UI + API)

> **Steering file.** Drop this in your repo as `rules/20-coverage-maximization.md`, alongside
> `00-project-rules.md` and `10-app-context.md`. Every AI agent working on coverage loads all
> three before planning anything. This file encodes what "maximum coverage" means for this
> suite, the UI and API rules that make coverage real, and the ordered backlog to get there.
> It incorporates every lesson learned so far (decisions D1–D18).

---

## 1. The contract (unchanged, restated)

For every task: restate the intent → draft a plan → **ask clarifying questions → wait for
human approval** → generate → stop for human review. One unit of work per bolt; never
continue to the next unit without a fresh instruction. If you discover anything that
contradicts or extends a decision, add a new dated decision to `coverage-matrix.md` and say so.

## 2. What "maximum coverage" means (and what it never means)

Maximum coverage is: **every item on the surface inventory is either covered by a test proven
to fail on a real regression, or recorded as a conscious, risk-rated gap — with the coverage
percentage computed live in CI from the inventory, and the blind spots automation cannot see
named with compensating controls.**

It never means:
- A big scenario count. Volume without assertion strength is decoration.
- A test that stays green when the app breaks. A test that cannot go red is a defect in the
  suite — worse than no test, because it manufactures false confidence.
- 100%. The denominator is bounded by the inventory, not by imagination; gaps are allowed,
  but only as signed-off decisions.

Coverage never regresses: once an item is covered and green, no later change may silently
drop or weaken it.

## 3. Oracle rules — assert only true invariants (D10)

The costliest failure so far was not a missed bug but a **wrong oracle**: asserting that the
"Targets in scope" tile equals `sum(targets.totalCount)` across programs. It does not — the
tile is a window/status-filtered clinical subset. The test produced a false red.

- **D10 (dated):** "Targets in scope" is a report-scoped metric, not the raw target count.
  Cross-layer reconciliation of the in-scope tile against the raw targets API is invalid.
- Before encoding any invariant, verify it is a property the app actually guarantees:
  confirm against observed behaviour across at least two different clients/states, or
  against team confirmation. If unverified, do not assert it — file a question instead.
- Prefer **internal-consistency invariants** (mastered + remaining == in-scope: values from
  the same rendered report) over cross-layer assumptions (UI summary == raw API rollup).
- When a UI↔API check is genuinely valid, re-read the API **live at assertion time** (D9);
  never compare against a snapshot taken earlier in the run.
- Fixing a wrong oracle means asserting the *correct* property — never deleting or loosening
  the assertion just to get green.

## 4. UI coverage rules

**Selectors.** `getByTestId` only. A missing or ambiguous `data-testid` is a product gap:
flag it for the app team; do not improvise role/text selectors as a workaround. Keep all
selectors in Page Objects — never inline in step definitions.

**State coverage per page.** A page is not covered by its happy path. For every page in the
inventory, cover the applicable states: normal · empty · loading · error · unauthorized ·
not-found (bad id) · boundary data. For every list view: 0 items · 1 item · many · load
failure. For every input and control: valid · invalid · boundary · empty. These states are
where real regressions hide; happy-path-only coverage is partial coverage and must be marked
`partial` in the matrix.

**Network assertions.** For each page, assert the expected XHRs fire on load with 2xx (per
the per-page call lists in `10-app-context.md`) and that no unexpected request fails.
Ignore third-party noise (fonts). This catches wiring regressions the DOM never shows.

**Waiting.** No `waitForTimeout`, ever. Wait on responses (`waitForResponse`), element state,
or an `expectLoaded()` that requires a real value (note: a rendered "0" satisfies `/\d/` —
loaded is not the same as non-zero; assert the meaning separately). Highcharts renders SVG
`<text>`: read `textContent`, not `innerText`.

**Order independence.** Every scenario must pass in isolation and in any order. Auth-state
scenarios sign in for themselves (D8: refresh tokens are single-use; never share a token
across scenarios that consume it).

**Visual regression.** Playwright snapshot tests on the key screens (clients list, client
workspace, each Analyze-Data tab), with volatile regions masked: dates, and any area showing
shared-suite data (`ZZZ-E2E-*` pollution, D9). Commit baselines; fail on meaningful diff.
This closes the layout/rendering blind spot functional assertions cannot see.

**Accessibility.** axe-core checks on the main pages as tagged `@a11y` scenarios; gate on
critical violations only.

**UI text assertions** must target stable labels and computed values, never fixed counts
(D2) and never data another suite can mutate mid-run (D9) — re-read the API live for any
data-dependent expectation.

## 5. API coverage rules

- **Contract per endpoint:** status, content-type (including the `x-api-version` marker),
  and the actual response shape. The five per-program endpoints return **three distinct
  shapes** — only `targets` and `objectives` use the paged envelope; assert each endpoint's
  real shape, never an assumed common envelope.
- **Paging arithmetic** on paged endpoints: `items.length`, `totalCount`, `totalPages`
  mutually consistent; no fixed expected counts (D2).
- **Negative paths:** unauthenticated → rejected; invalid/foreign ids handled; expired token
  behaviour covered.
- **Known defects** use the two-test pattern (D3): one normal test asserting the UI/consumer
  degrades gracefully (stays green regardless of backend state), plus one `@bug` test
  asserting the correct behaviour (red until fixed — flips green the day it is fixed, then
  drop the tag). Current instance: `behaviorplans` 500.
- **Auth contract:** login token pair + expiry shape; refresh exchange; `staff-role`
  identity. Auth scenarios are self-contained (D8).

## 6. Write/mutation rules

Mutations run against the **dedicated test client only** (`TEST_CLIENT_ID`, enforced by
`writeGuard.ts`) — never the shared caseload. Every created resource is torn down in the
same scenario or an After hook, even on failure. Write scenarios are tagged `@write` and
excluded from the PR gate until the unit is complete and stable.

## 7. Environment rules (dev2)

- Shared environment: another suite writes `ZZZ-E2E-*` data hourly (D9). No snapshot
  comparisons; no fixed counts; resolve clients/programs dynamically at runtime.
- Preflight fails fast if dev2 is unreachable (D5) — an environment outage must read as
  "environment down", not as 54 test failures.
- Credential scrubbing stays verified (D7): traces and artifacts must never contain the
  leaked `apiKey`/password fields. No secrets in the repo; all credentials via env/CI vars.
- The crawl `output/` folder stays out of the repo and out of agent runtime context.

## 8. Coverage expansion backlog (work top to bottom, one unit per bolt)

| # | Unit | Status | Exit criteria |
|---|------|--------|---------------|
| 6 | Prove & stabilise baseline | ☑ | Full read-only suite green 3× consecutively; zero flake; zero undefined/pending steps (`--strict` on) |
| 7 | Harden existing tests | ☑ | Every selector verified on live dev2; every test proven to fail on a described regression; zero traceability orphans |
| 8 | Surface inventory & live matrix | ☑ | Complete inventory (routes × endpoints × actions × states) mapped to tests; coverage % + ranked risk-rated gap list signed off |
| 9 | States & negative paths (UI) | ☑ | Inventory's state gaps for read paths closed per §4 |
| 10 | Analyze-Data breadth | ☑ | Custom Graph, Bulk Graphs, Print tabs + empty/loading states covered (read-only) |
| 11 | Write/mutation unit | ☑ | §6 satisfied; mutations covered with teardown on the dedicated client |
| 12 | Visual regression | ☑ | Baselines committed for key screens, volatile regions masked, diff gate active (`npm run test:visual`) |
| 13 | Accessibility | ☑ | axe-core on main pages; critical violations gated |
| 14 | Operations / CI | ☑ | Smoke per PR; full nightly; `@write`/`@bug` excluded from gate; coverage % published per run and **ratcheted** (build fails if it drops) |
| 15 | Metrics dashboard | ☑ | Product quality dashboard regenerated every run (`rules/30-metrics-dashboard.md`); §3 metrics in `reports/metrics.json`; GitHub Pages URL; ratchet reads the same `coverage.percent` |

After Unit 15, sustain: every new feature/bug enters as a new unit; `@bug` tests stay
red-until-fixed; flake triaged immediately; inventory re-run quarterly so the denominator
grows with the app. The executive view is `https://masudrana-bit.github.io/Rethink-Clinical-test-suite/`.

## 9. Definition of done — per test

- Traces to an inventory/matrix row; correctly tagged.
- Assertion proven meaningful: a realistic regression is named that would turn it red.
- Grounded: selector is a verified testid; expected values come from live API reads or
  app-guaranteed invariants (§3), never assumptions or snapshots.
- Order-independent; green twice consecutively; no secrets, no hardcoded ids, no fixed waits.
- Human reviewed.

## 10. Peak checklist (declare "maximum" only when all hold)

- ☑ Inventory complete and current; remaining items are covered, `@bug`, or a signed-off gap ([`docs/compensating-controls.md`](../docs/compensating-controls.md), D14)
- ☑ Every covering test proven to fail on regression (no weak assertions) — Unit 7
- ☑ UI state matrix (§4) closed for read paths; leftover empty/write states are signed-off gaps (DEF-2, DEF-6, WR-4/5)
- ☑ Visual-regression layer active (`@visual`, masked baselines)
- ☑ Accessibility layer (axe-core) active (`@a11y`, critical-only)
- ☑ Blind spots named with compensating controls (thin human exploratory pass per release)
- ☑ CI: smoke per PR, full nightly, live ratcheted coverage %, product dashboard published
- ☑ Decision log current (D1–D18); flake ~zero as of the Unit 6 baseline (re-open if nightly flakes)

## 11. Standing prompts

Prepend to every task:

> Before writing any code, restate the goal in one sentence, give me your plan, and list what
> you need to confirm about the app. Wait for my approval. Load rules/ as context. If you
> discover anything that contradicts or extends decisions D1–D18, add a new dated decision to
> coverage-matrix.md and tell me.

Per-unit invocation:

> Follow rules/20-coverage-maximization.md. Do **Unit N** only. Plan and questions first,
> then wait.
