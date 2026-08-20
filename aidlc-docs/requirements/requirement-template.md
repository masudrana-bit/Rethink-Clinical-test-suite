# Requirement Template

**Version:** 1.0
**Status:** Draft — pending approval at Gate G0
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`
**Consumed by:** `aidlc-docs/workflows/e2e-test-generation-workflow.md` stage S0

---

## How to use this template

Copy this file to `aidlc-docs/requirements/REQ-<MODULE>-<NNN>.md` and fill every section.

Three rules govern completion:

1. **Every behavioural statement needs a source citation.** A statement with no approved source cannot be used to derive an expected test result.
2. **Unknown is a valid answer; invented is not.** Where information does not exist, write the exact token `NOT SPECIFIED` and raise it in §13. Never fill a gap with a plausible value.
3. **Sections marked REQUIRED must be present for stage S0 to pass Gate G0.** Sections marked CONDITIONAL are required only when the trigger described applies to this requirement.

A requirement that still contains `NOT SPECIFIED` in a field affecting expected clinical behaviour is not approvable, and any test derived from it stays `TEST BLOCKED`.

---

## 1. Identification — REQUIRED

| Field | Value |
|---|---|
| Requirement ID | `REQ-<MODULE>-<NNN>` |
| Title | |
| Module | |
| Version | |
| Author | |
| Created | |
| Last updated | |

The `<MODULE>` token must come from the approved module taxonomy. Do not coin a new module name here.

## 2. Approval — REQUIRED

A requirement is only a valid input to the workflow once this table is complete. AI must never populate or infer these rows.

| Field | Value |
|---|---|
| Status | `Draft` / `In Review` / `Approved` |
| Approved by | |
| Role of approver | |
| Approval date | |
| Clinical SME sign-off required? | `Yes` / `No` |
| Clinical SME | |
| Clinical sign-off date | |

## 3. Business Context — REQUIRED

**Objective:** what business or clinical outcome this requirement delivers.

**Problem being solved:**

**Business value / risk if absent:**

**Criticality:** `P0` / `P1` / `P2` / `P3`, using the priority definitions in `aidlc-e2e-rules.md` §13.

## 4. Actors and Roles — REQUIRED

| Actor / role | Description | Source |
|---|---|---|

Distinguish authentication from authorization per `clinical-rules.md` §19. Being able to log in does not imply being permitted to perform the action described here.

## 5. Preconditions — REQUIRED

State the system and data conditions that must hold before the workflow begins, each with its source.

## 6. Business Workflow — REQUIRED

Describe the workflow in business language, one step per line. No selectors, endpoints, or status codes.

| Step | Actor | Action | Expected system response | Source |
|---|---|---|---|---|

## 7. Acceptance Criteria — REQUIRED

Each criterion needs a stable `AC-<NNN>` identifier, must be independently testable, and must state an observable outcome. Every criterion will be mapped to coverage at stage S3, so a vague criterion becomes an untestable one.

| ID | Criterion | Observable outcome | Source |
|---|---|---|---|
| AC-001 | | | |

## 8. Clinical and Business Rules — REQUIRED

Every rule that determines an expected result, each traceable to an approved document. This table is the input to the clinical rule register built at stage S1.

| Rule ID | Rule statement | Approved source (document + location) | Affects AC |
|---|---|---|---|

If a rule is known to exist but its detail is unavailable, record it here with `NOT SPECIFIED` in the statement column rather than omitting the row — a known gap is more useful than a silent one.

## 9. Clinical Detail — CONDITIONAL

Complete each subsection that applies. Where a subsection does not apply, write `Not applicable` and say why. Where it applies but the detail is unavailable, write `NOT SPECIFIED`.

### 9.1 Lifecycle and status
Trigger: the requirement involves a clinical session, observation, or any entity with a status.

State the exact approved states and the permitted transitions between them. Per `clinical-rules.md` §9 and §13 these must come from the approved product specification; additional states must not be introduced here.

| From state | Action | To state | Conditions | Source |
|---|---|---|---|---|

### 9.2 Enumerations
Trigger: the workflow uses structured clinical values.

List the exact approved enum values and their source (`clinical-rules.md` §12). Do not add convenience values such as catch-all or default options unless the approved contract defines them.

### 9.3 Mandatory fields
Trigger: the workflow captures clinical data.

| Field | Mandatory? | Behaviour when missing | Source |
|---|---|---|---|

Per `clinical-rules.md` §14, the behaviour-when-missing column must come from the approved requirement, not from expectation.

### 9.4 Calculations
Trigger: the requirement involves any derived or calculated clinical value.

`clinical-rules.md` §11 requires all seven of the following. If any is missing the test is blocked, so record each explicitly:

| Formula | Inputs | Units | Precision | Rounding rule | Boundary behaviour | Expected result |
|---|---|---|---|---|---|---|

### 9.5 Corrections
Trigger: the workflow permits amending previously recorded clinical data.

State the approved correction model — in particular whether records are updated in place or appended and superseded (`clinical-rules.md` §15).

### 9.6 Associations
Trigger: the workflow involves patient, session, or program relationships.

State the required associations that must hold and remain intact (`clinical-rules.md` §21, §22).

### 9.7 Date and time
Trigger: the workflow is sensitive to dates, times, or time zones.

State the approved rules for time zone handling, date boundaries, and permitted past/future values (`clinical-rules.md` §25).

### 9.8 Concurrency
Trigger: multiple users can modify the same record.

State the approved expected behaviour (`clinical-rules.md` §26).

## 10. Authorization — REQUIRED

| Role | Permitted actions | Denied actions | Expected behaviour on denial | Source |
|---|---|---|---|---|

## 11. Validation and Error Behaviour — REQUIRED

For each validation, state whether the requirement specifies **exact message text** or **behaviour only**. This distinction is load-bearing: per `clinical-rules.md` §24, tests assert exact text only where exact text is specified, and assert behaviour otherwise. Inventing message wording is prohibited.

| Condition | Specified as | Exact text (if applicable) | Expected behaviour | Source |
|---|---|---|---|---|

## 12. Interfaces and Data — CONDITIONAL

### 12.1 API contracts
Reference the approved contract; do not restate or infer endpoints and fields. If no contract exists, write `MISSING API CONTRACT`.

### 12.2 UX / UI specification
Reference the approved design source.

### 12.3 Audit expectations
Trigger: the requirement covers a clinically significant action.

State which events must be auditable and what each must record (`clinical-rules.md` §16). Keep business records and audit records conceptually separate per §30.

### 12.4 External integrations
State any downstream system involved and reference the approved integration contract (`clinical-rules.md` §27).

### 12.5 Retention and deletion
State the approved retention or deletion rule. Per `clinical-rules.md` §28 and §29 no retention period may be introduced here without an approved source.

## 13. Open Questions and Gaps — REQUIRED

Every `NOT SPECIFIED` entry above must appear here with an owner. Use only the status vocabulary defined in the workflow §9.

| ID | Status token | Question / gap | Affects | Owner | Raised | Resolution | Resolved |
|---|---|---|---|---|---|---|---|

## 14. Out of Scope — REQUIRED

State explicitly what this requirement does not cover, so stage S3 does not generate coverage for behaviour nobody owns.

## 15. Test Data Considerations — REQUIRED

Describe the data shape the workflow needs, without real values. All test data must be synthetic per `aidlc-e2e-rules.md` §18 and `clinical-rules.md` §6. Never place real patient identifiers, names, dates of birth, contact details, record numbers, or clinical notes in this document.

## 16. Related Requirements — CONDITIONAL

| Requirement ID | Relationship |
|---|---|

## 17. Change History — REQUIRED

Changes here trigger the impact analysis in workflow stage S11. Expected clinical outcomes must never be changed silently (`clinical-rules.md` §34).

| Version | Date | Author | Change | Approved by | Impacted tests reviewed? |
|---|---|---|---|---|---|

---

## Gate G0 checklist

Stage S0 passes only when all of the following hold:

```text
[  ] Requirement ID assigned and conforms to REQ-<MODULE>-<NNN>
[  ] Module drawn from the approved taxonomy
[  ] Status is Approved, with a named approver and date
[  ] Clinical SME sign-off obtained where required
[  ] At least one acceptance criterion, each with an AC-<NNN> ID
[  ] Every acceptance criterion is independently testable
[  ] Every behavioural statement carries a source citation
[  ] All applicable conditional sections completed or marked Not applicable with a reason
[  ] Every NOT SPECIFIED entry recorded in §13 with an owner
[  ] No NOT SPECIFIED entry remains that affects expected clinical behaviour
[  ] No real patient data present anywhere in the document
```
