# Construction Prompt — Generate Playwright Automation

**Version:** 1.0
**Status:** Draft — pending approval at Gate G0
**Workflow stage:** S7 (Automation Construction)
**Gates that must have passed:** G3 (Behaviour Specification), G4 (Test Data Safety), G5 (Reuse Plan)
**Gate this feeds:** G6 (Code Quality)
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`

> **Currently not runnable.** Prerequisite P-04 is only partially closed. Framework infrastructure exists (`playwright.config.ts`, `tsconfig.json`, conventions in `tests/README.md`), but there are no fixtures, Page Objects, API clients, or authentication utilities to inspect or reuse, so stage S6 cannot produce a meaningful reuse plan and G5 cannot be signed. Complete and approve the framework before using this prompt.

---

## 1. Preconditions

Stop and report if any of these is false.

```text
[  ] G3 signed — BDD scenarios and test cases approved
[  ] G4 signed — test data plan approved, PHI attestation recorded
[  ] G5 signed — framework reuse plan approved
[  ] Target test case is not blocked
[  ] Framework exists and its conventions are documented
```

Generating automation before G3 violates `clinical-rules.md` §35, which places clinical and product approval before automation, not after it.

## 2. Mandatory reconnaissance

`aidlc-e2e-rules.md` §22 requires inspection before generation. Complete this **before writing any code**, and record the findings in the implementation notes.

```text
[  ] Read the requirement
[  ] Read the applicable clinical rules
[  ] Read the BDD scenario and the test case
[  ] Inspect the framework: config, project structure, naming conventions
[  ] Identify existing fixtures
[  ] Identify existing Page Objects and components
[  ] Identify existing API clients
[  ] Identify existing authentication utilities
[  ] Identify existing test data utilities and factories
[  ] Confirm against the reuse plan what is reused and what is genuinely new
```

Creating a second implementation of something that already exists is a defect, not a shortcut. If reconnaissance shows the reuse plan was wrong, return to S6 rather than improvising.

## 3. Inputs

| Input | Source |
|---|---|
| Approved test case | `aidlc-docs/testcases/<REQ-ID>/TC-<MODULE>-<NNN>.md` |
| Approved BDD scenario | `aidlc-docs/bdd/<module>/<REQ-ID>.feature` |
| Approved test data plan | `aidlc-docs/testdata/<REQ-ID>/test-data-plan.md` |
| Approved reuse plan | `aidlc-docs/automation/<REQ-ID>/framework-reuse-plan.md` |

## 4. Implementation rules

### 4.1 Language and structure
TypeScript only. Follow the existing project architecture and coding conventions rather than introducing a personal style. Produce the smallest maintainable change that implements the approved specification.

### 4.2 Locators
Use the preference order of `aidlc-e2e-rules.md` §15:

```text
1. Existing test IDs
2. Accessible roles
3. Accessible labels
4. Stable semantic attributes
5. Text, when stable and appropriate
6. CSS selectors, when necessary
7. XPath, only when nothing better is stable
```

Avoid `nth-child()` and deeply nested selectors unless there is genuinely no reliable alternative, and document the reason when there is not. If the application lacks a stable hook, the correct fix is usually to request a test ID in the application rather than to write a brittle selector.

### 4.3 Synchronization
Never use `page.waitForTimeout(...)` without a documented technical reason (`aidlc-e2e-rules.md` §16). Synchronize on application state: wait for a locator, a response, a URL, a load state, or an expected UI condition. A test that passes because a sleep happened to be long enough is a flaky test that has not failed yet.

### 4.4 Independence
Each test creates the state it needs and removes it afterwards. No test may depend on another having run, and no test may depend on execution order (`aidlc-e2e-rules.md` §17). Tests must be repeatable against the same environment without manual reset.

### 4.5 Test data
Use only the synthetic data defined in the approved plan. Generate unique identifiers per run where collisions are possible. Never commit credentials, tokens, or secrets, and never log them (`aidlc-e2e-rules.md` §18, §19). Never introduce real patient data in any form, including in comments and fixtures.

### 4.6 Authentication
Use the project's approved authentication mechanism through the shared fixture or utility. Do not hardcode credentials, expose tokens, print secrets, or create a bypass (`aidlc-e2e-rules.md` §19).

### 4.7 API usage
API calls may be used for setup, cleanup, authentication, state preparation, and controlled verification. They must not replace the UI workflow that the test exists to validate (`aidlc-e2e-rules.md` §20).

The clinical no-shortcut rule is stricter and governs here: automation must not bypass a clinically significant workflow to save time (`clinical-rules.md` §31). If the test exists to prove that a clinician can complete a workflow through the UI, that workflow runs through the UI.

### 4.8 Database validation
Assert database state only where persistence integrity is explicitly part of the requirement. Otherwise assert the user-visible business outcome (`aidlc-e2e-rules.md` §21).

### 4.9 Traceability
Carry `@REQ-<MODULE>-<NNN>` and `@TC-<MODULE>-<NNN>` into test titles or tags so execution reports can be linked back automatically at S10. An automated test that cannot be traced to a requirement is not production-ready (`aidlc-e2e-rules.md` §5).

### 4.10 Assertions
Assert the business outcome the test case specifies, no more and no less. Do not add incidental assertions that were not reviewed at G3 — they change what the test means without approval. Assert exact error text only where the requirement specifies exact text (`clinical-rules.md` §24).

## 5. Hard constraints

```text
MUST NOT begin before G3, G4, and G5 are signed
MUST NOT duplicate existing framework infrastructure
MUST NOT introduce behaviour not present in the approved test case
MUST NOT use arbitrary waits without documented justification
MUST NOT hardcode credentials, tokens, or secrets
MUST NOT use real patient data anywhere, including comments and fixtures
MUST NOT bypass a clinically significant workflow for speed
MUST NOT modify the approved expected outcome to make a test pass
MUST NOT disable, skip, or weaken a test to achieve a green run
MUST NOT add retries to mask non-determinism
```

The last three matter most. When automation disagrees with the specification, the specification wins and the disagreement goes back through S2 or S4. Silently adjusting an expectation to match observed behaviour converts a potential product defect into a permanently invisible one.

## 6. Static validation targets

The S8 checks that this code must survive. Anticipate them rather than discovering them at G6.

```text
[  ] TypeScript compiles with no errors
[  ] Lint and formatting clean
[  ] No page.waitForTimeout without a documented reason
[  ] No banned selector patterns
[  ] No hardcoded credentials or secrets
[  ] No PHI-shaped literals
[  ] Requirement and test case tags present on every test
[  ] No skipped or focused tests committed
[  ] No unused new framework components introduced
```

## 7. Self-check before handing to G6

```text
[  ] Reconnaissance completed and recorded
[  ] Every approved test case in scope is implemented, or explicitly deferred
[  ] Implementation matches the approved specification exactly
[  ] Reuse plan followed; new components justified in the notes
[  ] Test passes repeatedly from a clean state, in isolation and in the suite
[  ] Cleanup verified — no residue left in the environment
[  ] Traceability tags present
[  ] Static validation targets all satisfied locally
```

Running a test once and seeing green is not evidence that it is deterministic. Run it in isolation and within the full suite before handing it over.

## 8. Outputs

| Artifact | Path |
|---|---|
| Playwright specs and step definitions | framework path, to be defined once P-04 is closed |
| New or modified Page Objects, fixtures, utilities | framework path, per the reuse plan |
| Implementation notes, including reconnaissance findings | `aidlc-docs/automation/<REQ-ID>/implementation-notes.md` |

Hand off to S8 for static validation and review. AI-generated code is never presumed correct (`aidlc-e2e-rules.md` §23).
