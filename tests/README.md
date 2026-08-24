# Test Framework

**Status:** Proposal — pending review (prerequisite P-04, Gate G5)
**Stack:** Playwright + TypeScript
**Governed by:** `aidlc-docs/rules/aidlc-e2e-rules.md` + `aidlc-docs/rules/clinical-rules.md`

This is framework infrastructure only. It contains no tests, no Page Objects, and no fixtures — see "What is deliberately absent" below for why.

---

## Intended layout

```text
tests/                    Playwright specs, mirroring the module taxonomy
  <module>/               e.g. tests/client/
src/
  pages/                  Page Objects
  fixtures/               Shared fixtures, including authentication
  api/                    API clients used for setup, cleanup, and verification
  data/                   Synthetic test data factories
features/                 Gherkin feature files, if BDD tooling is adopted
```

Directories are created on first use rather than committed empty. Path aliases (`@pages/*`, `@fixtures/*`, `@api/*`, `@data/*`) are already configured in `tsconfig.json`.

## Configuration decisions

Four settings in `playwright.config.ts` are driven by the rules rather than by Playwright's defaults. They are the ones most likely to be "corrected" by someone unfamiliar with the constraints, so the reasoning is recorded here as well as in the config.

**`retries: 0`.** Playwright's usual advice is to retry in CI. `aidlc-e2e-rules.md` §25 prohibits rerunning a test until it passes and then reporting it as passed — which is precisely what automatic retries do, silently. Inconsistent tests are classified `FLAKY` and investigated instead. The traceability validator enforces the same rule on recorded results.

**`fullyParallel: true`.** §17 requires order-independent tests. Running everything in parallel makes an order dependency fail on the first run rather than lurking until it breaks someone else's work.

**`trace`, `video`, `screenshot` retained on failure.** `clinical-rules.md` §36 asks for screenshots and traces as execution evidence. Retaining only on failure supplies the S9 evidence bundle without generating large artifacts for passing runs.

**Timeouts as upper bounds only.** `actionTimeout` and `navigationTimeout` exist to fail a hung test, not to wait for one. §16 forbids arbitrary waits: synchronise on a locator, response, URL, or UI condition, never on elapsed time. `page.waitForTimeout()` requires a documented technical justification.

## Open decisions for review

These are architecture choices this scaffold does **not** make, because they should be decided rather than inherited.

| # | Decision | Notes |
|---|---|---|
| F-01 | BDD tooling | The rules name "BDD/Cucumber". Options are `playwright-bdd` (keeps Playwright's runner, parallelism, and tracing) or `@cucumber/cucumber` with a custom Playwright world (more conventional Cucumber, loses some Playwright tooling). Nothing is installed yet. |
| F-02 | Whether Gherkin is executable at all | An alternative is to keep `.feature` files as the reviewed specification for Gate G3 and implement tests directly in Playwright, tagged with the scenario ID. Cheaper to maintain; loses automated spec-to-test binding. |
| F-03 | Browser coverage | Only Chromium is configured. Add browsers only where a requirement justifies it. |
| F-04 | Authentication strategy | Depends on the application's actual mechanism, which is unknown. See below. |
| F-05 | Test data lifecycle | Whether data is seeded by API, by UI, or from a fixture pool. Depends on the API contract, which is missing (GAP-005). |

## What is deliberately absent

No Page Objects, no fixtures, no authentication utility, and no test data factories are included.

Writing them now would mean inventing selectors, an authentication flow, and API endpoints for an application this repository has no contract for and no access to. `aidlc-e2e-rules.md` §4 prohibits inventing API endpoints, fields, and workflow steps, and §15 prohibits introducing brittle selectors. A plausible-looking stub is worse than an absent one, because it looks like a decision that has been made.

They are added once the inputs below exist.

## Required to complete the framework

| Input | Unblocks |
|---|---|
| Authentication mechanism, and provisioned synthetic test accounts with defined roles | `src/fixtures/` auth fixture (F-04) |
| API contract for setup and cleanup (GAP-005) | `src/api/`, test data lifecycle (F-05) |
| Approved module taxonomy (P-06) | Directory naming under `tests/` |
| Environment policy — which environments are testable, and reset expectations | Data isolation strategy |
| Decision on F-01 and F-02 | Whether `features/` exists and how steps bind |

Test accounts must be synthetic. Credentials belong in the environment, never in the repository (§19).

## Local use

```bash
npm install
npx playwright install chromium   # browsers are not installed by npm install
npm run typecheck
npm test                          # no tests exist yet
```

Copy `.env.example` to `.env` and set `BASE_URL` if you are not targeting the default dev environment. `.env` is git-ignored and must never contain real credentials or PHI.

## Conventions

Once tests exist, they follow the construction prompt at `aidlc-docs/construction/generate-playwright.md`. In brief: locators follow the preference order in §15, every test carries `@REQ-` and `@TC-` tags so execution reports link back to the requirement, and each test creates and cleans up its own state.
