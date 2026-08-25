import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddConfig } from "playwright-bdd";
// Imported first: it loads .env before anything below reads process.env.
import { baseURL, envLabel } from "./src/config/environments.js";
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

const isCI = !!process.env.CI;

/**
 * Recorded into every report, so a result states where it came from. Evidence
 * that does not name its environment cannot be compared against a later run,
 * and the suite can now target more than one host.
 */
const metadata = { environment: envLabel, baseURL };

/**
 * The feature files under features/ are compiled into Playwright tests in
 * .features-gen, which is generated and git-ignored. Point the runner at the
 * feature files themselves, never at the generated output.
 *
 * There is exactly one copy of each feature file and the runner reads it where
 * it lives, so the artifact reviewed at Gate G3 is the same file that executes.
 * A second copy would be free to drift from the approved one.
 *
 * missingSteps: "fail-on-gen" makes an unimplemented step break `bddgen`
 * immediately. The alternative is a scenario that silently never runs, which is
 * a coverage claim the traceability record could not detect as false.
 */
const bddTestDir = defineBddConfig({
  features: "features/**/*.feature",
  featuresRoot: "features",
  steps: ["src/steps/**/*.ts", "src/fixtures/test.ts"],
  outputDir: ".features-gen",
  missingSteps: "fail-on-gen",
});

export default defineConfig({
  metadata,

  // Rooted at the repository, because the two projects live in sibling
  // directories: tests/ for the sign-in setup and the generated .features-gen/
  // for the scenarios. Rooting at ./tests instead would resolve the latter as
  // ../.features-gen. Each project narrows this to its own directory below.
  testDir: ".",

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

    // Cucumber reports, in the shape a BDD reader expects: Feature, Scenario,
    // Step, each step pass or fail. Playwright's own report shows a scenario as
    // a single test with the steps buried in the trace, which is the wrong
    // granularity for reviewing behaviour against the requirement.
    //
    // The JSON is the machine-readable one, and it is what the S9 evidence
    // bundle and the S10 traceability record should be built from, because it
    // keeps the tie between a step and the Gherkin line that produced it.
    cucumberReporter("html", { outputFile: "cucumber-report/index.html" }),
    cucumberReporter("json", { outputFile: "cucumber-report/report.json" }),

    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],

    // Playwright's own JSON, which is a different shape from the Cucumber JSON
    // above and carries the per-result annotations. scripts/check-data-mode.mjs
    // reads it to decide whether a run's traces may be retained. Declared here
    // rather than passed as --reporter on the command line, because that flag
    // replaces this whole list and would silently drop the Cucumber reports.
    ["json", { outputFile: "test-results/results.json" }],
  ],

  outputDir: "test-results",

  projects: [
    // Signs in once and saves the session. The dev login route cannot handle
    // concurrent sign-ins — two workers exchanging a transferToken at the same
    // time collide, and one is bounced to /sign-in. Authenticating once here
    // avoids that without giving up parallelism in the tests themselves.
    {
      name: "setup",
      testDir: "./tests",
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
