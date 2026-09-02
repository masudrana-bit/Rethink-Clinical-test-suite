import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ClientRecord } from '../support/testData';
import { recordResponseMetadata } from '../support/apiDiagnostics';
import { ClinicalApi } from '../api/clinicalApi';
import { getRuntimeConfig } from '../support/runtimeConfig';

/** Unit 6 — NEG-1 to NEG-5. */

Given('I have a malformed auth token', function (this: CustomWorld) {
  this.data.token = 'not-a-real-token';
});

When('I attempt login with deliberately invalid credentials', async function (this: CustomWorld) {
  const runtime = await getRuntimeConfig(this.api);
  const api = new ClinicalApi(this.api, undefined, runtime.authApplicationKey);
  const res = await api.login(
    `invalid-e2e-${Date.now()}@example.invalid`,
    'deliberately-invalid-password',
  );
  recordResponseMetadata(this, res, 'POST');
  this.data.lastResponseBody = await res.json().catch(() => undefined);
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

When('I attempt to create a target for that unknown client', async function (this: CustomWorld) {
  const res = await this.clinical.createTarget(
    this.data.missingClientId as number,
    1,
    'ZZZ-SUITE-NON-MUTATING-ENDPOINT-PROBE',
  );
  recordResponseMetadata(this, res, 'POST');
  this.data.lastResponseBody = await res.json().catch(() => undefined);
});

When('I attempt to delete a target for that unknown client', async function (this: CustomWorld) {
  const res = await this.clinical.deleteTarget(this.data.missingClientId as number, 1, 1);
  recordResponseMetadata(this, res, 'DELETE');
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

const CLIENTS_LIST = /\/clinical\/v1\/clients(\?|$)/;
const CLIENT_PROGRAMS = /\/clinical\/v1\/clients\/\d+\/programs(?:\?|$)/;

Given('the clients API is delayed', async function (this: CustomWorld) {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  this.data.releaseClientsApi = release;
  await this.page.route(CLIENTS_LIST, async (route) => {
    await gate;
    await route.continue();
  });
});

Given('the clients API will return 503', async function (this: CustomWorld) {
  await this.page.route(CLIENTS_LIST, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Service Unavailable' }),
    }),
  );
});

Given('the programs API returns an empty list', async function (this: CustomWorld) {
  await this.page.route(CLIENT_PROGRAMS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8; x-api-version=1',
      body: JSON.stringify({ page: 1, pageSize: 200, totalCount: 0, totalPages: 1, items: [] }),
    }),
  );
});

When('I open the clients page without waiting for rows', async function (this: CustomWorld) {
  await this.page.goto('/clients');
  await expect(this.clients.root).toBeVisible();
});

Then('the clients list loading state is shown', async function (this: CustomWorld) {
  await expect(this.clients.loading).toBeVisible({ timeout: 15_000 });
});

When('the clients API is allowed to complete', async function (this: CustomWorld) {
  const release = this.data.releaseClientsApi as (() => void) | undefined;
  if (!release) throw new Error('the clients API was not delayed in this scenario');
  release();
  await this.clients.expectLoaded();
});

Then('the clients list error state is shown', async function (this: CustomWorld) {
  await expect(this.clients.error).toBeVisible({ timeout: 15_000 });
  await expect(this.clients.retry).toBeVisible();
});

When('I retry the clients list after the API recovers', async function (this: CustomWorld) {
  await this.page.unroute(CLIENTS_LIST);
  await this.clients.retry.click();
  await this.clients.expectLoaded();
});

Then('the program rail shows an empty state', async function (this: CustomWorld) {
  await expect(this.workspace.programRailEmpty).toBeVisible({ timeout: 15_000 });
});

Then('no programs are listed in the rail', async function (this: CustomWorld) {
  await expect(this.workspace.allProgramItems()).toHaveCount(0);
});
