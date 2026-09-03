#!/usr/bin/env node
/**
 * Unit 15d coverage ratchet. The dashboard generator computes coverage once
 * and writes reports/metrics.json; this gate reads that exact value. The
 * committed floor is docs/coverage-floor.json. Override COVERAGE_FLOOR for a
 * deliberate negative probe.
 *
 * Exit 1 when live < floor so CI fails on a coverage drop.
 */
const fs = require('node:fs');
const path = require('node:path');

const FLOOR_FILE = path.join('docs', 'coverage-floor.json');
const METRICS_FILE = path.join('reports', 'metrics.json');

function floorPercent() {
  if (process.env.COVERAGE_FLOOR !== undefined && process.env.COVERAGE_FLOOR !== '') {
    const n = Number(process.env.COVERAGE_FLOOR);
    if (Number.isNaN(n)) {
      throw new Error('COVERAGE_FLOOR must be a number.');
    }
    return n;
  }
  const floor = JSON.parse(fs.readFileSync(FLOOR_FILE, 'utf8'));
  const n = Number(floor.percent);
  if (Number.isNaN(n)) {
    throw new Error(`${FLOOR_FILE} is missing a numeric percent.`);
  }
  return n;
}

function metricsCoveragePercent() {
  if (!fs.existsSync(METRICS_FILE)) {
    throw new Error(
      `${METRICS_FILE} is missing. Run \`npm run dashboard:metrics\` before the ratchet.`,
    );
  }
  const metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
  const n = Number(metrics.coverage?.percent);
  if (Number.isNaN(n)) {
    throw new Error(`${METRICS_FILE} is missing a numeric coverage.percent.`);
  }
  return { percent: n, inScope: metrics.coverage?.inScope };
}

function main() {
  const coverage = metricsCoveragePercent();
  const floor = floorPercent();
  const scope = coverage.inScope == null ? '' : ` · ${coverage.inScope} in-scope`;
  const msg = `coverage ${coverage.percent}% from ${METRICS_FILE} (floor ${floor}%)${scope}`;
  if (coverage.percent < floor) {
    console.error(
      `ratchet failed: ${msg}. Coverage must not drop. Raise docs/coverage-floor.json only after a real inventory gain — never lower it to hide a gap.`,
    );
    process.exit(1);
  }
  console.log(`ratchet ok: ${msg}`);
}

if (require.main === module) {
  main();
}

module.exports = { floorPercent, metricsCoveragePercent };
