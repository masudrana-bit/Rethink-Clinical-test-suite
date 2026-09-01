# Rethink Clinical — Test Automation (Playwright + Cucumber, AIDLC)

Starter kit for building end-to-end and API test automation for the Rethink Clinical
Angular app, using the AIDLC (AI-Driven Development Lifecycle) methodology.

## What's in here

```
rules/                 Steering files — the rules every AI agent obeys (load these first)
  00-project-rules.md  The AIDLC loop, stack, hard constraints, definition of done
  10-app-context.md    Endpoint inventory, response shapes, UI flows (from the crawl)
docs/
  aidlc-process.md     Inception / Construction / Operations runbook
  coverage-matrix.md   Test inventory + units of work + tag taxonomy
features/              Gherkin BDD scenarios (api/ and ui/)
steps/                 Cucumber step definitions
pages/                 Page Objects
api/                   Typed API client
support/               World, hooks, config
.env.example           Required env vars (copy to .env — never commit secrets)
```

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env      # then fill in TEST_USERNAME, TEST_PASSWORD, AUTH_APPLICATION_KEY
npm run test:smoke        # run @smoke first
```

Other scripts: `npm run test` (all), `npm run test:api`, `npm run test:ui`.

## Allure report

Every npm test profile writes fresh results to `allure-results/`. Each executed
`@ui` step includes a viewport screenshot, and the scenario's final attachment
is its full Playwright execution video. API-only scenarios avoid visual noise:
they attach a redacted request/response diagnostic and assertion failures show
the method, URL, status, content type, and safe body preview.

```bash
npm run test:smoke
npm run allure:generate
npm run allure:open
```

Use `npm run allure:serve` to generate and open the results in one command.

## How to run the AIDLC process

Read `docs/aidlc-process.md`. In short:

1. **Inception** — Mob Elaboration session: point the AI at `rules/` + the crawl,
   let it ask questions, approve `docs/coverage-matrix.md`.
2. **Construction** — one unit of work per bolt (Auth → Clients → Programs →
   Analyze-Data → Negative). AI proposes, you approve, AI generates, you review.
3. **Operations** — wire CI, publish reports, loop bugs back into Inception.

## Non-negotiables

- No secrets in the repo. Ever.
- No hardcoded client/program IDs — resolve from the clients list at runtime.
- No fixed sleeps — wait on network or element state.
- Every test traces to a coverage-matrix row.

## Note on the source crawl

These files were seeded from a site-crawler snapshot. That snapshot's
`api-endpoints.json` contains real-looking credentials — keep it out of this repo and
out of shared channels.
