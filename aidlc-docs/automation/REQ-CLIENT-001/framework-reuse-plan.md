# Framework Reconnaissance & Reuse Plan — REQ-CLIENT-001

**Stage:** S6
**Gate this feeds:** G5
**Covers:** `TC-CLIENT-001`, `TC-CLIENT-002`, G3-signed 2026-08-24
**Satisfies:** the mandatory inspect-before-build step of `aidlc-e2e-rules.md` §14 and §22

Reconnaissance was performed against the dev environment on 2026-08-24. This document records what exists, what must be built, and three findings that change decisions made at earlier stages.

---

## 1. Existing framework inventory


| Component class                    | Present                                   | Reusable       |
| ---------------------------------- | ----------------------------------------- | -------------- |
| Page Objects (`src/pages/`)        | None. Directory does not exist            | —              |
| Fixtures (`src/fixtures/`)         | None                                      | —              |
| API clients (`src/api/`)           | None                                      | —              |
| Auth utilities                     | None                                      | —              |
| Test data factories (`src/data/`)  | None                                      | —              |
| Playwright config                  | `playwright.config.ts`                    | Yes, unchanged |
| TypeScript config and path aliases | `tsconfig.json`, aliases already declared | Yes, unchanged |
| Conventions                        | `tests/README.md`                         | Yes            |


Nothing is reusable because nothing exists. `tests/` holds only a README. Every component below is therefore new by necessity rather than by preference, which satisfies the §14 and §22 justification requirement trivially — there is no existing component any of them could duplicate.

---



## 2. Application reconnaissance

Performed against `https://clinical.dev.rethinkbhtech.com/`, 2026-08-24.


| Property                   | Finding                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| Framework                  | Angular 21.2.18, single-page application                             |
| Locator strategy available | `data-testid` attributes throughout the shell and the clients screen |
| UI component library       | PrimeNG — the client switcher is a `p-select`                        |
| Configured `BASE_URL`      | `.../clinical-ui/` **redirects to** `/`. The path segment is stale   |




### Routes, read from the application bundle

```text
sign-in            temp-dev-login     (empty)            clients
clients/:clientId  program-library    behavior-support   analyze-data
programs/:programId
rbt                rbt/sessions       rbt/clients
sessions/new       sessions/historical/new
sessions/:sessionId  sessions/:sessionId/run  sessions/:sessionId/summary
```

`clients` is the Client area of AC-001. `behavior-support` and `analyze-data` correspond to AC-004 and AC-005. The `sessions/*` routes correspond to the session workflows the requirement lists as out of scope, and confirm they are genuinely separate workflows rather than part of this one.

### Authentication — BLK-007 is resolved

Navigating to `/temp-dev-login` signs in without credentials and redirects to `/clients`. The session is stored in `localStorage` under `bh_clinical_auth_session` and survives reload.

This is the mechanism behind the note added to `.env`. It resolves the blocker that has held every stage from S5 onward, and it means no credential needs to exist in the repository or the environment at all — `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` remain correctly commented out in `.env.example`.

Two cautions. The route name says `temp`, so it is presumably not permanent, and the auth fixture should be isolated enough that replacing it later touches one file. And a credential-free login route means the environment has no authorization boundary to test against, which is consistent with GAP-002 being unanswerable rather than merely unanswered.

### Element identifiers observed on `/clients`

```text
app-shell-header      app-shell-nav          user-menu
user-menu-trigger     user-menu-name         user-menu-role
client-switcher-select                       clients-list-page
clients-list-search-name   clients-list-search-id
clients-list-items         clients-list-link-<clientId>
demo-banner-preview   demo-banner-substituted   demo-banner-mixed
```

Loading states appear as `client-switcher-loading` and `clients-list-loading`, replaced by the settled testids once data arrives. These are the correct synchronisation signals under `aidlc-e2e-rules.md` §16: waiting for `clients-list-items` to exist is a condition, not a timeout.

### Selection behaviour, verified

The switcher renders its placeholder "Select a client" on load, so no client is active initially. Opening it exposes four options; selecting the second changed the combobox accessible name to that client's name and marked the option selected. The URL did not change.

This confirms AC-002's observable outcome is exactly what `TC-CLIENT-002` asserts, and that the case's precondition 4 — no client active at the start — holds naturally rather than needing to be forced.

---



## 3. Three findings that change earlier decisions



### 3.1 Client selection does not persist — parallel execution is safe *(partially corrected, see 3.4)*

Open question 10 from the S5 plan is answered. After reload, the switcher returned to its placeholder while the auth session remained. `localStorage` contains only `bh_clinical_auth_session`; there is no client-context key, and none in `sessionStorage`.

Selection is in-memory per page load. It is not shared server-side state, so two tests selecting different clients cannot interfere. `fullyParallel: true` **is safe** and needs no change.

That conclusion about *selection* still holds and was confirmed in execution. The conclusion about *parallel execution as a whole* was too broad: it did not examine authentication, which turned out to be the hazard. See 3.4.

### 3.2 The application is serving substituted example data

The banner on `/clients` reads:

> The backend did not return clients for this screen, so example data is shown instead. These are not real clinical records.

The application has three declared data modes, each with its own testid: `demo-banner-preview` for real data, `demo-banner-substituted` for fallback example data, and `demo-banner-mixed`. On the root route the banner was `preview` and stated "Showing real data"; on `/clients` it switched to `substituted`.

**This is the most consequential finding of the reconnaissance**, and it is a test-reliability hazard rather than a convenience.

The four clients currently visible exist only because the backend did not respond. If the backend recovers, this screen will show different clients, and any test asserting today's names will fail — not because the application broke, but because the data source changed underneath it. The reverse is equally true: a test written against seeded backend data would fail today.

Worse is the silent case. A test that merely checks "some clients are listed" would pass identically in both modes, so a complete backend outage would produce a green suite. That is a false pass of exactly the kind `aidlc-e2e-rules.md` §25 and the traceability validator exist to prevent, and no amount of retry discipline would catch it.

Two consequences follow, and both are already satisfiable:

**Tests must be data-agnostic.** `TC-CLIENT-002` is written as "select Client B, assert Client B is active and Client A is not", which is a statement about shape rather than values. It can be implemented by reading the option labels at runtime and selecting the second, asserting against whatever was read. No client name is hardcoded. This also satisfies requirement §15's parameterisation rule.

**Tests must assert the data mode.** The banner testid makes the current mode machine-readable, so a test can fail fast when it runs in an unintended mode. Whether the suite should require `preview`, tolerate `substituted`, or record the mode as execution evidence is a decision for G4, not one to be taken here.

### 3.3 `Ava Martinez` is confirmed example data

Requirement §15 lists `Ava Martinez` as a value observed in the supplied screenshots, and the S5 PHI attestation excluded it from fixture use because its provenance was unknown.

It appears in the current client list, on a screen the application explicitly labels as containing no real clinical records. The provenance question is answered for that value.

The exclusion still stands, for a different reason: those names are the application's fallback data, not fixtures under our control. They will disappear when the backend recovers. Depending on them would fail for the reason described in 3.2, not for a privacy reason.

### 3.4 The dev login cannot handle concurrent sign-ins *(added after first execution, 2026-08-24)*

Not a reconnaissance finding — this one was found by running the suite, and it corrects 3.1.

With two workers each signing in for itself, one succeeded and the other was redirected `/temp-dev-login` → `/?transferToken=…` → `/` → `/sign-in?returnTo=%2Fclients`. Serialising to a single worker made both pass. The dev login's token exchange does not tolerate two sessions being established simultaneously.

The reconnaissance established that no *application* state is shared between parallel tests, which remains true. It did not consider that the act of signing in is itself contended, so "parallel execution is safe" was broader than the evidence supported.

The suite now authenticates once in a `setup` project and reuses the saved session, so parallelism is preserved and the contention disappears. The underlying constraint is unresolved and belongs to the application team.

---



## 4. Components required

Every one is new. The plan is the smallest set that covers both approved test cases.


| Component                             | Responsibility                                                                 | Justification                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/fixtures/auth.fixture.ts`        | Establish an authenticated session via `/temp-dev-login`                       | Both cases need precondition 1. Isolating the `temp-` route here means one file changes when it is retired. As built, it is driven once by `tests/auth.setup.ts` rather than per test — see 3.4 |
| `src/pages/ClientsPage.ts`            | Client area: page loaded state, clients list, search fields                    | AC-001; both cases                                                                                                                                                                              |
| `src/pages/ClientSwitcher.ts`         | The `p-select`: read options, select by index or label, read the active client | AC-002. Separate from `ClientsPage` because the switcher lives in the app shell and appears on every route, not only `/clients`                                                                 |
| `src/fixtures/dataMode.ts`            | Read and assert the banner data mode                                           | Finding 3.2. Small, but it is the guard against a false green                                                                                                                                   |
| `tests/client/REQ-CLIENT-001.spec.ts` | ~~The two approved cases as a Playwright spec~~                                | **Superseded.** The scenarios execute from the feature file instead — see 4.1                                                                                                                   |




### 4.1 Corrected after the BDD migration *(2026-08-24)*

This plan assumed the approved cases would be written as a Playwright spec. They are not. `playwright-bdd` compiles `features/client/REQ-CLIENT-001.feature` into runnable tests, so the G3-approved Gherkin executes directly and the spec file was deleted.

Two components take its place:


| Component                   | Responsibility                                                                                                              | Justification                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/fixtures/test.ts`      | The extended Playwright test that step definitions bind to; carries the `clients` page object and the scenario-scoped state | Required by the BDD runner. Also where per-scenario state lives, since Gherkin steps cannot return values |
| `src/steps/client.steps.ts` | Step definitions for the CLIENT module's Gherkin                                                                            | S7 output, replacing the spec file                                                                        |


The reasoning is in `implementation-notes.md` §7. In short: `aidlc-e2e-rules.md` names the framework as "BDD/Cucumber" and §9 presumes step definitions exist, and this plan proposed neither — an omission, not a considered deviation.

**This is why G5 is re-presented for signature in §5.**

No API client is proposed. There is no API contract (GAP-005), no data seeding is possible, and neither case needs setup beyond authentication. Adding one would be speculative.

No Page Object is proposed for Skills Programs, Behavior Support, or Analyze Data. Those serve AC-003 to AC-005, which remain blocked on GAP-010.

### Locator strategy

`aidlc-e2e-rules.md` §15 sets the preference order, and the application supports the top of it. Use `getByTestId` for structural anchors and `getByRole` for the switcher, whose combobox name reflects the active client and is therefore the natural assertion target.

One implementation note that will otherwise cost someone an afternoon: the `p-select` carries `appendTo="body"`, so its option list is portaled outside the switcher element. Options must not be located as descendants of the switcher.

---



## 5. G5 readiness

```text
[X] Existing framework inventoried
[X] Every proposed component justified as new, with no existing equivalent
[X] Smallest maintainable change proposed
[X] Locator strategy follows the §15 preference order
[X] Application reconnaissance performed against a live environment
[X] Data mode decision — option 2, taken at G4
[X] Human sign-off
```

The workflow's blocking condition for this gate is "no framework in place". That condition was met when this plan was written: the framework did not exist and was proposed here rather than inspected. G5 therefore doubles as approval of the framework itself as a work item, which is how it was signed.

```text
G5 sign-off — round 1 (superseded)

[X] Approved — component plan accepted, S7 may proceed
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Approval covers the five components in §4 and nothing beyond them. Any further component — an API client, a Page Object for Skills Programs, Behavior Support, or Analyze Data — is outside this plan and needs its own justification, because the criteria those would serve are still blocked on GAP-010.

### G5 round 2 — required

The signature above covered a plan that no longer describes the framework. Two things changed after it was given, and both are material.

The scenarios execute from Gherkin rather than from a Playwright spec, which adds `src/fixtures/test.ts` and `src/steps/client.steps.ts` and removes `tests/client/REQ-CLIENT-001.spec.ts` (4.1).

Authentication moved into a setup project because concurrent sign-ins collide, which adds `tests/auth.setup.ts` and corrects finding 3.1 (3.4).

```text
[X] Component inventory corrected
[X] BDD tooling decision recorded — F-01 and F-02 in OPEN-DECISIONS.md
[X] Feature files execute from their reviewed location, not from a copy
[X] Unmatched steps fail generation — verified, not assumed
[X] Parallel-safety claim corrected against observed behaviour
[X] Human sign-off
```

```text
G5 sign-off — round 2

[X] Approved — revised framework accepted
[  ] Rejected — returned with comments

Approver: Masud Rana
Role: Sr. QA Automation Engineer
Date: 2026-08-24
```

Approval covers the revised inventory in §4 and §4.1 — seven components — together with the corrections in 3.4 and 4.1. The round 1 exclusions still stand: no API client, and no Page Object for Skills Programs, Behavior Support, or Analyze Data while GAP-010 is open.

