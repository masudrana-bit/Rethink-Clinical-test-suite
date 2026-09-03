#!/usr/bin/env node
/**
 * Restore Unit 15 history before a CI run.
 *
 * D16: prefer the newest non-expired `metrics-history` Actions artifact, then
 * fall back to the durable GitHub Pages copy. A missing history is a valid
 * first-run state and must never fail the test job.
 */
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const OUTPUT = path.join('reports', 'history.json');
const ARTIFACT_NAME = 'metrics-history';

function validHistory(value) {
  return (
    value &&
    !Array.isArray(value) &&
    Array.isArray(value.runs) &&
    Number.isFinite(Number(value.cap))
  );
}

function saveHistory(text, source) {
  const parsed = JSON.parse(text);
  if (!validHistory(parsed)) {
    throw new Error(`${source} did not contain a valid history object`);
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`history restored from ${source} · ${parsed.runs.length}/${parsed.cap} runs`);
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rethink-clinical-metrics',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }
  return response.json();
}

async function restoreArtifact() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !token) return false;

  const query = new URLSearchParams({ name: ARTIFACT_NAME, per_page: '20' });
  const listing = await githubJson(
    `https://api.github.com/repos/${repository}/actions/artifacts?${query}`,
    token,
  );
  const artifact = (listing.artifacts || [])
    .filter((item) => !item.expired)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!artifact) return false;

  const response = await fetch(artifact.archive_download_url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rethink-clinical-metrics',
    },
  });
  if (!response.ok) {
    throw new Error(`artifact download returned ${response.status}`);
  }
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const entry = zip
    .getEntries()
    .find((candidate) => /(^|\/)history\.json$/i.test(candidate.entryName));
  if (!entry) {
    throw new Error('artifact did not contain history.json');
  }
  saveHistory(entry.getData().toString('utf8'), `Actions artifact ${artifact.id}`);
  return true;
}

async function restorePages() {
  const url = process.env.DASHBOARD_HISTORY_URL;
  if (!url) return false;
  const response = await fetch(url, { headers: { 'User-Agent': 'rethink-clinical-metrics' } });
  if (!response.ok) return false;
  saveHistory(await response.text(), 'GitHub Pages');
  return true;
}

async function main() {
  try {
    if (await restoreArtifact()) return;
  } catch (error) {
    console.warn(`history artifact unavailable: ${error.message}`);
  }
  try {
    if (await restorePages()) return;
  } catch (error) {
    console.warn(`published history unavailable: ${error.message}`);
  }
  console.log('history restore: no previous history found; starting with an empty run list');
}

if (require.main === module) {
  main().catch((error) => {
    console.warn(`history restore skipped: ${error.message}`);
    process.exitCode = 0;
  });
}

module.exports = { validHistory, saveHistory };
