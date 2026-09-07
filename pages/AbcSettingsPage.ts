import { Locator, Page, expect } from '@playwright/test';

/** /settings/clinical/abc-settings — account-level ABC response options. */
export class AbcSettingsPage {
  readonly root: Locator;
  readonly sectionSwitcher: Locator;
  readonly tree: Locator;
  readonly empty: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('abc-settings-page');
    this.sectionSwitcher = page.getByTestId('abc-settings-section-switcher');
    this.tree = page.getByTestId('abc-settings-tree');
    this.empty = page.getByTestId('abc-settings-empty');
    this.error = page.getByTestId('abc-settings-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/clinical/abc-settings');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.sectionSwitcher).toBeVisible();
    await expect
      .poll(
        async () => {
          if (await this.error.isVisible()) return 'error';
          if (await this.tree.isVisible()) return 'tree';
          if (await this.empty.isVisible()) return 'empty';
          return 'loading';
        },
        { message: 'ABC Settings should finish loading into data, empty, or error state' },
      )
      .toMatch(/tree|empty/);
  }
}
