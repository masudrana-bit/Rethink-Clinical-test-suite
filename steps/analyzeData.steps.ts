import { Given, When, Then } from '@cucumber/cucumber';
import { APIResponse, expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import {
  fixture,
  fetchPrograms,
  fetchTargetTotal,
  fetchFlaggedTotal,
  distinct,
} from '../support/clientFacts';
import { NetworkRecorder } from '../support/network';
import { PrimeSelect } from '../pages/PrimeSelect';
import { AnalyzeMode, DateWindow, Grouping } from '../pages/AnalyzeDataPage';
import { recordResponseMetadata } from '../support/apiDiagnostics';
import { firstListedClientId } from '../support/testData';

/** Unit 4 — AZ-1 to AZ-9. */

When('I open Analyze Data for the resolved client', async function (this: CustomWorld) {
  const { client } = await fixture(this);
  await this.analyzeData.goto(client.id);
});

Then(
  'the mastered, in-scope and remaining tiles each show a number',
  async function (this: CustomWorld) {
    for (const tile of ['mastered', 'in-scope', 'remaining'] as const) {
      await expect(this.analyzeData.tile(tile)).toBeVisible();
      const value = await this.analyzeData.tileValue(tile);
      expect(Number.isFinite(value), `${tile} tile should hold a number`).toBe(true);
      expect(value, `${tile} tile should not be negative`).toBeGreaterThanOrEqual(0);
    }
  },
);

Then("the in-scope tile is not larger than the client's total target count", async function (this: CustomWorld) {
  // D10: in-scope is a report-filtered subset, not the raw target rollup.
  // Equality against totalCount is a false oracle; inflation above the API total is not.
  await expect
    .poll(
      async () => {
        const [tile, api] = await Promise.all([
          this.analyzeData.tileValue('in-scope'),
          fetchTargetTotal(this),
        ]);
        return tile <= api ? 'within-api-total' : `tile=${tile} api=${api}`;
      },
      {
        message: 'In-scope should not exceed the live target count across every program',
        timeout: 30_000,
      },
    )
    .toBe('within-api-total');
});

Then('mastered plus remaining equals in scope', async function (this: CustomWorld) {
  const [mastered, remaining, inScope] = await Promise.all([
    this.analyzeData.tileValue('mastered'),
    this.analyzeData.tileValue('remaining'),
    this.analyzeData.tileValue('in-scope'),
  ]);
  expect(mastered + remaining, `${mastered} + ${remaining} should equal ${inScope}`).toBe(inScope);
});

Then('the chart renders with a value axis', async function (this: CustomWorld) {
  await expect(this.analyzeData.chartSvg).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => this.analyzeData.chartAxisTickCount(), {
      message: 'the y axis should carry ticks',
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
});

Then(
  "the chart's categories are the client's distinct program domains",
  async function (this: CustomWorld) {
    await expect
      .poll(
        async () => {
          const expected = distinct(await fetchPrograms(this), 'domain');
          const actual = await this.analyzeData.chartCategories();
          return actual.join('|') === expected.join('|')
            ? 'reconciled'
            : `chart=[${actual.join(', ')}] api=[${expected.join(', ')}]`;
        },
        { message: 'the chart should plot one category per domain', timeout: 30_000 },
      )
      .toBe('reconciled');
  },
);

Then(
  "the mastered tile's skill-area count matches the chart's categories",
  async function (this: CustomWorld) {
    const categories = await this.analyzeData.chartCategories();
    expect(await this.analyzeData.skillAreaCount(), 'skill areas vs chart categories').toBe(
      categories.length,
    );
  },
);

Then(
  'the review lists one row per flagged automastery evaluation',
  async function (this: CustomWorld) {
    await expect
      .poll(
        async () => {
          const [rows, flagged] = await Promise.all([
            this.analyzeData.reviewRows.count(),
            fetchFlaggedTotal(this),
          ]);
          return rows === flagged ? 'reconciled' : `rows=${rows} flagged=${flagged}`;
        },
        { message: 'pending determinations should match the flagged evaluations', timeout: 30_000 },
      )
      .toBe('reconciled');
  },
);

Then('every row sits under a heading naming its own program', async function (this: CustomWorld) {
  const groups = await this.analyzeData.reviewGroups();
  expect(groups.length, 'there should be at least one group').toBeGreaterThan(0);

  const headings = groups.map((g) => g.heading);
  expect(new Set(headings).size, 'group headings should be unique').toBe(headings.length);

  for (const { heading, programs } of groups) {
    expect(programs.length, `group "${heading}" should not be empty`).toBeGreaterThan(0);
    for (const program of programs) {
      expect(program.toLowerCase(), `row under "${heading}"`).toBe(heading.toLowerCase());
    }
  }
});

When('I choose the {string} date range', async function (this: CustomWorld, window: DateWindow) {
  await this.analyzeData.chooseWindow(window);
});

Then('{string} is the only active date range', async function (this: CustomWorld, window: string) {
  await expect
    .poll(() => this.analyzeData.activeWindows(), {
      message: `only "${window}" should be pressed`,
    })
    .toEqual([window]);
});

When(
  'I record traffic while opening Analyze Data for the resolved client',
  async function (this: CustomWorld) {
    const { client } = await fixture(this);
    this.data.recorder = new NetworkRecorder(this.page);
    await this.analyzeData.goto(client.id);
    await this.page.waitForLoadState('networkidle');
  },
);

Then(
  "a targets request was made for every one of the client's programs",
  async function (this: CustomWorld) {
    const recorder = this.data.recorder as NetworkRecorder;
    const programs = await fetchPrograms(this);
    const requested = new Set(
      recorder
        .matching(/\/programs\/\d+\/targets/)
        .map((call) => Number(/\/programs\/(\d+)\/targets/.exec(call.url)?.[1])),
    );

    // Programs created after the page loaded cannot have been fetched by it.
    const missing = programs.map((p) => p.id).filter((id) => !requested.has(id));
    expect(
      missing,
      `no targets request for program(s) ${missing.join(', ')}. Recorded:\n${recorder.describe()}`,
    ).toEqual([]);
  },
);

Then('at least one automastery evaluation request was made', function (this: CustomWorld) {
  const recorder = this.data.recorder as NetworkRecorder;
  const calls = recorder.matching(/automastery-evaluations/);
  expect(calls.length, 'the report should ask for automastery evaluations').toBeGreaterThan(0);
});

Then("none of the report's per-program requests failed", function (this: CustomWorld) {
  const recorder = this.data.recorder as NetworkRecorder;
  const calls = recorder.matching(/\/programs\/\d+\/(targets|automastery-evaluations)/);
  expect(calls.length, 'there should be per-program requests to judge').toBeGreaterThan(0);

  const failed = calls.filter((call) => call.status >= 400);
  expect(
    failed.map((call) => `${call.status} ${call.url}`),
    `${failed.length} of ${calls.length} per-program requests failed`,
  ).toEqual([]);
});

When('I group the chart by {string}', async function (this: CustomWorld, grouping: Grouping) {
  this.data.domainCategories = await this.analyzeData.chartCategories();
  await this.analyzeData.selectGrouping(grouping);
});

Then(
  "the chart's categories cover the client's distinct program categories",
  async function (this: CustomWorld) {
    await expect
      .poll(
        async () => {
          const expected = distinct(await fetchPrograms(this), 'category');
          const actual = await this.analyzeData.chartCategories();
          const missing = expected.filter((c) => !actual.includes(c));
          return missing.length === 0
            ? 'covered'
            : `chart=[${actual.join(', ')}] missing=[${missing.join(', ')}]`;
        },
        { message: 'every category should appear on the axis', timeout: 30_000 },
      )
      .toBe('covered');
  },
);

Then("the chart's categories differ from its domain grouping", async function (this: CustomWorld) {
  const before = this.data.domainCategories as string[];
  const after = await this.analyzeData.chartCategories();
  expect(after.join('|'), 'regrouping should change the axis').not.toBe(before.join('|'));
});

Then(
  'the grouping select offers {string}, {string} and {string}',
  async function (this: CustomWorld, first: string, second: string, third: string) {
    const select = new PrimeSelect(this.page, this.analyzeData.groupingSelect, 'grouping select');
    await select.label.click();
    for (const option of [first, second, third]) {
      await expect(select.option(option), `"${option}" should be offered`).toBeVisible();
    }
    await this.page.keyboard.press('Escape');
  },
);

When('I switch to the {string} mode', async function (this: CustomWorld, mode: AnalyzeMode) {
  await this.analyzeData.setMode(mode);
});

Then('{string} is the only active mode', async function (this: CustomWorld, mode: string) {
  await expect
    .poll(() => this.analyzeData.activeModes(), { message: `only "${mode}" should be pressed` })
    .toEqual([mode]);
});

Then('the {string} panel is shown', async function (this: CustomWorld, panel: AnalyzeMode) {
  const panels = {
    mastered: this.analyzeData.masteredReport,
    custom: this.analyzeData.customGraph,
    bulk: this.analyzeData.bulkReport,
  };
  await expect(panels[panel]).toBeVisible();

  for (const [name, locator] of Object.entries(panels)) {
    if (name !== panel) await expect(locator).toHaveCount(0);
  }
});

Then("the series count equals the client's program count", async function (this: CustomWorld) {
  await expect
    .poll(
      async () => {
        const [shown, programs] = await Promise.all([
          this.analyzeData.seriesCount(),
          fetchPrograms(this),
        ]);
        return shown === programs.length ? 'reconciled' : `shown=${shown} api=${programs.length}`;
      },
      { message: 'programs available in scope should match the programs API', timeout: 30_000 },
    )
    .toBe('reconciled');
});

const TARGETS = /\/clinical\/v1\/clients\/\d+\/programs\/\d+\/targets/;

Given('the targets API is delayed', async function (this: CustomWorld) {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  this.data.releaseTargetsApi = release;
  await this.page.route(TARGETS, async (route) => {
    await gate;
    await route.continue();
  });
});

When('I open Analyze Data without waiting for tiles', async function (this: CustomWorld) {
  const { client } = await fixture(this);
  await this.page.goto(`/clients/${client.id}/analyze-data`);
  await expect(this.analyzeData.root).toBeVisible({ timeout: 30_000 });
});

Then('the in-scope tile is still unresolved', async function (this: CustomWorld) {
  await expect(this.analyzeData.tile('in-scope')).toHaveText(/--/);
});

When('the targets API is allowed to complete', async function (this: CustomWorld) {
  const release = this.data.releaseTargetsApi as (() => void) | undefined;
  if (!release) throw new Error('the targets API was not delayed in this scenario');
  release();
  await this.analyzeData.expectLoaded();
});

When('I print the current report', async function (this: CustomWorld) {
  await this.page.evaluate(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls += 1;
    };
  });
  await this.analyzeData.print.click();
});

Then('the browser print dialog is requested', async function (this: CustomWorld) {
  await expect
    .poll(() => this.page.evaluate(() => (window as unknown as { __printCalls?: number }).__printCalls ?? 0), {
      message: 'clicking Print should call window.print',
      timeout: 5_000,
    })
    .toBeGreaterThan(0);
});

Then('every summary tile is zero', async function (this: CustomWorld) {
  for (const tile of ['mastered', 'in-scope', 'remaining'] as const) {
    expect(await this.analyzeData.tileValue(tile), `${tile} should be 0 with no programs`).toBe(0);
  }
});

Then('the mastered report empty state is shown', async function (this: CustomWorld) {
  await expect(this.analyzeData.masteredReportEmpty).toBeVisible();
});

Then('the report scope select is displayed', async function (this: CustomWorld) {
  await expect(this.analyzeData.scopeSelect).toBeVisible();
});

async function record(world: CustomWorld, res: APIResponse): Promise<void> {
  recordResponseMetadata(world, res);
  world.data.lastResponseBody = await res.json().catch(() => undefined);
}

When('I request Analyze Data series for a live client', async function (this: CustomWorld) {
  const clientId = await firstListedClientId(this.clinical);
  this.data.analyzeClientId = clientId;
  await record(this, await this.clinical.analyzeDataSeries(clientId));
});

When(
  'I request Analyze Data mastered targets for a live client',
  async function (this: CustomWorld) {
    const clientId = await firstListedClientId(this.clinical);
    await record(this, await this.clinical.analyzeDataMasteredTargets(clientId));
  },
);

When(
  'I request Analyze Data graphs for graphable series of a live client',
  async function (this: CustomWorld) {
    const clientId = await firstListedClientId(this.clinical);
    const listed = await this.clinical.analyzeDataSeries(clientId);
    const body = await listed.json().catch(() => undefined);
    const series = (body?.items ?? []) as Array<{
      id?: string;
      graphable?: boolean;
      dataType?: unknown;
    }>;
    const graphable = series
      .filter((row) => row.graphable && row.dataType && typeof row.id === 'string')
      .map((row) => row.id as string);
    expect(graphable.length, 'the caseload should include at least one graphable series').toBeGreaterThan(
      0,
    );
    this.data.requestedGraphSeriesIds = graphable.slice(0, 2);
    await record(this, await this.clinical.analyzeDataGraphs(clientId, this.data.requestedGraphSeriesIds));
  },
);

Then(
  'every Analyze Data series has an id, kind, label and graphable flag',
  function (this: CustomWorld) {
    const items = (this.data.lastResponseBody?.items ?? []) as Array<{
      id?: unknown;
      kind?: unknown;
      label?: unknown;
      graphable?: unknown;
    }>;
    expect(items.length, 'Analyze Data series should not be empty').toBeGreaterThan(0);
    const kinds = new Set(['program', 'behavior']);
    for (const row of items) {
      expect(String(row.id ?? '').trim(), `series ${row.id}: id`).not.toBe('');
      expect(kinds.has(String(row.kind)), `series ${row.id}: kind`).toBe(true);
      expect(String(row.label ?? '').trim(), `series ${row.id}: label`).not.toBe('');
      expect(typeof row.graphable, `series ${row.id}: graphable`).toBe('boolean');
    }
  },
);

Then(
  'the mastered-targets summary adds up and names each skill area',
  function (this: CustomWorld) {
    const body = this.data.lastResponseBody as {
      summary?: {
        targetsMastered?: unknown;
        targetsInScope?: unknown;
        remaining?: unknown;
        skillAreaCount?: unknown;
      };
      bySkillArea?: Array<{
        skillArea?: unknown;
        targetsMastered?: unknown;
        targetsInScope?: unknown;
      }>;
      provenance?: unknown;
    };
    const summary = body?.summary ?? {};
    expect(typeof summary.targetsMastered, 'summary.targetsMastered').toBe('number');
    expect(typeof summary.targetsInScope, 'summary.targetsInScope').toBe('number');
    expect(typeof summary.remaining, 'summary.remaining').toBe('number');
    expect(typeof summary.skillAreaCount, 'summary.skillAreaCount').toBe('number');
    expect(
      Number(summary.targetsMastered) + Number(summary.remaining),
      'mastered + remaining equals in-scope on the reporting API',
    ).toBe(Number(summary.targetsInScope));
    expect(Array.isArray(body?.bySkillArea), 'bySkillArea').toBe(true);
    expect(body.bySkillArea!.length, 'skill-area rows match skillAreaCount').toBe(
      Number(summary.skillAreaCount),
    );
    for (const row of body.bySkillArea!) {
      expect(String(row.skillArea ?? '').trim(), 'skillArea name').not.toBe('');
      expect(typeof row.targetsMastered, `${row.skillArea}: targetsMastered`).toBe('number');
      expect(typeof row.targetsInScope, `${row.skillArea}: targetsInScope`).toBe('number');
    }
    expect(body.provenance, 'provenance is published').toBeTruthy();
  },
);

Then(
  'every returned graph names a requested series and carries points',
  function (this: CustomWorld) {
    const requested = (this.data.requestedGraphSeriesIds ?? []) as string[];
    const graphs = (this.data.lastResponseBody?.graphs ?? []) as Array<{
      id?: unknown;
      kind?: unknown;
      points?: unknown;
    }>;
    expect(graphs.length, 'graphs should include the requested series').toBe(requested.length);
    const returned = new Set(graphs.map((graph) => String(graph.id)));
    for (const id of requested) {
      expect(returned.has(id), `graphs include ${id}`).toBe(true);
    }
    for (const graph of graphs) {
      expect(String(graph.kind ?? '').trim(), `graph ${graph.id}: kind`).not.toBe('');
      expect(Array.isArray(graph.points), `graph ${graph.id}: points`).toBe(true);
    }
  },
);
