import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { recordResponseMetadata } from '../support/apiDiagnostics';
import { acquireAuth, refreshSession, SessionTokens } from '../support/auth';
import { resolveFixture } from '../support/testData';
import { ClinicalApi } from '../api/clinicalApi';

/** Unit 1 — AUTH-1 to AUTH-5. */

Then('the session carries an access token and a refresh token', function (this: CustomWorld) {
  expect(this.auth.accessToken, 'access token').toBeTruthy();
  expect(this.auth.refreshToken, 'refresh token').toBeTruthy();
});

Then('the access token expires in the future', function (this: CustomWorld) {
  const expiry = this.auth.accessTokenExpiration;
  expect(Number.isNaN(expiry.getTime()), 'expiry parses as a date').toBe(false);
  expect(expiry.getTime()).toBeGreaterThan(Date.now());
});

Then('the refresh token outlives the access token', async function (this: CustomWorld) {
  const stored = JSON.parse(this.auth.raw).session as SessionTokens;
  const access = new Date(stored.accessTokenExpiration).getTime();
  const refresh = new Date(stored.refreshTokenExpiration).getTime();
  expect(refresh, 'refresh expiry should be no earlier than access expiry').toBeGreaterThanOrEqual(
    access,
  );
});

When('I exchange the refresh token for a new session', async function (this: CustomWorld) {
  // Sign in again rather than reusing the run-level session. Refresh tokens are
  // single-use, and the app refreshes on its own during earlier scenarios, so the
  // shared token may already be spent by the time this runs.
  const own = await acquireAuth(this.browser, true);
  this.data.previousAccessToken = own.accessToken;
  this.data.refreshed = await refreshSession(this.api, own.refreshToken);
});

Then('the exchange returns a complete set of tokens', function (this: CustomWorld) {
  const tokens = this.data.refreshed as SessionTokens;
  for (const field of [
    'accessToken',
    'refreshToken',
    'accessTokenExpiration',
    'refreshTokenExpiration',
  ] as const) {
    expect(tokens[field], `refreshed session field "${field}"`).toBeTruthy();
  }
  expect(new Date(tokens.accessTokenExpiration).getTime()).toBeGreaterThan(Date.now());
});

Then('the new access token differs from the previous one', function (this: CustomWorld) {
  const tokens = this.data.refreshed as SessionTokens;
  expect(tokens.accessToken).not.toBe(this.data.previousAccessToken);
});

Then('the new access token is accepted by the API', async function (this: CustomWorld) {
  const tokens = this.data.refreshed as SessionTokens;
  const res = await new ClinicalApi(this.api, tokens.accessToken).staffRole();
  expect(res.status(), 'staff-role with the refreshed token').toBe(200);
});

When('an unauthenticated visitor opens the preview sign-in', async function (this: CustomWorld) {
  await this.page.goto('/temp-dev-login');
});

Then('they arrive on the clients page', async function (this: CustomWorld) {
  await this.page.waitForURL(/\/clients$/);
  await this.clients.expectLoaded();
});

When("I request the current user's staff role", async function (this: CustomWorld) {
  const res = await this.clinical.staffRole();
  recordResponseMetadata(this, res);
  this.data.lastResponseBody = await res.json().catch(() => ({}));
});

Then('the staff role names a role and a user', function (this: CustomWorld) {
  const body = this.data.lastResponseBody ?? {};
  expect(body.accountRole?.name, 'accountRole.name').toBeTruthy();
  expect(body.userName, 'userName').toBeTruthy();
  expect(typeof body.staffMemberId, 'staffMemberId is numeric').toBe('number');
});

When(
  "an unauthenticated visitor opens a client's analyze-data page directly",
  async function (this: CustomWorld) {
    const fixture = await resolveFixture(this.api, this.auth.accessToken);
    this.data.deepLinkedClient = fixture.client;
    await this.page.goto(`/clients/${fixture.client.id}/analyze-data`);
  },
);

Then('no client record content is rendered', async function (this: CustomWorld) {
  const client = this.data.deepLinkedClient as { firstName: string; lastName: string };
  await expect(this.page.getByTestId('analyze-data-page')).toHaveCount(0);
  await expect(this.page.getByTestId('app-shell-header')).toHaveCount(0);
  await expect(this.page.locator('body')).not.toContainText(
    `${client.firstName} ${client.lastName}`,
  );
});
