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
 */

export type DataMode = "preview" | "substituted" | "mixed" | "unknown";

const BANNER_TESTIDS: ReadonlyArray<readonly [string, DataMode]> = [
  ["demo-banner-preview", "preview"],
  ["demo-banner-substituted", "substituted"],
  ["demo-banner-mixed", "mixed"],
];

/** Reads the current data mode. Returns "unknown" when no banner is present. */
export async function readDataMode(page: Page): Promise<DataMode> {
  for (const [testId, mode] of BANNER_TESTIDS) {
    if ((await page.getByTestId(testId).count()) > 0) {
      return mode;
    }
  }
  return "unknown";
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
