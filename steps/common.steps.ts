import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

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
  expect(body, 'a response body was recorded').toBeTruthy();
  return body as PagedEnvelope;
}

Then(
  'the envelope carries page, pageSize, totalCount, totalPages and items',
  function (this: CustomWorld) {
    const body = envelope(this);
    for (const key of ['page', 'pageSize', 'totalCount', 'totalPages'] as const) {
      expect(typeof body[key], `${key} should be a number`).toBe('number');
    }
    expect(Array.isArray(body.items), 'items should be an array').toBe(true);
  },
);

Then("the envelope's paging arithmetic is self-consistent", function (this: CustomWorld) {
  const { page, pageSize, totalCount, totalPages, items } = envelope(this);
  expect(page, 'page').toBeGreaterThan(0);
  expect(Array.isArray(items), 'items should be an array').toBe(true);
  expect(items.length, 'items should not exceed pageSize').toBeLessThanOrEqual(pageSize);
  expect(totalPages, 'totalPages should equal ceil(totalCount / pageSize)').toBe(
    Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  if (totalPages === 1) {
    expect(items.length, 'a single page should hold every item').toBe(totalCount);
  }
});

Then('the response body is an array', function (this: CustomWorld) {
  expect(Array.isArray(this.data.lastResponseBody), 'body should be a bare array').toBe(true);
});
