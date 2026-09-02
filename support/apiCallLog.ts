import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from './config';

export type ApiHitSource = 'client' | 'browser';

export interface ApiFailureDetails {
  type?: string;
  title?: string;
  detail?: string;
  traceId?: string;
}

export interface ApiHit {
  method: string;
  url: string;
  status: number;
  source: ApiHitSource;
  scenario: string;
  expected: boolean;
  failure?: ApiFailureDetails;
}

interface EndpointStats {
  method: string;
  template: string;
  group: string;
  statuses: number[];
  count: number;
  lastStatus: number;
  sources: Set<string>;
  scenarios: Set<string>;
  hits: ApiHit[];
}

const GROUPS = [
  'Auth',
  'Accounts',
  'Clients',
  'Programs',
  'Write',
  'Observations',
  'App',
  'Other',
] as const;

type GroupName = (typeof GROUPS)[number];

/** Known suite endpoints. Rows stay in the report even when a run never hits them. */
const CATALOG: Array<{ method: string; template: string; group: GroupName }> = [
  { method: 'POST', template: '/login', group: 'Auth' },
  { method: 'POST', template: '/refresh-token', group: 'Auth' },
  { method: 'GET', template: '/accounts/v1/members/me/staff-role', group: 'Accounts' },
  { method: 'GET', template: '/clinical/v1/clients', group: 'Clients' },
  { method: 'GET', template: '/clinical/v1/program-library', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs/:id/targets', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs/:id/objectives', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs/:id/mastery-criteria', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs/:id/target-groups', group: 'Programs' },
  { method: 'GET', template: '/clinical/v1/clients/:id/programs/:id/data-collection', group: 'Programs' },
  {
    method: 'GET',
    template: '/clinical/v1/clients/:id/programs/:id/automastery-evaluations?status=',
    group: 'Programs',
  },
  { method: 'POST', template: '/clinical/v1/clients/:id/programs/:id/targets', group: 'Write' },
  {
    method: 'DELETE',
    template: '/clinical/v1/clients/:id/programs/:id/targets/:id',
    group: 'Write',
  },
  { method: 'GET', template: '/observations/v1/client/:id/behaviorplans', group: 'Observations' },
  { method: 'GET', template: '/runtime-config.json', group: 'App' },
];

const hits: ApiHit[] = [];
let currentScenario = '(run setup)';
let currentAllowsClientError = false;
const pendingRecordings = new Set<Promise<void>>();

export function setApiLogScenario(name: string, allowsClientError = false): void {
  currentScenario = name;
  currentAllowsClientError = allowsClientError;
}

export function resetApiCallLog(): void {
  hits.length = 0;
  currentScenario = '(run setup)';
  currentAllowsClientError = false;
}

export function recordApiHit(
  hit: Omit<ApiHit, 'scenario' | 'expected'> & {
    scenario?: string;
    expected?: boolean;
  },
): void {
  if (!isTrackedUrl(hit.url)) return;
  hits.push({
    ...hit,
    method: hit.method.toUpperCase(),
    scenario: hit.scenario ?? currentScenario,
    expected:
      hit.expected ??
      (currentAllowsClientError && hit.status >= 400),
  });
}

interface TrackableResponse {
  url(): string;
  status(): number;
  text(): Promise<string>;
}

function failureDetails(text: string): ApiFailureDetails | undefined {
  if (!text) return undefined;
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const result: ApiFailureDetails = {};
    for (const key of ['type', 'title', 'detail', 'traceId'] as const) {
      if (typeof body[key] === 'string') result[key] = String(body[key]).slice(0, 1_000);
    }
    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return { detail: text.replace(/\s+/g, ' ').trim().slice(0, 1_000) };
  }
}

export async function recordApiResponseHit(
  response: TrackableResponse,
  method: string,
  source: ApiHitSource,
  options: { scenario?: string; expected?: boolean } = {},
): Promise<void> {
  const status = response.status();
  const failure = status >= 400
    ? await response.text().then(failureDetails).catch(() => undefined)
    : undefined;
  recordApiHit({
    method,
    url: response.url(),
    status,
    source,
    failure,
    ...options,
  });
}

export function queueApiResponseHit(
  response: TrackableResponse,
  method: string,
  source: ApiHitSource,
): void {
  const status = response.status();
  const options = {
    scenario: currentScenario,
    expected: currentAllowsClientError && status >= 400 && status < 500,
  };
  const recording = recordApiResponseHit(response, method, source, options).finally(() => {
    pendingRecordings.delete(recording);
  });
  pendingRecordings.add(recording);
}

export async function flushApiHitRecordings(): Promise<void> {
  await Promise.allSettled([...pendingRecordings]);
}

function isTrackedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/runtime-config.json')) return true;
    const api = new URL(config.apiBaseUrl);
    const auth = new URL(config.authBaseUrl);
    return originsMatch(parsed, api) || originsMatch(parsed, auth);
  } catch {
    return false;
  }
}

function originsMatch(a: URL, b: URL): boolean {
  return a.origin === b.origin;
}

function stripKnownPrefix(pathname: string, base: string): string {
  try {
    const prefix = new URL(base).pathname.replace(/\/$/, '');
    if (prefix && pathname.startsWith(prefix)) {
      return pathname.slice(prefix.length) || '/';
    }
  } catch {
    /* ignore */
  }
  return pathname;
}

export function templateFromUrl(url: string): string {
  const parsed = new URL(url);
  let pathname = parsed.pathname;
  pathname = stripKnownPrefix(pathname, config.apiBaseUrl);
  pathname = stripKnownPrefix(pathname, config.authBaseUrl);
  pathname = pathname.replace(/\/\d+/g, '/:id');

  const ignoredQuery = new Set(['page', 'pageSize']);
  const keys = [...parsed.searchParams.keys()].filter((key) => !ignoredQuery.has(key)).sort();
  if (keys.length > 0) {
    pathname += `?${keys.map((key) => `${key}=`).join('&')}`;
  }
  return pathname;
}

function groupFor(method: string, template: string): GroupName {
  const catalog = CATALOG.find((row) => row.method === method && row.template === template);
  if (catalog) return catalog.group;
  if (template.includes('/login') || template.includes('/refresh-token')) return 'Auth';
  if (template.startsWith('/accounts/')) return 'Accounts';
  if (template.includes('/behaviorplans') || template.startsWith('/observations/')) {
    return 'Observations';
  }
  if (method !== 'GET' && template.includes('/targets')) return 'Write';
  if (template.startsWith('/clinical/v1/clients') && !template.includes('/programs')) {
    return 'Clients';
  }
  if (template.startsWith('/clinical/')) return 'Programs';
  if (template.includes('runtime-config')) return 'App';
  return 'Other';
}

function hitPassed(hit: ApiHit): boolean {
  return hit.status < 400 || hit.expected;
}

function outcome(endpointHits: ApiHit[]): '✅ Pass' | '❌ Fail' | '➖ Not run' {
  if (endpointHits.length === 0) return '➖ Not run';
  return endpointHits.every(hitPassed) ? '✅ Pass' : '❌ Fail';
}

function rank(status: string): number {
  return { '❌ Fail': 0, '✅ Pass': 1, '➖ Not run': 2 }[status] ?? 3;
}

function uniqueSorted(values: number[]): string {
  return [...new Set(values)].sort((a, b) => a - b).join(', ');
}

function collectStats(): EndpointStats[] {
  const map = new Map<string, EndpointStats>();

  const ensure = (method: string, template: string, group: string): EndpointStats => {
    const key = `${method} ${template}`;
    const existing = map.get(key);
    if (existing) return existing;
    const created: EndpointStats = {
      method,
      template,
      group,
      statuses: [],
      count: 0,
      lastStatus: 0,
      sources: new Set(),
      scenarios: new Set(),
      hits: [],
    };
    map.set(key, created);
    return created;
  };

  for (const row of CATALOG) ensure(row.method, row.template, row.group);

  for (const hit of hits) {
    const template = templateFromUrl(hit.url);
    const stats = ensure(hit.method, template, groupFor(hit.method, template));
    stats.statuses.push(hit.status);
    stats.count += 1;
    stats.lastStatus = hit.status;
    stats.sources.add(hit.source);
    stats.scenarios.add(hit.scenario);
    stats.hits.push(hit);
  }

  return [...map.values()].sort(
    (a, b) =>
      GROUPS.indexOf(a.group as GroupName) - GROUPS.indexOf(b.group as GroupName) ||
      a.template.localeCompare(b.template) ||
      a.method.localeCompare(b.method),
  );
}

function md(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function rootCause(hit: ApiHit): string {
  const detail = hit.failure?.detail;
  return detail || hit.failure?.title || hit.failure?.type || `HTTP ${hit.status}`;
}

function rootCauseLabel(hit: ApiHit): string {
  return hit.failure?.title || hit.failure?.type || `HTTP ${hit.status}`;
}

function recommendation(hit: ApiHit): string {
  const evidence = [
    hit.failure?.type,
    hit.failure?.title,
    hit.failure?.detail,
  ].filter(Boolean).join(' ');
  if (/AccountsCredential|service.{0,20}credential/i.test(evidence)) {
    return 'Validate the gateway service credential and account mapping; retrying tests will not repair it.';
  }
  if (/user.{0,40}not found|resource was not found/i.test(evidence)) {
    return 'Verify that the resolved client exists in the downstream service and that account-to-client synchronization completed.';
  }
  if (hit.status === 401 || hit.status === 403) {
    return 'Verify the access token/application key, expiry, audience, and required role.';
  }
  if (hit.status === 404) {
    return 'Verify the environment, route template, and resolved resource identifiers.';
  }
  if (hit.status === 429) {
    return 'Check rate limits and request fan-out; retry with controlled concurrency.';
  }
  if (hit.status >= 500) {
    return 'Inspect the service logs using the trace ID and correlate with the run timestamp.';
  }
  return 'Compare the response contract with the scenario expectation.';
}

export function renderApiEndpointReport(startedAt: Date): string {
  const stats = collectStats();
  const generated = new Date();
  const failedHits = hits.filter((hit) => !hitPassed(hit));
  const passedHits = hits.filter(hitPassed);
  const groups = GROUPS.map((group) => {
    const rows = stats.filter((row) => row.group === group);
    const groupHits = rows.flatMap((row) => row.hits);
    const failed = groupHits.filter((hit) => !hitPassed(hit)).length;
    const passed = groupHits.length - failed;
    return {
      group,
      status: outcome(groupHits),
      calls: groupHits.length,
      passed,
      failed,
      successRate: groupHits.length === 0 ? '—' : `${((passed / groupHits.length) * 100).toFixed(1)}%`,
      covered: rows.filter((row) => row.count > 0).length,
      endpoints: rows.length,
      rows,
    };
  }).filter((group) => group.rows.length > 0);

  const overall = [...groups].sort((a, b) => rank(a.status) - rank(b.status))[0]?.status ?? '➖ Not run';
  const coveredEndpoints = stats.filter((row) => row.count > 0).length;

  const lines: string[] = [
    '# API endpoint health report',
    '',
    '> Generated at the end of each test run. Do not edit by hand.',
    '',
    '## Executive summary',
    '',
    '| Result | Value |',
    '|--------|-------|',
    `| Overall health | **${overall}** |`,
    `| Calls | ${hits.length} (${passedHits.length} passed, ${failedHits.length} failed) |`,
    `| Endpoint coverage | ${coveredEndpoints}/${stats.length} (${stats.length === 0 ? '0.0' : ((coveredEndpoints / stats.length) * 100).toFixed(1)}%) |`,
    `| Run window | ${startedAt.toISOString()} → ${generated.toISOString()} |`,
    '',
    '### Service groups',
    '',
    '| Group | Status | Covered endpoints | Calls | Passed | Failed | Success rate |',
    '|-------|--------|------------------:|------:|-------:|-------:|-------------:|',
    ...groups.map(
      (g) =>
        `| ${g.group} | **${g.status}** | ${g.covered}/${g.endpoints} | ${g.calls} | ${g.passed} | ${g.failed} | ${g.successRate} |`,
    ),
    '',
    '## ❌ Failures only',
    '',
  ];

  if (failedHits.length === 0) {
    lines.push('✅ No unexpected API failures were recorded in this run.', '');
  } else {
    lines.push(
      '| Group | Method | Endpoint | HTTP | Scenario | Root-cause evidence | Trace ID |',
      '|-------|--------|----------|-----:|----------|---------------------|----------|',
    );
    for (const hit of failedHits) {
      const template = templateFromUrl(hit.url);
      lines.push(
        `| ${groupFor(hit.method, template)} | ${hit.method} | \`${template}\` | **${hit.status}** | ${md(hit.scenario)} | ${md(rootCause(hit))} | ${md(hit.failure?.traceId ?? '—')} |`,
      );
    }

    const clusters = new Map<string, ApiHit[]>();
    for (const hit of failedHits) {
      const key = `${hit.status}|${rootCauseLabel(hit)}|${rootCause(hit)}`;
      clusters.set(key, [...(clusters.get(key) ?? []), hit]);
    }
    lines.push('', '### Root-cause clusters', '');
    let index = 1;
    for (const cluster of clusters.values()) {
      const sample = cluster[0];
      const endpoints = new Set(cluster.map((hit) => `${hit.method} ${templateFromUrl(hit.url)}`));
      const scenarios = new Set(cluster.map((hit) => hit.scenario));
      lines.push(
        `#### RC-${index}: HTTP ${sample.status} — ${rootCauseLabel(sample)}`,
        '',
        `- **Evidence:** ${rootCause(sample)}`,
        `- **Impact:** ${cluster.length} call(s), ${endpoints.size} endpoint(s), ${scenarios.size} scenario(s)`,
        `- **Endpoints:** ${[...endpoints].map((value) => `\`${value}\``).join(', ')}`,
        `- **Scenarios:** ${[...scenarios].map((value) => `\`${value}\``).join(', ')}`,
        `- **Trace IDs:** ${[...new Set(cluster.map((hit) => hit.failure?.traceId).filter(Boolean))].join(', ') || 'not supplied'}`,
        `- **Recommended next check:** ${recommendation(sample)}`,
        '',
      );
      index += 1;
    }
  }

  lines.push('## Endpoint detail by group', '');
  for (const group of groups) {
    lines.push(`### ${group.status} ${group.group}`, '');
    lines.push('| Status | Method | Endpoint | Last HTTP | Statuses | Calls | Expected 4xx | Scenarios |');
    lines.push('|--------|--------|----------|----------:|----------|------:|-------------:|-----------|');
    for (const row of group.rows) {
      const status = outcome(row.hits);
      const last = row.count === 0 ? '—' : String(row.lastStatus);
      const seen = row.count === 0 ? '—' : uniqueSorted(row.statuses);
      const expectedErrors = row.hits.filter((hit) => hit.expected && hit.status >= 400).length;
      const scenarios = row.scenarios.size === 0 ? '—' : [...row.scenarios].map(md).join('<br>');
      lines.push(
        `| ${status} | ${row.method} | \`${row.template}\` | ${last} | ${seen} | ${row.count} | ${expectedErrors} | ${scenarios} |`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Reading the report',
    '',
    '- **✅ Pass:** every observed call was successful, or its client error was expected by a negative/signed-out scenario.',
    '- **❌ Fail:** at least one unexpected HTTP 4xx/5xx occurred.',
    '- **➖ Not run:** the endpoint is catalogued but was not exercised by this run/profile.',
    '- A group inherits its worst endpoint result. “Not run” is coverage information, not a service failure.',
    '',
  );
  return lines.join('\n');
}

export function writeApiEndpointReport(startedAt: Date): string[] {
  const markdown = renderApiEndpointReport(startedAt);
  const outputs = [
    path.join('docs', 'api-endpoint-report.md'),
    path.join('reports', 'api-endpoint-report.md'),
  ];
  for (const file of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, markdown);
  }
  return outputs;
}
