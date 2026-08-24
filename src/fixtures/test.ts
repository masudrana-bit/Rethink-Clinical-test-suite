import { test as base, createBdd } from "playwright-bdd";
import { ClientsPage } from "../pages/ClientsPage.js";

/**
 * The test instance every step definition binds to.
 *
 * playwright-bdd generates Playwright tests from the feature files and runs
 * them on this instance, so the page objects, the saved session, the trace and
 * video retention, and the parallelism all work exactly as they do for a
 * hand-written spec. The Gherkin is the source; this is what executes it.
 */

/**
 * State one step needs to hand to a later step in the same scenario.
 *
 * Gherkin steps cannot return values, so anything read in a Given and used in a
 * When or Then travels through here. It is scenario-scoped, so nothing leaks
 * between tests and the suite stays order-independent
 * (aidlc-e2e-rules.md §17).
 *
 * The client names live here rather than in a fixture file because they are
 * read from the application at runtime. Nothing in this suite hardcodes a
 * client name — see the framework reuse plan §3.2.
 */
export type ScenarioState = {
  /** Client names the switcher offered, in the order it offered them. */
  offeredClients: string[];
  /** The first offered client, bound to "Client A" in the feature files. */
  clientA?: string;
  /** The second offered client, bound to "Client B" in the feature files. */
  clientB?: string;
};

export const test = base.extend<{
  clients: ClientsPage;
  scenario: ScenarioState;
}>({
  clients: async ({ page }, use) => {
    await use(new ClientsPage(page));
  },

  scenario: async ({}, use) => {
    await use({ offeredClients: [] });
  },
});

export const expect = test.expect;

export const { Given, When, Then, AfterScenario } = createBdd(test);
