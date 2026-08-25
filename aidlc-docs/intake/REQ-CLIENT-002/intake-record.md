# Intake Record — REQ-CLIENT-002

**Workflow stage:** S0 (Intake & Source Validation)
**Requirement:** `REQ-CLIENT-002` — Perform Client-Specific Clinical Actions Against the Selected Client
**Assessed:** 2026-08-25
**Assessed by:** AI (analysis only; AI holds no approval authority)

---

## Verdict

```text
GATE G0: BLOCKED
```

The requirement cannot enter stage S1. No test case, BDD scenario, or automation may be produced from it.

This is a different kind of blocked from `REQ-CLIENT-001`. That requirement was blocked on *approval* — the content was largely there and a signature opened the gate. This one is blocked on *content*. Approving it today would change nothing, because its single acceptance criterion has `NOT SPECIFIED` as its observable outcome and the set of actions it governs is not enumerated in any source. There is nothing to derive a test from.

Three reasons, each sufficient alone:

1. **The acceptance criterion has no observable outcome.** AC-001 states that actions "operate against the selected client" and records its outcome as `NOT SPECIFIED`. Under `clinical-rules.md` §4 it stays `TEST BLOCKED` while a missing decision affects expected clinical behaviour.
2. **The governed action set is unenumerated (GAP-009).** No source says which clinical actions are in scope. Every other gap depends on this one, because authorization, validation, and audit expectations cannot be answered in the abstract.
3. **The requirement is unapproved.** §2 records `Status: Draft`, with approver, role, and date all `NOT SPECIFIED`.

---

## Checks performed

| Check | Result |
|---|---|
| Requirement file exists | Pass |
| ID conforms to `REQ-<MODULE>-<NNN>` | Pass |
| Module drawn from approved taxonomy | Pass — `CLIENT` is valid since the taxonomy was ratified 2026-08-24; the document's "pending ratification" note in §1 is now stale |
| Status is Approved with named approver and date | **Fail** — Draft, all approval fields `NOT SPECIFIED` |
| Clinical SME sign-off where required | **Fail** — flagged as required, not obtained |
| At least one acceptance criterion with `AC-<NNN>` ID | Pass — AC-001 |
| Every acceptance criterion independently testable | **Fail** — AC-001 has no observable outcome |
| Every behavioural statement carries a source citation | Pass — and the citations honestly point at absent sources rather than inventing them |
| Conditional sections completed or marked not applicable | Pass — §9 subsections are each dispositioned, mostly as `NOT SPECIFIED` |
| Every `NOT SPECIFIED` recorded in §13 with an owner | Pass |
| No `NOT SPECIFIED` remains that affects expected clinical behaviour | **Fail** — the acceptance criterion itself |
| No real patient data present | Pass |

Six pass, four fail, one stale note. The document is well-formed; it is the underlying specification that is missing. That distinction matters — there is no rewriting to be done here, only decisions to be obtained.

---

## Finding 1 — GAP-009 is answerable now, and reconnaissance narrows it

GAP-009 asks which clinical actions are in scope and notes that no source enumerates them. That framing suggested a blank page. It is not blank: the application already implements a substantial client-specific action surface, and it can be enumerated.

Reconnaissance was performed against the dev environment on 2026-08-25 by reading the DOM of a client record across all three tabs. **No action was invoked** — nothing was clicked that could create, modify, or confirm clinical data. The environment was serving `demo-banner-substituted`, meaning the backend did not return records and example data was shown.

### Observed action surface

| Tab | Observed control | Test ID | Apparent nature |
|---|---|---|---|
| Skills Programs | Add program | `program-rail-add` | Write — creates a clinical program |
| Skills Programs | Edit goals | `program-details-edit-goals` | Write — modifies clinical goals |
| Skills Programs | Manage data collection | `program-details-manage-data-collection` | Write — configures how clinical data is captured |
| Skills Programs | Manage targets | `program-details-manage-targets` | Write — modifies clinical targets |
| Skills Programs | Program actions menu | `program-details-actions-menu` | Unknown — contents not opened |
| Skills Programs, Analyze Data | **Confirm mastery** | `mastery-review-confirm` | Write — a clinical determination |
| Skills Programs, Analyze Data | **Dismiss** mastery determination | `mastery-review-dismiss` | Write — rejects a clinical determination |
| Analyze Data | Save report | `saved-report-save` | Write — but "saved on this device", so possibly local only |
| Analyze Data | Print | `analyze-print` | Read — but exports clinical data |
| Behavior Support | Plan and behavior views, ABC breakdown, paired graphs | `plan-rail`, `abc-breakdown-chart` | Read in this build; no write control observed |

Routes are `/clients/<id>`, `/clients/<id>/behavior-support`, `/clients/<id>/analyze-data`.

### How this evidence may and may not be used

This is **observed implementation behaviour**, which `aidlc-e2e-rules.md` §3 ranks seventh of eight in the source hierarchy. It is admissible as *input to a scoping decision* — a menu for the SME to choose from — and inadmissible as a *source of expected results*. Nothing above tells us what any of these actions is supposed to do, only that a control exists. `clinical-rules.md` §2 forbids inferring the clinical behaviour behind them.

Two further cautions. The environment was serving substituted example data, so this is the demonstration dataset's surface and may differ from what the real backend supports. And the presence of a control says nothing about which roles may use it, which is GAP-002.

## Finding 2 — A clinical calculation is already visible, and it carries its own requirements

The mastery review states its criteria on screen: *"80% or better across 3 consecutive sessions, minimum 10 trials each"*, attributed to *"Determined by the system."*

That is a clinical calculation with a threshold, a window, and a minimum sample size. If confirming mastery falls in scope, `clinical-rules.md` §11 requires the approved formula, inputs, units, precision, rounding rule, and boundary behaviour **before** a test may be written. Boundary behaviour is the substantive question, not a formality: whether exactly 80.0% qualifies, whether exactly 10 trials qualifies, and whether "consecutive" tolerates a gap are each a distinct clinical decision, and each is a plausible defect.

The on-screen text is a display string, not an approved specification. It should not be treated as the formula.

## Finding 3 — This requirement's risk profile is materially higher than its parent

`REQ-CLIENT-001` covers navigation and read-only context. This one covers writing clinical data, and the observed surface includes confirming a mastery determination — a clinical judgement recorded against a named individual.

Two consequences follow.

**The GAP-011 precedent must not carry over.** `REQ-CLIENT-001` was signed off clinically by the same person who approved it as QA lead. That was recorded as defensible under `clinical-rules.md` §35, which scales approval to risk, precisely *because* that requirement was read-only. The intake record for `REQ-CLIENT-001` says so explicitly and warns that `REQ-CLIENT-002` should not inherit the treatment by precedent. An independent clinical SME sign-off is expected here.

**Negative testing becomes central rather than peripheral.** `clinical-rules.md` §23 expects negative coverage, and the failure this requirement guards against — an action recorded against the wrong client — is the §21 data integrity failure. Proving it requires at least two distinct clients and an assertion that the action did *not* land on the other one. §15 of the requirement already says this.

## Finding 4 — What can be tested without resolving the whole requirement

Not everything waits on the full action enumeration. If a single action were scoped and specified, that alone would be testable, and it would be the highest-value one in the suite so far because it is the first that writes clinical data.

The natural candidate is confirming a mastery determination: it is visible, it is discrete, it has an observable outcome on screen, and it is exactly the kind of action whose misattribution `clinical-rules.md` §21 exists to prevent. But it also carries the §11 calculation burden from Finding 2, which is real work to specify.

A cheaper first candidate would be an action with no calculation behind it — adding a program, for instance. Less clinically weighty, but it would establish the write-path test pattern and the two-client attribution assertion, which every later action reuses.

This is a scoping choice for Product and the Clinical SME, not one AI should make.

---

## What would unblock this, in order of leverage

1. **Enumerate the in-scope actions (GAP-009).** Everything else depends on it. The table in Finding 1 is a candidate list to accept, trim, or reject — not a proposal.
2. **Specify the observable outcome for AC-001**, per chosen action. "Operates against the selected client" needs to become something a test can see: what changes on screen, what persists, and what proves it landed on this client and not another.
3. **Obtain an independent clinical SME sign-off** (see Finding 3), not a repeat of the GAP-011 arrangement.
4. **Answer GAP-002 (authorization).** Which roles may perform each scoped action, and what happens on denial. `clinical-rules.md` §19 keeps this separate from authentication.
5. **Answer GAP-003.** Behaviour when an action is attempted with no client selected.
6. **If mastery confirmation is in scope, supply the §11 calculation specification** including boundary behaviour.
7. **Answer GAP-006 (audit).** `clinical-rules.md` §16 makes audit likely relevant once clinical data is written, unlike for `REQ-CLIENT-001`.
8. **Define two-client synthetic test data** so misattribution can actually be detected.

Items 1 to 3 are the gate. Items 4 to 8 shape the tests but do not block the gate opening for a narrowly scoped first action.

`GAP-005` (API contract) is **not** on this list. It is real, but E2E tests drive the UI; the contract matters for setup and verification depth, not for whether the gate opens.

---

## Recorded blockers

| ID | Token | Affects | Owner |
|---|---|---|---|
| GAP-009 | `NEEDS SME CONFIRMATION` | AC-001, §6 — root blocker | Product / Clinical |
| GAP-007 | `NEEDS SME CONFIRMATION` | AC-001, §9.6 — observable outcome | Clinical SME |
| GAP-002 | `NEEDS SME CONFIRMATION` | §4, §10 — authorization | Product / Security |
| GAP-003 | `NEEDS SME CONFIRMATION` | §11 — no client selected | Product / QA |
| GAP-006 | `NEEDS SME CONFIRMATION` | §12.3 — audit | Product / Clinical |
| GAP-005 | `MISSING API CONTRACT` | §12.1 | Engineering |
| GAP-012 | `NEEDS SME CONFIRMATION` | Mastery calculation, if in scope — see Finding 2 | Clinical SME |
| — | `NOT SPECIFIED` | §2 approval fields | Project approver |
| — | `NOT SPECIFIED` | §3 criticality rating | Product |

GAP-012 is new and raised by this assessment. Gap IDs shared with `REQ-CLIENT-001` refer to the same underlying question; resolving one resolves both.

---

## Document notes

Minor, non-blocking, worth correcting when the requirement is next revised.

| # | Note |
|---|---|
| N-01 | §1 says the module is "pending ratification of the taxonomy". The taxonomy was ratified 2026-08-24 and `CLIENT` is valid. |
| N-02 | §3 leaves criticality `NOT SPECIFIED` while observing it is likely higher than `REQ-CLIENT-001` (rated P1). Given this requirement writes clinical data, the rating is worth setting deliberately rather than inheriting. |

---

## Addendum — 2026-08-25, scoping decisions and a product finding

The assessment above is retained unchanged. Two decisions were taken the same day, and a second round of reconnaissance changed one of them.

### Decisions

| Decision | Outcome | Decided by |
|---|---|---|
| First action to scope | Initially **add a program**, then revised — see Finding 5 | Masud Rana, Sr. QA Automation Engineer |
| Clinical sign-off | **Independent Clinical SME required.** The GAP-011 arrangement does not carry over | Masud Rana, Sr. QA Automation Engineer |

The sign-off decision resolves the concern raised in Finding 3. It also means Gate G0 now has a named dependency that did not previously exist: an SME who has not yet been identified.

### Finding 5 — The Add Program control is inert

Scoping "add a program" prompted a check of what the action requires. It requires nothing, because it does nothing.

`program-rail-add`, labelled "Add New", is present in the DOM and not disabled. Clicking it produces no dialog, no form fields, no route change, and no observable state change. Tested twice with a two-second settle. By contrast, three sibling controls on the same page all respond:

| Control | Test ID | Result when clicked |
|---|---|---|
| Add program | `program-rail-add` | **Nothing** |
| Edit goals and objectives | `program-details-edit-goals` | Opens an editor — 14 fields, Save button |
| Manage data collection | `program-details-manage-data-collection` | Opens an editor — 45 further fields |
| Manage targets | `program-details-manage-targets` | Opens an editor — 14 further fields |
| Program actions menu | `program-details-actions-menu` | Opens a menu |

Editors were opened to enumerate fields and the page was reloaded without saving. No clinical data was written, and no mastery determination was confirmed or dismissed.

**Caveat, and it is a real one.** The environment was serving `demo-banner-substituted` throughout, meaning the backend returned no records for these screens. The Add control may be inert *because* of that rather than being unimplemented. Distinguishing the two requires either a working backend or someone who knows the build. This is recorded as an observation for the application team, not as a confirmed defect.

**Addendum, 2026-08-25 — the caveat now has evidence behind it.** The cross-suite review of the sibling NextGen Clinical API suite found that the entire treatment-plan Build surface, programs included, returns `503` on both dev and dev2, caused by a removed Accounts-service trust key that yields `Accounts service returned status 401 for account 18421`. Their status table records it as the top blocker, unchanged for eleven days, with no fix in flight. The nested behavior-plan surface additionally returns `404` for want of a seeded program.

So an inert Add control is exactly what a working frontend would look like against that backend. This still does not prove the control is implemented — a frontend can be missing *and* the backend down — but it removes most of the case for filing a frontend defect, and it means the question cannot be settled on these environments until the Accounts key is restored. See `analysis/cross-suite-review-2026-08-25.md` §2.3.

Either way the consequence for testing is the same: an action with no observable behaviour cannot be automated, however well it is specified.

### Re-scope

The first action is now **adding a target**, via the Edit Goals and Objectives editor. It is the nearest working equivalent to what was originally chosen: a clinical write, no calculation behind it, and an obvious observable outcome. The editor is already well instrumented — `target-manager-new-name-input`, `target-manager-row-<program>-target-<n>-name`, per-row status and on-hold controls, and an explicit Save.

### Candidate observable outcome — NOT RATIFIED

AC-001 still needs an observable outcome, and this remains a specification decision. The following is offered as a **candidate for the Clinical SME to ratify, amend, or reject**. It is derived from observed behaviour, which `aidlc-e2e-rules.md` §3 ranks seventh of eight and which is inadmissible as a source of expected results. It is not a specification and must not be treated as one.

> When an authorized user adds a target to a program belonging to the selected client and saves, the target appears in that program's Targets list for that client, and does not appear under any other client.

Three things it deliberately leaves open, because no source answers them: whether a target name must be unique within a program, what happens when the name is empty or duplicated, and whether adding a target is an audited event (GAP-006).

### Gate status after this addendum

Still **BLOCKED**, on a shorter list. GAP-009 is effectively answered for the first action. What remains:

1. Ratify the observable outcome above, or supply the approved one.
2. Identify a Clinical SME and obtain sign-off.
3. Set the criticality rating (N-02).

Items 1 and 2 are the gate. GAP-002, GAP-003, and GAP-006 shape the tests but do not hold the gate for a single narrowly scoped action.

GAP-012 is **not** on the critical path any more. It attaches to mastery confirmation, which is now out of scope for the first action, and it should stay open for whenever that action is scoped in.

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

Approval is not currently available to give. The gate is held by missing content and a missing clinical sign-off, not by an absent signature on this page. Signing it in this state would place an untestable requirement into S1.
