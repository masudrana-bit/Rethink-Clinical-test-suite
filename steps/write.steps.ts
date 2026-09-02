import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import {
  resolveWriteFixture,
  suiteResourceName,
  trackCreatedTarget,
} from '../support/writeGuard';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Phase 2b — WR-1 … WR-6. */

When(
  "I create a uniquely named target on the dedicated client's program",
  async function (this: CustomWorld) {
    const { client, program } = await resolveWriteFixture(this);
    const description = suiteResourceName('target');
    this.data.suiteTargetDescription = description;
    const res = await this.clinical.createTarget(client.id, program.id, description);
    recordResponseMetadata(this, res, 'POST');
    this.data.lastResponseBody = await res.json().catch(() => undefined);
    const id = this.data.lastResponseBody?.id;
    if (typeof id === 'number') {
      trackCreatedTarget(this, client, program, id);
    }
  },
);

Then('the targets API lists that target', async function (this: CustomWorld) {
  const { client, program } = await resolveWriteFixture(this);
  const description = this.data.suiteTargetDescription as string;
  const body = await (await this.clinical.targets(client.id, program.id)).json();
  const items = (body?.items ?? []) as Array<{ id: number; description?: string }>;
  const hit = items.find((t) => t.description === description);
  expect(hit, `expected a target named ${description}`).toBeTruthy();
});

When("I open the dedicated client's workspace", async function (this: CustomWorld) {
  const { client } = await resolveWriteFixture(this);
  await this.workspace.goto(client.id);
});

When("I note the program's target count", async function (this: CustomWorld) {
  const { client, program } = await resolveWriteFixture(this);
  const body = await (await this.clinical.targets(client.id, program.id)).json();
  this.data.targetCountBefore = Number(body?.totalCount ?? (body?.items ?? []).length);
});

When('I click add-target', async function (this: CustomWorld) {
  await this.workspace.addTarget.click();
});

When('I start watching for clinical writes', async function (this: CustomWorld) {
  const writes: string[] = [];
  this.data.clinicalWrites = writes;
  this.page.on('request', (req) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method())) return;
    if (/refresh-token|\/login(?:\?|$)/i.test(req.url())) return;
    writes.push(`${req.method()} ${req.url()}`);
  });
});

When('I click record-data', async function (this: CustomWorld) {
  this.data.recordDataOutcome = await this.workspace.clickRecordData();
});

Then('no clinical write request is sent', function (this: CustomWorld) {
  const writes = (this.data.clinicalWrites as string[]) ?? [];
  expect(writes, 'record-data must not POST/PATCH/PUT/DELETE clinical data').toEqual([]);
});

Then('a data-collection form or the session wizard is shown', function (this: CustomWorld) {
  expect(
    this.data.recordDataOutcome,
    'record-data should open a form or /sessions/new (DEF-6: it currently does not)',
  ).not.toBe('noop');
});

Then('no dialog is shown', async function (this: CustomWorld) {
  await expect(this.workspace.visibleDialog).toHaveCount(0);
});

Then("the program's target count is unchanged", async function (this: CustomWorld) {
  const { client, program } = await resolveWriteFixture(this);
  const body = await (await this.clinical.targets(client.id, program.id)).json();
  const after = Number(body?.totalCount ?? (body?.items ?? []).length);
  expect(after, 'clicking a stub add-target must not POST a target').toBe(
    this.data.targetCountBefore,
  );
});

Then('a target form is shown', async function (this: CustomWorld) {
  await expect(
    this.workspace.visibleDialog,
    'add-target should open a form (DEF-6: it currently does not)',
  ).not.toHaveCount(0);
});

When('I open Analyze Data for the dedicated client', async function (this: CustomWorld) {
  const { client } = await resolveWriteFixture(this);
  await this.analyzeData.goto(client.id);
});

When('I save the current report as a unique name', async function (this: CustomWorld) {
  const name = suiteResourceName('report');
  this.data.savedReportName = name;
  await this.analyzeData.saveNamedReport(name);
});

Then('that report name is listed among saved reports', async function (this: CustomWorld) {
  const name = this.data.savedReportName as string;
  await expect(this.page.getByText(name, { exact: true })).toBeVisible();
  await expect(this.analyzeData.savedReportEmpty).toHaveCount(0);
});

When('I confirm mastery on a suite-created flagged evaluation', async function () {
  return 'pending';
});

When('I dismiss a suite-created flagged evaluation', async function () {
  return 'pending';
});

Then('that row is gone from the pending list', async function () {
  return 'pending';
});
