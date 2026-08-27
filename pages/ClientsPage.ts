import { Locator, Page, expect } from '@playwright/test';

/** /clients — the client list and its two search inputs. */
export interface ClientRow {
  id: number;
  name: string;
  clientNumber: string;
  status: string;
}

export class ClientsPage {
  readonly root: Locator;
  readonly items: Locator;
  readonly rows: Locator;
  readonly searchByName: Locator;
  readonly searchById: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('clients-list-page');
    this.items = page.getByTestId('clients-list-items');
    this.rows = page.locator('[data-testid="clients-list-items"] tbody tr');
    this.searchByName = page.getByTestId('clients-list-search-name');
    this.searchById = page.getByTestId('clients-list-search-id');
  }

  /** Rows are keyed by client id, so this doubles as an existence check. */
  clientLink(clientId: number): Locator {
    return this.page.getByTestId(`clients-list-link-${clientId}`);
  }

  allClientLinks(): Locator {
    return this.page.locator('[data-testid^="clients-list-link-"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/clients');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.allClientLinks().first()).toBeVisible();
  }

  async listedClientIds(): Promise<number[]> {
    const ids = await this.allClientLinks().evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-testid')?.replace('clients-list-link-', '')),
    );
    return ids.filter((id): id is string => Boolean(id)).map(Number);
  }

  async open(clientId: number): Promise<void> {
    await this.clientLink(clientId).click();
    await this.page.waitForURL(new RegExp(`/clients/${clientId}(/|$)`));
  }

  /** The table has no per-row testid, so rows are read positionally: name, id, status. */
  async visibleRows(): Promise<ClientRow[]> {
    return this.rows.evaluateAll((trs) =>
      trs.map((tr) => {
        const link = tr.querySelector('[data-testid^="clients-list-link-"]');
        const cells = tr.querySelectorAll('td');
        return {
          id: Number(link?.getAttribute('data-testid')?.replace('clients-list-link-', '')),
          name: link?.textContent?.trim() ?? '',
          clientNumber: cells[1]?.textContent?.trim() ?? '',
          status: cells[2]?.textContent?.trim() ?? '',
        };
      }),
    );
  }

  /** Filtering is client-side and case-insensitive on a substring of the name. */
  async filterByName(text: string): Promise<void> {
    await this.searchByName.fill(text);
  }

  async filterByClientNumber(text: string): Promise<void> {
    await this.searchById.fill(text);
  }

  async clearFilters(): Promise<void> {
    await this.searchByName.fill('');
    await this.searchById.fill('');
  }
}
