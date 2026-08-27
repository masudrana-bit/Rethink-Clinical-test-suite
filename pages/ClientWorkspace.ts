import { Locator, Page, expect } from '@playwright/test';
import { PrimeSelect } from './PrimeSelect';

export type ClientTab = 'skills-programs' | 'behavior-support' | 'analyze-data';

/** /clients/:id — the per-client workspace: tab bar, program rail, program details. */
export class ClientWorkspace {
  readonly tabBar: Locator;
  readonly workspace: Locator;
  readonly programRail: Locator;
  readonly railCurrent: Locator;
  readonly railInactive: Locator;
  readonly domainFilter: Locator;
  readonly programTargets: Locator;
  readonly programGoals: Locator;

  constructor(private readonly page: Page) {
    this.tabBar = page.getByTestId('client-top-tab-bar');
    this.workspace = page.getByTestId('client-workspace');
    this.programRail = page.getByTestId('program-rail');
    this.railCurrent = page.getByTestId('program-rail-tab-current');
    this.railInactive = page.getByTestId('program-rail-tab-inactive');
    this.domainFilter = page.getByTestId('program-rail-domain-filter');
    this.programTargets = page.getByTestId('program-details-targets');
    this.programGoals = page.getByTestId('program-details-goals');
  }

  tab(name: ClientTab): Locator {
    return this.page.getByTestId(`client-tab-${name}`);
  }

  programItem(programId: number): Locator {
    return this.page.getByTestId(`program-rail-item-${programId}`);
  }

  allProgramItems(): Locator {
    return this.page.locator('[data-testid^="program-rail-item-"]');
  }

  async goto(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}`);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.workspace).toBeVisible();
    await expect(this.tabBar).toBeVisible();
  }

  async openTab(name: ClientTab): Promise<void> {
    await this.tab(name).click();
  }

  async listedProgramIds(): Promise<number[]> {
    const ids = await this.allProgramItems().evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-testid')?.replace('program-rail-item-', '')),
    );
    return ids
      .filter((id): id is string => Boolean(id))
      .map(Number)
      .sort((a, b) => a - b);
  }

  /** Current shows programs with `active: true`; Inactive shows the rest. */
  async openRailTab(which: 'current' | 'inactive'): Promise<void> {
    await (which === 'current' ? this.railCurrent : this.railInactive).click();
  }

  async openProgram(programId: number): Promise<void> {
    await this.programItem(programId).click();
    await expect(this.programTargets).toBeVisible();
  }

  /** The domain filter is a PrimeNG select whose overlay is appended to `body`. */
  async filterByDomain(label: string): Promise<void> {
    await new PrimeSelect(this.page, this.domainFilter, 'domain filter').choose(label);
  }

  get addTarget(): Locator {
    return this.page.getByTestId('program-details-add-target');
  }

  get recordData(): Locator {
    return this.page.getByTestId('program-details-record-data');
  }

  /** Any role=dialog / PrimeNG dialog that is actually painted. */
  get visibleDialog(): Locator {
    return this.page.locator('[role="dialog"]:visible, .p-dialog:visible');
  }
}
