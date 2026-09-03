#!/usr/bin/env node
/**
 * Unit 15 dashboard generator.
 * 15a: cucumber JSON + inventory → reports/metrics.json
 * 15b: append reports/history.json (cap 200), flake rate, trends
 * 15c: render reports/dashboard.html (self-contained, product language)
 *
 * Metric definitions: rules/30-metrics-dashboard.md §3; decisions D15, D16.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { loadInventory, summarize } = require('./coverage-inventory.js');

const REPORT = process.env.CUCUMBER_JSON || path.join('reports', 'cucumber-report.json');
const METRICS = path.join('reports', 'metrics.json');
const DASHBOARD = path.join('reports', 'dashboard.html');
const ALLURE_URL = process.env.ALLURE_URL || '../allure-report/index.html';
const HISTORY_FILE = process.env.HISTORY_JSON || path.join('reports', 'history.json');
const HISTORY_CAP = Number(process.env.HISTORY_CAP || 200);
const FLAKE_WINDOW = 10;
const TREND_WINDOW = 30;
const FEATURES_DIR = path.join('features');
const INVENTORY_FILE = path.join('docs', 'surface-inventory.json');

const CANONICAL_AREAS = ['auth', 'clients', 'programs', 'analyze-data', 'behavior-support'];
const EXTRA_AREAS = ['negative', 'sessions', 'a11y', 'preflight', 'write', 'visual'];
const AREA_TAGS = [...CANONICAL_AREAS, ...EXTRA_AREAS];

/** §4 wording rule: the dashboard names products, never feature files or tags. */
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

const DEFECT_SUMMARIES = {
  'Every request the report makes succeeds':
    'Part of a report sometimes fails to load when many programs are pulled at once.',
  'Changing the grouping regroups the chart':
    'Choosing a different grouping updates the label but leaves the chart unchanged.',
  "Behavior plans returns the client's plans": 'A client’s behavior plans do not load at all.',
  'The page does not claim there are no plans while data is unavailable':
    'The page states a client has no plans when the plans have simply failed to load.',
  'Add target opens a form for a new target':
    'The button for adding a target does not open anything.',
};

const GAP_SUMMARIES = {
  'A-confirm-mastery': 'Confirming a mastery decision cannot be exercised automatically yet.',
  'A-dismiss-mastery': 'Dismissing a mastery decision cannot be exercised automatically yet.',
  'R-sessions-new': 'The new-session flow is checked up to, but not through, the final confirmation.',
  'A-scope-select': 'The report scope choices are not agreed, so only the control itself is checked.',
  'S-bs-true-empty':
    'A client with genuinely no behavior plans cannot be reached while that data fails to load.',
};

const EXCLUDED_GROUPS = [
  { tag: 'bug', reason: 'Known defects. Expected to fail until the product is fixed, so they are kept out of the headline.' },
  { tag: 'write', reason: 'Change real data. Run only against a dedicated practice client, never the shared caseload.' },
  { tag: 'visual', reason: 'Page-layout comparisons. Run on the reference machine, since fonts differ per computer.' },
  { tag: 'wip', reason: 'Blocked: the product does not offer a way to set these up yet.' },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

function tagNames(tags) {
  if (!tags) return [];
  return tags.map((t) => (typeof t === 'string' ? t : t.name)).map((n) => n.replace(/^@/, ''));
}

function hasTag(tags, name) {
  const want = name.replace(/^@/, '');
  return tagNames(tags).includes(want);
}

function worstStatus(statuses) {
  const order = ['failed', 'ambiguous', 'undefined', 'pending', 'skipped', 'passed'];
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return statuses[0] || 'unknown';
}

function scenarioStatus(element) {
  if (element.status) return element.status;
  const steps = (element.steps || []).filter((s) => !s.hidden);
  const statuses = steps.map((s) => s.result?.status).filter(Boolean);
  return worstStatus(statuses);
}

function stepDurationNs(step) {
  const d = step.result?.duration;
  if (d == null) return 0;
  if (typeof d === 'object' && d.seconds != null) {
    return Number(d.seconds) * 1e9 + Number(d.nanos || 0);
  }
  return Number(d);
}

function collectScenarios(report) {
  const scenarios = [];
  for (const feature of report) {
    const featureTags = feature.tags || [];
    const uri = feature.uri || '';
    for (const element of feature.elements || []) {
      if (element.type && element.type !== 'scenario') continue;
      const tags = [...featureTags, ...(element.tags || [])];
      const steps = (element.steps || []).filter((s) => !s.hidden);
      scenarios.push({
        name: element.name,
        uri,
        line: element.line,
        tags: tagNames(tags),
        status: scenarioStatus(element),
        durationNs: steps.reduce((sum, s) => sum + stepDurationNs(s), 0),
        stepCount: steps.length,
        stepStatuses: steps.map((s) => s.result?.status || 'unknown'),
      });
    }
  }
  return scenarios;
}

function parseTagLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) return null;
  return trimmed.split(/\s+/).filter((t) => t.startsWith('@')).map((t) => t.slice(1));
}

function catalogScenarios(dir) {
  const all = [];
  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.feature'));
  for (const rel of files) {
    const uri = path.join(dir, rel).replaceAll('\\', '/');
    const text = fs.readFileSync(path.join(dir, rel), 'utf8');
    let pending = [];
    let featureTags = [];
    let ruleTags = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const tags = parseTagLine(trimmed);
      if (tags) {
        pending = pending.concat(tags);
        continue;
      }
      if (/^Feature\b/.test(trimmed)) {
        featureTags = pending;
        ruleTags = [];
        pending = [];
        continue;
      }
      if (/^Rule\b/.test(trimmed)) {
        ruleTags = pending;
        pending = [];
        continue;
      }
      const scenario = trimmed.match(/^(Scenario(?: Outline)?)\s*:\s*(.+)$/);
      if (scenario) {
        const tagSet = [...new Set([...featureTags, ...ruleTags, ...pending])];
        pending = [];
        all.push({ name: scenario[2].trim(), uri, line: i + 1, tags: tagSet });
      }
    }
  }
  return all;
}

function catalogBugScenarios(dir) {
  return catalogScenarios(dir).filter((s) => s.tags.includes('bug'));
}

function gitRef() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function trigger() {
  if (process.env.GITHUB_EVENT_NAME) return process.env.GITHUB_EVENT_NAME;
  if (process.env.GITHUB_ACTIONS === 'true') return 'github-actions';
  if (process.env.CI) return 'ci';
  return 'manual';
}

function timezoneNow() {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return { timestamp: now.toISOString(), timezone: tz };
}

function coverageBlock() {
  if (!fs.existsSync(INVENTORY_FILE)) {
    return {
      pending: true,
      message: 'Coverage: pending inventory (Unit 8)',
      percent: null,
      specPercent: null,
      slices: null,
    };
  }
  const inventory = loadInventory();
  const stats = summarize(inventory);
  const total = inventory.items.length;
  const covered = inventory.items.filter((i) => i.status === 'covered').length;
  const slices = {};
  for (const item of inventory.items) {
    slices[item.status] = (slices[item.status] ?? 0) + 1;
  }
  return {
    pending: false,
    /** D14 / ratchet (D15). */
    percent: stats.percent,
    inScope: stats.inScope,
    /** §3: covered ÷ total inventory items. */
    specPercent: total ? round1((covered / total) * 100) : 0,
    covered,
    total,
    slices,
    gaps: stats.gaps.map((item) => ({
      id: item.id,
      surface: item.surface,
      status: item.status,
      risk: item.risk,
      why: item.gap ?? null,
    })),
  };
}

function areaRollup(scenarios) {
  const present = new Set();
  for (const s of scenarios) {
    for (const t of s.tags) {
      if (AREA_TAGS.includes(t)) present.add(t);
    }
  }
  const keys = [...CANONICAL_AREAS, ...EXTRA_AREAS.filter((t) => present.has(t) && !CANONICAL_AREAS.includes(t))];
  return keys.map((area) => {
    const members = scenarios.filter((s) => s.tags.includes(area));
    const headline = members.filter((s) => !s.tags.includes('bug'));
    const passed = headline.filter((s) => s.status === 'passed').length;
    return {
      area,
      executed: members.length,
      headlineExecuted: headline.length,
      passed,
      failed: members.filter((s) => s.status === 'failed').length,
      passRate: headline.length ? round1((passed / headline.length) * 100) : null,
      coverage: null,
    };
  });
}

function stepTotals(scenarios) {
  const counts = { passed: 0, failed: 0, skipped: 0, undefined: 0, pending: 0, other: 0, total: 0 };
  for (const s of scenarios) {
    for (const st of s.stepStatuses) {
      counts.total += 1;
      if (counts[st] != null) counts[st] += 1;
      else counts.other += 1;
    }
  }
  return counts;
}

function buildMetrics(report) {
  const scenarios = collectScenarios(report);
  const byStatus = {};
  for (const s of scenarios) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  const headline = scenarios.filter((s) => !s.tags.includes('bug'));
  const headlinePassed = headline.filter((s) => s.status === 'passed').length;
  const fullCatalog = catalogScenarios(FEATURES_DIR);
  const catalog = fullCatalog.filter((s) => s.tags.includes('bug'));
  const executedByName = new Map();
  for (const s of scenarios) {
    executedByName.set(s.name, s);
  }
  const openDefects = [];
  const bugFixDetected = [];
  for (const bug of catalog) {
    const ran = executedByName.get(bug.name);
    if (ran && ran.status === 'passed') {
      bugFixDetected.push({ name: bug.name, uri: bug.uri, line: bug.line });
    } else {
      openDefects.push({
        name: bug.name,
        uri: bug.uri,
        line: bug.line,
        tags: bug.tags,
        runStatus: ran ? ran.status : 'not-executed',
      });
    }
  }
  const clock = timezoneNow();
  const durationNs = scenarios.reduce((sum, s) => sum + s.durationNs, 0);
  const steps = stepTotals(scenarios);
  return {
    generatedAt: clock.timestamp,
    definitions: 'rules/30-metrics-dashboard.md §3; decisions D15 D16',
    run: {
      timestamp: clock.timestamp,
      timezone: clock.timezone,
      environment: 'dev2',
      gitRef: gitRef(),
      trigger: trigger(),
      durationMs: Math.round(durationNs / 1e6),
      cucumberReport: REPORT.replaceAll('\\', '/'),
    },
    executed: scenarios.length,
    byStatus,
    passRate: headline.length ? round1((headlinePassed / headline.length) * 100) : null,
    headline: {
      executed: headline.length,
      passed: headlinePassed,
      excludedBug: scenarios.length - headline.length,
      writeIncluded: headline.some((s) => s.tags.includes('write')),
    },
    openDefects,
    bugFixDetected,
    excludedGroups: EXCLUDED_GROUPS.map(({ tag, reason }) => ({
      tag,
      reason,
      notRunThisTime: fullCatalog.filter((s) => s.tags.includes(tag) && !executedByName.has(s.name)).length,
      catalogued: fullCatalog.filter((s) => s.tags.includes(tag)).length,
    })).filter((g) => g.catalogued > 0),
    coverage: coverageBlock(),
    areas: areaRollup(scenarios),
    flakeRate: null,
    flake: null,
    trend: [],
    steps,
    warnings: {
      undefinedSteps: steps.undefined > 0,
    },
  };
}

function emptyHistory() {
  return { version: 1, cap: HISTORY_CAP, runs: [] };
}

function loadHistory(file = HISTORY_FILE) {
  if (!fs.existsSync(file)) return emptyHistory();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(data)) return { version: 1, cap: HISTORY_CAP, runs: data };
  const runs = Array.isArray(data.runs) ? data.runs : [];
  return { version: data.version || 1, cap: Number(data.cap) || HISTORY_CAP, runs };
}

/** Keep the newest `cap` runs; drop oldest first. */
function capRuns(runs, cap = HISTORY_CAP) {
  const n = Number(cap);
  if (!Number.isFinite(n) || n < 1) return runs.slice();
  if (runs.length <= n) return runs.slice();
  return runs.slice(runs.length - n);
}

function toHistoryEntry(metrics, scenarios) {
  const outcomes = {};
  for (const s of scenarios) {
    outcomes[s.name] = s.status;
  }
  return {
    timestamp: metrics.run.timestamp,
    timezone: metrics.run.timezone,
    gitRef: metrics.run.gitRef,
    trigger: metrics.run.trigger,
    environment: metrics.run.environment,
    executed: metrics.executed,
    passRate: metrics.passRate,
    coveragePercent: metrics.coverage.pending ? null : metrics.coverage.percent,
    specPercent: metrics.coverage.pending ? null : metrics.coverage.specPercent,
    scenarios: outcomes,
  };
}

/**
 * §3 flake rate: scenarios that both passed and failed in the last 10 recorded
 * runs, divided by scenarios executed (this run). Reported as a percent.
 */
function computeFlake(runs, executed, window = FLAKE_WINDOW) {
  const slice = runs.slice(-window);
  const byName = new Map();
  for (const run of slice) {
    for (const [name, status] of Object.entries(run.scenarios || {})) {
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name).add(status);
    }
  }
  const names = [...byName.entries()]
    .filter(([, statuses]) => statuses.has('passed') && statuses.has('failed'))
    .map(([name]) => name)
    .sort();
  return {
    rate: executed ? round1((names.length / executed) * 100) : null,
    flakyScenarios: names.length,
    windowRuns: slice.length,
    windowMax: window,
    names,
  };
}

function computeTrend(runs, window = TREND_WINDOW) {
  return runs.slice(-window).map((run) => ({
    timestamp: run.timestamp,
    passRate: run.passRate,
    coveragePercent: run.coveragePercent,
    specPercent: run.specPercent,
    executed: run.executed,
  }));
}

function appendHistory(metrics, scenarios, file = HISTORY_FILE, cap = HISTORY_CAP) {
  const history = loadHistory(file);
  history.cap = cap;
  history.runs = capRuns([...history.runs, toHistoryEntry(metrics, scenarios)], cap);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(history, null, 2)}\n`);
  return history;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDuration(ms) {
  if (!ms) return 'not recorded';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m} min ${s} sec` : `${s} sec`;
}

function formatWhen(metrics) {
  const d = new Date(metrics.run.timestamp);
  const stamp = d.toISOString().replace('T', ' ').slice(0, 16);
  return `${stamp} UTC`;
}

function areaLabel(area) {
  return AREA_LABELS[area] ?? area;
}

function trendChart(trend) {
  if (!Array.isArray(trend) || trend.length < 2) {
    return `<p class="note">Only one run has been recorded so far, so there is no trend to show yet.
      A line appears here once a second run completes.</p>`;
  }
  const points = trend.slice(-30);
  const w = 900;
  const h = 240;
  const pad = { top: 20, right: 96, bottom: 34, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - (Math.max(0, Math.min(100, v ?? 0)) / 100) * plotH;
  const line = (key) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const grid = [0, 25, 50, 75, 100]
    .map(
      (v) =>
        `<line x1="${pad.left}" y1="${y(v).toFixed(1)}" x2="${w - pad.right}" y2="${y(v).toFixed(1)}" class="grid" />` +
        `<text x="${pad.left - 10}" y="${(y(v) + 4).toFixed(1)}" class="axis" text-anchor="end">${v}%</text>`,
    )
    .join('');
  const last = points[points.length - 1];
  // Pass rate and coverage often land on the same value; keep the two end labels legible.
  const labelYs = { passRate: y(last.passRate) + 4, coveragePercent: y(last.coveragePercent) + 4 };
  if (Math.abs(labelYs.passRate - labelYs.coveragePercent) < 15) {
    labelYs.passRate -= 8;
    labelYs.coveragePercent += 9;
  }
  const endLabel = (key, label, cls) =>
    last[key] === null || last[key] === undefined
      ? ''
      : `<text x="${w - pad.right + 10}" y="${labelYs[key].toFixed(1)}" class="endlabel ${cls}">${last[key]}% ${label}</text>`;
  return `
    <svg viewBox="0 0 ${w} ${h}" role="img" class="chart"
         aria-label="Checks passing and product covered across the last ${points.length} runs">
      ${grid}
      <path d="${line('passRate')}" class="line pass" />
      <path d="${line('coveragePercent')}" class="line cov" />
      ${endLabel('passRate', 'passing', 'pass')}
      ${endLabel('coveragePercent', 'covered', 'cov')}
      <text x="${pad.left}" y="${h - 10}" class="axis">${points.length} runs ago</text>
      <text x="${(pad.left + plotW).toFixed(0)}" y="${h - 10}" class="axis" text-anchor="end">latest run</text>
    </svg>
    <p class="legend"><span class="key pass"></span> Checks passing<span class="key cov"></span> Product covered</p>`;
}

function renderDashboard(metrics) {
  const failed = metrics.byStatus.failed ?? 0;
  const healthy = failed === 0 && !metrics.warnings.undefinedSteps;
  const cov = metrics.coverage;
  const gaps = (cov.gaps ?? []).slice(0, 5);
  const defectArea = (tags = []) => {
    const found = tags.find((t) => AREA_TAGS.includes(t));
    return found ? areaLabel(found) : 'Across the product';
  };

  const coverageSection = cov.pending
    ? `<p class="figure muted">${esc(cov.message)}</p>`
    : (() => {
        const order = [
          ['covered', 'Fully covered', 'Checked end to end, including how it behaves when things go wrong.'],
          ['bug', 'Covered, defect open', 'Watched by a check that stays red until the product is fixed.'],
          ['partial', 'Partly covered', 'The main path is checked; some behaviour is not.'],
          ['wip', 'Blocked', 'Cannot be checked automatically until the product changes.'],
          ['gap', 'Not covered', 'No automated check today.'],
        ].map(([key, label, meaning]) => ({
          key,
          label,
          meaning,
          count: cov.slices[key] ?? 0,
        }));
        const bar = order
          .filter((s) => s.count > 0)
          .map(
            (s) =>
              `<span class="seg ${s.key}" style="flex:${s.count}" title="${esc(s.label)}: ${s.count}"></span>`,
          )
          .join('');
        const rows = order
          .map(
            (s) => `<tr>
            <td><span class="swatch ${s.key}"></span>${esc(s.label)}</td>
            <td class="num">${s.count}</td>
            <td class="meaning">${esc(s.meaning)}</td>
          </tr>`,
          )
          .join('');
        return `
        <div class="split">
          <div>
            <p class="figure">${cov.percent}<span class="unit">%</span></p>
            <p class="figure-label">of the product we track is protected by an automated check</p>
            <p class="note">Based on ${cov.inScope} areas of the product that are in scope today.
            Counting only the areas that are fully covered, the figure is ${cov.specPercent}%.</p>
          </div>
          <div>
            <div class="stack">${bar}</div>
            <table class="matrix compact">
              <thead><tr><th>Level of protection</th><th class="num">Areas</th><th>What that means</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
      })();

  const areaRows = metrics.areas
    .map((a) => {
      const state = a.executed === 0 ? 'idle' : a.failed > 0 ? 'bad' : 'good';
      const label = a.executed === 0 ? 'Not run' : a.failed > 0 ? 'Needs attention' : 'Healthy';
      const rate = a.passRate === null ? null : a.passRate;
      const bar =
        rate === null
          ? '<span class="mini-empty">not run in this batch</span>'
          : `<span class="mini ${a.failed ? 'has-fail' : ''}"><span class="mini-fill" style="width:${rate}%"></span></span>`;
      return `<tr class="${state}">
        <td class="area">${esc(areaLabel(a.area))}</td>
        <td><span class="pill ${state}">${label}</span></td>
        <td class="num">${a.executed || '—'}</td>
        <td class="num">${a.executed ? a.passed : '—'}</td>
        <td class="num ${a.failed ? 'bad-num' : ''}">${a.executed ? a.failed : '—'}</td>
        <td class="barcell">${bar}${rate === null ? '' : `<span class="ratenum">${rate}%</span>`}</td>
      </tr>`;
    })
    .join('');

  const defectRows = metrics.openDefects
    .map(
      (d) => `<tr>
        <td class="area">${esc(defectArea(d.tags))}</td>
        <td>${esc(DEFECT_SUMMARIES[d.name] ?? d.name)}</td>
      </tr>`,
    )
    .join('');

  const fixCallout = metrics.bugFixDetected.length
    ? `<p class="callout"><b>Fix detected.</b> ${metrics.bugFixDetected.length} known defect${
        metrics.bugFixDetected.length === 1 ? '' : 's'
      } now behaving correctly. Ask the test team to close ${
        metrics.bugFixDetected.length === 1 ? 'it' : 'them'
      } out.</p>`
    : '';

  const gapItems = gaps.length
    ? gaps
        .map(
          (g) =>
            `<li><span class="chip ${esc(g.risk)}">${esc(g.risk)}</span>${esc(
              GAP_SUMMARIES[g.id] ?? g.surface,
            )}</li>`,
        )
        .join('')
    : '<li>No open gaps recorded.</li>';

  const excludedItems = metrics.excludedGroups
    .filter((g) => g.notRunThisTime > 0)
    .map((g) => `<li><b>${g.notRunThisTime}</b> — ${esc(g.reason)}</li>`)
    .join('');

  const flakeLine =
    metrics.flakeRate === null
      ? 'Not enough run history yet to judge reliability.'
      : `<b>${metrics.flakeRate}%</b> of checks have given both a pass and a fail across the last ${
          metrics.flake.windowRuns
        } recorded run${metrics.flake.windowRuns === 1 ? '' : 's'} (${
          metrics.flake.flakyScenarios
        } of ${metrics.executed}). An unreliable check can hide a real problem.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rethink Clinical — product quality</title>
<style>
  :root {
    color-scheme: light;
    --ink: #101c2c; --body: #3d4b5c; --soft: #6b7a8d; --hair: #e3e8ef;
    --pass: #17708f; --good: #1a7f4b; --bad: #b3261e; --warn: #a86a00; --idle: #8a97a6;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 24px 56px;
         font: 15px/1.6 "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
         color: var(--body); background: #eef1f5; }
  main { max-width: 1060px; margin: 0 auto; }
  .topbar { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end;
            justify-content: space-between; padding: 0 4px 20px; }
  .eyebrow { margin: 0; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--soft); }
  h1 { margin: 2px 0 0; font-size: 26px; font-weight: 650; color: var(--ink); letter-spacing: -.01em; }
  .runmeta { display: flex; flex-wrap: wrap; gap: 0 28px; margin: 0; }
  .runmeta div { text-align: right; }
  .runmeta dt { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
  .runmeta dd { margin: 2px 0 0; font-size: 14px; color: var(--ink); font-weight: 600; }
  section { background: #fff; border: 1px solid var(--hair); border-radius: 10px;
            padding: 24px 28px; margin-bottom: 18px;
            box-shadow: 0 1px 2px rgba(16,28,44,.04); }
  h2 { font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
       color: var(--soft); margin: 0 0 18px; }
  .headline { border-top: 4px solid var(--good); }
  .headline.bad { border-top-color: var(--bad); }
  .verdict { display: flex; align-items: baseline; gap: 12px; margin: 0 0 20px; }
  .verdict b { font-size: 22px; font-weight: 650; color: var(--good); }
  .headline.bad .verdict b { color: var(--bad); }
  .verdict span { color: var(--soft); }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1px;
          background: var(--hair); border: 1px solid var(--hair); border-radius: 8px; overflow: hidden; }
  .kpi { background: #fff; padding: 16px 18px; }
  .kpi .v { font-size: 30px; font-weight: 650; color: var(--ink); line-height: 1.15; }
  .kpi .v.bad { color: var(--bad); }
  .kpi .l { font-size: 13px; font-weight: 600; color: var(--ink); margin-top: 2px; }
  .kpi .n { font-size: 12.5px; color: var(--soft); }
  .figure { font-size: 54px; font-weight: 650; color: var(--ink); margin: 0; line-height: 1; letter-spacing: -.02em; }
  .figure .unit { font-size: 26px; font-weight: 600; color: var(--soft); margin-left: 2px; }
  .figure-label { margin: 10px 0 0; font-size: 15px; color: var(--ink); max-width: 20em; }
  .note { font-size: 13px; color: var(--soft); margin: 12px 0 0; }
  .split { display: grid; grid-template-columns: minmax(200px, 260px) 1fr; gap: 36px; align-items: start; }
  .stack { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 18px; }
  .seg.covered { background: var(--good); } .seg.bug { background: #d98324; }
  .seg.partial { background: #4a9fc4; } .seg.wip { background: #97a4b3; } .seg.gap { background: #c9d0d9; }
  .swatch { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 9px; }
  .swatch.covered { background: var(--good); } .swatch.bug { background: #d98324; }
  .swatch.partial { background: #4a9fc4; } .swatch.wip { background: #97a4b3; } .swatch.gap { background: #c9d0d9; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 11px 10px; border-bottom: 1px solid var(--hair); vertical-align: middle; }
  thead th { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--soft);
             border-bottom: 1px solid #cdd5df; padding-bottom: 8px; }
  tbody tr:last-child td { border-bottom: none; }
  .matrix.compact th, .matrix.compact td { padding: 7px 10px; font-size: 14px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.area { font-weight: 600; color: var(--ink); }
  td.meaning { color: var(--soft); font-size: 13px; }
  .bad-num { color: var(--bad); font-weight: 700; }
  tr.idle td { color: var(--idle); }
  .pill { display: inline-block; padding: 3px 11px; border-radius: 4px; font-size: 12px; font-weight: 700;
          letter-spacing: .02em; }
  .pill.good { background: #e6f4ec; color: var(--good); }
  .pill.bad { background: #fbeae9; color: var(--bad); }
  .pill.idle { background: #f0f3f7; color: var(--idle); }
  .barcell { width: 190px; white-space: nowrap; }
  .mini { display: inline-block; width: 120px; height: 7px; border-radius: 4px; background: #eceff3;
          overflow: hidden; vertical-align: middle; }
  .mini.has-fail { background: var(--bad); }
  .mini-fill { display: block; height: 100%; background: var(--good); }
  .mini-empty { color: var(--idle); font-size: 12.5px; }
  .ratenum { font-size: 13px; margin-left: 10px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .callout { background: #fdf6e6; border: 1px solid #ecd9a8; border-left: 3px solid var(--warn);
             border-radius: 6px; padding: 12px 14px; margin: 0 0 16px; color: #6b4d09; }
  .warnbox { background: #fbeae9; border: 1px solid #f0c4c1; border-left: 3px solid var(--bad);
             border-radius: 6px; padding: 12px 14px; margin: 0 0 16px; color: #7d1a15; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; }
  .cols h3 { font-size: 13px; font-weight: 700; color: var(--ink); margin: 0 0 10px; }
  ul.plain { margin: 0; padding: 0; list-style: none; }
  ul.plain li { padding: 7px 0; border-bottom: 1px solid var(--hair); font-size: 14px; }
  ul.plain li:last-child { border-bottom: none; }
  .chip { display: inline-block; min-width: 26px; text-align: center; padding: 1px 7px; margin-right: 10px;
          border-radius: 3px; font-size: 11px; font-weight: 700; }
  .chip.P0, .chip.P1 { background: #fbeae9; color: var(--bad); }
  .chip.P2 { background: #fdf6e6; color: var(--warn); }
  .chip.P3 { background: #f0f3f7; color: var(--soft); }
  .chart { width: 100%; height: auto; }
  .line { fill: none; stroke-width: 2.5; stroke-linejoin: round; }
  .line.pass { stroke: var(--pass); } .line.cov { stroke: var(--good); }
  .grid { stroke: #eef1f5; stroke-width: 1; }
  .axis { font-size: 11px; fill: var(--soft); }
  .endlabel { font-size: 12px; font-weight: 700; }
  .endlabel.pass { fill: var(--pass); } .endlabel.cov { fill: var(--good); }
  .legend { font-size: 13px; color: var(--soft); margin: 6px 0 0; }
  .key { display: inline-block; width: 16px; height: 3px; margin: 0 7px 0 0; vertical-align: middle; }
  .key.cov { margin-left: 22px; }
  .key.pass { background: var(--pass); } .key.cov { background: var(--good); }
  .muted { color: var(--soft); }
  footer { font-size: 12.5px; color: var(--soft); padding: 4px 4px 0;
           display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
  a { color: var(--pass); }
  @media (max-width: 720px) { .split { grid-template-columns: 1fr; gap: 24px; } .runmeta div { text-align: left; } }
</style>
</head>
<body>
<main>
  <div class="topbar">
    <div>
      <p class="eyebrow">Quality report</p>
      <h1>Rethink Clinical</h1>
    </div>
    <dl class="runmeta">
      <div><dt>Last run</dt><dd>${esc(formatWhen(metrics))}</dd></div>
      <div><dt>Environment</dt><dd>${esc(metrics.run.environment)}</dd></div>
      <div><dt>Duration</dt><dd>${esc(formatDuration(metrics.run.durationMs))}</dd></div>
      <div><dt>Started</dt><dd>${esc(metrics.run.trigger)}</dd></div>
    </dl>
  </div>

  <section class="headline ${healthy ? '' : 'bad'}">
    <p class="verdict">
      <b>${healthy ? 'Healthy' : 'Needs attention'}</b>
      <span>${
        healthy
          ? 'Everything checked in this run behaved as expected.'
          : `${failed} check${failed === 1 ? '' : 's'} did not behave as expected.`
      }</span>
    </p>
    ${
      metrics.warnings.undefinedSteps
        ? '<p class="warnbox"><b>Incomplete result.</b> Some checks did not actually execute, so this run cannot be treated as a clean pass.</p>'
        : ''
    }
    <div class="kpis">
      <div class="kpi">
        <div class="v">${metrics.passRate === null ? '—' : `${metrics.passRate}%`}</div>
        <div class="l">Checks passing</div>
        <div class="n">${metrics.headline.passed} of ${metrics.headline.executed} that ran</div>
      </div>
      <div class="kpi">
        <div class="v ${failed ? 'bad' : ''}">${failed}</div>
        <div class="l">Checks failing</div>
        <div class="n">${failed ? 'Being investigated by the test team' : 'Nothing failing right now'}</div>
      </div>
      <div class="kpi">
        <div class="v">${metrics.openDefects.length}</div>
        <div class="l">Known defects open</div>
        <div class="n">Listed further down this page</div>
      </div>
      <div class="kpi">
        <div class="v">${metrics.executed}</div>
        <div class="l">Checks in this run</div>
        <div class="n">Out of the full library of automated checks</div>
      </div>
    </div>
  </section>

  <section>
    <h2>How much of the product is protected</h2>
    ${coverageSection}
  </section>

  <section>
    <h2>Direction of travel</h2>
    ${trendChart(metrics.trend)}
  </section>

  <section>
    <h2>Results by product area</h2>
    <table class="matrix">
      <thead><tr>
        <th>Product area</th><th>Status</th><th class="num">Checks run</th>
        <th class="num">Passed</th><th class="num">Failed</th><th>Share passing</th>
      </tr></thead>
      <tbody>${areaRows || '<tr><td colspan="6" class="muted">No areas ran.</td></tr>'}</tbody>
    </table>
    <p class="note">The bar shows the share of checks that passed; red is the failing remainder.${
      metrics.areas.some((a) => a.executed === 0)
        ? ' Areas marked “Not run” were not part of this batch and are covered by other scheduled runs.'
        : ''
    } Protection per area is reported product-wide in the section above.</p>
  </section>

  <section>
    <h2>Known defects still open</h2>
    ${fixCallout}
    ${
      defectRows
        ? `<table class="matrix"><thead><tr><th>Product area</th><th>What a user would see</th></tr></thead>
           <tbody>${defectRows}</tbody></table>
           <p class="note">Each of these has a check that stays red on purpose until the product is fixed,
           so a fix is detected the moment it lands. They are excluded from the passing figure above.</p>`
        : '<p class="muted">No known defects are open.</p>'
    }
  </section>

  <section>
    <h2>What this page does not tell you</h2>
    <div class="cols">
      <div>
        <h3>Reliability of the checks</h3>
        <p class="note" style="margin-top:0">${flakeLine}</p>
      </div>
      <div>
        <h3>Biggest remaining gaps</h3>
        <ul class="plain">${gapItems}</ul>
      </div>
      <div>
        <h3>Left out of this run on purpose</h3>
        ${excludedItems ? `<ul class="plain">${excludedItems}</ul>` : '<p class="note">Nothing was held back.</p>'}
      </div>
    </div>
  </section>

  <footer>
    <span>Generated automatically from the latest test run — no figure on this page is typed by hand.</span>
    <span><a href="${esc(ALLURE_URL)}">Detailed test evidence</a></span>
  </footer>
</main>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error(`No Cucumber JSON at ${REPORT}. Run a profile (e.g. npm run test:smoke) first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(REPORT, 'utf8');
  let report;
  try {
    report = JSON.parse(raw);
  } catch (err) {
    console.error(`Could not parse ${REPORT}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(report)) {
    console.error(`${REPORT} is not a Cucumber JSON array.`);
    process.exit(1);
  }
  const metrics = buildMetrics(report);
  const scenarios = collectScenarios(report);
  const history = appendHistory(metrics, scenarios);
  const flake = computeFlake(history.runs, metrics.executed);
  metrics.flakeRate = flake.rate;
  metrics.flake = flake;
  metrics.trend = computeTrend(history.runs);
  metrics.history = { file: HISTORY_FILE.replaceAll('\\', '/'), runs: history.runs.length, cap: history.cap };
  fs.mkdirSync(path.dirname(METRICS), { recursive: true });
  fs.writeFileSync(METRICS, `${JSON.stringify(metrics, null, 2)}\n`);
  const cov = metrics.coverage.pending
    ? metrics.coverage.message
    : `coverage ${metrics.coverage.percent}% (D14) / spec ${metrics.coverage.specPercent}%`;
  console.log(
    `metrics ${METRICS} · executed ${metrics.executed} · pass ${metrics.passRate}% · open defects ${metrics.openDefects.length} · ${cov}`,
  );
  console.log(
    `history ${HISTORY_FILE} · runs ${history.runs.length}/${history.cap} · flake ${flake.rate}% (${flake.flakyScenarios} names in last ${flake.windowRuns} runs)`,
  );
  const html = renderDashboard(metrics);
  fs.writeFileSync(DASHBOARD, html);
  console.log(`dashboard ${DASHBOARD} · ${Math.round(Buffer.byteLength(html) / 1024)}KB`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildMetrics,
  collectScenarios,
  catalogScenarios,
  catalogBugScenarios,
  renderDashboard,
  loadHistory,
  capRuns,
  computeFlake,
  computeTrend,
  appendHistory,
  toHistoryEntry,
};
