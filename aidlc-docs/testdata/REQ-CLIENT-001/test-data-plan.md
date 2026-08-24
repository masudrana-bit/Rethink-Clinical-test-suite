# Test Data Plan — REQ-CLIENT-001

**Stage:** S5 — Test Data & Environment Design
**Gate this feeds:** G4 — Test Data Safety
**Covers:** `TC-CLIENT-001`, `TC-CLIENT-002`, both G3-signed 2026-08-24
**Status:** **REVISED 2026-08-24 after live reconnaissance.** Most of what blocked this plan is answered. One new decision replaced it.

---

## 1. What changed

The original version of this plan listed seven items Engineering had to supply. Reconnaissance against the dev environment answered five of them, and the details are recorded in `aidlc-docs/automation/REQ-CLIENT-001/framework-reuse-plan.md` §2.

| Was blocked on | Now |
|---|---|
| Authentication mechanism | **Resolved.** `/temp-dev-login` signs in without credentials and redirects to `/clients` |
| Provisioned test account | **Not required.** The dev login needs no account and no credential |
| Two distinct clients | **Available**, but see §2 — their source is not what was assumed |
| Client fixture field definitions | **Resolved.** The switcher exposes `optionValue="id"` and `optionLabel="name"` |
| Whether selection persists server-side | **Resolved. It does not.** Parallel execution is safe |
| Seeding and cleanup mechanism | Still open, and now largely moot — neither case writes data |
| Environment policy | Still open |

In their place sits one decision that did not exist before, and it is more consequential than any of the five it replaced: **which data mode the suite is entitled to run against.** See §5.

---



## 2. Required data



### Two clients, and why the count is not negotiable


| Fixture  | Shape                                                          | Constraint                                                          | Source                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| Client A | Synthetic identifier, synthetic display name, available status | No real PHI                                                         | Requirement §15; `clinical-rules.md` §6 |
| Client B | Synthetic identifier, synthetic display name, available status | No real PHI. **Display name must be distinguishable from Client A** | CL-006; `clinical-rules.md` §8          |


`TC-CLIENT-002` selects **Client B**, the entry that is not first, and asserts that Client B — and not Client A — is the active client.

Supplying a single client would leave that assertion passing against a selector that ignores input entirely. Supplying two clients with the same display name would leave it unable to tell them apart. Either would defeat the case silently, producing a green result that proves nothing, which is the specific outcome CL-006 was accepted at G1 to prevent.

`TC-CLIENT-001` needs only that at least one client exists, so Client A alone satisfies it.

### Where the two clients come from, and why that is now the problem

Four clients are present on `/clients` today, which satisfies the count. But they are there *because the backend did not return any*, and the application substituted example data. Its banner says so, and states they are not real clinical records.

So these are not fixtures. They are the application's fallback content, outside our control, and they will change or vanish when the backend recovers.

The plan does not respond by pinning names. It requires instead that both cases be implemented **data-agnostically**: read the option labels from the switcher at runtime, select the second, and assert against the value that was read. No client name is hardcoded anywhere.

That satisfies requirement §15's parameterisation rule, and it is the only approach that survives the data source changing underneath the suite. `TC-CLIENT-002` was written as a statement about shape rather than values, so the approved case needs no amendment.

### Ordering — resolved

The switcher renders its placeholder "Select a client" on load, and reload restores that state. `TC-CLIENT-002` precondition 4 therefore holds naturally and needs no setup step to force it.

### Test account — not required

`/temp-dev-login` authenticates without credentials and redirects to `/clients`. No account is provisioned, no credential exists, and `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` correctly remain commented out in `.env.example`.

One consequence should be recorded rather than discovered later. A credential-free login route means this environment presents no authorization boundary at all, so GAP-002 is not merely unanswered here — it is untestable here. Both cases prove access, never entitlement.

---



## 3. PHI safety

No field in this plan carries real patient information. Both fixtures are synthetic by construction and neither test reads, writes, or displays clinical content — they exercise navigation and selector identity only.

A field-class attestation against `clinical-rules.md` §6 is recorded separately in `phi-safety-attestation.md`.

One caution for whoever provisions the data. The requirement's §15 lists example values visible in the supplied screenshots, `Ava Martinez` among them. Reconnaissance found that name in the live client list, on a screen the application itself labels as containing no real clinical records, so its provenance is no longer unknown.

The exclusion stands regardless, for a different reason. Those names are the application's fallback content, not fixtures under our control, and they will change when the backend recovers. Hardcoding them would produce a suite that fails on the day the environment starts working properly.

---



## 4. Isolation and cleanup

Neither test writes clinical data, so neither requires cleanup.

**Selection does not persist — verified 2026-08-24.** After reload the switcher returned to its "Select a client" placeholder while the auth session survived. `localStorage` holds only `bh_clinical_auth_session`; there is no client-context key, and `sessionStorage` is empty.

Client selection is therefore in-memory per page load, not shared server-side state. Two tests selecting different clients cannot interfere, so **`fullyParallel: true` is safe** and no reset step is needed. This closes the parallel-safety question raised in the original version of this plan, which was the one item here with the potential to produce intermittent failures.

No cleanup obligation arises under `clinical-rules.md` §7, because nothing is mutated.

---



## 5. The one decision left — which data mode may the suite run against?

Five of the seven items this section originally listed are answered. What replaced them is a single question, and it is more consequential than any of them.

The application declares its data source in a banner with three states, each carrying its own testid:

| Testid | Meaning |
|---|---|
| `demo-banner-preview` | Showing real data from the backend |
| `demo-banner-substituted` | The backend did not respond; example data is shown. Not real clinical records |
| `demo-banner-mixed` | A combination of the two |

On `/clients` today the mode is `substituted`. The clients the tests would exercise exist only because the backend is not responding.

**Why this matters more than it looks.** A test that checks "clients are listed and one can be selected" passes identically in every mode. So a total backend outage produces a green suite. That is a false pass, and no amount of retry discipline catches it, because nothing is flaky — the test genuinely passes against fallback content.

Three options, and this is a human decision rather than an engineering default:

1. **Require `preview`.** The suite fails fast unless it is running against real backend data. Highest assurance; the suite cannot run at all while the backend is down, which is the case today.
2. **Tolerate any mode, but record it as execution evidence.** Every result carries the mode it ran in, so a green run against substituted data is visibly not the same as a green run against real data. Least disruptive, and consistent with the evidence requirements of `clinical-rules.md` §36.
3. **Assert the mode per test.** Finer-grained, more machinery, probably premature for two test cases.

Option 2 is the recommendation. Option 1 would be right for a suite that gates a release, and this suite does not yet do that.

Still genuinely open, and now minor:

| # | Item | Blocks |
|---|---|---|
| 1 | Environment policy — is dev the intended target, and does it reset? | Nothing today; matters when the suite runs in CI |
| 2 | API contract (GAP-005) | Only future cases that need seeding. Neither approved case does |
| 3 | Whether `/temp-dev-login` is permanent | The auth fixture's shelf life. Isolated to one file by design |

---



## 6. Credentials

No credential appears in this repository, and none is needed: `/temp-dev-login` authenticates without one.

`.env.example` holds the placeholder shape and is committed, with both credential lines commented out. A populated `.env` is git-ignored and must never be committed. `aidlc-e2e-rules.md` §19 continues to apply to any future environment that does require credentials.

One correction for `.env` and `.env.example`: `BASE_URL` is set to `.../clinical-ui/`, which redirects to the site root. The path segment is stale and should be dropped.

---



## 7. G4 readiness

```text
[X] Data requirements derived from approved sources, with citations
[X] Zero real PHI; the environment declares its client data non-clinical
[X] Two-client requirement justified, and satisfiable — four clients present
[X] No credential needed; none present in the repository
[X] Field definitions known — optionValue="id", optionLabel="name"
[X] Cleanup obligation assessed — none, neither case mutates data
[X] Parallel safety confirmed — selection does not persist
[X] Data mode decision — option 2, tolerate any mode and record it
[X] Human sign-off
```

The earlier version of this plan carried a `G4 sign-off — NOT AVAILABLE` block, and it was marked approved. That approval is not carried forward, because the reconnaissance changed what the gate is being asked to certify: four of its blocking items dissolved and a new one appeared that nobody had seen when the mark was made. Signing off on the superseded version would record agreement to something that was never reviewed.

The gate is now genuinely reachable. It needs one answer.

```text
G4 sign-off

[  ] Approved — data mode option 1, require preview
[X] Approved — data mode option 2, tolerate any mode and record it as evidence
[  ] Approved — data mode option 3, assert per test
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

**What option 2 obliges the implementation to do.** Every test records the data mode it observed as an execution annotation, so a result is never reported without stating what it ran against. The suite does not fail on mode.

This is a deliberate trade. The tests stay runnable while the backend is down, which is the state today, and in exchange a green run carries the information needed to judge how much it is worth. What it does not do is prevent a false pass — it makes one visible after the fact. If this suite ever gates a release, revisit and take option 1.

