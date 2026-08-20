# Construction Prompt — Generate Test Cases

**Version:** 1.0
**Status:** Draft — pending approval at Gate G0
**Workflow stage:** S4 (Behaviour Specification)
**Gate that must have passed:** G2 (Coverage Design)
**Gate this feeds:** G3 (Behaviour Specification) — the `Approved → Automation` boundary
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`

Per decision C-01 in the workflow, test cases and BDD scenarios are **co-produced** in stage S4 and reviewed together at G3. Run this prompt alongside `generate-bdd.md`; neither output is complete without the other.

---

## 1. Preconditions

Do not begin unless all of the following are true. If any is false, stop and report the blocking token.

```text
[  ] Gate G2 signed — coverage matrix and scenario inventory approved
[  ] Requirement is Approved, with a named approver
[  ] Clinical rule register is complete and every entry carries a source citation
[  ] No open blocker with blocking=true affecting this requirement
[  ] Module taxonomy approved, so <MODULE> can be populated
```

## 2. Required reading, in order

1. The approved requirement `REQ-<MODULE>-<NNN>`.
2. Its acceptance criteria.
3. `aidlc-docs/analysis/<REQ-ID>/clinical-rule-register.md`.
4. `aidlc-docs/analysis/<REQ-ID>/clarification-log.md` — resolved decisions are approved sources; open ones are blockers.
5. `aidlc-docs/design/<REQ-ID>/coverage-matrix.md` and `scenario-inventory.md`.
6. `aidlc-docs/design/<REQ-ID>/duplication-report.md`.
7. Existing test cases in `aidlc-docs/testcases/`.

## 3. Inputs

| Input | Source |
|---|---|
| Approved requirement | `aidlc-docs/requirements/REQ-<MODULE>-<NNN>.md` |
| Approved scenario inventory | `aidlc-docs/design/<REQ-ID>/scenario-inventory.md` |
| Clinical rule register | `aidlc-docs/analysis/<REQ-ID>/clinical-rule-register.md` |
| Duplication report | `aidlc-docs/design/<REQ-ID>/duplication-report.md` |

## 4. Procedure

1. **Honour the duplication decision.** For each approved scenario, read its decision from the duplication report. If `REUSE_EXISTING_TEST`, write no new case and record the reuse. If `EXTEND_EXISTING_TEST`, modify the existing case rather than adding a near-duplicate. Only `NEW` produces a new test case.
2. **Assign the ID.** Use `TC-<MODULE>-<NNN>`, taking the next unused number for that module. IDs are permanent — never renumber an existing case to close a gap in the sequence.
3. **Populate every mandatory field** from §5 below. A missing field fails G3.
4. **Derive each expected result from a cited source.** Every expected result must name the requirement clause, acceptance criterion, or clinical rule that produces it. An expected result with no citation is invalid, however obvious it appears.
5. **Apply the error-message rule.** Where the requirement specifies exact text, assert exact text. Where it specifies behaviour only, assert behaviour. Never invent wording (`clinical-rules.md` §24).
6. **Make the case self-contained.** Each case creates the state it needs and cleans up after itself. A case that depends on another having run first is invalid (`aidlc-e2e-rules.md` §17).
7. **State test data by shape, not by value**, and only synthetic data. Reference the test data plan produced at S5 rather than inlining values that will drift.
8. **Record the traceability links** so the S10 record can be built mechanically.
9. **Raise blockers rather than filling gaps.** Any missing detail becomes a blocker entry with the correct token.

## 5. Mandatory fields

These are the fields required by `aidlc-e2e-rules.md` §11. Produce one file per test case at `aidlc-docs/testcases/<REQ-ID>/TC-<MODULE>-<NNN>.md`.

| Field | Constraint |
|---|---|
| Test Case ID | `TC-<MODULE>-<NNN>`, deterministic, never reused |
| Requirement ID | `REQ-<MODULE>-<NNN>` |
| Acceptance Criterion IDs | one or more `AC-<NNN>`; a case covering none is invalid |
| Scenario | the approved scenario name from the inventory |
| Objective | one sentence on what business behaviour is being proven |
| Preconditions | system and data state before step 1 |
| Test Data | shape and reference only; synthetic; no real PHI |
| Steps | business actions, numbered; no selectors or endpoints |
| Expected Results | per step where applicable, each with a source citation |
| Priority | `P0`–`P3` per §13 |
| Test Type | `POSITIVE`, `NEGATIVE`, `BOUNDARY`, `PERMISSION`, `STATE_TRANSITION`, `INTEGRATION` per §7 |
| Traceability | links to AC, clinical rules, BDD scenario, and later the automation |
| Automation Status | `NOT_AUTOMATED` on creation |
| Clinical rule refs | rule IDs whose behaviour this case depends on |
| Blockers | blocker IDs, if any |

## 6. Hard constraints

```text
MUST NOT invent an expected result, error message, enum value, status, or threshold
MUST NOT invent a clinical formula, rounding rule, or boundary
MUST NOT write a test case for behaviour absent from the approved sources
MUST NOT use real patient data in any field
MUST NOT create a case whose only purpose is to raise the test count
MUST NOT depend on another test case having executed first
MUST NOT claim coverage of an acceptance criterion the case does not actually exercise
MUST NOT assert a database detail unless persistence integrity is part of the requirement
```

## 7. Clinical checks

Apply each that is relevant, and state explicitly where one is not applicable.

```text
[  ] Patient identity verified where patient context matters (clinical-rules.md §8)
[  ] Patient/session/program association asserted where relevant (§21, §22)
[  ] Lifecycle transition valid against the approved state model (§9, §13)
[  ] Mandatory-field-missing behaviour taken from the requirement (§14)
[  ] Correction model followed where amendments are involved (§15)
[  ] Attribution asserted where the actor is tracked (§17)
[  ] Authorization treated separately from authentication (§18, §19)
[  ] Audit expectation covered where auditability is required (§16)
[  ] Date/time rules taken from approved sources (§25)
```

## 8. Self-check before handing to G3

```text
[  ] Every approved scenario has a case, or a recorded reuse/extend decision
[  ] Every acceptance criterion maps to at least one case, or is explicitly NOT_COVERED with justification
[  ] Every expected result carries a source citation
[  ] Every case has all mandatory fields populated
[  ] No invented values anywhere
[  ] All IDs conform to the approved format
[  ] Each case is independently executable and cleans up after itself
[  ] Test data is synthetic and contains no PHI
[  ] Every gap is recorded as a blocker with an owner
[  ] Coverage claims match the coverage matrix exactly
```

## 9. Blocking tokens

Use these verbatim; do not paraphrase.

```text
MISSING INFORMATION
CLINICAL RULE REQUIRES CLARIFICATION
TEST BLOCKED
NOT SPECIFIED
NEEDS SME CONFIRMATION
CONFLICTING REQUIREMENTS
MISSING API CONTRACT
MISSING TEST DATA DEFINITION
```

## 10. Outputs

| Artifact | Path |
|---|---|
| Test case specifications | `aidlc-docs/testcases/<REQ-ID>/TC-<MODULE>-<NNN>.md` |
| Updated coverage matrix | `aidlc-docs/design/<REQ-ID>/coverage-matrix.md` |
| Blocker entries | `aidlc-docs/analysis/<REQ-ID>/blocked-register.md` |

Hand off to G3 together with the BDD scenarios from `generate-bdd.md`. No automation may begin until G3 is signed.
