# Project Rules — Rethink Clinical Test Automation

> **Steering file.** Every AI agent working in this repo must load and obey this file
> before drafting or generating anything. These rules are the persistent source of
> truth across all AIDLC phases (Inception, Construction, Operations).

## The AIDLC loop (non-negotiable)

For every task, the agent MUST:

1. Restate the intent in one sentence.
2. Draft a plan and **ask clarifying questions** — do not write code yet.
3. Wait for human validation of the plan.
4. Only then generate code/tests.
5. Stop and present output for human review before marking the task done.

The AI proposes. The human approves. No exceptions.

## Stack (fixed)

- **Runner:** Playwright (`@playwright/test` browser automation).
- **BDD layer:** Cucumber (`@cucumber/cucumber`) with Gherkin `.feature` files.
- **Language:** TypeScript.
- **Pattern:** Page Object Model for UI; typed API client for API tests.
- **Reporting:** Cucumber HTML report + Playwright traces on failure.

Do not introduce other frameworks (Cypress, Selenium, Jest) without a human decision.

## App facts (from the site-crawler snapshot)

- **App:** Rethink Clinical — an Angular single-page app.
- **Base URL (dev2):** `https://clinical.dev2.rethinkbhtech.com/`
- **API base:** `https://dev2.internal.rethinkbhtech.com/mobile-gateway-api`
- **Auth base:** `https://dev2.internal.rethinkbhtech.com/mobile-security/api/v1/auth`
- **Runtime config:** `GET /runtime-config.json` exposes `apiBaseUrl`, `authApiBaseUrl`, `authApplicationKey`.
- **Traffic is read-heavy:** 13 of 15 endpoints are `GET`. Only `auth/login` and
  `auth/refresh-token` are `POST`. **There are zero HTML forms** in the crawled app.
- **Known defect:** `GET /observations/v1/client/:id/behaviorplans` returns **500**.
  Treat as a confirmed negative case until the team says otherwise.
- **Framework detected:** Angular → expect heavy async XHR; always wait on network/DOM, never fixed sleeps.

## Hard constraints

1. **No secrets in the repo.** No passwords, API keys, tokens, or emails in source,
   feature files, or fixtures. All credentials come from environment variables.
   (The original crawl `output/api-endpoints.json` contains a real hashed password and
   API key — never copy values out of it.)
2. **No hardcoded entity IDs.** Client IDs and program IDs are dynamic. Resolve them at
   runtime from `GET /clinical/v1/clients?page=1&pageSize=200`, or from agreed seeded data.
3. **No fixed `waitForTimeout`.** Use `waitForResponse`, `waitForLoadState`, locator
   auto-waiting, or explicit element state.
4. **Ignore third-party noise.** Do not assert on `fonts.gstatic.com` requests.
5. **Every test traces to a coverage-matrix row** (`docs/coverage-matrix.md`).

## Definition of done (per test)

- Runs green twice in a row locally.
- Asserts a meaningful outcome (not just "page loaded").
- Uses a Page Object or the API client — no raw selectors scattered in steps.
- Tagged correctly (see tag taxonomy in `docs/coverage-matrix.md`).
- Reviewed by a human.
