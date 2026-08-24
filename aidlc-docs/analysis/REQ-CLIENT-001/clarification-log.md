# Clarification Log — REQ-CLIENT-001

**Stage:** S2 — Clarification & Gap Resolution
**Gate this feeds:** G1
**Form:** each open item uses the exact structure required by `clinical-rules.md` §4.

A resolved item becomes an approved source for downstream stages. An open item that affects expected clinical behaviour holds its dependent tests at `TEST BLOCKED`.

---

## 1. Resolved

### CLR-001 — Module taxonomy

**Resolution:** `CLIENT`, from the taxonomy ratified 2026-08-24. Seven modules approved.
**Decided by:** Masud Rana, Sr. QA Automation Engineer, 2026-08-24.
**Rationale:** the workflow is centred on the Client area, and `CLIENT` was the token proposed from requirement §1.
**Downstream effect:** closes GAP-001 and prerequisite P-06. Test case IDs take the form `TC-CLIENT-<NNN>`.

### CLR-002 — Are Client and Patient the same entity?

**Resolution:** the same. The application's UI says "Client"; `clinical-rules.md` uses "Patient" for the same record.
**Decided by:** Masud Rana, 2026-08-24.
**Rationale:** recorded in `module-taxonomy.md`.
**Downstream effect:** three, and they were the reason this question was asked before anything else.

1. `PATIENT` merged into `CLIENT`. Client search and registration become `CLIENT` requirements.
2. The patient rules in `clinical-rules.md` — §6, §8, §21 — apply to Client records without translation. This is what introduced CL-006 into the register.
3. Test data requires at least two distinct synthetic clients, because §8 demands that the correct subject be verified and a single-client selector cannot distinguish selection from default.

### CLR-003 — Requirement approval

**Resolution:** approved. Status `Approved`, approver Masud Rana, Sr. QA Automation Engineer, 2026-08-24. Clinical sign-off given by the same person.
**Downstream effect:** Gate G0 passed for AC-001 and AC-002.
**Carried forward:** GAP-011 records the single-signatory question openly. Accepted here on risk grounds — this requirement covers navigation and read-only context, not clinical data capture — and flagged for revisit on any requirement that writes clinical data.

---

## 2. Open — blocking

### CLR-004 — Severity of a wrong-client read-only view

```text
CLINICAL RULE REQUIRES CLARIFICATION

Rule:
clinical-rules.md §21 — clinical data must remain associated with the correct
patient. Recorded as CL-002.

Problem:
The identity decision of 2026-08-24 settles that §21 applies to Client records.
What it does not settle is severity for read-only views. AC-003 to AC-005 concern
Skills Programs, Behavior Support, and Analyze Data displaying information for the
selected client. If the wrong client's information were displayed, no data would
have been written to the wrong record — but a clinician could act on it.

Two readings produce materially different tests:

  (a) Data integrity guarantee. The test asserts that no element of the other
      client's data appears anywhere in the view, and a failure is classified as
      a clinical safety defect.

  (b) Context correctness. The test asserts that the view is scoped to the
      selected client, and a failure is classified as a functional defect.

Reading (a) is a stronger assertion and a more severe classification. Choosing (b)
when (a) was correct produces a test that passes while a safety defect ships.

Required decision:
Confirm whether displaying another client's clinical information in a read-only
view is a §21 association failure, or a lesser context error. State the defect
severity that applies.
```

**Routed to:** Clinical SME
**Raised:** 2026-08-24
**Status:** `NEEDS SME CONFIRMATION`
**Holds:** AC-003, AC-004, AC-005 at `TEST BLOCKED`
**Tracked as:** GAP-010

---

## 3. Open — non-blocking for AC-001 and AC-002

These affect the *breadth* of coverage rather than the correctness of what is written. Each removes a scenario category from the achievable set. They are listed so that the resulting coverage is understood as bounded by missing specification, not by effort.

| ID | Question | Routed to | Removes | Tracked as |
|---|---|---|---|---|
| CLR-005 | Required behaviour when no client is selected | Product / QA | All negative scenarios on AC-001 and AC-002 | GAP-003 |
| CLR-006 | Required behaviour when a selected client is invalid or unavailable | Product / QA | Recovery-path scenarios | GAP-004 |
| CLR-007 | Approved authorization matrix: which roles may reach the Client area, and what denial looks like | Product / Security | All permission scenarios | GAP-002 |
| CLR-008 | Whether client selection is auditable, and what the audit event records | Product / Clinical | Audit assertions | GAP-006 |
| CLR-009 | Approved API contract for client selection and context | Engineering | API-based setup, cleanup, and verification | GAP-005 |

`clinical-rules.md` §23 expects a critical clinical workflow to be covered across happy path, validation, authorization, state, and recovery. Four of those five are unavailable: validation via CLR-005, authorization via CLR-007, recovery via CLR-006, and state because no status-bearing entity exists here. Only the happy path can be written.

That is the honest position and it is recorded as such in the coverage matrix rather than presented as complete coverage, which `aidlc-e2e-rules.md` §6 prohibits.

---

## 4. G1 readiness

```text
[X] Every ambiguity raised in the §4 form
[X] Every item routed to a named authority
[X] Resolved items record decider, date, and rationale
[X] Blocking items hold their dependent tests at TEST BLOCKED
[X] Non-blocking items state exactly what coverage they remove
[X] Human sign-off
```

One blocking item is open. It holds AC-003 to AC-005 and does not touch AC-001 or AC-002, so those two proceed to S3.

**G1 signed** by Masud Rana, Sr. QA Automation Engineer, 2026-08-24, jointly with the clinical rule register.

CLR-004 remains open and CLR-005 to CLR-009 are carried forward with explicit sign-off, as the S2 blocking condition permits for items that do not affect expected clinical behaviour. Carrying them forward is what fixes coverage at happy-path only; it does not make the covered behaviour any less correct.
