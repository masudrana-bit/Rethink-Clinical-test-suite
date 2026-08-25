# Open Decisions

**Status:** Live register
**Purpose:** Every decision currently blocking the clinical E2E test suite, in one place.

The project is not blocked on effort. All process documentation, tooling, and framework infrastructure that could be derived from the rules alone is complete. What remains are decisions that only people can make, and they are currently scattered across the workflow, two requirements, the taxonomy proposal, the intake record, and the framework README.

This register aggregates them so each owner can see their own list.

---

## Resolved on 2026-08-24

Two of the three headline blockers are closed, by Masud Rana, Sr. QA Automation Engineer.

**Module taxonomy ratified**, with one amendment: Client and Patient are the same entity, so `PATIENT` was merged into `CLIENT`, leaving seven modules. IDs can now be issued, which was the hard stop on every downstream stage. Prerequisite P-06 is resolved and GAP-001 is closed.

**`REQ-CLIENT-001` approved**, Gate G0 passed for AC-001 and AC-002. The same person signed the QA and clinical lines; that is recorded openly in its §2 and tracked as GAP-011 rather than left implicit, on the basis that this requirement covers client selection and read-only context rather than clinical data capture.

Not answered, and still worth noting: the requirement was approved without explicitly characterising it as a regression baseline. Its expected results come from screenshots of the running application, which rank seventh of eight in the §3 source hierarchy. The tests that follow will faithfully detect change but cannot detect a defect that already exists in the current behaviour.

---

Gates G1, G2, and G3 were signed on 2026-08-24. `TC-CLIENT-001` and `TC-CLIENT-002` are approved for automation, and stage S5 has run as far as the sources allow.

---

## Resolved by reconnaissance, 2026-08-24

The authentication blocker that stalled everything from S5 onward is **gone**. `/temp-dev-login` signs in without credentials and lands on `/clients`. No account to provision, no secret to manage.

Two other open items closed with it. Client selection **does not persist** — it is in-memory per page load, so `fullyParallel: true` is safe and no reset step is needed. And the client fixture shape is readable from the switcher itself.

Details in `automation/REQ-CLIENT-001/framework-reuse-plan.md` §2.

---

## The one thing left — name a Clinical SME

Everything now converges on a single unfilled role. Both open requirements are waiting on the same person, and neither can move until someone is named.

| Waiting on the SME | Releases |
|---|---|
| **GAP-010** — is a wrong-client read-only view a §21 association failure, or a lesser context error? | AC-003 to AC-005 of `REQ-CLIENT-001`, and with them Gate G7 |
| **GAP-007** — ratify, amend, or reject the candidate observable outcome for adding a target | Gate G0 for `REQ-CLIENT-002`, and the whole requirement behind it |
| **GAP-013 / GAP-011** — the sign-off authority itself | Every clinical sign-off from here on |

**GAP-010 was routed out on 2026-08-25** by Masud Rana, Sr. QA Automation Engineer, who declined to answer it under the precedent set for `REQ-CLIENT-001`. That precedent covered signing off a read-only requirement; it did not extend to classifying the clinical severity of cross-client data exposure. Routing it rather than absorbing it is the more conservative reading, and it means `REQ-CLIENT-001` will finish at 2 of 5 acceptance criteria until the SME answers.

This is the whole critical path. Nothing else in this register blocks a stage.

**A briefing note is ready for them:** `aidlc-docs/CLINICAL-SME-BRIEF.md`. It puts all three questions on one page, answerable in about ten minutes without repository access, with a sign-off block under each.

It also carries a correction that changes how GAP-010 should be read. Several of our documents summarise `clinical-rules.md` §21 as *"data belonging to one subject must not appear under another."* The rule is actually titled *Patient-to-Session Association* and covers Patient → Clinical Session → Observations, prefaced by *"Where applicable."* None of the three read-only views is a session or an observation. The broader reading may still be correct, but it is an interpretation for the SME to make rather than something our paraphrase can settle — and the brief presents the rule's real text so the decision is made against it.

### Also outstanding, but blocking nothing

The `temp-` in `temp-dev-login` suggests the auth route is not permanent, so the fixture that uses it should stay isolated. Whether it survives, and what replaces it, is still unanswered.

### Resolved 2026-08-25: `.env` was never loaded

The `BASE_URL` correction turned out to sit on top of a larger problem. `tests/README.md` told you to copy `.env.example` to `.env` and set `BASE_URL`, but nothing in the project read that file — no `dotenv`, no `--env-file`, no loader of any kind. Editing `.env` did nothing, silently, which is worse than the stale value the register was tracking.

`playwright.config.ts` now loads it with Node's built-in `process.loadEnvFile()`, guarded on the file existing because it is absent in CI. No dependency added.

That made the stale value load-bearing for the first time, so it was corrected in the same change: `.env.example` was already right, and the local `.env` pointed at `/clinical-ui/`. The suite passes either way — the path redirects to the site root, which is why this went unnoticed — but it no longer costs a redirect on every navigation.

### Resolved 2026-08-25: C-02, the rules path reference

`clinical-rules.md` §1 pointed at `aidlc/rules/AIDLC_E2E_RULES.md`, which is neither the directory nor the casing this repository uses. Corrected to `aidlc-docs/rules/aidlc-e2e-rules.md` and the target verified. A broken pointer only — no rule text or obligation changed.

### Resolved: which data mode the suite may run against

Tracked as BLK-010, closed at Gate G4. The suite may run against any mode, and the mode is recorded as an annotation on every result — so a green run against fallback data is visibly not the same as a green run against real data.

This matters because both approved tests pass identically either way: they assert that selection works, not that particular clients exist. A complete backend outage would therefore produce a green suite, a false pass that no retry policy catches because nothing is intermittent. The annotation is what keeps that visible.

As of 2026-08-25 the decision is also enforced rather than merely recorded. `scripts/check-data-mode.mjs` reads the annotation and withholds traces from any run that saw real data, because a trace carries DOM snapshots and therefore whatever the page displayed.

---

## REQ-CLIENT-002 — assessed at S0 on 2026-08-25, gate held

Blocked differently from its parent. `REQ-CLIENT-001` was blocked on a signature; this one is blocked on content. Its single acceptance criterion has `NOT SPECIFIED` as its observable outcome, so approving it today would place an untestable requirement into S1.

Reconnaissance did move it forward. GAP-009 asked which clinical actions are in scope and noted that no source enumerates them, which read as a blank page. It is not blank — the application implements a substantial action surface, and the intake record's Finding 1 lists ten observed controls across the three client tabs for Product and the Clinical SME to accept, trim, or reject. That list is observed behaviour, admissible for scoping and inadmissible as a source of expected results.

**Scoped the same day.** The first action is **adding a target** to a program, and the clinical sign-off must be independent — the GAP-011 arrangement does not carry over to a requirement that writes clinical data.

Adding a *program* was chosen first and then abandoned. Checking what it required revealed that it requires nothing: the control is present and enabled but produces no dialog, no navigation, and no state change. Three sibling controls on the same page all open working editors, so this is specific to Add. The environment was serving demonstration data at the time, so it may be inert for that reason rather than unimplemented — a question for the application team, recorded as Finding 5 in the intake record rather than filed as a confirmed defect.

The gate now hangs on two items rather than an open-ended list: ratify an observable outcome for AC-001, and name a Clinical SME (GAP-013). A candidate outcome is proposed in the requirement's §7, marked unratified because it is derived from observed behaviour.

Two things surfaced that were not previously recorded. A clinical calculation is already visible in the mastery review — "80% or better across 3 consecutive sessions, minimum 10 trials each" — which brings `clinical-rules.md` §11 into play with its boundary-behaviour requirements, now tracked as GAP-012. And GAP-011, parked as harmless for the read-only parent, becomes live here.

Full assessment in `intake/REQ-CLIENT-002/intake-record.md`.

---

## Product / Business

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Accept or reject screenshot-derived expectations as a regression baseline | What the test suite is able to prove | Intake record, Finding 1 |
| GAP-003 | Required behaviour when no client is selected | Negative scenarios for AC-001 and AC-002, currently absent | `REQ-CLIENT-001` §13 |
| GAP-004 | Required behaviour when a selected client is invalid or unavailable | Negative scenarios | `REQ-CLIENT-001` §13 |
| GAP-008 | The Create Clinical Session workflow after client selection | A future session requirement | `REQ-CLIENT-001` §13 |
| GAP-009 | Which clinical actions `REQ-CLIENT-002` covers | Everything in `REQ-CLIENT-002`; it is that requirement's root blocker | `REQ-CLIENT-002` §13; candidate list in `intake/REQ-CLIENT-002/intake-record.md` Finding 1 |
| — | Criticality rating for `REQ-CLIENT-002` | Nothing directly; it writes clinical data, so inheriting P1 from its parent by default is worth avoiding | `REQ-CLIENT-002` §3 |

## Clinical SME

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| GAP-010 | Is showing another client's data in a read-only view a §21 association failure, or a lesser context error? **Routed to an independent Clinical SME on 2026-08-25** — declined by QA as outside the read-only precedent | Test case writing for AC-003 to AC-005, held at S3; assertion strength and defect severity; **Gate G7** | `REQ-CLIENT-001` §8 |
| GAP-011 | Is a dedicated Clinical SME required, or is the QA lead sign-off sufficient? | **Now live.** Accepted for `REQ-CLIENT-001` on read-only risk grounds; `REQ-CLIENT-002` writes clinical data, so the precedent should not carry over | `REQ-CLIENT-001` §2 |
| GAP-012 | Mastery calculation: formula, inputs, precision, rounding, and boundary behaviour | Mastery confirmation only, which is currently out of scope — off the critical path, keep open | `intake/REQ-CLIENT-002/intake-record.md` Finding 2 |
| GAP-013 | **Who is the Clinical SME for `REQ-CLIENT-002`?** An independent sign-off was required on 2026-08-25 and no SME is named | Gate G0 for `REQ-CLIENT-002` | `REQ-CLIENT-002` §13 |
| GAP-007 | The approved rule defining the client-to-clinical-action association. Concretely now: ratify the candidate observable outcome for adding a target, or supply the approved one | Gate G0 for `REQ-CLIENT-002`; AC-001 is not testable without it | `REQ-CLIENT-002` §7 and §13 |
| GAP-006 | Whether client selection and clinical actions must be audited, and what the event records | Audit coverage | Both requirements §13 |
| P-07 | Approved clinical lifecycle, enum values, and role matrix | Stages S3 and S4 for any session or observation requirement | Workflow §3 |
| — | Clinical SME sign-off on `REQ-CLIENT-002` | Its Gate G0 | `REQ-CLIENT-002` §2 |

## Engineering

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| ~~F-04~~ | ~~Authentication mechanism and test accounts~~ | **Resolved** — `/temp-dev-login`, no credentials | `automation/REQ-CLIENT-001/framework-reuse-plan.md` §2 |
| — | Is `/temp-dev-login` permanent, and what replaces it? | The auth fixture's shelf life | `framework-reuse-plan.md` §2 |
| ~~—~~ | ~~Correct `BASE_URL` — `/clinical-ui/` redirects to the site root~~ | **Resolved 2026-08-25** — corrected, and `.env` is now actually loaded; it never was | `tests/README.md`, `playwright.config.ts` |
| — | Environment policy: is dev the intended target, and does it reset? | The scheduled CI run points at dev by default; confirm or redirect it | `tests/README.md` |
| GAP-005 / P-05 | API contract for setup, cleanup, and verification | `src/api/`, test data lifecycle, stage S5 | Both requirements §12.1 |
| — | Test environment policy: which environments are testable, and reset expectations | Data isolation strategy | `tests/README.md` |
| ~~F-01~~ | ~~BDD tooling: `playwright-bdd`, `@cucumber/cucumber`, or none~~ | **Resolved 2026-08-24** — `playwright-bdd`, chosen to keep the Playwright runner, the once-only sign-in, and the trace/video evidence | `tests/README.md` |
| ~~F-02~~ | ~~Whether Gherkin is executable, or a reviewed specification only~~ | **Resolved 2026-08-24** — executable. `features/**/*.feature` compiles to Playwright tests; an unmatched step fails `bddgen` | `tests/README.md` |
| F-03 | Browser coverage beyond Chromium | Config scope | `tests/README.md` |
| F-05 | Test data lifecycle: API seeding, UI seeding, or a fixture pool | Stage S5 | `tests/README.md` |
| ~~F-06~~ | ~~Linter and formatter — none configured, so the lint half of S8 cannot run~~ | **Resolved 2026-08-25** — Biome, covering both. ESLint was not viable: `typescript-eslint` supports TypeScript up to 6.1 and the project is on 7. `npm run lint` passes | `validation/REQ-CLIENT-001/static-validation-report.md` §4 |

## QA

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Ratify the workflow and its supporting documents at Gate G0 | Formal process adoption; everything currently operates as Draft | Workflow §13 |
| GAP-002 | Approved authorization matrix, jointly with Security | Permission scenarios, currently absent from coverage | Both requirements §13 |
| — | Whether authentication and authorization need their own module | Taxonomy completeness; the ratified taxonomy has no home for either | `requirements/module-taxonomy.md` |
| ~~C-02~~ | ~~Correct the stale path reference in `clinical-rules.md` §1~~ | **Resolved 2026-08-25** — corrected to `aidlc-docs/rules/aidlc-e2e-rules.md`; broken pointer only, no rule text changed | Workflow §4 |

---

## Not blocked

For contrast, these are done and need review rather than decisions:

- Workflow, rules, requirement template, three construction prompts, docs index
- Traceability JSON Schema, validated against a real validator
- Traceability validator script, enforcing referential integrity and the §25 flaky rule
- CI: static checks gate every push; the live E2E run is scheduled and manual, and withholds traces unless the run saw substituted data only
- Playwright and TypeScript configuration, typechecking clean
- `REQ-CLIENT-001` reformatted, assessed at S0, split, approved, and carried through to S9
- `REQ-CLIENT-002` created, and assessed at S0 on 2026-08-25 — gate held on missing content
- Module taxonomy ratified
- S1 analysis, S3 coverage design, and S4 test cases and BDD scenarios for AC-001 and AC-002
- Executable BDD via `playwright-bdd`, with Page Objects, fixtures, a once-only sign-in, and Cucumber reporting
- Two automated scenarios passing, with an S9 evidence bundle and G6 signed

## Deliberately not built

`src/api/` and `src/data/` are still absent, and no test seeds or cleans up data.

Producing them would require inventing API endpoints for an application this repository has no contract for; GAP-005 is unanswered. `aidlc-e2e-rules.md` §4 prohibits that, and a plausible-looking stub is worse than an absent one because it reads as a decision already made.

The same restraint governs `REQ-CLIENT-002`. Reconnaissance established that a client-specific action surface exists and named its controls, but observing a button does not tell us what it is supposed to do. No scenario, expected result, or step definition will be written for any of those actions until the behaviour behind them is specified and approved.

Page Objects, fixtures, and authentication utilities were in this section until 2026-08-24. They now exist, built against selectors and an auth route confirmed by live reconnaissance rather than assumed.
