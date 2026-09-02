import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { fixture } from '../support/clientFacts';

/** SES-1 / SES-2 — land on /sessions/new; do not click Confirm. */

Then('the new session wizard is shown', async function (this: CustomWorld) {
  await this.newSession.expectParticipantsStep();
});

When('I advance the new-session wizard to Programs', async function (this: CustomWorld) {
  const { client } = await fixture(this);
  await this.newSession.goToProgramsStep(client.id);
});

Then('the Programs step is shown', async function (this: CustomWorld) {
  await this.newSession.expectLoaded();
  await expect(this.newSession.programsStep).toBeVisible({ timeout: 15_000 });
});
