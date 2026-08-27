import {
  Before, After, BeforeAll, AfterAll, Status, ITestCaseHookParameter, setDefaultTimeout,
} from '@cucumber/cucumber';
import { chromium, request, APIRequestContext, Browser } from '@playwright/test';
import * as fs from 'node:fs';
import { CustomWorld } from './world';
import { config } from './config';
import { preflight } from './preflight';
import { acquireAuth, seedAuth, HarvestedAuth } from './auth';
import { installResponseScrubbing } from './scrub';

setDefaultTimeout(60_000);

let browser: Browser;
let auth: HarvestedAuth;
/** Untraced context used to fetch responses that must be scrubbed before tracing. */
let scrubFetcher: APIRequestContext;

BeforeAll({ timeout: 120_000 }, async function () {
  const reachability = await preflight();
  browser = await chromium.launch({ headless: config.headless });
  scrubFetcher = await request.newContext();
  auth = await acquireAuth(browser);

  console.log(
    [
      `preflight  app ${reachability.appOrigin.status} · api ${reachability.apiOrigin.status}`,
      `auth       token acquired, expires ${auth.accessTokenExpiration.toISOString()}`,
    ].join('\n'),
  );
});

AfterAll(async function () {
  await browser?.close();
  await scrubFetcher?.dispose();
});

/**
 * FND-5. Every scenario gets a brand-new context seeded with the auth key only.
 * The app keeps demo sessions and saved reports in localStorage, so replaying a
 * whole storageState would carry one scenario's state into the next.
 */
Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const signedOut = scenario.pickle.tags.some((t) => t.name === '@signed-out');

  this.browser = browser;
  this.auth = auth;
  this.context = await browser.newContext({ baseURL: config.baseUrl });
  await installResponseScrubbing(this.context, scrubFetcher);
  if (!signedOut) {
    await seedAuth(this.context, auth);
    this.data.token = auth.accessToken;
  }

  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.api = await request.newContext();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
    fs.mkdirSync('reports', { recursive: true });
    const safe = scenario.pickle.name.replace(/[^\w]+/g, '_').slice(0, 60);
    await this.context.tracing.stop({ path: `reports/trace-${safe}.zip` });
    await this.page.screenshot({ path: `reports/fail-${safe}.png`, fullPage: true });
  } else {
    await this.context.tracing.stop();
  }
  await this.page?.close();
  await this.context?.close();
  await this.api?.dispose();
});
