import { config } from './config';
import {
  ClientRecord,
  ProgramRecord,
  resetFixtureCache,
  resolveFixture,
  ResolvedFixture,
} from './testData';
import { CustomWorld } from './world';

/**
 * Write units (Phase 2b) may only mutate the dedicated client in TEST_CLIENT_ID.
 * Falling back to the first capable client would hit the shared polluted caseload.
 */
export function requireWriteClientId(): number {
  if (config.testClientId === undefined || Number.isNaN(config.testClientId)) {
    throw new Error(
      'Write scenarios need TEST_CLIENT_ID set to a dedicated client this suite is allowed to mutate. ' +
        'Do not run @write against the shared caseload. See docs/coverage-matrix.md Unit 7.',
    );
  }
  return config.testClientId;
}

export function suiteResourceName(kind: string): string {
  return `ZZZ-SUITE-${Date.now()}-${kind}`;
}

export async function resolveWriteFixture(world: CustomWorld): Promise<ResolvedFixture> {
  requireWriteClientId();
  resetFixtureCache();
  const fixture = await resolveFixture(world.api, world.auth.accessToken);
  if (fixture.client.id !== config.testClientId) {
    throw new Error(
      `TEST_CLIENT_ID=${config.testClientId} resolved to a different client (${fixture.client.id}). ` +
        'The capability resolver must stay pinned to the dedicated write client.',
    );
  }
  return fixture;
}

export function trackCreatedTarget(
  world: CustomWorld,
  client: ClientRecord,
  program: ProgramRecord,
  targetId: number,
): void {
  const list = (world.data.createdTargets as Array<{
    clientId: number;
    programId: number;
    targetId: number;
  }>) ?? [];
  list.push({ clientId: client.id, programId: program.id, targetId });
  world.data.createdTargets = list;
}
