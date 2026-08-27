import {
  Before, After, BeforeAll, AfterAll, Status, ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, request, Browser } from '@playwright/test';
import { CustomWorld } from './world';
import { config } from './config';

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({ headless: true });
});

AfterAll(async function () {
  await browser?.close();
});

Before(async function (this: CustomWorld) {
  this.browser = browser;
  this.context = await browser.newContext({ baseURL: config.baseUrl });
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.api = await request.newContext();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
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
