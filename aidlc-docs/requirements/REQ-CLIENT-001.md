# REQ-CLIENT-001 — Select Client and Access Client-Specific Clinical Functionality

**Version:** 1.2
**Status:** Approved — Gate G0 passed 2026-08-24 for AC-001 and AC-002; AC-003 to AC-005 held pending GAP-010
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`
**Consumed by:** `aidlc-docs/workflows/e2e-test-generation-workflow.md` stage S0

---

## 1. Identification — REQUIRED


| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Requirement ID | `REQ-CLIENT-001`                                                      |
| Title          | Select Client and Access Client-Specific Clinical Functionality       |
| Module         | `CLIENT` — approved 2026-08-24                                        |
| Version        | `1.2`                                                                 |
| Author         | `NOT SPECIFIED` — drafted by AI from screenshots, approved 2026-08-24 |
| Created        | `2026-08-24`                                                          |
| Last updated   | `2026-08-24`                                                          |


**Source note:** `CLIENT` is drawn from the approved taxonomy at `aidlc-docs/requirements/module-taxonomy.md`, ratified 2026-08-24. Client and Patient are the same entity, so the patient rules in `clinical-rules.md` apply to Client records directly.

---



## 2. Approval — REQUIRED


| Field                           | Value                        |
| ------------------------------- | ---------------------------- |
| Status                          | `Approved`                 |
| Approved by                     | Masud Rana                 |
| Role of approver                | Sr. QA Automation Engineer |
| Approval date                   | 2026-08-24                 |
| Clinical SME sign-off required? | `Yes`                      |
| Clinical SME                    | Masud Rana                 |
| Clinical sign-off date          | 2026-08-24                 |

**Source:** Approval information must be supplied by the project approver; AI must not infer it.

**Note on the clinical sign-off.** Masud Rana acted as the approving authority for both the QA and clinical sign-offs, confirmed on 2026-08-24. `clinical-rules.md` §5 permits a QA lead among the appropriate authorities, and §35 makes the required approval level dependent on the risk of the workflow. This requirement covers client selection and read-only context propagation rather than clinical data capture, which supports the lighter approval.

Recorded so the position is explicit rather than implied: if a dedicated Clinical SME is later engaged, this requirement should be re-reviewed, and any requirement that writes clinical data — `REQ-CLIENT-002` in particular — warrants a separate clinical authority.

---



## 3. Business Context — REQUIRED

**Objective:**
Allow a user to select a client and work within that selected client's Client area, where client-specific clinical functionality is available.

**Problem being solved:**
Clinical functionality is client-specific. The application needs an active client context so the user can access the selected client's Skills Programs, Behavior Support, and Analyze Data areas.

**Business value / risk if absent:**
The selected client provides the context for client-specific clinical functionality. Incorrect client context could create a risk of viewing or acting on the wrong client's clinical information. The project's approved risk statement is `NOT SPECIFIED`.

**Criticality:** `P1`

**Source:** User-provided application screenshots and workflow description. Final criticality requires project approval.

---



## 4. Actors and Roles — REQUIRED


| Actor / role                         | Description                                                                                  | Source                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| User                                 | User accesses the Clinical application and selects a Client from the Client selector.        | User-provided application screenshot   |
| Authorized clinical/application role | The exact role(s) permitted to perform client-specific clinical actions are `NOT SPECIFIED`. | Approved authorization source required |
| Clinical SME                         | Reviews clinical intent where required.                                                      | `clinical-rules.md`                    |
| QA                                   | Reviews testability, traceability, and automation coverage.                                  | AIDLC process                          |


Authentication and authorization are separate concerns. The fact that a user can access the application does not by itself establish permission for every clinical action.

---



## 5. Preconditions — REQUIRED


| #   | Precondition                                                                                | Source                                                             |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | The user is able to access the Clinical application.                                        | User-provided application screenshot                               |
| 2   | The Client area is available to the user.                                                   | User-provided application screenshot                               |
| 3   | A client is available in the Client selector.                                               | User-provided application screenshot                               |
| 4   | The user selects a client before using the selected client's client-specific functionality. | User-provided application screenshot and user workflow description |
| 5   | Exact authorization requirements are `NOT SPECIFIED`.                                       | Approved authorization source required                             |


---



## 6. Business Workflow — REQUIRED


| Step | Actor | Action                                             | Expected system response                                                                              | Source                               |
| ---- | ----- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1    | User  | Accesses the Client area.                          | The Client area is displayed.                                                                         | User-provided application screenshot |
| 2    | User  | Selects a client from the Client selector.         | The selected client's name is displayed in the Client selector and becomes the active client context. | User-provided application screenshot |
| 3    | User  | Accesses Skills Programs for the selected client.  | The Skills Programs area is displayed with client-specific program information.                       | User-provided application screenshot |
| 4    | User  | Accesses Behavior Support for the selected client. | The Behavior Support area is displayed with client-specific plan information.                         | User-provided application screenshot |
| 5    | User  | Accesses Analyze Data for the selected client.     | The Analyze Data area is displayed with client-specific analysis controls and data.                   | User-provided application screenshot |


**Scope note:** Creating a Clinical Session, completing a Clinical Session, and finalizing a Clinical Session are separate workflows unless the approved requirements explicitly combine them. Their detailed behavior is not defined in this requirement.

**Split note:** A former step 6, covering the use of client-specific clinical functionality, moved to `REQ-CLIENT-002`. This requirement now covers establishing and propagating client context only, not acting within it.

---



## 7. Acceptance Criteria — REQUIRED


| ID     | Criterion                                                             | Observable outcome                                                      | Source                               |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| AC-001 | The user can access the Client area.                                  | The Client area is displayed.                                           | User-provided application screenshot |
| AC-002 | The user can select a client from the Client selector.                | The selected client is displayed in the Client selector.                | User-provided application screenshot |
| AC-003 | The selected client provides the active context for Skills Programs.  | Skills Programs displays information for the selected client.           | User-provided application screenshot |
| AC-004 | The selected client provides the active context for Behavior Support. | Behavior Support displays information for the selected client.          | User-provided application screenshot |
| AC-005 | The selected client provides the active context for Analyze Data.     | Analyze Data displays information and controls for the selected client. | User-provided application screenshot |


A former AC-006, covering client-specific clinical actions, moved to `REQ-CLIENT-002` AC-001. Its observable outcome was `NOT SPECIFIED`, making it untestable and blocking the five criteria above. AC-001 to AC-005 are not renumbered, per the deterministic-ID rule in `aidlc-e2e-rules.md` §12.

---



## 8. Clinical and Business Rules — REQUIRED


| Rule ID | Rule statement                                                                                                  | Approved source (document + location)                                                                | Affects AC                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| CL-001  | The selected client is the context for client-specific clinical functionality.                                  | User-provided application screenshots and workflow description; formal approved rule `NOT SPECIFIED` | AC-002 to AC-005                                                                |
| CL-002  | Clinical data must remain associated with the correct patient/client.                                           | `clinical-rules.md` §21                                                                              | See note below                                                                  |
| CL-003  | AI must not infer or invent clinical behavior when an approved clinical rule is unavailable.                    | `clinical-rules.md` §2                                                                               | Process rule; applies throughout                                                |
| CL-004  | Exact authorization rules for client-specific clinical actions are `NOT SPECIFIED`.                             | Approved authorization specification required                                                        | Moved to `REQ-CLIENT-002`                                                       |
| CL-005  | Exact Clinical Session lifecycle and transition rules are `NOT SPECIFIED` in the available requirement sources. | Approved Clinical Session specification required                                                     | Not directly applicable to AC-001 to AC-005; affects future session requirement |


**Note on CL-002.** As originally written this rule was scoped to the former AC-006, which has moved to `REQ-CLIENT-002`. Whether it *also* governs AC-003 to AC-005 — that is, whether displaying another client's data in Skills Programs, Behavior Support, or Analyze Data constitutes a §21 association failure — is not stated in any approved source and is not a determination AI should make.

```text
NEEDS SME CONFIRMATION
```

Tracked as GAP-010. The answer changes what AC-003 to AC-005 must assert: read-only context correctness, or a data integrity guarantee.

---



## 9. Clinical Detail — CONDITIONAL



### 9.1 Lifecycle and status

**Not applicable to the current Client-selection requirement.**

No Clinical Session, Observation, or other status-bearing clinical entity is created or transitioned by the workflow defined here.

The separate Clinical Session requirement must define its approved lifecycle before session tests are generated.

### 9.2 Enumerations

**Not applicable to the current Client-selection requirement.**

No structured clinical enum is defined by the available sources for Client selection.

### 9.3 Mandatory fields

The Client selector is a required workflow context, but the approved requirement does not specify a formal field-level validation rule.


| Field           | Mandatory?      | Behaviour when missing | Source                                          |
| --------------- | --------------- | ---------------------- | ----------------------------------------------- |
| Selected Client | `NOT SPECIFIED` | `NOT SPECIFIED`        | Approved Client workflow specification required |




### 9.4 Calculations

**Not applicable.**

No clinical calculation is involved in selecting a Client.

### 9.5 Corrections

**Not applicable.**

The current requirement does not amend previously recorded clinical data.

### 9.6 Associations

The workflow requires client context:

```text
Selected Client
      ↓
Client-specific functionality
```

The selected client must remain the correct context for client-specific clinical information.

**Source:** `clinical-rules.md` §21 and user-provided application screenshots.

The exact persistence/association mechanism is `NOT SPECIFIED`.

### 9.7 Date and time

**Not applicable to Client selection.**

Date/time rules for Clinical Sessions, Observations, and Analyze Data filters must be specified by their respective requirements.

### 9.8 Concurrency

**Not applicable to the current Client-selection requirement.**

No concurrent modification behavior is defined for selecting a Client.

---



## 10. Authorization — REQUIRED


| Role                                  | Permitted actions                                            | Denied actions  | Expected behaviour on denial | Source                                        |
| ------------------------------------- | ------------------------------------------------------------ | --------------- | ---------------------------- | --------------------------------------------- |
| User with approved Client-area access | Select and access a Client, subject to approved permissions. | `NOT SPECIFIED` | `NOT SPECIFIED`              | Approved authorization specification required |
| User without Client-area access       | `NOT SPECIFIED`                                              | `NOT SPECIFIED` | `NOT SPECIFIED`              | Approved authorization specification required |


**Important:** The screenshots demonstrate application access by the observed user, but they do not establish the complete authorization matrix.

---



## 11. Validation and Error Behaviour — REQUIRED


| Condition                            | Specified as       | Exact text (if applicable) | Expected behaviour                                                 | Source                                        |
| ------------------------------------ | ------------------ | -------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| No Client selected                   | `NOT SPECIFIED`    | `NOT SPECIFIED`            | `NOT SPECIFIED`                                                    | Approved Client workflow required             |
| Invalid/unavailable Client selection | `NOT SPECIFIED`    | `NOT SPECIFIED`            | `NOT SPECIFIED`                                                    | Approved Client workflow required             |
| Unauthorized Client access           | `NOT SPECIFIED`    | `NOT SPECIFIED`            | `NOT SPECIFIED`                                                    | Approved authorization specification required |
| Wrong client context                 | Behaviour required | `NOT SPECIFIED`            | Clinical data/action must not be associated with the wrong client. | `clinical-rules.md` §21                       |


No error message text is invented.

---



## 12. Interfaces and Data — CONDITIONAL



### 12.1 API contracts

`MISSING API CONTRACT`

The approved API contract for Client selection/client context was not provided.

Do not infer endpoints, request fields, response fields, status codes, or API behavior from the UI.

### 12.2 UX / UI specification

Observed UI sources:

- User-provided Client page screenshot
- User-provided Behavior Support page screenshot
- User-provided Analyze Data page screenshot

The screenshots establish observed UI structure and example data only. The approved UX/UI specification is `NOT SPECIFIED`.

### 12.3 Audit expectations

**Trigger:** Client-specific clinical functionality is involved.

Required audit events for Client selection and access:

`NOT SPECIFIED`

The approved audit specification must define whether Client selection/access itself is auditable and what fields must be recorded.

Business records and audit records must remain conceptually separate.

### 12.4 External integrations

External integrations involved in Client selection:

`NOT SPECIFIED`

No downstream integration is inferred from the screenshots.

### 12.5 Retention and deletion

Retention/deletion behavior for Client context:

`NOT SPECIFIED`

No retention period is introduced.

---



## 13. Open Questions and Gaps — REQUIRED

Status tokens use the approved vocabulary defined in `aidlc-docs/workflows/e2e-test-generation-workflow.md` §9.


| ID      | Status token             | Question / gap                                                                                                              | Affects                          | Owner            | Raised     | Resolution      | Resolved        |
| ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------- | ---------- | --------------- | --------------- |
| GAP-001 | `RESOLVED`               | What is the approved module taxonomy value for this requirement?                                                            | Identification                   | Product/QA       | 2026-08-24 | `CLIENT`, per the taxonomy ratified 2026-08-24. Client and Patient are one entity; `PATIENT` was merged into `CLIENT`. | 2026-08-24 |
| GAP-002 | `NEEDS SME CONFIRMATION` | What is the approved authorization matrix for Client access and client-specific clinical actions?                           | §4, §10                          | Product/Security | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-003 | `NEEDS SME CONFIRMATION` | What is the required behavior when no Client is selected?                                                                   | §11                              | Product/QA       | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-004 | `NEEDS SME CONFIRMATION` | What is the required behavior when a selected Client is unavailable or invalid?                                             | §11                              | Product/QA       | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-005 | `MISSING API CONTRACT`   | What is the approved API contract for Client selection/client context?                                                      | §12.1                            | Engineering      | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-006 | `NEEDS SME CONFIRMATION` | Is Client selection/access required to be audited, and what must the audit event contain?                                   | §12.3                            | Product/Clinical | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-007 | `NEEDS SME CONFIRMATION` | What exact clinical/business rule defines the Client → clinical workflow association?                                       | §9.6; primarily `REQ-CLIENT-002` | Clinical SME     | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-008 | `NEEDS SME CONFIRMATION` | What is the exact Create Clinical Session workflow after Client selection?                                                  | Future session requirement       | Product/QA       | 2026-08-24 | `NOT SPECIFIED` | `NOT SPECIFIED` |
| GAP-010 | `NEEDS SME CONFIRMATION` | Does `clinical-rules.md` §21 data association govern AC-003 to AC-005, or only clinical actions? The Client/Patient identity decision of 2026-08-24 makes §21 applicable in principle; what remains is whether showing another client's data in a read-only view is a §21 association failure or a lesser context error. See the CL-002 note in §8. | AC-003 to AC-005, §8 | Clinical SME | 2026-08-24 | Partially answered: §21 applies to Client records. Severity for read-only views still open. | `NOT SPECIFIED` |
| GAP-011 | `NEEDS SME CONFIRMATION` | Is a dedicated Clinical SME required for this requirement, or is the QA lead sign-off of 2026-08-24 sufficient? See §2. | §2 approval | Product/Clinical | 2026-08-24 | Accepted for this requirement on risk grounds. Revisit for requirements that write clinical data. | `NOT SPECIFIED` |


---



## 14. Out of Scope — REQUIRED

This requirement does not cover:

1. Creating a new Skills Program.
2. Editing a Skills Program.
3. Behavior Support plan creation.
4. Behavior Support plan editing.
5. Analyze Data business calculations.
6. Mastered Targets functionality.
7. Custom Graph functionality.
8. Bulk Graph functionality.
9. Report saving/deletion.
10. Graph export.
11. Printing Analyze Data reports.
12. Creating a Clinical Session.
13. Completing a Clinical Session.
14. Finalizing a Clinical Session.
15. Creating an Observation.
16. Editing an Observation.
17. Client Search — previously worded as Patient Search.
18. Client Registration — previously worded as Patient Registration.
19. Program Enrollment.
20. Clinical Assessment.
21. Performing client-specific clinical actions — see `REQ-CLIENT-002`.

These should be represented by separate requirements unless the approved product specification explicitly combines them.

---



## 15. Test Data Considerations — REQUIRED

Test data must be synthetic and must not contain real patient information.

### Required data shape

```text
Client
├── Synthetic client identifier
├── Synthetic client name
├── Client availability/status
└── Client-specific clinical context

Client-specific data
├── Programs
├── Behavior Support plans
└── Analyze Data records
```

The exact fields and values are `NOT SPECIFIED`.

### Data parameterization rule

Example values visible in the preview application, such as:

- `Ava Martinez`
- `Requesting a Break`
- `Task Refusal`
- Example program/behavior records
- Example target counts
- Example dates

must be treated as runtime/example data, not hardcoded business rules.

Automation should use parameterized synthetic test data so the same workflow can execute with different real test data while preserving the same application behavior.

### Privacy

Do not place real:

- patient names
- identifiers
- addresses
- phone numbers
- email addresses
- dates of birth
- medical record numbers
- clinical notes
- other PHI

in this requirement or its automated tests.

---



## 16. Related Requirements — CONDITIONAL


| Requirement ID        | Relationship                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `REQ-CLIENT-002`      | Acts within the client context this requirement establishes; split from the former AC-006 |
| `REQ-PROGRAM-001`     | Create Program from Skills Programs                                                       |
| `REQ-BEHAVIOR-001`    | View/Manage Behavior Support                                                              |
| `REQ-ANALYTICS-001`   | Analyze Client Data                                                                       |
| `REQ-SESSION-001`     | Create Clinical Session                                                                   |
| `REQ-SESSION-002`     | Complete Clinical Session                                                                 |
| `REQ-SESSION-003`     | Finalize Clinical Session                                                                 |
| `REQ-OBSERVATION-001` | Create Observation                                                                        |
| `REQ-OBSERVATION-002` | Edit Observation                                                                          |
| `REQ-CLIENT-003`      | Client Search — formerly proposed as `REQ-PATIENT-001`                                    |
| `REQ-CLIENT-004`      | Client Registration — formerly proposed as `REQ-PATIENT-002`                              |
| `REQ-PROGRAM-002`     | Program Enrollment                                                                        |
| `REQ-ASSESSMENT-001`  | Clinical Assessment                                                                       |


The module tokens used above are drawn from the taxonomy approved on 2026-08-24. The sequence numbers are proposals and are assigned when each requirement is authored.

---



## 17. Change History — REQUIRED


| Version | Date       | Author          | Change                                                                                                                                                                                                                                                                                                                                          | Approved by     | Impacted tests reviewed?        |
| ------- | ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------- |
| 1.0     | 2026-08-24 | `NOT SPECIFIED` | Initial requirement drafted from the supplied Client, Behavior Support, and Analyze Data screenshots and the user's workflow description.                                                                                                                                                                                                       | `NOT SPECIFIED` | `NOT SPECIFIED`                 |
| 1.0.1   | 2026-08-24 | AI              | Formatting only: converted Pandoc tables to markdown, removed the enclosing code fence, corrected the document title, normalised §13 status tokens to the approved vocabulary, and moved `MISSING API CONTRACT` in GAP-005 from the Resolution column to the Status token column. No requirement content changed.                               | `NOT SPECIFIED` | Not applicable — no tests exist |
| 1.1     | 2026-08-24 | AI              | Scope change: AC-006 and workflow step 6 moved to `REQ-CLIENT-002`, because the criterion had no observable outcome and was blocking five testable criteria. CL-004 moved with it; CL-001 rescoped to AC-002 to AC-005. GAP-010 raised on whether §21 data association governs AC-003 to AC-005. AC-001 to AC-005 unchanged and not renumbered. | `NOT SPECIFIED` | Not applicable — no tests exist |
| 1.2     | 2026-08-24 | Masud Rana      | Approved. §2 completed with QA and clinical sign-off. Module `CLIENT` confirmed against the ratified taxonomy and GAP-001 closed. Client and Patient recorded as one entity, so `REQ-PATIENT-*` references in §16 became `REQ-CLIENT-*`. GAP-010 narrowed to a severity question; GAP-011 raised on the clinical sign-off authority. No acceptance criterion, workflow step, or clinical rule changed. | Masud Rana | Not applicable — no tests exist |


---



## Gate G0 checklist

```text
[X] Requirement ID assigned and conforms to REQ-<MODULE>-<NNN>
[X] Module drawn from the approved taxonomy
[X] Status is Approved, with a named approver and date
[X] Clinical SME sign-off obtained where required   (see the §2 note and GAP-011)
[X] At least one acceptance criterion, each with an AC-<NNN> ID
[X] Every acceptance criterion is independently testable   (true since AC-006 moved to REQ-CLIENT-002)
[X] Every behavioural statement carries a source citation
[X] All applicable conditional sections completed or marked Not applicable with a reason
[X] Every NOT SPECIFIED entry recorded in §13 with an owner
[X] No NOT SPECIFIED entry remains that affects expected clinical behaviour
        for AC-001 and AC-002. GAP-010 still affects AC-003 to AC-005.
[X] No real patient data present anywhere in the document
```



### Gate G0 status

**PASSED for AC-001 and AC-002 — 2026-08-24, Masud Rana**
**AC-003 to AC-005 held at S3 pending GAP-010**

The three blockers recorded on 2026-08-24 resolved as follows. Approval is now in place with a named approver and date. The module taxonomy was ratified, making `CLIENT` valid and closing GAP-001. GAP-010 was narrowed but not closed: the Client/Patient identity decision settles that `clinical-rules.md` §21 applies to Client records, while the severity of showing another client's data in a read-only view is still open.

That residual question does not affect AC-001 or AC-002, which concern reaching the Client area and selecting a client. Those two proceed to S1. AC-003 to AC-005 are carried through analysis and coverage design but stop before test cases are written, because GAP-010 determines whether they assert read-only context correctness or a data integrity guarantee — a difference in both assertion strength and defect severity.

Downstream work remains blocked for reasons outside this requirement: no authentication mechanism or synthetic accounts have been supplied, so nothing can be automated or executed. See `aidlc-docs/OPEN-DECISIONS.md`.

Gaps that no longer block this requirement, having moved to `REQ-CLIENT-002`: GAP-007 in its acceptance-criterion aspect, and the authorization detail behind CL-004. GAP-006 (audit) and GAP-008 (session workflow) do not affect AC-001 to AC-005.

See `aidlc-docs/intake/REQ-CLIENT-001/intake-record.md` for the full S0 assessment.