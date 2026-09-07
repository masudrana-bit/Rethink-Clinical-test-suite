#!/usr/bin/env node
/**
 * Render the current dashboard metrics into a GitHub Actions job summary.
 *
 * The HTML dashboard remains the detailed product view. This summary makes the
 * same product-area matrix visible on every test-bearing Actions job without
 * allowing PR smoke runs to replace the full-suite Pages dashboard (D21).
 */
const fs = require('node:fs');
const path = require('node:path');

const METRICS = process.env.METRICS_JSON || path.join('reports', 'metrics.json');
const SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || 'https://masudrana-bit.github.io/Rethink-Clinical-test-suite/';

const AREA_LABELS = {
  auth: 'Sign-in',
  clients: 'Client management',
  programs: 'Skills programs',
  'analyze-data': 'Analyze Data',
  'behavior-support': 'Behavior support',
  negative: 'Error handling',
  sessions: 'New session',
  a11y: 'Accessibility',
  preflight: 'Platform foundations',
  write: 'Data entry',
  visual: 'Page layout',
};

function cell(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ');
}

function status(area) {
  if (!area.executed) return 'NOT RUN';
  return area.failed ? 'NEEDS ATTENTION' : 'HEALTHY';
}

function render(metrics) {
  const coverage = metrics.coverage?.pending ? 'Pending inventory' : `${metrics.coverage?.percent}%`;
  const lines = [
    '## Product quality dashboard',
    '',
    `**${metrics.byStatus?.failed ? 'NEEDS ATTENTION' : 'HEALTHY'}** | ` +
      `**${cell(metrics.passRate)}%** checks passing | ` +
      `**${cell(coverage)}** coverage | ` +
      `**${cell(metrics.openDefects?.length ?? 0)}** known defects`,
    '',
    `Run: \`${cell(metrics.run?.gitRef)}\` | ${cell(metrics.run?.environment)} | ` +
      `${cell(metrics.executed)} scenarios | [Open the published dashboard](${DASHBOARD_URL})`,
    '',
    '### Results by product area',
    '',
    '| Product area | Status | Checks run | Passed | Failed | Pass rate |',
    '|---|---:|---:|---:|---:|---:|',
  ];

  for (const area of metrics.areas || []) {
    lines.push(
      `| ${cell(AREA_LABELS[area.area] || area.area)} | ${status(area)} | ` +
        `${cell(area.executed)} | ${cell(area.passed)} | ${cell(area.failed)} | ` +
        `${area.passRate == null ? '—' : `${cell(area.passRate)}%`} |`,
    );
  }

  if (metrics.areaOverlap) {
    lines.push(
      '',
      `> ${metrics.areaOverlap} of ${metrics.executed} checks serve two product areas, ` +
        'so the "Checks run" column intentionally exceeds the run total.',
    );
  }

  lines.push(
    '',
    '> This summary describes this job only. PR smoke runs do not replace or enter the ' +
      'full-suite dashboard trend.',
    '',
  );
  return lines.join('\n');
}

function write(text) {
  if (SUMMARY) {
    fs.appendFileSync(SUMMARY, `${text}\n`);
    console.log(`dashboard summary appended to ${SUMMARY}`);
  } else {
    console.log(text);
  }
}

function main() {
  if (!fs.existsSync(METRICS)) {
    write(
      '## Product quality dashboard\n\n' +
        'WARNING: Dashboard metrics were unavailable for this job. Check the dashboard generation step.',
    );
    return;
  }

  try {
    write(render(JSON.parse(fs.readFileSync(METRICS, 'utf8'))));
  } catch (error) {
    write(`## Product quality dashboard\n\nWARNING: Could not render dashboard metrics: ${cell(error.message)}`);
  }
}

if (require.main === module) main();

module.exports = { render, status };
