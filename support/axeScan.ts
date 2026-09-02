import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';
import type { Result } from 'axe-core';

export type AxeScan = Awaited<ReturnType<AxeBuilder['analyze']>>;

function formatViolation(v: Result): string {
  const nodes = v.nodes
    .slice(0, 5)
    .map((n) => n.target.join(' > '))
    .join('; ');
  return `${v.impact ?? 'unknown'} ${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}): ${v.help}. ${nodes}`;
}

/** Human-readable list for assertion messages and Allure attachments. */
export function describeViolations(violations: Result[]): string {
  if (violations.length === 0) return '(none)';
  return violations.map(formatViolation).join('\n');
}

/**
 * WCAG 2.A / 2.AA scan. Unit 13 / D12: only `critical` impact fails the scenario.
 * Serious/moderate/minor are returned so the step can attach them.
 */
export async function scanPage(page: Page): Promise<AxeScan> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
}

export async function assertNoCriticalViolations(page: Page): Promise<AxeScan> {
  const results = await scanPage(page);
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical, `critical axe violations:\n${describeViolations(critical)}`).toEqual([]);
  return results;
}
