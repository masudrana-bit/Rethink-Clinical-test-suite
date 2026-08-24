# Module Taxonomy — PROPOSAL

**Status:** `NOT APPROVED` — proposal for ratification
**Addresses:** prerequisite P-06, and GAP-001 in `REQ-CLIENT-001`
**Required from:** Product / QA Lead
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` §12

---

## What this is, and what it is not

This is a **candidate list assembled by AI**, not an approved taxonomy. Every token below was taken from `REQ-CLIENT-001` — `CLIENT` from its §1, the rest from the related-requirements table in its §16. That document is itself unapproved and was drafted from screenshots, so nothing here carries authority.

It exists to make ratification cheap: reviewing and correcting a list is faster than authoring one. Approve it, amend it, or replace it.

Until it is approved, no requirement or test case ID can be issued, because `<MODULE>` has no valid value. That makes this the critical path for the whole process.

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

## Candidate modules

| Token | Proposed name | Scope | Provenance | Status |
|---|---|---|---|---|
| `CLIENT` | Client | Client selection and active client context | `REQ-CLIENT-001` §1 | Proposed |
| `PROGRAM` | Skills Programs | Program creation, editing, enrolment | `REQ-CLIENT-001` §16 | Proposed |
| `BEHAVIOR` | Behavior Support | Behavior support plans | `REQ-CLIENT-001` §16 | Proposed |
| `ANALYTICS` | Analyze Data | Data analysis, graphs, reports | `REQ-CLIENT-001` §16 | Proposed |
| `SESSION` | Clinical Session | Session create, complete, finalize | `REQ-CLIENT-001` §16 | Proposed |
| `OBSERVATION` | Observation | Observation capture and correction | `REQ-CLIENT-001` §16 | Proposed |
| `PATIENT` | Patient | Patient search and registration | `REQ-CLIENT-001` §16 | Proposed |
| `ASSESSMENT` | Clinical Assessment | Clinical assessment workflows | `REQ-CLIENT-001` §16 | Proposed |

Eight modules is a workable number — coarse enough to stay stable, fine enough for IDs to carry meaning.

Not represented, and possibly needed: authentication and authorization. `aidlc-e2e-rules.md` §13 lists authentication among the P0 concerns, and `clinical-rules.md` §19 insists authentication and authorization are separate. Neither has a home in the list above. Whether that becomes an `AUTH` module or is distributed across the others is a decision for review.

---

## Open question — are `CLIENT` and `PATIENT` the same entity?

This is the one item that should be settled before ratification, because getting it wrong is expensive to undo.

`REQ-CLIENT-001` describes the application's primary subject as a **Client**, selected from a Client selector, providing context for Skills Programs, Behavior Support, and Analyze Data. Its §16 simultaneously proposes a separate `PATIENT` module for Patient Search and Patient Registration.

Meanwhile `clinical-rules.md` consistently uses **Patient** — §8 on patient identity, §21 requiring that an observation belonging to Patient A never appear under Patient B, §6 on patient data privacy.

Three possibilities, with different consequences:

1. **Same entity, two names.** The UI says "Client" and the clinical rules say "Patient" for the same underlying record. Then two modules would split one domain across two ID namespaces, fragmenting coverage and making the §21 association tests hard to locate. One module should win.
2. **Genuinely distinct.** A Client is, say, a billing or organisational entity and a Patient is the individual receiving care. Then both modules are correct and the relationship between them needs documenting, because every association assertion depends on it.
3. **Client is the application's term for Patient in this product**, and `clinical-rules.md` is using generic clinical vocabulary. Then `CLIENT` should be the single module and the rules' patient-association requirements apply to it directly.

This cannot be resolved from the available sources, and it is not a judgment AI should make:

```text
NEEDS SME CONFIRMATION
```

It matters beyond naming. `clinical-rules.md` §21 requires that clinical data stay associated with the correct subject, and AC-003 to AC-005 of `REQ-CLIENT-001` are exactly those association assertions. If Client and Patient are different entities, those tests must verify the correct *both*, not just the correct client.

---

## Ratification

```text
[  ] Approved as proposed
[  ] Approved with amendments (record below)
[  ] Rejected — replaced by an existing approved taxonomy

Client/Patient question resolved as:

Amendments:

Approver:
Role:
Date:
```

Once approved, update the status header, close GAP-001 in `REQ-CLIENT-001`, and mark P-06 resolved in `aidlc-docs/workflows/e2e-test-generation-workflow.md` §3.
