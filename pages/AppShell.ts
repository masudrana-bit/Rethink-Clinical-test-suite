import { Locator, Page, expect } from '@playwright/test';
import { PrimeSelect } from './PrimeSelect';

/** Persistent chrome: header, client switcher, user menu, primary nav. */
export class AppShell {
  readonly header: Locator;
  readonly clientSwitcher: Locator;
  readonly nav: Locator;
  readonly userMenu: Locator;
  readonly userMenuTrigger: Locator;
  readonly userName: Locator;
  readonly userRole: Locator;

  constructor(private readonly page: Page) {
    this.header = page.getByTestId('app-shell-header');
    this.clientSwitcher = page.getByTestId('client-switcher-select');
    this.nav = page.getByTestId('app-shell-nav');
    this.userMenu = page.getByTestId('user-menu');
    this.userMenuTrigger = page.getByTestId('user-menu-trigger');
    this.userName = page.getByTestId('user-menu-name');
    this.userRole = page.getByTestId('user-menu-role');
  }

  /** The p-select renders its label as a combobox and its overlay on `body`. */
  get switcherLabel(): Locator {
    return this.clientSwitcher.getByRole('combobox');
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.header).toBeVisible();
    await expect(this.userName).not.toBeEmpty();
  }

  /**
   * Opens the switcher and picks a client by name. Selecting navigates to that
   * client's record, so the navigation is what confirms the selection took.
   */
  async selectClient(name: string): Promise<void> {
    const select = new PrimeSelect(this.page, this.clientSwitcher, 'client switcher');
    await select.choose(name, async () => {
      await this.page.waitForURL(/\/clients\/\d+/, { timeout: 10_000 });
    });
  }

  /** True when the app is showing the signed-out landing page instead of the shell. */
  async isSignedOut(): Promise<boolean> {
    return this.page.getByTestId('sign-in-page').isVisible();
  }
}
