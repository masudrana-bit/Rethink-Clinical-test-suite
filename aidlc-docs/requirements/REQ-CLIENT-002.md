# REQ-CLIENT-002 — Perform Client-Specific Clinical Actions Against the Selected Client

**Version:** 1.1
**Status:** Draft — scope narrowed 2026-08-25; Gate G0 still held
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`
**Consumed by:** `aidlc-docs/workflows/e2e-test-generation-workflow.md` stage S0

> **Origin:** split from `REQ-CLIENT-001` AC-006. That criterion had `NOT SPECIFIED` as its own observable outcome, so no expected result could be derived from it, and it blocked five criteria that were otherwise ready. Separating it lets `REQ-CLIENT-001` proceed on approval while this requirement waits for the clinical detail it needs.
>
> **This requirement is deliberately short.** Almost every field that would determine expected behaviour is unspecified. Filling it out to look complete would misrepresent how ready it is.
>
> **Scope narrowed 2026-08-25.** The first action to be specified and tested is **adding a target to a program**. GAP-009 asked which clinical actions this requirement governs; rather than answer it exhaustively, one action was scoped so work can begin. The rest of the action surface stays in scope for the requirement and unspecified for now. See `aidlc-docs/intake/REQ-CLIENT-002/intake-record.md`, addendum of the same date.
>
> Adding a *program* was chosen first and then abandoned: its control is inert in the dev environment, producing no dialog, no navigation, and no state change. Recorded as Finding 5 in the intake record.

---

## 1. Identification — REQUIRED


| Field          | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Requirement ID | `REQ-CLIENT-002`                                                                |
| Title          | Perform Client-Specific Clinical Actions Against the Selected Client            |
| Module         | `CLIENT` — taxonomy ratified 2026-08-24                                         |
| Version        | `1.1`                                                                           |
| Author         | `NOT SPECIFIED`                                                                 |
| Created        | `2026-08-24`                                                                    |
| Last updated   | `2026-08-25`                                                                    |


---

## 2. Approval — REQUIRED


| Field                           | Value                     |
| ------------------------------- | ------------------------- |
| Status                          | `Approve`                 |
| Approved by                     | Masud Rana                |
| Role of approver                | Sr QA Automation Engineer |
| Approval date                   | 8/25/2026                 |
| Clinical SME sign-off required? | `Yes`                     |
| Clinical SME                    | `NOT SPECIFIED`           |
| Clinical sign-off date          | `NOT SPECIFIED`           |


---

## 3. Business Context — REQUIRED

**Objective:**
Clinical actions performed by a user operate against the client currently selected as the active context, and not against any other client.

**Problem being solved:**
Selecting a client establishes context (`REQ-CLIENT-001`). This requirement covers what happens when the user then *acts* — that the action is recorded against the correct client.

**Business value / risk if absent:**
An action attributed to the wrong client is a clinical data integrity failure. `clinical-rules.md` §21 requires that clinical data belonging to one subject must not appear under another.

**Criticality:** `NOT SPECIFIED` — likely higher than `REQ-CLIENT-001`, since this concerns writing clinical data rather than viewing it, but the rating requires approval.

**Source:** `REQ-CLIENT-001` §3 and §6 step 6.

---

## 4. Actors and Roles — REQUIRED


| Actor / role                         | Description                                                                                  | Source                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Authorized clinical/application role | The exact role(s) permitted to perform client-specific clinical actions are `NOT SPECIFIED`. | Approved authorization source required (GAP-002) |


Authentication and authorization are separate concerns (`clinical-rules.md` §19). Access to the application does not establish permission to perform a clinical action.

---

## 5. Preconditions — REQUIRED


| #   | Precondition                                                                          | Source                                 |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | The user has selected a client, per `REQ-CLIENT-001`.                                 | `REQ-CLIENT-001`                       |
| 2   | The user is authorized to perform the action. Exact requirements are `NOT SPECIFIED`. | Approved authorization source required |


---

## 6. Business Workflow — REQUIRED


| Step | Actor | Action                                       | Expected system response                                                                                                                                        | Source                     |
| ---- | ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1    | User  | Uses client-specific clinical functionality. | The operation is performed in the context of the selected client, subject to the approved workflow and authorization rules. Exact behaviour is `NOT SPECIFIED`. | `REQ-CLIENT-001` §6 step 6 |


**What actions?** No source enumerates them. Reconnaissance on 2026-08-25 established that the application implements a substantial action surface — adding programs and targets, editing goals, managing data collection and targets, confirming or dismissing mastery determinations, and saving reports. That list is observed behaviour, usable for deciding scope and not usable as a source of expected results.

**Scoped first:** adding a target to a program. The remaining actions stay in scope for this requirement and unspecified. Until each is specified, this workflow cannot be decomposed into testable steps.

---

## 7. Acceptance Criteria — REQUIRED


| ID     | Criterion                                                             | Observable outcome | Source                                                   |
| ------ | --------------------------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| AC-001 | Adding a target to a program operates against the selected client.    | `NOT SPECIFIED` — an unratified candidate is proposed below | Approved clinical/product requirement required (GAP-007) |
| AC-002 | The remaining client-specific clinical actions operate against the selected client. | `NOT SPECIFIED` | Deferred — action set not yet specified (GAP-009) |


```text
TEST BLOCKED
```

**Candidate observable outcome for AC-001 — NOT RATIFIED.** Proposed for the Clinical SME to ratify, amend, or reject. Derived from observed application behaviour, which ranks seventh of eight in the `aidlc-e2e-rules.md` §3 source hierarchy and is inadmissible as a source of expected results. This is not a specification.

> When an authorized user adds a target to a program belonging to the selected client and saves, the target appears in that program's Targets list for that client, and does not appear under any other client.

Deliberately left open, because no source answers them: whether a target name must be unique within a program, the behaviour when the name is empty or duplicates an existing one, and whether adding a target is an audited event (GAP-006).

This criterion has no observable outcome and no enumerated actions. No test case, scenario, or expected result can be derived from it. Per `clinical-rules.md` §4, it stays blocked until the missing decision is supplied.

---

## 8. Clinical and Business Rules — REQUIRED


| Rule ID | Rule statement                                                                               | Approved source (document + location)         | Affects AC |
| ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| CL-002  | Clinical data must remain associated with the correct patient/client.                        | `clinical-rules.md` §21                       | AC-001     |
| CL-003  | AI must not infer or invent clinical behavior when an approved clinical rule is unavailable. | `clinical-rules.md` §2                        | AC-001     |
| CL-004  | Exact authorization rules for client-specific clinical actions are `NOT SPECIFIED`.          | Approved authorization specification required | AC-001     |


Rule IDs are retained from `REQ-CLIENT-001` so existing references remain resolvable.

---

## 9. Clinical Detail — CONDITIONAL

### 9.1 Lifecycle and status

`NOT SPECIFIED`. Whether a client-specific clinical action creates or transitions a status-bearing entity depends on which actions are in scope, which is itself unspecified.

### 9.2 Enumerations

`NOT SPECIFIED`.

### 9.3 Mandatory fields

`NOT SPECIFIED`.

### 9.4 Calculations

`NOT SPECIFIED`. If any action produces a derived clinical value, `clinical-rules.md` §11 requires the formula, inputs, units, precision, rounding rule, boundary behaviour, and expected result before a test may be written.

### 9.5 Corrections

`NOT SPECIFIED`. If actions can be amended, the approved correction model — update in place versus append and supersede — must be stated (`clinical-rules.md` §15).

### 9.6 Associations

The action must be recorded against the selected client:

```text
Selected Client
      ↓
Clinical action
      ↓
Recorded against that client
```

**Source:** `clinical-rules.md` §21. The exact persistence and association mechanism is `NOT SPECIFIED` (GAP-007).

### 9.7 Date and time

`NOT SPECIFIED`.

### 9.8 Concurrency

`NOT SPECIFIED`.

---

## 10. Authorization — REQUIRED


| Role            | Permitted actions | Denied actions  | Expected behaviour on denial | Source                                                  |
| --------------- | ----------------- | --------------- | ---------------------------- | ------------------------------------------------------- |
| `NOT SPECIFIED` | `NOT SPECIFIED`   | `NOT SPECIFIED` | `NOT SPECIFIED`              | Approved authorization specification required (GAP-002) |


---

## 11. Validation and Error Behaviour — REQUIRED


| Condition                                | Specified as       | Exact text (if applicable) | Expected behaviour                                                 | Source                                        |
| ---------------------------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Unauthorized clinical action             | `NOT SPECIFIED`    | `NOT SPECIFIED`            | `NOT SPECIFIED`                                                    | Approved authorization specification required |
| Action performed with no client selected | `NOT SPECIFIED`    | `NOT SPECIFIED`            | `NOT SPECIFIED`                                                    | Approved Client workflow required (GAP-003)   |
| Action recorded against the wrong client | Behaviour required | `NOT SPECIFIED`            | Clinical data/action must not be associated with the wrong client. | `clinical-rules.md` §21                       |


No error message text is invented.

---

## 12. Interfaces and Data — CONDITIONAL

### 12.1 API contracts

`MISSING API CONTRACT` (GAP-005).

### 12.2 UX / UI specification

`NOT SPECIFIED`.

### 12.3 Audit expectations

`NOT SPECIFIED` (GAP-006). Clinical actions are among the events `clinical-rules.md` §16 identifies as potentially requiring audit, so this is likely relevant here even though it was not for `REQ-CLIENT-001`.

### 12.4 External integrations

`NOT SPECIFIED`.

### 12.5 Retention and deletion

`NOT SPECIFIED`.

---

## 13. Open Questions and Gaps — REQUIRED


| ID      | Status token             | Question / gap                                                                                                            | Affects      | Owner            | Raised     | Resolution      | Resolved        |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------- | ---------- | --------------- | --------------- |
| GAP-002 | `NEEDS SME CONFIRMATION` | What is the approved authorization matrix for client-specific clinical actions?                                           | §4, §10      | Product/Security | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-003 | `NEEDS SME CONFIRMATION` | What is the required behavior when an action is attempted with no Client selected?                                        | §11          | Product/QA       | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-005 | `MISSING API CONTRACT`   | What is the approved API contract for client-specific clinical actions?                                                   | §12.1        | Engineering      | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-006 | `NEEDS SME CONFIRMATION` | Are client-specific clinical actions auditable, and what must the audit event contain?                                    | §12.3        | Product/Clinical | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-007 | `NEEDS SME CONFIRMATION` | What exact clinical/business rule defines the Client → clinical action association, and what are the observable outcomes? | AC-001, §9.6 | Clinical SME     | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-009 | `NEEDS SME CONFIRMATION` | Which clinical actions are in scope for this requirement? No source enumerates them.                                      | §6, AC-002   | Product/Clinical | 2026-08-24 | **Partially resolved 2026-08-25** — adding a target scoped as the first action; the rest deferred | Partial |
| GAP-012 | `NEEDS SME CONFIRMATION` | Mastery calculation: formula, inputs, precision, rounding, and boundary behaviour. The UI displays "at least 80% with at least 10 trials across 3 consecutive sessions", which is a display string, not an approved specification | Mastery confirmation, when scoped | Clinical SME | 2026-08-25 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-013 | `NEEDS SME CONFIRMATION` | Who is the Clinical SME for this requirement? An independent sign-off was required on 2026-08-25, and no SME is named | §2, Gate G0 | Product | 2026-08-25 | `NOT SPECIFIED` | `NOT SPECIFIED` |


GAP-009 was the root blocker and is now partially resolved: one action is scoped, which is enough to begin. GAP-007 is the remaining gate item, since AC-001 still needs a ratified observable outcome. GAP-012 attaches only to mastery confirmation and is off the critical path while that action is out of scope.

Gap IDs are shared with `REQ-CLIENT-001` where the underlying question is the same, so resolving one resolves both.

---

## 14. Out of Scope — REQUIRED

Everything listed as out of scope in `REQ-CLIENT-001` §14 remains out of scope here, together with client selection itself, which is covered by `REQ-CLIENT-001`.

---

## 15. Test Data Considerations — REQUIRED

Test data must be synthetic and must not contain real patient information. Exact fields and values are `NOT SPECIFIED`.

Proving that an action is recorded against the correct client requires **at least two distinct synthetic clients**. With a single client the assertion passes trivially and demonstrates nothing.

---

## 16. Related Requirements — CONDITIONAL


| Requirement ID   | Relationship                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| `REQ-CLIENT-001` | Establishes the selected client context that this requirement acts within |


---

## 17. Change History — REQUIRED


| Version | Date       | Author | Change                                                                                                                                                                                                                         | Approved by     | Impacted tests reviewed?        |
| ------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------- |
| 1.0     | 2026-08-24 | AI     | Split from `REQ-CLIENT-001` AC-006. Content moved, not authored: acceptance criterion, rules CL-002 to CL-004, gaps GAP-002/003/005/006/007, and workflow step 6. GAP-009 added to record that the action set is unenumerated. | `NOT SPECIFIED` | Not applicable — no tests exist |
| 1.1     | 2026-08-25 | AI     | Scope narrowed to adding a target as the first action, per a QA decision recorded in the intake addendum. AC-001 restated accordingly and AC-002 added for the deferred remainder. Candidate observable outcome proposed, explicitly unratified. GAP-009 marked partially resolved; GAP-012 and GAP-013 raised. Stale taxonomy note corrected. | `NOT SPECIFIED` | Not applicable — no tests exist |


---

## Gate G0 checklist

```text
[X] Requirement ID assigned and conforms to REQ-<MODULE>-<NNN>
[X] Module drawn from the approved taxonomy
[  ] Status is Approved, with a named approver and date
[  ] Clinical SME sign-off obtained where required
[X] At least one acceptance criterion, each with an AC-<NNN> ID
[  ] Every acceptance criterion is independently testable
[X] Every behavioural statement carries a source citation
[X] All applicable conditional sections completed or marked Not applicable with a reason
[X] Every NOT SPECIFIED entry recorded in §13 with an owner
[  ] No NOT SPECIFIED entry remains that affects expected clinical behaviour
[X] No real patient data present anywhere in the document
```

### Gate G0 status

**BLOCKED** — on three items, down from an open-ended list.

Narrowing the scope to a single action removed the root blocker. What remains:

1. **Ratify the observable outcome for AC-001** (§7), or supply the approved one. Until then the criterion is not independently testable.
2. **Name a Clinical SME and obtain sign-off** (GAP-013). An independent sign-off was required on 2026-08-25; the `REQ-CLIENT-001` arrangement, where the QA lead signed both lines, does not carry over to a requirement that writes clinical data.
3. **Set the criticality rating** (§3), rather than inheriting P1 from the parent by default.

Approval alone still would not unblock this. Item 1 is content, not signature.

Full assessment and the reconnaissance behind the scoping decision: `aidlc-docs/intake/REQ-CLIENT-002/intake-record.md`.