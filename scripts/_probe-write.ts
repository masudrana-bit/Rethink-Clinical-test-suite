import { chromium } from '@playwright/test';
import { config } from '../support/config';
import { acquireAuth, seedAuth } from '../support/auth';
import { ClinicalApi } from '../api/clinicalApi';
import { resolveFixture } from '../support/testData';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const auth = await acquireAuth(browser);
  const api = new ClinicalApi(
    await (
      await import('@playwright/test')
    ).request.newContext(),
    auth.accessToken,
  );
  const { request } = await import('@playwright/test');
  const ctx = await request.newContext();
  const clinical = new ClinicalApi(ctx, auth.accessToken);
  const fixture = await resolveFixture(ctx, auth.accessToken);
  console.log(`fixture client=${fixture.client.id} program=${fixture.program.id} (read-only probe)`);

  const evalRes = await clinical.automasteryEvaluations(fixture.client.id, fixture.program.id, 'flagged');
  const evalBody = await evalRes.json().catch(() => ({}));
  const sample = (evalBody?.items ?? [])[0];
  console.log('eval status', evalRes.status(), 'count', (evalBody?.items ?? []).length);
  console.log('eval sample keys', sample ? Object.keys(sample) : 'none');
  if (sample) console.log('eval sample', JSON.stringify(sample).slice(0, 500));

  const base = `${config.apiBaseUrl}/clinical/v1/clients/${fixture.client.id}/programs/${fixture.program.id}`;
  for (const method of ['OPTIONS', 'GET']) {
    const url = `${base}/automastery-evaluations`;
    const res = await ctx.fetch(url, {
      method,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    console.log(method, url.replace(config.apiBaseUrl, ''), res.status(), res.headers()['allow'] ?? '', res.headers()['access-control-allow-methods'] ?? '');
  }

  for (const path of [
    '/sessions',
    '/clinical/v1/sessions',
    `/clinical/v1/clients/${fixture.client.id}/sessions`,
    `/observations/v1/client/${fixture.client.id}/sessions`,
  ]) {
    const res = await ctx.get(`${config.apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    console.log('GET', path, res.status(), (await res.text()).slice(0, 80));
  }

  const context = await browser.newContext({ baseURL: config.baseUrl });
  await seedAuth(context, auth);
  const page = await context.newPage();
  const posts: string[] = [];
  page.on('request', (req) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method())) {
      posts.push(`${req.method()} ${req.url()}`);
    }
  });
  await page.goto(`/clients/${fixture.client.id}`);
  await page.getByTestId('client-workspace').waitFor();
  const record = page.getByTestId('program-details-record-data');
  const addCollection = page.getByRole('button', { name: /Add Data Collection/i });
  console.log('record-data visible', await record.count());
  if ((await record.count()) > 0) {
    await record.click();
    await page.waitForTimeout(2000);
    console.log('after record-data url', page.url());
  }
  console.log('mutating requests after record-data', posts);

  await page.goto(`/clients/${fixture.client.id}/analyze-data`);
  await page.getByTestId('analyze-data-page').waitFor({ timeout: 30_000 });
  const reviewIds = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('[data-testid]')].map((n) => n.getAttribute('data-testid') ?? ''))]
      .filter((id) => /mastery|confirm|dismiss|review/i.test(id))
      .sort(),
  );
  console.log('mastery testids', reviewIds.join('\n'));

  await browser.close();
  await ctx.dispose();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
