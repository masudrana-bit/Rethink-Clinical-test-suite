import { expect, type Locator, type Page } from "@playwright/test";
import { ClientSwitcher } from "./ClientSwitcher.js";

/**
 * The Client area at /clients.
 *
 * Covers AC-001 of REQ-CLIENT-001: the user can access the Client area and it
 * is displayed.
 */
export class ClientsPage {
  static readonly PATH = "/clients";

  readonly page: Locator;
  readonly list: Locator;
  readonly searchByName: Locator;
  readonly searchById: Locator;
  readonly switcher: ClientSwitcher;

  constructor(private readonly pageContext: Page) {
    this.page = pageContext.getByTestId("clients-list-page");
    this.list = pageContext.getByTestId("clients-list-items");
    this.searchByName = pageContext.getByTestId("clients-list-search-name");
    this.searchById = pageContext.getByTestId("clients-list-search-id");
    this.switcher = new ClientSwitcher(pageContext);
  }

  async goto(): Promise<void> {
    await this.pageContext.goto(ClientsPage.PATH);
    await this.waitLoaded();
  }

  /**
   * Waits for the loading placeholders to be replaced by the settled view.
   * Condition-based, per aidlc-e2e-rules.md §16 — no elapsed-time waits.
   */
  async waitLoaded(): Promise<void> {
    // A stale or missing session redirects here instead of rendering. Asserting
    // it first turns that into a clear message rather than an opaque timeout on
    // an element that was never going to appear.
    await expect(this.pageContext).not.toHaveURL(/\/sign-in\b/);

    await expect(this.page).toBeVisible();
    await expect(this.pageContext.getByTestId("clients-list-loading")).toHaveCount(0);
    await expect(this.list).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return this.page.isVisible();
  }
}
