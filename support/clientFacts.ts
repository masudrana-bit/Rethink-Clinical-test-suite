import { APIResponse } from '@playwright/test';
import { CustomWorld } from './world';
import { resolveFixture, ResolvedFixture, ProgramRecord } from './testData';

/**
 * Live reads of the resolved client's shape.
 *
 * dev2 is written to by other suites while ours runs, so these are deliberately
 * *not* cached: assertions that compare the UI against the API must read the API
 * as close to the UI read as possible. See "Shared environment" in the coverage
 * matrix.
 */

export async function fixture(world: CustomWorld): Promise<ResolvedFixture> {
  if (!world.fixture) {
    world.fixture = await resolveFixture(world.api, world.auth.accessToken);
  }
  return world.fixture;
}

/**
 * The API occasionally answers with a .NET exception string rather than JSON.
 * Parsing that blind yields "Unexpected token 'S'", which says nothing useful, so
 * report the status and a snippet of what actually came back.
 */
async function readJson(res: APIResponse, what: string): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${what} returned ${res.status()} with a body that is not JSON: ` +
        `${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`,
    );
  }
}

export async function fetchPrograms(world: CustomWorld): Promise<ProgramRecord[]> {
  const { client } = await fixture(world);
  const res = await world.clinical.programs(client.id);
  const body = await readJson(res, `programs for client ${client.id}`);
  return (body?.items ?? []) as ProgramRecord[];
}

/** Total targets across every one of the client's programs, active or not. */
export async function fetchTargetTotal(world: CustomWorld): Promise<number> {
  const { client } = await fixture(world);
  const programs = await fetchPrograms(world);
  let total = 0;
  for (const program of programs) {
    const res = await world.clinical.targets(client.id, program.id);
    const body = await readJson(res, `targets for program ${program.id}`);
    total += Number(body?.totalCount ?? 0);
  }
  return total;
}

export async function fetchFlaggedTotal(world: CustomWorld): Promise<number> {
  const { client } = await fixture(world);
  const programs = await fetchPrograms(world);
  let total = 0;
  for (const program of programs) {
    const res = await world.clinical.automasteryEvaluations(client.id, program.id, 'flagged');
    const body = await readJson(res, `automastery evaluations for program ${program.id}`);
    total += (body?.items ?? []).length;
  }
  return total;
}

export function distinct(programs: ProgramRecord[], key: 'domain' | 'category' | 'area'): string[] {
  const values = new Set<string>();
  for (const program of programs) {
    const value = program[key];
    if (typeof value === 'string' && value.trim()) values.add(value.trim());
  }
  return [...values].sort();
}
