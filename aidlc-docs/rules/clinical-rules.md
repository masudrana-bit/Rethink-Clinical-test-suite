# Clinical E2E Testing Rules

**Version:** 1.0
**Status:** Active
**Scope:** Clinical Application E2E Testing
**Applies To:** AIDLC-generated and manually created clinical tests

---

# 1. Purpose

This document defines the additional rules that MUST be applied when generating and executing E2E tests for the Clinical application.

Clinical workflows require additional controls because incorrect assumptions about clinical behavior can result in incorrect test coverage and misleading test results.

These rules supplement:

```text
aidlc-docs/rules/aidlc-e2e-rules.md
```

If a general E2E rule and a clinical rule conflict, the stricter clinical rule applies.

---

# 2. Fundamental Clinical Principle

The most important rule is:

> AI MAY infer testing needs, but AI MUST NOT infer clinical behavior.

AI can identify that a workflow probably requires negative testing.

AI MUST NOT invent the clinical rule that determines the expected result.

For example:

```text
Valid:
Missing required observation
→ Generate a negative test scenario.
```

Not valid:

```text
Patient score > 50
→ AI decides patient status should become "High Risk"
```

unless that rule exists in an approved source.

---

# 3. Clinical Source of Truth

Expected clinical behavior MUST come from an approved source.

Approved sources MAY include:

1. Approved clinical requirements
2. Approved business rules
3. Approved clinical specifications
4. Approved acceptance criteria
5. Approved clinical decision tables
6. Approved API contracts
7. Approved data rules
8. Approved workflows
9. Approved clinical SME decisions

AI-generated assumptions are NOT an approved source.

---

# 4. Clinical Rule Ambiguity

If a clinical rule is unclear, incomplete, or contradictory, AI MUST NOT choose an interpretation.

The test generation process MUST produce:

```text
CLINICAL RULE REQUIRES CLARIFICATION
```

and identify:

```text
Rule:
<unclear rule>

Problem:
<what is unclear>

Required decision:
<what needs to be confirmed>
```

The test MUST remain blocked if the missing decision affects expected clinical behavior.

---

# 5. Clinical SME Approval

Clinical behavior that requires domain interpretation MUST be reviewed by an appropriate human authority.

Depending on the workflow, this MAY include:

* Clinical SME
* Product owner
* Business analyst
* QA lead
* Engineering lead

AI MUST NOT act as the final authority for clinical decisions.

---

# 6. Patient Data Rules

Automated tests MUST NOT use real patient information.

Never commit or expose:

* Real patient names
* Real addresses
* Real phone numbers
* Real email addresses
* Real medical record numbers
* Real clinical notes
* Real dates of birth
* Real insurance information
* Real clinical identifiers
* Real PHI

Use synthetic or approved masked data.

---

# 7. Test Data Isolation

Each test SHOULD use controlled test data.

Where appropriate:

```text
Test
 ↓
Create isolated synthetic data
 ↓
Execute workflow
 ↓
Validate result
 ↓
Cleanup
```

Tests MUST NOT unintentionally modify shared clinical test data used by other tests.

---

# 8. Patient Identity

When patient identity is relevant, tests MUST verify that the correct patient is being used.

For example:

```text
Search Patient
    ↓
Open Patient
    ↓
Verify patient identity
    ↓
Perform clinical action
```

Do not assume that a patient search result is correct merely because a record was returned.

---

# 9. Clinical Session Rules

If the application uses clinical sessions, tests MUST respect the approved session lifecycle.

Example:

```text
Created
   ↓
In Progress
   ↓
Completed
   ↓
Finalized
```

The exact states MUST come from the approved product specification.

AI MUST NOT invent additional states.

Tests SHOULD cover applicable valid and invalid state transitions.

---

# 10. Observation Rules

If clinical observations are collected, tests SHOULD verify:

* Required observations
* Optional observations
* Valid values
* Invalid values
* Missing values
* Boundary values
* Correct observation ownership
* Correct observation timing
* Correct observation status

However, expected clinical values and validation rules MUST come from approved specifications.

---

# 11. Clinical Calculations

AI MUST NOT invent clinical formulas.

For any calculated clinical value, the test MUST have access to the approved:

```text
Formula
Inputs
Units
Precision
Rounding rule
Boundary behavior
Expected result
```

If any required information is missing:

```text
TEST BLOCKED
```

rather than guessing.

---

# 12. Clinical Enums

Where the application uses structured clinical enums, tests MUST use the approved enum values.

Do not invent values such as:

```text
UNKNOWN
OTHER
NORMAL
HIGH
LOW
```

unless those values are defined by the approved contract or business rule.

---

# 13. Clinical Status

Clinical statuses MUST be validated against the approved lifecycle.

Tests SHOULD verify:

```text
Valid transition
Invalid transition
Required conditions
Transition result
```

Example:

```text
Session in Progress
       ↓
Finalize
       ↓
Completed
```

The exact expected status MUST come from the approved specification.

---

# 14. Mandatory Clinical Fields

If a field is clinically mandatory, the test MUST validate the appropriate behavior when it is missing.

Example:

```text
Mandatory Observation Missing
        ↓
Attempt Finalization
        ↓
Expected validation / rejection
```

The exact validation behavior MUST come from the approved requirement.

---

# 15. Clinical Corrections

If the system supports correction of clinical observations, tests MUST follow the approved correction model.

For example, if the system uses:

```text
Original observation
        ↓
Correction
        ↓
Superseded original
```

the test SHOULD verify the approved correction behavior.

AI MUST NOT assume that existing records should be updated in place if the approved data rules specify an append-and-supersede model.

---

# 16. Audit Requirements

Important clinical actions SHOULD be auditable when required by the product specification.

Potential events include:

* Session creation
* Session finalization
* Observation creation
* Observation correction
* Status change
* Program event
* Authorization-sensitive action

Tests SHOULD verify audit behavior when auditability is explicitly required.

---

# 17. Actor and Attribution

Where the application tracks the actor performing a clinical action, tests SHOULD validate that the action is attributed to the correct user or role.

Example:

```text
Clinician A
    ↓
Creates observation
    ↓
Observation attributed to Clinician A
```

AI MUST NOT assume attribution behavior without an approved requirement.

---

# 18. Role-Based Access

Clinical workflows MUST test applicable authorization boundaries.

Examples:

```text
Authorized clinician
    ↓
Allowed action
```

and:

```text
Unauthorized role
    ↓
Action rejected
```

Where applicable, test:

* Role
* Permission
* Resource ownership
* Action authorization
* Restricted clinical data

---

# 19. Authentication vs Authorization

These MUST be treated separately.

Authentication:

```text
Who are you?
```

Authorization:

```text
What are you allowed to do?
```

A valid login does not automatically mean the user is authorized to perform every clinical operation.

---

# 20. Clinical Data Integrity

Tests SHOULD verify that important clinical data is not unexpectedly:

* Lost
* Duplicated
* Overwritten
* Corrupted
* Associated with the wrong patient
* Associated with the wrong session
* Associated with the wrong program

Data integrity checks MUST follow approved business rules.

---

# 21. Patient-to-Session Association

Where applicable, tests MUST verify:

```text
Patient
   ↓
Clinical Session
   ↓
Observations
```

remain correctly associated.

A clinical observation belonging to Patient A MUST NOT appear under Patient B.

---

# 22. Program Association

If a clinical session belongs to a program, tests SHOULD verify the approved program association.

Example:

```text
Patient
   ↓
Session
   ↓
Program
```

Incorrect program association MUST be treated as a potential data integrity defect.

---

# 23. Clinical Workflow Completeness

Critical clinical workflows SHOULD contain:

### Happy path

```text
Valid user
+
Valid patient
+
Valid data
=
Successful workflow
```

### Validation path

```text
Missing / invalid data
=
Expected validation
```

### Authorization path

```text
Unauthorized actor
=
Expected rejection
```

### State path

```text
Invalid lifecycle action
=
Expected rejection
```

### Recovery path

Where supported:

```text
Failure
 ↓
Correction
 ↓
Retry
 ↓
Successful workflow
```

---

# 24. Clinical Error Messages

AI MUST NOT invent expected error messages.

If the requirement specifies exact text, validate exact text where appropriate.

If only behavior is specified, validate behavior rather than inventing exact wording.

Example:

Requirement:

```text
Session cannot be finalized when mandatory observation is missing.
```

Valid test:

```text
Finalization is prevented.
```

Do not invent:

```text
"Please complete Observation X before continuing."
```

unless that exact message is specified.

---

# 25. Clinical Date and Time

Date/time behavior MUST follow approved application rules.

Where applicable, tests SHOULD consider:

* Time zones
* Date boundaries
* Session dates
* Observation timestamps
* Future dates
* Past dates
* Daylight-saving behavior where relevant
* Server/client time differences

AI MUST NOT invent date/time rules.

---

# 26. Clinical Concurrency

Where multiple users can modify the same clinical record, tests SHOULD consider concurrency when explicitly supported by the product requirements.

Examples:

```text
Clinician A opens session
Clinician B modifies session
Clinician A attempts finalization
```

Expected behavior MUST come from approved requirements.

---

# 27. Clinical Integration Testing

If the Clinical application communicates with external systems, tests SHOULD verify important integration behavior.

Examples:

```text
Clinical UI
   ↓
Clinical API
   ↓
External service
```

or:

```text
Clinical session finalized
   ↓
Program event
   ↓
Downstream system
```

Do not assume downstream behavior without an approved integration contract.

---

# 28. Data Retention

If the product defines retention or deletion behavior, tests MUST follow the approved retention rules.

AI MUST NOT invent:

```text
30 days
90 days
7 years
```

or any other retention period.

The retention period MUST come from an approved source.

---

# 29. Clinical Deletion

Deletion behavior MUST be tested only according to the approved data lifecycle.

If deletion depends on successful durable persistence or another condition, the test MUST reflect that rule.

AI MUST NOT simplify or modify approved data lifecycle behavior for test convenience.

---

# 30. Clinical Audit vs Business Data

Tests SHOULD distinguish between:

```text
Business record
```

and:

```text
Audit/event record
```

A clinical business entity and its lifecycle/audit event MUST NOT automatically be treated as the same data structure unless the approved architecture specifies that relationship.

---

# 31. No Clinical Shortcut Rule

Test automation MUST NOT bypass a clinically significant workflow merely to make the test faster.

For example, do not:

```text
Direct database update
        ↓
Pretend clinician completed workflow
```

when the purpose of the E2E test is to validate the clinician workflow.

Controlled API setup MAY be used when it does not bypass the behavior being tested.

---

# 32. Clinical Negative Testing

For important clinical workflows, AI SHOULD identify applicable failure cases such as:

```text
Missing required data
Invalid data
Unauthorized user
Wrong patient
Wrong session
Invalid state
Duplicate action
Invalid transition
Expired authentication
Unavailable dependency
```

Only scenarios supported by the requirements should be automated as expected behavior.

---

# 33. Clinical Safety Boundary

AI MUST NOT make clinical judgments.

AI MUST NOT decide:

* Whether a patient is clinically safe
* Whether a clinical score is medically appropriate
* Whether treatment is appropriate
* Whether a diagnosis is correct
* Whether a clinical threshold is medically valid
* Whether a clinical workflow is medically acceptable

Those decisions MUST come from approved clinical/product sources.

---

# 34. Clinical Requirement Changes

When a clinical requirement changes:

```text
Requirement changed
        ↓
Clinical rule impact analysis
        ↓
Affected acceptance criteria
        ↓
Affected test cases
        ↓
Affected BDD scenarios
        ↓
Affected automation
```

All impacted tests MUST be reviewed.

AI MUST NOT silently update expected clinical outcomes.

---

# 35. Clinical Test Approval

Tests involving important clinical behavior SHOULD have the following approval where applicable:

```text
AI Generated
      ↓
QA Review
      ↓
Clinical/Product Review
      ↓
Approved
      ↓
Automation
```

The required approval level depends on the risk and business criticality of the workflow.

---

# 36. Clinical Test Evidence

For important workflows, execution evidence SHOULD include:

* Test ID
* Requirement ID
* Environment
* Test data reference
* User/role type
* Execution result
* Screenshot where useful
* Trace/video where useful
* API evidence where relevant
* Failure details where applicable

Evidence MUST NOT expose real PHI or sensitive information.

---

# 37. Clinical Defect Classification

A failure MUST be investigated before classification.

Potential classifications:

```text
CLINICAL_BUSINESS_RULE_DEFECT
FUNCTIONAL_DEFECT
DATA_INTEGRITY_DEFECT
AUTHORIZATION_DEFECT
INTEGRATION_DEFECT
AUTOMATION_DEFECT
TEST_DATA_DEFECT
ENVIRONMENT_DEFECT
REQUIREMENT_GAP
UNKNOWN
```

AI MUST provide evidence for the classification.

---

# 38. Clinical Test Quality Gate

A clinical E2E test MUST NOT be considered ready unless:

```text
[PASS] Approved requirement exists
[PASS] Clinical rules identified
[PASS] Clinical ambiguity resolved
[PASS] Acceptance criteria covered
[PASS] Test data is synthetic
[PASS] Patient/session association validated where applicable
[PASS] Authorization considered where applicable
[PASS] Audit behavior considered where applicable
[PASS] Traceability exists
[PASS] QA reviewed
[PASS] Automation validated
[PASS] Execution completed
```

---

# 39. Final Clinical Principle

The Clinical AIDLC process MUST follow this principle:

```text
AI generates test coverage.
Human-approved clinical rules define expected behavior.
QA validates test quality.
Clinical/Product SMEs validate clinical intent.
Playwright executes the approved workflow.
```

AI MUST never become the source of truth for clinical behavior.

The purpose of AI-DLC is to increase:

```text
Coverage
Consistency
Traceability
Automation speed
Test maintainability
Defect detection
```

without compromising:

```text
Clinical correctness
Data integrity
Patient privacy
Auditability
Business-rule accuracy
```
