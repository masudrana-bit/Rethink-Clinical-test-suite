# Static Validation Report — REQ-CLIENT-001

**Stage:** S8 — Static Validation & Code Review
**Feeds:** Gate G6
**Date:** 2026-08-24
**Scope:** `src/`, `tests/`, `playwright.config.ts`, `features/client/REQ-CLIENT-001.feature`

Every check below was executed. Nothing is reported as passing on inspection alone, and the one check that could not run is recorded as such rather than as a pass.

---

## 1. Result

| # | Check | Rule | Result |
|---|---|---|---|
| 1 | TypeScript compiles | — | **PASS** |
| 2 | Feature files generate; every step binds | §9 | **PASS** |
| 3 | All scenarios discovered by the runner | — | **PASS** |
| 4 | No elapsed-time waits | §16 | **PASS** |
| 5 | No banned selector patterns | §15 | **PASS** |
| 6 | No hardcoded credentials | §19 | **PASS** |
| 7 | No PHI-shaped literals | clinical §5, §6 | **PASS** |
| 8 | Requirement and test-case tags present | §5, §12 | **PASS** |
| 9 | Retries disabled | §25 | **PASS** |
| 10 | Lint and formatting | §23 | **PASS** — Biome, added 2026-08-25; see §4 |

Nine of ten pass. The tenth is an unmet tooling prerequisite, not a failure; see §4.

---

## 2. Automated checks

### 1. TypeScript compiles

```text
npm run typecheck    exit 0, no diagnostics
```

### 2. Feature files generate and every step binds

```text
npm run bddgen       exit 0, no missing step definitions
```

`missingSteps: "fail-on-gen"` means this is a real check rather than a formality: an unmatched step aborts generation. Confirmed by deliberate negative test — a scratch feature containing an unimplemented step produced exit 1 and named the step. The scratch file was removed.

This is the check that makes the coverage claim in the traceability record verifiable. A scenario cannot silently stop executing.

### 3. All scenarios discovered

```text
npx playwright test --list

[setup]    auth.setup.ts:11:1  authenticate
[chromium] REQ-CLIENT-001.feature.spec.js:10:3  A user reaches the Client area
[chromium] REQ-CLIENT-001.feature.spec.js:17:3  Selecting a client makes that client the active client
```

Two scenarios approved at G3; two discovered. The third entry is the sign-in dependency, not a test of behaviour.

### 4. No elapsed-time waits — §16

Searched `src/` for `waitForTimeout`, `setTimeout`, `sleep(`, `.pause(`, and `networkidle`. **No matches.**

`networkidle` is included because Playwright discourages it and it is a disguised time-based wait. Synchronisation throughout is on application state: the post-login URL, `clients-list-loading` reaching zero, `client-switcher-loading` clearing, and `aria-expanded` on the switcher.

### 5. No banned selector patterns — §15

Searched `src/` for `nth-child`, `xpath=`, `css=`, `>> nth`, `$(`, and `locator("."` / `locator("#"`. **No matches.**

Every locator is `getByTestId` or `getByRole`.

### 6. No hardcoded credentials — §19

Searched `src/` case-insensitively for `password`, `passwd`, `secret`, `apiKey`, `api_key`, `Bearer`, `credential`. **One match, in prose:** a comment in `auth.fixture.ts` describing the route as "credential-free". No credential value exists in the repository.

`bh_clinical_auth_session` appears as a *key name*, not a token. The session value itself lands in `playwright/.auth/user.json`, which is git-ignored.

### 7. No PHI-shaped literals — clinical §5, §6

Searched `src/` and `features/` for every client name and identifier observed in the dev environment — `Ava`, `Martinez`, `Noah`, `Reed`, `Lily`, `Nguyen`, `Eli`, `Brooks`, `872364`, `481957`, `635208`, `794126` — and for `DOB`, `MRN`, `SSN`. **No matches in either location.**

This follows from the data-agnostic design rather than from careful redaction: client names are read from the switcher at runtime and referred to symbolically as "Client A" and "Client B". There is nothing to leak because nothing is written down.

### 8. Requirement and test-case tags present — §5, §12

From the generated `bddFileData`:

| Scenario | Tags |
|---|---|
| A user reaches the Client area | `@REQ-CLIENT-001` `@TC-CLIENT-001` `@P1` `@positive` `@AC-001` |
| Selecting a client makes that client the active client | `@REQ-CLIENT-001` `@TC-CLIENT-002` `@P1` `@positive` `@AC-002` |

`@REQ-CLIENT-001` is inherited from the `Feature` tag and materialises on each generated test, so both scenarios carry a requirement ID, a test case ID, and an acceptance criterion ID.

Verified as functional, not merely present: `npx playwright test --grep "@TC-CLIENT-002" --list` resolves to exactly that one scenario. Tag-based selection is what links an execution result back to its requirement, and what `npm run test:p0` depends on.

### 9. Retries disabled — §25

`playwright.config.ts` sets `retries: 0` unconditionally, with no CI branch. A pass obtained by repetition cannot be produced silently.

---

## 3. Manual inspection

Three things the automated checks cannot see.

**No conditional assertions.** Neither step definition branches on application state before asserting. There is no `if (visible) expect(...)` construction, which would let a test pass by skipping its own check.

**No assertion-free steps.** Every `Then` asserts. Every `Given` either navigates or asserts a precondition, and two of them assert preconditions that would otherwise be assumed — see the review record.

**No scenario interdependence.** Scenario state lives in a test-scoped fixture, freshly constructed per scenario. Nothing is module-level or mutable across tests. The suite runs `fullyParallel: true` and passes, which exercises this rather than merely claiming it.

---

## 4. The failing prerequisite — closed 2026-08-25

**Originally:** no linter or formatter was configured, no `lint` script existed, and §23 names lint and formatting as part of static validation. The check was reported NOT RUN rather than PASS, because nothing was known about the code's conformance to a standard when no standard was defined. Raised as **F-06**.

**Now resolved.** Biome 2.5.10 provides both linting and formatting, run by `npm run lint`. The check passes across all 12 source files.

Biome rather than ESLint for a specific reason: the project is on TypeScript 7, and `typescript-eslint` currently supports up to TypeScript 6.1, so an ESLint setup would have meant downgrading the compiler to satisfy the linter. Biome parses TypeScript itself and has no such peer constraint. It also replaces Prettier, so F-06's two halves are met by one tool.

Three things surfaced when it first ran, all now settled:

| Finding | Disposition |
|---|---|
| `noEmptyPattern` on the `scenario` fixture in `src/fixtures/test.ts` | **Suppressed with a reason.** Playwright reads a fixture's destructured parameter to determine its dependencies, and an empty pattern is how the API expresses "no dependencies". Rewriting it would change the contract, not tidy it. |
| Two import-ordering violations | Fixed automatically. |
| Line endings across 11 files | Fixed, and prevented from recurring by a new `.gitattributes` declaring `eol=lf`. Without it, `core.autocrlf` on Windows gives CRLF locally while Linux CI sees LF, and the formatter contradicts itself depending on who ran it. |

The formatting pass reflowed several statements to the configured 100-character width. Reviewed against `git diff -w`: cosmetic only, no logic altered, and the suite passes unchanged.

---

## 5. G6 readiness

```text
[X] Compiles
[X] All approved scenarios execute and are discovered
[X] No banned wait patterns
[X] No banned selector patterns
[X] No credentials in source
[X] No PHI in source or scenarios
[X] Traceability tags present and functional
[X] Retries disabled
[X] Lint and formatting — Biome, added 2026-08-25 (F-06 closed)
[X] Manual inspection for conditional and absent assertions
```

Every check now passes. The lint line was the sole outstanding item at the time G6 was signed, and it was signed with that gap recorded rather than hidden.

The review record at `review-record.md` carries the QA and engineering judgements. G6 is signed there, not here.

---

## 6. Static-validation addendum — cross-suite alignment

**Date:** 2026-08-25  
**Scope:** `src/config/`, `src/api/`, `src/fixtures/data-mode.ts`, `scripts/api-readiness.mjs`, `playwright.config.ts`, and associated package scripts

The cross-suite alignment changed framework code after the G6 addendum was signed. The original report remains the record of what was checked then; this section records the checks against the new state.

| Check | Result |
|---|---|
| `npm run lint` | **PASS** — 19 files checked |
| `npm run typecheck` | **PASS** |
| `npm run bddgen` | **PASS** — both approved scenarios still bind |
| `npm run validate:traceability` | **PASS** for structure and references; G7 remains not ready |
| Full suite on default `dev2` | **PASS** — setup plus both scenarios, first attempt, retries disabled |
| Full suite on `dev` | **PASS** — setup plus both scenarios, first attempt, retries disabled |
| Environment metadata | **PASS** — dev2 run reports `dev2` and its actual dev2 URL |
| Unknown `ENV` | **PASS** — fails configuration rather than falling back |
| Conflicting `ENV` / `BASE_URL` | **PASS** — fails configuration rather than mislabelling the run |
| Data-mode settle behavior | **PASS** — both hosts settle from the optimistic preview banner to `substituted`; the fixture waits for the client-switcher loading indicator to clear before reading |
| No elapsed-time waits in `src/` | **PASS** — searched the original §16 patterns, no matches |
| No banned selector patterns in `src/` | **PASS** — searched the original §15 patterns, no matches |
| No known credential values | **PASS** — searched for all values observed in the supplied sibling suite, no matches |
| No observed demo-client names or ids in `src/` | **PASS** |

### Review-relevant findings

**The data-mode change is substantive.** The old implementation read the first banner it found. Reconnaissance showed that both environments initially render `demo-banner-preview` and switch to `demo-banner-substituted` only after the backend request fails. The old `AfterScenario` timing happened to read after settlement in recorded runs, and a premature preview reading would have withheld traces rather than released them, so no unsafe evidence retention was found. The new implementation removes reliance on timing by waiting for the application's own loading indicator.

**The API layer is a dormant capability, not coverage.** No scenario imports it, no traceability edge points to it, and no acceptance criterion is claimed for it. Its authenticated client was probed against dev2: gateway access succeeds, while tenant-scoped routes return `503 Unavailable/AccountsService`. The readiness probe reports that state without retrying or treating it as a test failure.

**The default environment change does not rewrite historical evidence.** The S9 bundle remains a `dev` run. New reports identify `dev2` through metadata derived from the actual URL. A dev2 result must be recorded as a new execution, not attached to the old run.

This addendum passes static validation. G5 round 3 and the G6 second addendum were approved by Masud Rana, Sr. QA Automation Engineer, on 2026-08-25.
