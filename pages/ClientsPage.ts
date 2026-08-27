import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for /clients. Selectors are placeholders — during Construction,
 * refine them against the real DOM in output/pages/<clients slug>/raw.html.
 */
export class ClientsPage {
  readonly page: Page;
  readonly clientList: Locator;

  constructor(page: Page) {
    this.page = page;
    // TODO(construction): confirm selector against raw.html.
    this.clientList = page.getByRole('list').filter({ hasText: /./ }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/clients');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/clients/);
    await expect(this.clientList).toBeVisible();
  }

  async openClientByName(name: string): Promise<void> {
    await this.page.getByText(name, { exact: false }).first().click();
    await this.page.waitForLoadState('networkidle');
  }
}
