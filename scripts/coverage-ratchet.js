#!/usr/bin/env node
/**
 * Unit 14 coverage ratchet. Live % is computed from docs/surface-inventory.json
 * with the same formula as coverage-inventory.js. The committed floor is
 * docs/coverage-floor.json. Override with COVERAGE_FLOOR for a negative probe.
 *
 * Exit 1 when live < floor so CI fails on a coverage drop.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadInventory, summarize } = require('./coverage-inventory.js');

const FLOOR_FILE = path.join('docs', 'coverage-floor.json');

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

function main() {
  const stats = summarize(loadInventory());
  const floor = floorPercent();
  const msg = `coverage ${stats.percent}% (floor ${floor}%) · ${stats.inScope} in-scope`;
  if (stats.percent < floor) {
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

module.exports = { floorPercent };
