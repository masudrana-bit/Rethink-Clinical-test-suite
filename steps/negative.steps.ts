import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ClientRecord } from '../support/testData';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Unit 6 — NEG-1 to NEG-5. */

Given('I have a malformed auth token', function (this: CustomWorld) {
  this.data.token = 'not-a-real-token';
});

/**
 * Derived rather than hardcoded (D2/D6): one past the highest real id cannot
 * collide with a client, however the data changes.
 */
Given('a client id that does not exist', async function (this: CustomWorld) {
  const body = await (await this.clinical.clients()).json();
  const ids = ((body?.items ?? []) as ClientRecord[]).map((c) => c.id);
  expect(ids.length, 'there should be clients to derive a missing id from').toBeGreaterThan(0);
  this.data.missingClientId = Math.max(...ids) + 1;
});

When("I request that client's programs", async function (this: CustomWorld) {
  const res = await this.clinical.programs(this.data.missingClientId as number);
  recordResponseMetadata(this, res);
  this.data.lastResponseBody = await res.json().catch(() => undefined);
});

Then('the envelope holds no items', function (this: CustomWorld) {
  const items = (this.data.lastResponseBody?.items ?? []) as unknown[];
  expect(items, 'a client that does not exist should own nothing').toEqual([]);
});

When("I open that client's record in the browser", async function (this: CustomWorld) {
  await this.page.goto(`/clients/${this.data.missingClientId}`);
});

When('I open a route that does not exist', async function (this: CustomWorld) {
  await this.page.goto('/no-such-route-xyz');
});

Then('the clients list is shown', async function (this: CustomWorld) {
  await expect(this.page.getByTestId('clients-list-page')).toBeVisible({ timeout: 15_000 });
  await expect(this.page, 'the app should settle on the clients list').toHaveURL(/\/clients\/?$/);
});
