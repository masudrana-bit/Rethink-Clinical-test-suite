# Traceability Report — REQ-CLIENT-001

**Workflow stage:** S10 — Traceability Closure
**Record:** `aidlc-docs/traceability/traceability.json`
**Validated:** 2026-08-25, `npm run validate:traceability`
**Gate G7:** **NOT READY** — and correctly so

---

## 1. Verdict

The traceability record is structurally valid and referentially sound. Gate G7 is not ready, on four outstanding items that all reduce to one open decision.

```text
Structure and references: OK
Gate G7 not ready — 4 outstanding items:
  - REQ-CLIENT-001/AC-003: coverage is NOT_COVERED
  - REQ-CLIENT-001/AC-004: coverage is NOT_COVERED
  - REQ-CLIENT-001/AC-005: coverage is NOT_COVERED
  - GAP-010: open blocking item (NEEDS_SME_CONFIRMATION)
```

This is the intended outcome, not a failure of the work. Three acceptance criteria were deliberately held at S3 pending GAP-010, and the validator is reporting exactly that. A record claiming G7 readiness today would be the thing to worry about.

Both modes of the validator were exercised. The default run exits 0 and reports gate issues as informational; `--gate` exits 1 on the same items, which is what a pipeline should use.

---

## 2. The chain, end to end

`aidlc-e2e-rules.md` §5 and §31 require an unbroken chain from requirement to result. For the two covered criteria it is complete:

| Link | AC-001 | AC-002 |
|---|---|---|
| Requirement | `REQ-CLIENT-001`, approved 2026-08-24 | same |
| Acceptance criterion | AC-001 — Client area is displayed | AC-002 — selected client shown in selector |
| Test case | `TC-CLIENT-001` (P1, POSITIVE) | `TC-CLIENT-002` (P1, POSITIVE) |
| BDD scenario | `SC-001` — "A user reaches the Client area" | `SC-002` — "Selecting a client makes that client the active client" |
| Feature file | `features/client/REQ-CLIENT-001.feature` | same file |
| Automation | `AUT-CLIENT-001` | `AUT-CLIENT-002` |
| Execution | `EXE-run-2026-08-24T1204Z-TC-CLIENT-001` | `EXE-run-2026-08-24T1204Z-TC-CLIENT-002` |
| Result | PASSED, 1 attempt | PASSED, 1 attempt |
| Evidence | Trace + `results.json`, PHI reviewed | same |

There is no separate automation file to cite. The feature file *is* the executable artifact — `playwright-bdd` compiles it and the step definitions in `src/steps/client.steps.ts` into the test that runs. So the artifact approved at G3 and the artifact executed at S9 are the same file, which is the property that arrangement was chosen to give.

---

## 3. What the validator checked beyond the schema

JSON Schema can enforce shape. It cannot enforce that the shape describes something true. The validator adds:

**Bidirectional coverage agreement.** A criterion claiming coverage by a test case that does not claim the criterion back is a silent coverage overstatement. Both directions agree here.

**Cross-collection references.** Every test case resolves to a real requirement and real criteria; every scenario, automation entry, and execution resolves to a real test case; every execution's requirement matches its test case's requirement.

**The flaky rule.** `aidlc-e2e-rules.md` §25 forbids rerunning until green and then reporting PASSED. The validator fails any execution with `runCount > 1`, `result: PASSED`, and no recorded investigation. Both executions record `runCount: 1`, consistent with `retries: 0` in the config and `retry: 0` in `results.json`.

**Unapproved requirements.** A test case whose requirement is not approved is an error, not a warning.

---

## 4. What the record deliberately carries forward

Three items are recorded as non-blocking blockers rather than omitted. Each is a caveat a reader of "2 passed" would otherwise miss.

**`SRC-001` — the source-quality caveat.** Expected results derive from screenshots of the running application, seventh of eight in the §3 hierarchy. These tests detect change from current behaviour; they cannot detect a defect already present in it. The approval never characterised the requirement as a regression baseline, so this remains an unstated assumption rather than a recorded decision.

**`BLK-010` — the data mode caveat.** Both executions ran under `data-mode: substituted`: the backend returned no clients and the application served example data. The user interface behaviour is proven; the data path behind it was not exercised. Resolved in the sense that a decision was taken to tolerate any mode and record it, not in the sense that the risk is gone.

**`GAP-011` — the sign-off caveat.** One person signed both the QA and clinical lines. Accepted for this read-only requirement, and explicitly not inherited by `REQ-CLIENT-002`, where an independent SME was required on 2026-08-25.

---

## 5. Gate history

All seven signatures are recorded in the `approvals` array with their scope. Two carry notes worth surfacing:

**G5 was signed twice.** The first signature covered a hand-written Playwright spec. That approach was replaced by executable BDD, and the gate was reopened and re-signed rather than amended quietly.

**G6 has changes after it.** Cucumber reporting, the sign-in failure handling, and the feature file relocation all landed after the signature. They are recorded in `automation/REQ-CLIENT-001/implementation-notes.md` §8 as requiring a G6 addendum. The reporting change in particular alters what S9 evidence looks like, so it should not be absorbed silently.

---

## 6. What closes G7

One decision, then one run.

1. **Answer GAP-010.** Is showing another client's data in a read-only view a §21 association failure or a lesser context error? This releases AC-003 to AC-005 for test case writing at S4.
2. **Carry those three criteria through S4 to S9**, then add their test cases, scenarios, automation, and executions to the record.

Nothing else is outstanding. The two covered criteria are complete through to evidence.

A G6 addendum for the post-signature changes should be settled before G7 as well, since G7 signs off the whole chain and would otherwise be endorsing an automation state that G6 never reviewed.

---

## 7. Regenerating and checking

```bash
npm run validate:traceability          # informational; exit 0 unless malformed
node scripts/validate-traceability.mjs --gate   # exit 1 while G7 items remain
```

The record is maintained by hand. It is small enough that this is honest, and generating it from the test run would defeat the point — the record exists to be compared against the run, not derived from it.
