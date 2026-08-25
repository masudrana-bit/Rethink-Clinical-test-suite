# Construction Prompt — Generate BDD Scenarios

**Version:** 1.0
**Status:** Draft — pending approval at Gate G0
**Workflow stage:** S4 (Behaviour Specification)
**Gate that must have passed:** G2 (Coverage Design)
**Gate this feeds:** G3 (Behaviour Specification) — the `Approved → Automation` boundary
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`

Per decision C-01 in the workflow, BDD scenarios and test cases are **co-produced** in stage S4 and reviewed together at G3. Run this prompt alongside `generate-testcase.md`.

---

## 1. Audience test

A scenario passes only if it is readable by QA, developers, product owners, business stakeholders, and clinical SMEs (`aidlc-e2e-rules.md` §9). Before writing any line, ask whether a clinical SME with no knowledge of the UI could read it and confirm whether it describes correct clinical behaviour. If not, rewrite it.

This is the single most useful check in this document. A scenario that only an automation engineer can evaluate has failed its purpose, because the people who can confirm the behaviour is right will not be able to review it.

## 2. Preconditions

```text
[  ] Gate G2 signed — scenario inventory approved
[  ] Clinical rule register complete, every entry cited
[  ] No open blocker with blocking=true affecting this requirement
```

## 3. Inputs

| Input | Source |
|---|---|
| Approved scenario inventory | `aidlc-docs/design/<REQ-ID>/scenario-inventory.md` |
| Approved requirement and acceptance criteria | `aidlc-docs/requirements/REQ-<MODULE>-<NNN>.md` |
| Clinical rule register | `aidlc-docs/analysis/<REQ-ID>/clinical-rule-register.md` |
| Co-produced test cases | `aidlc-docs/testcases/<REQ-ID>/` |

## 4. Structure

Write one feature file per requirement at `features/<module>/<REQ-ID>.feature`.

```gherkin
@REQ-<MODULE>-<NNN>
Feature: <business capability in one line>

  <One or two sentences of business context. State the actor and the value.>

  Background:
    Given <only preconditions shared by every scenario in this file>

  @TC-<MODULE>-<NNN> @P0 @positive
  Scenario: <one business behaviour, stated as an outcome>
    Given <precondition>
    And <additional precondition>
    When <business action>
    Then <expected business outcome>
    And <additional outcome>
```

Follow the Given/When/Then shape of `aidlc-e2e-rules.md` §10, keeping each scenario focused on a single business behaviour.

## 5. Tags

Tags carry traceability from the feature file into execution reports, so they are mandatory, not decorative.

| Tag | Purpose |
|---|---|
| `@REQ-<MODULE>-<NNN>` | at feature level; links to the requirement |
| `@TC-<MODULE>-<NNN>` | at scenario level; links to the co-produced test case |
| `@P0`–`@P3` | priority, matching the test case |
| `@positive` `@negative` `@boundary` `@permission` `@state` `@integration` | test type, matching the test case |
| `@blocked` | scenario is written but blocked; must not be automated |

A scenario with no `@TC-` tag cannot be traced and will fail G3.

## 6. Language rules

Write **declaratively** — state what happens in business terms, not which controls are operated.

Acceptable:

```gherkin
When the clinician finalizes the session
Then the session should be marked as completed
```

Not acceptable:

```gherkin
When the user clicks the button with CSS selector ".btn-primary"
Then the POST endpoint should return 200
```

Specific prohibitions:

```text
MUST NOT reference selectors, element IDs, or CSS classes
MUST NOT reference URLs, endpoints, HTTP verbs, or status codes
MUST NOT reference database tables, columns, or queries
MUST NOT reference page objects, fixtures, or any framework concept
MUST NOT describe waiting, timing, retries, or sleeps
MUST NOT include real patient data
MUST NOT invent an error message, status, enum value, or threshold
```

Implementation detail belongs in step definitions, not in the scenario (`aidlc-e2e-rules.md` §9).

## 7. Writing guidance

- **One behaviour per scenario.** If `Then` asserts two unrelated outcomes, split the scenario.
- **Keep `When` to a single action** where possible. A scenario with five `When` steps is usually several scenarios.
- **Avoid conjunctions inside a step.** A step containing "and" that joins two actions should be two steps.
- **Name the actor by role**, not by identity — the role is what carries the authorization meaning.
- **State outcomes as observable facts.** "Then the session should be marked as completed" is observable; "Then the system processes correctly" is not.
- **Use `Scenario Outline`** only when the same behaviour genuinely repeats across values, and only with approved values. Do not use it to inflate the scenario count.
- **Keep `Background` minimal.** If a precondition applies to only some scenarios, it belongs in those scenarios.
- **Reuse existing step phrasing** wherever an equivalent step already exists in `features/`. Gratuitous rephrasing of an existing step multiplies step definitions for no benefit.

## 8. Clinical language checks

```text
[  ] Every state name used appears in the approved lifecycle model
[  ] Every enum value used appears in the approved contract
[  ] Every asserted outcome traces to a cited clinical rule or acceptance criterion
[  ] Error assertions state behaviour unless exact text is specified (clinical-rules.md §24)
[  ] Patient identity is established where the behaviour depends on it (§8)
[  ] Authorization scenarios name the role and the expected rejection (§18)
[  ] No clinical judgment is expressed that is not present in an approved source (§33)
```

## 9. Self-check before handing to G3

```text
[  ] One feature file per requirement, correctly named and tagged
[  ] Every approved scenario in the inventory is represented
[  ] Every scenario has a @TC- tag matching a real test case
[  ] Every scenario asserts exactly one business behaviour
[  ] No implementation detail anywhere in the file
[  ] A clinical SME could review the file without technical help
[  ] No invented values
[  ] Blocked scenarios are tagged @blocked and listed in the blocker register
```

## 10. Outputs

| Artifact | Path |
|---|---|
| Feature files | `features/<module>/<REQ-ID>.feature` |
| Blocker entries | `aidlc-docs/analysis/<REQ-ID>/blocked-register.md` |

Hand off to G3 together with the test cases. No automation may begin until G3 is signed.
