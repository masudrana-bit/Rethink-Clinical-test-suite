# Clinical Rule Register — REQ-CLIENT-001

**Stage:** S1
**Requirement:** `REQ-CLIENT-001` v1.2
**Gate this feeds:** G1
**Rule:** every entry carries a source citation. An entry without one is invalid and must be removed rather than kept with a plausible attribution.

---

## 1. Register

| Rule ID | Statement | Source | Affects | Status |
|---|---|---|---|---|
| CL-001 | The selected client is the context for client-specific clinical functionality | Screenshots and workflow description; no formal approved rule exists | AC-002 to AC-005 | Tier 7 source only |
| CL-002 | Clinical data must remain associated with the correct patient/client | `clinical-rules.md` §21 | AC-003 to AC-005 in principle; severity open | Applicable, severity `NEEDS SME CONFIRMATION` |
| CL-003 | AI must not infer or invent clinical behaviour where an approved rule is unavailable | `clinical-rules.md` §2 | Process-wide | Binding |
| CL-005 | Clinical Session lifecycle and transition rules are `NOT SPECIFIED` | No approved session specification | Not this requirement | Deferred to a session requirement |
| CL-006 | Patient identity must be verified rather than assumed from a selection result | `clinical-rules.md` §8 | AC-002 | **New** — see §2 |
| CL-007 | Test data must be synthetic and free of real PHI | `clinical-rules.md` §6; requirement §15 | All test data | Binding |
| CL-008 | Tests must not mutate shared clinical data; each test isolates its own | `clinical-rules.md` §7 | All test cases | Binding |
| CL-009 | Authentication and authorization are distinct concerns | `clinical-rules.md` §19; requirement §4 | Authorization scenarios | Binding, but unusable — see §3 |

CL-004 is not listed. It moved to `REQ-CLIENT-002` with the former AC-006 and does not govern anything in this requirement. Its ID is retired here rather than reused, per the deterministic-ID rule.

---

## 2. CL-006 is new, and it changes AC-002

CL-006 did not appear in the requirement's own §8. It becomes applicable only because of the Client/Patient identity decision of 2026-08-24: once Client and Patient are the same record, `clinical-rules.md` §8 governs client selection directly.

§8 exists because selecting the wrong subject is a clinical safety event, not a usability annoyance. Applied here it means AC-002 must assert that the client the user chose is the client that became active. The weaker reading — that the selector displays *a* client afterwards — satisfies the literal wording of AC-002 and proves nothing.

This is recorded as a register entry rather than folded silently into a test step, because it strengthens an approved acceptance criterion beyond its literal text and a reviewer at G1 should see that happening and be able to reject it.

Its practical effect on test data appears in the S5 plan: at least two distinct synthetic clients are required.

---

## 3. CL-009 is binding but currently unusable

`clinical-rules.md` §19 requires authorization to be tested separately from authentication. The requirement's §10 authorization matrix is `NOT SPECIFIED` in every cell — permitted actions, denied actions, and denial behaviour.

So the rule is in force and there is nothing to apply it to. No permission scenario can be written, because writing one would require inventing which role is denied and what denial looks like, which `aidlc-e2e-rules.md` §4 prohibits.

The correct outcome is an explicit coverage gap, not an omission. Tracked as GAP-002 and reflected in the coverage matrix as `NOT COVERED` with justification.

---

## 4. Rules considered and found not applicable

Recorded so that a reviewer can see they were considered rather than overlooked. `generate-testcase.md` §7 requires each clinical check to be applied or explicitly excluded.

| Rule | Why not applicable here |
|---|---|
| §9, §13 — lifecycle and status transitions | No status-bearing entity is created or transitioned by client selection |
| §14 — mandatory field behaviour | Requirement §9.3 leaves both the mandatory flag and the missing-value behaviour `NOT SPECIFIED` |
| §15 — clinical corrections | Nothing is amended |
| §16 — audit expectations | Requirement §12.3 leaves auditability of client selection `NOT SPECIFIED`; see GAP-006 |
| §17 — actor attribution | No record is written, so there is nothing to attribute |
| §22 — session and program association | No session exists in this requirement |
| §25 — clinical date and time | No date or time value is entered, displayed as clinical data, or calculated |
| §24 — error message text | Applicable in principle, but every error condition in requirement §11 is `NOT SPECIFIED`, so no error assertion can be written |

---

## 5. G1 readiness

```text
[X] Every entry carries a source citation
[X] Every NOT SPECIFIED item is recorded rather than filled in
[X] Rules considered and excluded are listed with reasons
[X] New rules arising from the identity decision are called out, not folded in silently
[X] Human review and sign-off
```

One open item affects expected clinical behaviour: **GAP-010**, the severity question behind CL-002. Per the S2 blocking condition it holds AC-003 to AC-005 at `TEST BLOCKED`. It does not affect AC-001 or AC-002, which is why those two may proceed to S3 while the register still carries an open item.

```text
G1 sign-off

[X] Approved — register accepted, S3 may proceed for AC-001 and AC-002
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

The approval accepts CL-006 as a register entry. That is the substantive decision here: CL-006 strengthens AC-002 beyond its literal wording, requiring that the *correct* client be verified rather than that *a* client be displayed. It was presented for rejection at this gate and was not rejected, so it binds `TC-CLIENT-002`.
