import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { STORAGE_STATE } from "./src/fixtures/auth.fixture.js";

/**
 * Playwright configuration for the Clinical E2E suite.
 *
 * Several settings below are dictated by the governing rules rather than by
 * Playwright convention. Each is annotated with the rule it implements, so the
 * reason survives future edits.
 *
 * Scenarios come from Gherkin. Decisions F-01 and F-02 settled on playwright-bdd,
 * so the feature files execute rather than merely documenting; see
 * aidlc-docs/OPEN-DECISIONS.md.
 */

// The /clinical-ui/ path this previously defaulted to redirects to the site
// root; the segment is stale. Verified against the dev environment 2026-08-24.
const baseURL = process.env.BASE_URL ?? "https://clinical.dev.rethinkbhtech.com/";
const isCI = !!process.env.CI;

/**
 * The feature files under aidlc-docs/bdd/ are compiled into Playwright tests in
 * .features-gen, which is generated and git-ignored. Point the runner at the
 * feature files themselves, never at the generated output.
 *
 * They are read in place rather than copied into tests/, so the artifact
 * reviewed at Gate G3 is the same file that executes. A copy would be free to
 * drift from the approved one.
 *
 * missingSteps: "fail-on-gen" makes an unimplemented step break `bddgen`
 * immediately. The alternative is a scenario that silently never runs, which is
 * a coverage claim the traceability record could not detect as false.
 */
const bddTestDir = defineBddConfig({
  features: "aidlc-docs/bdd/**/*.feature",
  featuresRoot: "aidlc-docs/bdd",
  steps: ["src/steps/**/*.ts", "src/fixtures/test.ts"],
  outputDir: ".features-gen",
  missingSteps: "fail-on-gen",
});

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
    // Signs in once and saves the session. The dev login route cannot handle
    // concurrent sign-ins — two workers exchanging a transferToken at the same
    // time collide, and one is bounced to /sign-in. Authenticating once here
    // avoids that without giving up parallelism in the tests themselves.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testDir: bddTestDir,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
});
