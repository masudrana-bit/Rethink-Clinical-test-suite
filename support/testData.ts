import { APIRequestContext } from '@playwright/test';
import { ClinicalApi } from '../api/clinicalApi';
import { config } from './config';

export interface ClientRecord {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  clientNumber?: string;
  [key: string]: unknown;
}

export interface ProgramRecord {
  id: number;
  /** The programs endpoint names this `title`, not `name`. */
  title: string;
  domain: string | null;
  active: boolean;
  lifecycleStatus?: string;
  [key: string]: unknown;
}

export interface ResolvedFixture {
  client: ClientRecord;
  /** Preferred: an active program, so rail interactions work on the default tab. */
  program: ProgramRecord;
  targetCount: number;
  /** Every program for the resolved client, for set-comparison assertions. */
  programs: ProgramRecord[];
}

/** How many clients to probe before giving up. Keeps a cold run cheap. */
const MAX_CANDIDATES = 8;

let cached: ResolvedFixture | undefined;

async function envelope<T>(res: { ok(): boolean; status(): number; json(): Promise<any> }, what: string): Promise<T[]> {
  if (!res.ok()) {
    throw new Error(`Resolving test data: ${what} returned ${res.status()}.`);
  }
  const body = await res.json();
  return (body?.items ?? []) as T[];
}

/**
 * FND-3 / D2. Picks a client by capability — one with at least one program that
 * has at least one target — rather than pinning an ID. Survives a data reset and
 * satisfies the no-hardcoded-IDs rule.
 *
 * TEST_CLIENT_ID narrows the search to a single client for debugging; the
 * capability check still has to pass.
 */
export async function resolveFixture(
  apiContext: APIRequestContext,
  token: string,
): Promise<ResolvedFixture> {
  if (cached) return cached;

  const api = new ClinicalApi(apiContext, token);
  const all = await envelope<ClientRecord>(await api.clients(), 'the clients list');

  let candidates = all.filter((c) => c.isActive);
  if (config.testClientId !== undefined) {
    candidates = candidates.filter((c) => c.id === config.testClientId);
    if (candidates.length === 0) {
      throw new Error(
        `TEST_CLIENT_ID=${config.testClientId} is not an active client in this environment.`,
      );
    }
  }
  if (candidates.length === 0) {
    throw new Error('Resolving test data: the clients list contained no active clients.');
  }

  const probed: string[] = [];
  for (const client of candidates.slice(0, MAX_CANDIDATES)) {
    const programs = await envelope<ProgramRecord>(
      await api.programs(client.id),
      `programs for client ${client.id}`,
    );

    // Active programs first: the rail opens on its Current tab, which shows only
    // those, so an active program keeps the UI scenarios on the default view.
    const ordered = [...programs].sort((a, b) => Number(b.active) - Number(a.active));

    for (const program of ordered) {
      const targets = await envelope<unknown>(
        await api.targets(client.id, program.id),
        `targets for program ${program.id}`,
      );
      if (targets.length > 0) {
        cached = { client, program, targetCount: targets.length, programs };
        return cached;
      }
    }
    probed.push(`${client.id} (${programs.length} programs, none with targets)`);
  }

  throw new Error(
    [
      `Resolving test data: probed ${probed.length} active clients and none had a program with targets.`,
      ...probed.map((p) => `  - ${p}`),
      'Either the environment has no seeded program data, or the targets endpoint changed shape.',
    ].join('\n'),
  );
}

export function resetFixtureCache(): void {
  cached = undefined;
}
