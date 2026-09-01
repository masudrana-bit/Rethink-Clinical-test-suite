import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { resolveFixture, ClientRecord } from '../support/testData';
import { NetworkRecorder } from '../support/network';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Unit 2 — CLI-1 to CLI-9. */

interface ClientsEnvelope {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ClientRecord[];
}

async function clientsFromApi(world: CustomWorld): Promise<ClientsEnvelope> {
  if (!world.data.clientsEnvelope) {
    const res = await world.clinical.clients();
    recordResponseMetadata(world, res);
    world.data.clientsEnvelope = await res.json();
  }
  // Shared envelope assertions in common.steps.ts read this.
  world.data.lastResponseBody = world.data.clientsEnvelope;
  return world.data.clientsEnvelope as ClientsEnvelope;
}

async function resolved(world: CustomWorld): Promise<ClientRecord> {
  if (!world.fixture) {
    world.fixture = await resolveFixture(world.api, world.auth.accessToken);
  }
  return world.fixture.client;
}

When('I request the clients list from the API', async function (this: CustomWorld) {
  await clientsFromApi(this);
});

Then(
  'every client item has a numeric id, a name, a client number and an active flag',
  async function (this: CustomWorld) {
    const { items } = await clientsFromApi(this);
    expect(items.length, 'the list should not be empty').toBeGreaterThan(0);
    for (const item of items) {
      const where = `client ${item.id ?? '<no id>'}`;
      expect(typeof item.id, `${where}: id`).toBe('number');
      expect(String(item.firstName ?? '').trim(), `${where}: firstName`).not.toBe('');
      expect(String(item.lastName ?? '').trim(), `${where}: lastName`).not.toBe('');
      expect(String(item.clientNumber ?? '').trim(), `${where}: clientNumber`).not.toBe('');
      expect(typeof item.isActive, `${where}: isActive`).toBe('boolean');
    }
  },
);

Then('the listed clients match the API response exactly', async function (this: CustomWorld) {
  const { items } = await clientsFromApi(this);
  const expected = items.map((c) => c.id).sort((a, b) => a - b);
  const listed = (await this.clients.listedClientIds()).sort((a, b) => a - b);
  expect(listed, 'the page should list exactly the clients the API returned').toEqual(expected);
});

When('I open the resolved client from the list', async function (this: CustomWorld) {
  const client = await resolved(this);
  await this.clients.open(client.id);
});

Then('the client workspace is displayed for that client', async function (this: CustomWorld) {
  const client = await resolved(this);
  await expect(this.page).toHaveURL(new RegExp(`/clients/${client.id}(/|$)`));
  await this.workspace.expectLoaded();
});

Then('the client switcher names that client', async function (this: CustomWorld) {
  const client = await resolved(this);
  await expect(this.shell.switcherLabel).toHaveText(`${client.firstName} ${client.lastName}`);
});

When(
  'I search for the resolved client by part of their name',
  async function (this: CustomWorld) {
    const client = await resolved(this);
    // A substring, deliberately mis-cased, since matching is case-insensitive.
    const fragment = client.lastName.slice(0, 4);
    this.data.searchText = fragment.toUpperCase();
    await this.clients.filterByName(this.data.searchText);
  },
);

When('I search by name for {string}', async function (this: CustomWorld, text: string) {
  this.data.searchText = text;
  await this.clients.filterByName(text);
});

When('I clear the client search filters', async function (this: CustomWorld) {
  await this.clients.clearFilters();
});

Then("every listed client's name contains the search text", async function (this: CustomWorld) {
  const needle = String(this.data.searchText).toLowerCase();
  await expect
    .poll(async () => {
      const rows = await this.clients.visibleRows();
      return rows.filter((r) => !r.name.toLowerCase().includes(needle)).map((r) => r.name);
    }, { message: `rows not matching "${needle}"` })
    .toEqual([]);
});

Then('the resolved client is listed', async function (this: CustomWorld) {
  const client = await resolved(this);
  await expect(this.clients.clientLink(client.id)).toBeVisible();
});

Then('no clients are listed', async function (this: CustomWorld) {
  await expect(this.clients.allClientLinks()).toHaveCount(0);
});

When(
  'I search for the resolved client by their client number',
  async function (this: CustomWorld) {
    const client = await resolved(this);
    await this.clients.filterByClientNumber(String(client.clientNumber));
  },
);

Then('only the resolved client is listed', async function (this: CustomWorld) {
  const client = await resolved(this);
  await expect
    .poll(async () => (await this.clients.visibleRows()).map((r) => r.id))
    .toEqual([client.id]);
});

When('I choose the resolved client from the client switcher', async function (this: CustomWorld) {
  const client = await resolved(this);
  await this.shell.selectClient(`${client.firstName} ${client.lastName}`);
});

When(
  'I open the clients page while recording network traffic',
  async function (this: CustomWorld) {
    this.data.network = new NetworkRecorder(this.page);
    await this.clients.goto();
  },
);

Then(
  'the runtime config, staff role and clients calls all succeeded',
  function (this: CustomWorld) {
    const recorder = this.data.network as NetworkRecorder;
    const expected: Array<[string, RegExp]> = [
      ['runtime config', /runtime-config\.json/],
      ['staff role', /\/members\/me\/staff-role/],
      ['clients list', /\/clinical\/v1\/clients\?/],
    ];
    for (const [label, pattern] of expected) {
      const calls = recorder.matching(pattern);
      expect(calls.length, `expected a ${label} call. Saw:\n${recorder.describe()}`).toBeGreaterThan(
        0,
      );
      expect(
        calls.map((c) => c.status),
        `${label} should have succeeded`,
      ).not.toContain(500);
      expect(calls.every((c) => c.status < 400), `${label} statuses`).toBe(true);
    }
  },
);

Then('no recorded call failed', function (this: CustomWorld) {
  const recorder = this.data.network as NetworkRecorder;
  const failures = recorder.all().filter((c) => c.status >= 400);
  expect(failures, `failing calls:\n${failures.map((f) => `${f.status} ${f.url}`).join('\n')}`)
    .toEqual([]);
});

Then(
  'every row\'s status matches the API active flag for that client',
  async function (this: CustomWorld) {
    const { items } = await clientsFromApi(this);
    const activeById = new Map(items.map((c) => [c.id, c.isActive]));
    const rows = await this.clients.visibleRows();

    const mismatches = rows
      .filter((row) => {
        const expected = activeById.get(row.id);
        if (expected === undefined) return true;
        return row.status !== (expected ? 'Active' : 'Inactive');
      })
      .map((row) => `${row.id}: showed "${row.status}", API isActive=${activeById.get(row.id)}`);

    expect(mismatches, 'status column should agree with the API').toEqual([]);
  },
);
