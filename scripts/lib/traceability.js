#!/usr/bin/env node
/**
 * Joins the four things the suite already owns into one model:
 *
 *   docs/test-cases.md        curated cases  (what we say we test)
 *   features/**\/*.feature     scenarios      (what is actually scripted)
 *   reports/cucumber-report.json  run results (what happened last run)
 *   docs/surface-inventory.json   surfaces    (what the product exposes)
 *
 * Everything downstream — the traceability matrix, the coverage report and the
 * gates page — reads this model, so a curated claim and a measured result can
 * never disagree silently.
 *
 * Nothing here is hand-maintained except docs/gates.json, which names the
 * environment failures we already understand so their blast radius is reported
 * as "blocked", not as "coverage we never had".
 */
const fs = require('node:fs');
const path = require('node:path');

const DOCS = 'docs';
const CASES_FILE = path.join(DOCS, 'test-cases.md');
const INVENTORY_FILE = path.join(DOCS, 'surface-inventory.json');
const GATES_FILE = path.join(DOCS, 'gates.json');
const FEATURES_DIR = 'features';
const RUN_FILE = process.env.CUCUMBER_JSON || path.join('reports', 'cucumber-report.json');

/** Filtered out of `npm test`, so "not run" is a choice rather than a miss. */
const FILTERED_TAGS = ['bug', 'write', 'visual', 'wip'];

const AREA_LABELS = {
  auth: 'Sign-in',
  clients: 'Client management',
  programs: 'Skills programs',
  'analyze-data': 'Analyze Data',
  'behavior-support': 'Behavior support',
  negative: 'Error handling',
  sessions: 'New session',
  settings: 'Clinical settings',
  health: 'Platform health',
  lookups: 'Clinical lookups',
  a11y: 'Accessibility',
  preflight: 'Platform foundations',
  write: 'Data entry',
  visual: 'Page layout',
};

// ---------------------------------------------------------------- utilities

function readIfPresent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function readJsonIfPresent(file) {
  const raw = readIfPresent(file);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Loose key for matching prose to scenario names across punctuation drift. */
function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function areaOf(tags) {
  return tags.find((tag) => tag in AREA_LABELS) ?? 'other';
}

function areaLabel(area) {
  return AREA_LABELS[area] ?? 'Other';
}

// ------------------------------------------------------------- case catalog

/**
 * Headings carry one case (`### AZ-6 — …`), a range (`### AZ-5a … AZ-5e — …`)
 * or a pair (`### WR-4 / WR-5 — …`). All three shapes have to resolve, because
 * the inventory cites whichever form the author had in mind.
 */
function expandCaseIds(heading) {
  const range = heading.match(/^([A-Z0-9]+-\d+)([a-z])\s*(?:…|\.\.\.)\s*[A-Z0-9]+-\d+([a-z])$/);
  if (range) {
    const [, stem, from, to] = range;
    const ids = [];
    for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c += 1) {
      ids.push(`${stem}${String.fromCharCode(c)}`);
    }
    return ids;
  }
  return heading
    .split('/')
    .map((part) => part.trim())
    .filter((part) => /^[A-Z0-9]+-[A-Za-z0-9-]+$/.test(part));
}

/** `PRG-3a-targets` also answers to `PRG-3a` and `PRG-3`. */
function aliasesFor(id) {
  const aliases = new Set();
  const withoutSuffix = id.replace(/-[a-z]+$/, '');
  if (withoutSuffix !== id) aliases.add(withoutSuffix);
  const numericBase = id.match(/^([A-Z0-9]+-\d+)[a-z]?/);
  if (numericBase && numericBase[1] !== id) aliases.add(numericBase[1]);
  return [...aliases];
}

function tableField(body, label) {
  const match = body.match(new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*([\\s\\S]*?)\\s*\\|\\s*(?:\\r?\\n|$)`));
  return match ? match[1].trim() : '';
}

function parseCases(markdown) {
  const cases = [];
  if (!markdown) return cases;

  const headings = [...markdown.matchAll(/^###\s+(.+?)\s+—\s+(.+)$/gm)];
  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    const ids = expandCaseIds(heading[1].trim());
    if (ids.length === 0) continue;

    const body = markdown.slice(heading.index, headings[i + 1]?.index ?? markdown.length);
    const before = markdown.slice(0, heading.index);
    const module = [...before.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].pop()?.[1].trim() ?? 'Uncategorised';
    const featureFile = [...before.matchAll(/^\*\*Feature:\*\*\s+`([^`]+)`/gm)].pop()?.[1] ?? '';
    const sectionTags = [...before.matchAll(/^\*\*Tags:\*\*\s+(.+)$/gm)].pop()?.[1] ?? '';

    for (const id of ids) {
      cases.push({
        id,
        aliases: aliasesFor(id),
        title: heading[2].trim(),
        module,
        featureFile,
        sectionTags: [...sectionTags.matchAll(/@([a-z0-9-]+)/g)].map((m) => m[1]),
        objective: tableField(body, 'Objective'),
        type: tableField(body, 'Type'),
        priority: tableField(body, 'Priority'),
        expected: tableField(body, 'Expected result'),
        automationRaw: tableField(body, 'Automation'),
        curatedStatus: tableField(body, 'Status'),
      });
    }
  }
  return cases;
}

// ---------------------------------------------------------------- scenarios

function collectFeatureFiles(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFeatureFiles(full, found);
    else if (entry.name.endsWith('.feature')) found.push(full);
  }
  return found;
}

function parseScenarios() {
  const scenarios = [];
  for (const file of collectFeatureFiles(FEATURES_DIR)) {
    const relative = file.replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let featureTags = [];
    let pendingTags = [];
    let seenFeature = false;

    lines.forEach((line, index) => {
      const tagLine = line.match(/^\s*(@[\w@\s-]+)$/);
      if (tagLine) {
        pendingTags = [...tagLine[1].matchAll(/@([\w-]+)/g)].map((m) => m[1]);
        return;
      }
      if (/^\s*Feature:/.test(line)) {
        featureTags = pendingTags;
        pendingTags = [];
        seenFeature = true;
        return;
      }
      const scenario = line.match(/^\s*(?:Scenario Outline|Scenario):\s*(.+?)\s*$/);
      if (scenario && seenFeature) {
        scenarios.push({
          name: scenario[1],
          file: relative,
          line: index + 1,
          tags: [...new Set([...featureTags, ...pendingTags])],
        });
        pendingTags = [];
      }
    });
  }
  return scenarios.map((scenario) => ({
    ...scenario,
    area: areaOf(scenario.tags),
    filtered: scenario.tags.filter((tag) => FILTERED_TAGS.includes(tag)),
  }));
}

// -------------------------------------------------------------- run results

function parseRun(report) {
  const rows = [];
  if (!Array.isArray(report)) return rows;
  for (const feature of report) {
    for (const element of feature.elements ?? []) {
      if (element.type && element.type !== 'scenario') continue;
      const steps = element.steps ?? [];
      const failing = steps.find((step) => step.result?.status === 'failed');
      const statuses = steps.map((step) => step.result?.status).filter(Boolean);
      let status = 'passed';
      if (failing) status = 'failed';
      else if (statuses.includes('undefined') || statuses.includes('ambiguous')) status = 'undefined';
      else if (statuses.length === 0 || statuses.every((s) => s === 'skipped')) status = 'skipped';

      rows.push({
        name: element.name,
        uri: (feature.uri ?? '').replace(/\\/g, '/'),
        line: element.line,
        tags: (element.tags ?? []).map((tag) => tag.name.replace(/^@/, '')),
        status,
        durationMs: Math.round(
          steps.reduce((total, step) => total + (step.result?.duration ?? 0), 0) / 1e6,
        ),
        failedStep: failing ? `${failing.keyword ?? ''}${failing.name ?? ''}`.trim() : '',
        error: failing ? String(failing.result?.error_message ?? '') : '',
      });
    }
  }
  return rows;
}

// -------------------------------------------------------------------- gates

/**
 * A gate is an environment precondition we already know is broken. Attributing
 * a failure to an open gate keeps one backend defect from reading as dozens of
 * independent coverage regressions.
 */
function attributeGates(runRows, gateDefinitions) {
  const gates = gateDefinitions.map((gate) => ({
    ...gate,
    state: 'clear',
    blockedScenarios: [],
  }));

  for (const row of runRows) {
    if (row.status !== 'failed') continue;
    const gate = gates.find((candidate) => new RegExp(candidate.signature, 'i').test(row.error));
    if (!gate) continue;
    gate.state = 'blocked';
    row.gate = gate.id;
    if (!gate.blockedScenarios.includes(row.name)) gate.blockedScenarios.push(row.name);
  }

  for (const gate of gates) gate.blastRadius = gate.blockedScenarios.length;
  return gates;
}

// ------------------------------------------------------------------ joining

/** Scenario names quoted in the Automation cell, in the order they appear. */
function automationCandidates(cell, fallbackTitle) {
  const candidates = [...cell.matchAll(/\*([^*]+)\*/g)]
    .map((match) => match[1].trim())
    .filter((text) => text.length > 3);
  candidates.push(fallbackTitle);
  return candidates;
}

function linkCasesToScenarios(cases, scenarios) {
  const byExact = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
  const byNormal = new Map(scenarios.map((scenario) => [normalize(scenario.name), scenario]));

  /** An outline is often cited by its stem, e.g. "Paged per-program endpoints". */
  const byUniquePrefix = (candidate) => {
    const key = normalize(candidate);
    if (key.length < 12) return undefined;
    const hits = scenarios.filter((scenario) => normalize(scenario.name).startsWith(key));
    return hits.length === 1 ? hits[0] : undefined;
  };

  for (const testCase of cases) {
    if (!testCase.automationRaw) {
      testCase.scenarios = [];
      // OPS cases describe CI mechanics; anything else is simply undocumented.
      testCase.link = /Operations/i.test(testCase.module) ? 'process' : 'undocumented';
      continue;
    }
    const matched = [];
    let link = 'none';
    for (const candidate of automationCandidates(testCase.automationRaw, testCase.title)) {
      const hit = byExact.get(candidate) ?? byNormal.get(normalize(candidate)) ?? byUniquePrefix(candidate);
      if (!hit || matched.includes(hit)) continue;
      matched.push(hit);
      if (link === 'none') link = byExact.has(candidate) ? 'named' : 'inferred';
    }
    testCase.scenarios = matched;
    testCase.link = matched.length ? link : 'none';
  }
}

function statusForCase(testCase, runByScenario) {
  if (testCase.link === 'process') return { status: 'process', rows: [] };
  if (testCase.link === 'undocumented') return { status: 'undocumented', rows: [] };
  if (testCase.scenarios.length === 0) return { status: 'unscripted', rows: [] };

  // A @bug case documents a defect either way: filtered out of the default run,
  // or red in a bugs run. Treating it as unproven coverage would mean that
  // writing down a defect quietly demoted the surface it was found on.
  const documentsDefect = testCase.scenarios.every((scenario) => scenario.tags.includes('bug'));

  const rows = testCase.scenarios.flatMap((scenario) => runByScenario.get(scenario.name) ?? []);
  if (rows.length === 0) {
    if (documentsDefect) return { status: 'known-defect', rows };
    const filtered = testCase.scenarios.some((scenario) => scenario.filtered.length > 0);
    return { status: filtered ? 'filtered' : 'not-run', rows };
  }
  const failures = rows.filter((row) => row.status === 'failed');
  if (failures.length > 0) {
    // A @bug scenario asserts behaviour the product does not have yet, so its
    // red is the documented state, not a regression. The default run filters
    // these out; a bugs-profile run must not turn them into contradictions.
    if (failures.every((row) => row.tags.includes('bug'))) return { status: 'known-defect', rows };
    return { status: failures.every((row) => row.gate) ? 'blocked' : 'failed', rows };
  }
  if (rows.every((row) => row.status === 'passed')) return { status: 'passed', rows };
  return { status: 'partial', rows };
}

/** Worst-first, so one red case cannot be averaged away by green siblings. */
const COMPUTED_PRECEDENCE = [
  'failed',
  'blocked',
  'known-defect',
  'partial',
  'not-run',
  'filtered',
  'unscripted',
  'undocumented',
  'passed',
];

function computedStatusFor(resolved) {
  const all = resolved.map((testCase) => testCase.result.status).filter((s) => s !== 'process');
  if (all.length === 0) return 'unmapped';
  // Known defects are excluded from the rollup the same way the default run
  // excludes them, unless they are all a surface has.
  const statuses = all.some((s) => s !== 'known-defect')
    ? all.filter((s) => s !== 'known-defect')
    : all;
  for (const status of COMPUTED_PRECEDENCE) {
    if (statuses.includes(status)) return status === 'passed' ? 'proven' : status;
  }
  return 'proven';
}

/**
 * How the curated claim in the inventory compares to what the run measured.
 * `conflict` is the only value that means the inventory is wrong today — and an
 * item may carry a `statusRationale` to acknowledge a divergence it has already
 * reasoned about, which downgrades the conflict to a warning. Without that
 * escape hatch the first justified exception would force the gate to be weakened.
 */
function agreementFor(curated, computed, rationale) {
  if (curated === 'excluded') return 'out-of-scope';
  if (computed === 'unmapped') return curated === 'gap' ? 'agrees' : 'unmapped';

  const claimsCoverage = curated === 'covered';
  if (claimsCoverage) {
    if (computed === 'proven') return 'agrees';
    if (computed === 'failed') return rationale ? 'acknowledged' : 'conflict';
    if (computed === 'blocked') return 'blocked';
    return 'unproven';
  }
  if (curated === 'bug') return computed === 'proven' ? (rationale ? 'acknowledged' : 'fix-detected') : 'agrees';
  if (curated === 'partial') return computed === 'proven' ? 'understated' : 'agrees';
  // gap and wip claim no coverage at all.
  if (computed === 'proven') return 'understated';
  return 'agrees';
}

// -------------------------------------------------------------------- model

function buildModel() {
  const cases = parseCases(readIfPresent(CASES_FILE));
  const scenarios = parseScenarios();
  const inventory = readJsonIfPresent(INVENTORY_FILE) ?? { items: [], asOf: null };
  const gateDefinitions = readJsonIfPresent(GATES_FILE)?.gates ?? [];
  const runRows = parseRun(readJsonIfPresent(RUN_FILE));
  const gates = attributeGates(runRows, gateDefinitions);

  linkCasesToScenarios(cases, scenarios);

  const runByScenario = new Map();
  for (const row of runRows) {
    if (!runByScenario.has(row.name)) runByScenario.set(row.name, []);
    runByScenario.get(row.name).push(row);
  }
  for (const testCase of cases) {
    testCase.result = statusForCase(testCase, runByScenario);
    testCase.area = areaOf([
      ...testCase.sectionTags,
      ...testCase.scenarios.flatMap((scenario) => scenario.tags),
    ]);
  }

  // Cases answer to their own id and to any unambiguous shorthand for it.
  const caseById = new Map(cases.map((testCase) => [testCase.id, testCase]));
  const caseByAlias = new Map();
  for (const testCase of cases) {
    for (const alias of testCase.aliases) {
      if (caseById.has(alias)) continue;
      if (!caseByAlias.has(alias)) caseByAlias.set(alias, []);
      caseByAlias.get(alias).push(testCase);
    }
  }
  const resolveCaseId = (id) => (caseById.has(id) ? [caseById.get(id)] : caseByAlias.get(id) ?? []);

  const items = inventory.items.map((item) => {
    const citedIds = item.tests ?? [];
    const resolved = citedIds.flatMap(resolveCaseId);
    const unresolvedIds = citedIds.filter((id) => resolveCaseId(id).length === 0);
    const computed = computedStatusFor(resolved);
    const blockingGates = [
      ...new Set(
        resolved.flatMap((testCase) => testCase.result.rows.map((row) => row.gate).filter(Boolean)),
      ),
    ];
    return {
      ...item,
      area: areaOf(resolved.flatMap((testCase) => testCase.scenarios.flatMap((s) => s.tags))),
      citedIds,
      unresolvedIds,
      caseIds: [...new Set(resolved.map((testCase) => testCase.id))],
      computed,
      agreement: agreementFor(item.status, computed, item.statusRationale),
      blockingGates,
    };
  });

  const mappedCaseIds = new Set(items.flatMap((item) => item.caseIds));
  for (const testCase of cases) {
    testCase.surfaces = items.filter((item) => item.caseIds.includes(testCase.id)).map((item) => item.id);
    testCase.onTheBoard = mappedCaseIds.has(testCase.id);
  }

  const scenarioByName = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
  for (const scenario of scenarios) {
    scenario.caseIds = cases
      .filter((testCase) => testCase.scenarios.includes(scenarioByName.get(scenario.name)))
      .map((testCase) => testCase.id);
  }

  return {
    generatedAt: new Date().toISOString(),
    env: process.env.CLINICAL_ENV || 'dev2',
    inventoryAsOf: inventory.asOf ?? null,
    runPresent: runRows.length > 0,
    cases,
    scenarios,
    items,
    gates,
    runRows,
    summary: summarize({ cases, scenarios, items, gates, runRows }),
  };
}

function count(list, predicate) {
  return list.filter(predicate).length;
}

function summarize({ cases, scenarios, items, gates, runRows }) {
  const inScope = items.filter((item) => item.status !== 'excluded');
  const executed = runRows.length;
  const failed = count(runRows, (row) => row.status === 'failed');
  const blockedByGate = count(runRows, (row) => row.status === 'failed' && row.gate);

  return {
    surfaces: {
      total: items.length,
      inScope: inScope.length,
      curatedCovered: count(inScope, (item) => item.status === 'covered'),
      // Computed tallies partition the in-scope surface; agreement tallies
      // describe the same rows from the claim's point of view. Keeping both
      // named apart stops one label carrying two numbers.
      computedProven: count(inScope, (item) => item.computed === 'proven'),
      computedBlocked: count(inScope, (item) => item.computed === 'blocked'),
      computedHeldBack: count(inScope, (item) => item.computed === 'filtered'),
      computedFailing: count(inScope, (item) => item.computed === 'failed'),
      conflicts: count(inScope, (item) => item.agreement === 'conflict'),
      acknowledged: count(inScope, (item) => item.agreement === 'acknowledged'),
      blocked: count(inScope, (item) => item.agreement === 'blocked'),
      unproven: count(inScope, (item) => item.agreement === 'unproven'),
      understated: count(inScope, (item) => item.agreement === 'understated'),
      unmapped: count(inScope, (item) => item.agreement === 'unmapped'),
      fixDetected: count(inScope, (item) => item.agreement === 'fix-detected'),
      danglingCitations: count(inScope, (item) => item.unresolvedIds.length > 0),
    },
    cases: {
      total: cases.length,
      scripted: count(cases, (testCase) => testCase.scenarios.length > 0),
      process: count(cases, (testCase) => testCase.link === 'process'),
      unscripted: count(cases, (testCase) => testCase.link === 'none'),
      undocumented: count(cases, (testCase) => testCase.link === 'undocumented'),
      onTheBoard: count(cases, (testCase) => testCase.onTheBoard),
      offTheBoard: count(cases, (testCase) => !testCase.onTheBoard && testCase.link !== 'process'),
      passed: count(cases, (testCase) => testCase.result.status === 'passed'),
      failed: count(cases, (testCase) => testCase.result.status === 'failed'),
      blocked: count(cases, (testCase) => testCase.result.status === 'blocked'),
      filtered: count(cases, (testCase) => testCase.result.status === 'filtered'),
      notRun: count(cases, (testCase) => testCase.result.status === 'not-run'),
    },
    scenarios: {
      total: scenarios.length,
      unmappedToACase: count(scenarios, (scenario) => scenario.caseIds.length === 0),
    },
    run: {
      executed,
      passed: count(runRows, (row) => row.status === 'passed'),
      failed,
      blockedByGate,
      genuinelyFailed: failed - blockedByGate,
      passRate: executed ? Math.round(((executed - failed) / executed) * 1000) / 10 : null,
    },
    gates: {
      total: gates.length,
      blocked: count(gates, (gate) => gate.state === 'blocked'),
      clear: count(gates, (gate) => gate.state === 'clear'),
      worstBlastRadius: gates.reduce((worst, gate) => Math.max(worst, gate.blastRadius), 0),
    },
  };
}

module.exports = { buildModel, areaLabel, AREA_LABELS, normalize };
