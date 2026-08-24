# AIDLC Documentation

Process documentation for generating clinical E2E tests under AIDLC. This directory defines **how** tests are produced, reviewed, and traced. It contains no tests.

## Start here

If you are new to this process, read in this order:

1. `rules/aidlc-e2e-rules.md` — the general rules governing AI-assisted E2E testing.
2. `rules/clinical-rules.md` — the additional clinical controls. Where the two conflict, the clinical rule wins.
3. `workflows/e2e-test-generation-workflow.md` — the stages, gates, and artifacts that put those rules into practice.

The workflow document is the operational centre. Everything else is either an input it consumes or an output it produces.

## Contents

| Path | What it is |
|---|---|
| `OPEN-DECISIONS.md` | Every decision currently blocking the suite, grouped by owner. |
| `rules/aidlc-e2e-rules.md` | General AIDLC E2E rules. Source of truth for process. |
| `rules/clinical-rules.md` | Clinical-specific rules. Stricter; wins on conflict. |
| `workflows/e2e-test-generation-workflow.md` | Stages S0–S11, gates G0–G7, artifact register, status vocabulary. |
| `requirements/requirement-template.md` | The shape an approved requirement must take to enter stage S0. |
| `requirements/module-taxonomy.md` | The seven approved module tokens used in requirement and test case IDs. Ratified 2026-08-24. |
| `requirements/REQ-CLIENT-001.md` | First approved requirement. Client selection and active client context. |
| `requirements/REQ-CLIENT-002.md` | Split from the above. Blocked at S0 by GAP-009. |
| `construction/generate-testcase.md` | Procedure for authoring test cases (stage S4). |
| `construction/generate-bdd.md` | Procedure for authoring BDD scenarios (stage S4). |
| `construction/generate-playwright.md` | Procedure for authoring automation (stage S7). |
| `schemas/traceability.schema.json` | JSON Schema (draft 2020-12) validating the traceability record at stage S10. |

Per-requirement artifact directories are created on first use. Those now populated for `REQ-CLIENT-001`:

| Path | Stage | What it holds |
|---|---|---|
| `intake/REQ-CLIENT-001/` | S0 | Intake record and the signed G0 decision |
| `analysis/REQ-CLIENT-001/` | S1, S2 | Requirement analysis, clinical rule register, conflict register, clarification log, blocked register |
| `design/REQ-CLIENT-001/` | S3 | Coverage matrix, scenario inventory, duplication report |
| `testcases/REQ-CLIENT-001/` | S4 | `TC-CLIENT-001`, `TC-CLIENT-002` |
| `bdd/client/` | S4 | `REQ-CLIENT-001.feature` |
| `testdata/REQ-CLIENT-001/` | S5 | Test data plan and PHI safety attestation |
| `automation/REQ-CLIENT-001/` | S6, S7 | Framework reuse plan with live reconnaissance, and implementation notes |

Still unused: `validation/`, `results/`, `evidence/`, `traceability/`, `change-impact/`. Their contents and owners are listed in the workflow's artifact register.

The scenarios in `bdd/client/REQ-CLIENT-001.feature` are executable, not just documentation: `playwright-bdd` compiles them into Playwright tests, bound to step definitions in `src/steps/`. So the artifact reviewed at Gate G3 is the artifact that runs. Supporting page objects and fixtures live under `src/`; see `tests/README.md`.

## Current status

The process is running. `REQ-CLIENT-001` passed Gate G0 on 2026-08-24, and gates G1, G2, and G3 were signed the same day. Test cases for two of its five acceptance criteria are approved for automation.

**Every open decision is consolidated in `OPEN-DECISIONS.md`**, grouped by owner. Start there rather than assembling the picture from individual documents.

**Done and signed:** workflow, both rules documents, requirement template, all three construction prompts, traceability schema, ratified module taxonomy, and stages S0 through S4 for `REQ-CLIENT-001` AC-001 and AC-002.

**Stages S0 through S7 are complete for AC-001 and AC-002.** Gates G0 through G5 are signed. Reconnaissance against the live application on 2026-08-24 resolved the authentication blocker — `/temp-dev-login` signs in without credentials — and two runnable Playwright tests now exist. They have not been executed; first execution is stage S9.

**Blocking, and not derivable from the rules:**

| Item | Blocks | Needed from |
|---|---|---|
| GAP-010 — severity of a wrong-client read-only view | test cases for AC-003 to AC-005 | Clinical SME |
| GAP-002, GAP-003, GAP-004 | the validation, authorization, and recovery scenario categories, all currently uncovered | Product / Security / QA |
| Environment policy, and whether `/temp-dev-login` is permanent | CI execution; the auth fixture's shelf life | Engineering |
| Clinical lifecycle, enums, role matrix (P-07) | S3, S4 for any session or observation requirement | Clinical SME / Product |

The process documents themselves remain Draft pending ratification at Gate G0, including the C-01 decision recorded in the workflow's conflict register.

## Two rules worth knowing before you contribute

**Nothing is assumed.** Where information is missing, the correct output is a blocking token such as `MISSING INFORMATION` or `CLINICAL RULE REQUIRES CLARIFICATION`, naming exactly what is needed. Filling a gap with a plausible value is a process violation, not a time saving. The full vocabulary is in the workflow, §9.

**AI does not approve.** AI analyzes, generates, classifies, and identifies gaps. Clinical behaviour, requirement interpretation, production readiness, and defect severity are human decisions. Every gate is signed by a person.
