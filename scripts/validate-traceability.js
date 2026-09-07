#!/usr/bin/env node
/**
 * Fails the build when the written catalog and the running suite drift apart.
 *
 * The traceability pages are only worth reading if the chain behind them holds:
 * every case names a scenario that exists, every scenario is claimed by a case,
 * every inventory citation resolves, and nothing claims coverage that the run
 * contradicts. Each of those was broken at least once before this check existed.
 *
 * Run-dependent checks are skipped when there is no run to read, so the gate is
 * safe on a checkout that has not executed the suite.
 */
const { buildModel } = require('./lib/traceability.js');

function main() {
  const model = buildModel();
  const problems = [];
  const warnings = [];

  for (const testCase of model.cases) {
    if (testCase.link === 'none') {
      problems.push(
        `${testCase.id} names a scenario that does not exist: ${JSON.stringify(testCase.automationRaw)}`,
      );
    }
    if (testCase.link === 'undocumented') {
      problems.push(`${testCase.id} records no automation. Add an Automation row or move it under Operations.`);
    }
  }

  for (const scenario of model.scenarios) {
    if (scenario.caseIds.length === 0) {
      problems.push(`${scenario.file}:${scenario.line} "${scenario.name}" is claimed by no test case.`);
    }
  }

  for (const item of model.items) {
    for (const id of item.unresolvedIds) {
      problems.push(`${item.id} cites ${id}, which is not in the test-case catalog.`);
    }
  }

  if (model.runPresent) {
    for (const item of model.items) {
      if (item.agreement === 'conflict') {
        problems.push(
          `${item.id} (${item.surface}) is recorded as covered, but its checks failed for a reason no known outage explains.`,
        );
      }
      if (item.agreement === 'fix-detected') {
        problems.push(
          `${item.id} (${item.surface}) is recorded as a known defect, but its checks now pass. Clear the status and drop the @bug tag.`,
        );
      }
      if (item.agreement === 'acknowledged') {
        warnings.push(`${item.id} (${item.surface}) diverges by design: ${item.statusRationale}`);
      }
    }
  }

  for (const warning of warnings) console.warn(`  ! ${warning}`);

  if (problems.length > 0) {
    console.error(`traceability failed: ${problems.length} problem(s).`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(
    `traceability  ${model.cases.length} cases · ${model.scenarios.length} scenarios · ` +
      `${model.items.length} surfaces · no drift${warnings.length ? ` · ${warnings.length} acknowledged` : ''}` +
      `${model.runPresent ? '' : ' (no run to compare against)'}`,
  );
}

if (require.main === module) main();

module.exports = { main };
