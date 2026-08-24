# Blocked Register — REQ-CLIENT-001

**Stage:** S2, maintained through S9
**Purpose:** every item that stops work, with what it stops and who can release it.

Tokens are used verbatim from `aidlc-docs/construction/generate-testcase.md` §9.

---

## 1. Blocked test work

| ID | Token | What is blocked | Released by | Owner |
|---|---|---|---|---|
| BLK-001 | `TEST BLOCKED` | Test cases for AC-003, AC-004, AC-005 | CLR-004 / GAP-010 — severity of a wrong-client read-only view | Clinical SME |
| BLK-002 | `MISSING INFORMATION` | All negative scenarios on AC-001 and AC-002 | CLR-005 / GAP-003 — behaviour when no client is selected | Product / QA |
| BLK-003 | `MISSING INFORMATION` | All recovery scenarios | CLR-006 / GAP-004 — behaviour when a client is invalid or unavailable | Product / QA |
| BLK-004 | `MISSING INFORMATION` | All permission scenarios | CLR-007 / GAP-002 — authorization matrix | Product / Security |
| BLK-005 | `NOT SPECIFIED` | Audit assertions | CLR-008 / GAP-006 | Product / Clinical |
| BLK-006 | `MISSING API CONTRACT` | API-based setup, cleanup, and verification; stage S5 data lifecycle | CLR-009 / GAP-005 | Engineering |

BLK-001 blocks *writing* the affected test cases. The rest block *categories of scenario* that would otherwise be written for criteria that are themselves unblocked. The distinction matters at G2: AC-001 and AC-002 are covered, but covered only on the happy path, and the reason is BLK-002 through BLK-004 rather than an oversight.

---

## 2. Blocked execution

Separate from the specification gaps above. These stop the tests from running rather than from being written, and they are the reason nothing beyond S4 has been attempted.

| ID | Token | What is blocked | Released by | Owner |
|---|---|---|---|---|
| ~~BLK-007~~ | — | ~~Every stage from S5 onward~~ | **RESOLVED 2026-08-24.** `/temp-dev-login` authenticates without credentials and redirects to `/clients` | — |
| ~~BLK-008~~ | — | ~~S5 test data plan~~ | **RESOLVED.** Four clients available; field shape is `optionValue="id"`, `optionLabel="name"`. Superseded by BLK-010 | — |
| ~~BLK-009~~ | — | ~~S6 reconnaissance, S7 construction~~ | **RESOLVED.** Reconnaissance performed against the live application; the component plan is in `automation/REQ-CLIENT-001/framework-reuse-plan.md` | — |
| BLK-010 | `NEEDS SME CONFIRMATION` | Gate G4, and therefore S7 | **New.** Which data mode the suite may run against. The application serves substituted example data today and can serve real data. See the test data plan §5 | Product / QA |

BLK-007 was the binding constraint on the whole process and it is gone. What replaced it is smaller but sharper: BLK-010 is a decision rather than a provisioning task, and it can be answered in a sentence.

The reason it matters is that both remaining tests pass identically whether the backend is serving real records or fallback example data. Left unanswered, a total backend outage yields a green suite — a false pass that no retry policy would surface, because nothing is intermittent.

---

## 3. What is not blocked

Recorded so the register is not read as a wall.

Test cases and BDD scenarios for AC-001 and AC-002 are written and **G3-signed as of 2026-08-24**. They are complete within the bounds of the available sources: happy path only, with every expected result cited, and with the missing scenario categories declared rather than quietly omitted.

They have crossed the `Approved → Automation` boundary and cannot advance, because BLK-007 through BLK-009 stand between an approved test case and a running one. Gate G4 is unsignable for the same reason: it certifies the safety of provisioned data, and none has been provisioned.
