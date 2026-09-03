#!/usr/bin/env node
/**
 * Unit 15e — Microsoft Teams Adaptive Card via a Power Automate Workflows
 * incoming webhook (not the retired Office 365 connector). Decision D18.
 *
 * Secret TEAMS_WEBHOOK_URL is never printed. Missing secret or missing metrics
 * skip the post and exit 0 so the pipeline stays non-blocking.
 */
const fs = require('node:fs');
const path = require('node:path');

const METRICS = path.join('reports', 'metrics.json');
const HISTORY = path.join('reports', 'history.json');
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || 'https://masudrana-bit.github.io/Rethink-Clinical-test-suite/';

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function names(list) {
  return (list || []).map((item) => (typeof item === 'string' ? item : item.name)).filter(Boolean);
}

function defectDelta(metrics, history) {
  const current = new Set(names(metrics.openDefects));
  const runs = Array.isArray(history?.runs) ? history.runs : [];
  const previous = runs.length >= 2 ? runs[runs.length - 2] : null;
  if (!previous || !Array.isArray(previous.openDefects)) {
    return {
      open: current.size,
      added: 0,
      resolved: 0,
      compared: false,
    };
  }
  const prior = new Set(names(previous.openDefects));
  const added = [...current].filter((name) => !prior.has(name)).length;
  const resolved = [...prior].filter((name) => !current.has(name)).length;
  return { open: current.size, added, resolved, compared: true };
}

function healthy(metrics) {
  return (metrics.byStatus?.failed ?? 0) === 0 && !metrics.warnings?.undefinedSteps;
}

function formatWhen(metrics) {
  const stamp = String(metrics.run?.timestamp || '').replace('T', ' ').slice(0, 16);
  return stamp ? `${stamp} UTC` : 'time not recorded';
}

function defectLine(delta) {
  if (!delta.compared) {
    return `${delta.open} open · no prior run to compare`;
  }
  return `${delta.open} open · ${delta.added} new · ${delta.resolved} resolved`;
}

function buildCard(metrics, delta, url) {
  const ok = healthy(metrics);
  const status = ok ? 'Healthy' : 'Needs attention';
  const passing =
    metrics.passRate == null
      ? 'not available'
      : `${metrics.passRate}% (${metrics.headline?.passed ?? 0} of ${metrics.headline?.executed ?? 0})`;
  const coverage = metrics.coverage?.pending
    ? metrics.coverage.message
    : `${metrics.coverage.percent}% of the product we track`;

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    msteams: { width: 'Full' },
    body: [
      {
        type: 'TextBlock',
        text: 'QUALITY REPORT',
        size: 'Small',
        weight: 'Bolder',
        isSubtle: true,
        spacing: 'None',
      },
      {
        type: 'TextBlock',
        text: 'Rethink Clinical',
        size: 'Large',
        weight: 'Bolder',
        spacing: 'None',
      },
      {
        type: 'TextBlock',
        text: `Nightly quality · ${formatWhen(metrics)} · ${metrics.run?.environment || 'dev2'}`,
        isSubtle: true,
        wrap: true,
        spacing: 'Small',
      },
      {
        type: 'FactSet',
        spacing: 'Medium',
        facts: [
          { title: 'Status', value: status },
          { title: 'Checks passing', value: passing },
          { title: 'Coverage', value: coverage },
          { title: 'Known defects', value: defectLine(delta) },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open quality report',
        url,
      },
    ],
  };
}

function webhookPayload(card) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: card,
      },
    ],
  };
}

async function postCard(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Teams webhook returned ${response.status}${detail ? ` (${detail.slice(0, 180)})` : ''}`);
  }
}

async function main() {
  const webhook = process.env.TEAMS_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.log('Teams notify skipped: TEAMS_WEBHOOK_URL is not set.');
    return;
  }
  if (!fs.existsSync(METRICS)) {
    console.log('Teams notify skipped: reports/metrics.json is missing.');
    return;
  }

  const metrics = loadJson(METRICS);
  const history = fs.existsSync(HISTORY) ? loadJson(HISTORY) : { runs: [] };
  const delta = defectDelta(metrics, history);
  const card = buildCard(metrics, delta, DASHBOARD_URL);
  const payload = webhookPayload(card);
  if (process.env.TEAMS_DRY_RUN === '1') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  await postCard(webhook, payload);
  console.log(
    `Teams notify posted · ${healthy(metrics) ? 'Healthy' : 'Needs attention'} · pass ${metrics.passRate}% · coverage ${
      metrics.coverage?.percent ?? 'n/a'
    }% · defects ${defectLine(delta)}`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.warn(`Teams notify skipped: ${error.message}`);
    process.exitCode = 0;
  });
}

module.exports = { buildCard, defectDelta, webhookPayload, healthy };
