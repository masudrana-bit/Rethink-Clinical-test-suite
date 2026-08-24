# Conflict Register — REQ-CLIENT-001

**Stage:** S1
**Rule:** `aidlc-e2e-rules.md` §3 — where sources conflict, report the conflict. Do not choose an interpretation.

---

## Source conflicts

**None found.**

This is not a clean bill of health. Conflict detection requires at least two independent sources describing the same behaviour, and this requirement has one: a set of application screenshots with an accompanying workflow description. There is nothing for it to disagree with.

Re-run this analysis if an approved specification, API contract, or UX document is supplied later. That is the point at which genuine conflicts would surface, and `aidlc-e2e-rules.md` §3 would then require the higher-ranked source to win.

---

## Tensions recorded, which are not source conflicts

### T-01 — Criticality P1 against the §13 P0 guidance

The requirement sets criticality `P1` and was approved with that value. `aidlc-e2e-rules.md` §13 lists "core patient workflows" and "data integrity" among the concerns P0 tests should cover. Following the decision that Client and Patient are the same entity, client selection is plausibly a core patient workflow.

Not a conflict between sources — §13 says *should*, and the requirement's criticality was set by the approver. Recorded for the G2 reviewer, who may raise these tests to P0. `P1` is used until then.

### T-02 — AC-002 as written is weaker than CL-006 requires

AC-002 states that the selected client is displayed in the Client selector. `clinical-rules.md` §8, which became applicable through the identity decision, requires that the *correct* subject be verified rather than assumed.

A test satisfying only the literal AC-002 would pass while selection was broken, provided some client appeared. The register records this as CL-006 and the test case asserts the stronger form.

Recorded rather than applied silently, because strengthening an approved acceptance criterion is a decision a reviewer should be able to see and reject at G1 or G3.

### T-03 — The requirement's own sources cannot validate it

Requirement §3 states the business risk as acting on the wrong client's clinical information, and the risk statement itself is `NOT SPECIFIED`. Meanwhile the expected results all derive from screenshots of the running application.

So the requirement identifies a safety risk, and the only available source for correct behaviour is the very system whose correctness is in question. Tests built this way confirm the application still behaves as it did when the screenshots were taken.

Not a conflict, and not resolvable within this process — it needs a higher-ranked source. Recorded because it bounds what the resulting suite can honestly claim.
