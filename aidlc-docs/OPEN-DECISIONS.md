# Open Decisions

**Status:** Live register
**Purpose:** Every decision currently blocking the clinical E2E test suite, in one place.

The project is not blocked on effort. All process documentation, tooling, and framework infrastructure that could be derived from the rules alone is complete. What remains are decisions that only people can make, and they are currently scattered across the workflow, two requirements, the taxonomy proposal, the intake record, and the framework README.

This register aggregates them so each owner can see their own list.

---

## If you answer only three things

These three unblock the most, in this order.

**1. Ratify the module taxonomy, and say whether Client and Patient are the same entity.**
Owner: Product + Clinical SME. Without approved module tokens, no requirement or test case ID can be issued at all, so every downstream stage is stalled. A proposal is ready at `requirements/module-taxonomy.md`. The Client/Patient question is bundled here because it changes whether one module or two is correct, and module tokens are effectively permanent once IDs exist.

**2. Approve REQ-CLIENT-001 — and decide what kind of approval it is.**
Owner: Product + Clinical SME. Its five acceptance criteria are testable and its expected results are all sourced. But those sources are screenshots of the running application, which rank seventh of eight in the §3 hierarchy. Tests built on them assert what the application currently does, not what it should do: they detect change, not defects. That may be exactly what you want as a regression baseline, but it should be approved as such deliberately rather than by default.

**3. Provide the authentication mechanism and synthetic test accounts.**
Owner: Engineering + Product. Nothing can execute against the application without this, no matter how much specification exists. It also unblocks the framework's fixture layer, which is the largest remaining piece of automation work.

---

## Product / Business

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| P-06 | Ratify the module taxonomy | All ID assignment; stage S0 in practice | `requirements/module-taxonomy.md` |
| — | Approve `REQ-CLIENT-001`, naming approver and date | Gate G0, and everything after it | `REQ-CLIENT-001` §2 |
| — | Accept or reject screenshot-derived expectations as a regression baseline | What the test suite is able to prove | Intake record, Finding 1 |
| — | Confirm criticality `P1` for `REQ-CLIENT-001` | Test priority assignment | `REQ-CLIENT-001` §3 |
| GAP-003 | Required behaviour when no client is selected | Negative scenarios | `REQ-CLIENT-001` §13 |
| GAP-004 | Required behaviour when a selected client is invalid or unavailable | Negative scenarios | `REQ-CLIENT-001` §13 |
| GAP-008 | The Create Clinical Session workflow after client selection | A future session requirement | `REQ-CLIENT-001` §13 |
| GAP-009 | Which clinical actions `REQ-CLIENT-002` covers | Everything in `REQ-CLIENT-002`; it is that requirement's root blocker | `REQ-CLIENT-002` §13 |

## Clinical SME

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Are `CLIENT` and `PATIENT` the same entity? | Module structure, and every §21 association assertion | `requirements/module-taxonomy.md` |
| GAP-010 | Does `clinical-rules.md` §21 data association govern AC-003 to AC-005, or only clinical actions? | Whether those criteria assert context correctness or data integrity; also whether two-client test data is mandatory | `REQ-CLIENT-001` §8 |
| GAP-007 | The approved rule defining the client-to-clinical-action association | `REQ-CLIENT-002` AC-001 | Both requirements §13 |
| GAP-006 | Whether client selection and clinical actions must be audited, and what the event records | Audit coverage | Both requirements §13 |
| P-07 | Approved clinical lifecycle, enum values, and role matrix | Stages S3 and S4 for any session or observation requirement | Workflow §3 |
| — | Clinical SME sign-off on `REQ-CLIENT-001` and `REQ-CLIENT-002` | Gate G0 | Both requirements §2 |

## Engineering

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| F-04 | Authentication mechanism, and provisioned synthetic test accounts with roles | The fixture layer; all execution | `tests/README.md` |
| GAP-005 / P-05 | API contract for setup, cleanup, and verification | `src/api/`, test data lifecycle, stage S5 | Both requirements §12.1 |
| — | Test environment policy: which environments are testable, and reset expectations | Data isolation strategy | `tests/README.md` |
| F-01 | BDD tooling: `playwright-bdd`, `@cucumber/cucumber`, or none | Whether `features/` exists and how steps bind | `tests/README.md` |
| F-02 | Whether Gherkin is executable, or a reviewed specification only | Maintenance cost versus automated spec-to-test binding | `tests/README.md` |
| F-03 | Browser coverage beyond Chromium | Config scope | `tests/README.md` |
| F-05 | Test data lifecycle: API seeding, UI seeding, or a fixture pool | Stage S5 | `tests/README.md` |

## QA

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Ratify the workflow and its supporting documents at Gate G0 | Formal process adoption; everything currently operates as Draft | Workflow §13 |
| GAP-002 | Approved authorization matrix, jointly with Security | Permission scenarios | Both requirements §13 |
| — | Whether authentication and authorization need their own module | Taxonomy completeness | `requirements/module-taxonomy.md` |
| C-02 | Correct the stale path reference in `clinical-rules.md` §1 | Nothing functionally; tooling cannot resolve the link | Workflow §4 |

---

## Not blocked

For contrast, these are done and need review rather than decisions:

- Workflow, rules, requirement template, three construction prompts, docs index
- Traceability JSON Schema, validated against a real validator
- Traceability validator script, enforcing referential integrity and the §25 flaky rule
- Playwright and TypeScript configuration, typechecking clean
- `REQ-CLIENT-001` reformatted, assessed at S0, and split
- `REQ-CLIENT-002` created and assessed as deeply blocked
- Module taxonomy proposal

## Deliberately not built

No Page Objects, fixtures, authentication utilities, API clients, test cases, BDD scenarios, or Playwright tests exist.

Producing them would require inventing selectors, an authentication flow, API endpoints, and expected clinical outcomes for an application this repository has no contract for and no access to. `aidlc-e2e-rules.md` §4 prohibits exactly that, and `clinical-rules.md` §2 draws the line at inferring clinical behaviour. A plausible-looking stub is worse than an absent one, because it reads as a decision that has already been made.

Each becomes possible as the decisions above are answered.
