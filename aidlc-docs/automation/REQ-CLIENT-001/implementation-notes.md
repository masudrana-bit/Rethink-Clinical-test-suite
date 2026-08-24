# Implementation Notes — REQ-CLIENT-001

**Stage:** S7 — Automation Construction
**Gates passed:** G3 (behaviour specification), G4 (test data safety), G5 (reuse plan, signed twice — round 2 covers the BDD migration) — all 2026-08-24
**Feeds:** S8 static validation and code review — complete, see `aidlc-docs/validation/REQ-CLIENT-001/`
**Implements:** `TC-CLIENT-001`, `TC-CLIENT-002`

---

## 1. What was built

| Path | Responsibility |
|---|---|
| `src/fixtures/auth.fixture.ts` | Sign-in via `/temp-dev-login`; verifies a session was actually stored |
| `src/fixtures/data-mode.ts` | Reads the data-source banner and records it as a test annotation |
| `src/fixtures/test.ts` | The extended Playwright test the step definitions bind to |
| `src/steps/client.steps.ts` | Step definitions for the CLIENT module's Gherkin |
| `src/pages/ClientSwitcher.ts` | The PrimeNG `p-select`: open, read options, select, read the active client |
| `src/pages/ClientsPage.ts` | The Client area at `/clients`: loaded state, list, search fields |
| `tests/auth.setup.ts` | Signs in once and saves the session for the test project |

The two approved scenarios are **not** implemented as a TypeScript spec. They execute directly from `aidlc-docs/bdd/client/REQ-CLIENT-001.feature`, compiled by `bddgen` into `.features-gen/`. See §7.

The G5 plan approved five components; seven exist. The two additions — `src/fixtures/test.ts` and `src/steps/client.steps.ts` — are what the BDD runner requires, and they replace rather than supplement the approved `tests/client/REQ-CLIENT-001.spec.ts`, which has been deleted. This is a framework change, not scope creep, and it is why G5 needs signing again.

Two configuration corrections came with it. The `BASE_URL` default in `playwright.config.ts` dropped its stale `/clinical-ui/` segment, which redirects to the site root, and `.env.example` now records that no credentials are required rather than implying that some are pending.

---

## 2. Verification performed

```text
npm run typecheck    clean
npm run bddgen       every Gherkin step bound; no missing step definitions
npm test             3 passed (setup + 2 scenarios), in parallel
```

Both approved cases pass against the dev environment on 2026-08-24, driven from the feature file. The suite runs in roughly 35 seconds.

The drift guard was tested rather than assumed: a scratch feature file containing an unimplemented step was added, `bddgen` failed with exit code 1 naming the step, and the file was removed. So a scenario cannot silently stop running.

Two defects were found on first execution. Neither was a fault in the approved specification — both were faults in this implementation and in an assumption about the environment. They are recorded in §5 rather than quietly fixed, because the second one changes a conclusion reached at S5.

**No retries were used to reach green.** `retries: 0` remains set, and the second consecutive pass is a determinism check, not a rerun of a failing test. Under `aidlc-e2e-rules.md` §25 a pass obtained by repetition would have to be reported as `FLAKY`; that is not what happened here — each failure was diagnosed and its cause removed.

---

## 3. Decisions taken during construction

### No client name is hardcoded

Both tests read the option labels from the switcher at runtime and assert against what they read. `TC-CLIENT-002` takes the second entry, so a default-to-first implementation would fail rather than pass by coincidence.

This is what makes the suite survive the environment's data source changing. The clients visible today are fallback example data that exist only because the backend is not responding; pinning their names would produce a suite that breaks on the day the environment starts working properly.

### The two-client requirement is asserted, not assumed

`TC-CLIENT-002` fails with an explicit message if fewer than two clients are offered, rather than proceeding against one.

The reason is CL-006. With a single client, "the selected client is displayed" passes against a selector that ignores input entirely — the test would be green and would prove nothing. Making the precondition an assertion means a thin data set produces a clear failure instead of a false pass.

### Synchronisation is condition-based throughout

No `waitForTimeout` anywhere, per `aidlc-e2e-rules.md` §16. Sign-in waits on the post-login URL. The clients page waits for `clients-list-loading` to reach zero and the list to be visible. The switcher waits for `client-switcher-loading` to clear and for the first option to become visible after opening.

The application's loading testids made this straightforward — they are proper state signals, which is not always the case.

### Locators follow the §15 preference order

`getByTestId` for structural anchors, `getByRole` for the switcher's combobox and its options. No CSS class, `nth-child`, or XPath selector appears in the suite.

Two traps worth recording, both to do with the `p-select`.

It carries `appendTo="body"`, so its option list is portaled outside the switcher element. Options are located from the page rather than as descendants of the switcher; scoping them to the switcher finds nothing, and the failure looks like a timing problem rather than a scoping one.

Its combobox also *toggles*. `ClientSwitcher.open()` is therefore idempotent: it reads `aria-expanded` and only clicks when the list is closed. Opening an already-open list would shut it, and anything clicked during the close animation fails as unstable and then detached. Selection likewise waits for `aria-expanded="false"` rather than for the options to disappear, because the overlay detaches as it closes and asserting against a detaching element races the animation.

### Authentication happens once, not per test

The suite signs in through a `setup` project that saves the session to `playwright/.auth/user.json`; the test project declares it as a dependency and starts from that state. Tests never sign in for themselves.

This is not only the faster arrangement — it is the necessary one. See §6.

`signIn` checks that a session key was written, not merely that the redirect happened. If the dev login route is withdrawn — its name says `temp` — the failure will name the cause instead of surfacing later as an unexplained assertion failure on a page the test never reached. `ClientsPage.waitLoaded` additionally asserts the page was not redirected to `/sign-in`, so an expired saved session reports itself plainly.

Every dependency on that route sits in one file, so replacing it touches one module.

---

## 4. Deviations from the approved specification

**None.** Both cases implement their approved steps as written.

Two things were tightened, and neither changes what is asserted. `TC-CLIENT-002`'s precondition 4 became a runtime assertion rather than a documented assumption, and its two-client data requirement became an explicit check. Both make an unmet precondition fail loudly instead of silently weakening the test.

Per the S7 blocking condition, any behavioural change discovered as necessary would return to S2 or S4 rather than be absorbed here. None was.

---

## 5. Known limits of this implementation

**It cannot detect a defect that already exists.** The expected results derive from screenshots of the running application, tier 7 of the §3 source hierarchy. The suite detects change, not incorrectness.

**A green run does not mean the backend is healthy.** Both tests pass whether the data is real or substituted. The data mode is recorded as an annotation on every result, per the G4 decision, so the information is present — but it must be read. Nothing fails on mode.

**No authorization is proven.** `/temp-dev-login` is credential-free, so the environment has no authorization boundary to test. Both tests prove access, never entitlement. GAP-002 remains untestable here rather than merely unanswered.

**Client context is not proven to work.** `TC-CLIENT-002` proves the selection is reflected in the switcher. Whether it is effective — whether Skills Programs, Behavior Support, and Analyze Data actually scope to the selected client — is AC-003 to AC-005, still held on GAP-010.

**`npm run test:p0` matches nothing.** Both cases are `@P1`, following the approved criticality. The script is correct and the suite simply has no P0 tests yet.

---

## 6. Defects found on first execution

Both were found by running the suite, and both are fixed. Recorded here because the second one overturns a finding from S6.

### D-01 — dropdown toggled shut before the option could be clicked (test defect)

`TC-CLIENT-002` failed with `locator.click: Timeout 15000ms exceeded`, the log showing the option resolving, reporting "element is not stable", then "element was detached from the DOM".

`optionNames()` left the list open, and `selectByName()` then called `open()`, which clicked unconditionally — shutting the list it needed. The visibility check passed during the close animation, so the click landed on an element already on its way out.

Fixed by making `open()` idempotent, as described in §3. The cause was a wrong assumption about the component, not a wrong test step or a wrong locator, and no timeout increase or retry was involved.

### D-02 — concurrent sign-ins collide (environment constraint)

With two workers, one signed in and the other was redirected `/temp-dev-login` → `/?transferToken=…` → `/` → `/sign-in?returnTo=%2Fclients`. Serialising to one worker made both pass, which isolated the cause: the dev login's token exchange does not tolerate two sessions being established at once.

**This contradicts the S6 reconnaissance finding**, which cleared `fullyParallel: true` as safe. That finding was right about what it examined — client selection is in-memory per page load and genuinely carries no cross-test state — but it examined selection, not authentication, and so missed the hazard. The framework-reuse plan has been corrected.

Fixed by authenticating once in a `setup` project and reusing the saved session, per §3. Parallelism is retained; only the sign-in is serialised, because there is now only one of them. Reducing workers to 1 would also have worked and was rejected: it hides the constraint and slows every future test rather than addressing the cause.

The constraint itself is unfixed and belongs to the environment. It should be raised with the application team, as a suite that can never sign in twice at once is one dev-login change away from being fragile.

---

## 7. The BDD migration

The suite was first built as hand-written Playwright specs, with the feature file kept as documentation. That was wrong, and it was corrected on 2026-08-24.

### Why it was wrong

`aidlc-e2e-rules.md` names the framework in its header as **Playwright + TypeScript + BDD/Cucumber**, and §9 places implementation detail "in step definitions" — which presumes step definitions exist. A `.feature` file that no runner reads is not that.

The concrete cost was that the Gherkin and the TypeScript stated the same two scenarios twice, joined only by `@TC-` strings inside test titles. Either could have been edited without the other, and nothing would have complained. The traceability record would have gone on asserting coverage that no longer matched the approved behaviour.

This should not have been decided by default. F-01 and F-02 in `OPEN-DECISIONS.md` recorded the BDD tooling question as open and unanswered; writing the specs settled F-02 silently, which is exactly what the no-assumption rule in §2 exists to prevent.

### What changed

`playwright-bdd` now compiles `aidlc-docs/bdd/**/*.feature` into `.features-gen/`, and Playwright runs the result. `tests/client/REQ-CLIENT-001.spec.ts` was deleted; its assertions moved into `src/steps/client.steps.ts` unchanged in substance.

The feature files are read where they live rather than copied, so the file reviewed at G3 is the file that executes. `missingSteps: "fail-on-gen"` makes a step that stops matching break the build instead of quietly skipping the scenario.

`playwright-bdd` was chosen over `@cucumber/cucumber` because it keeps the Playwright runner. The once-only sign-in depends on the projects/dependencies model, and `clinical-rules.md` §36's evidence requirement is met by Playwright's trace and video retention. Conventional cucumber-js would have meant rebuilding both.

### Two assertions that live in steps rather than scenarios

`aidlc-e2e-rules.md` §9 keeps implementation detail out of the Gherkin, so two checks sit inside step definitions without being named in the scenario text. Both are the same tightenings recorded in §4, carried over.

The step for *"the Client area is displayed"* also asserts that no client is active yet. Without it, a selector arriving with Client B already active would satisfy the Then steps while the When did nothing.

The step for *"two distinct clients are available"* asserts that at least two are offered and that they differ, failing with an explicit message otherwise. This is CL-006: with one client the scenario proves nothing.

Neither changes what the scenario claims. If the reviewer at G6 would rather see them stated in the Gherkin, that is an S4 change and a G3 re-approval, not an edit here.

---

## 8. Gate status and next stage

**G5 was signed a second time** on 2026-08-24, covering the revised seven-component inventory and the two corrections.

**S8 is complete.** Static validation and code review are recorded in `aidlc-docs/validation/REQ-CLIENT-001/`. Nine of ten automated checks pass; lint did not run because no linter is configured, tracked as F-06. Two review findings, both accepted. **G6 awaits signature.**

Execution has run ahead of G6, which the workflow does not contemplate. It was diagnostic: the tests were run to find out whether they worked, and twice they did not. The S9 evidence bundle is still owed and should come from a run made **after** G6 sign-off, so the recorded evidence corresponds to reviewed code. Every run described in this document is a working note, not evidence.
