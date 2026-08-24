import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the Clinical E2E suite.
 *
 * Several settings below are dictated by the governing rules rather than by
 * Playwright convention. Each is annotated with the rule it implements, so the
 * reason survives future edits.
 *
 * Status: proposal, pending Gate G0 ratification and the framework decisions
 * recorded in tests/README.md.
 */

const baseURL = process.env.BASE_URL ?? "https://clinical.dev.rethinkbhtech.com/clinical-ui/";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",

  // aidlc-e2e-rules.md §17: tests must not depend on execution order. Running
  // fully parallel makes an order dependency fail immediately rather than
  // surviving unnoticed until it breaks someone else's run.
  fullyParallel: true,

  // aidlc-e2e-rules.md §25: a test must not be rerun until it passes and then
  // reported as passed. Retries would do exactly that automatically, so they
  // stay at zero and inconsistent tests are investigated as FLAKY instead.
  retries: 0,

  forbidOnly: isCI,
  workers: isCI ? 2 : undefined,

  // clinical-rules.md §36: execution evidence should include screenshots and
  // traces where useful. Retaining on failure captures evidence for the S9
  // record without producing gigabytes of artifacts for passing runs.
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",

    // aidlc-e2e-rules.md §16: synchronise on application state, never on
    // elapsed time. These are upper bounds that fail a hung test; they are not
    // a substitute for waiting on a condition.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  expect: {
    timeout: 10_000,
  },

  timeout: 90_000,

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  outputDir: "test-results",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
