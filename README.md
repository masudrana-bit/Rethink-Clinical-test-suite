# Rethink Clinical — Test Automation (Playwright + Cucumber, AIDLC)

Starter kit for building end-to-end and API test automation for the Rethink Clinical
Angular app, using the AIDLC (AI-Driven Development Lifecycle) methodology.

## What's in here

```
rules/                 Steering files — the rules every AI agent obeys (load these first)
  00-project-rules.md  The AIDLC loop, stack, hard constraints, definition of done
  10-app-context.md    Endpoint inventory, response shapes, UI flows (from the crawl)
  20-coverage-maximization-rules.md  Peak-coverage backlog and oracle rules
  30-metrics-dashboard.md  Product dashboard units 15a–15e and §3 metric definitions
docs/
  aidlc-process.md     Inception / Construction / Operations runbook
  coverage-matrix.md   Test inventory + units of work + tag taxonomy
  api-endpoint-report.md  Regenerated each run: endpoint groups + HTTP status
features/              Gherkin BDD scenarios (api/ and ui/)
steps/                 Cucumber step definitions
pages/                 Page Objects
api/                   Typed API client
support/               World, hooks, config
.env.example           Required env vars (copy to .env — never commit secrets)
```

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env      # then fill in TEST_USERNAME, TEST_PASSWORD, AUTH_APPLICATION_KEY
npm run test:smoke        # run @smoke first
```

Other scripts: `npm run test` (all except `@write` / `@bug` / `@visual`), `npm run test:api`, `npm run test:ui`, `npm run test:visual`, `npm run test:a11y`, `npm run test:sessions`.

## Allure report

Every npm test profile writes fresh results to `allure-results/`. Each executed
`@ui` step includes a viewport screenshot, and the scenario's final attachment
is its full Playwright execution video. API-only scenarios avoid visual noise:
they attach a redacted request/response diagnostic and assertion failures show
the method, URL, status, content type, and safe body preview.

```bash
npm run test:smoke
npm run allure:generate
npm run allure:open
```

Use `npm run allure:serve` to generate and open the results in one command.

## API endpoint report

Each run rewrites `docs/api-endpoint-report.md` (copy also under `reports/`).
Endpoints are grouped (Auth, Accounts, Clients, Programs, Write, Observations)
and marked ✅ Pass / ❌ Fail / ➖ Not run. The report includes group success
rates, endpoint coverage, one failures-only view, safe backend error details,
root-cause clusters, trace IDs, impacted scenarios, and recommended next checks.

```bash
npm run test:api          # regular green API regression profile
npm run test:endpoints    # all 16 catalogued endpoints, including known defects
# then open docs/api-endpoint-report.md
```

`test:endpoints` uses non-mutating 4xx probes for login and write routes, so it
does not need credentials or `TEST_CLIENT_ID`. It intentionally executes the
known `behaviorplans` defect; while that endpoint returns 500 the command exits
non-zero and the report remains at 100% endpoint coverage with Observations
marked ❌ Fail.

## Surface inventory

`docs/surface-inventory.json` is the coverage denominator (routes × endpoints ×
actions × states). Each test run, or `npm run coverage:inventory`, rewrites
`docs/surface-inventory.md` with the live percentage and a ranked gap backlog.

```bash
npm run coverage:inventory
# then open docs/surface-inventory.md
```

## Visual regression

`@visual` compares a 1280×720 screenshot (volatile data masked magenta) to PNGs in
`visual/baselines`. Not part of `npm test`.

```bash
npm run test:visual
# PowerShell, after a deliberate UI change:
$env:UPDATE_VISUAL='1'; npm run test:visual
```

Diffs land in `reports/visual/` (gitignored). Commit updated baselines when the
chrome change is intentional (decision D11).

## Accessibility

`@a11y` runs axe-core (WCAG 2.A / 2.AA) on the main pages and **fails only on
critical** impact (D12). Included in `npm test`.

```bash
npm run test:a11y
```

## New session wizard

Record-data opens `/sessions/new`. Default tests cover participants and Programs
and **do not** click Confirm (that writes a session). Included in `npm test`.

```bash
npm run test:sessions
```

## CI (GitHub Actions)

Decision **D13**. No credentials are required (D1: `/temp-dev-login`). The gate never runs
`@write`, `@bug`, `@visual`, or `@wip`.

| Workflow | When | What |
|----------|------|------|
| `.github/workflows/pr.yml` | Every pull request | `typecheck`, smoke, dashboard metrics, ratchet from `metrics.json`, `verify:scrub` |
| `.github/workflows/nightly.yml` | 06:00 UTC and manual | Default suite, dashboard + Pages publish, ratchet from `metrics.json` |

Coverage floor: `docs/coverage-floor.json`. Raise it when inventory % increases.

```bash
npm run coverage:ratchet
```

Signed-off gaps and the per-release human pass: `docs/compensating-controls.md` (D14).

## Quality dashboard

**Published URL:** https://masudrana-bit.github.io/Rethink-Clinical-test-suite/

Regenerated on every Nightly (and after PR smoke as artifacts only). Local copy:
`reports/dashboard.html`.

```bash
npm run dashboard:metrics    # parse cucumber JSON + inventory → metrics, history, HTML
```

### Metric definitions (`rules/30-metrics-dashboard.md` §3)

These are binding. A change is a dated decision, not a silent edit.

- **Executed scenarios** = scenarios in this run's `reports/cucumber-report.json`.
- **Pass rate (headline)** = passed ÷ executed, **excluding `@bug`**. Known defects are expected red (D3); counting them in the headline misstates health. `@write` counts when that run executed it (Unit 11 is done).
- **Open defects** = Gherkin `@bug` scenarios this run did not prove green, listed by name. A `@bug` that passes is a “fix detected — remove @bug tag” callout (`bugFixDetected`). Default `npm test` does not execute `@bug`, so they stay open until a bugs-profile run proves them green.
- **Coverage %** = inventory-based, never a substitute from scenario counts. Two figures (D15) on **different denominators**, so the page names both: **`coverage.percent`** is the D14 ratchet `(covered + bug + 0.5×partial) / in-scope`; **`coverage.specPercent`** is §3 `covered ÷ total inventory items`. Every inventory status gets a row in the protection matrix, including `excluded` — a status with no row would still count toward the totals printed beside it, and the generator warns if one is missing. If the inventory were missing: “Coverage: pending inventory (Unit 8)”. Pass rate and coverage are different claims.
- **Per-area rollup** = group this run by product-area tags (`@auth`, `@clients`, `@programs`, `@analyze-data`, `@behavior-support`, plus extra areas as their own rows). A check can serve two areas, so the column deliberately sums to more than the run total; the page states the overlap count. Inventory coverage per area is not broken down (shown as —).
- **Flake rate** = (scenarios that both passed and failed in the last 10 `history.json` runs) ÷ scenarios executed this run. Runs are keyed by scenario identity (`uri:line`), so each Scenario Outline example counts separately (D20).
- **Trend** = pass rate and coverage % per run for the last 30 runs.
- **Run metadata** = timestamp (with timezone), environment (dev2), git ref, trigger, duration, scenario/step totals including skipped/undefined (a nonzero undefined count is a false-green warning under `--strict`).

Related decisions: **D15** (both coverage claims, pass-rate exclusions), **D16** (history persistence), **D17** (Pages URL; ratchet reads `metrics.json`), **D19** (Nightly owns the history stream), **D20** (history keyed by scenario identity).

Nightly and manual runs publish the stable URL even when the suite is red. PRs generate the same files as downloadable artifacts without replacing the executive view. The coverage ratchet reads `coverage.percent` from that run's `reports/metrics.json`; it does not calculate a second coverage value. Detailed Allure evidence is at `/allure/`.

**Nightly owns the trend (D19).** Only Nightly writes history, to the 90-day `metrics-history-nightly` artifact (Pages `/history.json` is the durable fallback). The PR gate restores it read-only and never uploads, so a short smoke run cannot make the executive trend look like a regression. To discard the recorded trend and start over, run Nightly with the `reset_history` input, or set `HISTORY_RESET=1` locally before `npm run dashboard:restore`.

Teams Adaptive Card notify (D18) is wired in Nightly but unused until a webhook is configured later. Unset secret skips the post.

If GitHub-hosted runners cannot reach `*.internal.*`, set repo variable `CLINICAL_RUNNER`
to a self-hosted runner label. Optional URL overrides: repo variables `BASE_URL`,
`API_BASE_URL`, `AUTH_BASE_URL`.

## How to run the AIDLC process

Read `docs/aidlc-process.md`. In short:

1. **Inception** — Mob Elaboration session: point the AI at `rules/` + the crawl,
   let it ask questions, approve `docs/coverage-matrix.md`.
2. **Construction** — one unit of work per bolt (Auth → Clients → Programs →
   Analyze-Data → Negative). AI proposes, you approve, AI generates, you review.
3. **Operations** — wire CI, publish reports, loop bugs back into Inception.

## Non-negotiables

- No secrets in the repo. Ever.
- No hardcoded client/program IDs — resolve from the clients list at runtime.
- No fixed sleeps — wait on network or element state.
- Every test traces to a coverage-matrix row.

## Note on the source crawl

These files were seeded from a site-crawler snapshot. That snapshot's
`api-endpoints.json` contains real-looking credentials — keep it out of this repo and
out of shared channels.
