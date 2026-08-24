# Static Validation Report — REQ-CLIENT-001

**Stage:** S8 — Static Validation & Code Review
**Feeds:** Gate G6
**Date:** 2026-08-24
**Scope:** `src/`, `tests/`, `playwright.config.ts`, `aidlc-docs/bdd/client/REQ-CLIENT-001.feature`

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
| 10 | Lint and formatting | §23 | **NOT RUN — no linter configured** |

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

Searched `src/` and `aidlc-docs/bdd/` for every client name and identifier observed in the dev environment — `Ava`, `Martinez`, `Noah`, `Reed`, `Lily`, `Nguyen`, `Eli`, `Brooks`, `872364`, `481957`, `635208`, `794126` — and for `DOB`, `MRN`, `SSN`. **No matches in either location.**

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

## 4. The failing prerequisite

**No linter or formatter is configured.** There is no ESLint, Prettier, or Biome configuration in the repository, and no `lint` script. §23 names lint and formatting as part of static validation, so this check did not run.

It is reported as NOT RUN rather than PASS. The distinction matters: nothing is known about the code's conformance to a standard, because no standard is defined.

This is not a defect in `REQ-CLIENT-001`'s automation and does not block G6 on its own. It is a gap in the framework, and it will apply to every requirement that follows. Recommended for the next framework increment; it is cheap now, at two files and seven components, and grows more expensive with every test added.

Raised as **F-06** in `OPEN-DECISIONS.md`.

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
[ ] Lint and formatting — no tooling configured (F-06)
[X] Manual inspection for conditional and absent assertions
```

The review record at `review-record.md` carries the QA and engineering judgements. G6 is signed there, not here.
