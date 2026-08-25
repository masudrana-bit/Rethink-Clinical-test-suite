#!/usr/bin/env node
/**
 * Reports the data mode each scenario ran against, and decides whether the run's
 * traces are safe to retain.
 *
 * The application substitutes example data when the backend does not respond and
 * declares which it served in a banner; src/fixtures/data-mode.ts records that as
 * a Playwright annotation. Two consequences follow, and this script exists for
 * the second.
 *
 * A "substituted" run proves the user interface works and proves nothing about
 * the data path behind it — a green suite is possible during a total backend
 * outage. That is a reading caveat, handled in the execution report.
 *
 * A "preview" run renders real backend data, so its traces contain real clinical
 * records. Those traces must not be committed or uploaded as CI artefacts. The
 * evidence manifest for run-2026-08-24T1204Z states this constraint; this script
 * enforces it instead of relying on someone remembering.
 *
 * Usage:
 *   node scripts/check-data-mode.mjs <playwright-json-report> [--fail-on-real]
 *
 * Exit codes:
 *   0  every scenario ran against substituted data, or --fail-on-real not passed
 *   1  at least one scenario saw real data and --fail-on-real was passed
 *   2  could not read the report
 */

import { existsSync, readFileSync } from "node:fs";

const [reportPath, ...flags] = process.argv.slice(2);
const failOnReal = flags.includes("--fail-on-real");

if (!reportPath) {
  console.error(
    "Usage: node scripts/check-data-mode.mjs <playwright-json-report> [--fail-on-real]",
  );
  process.exit(2);
}

if (!existsSync(reportPath)) {
  console.error(`No report at ${reportPath}. Run the suite with --reporter=json first.`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (e) {
  console.error(`Cannot parse ${reportPath}: ${e.message}`);
  process.exit(2);
}

/** Scenarios and the mode each recorded, flattened out of Playwright's suite tree. */
const observed = [];

function walk(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        const annotations = result.annotations ?? test.annotations ?? [];
        const mode = annotations.find((a) => a.type === "data-mode");
        // The setup project carries no annotation; it asserts no behaviour, so
        // its absence is expected rather than a gap.
        if (mode) observed.push({ title: spec.title, mode: mode.description ?? "" });
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child);
}

for (const suite of report.suites ?? []) walk(suite);

if (observed.length === 0) {
  console.log(
    "No data-mode annotations found. Either no scenario ran, or the fixture did not record.",
  );
  process.exit(failOnReal ? 1 : 0);
}

/** "substituted" is the only mode known to contain no real clinical records. */
const real = observed.filter((o) => !o.mode.startsWith("substituted"));

console.log("Data mode per scenario:");
for (const o of observed)
  console.log(`  ${o.mode.startsWith("substituted") ? "[safe]" : "[REAL]"} ${o.title} — ${o.mode}`);
console.log("");

if (real.length === 0) {
  console.log("All scenarios ran against substituted example data.");
  console.log("Traces contain no real clinical records and may be retained.");
  process.exit(0);
}

console.log(`${real.length} scenario(s) ran against non-substituted data.`);
console.log("Traces may contain real clinical records. Do not commit or upload them.");
console.log("See aidlc-docs/evidence/run-2026-08-24T1204Z/manifest.md for the constraint.");

process.exit(failOnReal ? 1 : 0);
