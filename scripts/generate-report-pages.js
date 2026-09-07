#!/usr/bin/env node
/**
 * Renders the published report pages from the traceability model.
 *
 *   reports/coverage.html      what we claim to cover vs what the run proved
 *   reports/traceability.html  every case, its scenario, its result, its surface
 *   reports/gates.html         the outages behind today's red, and their blast radius
 *   reports/endpoints.html     the API endpoint matrix, rendered from its markdown
 *   reports/summary.json       the same numbers, machine-readable
 *   docs/traceability-matrix.md  the markdown twin of the traceability page
 *
 * Every number comes from scripts/lib/traceability.js. Nothing is typed by hand.
 */
const fs = require('node:fs');
const path = require('node:path');
const { buildModel, areaLabel } = require('./lib/traceability.js');
const { page, esc, badge, kpi, statusLabel, markdownToHtml } = require('./lib/reportPage.js');

const REPORTS = 'reports';
const DOCS = 'docs';

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function metaFor(model) {
  return [
    { label: 'Environment', value: model.env },
    { label: 'Generated', value: new Date(model.generatedAt).toUTCString() },
  ];
}

function tableOf(headers, rows, className = '') {
  if (rows.length === 0) return '<p class="muted">Nothing to show.</p>';
  const head = headers
    .map((header) => `<th${header.num ? ' class="num"' : ''}>${esc(header.label ?? header)}</th>`)
    .join('');
  return `<table class="${className}"><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function stackedBar(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  if (!total) return '';
  const bar = segments
    .filter((segment) => segment.count > 0)
    .map(
      (segment) =>
        `<span class="seg ${segment.tone}" style="width:${(segment.count / total) * 100}%" title="${esc(
          `${segment.label}: ${segment.count}`,
        )}"></span>`,
    )
    .join('');
  const legend = segments
    .filter((segment) => segment.count > 0)
    .map((segment) => `<span class="muted">${esc(segment.label)} <b>${segment.count}</b></span>`)
    .join(' &nbsp;·&nbsp; ');
  return `<div class="stack">${bar}</div><p class="note">${legend}</p>`;
}

// ------------------------------------------------------------ coverage page

function renderCoverage(model) {
  const { summary, items } = model;
  const inScope = items.filter((item) => item.status !== 'excluded');
  const s = summary.surfaces;

  const verdict = s.conflicts
    ? `<div class="warnbox"><b>${s.conflicts} surface${s.conflicts === 1 ? '' : 's'} claim coverage that this run contradicts.</b> A check that is meant to protect them ran and failed for a reason no known outage explains. These are the entries to fix first.</div>`
    : s.computedBlocked
      ? `<div class="callout"><b>No surface is contradicted by this run, but ${s.computedBlocked} could not be proven today.</b> Their checks stopped on a known outage rather than on a product assertion, so the coverage still exists — it simply could not run. See <a href="gates.html">Blockers</a>.</div>`
      : `<div class="okbox"><b>Every covered surface was proven by this run.</b> The curated claim and the measured result agree everywhere.</div>`;

  // The first two count every in-scope surface; the rest partition it exactly,
  // in the same order and with the same labels as the bar below.
  const kpis = [
    kpi(s.inScope, 'Surfaces in scope', `${s.total - s.inScope} signed off as out of scope`),
    kpi(s.curatedCovered, 'Claimed as covered', `${pct(s.curatedCovered, s.inScope)}% of in-scope surfaces`),
    kpi(s.computedProven, 'Proven by this run', `${pct(s.computedProven, s.inScope)}% of in-scope surfaces`, 'good'),
    kpi(s.computedBlocked, 'Blocked by an outage', 'Coverage exists, could not run', s.computedBlocked ? 'warn' : ''),
    kpi(s.computedHeldBack, 'Held back on purpose', 'Known defects and write flows'),
    kpi(s.conflicts, 'Contradicted', 'Claim disagrees with the result', s.conflicts ? 'bad' : 'good'),
  ].join('');

  const computedSegments = [
    { label: statusLabel('proven'), tone: 'good', count: inScope.filter((i) => i.computed === 'proven').length },
    { label: statusLabel('blocked'), tone: 'warn', count: inScope.filter((i) => i.computed === 'blocked').length },
    { label: statusLabel('filtered'), tone: 'idle', count: inScope.filter((i) => i.computed === 'filtered').length },
    { label: statusLabel('failed'), tone: 'bad', count: inScope.filter((i) => i.computed === 'failed').length },
    {
      label: 'Other',
      tone: 'idle',
      count: inScope.filter((i) => !['proven', 'blocked', 'filtered', 'failed'].includes(i.computed)).length,
    },
  ];

  const areas = [...new Set(inScope.map((item) => item.area))].sort();
  const areaRows = areas.map((area) => {
    const rows = inScope.filter((item) => item.area === area);
    const proven = rows.filter((item) => item.computed === 'proven').length;
    const blocked = rows.filter((item) => item.computed === 'blocked').length;
    return `<tr><td class="strong">${esc(areaLabel(area))}</td><td class="num">${rows.length}</td><td class="num">${
      rows.filter((item) => item.status === 'covered').length
    }</td><td class="num">${proven}</td><td class="num">${blocked || '—'}</td><td class="num">${pct(
      proven,
      rows.length,
    )}%</td></tr>`;
  });

  const itemRows = [...inScope]
    .sort(
      (a, b) =>
        ['conflict', 'unmapped', 'unproven', 'blocked', 'understated', 'fix-detected', 'agrees'].indexOf(a.agreement) -
          ['conflict', 'unmapped', 'unproven', 'blocked', 'understated', 'fix-detected', 'agrees'].indexOf(b.agreement) ||
        a.id.localeCompare(b.id),
    )
    .map(
      (item) =>
        `<tr><td class="id">${esc(item.id)}</td><td class="strong">${esc(item.surface)}</td><td>${esc(
          item.kind,
        )}</td><td><span class="chip ${esc(item.risk)}">${esc(item.risk)}</span></td><td>${badge(
          item.status,
        )}</td><td>${badge(item.computed)}</td><td>${badge(item.agreement)}</td><td class="id">${
          item.caseIds.join(', ') || '—'
        }</td><td class="muted">${esc(item.blockingGates.join(', ') || '—')}</td></tr>`,
    );

  const body = `
<section>
  <h2>What this page answers</h2>
  <p class="lede">Two independent readings of the same product surface. <b>Claimed</b> is the curated
  judgement recorded in the surface inventory. <b>Proven</b> is what the latest run actually
  demonstrated, by following each surface to the cases that cite it and then to the scenarios that
  ran. Where the two disagree, the disagreement is the finding.</p>
  ${verdict}
  <div class="kpis">${kpis}</div>
</section>

<section>
  <h2>How the in-scope surface stands today</h2>
  ${stackedBar(computedSegments)}
</section>

<section>
  <h2>By product area</h2>
  ${tableOf(
    [
      'Area',
      { label: 'Surfaces', num: true },
      { label: 'Claimed', num: true },
      { label: 'Proven', num: true },
      { label: 'Blocked', num: true },
      { label: 'Proven %', num: true },
    ],
    areaRows,
  )}
</section>

<section>
  <h2>Every in-scope surface</h2>
  <p class="note">Sorted so that anything needing attention appears first.</p>
  ${tableOf(
    ['ID', 'Surface', 'Kind', 'Risk', 'Claimed', 'Proven', 'Verdict', 'Cases', 'Blocker'],
    itemRows,
  )}
</section>`;

  return page({
    title: 'Rethink Clinical — coverage',
    eyebrow: 'Rethink Clinical',
    heading: 'Coverage: claimed versus proven',
    meta: metaFor(model),
    current: 'coverage.html',
    body,
  });
}

// -------------------------------------------------------- traceability page

function renderTraceability(model) {
  const { summary, cases, scenarios } = model;
  const c = summary.cases;

  const kpis = [
    kpi(c.total, 'Test cases in the catalog'),
    kpi(c.scripted, 'Backed by a scenario', `${pct(c.scripted, c.total)}% of the catalog`),
    kpi(c.onTheBoard, 'Tied to a product surface', `${c.offTheBoard} cross-cutting`),
    kpi(c.passed, 'Passed this run', '', 'good'),
    kpi(c.blocked, 'Blocked by an outage', '', c.blocked ? 'warn' : ''),
    kpi(c.failed, 'Failed for another reason', '', c.failed ? 'bad' : 'good'),
  ].join('');

  const unlinked = cases.filter((testCase) => testCase.link === 'none' || testCase.link === 'undocumented');
  const orphanScenarios = scenarios.filter((scenario) => scenario.caseIds.length === 0);

  const integrity =
    unlinked.length === 0 && orphanScenarios.length === 0
      ? `<div class="okbox"><b>The catalog and the scripted suite match exactly.</b> Every case names a scenario that exists, and every scenario is claimed by a case.</div>`
      : `<div class="callout"><b>${unlinked.length} case${
          unlinked.length === 1 ? '' : 's'
        } name no scenario, and ${orphanScenarios.length} scenario${
          orphanScenarios.length === 1 ? ' is' : 's are'
        } claimed by no case.</b> Each one is a place where the written catalog and the running suite have drifted apart.</div>`;

  const modules = [...new Set(cases.map((testCase) => testCase.module))];
  const moduleSections = modules
    .map((module) => {
      const rows = cases
        .filter((testCase) => testCase.module === module)
        .map(
          (testCase) =>
            `<tr><td class="id">${esc(testCase.id)}</td><td class="strong">${esc(
              testCase.title,
            )}</td><td><span class="chip ${esc(testCase.priority || 'P3')}">${esc(
              testCase.priority || '—',
            )}</span></td><td>${
              testCase.scenarios.map((scenario) => esc(scenario.name)).join('<br>') || '<span class="muted">—</span>'
            }</td><td>${badge(testCase.result.status)}</td><td class="id">${
              testCase.surfaces.join(', ') || '—'
            }</td></tr>`,
        );
      return `<h3>${esc(module)}</h3>${tableOf(
        ['Case', 'Objective', 'Priority', 'Scenario', 'Result', 'Surfaces'],
        rows,
      )}`;
    })
    .join('');

  const driftRows = [
    ...unlinked.map(
      (testCase) =>
        `<tr><td class="id">${esc(testCase.id)}</td><td>${esc(
          testCase.title,
        )}</td><td class="muted">Names no scenario that exists in the suite.</td></tr>`,
    ),
    ...orphanScenarios.map(
      (scenario) =>
        `<tr><td class="id">—</td><td>${esc(
          scenario.name,
        )}</td><td class="muted">Runs, but no catalog entry claims it.</td></tr>`,
    ),
  ];

  const body = `
<section>
  <h2>What this page answers</h2>
  <p class="lede">The chain from a written test case to the scenario that implements it, the result it
  produced in the latest run, and the product surfaces it protects. A break anywhere in that chain
  means a coverage claim nobody is actually checking.</p>
  ${integrity}
  <div class="kpis">${kpis}</div>
</section>

${
  driftRows.length
    ? `<section><h2>Where the catalog and the suite disagree</h2>${tableOf(
        ['Case', 'Name', 'Problem'],
        driftRows,
      )}</section>`
    : ''
}

<section>
  <h2>Every case, by module</h2>
  ${moduleSections}
</section>`;

  return page({
    title: 'Rethink Clinical — traceability',
    eyebrow: 'Rethink Clinical',
    heading: 'Traceability: case to scenario to surface',
    meta: metaFor(model),
    current: 'traceability.html',
    body,
  });
}

// --------------------------------------------------------------- gates page

function renderGates(model) {
  const { summary, gates, runRows } = model;
  const run = summary.run;
  const open = gates.filter((gate) => gate.state === 'blocked');
  const runnable = run.executed - run.blockedByGate;

  const kpis = [
    kpi(open.length, 'Outages blocking the suite', '', open.length ? 'bad' : 'good'),
    kpi(run.blockedByGate, 'Checks stopped by an outage', `${pct(run.blockedByGate, run.executed)}% of the run`),
    kpi(run.genuinelyFailed, 'Failures with no known cause', '', run.genuinelyFailed ? 'bad' : 'good'),
    kpi(`${pct(run.passed, runnable)}%`, 'Passed of what could run', `${run.passed} of ${runnable}`, 'good'),
    kpi(`${run.passRate}%`, 'Raw pass rate', `${run.passed} of ${run.executed} including blocked`),
  ].join('');

  const summaryBox = open.length
    ? `<div class="warnbox"><b>${run.blockedByGate} of ${run.executed} checks never reached an assertion.</b>
       They stopped on ${open.length} known outage${open.length === 1 ? '' : 's'} in the environment, listed below.
       Of the ${runnable} checks that could run, ${run.passed} passed. The suite is red because the
       environment is down, not because coverage regressed.</div>`
    : `<div class="okbox"><b>No known outage is blocking the suite.</b> Every check reached its assertions.</div>`;

  const gateCards = gates
    .map((gate) => {
      const blocked = gate.blockedScenarios
        .map((name) => `<li>${esc(name)}</li>`)
        .join('');
      return `<section>
  <h2>${badge(gate.state === 'blocked' ? 'failed' : 'proven')} &nbsp; ${esc(gate.title)}</h2>
  <p class="lede">${esc(gate.meaning)}</p>
  ${tableOf(
    ['Field', 'Detail'],
    [
      `<tr><td class="strong">Surface</td><td><code>${esc(gate.surface)}</code></td></tr>`,
      `<tr><td class="strong">Root cause</td><td>${esc(gate.rootCause)}</td></tr>`,
      `<tr><td class="strong">Owner</td><td>${esc(gate.owner)}</td></tr>`,
      `<tr><td class="strong">Defect</td><td>${esc(gate.defect)}</td></tr>`,
      `<tr><td class="strong">First seen</td><td>${esc(gate.firstSeen)}</td></tr>`,
      `<tr><td class="strong">Checks blocked this run</td><td>${gate.blastRadius}</td></tr>`,
    ],
  )}
  ${blocked ? `<h3>Checks it stopped</h3><ul class="plain">${blocked}</ul>` : '<p class="note">Nothing in this run matched this outage.</p>'}
</section>`;
    })
    .join('');

  const genuine = runRows.filter((row) => row.status === 'failed' && !row.gate);
  const genuineRows = genuine.map(
    (row) =>
      `<tr><td class="strong">${esc(row.name)}</td><td class="muted">${esc(
        row.failedStep,
      )}</td><td class="muted">${esc(row.error.split('\n')[0].slice(0, 160))}</td></tr>`,
  );

  const body = `
<section>
  <h2>What this page answers</h2>
  <p class="lede">Why the suite is the colour it is. An outage is an environment precondition that is
  known to be broken; when a check stops on one it is reported as blocked rather than failed, so a
  single backend defect cannot read as dozens of independent coverage regressions.</p>
  ${summaryBox}
  <div class="kpis">${kpis}</div>
</section>

${gateCards}

<section>
  <h2>Failures no outage explains</h2>
  ${
    genuineRows.length
      ? `<p class="note">These are the checks worth investigating today.</p>${tableOf(
          ['Check', 'Stopped at', 'Reason'],
          genuineRows,
        )}`
      : '<div class="okbox">Every failure in this run is accounted for by a known outage.</div>'
  }
</section>`;

  return page({
    title: 'Rethink Clinical — blockers',
    eyebrow: 'Rethink Clinical',
    heading: 'Blockers behind this run',
    meta: metaFor(model),
    current: 'gates.html',
    body,
  });
}

// ----------------------------------------------------------- endpoints page

function renderEndpoints(model) {
  const source = path.join(DOCS, 'api-endpoint-report.md');
  const body = fs.existsSync(source)
    ? `<section class="md">${markdownToHtml(fs.readFileSync(source, 'utf8'))}</section>`
    : '<section><div class="callout">No endpoint report has been generated yet. It is written at the end of every Cucumber run.</div></section>';

  return page({
    title: 'Rethink Clinical — endpoints',
    eyebrow: 'Rethink Clinical',
    heading: 'API endpoint matrix',
    meta: metaFor(model),
    current: 'endpoints.html',
    body,
  });
}

// ------------------------------------------------------------ markdown twin

function renderTraceabilityMarkdown(model) {
  const { summary, cases, items } = model;
  const lines = [
    '# Traceability matrix — Rethink Clinical',
    '',
    'Generated by `npm run report:pages`. Do not edit: every row is derived from',
    '`docs/test-cases.md`, the feature files, `docs/surface-inventory.json` and the latest',
    '`reports/cucumber-report.json`.',
    '',
    `**Generated:** ${model.generatedAt} · **Environment:** ${model.env}`,
    '',
    '## Totals',
    '',
    '| Measure | Count |',
    '|---------|------:|',
    `| Test cases in the catalog | ${summary.cases.total} |`,
    `| Cases backed by a scenario | ${summary.cases.scripted} |`,
    `| Cases tied to a product surface | ${summary.cases.onTheBoard} |`,
    `| Scenarios in the suite | ${summary.scenarios.total} |`,
    `| Scenarios claimed by no case | ${summary.scenarios.unmappedToACase} |`,
    `| Surfaces in scope | ${summary.surfaces.inScope} |`,
    `| Surfaces claimed as covered | ${summary.surfaces.curatedCovered} |`,
    `| Surfaces proven by the latest run | ${summary.surfaces.computedProven} |`,
    `| Surfaces contradicted by the latest run | ${summary.surfaces.conflicts} |`,
    `| Surfaces blocked by a known outage | ${summary.surfaces.blocked} |`,
    '',
    '## Case to scenario to surface',
    '',
    '| Case | Objective | Scenario | Result | Surfaces |',
    '|------|-----------|----------|--------|----------|',
  ];
  for (const testCase of cases) {
    const scenarios = testCase.scenarios.map((scenario) => `*${scenario.name}*`).join('<br>') || '—';
    lines.push(
      `| \`${testCase.id}\` | ${testCase.title} | ${scenarios} | ${statusLabel(testCase.result.status)} | ${
        testCase.surfaces.map((id) => `\`${id}\``).join(', ') || '—'
      } |`,
    );
  }
  lines.push('', '## Surface to case', '', '| Surface | Claimed | Proven | Verdict | Cases |', '|---------|---------|--------|---------|-------|');
  for (const item of items) {
    lines.push(
      `| \`${item.id}\` ${item.surface} | ${statusLabel(item.status)} | ${statusLabel(item.computed)} | ${statusLabel(
        item.agreement,
      )} | ${item.caseIds.map((id) => `\`${id}\``).join(', ') || '—'} |`,
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

// --------------------------------------------------------------------- main

function main() {
  const model = buildModel();
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.mkdirSync(DOCS, { recursive: true });

  const written = [
    [path.join(REPORTS, 'coverage.html'), renderCoverage(model)],
    [path.join(REPORTS, 'traceability.html'), renderTraceability(model)],
    [path.join(REPORTS, 'gates.html'), renderGates(model)],
    [path.join(REPORTS, 'endpoints.html'), renderEndpoints(model)],
    [path.join(DOCS, 'traceability-matrix.md'), renderTraceabilityMarkdown(model)],
    [
      path.join(REPORTS, 'summary.json'),
      `${JSON.stringify(
        {
          generatedAt: model.generatedAt,
          env: model.env,
          inventoryAsOf: model.inventoryAsOf,
          runPresent: model.runPresent,
          ...model.summary,
          openGates: model.gates
            .filter((gate) => gate.state === 'blocked')
            .map((gate) => ({ id: gate.id, defect: gate.defect, blastRadius: gate.blastRadius })),
        },
        null,
        2,
      )}\n`,
    ],
    [
      path.join(REPORTS, 'traceability.json'),
      `${JSON.stringify(
        {
          generatedAt: model.generatedAt,
          cases: model.cases.map((testCase) => ({
            id: testCase.id,
            title: testCase.title,
            module: testCase.module,
            priority: testCase.priority,
            scenarios: testCase.scenarios.map((scenario) => scenario.name),
            link: testCase.link,
            result: testCase.result.status,
            surfaces: testCase.surfaces,
          })),
          items: model.items.map((item) => ({
            id: item.id,
            surface: item.surface,
            kind: item.kind,
            risk: item.risk,
            curated: item.status,
            computed: item.computed,
            agreement: item.agreement,
            caseIds: item.caseIds,
            blockingGates: item.blockingGates,
          })),
          gates: model.gates.map((gate) => ({
            id: gate.id,
            state: gate.state,
            defect: gate.defect,
            blastRadius: gate.blastRadius,
            blockedScenarios: gate.blockedScenarios,
          })),
        },
        null,
        2,
      )}\n`,
    ],
  ];

  for (const [file, contents] of written) fs.writeFileSync(file, contents);

  const s = model.summary;
  console.log(
    `report  ${written.length} files · ${s.surfaces.computedProven}/${s.surfaces.inScope} surfaces proven · ` +
      `${s.surfaces.conflicts} contradicted · ${s.gates.blocked} outage(s) blocking ${s.run.blockedByGate} check(s)`,
  );
}

if (require.main === module) main();

module.exports = { renderCoverage, renderTraceability, renderGates, renderEndpoints };
