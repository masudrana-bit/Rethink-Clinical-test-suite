import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { apiAssertionMessage } from '../support/apiDiagnostics';

/**
 * Assertions shared across units. They read `data.lastResponseBody`, so any step
 * that issues a request must record it there.
 */

interface PagedEnvelope {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: unknown[];
}

function envelope(world: CustomWorld): PagedEnvelope {
  const body = world.data.lastResponseBody;
  expect(
    body,
    apiAssertionMessage(world, 'Expected a response body to be recorded before validation.'),
  ).toBeTruthy();
  return body as PagedEnvelope;
}

Then(
  'the envelope carries page, pageSize, totalCount, totalPages and items',
  function (this: CustomWorld) {
    const body = envelope(this);
    for (const key of ['page', 'pageSize', 'totalCount', 'totalPages'] as const) {
      expect(
        typeof body[key],
        apiAssertionMessage(this, `Expected envelope.${key} to be a number.`),
      ).toBe('number');
    }
    expect(
      Array.isArray(body.items),
      apiAssertionMessage(this, 'Expected envelope.items to be an array.'),
    ).toBe(true);
  },
);

Then("the envelope's paging arithmetic is self-consistent", function (this: CustomWorld) {
  const { page, pageSize, totalCount, totalPages, items } = envelope(this);
  expect(page, apiAssertionMessage(this, 'Expected page to be greater than zero.')).toBeGreaterThan(
    0,
  );
  expect(
    Array.isArray(items),
    apiAssertionMessage(this, 'Expected envelope.items to be an array.'),
  ).toBe(true);
  expect(
    items.length,
    apiAssertionMessage(this, `Expected ${items.length} items not to exceed pageSize ${pageSize}.`),
  ).toBeLessThanOrEqual(pageSize);
  expect(
    totalPages,
    apiAssertionMessage(
      this,
      `Expected totalPages to equal ceil(${totalCount} / ${pageSize}).`,
    ),
  ).toBe(
    Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  if (totalPages === 1) {
    expect(
      items.length,
      apiAssertionMessage(
        this,
        `Expected the single page to contain all ${totalCount} reported items.`,
      ),
    ).toBe(totalCount);
  }
});

Then('the response body is an array', function (this: CustomWorld) {
  expect(
    Array.isArray(this.data.lastResponseBody),
    apiAssertionMessage(this, 'Expected the response body to be a bare array.'),
  ).toBe(true);
});
