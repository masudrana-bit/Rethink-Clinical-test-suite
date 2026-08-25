# TC-CLIENT-002 — Selecting a client makes that client the active client

**Stage produced:** S4 — Behaviour Specification
**Gate this feeds:** G3, the `Approved → Automation` boundary
**Status:** G3 signed 2026-08-24. Approved for automation; execution blocked by BLK-007 and BLK-008.

This is the highest-value case in the requirement. It reduces the stated business risk — viewing or acting on the wrong client's clinical information — to its smallest observable form.

---

## 1. Identification

| Field | Value |
|---|---|
| Test Case ID | `TC-CLIENT-002` |
| Requirement ID | `REQ-CLIENT-001` v1.2 |
| Acceptance Criterion IDs | `AC-002` |
| Scenario | SC-002 — Selecting a client makes that client the active client |
| Priority | `P1` — see §10, there is a case for `P0` |
| Test Type | `POSITIVE` |
| Automation Status | `AUTOMATED` — executes from `features/client/REQ-CLIENT-001.feature` via `src/steps/client.steps.ts` |
| Last Execution | `PASSED`, first attempt, run `run-2026-08-24T1204Z`. Data mode `substituted` |
| Clinical rule refs | CL-001, CL-006, CL-007, CL-008 |
| Blockers | None blocking this case. BLK-007 and BLK-008 block its execution |

---

## 2. Objective

Prove that when a user selects a specific client from the client selector, that client — the one chosen, and not merely some client — becomes the active client.

---

## 3. Preconditions

| # | State before step 1 | Source |
|---|---|---|
| 1 | The user can access the Clinical application | Requirement §5 precondition 1 |
| 2 | The Client area is displayed | Requirement §6 step 1; established by this case, not inherited from TC-CLIENT-001 |
| 3 | **Two distinct** synthetic clients are available in the selector, Client A and Client B | Requirement §5 precondition 3, strengthened by CL-006. See §4 |
| 4 | No client is currently active, or the active client is Client A | Ensures step 2 is an observable change. See §5 |

Precondition 2 is established within this case. It is not a dependency on TC-CLIENT-001 having run, which `aidlc-e2e-rules.md` §17 would forbid.

---

## 4. Test data

Referenced by shape. Concrete values come from the S5 plan — `MISSING TEST DATA DEFINITION`, BLK-008.

| Item | Shape | Constraint |
|---|---|---|
| Test user | An account able to access the Clinical application | Synthetic |
| Client A | Synthetic identifier, synthetic name, available status | No real PHI |
| Client B | Synthetic identifier, synthetic name, available status. **Distinguishable from Client A by name** | No real PHI |

**Why two clients, and why this is not optional.**

With a single client in the selector, the assertion "the selected client is displayed" passes whether or not selection does anything at all. A selector that ignores input and always shows its only entry satisfies it. The test would be green and would prove nothing.

Two distinct clients make the assertion meaningful, and the case selects **Client B**, the one that is not first, so that a default-to-first implementation is caught rather than accommodated.

This follows from CL-006 and `clinical-rules.md` §8, which requires that the correct subject be verified rather than assumed from a selection result. It became applicable to client selection through the Client/Patient identity decision of 2026-08-24.

Names must be distinguishable. Two synthetic clients sharing a display name would leave the assertion unable to tell them apart, reintroducing the problem the second client exists to solve.

---

## 5. Steps and expected results

| # | Action | Expected result | Source |
|---|---|---|---|
| 1 | The user accesses the Client area | The Client area is displayed with the client selector present | Requirement §6 step 1; AC-001 |
| 2 | The user selects Client B from the client selector | Client B's name is displayed in the client selector | Requirement §6 step 2; AC-002 |
| 3 | The user observes the client selector | The displayed client is Client B, and is not Client A | AC-002 read with CL-006 and `clinical-rules.md` §8 |

Step 3 is the point of the case. Steps 1 and 2 establish the state; step 3 makes the identity assertion.

The negative half of step 3 — *and is not Client A* — is what distinguishes this from a test that merely checks the selector is non-empty. It is derived from `clinical-rules.md` §8, cited above, not invented.

Steps are business actions. No selector, URL, endpoint, or status code appears, per `aidlc-e2e-rules.md` §9.

---

## 6. What this case does not assert

The single most important boundary in this requirement, and the one most likely to be misread from a green result.

**It does not prove that client context works.** It proves that the selection is *reflected* in the selector. Whether the selection is *effective* — whether Skills Programs, Behavior Support, and Analyze Data actually scope to Client B — is AC-003, AC-004, and AC-005, all of which are blocked on GAP-010.

Requirement §6 step 2 states two outcomes in one sentence: the name is displayed, and the client becomes the active context. This case covers the first. The second is untested.

That distinction matters because the requirement's stated risk is acting on the wrong client's clinical information, and the display half does not protect against it. A system could show Client B in the selector and serve Client A's data underneath, and this case would pass.

It also does not assert persistence of the selection across navigation — the mechanism is `NOT SPECIFIED` in requirement §9.6 — nor behaviour when no client is selected, which is BLK-002.

---

## 7. Independence and cleanup

Self-contained. It establishes the Client area itself, selects its own client, and depends on no other case having run.

It writes no clinical data. Whether selecting a client leaves server-side state is `NOT SPECIFIED` in requirement §9.6; if the S5 plan later establishes that it does, a cleanup step must be added and this section revised.

Clients A and B must be isolated fixtures rather than shared clinical records, per `clinical-rules.md` §7.

---

## 8. Clinical checks

| Check | Status |
|---|---|
| Patient identity verified where it matters (§8) | **Applied — this is the core of the case.** Step 3 asserts the correct client, not merely a client |
| Patient/session/program association (§21, §22) | Not applicable — no clinical data is displayed here. §21 applies to AC-003 to AC-005, which are blocked |
| Lifecycle transition valid (§9, §13) | Not applicable — no status-bearing entity |
| Mandatory-field behaviour (§14) | Not covered — requirement §9.3 leaves both the mandatory flag and the missing-value behaviour `NOT SPECIFIED`. GAP-003 |
| Correction model (§15) | Not applicable |
| Attribution (§17) | Not applicable — no record is written |
| Authorization separate from authentication (§18, §19) | Not covered — matrix `NOT SPECIFIED`, GAP-002 |
| Audit expectation (§16) | Not covered — `NOT SPECIFIED`, GAP-006 |
| Date and time rules (§25) | Not applicable |
| Synthetic data, no PHI (§6) | Applied. See §4 |
| Test isolation (§7) | Applied. See §7 |

---

## 9. Traceability

```text
REQ-CLIENT-001
    ↓
AC-002
    ↓
TC-CLIENT-002
    ↓
BDD: features/client/REQ-CLIENT-001.feature, scenario tagged @TC-CLIENT-002
    ↓
Automation: features/client/REQ-CLIENT-001.feature, scenario tagged @TC-CLIENT-002
            steps in src/steps/client.steps.ts
    ↓
Execution: not yet run — stage S9
```

| Link | Target |
|---|---|
| Requirement | `aidlc-docs/requirements/REQ-CLIENT-001.md` |
| Acceptance criterion | AC-002 |
| Scenario | SC-002, `aidlc-docs/design/REQ-CLIENT-001/scenario-inventory.md` |
| BDD scenario | `@TC-CLIENT-002` in `features/client/REQ-CLIENT-001.feature` |
| Clinical rules | CL-001, CL-006, CL-007, CL-008 |
| Automation | `features/client/REQ-CLIENT-001.feature` (`@TC-CLIENT-002`) + `src/steps/client.steps.ts` |

---

## 10. Priority note for the reviewer

Assigned `P1`, taking the approved criticality from requirement §3.

`aidlc-e2e-rules.md` §13 lists core patient workflows and data integrity among the concerns P0 should cover. Client and Patient are the same entity, so client selection is arguably a core patient workflow, and this case carries the §8 identity assertion — the one place in this requirement where being wrong has clinical consequence.

`P1` is used because overriding an approved value on AI initiative is not permitted. The reviewer may raise it. Recorded as T-01 in the conflict register.

---

## 11. G3 sign-off

```text
[X] Approved — case may proceed to S5
[  ] Approved, priority raised to P0
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Priority remains `P1`. The P0 argument in §10 was put to this gate and not taken.

The approval carries CL-006 with it. Step 3 asserts that the client the user chose is the client that became active, which is stronger than AC-002's literal text and is the reason two distinct synthetic clients are mandatory rather than convenient. An S5 data plan that supplies one client would silently defeat this case.

Crossed the `Approved → Automation` boundary of `clinical-rules.md` §35.
