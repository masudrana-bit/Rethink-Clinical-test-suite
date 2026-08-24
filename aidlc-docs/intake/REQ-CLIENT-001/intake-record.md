# Intake Record — REQ-CLIENT-001

**Workflow stage:** S0 (Intake & Source Validation)
**Requirement:** `REQ-CLIENT-001` — Select Client and Access Client-Specific Clinical Functionality
**Assessed:** 2026-08-24
**Assessed by:** AI (analysis only; AI holds no approval authority)

---

## Verdict

```text
GATE G0: BLOCKED
```

The requirement cannot enter stage S1, and no test case, BDD scenario, or automation may be produced from it in its current state. This confirms the self-assessment recorded at the end of the requirement document itself.

Two independent reasons, either of which is sufficient on its own:

1. **The requirement is not approved.** §2 records `Status: Draft` with approver, role, and date all `NOT SPECIFIED`. `aidlc-e2e-rules.md` §28 requires an approved requirement before a test is production-ready, and `clinical-rules.md` §35 places clinical and product approval *before* automation.
2. **Unresolved gaps affect expected behaviour.** Eight open items in §13, none resolved. Under `clinical-rules.md` §4 a test stays `TEST BLOCKED` while a missing decision affects expected clinical behaviour.

---

## Checks performed

| Check | Result |
|---|---|
| Requirement file exists | Pass |
| ID conforms to `REQ-<MODULE>-<NNN>` | Pass — `REQ-CLIENT-001` matches the schema pattern |
| Module drawn from approved taxonomy | **Fail** — no taxonomy exists (P-06); `CLIENT` is self-proposed and acknowledged as a gap in GAP-001 |
| Status is Approved with named approver and date | **Fail** — Draft, all approval fields `NOT SPECIFIED` |
| Clinical SME sign-off where required | **Fail** — flagged as required, not obtained |
| At least one acceptance criterion with `AC-<NNN>` ID | Pass — AC-001 to AC-006 |
| Every acceptance criterion independently testable | Partial — AC-001 to AC-005 yes; AC-006 has `NOT SPECIFIED` as its observable outcome and is not testable |
| Every behavioural statement carries a source citation | Partial — citations present, but see source-quality finding below |
| Conditional sections completed or marked not applicable with a reason | Pass — §9 subsections are each dispositioned |
| Every `NOT SPECIFIED` recorded in §13 with an owner | Pass |
| No `NOT SPECIFIED` remains that affects expected clinical behaviour | **Fail** — authorization, validation, and AC-006 are all unspecified |
| No real patient data present | Pass — example values are flagged as runtime data, not embedded expectations |

Six of eleven pass, two partial, three fail.

---

## Finding 1 — Source quality, and why it matters more than the gap count

Most behavioural statements cite *user-provided application screenshots*. In the source-of-truth hierarchy of `aidlc-e2e-rules.md` §3, screenshots of a running system are "existing implementation behavior", which ranks **seventh of eight** — above only existing tests, and below every form of approved specification.

The consequence is not bureaucratic. A test whose expected result is derived from observed behaviour asserts *what the application currently does*, not *what it is supposed to do*. Such a test cannot fail on a product defect that is already present; it can only detect subsequent change. It is a regression guard, not a verification of correctness.

That may be a perfectly reasonable thing to build deliberately, and for AC-001 to AC-005 — navigation and context propagation — it is probably close to sufficient. But it must be a conscious, recorded decision by QA and Product, not a side effect of screenshots being the only available source. If the intent is genuinely to lock in current behaviour, the requirement should say so and be approved on that basis.

## Finding 2 — Document conformance defects

These are mechanical and cheap to fix, but they will break tooling and traceability.

| # | Defect | Impact |
|---|---|---|
| D-01 | The entire file is wrapped in a stray ```` ```markdown ```` fence (line 1) closed at line 688 | The document renders as one code block instead of markdown; tables and headings do not display |
| D-02 | The H1 still reads `# Requirement Template` rather than the requirement title | Confusing in listings and search |
| D-03 | §13 uses the status token `NEEDS_CONFIRMATION`, which is not in the approved vocabulary | The approved token is `NEEDS SME CONFIRMATION` (`NEEDS_SME_CONFIRMATION` in the schema); the current value will fail schema validation at S10 |
| D-04 | GAP-005 carries `MISSING API CONTRACT` in the **Resolution** column | That token is the gap, not its resolution; the row reads as resolved when it is not |
| D-05 | §16 proposes module tokens (`PROGRAM`, `BEHAVIOR`, `ANALYTICS`, `SESSION`, `OBSERVATION`, `PATIENT`, `ASSESSMENT`) for related requirements | This is effectively an unapproved taxonomy proposal; harmless if ratified, but it should be ratified deliberately rather than inherited by accident |
| D-06 | Gate G0 checklist wording was altered from the template ("source citation" became "source citation/reference") | Weakens a check that exists specifically to require citation |

## Finding 3 — Per-criterion readiness

Useful because the requirement is not uniformly blocked. If approval arrives, five of six criteria are workable immediately.

| AC | Subject | State if the requirement were approved |
|---|---|---|
| AC-001 | Client area is displayed | Ready — observable, single outcome |
| AC-002 | Selected client shown in selector | Ready |
| AC-003 | Skills Programs reflects selected client | Ready |
| AC-004 | Behavior Support reflects selected client | Ready |
| AC-005 | Analyze Data reflects selected client | Ready |
| AC-006 | Client-specific clinical actions operate against the selected client | **Blocked** — observable outcome and supported actions are `NOT SPECIFIED` (GAP-007); no expected result can be derived |

Note that AC-003 to AC-005 are the criteria that carry actual clinical risk, because they assert that the correct client's data is displayed. `clinical-rules.md` §21 requires that data stay associated with the correct subject, and §8 warns against assuming a returned record is the right one. Testing these properly requires **two** distinct synthetic clients so the test can prove the wrong one is not shown. A single-client test would pass trivially and prove nothing. That data requirement does not yet exist (§15 leaves fields `NOT SPECIFIED`).

## Finding 4 — Downstream prerequisites still open

Even with full approval, automation could not be produced today:

| Prerequisite | Blocks |
|---|---|
| P-04 — no Playwright framework (no config, fixtures, Page Objects, API clients, auth utilities) | S6 and S7; Gate G5 cannot be signed against a framework that does not exist |
| P-05 — no API contract (GAP-005), no test accounts, no environment policy | S5 data setup and S9 execution |
| P-06 — no approved module taxonomy | ID assignment for this and every related requirement |

---

## What would unblock this, in order of leverage

1. **Approve the module taxonomy** (P-06, GAP-001). Confirming `CLIENT` alone unblocks this requirement's ID; the full list matters for the twelve related requirements in §16.
2. **Approve the requirement**, or state explicitly that it is approved *as a regression baseline derived from current behaviour* — see Finding 1. Naming the approver and date closes the §2 block.
3. **Descope AC-006** into its own requirement. It is the only criterion with no derivable expected result, and it is holding back five that are ready. Splitting it converts a fully blocked requirement into a mostly workable one.
4. **Answer GAP-003 and GAP-004** — behaviour when no client is selected, and when a selected client is invalid or unavailable. These define the negative scenarios that `clinical-rules.md` §23 expects.
5. **Define two-client synthetic test data** so the association assertions in AC-003 to AC-005 can actually fail when they should.
6. **Establish the Playwright framework** (P-04). Independent of the above and can proceed in parallel.

Items 1 to 3 are decisions. Items 5 and 6 are work. Nothing here requires resolving all eight gaps — GAP-006 (audit) and GAP-008 (session workflow) do not affect AC-001 to AC-005 and can stay open.

---

## Recorded blockers

| ID | Token | Affects | Owner |
|---|---|---|---|
| GAP-001 | `NEEDS SME CONFIRMATION` | Module taxonomy, all IDs | Product / QA |
| GAP-002 | `NEEDS SME CONFIRMATION` | §4, §10 authorization | Product / Security |
| GAP-003 | `NEEDS SME CONFIRMATION` | AC-006, §11 no-client-selected behaviour | Product / QA |
| GAP-004 | `NEEDS SME CONFIRMATION` | §11 invalid-client behaviour | Product / QA |
| GAP-005 | `MISSING API CONTRACT` | §12.1 | Engineering |
| GAP-006 | `NEEDS SME CONFIRMATION` | §12.3 audit | Product / Clinical |
| GAP-007 | `NEEDS SME CONFIRMATION` | AC-006, §9.6 | Clinical SME |
| GAP-008 | `NEEDS SME CONFIRMATION` | Future session requirement | Product / QA |
| — | `NOT SPECIFIED` | §2 approval fields | Project approver |

Tokens above are normalised to the approved vocabulary; the source document uses a non-conformant variant (D-03).

---

## Addendum — 2026-08-24, after the AC-006 split

The assessment above describes `REQ-CLIENT-001` as originally received and is retained unchanged for audit. Recommendation 3 has since been actioned: AC-006 moved to `REQ-CLIENT-002`.

What changed:

| Item | Before | After |
|---|---|---|
| Acceptance criteria | AC-001 to AC-006 | AC-001 to AC-005; AC-006 now `REQ-CLIENT-002` AC-001 |
| "Every criterion independently testable" | Partial | Pass |
| Blocking gaps on this requirement | 8 | Approval, taxonomy, and GAP-010 |
| Gate G0 verdict | BLOCKED | BLOCKED — on approval only |

What did **not** change: the requirement is still unapproved, so the gate is still closed. The split narrowed the blockers; it did not open the gate.

One new gap was raised in the process. CL-002, the `clinical-rules.md` §21 data-association rule, was originally scoped only to AC-006. Whether it also governs AC-003 to AC-005 — whether showing another client's data in Skills Programs, Behavior Support, or Analyze Data is an association failure or merely a context error — is unstated in every available source. It is recorded as GAP-010 and is not a determination AI should make. The answer decides whether those three criteria assert read-only context correctness or a data integrity guarantee, which changes both the test design and the two-client data requirement described in Finding 3.

`REQ-CLIENT-002` is blocked more deeply than its parent and has its own intake pending. Its single criterion has no observable outcome, and GAP-009 records that the set of clinical actions it governs is not enumerated anywhere. Approval alone would not unblock it.

---

## Sign-off

Gate G0 requires a human decision. AI does not sign.

```text
[  ] G0 approved — requirement may enter S1
[  ] G0 rejected — returned for the items above

Approver:
Role:
Date:
```
