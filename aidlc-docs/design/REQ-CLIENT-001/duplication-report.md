# Duplication Report — REQ-CLIENT-001

**Stage:** S3
**Rule:** `aidlc-e2e-rules.md` §27 — each candidate must be marked `REUSE_EXISTING_TEST`, `EXTEND_EXISTING_TEST`, or new.

---

## 1. Search performed

| Location searched | Contents found |
|---|---|
| `aidlc-docs/testcases/` | Did not exist before this stage |
| `aidlc-docs/bdd/` | Did not exist before this stage |
| `tests/` | Framework configuration and README only; no test files |
| `src/` | Does not exist |

The suite is empty. This is the first requirement to reach S3.

---

## 2. Decisions

| Scenario | Decision | Basis |
|---|---|---|
| SC-001 — A user reaches the Client area | `NEW` | No existing test covers it |
| SC-002 — Selecting a client makes that client the active client | `NEW` | No existing test covers it |

No reuse or extension is possible, and no duplication exists.

---

## 3. Internal overlap between the two new scenarios

Worth checking even with an empty suite, since the two scenarios sit adjacent in the same workflow.

SC-002 necessarily reaches the Client area before it can select anything, so it traverses SC-001's ground on its way. That is not duplication. SC-001 *asserts* reachability; SC-002 merely *requires* it and asserts identity instead. Different assertions, different failure meanings, and each remains independently executable as `aidlc-e2e-rules.md` §17 demands.

Collapsing them would be a mistake in the other direction: a single test failing on entry and on selection would give one result for two distinct causes, and the diagnostic value of SC-001 is precisely that it isolates the entry-point failure.

---

## 4. Note for the next requirement

Once several requirements have reached S3, this search becomes substantive rather than a formality. Two specific overlaps are already foreseeable and should be checked then.

`REQ-CLIENT-002` acts within the client context this requirement establishes, so its tests will need a selected client. They should establish it as setup rather than re-assert AC-002, or the identity assertion will be duplicated across every downstream test in the module.

The same applies to `REQ-PROGRAM-001`, `REQ-BEHAVIOR-001`, and `REQ-ANALYTICS-001`. Client selection is a precondition for all of them, and it belongs in a shared fixture once one exists — not repeated as an assertion in each.
