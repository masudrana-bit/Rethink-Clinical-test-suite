import {
  Before,
  After,
  AfterStep,
  BeforeAll,
  AfterAll,
  Status,
  ITestCaseHookParameter,
  ITestStepHookParameter,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { chromium, request, APIRequestContext, Browser } from '@playwright/test';
import * as fs from 'node:fs';
import { CustomWorld } from './world';
import { config } from './config';
import { preflight } from './preflight';
import { acquireAuth, seedAuth, HarvestedAuth } from './auth';
import { installResponseScrubbing } from './scrub';
import { requireWriteClientId } from './writeGuard';
import { apiDiagnostic } from './apiDiagnostics';
import {
  recordApiHit,
  resetApiCallLog,
  setApiLogScenario,
  writeApiEndpointReport,
} from './apiCallLog';

setDefaultTimeout(60_000);

let browser: Browser;
let auth: HarvestedAuth;
/** Untraced context used to fetch responses that must be scrubbed before tracing. */
let scrubFetcher: APIRequestContext;
let runStartedAt = new Date();

function safeArtifactName(value: string): string {
  return value.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

BeforeAll({ timeout: 120_000 }, async function () {
  resetApiCallLog();
  runStartedAt = new Date();
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
  const written = writeApiEndpointReport(runStartedAt);
  console.log(`api report  ${written.join(' · ')}`);
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
  const isWrite = scenario.pickle.tags.some((t) => t.name === '@write');
  const isUi = scenario.pickle.tags.some((t) => t.name === '@ui');
  const isApi = scenario.pickle.tags.some((t) => t.name === '@api');
  if (isWrite) requireWriteClientId();

  this.data.isUiScenario = isUi;
  this.data.isApiScenario = isApi;
  setApiLogScenario(scenario.pickle.name);
  this.browser = browser;
  this.auth = auth;
  this.context = await browser.newContext({
    baseURL: config.baseUrl,
    ...(isUi
      ? {
          recordVideo: {
            dir: 'test-results/videos',
            size: { width: 1280, height: 720 },
          },
        }
      : {}),
  });
  await installResponseScrubbing(this.context, scrubFetcher);
  if (!signedOut) {
    await seedAuth(this.context, auth);
    this.data.token = auth.accessToken;
  }

  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.page.on('response', (response) => {
    recordApiHit({
      method: response.request().method(),
      url: response.url(),
      status: response.status(),
      source: 'browser',
    });
  });
  this.api = await request.newContext();
});

/**
 * UI steps get visual evidence. API-only scenarios instead get one safe,
 * structured request/response diagnostic whenever a new response is recorded.
 */
AfterStep(async function (this: CustomWorld, step: ITestStepHookParameter) {
  if (this.data.isApiScenario && !this.data.isUiScenario) {
    if (this.data.lastResponseStatus === undefined) return;

    const diagnostic = apiDiagnostic(this);
    const signature = JSON.stringify(diagnostic);
    if (signature === this.data.lastAttachedApiDiagnostic) return;
    this.data.lastAttachedApiDiagnostic = signature;

    await this.attach(JSON.stringify(diagnostic, null, 2), {
      mediaType: 'application/json',
      fileName: `${safeArtifactName(step.pickleStep.text) || 'api-response'}.json`,
    });
    return;
  }

  if (!this.data.isUiScenario || !this.page || this.page.isClosed()) return;

  const name = safeArtifactName(step.pickleStep.text) || 'step';
  try {
    const screenshot = await this.page.screenshot();
    await this.attach(screenshot, {
      mediaType: 'image/png',
      fileName: `${name}.png`,
    });
  } catch (error) {
    console.warn(`allure: could not capture screenshot for "${step.pickleStep.text}": ${error}`);
  }
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (!this.context || !this.page) {
    await this.api?.dispose();
    return;
  }

  const created = (this.data.createdTargets ?? []) as Array<{
    clientId: number;
    programId: number;
    targetId: number;
  }>;
  for (const row of created) {
    try {
      const res = await this.clinical.deleteTarget(row.clientId, row.programId, row.targetId);
      if (res.status() >= 400) {
        console.warn(
          `cleanup: DELETE target ${row.targetId} returned ${res.status()} — leftover ZZZ-SUITE resource`,
        );
      }
    } catch (error) {
      console.warn(`cleanup: DELETE target ${row.targetId} failed: ${error}`);
    }
  }

  if (scenario.result?.status === Status.FAILED) {
    fs.mkdirSync('reports', { recursive: true });
    const safe = safeArtifactName(scenario.pickle.name).slice(0, 60);
    await this.context.tracing.stop({ path: `reports/trace-${safe}.zip` });
    if (this.data.isUiScenario) {
      await this.page.screenshot({ path: `reports/fail-${safe}.png`, fullPage: true });
    }
  } else {
    await this.context.tracing.stop();
  }

  const video = this.data.isUiScenario ? this.page.video() : null;
  await this.context.close();

  if (video) {
    try {
      const videoPath = await video.path();
      const videoBuffer = await fs.promises.readFile(videoPath);
      await this.attach(videoBuffer, {
        mediaType: 'video/webm',
        fileName: `${safeArtifactName(scenario.pickle.name) || 'scenario'}.webm`,
      });
      await fs.promises.unlink(videoPath).catch(() => undefined);
    } catch (error) {
      console.warn(`allure: could not attach video for "${scenario.pickle.name}": ${error}`);
    }
  }

  await this.api?.dispose();
});
