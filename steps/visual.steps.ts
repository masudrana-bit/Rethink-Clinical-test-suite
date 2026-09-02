import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { assertMatchesBaseline, chromeVolatile } from '../support/visual';

/** Unit 12 — VIS-1 … VIS-5. */

Then(
  'the screenshot {string} matches the baseline',
  async function (this: CustomWorld, name: string) {
    const mask = [...chromeVolatile(this.page)];
    if (name === 'clients-list') {
      mask.push(...this.clients.volatileForVisual());
    } else if (name === 'client-workspace') {
      mask.push(...this.workspace.volatileForVisual());
    } else if (name.startsWith('analyze-')) {
      const panel =
        name === 'analyze-custom'
          ? this.analyzeData.customGraph
          : name === 'analyze-bulk'
            ? this.analyzeData.bulkReport
            : this.analyzeData.masteredReport;
      await expect(panel).toBeVisible({ timeout: 15_000 });
      mask.push(...this.analyzeData.volatileForVisual());
    } else {
      throw new Error(`No mask map for visual baseline "${name}".`);
    }
    await assertMatchesBaseline(this.page, name, mask);
  },
);
