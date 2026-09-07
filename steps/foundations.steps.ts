import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { preflight } from '../support/preflight';
import { resolveFixture } from '../support/testData';
import { findCredentialFields } from '../support/scrub';
import { config } from '../support/config';

/** Unit 0 — FND-1 to FND-5. */

Then('the application origin answered the preflight check', async function () {
  const { appOrigin } = await preflight();
  expect(appOrigin.status, `GET ${appOrigin.url}`).toBeLessThan(400);
});

Then('the API gateway origin answered the preflight check', async function () {
  const { apiOrigin } = await preflight();
  // Any status proves a round trip; unauthenticated is expected to be refused.
  expect(apiOrigin.status, `GET ${apiOrigin.url}`).toBeGreaterThan(0);
});

Then('a non-expired access token is available', function (this: CustomWorld) {
  expect(this.auth.accessToken.length).toBeGreaterThan(0);
  expect(this.auth.accessTokenExpiration.getTime()).toBeGreaterThan(Date.now());
});

Then('the API accepts the harvested token', async function (this: CustomWorld) {
  const res = await this.clinical.staffRole();
  expect(res.status(), 'staff-role with the harvested bearer token').toBe(200);
});

When('I resolve a client that has a program with targets', async function (this: CustomWorld) {
  this.fixture = await resolveFixture(this.api, this.auth.accessToken);
});

Then('the resolved client is active', function (this: CustomWorld) {
  expect(this.fixture, 'a fixture was resolved').toBeDefined();
  expect(this.fixture!.client.isActive).toBe(true);
  expect(this.fixture!.client.id).toBeGreaterThan(0);
});

Then('the resolved program has at least one target', function (this: CustomWorld) {
  expect(this.fixture!.program.id).toBeGreaterThan(0);
  expect(this.fixture!.targetCount).toBeGreaterThan(0);
});

When('I open the clients page', async function (this: CustomWorld) {
  await this.clients.goto();
});

When('I open the application root', async function (this: CustomWorld) {
  await this.page.goto('/');
});

Then('the app shell shows a signed-in user', async function (this: CustomWorld) {
  await this.shell.expectSignedIn();
});

Then('the browser holds no data-collection session state', async function (this: CustomWorld) {
  const leaked = await this.page.evaluate(() =>
    Object.keys(window.localStorage).filter((k) => k.startsWith('clinical.rbt.')),
  );
  expect(leaked, 'a fresh context should carry no demo-session or saved-report state').toEqual([]);
});

Then('the sign-in page is shown', async function (this: CustomWorld) {
  await expect(this.page.getByTestId('sign-in-page')).toBeVisible();
});

When(
  'I open the clients page and capture the staff-role response',
  async function (this: CustomWorld) {
    const staffRole = this.page.waitForResponse((r) =>
      r.url().includes('/members/me/staff-role'),
    );
    await this.clients.goto();
    this.data.staffRoleBody = await (await staffRole).json();
  },
);

Then('the captured response carries no credential fields', function (this: CustomWorld) {
  const leaked = findCredentialFields(this.data.staffRoleBody);
  expect(leaked, `credential fields reached the browser at: ${leaked.join(', ')}`).toEqual([]);
});

When('I read the application policy and runtime API origins', async function (this: CustomWorld) {
  const [pageResponse, runtimeResponse] = await Promise.all([
    this.api.get(`${config.baseUrl}/temp-dev-login`),
    this.api.get(`${config.baseUrl}/runtime-config.json`),
  ]);
  expect(pageResponse.status(), 'GET /temp-dev-login').toBe(200);
  expect(runtimeResponse.status(), 'GET /runtime-config.json').toBe(200);

  const runtime = (await runtimeResponse.json()) as {
    apiBaseUrl?: string;
    authApiBaseUrl?: string;
  };
  this.data.contentSecurityPolicy = pageResponse.headers()['content-security-policy'];
  this.data.configuredBackendOrigins = [runtime.apiBaseUrl, runtime.authApiBaseUrl]
    .filter((url): url is string => Boolean(url))
    .map((url) => new URL(url).origin);
});

Then('connect-src permits both configured backend origins', function (this: CustomWorld) {
  const policy = String(this.data.contentSecurityPolicy ?? '');
  const connectSrc = policy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('connect-src '));
  expect(connectSrc, 'the app should publish a connect-src CSP directive').toBeTruthy();

  const origins = this.data.configuredBackendOrigins as string[];
  expect(origins.length, 'runtime config should publish both API origins').toBe(2);
  for (const origin of origins) {
    expect(connectSrc, `connect-src should permit ${origin}`).toContain(origin);
  }
});
