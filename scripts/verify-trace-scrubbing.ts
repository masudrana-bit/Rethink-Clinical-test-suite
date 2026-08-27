/**
 * Security control check for D7.
 *
 * Captures a real trace and inspects the written zip for credential fields. This
 * exists as its own script because the in-browser assertion is not sufficient: an
 * earlier implementation used `route.fetch()`, which passed the browser-level check
 * while the trace still contained the unredacted response body.
 *
 * Run with: npm run verify:scrub
 */
import { chromium, request } from '@playwright/test';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs';
import { config } from '../support/config';
import { acquireAuth, seedAuth } from '../support/auth';
import { installResponseScrubbing, CREDENTIAL_FIELDS } from '../support/scrub';

const TRACE = 'reports/trace-scrub-check.zip';

async function captureTrace(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const fetcher = await request.newContext();
  try {
    const auth = await acquireAuth(browser);
    const context = await browser.newContext({ baseURL: config.baseUrl });
    await installResponseScrubbing(context, fetcher);
    await seedAuth(context, auth);
    await context.tracing.start({ screenshots: true, snapshots: true });

    const page = await context.newPage();
    await page.goto('/clients');
    await page.getByTestId('clients-list-page').waitFor({ state: 'visible' });

    fs.mkdirSync('reports', { recursive: true });
    await context.tracing.stop({ path: TRACE });
    await context.close();
  } finally {
    await fetcher.dispose();
    await browser.close();
  }
}

function inspectTrace(): { leaks: string[]; redactions: number } {
  const leaks: string[] = [];
  let redactions = 0;

  for (const entry of new AdmZip(TRACE).getEntries()) {
    if (entry.isDirectory) continue;
    const text = entry.getData().toString('utf8');
    for (const field of CREDENTIAL_FIELDS) {
      // A populated field looks like "apiKey":"..."; a scrubbed one is "apiKey":null.
      const populated = new RegExp(`"${field}"\\s*:\\s*"`, 'g');
      const nulled = new RegExp(`"${field}"\\s*:\\s*null`, 'g');
      if (populated.test(text)) leaks.push(`${entry.entryName} → ${field}`);
      redactions += (text.match(nulled) ?? []).length;
    }
  }
  return { leaks, redactions };
}

async function main() {
  await captureTrace();
  const { leaks, redactions } = inspectTrace();
  fs.rmSync(TRACE, { force: true });

  if (leaks.length > 0) {
    console.error('FAIL: credential fields found in the written trace:');
    for (const leak of leaks) console.error(`  ${leak}`);
    process.exit(1);
  }
  console.log(`PASS: no credential fields in the trace (${redactions} redacted occurrence(s)).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
