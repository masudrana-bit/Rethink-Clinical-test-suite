import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { APIResponse } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ProgramRecord } from '../support/testData';
import { fixture, fetchPrograms } from '../support/clientFacts';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Unit 3 — PRG-1 to PRG-8. */

async function record(world: CustomWorld, res: APIResponse): Promise<void> {
  recordResponseMetadata(world, res);
  world.data.lastResponseBody = await res.json().catch(() => undefined);
}

const ids = (programs: ProgramRecord[]): number[] =>
  programs.map((p) => p.id).sort((a, b) => a - b);

const MATCHED = 'rail matches the API';

async function expectRailToMatch(
  world: CustomWorld,
  predicate: (p: ProgramRecord) => boolean,
  message: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const expected = ids((await fetchPrograms(world)).filter(predicate));
        const listed = await world.workspace.listedProgramIds();
        return listed.join(',') === expected.join(',')
          ? MATCHED
          : `rail=[${listed.join(',')}] api=[${expected.join(',')}]`;
      },
      { message, timeout: 20_000 },
    )
    .toBe(MATCHED);
}

When("I request the resolved client's programs", async function (this: CustomWorld) {
  const f = await fixture(this);
  await record(this, await this.clinical.programs(f.client.id));
});

When('I request the program library', async function (this: CustomWorld) {
  await record(this, await this.clinical.programLibrary());
});

When('I request {string} for the resolved program', async function (
  this: CustomWorld,
  endpoint: string,
) {
  const { client, program } = await fixture(this);
  const api = this.clinical;
  const calls: Record<string, () => Promise<APIResponse>> = {
    targets: () => api.targets(client.id, program.id),
    objectives: () => api.objectives(client.id, program.id),
    'mastery-criteria': () => api.masteryCriteria(client.id, program.id),
    'target-groups': () => api.targetGroups(client.id, program.id),
    'data-collection': () => api.dataCollection(client.id, program.id),
  };
  const call = calls[endpoint];
  if (!call) throw new Error(`Unknown program endpoint "${endpoint}".`);
  await record(this, await call());
});

Then('every program has an id, a title and an active flag', function (this: CustomWorld) {
  const items = (this.data.lastResponseBody?.items ?? []) as ProgramRecord[];
  expect(items.length, 'the client should have at least one program').toBeGreaterThan(0);
  for (const p of items) {
    expect(typeof p.id, `program ${p.id}: id`).toBe('number');
    expect(String(p.title ?? '').trim(), `program ${p.id}: title`).not.toBe('');
    expect(typeof p.active, `program ${p.id}: active`).toBe('boolean');
  }
});

Then('every library entry has an id and a title', function (this: CustomWorld) {
  const items = (this.data.lastResponseBody?.items ?? []) as Array<{ id: number; title: string }>;
  expect(items.length, 'the library should not be empty').toBeGreaterThan(0);
  for (const entry of items) {
    expect(typeof entry.id, `library entry ${entry.id}: id`).toBe('number');
    expect(String(entry.title ?? '').trim(), `library entry ${entry.id}: title`).not.toBe('');
  }
});

Then(
  'the document names the resolved program and carries a phases list',
  async function (this: CustomWorld) {
    const { program } = await fixture(this);
    const body = this.data.lastResponseBody as { programId: number; phases: unknown[] };
    expect(body.programId, 'programId should match the requested program').toBe(program.id);
    expect(Array.isArray(body.phases), 'phases should be an array').toBe(true);
  },
);

Then(
  'the document names the resolved program and carries a collection method',
  async function (this: CustomWorld) {
    const { program } = await fixture(this);
    const body = this.data.lastResponseBody as {
      programId: number;
      method: string;
      prompts: unknown[];
    };
    expect(body.programId, 'programId should match the requested program').toBe(program.id);
    expect(String(body.method ?? '').trim(), 'method').not.toBe('');
    expect(Array.isArray(body.prompts), 'prompts should be an array').toBe(true);
  },
);

When(
  'I request flagged automastery evaluations for a program that has them',
  async function (this: CustomWorld) {
    const f = await fixture(this);
    const emptied: number[] = [];

    for (const program of f.programs) {
      const res = await this.clinical.automasteryEvaluations(f.client.id, program.id, 'flagged');
      const body = await res.json();
      if ((body?.items ?? []).length > 0) {
        recordResponseMetadata(this, res);
        this.data.lastResponseBody = body;
        this.data.flaggedProgramId = program.id;
        return;
      }
      emptied.push(program.id);
    }

    throw new Error(
      `No program for client ${f.client.id} has flagged automastery evaluations ` +
        `(checked ${emptied.join(', ')}). Asserting on an empty list would pass vacuously, ` +
        'so this scenario needs an environment with flagged evaluations.',
    );
  },
);

Then('every evaluation is flagged and references a target', function (this: CustomWorld) {
  const items = (this.data.lastResponseBody?.items ?? []) as Array<{
    status: string;
    targetId: number;
  }>;
  expect(items.length, 'there should be flagged evaluations to assert on').toBeGreaterThan(0);
  for (const item of items) {
    expect(item.status, `evaluation for target ${item.targetId}`).toBe('flagged');
    expect(typeof item.targetId, 'targetId').toBe('number');
  }
});

When("I open the resolved client's workspace", async function (this: CustomWorld) {
  const { client } = await fixture(this);
  await this.workspace.goto(client.id);
});

Then("the rail lists exactly the client's active programs", async function (this: CustomWorld) {
  await expectRailToMatch(this, (p) => p.active, 'the Current tab should list the active programs');
});

Then(
  'the Current and Inactive tabs together list every program exactly once',
  async function (this: CustomWorld) {
    await this.workspace.openRailTab('current');
    await expectRailToMatch(this, (p) => p.active, 'Current tab');
    const current = await this.workspace.listedProgramIds();

    await this.workspace.openRailTab('inactive');
    await expectRailToMatch(this, (p) => !p.active, 'Inactive tab');
    const inactive = await this.workspace.listedProgramIds();

    const overlap = current.filter((id) => inactive.includes(id));
    expect(overlap, 'no program should appear on both tabs').toEqual([]);

    // Re-read once more: anything created between the two tab reads belongs to
    // neither snapshot, and would otherwise look like a coverage hole.
    const everything = ids(await fetchPrograms(this));
    const covered = [...current, ...inactive].sort((a, b) => a - b);
    const missing = everything.filter((id) => !covered.includes(id));
    expect(missing, 'every program should appear on one of the two tabs').toEqual([]);
  },
);

When('I select the resolved program in the rail', async function (this: CustomWorld) {
  const { program } = await fixture(this);
  await this.workspace.openRailTab(program.active ? 'current' : 'inactive');
  await this.workspace.openProgram(program.id);
});

Then(
  "the program's targets, goals and settings panels are shown",
  async function (this: CustomWorld) {
    await expect(this.workspace.programTargets).toBeVisible();
    await expect(this.workspace.programGoals).toBeVisible();
    await expect(this.page.getByTestId('program-details-settings')).toBeVisible();
  },
);

When(
  'I filter the rail by the most common domain on this tab',
  async function (this: CustomWorld) {
    const tally = new Map<string, number>();
    for (const p of (await fetchPrograms(this)).filter((p) => p.active)) {
      if (p.domain) tally.set(p.domain, (tally.get(p.domain) ?? 0) + 1);
    }
    // Ties broken by name so the choice is stable across runs.
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const domain = ranked[0]?.[0];
    if (!domain) {
      throw new Error('No active program carries a domain, so the filter cannot be exercised.');
    }
    this.data.domain = domain;
    await this.workspace.filterByDomain(domain);
  },
);

Then('the rail lists exactly the programs in that domain', async function (this: CustomWorld) {
  const domain = this.data.domain as string;
  await expectRailToMatch(
    this,
    (p) => p.active && p.domain === domain,
    `the rail should show only "${domain}" programs`,
  );
});

When('I clear the domain filter', async function (this: CustomWorld) {
  await this.workspace.filterByDomain('All domains');
});

When('I open Analyze Data from the client tab bar', async function (this: CustomWorld) {
  await this.workspace.openTab('analyze-data');
});

Then('the Analyze Data client area is displayed', async function (this: CustomWorld) {
  await this.analyzeData.expectLoaded();
});

When('I open Behavior Support from the client tab bar', async function (this: CustomWorld) {
  await this.workspace.openTab('behavior-support');
});

Then('the Behavior Support client area is displayed', async function (this: CustomWorld) {
  await this.behaviorSupport.expectLoaded();
});

When('I open Skills Programs from the client tab bar', async function (this: CustomWorld) {
  await this.workspace.openTab('skills-programs');
});

Then('the Skills Programs client area is displayed', async function (this: CustomWorld) {
  await this.workspace.expectLoaded();
  await expect(this.workspace.programRail).toBeVisible();
});
