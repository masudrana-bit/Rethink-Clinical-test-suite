import { Then, When } from '@cucumber/cucumber';
import { APIResponse, expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { recordResponseMetadata } from '../support/apiDiagnostics';

type AbcOption = {
  id?: unknown;
  label?: unknown;
  kind?: unknown;
  order?: unknown;
  parentId?: unknown;
  active?: unknown;
  isDefault?: unknown;
  functionClass?: unknown;
  origin?: unknown;
  referenceCount?: unknown;
};

async function record(world: CustomWorld, response: APIResponse): Promise<void> {
  recordResponseMetadata(world, response);
  world.data.lastResponseBody = await response.json().catch(() => undefined);
}

When('I request the ABC options library', async function (this: CustomWorld) {
  await record(this, await this.clinical.abcOptions());
});

Then(
  'every ABC option has an id, label, recognized kind, order and settings columns',
  function (this: CustomWorld) {
    const items = (this.data.lastResponseBody?.items ?? []) as AbcOption[];
    const kinds = new Set(['context', 'antecedent', 'consequence', 'possibleFunction']);
    expect(items.length, 'the ABC options library should not be empty').toBeGreaterThan(0);
    for (const item of items) {
      expect(typeof item.id, `ABC option ${item.id}: id`).toBe('number');
      expect(String(item.label ?? '').trim(), `ABC option ${item.id}: label`).not.toBe('');
      expect(kinds.has(String(item.kind)), `ABC option ${item.id}: recognized kind`).toBe(true);
      expect(typeof item.order, `ABC option ${item.id}: order`).toBe('number');
      expect(
        item.parentId === null || typeof item.parentId === 'number',
        `ABC option ${item.id}: parentId is null or a parent id`,
      ).toBe(true);
      expect(typeof item.active, `ABC option ${item.id}: active`).toBe('boolean');
      expect(typeof item.isDefault, `ABC option ${item.id}: isDefault`).toBe('boolean');
      expect(
        item.functionClass === null || typeof item.functionClass === 'string',
        `ABC option ${item.id}: functionClass is null or a class name`,
      ).toBe(true);
      expect(String(item.origin ?? '').trim(), `ABC option ${item.id}: origin`).not.toBe('');
      expect(typeof item.referenceCount, `ABC option ${item.id}: referenceCount`).toBe('number');
      expect(
        Number(item.referenceCount),
        `ABC option ${item.id}: referenceCount is not negative`,
      ).toBeGreaterThanOrEqual(0);
    }
  },
);

When('I request the data-collection scales library', async function (this: CustomWorld) {
  await record(this, await this.clinical.dataCollectionScales());
});

Then(
  'every data-collection scale has an id, name, scale type and items',
  function (this: CustomWorld) {
    const items = (this.data.lastResponseBody?.items ?? []) as Array<{
      id?: unknown;
      name?: unknown;
      scaleType?: unknown;
      items?: unknown;
    }>;
    expect(items.length, 'the data-collection scales library should not be empty').toBeGreaterThan(
      0,
    );
    for (const scale of items) {
      expect(typeof scale.id, `scale ${scale.id}: id`).toBe('number');
      expect(String(scale.name ?? '').trim(), `scale ${scale.id}: name`).not.toBe('');
      expect(String(scale.scaleType ?? '').trim(), `scale ${scale.id}: scaleType`).not.toBe('');
      expect(Array.isArray(scale.items), `scale ${scale.id}: items`).toBe(true);
    }
  },
);

When('I open ABC Settings', async function (this: CustomWorld) {
  const response = this.page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'GET' &&
      new URL(candidate.url()).pathname.endsWith('/clinical/v1/abc-options'),
  );
  await this.abcSettings.goto();
  const abcOptions = await response;
  this.data.abcOptionsStatus = abcOptions.status();
});

Then(
  'the ABC Settings page and section switcher are displayed',
  async function (this: CustomWorld) {
    await this.abcSettings.expectLoaded();
  },
);

Then('the ABC options request succeeded', function (this: CustomWorld) {
  expect(this.data.abcOptionsStatus, 'GET /clinical/v1/abc-options').toBe(200);
});

When('I open Program Library administration', async function (this: CustomWorld) {
  const response = this.page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'GET' &&
      new URL(candidate.url()).pathname.endsWith('/clinical/v1/program-library'),
  );
  await this.programLibraryAdmin.goto();
  const library = await response;
  this.data.programLibraryStatus = library.status();
});

Then(
  'the Program Library administration page is displayed',
  async function (this: CustomWorld) {
    await this.programLibraryAdmin.expectLoaded();
  },
);

Then('the program library request succeeded', function (this: CustomWorld) {
  expect(this.data.programLibraryStatus, 'GET /clinical/v1/program-library').toBe(200);
});
