import { Locator, Page, expect } from '@playwright/test';

/**
 * Interaction helper for PrimeNG `p-select` controls.
 *
 * These render their overlay on `body` and re-render the option list as it opens,
 * so a click can land on a detaching node and be silently swallowed — leaving the
 * control untouched and the assertion failing somewhere far downstream. `choose`
 * therefore confirms the control actually changed, and retries if it did not.
 */
export class PrimeSelect {
  constructor(
    private readonly page: Page,
    private readonly root: Locator,
    private readonly name: string,
  ) {}

  get label(): Locator {
    return this.root.getByRole('combobox');
  }

  option(optionName: string): Locator {
    return this.page.getByRole('option', { name: optionName, exact: true });
  }

  /**
   * @param verify Confirms the selection took. Defaults to the control's own label
   *   showing the chosen option; pass a custom check where selecting navigates away.
   */
  async choose(optionName: string, verify?: () => Promise<void>): Promise<void> {
    const confirm =
      verify ?? (async () => expect(this.label).toHaveText(optionName, { timeout: 5_000 }));

    let last: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.label.click();
        const option = this.option(optionName);
        await option.waitFor({ state: 'visible', timeout: 5_000 });
        await option.click({ timeout: 5_000 });
        await confirm();
        return;
      } catch (error) {
        last = error;
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
    }

    throw new Error(
      `Could not select "${optionName}" in the ${this.name} after 3 attempts. ` +
        `Last failure: ${last instanceof Error ? last.message : String(last)}`,
    );
  }
}
