import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { fixture } from '../support/clientFacts';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Unit 5 — BS-1 to BS-3. */

When('I open Behavior Support for the resolved client', async function (this: CustomWorld) {
  const { client } = await fixture(this);
  await this.behaviorSupport.goto(client.id);
});

Then(
  'the plan rail offers Current and Inactive tabs, each with a count',
  async function (this: CustomWorld) {
    const page = this.behaviorSupport;
    await expect(page.planRail).toBeVisible();
    await expect(page.planRailCurrent, 'the Current tab should carry a count').toHaveText(
      /Current\s*\(\d+\)/,
    );
    await expect(page.planRailInactive, 'the Inactive tab should carry a count').toHaveText(
      /Inactive\s*\(\d+\)/,
    );
  },
);

Then('the novel behaviors panel reports a count', async function (this: CustomWorld) {
  await expect(this.behaviorSupport.novelBehaviours).toBeVisible();
  await expect(this.behaviorSupport.novelBehavioursCount).toHaveText(/\d/);
});

When("I request the resolved client's behavior plans", async function (this: CustomWorld) {
  const { client } = await fixture(this);
  const res = await this.clinical.behaviorPlans(client.id);
  recordResponseMetadata(this, res);
  this.data.lastResponseBody = await res.json().catch(() => undefined);
});

Then(
  'the empty plan message and the unavailable notice are not both shown',
  async function (this: CustomWorld) {
    const page = this.behaviorSupport;
    await expect(page.root).toBeVisible();

    const [empty, unavailable] = await Promise.all([
      page.planRailEmpty.isVisible(),
      page.unavailable.isVisible(),
    ]);

    expect(
      empty && unavailable,
      'the page says the client has no plans and that the data is unavailable at once, ' +
        'so a server error is being presented as an empty state',
    ).toBe(false);
  },
);
