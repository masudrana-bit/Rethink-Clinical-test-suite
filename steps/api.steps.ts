import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ClinicalApi } from '../api/clinicalApi';
import { config } from '../support/config';

/**
 * Starter API steps. These are enough to run AUTH-1, CLI-1, NEG-1.
 * Extend during Construction, one unit of work per bolt.
 */

Given('I am logged in via the auth API', async function (this: CustomWorld) {
  const api = new ClinicalApi(this.api);
  const res = await api.login(config.username, config.password);
  expect(res.status()).toBe(200);
  const body = await res.json();
  // TODO(construction): confirm the exact token field name from the login response.
  this.data.token = body.accessToken ?? body.token ?? body.access_token;
  expect(this.data.token, 'access token present in login response').toBeTruthy();
});

Given('I have no auth token', function (this: CustomWorld) {
  this.data.token = undefined;
});

When('I log in via the auth API with valid dev credentials', async function (this: CustomWorld) {
  const api = new ClinicalApi(this.api);
  const res = await api.login(config.username, config.password);
  this.data.lastResponseStatus = res.status();
  this.data.lastResponseBody = await res.json().catch(() => ({}));
});

When('I GET {string}', async function (this: CustomWorld, path: string) {
  const url = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`;
  const headers = this.data.token ? { Authorization: `Bearer ${this.data.token}` } : {};
  const res = await this.api.get(url, { headers });
  this.data.lastResponseStatus = res.status();
  this.data.lastResponseHeaders = res.headers();
  this.data.lastResponseBody = await res.json().catch(() => ({}));
});

Then('the response status is {int}', function (this: CustomWorld, status: number) {
  expect(this.data.lastResponseStatus).toBe(status);
});

Then('the response status is not {int}', function (this: CustomWorld, status: number) {
  expect(this.data.lastResponseStatus).not.toBe(status);
});

Then('the login response status is {int}', function (this: CustomWorld, status: number) {
  expect(this.data.lastResponseStatus).toBe(status);
});

Then('the response contains an access token', function (this: CustomWorld) {
  const b = this.data.lastResponseBody ?? {};
  expect(b.accessToken ?? b.token ?? b.access_token).toBeTruthy();
});

Then('the content type includes {string}', function (this: CustomWorld, fragment: string) {
  const ct = this.data.lastResponseHeaders?.['content-type'] ?? '';
  expect(ct).toContain(fragment);
});

Then('the body has keys {string}, {string}, {string}, {string}, {string}',
  function (this: CustomWorld, a: string, b: string, c: string, d: string, e: string) {
    const body = this.data.lastResponseBody ?? {};
    for (const k of [a, b, c, d, e]) expect(body).toHaveProperty(k);
  });

Then('the body contains {string}', function (this: CustomWorld, key: string) {
  expect(this.data.lastResponseBody ?? {}).toHaveProperty(key);
});

Then('every item has {string}, {string}, {string}, {string}',
  function (this: CustomWorld, a: string, b: string, c: string, d: string) {
    const items = (this.data.lastResponseBody?.items ?? []) as any[];
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) for (const k of [a, b, c, d]) expect(it).toHaveProperty(k);
  });
