import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Clinical LookupController GET names, measured live on /clinical/v1/lookup/{name}. */
export const LOOKUP_NAMES = [
  'behavior-categories',
  'method-types',
  'consecutive-unit-types',
  'record-results',
  'phase-change-types',
  'curriculum-types',
  'lesson-statuses',
  'lesson-step-statuses',
  'track-intensity-statuses',
  'lesson-categories',
  'abc-option-types',
  'data-collection-scale-types',
  'goal-types',
  'phase-change-data-types',
  'strategy-types',
  'validation-statuses',
] as const;

type LookupRow = { value?: unknown; label?: unknown };

When('I request every Clinical lookup catalog', async function (this: CustomWorld) {
  const catalogs: Array<{ name: string; status: number; body: unknown }> = [];
  for (const name of LOOKUP_NAMES) {
    const response = await this.clinical.lookup(name);
    recordResponseMetadata(this, response);
    catalogs.push({
      name,
      status: response.status(),
      body: await response.json().catch(() => undefined),
    });
  }
  this.data.lookupCatalogs = catalogs;
  this.data.lastResponseBody = catalogs[catalogs.length - 1]?.body;
});

Then(
  'every lookup catalog returns 200 with value and label pairs',
  function (this: CustomWorld) {
    const catalogs = (this.data.lookupCatalogs ?? []) as Array<{
      name: string;
      status: number;
      body: unknown;
    }>;
    expect(catalogs.length, 'every LookupController GET should be requested').toBe(
      LOOKUP_NAMES.length,
    );
    for (const catalog of catalogs) {
      expect(catalog.status, `GET /clinical/v1/lookup/${catalog.name}`).toBe(200);
      expect(Array.isArray(catalog.body), `${catalog.name}: bare array`).toBe(true);
      const rows = catalog.body as LookupRow[];
      expect(rows.length, `${catalog.name} should not be empty`).toBeGreaterThan(0);
      for (const row of rows) {
        const valueOk = typeof row.value === 'string' || typeof row.value === 'number';
        expect(valueOk, `${catalog.name}: value is a string or number`).toBe(true);
        expect(String(row.label ?? '').trim(), `${catalog.name} ${row.value}: label`).not.toBe('');
      }
    }
  },
);
