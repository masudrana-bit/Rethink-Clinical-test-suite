# Open Decisions

**Status:** Live register
**Purpose:** Every decision currently blocking the clinical E2E test suite, in one place.

The project is not blocked on effort. All process documentation, tooling, and framework infrastructure that could be derived from the rules alone is complete. What remains are decisions that only people can make, and they are currently scattered across the workflow, two requirements, the taxonomy proposal, the intake record, and the framework README.

This register aggregates them so each owner can see their own list.

---

## Resolved on 2026-08-24

Two of the three headline blockers are closed, by Masud Rana, Sr. QA Automation Engineer.

**Module taxonomy ratified**, with one amendment: Client and Patient are the same entity, so `PATIENT` was merged into `CLIENT`, leaving seven modules. IDs can now be issued, which was the hard stop on every downstream stage. Prerequisite P-06 is resolved and GAP-001 is closed.

**`REQ-CLIENT-001` approved**, Gate G0 passed for AC-001 and AC-002. The same person signed the QA and clinical lines; that is recorded openly in its §2 and tracked as GAP-011 rather than left implicit, on the basis that this requirement covers client selection and read-only context rather than clinical data capture.

Not answered, and still worth noting: the requirement was approved without explicitly characterising it as a regression baseline. Its expected results come from screenshots of the running application, which rank seventh of eight in the §3 source hierarchy. The tests that follow will faithfully detect change but cannot detect a defect that already exists in the current behaviour.

---

Gates G1, G2, and G3 were signed on 2026-08-24. `TC-CLIENT-001` and `TC-CLIENT-002` are approved for automation, and stage S5 has run as far as the sources allow.

---

## Resolved by reconnaissance, 2026-08-24

The authentication blocker that stalled everything from S5 onward is **gone**. `/temp-dev-login` signs in without credentials and lands on `/clients`. No account to provision, no secret to manage.

Two other open items closed with it. Client selection **does not persist** — it is in-memory per page load, so `fullyParallel: true` is safe and no reset step is needed. And the client fixture shape is readable from the switcher itself.

Details in `automation/REQ-CLIENT-001/framework-reuse-plan.md` §2.

---

## The one thing left that blocks S7

**Decide which data mode the suite may run against.**
Owner: Product + QA. Tracked as BLK-010.

The application declares its data source in a banner with three states. On `/clients` it currently reads *"The backend did not return clients for this screen, so example data is shown instead. These are not real clinical records."* On the root route it read *"Showing real data."*

Both approved tests pass identically in either mode, because they assert that selection works rather than that particular clients exist. So a complete backend outage would produce a green suite — a false pass no retry policy catches, because nothing is intermittent.

Three options are set out in `testdata/REQ-CLIENT-001/test-data-plan.md` §5. The recommendation is to tolerate any mode but record it as execution evidence: the suite stays runnable today, and a green run against fallback data is visibly not the same as a green run against real data.

Then **GAP-010**, which releases AC-003 to AC-005 for test case writing.

Two small corrections also surfaced. `BASE_URL` in `.env` and `.env.example` points at `/clinical-ui/`, which redirects to the site root. And the `temp-` in `temp-dev-login` suggests the auth route is not permanent, so the fixture that uses it should stay isolated.

---

## Product / Business

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Accept or reject screenshot-derived expectations as a regression baseline | What the test suite is able to prove | Intake record, Finding 1 |
| GAP-003 | Required behaviour when no client is selected | Negative scenarios for AC-001 and AC-002, currently absent | `REQ-CLIENT-001` §13 |
| GAP-004 | Required behaviour when a selected client is invalid or unavailable | Negative scenarios | `REQ-CLIENT-001` §13 |
| GAP-008 | The Create Clinical Session workflow after client selection | A future session requirement | `REQ-CLIENT-001` §13 |
| GAP-009 | Which clinical actions `REQ-CLIENT-002` covers | Everything in `REQ-CLIENT-002`; it is that requirement's root blocker | `REQ-CLIENT-002` §13 |

## Clinical SME

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| GAP-010 | Is showing another client's data in a read-only view a §21 association failure, or a lesser context error? | Test case writing for AC-003 to AC-005, held at S3; assertion strength and defect severity | `REQ-CLIENT-001` §8 |
| GAP-011 | Is a dedicated Clinical SME required, or is the QA lead sign-off sufficient? | Nothing today; accepted on risk grounds. Revisit for requirements that write clinical data | `REQ-CLIENT-001` §2 |
| GAP-007 | The approved rule defining the client-to-clinical-action association | `REQ-CLIENT-002` AC-001 | Both requirements §13 |
| GAP-006 | Whether client selection and clinical actions must be audited, and what the event records | Audit coverage | Both requirements §13 |
| P-07 | Approved clinical lifecycle, enum values, and role matrix | Stages S3 and S4 for any session or observation requirement | Workflow §3 |
| — | Clinical SME sign-off on `REQ-CLIENT-002` | Its Gate G0 | `REQ-CLIENT-002` §2 |

## Engineering

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| ~~F-04~~ | ~~Authentication mechanism and test accounts~~ | **Resolved** — `/temp-dev-login`, no credentials | `automation/REQ-CLIENT-001/framework-reuse-plan.md` §2 |
| — | Is `/temp-dev-login` permanent, and what replaces it? | The auth fixture's shelf life | `framework-reuse-plan.md` §2 |
| — | Correct `BASE_URL` — `/clinical-ui/` redirects to the site root | Nothing today; a stale value invites confusion | `.env.example` |
| — | Environment policy: is dev the intended target, and does it reset? | CI execution | `tests/README.md` |
| GAP-005 / P-05 | API contract for setup, cleanup, and verification | `src/api/`, test data lifecycle, stage S5 | Both requirements §12.1 |
| — | Test environment policy: which environments are testable, and reset expectations | Data isolation strategy | `tests/README.md` |
| ~~F-01~~ | ~~BDD tooling: `playwright-bdd`, `@cucumber/cucumber`, or none~~ | **Resolved 2026-08-24** — `playwright-bdd`, chosen to keep the Playwright runner, the once-only sign-in, and the trace/video evidence | `tests/README.md` |
| ~~F-02~~ | ~~Whether Gherkin is executable, or a reviewed specification only~~ | **Resolved 2026-08-24** — executable. `features/**/*.feature` compiles to Playwright tests; an unmatched step fails `bddgen` | `tests/README.md` |
| F-03 | Browser coverage beyond Chromium | Config scope | `tests/README.md` |
| F-05 | Test data lifecycle: API seeding, UI seeding, or a fixture pool | Stage S5 | `tests/README.md` |
| F-06 | Linter and formatter — none configured, so the lint half of S8 cannot run | Nothing today; the S8 check is reported NOT RUN for every requirement until it exists | `validation/REQ-CLIENT-001/static-validation-report.md` §4 |

## QA

| ID | Decision needed | Blocks | Recorded in |
|---|---|---|---|
| — | Ratify the workflow and its supporting documents at Gate G0 | Formal process adoption; everything currently operates as Draft | Workflow §13 |
| GAP-002 | Approved authorization matrix, jointly with Security | Permission scenarios, currently absent from coverage | Both requirements §13 |
| — | Whether authentication and authorization need their own module | Taxonomy completeness; the ratified taxonomy has no home for either | `requirements/module-taxonomy.md` |
| C-02 | Correct the stale path reference in `clinical-rules.md` §1 | Nothing functionally; tooling cannot resolve the link | Workflow §4 |

---

## Not blocked

For contrast, these are done and need review rather than decisions:

- Workflow, rules, requirement template, three construction prompts, docs index
- Traceability JSON Schema, validated against a real validator
- Traceability validator script, enforcing referential integrity and the §25 flaky rule
- Playwright and TypeScript configuration, typechecking clean
- `REQ-CLIENT-001` reformatted, assessed at S0, split, and approved
- `REQ-CLIENT-002` created and assessed as deeply blocked
- Module taxonomy ratified
- S1 analysis, S3 coverage design, and S4 test cases and BDD scenarios for AC-001 and AC-002

## Deliberately not built

No Page Objects, fixtures, authentication utilities, API clients, or Playwright tests exist.

Producing them would require inventing selectors, an authentication flow, and API endpoints for an application this repository has no contract for and no access to. `aidlc-e2e-rules.md` §4 prohibits exactly that. A plausible-looking stub is worse than an absent one, because it reads as a decision that has already been made.

The test cases and BDD scenarios that now exist stop deliberately at the boundary of what the approved sources support: business-level steps and observable outcomes, with no selector, endpoint, or credential named anywhere.
