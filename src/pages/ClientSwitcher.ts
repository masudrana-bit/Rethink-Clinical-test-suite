import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The client switcher in the application shell.
 *
 * It is a PrimeNG p-select carrying appendTo="body", which means its option
 * list is portaled to the document body rather than rendered inside the
 * switcher. Options are therefore located from the page, not from the switcher
 * element — locating them as descendants finds nothing.
 *
 * The switcher lives in the shell and appears on every route, which is why it
 * is modelled separately from ClientsPage.
 */
export class ClientSwitcher {
  /** Placeholder shown when no client is active. */
  static readonly PLACEHOLDER = "Select a client";

  readonly root: Locator;
  readonly combobox: Locator;
  private readonly options: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId("client-switcher-select");
    this.combobox = this.root.getByRole("combobox");
    this.options = page.getByRole("option");
  }

  async waitReady(): Promise<void> {
    await expect(this.page.getByTestId("client-switcher-loading")).toHaveCount(0);
    await expect(this.combobox).toBeVisible();
  }

  private async isOpen(): Promise<boolean> {
    return (await this.combobox.getAttribute("aria-expanded")) === "true";
  }

  /**
   * Opens the option list, or does nothing if it is already open.
   *
   * The idempotence matters: clicking the combobox of an open p-select toggles
   * it shut. A second unconditional click would start the close animation, and
   * any option clicked during it fails as unstable and then detached.
   */
  async open(): Promise<void> {
    await this.waitReady();

    if (!(await this.isOpen())) {
      await this.combobox.click();
      await expect(this.combobox).toHaveAttribute("aria-expanded", "true");
    }

    await expect(this.options.first()).toBeVisible();
  }

  /** Names of the selectable clients, in the order the switcher offers them. */
  async optionNames(): Promise<string[]> {
    await this.open();
    const names = await this.options.allInnerTexts();
    return names.map((name) => name.trim()).filter((name) => name.length > 0);
  }

  async selectByName(name: string): Promise<void> {
    await this.open();

    // Match on the option's accessible name rather than substring text, so one
    // client name that contains another cannot resolve to the wrong option.
    await this.page.getByRole("option", { name, exact: true }).click();

    // Wait on the collapsed state rather than on the options disappearing:
    // the overlay detaches as it closes, and asserting against a detaching
    // element races the animation.
    await expect(this.combobox).toHaveAttribute("aria-expanded", "false");
  }

  /**
   * The active client's name, or null when the switcher still shows its
   * placeholder and no client has been selected.
   */
  async activeClient(): Promise<string | null> {
    const label = (await this.combobox.innerText()).trim();
    return label === ClientSwitcher.PLACEHOLDER ? null : label;
  }
}
