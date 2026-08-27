import { Locator, Page, expect } from '@playwright/test';

/**
 * /clients/:id/behavior-support
 *
 * D3: the backing endpoint currently 500s for every client, and the page renders
 * an empty plan list alongside an unavailable notice. `unavailable` is the honest
 * signal; the empty state is not.
 */
export class BehaviorSupportPage {
  readonly root: Locator;
  readonly planRail: Locator;
  readonly planRailCurrent: Locator;
  readonly planRailInactive: Locator;
  readonly planRailEmpty: Locator;
  readonly novelBehaviours: Locator;
  readonly novelBehavioursCount: Locator;
  readonly unavailable: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('behavior-support-page');
    this.planRail = page.getByTestId('plan-rail');
    this.planRailCurrent = page.getByTestId('plan-rail-current');
    this.planRailInactive = page.getByTestId('plan-rail-inactive');
    this.planRailEmpty = page.getByTestId('plan-rail-empty');
    this.novelBehaviours = page.getByTestId('novel-behaviors-panel');
    this.novelBehavioursCount = page.getByTestId('novel-behaviors-count');
    this.unavailable = page.getByTestId('behavior-support-unavailable');
  }

  /**
   * The app requests behaviorplans, and on failure retries it. The unavailable
   * notice appears only after the retry, so returning as soon as the first
   * response lands asserts a half-drawn page — the empty state is up but the
   * notice is not, which silently hides the contradiction between them.
   *
   * This waits for the app to stop asking, rather than for a fixed period: quiet
   * for `QUIET_MS` after at least one response, capped so a hang still fails fast.
   */
  async goto(clientId: number): Promise<void> {
    const QUIET_MS = 2_000;
    const CAP_MS = 25_000;

    let responses = 0;
    let lastAt = 0;
    const onResponse = (res: { url(): string }) => {
      if (/behaviorplans/.test(res.url())) {
        responses += 1;
        lastAt = Date.now();
      }
    };

    this.page.on('response', onResponse);
    try {
      await this.page.goto(`/clients/${clientId}/behavior-support`);
      const deadline = Date.now() + CAP_MS;
      while (Date.now() < deadline) {
        if (responses > 0 && Date.now() - lastAt > QUIET_MS) break;
        await this.page.waitForTimeout(250);
      }
    } finally {
      this.page.off('response', onResponse);
    }

    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.planRail).toBeVisible();
  }
}
