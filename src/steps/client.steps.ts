import { SESSION_STORAGE_KEY } from "../fixtures/auth.fixture.js";
import { recordDataMode } from "../fixtures/data-mode.js";
import { AfterScenario, expect, Given, Then, When } from "../fixtures/test.js";
import { ClientSwitcher } from "../pages/ClientSwitcher.js";

/**
 * Step definitions for features/client/REQ-CLIENT-001.feature.
 *
 * The feature file is the G3-approved specification and the executable source
 * both — it is not restated in TypeScript anywhere. A step that stops matching
 * its Gherkin fails generation rather than drifting silently, which is the
 * binding the previous hand-written spec did not have.
 *
 * Implementation detail belongs here rather than in the scenarios
 * (aidlc-e2e-rules.md §9), so these functions carry the assertions and the page
 * objects while the Gherkin stays business-readable.
 */

/**
 * Reads a client name a previous step was supposed to have captured.
 *
 * A missing name means an earlier step did not run or did not find what it
 * expected. Failing here names that, instead of passing `undefined` into a
 * locator and producing a timeout that describes nothing.
 */
function required(name: string | undefined, label: string): string {
  if (name === undefined) {
    throw new Error(
      `"${label}" was not captured by an earlier step. The scenario is ` +
        `missing the Given that reads the available clients.`,
    );
  }
  return name;
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

/**
 * Satisfied by the saved session from the "setup" project rather than by
 * signing in, because concurrent sign-ins through the dev login collide — see
 * the framework reuse plan §3.4.
 *
 * The session is verified rather than assumed: reading it from the browser
 * context needs no navigation, so an empty or expired storage state fails here
 * with a clear cause rather than as an unexplained redirect later.
 */
Given("a user who can access the Clinical application", async ({ page }) => {
  const { origins } = await page.context().storageState();

  const hasSession = origins.some((origin) =>
    origin.localStorage.some((item) => item.name === SESSION_STORAGE_KEY),
  );

  expect(
    hasSession,
    `No "${SESSION_STORAGE_KEY}" session in the browser context. The setup ` +
      `project did not produce a usable session.`,
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// TC-CLIENT-001 — a user reaches the Client area
// ---------------------------------------------------------------------------

/**
 * Verified, not established. There is no seeding API (GAP-005), so the only
 * way to know a client exists is to ask the application. The Client area is
 * opened again by the When that follows, which is deliberate: the reload gives
 * that step a clean page load, and client selection is in-memory per page load.
 */
Given("at least one client is available", async ({ clients, scenario }) => {
  await clients.goto();

  scenario.offeredClients = await clients.switcher.optionNames();

  expect(
    scenario.offeredClients.length,
    "The application offered no clients, so the scenario cannot run.",
  ).toBeGreaterThan(0);
});

When("the user opens the Client area", async ({ clients }) => {
  await clients.goto();
});

Then("the Client area should be displayed", async ({ clients }) => {
  await expect(clients.page).toBeVisible();
});

/**
 * Retained at G3 as a distinct check: a Client area that renders without a
 * usable selector satisfies AC-001 literally while leaving the workflow dead,
 * because the requirement's §6 step 2 could not happen.
 */
Then("the client selector should offer at least one client", async ({ clients }) => {
  const offered = await clients.switcher.optionNames();
  expect(offered.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// TC-CLIENT-002 — selecting a client makes that client the active client
// ---------------------------------------------------------------------------

/**
 * Binds the symbolic names in the feature file to whatever the application
 * currently offers. "Client A" is the first option and "Client B" the second,
 * so the scenario selects an entry that is not first and a default-to-first
 * implementation is caught rather than accommodated.
 *
 * Two clients are required by CL-006 (clinical-rules.md §8): with one client,
 * "the selected client is displayed" would pass against a selector that ignores
 * its input entirely.
 */
Given(
  "two distinct clients are available, Client A and Client B",
  async ({ clients, scenario }) => {
    await clients.goto();

    const offered = await clients.switcher.optionNames();

    expect(
      offered.length,
      "This scenario needs at least two distinct clients to be meaningful.",
    ).toBeGreaterThanOrEqual(2);

    const [clientA, clientB] = offered;
    expect(clientB).not.toBe(clientA);

    scenario.offeredClients = offered;
    scenario.clientA = clientA;
    scenario.clientB = clientB;
  },
);

/**
 * Also asserts precondition 4 of TC-CLIENT-002 — that no client is active
 * before one is chosen. Without it, a selector that arrives with Client B
 * already active would satisfy the Then steps without the When having done
 * anything.
 */
Given("the Client area is displayed", async ({ clients }) => {
  await expect(clients.page).toBeVisible();

  expect(
    await clients.switcher.activeClient(),
    "A client was already active before one was selected.",
  ).toBeNull();
});

When("the user selects Client B from the client selector", async ({ clients, scenario }) => {
  await clients.switcher.selectByName(required(scenario.clientB, "Client B"));
});

/**
 * AC-002 read with CL-006: the client that was chosen is the client that became
 * active, not merely that some client is now shown.
 */
Then(
  "the client selector should show Client B as the active client",
  async ({ clients, scenario }) => {
    const active = await clients.switcher.activeClient();

    expect(active).toBe(required(scenario.clientB, "Client B"));
    expect(active).not.toBe(ClientSwitcher.PLACEHOLDER);
  },
);

Then(
  "the client selector should not show Client A as the active client",
  async ({ clients, scenario }) => {
    const active = await clients.switcher.activeClient();
    expect(active).not.toBe(required(scenario.clientA, "Client A"));
  },
);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Per the G4 decision, no result is reported without stating what data it ran
 * against. Recorded in a hook rather than a step so that it applies to every
 * scenario, including ones that fail before reaching an assertion.
 */
AfterScenario({ name: "record the data mode" }, async ({ page, $testInfo }) => {
  await recordDataMode(page, $testInfo);
});
