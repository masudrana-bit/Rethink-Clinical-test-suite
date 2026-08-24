# Requirement Analysis — REQ-CLIENT-001

**Stage:** S1 — Requirement & Clinical Rule Analysis
**Requirement:** `REQ-CLIENT-001` v1.2, Approved 2026-08-24 by Masud Rana
**Gate passed to reach here:** G0, for AC-001 and AC-002
**Feeds:** S2 clarification, then G1
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`

This document extracts what the approved sources state. It does not interpret, complete, or improve them. Anything absent is recorded as absent.

---

## 1. Scope of this analysis

Gate G0 passed for AC-001 and AC-002 only. AC-003 to AC-005 are held pending GAP-010.

All five criteria are analysed here, because analysis is the stage that surfaces gaps rather than the stage that acts on them. The hold takes effect at S3, where AC-003 to AC-005 receive coverage design but no test cases.

---

## 2. Acceptance criteria

Identifiers were assigned in the requirement and are reproduced unchanged. Per `aidlc-e2e-rules.md` §12 they are permanent, which is why the sequence has no AC-006 — that criterion moved to `REQ-CLIENT-002` and its number was not reused.

| AC | Criterion | Observable outcome | Testable | Held? |
|---|---|---|---|---|
| AC-001 | The user can access the Client area | The Client area is displayed | Yes | No — proceeds to S3 |
| AC-002 | The user can select a client from the Client selector | The selected client is displayed in the Client selector | Yes | No — proceeds to S3 |
| AC-003 | The selected client provides the active context for Skills Programs | Skills Programs displays information for the selected client | Yes | Held at S3 — GAP-010 |
| AC-004 | The selected client provides the active context for Behavior Support | Behavior Support displays information for the selected client | Yes | Held at S3 — GAP-010 |
| AC-005 | The selected client provides the active context for Analyze Data | Analyze Data displays information and controls for the selected client | Yes | Held at S3 — GAP-010 |

Each criterion is independently observable, which is what makes them testable. None depends on another having been evaluated first, though AC-003 to AC-005 depend on the *state* AC-002 establishes — a data dependency, not a test-ordering one, and one each test satisfies for itself under `aidlc-e2e-rules.md` §17.

---

## 3. Source provenance, and what it costs

Every behavioural statement in this requirement cites the same source: user-provided application screenshots and the accompanying workflow description.

`aidlc-e2e-rules.md` §3 ranks sources in eight tiers and places "existing implementation behavior" seventh. Approved clinical rules, requirements, acceptance criteria, API contracts, and UX specifications all rank above it, and none was supplied.

The consequence is precise and should not be softened. Tests derived from this requirement assert **what the application currently does**. They will detect a change in that behaviour. They cannot detect that the current behaviour is itself wrong, because no higher-ranked source exists to disagree with it.

This does not block anything. §3 does not prohibit tier-7 sources; it prohibits letting them override higher tiers, and here there are none to override. It is recorded so that the suite's purpose is not misread later: this is a regression baseline.

---

## 4. Actors

| Actor | Stated role | Source | Completeness |
|---|---|---|---|
| User | Accesses the application and selects a client from the Client selector | Screenshot | Named, but not defined as a permission-bearing role |
| Authorized clinical/application role | Permitted to perform client-specific clinical actions | Requirement §4 | `NOT SPECIFIED` — which roles qualify is unstated |
| Clinical SME | Reviews clinical intent | `clinical-rules.md` | Process actor, not a system actor |
| QA | Reviews testability and coverage | AIDLC process | Process actor, not a system actor |

Only one system actor is defined, and it is defined by what it did in a screenshot rather than by a permission. `clinical-rules.md` §19 requires authentication and authorization to be treated separately: the screenshots establish that *someone* reached the Client area, not that a *role* is entitled to.

Consequence for test design: the tests can name an actor but cannot assert an authorization boundary. See GAP-002.

---

## 5. Preconditions

| # | Precondition | Establishable in a test? |
|---|---|---|
| 1 | The user can access the Clinical application | Not yet — no authentication mechanism exists. See P-04/P-05 |
| 2 | The Client area is available to the user | Follows from 1 |
| 3 | A client is available in the Client selector | Requires seeded synthetic data. See S5 |
| 4 | The user selects a client before using client-specific functionality | Yes, as a test step |
| 5 | Exact authorization requirements | `NOT SPECIFIED` |

Preconditions 1 and 3 are the practical barrier to execution. Neither is a specification gap — both are provisioning gaps, and both sit with Engineering.

---

## 6. Business workflow

Five steps, all sourced from screenshots.

| Step | Action | Stated system response | Relates to |
|---|---|---|---|
| 1 | Access the Client area | The Client area is displayed | AC-001 |
| 2 | Select a client from the Client selector | The selected client's name is displayed and becomes the active client context | AC-002 |
| 3 | Access Skills Programs | Skills Programs displayed with client-specific program information | AC-003 |
| 4 | Access Behavior Support | Behavior Support displayed with client-specific plan information | AC-004 |
| 5 | Access Analyze Data | Analyze Data displayed with client-specific analysis controls and data | AC-005 |

Step 2 carries two distinct outcomes in one sentence: the name is *displayed*, and the client *becomes the active context*. The first is directly observable in the selector. The second is observable only through its effects in steps 3 to 5.

This matters for scenario design. A test of AC-002 alone can prove the display half. The context half is what AC-003 to AC-005 exist to prove, and they are the criteria currently held. So the tests that can be written now verify that selection is *reflected*, not that it is *effective*.

---

## 7. Clinical and data model extraction

Extracted by citation only, per `clinical-rules.md` §9 to §18 and §25. Nothing below is inferred.

| Aspect | Content | Source |
|---|---|---|
| Lifecycle / states | Not applicable — no status-bearing clinical entity is created or transitioned | Requirement §9.1 |
| Enumerations | None defined | Requirement §9.2 |
| Mandatory fields | Selected Client is a required workflow context; whether it is a validated mandatory field is `NOT SPECIFIED`, and behaviour when absent is `NOT SPECIFIED` | Requirement §9.3 |
| Calculations | Not applicable | Requirement §9.4 |
| Corrections | Not applicable — no amendment of recorded clinical data | Requirement §9.5 |
| Associations | Selected Client → client-specific functionality. Persistence mechanism `NOT SPECIFIED` | Requirement §9.6 |
| Date and time | Not applicable to client selection | Requirement §9.7 |
| Concurrency | Not applicable — no concurrent modification behaviour defined | Requirement §9.8 |
| Authorization matrix | `NOT SPECIFIED` for both permitted and denied actions, and for denial behaviour | Requirement §10 |
| Validation and errors | All three error conditions `NOT SPECIFIED`; wrong-client context has required behaviour but no stated message | Requirement §11 |
| API contract | `MISSING API CONTRACT` | Requirement §12.1 |
| Audit expectations | `NOT SPECIFIED` — whether client selection is auditable at all is unstated | Requirement §12.3 |
| External integrations | `NOT SPECIFIED` | Requirement §12.4 |
| Retention and deletion | `NOT SPECIFIED` | Requirement §12.5 |

Nine of thirteen aspects are `NOT SPECIFIED` or not applicable. That is expected for a navigation-and-context requirement and is not in itself a defect in the requirement. What it does mean is that the achievable coverage is narrow: with no error behaviour, no authorization matrix, and no audit expectation, the only scenario category the sources support is the positive path.

---

## 8. Effect of the Client/Patient identity decision

The taxonomy ratified on 2026-08-24 decided that Client and Patient are the same record. Three consequences bear on this requirement, and none of them was visible before the decision.

**`clinical-rules.md` §8 now applies to client selection.** §8 concerns patient identity and warns against assuming a search or selection result is the intended subject. Selecting a client from the selector is therefore an identity step, and AC-002 must verify that the *correct* client became active — not merely that the selector is non-empty.

**Two synthetic clients are needed, not one.** This follows directly from the point above. With a single client in the selector, "the selected client is displayed" cannot distinguish working selection from a default that happens to match. The assertion would pass regardless of whether selection functions at all. Recorded for S5.

**§21 applies to Client records in principle.** What remains open is severity for read-only views, which is GAP-010 and the reason AC-003 to AC-005 are held.

---

## 9. Conflicts

None found between approved sources.

This is a weak result rather than a reassuring one: conflict requires two sources, and this requirement has effectively one. Every behavioural statement traces to the same screenshot set, so there is nothing for it to contradict. If an approved specification is supplied later, this analysis should be re-run — that is when conflicts would appear, and it is exactly the case `aidlc-e2e-rules.md` §3 exists to govern.

One tension worth flagging that is not a source conflict: the requirement sets criticality `P1`, while `aidlc-e2e-rules.md` §13 lists "core patient workflows" among the P0 candidates. Since Client and Patient are now one entity, client selection arguably meets that description. The approved value is P1 and is used; the observation is raised for G2 rather than silently overridden.

See `conflict-register.md`.

---

## 10. Outputs of this stage

| Artifact | Path |
|---|---|
| This analysis | `aidlc-docs/analysis/REQ-CLIENT-001/requirement-analysis.md` |
| Clinical rule register | `aidlc-docs/analysis/REQ-CLIENT-001/clinical-rule-register.md` |
| Conflict register | `aidlc-docs/analysis/REQ-CLIENT-001/conflict-register.md` |

S1 has no gate. It feeds S2, whose output is reviewed at G1.
