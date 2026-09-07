import { Locator, Page, expect } from '@playwright/test';

/** /settings/clinical/program-library — organization catalog (WebApp PR #55). */
export class ProgramLibraryAdminPage {
  readonly root: Locator;
  readonly grid: Locator;
  readonly empty: Locator;
  readonly error: Locator;
  readonly search: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('program-library-admin');
    this.grid = page.getByTestId('program-library-admin-grid');
    this.empty = page.getByTestId('program-library-admin-empty');
    this.error = page.getByTestId('program-library-admin-error');
    this.search = page.getByTestId('program-library-admin-search');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/clinical/program-library');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect
      .poll(
        async () => {
          if (await this.error.isVisible()) return 'error';
          if (await this.grid.isVisible()) return 'grid';
          if (await this.empty.isVisible()) return 'empty';
          return 'loading';
        },
        { message: 'Program Library admin should finish loading into grid, empty, or error' },
      )
      .toMatch(/grid|empty/);
  }
}
