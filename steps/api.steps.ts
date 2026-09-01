import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ClinicalApi } from '../api/clinicalApi';
import { config, hasCredentials } from '../support/config';
import { apiAssertionMessage, recordResponseMetadata } from '../support/apiDiagnostics';
import { recordApiResponseHit } from '../support/apiCallLog';

/**
 * Starter API steps. These are enough to run AUTH-1, CLI-1, NEG-1.
 * Extend during Construction, one unit of work per bolt.
 */

// D1: the session is harvested once per run in BeforeAll, not fetched per scenario.
Given('I am logged in via the auth API', function (this: CustomWorld) {
  this.data.token = this.auth.accessToken;
  expect(this.data.token, 'a harvested access token').toBeTruthy();
});

Given('I have no auth token', function (this: CustomWorld) {
  this.data.token = undefined;
});

When('I log in via the auth API with valid dev credentials', async function (this: CustomWorld) {
  if (!hasCredentials()) {
    throw new Error(
      'This step needs TEST_USERNAME, TEST_PASSWORD and AUTH_APPLICATION_KEY. ' +
        'Under decision D1 the suite has no service account, so use ' +
        '"I am logged in via the auth API" instead.',
    );
  }
  const api = new ClinicalApi(this.api);
  const res = await api.login(config.username!, config.password!);
  recordResponseMetadata(this, res, 'POST');
  this.data.lastResponseBody = await res.json().catch(() => ({}));
});

When('I GET {string}', async function (this: CustomWorld, path: string) {
  const url = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`;
  const headers: Record<string, string> = this.data.token
    ? { Authorization: `Bearer ${this.data.token}` }
    : {};
  const res = await this.api.get(url, { headers });
  await recordApiResponseHit(res, 'GET', 'client');
  recordResponseMetadata(this, res);
  this.data.lastResponseBody = await res.json().catch(() => ({}));
});

Then('the response status is {int}', function (this: CustomWorld, status: number) {
  expect(
    this.data.lastResponseStatus,
    apiAssertionMessage(this, `Expected the API to return HTTP ${status}.`),
  ).toBe(status);
});

Then('the response status is not {int}', function (this: CustomWorld, status: number) {
  expect(
    this.data.lastResponseStatus,
    apiAssertionMessage(this, `Expected the API not to return HTTP ${status}.`),
  ).not.toBe(status);
});

Then('the response status is a client error', function (this: CustomWorld) {
  const status = this.data.lastResponseStatus;
  expect(
    status,
    apiAssertionMessage(this, 'Expected a safe HTTP 4xx rejection, not a write or server failure.'),
  ).toBeGreaterThanOrEqual(400);
  expect(
    status,
    apiAssertionMessage(this, 'Expected a safe HTTP 4xx rejection, not a write or server failure.'),
  ).toBeLessThan(500);
});

Then('the login response status is {int}', function (this: CustomWorld, status: number) {
  expect(
    this.data.lastResponseStatus,
    apiAssertionMessage(this, `Expected login to return HTTP ${status}.`),
  ).toBe(status);
});

Then('the response contains an access token', function (this: CustomWorld) {
  const b = this.data.lastResponseBody ?? {};
  expect(
    b.accessToken ?? b.token ?? b.access_token,
    apiAssertionMessage(this, 'Expected the response body to contain an access token.'),
  ).toBeTruthy();
});

Then('the content type includes {string}', function (this: CustomWorld, fragment: string) {
  const ct = this.data.lastResponseHeaders?.['content-type'] ?? '';
  expect(
    ct,
    apiAssertionMessage(this, `Expected Content-Type to include "${fragment}".`),
  ).toContain(fragment);
});

Then('the body has keys {string}, {string}, {string}, {string}, {string}',
  function (this: CustomWorld, a: string, b: string, c: string, d: string, e: string) {
    const body = this.data.lastResponseBody ?? {};
    for (const k of [a, b, c, d, e]) {
      expect(
        body,
        apiAssertionMessage(this, `Expected the response body to contain property "${k}".`),
      ).toHaveProperty(k);
    }
  });

Then('the body contains {string}', function (this: CustomWorld, key: string) {
  expect(
    this.data.lastResponseBody ?? {},
    apiAssertionMessage(this, `Expected the response body to contain property "${key}".`),
  ).toHaveProperty(key);
});

Then('every item has {string}, {string}, {string}, {string}',
  function (this: CustomWorld, a: string, b: string, c: string, d: string) {
    const items = (this.data.lastResponseBody?.items ?? []) as any[];
    expect(
      items.length,
      apiAssertionMessage(this, 'Expected the response to contain at least one item.'),
    ).toBeGreaterThan(0);
    for (const [index, item] of items.entries()) {
      for (const key of [a, b, c, d]) {
        expect(
          item,
          apiAssertionMessage(this, `Expected item ${index} to contain property "${key}".`),
        ).toHaveProperty(key);
      }
    }
  });
