import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from './config';

export type ApiHitSource = 'client' | 'browser';

export interface ApiHit {
  method: string;
  url: string;
  status: number;
  source: ApiHitSource;
  scenario: string;
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

export function setApiLogScenario(name: string): void {
  currentScenario = name;
}

export function resetApiCallLog(): void {
  hits.length = 0;
  currentScenario = '(run setup)';
}

export function recordApiHit(hit: Omit<ApiHit, 'scenario'> & { scenario?: string }): void {
  if (!isTrackedUrl(hit.url)) return;
  hits.push({
    ...hit,
    method: hit.method.toUpperCase(),
    scenario: hit.scenario ?? currentScenario,
  });
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

function outcome(statuses: number[]): string {
  if (statuses.length === 0) return 'Not hit';
  if (statuses.some((s) => s >= 500)) return 'Fail';
  if (statuses.some((s) => s >= 400)) return 'Error';
  return 'Pass';
}

function rank(status: string): number {
  return { Fail: 0, Error: 1, Pass: 2, 'Not hit': 3 }[status] ?? 4;
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
  }

  return [...map.values()].sort(
    (a, b) =>
      GROUPS.indexOf(a.group as GroupName) - GROUPS.indexOf(b.group as GroupName) ||
      a.template.localeCompare(b.template) ||
      a.method.localeCompare(b.method),
  );
}

export function renderApiEndpointReport(startedAt: Date): string {
  const stats = collectStats();
  const generated = new Date();
  const groups = GROUPS.map((group) => {
    const rows = stats.filter((row) => row.group === group);
    const statuses = rows.flatMap((row) => row.statuses);
    const hitCount = rows.reduce((sum, row) => sum + row.count, 0);
    return {
      group,
      status: outcome(statuses),
      hitCount,
      endpoints: rows.length,
      rows,
    };
  }).filter((group) => group.rows.length > 0);

  const overall = [...groups].sort((a, b) => rank(a.status) - rank(b.status))[0]?.status ?? 'Not hit';

  const lines: string[] = [
    '# API endpoint report',
    '',
    '> Generated at the end of each test run. Do not edit by hand.',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated | ${generated.toISOString()} |`,
    `| Run started | ${startedAt.toISOString()} |`,
    `| Calls recorded | ${hits.length} |`,
    `| Overall | **${overall}** |`,
    '',
    '## Groups',
    '',
    '| Group | Status | Endpoints | Calls |',
    '|-------|--------|----------:|------:|',
    ...groups.map(
      (g) => `| ${g.group} | **${g.status}** | ${g.endpoints} | ${g.hitCount} |`,
    ),
  ];

  for (const group of groups) {
    lines.push('', `## ${group.group}`, '');
    lines.push('| Status | Method | Endpoint | Last HTTP | Statuses seen | Calls | Source |');
    lines.push('|--------|--------|----------|----------:|---------------|------:|--------|');
    for (const row of group.rows) {
      const status = outcome(row.statuses);
      const last = row.count === 0 ? '—' : String(row.lastStatus);
      const seen = row.count === 0 ? '—' : uniqueSorted(row.statuses);
      const source = row.sources.size === 0 ? '—' : [...row.sources].sort().join(', ');
      lines.push(
        `| ${status} | ${row.method} | \`${row.template}\` | ${last} | ${seen} | ${row.count} | ${source} |`,
      );
    }
  }

  lines.push('');
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
