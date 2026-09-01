#!/usr/bin/env node
/** Summarises the artifacts of the last run. */
const fs = require('node:fs');
const path = require('node:path');

const dir = 'reports';
const report = path.join(dir, 'cucumber-report.html');
const apiReport = path.join('docs', 'api-endpoint-report.md');

if (!fs.existsSync(report)) {
  console.error(`No report at ${report}. Run \`npm test\` first.`);
  process.exit(1);
}

const artifacts = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith('trace-') || f.startsWith('fail-'))
  .sort();

console.log(`HTML report: ${path.resolve(report)}`);
if (fs.existsSync(apiReport)) {
  console.log(`API endpoint report: ${path.resolve(apiReport)}`);
}

if (artifacts.length === 0) {
  console.log('Failure artifacts: none.');
} else {
  console.log(`Failure artifacts (${artifacts.length}):`);
  for (const file of artifacts) {
    console.log(`  ${path.resolve(dir, file)}`);
  }
  console.log('\nOpen a trace with:  npx playwright show-trace <path>');
}
