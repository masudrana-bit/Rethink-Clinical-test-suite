import { Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { assertNoCriticalViolations, describeViolations } from '../support/axeScan';

/** Unit 13 — A11Y-1 … A11Y-5. */

Then('there are no critical accessibility violations', async function (this: CustomWorld) {
  const results = await assertNoCriticalViolations(this.page);
  const nonCritical = results.violations.filter((v) => v.impact !== 'critical');
  await this.attach(
    JSON.stringify(
      {
        url: this.page.url(),
        critical: 0,
        other: describeViolations(nonCritical),
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
      },
      null,
      2,
    ),
    { mediaType: 'application/json', fileName: 'axe-scan.json' },
  );
});
