# Cross-suite review — NextGen Clinical Test Suite

**Date:** 2026-08-25
**Reviewed:** `nextgen-clinical-test-suite` (supplied as an archive)
**Purpose:** align this suite with the sibling suite where alignment is right, and record where it is not
**Status:** findings recorded; the decisions they raise are listed in §7

---

## 1. What the sibling suite is

An API-first test suite for the same product family, built by the same organisation on the **same stack** — Playwright, TypeScript, and Cucumber via `playwright-bdd`. It covers an 81-operation Clinical API across lookups, account-scoped CRUD, Analyze Data, a mobile gateway, and 21 treatment-plan Build endpoints, plus a small browser layer tagged `@ui`. It also carries Postman collections, a Postgres verification layer, and a daily scheduled report.

It is considerably broader than this suite. It is also governed differently: it has no requirements, no acceptance criteria, no gates, and no traceability record. Expected results are drawn from the running system and from investigation. That is not a criticism — it is an exploratory API suite doing a different job — but it explains most of the divergences below.

The comparison is worth making because the two suites test the same application from different sides, and it has already produced facts this suite did not have.

---

## 2. What it told us that we did not know

### 2.1 A second environment exists, and it is the primary one there

`dev2` is that suite's **mandatory daily target**; `dev` is secondary and `qas` is on demand. This suite had been pointed at `dev` since reconnaissance began, never as a decision — the URL was simply what the first screenshots showed.

**Verified 2026-08-25 by direct reconnaissance:** `clinical.dev2.rethinkbhtech.com` responds, accepts the same credential-free `/temp-dev-login` route, and serves the same four example clients as `dev`. This suite now runs against either (§4.1). Both were checked, and both passed.

### 2.2 Why the data is substituted — a standing outage, not a blip

Our execution report records `data-mode: substituted` and explains it as "the backend did not respond", which is what the banner says. The sibling suite's status table gives the cause:

> **Account-scoped CRUD** 🔴 **503** — Accounts-service 401 (blocks every tenant-scoped endpoint)

and describes it as the **top blocker, unchanged for eleven days**, caused by the removal of an Accounts-service trust key. Every tenant-scoped endpoint returns `503 Accounts service returned status 401 for account 18421`.

This reframes `BLK-010` materially. We had been treating substituted data as an intermittent condition to be recorded per run. It is better understood as **the current standing state of both environments**, with a known cause, no fix in flight, and a known remedy that would flip it in one step.

The practical consequence for this suite is unchanged but now much better founded: our two scenarios cannot exercise the data path today, on any environment, and no amount of rerunning will change that until the Accounts key is restored.

### 2.3 The inert "Add a program" control is consistent with the same outage

The intake record for `REQ-CLIENT-002` notes the `program-rail-add` control as enabled but inert, and flags that the environment was serving demonstration data at the time. The sibling suite's status table shows the entire treatment-plan Build surface — 21 endpoints, including programs — returning 503 on dev2 for the same Accounts-401 reason, and the nested behavior-plan surface returning 404/503 for want of a seeded program.

This does not prove the control is not also unimplemented, and it should not be recorded as though it did. It does mean **the observation is fully explained by a known backend outage**, which lowers the case for filing it as a frontend defect. Finding 5 in the intake record is updated accordingly.

### 2.4 An API contract exists, which we had recorded as missing

`GAP-005` / `P-05` — "API contract for setup, cleanup, and verification" — has been open since intake on the basis that this repository has no contract for the application. That was true of this repository and false of the organisation. The sibling suite carries:

- Live Swagger for Clinical, Gateway, and Security on each environment
- Three Postman collections, the largest 146 kB, covering 86 requests against dev2
- A working API client and typed path helpers
- A documented security-login flow that yields a bearer token

Whether this suite should acquire an API layer is a scope decision, not a documentation fix, and is listed in §7. But `GAP-005` can no longer be described as "no contract exists".

### 2.5 A defect class we should expect

Their `known items` list includes reference data whose **ids collide with different meanings across environments** — `ref.lesson_status` id 4 is "Generalizing" live while the backend dictionary decodes 4 as "Mastered". They also record two dropdown values, "Sessions" and "sessions", that render identically.

Both are the kind of defect a status-only check cannot see, and both bear on `GAP-012`, the open question about mastery calculation. Anyone answering `GAP-012` should read their `contract-vocabulary.feature` first.

---

## 3. A defect this review found in our own code

Reconnaissance for §2.1 read the data-mode banner immediately after load and got `demo-banner-preview` — "Showing real data" — on **both** environments. Waiting for the client list to settle and reading again gave `demo-banner-substituted` on both.

The banner is therefore **not stable on load**: it renders the optimistic state first and switches once a backend call has failed. Our `readDataMode()` did no waiting, and it now decides whether a run's traces may be retained.

In practice we were lucky: the reading is taken in `AfterScenario`, by which point the page has long settled, and every recorded run says `substituted`, which matches. The failure would also have erred safe — a premature `preview` reading withholds traces rather than releasing them.

Fixed regardless, in `src/fixtures/data-mode.ts`: the read now waits for the client switcher's loading indicator to detach, which is the application's own signal that the list has settled, and reports `mixed` when more than one banner is present instead of silently preferring whichever was checked first.

---

## 4. What we adopted

### 4.1 Environment selection by `ENV`

`src/config/environments.ts`, modelled on their `support/config.ts`. `npm run test:dev` and `npm run test:dev2`. `dev` stays the default, because every approved artifact for `REQ-CLIENT-001` was produced against it and moving the default would invalidate that evidence rather than extend it.

Two guards theirs does not have, both added after this review's own mistakes:

- An unrecognised `ENV` throws instead of falling back to the default. A typo that silently tests the default host produces a green run that means nothing.
- `ENV` and `BASE_URL` must agree when both are set. This is not hypothetical: a stale `BASE_URL` in a local `.env` silently beat `ENV=dev2`, and the run **reported itself as dev2 while exercising dev**. Only the new report metadata caught it.

`qas` is deliberately not modelled. Their config maps it to the `dev` host with a note that the QAS UI is not deployed, which is a placeholder rather than an environment.

### 4.2 Environment recorded in every report

Playwright `metadata` now carries the environment and base URL, derived from **the URL actually in use** rather than from what was requested — so a run cannot name an environment it did not target. This is what exposed the mislabel above.

### 4.3 The `@known-defect` convention

A scenario tagged `@known-defect` asserts the behaviour we want against a defect that is live, so it fails by design; it is excluded from `npm test` and run by `npm run test:defects`. It lets a live defect be tracked without either turning the default run red or — the real risk — being quietly encoded as expected behaviour.

**No such scenario is written yet, and the obvious candidate is deliberately omitted.** Writing one for the inert program control would mean asserting what it should do, which no approved source states. That is `GAP-007`. The tag and the script are ready for when a Clinical SME answers.

---

## 5. What we did not adopt, and why

| Their practice | Why not |
|---|---|
| **Credentials in the repository.** `support/config.ts` and `.env.example` carry API application keys and a test-account username and password as literals | `aidlc-e2e-rules.md` §18 and §19 prohibit it outright. Nothing here needs it — the dev sign-in route takes no credentials — so adopting the pattern would import a risk for no benefit |
| **Asserting on demo client names.** Their UI steps assert that "Ava Martinez", "Noah Reed", "Lily Nguyen" and "Eli Brooks" are all visible | Our test data plan chose data-agnostic assertions precisely to avoid this. Those names are substituted example data; the assertions pass only while the backend stays down and would break on restoration — inverting the signal, since a fix would look like a regression |
| **`video: 'on'` and a screenshot on every step** | Good evidence practice, but both capture page content, and this suite's trace-retention gate exists because that content may be real clinical data. Ours stay at `retain-on-failure`. Reconsider if the same data-mode gate is extended to cover them |
| **`fullyParallel: false, workers: 1`** | Correct for them: shared account, CRUD scenarios that create and delete rows. Ours are read-only and client selection is in-memory per page load, so §17 parallelism stays |
| **`trace: 'off'`** | `clinical-rules.md` §36 wants execution evidence. We keep traces on failure and gate their retention on data mode |
| **`.run/` IntelliJ configurations** | Editor-specific, and this project is not developed in IntelliJ |

The first two are the ones that matter. The rest are reasonable choices for a different suite.

---

## 6. Something they should know

Their `features/ui.feature` opens by stating the app "is in DemoMode — it does not reach the backend, so example/demonstration data is shown", and their steps assert the four demo client names are visible.

Reconnaissance on 2026-08-25 found that the banner **starts** at "PREVIEW BUILD — Showing real data. Example data will be substituted, and named here, if the backend cannot be reached", and only becomes the demonstration-data banner once a call fails. So DemoMode is not a build property that holds the app offline; it is a fallback the app enters on failure, and the same build would serve real data if the Accounts outage were fixed.

If that happens, their `@ui` scenarios break — not because the application regressed, but because the four hardcoded names disappear. This is the failure mode our data-agnostic assertions were chosen to avoid, and it is worth passing back to whoever maintains that suite.

---

## 7. Decisions this raises

None of these are ours to take alone, and none blocks the current critical path.

1. **Should this suite acquire an API layer?** The contract behind `GAP-005` exists after all (§2.4). An API layer would enable setup and cleanup, real verification beyond the UI, and `F-05`'s test data lifecycle. It is also a substantial scope increase and would need its own gate.
2. **Should `dev2` become the default target?** It is the sibling suite's mandatory daily environment. Today both behave identically, so there is no reason to move and a good reason not to — the S9 evidence was produced on `dev`.
3. **Should the two suites converge, or stay separate?** They share a stack, an application, and an organisation, and they disagree on credential handling and on whether a test may depend on example data. If they are ever merged, those two disagreements have to be settled first.
4. **Does `BLK-010` need rewording?** It currently reads as a per-run risk. §2.2 suggests it is a standing condition with a known cause, which is a different thing to record in the evidence.
