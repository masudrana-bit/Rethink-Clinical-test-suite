import { Locator, Page, expect } from '@playwright/test';

/** /sessions/new — RBT new-session wizard. Do not reach Confirm in default tests. */
export class NewSessionPage {
  readonly root: Locator;
  readonly stepIndicator: Locator;
  readonly next: Locator;
  readonly participantsStep: Locator;
  readonly programsStep: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('new-session-page');
    this.stepIndicator = page.getByTestId('new-session-step-indicator');
    this.next = page.getByTestId('new-session-next-button');
    this.participantsStep = page.getByTestId('new-session-step-participants');
    this.programsStep = page.getByTestId('new-session-step-programs');
  }

  clientCheckbox(clientId: number): Locator {
    return this.page.getByTestId(`new-session-client-checkbox-${clientId}`);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sessions\/new(?:\/|$|\?)/);
    await expect(this.root).toBeVisible({ timeout: 15_000 });
    await expect(this.stepIndicator).toBeVisible();
  }

  async expectParticipantsStep(): Promise<void> {
    await this.expectLoaded();
    await expect(this.participantsStep).toBeVisible();
  }

  /**
   * Tick the resolved client and advance to Programs. Does not click Confirm.
   * Next is disabled while 0 clients are selected.
   */
  async goToProgramsStep(clientId: number): Promise<void> {
    await this.clientCheckbox(clientId).click();
    await expect(this.next).toBeEnabled({ timeout: 10_000 });
    await this.next.click();
    await expect(this.programsStep).toBeVisible({ timeout: 15_000 });
  }
}
