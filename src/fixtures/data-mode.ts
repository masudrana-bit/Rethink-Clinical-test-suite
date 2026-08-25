import type { Page, TestInfo } from "@playwright/test";

/**
 * The application states, in a banner, whether the data on screen came from the
 * backend or was substituted because the backend did not respond.
 *
 * This matters because the approved tests for REQ-CLIENT-001 assert that client
 * selection works, not that particular clients exist — so they pass identically
 * in either mode. Without recording the mode, a complete backend outage would
 * produce a green suite, and nothing about it would look wrong.
 *
 * Gate G4 chose to tolerate any mode and record it as execution evidence rather
 * than to fail on it. See aidlc-docs/testdata/REQ-CLIENT-001/test-data-plan.md §5.
 *
 * Since 2026-08-25 the reading also decides whether a run's traces may be kept,
 * because a trace carries DOM snapshots and therefore whatever the page showed.
 * scripts/check-data-mode.mjs consumes the annotation this module writes.
 */

export type DataMode = "preview" | "substituted" | "mixed" | "unknown";

const BANNER_TESTIDS: ReadonlyArray<readonly [string, DataMode]> = [
  ["demo-banner-preview", "preview"],
  ["demo-banner-substituted", "substituted"],
  ["demo-banner-mixed", "mixed"],
];

/**
 * The banner is not stable on load. It renders as "preview — showing real data"
 * first and only switches to "substituted" once a backend call has failed, so a
 * read taken too early reports the opposite of what the page ends up showing.
 * Observed on both dev and dev2 on 2026-08-25.
 *
 * Waiting for the client switcher to stop loading is the application's own
 * signal that the client list has settled one way or the other.
 */
async function waitForBannerToSettle(page: Page): Promise<void> {
  await page
    .getByTestId("client-switcher-loading")
    .waitFor({ state: "detached", timeout: 15_000 })
    .catch(() => {
      // Absent or already gone. Either way there is nothing left to wait for,
      // and a missing indicator must not fail the run — this is evidence
      // collection, not an assertion.
    });
}

/**
 * Reads the current data mode. Returns "unknown" when no banner is present, and
 * "mixed" when more than one banner is on the page, which no single-banner
 * reading would otherwise notice.
 */
export async function readDataMode(page: Page): Promise<DataMode> {
  await waitForBannerToSettle(page);

  const present: DataMode[] = [];
  for (const [testId, mode] of BANNER_TESTIDS) {
    if ((await page.getByTestId(testId).count()) > 0) present.push(mode);
  }

  const [only] = present;
  if (only === undefined) return "unknown";
  if (present.length > 1) return "mixed";
  return only;
}

/**
 * Records the data mode against the test result, so no result is reported
 * without stating what it ran against.
 */
export async function recordDataMode(page: Page, testInfo: TestInfo): Promise<DataMode> {
  const mode = await readDataMode(page);

  testInfo.annotations.push({
    type: "data-mode",
    description:
      mode === "preview"
        ? "preview — real backend data"
        : mode === "substituted"
          ? "substituted — backend did not respond, example data shown"
          : mode === "mixed"
            ? "mixed — real and example data combined"
            : "unknown — no data mode banner found",
  });

  return mode;
}
