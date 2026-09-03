# Rethink Clinical — Test Automation (Playwright + Cucumber, AIDLC)

Starter kit for building end-to-end and API test automation for the Rethink Clinical
Angular app, using the AIDLC (AI-Driven Development Lifecycle) methodology.

## What's in here

```
rules/                 Steering files — the rules every AI agent obeys (load these first)
  00-project-rules.md  The AIDLC loop, stack, hard constraints, definition of done
  10-app-context.md    Endpoint inventory, response shapes, UI flows (from the crawl)
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
| `.github/workflows/pr.yml` | Every pull request | `typecheck`, `coverage:ratchet`, `test:smoke`, `verify:scrub` |
| `.github/workflows/nightly.yml` | 06:00 UTC and manual | `npm test` (default profile) + ratchet + report artifacts |

Coverage floor: `docs/coverage-floor.json`. Raise it when inventory % increases.

```bash
npm run coverage:ratchet
```

Signed-off gaps and the per-release human pass: `docs/compensating-controls.md` (D14).

## Metrics (`reports/metrics.json`)

Unit 15a. After any Cucumber profile:

```bash
npm run dashboard:metrics
```

Reads `reports/cucumber-report.json` plus `docs/surface-inventory.json`. Definitions (`rules/30-metrics-dashboard.md` §3, decision **D15**):

- **Pass rate** = passed ÷ executed, excluding `@bug`. `@write` counts when that run executed it.
- **Open defects** = every Gherkin `@bug` scenario this run did not prove green (default `npm test` does not execute them, so they stay open).
- **`coverage.percent`** = inventory ratchet formula (D14). **`coverage.specPercent`** = `covered ÷ total inventory items`.
- **Flake rate** / **trend** come from `reports/history.json` (last 10 / 30 runs). Cap 200; persist across CI per **D16**.

The same command also renders `reports/dashboard.html` (15c): a single self-contained page for
non-QA readers — health headline, coverage, trend, product areas, open defects, honesty footer.
Open it directly from disk. The published executive view is:

**https://masudrana-bit.github.io/Rethink-Clinical-test-suite/**

Nightly and manual runs publish that stable GitHub Pages URL even when the suite is red.
PRs generate the same files as downloadable artifacts without replacing the executive view.
CI restores `reports/history.json` from the 90-day `metrics-history` artifact (then Pages as
fallback), generates after the test with `if: always()`, and republishes history with the page.
The coverage ratchet reads `coverage.percent` from that run's `reports/metrics.json`; it does
not calculate a second coverage value. Detailed Allure evidence is published at `/allure/`.

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
