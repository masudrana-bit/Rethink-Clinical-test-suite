# AIDLC E2E Testing Rules

**Version:** 1.0
**Status:** Active
**Scope:** Clinical Project E2E Test Generation and Automation
**Framework:** Playwright + TypeScript + BDD/Cucumber
**Process:** AIDLC

---

## 1. Purpose

This document defines the mandatory rules that govern how AI is used to analyze requirements, generate E2E test scenarios, generate test cases, create Playwright automation, validate tests, and maintain test traceability.

The objective is to ensure that AI-generated E2E tests are:

* Traceable
* Deterministic
* Reviewable
* Maintainable
* Business-rule aligned
* Clinically safe
* Reusable
* Executable
* Auditable

AI is an assistant in the testing lifecycle. AI is not the authority for product behavior, clinical behavior, or business decisions.

---

# 2. Core Principle

The AIDLC E2E process MUST follow:

```text
Approved Requirement
        ↓
Acceptance Criteria
        ↓
Business Rules
        ↓
Workflow
        ↓
BDD Scenario
        ↓
Test Case
        ↓
Automation
        ↓
Execution
        ↓
Evidence
        ↓
Result / Feedback
```

AI MUST NOT bypass these stages unless an explicit exception has been approved.

---

# 3. Source of Truth

The following priority order MUST be used when determining expected system behavior:

1. Approved clinical/business rules
2. Approved requirements
3. Approved acceptance criteria
4. Approved API contracts
5. Approved UX/UI specifications
6. Approved architecture/data rules
7. Existing implementation behavior
8. Existing automated tests

Lower-priority sources MUST NOT override higher-priority sources.

If sources conflict, AI MUST report the conflict instead of choosing an interpretation.

---

# 4. No Assumption Rule

AI MUST NOT invent:

* Requirements
* Acceptance criteria
* API endpoints
* API fields
* Database behavior
* Clinical rules
* User permissions
* Expected error messages
* Workflow steps
* Business calculations
* Status transitions
* Test data values
* External integrations

If required information is missing, AI MUST report:

```text
MISSING INFORMATION
```

and identify exactly what information is required.

AI MUST NOT silently make assumptions.

---

# 5. Requirement Traceability

Every E2E test MUST have a requirement reference.

Minimum traceability:

```text
Requirement
    ↓
Test Case
    ↓
BDD Scenario
    ↓
Automation
```

Recommended complete traceability:

```text
Requirement
    ↓
Acceptance Criterion
    ↓
Test Case
    ↓
BDD Scenario
    ↓
Playwright Test
    ↓
Execution
    ↓
Result
```

A test without a requirement reference MUST NOT be considered production-ready.

---

# 6. Acceptance Criteria Coverage

Every acceptance criterion MUST be covered by at least one test scenario.

AI MUST identify:

* Covered acceptance criteria
* Partially covered criteria
* Uncovered criteria

Example:

```text
AC-001 → TC-001
AC-002 → TC-002
AC-003 → TC-003, TC-004
AC-004 → NOT COVERED
```

The AI MUST NOT claim 100% coverage when an acceptance criterion is not covered.

---

# 7. Test Scenario Generation

For each applicable requirement, AI SHOULD evaluate:

### Positive scenarios

Validate the expected successful workflow.

### Negative scenarios

Validate invalid actions and rejected workflows.

### Boundary scenarios

Validate important minimum, maximum, empty, and boundary conditions.

### Permission scenarios

Validate applicable role/access restrictions.

### State-transition scenarios

Validate important workflow states.

### Integration scenarios

Validate important interactions between UI, API, and dependent systems.

AI MUST NOT generate unnecessary scenarios solely to increase test count.

The objective is meaningful coverage, not maximum test quantity.

---

# 8. E2E Test Definition

An E2E test SHOULD validate a meaningful business workflow across the relevant application layers.

Preferred:

```text
User
 ↓
UI
 ↓
Application
 ↓
API
 ↓
Business Logic
 ↓
Persistence
 ↓
User-visible Result
```

An API-only test MUST NOT be labeled as an E2E UI test.

A unit test MUST NOT be labeled as an E2E test.

---

# 9. BDD Rules

BDD scenarios MUST describe business behavior rather than implementation details.

Preferred:

```gherkin
When the clinician finalizes the session
Then the session should be marked as completed
```

Avoid:

```gherkin
When the user clicks the button with CSS selector ".btn-primary"
Then the POST endpoint should return 200
```

Implementation details belong in step definitions and automation code.

BDD scenarios MUST be readable by:

* QA
* Developers
* Product owners
* Business stakeholders
* Clinical SMEs where applicable

---

# 10. BDD Scenario Structure

Scenarios SHOULD follow:

```gherkin
Given <precondition>
And <additional precondition>

When <business action>
And <additional action>

Then <expected business outcome>
And <additional outcome>
```

Scenarios SHOULD remain focused on one business behavior.

Avoid excessively large scenarios containing unrelated workflows.

---

# 11. Test Case Rules

Each test case MUST contain, where applicable:

* Test Case ID
* Requirement ID
* Scenario
* Objective
* Preconditions
* Test Data
* Steps
* Expected Results
* Priority
* Test Type
* Traceability
* Automation Status

Test cases MUST be independent enough to execute reliably.

---

# 12. Test Case IDs

Test IDs MUST be deterministic.

Recommended format:

```text
TC-<MODULE>-<NUMBER>
```

Example:

```text
TC-SESSION-001
TC-SESSION-002
TC-OBSERVATION-001
TC-PATIENT-001
```

Requirement IDs SHOULD use:

```text
REQ-<MODULE>-<NUMBER>
```

Example:

```text
REQ-SESSION-001
```

---

# 13. Priority Rules

Use:

```text
P0 = Critical
P1 = High
P2 = Medium
P3 = Low
```

P0 tests SHOULD cover:

* Critical clinical workflows
* Authentication
* Core patient workflows
* Critical session workflows
* Data integrity
* Important authorization rules
* High-risk business processes

---

# 14. Playwright Automation Rules

Generated Playwright code MUST:

* Use TypeScript
* Follow the existing project architecture
* Reuse existing fixtures
* Reuse existing Page Objects
* Reuse existing components
* Reuse existing API clients
* Reuse existing authentication utilities
* Follow existing coding conventions

AI MUST inspect the existing framework before creating new framework components.

---

# 15. Locator Rules

Preferred locator order:

1. Existing test IDs
2. Accessible roles
3. Accessible labels
4. Stable semantic attributes
5. Text when stable and appropriate
6. CSS selectors when necessary
7. XPath only when no better stable locator exists

AI MUST NOT introduce brittle selectors unnecessarily.

Avoid:

```text
nth-child()
```

and deeply nested selectors unless there is no reliable alternative.

---

# 16. Wait Rules

AI MUST NOT use arbitrary waits such as:

```typescript
page.waitForTimeout(...)
```

unless there is a documented technical reason.

Prefer:

```text
wait for locator
wait for response
wait for URL
wait for state
wait for expected UI condition
```

Tests MUST synchronize with application behavior rather than elapsed time.

---

# 17. Test Independence

Tests SHOULD NOT depend on execution order.

Avoid:

```text
Test 1 creates patient
Test 2 assumes patient from Test 1 exists
Test 3 assumes session from Test 2 exists
```

Prefer controlled setup:

```text
Test setup
    ↓
Required data
    ↓
Test
    ↓
Cleanup
```

Tests MUST be repeatable.

---

# 18. Test Data

Test data MUST be:

* Deterministic
* Synthetic
* Isolated
* Reusable where appropriate
* Environment-safe

Real patient data MUST NOT be used.

Test data MUST NOT contain real PHI.

Sensitive credentials MUST NOT be committed to the repository.

---

# 19. Authentication

Authentication MUST use the project's approved authentication mechanism.

AI MUST NOT:

* Hardcode credentials
* Commit passwords
* Expose tokens
* Print authentication secrets
* Create unauthorized bypasses

Authentication setup SHOULD be centralized through fixtures or approved utilities.

---

# 20. API Usage in E2E Tests

API calls MAY be used for:

* Test data setup
* Test data cleanup
* Authentication setup
* State preparation
* Controlled verification

API calls MUST NOT replace the UI workflow when the purpose of the test is UI E2E validation.

Example:

```text
API → create test patient
UI → clinician creates session
UI → verify session
```

is acceptable.

---

# 21. Database Validation

Database validation SHOULD only be used when required by the test objective.

Do not validate implementation details unnecessarily.

Prefer:

```text
User-visible business outcome
```

over:

```text
Internal database implementation detail
```

unless persistence integrity is explicitly part of the requirement.

---

# 22. AI Code Generation Rules

Before generating automation, AI MUST:

1. Read the requirement.
2. Read applicable business rules.
3. Read the BDD scenario.
4. Inspect the existing automation framework.
5. Identify reusable components.
6. Identify existing fixtures.
7. Identify existing test data utilities.
8. Generate the smallest maintainable change.

AI MUST NOT create duplicate framework infrastructure when an existing implementation can be reused.

---

# 23. Generated Code Review

AI-generated automation MUST go through:

```text
AI Generation
      ↓
Static Validation
      ↓
QA Review
      ↓
Test Execution
      ↓
Code Review
      ↓
Merge
```

AI-generated code MUST NOT automatically be considered correct.

---

# 24. Failure Classification

A failed E2E test MUST be classified before reporting a product defect.

Possible categories:

```text
PRODUCT_DEFECT
TEST_DEFECT
AUTOMATION_DEFECT
TEST_DATA_FAILURE
ENVIRONMENT_FAILURE
INTEGRATION_FAILURE
REQUIREMENT_GAP
UNKNOWN
```

AI MUST provide evidence supporting the classification.

---

# 25. Flaky Test Rules

A test MUST NOT be repeatedly rerun until it passes and then reported as passed.

If a test behaves inconsistently, classify it as:

```text
FLAKY
```

and investigate the cause.

Potential causes include:

* Race conditions
* Poor synchronization
* Shared data
* Environment instability
* Network instability
* Application defects

---

# 26. Test Modification Rules

When a requirement changes, AI MUST identify impacted tests.

The impact analysis SHOULD determine:

```text
Requirement changed
        ↓
Affected acceptance criteria
        ↓
Affected test cases
        ↓
Affected BDD scenarios
        ↓
Affected automation
```

AI SHOULD modify only impacted tests.

Do not regenerate the entire test suite unnecessarily.

---

# 27. Duplicate Test Prevention

Before creating a new test, AI MUST check whether an equivalent test already exists.

If an existing test provides sufficient coverage:

```text
REUSE EXISTING TEST
```

If partial coverage exists:

```text
EXTEND EXISTING TEST
```

Only create a new test when additional coverage is required.

---

# 28. Test Quality Gate

A generated test is production-ready only when:

```text
[PASS] Requirement exists
[PASS] Requirement is approved
[PASS] Acceptance criteria identified
[PASS] Business rules identified
[PASS] Scenario generated
[PASS] Traceability exists
[PASS] QA reviewed
[PASS] Automation generated
[PASS] Static validation passed
[PASS] Test executed
[PASS] Result classified
```

Any blocking failure MUST prevent promotion to the next stage.

---

# 29. AI Uncertainty Rule

When AI is uncertain, it MUST say so.

Allowed:

```text
NOT SPECIFIED
NEEDS SME CONFIRMATION
CONFLICTING REQUIREMENTS
MISSING API CONTRACT
MISSING TEST DATA DEFINITION
```

Not allowed:

```text
AI assumes expected behavior.
```

---

# 30. Human Approval Rule

AI MAY:

* Analyze
* Suggest
* Generate
* Refactor
* Classify
* Identify gaps
* Generate coverage

AI MUST NOT independently approve:

* Clinical business rules
* Clinical expected behavior
* Requirement interpretation
* Production readiness
* Critical defect severity
* Final test strategy

Human QA/Product/Clinical SME approval remains authoritative where applicable.

---

# 31. Definition of Done

An E2E test is considered complete when:

```text
Requirement
    ↓
Acceptance Criteria
    ↓
Test Case
    ↓
BDD Scenario
    ↓
Playwright Automation
    ↓
Execution
    ↓
Evidence
    ↓
Result
```

are all traceable and validated.

---

# 32. Governing Principle

The AIDLC E2E process MUST optimize for:

```text
Correctness
    >
Coverage
    >
Maintainability
    >
Automation Speed
```

AI-generated test quantity is not a measure of testing quality.

The objective is to create the smallest set of reliable, traceable, high-value E2E tests that provide meaningful confidence in the clinical workflow.
