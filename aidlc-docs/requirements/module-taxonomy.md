# Module Taxonomy — PROPOSAL

**Status:** `APPROVED WITH AMENDMENT` — ratified 2026-08-24 by Masud Rana, Sr. QA Automation Engineer
**Addresses:** prerequisite P-06 (resolved), and GAP-001 in `REQ-CLIENT-001` (closed)
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` §12

---

## Status

Ratified on 2026-08-24 with one amendment: `PATIENT` **is removed and merged into** `CLIENT`, following the identity decision recorded below. Seven modules are approved.

The list originated as an AI-assembled proposal drawn from `REQ-CLIENT-001`. It now carries approval and may be used to issue requirement and test case IDs.

## Format constraint

Tokens are embedded in every requirement and test case ID:

```text
REQ-<MODULE>-<NNN>
TC-<MODULE>-<NNN>
```

The traceability schema validates these against `^REQ-[A-Z0-9]+-[0-9]{3}$`, so a token must be **uppercase letters and digits only** — no hyphens, underscores, or spaces. If the natural naming needs separators, say so and the pattern will be relaxed rather than the names contorted.

## Why the choice is hard to reverse

Module tokens become permanent. `aidlc-e2e-rules.md` §12 requires deterministic IDs, and the construction prompt forbids renumbering an existing test case. Renaming a module later either orphans every ID that used it or forces a rewrite across requirements, test cases, feature files, automation tags, and historical execution records.

So the tokens should name **stable business domains**, not screens or features. A module that might be renamed in a UI refresh is the wrong granularity.

## Approved modules


| Token         | Name                | Scope                                                                   | Status   |
| ------------- | ------------------- | ----------------------------------------------------------------------- | -------- |
| `CLIENT`      | Client              | Client selection, active client context, client search and registration | Approved |
| `PROGRAM`     | Skills Programs     | Program creation, editing, enrolment                                    | Approved |
| `BEHAVIOR`    | Behavior Support    | Behavior support plans                                                  | Approved |
| `ANALYTICS`   | Analyze Data        | Data analysis, graphs, reports                                          | Approved |
| `SESSION`     | Clinical Session    | Session create, complete, finalize                                      | Approved |
| `OBSERVATION` | Observation         | Observation capture and correction                                      | Approved |
| `ASSESSMENT`  | Clinical Assessment | Clinical assessment workflows                                           | Approved |


`PATIENT` was proposed but is **not** an approved module. Client and Patient are the same record (see below), so search and registration fall under `CLIENT`.

Still not represented: authentication and authorization. `aidlc-e2e-rules.md` §13 lists authentication among the P0 concerns and `clinical-rules.md` §19 insists the two are distinct, yet neither has a home above. Whether an `AUTH` module is added or the concern is distributed remains open and is tracked in `OPEN-DECISIONS.md`.

---



## Resolved — Client and Patient are the same entity

**Decision:** Client and Patient are the same underlying record. The application's UI says "Client"; `clinical-rules.md` uses the generic clinical term "Patient" for the same thing.

**Decided by:** Masud Rana, Sr. QA Automation Engineer, 2026-08-24.

Consequences, which are the reason this question mattered:

1. `PATIENT` **is not a module.** Keeping both would have split one domain across two ID namespaces, scattering the association tests. Client search and registration are `CLIENT` requirements.
2. **The patient rules in** `clinical-rules.md` **apply to Client directly.** §6 (no real patient data), §8 (verify patient identity, do not assume a search result is correct), and §21 (data belonging to one subject must not appear under another) all govern Client records without translation.
3. **§8 becomes directly relevant to AC-002.** Selecting a client from the selector is a patient-identity step, so the test must verify the *correct* client became active, not merely that *a* client did.
4. **Test data needs at least two distinct synthetic clients.** With one client, "the selected client is displayed" passes trivially and proves nothing about selection.

Residual question, tracked as GAP-010 in `REQ-CLIENT-001`: whether displaying the wrong client's data in a read-only view — Skills Programs, Behavior Support, Analyze Data — counts as a §21 association failure or as a lesser context error. The identity decision makes §21 applicable in principle; the severity classification for read-only views is still open, and AC-003 to AC-005 are held until it is answered.

**Correction, 2026-08-25.** Point 2 above summarises §21 as *"data belonging to one subject must not appear under another."* That overstates it. The rule is titled *Patient-to-Session Association* and its text covers Patient → Clinical Session → Observations remaining correctly associated, prefaced by *"Where applicable."* None of the three read-only views is a session or an observation, so the rule's applicability to them is not settled by its text — which is exactly what GAP-010 asks. The broader reading may well be the right one, but it is an interpretation and needs the SME to make it rather than being inherited from a paraphrase. The identity decision itself is unaffected: it settled that Client and Patient are one record, which is a separate matter from how far §21 reaches. Put to the SME in `aidlc-docs/CLINICAL-SME-BRIEF.md`.

---



## Ratification

```text
[  ] Approved as proposed
[X] Approved with amendments (record below)
[  ] Rejected — replaced by an existing approved taxonomy

Client/Patient question resolved as:
  Same entity. The UI term is "Client"; clinical-rules.md uses "Patient" for
  the same record. Patient rules apply to Client directly.

Amendments:
  PATIENT removed and merged into CLIENT. Seven approved modules.

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Recorded as a consequence of ratification: GAP-001 closed in `REQ-CLIENT-001`, and P-06 marked resolved in `aidlc-docs/workflows/e2e-test-generation-workflow.md` §3.

Amending this taxonomy after IDs have been issued requires an impact analysis under workflow stage S11, because module tokens are embedded in every requirement, test case, feature file, and execution record.