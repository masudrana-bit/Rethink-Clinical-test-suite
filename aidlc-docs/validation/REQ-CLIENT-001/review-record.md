# Review Record — REQ-CLIENT-001

**Stage:** S8 — Static Validation & Code Review
**Gate:** G6 — Code Quality
**Date:** 2026-08-24
**Reviewing:** `src/steps/client.steps.ts`, `src/fixtures/`, `src/pages/`, `tests/auth.setup.ts`, `playwright.config.ts`, `features/client/REQ-CLIENT-001.feature`

`aidlc-e2e-rules.md` §23 requires that AI-generated code is never presumed correct. This record states what was checked and what was found, including the things that are wrong.

---

## 1. QA review — specification fidelity

The question is whether the automation tests what G3 approved, no more and no less.

### Scenario coverage

Two scenarios approved; two executing; none added. `TC-CLIENT-001` covers AC-001, `TC-CLIENT-002` covers AC-002. AC-003 to AC-005 remain absent, correctly — they are held on GAP-010, and writing them now would mean inventing the assertion that decision has not yet made.

The Gherkin is unchanged from the G3-approved text. It is executed in place rather than copied, so the reviewed artifact and the executed artifact are the same file. This is worth stating plainly because it is the specific defect the BDD migration was undertaken to remove: before it, the scenarios existed twice and could diverge.

### Do the steps do what they say?

Read step by step against the feature file. One observation, two findings.

`Given at least one client is available` **navigates, then** `When the user opens the Client area` **navigates again.** This looks redundant. It is defensible: the Given verifies a data precondition that cannot be established any other way, since no seeding API exists (GAP-005), and the When must begin from a fresh page load because client selection is in-memory per load. Both steps do what their text says. Accepted, with the reasoning recorded in the step's own comment.

**Two steps assert more than their Gherkin states.** Detailed in §3. Both were disclosed rather than found by the reviewer, and neither weakens a scenario, but both are places where the feature file understates what runs.

### Is anything asserted that the requirement does not support?

No. Expected results trace to AC-001 and AC-002, with `TC-CLIENT-002` strengthened by CL-006 (`clinical-rules.md` §8) — the selected client must be *the* active client, not merely *an* active client. That strengthening was approved at G3 and is implemented as approved.

### Verdict

**Fidelity accepted.** The automation implements the approved specification. The two undisclosed-in-Gherkin assertions in §3 are the only gap between what the scenarios say and what they do.

---



## 2. Engineering review — maintainability and reuse



### Structure

Seven components, matching the G5 round 2 inventory. Responsibilities separate cleanly: page objects hold locators, step definitions hold assertions, fixtures hold session and state. No locator appears in a step definition; no assertion appears in a page object other than as a wait condition.

`ClientSwitcher` is modelled separately from `ClientsPage` because the switcher lives in the app shell and appears on every route. That will pay off the moment a second module needs it.

### Points of concentration

`src/fixtures/auth.fixture.ts` is the single point of dependency on `/temp-dev-login`. Given the route's name, confining it was the right call — retiring the route changes one file.

`ClientSwitcher.open()` is the single point of knowledge about the `p-select` toggle behaviour. Both the portaled option list and the toggle semantics are documented in the class comment, which is where the next person will look.

### Legibility of failure

Better than typical. `required()` throws a message naming the missing value rather than passing `undefined` into a locator. `ClientsPage.waitLoaded()` asserts the page was not redirected to `/sign-in`, so an expired session says so instead of timing out on an element that was never going to render. The two-client precondition fails with an explicit sentence rather than an unhelpful `expect(1).toBeGreaterThanOrEqual(2)`.

### Reuse readiness

The next requirement in the CLIENT module can reuse `ClientsPage`, `ClientSwitcher`, the auth setup, and the data-mode recorder without modification. Step definitions are grouped by module in `src/steps/client.steps.ts`, matching the taxonomy, so a second module gets a second file rather than a growing one.

One thing to watch, not yet a problem: step text is matched globally across all step definition files. Two modules that both want "the page is displayed" will collide. Keeping step phrasing module-specific — as `client.steps.ts` currently does — avoids it.

### Verdict

**Maintainability accepted.**

---



## 3. Findings

Two, both disclosed by the implementer in `implementation-notes.md` §7 rather than discovered in review. Both are accepted; neither blocks.

### R-01 — two steps assert more than their Gherkin says (accepted)

`Given the Client area is displayed` also asserts that no client is yet active. `Given two distinct clients are available, Client A and Client B` also asserts that at least two exist and that they differ.

Both assertions are necessary. Without the first, a selector arriving with Client B already active would satisfy every `Then` while the `When` did nothing. Without the second, CL-006 is unmet and the scenario proves nothing against a one-client data set.

The tension is with §9, which keeps implementation detail out of scenarios — these are not implementation detail, they are behaviour, and behaviour belongs in the Gherkin. A reader of the feature file alone would not know these checks run.

**Accepted as-is** rather than corrected, because moving them into the scenario text is an S4 change requiring G3 re-approval, and the scenarios are correct as written — merely incomplete in what they disclose. Recorded so the next reviewer of this feature file is not surprised.

**Revisit if** either scenario is amended for any other reason; fold the steps in then.

### R-02 — no linter or formatter (accepted, tracked)

Carried from the static validation report §4. §23 names lint and formatting as static validation, and neither can run because no tooling is configured.

**Does not block G6.** It is a framework gap rather than a defect in this requirement's automation, and the manual inspection in that report covers the substantive risks that a linter would catch here. It will not stay cheap: raised as **F-06** for the next framework increment.

---



## 4. Objections

**None outstanding.** Both findings are accepted with reasoning; neither reviewer's concern is unresolved. The blocking condition for G6 — an unresolved reviewer objection — is not met.

---



## 5. What this review does not establish

Worth stating, because a signed G6 can be read as more than it is.

**That the application is correct.** Expected results derive from screenshots of the running application, tier 7 of the §3 source hierarchy. The suite detects change, not incorrectness. A defect present today is baked in as expected behaviour.

**That the tests pass.** They do, as of 2026-08-24, but those runs predate this review and are working notes. The S9 evidence bundle should come from a run made after this gate is signed.

**That a green run means a healthy backend.** Both scenarios pass against real or substituted data. The data mode is recorded as an annotation on every result, per G4 — it has to be read.

---



## 6. G6 sign-off

```text
[X] Static validation executed, results recorded
[X] QA review of specification fidelity — accepted
[X] Engineering review of maintainability and reuse — accepted
[X] All findings recorded with disposition
[X] No unresolved reviewer objection
[ ] Lint and formatting — tooling absent, tracked as F-06
[X] Human sign-off
```

```text
G6 sign-off

[X] Approved — automation accepted, S9 execution may proceed
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Approving G6 accepts R-01 and R-02 as recorded, and releases S9 — first evidence-producing execution.