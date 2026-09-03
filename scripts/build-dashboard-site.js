#!/usr/bin/env node
/** Assemble the self-contained GitHub Pages payload for Unit 15d. */
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join('reports', 'site');

function copyIfPresent(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.cpSync(source, destination, { recursive: true });
  return true;
}

function main() {
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(SITE, { recursive: true });

  const required = [
    [path.join('reports', 'dashboard.html'), path.join(SITE, 'index.html')],
    [path.join('reports', 'metrics.json'), path.join(SITE, 'metrics.json')],
    [path.join('reports', 'history.json'), path.join(SITE, 'history.json')],
  ];
  for (const [source, destination] of required) {
    if (!copyIfPresent(source, destination)) {
      throw new Error(`Cannot publish dashboard: ${source} is missing.`);
    }
  }

  const allureDestination = path.join(SITE, 'allure');
  if (!copyIfPresent('allure-report', allureDestination)) {
    fs.mkdirSync(allureDestination, { recursive: true });
    fs.writeFileSync(
      path.join(allureDestination, 'index.html'),
      '<!doctype html><meta charset="utf-8"><title>Detailed test evidence unavailable</title>' +
        '<h1>Detailed test evidence unavailable</h1>' +
        '<p>The dashboard is current, but detailed evidence could not be generated for this run.</p>',
    );
    console.warn('Allure report missing; published an honest unavailable page.');
  }
  console.log(`dashboard site assembled at ${SITE}`);
}

if (require.main === module) main();

module.exports = { copyIfPresent };
