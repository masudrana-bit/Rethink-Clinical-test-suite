# AIDLC Workflow — Rethink Clinical Test Suite

> **What this file is.** The standing, agent-followable process for building and expanding
> this test suite. An agent reads it when told *"do Unit N per the workflow."* It defines the
> order of work, and for each unit: the intent, the inputs, and the definition of done.
>
> **What this file is NOT.** An engine. It does not run on its own and it does not authorise
> building several units at once. It makes each unit faster and consistent — it does not remove
> the human gate between units.

---

## The contract (an agent MUST obey this on every invocation)

1. **One unit only.** When told to do a unit, do *that unit* and stop. Never continue to the next
   unit without a fresh instruction, even if the next one seems obvious.
2. **Plan first.** Before writing any code: restate the unit's intent in one sentence, give the
   plan, and list what you need to confirm about the app. **Wait for human approval.**
3. **Load context.** Read `rules/00-project-rules.md`, `rules/10-app-context.md`, and
   `docs/coverage-matrix.md` before planning. Never read `output/` (the crawl) at runtime.
4. **Ground every assertion** in a real dev2 response or a verified `data-testid` — never a guess.
5. **Respect the decisions.** Decisions in `coverage-matrix.md` (D1–D20) constrain everything. If you
   discover something that contradicts or extends them, add a **new dated decision** and tell the
   human — do not silently work around it.
6. **Stop for review.** After generating, present the tests and the run result. A human reviews
   every generated test before the unit is considered done.
7. **Coverage never regresses.** Do not remove or weaken existing green coverage to make a unit pass.

### How a human invokes a unit

> "Follow `docs/aidlc-workflow.md`. Do **Unit N** only. Plan and questions first, then wait."

That is the whole per-unit prompt. This file supplies the detail so the prompt stays short.

---

## Definition of done (applies to every unit)

- [ ] Plan approved by a human before code was written.
- [ ] Every new scenario traces to a row in `coverage-matrix.md` (add rows if missing).
- [ ] Assertions are meaningful — each test would go **red** on a real regression, not just on a crash.
- [ ] Uses a Page Object or the API client; no raw selectors scattered in steps.
- [ ] Correctly tagged (see the taxonomy in `coverage-matrix.md`).
- [ ] No secrets, no hardcoded client/program IDs, no fixed `waitForTimeout`.
- [ ] Green twice in a row locally.
- [ ] Matrix status + coverage % updated; decision log amended if anything new was learned.
- [ ] Human reviewed.

---

## The units of work, in order

Work top to bottom. Status: ☑ done · ◐ partial · ☐ not started.
The first block is the read-only suite (Phase 1); the second is the expansion to peak coverage.

### Phase 1 — Read-only suite

**Unit 1 — Authentication**  ☑  `@auth`
- *Intent:* obtain a valid session and prove protected routes stay closed when signed out.
- *Inputs:* D1 (token harvested from preview sign-in), the auth flow in `10-app-context.md`.
- *Done when:* session contract asserted (token pair, expiry), refresh exchange works, UI sign-in
  lands on /clients, unauthenticated access is blocked.

**Unit 2 — Clients list**  ☑  `@clients`
- *Intent:* a trustworthy client list, and navigation from list into a client record.
- *Inputs:* D2 (no fixed counts), D9 (re-read API live, don't snapshot).
- *Done when:* API envelope shape + paging arithmetic checked, UI list matches the API live,
  search/switcher/status covered, expected XHRs fire with no failures.

**Unit 3 — Client programs**  ☑  `@programs`
- *Intent:* the per-program endpoints return their real shapes.
- *Inputs:* note in `coverage-matrix.md` — the five endpoints return **three** shapes; only
  `targets` and `objectives` are paged.
- *Done when:* each endpoint asserted against its actual shape, not a assumed envelope.

**Unit 4 — Analyze Data**  ☑  `@analyze-data`
- *Intent:* mastered-target review renders and reconciles.
- *Inputs:* D3 (behaviorplans split: graceful-degrade + `@bug`), Highcharts-SVG note, `--` load note.
- *Done when:* summary cards, chart, date chips, network calls, Custom/Bulk series counts,
  Print, empty and loading states. Grouping effect remains `@bug` (DEF-1).

**Unit 5 — Negative & foundations**  ☑  `@negative` `@preflight`
- *Intent:* unauthenticated rejection (401), preflight fails fast if dev2 is unreachable (D5),
  credential scrubbing verified (D7).
- *Done when:* the above assert cleanly and the scrub guard passes.

### Phase 2 — Expansion to peak (the backlog)

Do these in this order; each is a separate bolt. See `AIDLC-Max-Coverage-Playbook.pdf` for the
prompt and gate behind each.

**Unit 6 — Prove & stabilise the baseline**  ☑
- *Intent:* whole read-only suite green + zero flake before any new coverage is added.
- *Done when:* smoke green, full suite green twice, flake rate zero over three runs.

**Unit 7 — Harden existing tests**  ☑
- *Intent:* verify every selector on live dev2; prove every existing test fails on a real
  regression; fix weak assertions; close traceability orphans.
- *Done when:* zero weak assertions, zero untraced scenarios, all selectors verified.

**Unit 8 — Surface inventory & coverage matrix**  ☑
- *Intent:* the complete testable-surface inventory (routes × endpoints × actions × states) — the
  coverage denominator — mapped to tests, producing a live coverage % and a ranked, risk-rated gap list.
- *Done when:* inventory signed off; coverage table + percentage + gap backlog exist.

**Unit 9 — States & negative paths**  ☑
- *Intent:* across all existing units, add empty / loading / error / unauthorised / 404 / boundary
  states; for each input cover valid/invalid/boundary/empty; for each list cover 0/1/many/failure.
- *Done when:* the inventory's state gaps for read paths are closed.

**Unit 10 — Analyze-Data breadth**  ☑  `@analyze-data`
- *Intent:* finish Unit 4 — Custom Graph, Bulk Graphs, Print tabs, empty/loading states. Read-only.

**Unit 11 — Write / mutation unit**  ☑  `@write`
- *Intent:* add-target, confirm/dismiss mastery, save report, record data.
- *Inputs:* D4 (was deferred), `writeGuard.ts`, `TEST_CLIENT_ID`.
- *Done when:* mutations covered against the **dedicated** client only, every created resource is
  torn down, the shared caseload is never touched.
- *Landed:* WR-1 (POST target + After DELETE), WR-2/2b (add-target stub + DEF-6), WR-3/3b
  (record-data stub + DEF-6), WR-6 (save report). WR-4/WR-5 stay `@wip`: POST
  automastery-evaluations is 405, so a suite-owned flagged evaluation cannot be created
  without clicking someone else's mastery row.

**Unit 12 — Visual regression**  ☑  `@visual`
- *Intent:* Playwright screenshot baselines for clients list, client workspace, each Analyze-Data
  tab. Mask volatile regions (dates, shared-suite data per D9).
- *Landed:* VIS-1…5, D11, `npm run test:visual`, baselines under `visual/baselines`.

**Unit 13 — Accessibility**  ☑  `@a11y`
- *Intent:* axe-core checks on main pages; gate on critical violations.
- *Landed:* A11Y-1…5 (sign-in, clients, workspace, Analyze Data, Behavior Support). D12:
  critical-only. Serious contrast is AN-6.

**Unit 14 — Operations / CI**  ☑
- *Intent:* pipeline — smoke per PR, full suite nightly against dev2, exclude `@write`/`@bug` from
  the gate, publish reports/traces, and publish a **live, ratcheted coverage %** that fails the
  build if it drops.
- *Landed:* `.github/workflows/pr.yml` + `nightly.yml`, `npm run coverage:ratchet`,
  `docs/coverage-floor.json` (94.7%), D13.

---

## After Unit 14 — sustain (not a one-off unit)

Peak decays. Keep these running: every new feature/bug enters as a new unit; `@bug` tests stay
red-until-fixed; triage flake immediately; keep the decision log live; re-run the inventory (Unit 8)
quarterly so the coverage denominator grows with the app.

**Sustain bolt — peak sign-off**  ☑  (2026-09-02)
- *Intent:* name every remaining blind spot and sign it off with a compensating control (D14).
- *Landed:* [`docs/compensating-controls.md`](./compensating-controls.md). Coverage floor is 94.7%
  after SES-1 (`/sessions/new` landing).

**Unit 15 — Metrics dashboard**  ☑
- *Intent:* product-facing quality dashboard from the latest run (`rules/30-metrics-dashboard.md`).
- *Landed:* 15a–15e. `npm run dashboard:metrics` → `reports/metrics.json` + `dashboard.html` +
  append `history.json`. GitHub Pages:
  `https://masudrana-bit.github.io/Rethink-Clinical-test-suite/` (D17). Coverage ratchet reads
  `metrics.json`. Teams notify is deferred (no webhook). Recorded decisions **D15–D18**.

---

## Quick reference — where things live

| Thing | File |
|-------|------|
| Behaviour rules the agent obeys | `rules/00-project-rules.md` |
| Endpoints, shapes, selectors, flows | `rules/10-app-context.md` |
| Decisions D1–D20, tag taxonomy, grounding facts | `docs/coverage-matrix.md` |
| Product dashboard spec + §3 metrics | `rules/30-metrics-dashboard.md` |
| Formal test-case write-ups | `docs/test-cases.md` |
| Defects / anomalies | `docs/defects.md`, `docs/bug-report.md` |
| Full expansion prompts + gates | `docs/AIDLC-Max-Coverage-Playbook.pdf` |
