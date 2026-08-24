# Coverage Matrix — REQ-CLIENT-001

**Stage:** S3 — Workflow & Coverage Design
**Gate this feeds:** G2
**Rule:** `aidlc-e2e-rules.md` §6 — covered, partially covered, and uncovered criteria must each be stated. Claiming full coverage while any criterion is uncovered is prohibited.

---

## 1. Headline

**Coverage is partial, and deliberately so.**

Two of five acceptance criteria are covered. Three are blocked. Of the two that are covered, both are covered on the happy path only, because four of the five scenario categories that `clinical-rules.md` §23 expects have no approved source to draw on.

Stated plainly so it cannot be misread from the table below: this design does not claim that `REQ-CLIENT-001` is tested. It claims that the part of it the approved sources can support is tested.

---

## 2. Criterion coverage

| AC | Criterion | Coverage | Covered by | Justification |
|---|---|---|---|---|
| AC-001 | The user can access the Client area | `COVERED` | TC-CLIENT-001 | Positive path. Negative and permission paths blocked by BLK-002 and BLK-004 |
| AC-002 | The user can select a client from the Client selector | `COVERED` | TC-CLIENT-002 | Positive path, asserting correct-client identity per CL-006. Negative path blocked by BLK-002 |
| AC-003 | Selected client is the active context for Skills Programs | `NOT_COVERED` | — | BLK-001. GAP-010 determines whether the assertion is a data integrity guarantee or context correctness |
| AC-004 | Selected client is the active context for Behavior Support | `NOT_COVERED` | — | BLK-001, same cause |
| AC-005 | Selected client is the active context for Analyze Data | `NOT_COVERED` | — | BLK-001, same cause |

**2 of 5 covered. 0 partially covered. 3 not covered.**

---

## 3. Why AC-003 to AC-005 are deferred rather than approximated

A test could be written for them today. It would assert that each area displays *something* after a client is selected, and it would be worse than no test.

The two readings of GAP-010 produce different assertions. Under the data integrity reading, the test must prove that no element of another client's data appears in the view, and a failure is a clinical safety defect. Under the context correctness reading, it need only prove the view is scoped to the selected client, and a failure is functional.

Writing the weaker assertion now creates a test that passes while the stronger property is violated — a green result standing where a safety defect exists. That is the specific failure mode `clinical-rules.md` §2 and §33 exist to prevent, and it is harder to detect than an absent test, because an absent test is visible in this matrix and a weak one is not.

The cost of waiting is three test cases. The cost of guessing is a suite that reports safety it has not verified.

---

## 4. Scenario category coverage

`clinical-rules.md` §23 expects a critical clinical workflow to be exercised across five paths.

| Path | Status | Reason |
|---|---|---|
| Happy path | Covered | TC-CLIENT-001, TC-CLIENT-002 |
| Validation | `NOT_COVERED` | BLK-002 — behaviour when no client is selected is `NOT SPECIFIED` |
| Authorization | `NOT_COVERED` | BLK-004 — every cell of the requirement's §10 matrix is `NOT SPECIFIED` |
| State transition | Not applicable | No status-bearing clinical entity is created or transitioned |
| Recovery | `NOT_COVERED` | BLK-003 — behaviour for an invalid or unavailable client is `NOT SPECIFIED` |

One of five paths covered, one genuinely not applicable, three blocked on specification.

This is the sharpest measure of the requirement's real testability. The acceptance criteria are testable in isolation, which is what let G0 pass; the workflow around them is largely unspecified, which is what bounds the suite. Answering GAP-003, GAP-004, and GAP-002 would open all three remaining paths.

---

## 5. Priority

| Test case | Priority | Basis |
|---|---|---|
| TC-CLIENT-001 | `P1` | Requirement §3 criticality, approved 2026-08-24 |
| TC-CLIENT-002 | `P1` | Requirement §3 criticality, approved 2026-08-24 |

**Raised for the G2 reviewer.** `aidlc-e2e-rules.md` §13 lists core patient workflows and data integrity among the concerns P0 should cover. Since Client and Patient are the same entity, client selection is arguably a core patient workflow, and TC-CLIENT-002 carries the §8 identity assertion — the one place in this requirement where getting it wrong has clinical consequence.

There is a real case for TC-CLIENT-002 at `P0`. The approved criticality is `P1` and is used, because overriding an approved value on AI initiative is not permitted. Recorded as T-01 in the conflict register; the reviewer may raise it.

---

## 6. Business value of each scenario

`aidlc-e2e-rules.md` §7 and §32 reject scenarios that exist to raise the count. Both are justified individually.

**TC-CLIENT-001** proves the Client area is reachable. It is the precondition for every other client-scoped test in the suite, so its failure explains a whole class of downstream failures at once. Without it, a broken entry point presents as five unrelated failures.

**TC-CLIENT-002** proves that selecting a client makes the *correct* client active. This is the requirement's stated business risk — acting on the wrong client's clinical information — reduced to its smallest observable form. It is the highest-value test in this requirement.

Neither duplicates the other: the first concerns reachability, the second concerns identity.

---

## 7. G2 readiness

```text
[X] Every acceptance criterion labelled covered, partially covered, or NOT_COVERED
[X] Every uncovered criterion carries a justification and a blocker ID
[X] No claim of full coverage
[X] Every scenario justified by business value
[X] Duplication assessed — see duplication-report.md
[X] Priority assigned, with the P0 argument recorded rather than suppressed
[X] Human sign-off
```

```text
G2 sign-off

[X] Approved — coverage design accepted, S4 may proceed
[  ] Approved with priority raised to P0 for TC-CLIENT-002
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Two things this approval accepts, recorded because both will be read later by someone who was not in the room.

**Partial coverage is accepted as the deliverable.** Two of five criteria, happy path only. The suite must not be described as covering `REQ-CLIENT-001`.

**Priority stays at `P1`.** The P0 argument in §5 was put to this gate and not taken, so `TC-CLIENT-002` runs at `P1` despite carrying the §8 identity assertion. Revisit if GAP-010 resolves toward the data integrity reading, since that would make the surrounding criteria data-integrity tests and change the weight of this one.
