import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import {
  resolveWriteFixture,
  suiteResourceName,
  trackCreatedTarget,
} from '../support/writeGuard';

/** Phase 2b — WR-1 … WR-6. */

When(
  "I create a uniquely named target on the dedicated client's program",
  async function (this: CustomWorld) {
    const { client, program } = await resolveWriteFixture(this);
    const description = suiteResourceName('target');
    this.data.suiteTargetDescription = description;
    const res = await this.clinical.createTarget(client.id, program.id, description);
    this.data.lastResponseStatus = res.status();
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

When('I record data against a suite-created target', async function () {
  return 'pending';
});

Then('a subsequent read shows that session', async function () {
  return 'pending';
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
