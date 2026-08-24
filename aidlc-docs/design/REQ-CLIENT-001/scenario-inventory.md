# Scenario Inventory — REQ-CLIENT-001

**Stage:** S3
**Gate this feeds:** G2
**Feeds:** S4, via `generate-bdd.md` and `generate-testcase.md`

---

## 1. Approved for S4

| Scenario ID | Name | AC | Type | Priority | Test case |
|---|---|---|---|---|---|
| SC-001 | A user reaches the Client area | AC-001 | `POSITIVE` | P1 | TC-CLIENT-001 |
| SC-002 | Selecting a client makes that client the active client | AC-002 | `POSITIVE` | P1 | TC-CLIENT-002 |

Two scenarios. The number is small because the sources are thin, not because the design is lazy — see §3 for the twelve scenarios that were considered and rejected for want of an approved source.

---

## 2. Scenario detail

### SC-001 — A user reaches the Client area

**Business behaviour:** a user who can access the Clinical application can open the Client area and see it displayed.

**Why it exists:** every client-scoped test in the suite depends on this. When it fails, one result explains the whole class of downstream failures instead of leaving five tests to fail separately for the same reason.

**Observable outcome:** the Client area is displayed, with the client selector present. From requirement §6 step 1 and AC-001.

**Boundary of the assertion:** displayed and usable. Nothing is asserted about which clients the selector contains, because that is SC-002's concern, nor about whether this user is *entitled* to the area, because the authorization matrix is `NOT SPECIFIED`.

### SC-002 — Selecting a client makes that client the active client

**Business behaviour:** a user chooses a specific client from the selector, and that client — the one chosen, not merely some client — becomes the active client.

**Why it exists:** requirement §3 names the business risk as viewing or acting on the wrong client's clinical information. This scenario is that risk reduced to its smallest observable form.

**Observable outcome:** the chosen client's name is displayed in the client selector. From requirement §6 step 2 and AC-002.

**Why two clients are required:** with one client available, the assertion cannot distinguish working selection from a default that happens to match. It would pass whether or not selection functioned. Two distinct synthetic clients make the assertion meaningful, and the scenario selects the second so that a default-to-first implementation is caught. This follows from CL-006 and `clinical-rules.md` §8.

**Boundary of the assertion:** the selection is *reflected*. Whether it is *effective* — whether downstream areas actually scope to it — is AC-003 to AC-005, which are blocked. This scenario must not be read as proving client context works end to end.

---

## 3. Considered and rejected

Every entry here is a scenario a reviewer might reasonably expect to find. Each is absent for a stated reason, so that absence is a recorded decision rather than an omission.

| Candidate | Type | Why not written |
|---|---|---|
| No client selected, user proceeds | `NEGATIVE` | BLK-002. Required behaviour `NOT SPECIFIED`; writing it would mean inventing an error |
| Selected client becomes invalid mid-session | `NEGATIVE` | BLK-003. Behaviour `NOT SPECIFIED` |
| Client selector is empty | `BOUNDARY` | Requirement precondition 3 assumes a client exists. Empty-state behaviour `NOT SPECIFIED` |
| Unauthorized user attempts Client area access | `PERMISSION` | BLK-004. No approved authorization matrix, and no defined denial behaviour |
| User with partial permissions selects a client | `PERMISSION` | BLK-004, same cause |
| Client selection persists across navigation | `STATE_TRANSITION` | Persistence mechanism `NOT SPECIFIED` in requirement §9.6 |
| Client selection persists across re-login | `STATE_TRANSITION` | Not stated in any source; depends on the unspecified persistence mechanism |
| Switching from one client to another | `STATE_TRANSITION` | Not described in requirement §6. Plausible, but plausibility is not a source |
| Client selection is audited | `INTEGRATION` | BLK-005. Whether it is auditable at all is `NOT SPECIFIED` |
| Client context reaches Skills Programs | `POSITIVE` | BLK-001. AC-003, held on GAP-010 |
| Client context reaches Behavior Support | `POSITIVE` | BLK-001. AC-004, held on GAP-010 |
| Client context reaches Analyze Data | `POSITIVE` | BLK-001. AC-005, held on GAP-010 |

Twelve rejected against two approved. That ratio is the most informative number in this document: the requirement is thin, and the suite that follows from it will be correspondingly thin until GAP-002, GAP-003, GAP-004, and GAP-010 are answered.

Answering those four would open ten of the twelve.

---

## 4. Deliberately not included

**Duplicate coverage of the same behaviour at different depths.** SC-001 and SC-002 could each have been split into two — reachability plus rendering, selection plus display. Splitting would raise the count without adding a distinct business behaviour, which §7 and §32 prohibit.

**A combined end-to-end scenario running steps 1 to 5.** It would appear to cover all five criteria in one test. It would in fact bundle three blocked criteria into an unblocked test, hide which criterion failed when it failed, and violate the one-behaviour-per-scenario rule in `generate-bdd.md` §7.
