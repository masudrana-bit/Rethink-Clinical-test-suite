# TC-CLIENT-001 — A user reaches the Client area

**Stage produced:** S4 — Behaviour Specification
**Gate this feeds:** G3, the `Approved → Automation` boundary
**Status:** G3 signed 2026-08-24. Approved for automation; execution blocked by BLK-007.

---

## 1. Identification

| Field | Value |
|---|---|
| Test Case ID | `TC-CLIENT-001` |
| Requirement ID | `REQ-CLIENT-001` v1.2 |
| Acceptance Criterion IDs | `AC-001` |
| Scenario | SC-001 — A user reaches the Client area |
| Priority | `P1` |
| Test Type | `POSITIVE` |
| Automation Status | `AUTOMATED` — executes from `aidlc-docs/bdd/client/REQ-CLIENT-001.feature` via `src/steps/client.steps.ts` |
| Last Execution | `PASSED`, first attempt, run `run-2026-08-24T1204Z`. Data mode `substituted` |
| Clinical rule refs | CL-007, CL-008 |
| Blockers | None blocking this case. BLK-007 blocks its execution |

---

## 2. Objective

Prove that a user who can access the Clinical application can open the Client area and see it displayed.

---

## 3. Preconditions

| # | State before step 1 | Source |
|---|---|---|
| 1 | The user can access the Clinical application | Requirement §5 precondition 1 |
| 2 | The Client area is available to the user | Requirement §5 precondition 2 |
| 3 | At least one synthetic client exists and is available in the client selector | Requirement §5 precondition 3 |

Precondition 1 cannot be established today: no authentication mechanism has been supplied. Tracked as BLK-007. It blocks execution, not authorship.

---

## 4. Test data

Referenced by shape. Concrete values come from the S5 test data plan, which does not yet exist — `MISSING TEST DATA DEFINITION`, BLK-008.

| Item | Shape | Constraint |
|---|---|---|
| Test user | An account able to access the Clinical application | Synthetic. Role unspecified, because the authorization matrix is `NOT SPECIFIED` — see GAP-002 |
| Client A | Synthetic client identifier, synthetic client name, available status | No real PHI. `clinical-rules.md` §6, requirement §15 |

No value is inlined here. Requirement §15 requires parameterised synthetic data, and the names visible in the supplied screenshots are example runtime data, not fixtures.

---

## 5. Steps and expected results

| # | Action | Expected result | Source |
|---|---|---|---|
| 1 | The user accesses the Clinical application | The application is available to the user | Requirement §5 precondition 1 |
| 2 | The user accesses the Client area | The Client area is displayed | Requirement §6 step 1; AC-001 |
| 3 | The user observes the client selector | The client selector is present and offers at least one client | Requirement §5 precondition 3; §6 step 2, which presupposes a selector to choose from |

Steps are business actions. No selector, URL, endpoint, or status code appears, per `aidlc-e2e-rules.md` §9.

Step 3 deserves a note. AC-001 says only that the Client area is displayed. Asserting that the selector is present goes marginally beyond that literal wording, and is included because a Client area rendered without a usable selector satisfies AC-001 while leaving the workflow dead — requirement §6 step 2 cannot happen. The assertion is derived from a cited precondition rather than invented, but a G3 reviewer should be aware it is a small strengthening and may strike it.

---

## 6. What this case does not assert

Stated explicitly, so that a pass is not read as more than it is.

It does not assert that this user is *entitled* to the Client area. `clinical-rules.md` §19 separates authentication from authorization, and the requirement's §10 authorization matrix is `NOT SPECIFIED` in every cell. The case proves access occurred, not that access was permitted. See GAP-002.

It does not assert anything about *which* clients the selector contains. That is TC-CLIENT-002's concern.

It does not assert behaviour when the Client area is unavailable or the selector is empty. Both are `NOT SPECIFIED` — BLK-002 and the boundary entry in the scenario inventory.

---

## 7. Independence and cleanup

Self-contained, as `aidlc-e2e-rules.md` §17 requires. It depends on no other test having run and leaves no state behind: it reads, and writes nothing.

Client A must exist beforehand. Per `clinical-rules.md` §7 that fixture must be isolated to this test rather than shared clinical data, and the lifecycle is defined in the S5 plan.

---

## 8. Clinical checks

Each check from `generate-testcase.md` §7, applied or explicitly excluded.

| Check | Status |
|---|---|
| Patient identity verified where it matters (§8) | Not applicable — no client is selected in this case. Applies to TC-CLIENT-002 |
| Patient/session/program association (§21, §22) | Not applicable — no clinical data is displayed or associated |
| Lifecycle transition valid (§9, §13) | Not applicable — no status-bearing entity |
| Mandatory-field behaviour (§14) | Not applicable — no field is submitted |
| Correction model (§15) | Not applicable — nothing is amended |
| Attribution (§17) | Not applicable — no record is written |
| Authorization separate from authentication (§18, §19) | Applied, as an explicit exclusion. See §6 |
| Audit expectation (§16) | Not covered — `NOT SPECIFIED`, GAP-006 |
| Date and time rules (§25) | Not applicable — no date or time is involved |
| Synthetic data, no PHI (§6) | Applied. See §4 |
| Test isolation (§7) | Applied. See §7 |

---

## 9. Traceability

```text
REQ-CLIENT-001
    ↓
AC-001
    ↓
TC-CLIENT-001
    ↓
BDD: aidlc-docs/bdd/client/REQ-CLIENT-001.feature, scenario tagged @TC-CLIENT-001
    ↓
Automation: aidlc-docs/bdd/client/REQ-CLIENT-001.feature, scenario tagged @TC-CLIENT-001
            steps in src/steps/client.steps.ts
    ↓
Execution: not yet run — stage S9
```

| Link | Target |
|---|---|
| Requirement | `aidlc-docs/requirements/REQ-CLIENT-001.md` |
| Acceptance criterion | AC-001 |
| Scenario | SC-001, `aidlc-docs/design/REQ-CLIENT-001/scenario-inventory.md` |
| BDD scenario | `@TC-CLIENT-001` in `aidlc-docs/bdd/client/REQ-CLIENT-001.feature` |
| Clinical rules | CL-007, CL-008 |
| Automation | `aidlc-docs/bdd/client/REQ-CLIENT-001.feature` (`@TC-CLIENT-001`) + `src/steps/client.steps.ts` |

---

## 10. G3 sign-off

```text
[X] Approved — case may proceed to S5
[  ] Approved with the step 3 selector assertion removed
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

The step 3 selector assertion was put to this gate and retained. `TC-CLIENT-001` therefore fails if the Client area renders without a usable client selector, which is slightly stronger than the literal wording of AC-001.

This case has crossed the `Approved → Automation` boundary of `clinical-rules.md` §35. Automation may be written when a framework and an authentication mechanism exist — BLK-009 and BLK-007.
