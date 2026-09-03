# Unit 15 — Metrics Dashboard (exec/PM view)

> **Unit spec + steering rules.** Save as `rules/30-metrics-dashboard.md` in the repo, next to
> `00-project-rules.md`, `10-app-context.md`, and `20-coverage-maximization.md`. The agent loads
> all rules/ files first. Invoke with:
>
> > Follow rules/30-metrics-dashboard.md. Do **sub-bolt 15a** only. Plan and questions first, then wait.
>
> All contracts from `00` and `20` apply: plan → ask → approval → generate → stop for review.
> One sub-bolt per invocation. Record new findings as dated decisions in `coverage-matrix.md`.

---

## 1. Intent and audience

Build a **product-facing quality dashboard** that the CTO and product managers can read at a
glance, regenerated automatically from the latest test run. It is a *translation layer* over
existing artifacts — it answers "how protected is the product and is it trending better?",
not "which step failed" (Allure stays the QA drill-down and must be linked, not replaced).

Everything on it is **derived, never hand-edited**: recomputed on every CI run from the run's
own outputs. No manual updates, ever.

## 2. Architecture (fixed — do not redesign)

```
cucumber run ──▶ reports/cucumber-report.json        (add json formatter to cucumber.js)
                + docs/coverage-matrix.md / inventory (coverage denominator, when it exists)
                        │
                        ▼
        scripts/generate-dashboard.(ts|js)            (single generator, runs as CI post-step)
                        │
        ┌───────────────┼─────────────────────┐
        ▼               ▼                     ▼
 reports/metrics.json  reports/history.json  reports/dashboard.html
 (this run, machine)   (append, capped)      (single self-contained file)
                        │
                        ▼
        publish to one stable URL (Pages / S3 / internal web) + link Allure
```

## 3. Data and metric definitions (binding — do not invent alternatives)

These definitions exist so the numbers mean the same thing every run. Any change to them is a
dated decision, not a silent edit.

- **Executed scenarios** = scenarios in this run's `cucumber-report.json`.
- **Pass rate (headline)** = passed ÷ executed, **excluding `@bug` scenarios**. `@bug` tests
  are *expected* red (known defects, D3); counting them in the headline misstates health.
  `@write` scenarios are excluded from the headline until Unit 11 is declared done.
- **Open defects** = count of `@bug` scenarios currently red, listed by name. A `@bug`
  scenario that turns green is surfaced as "fix detected — remove @bug tag" in a callout.
- **Coverage %** = inventory items with status `covered` ÷ total inventory items, with
  `partial` shown as its own slice. Source: the Unit 8 inventory/matrix. **If the inventory
  does not exist yet, display "Coverage: pending inventory (Unit 8)" — never compute a
  substitute from scenario counts.** Pass rate and coverage are different claims; the
  dashboard must never blur them.
- **Per-area rollup** = group scenarios by feature-area tags (`@auth`, `@clients`,
  `@programs`, `@analyze-data`, `@behavior-support`); each area shows its pass state and,
  when inventory exists, its coverage.
- **Flake rate** = scenarios that both passed and failed within the last 10 recorded runs ÷
  scenarios executed, from `history.json`.
- **Trend** = pass rate and coverage % per run for the last 30 runs.
- **Run metadata** = timestamp (with timezone), environment (dev2), git ref, trigger
  (PR/nightly/manual), duration, scenario/step totals including skipped/undefined (a nonzero
  undefined count renders as a warning banner — that is a false-green risk, per `--strict`).

## 4. Dashboard content spec (order is priority; product language throughout)

1. **Health headline** — big green/red status, headline pass rate, run timestamp, env, duration.
2. **Coverage %** — with the covered/partial/gap split, or the "pending inventory" state.
3. **Trends** — pass rate + coverage line chart over last 30 runs.
4. **By product area** — one row/card per area: name, status, coverage, scenario count.
5. **Open known defects** — the red `@bug` list, in plain product terms (one line each).
6. **Honesty footer** — flake rate, top risk-rated gaps from the matrix, count of excluded
   scenario groups (`@write`, `@bug`) with one-line reasons, and a "QA detail → Allure" link.

Wording rules: product terms, not QA jargon ("Client management", not `clients.feature`);
no step traces, no stack traces, no selector talk. Anything deeper links out to Allure.

## 5. Hard constraints

- **Single self-contained `dashboard.html`** — inline CSS/JS/data, no server, no build step,
  renders from a file:// open or any static host. Chart via inline SVG or a single CDN
  script; if CDN is used it must degrade gracefully offline (numbers still visible).
- **Generator is a CI post-step that runs on every run, including failed runs** — a red run
  is exactly when the CTO looks. It must consume whatever partial report exists.
- **Non-blocking:** dashboard generation failure must not fail the pipeline (log and
  continue). The coverage **ratchet gate** (Unit 14: build fails if coverage % drops) is a
  separate CI step that reads the same `metrics.json` — one metric computed once, used for
  both gating and display.
- **`history.json` is append-only, capped at 200 runs** (drop oldest). It lives with the
  published artifacts (or a small store), not hand-edited, and survives across runs — decide
  and record where it persists (Pages branch, S3, artifact restore) as a dated decision.
- **No secrets, no PII, no client names from dev2 data** on the dashboard. Scenario names
  and area labels only. Credential-scrub rules (D7) apply to anything embedded.
- No screenshots or traces embedded (those live in Allure); keep the HTML under ~500KB.

## 6. Sub-bolts (one per invocation, in order)

**15a — Parser + `metrics.json`.** Add the json formatter to `cucumber.js`. Write the
generator's parse stage: read `cucumber-report.json` (+ matrix if present), emit
`metrics.json` implementing every definition in §3 exactly. *Exit:* run it on the real
latest report; human verifies every number against the known run (e.g. the 54/53/1 run) by
hand.

**15b — History.** Append run metrics to `history.json` with cap + persistence strategy;
compute flake rate and trends from it. *Exit:* three consecutive real runs produce three
history entries and a correct flake calculation; persistence decision recorded.

**15c — Dashboard render.** Emit `dashboard.html` per §4/§5 from `metrics.json` +
`history.json`. *Exit:* human review with one non-QA reader (or the CTO) — the test is
"understood in 30 seconds without explanation"; iterate wording once on their feedback.

**15d — CI wiring + publish.** Post-step in the pipeline (runs on pass and fail), publish to
the stable URL, wire the ratchet gate to read `metrics.json`, link Allure. *Exit:* two real
pipeline runs (one green, one deliberately red) both publish an updated dashboard at the
same URL.

**15e (optional) — Run summary notification.** Slack/Teams message per nightly run: 5 lines
(status, pass rate, coverage, new/resolved `@bug` deltas, dashboard link). *Exit:* one real
nightly posts correctly.

## 7. Definition of done (whole unit)

- Every metric on the page traces to a §3 definition; no hand-maintained numbers anywhere.
- Updates on every run automatically; verified on both a green and a red run.
- Coverage shown honestly (real inventory-based %, or explicit "pending inventory").
- CTO/PM comprehension check passed (15c exit).
- Ratchet gate and dashboard read the same `metrics.json`.
- Documented in README: the URL, how it regenerates, and the §3 definitions.
