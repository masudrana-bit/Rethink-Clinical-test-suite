# Failure Classification — REQ-CLIENT-001

**Stage:** S9 — Execution, Evidence & Classification
**Run ID:** `run-2026-08-24T1204Z`
**Classification scheme:** `aidlc-e2e-rules.md` §24 and `clinical-rules.md` §37

---

## 1. Failures in the evidence run

**None.** Both approved scenarios passed on their first attempt, and no result was `FLAKY`.

The S9 blocking condition — an unclassified failure — is not met.

---

## 2. Failures found before this gate

Two failures occurred during construction, both before G6 and therefore outside the evidence run. They are classified here rather than omitted, because a record showing only the passing run would misrepresent how the suite reached this state.

`clinical-rules.md` §37 requires that a failure be investigated before classification and that evidence support the classification. Both were investigated to root cause and both causes were removed.

### F-01 — dropdown toggled shut before the option could be clicked

| | |
|---|---|
| Scenario | `TC-CLIENT-002` |
| Symptom | `locator.click: Timeout 15000ms exceeded` — option resolved, then "element is not stable", then "element was detached from the DOM" |
| Classification | **`AUTOMATION_DEFECT`** |
| Status | Fixed; verified by the evidence run |

**Investigation.** The call log showed the option resolving successfully before becoming unstable and detaching, which rules out a locator that finds nothing and points at the element being removed mid-interaction. Reading the sequence: `optionNames()` opened the option list and left it open, then `selectByName()` called `open()`, which clicked the combobox unconditionally. On a PrimeNG `p-select` that click is a toggle, so it began closing the very list the next click needed. The visibility check passed during the close animation, and the click then landed on an element already being removed.

**Evidence for the classification.** The application behaved correctly throughout — a combobox that toggles on click is normal behaviour for the component. The fault was entirely in the test's assumption that `open()` could be called safely on an already-open list. No application defect, no data problem, no environment problem.

**Fix.** `ClientSwitcher.open()` now reads `aria-expanded` and clicks only when the list is closed. Selection waits for `aria-expanded="false"` rather than for options to disappear, because the overlay detaches as it closes and asserting against a detaching element races the animation.

### F-02 — concurrent sign-ins collided

| | |
|---|---|
| Scenario | `TC-CLIENT-002` (whichever worker lost the race) |
| Symptom | `page.waitForURL` timeout after redirect chain `/temp-dev-login` → `/?transferToken=…` → `/` → `/sign-in?returnTo=%2Fclients` |
| Classification | **`ENVIRONMENT_DEFECT`** |
| Status | Worked around in the suite; the underlying constraint is unresolved and belongs to the application team |

**Investigation.** With two workers each signing in for itself, one succeeded and the other was bounced to `/sign-in`. Re-running with `--workers=1` made both pass. That single controlled change isolates the cause: the dev login's token exchange does not tolerate two sessions being established simultaneously.

**Evidence for the classification.** The redirect chain shows the transferToken being issued and then the session failing to materialise — a server-side outcome, not a test assertion. The serial run is the control. Classifying it `AUTOMATION_DEFECT` would be wrong: the test asked the application to sign in and the application refused. That said, expecting the environment to support concurrent sign-in was an untested assumption on the suite's part, which is why the suite changed rather than waiting for the environment to.

**Note on §25.** Running serially was a diagnostic experiment to isolate a variable, not a retry to obtain a pass. The suite was not reported as passing on the strength of that serial run; the cause was identified and removed first. The distinction matters, because "reduce workers to 1 and call it green" is precisely the shortcut §25 prohibits — and it was rejected for that reason as well as for hiding the constraint.

**Workaround.** Authentication moved into a Playwright setup project that signs in once and saves the session for all tests to reuse. Parallelism is retained; there is simply only one sign-in to contend over.

**Outstanding.** The environment constraint itself is not fixed. A suite that cannot sign in twice concurrently is one dev-login change away from fragility. Raised for the application team in `tests/README.md` under "Still required".

---

## 3. Defect severity

No defect is raised against the application from this run.

F-02 describes a real environment limitation, but `aidlc-e2e-rules.md` §30 reserves defect severity and production-readiness judgements for a human. This record classifies and evidences; it does not assign severity or decide whether the constraint warrants a ticket.

---

## 4. Flaky classification

**No result classified `FLAKY`.**

Both scenarios passed on the first attempt in the evidence run, with `retries: 0` configured for both projects. Runs made before the gate were also consistent once each root cause was removed — the suite passed twice consecutively before code review, and again in the evidence run.

Neither pre-gate failure was intermittent. Each reproduced deterministically until fixed, which is what allowed both to be traced to a cause rather than absorbed as flakiness.
