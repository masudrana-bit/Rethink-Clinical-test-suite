# AIDLC Process Runbook — Test Automation

AIDLC (AI-Driven Development Lifecycle) runs in three phases — **Inception,
Construction, Operations** — executed in short "bolts" (hours/days), with a human
validation gate on every AI-proposed plan. This runbook applies it to building the
Rethink Clinical test suite.

## The core loop

```
  intent ─▶ AI drafts plan ─▶ AI asks questions ─▶ human validates ─▶ AI executes ─▶ human reviews
     ▲                                                                                    │
     └────────────────────────────── next bolt ◀─────────────────────────────────────────┘
```

## Phase 1 — INCEPTION (what & why)

Ritual: **Mob Elaboration** — QA, a dev, and an app owner in one session with the AI.

1. Load the steering files (`rules/`) and the crawl `output/` folder as context.
2. State intent: "Automated API + UI regression coverage for Rethink Clinical."
3. Let the AI interrogate the crawl and ask clarifying questions live
   (stable test clients? behaviorplans 500 — bug or expected? scope?).
4. Approve the **coverage matrix** and **units of work** (`docs/coverage-matrix.md`).

Exit gate: signed-off matrix + prioritized units. Nothing is coded before this.

## Phase 2 — CONSTRUCTION (how)

Ritual: **Mob Construction** — one unit of work per bolt, in matrix order
(Auth → Clients → Programs → Analyze-Data → Negative).

Per bolt:
1. AI proposes the design for the unit (Page Objects, steps, fixtures). Human approves.
2. AI generates feature files, step definitions, Page Objects / API client, grounded
   in real crawl data (response shapes, selectors, expected XHRs).
3. Human reviews, wires env-var auth, runs, iterates to green.
4. Update the matrix status; close the bolt; start the next unit.

Exit gate: `@smoke` green, then full `@api` and `@ui` green twice consecutively.

## Phase 3 — OPERATIONS (deploy & run)

1. GitHub Actions (D13): `.github/workflows/pr.yml` runs `@smoke` on every PR;
   `nightly.yml` runs the default suite against clinical.dev2.
2. Publish Cucumber HTML report + Playwright traces as artifacts; coverage ratchet
   fails the build if inventory % drops below `docs/coverage-floor.json`.
3. Feedback loop: a flake or a real bug (e.g. behaviorplans) becomes a new unit of
   work, re-entering Inception. The lifecycle loops.

## Guardrails

- Keep human gates strict — AI-generated tests can pass while asserting the wrong thing.
- No secrets in the repo; no hardcoded IDs; no fixed sleeps (see `rules/00-project-rules.md`).
- Every test traces to a coverage-matrix row.
