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
| `requirements/module-taxonomy.md` | Candidate module tokens for requirement and test case IDs. Proposal, not approved. |
| `construction/generate-testcase.md` | Procedure for authoring test cases (stage S4). |
| `construction/generate-bdd.md` | Procedure for authoring BDD scenarios (stage S4). |
| `construction/generate-playwright.md` | Procedure for authoring automation (stage S7). |
| `schemas/traceability.schema.json` | JSON Schema (draft 2020-12) validating the traceability record at stage S10. |

Directories for per-requirement artifacts — `analysis/`, `design/`, `bdd/`, `testcases/`, `testdata/`, `automation/`, `validation/`, `results/`, `evidence/`, `traceability/`, `change-impact/` — are created on first use. Their contents and owners are listed in the workflow's artifact register.

## Current status

The process documentation is complete. The project inputs it needs are not.

**Every open decision is consolidated in `OPEN-DECISIONS.md`**, grouped by owner. Start there rather than assembling the picture from individual documents.

**Ready:** workflow, both rules documents, requirement template, all three construction prompts, traceability schema.

**Blocking, and not derivable from the rules:**

| Item | Blocks | Needed from |
|---|---|---|
| Approved requirements (P-01) | everything from S1 | Product / BA |
| Playwright framework (P-04) — infrastructure proposed, reusable components absent | S6, S7 | Engineering |
| API contracts, test accounts, environment policy (P-05) | S5, S9 | Engineering / Product |
| Module taxonomy (P-06) — proposal ready to ratify in `requirements/module-taxonomy.md` | all ID assignment, so S0 in practice | Product / QA |
| Clinical lifecycle, enums, role matrix (P-07) | S3, S4 | Clinical SME / Product |

Everything in this directory is Draft pending ratification at Gate G0, including the C-01 decision recorded in the workflow's conflict register.

## Two rules worth knowing before you contribute

**Nothing is assumed.** Where information is missing, the correct output is a blocking token such as `MISSING INFORMATION` or `CLINICAL RULE REQUIRES CLARIFICATION`, naming exactly what is needed. Filling a gap with a plausible value is a process violation, not a time saving. The full vocabulary is in the workflow, §9.

**AI does not approve.** AI analyzes, generates, classifies, and identifies gaps. Clinical behaviour, requirement interpretation, production readiness, and defect severity are human decisions. Every gate is signed by a person.
